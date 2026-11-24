ticket: 081-K2d2-roof-jobs
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
K2d2 lets a city puzzle stand any node on a roof structure (CK17e), run lines through roof spans and roof carriers (CK13), use roofs on neighbouring blocks but never their poles (CK14, B1-Q5 "Neighbouring blocks too"), keep one job's roof spans apart (CK17d), and convert roof nodes and roof cuts to a plain `Puzzle` (CK15). It also adds the `{ roof }` place type and the overlay's roof branch. The PR adds 5 cases and rewrites none.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081k2d2-roof-jobs` (PR #42). `src/city/circuit/roofjobs.test.ts` ran: 5 passed, 1.48 s of tests (3.3 s wall, mostly building the city in `beforeAll`).

- **Before the builder (core).** `CityNodePlace` now includes `CityRoofPlace` (`src/core/citycircuit.ts`). `PLACE_KINDS` takes "roof", and its message names `{ roof }` (`src/core/load.ts`). The section allows exactly this.
- **1, CK17e.** `nodePlaceProblems` (`checkplaces.ts`) gains a `{ roof }` branch. `roofNeed` gives breaker, battery and fuse box 2, switch 3 (relay and spring are switch flags), junction `max(3, degree)`, and lamp and feed 1. It counts only the roof spans `roofSpanFault` allows for the job. A feed on a district roof fails, and so does a second node on the same roof (`roof <id>` key). `cityPuzzleProblems` passes each node's line count as `degree`. K2b's CK12 cases are unedited. Test "CK17e: …" covers a switch on `roof:54:51` (2 usable, fails), on `roof:54:52` (3, passes), and a feed on a district roof (fails) and on a neighbouring roof (passes). The ticket's third fail, a lamp on a roof reached by a drop, is not asserted here. The code does refuse it: `runProblems` reports "ends on the drop of X, but … does not stand on that building" (see Could improve 1).
- **2, CK13 through roofs.** `runProblems` looks spans up in `spans` and `roofSpans` together. `nodeStruct` lets a run start or end at a roof. The existing carrier checks ("holds node" and "also carries") now cover roofs, because roof nodes join `nodePoles`. A drop or a lead from a roof is refused. Test "CK13 through roofs" builds pole → pavement → roof → junction → roof → pavement → pole and finds no problems. A second line through the first roof fails with "also carries l1", and a drop from a roof fails.
- **3, CK14 for roofs.** `districtProblems` sends every roof span through `roofSpanFault` (`roofjobs.ts`):
  - a span with no district end fails;
  - a pole end off the district fails;
  - a roof end must be on a district block or a neighbouring one.

  Roof spans skip the pole-span "leaves the district" rule, and a feed's entering span may be a roof span (`spanOf`). Test "CK14 for roofs" has three parts:
  - a lamp on the neighbouring roof `c.r2` passes;
  - a span out to a roof past the neighbours fails ("wholly past");
  - a `down` span to a neighbouring block's pole fails.
- **4, CK17d in one job.** `jobRoofProblems` refuses roof spans that cross in plan, spans within `ROOF_CLEAR_M` of a standing structure they do not end at, and two `junction` spans over one junction. Test "CK17d in one job" shows two junction spans over one junction failing, and one alone not.
- **5, CK15.** `convert.ts` turns a `{ roof }` node into its structure's point. Test "CK15 for roofs" checks:
  - a feed on a neighbouring roof and a lamp on a district roof, with the roof span as a `damaged-cable` cut, pass `cityPuzzleProblems` with no problems;
  - `pos` is within 1e-4 of the structure's point over 5 m;
  - `places` keeps `{ roof }`;
  - `cuts` names the roof span;
  - `decor` has exactly the district's pole spans and drops, so nothing for roofs.
- **6, overlay.** `placePoint` gains only the `{ roof }` branch: `x_m`, `deck_y_m`, `z_m`. No other renderer line changed.
- **7, no `src/grid/` import.** `roofjobs.ts` imports only `../../core`, `./check`, `./constants` and `./roofgeom`. K2c's grep case still applies.

**The builder's readings:**
- **Neighbouring blocks.** These are the `across` blocks, plus the far block of any `junction` roof span with one end on the district. That covers a district roof and also a tall district pole ("Tall poles too"). On a layer that passes K2d1's CK17b and CK17c, this is the same set as "diagonally across a junction at a district block's corner". `junction` spans are only offered to the diagonally opposite block, and a diagonal block that no offered span reaches can't be used anyway. **No rule changed.** One consequence: the "more than one street past" branch of `roofSpanFault` can only fire on a layer that fails K2d1's checks, so on a valid layer it is only a guard.
- **At least one end on the district; a roof end may be on a neighbouring block, a pole end must be on the district.** This is CK17g as worded in `docs/design/081-B1-roof-spans.md` ("Every roof span a job uses has at least one end on a district block"; "Their poles, pole lines and drops stay out of the job") and in criterion 3. **No rule changed.**
- **CK17d against corner roofs plus the job's own roofs.** This follows Josh's answer 7 ("Only when used"): a mid-row structure stands only while a job uses it, so an unused mid-row place is not an obstacle. Corner roofs always stand. **No rule changed.**

**The `circuitProblems` speed-up** (`checkroofs.ts`). `candidatesOf(input, layer.poles, r)` is now kept per roof id within one `roofProblems` call. Neither its inputs nor its result are changed during the call, so the results are the same. The only case where they could differ is a layer with two roofs of one id, and such a layer is already broken. I did not time it.

## Rule conflicts and risks
- None found. `src/city/circuit/` holds no DOM, timer or `src/grid/` import, there is no new dependency, and no Decided rule changed. Core lines are the architect's as the section says, and the renderer change is the one permitted branch.
- The speed-up in `checkroofs.ts` was not asked for. It is in the ticket's folder and changes no result, so it is harmless.
- A feed line that enters the district and then also uses a roof span out to a neighbouring roof counts two entering spans and fails. That is a strict but fair reading of "one entering span".

## Must fix
none

## Could improve
1. `roofjobs.test.ts`, test "CK17e": add the ticket's third listed fail, a lamp on `{ roof }` whose run ends in a `drop`. The rule holds in `runProblems`, but nothing pins it, and the "drop from a roof" assertion in the CK13 test is a different case.
2. `roofjobs.ts` head comment and `reachOf`: say that the diagonal block is read from the layer's offered `junction` spans, so it relies on K2d1's CK17b and CK17c. Also note that the "more than one street past" branch is a guard for a layer that fails those checks.
3. `jobRoofProblems`: nothing tests the "crosses in plan" and "within 1.0 m" branches. The ticket asked for one case and has it, so this is only if a later section touches it.
