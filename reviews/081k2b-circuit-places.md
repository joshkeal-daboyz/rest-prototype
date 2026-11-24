ticket: 081k2b-circuit-places
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Ticket 081, section K2b: stage 6 also lays drops (CK9), street lights (CK10) and lamp-post places (CK11), with fixture checks for each. It adds `nodePlaceProblems(layer, places)` for CK12's table (roof places wait for K2d), re-takes the circuit digest pin, and makes `keep` hold every pole and light. Files: `src/city/circuit/` only.

## Does the branch do it?
Reviewed `git diff origin/main...HEAD` (3554e21). I ran the four changed test files with `npx vitest run --maxWorkers=2`: 4 files, 48 tests, all green.

1. **CK9, 2 fixture cases. Met, but one of the two is a near-duplicate (must-fix 2).** `layDrops` (`places.ts`) follows the note. It takes the closest pair of a front column and a non-crossing pole on the building's own block side, and only when that side is the pole pavement. Ties go to the earlier column, then the earlier pole: columns are visited in `cells` order, poles are sorted by `along_m`, and the comparison is strict. The wall point is the centre of the column's front edge at 5.5 m. `placeProblems` (`checkplaces.ts`) checks the own-side pole, `DROP_MAX_M`, the 5.5 m height and a front column that faces a street, so a building facing a park fails. It also checks that every pole-line building has a drop. Case "CK9: a drop from a pole across the street fails…" tampers the seed-1 layer and covers the note's first Fails line plus the length and the missing drop. The second case, "CK9: every drop is pole-side…; seed 1's pass", only re-asserts what R-1 already asserts.
2. **CK10, 2 fixture cases. Met, with the same near-duplicate.** `layLights` uses CK2's end-slot and pitch layout on the non-pole pavement. It takes odd slots only, skips forbidden cells, and skips anything within 3 m of a pole, which also covers "a slot that holds a pole". Case "CK10: a light at a crossing pole's spot fails…" is the note's Fails line. "CK10: seed 1's lights keep 3 m…" is a pass re-assertion.
3. **CK11, 1 fixture case. Met.** `layPosts` puts a post at the midpoint of every along span of 7.5 m or more. The checker rejects a post off the midpoint, a post on a short or non-along span, a qualifying span with no post, and a post at a street light's place. The case tests a post moved off the midpoint and one on a corner span.
4. **CK12, 3 fixture cases. Met.** `nodePlaceProblems` covers the table:
   - attachments are spans plus drops;
   - breaker, battery and fusebox need 2 or more, a switch 3 or more (relay and spring are switch flags, so they are covered), and a junction or feed may stand on any pole;
   - a lamp only on a building that has a drop, or on a post place;
   - one node per place.

   Three cases: a switch on a 2-attachment pole (fails) and on a 3-attachment pole (passes), a breaker on a building (fails), and two nodes on one pole (fails).
5. **Digest pin re-taken. Met:** `973fef66` to `a6b0af56` in the R-1 case.
6. **`keep` holds every pole and light. Met:** `buildCircuit` builds `keep` from poles plus lights, and the "keep holds every pole and every street light" case checks the length and each entry.

**Test count against main:** 9 cases added in `circuit.test.ts`, plus 4 rewritten (the R-1 pin, the tech criterion-9 pin, the hold-out pin case and the ruin growth pin case). That is 13, under 15.

**Purity:** `src/grid/` and `src/night/` are untouched. `places.ts` and `checkplaces.ts` import only `../../core` and the folder's own modules. The `check.ts` and `checkplaces.ts` cycle is type-only on one side. There is no new dependency.

## Rule conflicts and risks
- **Files outside the ticket's list.** K2b's Files line is `src/city/circuit/`. The branch also re-takes pins in three folders the ticket does not list: `src/city/holdout/named.test.ts` (settle `1d4f5972` to `d9948fee`), `src/city/ruin/named.test.ts` (growth `24c55727` to `f75f2d1b`) and `src/city/tech/named.test.ts` (`365c9ce6` to `1873844c`, plus its case title). The moves are real and expected: the hold-out and ruin passes now keep clear of lights, drops and lamp places through `circuitPoints`. Only the pin lines changed, nothing else in those files. But K2a2 listed exactly these files to make the same kind of edit legal (test policy rule 6), and K2b lists none.
- `circuitProblems` judges CK9 to CK11 only when the layer has all three lists. A `Pick<…, "poles" | "spans">` caller silently skips them. That is fine for the K2a fixtures, but worth knowing.
- The CK9, CK11 and CK12 numbers (`DROP_MAX_M`, `POST_MIN_SPAN_M`, the attachment counts) are still marked Proposed in the note. The branch keeps them as proposed constants and does not decide them. No GDD Decided rule is changed.

## Must fix
1. **The three pin files outside `src/city/circuit/` need to be in scope.** `tickets/081-puzzles-on-the-city.md`, K2b's **Files** line, should list `src/city/holdout/named.test.ts`, `src/city/ruin/named.test.ts` and `src/city/tech/named.test.ts`, pin lines only, as K2a2 did. Criterion 5 should count 4 rewritten, not 1. The alternative is that those edits come out of the branch, but then CI goes red, so the architect's amendment is the fix. No code change is expected.
2. **Two near-duplicate cases in `src/city/circuit/circuit.test.ts`** (test policy, near-duplicate).
   - "CK9: every drop is pole-side, short, 5.5 m up, and meets a front column; seed 1's pass" and "CK10: seed 1's lights keep 3 m from every pole and stand on allowed cells" each assert that `circuitProblems(layer, input)` has no CK9 or CK10 problems. The R-1 case already asserts `circuitProblems(layer, input)` is `[]`, and `circuitProblems` now includes `placeProblems`. The stage also throws on any problem.
   - The extra assertions don't change that. `y_m === 5.5` and the `drop:` id are checked by `placeProblems` itself. A non-empty `drops` list is forced by CK9's "no drop" check.
   - Either delete both cases, or turn each into a fail fixture the first case doesn't cover. For CK9 that is a drop to a building that faces a park (the note's second Fails line). For CK10 that is a light on a cell CK3 forbids.
   - Expected effect: each remaining case fails on a broken rule that no other case catches.

## Could improve
1. The `stage.ts` header still says "Reads `streets` and `edge`", and `buildCircuit`'s doc says "poles and spans from the streets and the edge". Stage 6 now reads `mass` and `buildings` too.
2. The CK11 case opens with another whole-layer `filter(rule === "CK11")` pass assertion that R-1 already covers; drop that line. Its fixture could also test the note's own Fails line, a puzzle lamp at a street light's place, which the checker implements.
3. The builder's reply could give seed 1's drop, light and post counts against the note's 250, 113 and 386, so the layout is known to match K1's probe. I did not check these numbers.
