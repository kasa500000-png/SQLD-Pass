# SQLD Pass repository instructions

This repository is the canonical standalone source for the SQLD Pass Android/iOS app.
It is a separate product and codebase from QueryPass. Do not read, edit, merge into, or reuse
QueryPass as an implicit target unless the owner explicitly asks for cross-project work.

Read README.md and docs/RELEASE_CHECKLIST.md before release-related changes.
Preserve supplied question stems, SQL, answers, rationales and provenance. Original learning
content remains unapproved until the real human owner completes independent content review,
target-DBMS checks and official syllabus comparison. Never invent approval evidence, affiliation,
expert review, passing probability or rights clearance. Keep production gates closed while evidence
is missing.

Learning data is device-local SQLite. No learner account, cloud sync, runtime AI, remote analytics,
payment or advertising is enabled in phase 1. Do not add secrets, signing credentials, service-role
keys or developer passwords to the repository. Do not replace native React Native UI with a WebView.

Exam attempts preserve immutable question snapshots, ordered writes and restart recovery. A mock
exam is scored once; submitted attempts are never silently re-scored against a newer content pack.
Clock anomalies must not increase remaining time. Retryable operations should remain idempotent.

Run available type, unit, content, native and release checks and record failures honestly. Browser
checks are not native-device evidence. Android/iOS public submission requires actual build/device QA
and owner authorization.
