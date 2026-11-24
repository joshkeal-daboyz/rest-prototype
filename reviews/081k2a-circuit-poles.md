ticket: 081k2a-circuit-poles
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section K2a: a pure stage 6 in a new `src/city/circuit/` that lays the city's poles, spans and `keep` by CK1 to CK6 and CK8 of `docs/design/070-K1-circuit.md`, with its own checks. It is a stage definition the runner can take but is not yet in `BUILT_STAGES`. `circuitPoints` reads the layer when there is one. At most 9 test cases, and no test outside the circuit folder changes.

## Does the branch do it?
The builder's own diff against the cut branch (`ticket/081-puzzles-on-the-city`) is 8 files: `src/city/circuit/{constants,geometry,lay,check,stage,index}.ts`, `circuit.test.ts`, and `src/city/pipeline/readable.ts`. Everything else in `main...HEAD` (the `src/core/citycircuit.ts` types, `cityplan.ts`, `core/index.ts`, the ticket files, `.claude/agents/grid-simulator.md`) comes from the architect's cut, which the ticket's Files section lists.

1. **A pure stage with a digest and a picture.** Met. `stage.ts` `buildCircuit` is a pure function of `streets` and `edge`. `run` throws `CityStageError` when `circuitProblems` finds anything, and `picture` uses `makePicture` on the lattice. The test "R-1 to R-7..." checks that the layer is frozen, has no picture problems, digest equals `digestOf(layer)`, the pin is `18c6a048`, and seed 1 has no problems. One gap: the test runs the `edge` profile (stages 1 to 4) plus the circuit stage, not stages 1 to 5. Stage 6 reads only `streets` and `edge`, so the layer and the digest are the same either way. Could-improve 1.
2. **CK1, CK2, CK3.** Met, with 3 fixture cases.
   - CK1: a street's non-crossing poles are flipped to the other pavement.
   - CK2: the design note's Fails line, a last slot 9 m in (moved 6.5 m inward from 2.5 m). The test asserts the `<block> <side>` id.
   - CK3: a pole on a `pavementDip` cell.
   - The checks are in `check.ts`. Pole pavement is checked against `polePavement`, the 0.75 m kerb offset per pole, the end slots at 2.5 m from both span ends, along spans at most 20 m, and `allowedCell` per pole.
   - `geometry.ts` `polePavement` matches CK1's three cases: edge street inner pavement; the side away from the parking band, read from the edge cells and not from `bands` order; the traffic's left on a bare street.
3. **CK4, CK5, CK6.** Met, with 3 fixture cases.
   - CK4: an along span that skips a pole.
   - CK5: a corner span between two blocks' end slots (the Fails line).
   - CK6: a "crossing" from one block's end slot straight on over the junction to the next block's (Q45's Fails line).
   - `check.ts` also checks that every block corner with a pole line has its corner span at 9.55 m, and that every open end has its crossing: square to the street, as long as the carriage plus 1.5 m, over no junction or crossing cell.
4. Moved to K2d. Nothing is expected here, and the branch has no CK7 code.
5. **CK8, one network.** Met. The union-find in `check.ts` reports more than one root. The test checks that seed 1 gives no CK8 problem, and that it fails with the crossings removed (the Fails line).
6. **Counts, no test.** I rebuilt 6 x 6 seed 1, one-way on, with a scratch script outside the repo. It gives 562 poles (478 slots and ends, 10 landings, 74 crossing poles), 126 corner spans, 74 crossings and 49 nudged, which matches the ticket. There are 399 along spans, which matches the note's length bands (13 + 14 + 332 + 31 + 9). The longest along span is 18 m, against the note's 18.5 m. That is within the 20 m limit and not a criterion.
7. **`circuitPoints`.** Met. The body reads poles, lights, posts, drops and spans when `plan.layers.circuit` exists, and returns `EMPTY_CIRCUIT` otherwise. The one case checks the layer path: pole count, line count, and the first segment's endpoint. The empty path is not asserted in the new case (could-improve 2). Until K2a2, every existing readable test runs on a plan without the layer, so those tests exercise it.
8. **No test outside `src/city/circuit/` changes; `src/city/stages.ts` unchanged.** Met. The only non-circuit file is `readable.ts`, and the diff does not touch `stages.ts`.

**Gate.** `npm run gate` passed typecheck. Vitest ran 185 files, because the cut's `src/core/` changes reach most of the suite, and 3801 of 3802 tests passed. The one failure was a 5 s timeout in `src/render3d/stacks.test.ts` ("the angled face is on the corner ... eleven ladder maps"). That file is not on this branch. Re-run alone with `circuit.test.ts`, both pass: stacks takes 8.3 s, and circuit's 9 cases take 0.54 s after its one city build. I read the timeout as machine load, not this branch.

**Test policy.** 9 new cases against main, 0 rewritten, which is at or under the ticket's 9 and the cap of 15. The whole-city cases use 6 x 6 seed 1, one-way on, as the ticket names. Each rule is a tamper of that real layer, as test policy rule 2 and the ticket allow. There are no report-only tests and no 20-city check, and no case duplicates an existing test.

## Rule conflicts and risks
- No hard-rule break found. `src/grid/` and `src/night/` are untouched. `src/city/circuit/` imports only `../../core` and `../pipeline/*` (inside `src/city/`), with no DOM, canvas, three or timers. No dependency is added, and no GDD Decided rule changes.
- The pull request into main also carries the architect's cut commits (core types, ticket text, the agent file). That is expected from the merge of `ticket/081-puzzles-on-the-city`. It is noted here only so the main session knows the PR is wider than the 8 builder files.
- `check.ts` imports `poleId`/`spanId` from `lay.ts`, and `lay.ts` imports the `CircuitInput` type from `check.ts`. This is a type-only cycle and harmless.

## Must fix
none

## Could improve
1. `src/city/circuit/circuit.test.ts`: criterion 1 says stages 1 to 5 "through the module cache". The test calls `runCity` itself on the `edge` profile (stages 1 to 4) plus `circuitStage`. That gives the same layer, because stage 6 reads only streets and edge. If K2a2 or K2b starts reading `buildings`, building from the cached `sharedCity(..., "buildings"/"edge")` would save a city build and match the ticket's words.
2. `circuit.test.ts`, the `circuitPoints` case: add one line asserting that a plan without `layers.circuit` gives `EMPTY_CIRCUIT`. That puts both halves of criterion 7 in the one case without adding a case.
3. `circuit.test.ts`, CK3 case: `c.variant === 16` would read better as `CITY_GROUND_VARIANT.pavementDip` (a variant with other bits set would also be missed).
4. `check.ts`: the literal `0.75` (per-pole offset) and `+ 1.5` (crossing length) duplicate `POLE_FROM_KERB_M`. Using the constant keeps the check and `lay.ts` in step if the number changes.
5. `readable.ts`: the ticket says "its body only", and the module doc comment line about where the points come from also changed. The new line is accurate, so this is cosmetic.
6. `readable.ts` `circuitPoints`: a span or drop whose pole is missing silently maps to (0, 0). The stage's CK8 check already rejects that, so this matters only for hand-built fixtures. A thrown error would be clearer than a point at the origin.
