---
name: sqld-pass-design
description: Apply the SQLD Pass native app design reference when changing its screens, components, or design tokens. Use only in the SQLD-Pass repository.
---

# SQLD Pass design

For the approved0.6.0 extension, follow docs/MOCK_CURATED60_20261113.md and the
2026-11-13 design-reference section. OriginalVol.4 is displayed as3권/41~60회.
Use two-line volume/range labels with the existing accessible selection style; keep
record/review/source filters independent. Do not restore retired originalVol.1.

The 2026-11-12 curated40 plan in `docs/MOCK40_20261112.md` and the current0.5.0
section of the design reference supersede earlier counts and collapsed-original reviews.
Use explicit selection groups for tabs/quantity/mode filters, keep navigation distinct,
and show the whole submitted question before its solution. Display numbers never replace
authored IDs or immutable retained snapshots; each volume's first5 exams are free.

Read `docs/UI_DESIGN_REFERENCE.md` for the current visual system and screen mapping. Use the semantic palette in `src/ui/nodes.ts` and shared node renderer in `src/platform/NativeView.tsx`; preserve native controls, safe areas, dynamic text scaling and accessible labels. Match the reference hierarchy while binding every count and state to actual local data. Consult `AGENTS.md` before changing exam, content or advertising behavior. Test the affected journeys and document actual device coverage; HTML prototype data and mocked SDKs are not release evidence.

The 2026-11-09 textbook direction in `docs/UI_DESIGN_REFERENCE.md` supersedes the old prototype navigation. Use `src/textbook/views.ts` for current content screens and retain shared native rendering. The integrated 20-exam flow in `src/mocks/views.ts` adds the fifth 실전 tab, timed/study modes, results and review. Read `docs/MOCK_EXAMS_20261109.md` for current behavior. Do not restore retired 30-day/60-lesson text. Show ad-access claims only when they match the current policy, and suppress banners during either active exam mode.

For the approved 2026-11-09 UX refinement, distinguish navigation rows, primary actions,
answer choices, and destructive actions. Active mock/sheet screens temporarily replace
normal tabs with focused exam navigation and explicit saved exit. Keep timer/status and
navigation outside the scrollable question; separate result summary from explanations.
Use `qa/IOS_UI_UX_REVIEW_20261109.md` for rationale and preserve all content/score gates.
