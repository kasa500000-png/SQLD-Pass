# SQLD Pass Git migration status — 2026-09-12 follow-up

Canonical repository: `kasa500000-png/SQLD-Pass` (separate from QueryPass and SpicPass).

## Completed source work

Standalone Expo/React Native app, SQLite, core learning/review/exam flow and opt-in rewarded-exam policy exist here.
Internal app identifier remains `com.sqldpass.app.internal`; learner DB remains `sqld_pass.sqlite`.
Added exact-hash import, structural/reference validation, atomic content replacement, 51 Node pipeline tests,
strict required-content CI and manual Android/iOS test-build workflow. Live ads and publication approvals remain off.

## Full content payload: NOT YET in Git

The local authored runtime was recovered from the attached Phase1 ZIP and byte-verified:
- 60 theory lessons; 120 confirmation questions; 20 mocks x 50 = 1,000 questions; 30 study days.
- Version: `phase1.20260908.1`.
- Raw bytes: 1,941,994.
- SHA-256: `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`.
- Original theory/mock/dataset hashes are pinned in `content-pack/content.lock.json` and were verified locally.

The prepared `content.json.gz` is supplied as a handoff file. It has not been directly uploaded to this Git repository.
The remote placeholder must remain visibly incomplete until that actual payload is committed.
Run `node scripts/import-content.cjs <content.json.gz>` and commit `content-pack/content.json.gz`.
The importer does not mark content reviewed and does not touch learner SQLite or ad grants.

## Validation and release blockers

Local: 51 new pipeline tests passed; full supplied runtime schema and hash passed.
Remote dependency-readiness run 34684197704 failed before steps/log creation. Exact cause not established.
No new lockfile, native APK/AAB/IPA, TestFlight, real ad playback or store submission was completed.
Independent content/target DBMS/official syllabus and device/policy approval remain pending.
See `docs/CONTENT_IMPORT_20260912.md` for commands, workflow boundaries and remaining actions.
