# UI update production submission — 2026-11-10

The owner explicitly instructed: “실기기 검증 없이 양 스토어 정식 제출까지 바로 진행”. This overrides the additional physical-device verification requirement for this 0.3.2 update. It is not a claim that omitted tests passed. Existing physical Android, historical physical-iPad and current simulator evidence retain their documented scopes in UI_REFINEMENT_20261110.md and RELEASE_TEXTBOOK_20261109.md.

Unchanged textbook.20261109.2 content hash: 1f7a60245d9b75a19ad733dca7fc281539d73ebdc0fcfa25fd5a959ebd7d589d. UI screen PRs #24–36 and integration #37 are merged. 418 unit tests, native TypeScript, iPhone/iPad simulator flows and Android AAB static checks passed.

Target: Google Play production 0.3.2(18) and App Store 0.3.2(12), production ad IDs and rewarded mock access. Testing tracks are not used. The owner’s pending Alpha pause and previously authorized 16+ target-audience change are retained. Production release evidence and actual submission receipts follow; submission does not mean store approval or public availability.

## Verified release artifacts and console state

- Android signed AAB 0.3.2(18): SHA-256 `6e981f6b75d8ee1412e55788aa0303d5bd5ed4068d4f1c78a81a95f2a989e3fe`. Google Play production changes submitted for review, 100% rollout after approval, managed publishing disabled. Alpha pause and 16+ audience update included; no testing release created.
- iOS signed archive and export 0.3.2(12) succeeded; upload delivery `753ec483-1849-4e6d-bf60-f465e6e79449` accepted and processed VALID / APP_STORE_ELIGIBLE. Embedded config verified production/live/rewarded, no runtime analytics, no ATT usage description. Artifact checksum is in `evidence/release-ui-20261110/ios-artifact.json`.
- Fresh AdMob console: both SQLD apps Ready, ad serving enabled, two production units each. iOS app-ads.txt found and verified. Both banner units have automatic refresh disabled. No live impressions or clicks were generated for testing.
- Five new screenshots each for iPhone 6.5-inch and iPad 13-inch were uploaded, and Korean release notes updated. Existing iOS 0.3.0 review was canceled for replacement with 0.3.2(12); release type remains AFTER_APPROVAL.

No new physical-device or EEA consent test is claimed. Existing test scope and explicit owner waiver above are retained.

Final iOS production `npm run release:check` passed with the exact content hash and current owner waiver; this validates configuration/integrity and does not stand in for skipped device QA.

## Final submission receipts

- Google Play: production 0.3.2(18), changes in review, 100% release after approval. See `google-play-submission.json` and `play-submission.txt`.
- App Store: 0.3.2(12), WAITING_FOR_REVIEW, submitted 2026-11-10 01:46:04 UTC / 10:46:04 KST, release type AFTER_APPROVAL. Review submission `b7c04070-48c8-40ff-8638-63fa5db2fc80`; see `ios-review-submission.json`. A transient Apple HTTP 500 was resolved by checking state and retrying the pending submission; no duplicate submission was created.
- Both are submissions, not claims of approval or public availability. Temporary signing keychain removed and prior keychain search list restored.

## App Store 2.3.6 correction and resubmission

Apple rejected 0.3.2(12) on 2026-11-10 at 17:07 KST because the Age Assurance declaration did not match discoverable in-app functionality. App Information had Age Assurance Yes, Parental Controls No and Advertising Yes. Corrected Age Assurance to No and verified it after navigation/reload; Parental Controls No and Advertising Yes retained. The calculated global rating remains 4+.

Clarified review notes that optional advertising adult eligibility is self-declaration, not age verification. Sent the explanation to App Review at 19:16 KST. Resubmitted the unchanged production build 12 at 19:17 KST; browser confirmed both submission and version WAITING_FOR_REVIEW under the existing submission b7c04070-48c8-40ff-8638-63fa5db2fc80. AFTER_APPROVAL release retained. No binary, content, advertising configuration or device QA changes were made. Additional mock volumes remain deferred.

Evidence: `evidence/release-ui-20261110/ios-age-rating-resubmission.txt`. This supersedes the earlier initial-submission timestamp, not the artifact checksum.
