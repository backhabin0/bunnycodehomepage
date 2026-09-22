# Resend 발신 도메인 / API Key 설정 가이드

이 문서는 문의 폼(`src/pages/api/contact.ts`)이 실제로 이메일을 발송하기 위해
운영자가 Resend 대시보드에서 직접 해야 하는 작업을 정리한 것입니다.
DNS 레코드 값은 프로젝트마다(도메인마다) Resend가 다르게 발급하므로,
이 문서에는 **임의의 예시 값을 만들어 넣지 않습니다.** 반드시 Resend
대시보드에서 실제로 제시하는 값을 그대로 사용하세요.

## 1. 발신 도메인 추가 및 DNS 인증

1. https://resend.com 에 로그인 → **Domains** 메뉴로 이동
2. **Add Domain** 클릭 후, 실제로 발신에 사용할 도메인을 입력합니다.
   - 예: 회사 도메인(`example.com`)의 서브도메인(`mail.example.com`)을 쓰는 것도 가능합니다.
   - 이 프로젝트의 최종 발신 주소가 어떤 도메인이 될지는 아직 확정되지 않았습니다.
     **TODO: 실제 발신 도메인 확정 필요.**
3. Resend가 안내하는 **SPF**, **DKIM** (필요 시 **DMARC**) 레코드를 그대로 복사해
   해당 도메인의 DNS(가비아, Route53, Cloudflare DNS 등 실제 관리 중인 곳)에 등록합니다.
   - 레코드 이름/값/타입은 Resend 대시보드에 표시되는 값을 그대로 사용해야 합니다.
     문서나 코드에 값을 하드코딩하지 않습니다.
4. DNS 전파 후 Resend 대시보드에서 **Verify** 버튼을 눌러 상태가
   `Verified`(SPF/DKIM 모두 초록색)가 되는지 확인합니다.
   - 도메인 인증이 끝나지 않은 상태로는 실제 이메일 발송이 실패하거나
     스팸으로 분류될 수 있습니다.

## 2. API Key 생성

1. Resend 대시보드 → **API Keys** → **Create API Key**
2. 운영 환경에서는 가능하면 **Full Access가 아니라, 이메일 발송(Sending)에만
   필요한 최소 권한**으로 키를 생성하는 것을 권장합니다.
3. 생성된 키는 그 자리에서만 전체 값이 보이므로 안전한 곳(비밀번호 관리자 등)에
   즉시 보관합니다.
4. **이 키를 Git 저장소에 절대 커밋하지 않습니다.** `.dev.vars`(로컬)나
   `wrangler secret put RESEND_API_KEY`(운영)로만 전달합니다.
   자세한 명령은 `README.md`의 "환경변수 / Secret" 섹션을 참고하세요.

## 3. 발신 주소(`RESEND_FROM_EMAIL`) 설정

- 반드시 1번에서 인증을 완료한 도메인의 주소만 사용할 수 있습니다.
- 형식 예: `BaniCode <inquiry@검증된도메인>`
- 사용자가 입력한 값으로 `from`을 만들지 않습니다 — 코드(`src/pages/api/contact.ts`)는
  항상 이 고정된 환경변수 값만 사용합니다.
- **TODO: 실제 검증된 도메인이 확정되면 이 값을 `.dev.vars`(로컬) /
  `wrangler secret put RESEND_FROM_EMAIL`(운영)로 설정합니다.**

## 4. 수신 주소(`CONTACT_TO_EMAIL`)

- 문의 메일을 실제로 받을 관리자 이메일 주소입니다. Resend 도메인 인증과는 무관하게
  아무 수신 주소나 사용할 수 있습니다(예: 기존 `backhabin1029@gmail.com` 또는 다른 운영 메일).
- `.dev.vars`(로컬) / `wrangler secret put CONTACT_TO_EMAIL`(운영)로 설정합니다.

## 5. 참고

- Resend API 공식 문서: https://resend.com/docs
- 이 프로젝트는 `resend` npm 패키지(`src/pages/api/contact.ts`에서
  `import { Resend } from 'resend'`)를 사용해 `resend.emails.send()`를 호출합니다.
- 발송 실패(`result.error`)는 사용자에게 성공으로 보여주지 않으며, 서버 로그에도
  Resend가 반환하는 에러 이름만 남기고 API Key나 상세 메시지는 남기지 않습니다.
