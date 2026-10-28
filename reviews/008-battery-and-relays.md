ticket: 008-battery-and-relays
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 2; round 1 is in `008-battery-and-relays.round1.md`.*

## What the ticket asked for, as I understood it
Add a time-based battery to `src/grid/`. It charges from the feed at 1/s up to `capacity`. When released, it powers its far side for `charge` seconds without counting toward the feed's load. Add relay switches, which can only be thrown while current reaches them and keep their position afterwards. Time enters only through `advance(dt)`, and maps without these pieces behave exactly as before. The battery's window is "for *setting* the section, not keeping it lit".

## Does the branch do it?
Round 2, commit 896784d. I checked `git diff 0340d6e..896784d`, which touches only `src/grid/grid.ts` (two lines) and `src/grid/battery.test.ts`. In a detached scratch worktree, `npm test` passes 135/135. `npm run typecheck` shows only the known `src/render/render.test.ts:25` missing-`batteries` error, which belongs to ticket 009.

- **Round 1 must-fix 1 (a battery-lit target won the job): applied, correctly.** `complete` is now `targets.every((t) => lit.has(t) && f.powered.has(t)) && !brownout`. Here `f` is the feed's own flow. Battery-lit lamps stay in `lit` for reading and drawing. The replacement test is "a target lit only by a released battery does not complete the job; it completes once the feed reaches it". In it, the lamp is lit by the battery behind an open breaker. `complete` is false and no `job:completed` fires. Closing the breaker then completes the job and fires `job:completed`. This is a real rule test. Because `finished` is now only set by a feed-backed win, the grid no longer freezes on lamps that go dark.
- **Round 1 could-improve 3 (charge multiplied through fan-out): applied.** `charging` now uses `f.powered.has(bid)`, so a battery charges only from the feed. The new test "a battery charges only from the feed's own flow: a released battery does not charge a battery downstream of it" covers it. In it, b1 feeds b2 through b2's own `input` line, so b2 is powered but doesn't charge. That is the right case to test. The `advance` step calculation reads `derived.batteries[].charging`, so it picks up the change automatically.
- Every other acceptance criterion stands as in round 1:
  - Charging at 1/s up to capacity.
  - Release, drain, `battery:flat`, and stopping early.
  - Relays stuck while dead, thrown by the feed or a battery, and staying put afterwards.
  - Load accounting.
  - Readability on the far side while released.
  - `advance` as the only time input, deterministic, no change on maps without a battery.
  - `GridState.batteries` shape.
  - The existing suite unchanged.

The two fixes don't affect any of these. `lit`, `load`, `readable` and `powered` are untouched.

### The builder's rule interpretations (final)
1. **Time is not undoable.** Reasonable gap-fill. It is now written into SCHEMA.md's derived rules, including that `undo` can move a dead relay and that `release` is not an action.
2. **The feed never passes through a battery.** Matches the ticket's intent ("a section the feed can't reach"). Now written down.
3. **Charging from a released battery.** Changed: batteries now charge from the feed only. Written down and tested.
4. **Fuses and brownout are judged on the feed's flow only.** Matches the ticket's "time limit, not a load limit" cut.
5. **A flat battery recharges at once if the feed reaches it.** Matches.

## Rule conflicts and risks
- None blocking.
- The schema's derived rules (lines 77–78) were updated on `main`, which is the lead-architect's file, not on this branch, so the branch doesn't step outside `src/grid/`. One wording gap remains: the battery row in the node table (line 54) still says "Charges at 1/s while live power reaches it through `input`". The derived rule narrows that to the feed's own flow. The two don't conflict, but a reader of the table alone would miss it.
- Round 1 could-improves 1 (undo can move a dead relay) and 2 (`release` isn't an action) were not changed in code. Both are now recorded in SCHEMA.md as the rule. That settles them as documented behaviour, which is Josh's call to keep or change.

## Must fix
none

## Could improve
1. SCHEMA.md battery row (line 54): change "while live power reaches it through `input`" to "while the feed's current reaches it through `input`", so the table and the derived rules say the same thing. This is lead-architect's file, not this branch.
2. Round 1 item 5 still applies, and it matters less now: `release` returns false after `finished`, so a battery that is still released when the feed completes the job can't be stopped. It just drains.
3. When `puzzles/battery-run.json` lands, add the ticket's fixture test against it (a relay section set during the window, then won by the feed).

## Main session's response
agree. Could-improve 1 applied in SCHEMA.md at merge. 3 goes to the grid-simulator with ticket 010's map once it exists. Merged into `main`.
