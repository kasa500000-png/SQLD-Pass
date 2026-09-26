# Learning UI simplification — 2026-09-20

## Scope

- Home shows the next lesson title and continuation action. Removed introductory copy, duplicated review/read-count cards and the read-status explanation. The review shortcut appears only when questions are due; review remains reachable from Learning.
- Learning opens directly to search, subject filters and lessons. Removed repeated headings, offline/content counts and instructions explaining progress labels.
- Review counts appear in filters; removed duplicate count cards and introductory instructions. Start labels show the actual batch size (up to 10).
- Practice retains explicit answer submission and the uncertainty toggle, without repeated instructions. Question metadata and error reporting remain available in expandable details.
- The study plan no longer repeats progress instructions on every day. Records show compact empty states and expandable calculation criteria when answers exist.
- Retained authored lessons, objectives, SQL, questions, rationales, provenance, timer/submission warnings, advertising disclosures and destructive-action warnings. No controller, storage, scoring or access-policy changes.

## Automated verification

- `npm test`: 171/171 passed, including error-report reachability through collapsed question information and access to empty review from Learning.
- `npm run typecheck:native`: passed.
- Existing authored-content identity and all lesson/question rendering tests passed.

## Delivery boundary

This change does not itself update Google Play or App Store. Native build and smoke-test results are recorded below after execution. iOS device verification is not included.

## Android smoke verification

- `:app:assembleRelease`: passed in 2m 18s (internal environment, ads off).
- Updated `com.sqldpass.app.internal` on `emulator-5562` using `adb install -r`; no data clear. Existing state had no completed lessons or submitted exams, so this is not a populated-data migration test.
- Captured native home, learning, empty review and empty records screens at 750×1600 / density 320. Confirmed tab navigation and readable visible controls. Learning shows three complete lesson cards on its first screen.
- Evidence: `.build/android-qa/cleanup-{home,learning,review,records}.png` and corresponding XML trees. Build/test logs: `.build/learning-cleanup-{build,tests}.log`.
- Error-report disclosure is covered by automated interaction testing; no native answered-question, tablet or iOS flow was rerun for this copy cleanup.
