# SQLD Pass

SQLD 자격증 학습을 위한 독립 Android/iOS 프로젝트입니다.

> GitHub 기준 저장소: `kasa500000-png/SQLD-Pass`
>
> 이 저장소는 QueryPass와 별개의 제품/코드베이스입니다. 이후 SQLD Pass 개발은 이 저장소를 기준으로 진행합니다.

## 현재 상태

- Expo + React Native 기반 Android/iOS 공통 앱
- 회원가입 없이 로컬 SQLite 학습 기록 저장
- 이론 레슨 60개 + 확인 문제 120개
- 모의고사 20회 × 50문항 = 1,000문항
- 30일 학습 흐름, 오답/확신 부족 복습, 모의고사 타이머/답안표/결과 분석
- Android/iOS 네이티브 빌드 및 실기기 QA는 다음 단계
- 콘텐츠는 독립 감수/공식 범위 최종 대조 전이므로 production release gate는 닫혀 있음

내부 기본 식별자는 `com.sqldpass.app.internal`, 로컬 DB는 `sqld_pass.sqlite`를 사용합니다. 운영용 package/bundle identifier와 서명 자격증명은 저장소에 넣지 않습니다.
