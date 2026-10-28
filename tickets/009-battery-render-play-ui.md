# 009 · Battery and relays on screen

owner: renderer (part A), interaction (part B), ui (part C)
status: review-passed
branch: ticket/009-battery-screen
depends on: 008

## Goal
The player sees the battery's charge filling and draining, knows a relay switch is stuck until powered, and feels the clock while the battery runs.

## Acceptance criteria
- [ ] **A (renderer):** a battery node drawn as a cell with a charge bar (`charge / capacity`), a distinct look when released (bar draining, its far-side lines pulsing from the battery), and a pop when it goes flat. A relay switch carries a second tribe mark and is drawn dim/stuck when unpowered. Pure parts tested; Josh checks the look.
- [ ] **B (interaction):** `play.tick(dt)` calls `grid.advance(dt)`. Click a battery → `grid.release`; prompts *Charge: 7 / 10 — Release* / *Running: 4 s left — Stop*. A stuck relay's prompt is *No power — relay stuck*. The log records release/stop/flat with game time. (test for prompts and log)
- [ ] **C (ui):** while any battery is released, a countdown shows its seconds left beside the capacity readout. (test for the text)

## Files
`src/render/`, `src/play/`, `src/ui/`

## Open questions
none
