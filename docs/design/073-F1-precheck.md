# 073 F1 pre-check: the ruin's growth over ground, walls and roofs

22 Nov 2026, pipeline-designer. Measured on `goal/city-transformations` at 2a92eec (clean stages, the real `history`, `resolvePlan`, `t1Failures` and `t2Failures` merged). Not committed. Nothing here is decided until Josh says so in chat, or the Fable session on his delegation for an X-11 departure.

**This is a sketch.** A throwaway probe outside the repo built the 20 named runs (6 x 6 seeds 1 to 10, one-way on and off) with the branch's own clean stages and `history`, laid the B pre-check's sketch of K1's circuit (stage 6 is still empty: poles, lights, lamp-post places, drops and spans are K1's words laid by the probe), grew the ruin by the rule in section 2, and judged every add with the branch's real `resolvePlan`, `t1Failures` and `t2Failures` (the circuit passed in as `options.circuit`). E2, D1 and F2 are not built, so their pieces are not counted. The builder's numbers are the record.

## 1. What holds, and what does not

Two of the questions rest on a premise the measurements break. They come first.

- **B8 grants nothing under T-1 as C1 reads it.** A tree is "under" a span when its crown meets the span in plan. C1's T-1 fails every crown that meets a pole line. So every B8 tree fails T-1: 109 to 283 sapling spots a run (4,169 in all, heights 3.6 to 5.4 m, all over `FURN_MAX_H_M`). B8 can only mean "a tree over 3.2 m may stand **beside** a line"; T-1 then decides where (Q1).
- **T-2 fails on 20/20 runs once growth is on the street,** as C1 reads it. C1 closes a cell when any piece with its base under 2 m covers the cell's middle, whatever its height. So a 0.42 m grass mound closes a lane cell as a wall would. With growth at the proposed reach, 37 to 258 poles a run are cut off from their district (4 to 17 districts a run). The fix that holds on 20/20 is E2's: place a growth piece only where T-2 still holds (option G, Q2).
- **Holds:** T-1 on every add (0 failures on 20/20, with saplings and clumps placed only where their footprint or crown is clear); roof growth (no circuit point on a roof until D2); the parks' big trees (every park fits a `Tree_Generic_Giant_01` with its crown clear of T-1); vines on 85% of open faces.
- **Two corrections:** `Tree_Generic_Giant_01` is 12.6 x 11.19 x 13.12 m (w x h x d), so its crown in plan is 13.12 m across (radius 6.56 m), not 12.6 x 11.2. And C1's default `isTree` (a `Tree` word in the key) makes `Tree_Vines_*`, `Tree_Log_*`, `Tree_Stump_*` and `Tree_Dead_*` canopies: F1 must pass its own `isTree`.

## 2. The rule the probe used (proposed)

**Soil** (per run, 574 to 804 cells): park and court lawns (`mass` cells `green`), build-out tree cells, and the pavement and plaza cells with a tree, planter or pot plant. (Farms are parks, so already soil.)

**The spread (GD).** From every soil cell, growth spreads cell by cell to its four neighbours, up to `round(wild x 3)` cells, `wild` being the soil's district's. A cell takes the district of the nearest soil that reaches it. It spreads over street cells (pavement, parking band, lane, junction, crossing) and open ground (aprons, stalls, drives, lanes, plazas, lots, park edges), never into a building.

**What a grown cell gets:**
- Carriageway, parking band or open ground: one cell-sized ground patch (the probe used `Terrain_Ground_Mound_Small_02`, 5.09 x 0.42 x 4.98).
- Pavement: a clump on the wall line, off the cell's middle (`Plant_Fern_01/02`, `Plant_Bush_01/02`, `Env_Overgrowth_Edge_01`), chance 0.6 x `wild`.
- Every grown cell but a junction or crossing: a sapling (`Tree_Birch_01..04`, `Tree_Round_01..05`, 3.6 to 5.4 m) at a hashed spot, chance 0.3 x `wild`, only where its crown is clear of T-1.
- A park in a district from `wild` 1/3: one `Tree_Generic_Giant_01` and one `Tree_Large_01` (9.3 x 8.83 x 5.42), crowns clear of T-1.
- A roof deck (the cell less 0.3 m, H3's RE): up to 2 of `Env_Overgrowth_02/05`, `Plant_Bush_01`, `Tree_Dead_01/02`, 0.1 m clear of H3's pieces, chance 0.3 x `wild`.

The probe's `wild` over the 335 districts: 79 under 1/3, 119 from 1/3 to 2/3, 137 above.

## 3. Growth, measured

| A run (20 runs) | Reach `wild` x 2 | **`wild` x 3** | `wild` x 5 |
| --- | --- | --- | --- |
| Cells grown | 919 to 2,320 | **1,445 to 3,503** | 2,362 to 5,014 |
| Carriageway (B9; of 2,274 to 3,161) | 250 to 588 | **514 to 1,222** | 899 to 1,887 |
| Parking band (of 825 to 1,024) | 154 to 417 | **180 to 517** | 270 to 596 |
| Pavement (of 1,956 to 2,484) | 244 to 582 | **403 to 1,011** | 671 to 1,515 |
| Open ground (parks past their kerbs, courts, lots) | 268 to 878 | **348 to 992** | 522 to 1,226 |
| Saplings placed | 198 to 525 | **290 to 713** | 410 to 908 |
| Sapling spots under a span (B8; all fail T-1) | 66 to 160 | **109 to 283** | 176 to 442 |
| T-2 as C1 reads it: runs failing | 20/20 | **20/20** | 20/20 |

- **Against `wild`, at x 3:** a district under 1/3 grows 0 to 248 cells (median mostly 0), one from 1/3 to 2/3 grows 9 to 501, one above 2/3 grows 54 to 973. Edges and patches round the parks and build-outs, not noise.
- **At x 3, a run's adds:** 1,042 to 2,595 patches, 192 to 517 clumps, 290 to 713 saplings, 2 to 8 giant and 2 to 8 large trees; 1,541 to 3,778 in all. Roofs add 484 to 1,008 (dead trees 73 to 157).
- **Time:** the ruin's sketch step takes 0.5 to 0.8 s a run, without option G (below).

## 4. Trees against T-1, and B8

| At x 3, a run | Result |
| --- | --- |
| Sapling spots | 1,353 to 3,256 |
| Crown over a span (B8's "under a span") | 109 to 283: carriageway 22 to 74, parking band 18 to 70, pavement 68 to 186 |
| Crown over a pole, a light or a lamp-post place | 29 to 102 |
| Over a drop end | 0 (saplings are under 5.5 m) |
| Clear (placed at 0.3 x `wild`) | 1,239 to 2,962 (290 to 713 placed) |
| Parks fitting a giant tree, crown clear | 6 to 8 of 6 to 8 (132 of 132) |
| Parks fitting a large tree, crown clear | 132 of 132 |
| T-1 failures on all adds, real `t1Failures` | **0 on 20/20** |

- Every tree under a span is 3.6 to 5.4 m, over `FURN_MAX_H_M` 3.2 m. Every one meets the span in plan. None can pass T-1.
- **Reading for B8 (Q1):** the ruin's trees are free of the 3.2 m cap, and T-1 alone says where they stand: beside a line, never with the crown over it. Nothing is loosened: T-1 is Josh's ("A tree may grow beside a line, not over it"), and B8 still lifts `FURN_MAX_H_M`.

## 5. T-2, measured

| Option, at x 3 | Runs passing | Poles cut off a run | Growth pieces left out a run |
| --- | --- | --- | --- |
| As C1 reads it, everything placed | 0/20 | 37 to 258 (4 to 17 districts) | 0 |
| F. Pieces under 0.5 m never close a cell | 2/20 | 0 to 17 | 0 |
| S. No growth on crossings or junctions, none over a pavement cell's middle | 0/20 | 4 to 66 | 161 to 437 |
| F and S | 14/20 | 0 to 2 | 161 to 437 |
| **G. As C1 reads it; a piece that closes a street cell is placed only where T-2 still holds** | **20/20** | **0** | **patches 18 to 133, saplings 9 to 56, clumps 3 to 27 (1,862 of 32,965 candidates)** |
| F and G | 20/20 | 0 | saplings 0 to 6, clumps 0 to 2 |

- G is checked with the real `t2Failures` and `t1Failures` on its final set: 0 and 0 on 20/20.
- **G is a placement rule, not a loosened check,** as E2's option C. `assertEraReadable` still runs on the whole layer and throws (X-4).
- **F changes B-Q5's reading** (answered on Josh's delegation, so open to him). It is the truer walk (a 0.4 m grass mound does not stop a walker) but it alone fails 18/20: saplings in lanes close cells too.
- **G's cost** (an **estimate**): the probe's unoptimised twin of T-2 took 17 to 71 s a run for about 1,600 candidates. A builder must check incrementally (only the districts whose walk reaches the new cell). That is the builder's to measure.

## 6. Vines, walls and posts

The reading (ticket, on Josh's delegation): every vine hangs from something above it. A sheet or drape hangs from the roof edge 2.9 to 5.3 m down, or drapes an awning or canopy; `Env_Vines_06` wraps a post; `Tree_Vines_*` hang from branches only.

| A run | Result |
| --- | --- |
| Open faces (street and court) | 2,472 to 3,084 (street 1,181 to 1,511) |
| With a fire escape in the vine's drop | 162 to 208 |
| With a face novelty sign in the drop (low buildings) | 9 to 25 |
| With a drop's wall point (T-1: any vine topped above 5.5 m over the drop's first 2 m) | 202 to 262 |
| **Free for any sheet or drape** | **2,093 to 2,623 (85%)** |
| Drop faces where `Env_Vines_08` (2.08 m) fits beside the drop | 190 to 243 |
| Faces with a window planter (growth from it) | 343 to 463 |
| Awnings and canopies | 791 to 1,001; 281 to 333 carry a fascia or blade sign, 505 to 686 free |
| Posts for `Env_Vines_06` (signal masts, stop and parking signs) clear of a circuit point | 124 to 183 |
| Trees for `Tree_Vines_*` (clean ground trees plus saplings) | 446 to 861 |

- Every roof edge is over 5.5 m (roofs are 6 m and up), so a roof-edge vine on a face with a drop fails T-1 unless it fits beside the drop. Only `_08` and `_06` do.
- An escape takes 3.25 m of a 5 m face, so only `_06` fits beside one.
- Not modelled: how far a 2.1 to 4 m deep drape stands out from the wall (the GLB's pivot is at its base centre). The builder reads it from the GLB; a drape that stands over a drop's first 2 m fails T-1 like a sheet.
- A vine on a circuit pole, light or lamp post covers it (T-1). `_06` goes on traffic posts only.

## 7. Roofs, the broken road, and the kit

**Roofs.** 2,212 to 2,815 of 2,220 to 2,820 decks a run hold at least one piece; 484 to 1,008 placed at 0.3 x `wild`. No T-1 point is on a roof until D2's net, and wires never cover (Q13).

**The broken road (A's road-tile answer; confirmed).** The resolver lets a ruin `state` name an `edge.ground` tile by list and index (`broken` is in `CITY_PIECE_STATES`); a `swap` on it fails "keyless". So F3 draws the damaged piece by the state, and no type or clean digest moves. Two things for F3:
- `apocalypse-power`'s 12 pieces: `_01` (7.38 x 6.63) and `_04` (3.39 x 9.22) are bigger than a 5 m tile, and `_03` is 5.23 m long. The other nine are 2.0 to 3.95 m and fit.
- A state is not a piece, so T-1 and T-2 never see it. `_08`, `_09` and `_12` are heaved slabs 1.1 to 1.2 m high: on a crossing they would stand in the walk unjudged.
- `Env_Sidewalk_Overgrown_*` (5.34 x 0.30 x 2.80; `_03` 2.53 x 2.30) is half a pavement cell wide, so it is an add laid on the pavement tile, not a replacement tile.

**Kit against the intended-use note (X-11).** Every key in section 2 is textured (the reports). Left out: `Plant_Bush_Leaves_03` (missing texture), `Plant_Grass_01` (zero bounds), `Plant_PalmBush_01` (the palm is on the never-used list).

| Piece and use | The images | Verdict |
| --- | --- | --- |
| `Env_Overgrowth_*` patches on pavements, kerbs, roads and flat roofs | Apocalypse Screenshot_11, 16, 19 (seen clearly) | as shown |
| `Env_Sidewalk_Overgrown_*` along pavement runs | Screenshot_16, 19 (inferred) | as shown |
| `Tree_Generic_Giant_01` alone in a park | a centrepiece over a clearing (seen clearly) | as shown |
| Ferns, bushes and grass at pavement edges | Nature: path edges and clearings | as shown (on paving: inferred) |
| `Tree_Vines_*` from tree branches | Nature Screenshots_06 | as shown |
| `Env_Vines_*` over eaves, awnings and posts | Palm City Screenshot_06, 10, 12, 22 | as shown |
| **`Terrain_Ground_Mound_Small_02` on hard ground** | Nature shows natural ground only | **departure (not shown)**. Apocalypse `Env_Overgrowth_*` is the as-shown road patch; the mound is the only one-cell piece |
| **Saplings in the carriageway** | not shown in either pack | **departure (not shown)**; it is Josh's B9 break |
| **`Plant_Bush_*`, `Tree_Dead_*` on roofs** | Nature: "any plant on a roof" not shown; Apocalypse shows moss patches on roofs | **departure (not shown)**; `Env_Overgrowth_*` is as shown |
| **`Env_Vines_06` on traffic sign posts and signal masts** | wraps posts and columns on resort structures | **departure (inferred)**: street posts are not shown |

## 8. Recommendation

- **Growth by GD** (section 2), reach `round(wild x 3)`, constants in one file of `src/city/ruin/`.
- **B8 read as "beside, never over":** ruin trees are free of `FURN_MAX_H_M`; a tree is placed only where its crown is clear of every pole, light, lamp-post place and span (T-1).
- **T-2 by option G:** a growth piece that closes a street cell is placed only where T-2 still holds, in hashed order, as E2's barricades. B-Q5's walk graph stays as it is.
- **Vines** only on faces with no escape, no face sign and no drop in their drop, except `Env_Vines_08` beside a drop where it fits; awnings and canopies with no sign; `_06` on traffic posts; `Tree_Vines_*` on trees.
- **F1 passes its own `isTree`** (the four tree families it plants), so vines, logs, stumps and dead trees are not canopies.
- **The broken road:** F2 and F3 use only the nine damaged pieces that fit a tile; F3 never draws a heaved slab (`_08`, `_09`, `_12`) on a crossing.
- **Cost:** no merged section, digest, pin or approved number moves. The clean city is untouched (X-1). G costs a T-2 check per closing candidate (about 1,600 a run): the builder reports the time. F1's T-1 and T-2 find nothing on the named runs until K2 (C1's empty circuit), so G is proven on fixtures until then, as E2's barricades.

## 9. Questions for Josh (recommended answer first)

1. **"Trees in the ruin may grow taller than 3.2 m, but only beside the dead wires, never with their crown over one (that is what 'the circuit stays readable' allows). About 200 trees a city would otherwise have grown under a wire. Yes?"** **Recommended: yes.**
2. **"Growth on the street is placed only where every district's poles can still be reached on foot, as the barricades are; about 1 growth piece in 20 is left out. Yes, or also count low growth (under half a metre) as walkable?"** **Recommended: yes.** (The second changes the walk rule taken on your delegation.)
3. **"Overgrowth spreads out from parks, lawns, street trees and planters, up to 3 cells where a district is wild, none where it held out to the end: about 1,500 to 3,800 pieces a city, plus 500 to 1,000 on roofs. Yes?"** **Recommended: yes.**
4. **"Vines hang from roof edges, awnings and posts, never over a fire escape, a face sign or a power drop (except one narrow vine beside a drop where it fits). Yes?"** **Recommended: yes.**
5. **For the Fable session (X-11, on Josh's delegation): "Accept four uses the store images do not show: Nature grass mounds and saplings on the road, Nature bushes and dead trees on roofs, and the post vine on street sign posts?"** **Recommended: yes**, with the Apocalypse overgrowth patches used first wherever they fit (they are what the images show).
6. **"Broken road: draw only the damaged road pieces that fit inside one road tile, and no raised slab on a crossing. Yes?"** **Recommended: yes.**

## 10. What the orchestrator does for each answer

- **1 yes.** The architect writes B8 into F1's cut as "free of `FURN_MAX_H_M`; T-1 decides", with a fixture of a tall tree beside a span (placed) and one under it (skipped). **1 no:** B8 is void for F1, and the cut says the ruin's trees stay under 3.2 m near spans; the probe is re-run.
- **2 yes.** F1's cut takes option G, with a fixture where a patch would seal a pole in (skipped) and one that leaves a way round (placed). **2 also low growth:** C1's `t2Failures` takes a height floor (the planner's one-line change in `src/city/pipeline/readable.ts`, which re-opens C1's criterion 4 and its tests), and F1 still uses G for its saplings.
- **3 yes.** The architect writes GD into F1, with a fixture of districts at `wild` 0.2, 0.5 and 0.8. **3 other reach:** section 3 has x 2 and x 5 measured; no new run.
- **4 yes.** F1's vine slots are as section 6. **4 no:** Josh names where vines go, and the probe is re-run for T-1.
- **5 yes.** The four are recorded under X-11 in F1's cut. **5 no:** F1's kit drops them: road patches are `Env_Overgrowth_*` only, roofs take `Env_Overgrowth_*` only, `_06` is left out.
- **6 yes.** A line in F2's and F3's outlines. **6 no:** F3 scales or crops the large pieces, and the heave is judged as a piece (an add, not a state).
- **In every case:** F1 waits for E2 and its own cut. Its pins are re-taken when E2's pieces (and D1's, D2's) stand before it in `resolveBefore`, and when K2's circuit lands.

## 11. The other cities

3 x 3 and 6 x 4 were not run (Josh, 21 Nov 2026: best effort, report only).

## 12. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\1d0fef8a162d2b35\a299b8bb-7f57-4f1c-8232-566e8fc38f02\scratchpad\f1pre\probe.ts`
- It runs over a copy of `src/core` and `src/city` from 2a92eec and the B and E2 pre-checks' circuit sketch (`circuit.ts`), with `run.ps1` (one process, below-normal priority) and `sum.cjs`.
- `r3.json` (reach x 3, with option G: about 13 min for the 20 runs, one core), `r2.json` and `r5.json` (without G: about 40 s each).
- Nothing of it is in the repo. The scratchpad may be cleared; this note and the B pre-check's are enough to rebuild it.
