# MOKYANG POP

React 기반 프론트엔드와 Spring Boot/eGovFrame 기반 백엔드로 구성된 생산현장관리(POP) 애플리케이션입니다. 기존 WPF POP 프로그램의 생산실적관리 화면을 웹으로 옮긴 것입니다.

## 구성

- `frontend/`: React, TypeScript, Vite 기반 사용자 화면 (Vercel 배포)
- `backend/`: Java 8, Spring Boot 2.7, eGovFrame 4.3 기반 API 서버 (톰캣 9 용 war)
- `docs/`: 원본 분석, 설계, 계획, 배포·현장 안내 문서

## 사전 요구사항

- Node.js 및 npm
- Java 8 이상 (운영 기준 Java 8)
- Maven 3.8 이상

## 실행

프론트엔드:

```bash
cd frontend
npm install
npm run dev
```

기본 주소는 `http://localhost:5173`이며, `/api` 요청은 `http://localhost:8080`으로 전달됩니다.

백엔드:

```bash
cd backend
mvn spring-boot:run
```

기본 주소는 `http://localhost:8080`입니다. DB 접속정보는 `backend/src/main/resources/application-local.yml`에 둡니다(`application-local.yml.example` 참고, 커밋하지 않음).

## 빌드

```bash
cd frontend
npm run build          # dist/ (Vercel 은 Root Directory 를 frontend 로 지정)

cd ../backend
mvn clean package      # target/mokyang-pop-backend.war (톰캣 9 webapps 에 배포)
```

배포 방법은 [docs/deploy-vercel.md](docs/deploy-vercel.md)를 참고합니다.

## 검증

```bash
cd frontend
npm run build
npm test

cd ../backend
mvn test               # DB 없이
mvn -Pdev-db test      # 테스트 DB 에 붙는 테스트
```

## 설정 보안

서버 주소, 데이터베이스 계정, 로그인 관리자 비밀번호 등 민감한 값은 저장소에 커밋하지 않습니다. 로컬·운영 환경별 설정은 `.gitignore` 규칙에 따라 별도로 관리합니다.
