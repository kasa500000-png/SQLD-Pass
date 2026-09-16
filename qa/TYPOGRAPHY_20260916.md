# Pretendard 적용 검증 — 2026-09-16

## 변경

- 공식 Pretendard 1.3.9 OTF 원본 4개(400/600/700/800)를 assets/fonts/pretendard에 내장했다. ZIP과 출처는 해당 디렉터리 README 참조.
- Expo 57의 기존 전이 의존성 expo-font 57.0.4를 동일 버전의 직접 의존성으로 승격했다. 다른 의존성의 버전은 유지했다. 업데이트 명령이 일시적으로 추가한 중복 Expo 트리는 제외하고 기존 lock의 expo-font 항목만 루트로 옮겼으며 npm ci 재설치로 검증했다.
- Android XML font family 및 iOS UIAppFonts를 config plugin으로 등록했다. 로컬 앱 번들로 제공하며 실행 중 폰트 네트워크 요청이나 로딩 대기는 없다.
- React Native 공통 Text/TextInput에서 기본 폰트를 지정했다. 명시적 fontFamily 스타일은 우선하므로 SQL의 monospace를 유지한다.
- 원본 라이선스를 파일로 동봉하고 내 학습 → 콘텐츠 버전·상태 → 글꼴 라이선스 전문에서 볼 수 있도록 했다.
- 콘텐츠·정답·학습 기록·광고 정책·승인 게이트 변경 없음.

## 검증

| 항목 | 결과 |
|---|---|
| npm ci | 통과 |
| 공통 TypeScript / 네이티브 TypeScript | 모두 통과 |
| npm test | 157/157 통과, 실패 0, skipped 0 |
| Expo config introspect | 통과, iOS UIAppFonts에 4개 OTF 확인 |
| Android prebuild --no-install | 통과, internal / ads off |
| Android 폰트 리소스 | OTF 4개 및 xml_pretendard.xml 생성, MainApplication에서 Pretendard 등록 확인 |
| OTF name/OS2 메타데이터 | typographic family Pretendard, weight 400/600/700/800 확인 |
| 내부 브라우저 미리보기 | 홈의 computed fontFamily Pretendard, 한글 시각 확인, 페이지 가로 넘침 없음 |
| React 구성 점검 | Text/Input props와 스타일 전달, OS 글꼴 확대 유지, 추가 effect/네트워크/앱 초기화 대기 없음 |

## 미해결·미실행

- Expo install --check는 새 원격 권고 버전 때문에 실패: 기존 expo 57.0.22 → ~57.0.23, expo-build-properties 57.0.17 → ~57.0.20 권고. 이번 폰트 작업에서는 두 패키지 버전을 변경하지 않았다.
- Prebuild는 기존 userInterfaceStyle 설정에 expo-system-ui 설치를 권고했다. MEDIUM 호환성 점검 항목으로 남긴다.
- npm audit MODERATE 11개가 남아 있다. 기존 광고 플러그인의 직접 config-plugins 의존성 doctor 경고는 이번 작업에서 재검증/해소하지 않았다.
- APK/IPA 빌드, 실제 Android/iPhone/iPad 렌더링, 큰 글자/회전/VoiceOver/TalkBack은 미실행이다. 메타데이터 및 브라우저 확인은 네이티브 QA를 대신하지 않는다.
- 네이티브 폰트는 새 빌드부터 반영된다. 기존 development client에 JS만 새로고침하는 것으로는 내장되지 않는다.

검사 로그는 로컬 `.build/fonts-qa/`에 있다. 미리보기 `.build/ui-gallery/index.html`은 동일 OTF를 인라인 포함한 브라우저용 산출물이며 네이티브 앱 화면 캡처가 아니다.
