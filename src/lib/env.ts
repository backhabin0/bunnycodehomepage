// Vercel Serverless Function(Node.js 런타임) 기준 표준 환경변수 접근 방식.
// Cloudflare Workers 전용이었던 `import { env } from 'cloudflare:workers'`는
// 더 이상 사용하지 않는다 — Vercel의 Node 함수에서는 일반 Node.js 프로세스와
// 동일하게 `process.env`로 환경변수를 읽으면 된다. 별도의 런타임 바인딩
// API가 필요하지 않다.
//
// 값은 Vercel 대시보드(Project → Settings → Environment Variables)에서
// Production / Preview / Development 환경별로 등록한다. 이 값들은
// PUBLIC_ 접두사가 없으므로 클라이언트 번들에는 절대 포함되지 않는다.

export interface ContactEnv {
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  RESEND_FROM_EMAIL: string;
  TURNSTILE_SECRET_KEY: string;
}

/**
 * 문의 API에 필요한 서버 전용 환경변수를 읽는다.
 * 로컬 개발에서는 `.env`(Vercel CLI로 `vercel env pull`을 쓰거나 직접 작성),
 * 운영에서는 Vercel 대시보드에 등록한 값이 여기로 들어온다.
 * 값이 없으면 빈 문자열을 반환하며, 호출부(API 라우트)에서
 * 누락 여부를 확인해 500으로 처리한다 — 여기서는 절대 로그를 남기지 않는다.
 */
export function getContactEnv(): ContactEnv {
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL ?? '',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? '',
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? '',
  };
}
