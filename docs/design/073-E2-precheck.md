# 073 E2 pre-check: the hold-out's camps, farms, markets, stores, barricades, clutter and roof items

22 Nov 2026, pipeline-designer. Measured on `goal/city-transformations` (clean stages as at 103ce43, plus section A's types). Not committed. Nothing here is decided until Josh says so in chat, or the Fable session on his delegation for an X-11 departure.

**This is a sketch.** No pass is built, and stage 6 is not built. A throwaway probe outside the repo read the 20 named runs' clean layers (6 x 6 seeds 1 to 10, one-way on and off), laid the B pre-check's sketch of K1's circuit (poles, lights, lamp-post places, drops), cut B's districts (rule A, ids as B's ticket has them) with B's `held`, and placed each E2 piece by the rules below. Every number is measured on that sketch. The builder's numbers are the record.

**Not counted here:** D1's and D2's tech pieces (not built). E2 runs after them, so its pavement and roof room is an upper bound. E1's plant (not built) takes a spot in each held district's largest open place, which is a court in about 3 districts in 4.

## 1. What holds, and what does not

- **Holds:** camps, farms, markets, stores, clutter and roof items. On 20/20 runs none covers a pole, a light, a lamp-post place or a drop end (T-1). None leaves a district's poles apart (T-2).
- **Barricades break T-2 as the outline words them**, on 20/20 runs, under every simple reading.
  - Two held districts that touch close each other's streets.
  - A barricade across a T junction's through street stands on the far pavement. That is where the poles and lamp-post places are, so it also breaks T-1, on 14 runs.
  - "At least one way in" per district is not enough. A district whose inner streets are not joined needs one way in for each piece.
- **The fix that holds on 20/20:** place a barricade only where T-1 and T-2 still hold once it stands (option C below). It keeps about half the street mouths it would otherwise close.
- **The plaza is 10.00 m.** `Bld_Market_Stall_01` and `_03` are 10.06 m long, so only `_02` fits: one stall per plaza or front lot.

## 2. The rules the probe used (proposed)

| Piece | Where | Rule in the probe |
| --- | --- | --- |
| `Bld_Tent_01..03`, `Bld_Pod_01..04` | a court's lawn, apron and paths; a park that is not a farm | inside the place's cells, 1 m off any building, 1.5 m apart, clear of clean trees and benches by 0.3 m (no removes) |
| `Bld_WaterTower_01` (7.75 x 14.21) | one per court, **on the ground** | as the images show it (on legs, on the ground). The note's "Roofs" row is not used |
| `Env_Farm_Circle_01..03`, `Env_Farm_Straight_01`, an irrigator each | a park's lawn inside its pavement edge | the park's trees and benches removed |
| `Bld_Market_Stall_02` (5.23 x 5.79) | a plaza or front lot | one each. A front lot with a market takes no containers |
| `Prop_Container_01..07` (2.2 to 2.7 x 3.2 to 4.6) | a court stall, or a kerb bay (3.33 x 5.0) | one per stall, centred. Every container fits every stall |
| `Bld_Wall_02` (5.0 x 1.67 x 0.58), 3 to 5 in a row | across a junction arm at its crossing line, pavement corner to pavement corner, through the cells' middles | see section 3 |
| `Prop_Crate_*`, `Prop_Fuel_Tank_*`, 11 standing `Prop_Greeble_*` | a pavement cell fronting a held block | one per cell at most, on a hashed spot. Clear of every pole, light and lamp-post place (T-1) and of clean pieces by 0.3 m. Beside a pole is allowed (B7) |
| `Prop_Solar_Panel_02`, `Prop_Fabric_01/02` | a roof deck (the cell less 0.3 m, H3's RE) | up to 2 per column, 0.1 m clear of H3's pieces. **`Solar_Panel_03/04` and `Fabric_03` fit no deck**: 4.63 m or more against 4.40 m |

Every piece above is textured in the converter's report (X-5). None is emissive.

**The density (HD), from each district's `held` only (X-6):**
- **`held` 0:** nothing. The district was left at once.
- **Always** (`held` above 0):
  - clutter in each pavement cell, chance 0.3 x `held`
  - a container in each court stall and each kerb bay, chance 0.5 x `held`
  - each court, and each park that is not a farm, filled to `held` x its room
  - each free roof spot, chance 0.3 x `held`
- **From `held` 1/3:**
  - a barricade on each street mouth but one, chance `held`
  - the market stalls
  - the court water towers
- **From `held` 2/3:** the parks become farms.

On the 20 runs, `held` falls 92 / 84 / 81 / 91 districts at 0, under 1/3, under 2/3, and 2/3 or more.

## 3. Barricades, measured

A **street mouth** of a held district, in the ring reading, is a junction arm with two properties:
- the junction has an arm that one of the district's blocks fronts;
- this arm has none of the district's blocks on either side.

Each held district has 4 to 14 of them, and every held district has at least one.

The inner reading counts only the ends of streets that run between two of the district's own blocks. A one-block district has none of those: 81 held districts have none.

At most, every mouth is closed but the district's hashed-first.

| Option | Barricades a run | T-1 (lamp-post places under one) | T-2: districts whose poles split | Districts cut off from the city | Runs passing |
| --- | --- | --- | --- | --- | --- |
| A. Ring, every mouth but one | 53 to 100 | 32, on 14 runs | 11 to 22 (7 to 16 held) | 9 to 17 | 0/20 |
| B. As A, never an arm a held neighbour fronts | 4 to 24 | 3, on 3 runs | 0 to 7 (unheld only) | 0 to 5 | 1/20 |
| I. Inner streets only, one way in per district | 8 to 31 | 2, on 2 runs | 1 to 6 (all held) | 0 | 0/20 |
| **C. As A, placed only where T-1 and T-2 still hold** | **29 to 45** | **0** | **0** | **0** | **20/20** |
| **C at the density (HD)** | **16 to 40** (553 in all) | **0** | **0** | **0** | **20/20** |

- **C keeps 1 to 11 ways in** for each held district at most, and 1 to 13 at the density. It skips 21 to 57 mouths a run for T-2 and 0 to 4 for T-1 at most; at the density it skips 0 to 19 and 0 to 3.
- **Stage 9 pieces under a barricade** (signal masts, walk heads, push buttons, stop signs at the corners): 3 to 21 a run under C at most, and 1 to 20 a run at the density (194 in all, 0.36 a barricade). Each would be a `remove` ("what its pieces replace").
- **T-2's centre rule** (B-Q5) reads the barricades correctly, because each wall runs through the middles of its cells. No refinement is needed.
- **Cost of the check** (an **estimate**): one walk-graph search per candidate, about 40 a run, on about 6,000 street cells. The whole probe takes 1.8 to 3.8 s a run, including reading a 7 MB file.

## 4. The rest, measured

The room is the most that fits. The density (HD) column is what the rule above places.

| Over the 20 runs | Room (the most) | At the density (HD) |
| --- | --- | --- |
| Held courts | 22 to 39 a run (639) | |
| Courts with room for a camp | 551 of 639 (88 too small or full of trees) | |
| Tents and pods | 107 to 280 a run; 0 to 20 a court, median 3 | 36 to 127 a run (1,644), of which 266 in parks |
| Water towers in courts | 12 to 29 a run | 6 to 22 a run |
| Held parks | 3 to 8 a run (101); **every one fits a farm** | 0 to 5 a run become farms (39) |
| Farm pieces / park props removed | 4 to 19 / 20 to 91 a run | 0 to 15 / 0 to 55 a run |
| Plazas and front lots: one stall each / props removed | 3 to 11 / 9 to 36 a run | 1 to 9 / 4 to 27 a run |
| Court stalls / kerb bays | 144 to 270 / 126 to 225 a run | 31 to 94 / 33 to 64 containers a run |
| Kerb-bay containers over a circuit point | 0 | 0 |
| Held pavement cells / with a clutter spot | 764 to 1,404 / all but 0 to 5 a run | 85 to 281 a run |
| Clutter over a pavement cell's middle (closes it for T-2) | 50 to 114 a run | (inside the closed count below) |
| Roof columns / with 1 spot / with 2 | 1,300 to 2,390 / 86% / 18% | 163 to 418 items a run |
| Roof items per held building (H3's today: 2.6 to 2.8) | 5.4 to 5.7 (most on one: 12 to 14) | 3.0 to 3.3 |
| T-1 on all the adds | | 0 on 20/20 |
| T-2 street cells closed (clean: 1 to 9) | | 31 to 72 without barricades, 113 to 249 with; 0 districts fail |
| Pieces / distinct keys a city | | 444 to 1,131 / 43 to 46 (J2's instancing comes first) |

- **B10:** roof items go from H3's cap (2.6 to 2.8 per held building) to about 3.2 at the density. D2's tech roof items come first and are not counted.
- **Camps in courts** keep clear of the court's trees and benches. Letting them remove those instead would take out 63 to 175 pieces a run.

## 5. Kit against the intended-use note (X-11)

| Piece and use | The images | Verdict |
| --- | --- | --- |
| Tents and pods on courts and park lawns | on open ground; pods in a ring round a camp (seen clearly) | as shown |
| Water tower on the ground in a court | on legs, on the ground (inferred) | as shown. The note's "Roofs" row is the departure, so the probe does not use it |
| Market stall in a plaza | stall rows facing a square (seen clearly) | as shown (one stall, not a row) |
| Clutter on pavements | on the ground round stalls and garages (inferred) | as shown. `Prop_Fuel_Tank_*` is not shown |
| `Prop_Solar_Panel_02` and `Prop_Fabric_01/02` on roofs | panels on a building top (seen); fabric draped over a building top (inferred) | as shown. `Solar_Panel_02` is the post-mounted one that the note calls "a ground or edge piece more than a flat-roof one". It is the only panel that fits a deck |
| **Farms in a city park** | fields on open land outside the settlement (seen clearly) | **departure**: inside the town. Reason: the park is the city's open land, and the plan turns it to food |
| **Containers in stalls** | not shown in any scene | **departure (not shown)**. Reason: stall-sized boxes, the district's stores |
| **`Bld_Wall_*` across a street mouth** | wall segments on a layout sheet only; no barricade line in a scene | **departure (not shown)**. Reason: the Frontier pack has no barricade piece. The Apocalypse pack's `Prop_Barricade_*` and `Prop_Road_Barrier_*` are shown closing a street (Screenshot_08), but they belong to the ruin's pack |

Left out as the ticket says: alien plants, sand, cliffs, weapons, character parts, the cantina interior. Also left out: the `_Insert` pieces, the flat greebles, `Bld_Wall_Large_01` and `Bld_Wall_Tower_01` (not shown).

## 6. Recommendation

- **The density HD** in section 2, with its constants in one file of `src/city/holdout/`.
- **Barricades by option C:**
  - the ring's street mouths;
  - each closed by a `Bld_Wall_02` line at its crossing line, chance `held` from 1/3;
  - the district's hashed-first mouth always open;
  - a barricade placed only where T-1 and T-2 still hold with it;
  - the stage 9 pieces under it removed.
- **Markets:** one `Bld_Market_Stall_02` per plaza or front lot.
- **Stores:** court stalls and kerb bays both.
- **Water tower:** on the ground in courts, never on roofs.
- **Camps:** no removes in courts.
- **Cost:** no merged section, digest, pin or approved number moves. The clean city is untouched (X-1). E2's criteria take section 2's rules and section 4's numbers as its sketch.
  - Option C is a placement rule, not a loosened check: T-1 and T-2 still run on the era and throw (X-4).
  - It makes E2's barricades depend on what E1 and E2 placed before them, so the order is fixed: E1's plant and lines, then E2's other pieces, then barricades last, in hashed order.

## 7. Questions for Josh (recommended answer first)

1. **"Hold-out density by how long a district held out: nothing where it was left at once; clutter, stored containers, camps and roof panels everywhere else, more the longer it held; barricades, market stalls and water towers from a third; parks turned to farms from two thirds. About 450 to 1,100 pieces a city. Yes?"** **Recommended: yes.**
2. **"Barricades close the streets leading into a held district, always leaving one open, and only where every district's poles can still reach each other on foot and nothing covers the circuit. Without that last part, every test city fails. About 30 barricades a city. Yes?"** **Recommended: yes.**
3. **"A barricade takes away the traffic sign or signal part it stands on (about 10 a city). Yes, or leave a gap round them?"** **Recommended: yes.**
4. **"Stored containers go in courtyard parking stalls and in kerbside parking bays. Both, or courtyards only?"** **Recommended: both.**
5. **"A plaza or front lot holds one market stall (the two long stalls are 6 cm too long for it). Yes?"** **Recommended: yes.**
6. **For the Fable session (X-11 departures, on Josh's delegation): "Accept three uses the store images do not show: farms in city parks, containers in parking stalls, and Frontier wall pieces as street barricades (rather than the Apocalypse pack's barricades, which belong to the ruin)?"** **Recommended: yes.**

## 8. What the orchestrator does for each answer

- **1 yes.** The architect writes HD into E2's cut, with a fixture of three districts at `held` 0.2, 0.5 and 0.8 (as D1's bands). **1 other shares:** he names them. The architect scales the chances; the numbers scale about linearly, so no new probe run is needed.
- **2 yes.** E2's cut takes option C, and a criterion that a fixture with two touching held districts keeps both districts' poles joined. **2 no:** no reading measured passes on any run. The architect puts option C's numbers to Josh again, or E2 places no barricades.
- **3 yes.** E2 lists a `remove` for each stage 9 piece under a barricade. **3 gap:** the wall is cut round each piece, and the probe is re-run for T-2.
- **4 both / courtyards only.** E2's stores slot lists the stalls it may use.
- **5 yes.** E2's kit has `Bld_Market_Stall_02` only. **5 no:** Josh names a place (an inner street, a court), and the probe is re-run.
- **6 yes.** The three are recorded under X-11 in E2's cut. **6 Apocalypse barricades:** E2's kit reads `apocalypse-ruin` for them, and the holdout-pass agent file adds that report.
- **In every case:** E2 still waits for B, C1, J2 and E1 (the plant first). Its roof and pavement numbers are re-measured by its builder on the tech era (D1, D2).

## 9. The other cities

3 x 3 and 6 x 4 were not run (Josh, 21 Nov 2026: best effort, report only).

## 10. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\1d0fef8a162d2b35\a299b8bb-7f57-4f1c-8232-566e8fc38f02\scratchpad\e2pre\probe.ts`
- It uses a copy of `src/core` and `src/city` from this branch and the B and D1 pre-checks' circuit sketch (`circuit.ts`).
- It reads the D1 pre-check's dumps of the 20 runs' clean layers, in `...\1513c4d561c80576\...\scratchpad\d1pre\cities\`.
- It ran as one process at below-normal priority, about 60 s for the 20 runs.
- `all.json` holds the rows and `sum.cjs` the summary.
- Nothing of it is in the repo. The scratchpad may be cleared; this note and the B pre-check's are enough to rebuild it.
