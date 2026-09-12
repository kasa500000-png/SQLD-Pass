# SQLD Pass — 콘텐츠 반입 및 테스트 빌드 준비

대상은 kasa500000-png/SQLD-Pass만이다. QueryPass와 SpicPass는 변경하지 않는다.

## 이번 변경

- 원본 Phase 1 runtime 1,941,994바이트의 SHA-256을 content-pack/content.lock.json에 고정했다.
- 60레슨, 120확인문제, 20회 1,000문항, 30일 학습표, 문항/선택지/해설/과목/회차/관련 이론/출처 연결을 검사한다.
- 임시 파일 쓰기, flush, rename으로 generated/content.json 교체를 원자적으로 처리한다.
- 손상된 gzip, 크기 초과, 다른 원본, 정답 선택지 누락, 문항 중복, 시험/연습 혼입은 반입 전에 거부한다.
- postinstall은 소스 편집을 위해 placeholder를 유지할 수 있지만 내부 APK/IPA 빌드와 CI는 실제 콘텐츠가 없으면 실패한다.
- 공개 게이트의 임의 실패를 검증 통과로 취급하지 않는다. 실제 콘텐츠를 먼저 확인하고 정확한 콘텐츠 검수 거부 사유를 검사한다.
- 무료 1~4회, 회차별 광고 해제 5~20회 정책은 변경하지 않았다. 운영 광고는 활성화하지 않았다.

## 실제 완료 범위와 미완료

로컬에서 전체 원본을 검증하고 content.json.gz를 만들었다. 원본 지문/SQL/정답/해설 및 감수 상태를 바꾸지 않았다.
새 독립 Node 테스트 51개가 모두 통과했다. 원고 3개 source SHA가 기존 provenance와 일치한다.
이는 콘텐츠 구조/동일성 검증이지 정답의 독립 감수 또는 Oracle/SQL Server 실행 검증이 아니다.

전체 콘텐츠 archive를 GitHub에 직접 파일로 전송하는 경로는 현재 연결 도구/런타임에서 확보하지 못했다.
따라서 코드/lock/테스트 반영과 전체 payload Git 반입을 구분한다. content.json.gz 실제 파일을 추가하기 전에는
원격 checkout이 학습 가능한 빌드가 아니며, 강화된 content CI가 실패하는 것이 정상이다.

## 원본 반입

이번 전달 ZIP의 content-pack/content.json.gz 또는 이전 Phase1 ZIP의 generated/content.json을 사용한다.
새 코드를 받은 SQLD-Pass 저장소 루트에서 다음을 실행한다. 외부 npm 설치 없이 Node 22로 반입 검증할 수 있다.

```bash
node scripts/import-content.cjs /path/to/content.json.gz
node --test tests/content-import.test.cjs
node scripts/materialize-content.cjs --required
node scripts/check-content.cjs
node scripts/assert-draft-blocked.cjs
```

원격에 넣어야 하는 payload는 content-pack/content.json.gz이다. GitHub 웹의 해당 폴더에서도 바이너리 원본을 업로드할 수 있다.
이 파일은 환경변수, 키, 사용자 학습 기록을 포함하지 않는다. README/lock만 업로드했다고 이관 완료로 표시하지 않는다.
정답/해설 변경이 필요한 경우 새 버전·새 hash·변경 검수 이력을 정식으로 작성한다. 검사를 피하려고 hash만 바꾸지 않는다.

## GitHub 및 네이티브 검증

의존성 진단 워크플로 실행 34684197704는 completed/failure였다. 작업 단계가 생성되지 않았고 로그도 없었다.
API에서 구체적 시작 실패 이유는 확인하지 못했다. 요금/권한 문제라고 단정하지 않는다. Actions 실행 화면의 요약에서 원인을 확인한다.
로컬에서는 npm registry DNS 접근 실패, Android SDK/adb 및 Expo 자격증명 미확보로 실제 네이티브 설치/빌드를 수행하지 못했다.

dependency-readiness는 의존성 설치 결과와 생성된 lockfile을 보관하는 진단용이다.
정식 validation/native-test-build는 검토·커밋된 package-lock.json과 정확한 콘텐츠를 필수로 요구한다.
진단의 npm install fallback을 정식 출시의 재현 가능한 npm ci 검증으로 오인하지 않는다.

수동 Native test build는 Android 내부 APK 또는 iOS 시뮬레이터 빌드만 요청한다. 실제 iPhone/iPad 서명 기기 빌드는 별도 검증이다.
GitHub Secrets에 권한 있는 EXPO_TOKEN, Variables에 독립 SQLD-Pass EXPO_OWNER/EXPO_PUBLIC_EAS_PROJECT_ID가 필요하다.
이 값은 다른 프로젝트에서 복사하지 않는다. 워크플로 작성은 EAS 계정 연결·실제 빌드·설치·광고 재생·스토어 제출의 증거가 아니다.
EAS 실행은 수동이며 요금제/잔여 사용량을 확인해야 한다. 이 변경은 자동 유료 빌드나 스토어 제출을 시작하지 않았다.

## 남은 순서

1. content.json.gz 실제 원격 반입 후 content CI 확인.
2. GitHub runner 시작 실패 해결, 실제 의존성 설치와 lockfile 검토/커밋.
3. 네이티브 타입/Expo 호환/prebuild, Android 내부/ iOS 테스트 빌드.
4. 실기기 Google 테스트 광고·동의·보상·SQLite 재시작·접근성 검증.
5. 독립 콘텐츠 검수/공식 범위 확인과 운영 광고 별도 승인 후 스토어 제출.
