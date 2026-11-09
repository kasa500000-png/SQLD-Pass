# SQLD Pass UI reference

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
