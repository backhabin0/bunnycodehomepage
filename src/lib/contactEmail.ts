import { escapeHtml, sanitizeHeaderValue, type ContactPayload } from './contactValidation';

export interface ContactEmailInput extends ContactPayload {
  pageUrl: string;
  receivedAt: Date;
}

function formatReceivedAt(date: Date): string {
  return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/** 사용자가 입력한 이름/서비스가 메일 헤더에 개행을 주입하지 못하도록 처리한다. */
export function buildContactEmailSubject(input: ContactEmailInput): string {
  const service = sanitizeHeaderValue(input.service);
  const name = sanitizeHeaderValue(input.name);
  return `[BunnyCode 문의] ${service} - ${name}`;
}

export function buildContactEmailText(input: ContactEmailInput): string {
  return [
    'BunnyCode 새 문의',
    '',
    '이름:',
    input.name,
    '',
    '관심 서비스:',
    input.service,
    '',
    '전화번호:',
    input.phone,
    '',
    '문의 내용:',
    input.message || '(입력 없음)',
    '',
    '접수 시간:',
    formatReceivedAt(input.receivedAt),
    '',
    '페이지:',
    input.pageUrl || '(알 수 없음)',
  ].join('\n');
}

/**
 * 사용자 입력값(이름/전화번호/서비스/문의내용)은 반드시 escapeHtml을 거친
 * 뒤에만 HTML에 삽입한다. <script>, <img>, <a> 같은 태그가 들어와도
 * 메일 HTML 구조가 깨지거나 실행되지 않는다.
 */
export function buildContactEmailHtml(input: ContactEmailInput): string {
  const rows: Array<[string, string]> = [
    ['이름', input.name],
    ['관심 서비스', input.service],
    ['전화번호', input.phone],
    ['문의 내용', input.message || '(입력 없음)'],
    ['접수 시간', formatReceivedAt(input.receivedAt)],
    ['페이지', input.pageUrl || '(알 수 없음)'],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 14px;color:#A92E59;font-weight:700;white-space:nowrap;vertical-align:top;font-size:13px;">${escapeHtml(
            label
          )}</td>
          <td style="padding:10px 14px;color:#333333;white-space:pre-wrap;font-size:14px;line-height:1.6;">${escapeHtml(
            value
          )}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:24px;background:#FCE4EC;font-family:'Noto Sans KR',Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #F5CDDA;">
      <tr>
        <td style="background:#F24F87;color:#FFFFFF;padding:20px 24px;font-size:18px;font-weight:800;">
          BunnyCode 새 문의
        </td>
      </tr>
      <tr>
        <td style="padding:8px 4px;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
