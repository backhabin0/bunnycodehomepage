# SEO / 배포 참고 문서 (버니코드, /bunnycode/ 서브패스)

이 사이트는 도메인 루트가 아니라 `https://hanapage.co.kr/bunnycode/` 하위 경로에서
운영됩니다. 아래 항목은 실제 배포 시 반드시 확인해야 합니다.

## Canonical

- 메인 페이지 canonical: `https://hanapage.co.kr/bunnycode/`
- `www.hanapage.co.kr`은 사용하지 않습니다. 만약 `www` 요청이 들어오는 경로가 있다면
  루트 도메인(`www` 없는 버전)으로 301 리다이렉트되도록 도메인/CDN 설정에서 처리해야 합니다.
- `astro.config.mjs`의 `site: 'https://hanapage.co.kr'` + `base: '/bunnycode/'` 조합으로
  `BaseLayout.astro`가 canonical/OG URL을 자동 생성합니다.

## Sitemap

- 현재 `public/sitemap.xml`이 빌드 시 그대로 `dist/sitemap.xml`로 복사되어
  최종적으로 `https://hanapage.co.kr/bunnycode/sitemap.xml`로 서비스됩니다.
- 현재는 메인 페이지 1개만 포함되어 있습니다.
- 향후 서비스별 SEO 랜딩페이지(`/bunnycode/xxx`)가 추가되면 이 파일에 `<url>` 항목을
  함께 추가하거나, 페이지 수가 늘어나면 `@astrojs/sitemap` 같은 통합 도구 도입을 검토합니다
  (1단계에서는 불필요한 의존성 추가를 피하기 위해 정적 파일로 처리했습니다).

## robots.txt — 매우 중요

`robots.txt`는 **반드시 도메인 루트**(`https://hanapage.co.kr/robots.txt`)에 있어야
브라우저/크롤러가 인식합니다. `https://hanapage.co.kr/bunnycode/robots.txt`에 파일을
두어도 표준 크롤러는 참조하지 않습니다.

따라서 이 프로젝트(`bunnycode_html_clone_v2`) 안에는 robots.txt를 포함하지 않았습니다.
`hanapage.co.kr` 루트를 관리하는 쪽에서 아래 내용을 **루트 robots.txt에 추가/병합**해야 합니다.

```
User-agent: *
Allow: /bunnycode/
Sitemap: https://hanapage.co.kr/bunnycode/sitemap.xml
```

- 루트 도메인에 다른 프로젝트가 이미 robots.txt를 갖고 있다면, 위 `Allow`/`Sitemap` 줄만
  기존 파일에 추가하면 됩니다. 이 프로젝트가 도메인 전체의 robots 정책을 새로 정의하는 것은
  아니므로, 기존 규칙(다른 하위 경로에 대한 Disallow 등)을 덮어쓰지 않도록 주의합니다.

## /bunnycode/ 서브패스 주의사항

- 모든 내부 asset 경로(`<img src>` 등)는 `import.meta.env.BASE_URL`을 사용해 생성했습니다.
  새 컴포넌트/페이지를 추가할 때도 `/assets/...`처럼 루트 기준 경로를 하드코딩하지 말고
  반드시 `${import.meta.env.BASE_URL}assets/...` 형태를 사용해야 배포 후 이미지가 깨지지 않습니다.
- 섹션 내 이동은 해시 링크(`#service`, `#contact` 등)만 사용하므로 base 경로와 무관하게
  정상 동작합니다.
- 배포는 별도의 BunnyCode Vercel 프로젝트에서 이루어지고, 기존 Hanapage Vercel
  프로젝트가 `/bunnycode/:path*` 요청을 이 프로젝트로 external rewrite합니다.
  이 프로젝트 자체도 자기 도메인(`*.vercel.app`)에서 `/bunnycode/` 경로로
  응답해야 하므로, 프로젝트 루트의 `middleware.ts`(Vercel Routing Middleware)가
  들어오는 `/bunnycode/*` 요청의 접두어를 내부적으로 제거합니다. 자세한 내용은
  `VERCEL_DEPLOYMENT.md`를 참고하세요.

## Search Console / 서치어드바이저 (다음 단계)

- Google Search Console에 `https://hanapage.co.kr/bunnycode/`를 URL 접두어 속성으로 등록하고
  `sitemap.xml` 제출
- 네이버 서치어드바이저에도 동일하게 사이트 등록 및 사이트맵 제출
- 두 도구 모두 루트 도메인의 소유권 확인 방식(HTML 태그/DNS 등)에 따라 절차가 달라질 수 있으므로
  루트 도메인 관리자와 협의가 필요합니다.
