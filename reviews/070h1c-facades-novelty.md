ticket: 070h1c-facades-novelty
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section H1c of ticket 070 (re-cut for Q26, amended for Q27 with rulings FA, FR, FC and FB). Every shop ground piece gets one `CityShopKind`: from H1b's trade sign where there is one, otherwise by hash. About one run in nine gets a novelty sign that matches the shop's kind. It goes flat on the street face over the shopfront (rule F, cap placed last) or on the roof as the building's one big prop (RS). There is a kit table and a pin test, checks with failing fixtures, one new picture legend entry, re-pinned digests, and H3's and H3b's tests keep reading H3b's roofs.

## Does the branch do it?
I reviewed commit 97fb0f8 against goal/city-style 79fef73. The gate is green, as reported by the main session. I did not re-run the suite.

- **0 (architect).** No `src/core/` change on the branch. The types are used as cut.
- **1, the kit.**
  - `src/city/facades/noveltykit.ts` has the 17 keys and their bounds, `SHOP_KINDS` (16), the SN table, `SIGN_KIND` (9 keys, `Entrance_01` mapped to null) and `FACE_QUARTER_DEG`.
  - The three NP numbers are each commented PROPOSED with Josh's words.
  - `src/render3d/noveltypin.test.ts` checks:
    - `NOVELTY_KEYS` against `NOVELTY_SIGNS`;
    - the bounds against a typed-in fixture;
    - 16 kinds, with barber and hotel empty;
    - 15 keys used, the bowling pair in no list;
    - `SIGN_KIND` against `SIGNS_FASCIA` and `SIGNS_BLADE`.
  - The describe name quotes "Yes, all four". The GLB bounds test is lazy, inside `it.skipIf(!HAVE_GLB)`. The NP numbers are not asserted.
- **2, SK.**
  - `shops.ts` reads the sign on the first cell. Otherwise it hashes over the kinds the building has not used yet, sign-read shops first, and falls back to all 16. H1b's `dressing` is only read.
  - `novelty.test.ts` "SK, the shop kinds" checks:
    - one shop per ground piece, in order;
    - the sign kind, worked by hand with regexes;
    - `source` is "hash" otherwise;
    - no repeated kind in a building with fewer than 16 shops;
    - both sources on every run.
  - The dressing is held unchanged by `stage.test.ts`' `H2_LAYERS`, which is unedited.
- **3, NP, F and RS.**
  - `novelty.ts` `planNovelty` walks the buildings in order, with one sign per run and the roof or face first by hash. Keys are tried in a hashed rotation.
  - `placeFaceSigns` applies the cap after the roofs and places nothing else in the run once a sign is turned away.
  - `roofs.ts` pass 1 takes the planned sign in place of the kind loop. `tower` stays false and `h.big` is set, so TF sees the run as not bare.
  - Tests that cover it:
    - per run, per shop, NM, and no barber or hotel;
    - F for every face sign, worked by hand: frame, FLOOR_HOST plane (FA), base, top, W1, T1, street, EP, and box clear;
    - RS for every roof piece: P_ROOF_LARGE draw, first mid column, only big prop, 0 or 90 turn, base;
    - the no-plan H3b digest pins;
    - unchanged buildings outside the sign blocks, roofReport clean (TC included), R8's second number identical and its first at or above 0.9 (Q27);
    - both kinds of sign found;
    - R-3.
- **4, hand-worked placements.**
  - Burger over a flat awning on two column yaws.
  - Hotdog turned a quarter, 3.926 m along the wall.
  - Pizza centred on a shopDouble's midpoint.
  - Bottle roof sign: base 3 x storeys + 0.5, front on the deck edge at 2.2 m, centred.
  - Each expected pivot comes from bounds and cell centres, not from the placement code.
- **5, the checks.**
  - `noveltycheck.ts` has SK, NM, F (street or FC, EP, centred, broad side, base, top, W1, clear), separate `attach` and `reach`, `cap` with roofs counted, and NR. The stage runs it after `roofFailures`.
  - `roofcheck.ts`: NV now needs a novelty key on a mid column of a shop in `layer.shops`, and the turn may be 0 or 90 (FR). `roofBounds` falls back to `NOVELTY_BOUNDS`. `ROOF_BOUNDS` is unchanged.
  - Every listed fixture is in `noveltyfixtures.test.ts`, with the positive control. The NV fixture in `rooffixtures.test.ts` is replaced as asked.
- **6, the picture.**
  - Legend index 19 "novelty sign".
  - Roof novelty pieces map to 17 in `roofLegendOf`.
  - `stage.test.ts` checks the length of 20, the names, and each new point's position and legend after the roof points.
- **7, the re-pin.** The four `PINS` are re-pinned. The comment names H3b's four as replaced. `WALLS_PINS` and `H2_LAYERS` are untouched. The stage still reads only `mass`, `buildings` and the streets' w and h.
- **8, H3's and H3b's tests.**
  - `roof.test.ts` `viewOf` builds H3b's layer exactly (no-plan roofs, no `shops` or `novelty`). Only that block changed.
  - `roofreport.test.ts`: the novelty assertion became a reported count. Only that changed, plus the header comment and the log line.
- **9, the numbers.** `noveltyreport.test.ts` reports per run:
  - kinds, sources, two of a kind;
  - face and roof signs, runs with a sign, signs by key;
  - what each roof sign replaced;
  - towers, exits and billboards against no-plan;
  - R8's four numbers, and the buildings that moved;
  - turned-away stats and cap turned away;
  - dressing plus walls plus face signs against `DRESS_MAX`.

  It asserts only that every run is ok and the row count.
- **10.** This is the main session's screenshot, not judged here.
- **11.** The files touched are exactly the ticket's Files list. No must-not file changed: no `dress.ts`, `dresscheck.ts`, `dresskit.ts`, `src/core/` or other `src/render3d/` file.

## Rule conflicts and risks
- None found.
  - No GDD Decided rule changed, and no approved number moved: `DRESS_PER_BAY_MAX`, R8's floors and the tower cap are untouched.
  - No new dependency.
  - The facades code stays pure. `node:fs` is only in the render3d pin test, read lazily as `roofpin.test.ts` does.
  - `src/grid/` and `src/night/` are not touched.
- Minor extra exports beyond the listed edits are part of RS's mechanics and are not scope creep:
  - `signTurn` and `RoofSignPlan` in `roofs.ts`;
  - `NOVELTY_LEGEND` in `stage.ts`.
- `roofs.ts` counts `noveltyFailed` when a planned roof sign fails at its turn and falls back to H3's kind loop. The plan checks the same deck and load beforehand, so this should never happen. If it did, the run would still be within its rules.

## Must fix
none

## Could improve
1. `src/city/facades/noveltyfixtures.test.ts`, the blade-sign "clear" fixture:
   - It asserts only that an F "clear" failure is present. It does not assert "and only F", as the other fixtures do.
   - Its `shifted` placement contains a no-op `turn(bay.col.yaw, 0, 0)`. It sets only `x_m` to the blade sign's x, which on a yaw 90 or 270 column moves the sign out from the wall rather than along it.
   - A shift along the wall in the column frame would make the fixture mean what its name says.
2. `noveltyfixtures.test.ts`, the NM face fixture: it picks the first other-kind key that fits shop0, not specifically `Guitar_01` on a pizza shop. The test name admits this. It is equivalent in what it checks, but the ticket's named case is not literally the one exercised.
3. `noveltycheck.ts`: RS's own placement is checked only in `novelty.test.ts`, not as a stage check. That covers the building's P_ROOF_LARGE draw, the shop's first mid column, and the front edge on the deck edge. This matches the ticket, which gives the roof piece's place to `roofcheck.ts`' NV and H3's deck checks. If J ever edits roof signs, a stage-level RS check would catch drift.
