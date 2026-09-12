# SQLD Pass — 무료 학습 + 배너 + 선택형 회차 해제

기준: 2026-09-12 / 정책 2026-09-12.1 / 대상은 `kasa500000-png/SQLD-Pass`만.
QueryPass와 SpicPass는 변경하지 않는다. SpicPass의 운영 최소화 방향을 참고하되,
이번 사용자의 명시적 요청에 따라 SQLD Pass에만 보상형 광고를 추가한다.
이 문서는 과거의 전면 무료/광고 미구현 설명보다 우선한다.

## 확정 구현 기본값

| 항목 | 정책 |
|---|---|
| 이론·확인 문제·오답 복습 | 전부 무료 |
| 모의고사 1~4회 | 광고 시청 없이 무료, 기존 30일 과정 유지 |
| 모의고사 5~20회 | 선택한 회차당 보상형 광고 1회 완료 후 기기에 계속 해제 |
| 재응시·제출 후 해설 | 이미 열린 회차는 재시청 없음 |
| 배너 | 홈/내 학습만, 고정 320×50, 화면 폭 부족 시 숨김 |
| 배너 금지 | 온보딩·이론·문제·복습·시험·답안·결과·설정·고객지원 |
| 광고 시작/빈도 | 배너 최초 요청은 앱 실행 45초 이후, 요청 간격 90초 이상, 실행당 최대 6회 |
| 시험 진행 중 | 다른 화면으로 나가도 모든 광고 제한 |
| 광고 취소·실패·동의 제한 | 잠금 유지, 무료/기해제 학습은 유지 |
| 보상 저장 실패 | 재시청 없이 같은 보상 저장 재시도(프로세스 생존 중) |
| 학습만 초기화 | 해제 기록 유지 |
| 전체 초기화·재설치·기기 변경 | 기기 내 해제 기록 복원 불가, 사전 안내 |
| 로그인·서버·결제·런타임 AI·학습 원격 분석 | 추가하지 않음 |

배너 자동 새로고침은 AdMob 콘솔에서 **사용 안 함**으로 설정해야 SDK 내부 요청이
앱의 90초/6회 제한을 우회하지 않는다. 위 값은 자체 요청 정책이며 Google의 권장
노출량 또는 수익 보장이 아니다. 28dp 패딩을 두었지만 실제 오클릭·접근성은 실기기 검수 대상이다.

## 사용자 흐름

미해제 회차 선택 → 보상 범위·기기 저장 안내 → 사용자가 시청 선택 → UMP 상태 확인
→ 광고 로딩(15초 타임아웃) → SDK `EARNED_REWARD` → SQLite 상태 저장 → 회차 열림.
`CLOSED`, 클릭, 광고 로딩 성공만으로는 보상을 주지 않는다. 화면 닫기 이벤트를 기다리기 전에
보상 저장을 시작한다. 광고 응답은 회차/요청 ID/모드에 연결하고 중복 콜백은 무시한다.
노출 이후 180초 watchdog은 JS 요청만 정리하며 광고를 강제 닫거나 보상을 만들지 않는다.

이벤트 직후 OS가 프로세스를 종료해 저장이 완료되지 않으면 서버 없는 구조로 그 시청을
재검증할 수 없다. 앱 종료를 포함한 절대적인 보상 복구를 보장하지 않는다.
테스트 해제 기록은 운영 모드 신규 응시권으로 사용하지 않는다. 기존 앱에서 이미 시작한
회차는 첫 지갑 마이그레이션 시 권리를 보존한다.
학습만 초기화는 현재 학습 상태를 재설정하는 기능이다. 복구용 이전 슬롯까지 지우는
완전 삭제가 필요하면 열린 회차 소실 안내를 확인한 뒤 전체 데이터 삭제를 사용한다.

## 광고 모드와 검증

기본 `EXPO_PUBLIC_ADS_MODE=off` — 광고 요청도 시청 완료 가장도 하지 않는다.
`test` — 내부 빌드에서 Google 테스트 ID만 사용. 실제 매출 없음.
`live` — production + 소유자 활성화 + 실제 광고 ID + 코드 해시에 묶인 검증 증거가 필요하다.
기존 콘텐츠 release gate와 새 광고 gate는 서로 독립이며 둘 다 충족해야 공개할 수 있다.

```bash
npm install
npm run test:monetization
npm run ads:check
npx eas build --platform android --profile ads-test
npx eas build --platform ios --profile ads-test-simulator
# 실제 iPhone/iPad 내부 배포 검증은 별도 서명 기기 프로파일 필요
```

현재 저장소의 전체 콘텐츠 이관은 미완료다. 기존 `content:materialize`를 완료한 뒤 앱을 검증한다.
신규 자동 테스트는 별도 합성 fixture로 실행하며 실제 교과서 정답 검수와 구분한다.
광고 SDK `react-native-google-mobile-ads@16.4.0`은 공개 릴리스/문서 확인 후 버전 고정했으나,
Expo 57 / RN 0.86 조합의 네이티브 빌드·기기 호환은 이번 환경에서 실행하지 못했다.
lockfile·expo-doctor·Android 16KB 페이지/foreground 복귀·iOS 광고 닫기 검수를 수행해야 한다.

## 운영 활성화에 필요한 소유자 설정

- `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_ANDROID_BANNER`, `EXPO_PUBLIC_ADMOB_IOS_BANNER`
- `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED`, `EXPO_PUBLIC_ADMOB_IOS_REWARDED`
- AdMob UMP/지역 메시지, iOS ATT 메시지와 실제 데이터 처리 일치 확인
- 실제 운영 개인정보/지원 URL·app-ads.txt·광고 포함 스토어 신고
- `ads-release-approval.template.json`을 별도 승인파일로 복사하고 실제 증거 기록
- `npm run ads:hash` 결과를 승인에 기록. 광고 코드가 바뀌면 다시 검수

비개인화 요청도 무수집이 아니다. UMP의 `canRequestAds` 이후 초기화하고 초기 measurement를
지연한다. 학습 답안/진도를 광고 키워드·user ID·서버 검증 데이터로 전송하지 않는다.
ATT 허용이나 광고 클릭/설치를 해제 조건으로 강제하지 않는다.
부적절한 광고는 고객지원의 광고 신고 서식으로 공유할 수 있다. 공유는 접수 확인이 아니다.

## 비용·리스크·수익 해석

앱 전용 서버·회원·구독 관리가 없어 운영 부담을 줄이지만 무관리/수익 보장은 아니다.
스토어/광고 SDK/정책 대응, 정오표, 고객지원과 개인정보 문서 유지가 필요하다.
서버 검증(SSV)은 도입하지 않는다. 로컬 해제 데이터 변조 방어는 제한적이며 작은 수익 단위의
콘텐츠에서 서버 복잡도보다 운영 단순성을 우선한 결정이다.
회차 유지형은 추가 16회 기준 설치별 정상 이용에서 신규 보상형 시청이 최대 16회다.
재설치·기기 변경·데이터 삭제를 포함한 사람별 평생 한도는 아니다. 반복 과금/시청 매출을
전제로 삼지 않는다. 첫 출시 후 AdMob 실측 노출·충족률·eCPM과 자연 유입으로 판단한다.

## 확인한 공식/유지보수자 자료

- Google UMP: https://developers.google.com/admob/android/privacy
- Apple Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- SDK 시작: https://docs.page/invertase/react-native-google-mobile-ads
- SDK 동의: https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent
- SDK 보상/배너: https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads
- SDK 릴리스: https://github.com/invertase/react-native-google-mobile-ads/releases
