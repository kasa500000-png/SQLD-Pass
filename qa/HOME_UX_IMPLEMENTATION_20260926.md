# SQLD Pass 홈 학습 개선 — 2026-09-26

## 적용 내용

1. 홈의 첫 버튼은 `학습 시작`, 방문한 미완료 이론은 `이어서 읽기`, 읽은 이론의 미완료 확인 문제는 `확인 문제 이어하기`로 표시한다. 최근 미완료 이론을 학습 탭에서 열었던 경우에도 홈에서 재개할 수 있다. 현재 학습일과 다르면 `읽던 이론 · Day N`으로 구분한다.
2. 기존 카드에 `이론 0/3 · 확인 0/6`, 이론 제목, `이번 이론 약 9분`을 표시한다. 시간은 콘텐츠의 레슨 전체 예상 시간이며 남은 시간으로 계산하지 않는다. 전체 과정 진도는 보조 정보로 표시한다. 모의고사일과 과정 완료 상태는 기존 시험 진입 동작을 유지한다.
3. 레슨별 세로 스크롤 위치를 기존 기기 SQLite 상태에 저장한다. 스크롤이 멈춘 뒤, 화면을 떠날 때, 백그라운드 전환 때 기존 순차 저장 경로를 사용한다. 동일 레이아웃은 같은 위치, 글자 크기나 화면 폭이 바뀌면 본문 높이 비율과 스크롤 범위에 맞춰 복원한다.

읽기 위치 저장은 읽음 표시, 답안, 공부한 날짜 또는 학습일 완료를 만들지 않는다. 오늘의 확인 진도는 중복 답안 수가 아닌 제출한 고유 문항 수다. 기존 상태에 읽기 정보가 없어도 열리며 잘못된 선택적 읽기 정보만 버린다. 학습 초기화는 읽기 정보도 지우고 기존 열린 회차는 유지한다. 기기 강제 종료 직전 아직 저장되지 않은 마지막 움직임까지 복구한다는 의미는 아니다.

## 자동 검증

- `npm test`: 183/183 통과. 이전 상태 호환성, 시험 스냅샷/회차 해제 보존, 저장 순서, 실패 후 재시도, 초기화 뒤 늦은 콜백, 중복 풀이 진도, 최초/재개 CTA, 시험일 분기를 포함한다.
- `npm run typecheck:native`: 통과.
- `npm run ci:content`: 통과. 원문 60개 이론, 확인 120문항, 모의고사 20회/1,000문항, 총 1,120문항. 콘텐츠 SHA-256 `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead` 동일.
- `npm run ads:check`: off 설정 통과. 실제 광고 송출 검증은 아니다.
- `npm run release:check`: 기존 콘텐츠 승인 증빙 미완료로 공개 출시 차단을 확인했다. 이번 변경은 승인 플래그를 바꾸지 않는다.
- React 품질 검토: 잦은 스크롤 값은 ref에 유지하고 멈춘 후 저장한다. 레슨에만 스크롤 복원을 적용하며 타이머/문제 선택에 의해 시험 화면이 재생성되지 않는 기존 키를 유지한다. AppState 리스너와 타이머는 화면 해제 시 정리한다.

## Android 검증

- `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`, `EXPO_PUBLIC_APP_ENV=internal`, `EXPO_PUBLIC_ADS_MODE=off`로 `android/gradlew.bat :app:assembleRelease --console=plain` 성공 (7분 28초).
- APK: `android/app/build/outputs/apk/release/app-release.apk`, SHA-256 `2e25d15ff5d5499e109085893be610ffdd404556a1d5ab74ec524aec8b6ee744`.
- 패키지 `com.sqldpass.app.internal`, 버전명 0.1.0 / 검증용 네이티브 프로젝트 versionCode 1. Play 패키지의 신규 스토어 버전은 아니다.
- Samsung SM-F721N (1080×2640, density 480)에 `adb install -r` 성공. 데이터 삭제 없음. 모든 탭/버튼 조작은 직전에 얻은 UI Automator 트리의 좌표로 수행했다.

| 시나리오 | 관찰 결과 |
|---|---|
| 기존 데이터로 업데이트 후 첫 홈 | `이론 0/3 · 확인 0/6`, `이번 이론 약 9분`, `학습 시작` 표시. 카드와 4개 탭 잘림 없음 |
| LESSON 01 중간 스크롤 → 홈 → 이어서 읽기 | 같은 본문/소제목 위치 복원. `작은 설계 연습`의 Y 좌표 1132 → 1131px (반올림 차이 1px) |
| 저장이 끝난 뒤 앱 force-stop → 재실행 → 이어서 읽기 | 홈에서 최근 이론 유지. 같은 소제목 Y=1131px로 복원 |
| 앱 글자 크기 130% | 홈 글자/버튼 잘림 없음. 이론 재진입 시 본문 높이 비율을 반영해 같은 문단 부근에서 재개 |
| 글자 크기를 100%로 복귀 | LESSON 01의 기존 위치 (소제목 Y=1131px)로 복원 |
| 학습 탭에서 Day 2 LESSON 04 열기 → 중간까지 읽기 → 홈 | `읽던 이론 · Day 2`, 해당 이론 제목, 약 8분, 이어서 읽기 표시. 현재 Day 1 진도는 0/3, 0/6 유지 |
| 홈에서 최근 LESSON 04 재개 | 같은 본문 위치 복원 (소제목 `사례` Y=1271 → 1272px) |
| 현재 SQLD Pass 프로세스 logcat | FATAL EXCEPTION, AndroidRuntime, ReactNativeJS 오류 패턴 없음 |

테스트 후 글자 크기를 원래 100%로 되돌리고 LESSON 01을 최근 이론으로 선택한 홈에 두었다. 읽기 위치만 저장했으며 읽음/북마크/답안/시험/광고 기록은 생성하지 않았다. 비율 복원은 문단을 추적하는 의미 기반 북마크가 아니므로 화면 폭·글자 크기 변경 시 정확히 같은 문장이 첫 줄에 놓인다는 보장은 없다.

### 캡처와 로그

- [최초 홈](../.build/android-qa/home-ux-20260926-start.png) / [검증 후 홈](../.build/android-qa/home-ux-20260926-final.png)
- [이론 중단 전](../.build/android-qa/home-ux-20260926-lesson-middle.png) / [재개 후](../.build/android-qa/home-ux-20260926-resumed.png) / [앱 재시작 후](../.build/android-qa/home-ux-20260926-relaunch-resumed.png)
- [130% 홈](../.build/android-qa/home-ux-20260926-large-home.png) / [130% 읽기 복원](../.build/android-qa/home-ux-20260926-large-resumed.png) / [100% 복귀](../.build/android-qa/home-ux-20260926-restored-normal.png)
- [다른 학습일의 최근 이론](../.build/android-qa/home-ux-20260926-recent-home.png) / [해당 이론 복원](../.build/android-qa/home-ux-20260926-recent-resumed.png)
- 같은 이름의 XML에 좌표 증거를 남겼다. Samsung screencap의 PNG 앞 경고 바이트를 제거하도록 QA 도구를 보완했다. 화면 픽셀은 편집하지 않았다.
- 빌드/테스트/공개 출시 차단 로그: `.build/home-improvements-build.log`, `.build/home-improvements-tests.log`, `.build/home-improvements-release.log`.
- 앱 로그: `.build/android-qa/home-ux-20260926-app.log`. 캡처와 로그는 로컬 검증 산출물이며 Git에 포함하지 않는다.

## 범위

이번 변경은 앱 UX 구현과 로컬 Android 검증이다. Play/App Store 신규 제출, 현재 프로덕션 상태 확인 또는 iOS 실기기 검증을 의미하지 않는다.
