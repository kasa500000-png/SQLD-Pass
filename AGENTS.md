# SQLD Pass repository instructions

This repository is the canonical standalone source for the SQLD Pass Android/iOS app.
It is a separate product and codebase from QueryPass. Do not read, edit, merge into, or reuse
QueryPass or SpicPass as an implicit target unless the owner explicitly requests cross-project work.

## Latest owner direction — 2026-09-12

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

Preserve supplied question stems, SQL, answers, rationales and provenance. Original learning
content remains unapproved until the real human owner completes independent review, target-DBMS
checks and official syllabus comparison. Never fabricate approval, affiliation or passing claims.
Keep production gates closed while evidence is missing. The original gzip content pack is tracked
and hash-verified materialization is complete; this is not human content approval.

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
