# 070 H1c pre-check: shop kinds and novelty signs

21 Nov 2026, pipeline-designer, on `goal/city-style` at 2303966 (H3b merged, 01a77f3).

**This is a sketch.** A throwaway probe outside the repo reads the merged facades layer read-only and adds the shop kinds and the novelty signs on top.
- For the roof signs it copies H3b's merged `buildRoofs` and adds one hook. With no novelty sign, the copy gives exactly the merged `facades.roofs` (same digest) on all 20 runs.
- It runs on the 20 named runs only (6 x 6 seeds 1 to 10, one-way off and on). No 3 x 3 or 6 x 4 city was run.
- The GLB was read for the 17 novelty keys, the 3 sign brackets and the storey-1 windows. The builder's numbers are the record.

Josh's words (21 Nov 2026): "[novelty signs] can be placed on the face of a build in addition to the roof. They represent the store in the storefront. A pizza should correspond with a pizza shop and a beer bottle, for example, should correspond with a liquor store or a corner store." Then: "Perhaps novelty signs should be placed alongside the shop fronts instead of the decoration phase? I'm not sure which makes more sense." Then: "A novelty sign doesn't always have to be placed with a shop either. It's an added detail. That's fun. It should be placed per the discretion of the storefront agent."

## 0. Premises the measurements change

- **The "beer bottle" is `Bottle_01`.** It is a green bottle with a label. `Beer_01` is a pint glass of beer with a head of foam, which fits a bar or pub. `Soda_01` is a cola bottle.
- **H1b's signs need not move at all.** Each shop bay carries at most one H1b sign (fascia or blade, never both). So a shop's kind can simply be *read from its sign* where the sign names a trade. It then agrees by construction, and H1b's `dressing` and its pins do not move. The cut's question 3 ("should the signs agree?") becomes "read the kind from the sign?" (section 2, Q3).
- **Every key fits every shop roof.** All 17 keys fit H3's 4.40 m deck, at one turn or the other, on all 11,133 shop mid-roof columns, RK insets included.
- **R8 cannot move.** At every frequency tried it is exactly as merged, run by run.
- **The pizza slice lies flat** (3.37 x 0.56 x 2.96 m). A placement turns only about the vertical, so the slice can't be stood up. On a face it juts out flat like a shelf; on a roof it lies on the deck. In the sketch it reads well from above (section 6).

## 1. What holds

At the proposed numbers (section 3), on 20 of 20 runs:
- **R8, both numbers, are unchanged.** The lowest are 0.959 and 0.652, the same as merged.
- **Water towers are unchanged** (878 in 20 runs). H3b's cap is not touched.
- **Every face sign stays inside the rules:**
  - within the shop's width (W1);
  - inside T1's 5 m reach (the furthest is 4.17 m, the donut);
  - under its own roof;
  - clear of every placed piece (H1b, H2, H2b);
  - only where its column still has room (RC);
  - never on an escape bay (EP).
- **Every roof sign fits the deck (RE, RK)** with room (RC): 0 failures in 205 tries.
- **The dressing total stays well under `DRESS_MAX`.** Dressing plus walls is at most 4,909; adding face signs makes it at most 4,949, of 6,000.

## 2. The questions, measured

**Q1. The framing.** Not measured. Recommended: the shopfront pass gives each shop its kind once. The face sign goes there, and the roof sign reads the same kind in the roof pass (section 3).

**Q2. The 17 keys** (from the GLB; picture `novelty-keys.png`; w x h x d in metres, own front +z).

| Key | What it shows | Size | Proposed shop kind(s) |
| --- | --- | --- | --- |
| `Pizza_01` | pizza slice, lying flat | 3.37 x 0.56 x 2.96 | pizza (Josh) |
| `Burger_01` | burger | 3.72 x 2.18 x 3.72 | burger |
| `Hotdog_01` | hot dog in a bun, long side front to back | 1.41 x 1.14 x 3.93 | hot dog |
| `Taco_01` | taco on its edge, long side front to back | 1.22 x 2.22 x 3.70 | taco |
| `Noodles_01` | takeaway box with chopsticks, "noodles" in Chinese on the front | 2.95 x 3.60 x 2.52 | noodles |
| `Coffee_01` | coffee mug | 2.19 x 1.35 x 1.63 | cafe |
| `Donut_01` | pink iced donut | 3.82 x 1.36 x 3.82 | donut |
| `Icecream_01` | ice-cream cone | 1.93 x 5.04 x 1.93 | ice cream |
| `Milkshake_01` | milkshake with straw and cherry | 2.24 x 4.70 x 1.72 | ice cream, diner |
| `Soda_01` | cola bottle | 1.92 x 5.60 x 1.92 | diner, corner store |
| `Popcorn_01` | striped popcorn box | 1.74 x 2.80 x 1.74 | sweets |
| `Lollypop_01` | swirl lollipop, flat | 3.37 x 6.36 x 0.51 | sweets |
| `Beer_01` | pint of beer | 2.01 x 3.33 x 2.02 | bar (H1b's Bar and Pub signs) |
| `Bottle_01` | green beer bottle | 1.80 x 5.82 x 1.80 | liquor store, corner store (Josh) |
| `Guitar_01` | electric guitar, flat | 2.10 x 6.38 x 0.38 | music shop |
| `BowlingBall_01` | bowling ball | 3.02 x 3.17 x 3.17 | none (no bowling alley) |
| `BowlingPin_01` | bowling pin | 1.63 x 5.16 x 1.63 | none (no bowling alley) |

That is 16 kinds:
- **14 with novelty keys:** pizza, burger, hot dog, taco, noodles, cafe, donut, ice cream, diner, sweets, bar, liquor store, corner store, music shop.
- **2 without:** barber and hotel, which H1b's blade signs name. A shop of either kind never gets a novelty sign.
- **Keys used:** 15 of the 17. The bowling pair is never used.

**Q3. H1b's signs against a kind** (a city average over the 20 runs).

| | A city |
| --- | --- |
| Shop bays | 851 (shop 528, double 29, corner 295) |
| With an H1b sign | 424 (trade sign 359, the plain "Entrance" sign 65) |
| Buildings showing two trades today | 55 |
| Trade-signed shops that would disagree if kinds were hashed blind | 336 of 359 (93%) |
| ... if the kind is read from the sign | **0** |

- **Reading the sign:**
  - Bar and Pub give bar;
  - Cafe gives cafe;
  - Chinese_Noodles gives noodles;
  - Pizza and DeliPizza give pizza;
  - Barber gives barber;
  - Hotel gives hotel.
- **Every other shop** (no sign, or "Entrance") gets a kind by hash from the 16, avoiding a kind already used in its building.
- **Buildings with two shops of one kind:** 11.7 a city (Bar and Pub, or Pizza and DeliPizza, in one building), against 27.9 with a blind hash.
- **Making H1b's signs follow a hashed kind instead** would change H1b's sign pick and re-pin `dressing` on the four pin cities. It would also put R6 (0.45) at risk, since 10 of the 16 kinds have no fascia or blade key. Not measured, because reading the sign makes it unnecessary.

**Q4. How a shop gets its kind.** The kinds' spread a city, read from the sign, else hashed:
- bar 156, pizza 106, cafe 96, noodles 93;
- hotel 44, barber 43;
- each other kind 30 to 35.

So 765 shops a city (90%) can take a novelty sign. Bars, pizza, cafes and noodle bars lead because H1b's signs name them. If that is too much pint and pizza, the agent can keep the hash pick off those four kinds; that is its call.

**Q5. The face fit.** Every key was tried at all 13,503 face-eligible bays: street front, not an escape bay; 675 a city. Two rules:
- **F (flat):** back on storey 1's wall, centred on the shop (a double on its middle), broad side to the street, base on top of the shopfront's tallest piece (awning, fascia, glass, or the storey's base at 3 m).
- **P (projecting):** like a blade sign, at the bay's edge away from H1b's blade sign, narrow side to the street.

A key "fits" when it is within the width and T1's reach, under its roof, and clear of every placed piece. A bay with no room under the cap is counted separately.

| Key | F fits | F inside storey 1 only | P fits | Window share F covers (median) |
| --- | --- | --- | --- | --- |
| Pizza | 1.00 | 0.98 | 0.97 | 0.42 |
| Hot dog | 1.00 | 0.88 | 0.97 | 0.46 |
| Coffee | 1.00 | 0.85 | 0.97 | 0.28 |
| Donut | 1.00 | 0.84 | 0.97 | 0.42 |
| Burger | 0.97 | 0.49 | 0.94 | 0.35 |
| Taco | 0.97 | 0.47 | 0.96 | 0.34 |
| Popcorn | 0.96 | 0.16 | 0.94 | 0.27 |
| Beer (pint) | 0.93 | 0 | 0.90 | 0.25 |
| Noodles | 0.80 | 0 | 0.83 | 0.30 |
| Ice cream | 0.75 | 0 | 0.74 | 0.27 |
| Milkshake | 0.67 | 0 | 0.80 | 0.24 |
| Soda | 0.65 | 0 | 0.65 | 0.26 |
| Bottle | 0.62 | 0 | 0.62 | 0.27 |
| Guitar | 0.56 | 0 | 0.64 | 0.24 (P: 0) |
| Lollipop | 0.42 | 0 | 0.63 | 0.32 (P: 0.13) |

- **What fails:**
  - the tall keys (5 to 6.4 m) don't fit under the roof of a 2- or 3-storey building;
  - a sign tall enough to reach storey 2 hits H2's air-conditioners and planters there;
  - width and reach never fail.
- **P also hits the neighbours:** the next bay's awning (255 tries), blade sign (48), escape (109) and door canopy (25). F hits none of these.
- **Windows:** storey 1 of every style is three windows across, from about 0.5 to 2.5 m up. So a flat sign covers 25 to 45% window. Only P with the guitar or the lollipop sits on the 0.3 to 0.5 m pier between windows.
- **Room (RC):** 48 face-eligible columns a city are already at the cap of 6 after every merged piece. A face sign placed last, only where there is room, never pushes a merged piece out.
- **The brackets** (picture `attachments.png`). None is needed under F, since the sign's back is on the wall (G1). Proposed: no bracket in H1c.
  - `Sign_Attachment_03` (0.62 x 0.58 x 1.22): a wall plate with a 1.2 m lattice arm. This is a hanging-sign arm, the bracket for P.
  - `_02` (0.21 x 0.67 x 0.34): a small plate with two pins.
  - `_01` (2.51 x 0.86 x 0.33): a long wall plate or ledge.

**Q6. The roof fit.**
- **Shop roofs:** 557 shop columns a city have a mid roof. A corner shop's roof is a corner roof (no big prop), so its sign can go only on the face.
- **Fit:** all 17 keys fit the deck (RE with RK) on all of them.
- **What a roof sign takes the place of** (the building drew `P_ROOF_LARGE`; at the proposal, 20 runs):
  - an exit, 92;
  - a billboard, 65;
  - a water tower, 9;
  - nothing, 39 (a roof H3b freed).
- **R8 before and after:** identical on every run, both numbers.
- **Towers:** 878, unchanged.
- **Exits:** 5,468 → 5,367.
- **Billboards:** 1,200 → 1,146.

**Q7. The numbers at the agent's numbers** (rule F, up to the roof; one sign a run at most; the roof first for 30%, the face otherwise, each falling back to the other).

| A shop's chance | Face signs a city | Roof signs a city | Runs with a sign (of 469) |
| --- | --- | --- | --- |
| **0.10, one a run (proposed)** | **42 (33 to 50)** | **10 (4 to 16)** | **53** |
| 0.20, one a run | 73 (59 to 87) | 17 (10 to 24) | 91 |
| 0.30, one a run | 98 (84 to 109) | 22 (13 to 32) | 120 |
| 0.25, no run cap | 112 | 27 | 106 (up to 5 in a run) |
| 0.20, one a run, storey 1 only | 35 | 29 | 64 |

- **The keys on faces at the proposal:** pint 26%, pizza 17%, coffee 15%, noodles 12%, every other key 4% or less.
- **Totals:** dressing plus walls plus face signs is at most 4,949 of `DRESS_MAX` 6,000.
- **The cap (RC):** about 3 face signs a city in these counts stand on a column already at its cap. Placed last, where there is room, they go to the next shop or are not placed.
- **The four pictures** (section 6) show what Josh would see.

## 3. Recommendation and its cost

- **Framing:** the shopfront pass. The kind is given once, where the shop is dressed. The face sign is a shopfront piece. The roof sign is one more option in H3's roof pass, reading the same kind. One owner, facades; it fits one section.
- **The kind table:** as in Q2, with `Bottle_01` as the beer bottle (liquor store, corner store) and `Beer_01` the pint (bar). The bowling pair is unused.
- **The kind comes from the shop's H1b sign** where the sign names a trade, else from the hash (no kind twice in a building where it can be helped). H1b's signs then always agree, and nothing of H1b moves.
- **The face rule, F:**
  - back on storey 1's wall plane, centred over the shop (a double: over both columns);
  - turned so its broad side faces the street;
  - base on top of the shopfront's tallest piece;
  - top under the roof;
  - clear of every placed piece;
  - street front only, never on an escape bay;
  - only where the column has room under `DRESS_PER_BAY_MAX`, placed after the roofs so no merged piece is pushed out;
  - no bracket.
- **The roof rule:**
  - on the shop's own mid-roof column;
  - in place of the building's big prop, inside H3's `P_ROOF_LARGE` draw;
  - front edge on the deck's front edge, base on the deck;
  - under RE, RK and RC.
- **Proposed numbers** (PROPOSED, the agent's, not questions): a chance of 0.10 a shop, at most one sign a run (the tile city's rule), the roof tried first for 0.30. That gives about 52 a city, one run in nine.

**What it costs.**
- New lists, in the cut's shape: `facades.shops` (one `CityShop` a shop bay) and `facades.novelty` (face signs).
- A kit file:
  - the 17 keys' bounds, pinned to the GLB in `src/render3d/` inside `it.skipIf`;
  - the kind table and the sign-to-kind table;
  - the three numbers.
- Changes in `roofs.ts`:
  - pass 1 tries the roof sign before H3's kind loop;
  - `roofBounds` and the roof checks accept a novelty key on its shop's column (NV extended).
- New checks:
  - the kind agrees with an H1b trade sign;
  - the face rule's parts;
  - the roof sign on its shop's mid column;
  - one a run.
- **Digests.** The facades digest re-pins on the four pin cities (new lists, and the roofs where a roof sign took a big prop's place; small roof props move with it, 42,605 → 42,561). `ground`, `dressing` and `walls` keep their pins.
- **Unchanged:** R6, R8, the tower cap and every approved number.

## 4. Questions for Josh

1. "Shop kinds and novelty signs belong to the shopfront work: each shop gets its kind where its shopfront is dressed, and its roof sign (if any) reads the same kind. Yes?" (yes / no, "the roof decoration"; **recommended yes**)
2. "Is this the sign for each shop? Pizza slice: pizza. Burger: burger. Hot dog: hot dog. Taco: taco. Noodle box: noodles. Mug: cafe. Donut: donut. Ice cream and milkshake: ice cream. Milkshake and cola: diner. Lollipop and popcorn: sweets. Pint of beer: bar or pub. Green beer bottle: liquor store or corner store. Cola: corner store too. Guitar: music shop. The bowling ball and pin are never used." (yes, or the fix; **recommended yes**)
3. "A shop that already has a Bar, Pub, Cafe, Noodles or Pizza sign takes that kind, so its novelty sign always matches its sign, and the signs placed today don't change. Other shops get a kind at random. Yes?" (yes / no; **recommended yes**)
4. "On the front of a building, a novelty sign sits flat against the wall just above the shop's awning or sign, centred over the shop, and may rise up to the roof line (tall ones cover a window or two above). Yes?" (yes / "storey 1 only" / "sticking out like a blade sign"; **recommended yes**)

## 5. What the orchestrator does for each answer

- **All yes.** The architect re-cuts H1c on those words and types `CityShop`, `CityShopKind` and the face-sign list in `src/core/`. Then the builder starts.
  - **Files:**
    - a new kit file;
    - the shop and face-sign pass;
    - `roofs.ts`, `roofkit.ts` and `roofcheck.ts` (the roof sign and NV);
    - the facades stage and report;
    - the GLB pin test in `src/render3d/`.
  - **Not in Files:** `dress.ts` (H1b is untouched).
  - **The roof sign stays in H1c.** No H1d is needed.
  - **The builder reports:**
    - kinds by source;
    - signs a city, face and roof;
    - keys;
    - what each roof sign replaced;
    - R8;
    - tries turned away by fit and by the cap.
- **Q1 "the roof decoration".** Same content. Only the section's name changes, and the kind is first given in H3's roof pass instead of the shopfront pass. Nothing measured changes.
- **Q2 with fixes.** Type his table in instead. Each fit is per key (Q5), so any key he moves keeps the numbers above. If he wants the bowling pair used, he names a kind for it.
- **Q3 no (hashed kinds, H1b's signs made to follow).**
  - `dress.ts` joins the Files and H1b's sign pick changes. `dressing` re-pins on the four pin cities.
  - A pre-check of R6 runs first: 10 of the 16 kinds have no fascia or blade key, so R6's 0.45 may not hold. Lowering it is a change only his own words can make.
- **Q3 no (signs and kinds independent).** No H1b change, but up to 93% of signed shops would show a sign of another trade than their novelty sign. Put that number back to him before the re-cut.
- **Q4 "storey 1 only".** Only the seven short keys (pizza, hot dog, coffee, donut, burger, taco, popcorn) go on faces. The tall ones go on roofs only. At 0.20, one a run, that is about 35 face and 29 roof signs a city. Re-cut with the band (top under storey 2's base).
- **Q4 "like a blade sign" (P).**
  - At the bay's edge away from the blade sign, with `Sign_Attachment_03` as its bracket.
  - The bracket's 1.22 m arm adds to the reach. That needs one more probe run before the re-cut: the reach is 4.28 m now, plus 1.22 m, against T1's 5 m.
  - P also needs clash checks against the next bay's awning, blade sign, escape and canopy, which F never meets.

## 6. Pictures and probe

The pictures and the probe are all in `C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h1cprobe`.

**Pictures:**
- **`face-sketch.png`:** a 3-storey shop row built from the GLB at the proposed rules, seen three ways (3/4 from the street, straight on, along the street).
  - On the faces: a burger over an awning, a pint over a Bar sign, a hot dog along the wall over a deep awning, and the pizza slice lying flat over a Pizza sign.
  - On the roofs: the green beer bottle and the donut.
- **`novelty-keys.png`:** the 17 keys and the 3 brackets, each from the front, the side and 3/4 above, on a 1 m grid.
- **`attachments.png`:** the 3 brackets, enlarged.
- **`h1c-seed1.png`:** 6 x 6 seed 1, one-way on, at the proposal (45 face signs as red squares on the shop fronts, 7 roof signs as yellow dots).

**Probe files:**
- `probe.ts` (the measurements; `SIMS=` sets chance:roof-share:rule[:run]);
- `roofsx.ts` (H3b's `buildRoofs` with the roof-sign hook);
- `render.cjs`, `scene.cjs`, `plan.cjs` and `win.cjs` (pictures and window maps);
- `sum.cjs`;
- `out.json`, `out2.json` and `out3.json` (results).
