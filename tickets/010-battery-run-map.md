# 010 · Map: Battery run

owner: puzzle-designer
status: open (awaiting G1)
branch: ticket/010-battery-run
depends on: 008 (to verify with the simulator)

## Goal
The first map built around the battery: a section the feed can't reach holds two relay switches that must be set to route power to the target. The player charges the battery, releases it, and has its `capacity` seconds to throw both relays before it goes flat; then the feed, re-routed through the now-set switches, lights the target for good.

## Acceptance criteria
- [ ] `puzzles/battery-run.json` + `puzzles/battery-run.md` in the standard shape, with **The trap** (e.g. releasing before the battery is full leaves too little time; or the relays must be thrown in an order that doesn't cut the battery's own path).
- [ ] Verified against the simulator: the intended sequence completes; releasing at low charge does not.
- [ ] Capacity tuned so the window is tight but fair for a first-time player (start at 8 s; Josh tunes).

## Open questions
- Whether the battery should be recharged and used twice in one map is a later puzzle.
