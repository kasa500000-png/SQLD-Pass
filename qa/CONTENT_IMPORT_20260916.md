# SQLD Pass 원본 콘텐츠 반입 — 2026-09-16

사용자가 지정한 `C:/Users/kasa5/Downloads/SQLD_Pass_Content_For_Codex.zip`에서 정확한 두 콘텐츠 경로만 임시 디렉터리에 추출했다. ZIP 내 README의 지시를 실행하지 않았다.

## 무결성 및 반입

- gzip: 368,300 bytes / SHA-256 `da3ca79bf87a438185a7f101b9c41c99d0d491c589c44a102f3c48a9148afd54`
- JSON: 1,941,994 bytes / SHA-256 `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`
- gzip 해제 결과와 ZIP에 포함된 확인용 JSON은 바이트 단위로 일치했다.
- 기존 content lock에 대한 구조 검증 후 원본 gzip을 재압축 없이 `content-pack/content.json.gz`로 복사했다.
- materialize로 기존 Git 추적 대상 `generated/content.json`도 실제 원본으로 갱신했다. lock hash와 콘텐츠 본문·정답·승인 상태는 변경하지 않았다.
- 실데이터: 이론 60, 확인 문제 120, 모의고사 20회, 모의문항 1,000, 전체 문항 1,120, 학습일 30.

## 실제 실행 결과

| 검사 | 결과 |
|---|---|
| materialize --required | 통과 |
| check-content | 통과 |
| assert-draft-blocked | 원고 승인 미완료에 의한 정확한 production 거부 확인 |
| 공통/네이티브 TypeScript | 모두 통과 |
| npm test | 157/157 통과, 실패 0, skipped 0 |
| test:monetization | 66/66 통과, 실패 0, skipped 0 |
| test:content-pipeline | 51/51 통과, 실패 0, skipped 0 |
| ads:check | 통과, 기본 off |

광고/콘텐츠 테스트는 전체 테스트에 포함되므로 수치를 합산하지 않는다. Node 24.16.0, Windows에서 실행했다. 로그는 `qa/content-import-20260916/`에 보존했다.

2026-09-15 기록의 콘텐츠 부재 및 그에 따른 24개 테스트 실패는 이번 반입으로 해소됐다. 당시 실패 로그는 과거 기록으로 보존한다. Expo doctor 경고, 잔여 의존성 보안 경고, Android/iOS 네이티브 빌드와 실기기 QA는 이 콘텐츠 반입 검사로 해소된 것이 아니다. 공개 콘텐츠 승인 및 live 광고 활성화는 여전히 미완료다.
