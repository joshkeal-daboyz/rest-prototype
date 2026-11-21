ticket: 070h2-facades-walls
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 7 (facades) gains `facades.walls`: the tile city's fire escapes ported line for line onto the pipeline's cells (EQ to EW, with Josh's Q23 rulings EP, EX, ET, RQ, WP3), door canopies and upper-wall props, the checks (R7, `escapeCheck`, neighbour, hosts, EP, WP1 to WP3, cap, attach, reach) run by the stage, failing fixtures, picture points, a facades digest re-pin, and a report of the numbers. It has to stay inside `src/city/facades/` plus one new render3d pin test. Diff judged: 1d3d4f7...6afc055.

## Does the branch do it?
- **0 (types).** The architect's, already on the base. `src/core/` is not in the diff.
- **1 (the wall table).** `wallkit.ts` holds the key lists, numbers, `ESCAPE_GEOMETRY`, `WINDOW_SILL_M` and the bounds as typed-in copies. `src/render3d/escapepin.test.ts` pins the lists and numbers against `escapes.ts`, `dressing.ts` and `tilecity.ts`. It checks `planEscape`, `codeEscape` and `ladderParts` against the originals on 3, 4 and 5 storeys of each style, and `escapeBlocks` on fixture sites at 0.4 and 0.5 with `escapeRank`'s ranks. It checks that `DRESS_NUDGE_M`, `DRESS_FRONTS` and `BUILDING_FRONTS` name none of the keys, and, inside `it.skipIf(!HAVE_GLB)`, the GLB bounds within 0.005 m. Met.
- **2 (the escapes).** `escape.ts` `decideEscapes` covers these rules:
  - EQ: size via `qualifiesBySize`, street via `factsOf().frontage`.
  - EH: `mid`, not a `door` ground piece.
  - ET: `facesStalls`.
  - Column and rank picks: `rand("escape","col"|"rank", id)`, the rank through `finalise`.
  - EX: a second `escapeBlocks` pass over the quiet sites.
  - EW: the code-drawn fallback when the pack span is wider than the column, as `dressing.ts` line 418 does.
  - The tests: `escape.test.ts` "every escape stands on a host column ..." covers hosts, size, one escape per building, one piece per storey in roles, and face = front. "the street escapes are exactly escapeBlocks' choice ..." rebuilds the sites independently and compares the choice for both passes. It also asserts `escapeShort` 0 and the neighbour rule. The "same city twice" test covers R-3.
  - The report shows the street target met on all 20 runs. The lowest R7 is 0.400, on 6 x 6 seed 2 one-way on. Met.
- **3 (EP).** `dress.ts` takes an optional `escapes` map, which defaults to empty and then gives H1b's dressing exactly. `plain(bay)` gates the `wanting` awning bays, the blade bay and the fascia signs. The escape weight is put into `perColumn` first. `escape.test.ts` "the meeting with H1b's dressing" covers three things on all 20 runs:
  - the ground equals `buildGround`'s;
  - a building with no escape gets dressing equal to `buildDressing` with no columns, piece for piece;
  - an escape bay has no awning or sign, and its glass is unchanged.

  Met.
- **4 (canopies and wall props).** `walls.ts` places canopies on `door` pieces only (WP3; `doorCorner` is counted bare). Props go on storey 2 and up, on non-blind columns, never on the escape column, at most 4 a building. The cap counts the dressing and the escape weight. Tested in `escape.test.ts` "canopies and wall props". Met.
- **5 (placements by hand).** `escape.test.ts` "placements, worked by hand" has these cases:
  - a pack escape at two turns;
  - a code-drawn escape (4.8325 m pack in a 4.5 m column);
  - canopies at `y_m` 0 and -0.071;
  - an air-conditioner on each side, and a planter.

  Met.
- **6 (the checks and the fixtures).** `wallcheck.ts` runs in the stage after `dressFailures`, and `dresscheck.ts` is not edited. Every listed fixture is in `escapefixtures.test.ts`, each built from the default city's layer and each asserting the named check, plus a sanity case that the layer passes as it is. Met.
- **7 (the picture).** Three legend entries were added. Points are one per escape at its storey-1 piece, then one per canopy and one per prop. `stage.test.ts` checks each wall point's position and legend, and H1b's points are unchanged. Met.
- **8 (R-1 to R-7).**
  - The freeze test was extended to `walls`.
  - The grep test's `FILES` now lists the four new files.
  - The facades pins were re-pinned. Old (7a95c899, 2281779d, f965837b, 9a3c4f10) and new (ce662196, e5d43765, 9f4fa9c4, d0d30400) are both named in the comment.
  - `BUILDINGS_PINS` and the earlier pins are untouched.
  - Per-building work is linear (R-7).

  Met.
- **9 (the numbers).** `escapereport.test.ts` prints both. I ran it on the branch:
  - Named: R6 is 0.474 to 0.532, lowest on 6 x 6 seed 3 one-way on, as the ticket's R6 note predicted. R5 is 0.596 to 0.639. Code escapes 0, worst deck, joint and ladder 0.000, reach worst 2.111 m (FireEscape_03), 24 facing pairs, cap turn-aways 0.
  - Outside: reported, nothing asserted. Met.
- **10.** The main session's screenshot. I did not run the browser.
- **11.** The diff is inside the listed Files. `dresscheck.ts`, `dresskit.ts`, H1's files, `src/core/`, `src/city/pipeline/`, other stage folders, `stages.ts` and `package.json` are all untouched. `hash.ts` was not needed. Gate green per the main session.

**(a) The `dress.test.ts` change.** The ticket allows `dress.test.ts` edits "only where an assertion relied on H1b's E1, every bay plain". The flat-awning count `> 10000` did rely on that, since under E1 every shop bay could take an awning. EP takes them off escape bays. Lowering the floor to `> 9000` (9103 measured) is within the allowance. The rest of that test, that each building has one awning key, that the L awning sits only on a shop corner and that a flat awning is never a wrap, is unchanged. It is a test-volume floor, not a grammar threshold: R5's 0.55 in `dresscheck.ts` is not touched. A stricter way to write it is under Could improve 1.

**(b) The outside cities failing R6.** 6 of 80 outside runs now fail stage 7 on R6, which they passed before H2:
- 3 x 3 s2 off: 0.426
- 3 x 3 s14 off: 0.446
- 3 x 3 s2 on: 0.429
- 3 x 3 s3 on: 0.449
- 3 x 3 s15 on: 0.410
- 6 x 4 s18 off: 0.449

The ticket treats this as acceptable:
- R-2 (Q17) says an outside city that fails "is reported as an honest failure; no test asserts it either way, and nothing is tuned for it".
- H2 restates that the outside cities are "reported, never required or pinned".
- H2's stop rule for R6 covers named runs only.

The branch reports these failures and does not tune for them. All 20 named runs pass, the lowest R6 being 0.474. It is still worth telling Josh. EP drops the signed share by about 0.07 to 0.09 on every city, so small cities with few shops now land under 0.45. The 3D game's scale is the 6 x 6 cities, but if he ever wants 3 x 3 back as a supported size, R6 is the check that will stop it.

## Rule conflicts and risks
- None found against the hard rules:
  - `src/grid/` and `src/night/` are untouched.
  - `src/city/**` imports only `src/core` and `src/city`; the new files are in the grep test.
  - No timer, DOM or clock use.
  - No new dependency.
  - No threshold moved: R5, R6 and R7 and every copied number are pinned against the old path.
- Risk: the street pass and the quiet pass of `escapeBlocks` are independent. A street building and a quiet building that are consecutive in one run could both get an escape, and the stage's `neighbour` check would then fail that city. It does not happen on the 20 named runs, and none of the six outside failures is this. It is latent, not a defect today.
- Risk: "street building" is worked out two ways. `decideEscapes` uses `factsOf().frontage`. `wallcheck.ts` and the criterion-2 test use the first non-blind column's row-front open side. They agree on every named run (the exact-choice test would fail otherwise), but if a later change made them differ, R7 could be counted over a different set than the one chosen from.

## Must fix
none

## Could improve
1. `src/city/facades/dress.test.ts`: instead of only lowering the flat-awning floor to 9000, also assert H1b's original `> 10000` on `buildDressing(...)` with no escape columns. H1b's own volume check then stays at full strength, and the 9000 floor covers the EP-adjusted layer.
2. `src/city/facades/stage.ts`: the JSDoc "The legend index of a dressing kind ..." now sits directly above `wallLegendOf`'s own JSDoc, so `dressingLegendOf` lost its comment. Move it back down.
3. `src/city/facades/escape.ts` / `wallcheck.ts`: use one helper for "this building is a street building" in both the decision and the check, so R7 is always counted over the set it was chosen from.
4. `src/city/facades/escape.ts`: make the quiet pass aware of street escapes, by passing street-chosen buildings as non-hostable neighbours, or say in the comment why runs never mix frontages. That would remove the latent neighbour-rule failure noted above.
