# SQLD Pass UI reference

## 0.6.0 third-volume extension — 2026-11-13

Append original Vol.4 as display3권/41~60회; keep current content and interaction rules.
Catalog selectors use two lines (volume then range), equal cells, selected underline,
48-unit targets and accessible full labels. Three cells wrap to two/one columns when
large text needs room; no horizontal gesture is required for primary navigation.
Records/review/source filters use the same catalog metadata. Preserve direct submitted
question→options→answer→explanation, original IDs and immutable snapshots. Each volume
has five free exams, including new41~45. Runtime activation is integration-only.

## Current 0.5.0 refinement — 2026-11-12

The owner-approved [40-exam plan](MOCK40_20261112.md) supersedes prior catalog counts
and explanation-first disclosures. Display original volumes2/3 as1/2, exams1–40,
with five free exams per volume. Preserve authored identities and retained snapshots.
Read each submitted question in prompt → material → options → own/correct answer →
explanation order without an original-question reveal button. Keep one-question navigation.

Use explicit `selectionGroup` for selectors, not action groups. Volume tabs have an
underlined selected state; quantity/mode/filter selections use a border and check mark.
Use15/22 text,48-unit targets, ink for unselected text, and blue/600 for selected text.
`controlBorder` is #7C889C light / #73839B dark, meeting3:1 against their surfaces.
Do not add filled-blue backgrounds to whole tab groups. Retain muted metadata, neutral
navigation rows, large text wrapping, and existing question/body typography.

The owner-provided [SQLD_Pass_UI_Reference.html](design/SQLD_Pass_UI_Reference.html) (2026-11-02, 54 interactive screen states) is the visual source of truth for SQLD Pass. The HTML is a prototype: its sample lessons, dates, progress, scores and ad interactions are illustrative and must never replace actual app data or release policies.

The [screen mapping](design/REFERENCE_SCREEN_MAPPING.md) records how all prototype states correspond to real native screens and where SDK-owned or unavailable prototype behavior differs.

## Current learning structure — 2026-11-09

The textbook replacement supersedes the prototype's 30-day / 60-lesson / 20-mock
navigation and sample metrics. Use native Home / Textbook / Practice / Mock / Records tabs,
Part → Chapter → Section, separate read/attempted/latest-answer metrics, native
text/table/SQL/callout/disclosure/flow blocks and all 37 native interactive tools.
Daily assignments are persisted per local calendar day; no fabricated reading durations.
The separately supplied 20-exam pack uses `src/mocks/views.ts` within this same native
layout. Both modes reveal solutions only after final submission. Include answer sheets,
result tables, choice rationales, wrong-answer review, saved questions and local notes.
Keep timed/study statistics separate from the 340 practice-question metrics.
Keep the palette, typography, safe areas, dynamic scaling and accessibility standards below.
The approved update clears content-linked learning records once, preserving preferences,
reminders and entitlements; historical preservation guidance below is superseded only for the retired phase1 pack.
The compatible textbook .1 → .2 update preserves all textbook state and grants.

## Visual language

- Pretendard; compact, strong headings and legible Korean body text. Preserve the user's app and system text scales.
- Light: blue `#2457D6`, blue tint `#EDF3FF`, ink `#172033`, muted `#64718A`, border `#E6EAF1`, surface `#FFFFFF`, canvas `#F6F8FC`.
- Dark: blue `#89AAFF`, blue tint `#253859`, ink `#E8EDF7`, muted `#9BAAC1`, border `#29374C`, surface `#182337`, canvas `#101A2B`.
- Success `#16836B`, warning `#A96512`, danger `#C34750` in light mode; use the corresponding semantic dark values from `src/ui/nodes.ts`. The palette in that file is authoritative for code.
- White or dark-surface navigation, an understated SQLD PASS overline, five persistent tabs (홈 / 교재 / 문제 / 실전 / 기록), generous canvas spacing, 20-point cards and 14-point primary buttons. Inputs, controls and tappable rows have at least 48-point targets.
- Show today’s assigned sections, separate learning metrics, and textbook/review shortcuts. Give study mode, questions, exam progress, feedback and saved records their own distinct hierarchy. Use the actual data and existing app navigation rather than the prototype's example state.
- Apply the same semantic components to onboarding, lesson, practice, review, mock exams, results, settings, privacy, errors and reward flows. Both active exam modes remain free of banners; home and records are the only permitted banner slots when separately activated.
- Preserve the released 학습서재 and weekly-goal journeys within this visual system. Collections and goal values come from local state; saved mock explanations open only the corresponding submitted attempt snapshot. Do not substitute prototype data or discard unknown saved entries.
- Adapt to width, split-screen, safe areas and large text. Keep reading widths bounded and avoid requiring a horizontal gesture for primary navigation. SQL and wide data tables may scroll horizontally.

## Engineering and review

`src/ui/nodes.ts` owns semantic color tokens; `src/ui/learning-polish.ts` shapes the shared screen tree, while `src/platform/NativeView.tsx` renders real React Native controls. `DateField`, `ReminderSettings`, and `StudyReadables` are native specialized components. Content, SQLite, exam state, grants, consent and release gates are not design tokens and must remain authoritative. Accessibility and data accuracy take precedence when a pixel-perfect interpretation would conflict.

Before a store release, compare representative light/dark and small/large text screens on real devices, including initial, populated, empty, error and active-exam states. Record what was actually tested; automated tests and a browser prototype do not establish native device quality or ad-serving readiness.

## Native UX refinement — 2026-11-09

The owner authorized implementation of the simulator review recommendations in
`qa/IOS_UI_UX_REVIEW_20261109.md`. Preserve authored learning content and state contracts.
Use distinct primary actions, secondary actions, left-aligned navigation rows, answer
choices and destructive actions. Submitted practice answers show correct/incorrect text
and semantic feedback; active mocks must never disclose scoring or explanations.

Keep five tabs in normal navigation. Active exam and answer-sheet screens use a focused
layout with explicit saved exit, a fixed timer/status header and fixed navigation outside
the question scroller. Timed exit does not pause the clock. Result summaries open separate
explanation views with fixed previous/next controls and an accessible question picker.
Intro start, settings save and lesson/practice follow-up actions remain outside long content.

For the 2026-11-10 rewarded-exam flow, show the reward and adult eligibility beside each
locked exam's explicit `광고 1회 보고 회차 열기` button. One tap starts the consent/ad flow
without a separate confirmation modal. Keep an `광고·저장 안내` navigation action, free
and unlocked access, and the earned-event-only save. Successful completion opens the
exam introduction; it must not start a timed attempt automatically.

Home and catalog groups adapt to two columns only with sufficient available width and
manageable text scale; body reading widths remain bounded. Empty states explain the next
action. Settings save returns to its caller; initial setup returns home. Short practice
batches and unknown-card filters do not alter authored questions or historic scores.

## Production Android review refinement — 2026-11-10

The owner approved qa/ANDROID_PRODUCTION_UI_REVIEW_20261110.md. Use quiet neutral rows,
19sp/600 section titles and 16sp/400 reading text; reserve filled blue for primary actions.
Compact segmented controls must fit short labels at 360dp rather than blindly stacking.
Keep 48dp targets and wrapping at large text. Tab widths remain equal.
Source content, immutable scores, grants, earned-event and consent gates remain unchanged.

## Current UI refinement — 2026-11-11

The owner-approved interruption and readability plan in
[UI_UX_REFINEMENT_20261111.md](UI_UX_REFINEMENT_20261111.md) supersedes the earlier
timed-exit behavior: explicit/background pause saves remaining time and requires explicit
resume. Keep paused attempts active for advertising, access and explanation gates.

Use `learningType`, `learningSpace`, `learningRadius` and the semantic palette from
`src/ui/nodes.ts`. Status text has separate contrast-safe greenText/redText/orangeText
roles. Choices are regular-weight with a separate number; primary actions use semibold.
Navigation rows use neutral surfaces and separators. Reading widths are bounded at 720
layout units, including exam questions. Modal transitions have no animation and support
accessibility escape. Do not reintroduce heavy option text through generic button styles.

## 0.3.4 Android audit follow-up — 2026-11-11

The owner authorized the task-separated implementation in
[UI_FOCUS_034_20261111.md](UI_FOCUS_034_20261111.md), followed by both production releases.
Prefer question, reading and explanation space over repeated controls and metadata.
The 0.3.4 document refines hierarchy while preserving the current pause, content,
record, consent and earned-reward contracts. The iOS 0.3.3 device waiver is not reused.
