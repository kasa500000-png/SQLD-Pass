# SQLD Pass 실전 탭 개선 및 검증 — 2026-09-26

## 변경 사항

[실기기 검토](EXAM_TAB_UX_REVIEW_20260926.md)에서 제안한 세 가지 개선을 적용했다.

1. 응시 안내의 헤더 뒤로 가기와 `모의고사 목록` 버튼에서 보던 회차 목록 위치로 복귀한다. 기존 학습 목록의 네이티브 스크롤 복원 컴포넌트를 재사용하며, 탐색 위치는 실행 중 메모리에만 저장한다.
2. 카드에서 반복되던 과목별 문항 수는 응시 안내에 남겼다. 광고 off 상태에서 잠긴 회차는 `이용 불가` 상태를 표시하고 큰 비활성 버튼을 생략한다. 전체 20회 목록과 응시 기록·결과 접근은 유지한다.
3. `응시 가능 N회` 필터는 실제 접근 권한으로 수를 계산한다. 회차별 응시·광고 해제·결과 버튼의 접근성 이름에 회차 번호를 포함했다.

필터, 광고 모드, 접근 가능한 회차, 진행 중 시험, 새 안내 문구가 달라지면 이전 목록 위치를 사용하지 않는다. 이 처리는 보상 오류 안내나 진행 중 시험 이어하기가 화면 위에서 보이게 한다. 타이머의 매초 갱신은 목록 위치를 초기화하지 않는다. 학습 목록 위치와 이론 본문 읽기 위치는 각각 유지한다.

## 자동 검증

- `npm test`: 196/196 통과. 두 복귀 경로와 두 필터, 탐색 중 저장 부작용 없음, 오래된 스크롤 콜백 거부, 접근 권한별 개수, 결과 접근, 초기화 처리를 검증했다. 기존 답안·시험 시계·채점·보상 저장 관련 테스트도 통과했다.
- `npm run typecheck:native`: 통과.
- `npm run ci:content`: 통과. 이론 60개, 확인 문항 120개, 모의고사 20회 / 1,000문항. 원본 콘텐츠 SHA-256은 `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`로 유지됐다.
- `npm run ads:check`: 통과, 광고 모드 off.
- `npx --no-install expo install --check`: 호환되는 의존성 상태 확인.
- `npx --no-install expo-doctor`: 21/21 통과.
- `npm run release:check`: 기존 콘텐츠 승인 증빙 미완료 사유로 차단됨 (`Content approval evidence is incomplete. Production release blocked.`). 이번 UI 작업에서 승인 파일이나 게이트를 변경하지 않았다.

테스트의 test/live 드라이버와 해제 기록은 합성 데이터다. 실제 광고 송출·동의·보상 수신 검증을 의미하지 않는다.

## Android 빌드 및 실기기 검증

- `:app:assembleRelease`: 성공 (5분 28초), internal / ads off.
- `zipalign -c -P 16 4`: 성공.
- APK SHA-256: `eb3cabcd7435dc61e8303ebc77545e89caff04cbacbb6ce704e839d82d94f812`.
- Samsung SM-F721N (1080×2640, density 480)에 `adb install -r`로 기존 데이터를 보존하며 업데이트했다.
- 패키지 `com.sqldpass.app.internal`, 0.1.0 / versionCode 1, 업데이트 시각 2026-09-26 21:28:51 KST.

| 확인 흐름 | 결과 |
|---|---|
| 전체 목록 끝까지 이동 | 제목 20개를 화면 안에서 확인. 1~4회 응시 버튼 4개만 활성이고 5~20회는 이용 불가 카드로 표시 |
| 전체 목록 → 4회차 안내 → 헤더 뒤로 | 응시 버튼 좌표 `[111,1392][969,1548]` 전후 동일 |
| 응시 가능 필터 → 4회차 안내 → 모의고사 목록 | 응시 버튼 좌표 `[111,1944][969,2100]` 전후 동일. 4회차에서 목록 종료 |
| 130% 글자 → 4회차 안내 → 헤더 뒤로 | 응시 버튼 좌표 `[111,1917][969,2085]` 전후 동일 |
| 130% 목록 및 안내 | 필터·회차 제목·버튼이 정상 표시. 안내 하단은 한 번 스크롤하여 시작·목록 버튼과 마지막 문구까지 확인 |
| 학습 7번 이론 → 뒤로 | 기존 학습 목록 복원 유지. 카드 `[60,413][1020,707]` 전후 동일 |
| 기존 1번 이론 재진입 | 기존 본문 `작은 설계 연습` Y=1131px로 복원 |
| 검증 종료 | 글자 100%, 실전 전체 20회 목록 상단. 최근 이론 1번, 홈 이론 0/3·확인 0/6 유지 |
| 현재 앱 프로세스 logcat | FATAL EXCEPTION / AndroidRuntime / ReactNativeJS 오류 패턴 없음 |

목록 위치는 앱 실행 중 보존된다. 글자 크기가 달라지면 콘텐츠 높이 비율에 따라 조정하며, 서로 다른 배율에서 정확히 같은 카드 좌표를 보장하지 않는다. 동일 배율에서 확인한 세 번의 실전 목록 왕복은 모두 0px 차이였다.

### 화면 증거

- [개선된 첫 화면](../.build/android-qa/exam-fix-20260926-top.png) / [작아진 이용 불가 카드](../.build/android-qa/exam-fix-20260926-list-01.png) / [20회차 끝](../.build/android-qa/exam-fix-20260926-list-05.png)
- 전체 목록 [진입 전](../.build/android-qa/exam-fix-20260926-list-01.png) / [복귀 후](../.build/android-qa/exam-fix-20260926-all-return.png)
- 응시 가능 [진입 전](../.build/android-qa/exam-fix-20260926-available-before.png) / [복귀 후](../.build/android-qa/exam-fix-20260926-available-return.png)
- 130% [첫 화면](../.build/android-qa/exam-fix-20260926-large-top.png) / [진입 전](../.build/android-qa/exam-fix-20260926-large-bottom.png) / [복귀 후](../.build/android-qa/exam-fix-20260926-large-return.png) / [안내 하단](../.build/android-qa/exam-fix-20260926-large-intro-bottom.png)
- [기존 이론 본문 위치](../.build/android-qa/exam-fix-20260926-reading.png) / [홈 진도](../.build/android-qa/exam-fix-20260926-home-final.png) / [종료 화면](../.build/android-qa/exam-fix-20260926-final.png)
- 각 PNG의 XML에 UI 트리를 보관했다. 20회차 확인 목록은 `exam-fix-20260926-coverage.json`, 현재 앱 로그는 `exam-fix-20260926-app.log`, 빌드 로그는 `.build/exam-ux-build.log`다. `.build` 산출물은 Git 추적 대상이 아니다.

## 적용 범위

기본 브랜치는 `main`이며 별도 `master` 브랜치는 없다. 이번 변경은 SQLD Pass 소스와 연결된 검증용 Android 앱에 적용했다. 시험 시작·답안 작성·채점·결과 생성·광고 해제 기록을 실기기에 만들지 않았다. 이러한 상태의 회귀 검사는 자동 테스트 범위이며 실제 시험 전체 과정을 실기기에서 수행했다는 뜻은 아니다.

Play/App Store 재배포, iOS·태블릿 실행, TalkBack 음성 및 실제 광고 송출 검증은 이번 작업에 포함하지 않는다. 콘텐츠·광고 운영 승인 게이트는 유지했다.
