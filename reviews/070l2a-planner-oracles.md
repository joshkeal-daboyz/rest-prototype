ticket: 070l2a-planner-oracles
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section L2a of `tickets/070-city-pipeline.md`: no file under `src/city/streets/`, `land/`, `mass/` or `pipeline/` imports an old-path module (`tilecity`, `tilecity3d`, `tileslots`, `kerbline`, `frontage`, `parkmetrics`), and a new grep test keeps it that way. Every check those tests made still holds, now against typed fixtures taken at b42b65f (rule LR: no check loosens). Josh sees no change.

## Does the branch do it?
1. **The grep.** Met. `src/city/pipeline/oldpath.test.ts` scans every `.ts` file in the four folders for `from`, `export ... from` and dynamic `import(...)` specifiers that contain `render3d/` and end in one of the six module names, with or without `.ts`/`.js`. The first `it` runs it on synthetic sources: each module, in all three import forms, must be caught, and `render3d/town` must not be. That is the "a fixture with such an import fails it" clause. The four folders have no subfolders today, so the non-recursive `readdirSync` covers every file. I grepped by hand as well: the only `render3d` lines left in the four folders are doc comments, plus `lots.test.ts`'s `TERRACE_BAYS` import from `town`, which the ticket keeps.
2. **`streets/equal.test.ts`.** Met. The 16 cities (3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 6) are unchanged. The three comparisons (streets, the reduced blocks, each street cell's base role with its street) are now `stableHash(canonicalJson(...))` digests checked against `src/city/streets/oldpath.fixture.ts`, a typed `Record<string, OldLatticeDigest>`. The ticket allows "a digest per city of the compared values". I checked the fixture myself rather than trusting it. `tilecity.ts` has no diff between b42b65f and HEAD. I rebuilt the old `tileCity` for all 16 cities with the old `BASE` role map and the 2-cell expansion, hashed them the same way, and got all 48 digests in the fixture exactly. I also changed one cell of the new layer and the cells digest changed, so the check does detect a difference. The old comparison of Maps ignored order; the new one sorts the entries, which is the same check. Dropping the 120 s timeout is right: it was there only because the test built `tileCity` 16 times, and now it runs `layStreets` alone. The `got.size === layer.cells.length` "every street cell once" assertion is kept.
3. **Constants typed in.** Met. `parkplaces.test.ts` has `TILE_CITY_PARK_ONE_IN_BLOCKS = 6` (line 227), and `reach.test.ts` has `TILE_CLEAR = 1` (line 112). `lots.test.ts` has `OLD_CLEAR`, `OLD_PPH` 0.15, `OLD_HCF` 2, `OLD_UFN` 3, `OLD_LOTS` 2, `OLD_STALLS` 2 x 3, `OLD_BAND` {0.75, 1.5}, `OLD_COURT` {2, 3}, `OLD_DRIVE` 2 and `OLD_FRONT` 1/9. I checked every value and line number against `git show b42b65f:src/render3d/tilecity.ts`, and they all match. The aliases keep their old names, so no assertion line changed, and P2's two recorded exceptions (`PARK_PER_HOME` 0.075 against 0.15, and `PARK_SUPPLY_BAND`) read exactly as before.
4. **`land/stage.test.ts`.** Met. In the base file, `oldPlanBlocks` and the `oldBad` count fed only the `console.log` table of the criterion 4 report. The only assertion in that `it` is `expect(rows).toHaveLength(NAMED.length + 1)`, which is kept. So the ticket's first branch applies: the three old columns go, and the `it` is renamed. No assertion loses strength.
5. **Nothing else moves.** Met. No digest pin, threshold or non-test file changed. The main session's gate was green (4266 passed). I re-ran the five light files on the branch (oldpath, equal, parkplaces, reach, lots): 99 passed. Following the instruction, I did not re-run the heavy `stage.test.ts` or the full suite.

## Rule conflicts and risks
- None found. Only test files and one test-only fixture are touched, all in the four folders the ticket names. There is no new dependency, no Decided rule is touched, `src/grid/` and `src/night/` are not touched, and no locked puzzle is touched.
- LR holds. No check loosens: each oracle became a typed value or a digest that I reproduced independently from the old code.
- I could not check the second half of criterion 4, "the report says so", or LR's list of deleted and re-pointed `it`s, because those belong to the builder's report, which I was not given. The commit message says neither. From the diff, the only `it` changed is the stage-2 "criterion 4 report" `it`, which was renamed and lost its old-path columns. No `it` was deleted.

## Must fix
none

## Could improve
1. `src/city/pipeline/oldpath.test.ts`: walk the four folders recursively, or add `expect` that they have no subfolders. Then a future subfolder cannot slip past the grep without anyone noticing.
2. `src/city/streets/equal.test.ts`: when a digest fails, the test only shows two numbers. A one-line comment saying "on a mismatch, check out b42b65f and diff against `tileCity`" would help whoever has to debug it after L2d deletes the old code.
3. The main session should confirm that the builder's report lists the renamed stage-2 `it` and says the old columns were dropped (criterion 4 and LR). The commit message records neither.
