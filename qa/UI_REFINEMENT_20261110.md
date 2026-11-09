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

The integration patch uses measured control-container widths (including narrower iPad reading footers) and fixes answer-sheet number/status wrapping and stable equal-width tab placement after a settings save. It also makes the daily learning link secondary when a mock attempt is active. All PRs retain separate commits; merge status is recorded separately after completion.

## Actual checks

- 418 automated tests passed, including screen-offset isolation and non-persistence. Native TypeScript passed. Expo doctor 21/21 and authored-content integrity checks passed before final rendering-only fixes; final source checks rerun separately.
- Android release-mode internal official-test-ad APK 0.3.2(18), package com.sqldpass.app.adsqa, installed on Samsung SM-F721N. Production app records were not used for these tests.
- Android: Home, textbook/chapter, SELECT lesson/table, two-question practice (2/2), explanation, practice result, mock catalogue, study attempt submission (1 answered/49 unanswered, 2 points), result/explanation, settings, dark theme and app font 130%, flashcard front/back, privacy/help.
- Settings -> privacy -> back retained the exact scroll position. Tab widths remained equal after saving settings on the final build.
- Official Google test banner loaded. Official rewarded ad completed for M08, SDK displayed reward earned, and closing the ad opened the unlocked M08 intro. During the test the Google Ads store sheet opened; it was closed without installing. No live ad was used or clicked.
- M08 timed mode started at 90 minutes; navigating Home and Records suppressed the banner; revised answer sheet visually confirmed with number and status on consistent lines at 130% font. Android uiautomator sometimes could not obtain idle state while the timer updated; the answer-sheet PNG is visual evidence, not a matching XML snapshot.
- iPhone 17 simulator: actual Release app installed; XCTest traversed 13 screens successfully after final tab fixes (14 including onboarding on initial run). Screenshots cover Home, textbook, chapter, SQL lesson, practice list, mocks/intro, Records, Settings, Privacy, Help, cards and glossary.
- iPad Pro 13-inch simulator: same native screen traversal including onboarding passed; tablet multi-column layout screenshots retained.

## Evidence and limits

Evidence: evidence/ui-refinement-20261110/. Only named current checks above are claimed. This is not exhaustive traversal of 216 sections, 37 widgets or 1,340 questions; content is unchanged. Simulators are not physical-iPad evidence. Fresh physical iPad is currently unavailable and reconnection requested. Current consent policy is unchanged; earlier EEA reject/reopen/consent/withdraw evidence remains separately scoped in RELEASE_TEXTBOOK_20261109.md. No new EEA or TalkBack/VoiceOver claim is made here.

## Release status

Preparing 0.3.2: Android versionCode 18, iOS build 12. Not yet submitted by this verification record. Existing iOS 0.3.0 remains WAITING_FOR_REVIEW (API read 2026-11-10); Android 0.3.1(17) was confirmed installed from production Play. Browser workspace 11 remains delegated to the user; control return requested. Production advertising approval must bind the final code hash and truthful platform-specific evidence before building/uploading.
