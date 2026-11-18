ticket: 051-terrace-rows-d
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section D stands each terrace run's packed blocks in the town in place of its placeholder boxes, with the 050 C variety, corner and in-town rules and the 041 B ray test still holding on the terraced town (criterion 16), and the C far-wall must-fix closed. This round checks cf25221 against round 1's single must-fix: run 050 C's variety, corner and in-town tests on the terraced town, restricting only the assertions the design contradicts (a whole stack on every large lot, the count floors), and make `FAMILY_SHARE_MAX` hold on `52-wire-short` or stop for a re-cut.

## Does the branch do it?
I judged cf25221 against 10024e4 (round 1) and goal/city-style. The full gate is being run separately, so I did not re-run the suite. I ran one headless probe from the scratchpad. It compared HEAD's `pickBuildings` with HEAD~1's (a `git archive` copy), on every map, with terraces on (the non-terrace lots, which is what `buildingPlacements` gives the picker) and with terraces off. I ran it under four fixture plans: City Pack with stack offers, City Pack without offers, no City Pack, and SIMPLE only. Each run counted neighbour clashes, cap misses, and the result of two identical calls.

**Round 1 must-fix, the share on 52: fixed.**
- **Terraces on.** Under all three Town/City plans, exactly one lot changes on one map: `52-wire-short`, where small `SM_Bld_House_Preset_01` drops from 6 of 20 to the cap of 5. Every other map is identical to HEAD~1.
- **SIMPLE-only plan.** The repair also fixes a second miss the old picker had: `37-spend-the-fuse-first`, small `Building_Shop_03` at 4 of 15 against a cap of 3. Again only one lot changes.
- **Terraces off.** The output is identical to HEAD~1 on every map under every plan (0 lots changed).
- **Why that holds.** The repair loop in `models.ts` (around lines 740 to 781) only runs while a family is over `capN`. `capN` uses the same formula as the greedy pass (line 713) and as the test's `most`. A map within its caps is therefore returned untouched.
- **Neighbour rule.** 0 clashes after the repair, under every plan and map. A move only goes to a family absent from `nearOf(i)`, and corner fit is respected (`fitsAt`).
- **Cap.** 0 misses after the repair. A receiving family must be under `capN`, so no move can push another family over.
- **Determinism.** Two calls give identical results on every map. The repair uses only `stableHash(lot.key|repair)` and a fixed lot order, and it terminates (each pass lowers the over-cap count or breaks).

**Round 1 must-fix, the tests on the terraced town: done, with one limit loosened that is not a count floor.**
- **Switched to the terraced town.** The `maps` in `stacktown.test.ts` (line 194), `facing.test.ts` (121) and `polygon.test.ts` (146) are now `townLayout(p)` with terrace lots filtered out. That is exactly the list the picker gets, so the variety, street, cap and corner rules are now tested on the town the game draws.
- **Scenes on the terraced town.** The 041 B ray run (stacktown 569) now uses `applyModels` and stands boxes for both the per-lot stacks and every terrace block. The stack-group test runs on 64 with terraces on, because 09's outer rows are all terraces now.
- **Placeholders.** `placeholders.test.ts` runs with terraces on. The 0.8 to 0.9 footprint bound applies to non-terrace lots, terrace lots are checked at factor 1, and the `placeholders:terrace` group is checked too. This also takes round 1's could-improve 3.
- **No `terraces: false` left** in the rendering tests. It remains only in `terrace.test.ts` and `town.test.ts`, where it is by design (criteria 6 and 10), and in `scene.ts`'s test-only option.
- **The lowered floors are justified consequences of the layout, not weakenings.** Each is a "more than N" sanity floor on how many cases were checked. Each pool shrank because terrace lots no longer reach the picker, and each new floor keeps a margin under the measured figure:

| Check | Old floor | New floor | Measured |
|---|---|---|---|
| Neighbour pairs (stacktown, polygon, facing) | 1000 | 500 | 683 |
| Stack placements | 100 | 20 | 32 |
| Clones (facing, models) | 5000 | 1000 | 1438 |
| Corner meetings | 500 | 150 | 234 |
| debug3d buildings | 50 | 10 | 19 |

  - None of these is a rule's limit. The rule assertions inside the loops (no clash, no repeat, under cap, inside lot, facing road) are unchanged.
  - The `bareRowEnds > 50` and `corners / lots > 0.05` bounds are kept as they were.
- **The models.test.ts edits keep their meaning.** "keeps the placeholders of a lot type that has no model" now drops `house` instead of `tall`, because no non-terrace tall lot remains on any map. The test now finds a map that has a non-terrace house lot.
- **Not a count floor: the corner-shop bound.** `facing.test.ts` line 525 goes from under a quarter to under a third of the least-used ordinary family (measured 60 of 220, 0.27). That limit was set by ticket 047, which reads: "the corner shop only on valid corners and under a quarter of the least-used ordinary family ... The builder does not loosen a limit; that is a re-cut."
  - **Is the cause real?** Yes, and it is benign. Ring corners are unchanged while the small-lot pool shrinks, and the test's own comment says the corner model's count "is the number of such lots, not a share".
  - **Why it still blocks.** Loosening that limit needs a re-cut or Josh's word, not a builder's edit. Round 1 asked for the same handling: report the figure and stop.

**Criteria 15 and 16 otherwise:** unchanged from round 1 and still met.

**CI-safety: fine.** The tests read puzzles through `join("puzzles", ...)` with `existsSync`, there are no timers, and the GLB stubs are in memory. `git ls-files assets/private` is still empty.

## Rule conflicts and risks
- **No hard-rule break in code.** `src/grid/` and `src/night/` are untouched, there is no new dependency and no Decided rule changes. The only code change is inside `src/render3d/models.ts`, which is on D's list.
- **A behaviour change outside the terraces.** The repair also changes one SIMPLE-only small lot on 37. That is a cap fix for the same reason as 52, and the terraces-off output is untouched. The playtester's snapshots should show at most the 52 lot (and 37 if the snapshot uses the SIMPLE-only set).
- **`facing.test.ts` and `polygon.test.ts` are edited again.** Criterion 20 lists them as "Keep (unedited)", but 051 B had already edited both to `terraces: false`, and round 1's must-fix asked for this switch. I accept the edits as criterion 16's intent. The main session should tell Josh that criterion 20's "unedited" did not survive the terraces.
- **The picker's doc comment and the guide are now slightly stale.** Both describe the fallback order (`models.ts` line 631; `docs/city-style-guide.md` line 64: "the cap goes first") without the repair pass.

## Must fix
1. **Put the corner-shop limit to Josh instead of loosening it in the branch** (`src/render3d/facing.test.ts` line 525).
   - **What to do.** Restore `toBeLessThan(Math.min(...ordinary) / 4)` or bring the picker under it without breaking another rule. If neither is possible, the main session reports the measured 60 of 220 (0.27 against 0.25) to Josh as the re-cut ticket 047 requires. The bound may change to a third only on his word, recorded in the merge commit.
   - **Expected effect.** No limit a Josh-approved ticket fixed is moved by an agent. The cause, a constant count of corner lots over a smaller small-lot pool, is put to him with the number.

## Could improve
1. **Update `pickBuildings`' doc comment** (`models.ts` around line 631) and the guide's fallback sentence (`docs/city-style-guide.md` line 64) to say that a family left over its cap by the fallback is then relieved where a non-neighbour family under the cap can take a lot.
2. **Add a unit test named for the repair rule in `models.test.ts`:** a small synthetic street where the greedy pass must break the cap, asserting that the cap holds after the repair, that no neighbours match, and that a map within its caps is returned unchanged. Today the repair is only covered through the 52 ladder map.
3. **Still open from round 1:** could-improve 1 (a real mesh per fixture node in `terracetown.test.ts`'s no-raycast test), 2 (compare every placeholder group in the CI case) and 4 (cache `packTown` per town).
