import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateContactPayload,
  isValidName,
  isValidPhone,
  isValidService,
  isValidMessage,
  isSubmittedTooFast,
  sanitizeHeaderValue,
  escapeHtml,
  MAX_NAME_LENGTH,
  MAX_MESSAGE_LENGTH,
  type RawContactInput,
} from './contactValidation.ts';

function validInput(overrides: Partial<RawContactInput> = {}): RawContactInput {
  return {
    name: '홍길동',
    phone: '010-1234-5678',
    service: '홈페이지 제작',
    message: '안녕하세요, 문의드립니다.',
    consent: true,
    turnstileToken: 'test-token',
    companyWebsite: '',
    formOpenedAt: Date.now() - 5000,
    pageUrl: 'https://hanapage.co.kr/bunnycode/',
    ...overrides,
  };
}

// 1. 이름 없음 → 거절
test('rejects missing name', () => {
  const result = validateContactPayload(validInput({ name: '' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'invalid_name');
});

// 2. 전화번호 없음 → 거절
test('rejects missing phone', () => {
  const result = validateContactPayload(validInput({ phone: undefined }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'invalid_phone');
});

test('rejects phone with disallowed characters', () => {
  assert.equal(isValidPhone('010-1234-5678'), true);
  assert.equal(isValidPhone('<script>alert(1)</script>'), false);
  assert.equal(isValidPhone('010 1234 5678'), true);
});

// 3. 잘못된 service → 거절
test('rejects unknown service', () => {
  const result = validateContactPayload(validInput({ service: '없는서비스' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'invalid_service');
});

test('accepts every allowed service option', () => {
  for (const service of [
    '홈페이지 제작',
    '가성비 홈페이지 제작',
    'SEO 랜딩페이지',
    '백엔드 개발',
    'Flutter 앱 제작',
    '기타',
  ]) {
    assert.equal(isValidService(service), true, `${service} should be allowed`);
  }
});

// 4. 너무 긴 message → 거절
test('rejects message longer than the limit', () => {
  const longMessage = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
  const result = validateContactPayload(validInput({ message: longMessage }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'invalid_message');
  assert.equal(isValidMessage('a'.repeat(MAX_MESSAGE_LENGTH)), true);
});

test('treats empty/omitted message as valid (optional field)', () => {
  assert.equal(isValidMessage(undefined), true);
  assert.equal(isValidMessage(''), true);
});

test('rejects name longer than the limit', () => {
  assert.equal(isValidName('a'.repeat(MAX_NAME_LENGTH)), true);
  assert.equal(isValidName('a'.repeat(MAX_NAME_LENGTH + 1)), false);
});

// 5. 개인정보 동의 false → 거절
test('rejects when consent is not exactly true', () => {
  for (const consent of [false, 'true', 1, undefined]) {
    const result = validateContactPayload(validInput({ consent }));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'consent_required');
  }
});

// 6. Turnstile token 없음 → 거절
test('rejects missing turnstile token', () => {
  const result = validateContactPayload(validInput({ turnstileToken: undefined }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'missing_turnstile_token');
});

// 7. honeypot 입력됨 → (메일 미발송 대상으로 분류됨)
test('flags filled honeypot field separately from real validation errors', () => {
  const result = validateContactPayload(validInput({ companyWebsite: 'https://spam.example' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'honeypot');
});

test('detects suspiciously fast submissions as a soft signal', () => {
  assert.equal(isSubmittedTooFast(Date.now() - 100), true);
  assert.equal(isSubmittedTooFast(Date.now() - 5000), false);
  // 신호가 없는 경우(구형 클라이언트 등)는 통과시킨다 — 이 값 하나로 거절하지 않는다.
  assert.equal(isSubmittedTooFast(undefined), false);
});

// 8. 정상 요청 → 통과(=이후 Resend 호출 가능한 상태)
test('accepts a fully valid payload', () => {
  const result = validateContactPayload(validInput());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, {
      name: '홍길동',
      phone: '010-1234-5678',
      service: '홈페이지 제작',
      message: '안녕하세요, 문의드립니다.',
      consent: true,
    });
    assert.equal(result.turnstileToken, 'test-token');
  }
});

test('trims whitespace from name/phone/message', () => {
  const result = validateContactPayload(
    validInput({ name: '  홍길동  ', phone: '  010-1234-5678  ', message: '  안녕하세요  ' })
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, '홍길동');
    assert.equal(result.data.phone, '010-1234-5678');
    assert.equal(result.data.message, '안녕하세요');
  }
});

test('sanitizeHeaderValue strips newlines to prevent header/subject injection', () => {
  assert.equal(sanitizeHeaderValue('홍길동\r\nBcc: attacker@example.com'), '홍길동 Bcc: attacker@example.com');
});

test('escapeHtml neutralizes HTML special characters', () => {
  const input = '<script>alert(1)</script> & "quoted" \'value\'';
  const escaped = escapeHtml(input);
  assert.ok(!escaped.includes('<script>'));
  assert.match(escaped, /&lt;script&gt;/);
  assert.match(escaped, /&amp;/);
  assert.match(escaped, /&quot;/);
  assert.match(escaped, /&#39;/);
});
