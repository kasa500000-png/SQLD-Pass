# SQLD Pass Git migration status

Canonical repository: `kasa500000-png/SQLD-Pass`

## Completed
- SQLD Pass is now treated as an independent repository and product.
- Expo/React Native app entry, Android/iOS config, EAS profiles, core domain/controller, UI renderer and SQLite adapter are stored here.
- Default internal app identifier: `com.sqldpass.app.internal`.
- Local learner database: `sqld_pass.sqlite`.
- QueryPass is not a build dependency, workspace dependency, database source, package ID, or release target.
- Production release remains gated until real content/device/policy approval evidence exists.

## Content pack handoff
The full authored Phase 1 content is versioned separately from source code during this migration. The repository currently contains a safe placeholder at `generated/content.json` so an incomplete migration cannot masquerade as a working learning build.

Expected approved migration input:
- 60 theory lessons
- 120 lesson check questions
- 20 mock exams × 50 = 1,000 mock questions
- total question objects: 1,120
- manifest version: `phase1.20260908.1`

Known source hashes from the authored content package:
- theory `content_pack.json`: `778cea8c8f19877f42d018b2226021aaf5172e8c653daa041c4f625c17758792`
- mock `mock_exam_pack.json`: `eb9acfae7b12e98bfce50b93ffce2524c68af3a18234fb67a3fa57c5cfed03ee`
- dataset `dataset.json`: `b73bf8e221c35a27dd28b8f9a69dff41e59095d6c993957145950789f8161e1a`

Place the generated gzip content pack at `content-pack/content.json.gz` and run `npm run content:materialize`. `npm run content:check` must then pass before native QA.

## Not claimed complete
- Full authored content pack has not yet been checked into this Git repository.
- Android APK/AAB and iOS IPA/TestFlight builds are not verified by this migration.
- Human content approval, target DBMS verification, official syllabus verification and store policy evidence are still pending.

This document deliberately distinguishes Git project separation from store-ready release completion.
