# Cloudflare Turnstile 설정 가이드

문의 폼의 스팸 방지 1차 방어선입니다. 클라이언트 위젯 통과만으로는 신뢰하지 않고,
서버(`src/lib/turnstile.ts`)가 매 요청마다 Cloudflare의 siteverify API를 호출해
다시 확인합니다.

> ⚠️ **이 프로젝트는 Cloudflare에 호스팅되지 않습니다.** 사이트는 Vercel에 배포됩니다
> (`VERCEL_DEPLOYMENT.md` 참고). 여기서 말하는 "Cloudflare"는 오직 **Turnstile
> 스팸 방지 서비스**만을 가리키며, Cloudflare Pages/Workers 같은 호스팅과는
> 무관합니다. Turnstile은 순수하게 외부 API(`challenges.cloudflare.com`)로만
> 호출되므로 어느 플랫폼에 호스팅하든 동일하게 사용할 수 있습니다.

## 1. 위젯 생성

1. Cloudflare Dashboard → **Turnstile** → **Add widget**
2. Widget name: 예) `BunnyCode 문의 폼`
3. **Domain**에 다음을 등록합니다:
   ```
   hanapage.co.kr
   ```
   - BunnyCode Vercel 프로젝트를 external rewrite 없이 직접 열어 테스트하려면
     자체 `*.vercel.app` 도메인(예: `BUNNYCODE_PROJECT.vercel.app`)도 추가
     Domain으로 함께 등록해두면 Preview 배포에서도 위젯이 정상 렌더링됩니다.
   - 로컬 개발(`localhost`)에서도 테스트하려면 `localhost`를 추가 도메인으로 등록하거나,
     Cloudflare가 제공하는 [공식 테스트 sitekey/secret](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)을
     로컬 전용으로 사용할 수 있습니다. 다만 이 테스트 키를 운영 환경변수에
     그대로 쓰지 않도록 주의하세요.
4. Widget Mode는 기본값(Managed)을 사용하면 됩니다.

## 2. 발급되는 두 개의 키

| 키 | 용도 | 어디에 설정 |
|---|---|---|
| **Site Key** | 브라우저에서 위젯을 렌더링할 때 사용. 공개되어도 되는 값. | `PUBLIC_TURNSTILE_SITE_KEY` (Vercel 대시보드 Environment Variables, 로컬은 `.env`) |
| **Secret Key** | 서버가 siteverify를 호출할 때 사용. **절대 브라우저에 노출하면 안 됨.** | `TURNSTILE_SECRET_KEY` (Vercel 대시보드 Environment Variables, 로컬은 `.env`) |

## 3. 클라이언트 동작

- `src/components/ContactModal.astro`가 모달이 처음 열릴 때
  `https://challenges.cloudflare.com/turnstile/v0/api.js`를 지연 로드하고,
  `PUBLIC_TURNSTILE_SITE_KEY`로 위젯을 렌더링합니다.
- 폼 제출 시 위젯에서 받은 토큰(`turnstile.getResponse(...)`)을 JSON 바디의
  `turnstileToken` 필드로 API에 함께 전달합니다.
- 전송 성공/실패와 무관하게 `turnstile.reset(...)`으로 위젯을 초기화해
  같은 토큰을 재사용하지 않도록 합니다.

## 4. 서버 검증 (반드시 수행)

`src/pages/api/contact.ts` → `src/lib/turnstile.ts`의 `verifyTurnstileToken()`이
`https://challenges.cloudflare.com/turnstile/v0/siteverify`를 `POST`로 호출해
다음을 확인한 뒤에만 이메일을 발송합니다.

1. `token`이 존재하고 길이가 비정상적으로 길지 않은지 (`isValidTurnstileToken`)
2. siteverify 응답의 `success === true`
3. 운영 환경에서만 siteverify가 반환한 `hostname`도 `hanapage.co.kr`인지 추가
   확인합니다 — 로컬/`*.vercel.app` 직접 접속 환경까지 이 조건을 강제하면 개발
   중 테스트가 불가능해지므로, 운영 hostname일 때만 강제합니다.

   "운영 환경 여부"는 단순히 `request.url`의 hostname으로 판단하지 않습니다.
   기존 Hanapage 프로젝트의 external rewrite를 거치면 이 함수가 실제로 받는
   요청의 URL은 `hanapage.co.kr`이 아니라 BunnyCode 자체 `*.vercel.app`
   도메인이 되기 때문입니다. 대신 Vercel이 원래 호스트를 실어 보내는
   `x-forwarded-host` 헤더를 우선 확인합니다(`resolvePublicHostname()`,
   `src/pages/api/contact.ts`). 이 헤더가 없으면(= 직접 접속) `request.url`의
   hostname으로 대체합니다.

## 5. 주의사항

- Secret Key는 어떤 경우에도 로그에 출력하지 않습니다 (`src/lib/env.ts`,
  `src/pages/api/contact.ts` 어디에도 `console.log`로 env 값을 남기는 코드가 없습니다).
- Turnstile 검증 실패는 사용자에게 "문의 전송에 실패했습니다..." 같은 일반적인
  메시지로만 안내하고, 실패 사유(토큰 만료/hostname 불일치 등)는 노출하지 않습니다.
- Honeypot(`companyWebsite`) 필드와 제출 속도 체크는 Turnstile을 보완하는 보조 수단일
  뿐, Turnstile 서버 검증을 대체하지 않습니다.
