ticket: 081-I2-ground-clears-circuit
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 8 (ground dressing) takes stage 6's `circuit.keep` (every pole and street light) as its keep-point list, so that no ground prop stands within `FURN_KEEP_M` of one. The digests this moves are re-taken once and listed with their old and new values: stage 8's own pins, traffic's ground and stage 9 pins, and the tech, holdout and ruin tripwire pins. The PR adds 2 cases and rewrites 7 or 8.

## Does the branch do it?
1. **Stage 8 reads `layers.circuit.keep` into its keep-point list.** Met. `src/city/ground/stage.ts` gets a new `keepPointsOf(keep)`, which maps `CityCircuitKeep` to `KeepPoint` and returns none when there is no circuit layer. `run()` passes the result both to `buildGround` and to `groundFailures`, so the R10 keep-out check now judges against the real poles and lights. Before this, it was checking against an empty list. The fixture case is in `src/city/ground/fixtures.test.ts`: "I2: stage 8 reads circuit.keep into its keep-point list...". It turns a pavement prop's own spot into a keep point and asserts that no prop of the rebuilt layer lies within `FURN_KEEP_M` of it. Without the keep-out that spot would be occupied, so the case fails if the rule breaks. The fixture case calls `buildGround` directly, so it does not prove that `run()` does the wiring. Two other things do: the rewritten R-7 case in `src/city/ground/stage.test.ts` (its read set now includes `circuit`) and criterion 2's case.
2. **On seed 1, no stage 8 piece within `FURN_KEEP_M` of a pole or light.** Met. `src/city/ground/stage.test.ts` "I2: on seed 1 (6 x 6, one-way on)..." runs the default city and asserts that `circuit.keep` is not empty. It then checks every ground prop's rectangle against every keep point. This covers all prop kinds (pavement, lane bins, greens, lots), not only pavement. It takes about 4 s, which is a whole-city run, but the criterion asks for one, and the case sits in an existing file.
3. **Digests re-taken once, listed old and new.** Met:
   - Stage 8 pins: d416b18f to 7f01ba46, ded91113 to 8e10c8e7, 946265fd to f2fe9c97, e4bb5275 to 3d7f06f1.
   - Traffic, one case: the ground pins as above. The stage 9 pins on seeds 2, 3 and 8 move (to b044bc91, f8203309, 8d9be3b4). Seed 1's 784fd70b does not move, and commit a60db73 says so.
   - Tech: 1873844c to 7c991996.
   - Holdout: settle d9948fee to aa731cfa; power is unchanged.
   - Ruin: f75f2d1b to 080ddf44.

   The old and new values are listed in commits a60db73 and 03f3e0f. Each re-take changes only the digest values, as the Files line allows. The R-7 read-set case and the "no file reads ... the circuit layer" case are the "stage 8's own pins (3, as built)" the ticket counts. The second of these now allows only `layers.circuit?.keep`, through the negative lookahead `layers\.circuit(?!\?\.keep\b)`, which still bars every other read of the circuit layer.

**Test count against main:** 2 added, 7 rewritten (stage 8 pins, R-7, no-file-reads, traffic pins, tech, holdout, ruin). That makes 9, within the ticket's figure and the cap of 15.

**Run:** I ran the six changed files in full (`npx vitest run --maxWorkers=2`), and 71 of 71 passed. A first run filtered with `-t` failed 3 pin cases in ruin and holdout with `{}` results. This happened because those pin cases depend on earlier cases in the same file that the filter skipped. They pass when their files run in full, so it is not a finding.

## Rule conflicts and risks
- The `src/city/ground/` changes stay in landscape's folder. The test-value edits in traffic, tech, holdout and ruin are values only, as the ticket's Files line allows. No new dependency, and no `src/grid/` or `src/night/` change.
- `.claude/launch.json` shows in the diff against `origin/main` (the 5201 entry is repointed at `D:\rest-081d2`). It came in from the parent branch `ticket/081-puzzles-on-the-city` (commit ec67035, the main session's tooling), not from the builder. It is outside the ticket's files. It does not block, but it should not reach `main` by accident.
- Stage 8 now depends on stage 6's output. Any later change to the circuit's poles or lights (K2c, K2d) will move the ground digests and every pin downstream of them. This is expected, but those sections should plan for it.

## Must fix
none

## Could improve
1. `src/city/ruin/named.test.ts` and `src/city/holdout/named.test.ts`: the doc comments above `PIN_GROWTH` and `PIN_PARTS` keep a re-take history ("re-taken in 081 K2a2 ... and in K2b ..."). Add the I2 entry (f75f2d1b to 080ddf44; d9948fee to aa731cfa) so the history in the file stays complete. The ticket's Files line allows digest values only, so this may need the architect's word first.
2. The criterion 1 case sits inside the `describe("the failing fixtures (criterion 7)")` block, but it is not a failing fixture. Moving it to its own `describe` would read more clearly. This is cosmetic.
3. Drop the `.claude/launch.json` change from this PR, or make sure it is intended, before the merge into `main`.
