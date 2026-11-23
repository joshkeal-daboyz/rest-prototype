ticket: 073f1b1-t1-ruin-trees
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
At the ruin era only, T-1 stops judging the crown of a tree the ruin adds, whatever it covers: spans, poles, lights, lamp-post places and drop ends (Josh's "Through any dead line" and "Poles too"). Solid pieces and the other eras' trees are judged as before, T-2 stays as it is, and a new function reports the crowns T-1 no longer fails. The era comes from what is being judged (`assertEraReadable`'s `stage`).

## Does the branch do it?
Round 2. The F1b1 commits are 3296013 and 34ab95f. They change `src/city/pipeline/readable.ts`, `readable.test.ts`, `eras.ts` and `eras.test.ts`, all on the ticket's list. At the branch head (75f4171), `npx vitest run --maxWorkers=1 src/city/pipeline/ src/city/ruin/ src/render3d/ruinpin.test.ts` gives 16 files and 224 tests, all passing. `npx tsc --noEmit` is clean. Per the load note, I did not run the whole suite.

**Round 1's must-fix 1 is done.** `assertEraReadable` now builds `{ ...options, era: stage }` and passes it to both `t1Failures` and `t2Failures` (`eras.ts`). The new `eras.test.ts` case shows three things:
- `assertEraReadable(ep, "ruin", ...)` with a ruin tree over a pole and one over a span does not throw, and returns both adds.
- A solid ruin box over the pole still throws `T-1`.
- A hold-out tree over the pole still throws `T-1` at `"holdout"`.

So `src/city/ruin/stage.ts:69` now carries out the ruling without the caller setting the era.

**Both of round 1's could-improves were taken.**
- Exempt trees stay in `judged` with an `exempt` flag, and only `t1Failures` filters them out. `t2Failures` is unchanged from the base.
- The T-2 test now has `pole:c` under the crown. It fails `pole` with no era and passes at `"ruin"`, so "exempt crown or not" is actually exercised.

The criteria:
1. **The exemption, era-scoped.** Met. `ReadableOptions.era?: CityEra` is added. `collect` flags a ruin add with `canopy > 0` only when `o.era === "ruin"`. The test "a ruin tree over a pole, light, lamp-post place, drop end or span is no failure at the ruin era ..." covers all five `what`s at ruin, tech and hold-out, and with no era. The era is read from `stage` (above). No era judges as before.
2. **Only trees.** Met. In the test "only trees: ...", four solid ruin boxes still fail at ruin. A `Tree_Dead_01` key that `isTree` rejects still fails `pole`. The flag is limited to `adds.ruin`, so a hold-out tree judged at the ruin era is still judged (its own test).
3. **T-2 unchanged.** Met, now literally: `t2Failures` is not edited, and exempt trees reach it through `judged`. The test asserts that `pole:b` is sealed at ruin while a crown sits over `pole:c`.
4. **Reported, not failed.** Met. `t1RuinTreeCovers` judges only the flagged trees, with `era: "ruin"` forced, and returns `[]` for an empty circuit (the `t1CleanClashes` split). Its test shows all five `what`s and only `ruin:t:` ids (the box is left out). It also shows nothing for a clear tree and nothing for an empty circuit.
5. **Nothing else moves.** Met at the branch head. The existing `readable.test.ts` and `eras.test.ts` cases are unchanged, and so is `t1CleanClashes`. No clean, tech or hold-out digest moves, and the F1b1 commits change no pin. On 34ab95f alone, see the risk below.

## Rule conflicts and risks
- No hard rule broken. The files are on the ticket's list, there is no new dependency, the code is pure TypeScript, and nothing touches `src/core/`, `src/grid/` or `src/night/`. No GDD Decided rule changes; this is the era check Josh ruled on.
- **34ab95f must not merge on its own.** Now that the era is passed, three F1 tests that expected a throw stop throwing:
  - `grow.test.ts`, "with the under-span constant true ... the stage throws";
  - `grow.test.ts`, the birch `toThrow(/T-1/)`;
  - `stage.test.ts`, "with the under-span constant on, the same city throws".

  F1b2's 75f4171 replaces all three, as F1b2 criterion 2 says. The ticket's order ("F1b2 after F1b1 merges") would leave a red `src/city/ruin/` between the two merges, so merge the branch head as one unit. I read this from the code at 34ab95f and did not run it there.
- `options.era` can still disagree with the resolved era for a direct `t1Failures` caller. That is harmless: `adds.ruin` is empty below the ruin era.

## Must fix
none

## Could improve
1. `readable.ts`: `t1RuinTreeCovers` repeats `t1Failures`' empty-circuit guard. A shared one-line helper would keep the two in step.
