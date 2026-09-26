# SQLD Pass 기록 탭 개선 — 2026-09-26

## 변경 내용

- 확인 문제 정답률과 확신 비율은 `content.lessons[].questionIds`에 속하는 문항의 첫 저장 답안만 집계한다. 확인 문제를 복습 모드에서 처음 풀어도 포함하며, 모의고사 복습과 알 수 없는 문항 ID는 제외한다. 당시 저장한 정오답·확신 여부를 사용하고 기존 답안을 재채점하지 않는다.
- 기록 목록에서 결과를 열었다가 돌아오면 실행 중 스크롤 위치를 복원한다. 학습·실전 목록 및 이론 읽기 위치와 별도로 보관한다. 새 풀이·읽음·학습일·제출 결과나 안내가 생기면 상단으로 돌아간다. 진행 중 시험의 답안 저장·타이머 갱신은 목록 위치를 초기화하지 않는다.
- 풀이가 없으면 미산출 확신 지표와 계산 기준 버튼을 생략한다. 풀이가 있으면 정답률 옆에 `N문항 기준`을 바로 표시한다.

SQLite 마이그레이션은 없다. 탐색 위치 저장은 DB 쓰기나 학습 완료 처리를 하지 않으며 두 초기화 경로에서 제거된다. 콘텐츠, 시험 스냅샷·채점·타이머, 회차 해제, 광고 설정은 변경하지 않았다.

## 자동 검증

| 검사 | 결과 |
|---|---|
| `npm test` | 201/201 통과 |
| `npm run typecheck:native` | 통과 |
| `npm run ci:content` | 통과, 원본 해시와 전체 콘텐츠 검증 및 실제 콘텐츠 승인 차단 확인 |
| `npm run ads:check` | 통과, 광고 off |
| `npx --no-install expo install --check` | 의존성 일치 |
| `npx --no-install expo-doctor` | 21/21 통과 |
| `git diff --check` | 통과 |
| `npm run release:check` | 기존 콘텐츠 승인 증빙 미완료로 차단: `Content approval evidence is incomplete. Production release blocked.` |

회귀 검증은 모의고사 제출→정답 복습→기록 화면의 실제 컨트롤러 흐름, 확인 문제 복습 포함, 최초 답안 유지, 확신 부족 분리, 0문항/0% 구분, 120문항 전체와 모의고사 복습 1,000문항 혼합, 기존 저장 정오답 보존, 탐색 위치 분리·무저장, 새 기록/타이머/초기화 경계를 포함한다.

앞선 독립 재현 도구 `.build/records-audit-model.cjs`도 다시 실행했다. 확인 문제 응답 0건·모의고사 복습 응답 1건에서 이제 `아직 풀이 기록이 없어요`를 표시한다. 출력은 `.build/records-fix-model.json`에 보관했다.

## Android 검증

- 빌드: `EXPO_PUBLIC_APP_ENV=internal`, `EXPO_PUBLIC_ADS_MODE=off`, `:app:assembleRelease` 성공(4분 22초). `zipalign -c -P 16 4` 통과.
- APK: `android/app/build/outputs/apk/release/app-release.apk`, SHA-256 `cfbf2408947fb21779b0383de4a8ed07bd06d083836d2aa57f568e150e685b40`.
- 실제 휴대폰: Samsung SM-F721N, 1080×2640, density 480. `com.sqldpass.app.internal`, 0.1.0 / versionCode 1, 업데이트 2026-09-26 23:41:55 KST.
- 누적 기록 검증: 별도 Android API 36 에뮬레이터, 1080×2400, density 420. 같은 APK를 설치했다.
- 두 기기 모두 `adb install -r`로 업데이트했다. 앱 삭제·데이터 초기화를 하지 않았다.

| 시나리오 | 관찰 결과 |
|---|---|
| 휴대폰 빈 기록, 글자 100%·130% | 미산출 확신 비율·계산 기준 버튼을 생략. 마지막 실전 이동 버튼까지 정상 표시 |
| 휴대폰 실전 이동·학습 보존 | 실전 목록 연결 정상. 홈의 이론 0/3·확인 0/6 유지. L001 이어서 읽기의 `작은 설계 연습` 제목 Y=1131px로 기존 위치 유지 |
| 기존 모의고사 복습만 있는 에뮬레이터 업데이트 | 잘못 표시되던 확인 문제 100%가 사라지고 빈 풀이 상태 표시. 기존 M02→M01 응시 이력 2건과 각 0/100점 유지 |
| M01 결과 진입→헤더 뒤로, 글자 100% | 결과 버튼의 진입 전·복귀 후 경계 모두 `[98,1855][984,1992]` |
| L001 확인 문제 2개를 실제 UI로 풀이 | Q01 정답+확신 부족, Q02 오답 → `첫 풀이 정답률 50%`, `확신 있게 맞힌 비율 0%`, `2문항 기준`. 기존 모의고사 복습은 표본에 포함되지 않음 |
| 새 풀이 후 기록 탭 이동 | 상단 학습 기록·새 통계가 바로 표시됨 |
| 누적 기록 130%, 계산 기준 펼침·접힘 | 문항 수와 두 정답률, 계산 설명에 잘림·겹침 없음. 하단 이력까지 스크롤 가능 |
| M01 결과 진입→헤더 뒤로, 글자 130%·계산 기준 펼침 | 결과 버튼의 진입 전·복귀 후 경계 모두 `[98,1834][984,1981]` |
| 현재 앱 프로세스 logcat | 두 기기에서 `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` Error/Exception 패턴 미발견 |

샘플 확인 문제 답안은 에뮬레이터에만 추가했다. 휴대폰의 풀이·응시 기록은 만들지 않았으며 기존 읽기 위치를 보존했다. 두 기기를 글자 100%, 기록 탭으로 돌려두었다. 테스트 에뮬레이터에는 기존 샘플 모의고사 2건·복습 답안 1건과 새 확인 문제 답안 2건이 남으며 진행 중 연습은 완료했다.

### 화면과 로그

- 휴대폰 [100%](../.build/android-qa/records-fix-20260926-phone-empty.png), [130%](../.build/android-qa/records-fix-20260926-phone-large.png), [실전 이동](../.build/android-qa/records-fix-20260926-phone-exam-link.png), [읽기 위치 유지](../.build/android-qa/records-fix-20260926-phone-reading.png), [종료 상태](../.build/android-qa/records-fix-20260926-phone-final.png)
- 에뮬레이터 [기존 기록 업데이트](../.build/android-qa/records-fix-20260926-emu-existing.png), [실제 확인 문제 집계](../.build/android-qa/records-fix-20260926-emu-populated.png), [130% 계산 기준](../.build/android-qa/records-fix-20260926-emu-large-details.png)
- 목록 복귀 [100% 이전](../.build/android-qa/records-fix-20260926-emu-return-before.png) / [이후](../.build/android-qa/records-fix-20260926-emu-return-after.png), [130% 이전](../.build/android-qa/records-fix-20260926-emu-large-return-before.png) / [이후](../.build/android-qa/records-fix-20260926-emu-large-return-after.png)
- 각 PNG와 같은 이름의 XML을 보관했으며 결과 버튼 경계의 전후 일치를 별도로 비교했다. 화면은 직접 시각 검토했다. 빌드 로그는 `.build/records-ux-build.log`, 단위 테스트는 `.build/records-tests.log`, 기기 로그는 `.build/android-qa/records-fix-20260926-{phone,emulator}.log`에 있다. `.build` 자료는 로컬 증거이며 Git 추적 대상이 아니다.

## 범위

이번 변경의 대상은 기록 탭이다. 콘텐츠 승인이나 스토어 배포를 완료했다는 의미가 아니다. iOS 실기기, 태블릿, TalkBack 음성, 실제 광고 송출 검증은 이번 범위에 포함하지 않는다. 저장소 기본 브랜치는 `main`이며 `master` 브랜치는 없다.
