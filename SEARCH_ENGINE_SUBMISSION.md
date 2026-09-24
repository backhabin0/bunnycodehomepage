# 검색엔진 등록 체크리스트 (Google / Naver / Bing)

이번 SEO/AEO/GEO 작업(캐노니컬 정리, 신규 서비스 페이지 3개, 내부 링크, sitemap 등)을
Production에 배포한 뒤, 아래 순서로 진행한다. 여기 있는 작업은 모두 각 검색엔진
콘솔에서 사람이 직접 처리해야 하는 절차이며, 코드로 자동화하지 않는다.

## 1. Google Search Console

1. **속성 확인**: `hanapage.co.kr` 속성이 이미 등록·소유 확인되어 있는지 확인한다
   (Hanapage 루트 프로젝트의 `naver-site-verification` meta는 이미 코드에 존재하는
   것을 확인했다 — Google 소유 확인 메타/DNS 레코드 상태는 Search Console에서
   직접 확인 필요).
2. **sitemap 제출**:
   - `https://hanapage.co.kr/sitemap.xml` (기존)
   - `https://hanapage.co.kr/bunnycode/sitemap.xml` (BunnyCode — 이번에 6개 URL로 갱신)
   - `HANAPAGE_ROOT_SEO_REQUIRED.md`의 robots.txt 수정이 먼저 반영되어야
     Search Console이 두 번째 sitemap을 robots.txt에서도 자동 발견한다. robots.txt
     수정 전이라도 Search Console에 수동으로 sitemap URL을 추가 제출하면 된다.
3. **URL 검사(URL Inspection) 색인 요청** — 아래 6개 URL을 하나씩:
   - `https://hanapage.co.kr/bunnycode`
   - `https://hanapage.co.kr/bunnycode/homepage`
   - `https://hanapage.co.kr/bunnycode/affordable-homepage`
   - `https://hanapage.co.kr/bunnycode/web-development` (신규)
   - `https://hanapage.co.kr/bunnycode/landing-page` (신규)
   - `https://hanapage.co.kr/bunnycode/app-development` (신규)
   - 반드시 트레일링 슬래시 없는 위 URL로 검사한다 (슬래시 버전은 308로
     리다이렉트되므로 검사 시 최종 URL이 위와 동일하게 나오는지도 함께 확인한다).
4. **Core Web Vitals 리포트** 확인 — 특히 `PageHero`를 사용하는 5개 서비스
   상세 페이지의 LCP가 이번 `fetchpriority="high"` 변경 이후 실제로 개선되는지
   몇 주 뒤 데이터로 확인한다.
5. **Search performance** 리포트에서 핵심 검색어(가성비 홈페이지 제작 / 홈페이지
   제작 / 홈페이지 개발 / 랜딩페이지 제작 / 앱 개발) 노출·클릭 추이를 주기적으로
   확인한다.
6. **Generative AI 방문/노출 리포트**: 2026년 기준 Search Console에 AI Overviews
   등 생성형 AI 노출 관련 리포트가 제공된다면(계정/지역에 따라 제공 여부가 다를 수
   있음), 이 리포트도 함께 추적 대상에 포함한다. 별도 설정 없이 자동 집계되는
   항목이므로, 리포트 존재 여부만 확인하고 정기적으로 확인 목록에 추가한다.

## 2. Naver Search Advisor

1. `hanapage.co.kr` 사이트 소유 확인 (이미 `naver-site-verification` meta 태그가
   Hanapage 루트 layout에 존재하는 것을 확인했으므로, Search Advisor에서 소유
   확인이 이미 되어 있는지만 확인하면 된다).
2. **robots.txt 확인**: Search Advisor의 robots.txt 검사 도구로
   `https://hanapage.co.kr/robots.txt`를 조회해 `/bunnycode` 관련 차단이 없는지
   재확인한다.
3. **sitemap 제출**: `https://hanapage.co.kr/bunnycode/sitemap.xml`을 별도로
   제출한다(Naver는 Google과 마찬가지로 여러 sitemap 제출을 지원한다).
4. **수집 요청**: 6개 BunnyCode URL(위 목록과 동일)을 웹마스터도구의 "수집 요청"으로
   개별 제출한다.
5. **색인 여부 확인**: `site:hanapage.co.kr/bunnycode` 검색으로 실제 색인
   상태를 주기적으로 확인한다.

## 3. Bing Webmaster Tools (권장)

1. Bing Webmaster Tools는 Google Search Console에서 **site import** 기능으로
   속성을 가져올 수 있으므로, 처음부터 다시 등록할 필요 없이 이 기능을 우선
   시도한다.
2. import가 안 되는 경우 `hanapage.co.kr`을 직접 추가하고 소유 확인 후
   `https://hanapage.co.kr/bunnycode/sitemap.xml`을 제출한다.
3. Bing도 Schema.org JSON-LD와 sitemap.xml 표준을 사용하므로, 이번 작업에서
   추가한 JSON-LD(WebPage/Service/BreadcrumbList/FAQPage)가 별도 수정 없이
   그대로 적용된다.

> 이 단계에서 위 세 서비스의 계정을 자동으로 생성하지 않았다. 위 절차는 사람이
> 직접 각 콘솔에 로그인해 진행해야 한다.
