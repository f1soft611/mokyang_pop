# MOKYANG_POP

기존 WPF(C#) 현장용 POP 프로그램(iPlusPOP)을 **React 기반으로 1:1 변환**하는 프로젝트.

- 원본 소스: `C:\Users\USER\Downloads\1.POP\1.POP\iPlusPOP` (WPF, .NET Framework 4.7.2, SVN)
- 이번 범위: **생산실적관리** 화면(`View/Production2`)과 그 팝업 4개. 메인메뉴, 로그인은 진입 경로로만 필요.
- 출력물(라벨/리포트 인쇄)은 **나중에**. 버튼 자리만 두고 비활성.

## 작업 전에 반드시 읽을 문서

1. [docs/handoff/2026-11-13-handoff.md](docs/handoff/2026-11-13-handoff.md) — 지금까지 결정된 것, 진행 상태, 다음 할 일
2. [docs/legacy-analysis/production2-inventory.md](docs/legacy-analysis/production2-inventory.md) — 기존 생산실적 화면 전체 사양(화면, 동작, SP, 상태 흐름, 버그 목록). **변환의 사양서 역할**

## 확정된 결정

- 스택: **React + Vite (TypeScript) + Spring Boot + MyBatis + MSSQL + Material Design 3**
- 백엔드는 **송연과 같은 전자정부 부트 4.3(Spring Boot 2.7.18) · Java 8 · war(톰캣 9)** (2026-11-17 전환, 설계 [docs/superpowers/specs/2026-11-17-backend-egov-java8-design.md](docs/superpowers/specs/2026-11-17-backend-egov-java8-design.md)). Java 9+ 문법(record, List.of/Map.of, 텍스트 블록 등) 쓰지 말 것 — `Maps.of`, `Arrays.asList` 사용. 이 PC 의 JDK 8: `C:\Program Files\Java\jdk1.8.0_201`, 시험용 톰캣 9: `D:\workspace\tools\apache-tomcat-9.0.98`(포트 8090).
- S_ERP(`D:\workspace\S_ERP`) 구조를 따를 필요 없음 (팀 결정)
- 화면 배치와 동작은 **기존과 똑같이**. 사용 방식은 **웹**(2026-11-17 회사 결정): 현장 PC·태블릿(가로) 브라우저로 접속, Spring Boot jar 하나가 화면까지 제공. 로그인 누를 때 전체화면, _ 는 전체화면 해제, 로그인 X 숨김. 설계 [docs/superpowers/specs/2026-11-17-web-conversion-design.md](docs/superpowers/specs/2026-11-17-web-conversion-design.md), 계획 [docs/superpowers/plans/2026-11-17-web-conversion.md](docs/superpowers/plans/2026-11-17-web-conversion.md), 현장 안내 [docs/site-guide.md](docs/site-guide.md). **배포: 화면은 Vercel, 백엔드는 별도 서버**(2026-11-17 변경, S_ERP·SONGYEON_ERP 와 같은 방식) — 화면은 `VITE_API_BASE_URL` 로 백엔드를 찾고, 백엔드는 `pop.cors.allowed-origins` 에 있는 주소만 허용. 안내 [docs/deploy-vercel.md](docs/deploy-vercel.md). 백엔드 https 주소·위치는 아직 미정. 설치형 껍데기(desktop 폴더)와 화면 키보드 연결(useTabTip)은 git 시작 때 삭제함(2026-11-17, 백업 D:\workspace\MOKYANG_POP_desktop_backup_20261117.zip). 터치 PC 키보드는 Windows 설정으로(현장 안내 참고)
- DB는 기존 MSSQL(iPlusERP_DAERYUNG)과 기존 SP를 그대로 호출. 접속정보는 코드/문서에 쓰지 말 것
- 기존 버그 처리 기준:
  1. 의도는 코드에 보이는데 구현이 잘못된 것 → 의도대로 구현 (예: 작업 중 공정 X 버튼 숨김)
  2. 업무 규칙/계산 방식 → 이상해 보여도 그대로 (예: 수율 공식, 투입수량 상한, `_test` 작업의뢰서 URL, 공장코드 하드코딩)
  3. 앱이 죽거나 데이터가 깨지는 오류 → 최소한으로 수정 (예: LOT 행삭제 크래시, LOT 번호 문자열 연결)
  4. 애매한 건 설계 문서에 표시하고 사용자 검토

## 작업 방식

- 사용자와는 한국어로 대화. 사용자는 비개발 용어로 설명하는 것을 선호.
- superpowers 워크플로 사용 중: brainstorming → 설계 문서 승인 → writing-plans → 구현. **설계 승인 완료(2026-11-13)**: [docs/superpowers/specs/2026-11-13-production-react-design.md](docs/superpowers/specs/2026-11-13-production-react-design.md). 첫 계획 [docs/superpowers/plans/2026-11-13-foundation-login.md](docs/superpowers/plans/2026-11-13-foundation-login.md)(기반+로그인+메인메뉴) 구현 완료. 진행 기록은 `.superpowers/sdd/2026-11-13-foundation-login/progress.md`. 두 번째 계획 [docs/superpowers/plans/2026-11-13-production-query.md](docs/superpowers/plans/2026-11-13-production-query.md)(생산 조회) 구현 완료, 기록은 `.superpowers/sdd/2026-11-13-production-query/progress.md`. 세 번째 계획 [docs/superpowers/plans/2026-11-13-production-save.md](docs/superpowers/plans/2026-11-13-production-save.md)(실적 입력·저장 + 자재투입) 구현 완료, 기록은 `.superpowers/sdd/2026-11-13-production-save/progress.md`. 네 번째 계획 [docs/superpowers/plans/2026-11-16-work-prodplan-popup.md](docs/superpowers/plans/2026-11-16-work-prodplan-popup.md)(생산일정 팝업) 구현 완료, 기록은 `.superpowers/sdd/2026-11-16-work-prodplan-popup/progress.md`. 다섯 번째 계획 [docs/superpowers/plans/2026-11-16-work-daily-popup.md](docs/superpowers/plans/2026-11-16-work-daily-popup.md)(작업일보 팝업 + 외부 주소 열기) 구현 완료, 기록은 `.superpowers/sdd/2026-11-16-work-daily-popup/progress.md`. 팝업 공통: `frontend/src/shared/popup/PopupLayer.tsx`(뒤 화면 흐림), `pages/production/components/popupParts.tsx`·`popupShared.ts`(버튼·날짜·조회 훅). 외부 주소는 `desktop.openExternal`(https만). **도면 링크는 사용자가 확인하기 전까지 열지 않는다**(작업일보·메인 [도면] 모두, 2026-11-16 지시) — 선택/도면 유무 알림만. 작업일보 합계 건수는 0건이면 0(사용자 결정, 원본과 다름). 여섯 번째 계획 [docs/superpowers/plans/2026-11-16-stock-list-popup.md](docs/superpowers/plans/2026-11-16-stock-list-popup.md)(재고 조회 팝업 [+] + 메인 [작업의뢰서]/[도면] 알림만) 구현 완료, 기록은 `.superpowers/sdd/2026-11-16-stock-list-popup/progress.md`. 작업의뢰서 링크도 확인 전까지 열지 않음. 일곱 번째 계획 [docs/superpowers/plans/2026-11-16-production-lot-popup.md](docs/superpowers/plans/2026-11-16-production-lot-popup.md)(LOT 생성 팝업, 004/005 [실적 등록]·[라벨출력]·[매수+]·[ROLL+]) 구현 완료, 기록은 `.superpowers/sdd/2026-11-16-production-lot-popup/progress.md`. 팝업 4개 모두 완료. 여덟 번째 계획 [docs/superpowers/plans/2026-11-16-tabtip-keyboard.md](docs/superpowers/plans/2026-11-16-tabtip-keyboard.md)(화면 키보드: 품목 검색·참고사항 칸, 원본 WPFTabTip 과 같은 순서 — `desktop/src/tabTip.mjs`, `frontend/src/shared/desktop/useTabTip.ts`) 구현 완료, 기록은 `.superpowers/sdd/2026-11-16-tabtip-keyboard/progress.md`. 이 PC(Win11)에서 품목 검색 열림/닫힘 확인. Electron 을 이 VS Code 터미널에서 띄울 때는 `ELECTRON_RUN_AS_NODE` 를 지워야 함. 링크(도면·작업의뢰서)·라벨출력 외 원본 기능 모두 구현됨. 아홉 번째 계획 [docs/superpowers/plans/2026-11-17-web-conversion.md](docs/superpowers/plans/2026-11-17-web-conversion.md)(웹 전환) 구현 완료, 기록은 `.superpowers/sdd/2026-11-17-web-conversion/progress.md`. LOT 팝업: 사용자 확인(2026-11-16) — LOT 생성 뒤 권취/BOX당 매수 NumberPad 안 열림, 입고량은 칸 한 번 누르면 NumberPad. LOT 저장 흐름 DEV 확인 완료(2026-11-16): 슬리터 / 작업장 슬리터 / 미완료 전체 포함 → 계획 20260703/37(제품 011552), 설비·작업자를 [준비 시작] 전에 선택해야 함(준비 상태에선 설비 못 바꿈), 1급지 LOT C260701190 → LOT 4건 저장·자동 마감까지 확인. 슬리터 목록 조회는 약 80초. 앞 공정이 있는 계획의 1급지는 제품코드와 같은 반제품 LOT 만 투입 가능. 가공(004) BOX 경로는 DEV 에 시작 가능한 계획이 없어 미확인. 시험 중 [준비 시작]만 된 슬리터 실적 2건(20260804/1, 20260720/3)이 DEV 에 남아 있음. [행삭제] 실패 시 현재 방식 유지(사용자 승인). 재고 조회 DEV 확인: 인쇄/인쇄 5호기/수주 202607310005 → 자재투입 [+] → 원단/PET/860, 32건. 작업일보 DEV 확인 조건: 인쇄/인쇄 5호기/2026-11-13 → 2건. 생산일정 DEV 확인 조건: 가공(004) / 작업장 없음 → 11/17 1건. DEV의 생산일정 SP에는 INPUT_DATE(자재 입고일) 컬럼이 없음. 시험용 재고 LOT 예: B260700554(10자리, TMA922M). 테스트 DB 확인용 조회 조건: 인쇄(001) / 인쇄 5호기(008) / 미완료 전체 포함 → 16건. 생산계획 SP는 한 번에 14~23초 걸림. 화면 시제품(spike)은 사용자 요청으로 먼저 만들어 둠.
- 원본 로직과 달라지는 수정 금지(사용자 지시). 확정된 예외와 크래시/데이터 깨짐 최소 수정만 허용.
- 개발 DB는 `iPlusERP_MOKYANG`(2026-11-17 변경, 사용자: 테스트 진행 가능). 이전 개발 DB는 `iPlusERP_DEARYUNG_DEV` — 아래 DEV 확인 기록은 그 DB 기준. 운영 DB에는 붙지 않는다.
- git 저장소: https://github.com/f1soft-repo/mokyang-pop (main). 2026-11-17 시작. `.superpowers/` 작업 기록도 올린다(사용자 결정), `*.log` 와 application-local.yml 은 올리지 않는다.

## 실행

```bash
# 서버 (테스트 DB). backend/src/main/resources/application-local.yml 필요(.example 참고, 공유 금지)
cd backend && mvn spring-boot:run   # 프로필 생략 시 local(application.yml 의 profiles.default)
mvn test              # DB 없이
mvn -Pdev-db test     # 테스트 DB에 붙는 테스트

# 화면
cd frontend && npm install
npm run dev     # 개발 서버 (/api → localhost:8080 프록시)
npm test        # Vitest
npm run build   # 타입체크 + 빌드

# 운영용: 톰캣 9 에 올릴 war (송연처럼 application-local.yml 이 war 안에 들어감 → war 만 올리면 뜸. 2026-11-17 사용자 결정. git 에는 계속 안 올림)
cd backend && mvn clean -DskipTests package   # target/mokyang-pop-backend.war (JDK 8 로 빌드 권장: JAVA_HOME=jdk1.8)
#   서버에서 값을 바꿀 때만: CATALINA_OPTS=-Dspring.config.additional-location=file:<경로>/application-local.yml
#   주소: http://서버:포트/mokyang-pop-backend/api/...  (Vercel 의 VITE_API_BASE_URL 도 이 주소까지)
# 화면까지 war 에 넣을 때만: frontend 에서 npm run build 후 mvn clean -Pweb -DskipTests package
# (clean 은 target/classes 를 지우므로 실행 중인 spring-boot:run 개발 서버는 다시 켤 것)

```

- 아이콘은 `<FaIcon code={0xf2d1} />`처럼 숫자로 지정한다. 파일 쓰기 도구가 백슬래시-u 이스케이프를 보이지 않는 글자로 바꿔 저장하기 때문이다.
