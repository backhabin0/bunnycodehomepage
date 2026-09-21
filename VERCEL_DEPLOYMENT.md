# Vercel 배포 가이드 (BunnyCode 별도 프로젝트)

이 문서는 **BunnyCode 저장소**를 별도의 Vercel 프로젝트로 배포하고, 기존
**Hanapage** Vercel 프로젝트(별도 저장소, `https://hanapage.co.kr`)에서
`/bunnycode/*` 요청을 이 프로젝트로 external rewrite하는 최종 구조를
설정하는 방법을 설명합니다.

**이 저장소(BunnyCode)만 수정합니다.** Hanapage 저장소의 파일은 이 문서에서
"기존 Hanapage 프로젝트에 추가해야 하는 설정 예시"로만 안내하며, 여기서
직접 만들거나 수정하지 않습니다.

## 최종 구조

```
사용자 브라우저
   │  https://hanapage.co.kr/bunnycode/...
   ▼
Hanapage Vercel 프로젝트 (별도 저장소, 수정하지 않음)
   │  vercel.json의 external rewrite
   │  /bunnycode/:path* → https://BUNNYCODE_PROJECT.vercel.app/bunnycode/:path*
   ▼
BunnyCode Vercel 프로젝트 (이 저장소)
   │  middleware.ts (Vercel Routing Middleware)가 /bunnycode 접두어를
   │  내부적으로 제거 (브라우저 URL은 바뀌지 않음)
   ▼
Astro가 실제로 알고 있는 라우트: /, /homepage/, /affordable-homepage/, /api/contact
```

## 1. BunnyCode GitHub 저장소를 별도 Vercel 프로젝트로 Import

1. https://vercel.com/new 에서 이 BunnyCode GitHub 저장소를 선택해 Import합니다.
   (Hanapage 프로젝트와는 완전히 별개의 새 Vercel 프로젝트입니다.)
2. **Framework Preset**이 자동으로 **Astro**로 감지되는지 확인합니다.
   (`@astrojs/vercel` 어댑터가 설치되어 있으므로 정상적으로 감지되어야 합니다.)
3. **Root Directory**는 이 프로젝트가 저장소 루트인지, 서브폴더인지에 맞게
   설정합니다.

## 2. 빌드 확인

Vercel은 기본적으로 `npm run build`(또는 감지된 패키지 매니저의 build 스크립트)를
실행합니다. 로컬에서 미리 확인하려면:

```bash
npm install
npm test      # 문의 폼 검증 로직 단위 테스트
npm run build # .vercel/output/ 에 Build Output API 아티팩트 생성
```

## 3. 환경변수 등록

Vercel 대시보드 → 해당 프로젝트 → **Settings → Environment Variables**에서
아래 5개를 등록합니다. 각 값마다 **Production / Preview / Development** 중
적용할 환경을 선택할 수 있습니다 — 특별한 이유가 없다면 5개 모두 세 환경에
동일하게 등록하는 것을 권장합니다(Preview에서도 문의 폼을 테스트할 수 있도록).

| 변수 | 성격 |
|---|---|
| `RESEND_API_KEY` | 서버 전용 secret |
| `CONTACT_TO_EMAIL` | 서버 전용 |
| `RESEND_FROM_EMAIL` | 서버 전용 (검증된 Resend 발신 도메인 확정 후 설정 — `RESEND_SETUP.md` 참고) |
| `TURNSTILE_SECRET_KEY` | 서버 전용 secret |
| `PUBLIC_TURNSTILE_SITE_KEY` | **빌드 타임에 클라이언트 번들에 포함됨** — Vercel은 빌드 단계에서도 이 값들을 주입하므로 등록만 해두면 됨 |

환경변수를 새로 등록/변경한 뒤에는 **다시 배포(Redeploy)**해야
`PUBLIC_TURNSTILE_SITE_KEY`가 새 빌드에 반영됩니다(서버 전용 4개는 재배포 없이도
다음 함수 호출부터 바로 반영됩니다).

## 4. Production 배포

- GitHub 저장소를 연결했다면, 기본 브랜치에 푸시할 때마다 자동으로 Production
  배포가 트리거됩니다.
- 수동으로 배포하려면 Vercel 대시보드에서 **Deployments → Redeploy**를 사용하거나
  Vercel CLI(`vercel --prod`)를 사용합니다(CLI 로그인이 필요합니다).

## 5. BunnyCode 프로젝트의 *.vercel.app 주소 확인

배포가 끝나면 Vercel 대시보드에 표시되는 Production 도메인을 확인합니다.
형태는 다음과 같습니다 (실제 프로젝트 이름은 Import 시 정해집니다):

```
https://BUNNYCODE_PROJECT.vercel.app
```

## 6. 다음 URL을 직접 테스트

external rewrite 없이, BunnyCode 프로젝트 자체 도메인에서 `/bunnycode/` 경로가
정상 동작하는지 먼저 확인합니다 (`middleware.ts`가 접두어를 처리하는지 확인하는
단계입니다):

```
https://BUNNYCODE_PROJECT.vercel.app/bunnycode/
https://BUNNYCODE_PROJECT.vercel.app/bunnycode/homepage/
https://BUNNYCODE_PROJECT.vercel.app/bunnycode/affordable-homepage/
```

세 페이지 모두 기존 디자인 그대로 정상적으로 보여야 합니다. 만약 404가 뜬다면
`middleware.ts`가 프로젝트 루트(= `package.json`과 같은 위치)에 있는지,
Vercel이 Routing Middleware로 인식했는지(배포 로그에서 확인 가능) 점검합니다.

## 7. 기존 Hanapage Vercel 프로젝트에 추가해야 하는 external rewrite

**이 설정은 Hanapage 저장소에 추가해야 합니다 — 이 BunnyCode 저장소가 아닙니다.**
아래는 Hanapage 프로젝트의 `vercel.json`에 추가할 예시입니다. `PROJECT` 부분은
6번 단계에서 확인한 실제 BunnyCode 프로젝트 도메인으로 바꿔야 합니다
(이 문서에서는 실제 프로젝트 이름을 임의로 확정하지 않습니다):

```json
{
  "rewrites": [
    {
      "source": "/bunnycode/:path*",
      "destination": "https://PROJECT.vercel.app/bunnycode/:path*"
    }
  ]
}
```

- 이미 Hanapage `vercel.json`에 다른 `rewrites` 항목이 있다면, 배열에 이 항목만
  추가하면 됩니다(기존 규칙을 덮어쓰지 않도록 주의).
- 이 rewrite는 "외부 origin으로의 rewrite"이므로 (BunnyCode가 Hanapage 입장에서는
  별도 프로젝트/별도 origin), Astro에는 적용되지 않는 `vercel.json` rewrite
  제약(같은 프로젝트 내부 rewrite 비권장)과는 무관하게 정상 지원됩니다.

## 8. 최종 사용자 URL 테스트

Hanapage 쪽 rewrite 배포가 끝난 뒤, 실제 최종 주소로 확인합니다:

```
https://hanapage.co.kr/bunnycode/
https://hanapage.co.kr/bunnycode/homepage/
https://hanapage.co.kr/bunnycode/affordable-homepage/
```

## 9. 문의 API 테스트

브라우저 개발자 도구 콘솔에서, 또는 실제 문의 모달을 통해 다음 엔드포인트가
정상 동작하는지 확인합니다:

```
https://hanapage.co.kr/bunnycode/api/contact
```

- 실제 문의 모달로 테스트하는 것이 가장 정확합니다: 사이트에서 "가격 문의하기"를
  눌러 모달을 열고, Turnstile 위젯을 통과한 뒤 제출해 이메일이 실제로
  `CONTACT_TO_EMAIL`로 도착하는지 확인합니다.
- Resend/Turnstile 환경변수가 아직 설정되지 않았다면 `{"ok":false,"error":"server_not_configured"}`
  (HTTP 500)가 반환되는 것이 정상입니다 — 코드 자체는 정상 동작 중이라는 뜻입니다.

## 참고: Cloudflare와의 관계

이 프로젝트는 **Cloudflare Workers/Pages에 배포되지 않습니다.** 유일하게 남은
Cloudflare 연동은 **Cloudflare Turnstile**(스팸 방지 서비스)뿐이며, 이는 순수
외부 API 호출(`challenges.cloudflare.com`)이라 어떤 호스팅 플랫폼에서든 동일하게
사용할 수 있습니다. 자세한 내용은 `TURNSTILE_SETUP.md`를 참고하세요.
