ticket: 073d1-tech-walls
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 11, `tech`, in a new pure `src/city/tech/`. Per history district, by its `tech` value only, it adds Sci-Fi City wall bolt-ons, storey 1 cameras, signs, tall pieces on bare side walls, and pavement tech that keeps rule 10 and the 2 m clear walk. From tech 2/3, behind a switch, it adds shopfront panels plus the `remove`s of the dressing they cover. The kit is typed and pinned against the GLB, the stage ends on C1's `assertEraReadable`, and it is registered in `ERA_STAGES` with one line.

## Does the branch do it?
This is round 2. The round-1 review (in this file before I replaced it) had one must-fix, criterion 3's "free third". I checked commit e776825 against it. On the branch I ran `src/city/tech/` at `--maxWorkers=1`: 2 files, 28 tests, all pass. I did not run the whole suite or the typecheck, as the main session asked, because its gate is running them now.

1. **The layer.** Met, unchanged from round 1. `stage.ts` `buildTech` builds ids from plan data, and its only changes are `shops.ts`'s `remove`s. These are tested in named.test "criterion 1" and "criterion 1 and 5", and in the fixtures' shopfront and corner-shop tests.
2. **The bands.** Met, unchanged. Covered by the fixtures "three districts at tech 0.2, 0.5 and 0.8", "the band edges" and "X-6".
3. **The slots.** Now met. A new test, named.test "criterion 3, the free third", runs on all 20 named runs. It builds stage 7's boxes from the clean plan's own `facades` layers, taking the bounds from stage 7's kit tables rather than from `s7Boxes`/`boxHit`:
   - non-glass dressing, novelty and roof pieces;
   - wall pieces (party pieces skipped), their attached ladder boxes rotated by yaw, and the code escape by its own box extent.

   Every bolt-on, camera and sign must have its own span along the wall, 1.5 m out over its storey, clear of all of these. A tall piece must be clear over its whole 5 m face and its height. The test also requires more than 500 pieces checked per run, so it cannot pass with nothing to check. It checks the piece's own span, not the whole third that `walls.ts` `free()` tests. That is a little weaker than the implementation's check, but it is enough: it tests the rule's outcome (clear of stage 7) on its own terms. The other slot checks from round 1 stand.
4. **The pavement.** Met. Round 1's could-improve 1 was taken. The fixture "the walk counts a shopfront panel" now asserts that the panel takes 0.70 to 0.72 m off the clear walk, compared with the same footprint without the panel. A walk that ignored panels would fail this.
5. **The switch.** Met, on the reading given in round 1: with the switch off, pavement can differ on runs that had panels. This is still for the hand-back to put to Josh.
6. **T-1 and T-2.** Met, unchanged.
7. **Dark and textured.** Met, unchanged (techpin).
8. **The kit pin.** Met, unchanged (techpin, GLB-gated).
9. **R-1 to R-7, X-1.** Met. The stale "sources.test.ts" comment now points at `fixtures.test.ts` (round 1's could-improve 3).
10. **The numbers.** Met, unchanged (named.test "criterion 10").

## Rule conflicts and risks
- The new test in `named.test.ts` imports `../facades/dresskit`, `noveltykit`, `roofkit` and `wallkit`. It is a test file, and the source scan exempts tests, so purity holds. It does tie the test to stage 7's kit tables, but that is how it stays independent of the pass's own copies in `boxes.ts`.
- The round-2 commit message says "banned holdout and ruin imports", but the stage-folder regex in `fixtures.test.ts` (line 383) still lists only `streets|land|mass|edge|buildings|facades|ground|traffic|history`. That was round 1's could-improve 4, so it does not block, but the message overstates what changed.
- The rest is as in round 1: three test files outside the Files list were edited, all forced by the one-line `ERA_STAGES` registration. The digests move when K2 lands. No `src/grid/`, `src/night/`, `src/core/`, `puzzles/` or dependency change, and no GDD Decided rule touched.

## Must fix
none

## Could improve
1. `src/city/tech/fixtures.test.ts` line 383: add `holdout|ruin` to the stage-folder regex, as the round-2 commit message says was done.
2. Criterion 5's reading (pavement differs with the switch off on runs that had panels): put it to Josh with the hand-back, or have the ticket's wording updated.
