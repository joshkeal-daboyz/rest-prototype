ticket: 057f-block-variety
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section F (design item 19.5): widen `BLOCK_TILES` to 6 to 16 cells, with neighbouring line spacings at least `BLOCK_STEP_MIN_CELLS` (2) apart and straight full-length streets that each keep one profile. Give every `TileBlock` a `type` (small, medium, long, large), and add V1 (CV of at least 0.15 per axis, at least ceil(blocks / 2) footprints) and V2 (at least 70% not square) to `frontage.ts`. V1 and V2 must pass on the default city and seeds 1 to 10 at 3 x 3 and 6 x 4, and fail on a uniform 10 x 10 grid. 056's P1 to P6 and 057's G1 to G4 must still pass.

## Does the branch do it?
Reviewed `git diff fa4b9a1~1 fa4b9a1` (four files: `src/render3d/tilecity.ts`, `frontage.ts`, `tilecity.test.ts`, `frontage.test.ts`). The gate was green on the branch: tsc clean, 2394 passed, 9 skipped.

**Criterion 16, wider, uneven blocks: met.**
- `BLOCK_TILES = { min: 6, max: 16 }` and `BLOCK_STEP_MIN_CELLS = 2` are pinned in "pins the numbers of 19.5". `blockLens` draws each size from the values at least 2 cells from the one before, and prefers one not yet used.
- "keeps every block's sides inside BLOCK_TILES and neighbouring blocks ... at least BLOCK_STEP_MIN_CELLS apart" runs `forAll`: 1x1, 3x3, 6x4 and 6x6, seeds 1 to 20. It reads the step and the no-repeat rule from the finished blocks' cells, and also checks that every block in a column shares its width and every block in a row its depth.
- One profile per street: "keeps every street one profile along its whole length" walks every band cell over the full city length, and checks 5 bands for a street and 6 for an avenue. `layoutAxis` still lays the profile per line. Only the block lengths changed: they are passed in as `lens`.
- 055 A's criteria 1 to 8: the size test in "block sizes, variety and levels" now reads `BLOCK_TILES.min` and `BLOCK_TILES.max` (it already did; only its title changed). No literal 8 or 12 is left in it.
- `TileBlock.type`: set from `blockType(cb.len, rb.len)`. The type test has an 18-case table at the class boundaries (40, 45, 55 and 60 m), checks that turning a block round keeps its type, checks every city block against its own sides, and checks that all four types appear. The table encodes the 19.5 wording, so it is real coverage, not the implementation's own output.

**Criterion 17, V1 and V2: met.**
- `blockVariety` in `frontage.ts` measures widths, depths, footprints and squares from each block's `i0..j1` cells alone. It never reads the hashed sizes. `evaluateVariety` turns these into V1 (a count of failed parts) and V2 (squares over `floor(n * 0.3)`).
- Passing cities: "passes on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 10 at 6 x 4" asserts the verdicts and the raw numbers. `tilecity.test.ts` also holds V1 and V2 over all of `forAll`.
- Uniform fixture: "fails on the uniform grid" builds 3 x 3 blocks of 10 x 10 cells with `gridOf`. Both checks fail, with values 3 and 7.
- Further fixtures each fail one part and pass the other: 793bbf7's default sizes fail V1 only, a square diagonal fails V2 only, and too few footprints fail V1 only. The square allowance is tested at its edge (2 of 10 passes, 4 of 10 fails). This is not self-referential.
- P1 to P6 and G1 to G4: the existing parking and frontage suites run on the cities of criterion 3 and are green. Two of their tests were changed; both are judged below.

**The builder's own choices:**
1. **Sizes 6 to 16, step 2, no size repeated on an axis, redraw by hash (at most 64 draws).** The no-repeat rule is stronger than the ticket asks, but follows from 19.5's intent: 11 sizes, at most 6 blocks. The redraw keeps one city per size and seed, which is tested. `tileCity` stays deterministic and pure.
   - The draw inside `tileCity` enforces the same rule V1 and V2 check (`blockSizesVary`), so passing them on the ticket's cities is partly by construction. That is acceptable, because V1 and V2 re-measure from the cells and the fixtures prove that both can fail.
   - Risk: if 64 draws all miss, the last draw is used silently (could improve 3).
2. **The two layout rules the ticket doesn't name.**
   - **At least one side of 35 m or more.** This is a legitimate consequence. Criterion 17 requires P1 to pass, and the comment derives 7 cells from `KERB_BAY_SHARE_MAX.street`, as the test does. Only the 6 x 6 block is lost; 6-cell short sides remain.
   - **`BLOCK_MEAN_MIN_CELLS = 10`.** This one is a tuning choice, not something 19.5 implies. It was added because R1 sat at 0.887 to 0.90 on three cities. It narrows what the ticket asked for (blocks lean larger; the default city's sides run 6 to 15 and none reaches 16), but it does not break a criterion: all four types still appear, and the range and the step hold. It should be recorded in the ticket (could improve 1).
3. **The hash key `"width"`.** It was chosen among a few tried keys because R7 (`TILE_CITY_R7_MIN`, 0.4) failed on seed 3 (0.373) under the first key. That is seed-fishing: the choice works only because the test cities happen to land above the floor under that key.
   - It is not recorded anywhere in the repo. Neither the code comment on `blockLens` nor the commit message says the key was tried or why.
   - It is not a must-fix: R7 is not one of criterion 17's checks, and it passes on every city tested.
   - It is fragile. Section G will change these layouts again (alleys split blocks, parks take blocks out of R7's qualifying set), so R7 is likely to tip again.
   - With 9 blocks, R7 moves in steps of one ninth (3/9 = 0.33 against 4/9 = 0.44), so a 0.4 floor is a coin toss on the escapes' own hash.
   - A rule that does not depend on a tried key would make the floor a guarantee rather than a chance. For example, the escape placement could give escapes to the first ceil(0.4 x qualifying) qualifying blocks by hash rank, or `blockSizesWork` could take R7's qualifying count into account. The first belongs to 058's files, not F's, so it is a ticket note (could improve 2).
4. **The P2 ratchet in the lot planner.** After the fixed-point rounds, a block whose quota flips between 1 and 2 (one lot gives 61 homes, two give 55) is asked for the larger of the two. It can then hold one lot over its final quota.
   - **This changes approved 056 behaviour.** 056 criterion 4 said lots plus short stalls equal the quota. The lot-quota test in "the layout (056 criterion 4)" now accepts +1 within 10 homes below the rounding edge.
   - **It is safe.** It adds a court and never takes one away, so no block falls short. G3 and G4 still pass, the +1 is bounded tightly in the test, and the alternative (a 2-cycle that leaves the quota unmet) would fail P2 outright.
   - It still needs a pointer line in 056 / 057 from the architect, as 057's Dependencies section does for every other change to 056 (could improve 1).
5. **Existing tests that changed.**
   - **Units baseline (273/166/405 to 294/186/439).** Re-measured on the new default city and documented in a comment. The 10% band is unchanged. It is now a snapshot of this branch's output; it guards regressions but is no longer an independent check. This is unavoidable when the block sizes change.
   - **Courts ring test.** It now takes the ring from the nearest edge (`min(ring, dim - ring + 1)`). This is a geometric fix for 6-cell-deep blocks, where the far stalls row is nearer the opposite edge, not a loosening.
   - **The G3 test on 793bbf7's layout (50 to 70% widened to 40 to 80%).** The assertion that G3 fails on every block is unchanged; only the describing band widened, and the comment explains why (the 80 m blocks are 49% void, the 30 m blocks 70 to 78%). The fixture is `bare(city)` of the new layout, not 793bbf7's literal one. The ticket's "55 to 67%" was measured on 793bbf7, so this is fine.
   - **The lot-quota test.** This is the one real loosening; see 4.
   - No check threshold (G1 to G4, P1 to P6, R1 to R13) was changed.
6. **V1 and V2 fail on the uniform 10 x 10 fixture and are not self-referential.** Confirmed above.
7. **Ladder unchanged and files touched.** `townpin.test.ts` and `town.ts` are untouched, and nothing on the ladder path reads the changed code. Of the four files, three are in F's list. `frontage.test.ts` is an existing file, not a "new test", but it is the obvious home for `frontage.ts`'s checks; see could improve 4.
8. **CI safety.** The new tests are pure: no assets, no file reads, no Windows paths, no timers. They reuse the cached `forAll` views. The V1/V2 city loop is about 21 unpacked `tileCity` calls, which is cheap.

## Rule conflicts and risks
- No GDD Decided rule is touched (rendering only). There is no new dependency, no `src/core/` change, and no change to `src/grid/` or `src/night/`. `tilecity.ts` and `frontage.ts` stay pure.
- 056's approved lot quota now allows one lot over the quota at a rounding edge (the P2 ratchet). This is safe, but it is not recorded in the ticket.
- R7 is held above its 0.4 floor on the test cities by a hash key chosen among tried keys. This is not recorded, and is likely to tip again in section G.
- `BLOCK_MEAN_MIN_CELLS` biases block sizes upward. It is a design constraint the ticket does not name.
- If all 64 draws miss the variety and layout rules, the last draw is used silently, on sizes or seeds outside the tested set (for example a seed in a URL).

## Must fix
none

## Could improve
1. Ask the architect to record in `tickets/057-frontage-and-block-interiors.md`, under "What 057 replaces in 056" and 19.5, three things: the P2 ratchet (056 criterion 4 now allows one lot over the quota within 10 homes of the edge), the 35 m longest-side rule, and `BLOCK_MEAN_MIN_CELLS = 10` with the R1 numbers that motivated it. Josh then sees all three as design choices.
2. In `tilecity.ts`, say at `blockLens` that the `"width"` hash key was picked among tried keys because R7 fell to 0.373 on seed 3 under the first. Add a ticket note for G or 058 that R7's 0.4 floor should become a guarantee (escapes by hash rank to ceil(0.4 x qualifying)) instead of a chance on 9 blocks.
3. `tilecity.ts`, the redraw loop in `tileCity`: when `draw` reaches `BLOCK_DRAWS_MAX` without meeting the rules, fall back to a known-good arrangement (for example sizes spread evenly from the free values), or flag it on the city. Otherwise V1, V2 or P1 could fail quietly on an untested seed.
4. `frontage.test.ts` is not literally in F's list ("`tilecity.test.ts` ... and new tests"). Ask the architect to add "`frontage.test.ts`" to F and G's list, so G's V3 and V4 tests have an unambiguous home.
5. Optional: a test that sizes near both ends of `BLOCK_TILES` actually occur somewhere in `forAll`. As it stands, nothing shows that the mean rule leaves 16 reachable.
