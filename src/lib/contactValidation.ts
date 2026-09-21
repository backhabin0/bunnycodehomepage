// 문의 폼 서버 검증 로직. Cloudflare/Resend/Astro 어디에도 의존하지 않는
// 순수 함수로만 구성해서, API 라우트 없이도(=Resend API Key가 없어도)
// `npm test`로 동작을 검증할 수 있게 한다.

export const ALLOWED_SERVICES = [
  '홈페이지 제작',
  '가성비 홈페이지 제작',
  'SEO 랜딩페이지',
  '백엔드 개발',
  'Flutter 앱 제작',
  '기타',
] as const;

export type ServiceOption = (typeof ALLOWED_SERVICES)[number];

export const MAX_NAME_LENGTH = 40;
export const MAX_PHONE_LENGTH = 20;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_PAGE_URL_LENGTH = 300;
export const MAX_TURNSTILE_TOKEN_LENGTH = 2000;

// 숫자, 공백, +, -, ( ) 정도만 허용한다. 국가/지역별 표기를 지나치게
// 강제하지 않으면서도 스크립트/특수문자 삽입은 막는다.
const PHONE_PATTERN = /^[0-9+\-()\s]+$/;

// 폼을 연 시점(formOpenedAt)과 제출 시점의 차이가 이보다 짧으면
// 사람이 입력했다고 보기 어려운 것으로 간주한다. 이 값만으로 요청을
// "신뢰"하지는 않으며(=이 값이 커도 정상 통과 여부는 Turnstile이 결정),
// 지나치게 빠른 제출을 보조적으로 걸러내는 용도로만 쓴다.
export const MIN_SUBMIT_MS = 1200;

export interface ContactPayload {
  name: string;
  phone: string;
  service: ServiceOption;
  message: string;
  consent: true;
}

/** 클라이언트가 보내는 원본 JSON 바디. 아직 검증 전이므로 전부 unknown. */
export interface RawContactInput {
  name?: unknown;
  phone?: unknown;
  service?: unknown;
  message?: unknown;
  consent?: unknown;
  turnstileToken?: unknown;
  /** 허니팟 필드. 사람 눈에는 보이지 않아야 하며, 값이 있으면 봇으로 간주한다. */
  companyWebsite?: unknown;
  /** 모달이 열린 시각(epoch ms). 없어도 다른 검증에는 영향 없음. */
  formOpenedAt?: unknown;
  /** 문의가 발생한 페이지 URL (참고용, 메일 본문에만 사용). */
  pageUrl?: unknown;
}

export type ValidationFailureReason =
  | 'honeypot'
  | 'submitted_too_fast'
  | 'invalid_name'
  | 'invalid_phone'
  | 'invalid_service'
  | 'invalid_message'
  | 'consent_required'
  | 'missing_turnstile_token';

export type ValidationResult =
  | { ok: true; data: ContactPayload; turnstileToken: string; pageUrl: string }
  | { ok: false; reason: ValidationFailureReason };

function isNonEmptyTrimmedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function isValidName(value: unknown): value is string {
  return isNonEmptyTrimmedString(value, MAX_NAME_LENGTH);
}

export function isValidPhone(value: unknown): value is string {
  if (!isNonEmptyTrimmedString(value, MAX_PHONE_LENGTH)) return false;
  return PHONE_PATTERN.test(value.trim());
}

export function isValidService(value: unknown): value is ServiceOption {
  return typeof value === 'string' && (ALLOWED_SERVICES as readonly string[]).includes(value);
}

/** 문의 내용은 선택 입력이므로 비어 있어도 통과한다. */
export function isValidMessage(value: unknown): value is string {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && value.length <= MAX_MESSAGE_LENGTH;
}

export function isConsentGiven(value: unknown): value is true {
  return value === true;
}

export function isHoneypotEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function isValidTurnstileToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TURNSTILE_TOKEN_LENGTH;
}

export function isValidPageUrl(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PAGE_URL_LENGTH;
}

export function isSubmittedTooFast(formOpenedAt: unknown, now: number = Date.now()): boolean {
  if (typeof formOpenedAt !== 'number' || !Number.isFinite(formOpenedAt)) {
    // 신호가 없으면 판단하지 않는다(= 통과). 이 체크는 어디까지나 보조 수단이다.
    return false;
  }
  const elapsed = now - formOpenedAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) return false;
  return elapsed < MIN_SUBMIT_MS;
}

/** 메일 제목 등 헤더성 문자열에 개행이 섞여 들어가는 것을 막는다. */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 문의 폼 payload 전체를 검증한다.
 * honeypot / submitted_too_fast는 "봇으로 추정"이라는 별도 사유로 분리해서
 * 반환한다 — 호출하는 쪽(API 라우트)에서 이 두 경우는 실패를 알리지 않고
 * 조용히 성공처럼 응답할 수 있도록 하기 위함이다.
 */
export function validateContactPayload(input: RawContactInput): ValidationResult {
  if (!isHoneypotEmpty(input.companyWebsite)) {
    return { ok: false, reason: 'honeypot' };
  }
  if (isSubmittedTooFast(input.formOpenedAt)) {
    return { ok: false, reason: 'submitted_too_fast' };
  }
  if (!isValidName(input.name)) return { ok: false, reason: 'invalid_name' };
  if (!isValidPhone(input.phone)) return { ok: false, reason: 'invalid_phone' };
  if (!isValidService(input.service)) return { ok: false, reason: 'invalid_service' };
  if (!isValidMessage(input.message)) return { ok: false, reason: 'invalid_message' };
  if (!isConsentGiven(input.consent)) return { ok: false, reason: 'consent_required' };
  if (!isValidTurnstileToken(input.turnstileToken)) {
    return { ok: false, reason: 'missing_turnstile_token' };
  }

  return {
    ok: true,
    data: {
      name: (input.name as string).trim(),
      phone: (input.phone as string).trim(),
      service: input.service as ServiceOption,
      message: typeof input.message === 'string' ? input.message.trim() : '',
      consent: true,
    },
    turnstileToken: input.turnstileToken as string,
    pageUrl: isValidPageUrl(input.pageUrl) ? input.pageUrl : '',
  };
}
