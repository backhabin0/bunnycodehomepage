// Vercel "Routing Middleware" (공식 명칭). Astro의 자체 미들웨어(src/middleware.ts)와는
// 완전히 다른 별개 기능이며, 반드시 프로젝트 루트(package.json과 같은 위치)에
// 있어야 Vercel이 인식한다. 모든 요청이 캐시 확인/함수 호출보다 먼저 이 레이어를
// 통과한다 — 그래서 정적으로 prerender된 페이지에 대한 요청도 여기서 가로챌 수 있다.
// (https://vercel.com/docs/routing 참고: "Vercel's CDN evaluates routing rules on
// every request before checking any cache or invoking your functions.")
//
// 왜 필요한가:
// astro.config.mjs의 base('/bunnycode/')는 생성되는 HTML 안의 링크/asset 경로만
// '/bunnycode/...'로 바꿔줄 뿐, Astro가 내부적으로 매칭하는 라우트 자체는 여전히
// base 없는 경로(/, /homepage/, /api/contact 등)다. 이 BunnyCode Vercel 프로젝트가
// 자기 자신의 *.vercel.app 도메인에서도 '/bunnycode/...' 경로로 정상 응답하려면,
// 실제 라우팅에 들어가기 전에 '/bunnycode' 접두어를 떼어내는 리라이트가 필요하다.
// (@astrojs/vercel는 Cloudflare 어댑터와 달리 base를 감안해 정적 파일을
// 'bunnycode/' 하위로 재배치해주지 않는다 — 소스에서 직접 확인함)
//
// vercel.json의 "rewrites"는 Astro 프로젝트에서 공식적으로 지원되지 않으므로
// (Vercel 공식 문서: "You should not use vercel.json to rewrite URL paths with
// astro projects; doing so produces inconsistent behavior") 대신 이 Routing
// Middleware의 rewrite() 헬퍼를 사용한다.
//
// 기존 Hanapage Vercel 프로젝트가 /bunnycode/:path* 를 이 프로젝트의
// /bunnycode/:path* 로 external rewrite하므로, 브라우저 주소창은 항상
// hanapage.co.kr/bunnycode/... 로 유지된다. 이 미들웨어는 그 뒤에서
// "이 프로젝트 안에서" 접두어를 한 번 더 벗겨내는 내부 리라이트일 뿐,
// 사용자에게 보이는 URL에는 아무 영향이 없다.
import { rewrite } from '@vercel/functions';

// Vercel이 matcher를 배포 시 정적으로 분석하므로(코드를 실행하지 않고 AST만
// 읽는다), template literal은 지원하지 않는다("Unhandled type: TemplateLiteral"
// 빌드 오류 발생). 반드시 literal string으로 작성한다.
// astro.config.mjs의 base('/bunnycode/')와 값이 반드시 일치해야 한다.
export const config = {
  matcher: '/bunnycode/:path*',
};

const PREFIX_PATTERN = /^\/bunnycode(\/|$)/;

export default function middleware(request: Request) {
  const url = new URL(request.url);

  if (!PREFIX_PATTERN.test(url.pathname)) {
    return; // 매칭되지 않으면 그대로 통과 (matcher가 이미 걸러주지만 방어적으로 한 번 더 확인)
  }

  url.pathname = url.pathname.replace(PREFIX_PATTERN, '/') || '/';
  return rewrite(url);
}
