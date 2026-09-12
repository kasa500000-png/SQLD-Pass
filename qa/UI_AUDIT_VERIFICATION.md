# 학습 UI 검증 기록 — 2026-09-12

대상: SQLD-Pass만. 기준 main 58ed626e3a6f5898bfed4add2afdf69fe2df0132.

## 수행

- Node 22.16.0 / 전역 TypeScript 5.8.3 공통 코드 컴파일 통과.
- 신규 tests/learning-ui.test.cjs: 37개 통과, 실패/건너뛰기 0개.
- 실제 60레슨/120확인문제/1,000모의문항을 화면 데이터로 생성하고 제출 전 해설 비노출 검사.
- Chromium/Playwright UI 검사 77개 통과, 페이지 오류 0개.
- 폭 320/390/768px 및 배율 100/130/200%의 주요 화면 overflow 검사 포함.
- 320px/130%에서 발견한 내 학습 헤더 밀림을 수정한 뒤 전체 브라우저 검사 재실행.
- 변경한 NativeView.tsx/StudyReadables.tsx 2개 파일의 TSX 문법 변환 통과.
- 현재 Git의 원본 views/controller/types/domain 3개+barrel/광고 policy/controller 핵심 9개 파일을
  커넥터에서 읽고 로컬 Git blob SHA와 대조하여 일치 확인 후 최종 37개/77개 검사를 재실행.
- 원본 runtime SHA-256은 08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead로 불변.

## 검사 방법과 한계

전체 원격 checkout/npm 설치가 아닌, 위 원본 모듈을 복원한 로컬 검사 환경에 변경 코드를 적용했다.
이전 대화에서 첨부한 Phase1의 preview 어댑터를 이번 화면 모델에 맞춰 연결했다.
Chromium의 로컬 URL 이동 제한을 변경하지 않고 page.set_content로 실행했다.
테스트에서 메모리 Repository를 명시적으로 주입했다. 브라우저 IndexedDB/네이티브 SQLite 영속성 검증이 아니다.
200%는 렌더링 스트레스 테스트 배율이며 기기 OS 글자 크기를 실제로 조작한 결과가 아니다.
미리보기 HTML 원본은 IndexedDB 코드를 유지한다. PNG 15장은 테스트 브라우저 캡처다.

실제 RN 의존성을 설치한 타입 검사, Expo doctor, Android/iOS 빌드·기기 실행·접근성,
실제 광고 재생과 보상 저장은 이번 작업에서 수행하지 않았다. 문법 변환은 이를 대신하지 않는다.
이전 51개 콘텐츠 검사와 66개 광고 검사를 이번 통합 실행 수치에 합산하지 않는다.

## 원격 콘텐츠 차단

기준 main에는 전체 gzip이 없다. 부분 base64와 placeholder만 확인됐다.
따라서 원격 CI/앱 실행 준비가 완료됐다고 표시하지 않는다. 로컬 원본으로 UI를 점검한 것과
원격에 전체 학습 콘텐츠가 존재하는 것은 별개다. 공개 승인 및 운영 광고는 계속 비활성이다.

## 재실행

전체 원본 runtime을 기존 content-import 경로로 준비한 뒤:

```bash
npx tsc -p tsconfig.core.json
node --test tests/learning-ui.test.cjs
```

선언된 TypeScript 6 및 실제 RN 환경에서의 추가 검증은 필요하다.
롤백은 UI 변경 커밋의 일반 revert로 수행하며 학습 DB나 광고 해제 기록을 변환하지 않는다.
