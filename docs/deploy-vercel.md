# Vercel 배포 안내 (담당자용)

화면(frontend)은 Vercel, 백엔드(backend, Spring Boot)는 별도 서버. 회사의 S_ERP·SONGYEON_ERP 와 같은 구조.

## 1. Vercel 프로젝트 만들기
1. Vercel 에서 GitHub 저장소 `f1soft-repo/mokyang-pop` 를 Import.
2. **Root Directory: `frontend`** (Framework: Vite, Build: `npm run build`, Output: `dist` — 자동 인식).
3. Environment Variables: `VITE_API_BASE_URL` = 백엔드 https 주소 (예: `https://pop-api.회사도메인`). 끝에 `/` 없어도 됨.
4. 배포하면 `https://<프로젝트>.vercel.app` 주소가 생긴다.

## 2. 백엔드에 Vercel 주소 허용
- 백엔드 서버의 설정에 Vercel 주소를 추가한다. 둘 중 하나:
  - `application-local.yml`: `pop.cors.allowed-origins: http://localhost:*,https://<프로젝트>.vercel.app`
  - 환경변수: `POP_CORS_ALLOWED_ORIGINS=http://localhost:*,https://<프로젝트>.vercel.app`
- 백엔드 재시작.

## 3. 백엔드 조건
- **https 주소 필수** — Vercel 화면(https)이 http 백엔드를 부르면 브라우저가 막는다.
- 회사 MSSQL 에 접속 가능한 위치. **톰캣 9 + Java 8** (송연과 같은 환경).
- 배포 파일: `backend` 에서 `mvn clean -DskipTests package` → `target/mokyang-pop-backend.war` 를 톰캣 `webapps` 에 복사.
- DB 접속정보(application-local.yml, git 에는 안 올림)는 **war 안에 함께 들어간다** → war 만 올리면 뜬다. war 를 만드는 PC 의 application-local.yml 값이 들어가므로, 서버의 DB 가 다르면 그 값으로 바꾼 뒤 war 를 만든다. war 파일은 접속정보가 들어 있으니 아무에게나 주지 않는다.
  - (선택) 서버에서 값을 바꾸고 싶으면 톰캣 시작 옵션이 war 안 값보다 우선한다: `bin\setenv.bat` 에 `set CATALINA_OPTS=-Dspring.config.additional-location=file:D:/설정폴더/application-local.yml`
- 백엔드 주소는 `https://<서버>/mokyang-pop-backend` 까지 — Vercel 의 `VITE_API_BASE_URL` 에도 이 값을 넣는다.
- 2026-11-17 이 PC 에서 톰캣 9.0.98 + JDK 1.8.0_201 로 올려 확인함(상태 확인·로그인 SP·허용 목록).

## 확인
- `https://<백엔드>/api/health` → `{"database": ...}`
- Vercel 주소로 접속 → 로그인.
