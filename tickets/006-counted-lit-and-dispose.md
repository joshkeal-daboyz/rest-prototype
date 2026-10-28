# 006 · Counted-lit from the grid; dispose a play session; log ignored clicks

owner: grid-simulator (part A), interaction (part B), ui (part C, after A)
status: open
branch: ticket/006-counted-lit

## Goal
The UI stops re-deriving "lit and not browned out"; a `MapPlay` can be thrown away cleanly when the map changes; the playtest log shows clicks the player made that did nothing.

## Why
From reviews 004 and 005: `targetRows` in `src/ui/logic.ts` restates a Draft rule that belongs in the simulator; `createMapPlay` subscribes to `job:completed` and never unsubscribes, while `main.ts` rebuilds the stack on every map change; and clicks on unreadable faults or inert elements aren't logged, though "did Josh click a fault he couldn't read yet" is one of the things the prototype is meant to learn.

## Acceptance criteria
- [ ] **A (grid-simulator):** `GridState` gains `countedLit: ReadonlySet<string>` = `lit` when not browned out, empty otherwise. Add it to ticket 002's interface block and to `puzzles/SCHEMA.md` (which also gets the sentence "an absent or empty `target` means every lamp"). (test)
- [ ] **B (interaction):** `MapPlay` gains `dispose()` that removes its bus subscription and detaches listeners; `main.ts` calls it on map change. The session log gains a `click-ignored` entry with the id and why (`unreadable` | `inert` | `relight`). (test)
- [ ] **C (ui):** `targetRows` reads `countedLit`; no `brownout` logic remains in `src/ui/`. (test)

## Files
`src/grid/`, `src/play/`, `src/ui/`, `src/main.ts` (the one `dispose()` call), `puzzles/SCHEMA.md`

- [ ] **D (ui/interaction):** after `job:completed`, a battery that is still released keeps showing its countdown (time stops during the Relight). Hide the countdown once the job is complete, or let `tick` keep advancing batteries after the win. Seen in the browser on battery-run, 27 Oct 2026.
- [ ] **E (interaction, from review 009 B):** drop the never-true `stopped` field on the log's `battery-flat` entry; add tests for no advance during the Relight, an empty release logged `ok: false`, and game time across Reset.

## Open questions
- Reset during the Relight (review 004): should Reset be refused until the Relight finishes? Josh decides after playing.
- *Needs: wire × 2*: show the required count (as now) or the missing count? Josh decides after playing.
