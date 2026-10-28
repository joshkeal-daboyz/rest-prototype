# 007 · Leave room for the HUD

owner: renderer (part A), ui (part B)
status: open
branch: ticket/007-hud-clearance

## Goal
Nothing on the map hides under the overlay, and the win banner doesn't cover a button.

## Why
Seen in the browser on the shrine circuit (27 Oct 2026): the floodlight at the top right sits under the parts chips, and the win banner overlaps the Undo button at a 800 px width.

## Acceptance criteria
- [ ] **A (renderer):** `createMapRenderer` accepts optional insets (`{ top, right, bottom, left }` in CSS px) that the fit respects; `main.ts` passes the HUD's measured height for `top`. (test: fit keeps every node below `top`)
- [ ] **B (ui):** the win banner sits below the HUD row (or the HUD row collapses while the banner shows); no overlap at 800 px and 1280 px. (Josh checks)

## Files
`src/render/geometry.ts`, `src/render/map-renderer.ts`, `src/ui/index.ts`, `index.html`, `src/main.ts` (one argument)

## Open questions
none
