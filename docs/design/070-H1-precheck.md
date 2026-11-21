# 070 H1 pre-check: ground storeys on stage 5's fixed frame

**Josh's answer (20 Nov 2026, in chat).** Asked the three questions as recommended (1: a ground piece may stop up to 1 cm short of the floor above; 2: the six deep shop pieces may run back up to 0.6 m into the always-built building behind, placed against the front edge; 3: the 58 ring-2 buildings that face stalls on every column may have no door), he answered: "Yez, all three".

20 Nov 2026, pipeline-designer, on `goal/city-style` at 9f711b6. This is a sketch: a throwaway probe outside the repo that runs stages 1 to 5 as merged on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) and lays H1's kinds, doors and S1 levels over them. The GLB numbers are measured from `city-pack.glb` with the repo's own `measureDoor`, `measureBodyPlane` and `measureOpenSide`. The builder's numbers are the record.

## 1. What is wrong: it does not hold, for three reasons

**A. S1 leaves no shop corner.** A ground piece is 3.00 m tall (manifest bounds), the slot is 3.00 m, and the first floor is fixed at 3. So a 3.00 m piece can only stand at y 0, and then its door is at its own sill. Any sill over `SILL_MAX_M` (0.15) has no level. Both shop corners are over it (`Shop_Corner_01` by 9 mm), so `shopCorner` has no key at all. Every street corner fails: 5,890 corners, **20 of 20 runs fail**.

| Key | Height | Sill | S1 level (y, door, top) |
| --- | --- | --- | --- |
| Shop_01 | 3.054 | 0.106 | -0.054, 0.052, 3.000 |
| Shop_02 | 3.300 | 0.071 | -0.071, 0.000, 3.229 |
| Shop_03 | 3.084 | 0.043 | -0.043, 0.000, 3.041 |
| Shop_04 | 3.170 | 0.077 | -0.077, 0.000, 3.093 |
| Shop_06 | 3.000 | none | 0, none, 3.000 |
| Door_01, Door_Corner_01 | 3.000 | 0.029 | 0, 0.029, 3.000 |
| floors (Apartment_0n, Corner_0n) | 3.000 | none | 0, none, 3.000 |
| **Shop_05** | 3.000 | 0.361 | **none** |
| **Door_02, Door_Corner_02** | 3.000 | 0.206 | **none** |
| **Shop_Corner_01** | 3.000 | 0.159 | **none** (short by 0.009) |
| **Shop_Corner_02** | 3.000 | 0.376 | **none** |

The window sills of the three styles (0.756, 0.417, 0.517) never bind; only the no-gap rule and the 0.15 sill limit do.

**B. M2 fails on six ground keys.** With `BODY_M`'s ground insets (which H1 says to use and pin), six keys are deeper than 5.00 m, beyond the 0.02 limit. The grammar's M2 says a piece that fails is dropped. That would leave one single shop (`Shop_02`), no `Shop_03`, and only `Shop_Corner_02`, which A rules out. Criterion 3's centred placement would then also fail M1 front and back, by half the extra depth.

| Key | Body, w x d (m) | Extra depth |
| --- | --- | --- |
| Shop_01 | 5.000 x 5.317 | 0.317 |
| Shop_03 | 10.000 x 5.390 | 0.390 |
| Shop_04 | 5.000 x 5.270 | 0.270 |
| Shop_05 | 5.000 x 5.057 | 0.057 |
| Shop_06 | 5.000 x 5.269 | 0.269 |
| Shop_Corner_01 | 5.000 x 5.072 | 0.072 |
| the other six ground keys, all floors | 5.000 x 5.000 | 0 |

All widths are 5.000 (10.000 for `Shop_03`). Every one of the 26,376 street columns has a built partner behind it (0 with an opening behind). So the extra depth always runs into the block, never onto an open face.

**C. 58 quiet buildings have nowhere to put their door.** They are all 2 or 3 columns on ring 2, facing a yard court. Every mid column opens onto `stalls`, and any corner they have is a street corner (plaza) or also faces stalls. The stall rule removes every door place, but rule 9 and M8 want exactly one door. 19 of 20 runs have 1 to 6 such buildings (only seed 5 off has none).

Readings that hold as written:
- D1: 11 quiet buildings have 2 or more quiet corners, giving 14 `floorCorner`s.
- D3: no building's non-blind columns disagree on frontage. 1,340 quiet buildings carry a shop corner (M8's exception).
- D2: holds.
- D4: measured below.
- The walk at y 0: holds. Read from `TILE_LEVELS`, not run: every pavement walk and every interior surface is at 0. Grass is 0.01 m up, and no door faces it.

**D4, the corner doors** (from the GLB):

| | Insets (front, back, -x, +x) | Body | Second face | Sill | Height |
| --- | --- | --- | --- | --- | --- |
| Door_Corner_01 | 0.529, 0.048, 0.529, 0.048 | 5.000 x 5.000 | -x | 0.029 | 3.000 |
| Door_Corner_02 | 0.058, 0.057, 0.058, 0.057 | 5.000 x 5.000 | -x | 0.206 | 3.000 |

Both pass M2, and both have their second face on -x. `_02` has the same sill as `Door_02`, so S1 leaves it out (A).

Other numbers:
- 27 street buildings have no mid column, so no door. Criterion 2 allows this.
- 672 quiet mid columns and 4 quiet corners are kept off a door by stalls.
- The fascia tops along a building spread by up to 0.229 m (`Shop_02` beside a 3.000 m key), or 0.239 m with lever G1 below.
- Not run: the outside cities.

## 2. Options, measured

**For A** (the shop corner). Runs passing are counted with B's option 2 and C's option 1 in.

| Option | Corners possible | Keys still left out | Runs |
| --- | --- | --- | --- |
| G1: up to 0.01 m gap under the first floor | Shop_Corner_01 (y -0.010, door 0.149) | Shop_05, Door_02, Door_Corner_02, Shop_Corner_02 | 20 |
| G6: up to 0.06 m gap | Corner_01, and Door_02 and Door_Corner_02 come back (door 0.146) | Shop_05, Shop_Corner_02 | 20 |
| G23: up to 0.23 m gap | every key | none | 20, with a 23 cm slot showing |
| SILL_MAX_M from 0.15 to 0.16 | Shop_Corner_01 (door 0.159) | as G1 | 20, but it changes a number Josh approved (055 F) |
| Sink the building in stage 5 (062 B's way) | all | brings back the sill band (S2 falls) | re-opens merged F2; not probed |

**For B** (M2):
1. **Drop the six keys** (the grammar as written). A can then only be met by G23.
2. **Ground pieces held across and at the front only.** Width and the front and open-side planes stay on the cell edges within 0.02 (M1, M2, G1). The back may run up to `OVERLAP_MAX_M` (0.6) past the back edge into the built partner. Measured worst case: 0.390. The placement is front-aligned, not centred. The six keys stay.

**For C** (the doorless buildings):
1. **No door on a building whose every door place faces stalls.** M8 reads "exactly one, or none when every place faces stalls". This covers 58 buildings.
2. Its door goes behind a stall there. This overrides the stall criterion.
3. Re-cut mass (C3) to keep an apron cell in front of one column. This re-opens a merged section and moves every digest pin from mass on.

## 3. Recommendation and its cost
- **A: G1**, a 1 cm gap tolerance (the same size as `FRONTAGE_TOL_M`). It is the smallest change that gives any shop corner. The gap at that size is an estimate: likely not visible, but G2's screenshots decide. Cost: S1's "0 tolerance" becomes 0.01. Four keys are never placed on the pipeline, so every door is `Door_01` and every corner door is `Door_Corner_01`. If Josh wants door variety, G6 (a 6 cm gap) is the alternative.
- **B: option 2.** Cost: it changes how the grammar's M1 and M2 are read for ground pieces, a Law check that only Josh's words can change. H1's criterion 1 (the always-test of 5.00 x 5.00), criterion 3 (centred placement) and the M1 check are re-worded.
- **C: option 1.** Cost: it changes M8's "exactly one door" for about 3 buildings a city. That is Josh's word too.
- Nothing merged moves. No digest pin and no approved number moves under these three. SILL_MAX would, so it is not recommended.

## 4. Questions for Josh
1. "No shop corner fits a 3 m storey with its door at the walk. May a ground piece stop up to 1 cm short of the floor above?" (yes / no; no means pick a larger gap or raise the sill limit)
2. "Six shop pieces are 5.06 to 5.39 m deep. May their extra depth run back into the building behind them (always built), instead of dropping those six shops?" (yes / no)
3. "58 ring-2 buildings (about 3 a city) face parked cars on every column. May they have no door?" (yes / no; no means a door behind the stalls)

## 5. What the orchestrator does for each answer
- **All three yes.** The architect re-cuts H1:
  - S1's gap is 0.01, quoting Josh.
  - Criterion 1's M2 test and criterion 3's placement become front-aligned, with the back allowance.
  - Criterion 2 and M8's check get the no-door case, with a failing fixture each.
  - The builder starts H1 with this note's D4 numbers typed in.
  - H1b and G2 are unchanged.
- **1 no.** Josh names G6, G23 or SILL_MAX 0.16, and the architect writes that in instead.
- **2 no.** The six keys are dropped. Question 1 then needs a 0.23 m gap or more, so it goes back to Josh.
- **3 no.** Criterion 2 lets a door stand behind a stall only on such a building, and the stall check gets that exception. With C's option 3 instead, C3 re-opens before H1.

## 6. The probe
`C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h1probe`:
- `glb.ts` and `body.ts`: the GLB readings.
- `city.ts`: the sketch, with switches `GAP` and `SILL_MAX`.
- The outputs: `out0.txt` (S1 as written), `out-GAP=*.txt`, `out-SILL_MAX=0.16.txt` and `out-final.txt`.
