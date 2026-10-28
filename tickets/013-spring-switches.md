# 013 · Spring switches, and no blind re-blows

owner: grid-simulator (A), renderer (B), interaction (C), puzzle-designer (D, after A)
status: open (awaiting G1)
branch: ticket/013-spring-switches

## Josh's words
On which-fuse, after blowing `fb_1` with the shrine on it: "You cannot fix the fuse, it just blows every time you fix the fuse. Some switches should switch back when the power is not on."

## What went wrong
`sw_1` was left pointing at the shrine (load 2). Each new fuse fitted to the ≤1 box carried 2 and blew at once, costing the fuse. The recovery (throw the switch back, then repair) was in the design note but nowhere in the game. That is a dead end the player can't read: the rule from battery-run again.

## The mechanic, as cut
- **Spring switch** (`"spring": true` on a switch): a switch that returns to its file `selected` position whenever it loses power — that is, after any settle in which no current reaches it (a blown fuse upstream, an open breaker, a battery going flat). It stays thrown only while powered. The tribe marks it with a coiled ribbon. A relay can also be a spring switch (both flags).
- **No blind re-blows:** when the player hovers a readable blown fuse and fitting a fuse would blow it again at once, the prompt says so: *Blown fuse — Repair (fuse) · would blow again: 2 load on ≤1*. The repair is still allowed (Josh may want to spend the part), but the player is told.

## Acceptance criteria
- [ ] **A (grid-simulator):** after every settle, any spring switch with no current reaching it returns to its file `selected` (emitting `switch:thrown` with `spring: true` in the payload if it moved); a spring switch that is powered stays where the player put it. Undo restores positions as before; a sprung switch is not an action. `GridState` gains `wouldBlow: ReadonlyMap<string, number>` — for each readable blown fusebox, the load it would carry if repaired now (0 if it would hold). Tests: inline map; `which-fuse` with `sw_1` made spring (part D): blow `fb_1` → `sw_1` springs back to the well; repair holds. Add `spring` to `src/core/schema.ts` (lead-architect) and `wouldBlow` to the ticket-002 block and SCHEMA.md.
- [ ] **B (renderer):** a spring switch carries a coiled-ribbon mark; when it springs back, the lever snaps to its rest position with a short twang (~0.25 s). Pure timing tested; no per-frame allocations.
- [ ] **C (interaction):** hover on a spring switch reads *Spring switch — returns when power is lost* (plus *— relay* if both); hover on a readable blown fuse whose `wouldBlow` > rating reads *Blown fuse — Repair (fuse) · would blow again: N load on ≤R* (or *Needs: fuse · …*). Tests.
- [ ] **D (puzzle-designer):** `which-fuse`: make `sw_1` (and `sw_2`) spring switches so the shrine-on-the-small-fuse mistake costs one fuse and resets, not a dead end; re-verify with the script (the trap still blows `fb_1` once; repair then holds; the win is unchanged); record Josh's words under **What it taught us**. Review the other maps for the same pattern (a repair that re-blows at once with no way to see why) and report, don't change them.

## Files
`src/core/schema.ts`, `src/grid/`, `src/render/`, `src/play/`, `puzzles/which-fuse.*`, `puzzles/SCHEMA.md`

## Open questions
- Should *every* switch spring by default and only "latching" switches hold? Cut as opt-in (`spring: true`) so existing maps don't change; Josh decides after playing.
