# Google Play internal update 2 — 2026-09-20

Owner requested re-upload of the latest learning UI to internal testing.

## Build scope

- Source commit: `f031dcf5bbc4069c33096ce7a16f928fff4550c8` (includes redesign and UI simplification).
- EAS build: `a6ff54ad-3514-4144-863a-924d873f804b`.
- Profile `play-test`: AAB / store distribution / internal app environment / ads off.
- Package `com.kasa500000.sqldpass`, version `0.1.0`, Android version code `2`.
- Existing remote Android signing credentials reused. Credentials are not copied into the repository.
- Build guard, native TypeScript, content hash/structure and ads-off checks passed. Unit tests: 171/171 passed.
- Native UI smoke evidence for these source changes: `qa/LEARNING_SIMPLIFICATION_20260920.md` and `qa/LEARNING_REDESIGN_20260920.md`. Those local QA APKs use a different internal package; they are not claimed as Play-installed validation of this AAB.

## Release notes

홈·학습·실전·기록 탭으로 화면을 개편했습니다.
학습 이어하기와 복습 동선을 개선했습니다.
반복 안내와 불필요한 버튼을 줄여 이론과 문제풀이에 집중할 수 있도록 했습니다.
이론 검색·북마크, 모의고사 기록과 해설 접근을 개선했습니다.
이번 내부테스트는 광고가 꺼져 있으며 모의고사 1~4회를 이용할 수 있습니다. 5~20회는 새로 해제할 수 없습니다.

## Submission

- Internal track `4701266265039666926`, release draft `2` created; title `0.1.0 (2) - 학습 UI 개선`.
- EAS build FINISHED; Gradle completed in 6m 3s.
- Artifact: `.build/artifacts/SQLD-Pass-play-test-2.aab`; SHA-256 `216a2dd7e54fb587d2bacc6071807e1e81def58a6161caeb080964b27d55067e`.
- `jarsigner`: jar verified; self-signed certificate, timestamp and JarInputStream manifest-order warnings remain, as with the prior bundle. Raw output: `.build/play-test-2-signature.log`.
- Certificate SHA-256 matches release 1: `EA:1E:84:82:B5:1D:7A:90:52:71:EE:CD:AB:F8:40:E2:44:AD:CF:AA:ED:7D:A5:59:32:9C:B9:29:E7:17:19:42`.
- Play accepted version code 2 / version 0.1.0 / API 24+ / target SDK 36 / four ABIs. No blocking errors; one deobfuscation mapping warning. Supported-device counts unchanged.
- **Published 2026-09-20 10:35 KST**. Console explicitly shows active / latest release `0.1.0 (2) - 학습 UI 개선` / available to internal testers / unreviewed.
- Existing opt-in link: https://play.google.com/apps/internaltest/4701266265039666926 . Tester configuration was not changed. Console says propagation usually takes under one hour but can take longer; device installation of the update is not yet verified.
- No changes to public-release approval, live-ad activation, closed Alpha rollout or iOS distribution.
