ticket: 081-K2c-circuit-convert
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
K2c adds `convertCityPuzzle(cityPuzzle, plan)`, which checks a city puzzle against the circuit layer (CK13 as Josh changed it, CK14's district, CK12's places) and turns it into a plain `Puzzle` that `src/grid/` runs unchanged (CK15 steps 1 to 6), with the places, runs, cut spans and origin passed alongside for the 3D view. Carrier poles never become nodes. `city-two-ways-round` is written as a `.city.json` fixture and has to replay the same as its schematic.

## Does the branch do it?
I reviewed against origin/main. The builder's own commit (daa6997) touches only `src/city/circuit/`: `checkpuzzle.ts`, `convert.ts`, `convert.test.ts`, `fixtures/city-two-ways-round.city.json` and `index.ts`. `convert.test.ts` passes locally, 10 tests in 1.4 s.

1. **CK13 as changed (`runProblems`, `checkpuzzle.ts`).** Mostly met.
   - The chain joins end to end from the `from` pole to the `to` pole, the drop or the lead. Code: the `cur` walk.
   - No two lines share a span: `claim`, which also covers drops and leads.
   - A fault's span is in its line's run: the loop over `faults` at the end.
   - Tests: "a run that goes along, round corners on carriers and on is valid" (`l_n`, 13 spans through two corners), "a run with a span missing from its chain fails at the gap", and "two lines on one span, and a carrier that holds a node, fail". These are the three cases the ticket asks for.
   - Gap: the "carrier holds no node" check runs only at poles between two spans (`k < run.spans.length - 1`). On a run that has spans and then ends in a drop or lead, the pole the drop or lead hangs from is also a pole between the line's two ends. Its `to` node is the building or post, so that pole is a carrier, and it is never checked. See Must fix 1. The fixture has no such run: every drop line there has `spans: []`. So this is a gap in the rule, not a case I saw on the city.
2. **CK14 (`districtProblems`).** Met for what K2c can do before roofs are typed.
   - The blocks touch: `touching`, a search over `sides[*].across`.
   - Lines use only spans with both poles on district blocks, except the feed line's spans with one pole inside.
   - Each feed stands outside, has one line, and that line has exactly one entering span.
   - Drops and lamp posts are inside the district.
   - Tests: "a district of blocks that do not touch fails" and "a pole line that runs on past the district's edge fails". The second is the stand-in the ticket names while the neighbouring-roof case waits for K2d.
3. **CK15 steps 1 to 6 (`convert.ts`).** Met.
   - Steps 1 to 5: fields copied, `place`/`run`/`span` stripped, ids unchanged, `pos` worked out from metres and rounded to 4 decimals.
   - Step 2: the origin is the least corner over the district's side streets.
   - Step 6: decor for unused spans and drops that touch district poles.
   - The output goes through `validatePuzzle` and throws on failure.
   - Tests: "CK15 steps 1 to 6..." (ids equal to the file's, origin (245, 210), four nodes' `pos` within 1e-4) and "the cut spans, the places and the scenery go beside the puzzle..." (cuts, runs, places, decor).
4. **Plays the same.** Met. The fixture's corner junctions are carriers: `l_n`, `l_e2` and `l_x` bend on carriers. "plays the same..." runs the note's check block on both the schematic and the converted puzzle and asserts the reports are equal and ok.
5. **A problem names the item and the rule.** Met. `CircuitProblem { rule, id, reason }`, and `CityPuzzleError` lists them all. Test: "a problem names the line and the CK rule...".
6. **No `src/grid/` import.** Met. The grep test covers the non-test `.ts` files in `src/city/circuit/`, and I read the imports of the two new files: core and local modules only.

**The check the ticket does not list: "a carrier pole carries only one run".** It is a safeguard that follows from the existing rule, not a new rule. CK13 as changed says the poles between are carriers that "hold no node of the job, and the job uses no other attachment there". If a second line's run passes through line A's carrier, the job uses other attachments (that line's spans) at that pole, which breaks the second half of the rule as written. CK13 in `docs/design/070-K1-circuit.md` puts the same thing as "whatever else hangs there is scenery". The check also covers nothing beyond that:
- it lets a line pass its own carrier twice;
- a line that ends at the carrier is already caught by "holds node".

I don't think it needs Josh's word. No test covers it, and the ticket does not ask for one.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. `src/city/circuit/` stays pure: no DOM, timer or three, and it imports only `../../core` and local modules.
- No new dependency. No GDD Decided rule is changed. The CK14 roof exception is correctly left to K2d.
- The pull request's diff against main also holds `.claude/launch.json` (the 5201 entry moved to the D2 worktree) and a `tickets/081` line about I2's owner. Both come from goal-branch commits (ec67035, dcf2108), not from the builder. They are outside `src/city/circuit/`, so they are worth knowing about when it merges, but they are not the builder's to fix.
- `convert.test.ts` imports `tools/checkrun` (`runCheck`). That is test-only, and it is how criterion 4's replay is meant to be done, but it is the only test under `src/city/` that reaches into `tools/`.
- Test policy: 10 new cases, none rewritten. The whole-city check is 6 x 6 seed 1, one-way on. Nothing report-only, no 20-city check, and the file is under 2 s. The plan is built with `runCity` in `beforeAll`, not through `src/city/testing/cache.ts`. That is the same as the existing `circuit.test.ts`, so it is not a break here.

## Must fix
none

## Round 2
The first round's one must-fix was addressed in c06d329 and db64232, and I checked both commits against origin/main. Nothing else in `src/` changed since round 1: the only diff from f7919e3 is these two commits.

- **The fix (`checkpuzzle.ts`, `runProblems`).** The carrier checks now also run after the last span when the run ends in a drop or lead: the condition is `k < run.spans.length - 1 || run.drop !== undefined || run.lead !== undefined`. Both checks run there: "holds node" and "also carries". A run that ends on a node's pole is still left unchecked at its last pole, which is right because that pole is the line's end, not a carrier. The pole checked is `cur` after the last span, and the later drop/lead check requires that same pole, so the check lands on the pole the drop or lead hangs from.
- **The test (db64232).** The assertion is inside the existing "two lines on one span, and a carrier that holds a node" case, so the count stays at 10 new cases, none rewritten. It moves `l_homes`'s drop to the far end of one span from its start pole and gives that line the span. It puts a junction `j_end` on that pole and expects `l_homes` to report "holds node j_end". Against the old condition, a one-span run checks no pole (`k < 0` is false), so the assertion fails on the unfixed code. It is a real test of the rule.
- **Nothing new is broken.** The fixture's valid-run case still passes, so the wider check finds no false carrier on `city-two-ways-round`, where every drop line has `spans: []`. `npx vitest run --maxWorkers=2 src/city/circuit/convert.test.ts`: 10 passed, 1.07 s of tests. `src/city/circuit/` is still pure, and the branch has no new imports.

## Could improve
1. `convert.test.ts`, the CK15 positions case: check every node's `pos` against its place's metres read from the layer (pole, drop wall point, post midpoint), not four hand-copied coordinates. That way the 1e-4 check covers every node, as CK15's K2 check says.
2. The fault-span part of criterion 1 and the "carrier carries one run" safeguard have no test. One assertion each could go into an existing case without raising the count.
3. `districtProblems` uses `layer.drops.find` inside the line loop, while `runProblems` builds a map. That is a small inconsistency and does no harm.
4. (round 2) Under the fix, two lines whose spans each end at one pole with a drop on it now report "also carries". That matches CK13 as written ("the job uses no other attachment there"), and no fixture line does this. It is worth knowing if a later puzzle wants two drops off one span-fed pole.
