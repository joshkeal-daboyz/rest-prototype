ticket: 070l1-switch
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
L1 of ticket 070. `city=tiles` (without `sheet=1`) now opens the pipeline's assembled city, the same view as `city=plan&stage=assemble`, with the puzzle HUD hidden. The old tile city moves to `city=tiles-old` until L2, and `city=tiles&sheet=1` still opens the sheet. The stage=ground legend's column width comes from the measured names so no two names overlap. The style guide and the grammar catch up with Josh's rulings of 19 to 21 Nov, and the drift checks for the changed lines read the stage modules. Nothing is deleted. Josh answered Q31 yes ("I approve both", 21 Nov 2026), so `tiles-old` belongs in.

## Does the branch do it?
Diff against 12fc1f9 (the later 071 ticket commit b816d97 on goal/city-style is ignored). Gate green per the main session; I ran no tests.

1. **The switch: met.** `tilesPlanRequested` in `src/render3d/plan3d.ts` rewrites the query to `city=plan&stage=assemble` and calls `planAssembleRequested`, so it is the same parse by construction. It returns null for `sheet=1` and for any other `city`. `plan3d.test.ts`'s new describe covers every case the criterion lists: bare, `blocks=5x4&seed=2`, `cam=street&at=3,4&dir=+x`, `at=0` (null `at`, no throw), `sheet=1`, `city=plan`, `city=tiles-old`. It adds bad-input equivalence too. `renderer.ts` calls `planAssembleRequested(...) ?? tilesPlanRequested(...)` behind `import.meta.env.DEV`, before the gallery and the old tile branch. A source-order test pins it. Josh's browser check is still to come.
2. **The old view: met.** `oldTilesRequested` in `tileslots.ts` maps `tiles-old` to `cityTilesRequested`'s parse of `city=tiles`, keeps `city=tiles&sheet=1`, and returns null for everything else, plain `city=tiles` included. `cityTilesRequested` and its tests are untouched. `tileslots.test.ts` covers the default 3 x 3, blocks, seed, clamping, the sheet, and the nulls (`Tiles-old`, `tiles-older`, `sheet=0`).
   - **Deviation, accepted.** `renderer.ts` routes `cityTilesRequested(...) ?? oldTilesRequested(...)`. `cityTilesRequested` would be redundant here, because plain `city=tiles` is caught earlier under the same `DEV` guard and the sheet is covered by both. But `tilecity3d.test.ts` line 749 has a regex that requires `import.meta.env.DEV && typeof location !== "undefined" ? cityTilesRequested(location.search)`. The ticket forbids editing that test, so keeping the call is the only compliant choice, and the routing it gives is correct.
3. **The HUD: met.** `planHidesHud` is now true for dev, `view=3d` and `city=tiles` without `sheet=1`. It is false for `tiles-old`, the sheet, a production build and no `view=3d`, all covered in the new `planview.test.ts` describe.
   - **Deviation, accepted.** One existing case was edited: `["?view=3d&city=tiles", true]` expecting false became `city=tiles-old`, with a comment. Criterion 3's own rule makes the old case false: dev, `view=3d`, plain `city=tiles` must now hide the HUD. So "existing cases unedited" and criterion 3 contradict each other, and the builder took the smallest edit that keeps the case's intent (an old-path address keeps the HUD). That is the ticket's error, not the branch's.
4. **The legend: met.** `legendColumnWidth(names, font, measure)` in `planview.ts` takes the widest measured name plus the swatch (`font`) and the gap (6) plus an 8 px margin. It never goes under `Math.max(120, round(font x 9))`. The painter passes `ctx.measureText`, and `ctx.font` is set at line 225, before the call at line 245.
   - The test uses the stage=ground names with 0.6 x font per character, at 1000 and 390 px. It checks that no name in a row reaches the next swatch, and checks mailbox/meter explicitly.
   - Names are not wrapped or cut. The other legend and picture cases are unedited.
5. **The guide and the grammar: met.** I checked each edit against the ruling the ticket quotes:
   - **Chapter 18 opening:** names stage 3 (`src/city/mass/`) and stage 4 (`src/city/edge/`), P1/P3 to P6 in `edge/check.ts` and P2 in `mass/check.ts`, and says `tilecity.ts`, `parkmetrics.ts` and `tilecity3d.ts` are the old path's.
   - **Chapter 19 opening:** says the pipeline makes `city=tiles`, points to the grammar and the ticket, and says the files named below are the old path's (`city=tiles-old`).
   - **18.8, 19.7 and 19.8:** each carries an "Info (070 L1)" line heading its tables as the old path's.
   - **Retired lines:** 19.2's far-end order, 19.4's ring-2 strip, 19.6's alley rear and 18.2's 5.2 m bays are each replaced by the pipeline's rule, with a pointer that the old words are `tiles-old`'s. These follow the grammar's "Guide text that goes" (line 315).
   - **B2/C2 "Yes, all four":**
     - Rule 4's 6-or-more row gains the yard court and the "no court part under 8".
     - Rule 6's walk-through row and its Decided paragraph drop "and no lane".
     - 18.1's `PARK_PER_HOME` is 0.075 with the ruling, and so are 057 Q3 and the Numbers row (`mass/constants.ts`).
     - Rule 5's estimate is updated.
   - **Q14:** the P1 row's floor is 0.69 for kerb bays only. The Numbers table has two `PARK_SUPPLY_BAND` rows (0.69 x 1.5 in `edge/constants.ts`, 0.75 x 1.5 in `mass/constants.ts`). P2 says "still 0.75 to 1.5". P3 is counted over the whole block side.
   - **Q20 and Q22:** rule 2's check line gets the cornice clause and the shop-dressing clause, with the 16.5 reach.
   - **Q21:** M1 and M2 get the front-aligned deep shop keys, and M8 gets the "none on a ring-2 building with no door place" clause.
   - **Q22 X1:** M8 gets the shop-corner wrap.
   - **Q23:** rule 8's `BLANK_RUN_MAX_M` is 2.1 m, Decided, and the pipe row is `_03` only, `_01` never used, `_02` off the wall.
   - **Q24:** rule 11 gets the billboard at `BILLBOARD_EDGE_M` (0.28 m) and the measured deck (0.50 m on six keys, 0.744 m rim on styles 2 and 3).
   - **Q25:** rule 11 gets the water-tower cap at 16 per street block.
   - **Q26:** rule 11 gets the novelty-sign line verbatim, rule 9's shopfront row gets a pointer, and the 052 roofs default gets its sentence.
   - **J's R12 audit:** the never-used pipe row is fixed.
   - **Q17/Q18:** 19.6's park Info gets the own-kerb tile and the best fit.
   - **Drift checks:** `styleguide.test.ts` imports `edge/constants` and `mass/constants` (test-only imports) and pins `PARK_PER_HOME` 0.075, `PARK_SUPPLY_BAND.lo` 0.69 (edge) and 0.75 to 1.5 (mass). It removes the two old-path pins from `PARK_CONSTANTS` and asserts `tilecity.ts` has no row for them. The two "every constant named has a row" checks (ch 18 and ch 19) now also accept rows of the two stage modules, and need to, because the names moved files. No threshold or other check changes.
   - **Deviation, accepted: Info bullets.** The builder wrote the new guide lines as Info bullets. That fits the guide's Decided/Default/Info scheme: these lines record a change of address, and Josh's ruling is quoted inline where a number changes.
   - **Deviation, accepted: short File cells.** `edge/constants.ts` and `mass/constants.ts` match the keys added to `MODULES`, and the drift test resolves them.
6. **R-8: the playtester's.** Nothing on the ladder path is touched. `town.ts`, `terrace.ts`, `models3d.ts`, `scene.ts` and the protocol maps are unchanged.

**Lines the builder left disagreeing with the pipeline.** The builder's own list was not in what I was given (the commit message has none, and the diff carries no note), so I can't list its words. On my own reading of chapters 18 and 19 and the grammar, these lines still describe the old path without saying so:
- **18.2, the homes bullet:** "a home is two column-floors (2 x 5.2 m x 6 m, about 62 m2)". 5.2 m is the retired bay; on the lattice it is 2 x 5 x 5 m.
- **19.2, "Default (057 B): nothing else is allowed":** still lists "a seam, a gated passage" among the allowed edges. The grammar's "goes" list says "19.2's far-end order and its passages".
- **19.2's gate default and the as-built Info lines on passages:** covered only by the chapter-opening pointer ("the files named below are the old path's").
- **19.7's G2 row and the far-ends row:** under the new old-path Info line, so they are labelled.
- **Grammar M1's "Fails today" sub-bullet:** still cites 5.2 m bays. It is history, and not among the lines the ticket names.

None of these is a ruling the ticket names, so none is a must-fix. Criterion 5 says a line that does not match is reported, not fixed in code.

## Rule conflicts and risks
- Every changed file is in L1's Files list. Nothing under `src/city/`, `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/render/`, `puzzles/`, `tests/playtest/` or `main.ts` is touched.
- `tilecity3d.ts` changes in its header comment only, and `tileslots.ts` in its header comment plus the new function.
- No dependency, digest pin, threshold or Decided rule changes.
- Grammar rule 5's parking paragraph does more than change the number. It drops "Section C1's builder measures it. If P2 does not hold it comes to Josh with the numbers (Q5)" and adds "Two courts a block ... hold P2 on all 13 named cities once the ratio is 0.075 and yard courts exist (`docs/070-c2-options.md`)". That source is a probe on the old 13 cities (3 x 3 and 6 x 4). Since Q17 the named cities are 6 x 6 seeds 1 to 10, so the claim's frame is stale. It is within the named line and follows from the ruling, so it is not a blocker, but the wording should point at the merged check.
- Ticket inconsistency, for the architect: criterion 3's "existing cases unedited" cannot hold alongside its own rule. See criterion 3 above.

## Must fix
none

## Could improve
1. `docs/city-grammar.md` rule 5's Parking paragraph: replace "hold P2 on all 13 named cities ... (`docs/070-c2-options.md`)" with a pointer to the merged check (`src/city/mass/check.ts`, P2, on the 6 x 6 named cities). The paragraph should not cite a pre-build probe on the old city list.
2. `docs/city-style-guide.md` 18.2's homes bullet: make "2 x 5.2 m x 6 m, about 62 m2" the old path's, or give the lattice figure. Also mark the 19.2 "nothing else is allowed" list's "a seam, a gated passage" as old-path-only.
3. `docs/city-grammar.md` rule 8's pipe row: the Size cell ("2.8 to 4.5 m wide, 4.2 to 7.1 m high") still spans all three keys; only `_03` is listed now.
4. `planview.ts` `legendColumnWidth`: the extra `+ 8` px margin beyond "widest name + swatch + gap" is reasonable, but the doc comment doesn't mention it. Name it in the comment, or drop it.
5. In L2, drop the now-redundant `cityTilesRequested(...)` call in `renderer.ts` together with the `tilecity3d.test.ts` regex that forces it.
