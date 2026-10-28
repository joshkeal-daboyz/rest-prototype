# 012 · Fuse load bar, and a fuse-management puzzle

owner: grid-simulator (A), renderer (B), interaction (C), puzzle-designer (D, after A)
status: review-passed
branch: ticket/012-fuse-load-bar

## Josh's words
"There should also be a 'health bar' for the load on the fuse. It will be useful for puzzles that require managing fuses properly. In fact, create a fuse management puzzle."

## Goal
Every fuse box shows how much of its rating is in use, live, so the player can balance load across fuses on purpose instead of finding out by blowing them. And a map that is *about* that balancing.

## Acceptance criteria
- [ ] **A (grid-simulator):** `GridState` gains `fuseLoad: ReadonlyMap<string, number>` — for every fusebox, the total load of lamps lit by the feed's own flow downstream of it (0 when unpowered or blown). It's the same number the blow check uses, so a bar at `rating` means "one more and it blows". Tested on an inline map and on battery-run (fb_east carries 1 after the win; 3 at the moment it blows). Add it to the ticket-002 interface block and SCHEMA.md.
- [ ] **B (renderer):** each fusebox draws a horizontal **load bar** under the box: filled to `fuseLoad / rating`, with tick marks per unit, green through amber to the alarm colour as it nears the rating; full means "at the limit". A fusebox with no rating shows no bar. A blown fuse shows the bar empty and broken. The bar must read without colour (fill length and ticks). Pure fill/colour mapping tested; no per-frame allocations.
- [ ] **C (interaction):** hover on a fusebox reads *Fuse ≤3 — carrying 2* (or *Fuse ≤3 — at the limit* when equal; *Fuse — carrying 2* when unrated). Tests.
- [ ] **D (puzzle-designer):** `puzzles/which-fuse.json` + note: the brief's element 5, **Which fuse** — three branches on fuses of different ratings (say ≤1, ≤2, ≤3), lamps of loads 1–3 that must be routed so every fuse holds and the targets light, with capacity tight enough that one branch must stay dark. The trap: the obvious route overloads a small fuse by exactly one. No silent dead ends: give enough spare fuses that a blow is recoverable, and say so in the note. Verified against the simulator (winning sequence; the obvious wrong route blows the expected fuse with the expected culprit; brute-force the switch/breaker settings and report how many win).

## Files
`src/grid/`, `src/render/`, `src/play/`, `puzzles/`, `puzzles/SCHEMA.md`

## Open questions
- Should the bar also show on the feed (load / capacity as a bar, not only text)? Cheap; Josh's call after seeing the fuse bars.
