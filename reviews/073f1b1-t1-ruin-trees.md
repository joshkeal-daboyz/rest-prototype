ticket: 073f1b1-t1-ruin-trees
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
At the ruin era only, T-1 stops judging the crown of a tree the ruin adds (over spans, poles, lights, lamp-post places, drop ends), following Josh's "Through any dead line" and "Poles too". Solid pieces and the other eras' trees are judged as before, T-2 stays as it is, and a new function reports the crowns it no longer fails. The era comes from what is being judged (for example `assertEraReadable`'s `stage`).

## Does the branch do it?
Diff: `src/city/pipeline/readable.ts` and `readable.test.ts` only. `npx vitest run --maxWorkers=1 src/city/pipeline/ src/city/ruin/` gives 15 files and 209 tests, all passing. I did not run the whole suite or typecheck again: the main session's gate already did, per the load note.

1. **The exemption, era-scoped.** Partly met. `ReadableOptions.era?: CityEra` was added. `collect` moves a ruin add with `canopy > 0` into a new `exempt` list, but only when `o.era === "ruin"`. Test "a ruin tree over a pole, light, lamp-post place, drop end or span is no failure at the ruin era, and is each failure with no era or at another era" covers all five `what`s at ruin, tech, hold-out and with no era. The gap is in where the era comes from. The criterion says it "is read from what is being judged (for example `assertEraReadable`'s `stage` ...)", and the ticket lets `eras.ts` be edited for exactly that. `eras.ts` is not touched. `assertEraReadable(plan, "ruin", layer, opts)` still passes `opts` through with no era, so the check the ruin pass actually runs (`src/city/ruin/stage.ts:69`) still throws on a ruin tree's crown over the circuit. As built, the exemption only exists for a caller who sets `era: "ruin"` by hand. Must fix 1.
2. **Only trees.** Met. The test "only trees: a solid ruin add ... fails, and so does a key that is not a tree under options.isTree" shows four solid boxes still failing at ruin, and a `Tree_Dead_01` key with an `isTree` that rejects it still failing `pole`. A hold-out tree judged at the ruin era is still judged (its own test), because the exemption is limited to `resolved.adds.ruin`.
3. **T-2 unchanged.** Met in behaviour. Exempt trees are put back into `closedCells` (`[...clean, ...judged, ...exempt]`), so a trunk still closes ground. The test "T-2 still holds: a ruin tree's trunk that seals a one-cell street between two poles fails" asserts the `pole:b` T-2 failure at ruin. Strictly, the criterion says "`t2Failures` is not edited", and one line of it was edited to add `exempt`. The effect is the same set, so I list this as could-improve, not must-fix.
4. **Reported, not failed.** Met. `t1RuinTreeCovers` runs `judge` over `exempt` with `era: "ruin"` forced, and returns `[]` for an empty circuit, the same split as `t1CleanClashes`. Its test checks that all five `what`s are listed, that only `ruin:t:` trees appear (the solid box is left out), and that it returns nothing for a clear tree and for an empty circuit.
5. **Nothing else moves.** Met as far as I ran it. The existing `readable.test.ts` cases are unchanged (the diff only adds lines), and `eras.test.ts` and the ruin tests pass. With no era set, behaviour is identical. `t1CleanClashes` is untouched. No digest or pin file changed.

## Rule conflicts and risks
- No hard rule broken: the files are inside the ticket's list, there is no new dependency, the code is pure TypeScript with no DOM or timers, and nothing touches `src/core/`, `src/grid/` or `src/night/`.
- Risk, which is why Must fix 1 matters: F1b2 may only touch `src/city/ruin/`, and its criterion 2 expects the stage "does **not** throw (F1b1's exemption)". If the era is not passed in `assertEraReadable`, F1b2 has to add `era: "ruin"` to its own options. That works by accident of the caller, not by "the era being judged", and any other ruin caller of `assertEraReadable` would still fail Josh's ruling.
- `options.era` and the resolved era can disagree, for example `era: "ruin"` on a plan resolved at hold-out. This is harmless today because `adds.ruin` is then empty. Deriving the era from `stage` removes the question.

## Must fix
1. `src/city/pipeline/eras.ts`, `assertEraReadable`: pass the stage as the era judged, for example `const opts = { ...options, era: stage };`, and use it for both `t1Failures` and `t2Failures`. Add a test in `readable.test.ts` (or `eras.test.ts`) that `assertEraReadable(plan, "ruin", layer)` does not throw for a ruin tree whose crown covers a pole and a span, and still throws `T-1` for a hold-out tree over a pole judged at `"holdout"`. Effect: the check the ruin pass already runs carries out Josh's "Poles too" ruling without each caller having to remember to set the era.

## Could improve
1. `readable.ts`: keep the ruin trees inside `judged` (or mark them on `Placed`) and filter them out in `t1Failures` only. That leaves `t2Failures` byte-for-byte as it was, which is what criterion 3 literally asks for.
2. The `t1Failures(..., era: "ruin")` assertion in the T-2 test passes on its own, because that tree's crown covers nothing in that circuit. Either drop it or move a pole under the crown, so it shows "exempt crown or not" and is not just an empty circuit.
