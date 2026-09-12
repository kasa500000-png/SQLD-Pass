# Authored content payload

Expected payload: `content-pack/content.json.gz`.

The lock identifies the supplied Phase 1 runtime, not an approval to release it.
Raw SHA-256: `08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead`.
Raw length: 1,941,994 bytes. Contains 60 lessons, 120 confirmation questions and 20 x 50 mock questions.

Use the gzip attached to the content-readiness handoff, or import the original Phase1 runtime JSON:

```bash
node scripts/import-content.cjs /path/to/generated/content.json
node scripts/check-content.cjs
```

Keep the actual gzip tracked in Git. A lock/README without the payload is intentionally not build-ready.
Do not replace missing learning data with synthetic test fixtures. Do not enable release or live ads to bypass migration.
Details and remaining blockers: `docs/CONTENT_IMPORT_20260912.md`.
