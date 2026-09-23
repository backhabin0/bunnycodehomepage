// 이 엔드포인트만 요청 시 실행되는 Vercel Serverless Function으로 동작한다.
// 나머지 페이지(/, /homepage/, /affordable-homepage/)는 계속 정적으로
// prerender된다 — astro.config.mjs에서 output을 'server'로 바꾸지 않은 이유.
export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getContactEnv } from '../../lib/env';
import { verifyTurnstileToken } from '../../lib/turnstile';
import { validateContactPayload, type RawContactInput } from '../../lib/contactValidation';
import { buildContactEmailSubject, buildContactEmailText, buildContactEmailHtml } from '../../lib/contactEmail';

// 최종 사용자에게 보이는 유일한 production 도메인.
// 기존 Hanapage Vercel 프로젝트가 /bunnycode/:path*를 이 BunnyCode 프로젝트로
// external rewrite하므로, 브라우저 입장에서는 항상 이 도메인에서 요청한다.
const PRODUCTION_HOSTNAME = 'hanapage.co.kr';
const ALLOWED_ORIGINS = new Set([`https://${PRODUCTION_HOSTNAME}`]);
// 문의 폼은 짧은 텍스트 필드 몇 개뿐이므로 이 정도면 충분히 넉넉하다.
const MAX_BODY_BYTES = 20_000;

/**
 * external rewrite를 거치면 이 함수가 실제로 수신하는 요청의 URL/Host는
 * hanapage.co.kr이 아니라 BunnyCode 자체 Vercel 배포 도메인(*.vercel.app)이
 * 된다. Vercel은 원래 요청의 Host를 `x-forwarded-host`로 함께 전달하므로,
 * "사용자가 실제로 접속한 공개 도메인"을 판단할 때는 이 헤더를 우선한다.
 * (Origin 헤더는 브라우저가 붙이는 값이라 rewrite와 무관하게 그대로 전달되지만,
 * 서버가 자신을 "어느 도메인으로 서비스되는 중인지" 판단하려면 이 헤더가 필요하다)
 */
function resolvePublicHostname(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    return forwardedHost.split(',')[0]?.trim() ?? '';
  }
  try {
    return new URL(request.url).hostname;
  } catch {
    return '';
  }
}

function resolveClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || undefined;
  }
  return request.headers.get('x-real-ip') ?? undefined;
}

function isAllowedOrigin(origin: string | null): boolean {
  // Origin 헤더가 아예 없는 요청(오래된 브라우저, 일부 same-origin 케이스)은
  // 이 검사만으로 차단하지 않는다 — Turnstile이 실질적인 방어선이다.
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    // BunnyCode 자체 Vercel 프로젝트(Production + Preview 배포)를 external
    // rewrite 없이 직접 열어 테스트하는 경우도 허용한다. Origin은 이 검사만으로
    // 신뢰하지 않고 Turnstile 서버 검증을 항상 함께 요구하므로, 실서비스
    // 도메인이 아닌 *.vercel.app을 열어둬도 실질적인 보안 저하는 없다.
    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const RESPONSES = {
  invalidContentType: () => jsonResponse({ ok: false, error: 'unsupported_content_type' }, 400),
  invalidOrigin: () => jsonResponse({ ok: false, error: 'invalid_origin' }, 403),
  payloadTooLarge: () => jsonResponse({ ok: false, error: 'payload_too_large' }, 400),
  invalidJson: () => jsonResponse({ ok: false, error: 'invalid_json' }, 400),
  invalidInput: () => jsonResponse({ ok: false, error: 'invalid_input' }, 400),
  serverNotConfigured: () => jsonResponse({ ok: false, error: 'server_not_configured' }, 500),
  turnstileFailed: () => jsonResponse({ ok: false, error: 'turnstile_failed' }, 403),
  emailSendFailed: () => jsonResponse({ ok: false, error: 'email_send_failed' }, 502),
  // 허니팟/속도 기반 스팸 판정은 봇에게 차단 사실을 알리지 않기 위해
  // 정상 성공 응답과 동일하게 반환한다(메일은 실제로 보내지 않는다).
  success: () => jsonResponse({ ok: true }, 200),
} as const;

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return RESPONSES.invalidContentType();
  }

  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return RESPONSES.invalidOrigin();
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
    return RESPONSES.payloadTooLarge();
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return RESPONSES.invalidJson();
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return RESPONSES.payloadTooLarge();
  }

  let input: RawContactInput;
  try {
    input = JSON.parse(rawBody) as RawContactInput;
  } catch {
    return RESPONSES.invalidJson();
  }

  const validation = validateContactPayload(input);
  if (!validation.ok) {
    if (validation.reason === 'honeypot' || validation.reason === 'submitted_too_fast') {
      return RESPONSES.success();
    }
    // 어떤 필드가 왜 실패했는지는 사용자 화면에 노출하지 않는다.
    // (필요한 최소 정보만 남기고, 입력값 자체는 로그에 남기지 않는다)
    console.error(`contact api: validation failed (${validation.reason})`);
    return RESPONSES.invalidInput();
  }

  const env = getContactEnv();
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.RESEND_FROM_EMAIL || !env.TURNSTILE_SECRET_KEY) {
    console.error('contact api: server is missing required environment variable(s)');
    return RESPONSES.serverNotConfigured();
  }

  const publicHostname = resolvePublicHostname(request);
  const isProduction = publicHostname === PRODUCTION_HOSTNAME;

  const turnstileResult = await verifyTurnstileToken({
    token: validation.turnstileToken,
    secretKey: env.TURNSTILE_SECRET_KEY,
    remoteIp: resolveClientIp(request),
  });

  if (!turnstileResult.success) {
    // siteverify의 error-codes에는 개인정보/secret이 없으므로 진단 목적으로만 남긴다.
    console.error(`contact api: turnstile verification failed (${(turnstileResult.errorCodes ?? []).join(',') || 'unknown'})`);
    return RESPONSES.turnstileFailed();
  }

  // 운영 환경(= 실제 사용자가 hanapage.co.kr로 접속해 external rewrite를
  // 거쳐 들어온 요청)에서만 Turnstile이 보고한 hostname을 우리 도메인으로
  // 고정한다. 로컬 개발이나 BunnyCode 자체 *.vercel.app 직접 접속까지 이
  // 조건을 강제하면 개발 중 테스트가 불가능해진다.
  if (isProduction && turnstileResult.hostname && turnstileResult.hostname !== PRODUCTION_HOSTNAME) {
    console.error(`contact api: turnstile hostname mismatch (reported=${turnstileResult.hostname})`);
    return RESPONSES.turnstileFailed();
  }

  const receivedAt = new Date();
  const pageUrl = validation.pageUrl || request.headers.get('referer') || publicHostname || '';
  const emailInput = { ...validation.data, pageUrl, receivedAt };

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL,
      subject: buildContactEmailSubject(emailInput),
      text: buildContactEmailText(emailInput),
      html: buildContactEmailHtml(emailInput),
    });

    if (result.error) {
      // Resend가 반환하는 에러 이름(enum성 문자열)만 남기고, 메시지·키는 남기지 않는다.
      console.error(`contact api: resend send failed (${result.error.name})`);
      return RESPONSES.emailSendFailed();
    }
  } catch {
    console.error('contact api: resend request threw an unexpected error');
    return RESPONSES.emailSendFailed();
  }

  return RESPONSES.success();
};
