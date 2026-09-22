# 바니코드 (BunnyCode) 홈페이지

기존 정적 `index.html` 원페이지 디자인을 유지한 채, Astro + TypeScript 기반의
확장 가능한 프로젝트 구조로 전환한 버전입니다.

- 1단계: 정적 페이지 전환 / `/bunnycode/` base path / 기본 SEO·JSON-LD
- 2단계: `/homepage/`, `/affordable-homepage/` 서비스 SEO 상세 페이지
- 3단계: 문의 모달 + Resend 이메일 발송 + Cloudflare Turnstile 스팸 방지
- 4단계(현재): 배포 대상을 Cloudflare Workers → **Vercel**로 전환

- 최종 서비스 주소: **https://hanapage.co.kr/bunnycode/**
- 배포 구조: 이 저장소는 **별도의 BunnyCode Vercel 프로젝트**로 배포되고, 별도
  저장소인 기존 **Hanapage Vercel 프로젝트**가 `/bunnycode/*` 요청을 이
  프로젝트로 external rewrite합니다. 자세한 내용은
  [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) 참고.
- **Cloudflare는 더 이상 호스팅에 사용하지 않습니다.** Cloudflare Turnstile만
  스팸 방지 서비스로 계속 사용합니다 (`TURNSTILE_SETUP.md` 참고).

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:4321/bunnycode/)
npm run build    # .vercel/output/ 에 Vercel Build Output API 아티팩트 생성
npm run preview  # 빌드 결과 로컬 미리보기
npm test         # 문의 폼 서버 검증 로직 단위 테스트 (Node 내장 테스트 러너, 추가 의존성 없음)
```

## 폴더 구조

```
middleware.ts               # Vercel Routing Middleware (프로젝트 루트, src/ 아님).
                             # /bunnycode/* 요청의 접두어를 내부적으로 제거해
                             # 이 프로젝트 자체 도메인에서도 base path가 동작하게 한다.

src/
  components/
    Header.astro / Hero.astro / Services.astro / Portfolio.astro
    Process.astro / Contact.astro / Footer.astro
    Breadcrumb.astro / PageHero.astro / Faq.astro   # /homepage/, /affordable-homepage/ 공용
    ContactModal.astro   # 사이트 전체에서 재사용하는 단일 문의 모달

  layouts/
    BaseLayout.astro   # <head> SEO 메타, OG, Twitter Card, JSON-LD, ContactModal 삽입

  lib/
    contactValidation.ts       # 문의 폼 서버 검증 (순수 함수, 플랫폼 비의존 → 단위 테스트 가능)
    contactValidation.test.ts  # 위 로직에 대한 자동 테스트 (npm test)
    contactEmail.ts            # 메일 제목/본문(text·HTML) 생성, 사용자 입력 escape 처리
    turnstile.ts                # Cloudflare Turnstile siteverify 서버 검증
    env.ts                      # 서버 전용 환경변수(process.env) 접근 헬퍼

  pages/
    index.astro
    homepage/index.astro
    affordable-homepage/index.astro
    api/contact.ts   # 문의 API. 이 라우트만 `prerender = false`로 요청 시 실행됨

  styles/
    global.css

public/
  assets/
  sitemap.xml

legacy/
  index-original.html   # 1단계 이전 원본 정적 HTML 백업

.env.example   # 로컬 개발용 환경변수 예시 (서버 secret + 클라이언트 공개 변수 모두 포함)
```

## 문의 폼 + Resend + Turnstile 아키텍처

- `/`, `/homepage/`, `/affordable-homepage/` 는 그대로 **정적(prerendered) HTML**입니다.
  `astro.config.mjs`는 `output`을 지정하지 않으므로 Astro 7 기본값인 `'static'`이 적용되고,
  오직 `src/pages/api/contact.ts`만 `export const prerender = false`로 선언해 그 라우트만
  Vercel Serverless Function으로 요청 시 실행됩니다. 사이트 전체를 SSR로 바꾸지 않았습니다.
- 사이트에 있던 모든 "메일 상담"류 CTA(`mailto:` 링크)는 동일한 `ContactModal` 컴포넌트를 여는
  `<button data-open-contact-modal>`로 교체했습니다. 클릭 이벤트는 `document`에 위임되어 있어
  트리거 버튼이 몇 개든, 어느 페이지에 있든 별도 배선 없이 동일하게 동작합니다.
  카카오톡 상담 링크는 기존 그대로 실제 링크(`<a>`)로 유지했습니다.
- 서버 환경변수는 Vercel Serverless Function(Node.js 런타임)의 표준 방식인
  `process.env`로 읽습니다 (`src/lib/env.ts`). 예전 단계에서 쓰던 Cloudflare
  전용 `import { env } from 'cloudflare:workers'`는 제거했습니다.
- Astro 7은 온디맨드 라우트에 기본적으로 `security.checkOrigin`(Origin 검사) 미들웨어가
  켜져 있어 `application/x-www-form-urlencoded` / `multipart/form-data` / `text/plain` 요청이
  교차 출처일 때 자동으로 403을 반환합니다. 문의 API는 `application/json`만 받으므로
  이 보호는 우회되며, 그래서 `src/pages/api/contact.ts`에 Origin 검사를 별도로 두었습니다
  (Astro 기본 보호 + 자체 Origin 검사 + Turnstile, 3중 방어).

### base path(`/bunnycode/`)가 Vercel에서 동작하는 방식

`astro.config.mjs`의 `base: '/bunnycode/'`는 생성되는 HTML의 링크/asset 경로만
`/bunnycode/...`로 만들어줄 뿐, Astro가 내부적으로 매칭하는 실제 라우트 경로는
여전히 접두어가 없는 `/`, `/homepage/`, `/api/contact` 등입니다(직접 빌드해서
확인한 내용 — `dist/homepage/index.html`처럼 접두어 없이 생성됩니다).

Vercel 공식 문서는 **Astro 프로젝트에서 `vercel.json`의 `rewrites`로 URL 경로를
바꾸는 것을 지원하지 않는다("inconsistent behavior")**고 명시하고 있어, 대신
프로젝트 루트의 `middleware.ts`(Vercel Routing Middleware)를 사용해 들어오는
`/bunnycode/*` 요청의 접두어를 실제 라우팅 전에 제거합니다. Routing Middleware는
"캐시를 확인하거나 함수를 호출하기 전에" 모든 요청에 대해 실행되므로, 정적으로
prerender된 페이지 요청도 정상적으로 가로챌 수 있습니다. 이 리라이트는 브라우저
주소창을 바꾸지 않는 내부 리라이트이므로 사용자에게는 아무 영향이 없습니다.

## 환경변수

Vercel에서는 서버 전용 값과 클라이언트 공개 값을 **같은 대시보드**(Project →
Settings → Environment Variables)에서 관리합니다. 다만 동작 방식이 다릅니다.

| 변수 | 성격 | 비고 |
|---|---|---|
| `RESEND_API_KEY` | 서버 전용 | `process.env`로 요청마다 읽음. 클라이언트 번들에 절대 포함되지 않음 |
| `CONTACT_TO_EMAIL` | 서버 전용 | 위와 동일 |
| `RESEND_FROM_EMAIL` | 서버 전용 | 위와 동일. 검증된 Resend 발신 도메인 확정 후 설정 (`RESEND_SETUP.md`) |
| `TURNSTILE_SECRET_KEY` | 서버 전용 | 위와 동일 |
| `PUBLIC_TURNSTILE_SITE_KEY` | **클라이언트에도 노출** | Vite/Astro가 **빌드 시점**에 클라이언트 번들에 값을 심는다. Vercel은 빌드 단계에서도 대시보드 값을 `process.env`로 주입하므로, 등록만 해두면 build/runtime 모두 자동 반영된다 |

민감한 값은 절대 코드나 `vercel.json`에 하드코딩하지 않습니다.

### 로컬 개발

```bash
cp .env.example .env   # 절대 커밋하지 않음 (.gitignore에 이미 등록됨)
```

값을 채운 뒤 `npm run dev` 또는 `npm run build && npm run preview`로 확인합니다.
값이 비어 있어도 앱은 죽지 않습니다 — `/api/contact`가
`{"ok":false,"error":"server_not_configured"}`(500)를 반환할 뿐이며, 이 상태로도
검증 로직(`npm test`)과 정적 페이지 3개는 전부 정상 동작합니다.

### 운영(Vercel) 배포

Vercel 대시보드 → 해당 프로젝트 → **Settings → Environment Variables**에서
5개 변수를 Production / Preview / Development 환경별로 등록합니다. 자세한
절차는 [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) 참고.

## Resend 설정

1. Resend 계정 생성 → 발신 도메인 추가 및 DNS 인증(SPF/DKIM) — 자세한 절차는
   [`RESEND_SETUP.md`](./RESEND_SETUP.md) 참고.
2. 도메인 인증이 끝난 뒤 `RESEND_FROM_EMAIL`을 예: `BunnyCode <inquiry@검증된도메인>` 형태로 설정합니다.
   **TODO: 실제 검증된 발신 도메인이 아직 확정되지 않아 임의로 값을 채우지 않았습니다.**
3. API Key는 운영 환경에서 가능하면 **Full Access가 아니라 이메일 발송(Sending)에 필요한
   최소 권한**으로 발급하는 것을 권장합니다.
4. API Key는 절대로 이 저장소에 커밋하지 않습니다. 코드에도 하드코딩하지 않습니다
   (`src/lib/env.ts`가 항상 `process.env`에서 읽습니다).
5. `from` 주소는 사용자 입력값으로 만들지 않고 항상 고정된 `RESEND_FROM_EMAIL`을 사용합니다
   (`src/pages/api/contact.ts` 참고).

## Cloudflare Turnstile 설정

**호스팅과는 무관합니다** — Turnstile은 순수 외부 API(`challenges.cloudflare.com`)
호출이라 Vercel에 배포해도 그대로 사용할 수 있습니다. Cloudflare 대시보드 →
Turnstile → Add widget에서 위젯을 만들고, 운영 hostname으로 `hanapage.co.kr`을
등록합니다. 자세한 절차는 [`TURNSTILE_SETUP.md`](./TURNSTILE_SETUP.md) 참고.

- Site Key → `PUBLIC_TURNSTILE_SITE_KEY` (클라이언트, 공개되어도 되는 값)
- Secret Key → `TURNSTILE_SECRET_KEY` (서버 전용, 절대 클라이언트에 노출하지 않음)
- 서버(`src/lib/turnstile.ts`)는 클라이언트 토큰만으로 신뢰하지 않고, 매 요청마다
  `https://challenges.cloudflare.com/turnstile/v0/siteverify`를 호출해 `success === true`를
  확인한 뒤에만 이메일을 발송합니다. 운영 환경(= 실제 hanapage.co.kr을 거쳐 들어온
  요청)에서는 siteverify가 반환한 위젯 hostname도 `hanapage.co.kr`인지 추가로
  확인합니다. "운영 환경 여부"는 external rewrite를 고려해 `x-forwarded-host`
  헤더를 우선 확인합니다 (로컬/`*.vercel.app` 직접 접속에서는 강제하지 않음).

## 문의 API

- Endpoint: `POST /bunnycode/api/contact` (클라이언트 코드는 `import.meta.env.BASE_URL`로
  이 경로를 만들기 때문에 base가 바뀌어도 하드코딩된 문자열 때문에 깨지지 않습니다)
- 요청 형식: `application/json`
- 필수 필드: `name`, `phone`, `service`(허용된 서비스 목록 중 하나), `consent`(정확히 `true`),
  `turnstileToken`
- 선택 필드: `message`(최대 2000자)
- 스팸 방지: Turnstile 서버 검증(필수) + honeypot 필드 `companyWebsite`(값이 있으면 메일을
  보내지 않고 성공처럼 응답) + 폼을 연 시각 대비 제출 시각이 지나치게 짧으면 보조적으로 차단
- Origin 검사: `https://hanapage.co.kr`, `*.vercel.app`(BunnyCode 자체 프로젝트 직접 테스트용),
  `localhost`만 허용하되, 이 검사 하나만으로 신뢰하지 않고 Turnstile 서버 검증을 항상 함께 요구합니다.
- 응답: 성공 `{ ok: true }` / 검증 실패 `400` / Turnstile 실패 `403` / 서버 설정 누락 또는
  메일 발송 실패 `500`·`502` — 어떤 경우에도 내부 오류 메시지나 키 정보는 노출하지 않습니다.
- DB에는 저장하지 않습니다. Resend 발송이 마지막 단계입니다.

## 알려진 이슈

- `@astrojs/vercel@11.0.10`(2026-09 기준 최신)이 의존하는 `@vercel/routing-utils`가
  다시 의존하는 `path-to-regexp`(6.x)에 ReDoS 관련 공개 advisory가 있습니다
  (`npm audit` 참고). 이 코드 경로는 **빌드 시점에 우리가 직접 정의한 라우트를
  처리하는 데만 쓰이고, 사용자 입력을 처리하지 않으므로** 실질적인 공격
  표면은 낮다고 판단했습니다. 다만 현재 최신 버전에서도 아직 해결되지 않은
  업스트림 이슈이므로 투명하게 남겨둡니다 — `@astrojs/vercel`이 패치를
  릴리스하면 업데이트해야 합니다.

## 다음 단계 TODO

- [ ] 서비스별 SEO 랜딩페이지 추가 (지역/서비스/상품 키워드별 다중 페이지)
- [ ] 페이지 추가에 맞춰 `public/sitemap.xml` 자동 생성으로 전환
- [ ] Google Search Console 등록 및 색인 확인
- [ ] 네이버 서치어드바이저 등록
- [ ] Google Analytics 연동
- [ ] 실제 사업자 정보(주소, 대표자명, 사업자등록번호 등) 확정 후
      `BaseLayout.astro`의 Organization JSON-LD에 반영
- [ ] 도메인 루트 `robots.txt`에 `/bunnycode/` 관련 항목 추가 (`SEO_DEPLOYMENT.md` 참고)
- [ ] 관리자 페이지 (범위 아님 — Resend 발송까지만 구현)

### 운영 전 체크리스트

- [ ] BunnyCode 저장소를 별도 Vercel 프로젝트로 Import (`VERCEL_DEPLOYMENT.md`)
- [ ] Resend 계정 생성 → 발신 도메인 추가 → SPF/DKIM 검증 완료
- [ ] `RESEND_API_KEY`(가능하면 최소 권한), `CONTACT_TO_EMAIL`, `RESEND_FROM_EMAIL`을
      Vercel 대시보드 Environment Variables에 등록
- [ ] Cloudflare Turnstile 위젯 생성 (Domain: `hanapage.co.kr` + BunnyCode `*.vercel.app`)
- [ ] `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`를 Vercel Environment Variables에 등록
- [ ] BunnyCode 프로젝트 자체 도메인(`*.vercel.app/bunnycode/...`)에서 먼저 정상 동작 확인
- [ ] 기존 Hanapage Vercel 프로젝트의 `vercel.json`에 external rewrite 추가
      (`VERCEL_DEPLOYMENT.md`의 예시 참고 — Hanapage 저장소에 추가하는 작업이며 이
      저장소 범위 밖입니다)
- [ ] 개인정보 수집 항목 문구는 현재 화면에 반영되어 있으나, **보유기간 등 정식 개인정보
      처리방침 문구는 아직 확정되지 않음** — 운영 전 확정 필요
      (`src/components/ContactModal.astro`의 TODO 주석 참고)
- [ ] `https://hanapage.co.kr/bunnycode/`에서 문의 폼 end-to-end 테스트
      (Turnstile 통과 → 메일 수신 확인)
