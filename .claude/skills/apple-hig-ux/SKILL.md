---
name: apple-hig-ux
description: "Design user flows and screen states following Apple Human Interface Guidelines principles (clarity, deference, feedback, progressive disclosure). Use when defining navigation, flows, empty/loading/error states or copy."
user-invocable: false
---
# Apple HIG-based UX

## Primary flow
Library → **Page** (pick or create: name, module) → **Baseline** (drop a PNG or load a sample) → **Candidate** (drop a PNG) → **Compare** → **Review** (views, regions, ignore zones) → **Save run** (evidence fields) → History.

## Principles
- **Clarity:** one primary action per screen ("Compare"). Plain words: "3 changes found", not "contours: 3".
- **Deference:** the screenshots are the hero, and the chrome stays out of the way.
- **Feedback:** every async step shows progress in the status pill and an `aria-live` region.
- **Progressive disclosure:** thresholds and kernel size go under "Advanced", and the defaults just work.
- **Forgiveness:** confirm destructive actions (delete page, reset), and offer undo where it's cheap.

## Required states (each screen)
Empty (with "Load a sample"), Loading OpenCV, Ready, Working (step name), Result PASS, Result FAIL, Error (with Retry and Reset app data), Offline (still works).

## Copy rules
- Status: "PASS — no unexpected changes" / "FAIL — 3 changed regions (0.8% of page)".
- Always state the limit: "Visual check only; not a replacement for functional or security testing."
