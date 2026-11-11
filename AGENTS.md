# SQLD Pass repository instructions

This repository is the canonical standalone source for the SQLD Pass Android/iOS app.
It is a separate product and codebase from QueryPass. Do not read, edit, merge into, or reuse
QueryPass or SpicPass as an implicit target unless the owner explicitly requests cross-project work.

## Latest owner direction — 2026-11-11 interruption and UI refinement

Timed mocks have 90 minutes of active solving time. Explicit pause, saved exit, and
background/inactive interruptions freeze the remaining time; returning requires explicit
resume. Paused attempts stay active for one-attempt, explanation and advertising gates.
Persist answers, position, flags and pause metadata in the existing ordered transaction.
Never label an unsuccessful save as saved, refund elapsed time, or rewrite old scores.
Unpaused recovery conservatively accounts for unverifiable elapsed time before pausing.
Show pause usage on results; missing historic metadata is not evidence of no interruptions.
Use the 2026-11-11 UI refinement document for current screen hierarchy and tokens.
The owner authorized implementation, TestFlight update and both production submissions;
this does not replace actual build/consent/device evidence. Additional mock volumes remain deferred.

## Latest content direction — 2026-11-09 textbook replacement

Use the supplied Part 1–5 textbook as the sole runtime learning source. The approved
implementation replaces the old 60-lesson pack with 18 chapters / 216 sections and
268 chapter questions + 72 mixed questions. Integrate the separately supplied
SQLD_MockExam_20.html as 20 new exams / 1000 questions; neither the retired exam
questions nor the textbook HTML's embedded 50-question mock is used. Keep five native
tabs: Home / Textbook / Practice / Mock / Records. Timed mode is 90 minutes and study
mode is untimed; both reveal answers only after final submission. One active attempt
across modes; suppress ads across navigation while either mode is active.
Render all 37 educational widgets as native controls, never a WebView.

The owner chose automatic removal of content-linked progress, bookmarks, collections,
answers, reviews, practice sessions/results and exam attempts/snapshots on upgrade.
Keep settings, reminders and existing entitlements. Perform the purge transactionally,
including the previous SQLite slot, once; show the notice after success. Do not map old
answers onto new IDs. This purge applies only to phase1.20260908.1. Preserve all new
textbook learning data, preferences and grants on textbook.20261109.1 → .2. Never purge
the previous SQLite slot or snapshots during that compatible upgrade. Keep immutable
mock snapshots and all attempt history; review success must not rewrite exam scores.
Existing SQLD-M01..20 grants cover both modes, retakes and submitted explanations.

The 2026-10-04 content approval applies only to the retired pack hash. Do not transfer it
to the new textbook. Keep the original authored source, deterministic importer, integrity
checks and independent new-content release gate. Legacy content under tests/fixtures is
for regression and migration tests only and must not be imported by app entry points.
See docs/MOCK_EXAMS_20261109.md and qa/MOCK_EXAMS_20261109.md for the integrated
version; textbook replacement documents retain the preceding phase's evidence.

## Historical owner direction — 2026-10-04

The initial store release has ads off and all 20 mock exams free. The owner directly confirmed
completion of content review on 2026-10-04 and removed the requirement for separate reviewer,
completion-date, target-DBMS and official-syllabus evidence. Accept that owner confirmation for
the exact hash-verified content pack; do not invent missing verification facts. Preserve content
integrity checks, actual QA scope, explicit release authorization and the live-ad activation gate.

## Future advertising model — 2026-09-12

Use a low-maintenance free-learning + small-banner + opt-in rewarded-exam model.
Theory, confirmation questions and review remain free. Mock exams SQLD-M01 through SQLD-M04
are free. SQLD-M05 through SQLD-M20 unlock per exam after one earned rewarded-ad event and
remain accessible on that device without expiry or repeat-ad requirements. This supersedes
historical all-free/no-ad product statements, but is not permission to enable live ads without QA.
Read docs/MONETIZATION_20260912.md, docs/RELEASE_CHECKLIST.md and
qa/MONETIZATION_VERIFICATION.md before monetization or release work.

Default EXPO_PUBLIC_ADS_MODE is off. Internal testing must use official test ads, not live
impressions/clicks. Production content and advertising have independent approval gates.
Never fake reward success or bypass consent, content review, native QA or owner activation.
Grant only from EARNED_REWARD; CLOSED, clicks, installs and tracking permission are not rewards.
Preserve idempotent request/exam/mode-bound saves, existing-attempt migration and soft-reset grants.
Disclose that full deletion/reinstall/device change cannot restore local grants. Do not promise
process-death reward recovery without durable evidence or server verification.

Banners are small, separately padded home/MY slots only. No banners during onboarding, lessons,
practice, review, mocks, answer sheets, results, settings or support. Active timed exams suppress
ads across navigation. No interstitial, app-open, auto-rewarded, subscription or paid access.
AdMob automatic banner refresh must be disabled to match application request-rate limits.

## Content, data and engineering

Preserve supplied question stems, SQL, answers, rationales and provenance. Content release approval
uses the owner's direct review-completion confirmation and the exact content hash/version/scope.
Never fabricate verification facts, approval, affiliation or passing claims. The original gzip
content pack is tracked and hash-verified materialization is complete; integrity verification
alone does not constitute human content review.

Learning and grants are device-local SQLite. No learner backend, account, cloud sync, runtime AI,
remote learning analytics or payment is introduced. Google Ads/UMP may process device/network/ad
information when enabled; non-personalized ads do not mean no data processing. Never send learner
answers, progress, notes or identities for advertising. Never commit secrets or signing credentials.

Preserve immutable exam snapshots, ordered writes, restart recovery and one-time scoring.
Clock anomalies must not increase remaining time. Keep native React Native UI, not a WebView.
Run available type/unit/content/native/release checks and record their exact scope honestly.
Mocked SDK tests are not device/ad-serving evidence. Public submission and live ad activation
require actual builds, device/consent testing and owner authorization. Low maintenance is not
zero maintenance or a revenue guarantee.
