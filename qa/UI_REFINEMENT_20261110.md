# UI refinement verification — 2026-11-10

## Scope

Owner requested screen-specific PRs, commits and an integrated production update to both stores. Reviewed production Android 0.3.1(17) findings are in ANDROID_PRODUCTION_UI_REVIEW_20261110.md. This implementation leaves textbook.20261109.2 content, scoring, local grants, consent policy and the five native tabs intact.

## Screen PRs

- #24 shared typography, emphasis and selection controls
- #25 Home
- #26 Textbook, search, chapter and reading
- #27 SQL and tables
- #28 Practice and results
- #29 Mock catalogue
- #30 Exam and answer sheet
- #31 Results, explanations and review
- #32 Records
- #33 Flashcards
- #34 Glossary
- #35 Settings and data management
- #36 Help and privacy

The integration patch uses measured control-container widths (including narrower iPad reading footers) and fixes answer-sheet number/status wrapping and stable equal-width tab placement after a settings save. It also makes the daily learning link secondary when a mock attempt is active. All 13 screen PRs #24–36 passed CI and were merged separately; integration is PR #37.

## Actual checks

- 418 automated tests passed, including screen-offset isolation and non-persistence. Native TypeScript passed. Expo doctor 21/21 and authored-content integrity checks passed before final rendering-only fixes; final source checks rerun separately.
- Android release-mode internal official-test-ad APK 0.3.2(18), package com.sqldpass.app.adsqa, installed on Samsung SM-F721N. Production app records were not used for these tests.
- Android: Home, textbook/chapter, SELECT lesson/table, two-question practice (2/2), explanation, practice result, mock catalogue, study attempt submission (1 answered/49 unanswered, 2 points), result/explanation, settings, dark theme and app font 130%, flashcard front/back, privacy/help.
- Settings -> privacy -> back retained the exact scroll position. Tab widths remained equal after saving settings on the final build.
- Official Google test banner loaded. Official rewarded ad completed for M08, SDK displayed reward earned, and closing the ad opened the unlocked M08 intro. During the test the Google Ads store sheet opened; it was closed without installing. No live ad was used or clicked.
- Final Android table expansion and horizontal scroll reached the last column (강사명), with a visible close control.
- M08 timed mode started at 90 minutes; navigating Home and Records suppressed the banner; revised answer sheet visually confirmed with number and status on consistent lines at 130% font. Android uiautomator sometimes could not obtain idle state while the timer updated; the answer-sheet PNG is visual evidence, not a matching XML snapshot.
- iPhone 17 simulator: actual Release app installed; XCTest traversed 13 screens successfully after final tab fixes (14 including onboarding on initial run). Screenshots cover Home, textbook, chapter, SQL lesson, practice list, mocks/intro, Records, Settings, Privacy, Help, cards and glossary.
- iPad Pro 13-inch simulator: same native screen traversal including onboarding passed; final measured-width build also passed an assertion that reading-footer controls share the same vertical center. Dark/130% Home and bottom-tab visibility checked. iPhone 13 Pro Max 6.5-inch final build passed the same traversal and assertions. Tablet multi-column layout screenshots retained.

## Evidence and limits

Evidence: evidence/ui-refinement-20261110/. Only named current checks above are claimed. This is not exhaustive traversal of 216 sections, 37 widgets or 1,340 questions; content is unchanged. Simulators are not physical-iPad evidence. Fresh physical iPad is currently unavailable and reconnection requested. Current consent policy is unchanged; earlier EEA reject/reopen/consent/withdraw evidence remains separately scoped in RELEASE_TEXTBOOK_20261109.md. No new EEA or TalkBack/VoiceOver claim is made here.

## Release status

Preparing 0.3.2: Android versionCode 18, iOS build 12. Not yet submitted by this verification record. Existing iOS 0.3.0 remains WAITING_FOR_REVIEW (API read 2026-11-10); Android 0.3.1(17) was confirmed installed from production Play. Browser workspace 11 remains delegated to the user; control return requested. Production advertising approval must bind the final code hash and truthful platform-specific evidence before building/uploading.


## Final Android artifact

`.build/release-ui-20261110/sqld-pass-0.3.2-18.aab` built successfully using the existing upload key. Bundletool validation and JAR signature passed; certificate SHA-256 matches the backed-up upload certificate. Embedded app.config confirms production, adsMode=live, adsRuntimeEnabled=true and rewarded exam policy. Derived universal inspection APK passed static 16KB checks for 36 native libraries; it was not installed or used to request live ads. SHA-256 and limitations are in evidence/ui-refinement-20261110/android-production-artifact.json. This artifact is not uploaded or submitted yet.

Store screenshot candidates for iPhone 6.5-inch and iPad 13-inch are staged under `.build/release-ui-20261110/screenshots/`. Fresh physical-iPad verification, iOS production archive and both store submissions remain pending. App Store existing version 0.3.0 is still a separate submission; no new submission status is implied.

## Submission follow-up

The owner explicitly waived additional physical-device verification on 2026-11-10. Subsequent build, AdMob and store submission evidence is recorded in [RELEASE_UI_20261110.md](RELEASE_UI_20261110.md); the earlier pending-state statements above are historical checkpoints, not current store status.
