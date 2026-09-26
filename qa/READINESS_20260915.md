# SQLD Pass 개발·검증 기록 — 2026-09-15

## 범위와 실제 변경

- 저장소: kasa500000-png/SQLD-Pass. 시작 HEAD와 origin/main은 `399bfd3f7527731fafb4b4b91db74f28a0507ded`(PR #4)이며 시작 작업 트리는 깨끗했다.
- 기존 `work/android-release-readiness` 브랜치에서 작업했다. QueryPass/SpicPass는 접근·변경하지 않았다.
- iPhone/iPad 공용 앱을 위해 `ios.supportsTablet`을 활성화했다. 실제 iPad UI/서명/빌드를 검증했다는 뜻은 아니다.
- Expo doctor가 금지하는 로컬 `eas-cli` 개발 의존성을 제거했다. npm 빌드 스크립트와 수동 CI는 `npx --yes eas-cli@24.5.0`을 사용한다. npm 레지스트리에서 버전 및 Node 엔진을 확인했으며 EAS 클라우드 빌드는 실행하지 않았다.
- 광고 config plugin이 직접 require하는 `@expo/config-plugins`를 Expo 57에 맞는 `57.0.9` 직접 의존성으로 선언했다. 기존에는 EAS CLI의 전이 의존성에 우연히 의존했다.
- 기존 lockfile을 삭제/재생성하지 않고 지정한 의존성 제거·추가만 반영했다. 이후 `npm ci`로 재설치했다.
- 콘텐츠/정답/SQLite schema/승인 게이트/광고 기본값은 변경하지 않았다.

## BLOCKER: 실제 콘텐츠 부재

첨부 디렉터리에는 프롬프트 `pasted-text.txt`만 있었다. `content-pack/content.json.gz`는 로컬 및 현재 Git 트리에 없다. 분할 base64는 000~014 중 002/005/006/008이 없다. 불완전한 조각을 합쳐 정상 콘텐츠로 간주하지 않았다.

`generated/content.json`은 `migrationIncomplete: true`이며 실제 lessons/questions/exams/days가 비어 있다. manifest의 60/120/20/1000은 목표 메타데이터일 뿐 실제 반입 수가 아니다.

필요한 원본:

- gzip 368,300 bytes, SHA-256 `da3ca79bf87a438185a7f101b9c41c99d0d491c589c44a102f3c48a9148afd54`
- 해제 JSON 1,941,994 bytes, SHA-256 `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`

원본을 받아 두 hash를 확인한 뒤 importer/materialize를 실행해야 한다. 현재는 무결성 검증 성공을 주장할 수 없다.

## 테스트와 환경

Windows PowerShell, Node 24.16.0 / npm 11.13.0. 프로젝트 엔진 >=22.13.0은 만족하나 요청 권장 Node 22.x에서의 재실행은 미수행이다.

| 검사 | 결과 |
|---|---|
| npm ci | 실행 및 통과, 변경 후 재실행 로그 제공 |
| 공통/네이티브 TypeScript | 통과 |
| expo install --check | 통과 |
| expo config --type public --json | 통과; iOS supportsTablet=true 확인 |
| expo-doctor | 20/21 통과. 광고 플러그인에 필요한 직접 config-plugins 의존성 경고 1개, 미해결 |
| ads:check | 통과, 기본 off |
| npm test | 157개: 133 통과, 24 실패, skipped 0 |
| test:monetization | 66/66 통과, skipped 0; SDK 모의 이벤트 검사 |
| test:content-pipeline | 51/51 통과, skipped 0; importer fixture 검사 |
| materialize --required / check-content | 실제 콘텐츠 없음으로 실패 |
| assert-draft-blocked | 콘텐츠 검증 단계 실패. 정확한 원고 승인 거부의 증거로 계산하지 않음 |
| prebuild:android:ads-test | build guard의 CONTENT_MISSING으로 차단. Expo prebuild 자체는 실행하지 않음 |
| Gradle / APK / AAB / IPA | 미실행·미생성 |
| 기기 설치·SQLite·오프라인·실제 보상형 광고 | 미실행 |

전체 테스트의 실패 24개는 learning-ui의 실제 콘텐츠 hash/레슨/확인문제/모의고사 사용 검사다. 실패 테스트를 삭제·skip하거나 대체 콘텐츠를 넣지 않았다. 별도 테스트 수는 전체 테스트에 포함되므로 합산하지 않는다.

Java 21, Android SDK 36 및 36-ext19, adb를 확인했다. SM-F721N 실기기와 Android 에뮬레이터가 연결되어 있었다. 연결 확인은 앱 설치/실기기 QA 증거가 아니다. Windows에서 Xcode/iOS 네이티브 빌드는 수행하지 않았다.

## 의존성 경고

- 최초 npm audit: HIGH 4, MODERATE 19, LOW 1. EAS CLI 제거 뒤 프로젝트 audit: HIGH 0, MODERATE 11.
- 남은 MODERATE는 Expo config → xcode → uuid 전이 의존성 경로다. 앱 런타임 악용 여부를 입증한 것은 아니며 미해결로 기록한다.
- npm audit의 자동 수정안에는 Expo 46/광고 SDK 13으로의 하향도 포함되어 있어 적용하지 않았다.
- deprecated 경고는 npm 설치 로그에 보존했다. 운영 배포 승인 근거로 사용하지 않는다.
- EAS CLI는 프로젝트 밖에서 필요할 때 다운로드한다. 프로젝트 audit가 외부 CLI 전체 의존성을 검증한 것으로 해석하면 안 된다.
- MEDIUM: 광고 SDK 16.4.0 플러그인은 `@expo/config-plugins`를 직접 require하지만 자체 의존성으로 선언하지 않는다. 이를 루트에 제공하면 설정 평가는 성공하나 doctor는 직접 설치 경고를 낸다. doctor 출력 자체가 외부 플러그인 호환용 설치 예외를 설명하지만, 경고 제외 설정으로 숨기지 않았다. SDK 플러그인이 `expo/config-plugins`로 전환되어야 이 경고 없이 의존성을 제거할 수 있다.
- 중간 `expo-doctor-final.log`는 설정 평가 오류를 출력하고 종료 코드 0을 반환했다. 통과로 계산하지 않는다. 최종 `expo-doctor-verified.log`는 실제 21개 검사를 수행하고 위 경고로 종료 코드 1이다.

## 광고 및 출시

기본 off, 내부 광고 빌드 프로파일은 공식 test ID를 사용한다. 배너는 홈/MY만, 1~4회 무료/5~20회 보상 해제 정책은 그대로다. 기기 재시작 후 해제 유지/UMP/ATT/광고 취소·완료/배경 복귀는 미검증이다. production+test는 기존 정책상 거부되므로 프롬프트의 production test AAB를 그대로 만들 수 없다. 승인 없는 production gate를 열지 않는다.

## 다음 순서

1. 지정된 원본 gzip 제공 및 hash 확인, Git 반입.
2. 실제 콘텐츠 전체 검사/157개 통합 테스트/원고 검수 및 DBMS 검증.
3. 내부 test 광고 모드 Android prebuild → Gradle APK → 연결 기기 QA.
4. iPhone/iPad의 서명된 내부 빌드, VoiceOver/큰 글자/회전/분할 화면 QA.
5. 실제 QA 및 소유자 콘텐츠 승인 후 출시용 AAB/IPA 준비. 스토어 제출·live 광고는 별도 승인 필요.

원본 로그: `qa/readiness-20260915/`. 이름에 verified가 있는 로그는 중간 실패 이후 재검증이며, 실패 이력도 그대로 보존한다.
