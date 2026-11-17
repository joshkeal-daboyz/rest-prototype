ticket: 041-city-layout-and-power-lines-c
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C makes the 3D wires read as power lines. Poles go at most 3 apart with 4% sag. Each run gets three 0.03 conductors on a cross-arm (one conductor on a run with no pole), and a damaged cable cuts all three in the same span. There's one pole model, three insulators per pole, transformer cans and service drops to the buildings beside a run, and a pick radius wide enough to take any conductor. All of it is in `src/render3d/` and none of it touches play.

## Does the branch do it?
I reviewed only `git diff ticket/041-city-layout-and-power-lines-b...HEAD` (6278a6d). Per the load limit, I did not rerun the suite; the main session reports 1459 tests and tsc clean on this commit.

- **Conductors.** `wireLayout` (`layout.ts`) builds `conductors` from per-conductor attachment points. The two node ends are unchanged, and each intermediate pole is offset ±`PHASE_OFFSET` along the unit `arm`. `layout.test.ts` "three conductors to a run (041 C2), on every map" checks every map for:
  - 3 or 1 conductors;
  - start and end at the node points;
  - points above ground;
  - offsets −/0/+ at `POLE_HEIGHT` with no drift along the run;
  - the centre conductor equal to `runPoints`.
  A fan-out test on `l_b` checks the dead-end fan. Met.
- **Spacing and sag.** `POLE_SPACING` is 3 and `SAG_RATIO` is 0.04. The every-map test checks pole gaps ≤ 3 and the sag of every span of every conductor (within 1e-6). Met.
- **The break.** `breakOf` cuts every conductor in the same `span` (`cuts[]`), and the centre cut is spread onto `WireBreak` for the old fields. The `l_b` test checks every cut's `HANG_DROP`, `BREAK_GAP`, halves and sides.
  - `live.test.ts` "the break" checks one spark in the whole scene, three strips per half shadow, and half shadows only while it sparks.
  - The gap pick box is widened to `2 * (PHASE_OFFSET + 0.1)`, and the outer conductors' hanging ends and gaps pick `l_b`.
  - Met.
- **Old tests.** The changed expectations are named in test comments:
  - `l_b` goes from 3 spans to 2;
  - the shrine has 3 intermediate poles, not 9;
  - `l_feed` sags 0.08, not 0.24;
  - the synthetic 2-span run is length 5, not 3.5;
  - the pixel-sag floor goes from 6 px to 3 px;
  - the poles-in-models floor goes from > 5 to > 2;
  - the radius check is now `WIRE_RADIUS` 0.03, not ≥ 0.05.
  A 3-span synthetic case was added. Met.
- **Hardware.** `MODEL_TABLE` pole is `["SM_Prop_Powerpole_01"]` only. The `models.test.ts` fake set holds both pole models, and every pole clone is `_01`. `ARM_LEN` 0.7 ≥ 2 × 0.22 + 0.1. `scene.test.ts` "pole hardware" checks that there are 3 × intermediate-pole insulators and that each one's top is at its conductor's attachment point. Met.
- **Drops.** `dropLayout` and `canLayout` are pure and deterministic (tested on 56). On every map the tests check:
  - each drop starts at an intermediate pole with a can and ends on the lot's front edge;
  - its ground length is within `DROP_REACH`;
  - at most one drop per lot, none to a place;
  - no drop crosses another lot (sampled independently of the Liang-Barsky clip);
  - a synthetic blocker lot removes exactly one drop.
  Raycast is off on insulators, cans and drops, and a ray through a drop hits nothing. Met, **with `DROP_REACH` 2.5, not the ticket's 2**: see the first risk below.
- **One look per line.** All of a run's conductors are one merged geometry in one mesh per part (`strandGeometry`), with one material each. So a conductor can't differ from its line by construction. The live test walks start, `sw_1`, `repair:l_b` and `br_street`, and checks that live lines still have the bead and a full overlay while dead ones have neither (live differs by more than colour). The Relight draw range grows in steps of one quad of every conductor (`quantum`), from either end. A test checks that a part-lit run lights every tube. Met.
- **Picking.** `WIRE_PICK_RADIUS` is 0.3, which is ≥ 0.22 + 0.03 + 0.03. `pick.test.ts` checks that the middle of every conductor of every three-conductor line on the shrine picks that line, `l_b` included, and that node picks still win. `pick.ts` is untouched. Met.
- **Josh checks (09 and 56).** I can't judge these; they're Josh's. But the builder's own test text says the shrine circuit has **no drops and no cans**, so on 09 Josh won't see "cans and drops into the houses". He can see them on 56.

## Rule conflicts and risks
- **`DROP_REACH` 2.5 instead of the approved 2, and no drops on 09.**
  - The builder's reasoning (in the constant's comment) holds. A lot facing its own run's road has its front at least `KERB_OFFSET` + `ROAD_W` + `PAVE_W` + `SETBACK` = 2.1 from the line, so at 2 no lot on the ladder could get a drop from its own run. That would make C5 empty everywhere.
  - Raising it is a change to a number Josh approved, made without his word. Section A's deviations went back to him the same way. Fixing 09 itself would need `town.ts` (section A's file, not on C's list).
  - This isn't code the builder can fix within the ticket. **The main session should put it to Josh** before merge: accept 2.5 and drops only where buildings face their own run (56 yes, 09 no), or re-cut.
- **The buildings-against-the-front-edge fix (`atFront`) wasn't asked for in C.** It's small and stays in C's files (`models.ts`, `models3d.ts`, `scene.ts` and their tests). It also does real work for C: drops end on the lot's front edge, and only with `atFront` is that edge the building's front face. Without it, a drop to a shallow model or a 0.8-depth placeholder would end in mid-air in front of the building. Buildings stay inside their lots, so the occlusion rule and the "nothing hides the circuit" test still hold. I accept it; it should be named to Josh as a B-review follow-up done in C.
- **Purity.** No change to `src/grid/`, `src/night/`, `src/core/` or any other folder. `layout.ts` gains only a type import from `./town`. There's no new dependency and no Decided rule touched.
- **Approximations (minor).**
  - The drop's end height uses `lot.hMax * 2/3`, the lot's cap, not the building's real height. The ticket says "⅔ of the building's height if that is lower". In practice it's always 0.5, which is under every building's top (one storey is about 0.58), so nothing visible.
  - `DROP_REACH` is measured to the middle of the front, not to the nearest point of it.

## Must fix
none

## Could improve
1. `layout.ts` `dropLayout`: use the building's own height (model or placeholder) for the ⅔ cap, or note in the ticket that the lot cap stands in for it.
2. `layout.ts` `dropLayout`: the crossing check covers `town.lots` only. Also skipping drops whose ground line crosses a place's boxes would keep a drop from running through a warm shrine.
3. Record the `DROP_REACH` 2.5 deviation and the `atFront` fix in the ticket's section C notes (architect), as section A's deviations were, so Josh's answer has a home.
