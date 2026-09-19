# SQLD Pass 출시 준비 검증 — 2026-09-19

이 기록은 내부 검증이다. 공개 출시·실광고 활성화·콘텐츠 승인 기록이 아니다.
대상: SQLD-Pass만. 기본 광고 모드 off, 내부 앱 ID `com.sqldpass.app.internal`.

## 확인된 결과

- 원본 gzip Git 보관과 materialize 완료. JSON SHA-256:
  `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`.
  60레슨, 확인 120문항, 모의고사 20회/1,000문항, 총 1,120문항.
  본문·정답·출처·승인 플래그를 변경하지 않았다.
- 자동 테스트 164/164, 네이티브 TypeScript 검사 통과.
- Expo Doctor 21/21, 의존성 감사 0건. SDK 57.0.24 기준.
- `ci:content` 통과. 미승인 콘텐츠의 공개 빌드가 정확한 사유로 차단됨.
- Android release variant 내부 APK 빌드 성공: Kotlin 2.3.20,
  Android target/compile API 36, arm64-v8a/x86_64.
  `.build/android-build-final-clean-module-20260919.log`: 1분 31초, 586 tasks.
  중간 재빌드에서는 이전 Kotlin daemon과 Windows 중간 산출물 잠금/충돌이 발생했다.
  `--no-daemon`과 Gradle의 해당 모듈 clean 후 성공했다. 첫 성공만으로 재현성을 단정하지 않는다.
- 위 APK의 64비트 네이티브 라이브러리 32개 ELF 정렬 검사 및
  Android SDK `zipalign -c -P 16` 통과. 16KB 페이지 기기 실행 검증은 별도 필요.
- Android 에뮬레이터 API 36 및 Galaxy Z Flip4(SM-F721N)에 내부 APK 설치 성공.
  Galaxy는 Play Protect 확인 화면 때문에 앱 화면 QA 완료로 계산하지 않는다.
- iOS 시뮬레이터 빌드 성공:
  [EAS c68916f7](https://expo.dev/accounts/kimseokhyeons-team/projects/sqld-pass/builds/c68916f7-3cae-4403-8b4e-8109ba5d1bf5).
  SDK `iphonesimulator26.5`, iOS 최소 16.4, iPhone/iPad device families 1/2,
  Pretendard 4종 포함, privacy manifests 11개 포함 확인.
  이 빌드는 이후 아이콘·시스템 테마·지원 UI 수정 전의 부트스트랩 스냅샷이다.
  실제 기기용 서명 IPA, TestFlight, iPhone/iPad 화면 검증으로 표현하지 않는다.
- EAS Simulator 실행 요청은 계정 미개방으로 거부됨. 세션은 시작되지 않았다.
- 최신 소스 커밋 `a72f0e1b8454cff437ee872f323788f9307ab519`의 iOS 시뮬레이터 빌드도 성공:
  [EAS 41854389](https://expo.dev/accounts/kimseokhyeons-team/projects/sqld-pass/builds/41854389-c843-4be7-bfa1-45849dd15638).
  SDK 26.5, iPhone/iPad, Pretendard 4종, 앱 아이콘, `UIUserInterfaceStyle=Automatic` 확인.
- 같은 소스의 Android 공식 테스트 광고 APK 성공: 5분 11초, 585 tasks.
  32개 라이브러리 정렬 통과, 에뮬레이터에 설치하고 테스트 모드 안내 확인.
- GitHub CI `35434646952`: content 및 native-source 모두 통과.
- 광고 안내 수정 커밋 `6b2ddf2`의 CI `35435273549`도 content/native-source 모두 통과.
- 최종 앱 소스 `6b2ddf27103a4d74a95f814ca411081c2acee138`의
  [iOS 시뮬레이터 빌드 332b1ad6](https://expo.dev/accounts/kimseokhyeons-team/projects/sqld-pass/builds/332b1ad6-e2e1-4418-9e86-f0d641a56803) 성공.
  이후 커밋은 검증 문서만 갱신한다.
- 최종 off APK 재빌드도 성공: `.build/android-build-final-off-feedback-20260919.log`,
  5분 18초/585 tasks. 32개 ELF와 zipalign 16KB 재검사 통과.
  테스트를 마친 에뮬레이터는 off APK로 되돌린다.

## Android 네이티브 화면에서 확인한 흐름

`.build/android-qa/`의 PNG/XML은 실제 설치 APK에서 수집했다.
UI Automator의 현재 화면 요소를 기준으로 조작하고 다른 앱 화면은 캡처하지 않는다.

- 온보딩 → 설정 → 홈 진입.
- 이론 진입·스크롤·북마크·읽음 기록.
- 앱 업데이트 후 온보딩 및 북마크 유지.
- 확인 문제 정답 선택 → 명시적 정답 확인 → 해설.
- 두 번째 문항 의도적 오답 → 선택/정답 구분 → 결과(2문항 중 1정답).
- 이론 목록 확인 2/2 반영, 전체 복습에 오답 1문항 저장(다음 날 예정).
- 모의고사 목록의 무료/회차 해제 안내 표시.
- 시험 시작 → 앱 강제 종료 → 홈의 진행 중 시험 복구와 남은 시간 감소 확인.
- 1번 문항의 보기 선택 → 저장 후 나가기 → 앱 강제 종료/재실행 → 같은 문항·선택 복구.
  `mock-answer-restored.png`에서 선택과 감소한 시간을 확인했다.
  초 단위 타이머 때문에 UI Automator idle 대기가 실패하는 경우가 있어,
  시험 내 두 번의 탭은 이미 수집한 UI 트리의 좌표와 현재 화면 일치를 확인해 사용했다.
- 최종 off APK에서 AD_ID/AdServices, 오버레이, 진동 권한 제거 확인.
  남은 권한: INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, FOREGROUND_SERVICE,
  앱 내부 dynamic receiver 권한. 제거 후에도 32개 라이브러리/zipalign 재검사 통과.
- 설정의 130% 글자 크기와 다크 테마, 스크롤 및 초기화 확인 대화상자 표시 확인.
- 이 세션에서 만든 에뮬레이터 테스트 학습 기록만 초기화 → 온보딩 복귀 확인.
  기존 해제권이 없는 상태였으므로 이 실행을 '기존 광고 해제권 보존'의 실제 증거로 삼지 않는다.
- 공식 테스트 광고 모드에서 M06/M05 해제 안내 → 명시적 시청 요청 → 제공 실패 안내,
  잠금 유지 확인. UMP 로그에 `Error making request`, 에뮬레이터에서
  `fundingchoicesmessages.google.com` 조회에 `unknown host`가 관찰됐다.
  정상 네트워크에서 재검증해야 하며, 실제 EARNED_REWARD/배너/지역별 동의 확인은 미완료다.
- 하단 회차 요청 후 안내가 스크롤 밖에 가려지는 문제 수정. `6b2ddf2` 테스트 APK에서
  M05 요청 실패 후 안내가 자동으로 보이는 것을 `reward-feedback-visible.png`로 확인.

### 보관 산출물

모두 `.build/artifacts/`에 로컬 보관하며 서명 인증서는 Git에 넣지 않는다.

| 파일 | SHA-256 |
|---|---|
| SQLD-Pass-internal-off.apk | `04119025af2c1c5c9622b237325370689788d4cf7d059cd0a9eb3e0a143f9a28` |
| SQLD-Pass-internal-test-ads.apk | `48ac6b0c11503813617bb80732a9998421ef337671effeee4741e7606793dc59` |

`SQLD-Pass-ios-simulator-current.tar.gz`는 위 EAS 최신 빌드의 시뮬레이터 산출물이다.
스토어 제출용 AAB/서명 IPA는 아직 만들지 않았다.

## 구현한 출시 준비

- Google Ads SDK와 Expo의 Kotlin 컴파일러 호환 설정, Expo 공개 config-plugin
  경로 사용 패치, uuid 보안 수정. SDK 16.4.0에서만 패치하며 버전 변경 시 검토를 요구한다.
- Pretendard 내장, 시스템 다크 모드 반영, 넓은 화면 본문/대화상자 최대 폭.
- 아이콘·adaptive icon·스플래시, 스토어 소개/개인정보/지원 초안.
- 운영자 연락처 설정 파일과 이메일 작성 화면 연결. 빈 연락처를 실제 정보로 표시하지 않는다.
- 공개 게이트에 전체 항목 검수, 콘텐츠 해시, 승인 증거, 공개 HTTPS URL,
  운영자/이메일·앱 내 URL 일치 검사를 추가했다. Expo production 설정에서도 검사한다.
- 광고 승인 해시에 lockfile·네이티브 플러그인·EAS 설정·지원 설정을 추가했다.
- 사람이 1,180개 레슨/문항을 검수하고 DBMS 증거/메모를 내보낼 수 있는 로컬 검수 화면.
  자동 승인은 하지 않으며 현재 모두 미검수다.

## 공개 출시 전 남은 필수 작업

1. 실제 운영자명·문의 이메일·소유 도메인 및 영구 앱 식별자 확정.
2. 독립 콘텐츠 검수, 대상 DBMS 실행/대조, 공식 출제 범위 대조 및 소유자 승인.
3. 최종 코드 Android/iOS 빌드, 실제 iPhone/iPad/Android 장치 QA.
   90분 만료, 강제 종료 복구, 접근성·큰 글씨, 16KB 실행 포함.
4. 공식 테스트 광고의 완료/취소/no-fill/offline·UMP/ATT 지역별 확인.
   모의 SDK 테스트를 실제 광고 검증으로 대신하지 않는다.
5. AdMob 설정, 배너 자동 갱신 해제, app-ads.txt, 개인정보/지원 페이지 게시,
   실제 SDK 동작에 맞춘 Google Data safety/Apple App Privacy 작성.
6. Apple 개발자 로그인·서명과 Google Play 대상 앱 생성, 스토어 자산·연령 등급·심사 정보.
   개인 Play 계정의 대상 여부에 따라 12명/14일 비공개 테스트 및 프로덕션 접근 심사.
7. 승인 증거와 최종 코드/콘텐츠 해시를 묶고 실제 소유자 활성화 후 프로덕션 제출.

이전 날짜의 `MONETIZATION_VERIFICATION.md`는 당시 실행 범위를 기록한 역사적 문서다.
이 문서의 새 빌드 결과가 그 당시 미실행 목록을 일부 갱신하지만 모든 광고 QA를 해결하지는 않는다.

## 전용 지원 사이트 게시 및 앱 연결 — 2026-09-19

- Sites 정적 사이트 게시 성공: https://sqld-pass-support.shk1122.chatgpt.site/
- 고객지원, 개인정보처리방침, 이용 안내의 익명 HTTPS 200 및 SQLD Pass/문의 이메일 본문 확인.
- 사이트 소스는 별도 `D:/SQLD-Pass-Support` Git 저장소. 배포 식별자는 `release/SUPPORT_SITE.json`에 기록하며 인증정보는 저장하지 않음.
- 앱 `config/public-support.json`에 실제 공개 주소 연결. 기존 고객센터와 개인정보 화면이 이 주소를 사용함.
- `npm run typecheck:native` 통과, `npm test` 164/164 통과, `assert-draft-blocked.cjs`에서 실제 콘텐츠 미승인 차단 확인.
- 사이트 HTML/로컬 리소스 정적 검증 및 HTTP 접근 검증 범위이며 시각적 브라우저 QA, 법률 검토나 스토어 개인정보 승인 완료를 의미하지 않음.
- app-ads.txt는 실제 AdMob 게시자 정보 확인 전이므로 만들지 않음. 콘텐츠·광고·실기기 승인 게이트는 유지.

### 지원 링크 반영 Android 설치 파일

- 재번들 후 Android release variant 빌드 성공(1m 53s), 광고 off.
- `.build/artifacts/SQLD-Pass-internal-off.apk`
- SHA-256: `7f70ce6afd67123dc2b5a1e1111bf0195661c52b5b2b1fc0420a2af728631a00`
- API 36 에뮬레이터에 업데이트 설치 성공. 고객센터 이메일/지원 버튼 및 개인정보 전문 버튼 표시 확인.
- 두 버튼을 직접 눌러 Android ACTION_VIEW가 각각 공개 `/support.html`, `/privacy.html`을 Chrome에 전달함을 확인. 웹 콘텐츠 자체의 기기 내 렌더링 검증과 구분한다.
- 고객센터 화면 캡처 확인: `.build/android-qa/support-site-help.png`. 개인정보 화면: `support-site-privacy.png`.
- `zipalign -c -P 16 4` 통과. 이번 변경은 JSON 지원 설정과 문서이며 네이티브 라이브러리 변경 없음.
- 최초 증분 빌드가 JSON 변경을 감지하지 못해 이전 번들을 재사용한 사실을 발견했다. 생성 번들을 제거한 후 재빌드하여 위 APK와 실제 버튼 확인으로 교체 검증했다. 재현 가능한 절차: `docs/LOCAL_ANDROID_BUILD.md`.
- 소스 커밋: `0062b5220aa0a3bdc755583269ec8fcfb512f76c`.

### 지원 링크 반영 iOS 시뮬레이터 빌드

- EAS 빌드 `c321d2ab-b337-4bae-8b86-2c8fd6f18e44` FINISHED.
- https://expo.dev/accounts/kimseokhyeons-team/projects/sqld-pass/builds/c321d2ab-b337-4bae-8b86-2c8fd6f18e44
- 소스 `0062b5220aa0a3bdc755583269ec8fcfb512f76c`, simulator profile, 광고 off.
- `.build/artifacts/SQLD-Pass-ios-simulator-current.tar.gz`
- SHA-256: `a9c926cc706e0b08a1349cc95514093810cdf39055a2107f414d6a32026de053`
- 아카이브 main.jsbundle에 정확한 공개 개인정보/지원 URL과 문의 이메일 포함 확인.
- 서명된 실기기 IPA, TestFlight 업로드 또는 iOS 실행 QA가 아님. Windows/계정 시뮬레이터 실행 제한은 그대로이며 실제 iPhone/iPad QA가 필요함.
- 소스 커밋 GitHub validation 실행 `35439293301` 성공.
