# SQLD Pass

SQLD 자격증 학습을 위한 독립 Android/iOS 프로젝트입니다.

> GitHub 기준 저장소: `kasa500000-png/SQLD-Pass`
>
> 이 저장소는 QueryPass와 별개의 제품/코드베이스입니다. 이후 SQLD Pass 개발은 이 저장소를 기준으로 진행합니다.

## 현재 상태

- Expo + React Native 기반 Android/iOS 공통 앱
- 회원가입 없이 로컬 SQLite 학습 기록 저장
- 이론 레슨 60개 + 확인 문제 120개
- 모의고사 20회 × 50문항 = 1,000문항
- 30일 학습 흐름, 오답/확신 부족 복습, 모의고사 타이머/답안표/결과 분석
- Android/iOS 네이티브 빌드 및 실기기 QA는 다음 단계
- 콘텐츠는 아직 독립 감수/공식 범위 최종 대조 전이므로 production release gate는 닫혀 있음

## 실행

```bash
npm install
npx expo install --check
npx expo-doctor
npm test
npm run typecheck:native
npm run android
# macOS + Xcode
npm run ios
```

## EAS 내부 빌드

```bash
npx eas login
npx eas init
npm run build:android:internal
npm run build:ios:simulator
```

운영용 package/bundle identifier와 서명 자격증명은 저장소에 넣지 않습니다. 내부 기본 식별자는 `com.sqldpass.app.internal`이며 production 식별자는 소유자가 환경 변수로 명시해야 합니다.

## 핵심 구조

```text
App.tsx
src/core/                 채점·복습·시험·상태 관리
src/ui/                   화면 모델·디자인 토큰
src/platform/             React Native / SQLite / web preview 어댑터
generated/                앱용 콘텐츠 빌드 산출물
source-materials/         콘텐츠 재생성 원본(로컬/보관용)
scripts/                  콘텐츠 변환·검증·release gate
tests/                    단위/회귀/콘텐츠 검증
docs/                     아키텍처·출시 체크리스트
qa/                       검증 결과
```

## 데이터 정책

학습 데이터의 source of truth는 기기 SQLite(`sqld_pass.sqlite`)입니다. 현재 로그인, 클라우드 동기화, 원격 분석, 런타임 AI 호출은 사용하지 않습니다.

## 출시 전 차단 조건

현재 콘텐츠 manifest의 `releaseReady`, `humanReviewed`, `officialSyllabusVerified`가 false입니다. 독립 검수·대상 DBMS 확인·공식 출제 범위 대조·실기기 QA 후 production release gate를 열어야 합니다.

상세 구현/검증 범위는 `docs/ARCHITECTURE.md`, `docs/RELEASE_CHECKLIST.md`, `qa/VERIFICATION_REPORT.md`를 참고하세요.
