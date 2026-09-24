# Hanapage 루트 프로젝트에서 처리해야 할 SEO 작업

BunnyCode(`/bunnycode/*`)는 별도 Vercel 프로젝트(Astro)이고, 최종 도메인
`hanapage.co.kr`은 별도 저장소(`landing-cms`, Next.js)가 소유한다. 이 문서는
BunnyCode 저장소에서는 수정할 수 없는, Hanapage 루트 저장소에서 처리해야 하는
항목만 정리한다. **BunnyCode 저장소에서는 이 항목들을 임의로 만들거나 수정하지
않았다.**

## 1. robots.txt에 BunnyCode sitemap 알림 추가 (권장: 선택 B)

확인 결과 Hanapage 루트의 `src/app/robots.ts`는 다음과 같이 **`Sitemap:` 한 줄만
Hanapage 자체 sitemap을 가리키고 있다** (BunnyCode 경로를 차단하는 `disallow`
규칙은 없음 — `/bunnycode`는 이미 안전하게 크롤링 가능한 상태다):

```ts
// src/app/robots.ts (Hanapage 루트, 현재 상태)
return {
  rules: {
    userAgent: "*",
    allow: "/",
    disallow: ["/admin/", "/login", "/preview/", "/api/"],
  },
  sitemap: `${baseUrl}/sitemap.xml`,
};
```

BunnyCode의 sitemap(`https://hanapage.co.kr/bunnycode/sitemap.xml`)도 검색엔진이
발견할 수 있도록, **선택 B(root robots.txt에 두 번째 Sitemap 라인 추가)**를
권장한다:

```ts
return {
  rules: {
    userAgent: "*",
    allow: "/",
    disallow: ["/admin/", "/login", "/preview/", "/api/"],
  },
  sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/bunnycode/sitemap.xml`],
};
```

**선택 A(루트 sitemap.xml에 BunnyCode URL을 직접 포함)를 권장하지 않는 이유**:
루트 `src/app/sitemap.ts`는 Supabase의 `getPublicSitemapEntries()`를 읽어
CMS 랜딩페이지 목록을 동적으로 생성하는 구조다. 여기에 BunnyCode의 6개 정적
URL을 하드코딩하면 서로 다른 소스(CMS DB vs 별도 Astro 프로젝트)가 한 파일에
섞여 유지보수 시 혼동을 유발한다. `Sitemap:` 라인을 여러 개 두는 것은
sitemaps.org/Google이 공식 지원하는 표준 방식이므로, 두 프로젝트의 sitemap을
독립적으로 유지하는 선택 B가 더 안전하다.

## 2. Vercel origin(bunnycodehomepage.vercel.app) 직접 접근 시 noindex — TODO, 미구현

BunnyCode는 `bunnycodehomepage.vercel.app/bunnycode/...`로 직접 접근해도 공개
응답한다(요청/응답을 실제로 확인함). canonical은 이미 모든 페이지에서
`https://hanapage.co.kr/bunnycode...`를 정확히 가리키므로, 검색엔진이
중복 콘텐츠로 처리하더라도 정규 URL은 항상 명확하다 — 이번 작업으로 이 부분은
확실히 정리했다.

다만 Vercel origin 직접 접근을 `X-Robots-Tag: noindex`로 한 단계 더 차단하는
것은 **이번 작업에서 구현하지 않았다.** 이유:

- BunnyCode 페이지는 모두 정적으로 prerender되므로(`astro.config.mjs`에
  `output: 'server'`를 쓰지 않음), 응답 헤더를 요청별로 다르게 주려면
  BunnyCode 저장소의 `middleware.ts`(Vercel Routing Middleware)를 수정해야
  한다. 이 middleware는 `x-forwarded-host` 헤더로 "hanapage.co.kr을 거쳐
  external rewrite로 들어온 요청"과 "bunnycodehomepage.vercel.app에 직접
  접속한 요청"을 구분할 수 있을 것으로 보이지만(`src/pages/api/contact.ts`의
  `resolvePublicHostname()`이 문의 API 경로에서 동일한 방식으로 이미 정상
  동작 중임을 실제 프로덕션에서 확인했다), **정적 페이지 경로에서도 동일하게
  안전히 구분되는지는 이번 작업에서 별도로 검증하지 않았다.**
- 지침에 따라 "확신이 없으면 canonical만 확실히 유지하고 TODO로 보고"하는
  원칙을 따랐다. noindex를 잘못 적용하면 external rewrite를 거친 정상 페이지까지
  실수로 색인 차단될 위험이 있고, 이는 검색 노출 관점에서 되돌리기 어려운
  손실이다.

**다음에 진행한다면**: BunnyCode `middleware.ts`에서 `x-forwarded-host`가
`hanapage.co.kr`이 아닐 때만 `X-Robots-Tag: noindex` 응답 헤더를 추가하고,
Vercel Production에 배포한 뒤 (1) `curl -I https://bunnycodehomepage.vercel.app/bunnycode/`
로 noindex 헤더가 실제로 붙는지, (2) `curl -I https://hanapage.co.kr/bunnycode/`
(external rewrite 경로)로는 noindex가 절대 붙지 않는지 두 가지를 모두
프로덕션에서 직접 확인한 뒤에만 적용한다.

## 3. (참고) 확인된 현재 상태 — 추가 조치 불필요

- `/bunnycode/*`가 Hanapage 루트 robots.txt에서 차단되고 있지 않음을 확인했다
  (`disallow` 목록에 없음).
- Hanapage의 기본 `trailingSlash` 정책(설정 없음 → 기본값 false)이
  `/bunnycode/...` 요청을 308로 트레일링 슬래시 없는 URL로 정규화한다는 점을
  실측 확인했고, BunnyCode 저장소 쪽 canonical/sitemap/내부 링크는 이번
  작업에서 전부 그 최종 URL(슬래시 없음) 기준으로 맞췄다. Hanapage 쪽에서는
  별도 조치가 필요 없다.
