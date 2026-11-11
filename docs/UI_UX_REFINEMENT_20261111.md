# SQLD Pass UI·UX refinement — 2026-11-11

The owner approved the whole-app improvement plan, frozen-time pause (including
background interruptions), TestFlight update and both production submissions.
This direction supersedes prior instructions that timed exit continues the clock.
Additional exam volumes 21–60 remain deferred. Content identities, authored text,
scoring, immutable snapshots, local grants and existing privacy policy are unchanged.

## Interruption contract

- Both modes remain `active` while paused: one active attempt, no advertising across
  navigation, no same-exam explanations before submission, no additional ad charge.
- Timed mode allows 90 minutes of active solving; study mode has no time limit.
- Explicit pause/back, iOS inactive/background and Android background/blur request an
  ordered durable pause. Returning requires explicit resume. Pause hides questions.
- Optional `pausedAt`/`pauseCount` extend existing records without a content migration.
  Historic submitted records stay unchanged; absence does not prove no interruptions.
- Save failure retains the pause intent in memory and blocks resume/exit/submission.
  Retry uses the same captured checkpoint. A failed write is never called saved.
- Already queued answers bind to the displayed question and precede pause persistence.
  Expiry wins if time was already exhausted; submission remains idempotent.
- On unpaused crash/restart, conservative existing clock accounting runs before pause;
  unknown elapsed intervals are not refunded. A persisted pause survives restart.
- Pausing does not rewrite scores. Pause count is disclosed in results and history;
  existing per-exam latest-result aggregates keep their current definition.

## Visual contract

Keep five tabs, Pretendard, blue primary actions and neutral reading surfaces. Separate
question prompt, supplied material and answer choices. Use regular-weight choices,
explicit selected/submitted/answer feedback, and fixed exam controls. Body 17/28,
prompt 18/29 semibold, choices 16/26 regular; retain system/app text scaling. Reading
measure is capped at 720 layout units. State text must reach 4.5:1 in both appearances.
Learning content and finite widget transitions are never edited to solve layout issues.

Screen-by-screen treatment and executed QA are recorded separately from these decisions.
An implemented state or mocked SDK test is not native/device/ad-serving evidence.
