ticket: 011-readable-failures (part D)
assessment: partly
must-fix: 1

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 1.*

## What the ticket asked for, as I understood it
`fuse:blown` names a `culprit` and a `path`. The culprit is the lamp that is in the fuse's downstream load after the action but was not in it before. If several lamps qualify, the one with the largest load is named. The path is the line ids from the fuse to that lamp, in order. It must be tested on an inline map and on `battery-run` (breaker first → `mill`), and `src/grid/` must stay pure.

## Does the branch do it?
**Payload and emission (met).**
- `settle()` calls `nameCulprit()` (`src/grid/grid.ts`) for each blow it emits.
- The payload matches `src/core/events.ts`, including `culprit: string | null` and `path: readonly string[]`.
- `null` and `[]` are returned when there was no earlier settle or no new lamp.

**Path (met).** The code walks up `parent` and `parentLine` from the culprit to the fuse, then reverses the list. That gives the lines in flow order, fuse first. This is the same BFS tree the `sub` load sum uses, so the path follows the current that overloaded the fuse.
- Inline test: `["l1","l2","lb"]`.
- battery-run test: `["l_e2","l_mill"]`.

**Largest load wins (met).** Tested by the `big` (load 3) case. Ties go to discovery order, which the ticket leaves open.

**No emission on undo or reset (met).** Both still go through `settle(cur, false)`. `prevFed` is reset to `null` in `initial()`, saved with `cloneMutable`, and recomputed on every settle. I checked this with a probe: blow, undo, reset, blow emitted exactly two events, both correct. A blow during construction is also silent, and there is a test for it.

**Battery-run tests (met).**
- Breaker first → `fb_east` blows with load 3, rating 1, culprit `mill`, path `["l_e2","l_mill"]`.
- The ticket-008 fixture (charge 8, release, `rl_2`, `rl_1`, breaker) produces no blow and ends `complete`.

**Battery-lit lamp counts as new (acceptable).** `prevFed` only holds lamps that the feed's own flow lit, so a lamp that only the battery lit counts as new to the feed. This matches SCHEMA's battery rules: the far side of a released battery is free of fuse checks, and only the feed's flow sets the load. My probe: release the battery so `mill` is battery-lit, then close `br_east` → culprit `mill`. That is the right story.

**Purity and regressions (met).**
- Only `src/grid/` changed. The only import in `src/grid/grid.ts` is `../core`. The new test reads the puzzle file with `node:fs`, as `grid.test.ts` and `battery.test.ts` already do.
- `npm run typecheck` is clean. `npm test` passes 154 of 154 across 9 files.

**Culprit rule (not met as written).** The ticket defines the culprit as a lamp "in its downstream load now that was not there before the action". The code instead asks whether the feed was lighting the lamp anywhere before the action. The two differ when an action moves a lamp that was already lit from one fuse to another. I probed this with feed → switch `s` (outputs to `fbA` rating 5 and `fbB` rating 1) → shared junction → `m` (load 3). Throwing `s` blows `fbB` with load 3 and emits `culprit: null, path: []`, although the ticket's rule names `m`. The same thing can happen when a breaker or repair changes the BFS parent of a lamp on a loop.

## Rule conflicts and risks
- No hard-rule break: `src/grid/` stays pure, no new dependency, and no Decided rule is changed.
- Risk: when the culprit is `null`, the renderer (part E) gets no path, so it can skip the shock entirely in the reroute case above.

## Must fix
1. **`src/grid/grid.ts`: base "new" on this fuse, not on the whole feed.** Today `prevFed` is a set of lamps the feed lit. Store what was downstream of each fuse instead: either fuse → set of lamps (the lamps in each unfaulted fusebox's `sub` subtree at the final settle), or for each lamp the set of fuses on its parent chain. Then `nameCulprit` treats a lamp as new when it was not under *this* fuse before the action.
   - Expected effect: the switch-reroute case names `m` with path `["jb","lm"]`.
   - The existing tests are unchanged: battery-lit `mill` stays new, and construction stays silent because the "before" is still `null`.
   - Add the inline reroute test to `src/grid/culprit.test.ts`.

## Could improve
1. Add an explicit `src/grid/culprit.test.ts` case that undo and reset emit no `fuse:blown`, and that a blow after a reset still names the culprit. The probe passed, but nothing in this ticket's tests pins it.
2. Add a test that repairing a blown fuse under the same overload blows it again and names the culprit (`mill`, `["l_e2","l_mill"]`; the probe confirmed this). The renderer will replay the shock on every re-blow, so the test is worth having.
3. Correct the `Mutable.prevFed` doc comment. It says "powered, unfaulted", but what it holds is "lit by the feed's own flow". Make it say so once the fix above changes its shape.

## Main session's response
agree. Sent back with the must-fix and could-improve 2 (the re-blow test: the renderer replays the shock on every re-blow, and the battery-run recovery path hits it). Could-improve 1 and 3 fold in naturally with the change.
