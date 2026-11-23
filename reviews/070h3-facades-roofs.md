ticket: 070h3-facades-roofs
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section H3 of ticket 070, as re-cut at 7d0fba1 after Josh's Q24: port the tile city's rooftop items onto the pipeline's roofs as a new `facades.roofs` field. That means small props, one big prop per building (water tower, roof exit or billboard, and no novelty sign under NV), and a roof exit that stands wholly on its roof with its door away from the street and 1.2 m of clear deck. The readings RE, RT, BB, RB, RX, RD, RW, HC, RC and RK apply, checked by a new `roofcheck.ts`, with the picture's three legend entries, the facades digest re-pin, a `walls` pin and a numbers report. Nothing changes in 3D.

## Does the branch do it?
I read `git diff 7d0fba1...12f8959` (10 files). I ran `src/render3d/roofpin.test.ts` and `src/city/facades/rooffixtures.test.ts`: 26 passed, and the GLB tests ran because the worktree has `assets/private/out/city-pack.glb`. For the rest I relied on the main session's green gate.

- **0 (architect's types):** not this branch's job. `src/core/` is untouched.
- **1 (roof kit, `roofkit.ts`, `roofpin.test.ts`):** every key list, chance and number under "What it ports" is copied, along with R8's two numbers, `BIG_ROOF_KINDS`, the bounds of the 14 keys and the six roof keys' heights. `ROOF_ACCESS_CLEAR_M` 1.2, `ROOF_DECK_M` 0.5 and `BILLBOARD_EDGE_M` 0.28 are typed in this folder, and there is no novelty key. `roofpin.test.ts` covers every "Always" bullet:
  - it compares the copies with `dressing.ts`, `citymetrics.ts` and `buildings/kit.ts`;
  - it pins 1.2, 0.5 (on all six keys) and 0.28, naming rule 11 and Q24 answers 1 and 2;
  - it checks that no roof key appears in `DRESS_NUDGE_M`, `DRESS_FRONTS` or `BUILDING_FRONTS` (RD);
  - it checks the bounds against the fixtures.

  Inside `skipIf(!HAVE_GLB)`, it checks the bounds against the GLB within 0.005 m. It also samples each roof key's deck on a 46 x 46 grid against `ROOF_DECK_M` within 0.005 m, so RT is pinned to the GLB. The file is read inside the test, after an `existsSync` probe, so the tests are safe in CI. Met.
- **2 (the choice):** `buildRoofs` in `roofs.ts` follows `dressBlock` line for line. Kinds are tried in a hashed rotation and columns in a hashed rotation of the non-corner columns, the first fit is taken, there is one billboard per run (threaded through `runsOf`), the face is picked once per building, and small props get one or two half-cells and a hashed spot. Novelty is never tried (NV), and RB comes from `streetMid` (`frontage === "street"`, which by rule 9 covers park edge and plaza). In `roof.test.ts`, "the choice (criterion 2)":
  - "at most one big prop…" covers the big prop's rules;
  - the RB/BB test asserts at least one billboard on every named run, with the structure and the face inside 0.28;
  - the small-props test asserts that the dish is never turned;
  - the R-3 test builds the same city twice and gets the same layer, and another seed gives a different one.

  Met.
- **3 (the roof exit):**
  - The housing's back sits on the deck's front edge, turned 180 degrees, with `facing = OPPOSITE[front]`.
  - `exitFits` requires the housing's width and its depth plus 1.2 to fit inside the inset deck.
  - Blind columns are tried first (RX), and corner columns never.
  - In `roof.test.ts`, "the roof exit" checks the footprint against a hand-typed deck of -2.2 to 2.2, the door's side and its dot product with every open side, and the clear deck being inside the deck and empty.
  - The RX test asserts more than 100 exits on blind columns and more than 1000 on mid columns, so both tiers are exercised.

  Met.
- **4 (placements):** every bullet is covered in "placements (criterion 4)". The tests find real pieces on uninset cells and compare them with positions worked by hand: a local `turn`/`at`/`frame` and typed numbers such as 2.2 - 2.419/2, 2.2 - 2.851/2, 2.22 - 0.118 - 1.611/2 and a clear deck from -1.851 to -0.651. None of them reuse the stage's own helpers.
  - The water tower is checked at 12.5 at two turns.
  - The exit is checked on blind and on mid columns, each at two turns.
  - The style-2 test checks the base is +0.5, not +0.744.
  - The billboard is checked 0.286 m in, with its face 0.9 m up and in front.
  - The small-prop halves are checked, with a turnable key and the dish.
  - The RK test checks the 0.370 m party window.

  Met.
- **5 (the checks, `roofcheck.ts`, `rooffixtures.test.ts`):** R8 (both numbers, with the scope over all buildings and all B2 runs), M9b's four clauses, the deck (with BB and RK, the base within 1e-6 m, no overlaps), the roofs (including NV) and the cap (no party-wall piece counts) are all there. `stage.ts` runs `roofFailures` after `partyFailures`. `dressFailures`, `wallFailures` and `partyFailures` are untouched and do not read `roofs`. `rooffixtures.test.ts` has a positive control and every fixture the ticket lists, each asserting the check it names: "today's placement" fails M9b on the door, and the rest fail RX, the clear deck, the deck at 0.2 m, the base at 0.1 m, RK (and not the deck), a corner column, a second big prop, a second billboard, a novelty piece (NV), the billboard at 0.03 m, RB on a quiet front, the cap plus the PW7 positive test, and R8 on both numbers. Met.
- **6 (the picture):** `stage.ts` appends "roof prop", "big roof prop" and "roof exit" at 16 to 18. `roofLegendOf` gives no point to a billboard face, and the roof points come after the wall points. `stage.test.ts` asserts the 19 names, the point count and each roof point's legend and position. Met.
- **7 (R-1 to R-7):**
  - `roof.test.ts` greps the three new files for imports (core, `./` and `../pipeline/` only), for clocks, the DOM and `Math.random`, and for reads outside `mass`, `buildings` and the streets' w and h.
  - The facades digest is re-pinned with the H2b pins named in the comment (40e4d207, 06116698, 60227c74 and 3610b49d are replaced by 85f425f5, 40ff1675, e1ee93b5 and 06de80d5).
  - The new `WALLS_PINS` are 5c713506, 663df51b, 13d0b0a6 and 13cfe3b5.
  - `H2_LAYERS` is unedited, and R-7 is covered by the gate's `run.test.ts`.

  I did not recompute the `walls` pins at 4ddae06. `walls` is built before `roofs` and no line that builds it changed, so the pins hold by construction. Met.
- **8 (the report, `roofreport.test.ts`):** it prints every listed number per named run:
  - R8 and its lowest values;
  - big props by kind, key, column kind and storeys, and the tallest top;
  - exits by tier and fall-throughs;
  - billboards, the run cap, and what RB and RK turned away;
  - what the run's lowest building took instead (NV);
  - small props one or two a column;
  - what the cap turned away;
  - RK insets by kit piece;
  - the totals against `DRESS_MAX`, reported and not applied.

  The outside cities are printed only. Met.
- **9:** this one is the main session's screenshot, not the branch's.
- **10:** the files stay within the list. The `src/city/facades/` files that existed before (other than `stage.ts`, `stage.test.ts` and `index.ts`) are not edited, and `plan3d.test.ts` and the other `render3d` tests are untouched.

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are not touched, there is no new dependency, the GDD's Decided rules are not changed, and every file is in the ticket's list. The new files use only `src/core` and in-folder or `../pipeline/` imports, with no DOM, timer or randomness.
- Josh's Q24 answers are implemented as worded:
  - RT: +0.5 on every roof key.
  - BB: 0.28 for the billboard's two pieces only.
  - HC: no height cap.
  - RC: roof pieces counted last, a billboard as two, party-wall pieces not counted.
  - RK: insets only where a piece's depth is more than 0.3.
  - RW: the clear deck as wide as the housing.
  - NV: never tried, and failed by the check.
- RX: the check and the choice disagree on "holds it". `roofcheck.ts` line 248 fails an exit on a mid column whenever the building has a blind column whose deck fits the exit, but `buildRoofs` also moves on from a blind column when the cap (RC) turns the exit away there. On a city where that happens, the stage would throw on RX instead of accepting the fallback the ticket describes. It does not happen on the 20 named runs (the gate is green), so it is a latent risk, mainly for the best-effort outside cities.
- H1's grep test in `stage.test.ts` lists its files by name, so it does not cover the new files. The ticket says it "covers the new files", but `roof.test.ts` runs the same greps on them, and the ticket forbids other edits to `stage.test.ts`. The intent is met.

## Must fix
none

## Could improve
1. `src/city/facades/roofcheck.ts` line 248 (RX): judge "holds it" the way the choice does, so that a blind column whose fitting deck the cap left full does not count. One way is to pass the column's load from `columnLoads` minus its roof pieces into the RX test. This removes the latent disagreement above.
2. `src/city/facades/roofs.ts` lines 343 to 346: when the cap is full for a small prop, `continue` tries every remaining key and adds 1 to `capTurned.small` for each one. A full column can therefore count up to 6 per half-cell, which inflates criterion 8's "cap turned away" number. A `break` there (the column's room does not change between keys) gives one count per refused place and the same layer. `smallColumns` is also counted before any piece is placed. Both only affect the report.
3. `src/city/facades/roofkit.ts`: `ROOF_DECK_BY_KEY` and `deckHeight` are pinned by tests but never used by the stage, because `deckY` uses `ROOF_DECK_M` directly. Either have `deckY` read `deckHeight(roof.placement.key)`, so the per-key table means something, or drop them.
