# SQLD Pass repository instructions

This repository is the canonical standalone source for the SQLD Pass Android/iOS app.
It is a separate product and codebase from QueryPass. Do not read, edit, merge into, or reuse
QueryPass or SpicPass as an implicit target unless the owner explicitly requests cross-project work.

## Latest owner direction — 2026-11-13 curated60 extension

The owner confirmed all 20 exams/1,000 questions in supplied Vol.4 and approved
implementation of the new third-volume plan. Append internal SQLD-M61..80 / MEV4
as display volume3 / exams41..60 to the current curated40 pack. Preserve all retained
content, learning records, snapshots, pauses and grants. Never restore retired vol1.
Each volume's first5 exams remain free, including new display41..45; other45 exams
use earned rewards. Keep216 sections/340 practice unchanged. Use textbook.20261113.1
and mock-curated60.20261113.1; activate curated60 only in the integration PR.
Support direct older-textbook upgrades with the same transactional original-vol1
retirement; preserve both SQLite slots and immutable retained snapshots. Split content,
state/rights, catalog, records/review and integration/release into5 PRs. Implementation,
TestFlight and both production submissions remain authorized, but new exact-hash content
review confirmation and current native/consent evidence are required. The0.5.0 iOS
exception does not carry forward. See docs/MOCK_CURATED60_20261113.md.

The owner directly confirmed “새 3권 내용 검수 완료” for textbook.20261113.1,
SHA-256 61316063d2112c7b5cd25773a662a61b9037925e375073131c094d2522ca9fd5.
The owner can connect Android only for this run. Current Android physical evidence and
iOS simulator evidence must remain separate. Prior release execution authorization persists.

### Scoped owner exception — iOS 0.6.0(17), 2026-11-13

After the physical iPad blocker and Android production submission were reported,
the owner explicitly instructed “이번에도 예외 진행”. For this curated60 candidate
only, proceed with TestFlight and App Store submission without additional physical
iPad or consent reruns. Record these checks as unperformed; keep current iOS simulator
and Android physical evidence separate. This is a new exception, not reuse of0.5.0.
Preserve actual archive/export/upload validation, exact content approval, runtime
consent, earned-reward and signing gates. Future candidates require their own evidence.

## Latest owner direction — 2026-11-12 curated40 and study review

The owner approved docs/MOCK40_20261112.md and requested implementation. Remove original
volume1 AND its attempts, active attempts, saved/review/note/collection references and
grants, transactionally across both SQLite slots and matching snapshots. Preserve all
other learning data and immutable snapshots. Retain internal SQLD-M21..60 / MEV2 / MEV3
identities; display old volumes2/3 as new volumes1/2 and exams1..40. Each volume's first
five exams are free (internal21..25 and41..45); remaining30 use earned rewards. Do not
transfer retired grants. Keep216 sections/340 practice questions unchanged. Show one
question with its full prompt/options before its explanation, no extra reveal button.
Distinguish selection groups from navigation. Activate the curated pack only in the
integration PR. The owner confirmed “해당 40회 구성의 콘텐츠 검수·출시 확인 완료” for textbook.20261112.2,
SHA-25648e1214183bb4123a218a46bbce1362933778e34914cd79a7485d06d233be9b3.
Current native/consent evidence is still required;
the0.4.0 iOS waiver does not carry forward. Prior release execution authorization persists.

### Scoped owner exception — iOS 0.5.0(16), 2026-11-12

After the current iPad blocker and Android production submission were reported,
the owner instructed “검증 생략 예외로 ios도 정식 심사 및 testflight 업데이트 반영”.
For this 40-exam candidate only, proceed with TestFlight and App Store submission
without additional physical iPad or consent reruns. Record them as unperformed;
keep current iOS simulator EEA/UI/reward and Android physical evidence separate.
This is a new explicit exception, not reuse of prior waivers. Preserve actual
archive/export/upload validation, approved content hash, runtime consent,
earned-reward and signing gates. Future candidates require their own evidence.

## Historical direction — 2026-11-12 mock volumes 2 and 3

The owner reactivated the deferred additional-volume plan and requested implementation.
The runtime pack is textbook.20261112.1: 216 sections, 340 practice questions and
60 mock exams / 3,000 mock questions. Preserve the original textbook and exams 1–20
byte-for-byte; use volume-scoped IDs for new content. Compatible textbook upgrades
preserve all learning records, immutable snapshots, pauses and grants, including the
previous SQLite slot. Historical launch-free/legacy grants cover only exams 1–20;
new exams 21–60 require one earned reward per exam, shared across modes and retakes.
Use volume tabs, a combined filter dialog and independent record/review/saved filters.
The owner directly confirmed “새 2·3권 내용 검수 완료” for SHA-256
ef14277859237b0a08f5f8b0857e37ff26587cdc0aff6b5d21527787870a1db3.
This supersedes the deferral below, without reusing older content or device waivers.
Implementation, TestFlight and both production submissions remain authorized.
Current physical validation is on the connected Android at the owner's direction;
do not describe iOS simulator evidence as physical iPad validation.

### Scoped owner exception — iOS 0.4.0(15), 2026-11-12

After the remaining iPad/consent validation and submission status were reported,
the owner explicitly instructed “ios도 별도 검증 생략 후 진행”. For this candidate
only, proceed with TestFlight and App Store submission without additional physical
iPad or consent reruns. Record them as unperformed and keep current simulator and
Android evidence separate. This is a new scoped exception, not reuse of the older
waivers. Preserve actual archive/export/upload validation, exact content approval,
runtime consent, earned-reward and signing gates. Future versions remain subject
to the normal validation requirements.

## Latest owner direction — 2026-11-11 interruption and UI refinement

The owner approved implementation of the2026-11-12 volume expansion plan. Add volumes2–3
as exams21–60, preserving the existing20 exams,216 sections and340 practice questions.
Use volume tabs and one filter dialog; do not add next-exam recommendations. Preserve
all textbook-era data, pause state and grants. Historical free access covers only1–20;
new21–60 require earned rewarded events. Activate the60-exam pack only in the final
integration PR. New content approval and current native/consent evidence are required;
the0.3.3/0.3.4 exceptions do not carry forward to0.4.0.

Timed mocks have 90 minutes of active solving time. Explicit pause, saved exit, and
background/inactive interruptions freeze the remaining time; returning requires explicit
resume. Paused attempts stay active for one-attempt, explanation and advertising gates.
Persist answers, position, flags and pause metadata in the existing ordered transaction.
Never label an unsuccessful save as saved, refund elapsed time, or rewrite old scores.
Unpaused recovery conservatively accounts for unverifiable elapsed time before pausing.
Show pause usage on results; missing historic metadata is not evidence of no interruptions.
Use the 2026-11-11 UI refinement document for current screen hierarchy and tokens.
The owner authorized implementation, TestFlight update and both production submissions;
this does not replace actual build/consent/device evidence. The volume deferral is superseded by the2026-11-12 implementation direction above.

### Scoped owner exception — iOS 0.3.3(13), 2026-11-11

After the iPad connection blocker was reported, the owner explicitly instructed:
“검증없이 앱스토어 정식 출시 진행, testflight도 업데이트”. For this candidate only,
proceed with TestFlight and App Store submission without additional physical-device or
consent reruns. Record the unperformed checks and existing evidence separately; do not
claim they passed. Preserve runtime consent, earned-reward, content and signing gates.
This exception does not authorize skipping validation for future versions.

### Scoped owner exception — iOS 0.3.4(14), 2026-11-11

After the locked-iPad blocker and the incomplete TestFlight/submission status were
reported, the owner explicitly instructed: “이번에도 예외로 진행”. For0.3.4(14)
only, proceed with TestFlight and App Store submission without additional physical
iPad or consent reruns. Record the unsuccessful runner launch and unperformed
checks honestly. Preserve actual archive/export/upload validation, content approval,
runtime consent, earned-reward and signing gates. This exception does not apply to
future versions.

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
