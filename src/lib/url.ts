// Hanapage(Next.js) 프록시가 기본 trailingSlash:false 정책으로 /bunnycode/...
// 요청을 슬래시 없는 형태로 308 리다이렉트하기 때문에, 실제 최종 200 응답 URL은
// 언제나 트레일링 슬래시가 없다(예: https://hanapage.co.kr/bunnycode/homepage).
// canonical / og:url / JSON-LD url / sitemap / 내부 링크를 전부 이 최종 URL
// 형식과 일치시키기 위해, 경로 조합은 반드시 이 헬퍼를 거친다.

function stripTrailingSlash(value: string): string {
  const stripped = value.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
}

/** base('/bunnycode/') 기준 내부 경로. 예: internalPath('homepage/') -> '/bunnycode/homepage' */
export function internalPath(subPath: string = ''): string {
  const base = import.meta.env.BASE_URL;
  return stripTrailingSlash(`${base}${subPath}`);
}

/** 최종 200 응답 URL과 일치하는 절대 URL. 예: canonicalUrl('homepage/') -> 'https://hanapage.co.kr/bunnycode/homepage' */
export function canonicalUrl(subPath: string = ''): string {
  const siteOrigin = import.meta.env.SITE ?? 'https://hanapage.co.kr';
  return `${siteOrigin}${internalPath(subPath)}`;
}
