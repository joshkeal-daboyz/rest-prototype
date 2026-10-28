# 006 · Prompt follows the pointer; counted-lit from the grid

owner: interaction (part A), grid-simulator (part B), ui (part C, after A and B)
status: open
branch: ticket/006-prompt-at-pointer

## Goal
The prompt (*Throw breaker*, *Needs: wire × 2*) appears beside the thing under the pointer instead of fixed at the bottom of the screen, and the UI stops re-deriving the "lit and not browned out" rule.

## Why
Found in ticket 005: `MapPlay.view()` exposes no pointer position, so the UI could not place the prompt without handling input itself (which its rules forbid). And `targetRows` in `src/ui/logic.ts` computes `lit && !brownout`, a GDD rule that belongs in the simulator.

## Acceptance criteria
- [ ] **A (interaction):** `view()` gains `pointer: { x: number; y: number } | null` in CSS pixels relative to the canvas, updated on pointer move, null on leave. (test)
- [ ] **B (grid-simulator):** `GridState` gains `countedLit: ReadonlySet<string>` = `lit` when not browned out, empty otherwise. Documented in ticket 002's interface block and `puzzles/SCHEMA.md`. (test)
- [ ] **C (ui):** the prompt is positioned at `pointer` with an offset and stays on screen at the edges; `targetRows` reads `countedLit`. (test for the clamp; Josh checks placement)

## Files
`src/play/`, `src/grid/`, `src/ui/`

## Open questions
none
