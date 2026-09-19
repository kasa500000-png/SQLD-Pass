# SQLD Pass 출시 준비 검증 — 2026-09-19

이 기록은 내부 검증이다. 공개 출시·실광고 활성화·콘텐츠 승인 기록이 아니다.
대상: SQLD-Pass만. 기본 광고 모드 off, 내부 앱 ID `com.sqldpass.app.internal`.

## 확인된 결과

- 원본 gzip Git 보관과 materialize 완료. JSON SHA-256:
  `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`.
  60레슨, 확인 120문항, 모의고사 20회/1,000문항, 총 1,120문항.
  본문·정답·출처·승인 플래그를 변경하지 않았다.
- 자동 테스트 163/163, 네이티브 TypeScript 검사 통과.
- Expo Doctor 21/21, 의존성 감사 0건. SDK 57.0.24 기준.
- `ci:content` 통과. 미승인 콘텐츠의 공개 빌드가 정확한 사유로 차단됨.
- Android release variant 내부 APK 빌드 성공: Kotlin 2.3.20,
  Android target/compile API 36, arm64-v8a/x86_64.
  `.build/android-build-ui-20260919.log`: 3분 7초, 585 tasks.
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
