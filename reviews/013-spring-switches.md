ticket: 013-spring-switches
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Opt-in spring switches (`"spring": true`) that return to their file position whenever no current reaches them, plus a `wouldBlow` forecast so the hover on a readable blown fuse warns *would blow again: N load on ≤R*; drawn with a coiled ribbon and a ~0.25 s twang, and applied to `which-fuse` (`sw_1`, `sw_2`) so the shrine trap costs one fuse and resets instead of leaving a dead end.

Reviewed commit 66dc4cd against main's 72b99b6 (the branch head 15b5c7d adds only tickets 014/015). In a clean detached worktree of the branch: `npm run typecheck` is clean, and `npm test` gives 14 files and 241 tests, all passing.

## Does the branch do it?
- **A (grid-simulator): met.** `src/grid/grid.ts` `settle()`: once the blow check is stable, every spring switch not in `powered` (feed plus released-battery flow, as the clarification says) is set back to its file `selected`, emitting `switch:thrown {spring: true}`. Then the loop runs again until no spring switch moves. That always ends, because each switch can move at most once, toward rest. The return happens inside settle, so it adds nothing to `history` or `actions`. `throwSwitch` now refuses `(relay || spring) && !powered`, with no push, no event and no action. `wouldBlow` is computed after the springs settle. It covers only blown fuses that `powered` reaches (the same test as `readableFaults`). The trial removes only that fuse's fault (no cascade), and the value is the trial's load when it exceeds `rating`, else 0, matching the `RepairForecast` doc in `src/core/state.ts`. `GridState extends RepairForecast` is in `src/grid/types.ts`. Tests in `src/grid/spring.test.ts`, each with its rule in the name:
  - a powered switch stays put
  - an open breaker springs it back with `spring: true` and the exact event list
  - a blown fuse upstream springs it back, `wouldBlow` 0, and the repair holds
  - the return isn't an action or an undo step
  - a dead throw returns false and emits nothing
  - the cascade case (two chained springs)
  - a battery going flat
  - relay+spring together
  - a non-spring switch holds
  - `wouldBlow`: keys only for readable fuses, 2 on 1 when it would re-blow, an unreadable fuse absent, no cascade with two blown fuses, an unrated box gives 0
  - `which-fuse` with springs: trap, then spring back, then repair holds, then win with one fuse left
  - `which-fuse` without spring reports 2.

  SCHEMA.md and the ticket-002 block are updated. The validator rejects a non-boolean `spring` (`src/core/load.test.ts`).
- **B (renderer): met.** `src/render/spring.ts` holds the pure timing: `twangOffset` is a decaying cosine, 1 at age 0 and exactly 0 at and after 0.25 s, overshooting past rest, and `sprangBack` does the detection. `src/render/spring.test.ts` tests the duration, the endpoints, NaN and negative ages, the overshoot range and the detection. In `map-renderer.ts` a coiled zigzag is drawn under spring switches (a shape, so it reads without colour). The lever is interpolated from the old position through rest. A twang starts either from `notify({type:"switch:thrown"})` or from the state alone (moved while unpowered). The per-node state lives in typed arrays allocated once (`isSpring`, `prevSel`, `twangStart`), and the per-frame loop allocates nothing.
- **C (interaction): met.** In `src/play/prompt.ts`, the switch hover reads `Spring switch — returns when power is lost` (plus ` — relay` when both flags are set). On a blown fuse it appends ` · would blow again: N load on ≤R` when `wouldBlow > 0`, after both `Repair (fuse)` and `Needs: fuse`. Tests in `src/play/play.test.ts` cover:
  - both prompt forms with an injected `wouldBlow`
  - one case through the real grid (4 on ≤1)
  - no warning when the fuse would hold
  - spring alone and spring+relay.

  Existing fuse prompts were moved to rating 5 so they still read plain. That is correct, since the real grid now warns on the old rating 1.
- **D (puzzle-designer): met for the map, can't verify the cross-map report.** `puzzles/which-fuse.json` sets `spring: true` on `sw_1` and `sw_2`. `which-fuse.md` re-states the read, the numbers (5 actions after one trap, 0 re-blow states, dead ends only after a third fall) and Josh's words under **What it taught us**, and removes the duplicate heading. The grid test above checks the trap, recovery and win against the real file. The ticket also asks for a review of the other maps for the same pattern, reported rather than changed. Nothing in the diff shows that report; it belongs in the builder's report to the main session, so check that it was made.

## Rule conflicts and risks
- Purity holds. `src/grid/grid.ts` and `types.ts` import only from `../core` (types). `spring.test.ts` uses `node:fs` the same way the existing grid tests do.
- No new dependency. No GDD Decided rule changed: spring is opt-in, and maps without the flag behave exactly as before.
- Files: everything is inside the ticket's list and its Interfaces section. The `src/core/` contract, `tickets/002` and `tickets/013` are the lead-architect's.
- The 3D game can take `src/grid/` as it is. `wouldBlow` runs one extra `flow()` per readable blown fuse per settle, which is cheap at these map sizes.
- Small design gap: an unpowered spring switch that is not a relay hovers as `Spring switch — returns when power is lost`, but a click does nothing (`throwSwitch` returns false). A relay in the same spot says `No power — relay stuck`. The ticket didn't specify this case, so it isn't a blocker, but it is a silent dead click.

## Must fix
none

## Could improve
1. `src/play/prompt.ts`: when a spring switch has no power, give a no-power reading (e.g. `Spring switch — no power, at rest`) so the refused click isn't silent. Keep the agreed wording for the powered case.
2. `src/core/state.ts`: the doc comment still says "STUB until the grid-simulator builds it: nothing fills `wouldBlow` yet". It is filled now; lead-architect to drop the stub note.
3. `src/grid/spring.test.ts`, first test: the unused `g` built from the rating-1 map (only its initial switch position is checked) muddles what the test is about. Drop it.
4. `src/render/map-renderer.ts`: if a switch's two outputs point in opposite directions, the interpolated lever passes through a near-zero vector mid-twang and briefly draws as a stub (`|| 1` only avoids NaN). Slerping the angle instead of lerping the vector would avoid it. This is cosmetic.
5. `wouldBlow` forecasts only the repaired fuse. If fitting it would instead overload a different fuse downstream, the hover stays silent. That matches the ticket ("would blow again"), but it is worth a line in SCHEMA.md so designers don't rely on it.
