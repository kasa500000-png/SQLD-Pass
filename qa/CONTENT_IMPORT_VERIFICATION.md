# Content import verification — 2026-09-12

Target: kasa500000-png/SQLD-Pass only. Baseline main b62292b3ea5c84b81fd3675c1deb50e6dff9a46d.

## Executed locally

- Node v22.16.0, no new npm dependency installed.
- 51 new content-import tests: 51 pass, 0 fail, 0 skipped.
- Actual supplied runtime: 60 lessons, 120 confirmation questions, 20 exams / 1000 exam questions, 30 days; structure and references passed.
- Runtime length 1941994; SHA-256 08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead.
- All three source hashes in the runtime manifest matched the supplied original theory, mock and dataset files.
- Exact existing remote release-gate.cjs was copied for an integration check (Git blob 260c1547ddf32f425b862ba9e3e670da6d78ffe4).
- assert-draft-blocked.cjs verified rejection specifically for missing content review, not arbitrary process failure.
- New workflow YAML parsed locally. Parsing is not a hosted runner or native build test.

## Remote execution

Dependency-readiness workflow run 34684197704 / commit d5350c4716d7a5bd34d5d7e8c4a4ac794252bfde: completed/failure.
Job 103528184100 had no steps and no downloadable logs. The exact runner-start failure cause was not established.
No dependency install or native compilation is claimed from this run.

## Not completed

Actual gzip payload not uploaded into Git. Prepared payload is in the downloadable handoff; remote placeholder remains.
No Expo/RN/ads SDK install or compatibility success, no generated reviewed lockfile, no APK/AAB/IPA or device/ad-serving test.
No new human content review, target DBMS execution, official syllabus verification, live ad activation or store submission.
Existing 66 monetization tests were not rerun in this isolated pipeline test; do not report 117 integrated passes.

This change improves import/build verification. It is not a completed release or revenue activation.
