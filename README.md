# SQLD Pass

SQLD 자격증 학습을 위한 독립 Android/iOS 프로젝트입니다.

**Canonical Git repository:** `kasa500000-png/SQLD-Pass`

이 저장소는 QueryPass와 별개의 제품·코드베이스입니다. SQLD Pass 개발, 브랜치, PR, 빌드는 이 저장소를 기준으로 진행합니다. QueryPass와 SpicPass는 변경 대상이 아닙니다.

## 최신 수익화 방향 — 2026-09-12

이론·확인 문제·오답 복습과 모의고사 1~4회는 무료입니다. 모의고사 5~20회는 각각 보상형 광고 1회 완료 후 이 기기에서 계속 열어 둡니다. 재응시·제출 후 해설은 재시청이 없습니다.
배너는 홈/내 학습의 분리된 작은 영역만 사용하며 진행 중 시험이 있으면 모든 광고를 제한합니다.

**구현 코드 반영과 실제 운영 활성화는 다릅니다. 기본 광고 모드는 off입니다.**
공식 테스트 광고용 EAS 프로파일과 네이티브 SDK 연동 코드를 추가했으나 실제 빌드·광고·UMP/ATT·실기기 검증과 콘텐츠 공개 승인은 아직 남아 있습니다.
무관리·수익 보장 없이 서버/계정/결제/런타임 AI를 추가하지 않는 저관리 구조를 선택했습니다.
상세 정책: `docs/MONETIZATION_20260912.md`; 검증 범위: `qa/MONETIZATION_VERIFICATION.md`.

## 현재 이관 상태

- Expo + React Native Android/iOS 공통 앱 소스와 SQLD Pass 전용 identity 이동 완료
- 회원가입 없는 로컬 SQLite 학습 기록 구조
- 30일 학습, 이론, 문제풀이, 복습, 90분 모의고사, 결과 화면 소스
- EAS 내부 빌드 설정, 콘텐츠 검사와 production release gate
- QueryPass를 workspace·DB·package ID·배포 대상으로 사용하지 않음

### 콘텐츠 팩

Phase 1 제작 규모는 이론 60개, 확인 문제 120개, 모의고사 20회 × 50문항 = 1,000문항입니다.
현재 Git의 `generated/content.json`은 안전한 placeholder입니다. 전체 콘텐츠 팩을
`content-pack/content.json.gz`에 배치하고 materialize해야 실제 학습 앱이 실행됩니다.

```bash
npm run content:materialize
npm run content:check
```

원본 hash와 이관 상태는 `docs/MIGRATION_STATUS.md`를 참고하세요. 이번 광고 작업은 콘텐츠 본문·정답·승인 상태를 바꾸지 않습니다.

## 개발 실행 및 검증

```bash
npm install
npm run test:monetization
npm test
npm run typecheck:native
npx expo install --check
npx expo-doctor
npm run android
# macOS + Xcode
npm run ios
```

신규 광고 테스트는 합성 fixture 및 SDK 모의 객체를 사용하며 실제 광고 재생 증거가 아닙니다.
의존성 전체 설치와 선언 버전으로 재검증한 뒤 lockfile을 확정해야 합니다.

## EAS 내부 빌드

```bash
npx eas login
npx eas init
npm run build:android:internal
npm run build:ios:simulator
# 광고 검증은 Google 공식 테스트 ID만 사용
npx eas build --platform android --profile ads-test
npx eas build --platform ios --profile ads-test-simulator
```

내부 기본 식별자는 `com.sqldpass.app.internal`입니다. Production 식별자는 소유자가 환경 변수로 명시하고 서명 자격증명은 Git에 넣지 않습니다. `.env.ads.example`과 `ads-release-approval.template.json`은 미입력 양식이며 승인 증거가 아닙니다.

## 핵심 구조

```text
App.tsx
src/core/                 채점·복습·시험·상태 관리
src/core/domain/          state / exam / review
src/ui/                   기존 공통 화면 모델
src/monetization/         회차 접근 정책·보상 저장·광고 안내 화면
src/platform/             네이티브 UI·SQLite·Google Ads/UMP 어댑터
config/                   광고 빌드/공개 승인 검증
generated/                콘텐츠 또는 안전 placeholder
content-pack/             전체 콘텐츠 압축팩 위치
scripts/                  콘텐츠 materialize·검사·공개 gate
tests/                    기존 도메인 검사 + 신규 광고 자동 테스트
docs/                     이관·수익화·출시 문서
qa/                       수행한 검증과 남은 검증
```

## 데이터·출시 정책

학습 데이터와 해제 기록은 SQLD Pass 전용 SQLite `sqld_pass.sqlite`에 저장합니다.
로그인, 클라우드 동기화, 원격 학습 분석, 런타임 AI, 결제 서버를 추가하지 않습니다.
광고 활성화 시 Google SDK가 광고 제공을 위한 정보를 처리하므로 무수집 앱으로 표시하지 않습니다.
학습만 초기화는 해제를 유지합니다. 전체 삭제·재설치·기기 변경 시 해제 복원은 지원하지 않습니다.

콘텐츠 독립 감수·대상 DBMS·공식 범위·Android/iOS 실기기 QA·운영 정책 검증 전에는 공개를 차단합니다.
광고 운영 활성화도 실제 ID·코드 해시·동의/기기 검증 증거·소유자 승인이 필요합니다.
