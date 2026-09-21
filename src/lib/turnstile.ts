// Cloudflare Turnstile 서버 검증.
// 클라이언트에서 위젯을 통과했다는 사실만으로는 신뢰하지 않고,
// 반드시 이 siteverify 호출 결과(success === true)를 확인한 뒤에만
// 문의 메일을 발송한다.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyParams {
  token: string;
  secretKey: string;
  remoteIp?: string;
}

export interface TurnstileVerifyResult {
  success: boolean;
  /** Turnstile 위젯이 렌더링된 페이지의 hostname (siteverify 응답 값) */
  hostname?: string;
  errorCodes?: string[];
}

interface TurnstileSiteverifyResponse {
  success: boolean;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyTurnstileToken(
  params: TurnstileVerifyParams
): Promise<TurnstileVerifyResult> {
  const body = new URLSearchParams();
  body.set('secret', params.secretKey);
  body.set('response', params.token);
  if (params.remoteIp) {
    body.set('remoteip', params.remoteIp);
  }

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    // 네트워크 오류 등은 검증 실패로 취급한다(=fail closed).
    return { success: false };
  }

  if (!response.ok) {
    return { success: false };
  }

  let data: TurnstileSiteverifyResponse;
  try {
    data = (await response.json()) as TurnstileSiteverifyResponse;
  } catch {
    return { success: false };
  }

  return {
    success: data.success === true,
    hostname: data.hostname,
    errorCodes: data['error-codes'],
  };
}
