# 073 D1 pre-check: the tech pass on walls, shopfronts and pavements

21 Nov 2026, pipeline-designer, on `design/073-transformations` at 45baf20. Stages 1 to 9 as merged there.

**This is a sketch.** A throwaway probe outside the repo built the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) through stage 9 with the branch's code, read-only. It then measured the room the tech pass would have.
- **The circuit is a sketch of K1** (CK1 to CK11, as `070-K1-circuit.md` words them), until K2 exists. On 6 x 6 seed 1 one-way on it gives K1's numbers exactly: 478 slots, 10 landings, 49 nudged, 74 crossings, 562 poles, 113 lights, 250 drops, 386 lamp-post places. Over the 20 runs: 477 to 643 poles, 95 to 124 lights, 336 to 438 lamp-post places, 202 to 262 drops a city.
- **`history` is not built,** and the B pre-check has no districts yet. So every density is measured with one `tech` value for the whole city: 0.2, 0.5 and 0.8.
- **Sizes come from the converted manifest only.** No GLB was loaded. The probe's picks use its own hash, so they differ from any the builder makes. The builder's numbers are the record.
- No 3 x 3 or 6 x 4 city was run.

## 0. What the measurements change first

- **The shopfront cannot be a `swap`.** A's contract says a swap keeps the piece's placement and changes only its key. A shop ground piece's pivot is 2.29 to 2.64 m behind its front wall, because pivots are at the bounds' centre. So `Bld_Advanced_01` (0.71 m deep) swapped in place would stand inside the building. Taking the shop out instead leaves a hollow 5 x 5 x 3 m ground storey under the floors, which breaks rule 1's body (B11 is not broken, card 6). What works is an **add in front** of the old shop, with **removes** of the dressing on that face (Q2).
- **Wall room is not what limits this pass. Draw calls and looks are.** 83% of storey faces above the ground have room. Every building on every run has at least one free face.
- **The tall wall pieces have almost nowhere to go.** Vents and the tall electronics are 2.2 to 3.0 m high, a whole storey, so they would cover windows on an open face. Bare side walls above a lower neighbour are where they belong, but H2b already dresses 94% of those (Q3).

## 1. The kit

Every piece's origin is at its **base centre**: the converter centres x and z and puts the base at y 0 (true of all 602 Sci-Fi City pieces). So a wall piece hangs with its origin half its depth out from the wall. Which of its two faces is the back is not in the manifest. The builder pins each key's front from the gallery (X-8).

| Slot | Piece | Size w x h x d (m) | Textured |
| --- | --- | --- | --- |
| Wall, small (an open face's free third) | `Prop_WallAttach_Electronics_02`, `_03`, `_04`, `_06` | 0.42 to 0.82 x 0.70 to 1.17 x 0.26 to 0.50 | yes |
| | `Prop_AirConditioningUnit_01`, `_02` | 0.94 x 0.62 to 0.70 x 0.64 | yes |
| | `Prop_Pipes_03` | 0.55 x 0.63 x 0.44 | yes |
| Wall, storey 1 only | `Prop_Security_Camera_01`, `_02` | 0.36 x 1.07 to 1.16 x 1.08 to 1.14 | yes |
| Wall, tall (a bare side wall) | `Prop_WallAttach_Electronics_01`, `_05` | 1.03 to 1.36 x 1.88 to 2.75 x 0.42 to 0.45 | yes |
| | `Prop_WallAttach_Vent_01..04` | 0.78 to 0.88 x 2.21 to 3.00 x 0.30 to 0.53 | yes |
| | `Prop_Pipes_01` (needs two thirds) | 2.50 x 0.24 x 0.50 | yes |
| Wall, a whole face | `Prop_Overhang_01`, `_02` | 3.50 x 1.33 x 1.44; 4.82 x 0.89 x 0.53 | yes |
| Sign (storey 1 street face, a free third) | `Sign_01..09`, `Sign_011` | 1.60 x 0.24 to 0.46 x 0.05 | yes |
| | `Sign_Billboard_Border_01..04`, `_Tall_01..04` | 0.73 to 1.30 x 0.67 to 2.21 x 0.10 to 0.16 | yes (frames; their faces may be empty, see section 4) |
| Shopfront | `Bld_Advanced_01` (one shop) | 5.00 x 3.00 x 0.71 | yes |
| | `Bld_Advanced_02` (a double shop) | 10.00 x 3.00 x 0.71 | yes |
| Pavement, wall line | `Prop_VendingMachine_01` | 0.76 x 1.62 x 0.64 | yes |
| | `Prop_Atm_01` | 0.90 x 2.27 x 1.19 | yes |
| Pavement, kerb line | `Prop_ChargingStation_01` | 0.47 x 2.27 x 1.21 | yes |
| | `Prop_Advertisement_Pillar_01` | 1.50 x 2.57 x 1.50 | yes |

**Not usable:**

| Piece | Why |
| --- | --- |
| `Sign_Ad_01..32` (32), `Sign_Neon_01..09` and `Sign_Neon_Flat_01..09` (18) | untextured (X-5) |
| `Sign_Billboard_Large_01..04` | 32.8 x 48.6 m; no wall holds it |
| `Prop_VendingMachine_Soda_01` | 4.0 m tall, over `FURN_MAX_H_M` 3.2 m under a span; 1.9 x 1.7 m footprint |
| `Bld_Advanced_Doorway_01` | 1.64 m deep: twice the pavement reach of `_02` |

- **Cameras are wall pieces.** They are 1.1 m tall with a 1.1 m arm, so they read as bracket cameras. The probe measured them on storey 1 walls, not on the pavement, where the ticket's list put them (Q5).
- **Other textured pieces in the pack, not in the ticket's list:** `Prop_Window_Shutter_01`, `Prop_Window_Bolts_01`, `Prop_Sidewalk_Panel_01..06` and `Prop_Posters_*`. Shown for information only; nothing here measures them.

## 2. Where there is room (20 runs, a city)

**Walls.** A storey face is one open side of a column at one storey above the ground, cut into thirds of 1.67 m. A third is free when nothing of stage 7 enters a box over it, 1.5 m out from the wall, over the whole storey: dressing (not glass), escapes and their ladder boxes, canopies, air-conditioners, planters, face novelty signs and roof pieces. On storey 1 the middle third over a K1 drop's wall point (5.5 m) is never free either. This test is strict: a canopy whose top reaches 3.4 m takes storey 1's third above it.

| | A city | 20 runs |
| --- | --- | --- |
| Storey faces above the ground | 7,330 to 9,226 | 169,838 |
| ... with a free third | 6,087 to 7,730 | 141,644 (83%) |
| ... with the whole face free | 4,616 to 5,894 | 108,156 |
| Street faces with a free third | 2,904 to 3,760 | |
| Quiet faces with a free third (court, lane, drive and so on) | 3,063 to 4,163 | |
| Storey 1 street faces, the sign places | 1,278 to 1,618, of which 590 to 770 have a free third | |
| Bare side walls above a lower neighbour | 630 to 816, of which **10 to 46 are free** | 14,632, 512 free |

- **What takes a third** (20 runs): awnings 40,533; escapes 35,264; door canopies 16,016; air-conditioners 13,459; planters 8,529; fascia signs 2,148; novelty signs 2,098; drops 1,682; blade signs 1,153.
- **What takes a side wall:** H2b's own pieces 13,724 of 14,632; roof props of the lower neighbour, 396.

**Shopfronts** (an add in front, section 0):

| | A city |
| --- | --- |
| Shops | 760 to 926: single 475 to 567, double 19 to 42, corner 263 to 358 |
| Single and double shops with no escape ladder in front and no stage 8 prop within 0.71 m | **296 to 350** (single 287 to 337, double 3 to 16) |

- **Left out** (20 runs, of 17,023 shops): 2,073 with an escape's ladder in front below 3 m; 2,953 with a stage 8 wall-line prop within 0.71 m (bins 726, pot plants 591, planters 589, benches 398, mailboxes 336, newspapers 264, trees 69, lot pieces 39).
- **The fit.** The panel's top, 3.0 m, is the slot's `top_m`, so it meets the first floor. It stands 0.71 m onto the 5 m pavement.
- **What it covers.** On the 6,485 eligible shops (20 runs): glass 4,911, awnings 4,932, fascia signs 3,709, blade signs 353. That is about **2.1 removes a shop**. The 357 face novelty signs stand above 3 m and stay.

**Pavement.** A place is a footprint on stage 8's wall line or kerb line of a pavement run, facing the street. It keeps everything furniture keeps:
- the 4 m corner keep-out and the 7 m pitch on its line (against stage 8's props and other tech pieces);
- KO, AV, EL and DK;
- 0.3 m from every stage 8 and 9 footprint;
- `FURN_KEEP_M` 1.5 m from every pole, street light and lamp-post place.

The probe tried each line's widest piece: the ATM on the wall line and the pillar on the kerb line.

| Reading | Wall line | Kerb line | A city |
| --- | --- | --- | --- |
| Gap only (no 7 m pitch) | 1,335 to 1,682 | 964 to 1,260 | for information |
| As furniture (7 m pitch) | 286 to 375 | 230 to 322 | 530 to 694 |
| **As furniture, and a 2 m clear walk (Q4)** | 283 to 369 | 215 to 292 | **504 to 661** |
| As furniture, lamp-post places not kept (Q6) | 286 to 375 | 243 to 337 | 542 to 705 |

- **Why places are refused** (gap reading, 0.25 m steps, indicative). On the wall line, mostly residents' door strips, then escape ladders, the kerb-cut and corner keep-outs, stage 8 props and awnings. On the kerb line, mostly poles, lights and lamp places, then keep-outs and stage 8 props.
- **`FURN_MAX_H_M` never binds.** 103 to 172 places a city lie under a span, and every pavement piece in the kit is 2.57 m or lower.
- **The clean city's own walk** (reported only, X-1). Under 2 m clear on 274 of 3,545 runs, and under 1.5 m on 13. The narrowest is 0.89 m.
- **With every furniture place filled and no walk rule:** 1,287 tech pairs stand across from each other, 1,406 runs drop under 2 m, and the narrowest is 0.50 m.

## 3. The rule proposed, and what it gives

**DT (density follows `tech`).** For each district, by its `tech` value:
- **Bolt-ons.** Each storey face with a free third takes a small bolt-on with chance 0.3 x `tech`. On storey 1, one in four of those is a camera.
- **Side walls.** Each free side wall takes a tall piece with chance 0.3 x `tech`.
- **From `tech` 1/3:**
  - signs: each storey 1 street face with a free third takes a sign with chance 0.3 x `tech` (before a bolt-on);
  - pavement: each place (as furniture, with the 2 m walk) takes a piece with chance 0.5 x `tech`.
- **From `tech` 2/3:** shopfronts. Each eligible shop takes a panel with chance 0.5 x `tech`, and its face's dressing is removed.
- Below 1/3: bolt-ons only (the note's "a low-tech district gets wall bolt-ons only").

Measured with one value over the whole city:

| `tech` | Pieces a city | Bolt-ons + cameras | Signs | Side walls | Pavement | Shopfronts (removes) | Keys | Triangles added |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.2 | 369 to 480 | 368 to 479 | 0 | 0 to 4 | 0 | 0 | 9 to 13 | 65k to 87k |
| 0.5 | 1,122 to 1,411 | 876 to 1,145 | 88 to 120 | 1 to 7 | 129 to 174 | 0 | 32 to 37 | 249k to 308k |
| 0.8 | 1,860 to 2,364 | 1,372 to 1,813 | 133 to 185 | 1 to 12 | 202 to 272 | 104 to 156 (230 to 351) | 34 to 39 | 454k to 579k |

- **Triangles.** Today's city is 8.9 to 10.6 million triangles (measured from the manifest on 3 runs). So the pass adds 1% to 5%.
- **Real cities will sit between these rows.** A district of high `tech` gets the 0.8 row's density on its own blocks only.

**T-1 and T-2, with the pass at its most (`tech` 0.8):**
- **T-1 holds.**
  - The nearest pavement piece to a pole, light or lamp-post place is 1.50 m: the keep-out.
  - Wall pieces never sit on a drop's wall point. They reach at most 1.44 m from the wall, and the poles stand 4.25 m out.
  - Nothing of the pass is over a pole line.
- **T-2 holds on the pavement with the 2 m walk rule.** A run keeps at least 2 m clear beside every tech piece.
  - Shop panels: 5 m less 0.71 m less the deepest kerb-line tech piece (2.0 m) leaves 2.29 m. That is arithmetic, not measured against stage 8's deepest kerb items. The builder's walk check should count panels too.

**Draw calls, against today's about 10,360** (an estimate, from piece and key counts):

| `tech` | Drawn per key, as stages 7 and 8 are today | Cloned one per piece |
| --- | --- | --- |
| 0.2 | +9 to 13 | +369 to 480 (+4%) |
| 0.5 | +32 to 37 | +1,122 to 1,411 (+14%) |
| 0.8 | +34 to 39 | +1,860 to 2,364 (+23%) |

- The per-key column assumes one glTF primitive per Sci-Fi City key. That was measured for the City Pack (070 J), not read here.
- J draws stages 7 and 8 through the tile city's per-key instancer, which is existing code, not J2's instancing. If D3 draws the tech pieces the same way, the pass costs about 40 calls.

## 4. What cannot hold, as cut

1. **Shopfront swaps** (D1's outline, "its changes are shopfront `swap`s"). Section 0: a panel added in front, with removes.
2. **Corner shops** (263 to 358 a city). A flat panel covers one face, and the corner's other face keeps the old shop and its wrap.
3. **The tall pieces on open faces,** unless Josh allows them over windows. On bare side walls they get 10 to 46 places a city.
4. **Signs with faces.**
   - Every `Sign_Ad_*` and `Sign_Neon_*` is untextured.
   - `Sign_Billboard_Border_*` are frames, 0.10 to 0.16 m deep. Whether they show an empty frame is not in the manifest; the builder looks in the gallery. Plain `Sign_01..09` are textured boards.
5. **Cameras on the pavement.** They are wall pieces (section 1).

None of these needs a rule of Josh's changed. Item 1 changes D1's outline and A's sketch note, which are the architect's.

## 5. Recommendation and its cost

- **Take DT as above.** Draw the pass per key in D3. Take Q2 to Q6 as recommended.
- **What it costs:**
  - nothing merged moves: no clean layer, check, digest or pin (X-1);
  - D1's outline line "its changes are shopfront `swap`s and the `remove`s of the dressing they float" becomes "its adds include shopfront panels in front of the old shop; its changes are the `remove`s of that face's glass, awning and signs";
  - A's `swap` stays for other passes;
  - the pass adds a 2 m clear-walk check of its own (Q4), on its own pieces only. It is not B7 (the hold-out and the ruin's), and not a clean check.

## 6. Questions for Josh (recommended answer first)

1. "Tech grows with a district's tech level. A low-tech district gets small boxes, vents and cameras on its upper walls only. From a third up, it also gets signs over shops and street pieces on the pavement (vending machines, ATMs, chargers, ad pillars). From two thirds up, it also gets new shopfronts. At the top, about 2,000 new pieces a city. Yes?" (yes / fewer / more; **recommended yes**)
2. "New shopfronts go on in front of the old ones, 0.7 m out onto the pavement, and the old awning, signs and glass on that face go. Only on plain and double shops with nothing on the pavement in front and no fire escape, never corner shops. About 300 shops a city qualify. Yes?" (yes / swap in place, which leaves the shop storey hollow / no shopfronts; **recommended yes**)
3. "The tall vents and pipe boxes go only on bare side walls above a lower neighbour, never over windows. That is only 10 to 46 places a city. Yes?" (yes / also on back walls over windows; **recommended yes**)
4. "A tech piece on the pavement always leaves at least 2 m of clear walk beside it, so two are never placed across from each other. Yes?" (yes / no; **recommended yes**)
5. "Security cameras go on walls at the first floor, not on the pavement. They are bracket cameras. Yes?" (yes / no; **recommended yes**)
6. "Pavement tech also keeps 1.5 m from every spot where a puzzle lamp post could stand, not only from poles and street lights. It costs 9 to 23 of about 600 places a city. Yes?" (yes / no; **recommended yes**)

## 7. What the orchestrator does for each answer

- **All yes.** The architect cuts D1 in full on these words:
  - the slot table of section 1;
  - DT's shares and bands;
  - the 2 m walk check;
  - shopfronts as adds with removes (D1's outline and A's sketch note change).
  
  D1 then waits only for B and C1, as cut. The tech-pass agent file lists the kit of section 1.
- **Q1 fewer or more.** He names the share. The architect scales the four chances (0.3, 0.3, 0.3, 0.5). The section 3 table scales almost linearly: no new probe run is needed under about twice the density.
- **Q2 swap in place.** The pass removes the shop and adds the panel at the cell's front, leaving the storey hollow behind it. That breaks rule 1's body, which only Josh's own words can allow (B11 was "all stand"). One more probe run measures the hollow faces seen from openings and corners.
- **Q2 no shopfronts.** The high band adds nothing over the middle one. D1 has no changes at all, only adds.
- **Q3 also over windows.** One more probe run puts the tall kit on quiet open faces (about 3,000 to 4,000 free a city). The builder pins the window positions from the GLB.
- **Q4 no.** The pavement places rise to 530 to 694 a city. About 1,300 pairs over 20 runs stand across from each other, down to 0.50 m of walk. T-2 then rests on the road, not on the walk.
- **Q5 no.** Cameras go on the wall line of the pavement as ground pieces: 1.1 m tall, arm out.
- **Q6 no.** The lamp-post places leave the pass's keep points. They are node places for K2, so T-1 then rests on the pieces' 2.57 m height.

## 8. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\1513c4d561c80576\d0203065-6e92-41b9-a4fa-2af6c426fba3\scratchpad\d1pre`:
- `dump.ts` builds the 20 runs through stage 9 and dumps their layers to `cities/`.
- `circuit.ts` is the K1 sketch: poles, crossings, lights, spans, lamp-post places, drops.
- `probe.ts` measures the faces, side walls, shops and pavement places, writing `out.json`.
- `sum.cjs` gives the totals and the DT picks, writing `sum.json`.
- It uses a copy of the branch's `src/`, with `node_modules` linked from `D:\rest-prototype-main`, run with `tsx`, one process at a time.
