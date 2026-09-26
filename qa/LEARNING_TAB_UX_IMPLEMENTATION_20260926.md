# SQLD Pass 학습 탭 개선 — 2026-09-26

## 적용 내용

앞선 [실기기 검토](LEARNING_TAB_UX_REVIEW_20260926.md)의 네 가지 권장 사항을 반영했다.

1. 이론 목록에서 레슨을 열고 돌아오면 보던 위치를 복원한다. 탐색 위치는 앱 사용 중 메모리에만 보관하며 SQLite의 본문 읽기 위치와 구분한다. 검색어·과목·북마크 조건 또는 저장된 북마크 구성이 바뀌면 다른 결과 목록의 위치를 재사용하지 않는다. 검색 입력창을 다시 생성하지 않고 스크롤만 조정한다.
2. 복습 빈 화면의 `이론 학습하기`는 북마크 선택과 검색·과목 조건을 해제하고 전체 이론 목록으로 이동한다. 광고 보상 처리 중에는 기존 이동 잠금을 유지한다.
3. 현재 레슨 버전과 일치하는 유효한 읽기 기록이 있으면 `읽는 중`, 명시적으로 읽음을 표시했으면 `읽음`, 기록이 없으면 `읽기 전`으로 구분한다. 방문만으로 읽음·답안·학습일 완료를 생성하지 않는다.
4. 북마크가 0개면 `저장한 북마크가 없어요`와 짧은 저장 방법, `이론 학습하기`를 표시한다. 저장된 항목이 있지만 검색·과목 조건에 맞지 않으면 조건 안내와 필터 초기화를 표시한다. 이때 초기화는 북마크 선택을 유지한다.

목록 탐색 위치는 앱 종료 후 복구하는 데이터가 아니다. 본문 읽기 위치의 기존 기기 저장 방식과 시험·채점·회차 해제 정책은 유지한다. 화면 구조와 콘텐츠 원문은 바꾸지 않았다.

## 자동 검증

- `npm test`: 191/191 통과. 목록 복귀, 탐색 기록의 무저장/무진도 영향, 다른 검색 조건의 늦은 콜백 무시, 입력창 키 유지, 잘못된 복습 이동, 북마크 두 빈 상태, 읽기 상태·버전 검증, 초기화, 보상 처리 이동 잠금을 추가 검증했다. 기존 시험·읽기 저장·광고 정책 회귀 검사를 포함한다.
- `npm run typecheck:native`: 통과.
- `npm run ci:content`: 통과. 이론 60개, 확인 120문항, 모의고사 20회/1,000문항. 원문 콘텐츠 SHA-256 `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead` 동일.
- `npm run ads:check`: off 설정 통과. 광고 송출 검증은 아니다.
- `expo install --check`: 의존성 정합성 통과. Expo Doctor 21/21 통과.
- `npm run release:check`: 기존 콘텐츠 승인 증빙 미완료로 공개 출시 차단. 승인 상태를 변경하지 않았다.
- React 검토: 스크롤 값은 ref와 컨트롤러 메모리에 유지하고 렌더·DB 저장을 유발하지 않는다. 예약 프레임은 조건 변경 및 화면 해제 시 취소한다. 검색 입력과 시험 화면의 기존 React 키는 유지한다.

## Android 검증

- `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`, `EXPO_PUBLIC_APP_ENV=internal`, `EXPO_PUBLIC_ADS_MODE=off`로 `android/gradlew.bat :app:assembleRelease --console=plain` 성공 (4분 15초).
- APK: `android/app/build/outputs/apk/release/app-release.apk`, SHA-256 `09eb3fcead505dd18809145713826c31c6c1b305cc6b7d0439ee2eb5bbdbb6b7`.
- Android SDK 36.1.0 `zipalign -c -P 16 4` 통과. 모든 네이티브 라이브러리의 16KB 페이지 기기 실행 검증을 대신하지 않는다.
- Samsung SM-F721N, 1080×2640 / density 480, `com.sqldpass.app.internal` 0.1.0 / versionCode 1. `adb install -r`로 기존 데이터를 유지했고 설치 시각은 2026-09-26 19:56:57이다.
- 모든 탭·버튼 좌표는 직전의 새 UI Automator 트리에서 구했다. PNG와 XML을 함께 저장하고 실제 화면을 시각적으로 확인했다.

| 시나리오 | 실제 관찰 |
|---|---|
| 목록 7번 → 이론 → 뒤로 | 카드 위치 `[60,426][1020,720]`가 전후 동일. 최상단으로 이동하지 않음 |
| 목록 마지막 60번 → 이론 → 뒤로 | 카드 위치 `[60,1857][1020,2151]`가 전후 동일 |
| 글자 130%에서 60번 → 이론 → 뒤로 | 카드 위치 `[60,1777][1020,2136]`가 전후 동일. 제목·진도 줄바꿈 정상 |
| 읽기 상태 | 기존 방문 이론 1·4·7·60번은 `읽는 중`, 미방문 2·3번 등은 `읽기 전` |
| 60번 임시 저장 → 북마크 → 1과목 | 저장된 북마크와 맞지 않는 조건 안내 표시. `검색·필터 초기화` 후 북마크 선택을 유지하고 60번 1개 표시 |
| 마지막 북마크 해제 후 목록 복귀 | `저장한 북마크가 없어요`, 짧은 저장 방법, `이론 학습하기` 표시 |
| 북마크·2과목 선택 → 복습 → 이론 학습하기 | 이론 선택 / 전체 과목 / 60개 목록으로 이동 |
| 빈 북마크 → 이론 학습하기 | 이론 선택 / 전체 과목 / 60개 목록으로 이동 |
| 2과목 검색창에 N → U → L → L 연속 입력 | 입력창을 다시 누르지 않아도 `N`, `NULL` 단계에서 `focused=true` 유지. 키보드를 닫으면 31개 결과 표시 |
| 일치하지 않는 검색 → 초기화 | 검색 없음 안내 후 전체 60개 이론으로 복귀 |
| 기존 1번 본문 재진입 | 저장된 `작은 설계 연습` Y=1131px로 복원. 목록 탐색이 본문 위치를 덮어쓰지 않음 |
| 종료 상태 | 100%, 검색어 비움, 과목 전체, 임시 북마크 0개, 최근 이론 1번. 홈 `이론 0/3 · 확인 0/6` 유지 후 학습 목록 상단에 둠 |
| 현재 SQLD Pass 프로세스 logcat | FATAL EXCEPTION / AndroidRuntime / ReactNativeJS 오류 패턴 없음 |

검증 중 앱 강제 종료·재실행 후 임시 북마크가 유지됨을 확인했다. 읽음 완료·답안·시험·광고 기록은 만들지 않았다. 글자 크기 변경 후 복원은 같은 카드 부근으로 맞추는 비율 방식이며, 서로 다른 배율에서 정확히 같은 카드 좌표를 보장하지 않는다. 동일 배율에서 위 세 번의 왕복은 모두 0px 차이였다.

### 증거

- [최종 학습 목록](../.build/android-qa/learn-fix-20260926-final.png) / [기존 본문 위치](../.build/android-qa/learn-fix-20260926-reading-restored.png) / [최종 홈 진도](../.build/android-qa/learn-fix-20260926-home-final.png)
- 7번 [진입 전](../.build/android-qa/learn-fix-20260926-mid-before.png) / [복귀 후](../.build/android-qa/learn-fix-20260926-mid-after.png)
- 60번 [진입 전](../.build/android-qa/learn-fix-20260926-bottom-before.png) / [복귀 후](../.build/android-qa/learn-fix-20260926-bottom-after.png)
- 130% [진입 전](../.build/android-qa/learn-fix-20260926-large-before.png) / [복귀 후](../.build/android-qa/learn-fix-20260926-large-after.png)
- [북마크 조건 불일치](../.build/android-qa/learn-fix-20260926-bookmark-filter-empty.png) / [북마크 유지 초기화](../.build/android-qa/learn-fix-20260926-bookmark-filter-reset.png) / [북마크 0개](../.build/android-qa/learn-fix-20260926-bookmarks-empty.png)
- [복습에서 이론 이동](../.build/android-qa/learn-fix-20260926-review-return.png) / [빈 북마크에서 이론 이동](../.build/android-qa/learn-fix-20260926-bookmarks-return.png)
- [검색 입력 초점](../.build/android-qa/learn-fix-20260926-search-focus.xml) / [NULL 검색](../.build/android-qa/learn-fix-20260926-search-null.png) / [검색 결과 없음](../.build/android-qa/learn-fix-20260926-search-empty.png)
- 로컬 빌드 로그: `.build/learning-ux-build.log`. 현재 앱 로그: `.build/android-qa/learn-fix-20260926-app.log`. `.build` 산출물은 Git 추적 대상이 아니다.

## 적용 범위

SQLD Pass 소스와 `com.sqldpass.app.internal` 검증용 Android 앱 대상이다. Play/App Store 재배포 및 iOS·태블릿 실행 검증은 이번 작업 범위에 포함하지 않는다.
