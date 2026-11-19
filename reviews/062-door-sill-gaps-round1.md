ticket: 062-door-sill-gaps
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
A: every building the town can place gets a door sill: a per-key search depth (4 m at most), a typed-in value, or a reason in `NO_STREET_DOOR`. Windows on single-material models are read from recessed faces, and no sink may bury a window or a front step. B: in a mixed-sill stack each ground piece is lifted, so every door meets the walk. Where a lift would reach the first floor's window sill, the stack keeps to one sill band. The dressing on a lifted piece rises with it, and the ladder maps change only in heights plus the band.

## Does the branch do it?
I reviewed `git diff ab9d01f 480a5fc` (builder commits 1f94cc3 and 480a5fc). The gate was green (tsc clean, 2597 passed, 14 skipped). I ran `npx vitest run --maxWorkers=2 src/render3d/sills.test.ts` in `D:\rest-prototype-062`, which has the GLBs: 83 passed, including the real-geometry re-measure. I also ran a throwaway comparison test, since deleted, that ran `cityMetrics` on the blocks as drawn. Its numbers are used below.

**A1. Every key accounted for: met.**
- The test `accounts for every key the town can place on the ground...` builds the key set from `STACK_STYLES` ground roles plus every `MODEL_TABLE` building slot: 13 + 12 + 38 keys. `accountingProblems` flags a key with neither an entry nor a reason, with both, or with an empty reason. The test also checks that the counts add up and pins the six `NO_STREET_DOOR` keys.
- `UNSETTLED` is gone. `UNSETTLED_1A356B9` is kept only for the failing fixture.
- `SILL_DEPTH_BY_KEY`:
  - has 17 entries;
  - the test asserts each depth is greater than `SILL_DEPTH_M` and at most `SILL_DEPTH_MAX_M` (4), with a reason;
  - each key also has a table entry and is not in `NO_STREET_DOOR`.
- The two typed-in sills (`Preset_04`, `Garage_01`) carry a `why`, and the test lists exactly those two.
- The reasons are geometry statements (how far back the floor is and why). One extra key set goes beyond the ticket's list: `Building_House_09`, `_010` and `_011` get a 1.3 m depth. Their sill changes from 0.426 to 0.639, because the old reading was a stoop tread. That is justified, and it closes the guide's Open item on the stoops.

**A2. The new values: met.**
- `Preset_10` and `_11` are pinned at 1.052, with a 3 m depth. The GLB test also re-measures them at 3 m against 1.05.
- `Preset_04` is typed in at 1.151 and `Garage_01` at 1.052, each with a reason.
- Every SIMPLE Town per-key entry is in `PINNED` (exact deep-equal) and re-measured from the GLB.

**Re-measure test (your question 1).**
- The real-geometry `it.skipIf(!have)` calls `measureDoor(mesh, front, sillDepth(key))`. The depth comes from `SILL_DEPTH_BY_KEY`, not from the table under test. The mesh is read from the GLB, and the result is compared with `DOOR_SILLS` within 0.02 m. That is a real measurement.
- Typed-in keys must measure null within 4 m and, at 30 m, match their typed sill.
- `NO_STREET_DOOR` keys must measure null within 4 m.
- City Pack pieces skip the window and step comparison. That is documented, and those pieces are listed in `NO_FRONT_WINDOW`.

**A3. Windows measured: met.**
- `measureDoor` gains the recessed-face rule: front-facing, at least 0.05 m back and no deeper than 4 m, at least 0.3 m², above the door floor, and not the door leaf. Synthetic fixtures cover it on all four fronts.
- Every `window_m` that is null now has a reason in `NO_FRONT_WINDOW`. The test asserts the two sets are equal.
- `never lets a window end less than SILL_WINDOW_CLEAR_M above the walk ... and never buries a front step` runs `houseSill` over the whole table.
- `step_m` is measured (synthetic fixtures plus the GLB re-measure). `planHouse` caps the sink at the step.

**A4. Failing fixtures: met.**
- The 1a356b9 table, with the 22 keys removed and no reasons, gives 22 "neither" problems.
- `planHouse(1.04, null, 0)` sinks 1.04, which leaves the 0.6 m step 0.44 m under the walk. Under the new rule it does not. The step check here is inline arithmetic rather than the table-wide check's code, but it tests the stated bound.

**B5. The lift: met for what is drawn.**
- `stackLift` (pure, in `sills.ts`) sinks by `stackSill` and lifts each ground piece by (sink − its sill). It holds the lift back at `ws − LIFT_CLEAR_M − (top over the first floor)`, taking the lowest window sill over the columns the piece covers, and reports anything out of +0.15 / −0.05.
- The scene test `the lift on every town of the protocol` runs on the default tile city, 3 x 3 at seeds 1 to 10, and the three maps. For every drawn stack it asserts:
  - `problems` is empty;
  - the group's y equals −sink;
  - each base wrapper's y equals the lift, and nothing else moves;
  - each door is in [−0.05, +0.15];
  - the top of each lifted piece is at least `LIFT_CLEAR_M` under `sillOf(first floor)`;
  - each piece's bottom is at or under the walk.

  Answer to your question 2: yes.

**B6. The band: met as specified.**
- `assembleStack(..., { sillBand })` is the only change in `stacks.ts`, and it is off by default.
- The test runs 40 lots with and without a corner. With no band the stack is unchanged. With a band, every base key is in the band and nothing above the ground row changes in key, column, x or y.
- The fixture `Door_01 in a Corner_02 block` shows the lift stays inside the window rule (0.347 m against an allowed 0.367 m). The builder reports this in 16.10.

**B7. Dressing follows: met.**
- `liftDressing` lifts only the slots `glass`, `awning`, `sign` and `wall`. In `dressing.ts`, `awning` covers the awning and the door canopy, and `wall` holds only the ATM at `ATM_Y_M`. Wall ACs and planters are `wallUpper` and are not lifted. Escapes and roof props are not lifted.
- Unit tests cover every slot kind and check the input is left unchanged.
- The scene test checks drawn glass is at `GLASS_SILL_M + lift` on every town, and that every escape passes `escapeCheck` on a non-corner column.

**B8. Failing fixture: met.** The old block-sink-only rule on `Shop_05` + `Shop_03` leaves Shop_03's door at −0.318 m, below `-SILL_UNDER_M`. `stackLift` on the same stack has no problems.

**B9. Ladder maps: partly met.** See Must fix 1.
- Layout, placements and furniture are deep-equal between the full table and the empty table on all four towns, and `townpin.test.ts` is untouched.
- But `evaluateCity` and the R12 "the pure plan is the game's" check only stay equal because the plan no longer includes the band.

**B10. Guide: met.**
- 16.10 gains the per-key depth, the typed-in values, `NO_STREET_DOOR`, the window method, the step rule, the lift, the band and the dressing rule, with Josh's words as Decided.
- The three Open items are closed, and the Numbers rows cover the new constants.
- One sentence is inaccurate: "the pieces above the ground row are as they were" (Could improve 2).

**B11 and B12:** these are for the main session.

## Rule conflicts and risks
- **The drawn town and the checked town diverge (your question 3).** `applyModels` re-assembles a terrace block within a band after `packTown` and draws that block. But `applied.packed`, `packedRuns` and the citymetrics pure plan keep the unbanded packing. My throwaway test ran `cityMetrics` on the blocks as drawn:

  | Map | Blocks re-assembled within a band | `shopsGlassed` | `dressPieces` | `signedShopBays` |
  | --- | --- | --- | --- | --- |
  | `01-first-light` | 30 of 111 | | | |
  | `09-shrine-circuit` | 27 of 122 | 184 → 155 | 1117 → 1088 | |
  | `64-the-whole-chain` | 32 of 161 | 242 → 204 | 1467 → 1429 | 148 → 149 |

  So today's checks count 29 to 38 shop glasses per map that are not drawn. No R item flips on the drawn town yet: `failing` is empty for both versions. But the checklist no longer measures about a quarter of the blocks it is meant to measure, and the test that guarded "plan = game" was narrowed to skip exactly those blocks.
- **`Shop_06` takes over banded blocks.** `sillBands` puts `Shop_06` (no sill, no door, no glass) in both bands. The ticket's band lists do not include it. With the high band, the mid candidates shrink to `Shop_05` and `Shop_06`, so `Shop_06` replaces `Shop_02` and `_04` on most banded blocks. Net extra `Shop_06` fronts: 25 (`01`), 29 (`09`), 38 (`64`). This is what drives the glass drop above. These blocks meet "every door meets the walk" because they have fewer doors. Josh should see this in the criterion 11 screenshots.
- **Pieces above the ground row are not the same place in z on back-aligned maps.** Both `sameAboveGround` copies, the one in `models3d.ts` and the one in `sills.test.ts`, compare key, column, x and y but not z. With `align: "back"` (the protocol maps), a deeper ground piece moves `maxFront`, which shifts every floor and the roof back. In my run 22 to 26 blocks per map had their upper pieces move by up to 0.389 m. The tile city ("wall") is not affected. This is harmless to look at, but the code comment, the test name and the guide all say nothing above the ground row moved.
- **Out-of-list test edits (your question 4).**
  - `facing.test.ts`, which now leaves the `door-steps` group out of the clone count: legitimate. More houses take steps now that `step_m` caps the sink, and the steps group is not a building.
  - `terracetown.test.ts`, which counts pieces from `applied.terrace` and now asserts the same lot and style: a consequence of the band, and acceptable if the band design stands.
  - `citymetrics.test.ts` (R12): a loosening. See Must fix 1.

  None of the three is named in the ticket's Files list.
- **Hard rules (your question 5).**
  - No change to `src/grid/`, `src/night/`, `src/core/`, `tests/`, `puzzles/`, `package.json`, or the must-not-touch files (`terrace.ts`, `dressing.ts`, `escapes.ts`, `citymetrics.ts` and the rest).
  - No new dependency.
  - `sills.ts` now imports `stableHash` from `../render/city` and a value from `./escapes`. Both are allowed for `src/render3d/`, and `escapes.ts` does not import `sills.ts`, so there is no import cycle.
  - CI-safe: GLB reads are inside `it.skipIf(!have)` only, module-level reads are repo puzzles and sources, paths go through `join`, and there are no timers.
- **SIMPLE Town houses with a porch step.** House_01 to _04, _09 to _011, _012 to _015 and the offices now sink to their step, then stand concrete steps for the rest (for example House_01: sink 0.601, steps for 0.434). The concrete steps stand outside the front face, so they may sit in front of the model's own porch tread, which is now at the walk. This is the ticket's rule as written, but it is worth Josh's eye if these models appear on a map.

## Must fix
1. **Make the checked plan the drawn town again, and restore R12's strict equality** (`src/render3d/models3d.ts`, `src/render3d/citymetrics.test.ts`).
   - **What:** move the post-pack band pass out of `applyModels` into an exported pure function in `models3d.ts`, for example `bandPacked(packed, runs, styles, entries, fronts, sills, align)`, which returns the drawn `PackResult` map.
     - `applyModels` uses it both to draw and as `packedRuns`/`applied.packed`.
     - `planOf` in `citymetrics.test.ts` applies the same function, so `cityMetrics` and `evaluateCity` run on what is drawn.
     - Put back the original `expect(applied.dress.length).toBe(plan.dressing.reduce(...))`, with no banded-frame exclusion.
   - **Expected effect:** the R checks measure the drawn ground rows and dressing again. On the maps, `shopsGlassed` and `dressPieces` drop by the amounts above, while the verdicts still pass, as I checked. Those numbers go to Josh with criterion 9, whose "evaluateCity stays deep-equal" can hold only where no block is re-assembled within a band.
   - `terrace.ts` stays untouched.
   - If the main session would rather put the divergence to Josh than fix it, it needs his word, because as it stands no check measures the ground row of the banded blocks.

## Could improve
1. **`Shop_06` in both bands.**
   - Option: leave `Shop_06` out of a band's mid candidates, or out of the high band, or weight against it, so a banded block does not trade its shops for blank fronts.
   - Option: keep the current rule and record in 16.10 that banded blocks gain about 25 to 38 doorless `Shop_06` fronts per map. The ticket's band lists did not include it.
2. **The z claim.**
   - Either make both `sameAboveGround` helpers compare z, or say that on back-aligned maps the floors and roof may move back by up to 0.39 m.
   - Correct the 16.10 sentence "the pieces above the ground row are as they were".
3. **Show each per-key depth is needed.** In the GLB test, assert that each `SILL_DEPTH_BY_KEY` key measures null, or a different sill, at the default `SILL_DEPTH_M`.
4. **A4 step fixture.** Run the step check through the same code as the table-wide step test, rather than inline arithmetic.
5. **Signs on lifted pieces.** A sign lifted with its piece can rise above the `roofTopOf` bound that `dressing.ts` placed it under, by up to the lift. Consider adding that to the lift's window or top check.
