---
name: sqld-pass-design
description: Apply the SQLD Pass native app design reference when changing its screens, components, or design tokens. Use only in the SQLD-Pass repository.
---

# SQLD Pass design

Read `docs/UI_DESIGN_REFERENCE.md` for the current visual system and screen mapping. Use the semantic palette in `src/ui/nodes.ts` and shared node renderer in `src/platform/NativeView.tsx`; preserve native controls, safe areas, dynamic text scaling and accessible labels. Match the reference hierarchy while binding every count and state to actual local data. Consult `AGENTS.md` before changing exam, content or advertising behavior. Test the affected journeys and document actual device coverage; HTML prototype data and mocked SDKs are not release evidence.

The 2026-11-09 textbook direction in `docs/UI_DESIGN_REFERENCE.md` supersedes the old prototype navigation. Use `src/textbook/views.ts` for current content screens and retain shared native rendering. The integrated 20-exam flow in `src/mocks/views.ts` adds the fifth 실전 tab, timed/study modes, results and review. Read `docs/MOCK_EXAMS_20261109.md` for current behavior. Do not restore retired 30-day/60-lesson text. Show ad-access claims only when they match the current policy, and suppress banners during either active exam mode.
