# SQLD Pass

0.5.0 작업 후보는 교재 216절·일반 연습 340문항과 모의고사 2권 40회·2,000문항을 포함합니다. 기존 1권과 관련 기록을 정리하고 기존 2·3권을 새 1·2권으로 표시합니다. 남기는 원문과 기록의 내부 식별자는 유지합니다. 각 권 첫 5회(새 1~5회·21~25회)는 무료이며, 제출 후 문제와 보기를 바로 읽는 해설과 선명한 선택 영역을 제공합니다. 소유자가 정확한 후보 해시에 대한 콘텐츠 검수·출시를 확인했습니다. Android 0.5.0(22)은 2026-11-12 운영 광고를 포함해 정식 프로덕션 심사에 제출했습니다. 승인 후 100% 자동 출시이며 아직 공개 완료가 아닙니다. iOS 0.5.0은 실물 iPad 검증이 남아 TestFlight·정식 제출 전입니다. [변경 범위](docs/MOCK40_20261112.md)를 참조하세요.

SQLD 자격증 학습을 위한 독립 Android/iOS 프로젝트입니다.

**Canonical Git repository:** `kasa500000-png/SQLD-Pass`

이 저장소는 QueryPass와 별개의 제품·코드베이스입니다. SQLD Pass 개발, 브랜치, PR, 빌드는 이 저장소를 기준으로 진행합니다. QueryPass와 SpicPass는 변경 대상이 아닙니다.

## 최신 수익화 방향 — 2026-11-12

이론·확인 문제·오답 복습과 각 권의 첫 5회는 무료입니다. 나머지 30회는 회차별 보상형 광고 1회 완료 후 이 기기에서 계속 열어 둡니다. 재응시·제출 후 해설은 재시청이 없습니다. 기존 2·3권의 해제 권한은 그대로 유지하며, 삭제된 기존 1권 권한을 다른 문제로 옮기지 않습니다.
배너는 홈/내 학습의 분리된 작은 영역만 사용하며 진행 중 시험이 있으면 모든 광고를 제한합니다.

**구현 코드 반영과 실제 운영 활성화는 다릅니다. 기본 광고 모드는 off입니다.**
내부 검증은 공식 테스트 광고를 사용합니다. 운영 광고 빌드는 콘텐츠 승인과 코드 해시에 연결된 플랫폼별 광고 검증 기록이 필요합니다.
무관리·수익 보장 없이 서버/계정/결제/런타임 AI를 추가하지 않는 저관리 구조를 선택했습니다.
상세 정책: `docs/MONETIZATION_20260912.md`; 검증 범위: `qa/MONETIZATION_VERIFICATION.md`.

## 현재 이관 상태

- Expo + React Native Android/iOS 공통 앱 소스와 SQLD Pass 전용 identity 이동 완료
- 회원가입 없는 로컬 SQLite 학습 기록 구조
- 홈·교재·문제·실전·기록의 네이티브 5탭, 90분 실전/시간 제한 없는 학습 모드
- EAS 내부 빌드 설정, 콘텐츠 검사와 production release gate
- QueryPass를 workspace·DB·package ID·배포 대상으로 사용하지 않음

### 콘텐츠 팩

현재 콘텐츠는 `textbook.20261112.2`입니다. 원본 HTML의 압축 보관본과 결정적 가져오기 스크립트에서 생성하며, `content-pack/content.json.gz`와 잠금 파일의 해시를 검증한 뒤 `generated/content.json`으로 복원합니다. 폐기된 phase1 데이터는 테스트 전용 fixture에만 남아 있습니다.

```bash
npm run content:materialize
npm run content:check
```

원본 해시와 호환 업데이트 계약은 `docs/MOCK_VOLUMES_20261112.md`를 참고하세요.

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
고정된 lockfile을 사용하고, 자동 검사와 실제 기기 검증의 범위를 구분해 기록합니다.

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
