import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// 최종 사용자에게 보이는 서비스 주소는 계속 https://hanapage.co.kr/bunnycode/ 다.
// 실제 호스팅은 별도의 BunnyCode Vercel 프로젝트(자체 *.vercel.app 도메인)에서
// 이루어지고, 기존 Hanapage Vercel 프로젝트가 /bunnycode/:path* 요청을 이
// 프로젝트로 external rewrite한다 (자세한 내용은 VERCEL_DEPLOYMENT.md 참고).
//
// site는 배포 도메인이 아니라 "검색엔진에 노출되어야 할 진짜 공개 URL"을
// 기준으로 둔다 — canonical/OG/sitemap이 hanapage.co.kr을 가리켜야 하므로
// *.vercel.app으로 바꾸지 않는다.
//
// base는 반드시 '/bunnycode/'를 유지한다. BunnyCode Vercel 프로젝트 자체도
// https://BUNNYCODE_PROJECT.vercel.app/bunnycode/ 경로로 서비스되어야
// 위 rewrite가 그대로 맞아떨어지기 때문에, base를 '/'로 바꾸지 않는다.
//
// output은 지정하지 않는다 (Astro 7 기본값 'static' = 모든 페이지를
// prerender하고, 개별 라우트가 `export const prerender = false`로
// 선언한 경우에만 그 라우트를 요청 시 렌더링한다). 즉 /, /homepage/,
// /affordable-homepage/ 는 그대로 정적 HTML로 유지되고,
// src/pages/api/contact.ts 하나만 Vercel Serverless Function으로
// 요청 시 실행된다. output: 'server'로 바꾸면 전체 사이트가
// SSR이 되어버리므로 사용하지 않는다.
export default defineConfig({
  site: 'https://hanapage.co.kr',
  base: '/bunnycode/',
  trailingSlash: 'ignore',
  adapter: vercel(),
});
