# SQLD Pass

SQLD 자격증 학습을 위한 독립 Android/iOS 프로젝트입니다.

**Canonical Git repository:** `kasa500000-png/SQLD-Pass`

이 저장소는 QueryPass와 별개의 제품·코드베이스입니다. 이후 SQLD Pass 개발, 브랜치, PR, 빌드 설정은 이 저장소를 기준으로 진행합니다.

## 현재 이관 상태

- Expo + React Native Android/iOS 공통 앱 소스 이동 완료
- SQLD Pass 전용 package/app identity 구성
- 회원가입 없는 로컬 SQLite 학습 기록 구조 이동 완료
- 30일 학습, 이론, 문제풀이, 오답 복습, 90분 모의고사, 결과 화면 소스 이동 완료
- Android/iOS 내부 빌드용 EAS 설정 이동 완료
- production release gate와 콘텐츠 구조 검사 이동 완료
- QueryPass는 빌드 의존성·workspace·DB·package ID·배포 대상으로 사용하지 않음

### 콘텐츠 팩

Phase 1에서 제작한 전체 콘텐츠는 다음 규모입니다.

- 이론 60개
- 이론 확인 문제 120개
- 모의고사 20회 × 50문항 = 1,000문항
- 총 문제 객체 1,120개

현재 Git에는 이관 중인 대용량 콘텐츠를 실수로 운영본처럼 사용하는 것을 막기 위해 `generated/content.json`에 안전한 placeholder가 있습니다. 전체 콘텐츠 팩을 `content-pack/content.json.gz`로 배치한 뒤 아래 명령으로 materialize합니다.

```bash
npm run content:materialize
npm run content:check
```

상세 상태와 원본 hash는 `docs/MIGRATION_STATUS.md`를 참고하세요.

## 개발 실행

```bash
npm install
npm test
npm run typecheck:native
npx expo install --check
npx expo-doctor
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
src/core/domain/          state / exam / review 도메인 규칙
src/ui/                   화면 모델·디자인 토큰
src/platform/             React Native 렌더러·SQLite 저장소
generated/                앱용 콘텐츠 산출물 또는 안전 placeholder
content-pack/             전체 콘텐츠 압축팩 위치
scripts/                  콘텐츠 검사·materialize·release gate
tests/                    도메인 smoke test
docs/                     이관/출시 문서
```

## 데이터·출시 정책

학습 데이터의 source of truth는 SQLD Pass 전용 SQLite `sqld_pass.sqlite`입니다. 현재 로그인, 클라우드 동기화, 원격 분석, 런타임 AI, 결제, 광고 SDK는 활성화하지 않았습니다.

콘텐츠 독립 감수, 대상 DBMS 확인, 공식 출제 범위 대조, Android/iOS 실기기 QA가 끝나기 전 production release gate는 의도적으로 닫혀 있습니다.
