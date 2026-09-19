# 출시를 이어가기 위해 필요한 소유자 입력

개발·검증·업로드는 이 작업에서 이어갈 수 있지만 아래 실제 정보와 사람의 검수를 대신 만들어 넣을 수는 없다.

## 1. 운영 정보

2026-09-19 소유자가 기존 출시 SpicPass 정보를 참고하도록 지시했다.
공개 지원 페이지와 App Store 정보를 대조해 다음 값을 `config/public-support.json`과 문서에 반영했다.

- 운영자: **김석현** (App Store 제공자 표기: Seokhyeon Kim)
- 공개 문의 이메일: **kasa500000@gmail.com**
- 기존 운영 사이트: https://spicpass-support.shk1122.chatgpt.site/
- 근거: [SpicPass 공개 지원 사이트](https://spicpass-support.shk1122.chatgpt.site/),
  [출시 앱](https://apps.apple.com/kr/app/spicpass/id6809081974).

운영자명·이메일은 다시 요청하지 않는다. 기존 사이트는 SpicPass 전용 호스팅 주소이며
별도 소유 커스텀 도메인이 확인된 것은 아니다. SQLD Pass 전용 사이트 게시와 익명 HTTPS 200 응답 검증을 완료하고 앱에 연결했다.

- 고객지원: https://sqld-pass-support.shk1122.chatgpt.site/support.html
- 개인정보: https://sqld-pass-support.shk1122.chatgpt.site/privacy.html
- 이용 안내: https://sqld-pass-support.shk1122.chatgpt.site/terms.html
SpicPass의 정책·광고 해제 방식·스토어 개인정보 신고를 SQLD Pass에 그대로 적용하지 않는다.

별도로 확정할 값:

```text
Android 패키지 / iOS Bundle ID:
```

식별자 제안: `com.kasa500000.sqldpass`. 영구 식별자는 소유자 확정 후 사용한다.
현재 내부 검증 ID는 `com.sqldpass.app.internal`이며 공개 앱 식별자로 자동 전환하지 않는다.

## 2. Apple 및 실제 기기

- 내부 브라우저의 [App Store Connect](https://appstoreconnect.apple.com/login)에서 직접 로그인한다.
  비밀번호·인증 코드를 채팅에 적지 않는다. 로그인 완료 후 상태를 알려 준다.
- Apple Developer Program 가입 상태와 실제 iPhone/iPad 테스트 가능 여부를 알려 준다.
- 연결된 Galaxy Z Flip4의 Play Protect 확인과 잠금 해제를 기기에서 직접 완료한다.
  보호 기능을 끄거나 검사를 우회할 필요는 없다.
- Expo의 클라우드 iOS 시뮬레이터는 현재 팀 계정에 미개방이다.
  Windows에서 시뮬레이터 빌드까지는 완료했으나 실행 검증은 실제 기기/지원 환경이 필요하다.

## 3. 실제 콘텐츠 검수

[로컬 검수 화면](http://127.0.0.1:4180/)에서 검수자, 항목 판정,
DBMS 확인 및 근거를 기록하고 검수 JSON을 내보낸다.
현재 60레슨 + 1,120문항 모두 미승인이다. 자동 테스트 통과는 정답 감수와 다르다.

서버가 꺼졌다면 저장소에서 다음을 실행한다.

```powershell
node scripts/export-content-review.cjs
node scripts/serve-content-review.cjs
```

검수 기록은 해당 브라우저의 로컬 저장소에 있으므로 작업 후 JSON 내보내기로 보관한다.
원본 문항을 검수자가 수정해야 한다면 변경 근거를 남긴 새 콘텐츠 팩으로 별도 검증한다.
원본 gzip을 조용히 덮어쓰거나 검수 플래그만 자동 승인하지 않는다.

## 4. 광고 및 스토어

- AdMob의 SQLD Pass 전용 앱/광고 단위, 동의 메시지, 배너 자동 갱신 해제,
  소유 도메인의 app-ads.txt 준비가 필요하다.
- 에뮬레이터 테스트에서 UMP 요청 오류가 관찰되어 실제 보상 광고 완료는 아직 검증되지 않았다.
- 개인정보/지원 페이지 게시 완료. 실제 광고 SDK·출시 지역의 최종 설정과 스토어 신고를 대조한다.
- Google Play 개인 계정의 프로덕션 접근 조건은 SQLD Pass 앱 생성 후 콘솔에서 확인한다.
  대상 계정이면 12명/14일 테스트 등 실제 경과 시간이 필요하며 즉시 완료로 처리할 수 없다.
- 콘텐츠와 광고 증거가 충족된 뒤 최종 소유자 배포 승인 및 스토어 제출을 진행한다.

상세 완료/미완료 근거: [검증 기록](../qa/RELEASE_READINESS_20260919.md).
