# 070 I pre-check: stage 8, ground dressing

21 Nov 2026, pipeline-designer, on `goal/city-style` at 4f57528 (I's re-cut).

**This is a sketch.** A throwaway probe outside the repo builds each named city through stage 7 with the merged code (read-only). It then places stage 8 as I's re-cut words it: RN, PF, KO, AV, EL, DK, MT, GB, PZ, FL and LB, with `furnitureLayout`'s run walk and open-lot pieces copied into it. Every check of I's list is then run on every prop.
- **Runs:** the 20 named runs only (6 x 6 seeds 1 to 10, one-way off and on). No 3 x 3 or 6 x 4 city was run.
- **Three ways, as asked:** as cut, without EL, and without DK. A fourth way, without either, is the tile city's rule, for comparison.
- **The GLB** was read only for the ground keys' fronts (section 2, Q4).
- **Hashes:** the probe hashes with `ground:<seed>` keys, so its picks differ from any the builder makes. The builder's numbers are the record.

## 0. Premises the measurements change

- **As cut, the stage fails all 20 named runs,** on two checks that read plaza and lot pieces. Pavements, lanes and greens pass every check on every run. The cut runs both checks on "a prop"; the tile city never ran either on its plazas and lots.
  - **stage 7:** a plaza tree or hot-dog stand under a shop awning. 200 pieces on 20 runs.
  - **R10 keep-outs:** 196 pieces in all.
    - A plaza's front bench is 1.25 m from the corner cell (133). 
    - A frontage lot's front lines tile and its meter stand at the lot's own kerb cut, 0 m and 0.84 m away (23 lines tiles, 33 meters).
  - The fix is Q5.
- **The cut's lane walk puts every bin on a cell edge** (s = 10, 20, 30 m...). A bin there touches the door strips of two columns at once. That is why DK refuses 920 of 1,403 bin places. Moving the walk half a cell onto a column's middle triples the bins (Q3).
- **Q28's conditional fourth question is triggered,** but only just (Q4). Four ground keys' bounds reach more than `FURN_WALL_M` 0.4 m past the cell edge (up to 0.557 m). In the GLB, below 2.5 m that is only two things:
  - the residents' door's step;
  - a 1 cm ledge on `Shop_04`.

## 1. What holds

On 20 of 20 runs, at the recommendation (section 3):

| Holds | Measured |
| --- | --- |
| RN: every run's front cell is a `pavement` cell | 23,902 of 23,902; no stop |
| Every street-front outer cell in exactly one run | 0 missing, 0 twice |
| Runs a city | 144 to 213 (3,545 in all), 10 to 80 m long, about 6 km of run a city |
| Every check of I's list | 0 failures on 20 runs |
| Lane bins on every named run | 16 to 37 a city |
| Greens: trees and benches in courts and in parks on every run | court trees 22 to 100, park trees 44 to 90 a city |
| Plazas dressed | 168 of 168; every one has two street sides, so the front pick always has its two choices |
| Frontage lots dressed | 23 of 23 |
| The billboard is under the lowest eave | lowest eave 9 m against 6.9 m |
| MT is exercised | 76 to 114 meters taken out a city |
| No R10 density over one item per 5 m on any run | highest run: 2.0 per 10 m |
| Stage time | 15 to 30 ms a city (the build through stage 7 is 0.6 to 1.0 s) |

- **What the merged layers give stage 8, a city:**
  - **Escapes:** 86 to 106 on street faces and 15 to 41 on lane faces. Every one's lowest box (its drop ladder) is at 0.0 m.
  - **Residents' door columns:** 825 to 1,053. About 419 face a street and 108 a lane.
- **BT:** 333 kerb trees on 20 runs (about 17 a city) stand within 12 m of a build-out tree.

## 2. The questions, measured

**Pavement items per 10 m of run** (the old tile city's eye number is about 1.25, one every 8 m; the old town's test asserts 0.5 to 2). All 20 runs; lowest to highest run.

| Rules | Pavement items (20 runs) | Per 10 m | Per 10 m without bollards | Wall-line items | Runs with nothing |
| --- | --- | --- | --- | --- | --- |
| **As cut (EL and DK)** | **8,293** | **0.64 to 0.74** | 0.37 to 0.47 | 2,568 | 209 |
| Without EL | 8,887 | 0.69 to 0.79 | 0.41 to 0.51 | 3,162 | 183 |
| Without DK | 10,909 | 0.85 to 0.97 | 0.57 to 0.70 | 5,184 | 119 |
| Without either (tile city) | 11,572 | 0.91 to 1.02 | 0.62 to 0.74 | 5,847 | 97 |

**Why it is sparser than the tile city, even under the tile city's rules:**
- **The runs are short.** A run stops at every opening (drive, lane mouth, lot, plaza). 6 runs in 10 are 35 m or less, and 257 are 10 m long.
- **The ends are kept clear.** The 4 m corner keep-out at each end takes 24% of all run length.
- **Bollards** (3,278) are 40% of pavement items, and they take the kerb-line places next to them (1,710 kerb places refused for pitch).
- **MT takes 4 meters in 5 off the kerb line** (1,923 of 2,357), and nothing refills their places. That is the tile city's `bayMeters`, as ported.

Raising the density would mean changing ported numbers (`P_FURN`, the pitch, or refilling MT's places). That is not asked here.

**Q1. EL (nothing under a fire escape).** What it costs, on 20 runs:

| | Without EL | With EL | Cost |
| --- | --- | --- | --- |
| Wall-line items | 3,162 | 2,568 | 594 (19% of the wall line, about 30 a city) |
| Lane bins (column-middle walk) | 644 | 539 | 105 (16%) |
| Kerb line | | | 6 tries (escapes reach 2.11 m out; a kerb tree under one was already refused) |

Without EL, a bin, bench or planter may stand where the drop ladder lands on the walk. All 162 to 208 escapes a city have their ladder at 0.0 m.

**Q2. DK (clear of residents' doors).** Each door column keeps a strip 5 m along and 1.5 m out clear of every wall-line item and bin. What it costs:

| | Without DK | With DK | Cost |
| --- | --- | --- | --- |
| Wall-line items | 5,184 | 2,568 | 2,616 (half the wall line, about 130 a city) |
| All pavement items | 10,909 | 8,293 | 24% |
| Lane bins, the cut's walk | 943 | 166 | 82% |
| Lane bins, column-middle walk | 1,053 | 539 | 49% |

DK also covers the residents' door's step (Q4). Without DK, 2,587 wall-line items stand in front of a door column; where one stands at the step, it stands 0.125 m into it.

**Q3. LB (lane bins in the lane, against the wall).**
- **Where a bin goes.** The cells beside a lane are always built or a drive, never apron: 245 of 1,403 places are beside a drive and are skipped. So the tile city's apron bins cannot exist here.
- **The lane stays open.** A bin's back is 0.4 m off the wall, and it reaches 0.98 to 1.05 m into the lane, leaving 3.95 m or more clear of 5 m.
- **The walk:**

| Lane bins (20 runs), as cut otherwise | Placed | A run | Refused: door | Refused: escape | Beside a drive |
| --- | --- | --- | --- | --- | --- |
| The cut's walk (bins on cell edges) | 166 | 4 to 13 a city | 920 | 72 | 245 |
| **Column-middle walk (s + 2.5 m)** | **539** | **16 to 37 a city** | 514 | 105 | 245 |

**Q4. A ground-storey keep-out?**
- **The trigger.** Over the 20 runs, these keys' bounds reach past 0.4 m on run faces:
  - `Apartment_Door_01`: 8,375 columns, 0.529 m;
  - `Shop_04`: 2,508, 0.557 m;
  - `Shop_06`: 2,518, 0.52 m;
  - `Shop_02`: 2,491, 0.425 m.
- **What reaches out below 3.2 m**, from the GLB:

| Key | 0 to 0.3 m up | 0.3 to 2.5 m up | 2.5 to 3.2 m up |
| --- | --- | --- | --- |
| `Apartment_Door_01`, `_Door_Corner_01` | **0.525 m (the step, 2 m wide)** | 0.27 m | 0.53 m |
| `Shop_04` | 0.08 m | **0.411 m (1.1 cm past)** | 0.557 m |
| `Shop_06` | 0 | 0.14 m | 0.52 m |
| `Shop_02` | 0.23 m | 0.23 m | 0.43 m |

- **Above 2.5 m** it is the cornice band. That is over every wall-line item; the tallest is 1.6 m.
- **The step** sits only in front of a door column, which DK already keeps clear.
- **That leaves `Shop_04`'s 1.1 cm,** under about 26 wall-line items a city.

**Q5. Plazas and frontage lots.** As cut, every named run fails (section 0). What each fix costs, on 20 runs:

| | Plaza pieces | Lot pieces | Runs failing |
| --- | --- | --- | --- |
| As the tile city places them (as cut) | 1,175 | 159 | 20 (stage 7: 200; keep-outs: 196) |
| **A group under an awning or escape is left out; keep-outs read pavement items and lane bins only** | **975** (lost: 168 of 251 plaza trees, 32 of 78 hot-dog stands) | **159** | **0** |
| Both fixes, and keep-outs read plaza and lot pieces too | 837 (and 138 front benches) | 103 (each lot's front lines tile, every lot meter) | 0 |

## 3. Recommendation and its cost

1. **EL yes.** It costs 30 wall items and 5 lane bins a city.
2. **DK yes.** It halves the wall line, but a bench or bin across a front door (and on its step) reads wrong. It is the grammar's own rule for bins (rule 9).
3. **LB yes, with the walk on a column's middle:** `s = CELL_M + ALLEY_BIN_EVERY_M / 2 + CELL_M / 2 + n x ALLEY_BIN_EVERY_M`. That gives about 27 lane bins a city instead of 8.
4. **No ground-storey keep-out.** The builder reports `Shop_04`'s near pairs.
5. **Plazas and lots** keep clear of stage 7 as pavement items do: a group with a piece taller than a box's base over it is left out. KO and the R10 keep-outs check read pavement items and lane bins only, as on the tile city.

At this, every check holds on 20 of 20 runs. The density is 0.64 to 0.74 per 10 m, about one item every 15 m. That is below the tile city's eye number of one every 8 m and inside the old R10 band of 0.5 to 2. The pictures show it.

**What it costs.**
- **Nothing merged moves.** No earlier layer, digest pin or approved number changes; stage 8's digest is new.
- **Re-cut lines:**
  - LB's walk offset (a new half cell);
  - PZ and FL gain AV;
  - KO and its check are scoped to pavement items and lane bins.
- **Every ported number keeps its value.** `ALLEY_BIN_OFFSET_M` is dropped on the pipeline, as the cut already says.

## 4. Questions for Josh

1. "Nothing stands under a fire escape, because its ladder comes down to the pavement. It costs about 30 pavement items and 5 lane bins a city. Yes?" (yes / no; **recommended yes**)
2. "Nothing stands in front of a residents' front door, a strip 1.5 m out, on the pavement or in a lane. It halves what stands against the walls. Yes?" (yes / no / "bins only"; **recommended yes**)
3. "Lane bins stand in the lane against the wall (never on the pavement), one every 10 m, alternating sides, centred on a building bay so a door strip blocks fewer of them, leaving about 4 m of the 5 m lane clear. Yes?" (yes / no; **recommended yes**)
4. "No extra keep-out for the ground floors' fronts. Only a door step and a 1 cm ledge reach past where wall items stand, and the door rule already covers the step. Yes?" (yes / no; **recommended yes**)
5. "Plazas and parking lots are dressed as on the old city, except that a piece that would stand under an awning or fire escape is left out (most plazas lose a tree). The kerb-cut and corner keep-outs apply to pavement items only. Yes?" (yes / no; **recommended yes**)

## 5. What the orchestrator does for each answer

- **All yes.** The architect re-cuts I on those words. The changes:
  - Q28 recorded;
  - LB's walk gains the half cell;
  - PZ and FL gain AV ("a group with a piece over which a stage 7 box's base is lower than the piece's top is left out");
  - KO and "R10 keep-outs" read pavement items and lane bins only;
  - criterion 4's hand-worked bin moves from s = 10 m to s = 12.5 m;
  - criterion 6 drops nothing but expects plazas with fewer trees.

  The builder then starts on `ticket/070i-ground`. Files and criteria are otherwise as cut.
- **Q1 no.**
  - EL leaves the cut: an escape's AV base is its piece's own base, as on the tile city.
  - The fixture "a bin moved under an escape's drop ladder fails stage 7 (EL)" goes, and criterion 4 loses "refused for escape".
  - Nothing else changes.
- **Q2 no.**
  - DK and the "doors" check leave the cut, along with criteria 4 and 7's door items.
  - Q4 then reopens: about 130 wall items a city would stand at door columns, some on the step. The architect asks Josh again whether a step keep-out (the step's 2 m only) is wanted.
- **Q2 "bins only".** DK reads bins (pavement and lane) only; the other wall items are not measured. One more probe run before the re-cut.
- **Q3 no.**
  - Either the bins stay on the cut's cell-edge walk (about 8 a city), or lanes get no bins.
  - Josh's words decide which; the architect re-cuts LB and criterion 4 on them.
- **Q4 no (a keep-out wanted).** The architect adds a rule that a wall item's back stands clear of the ground piece's reach below its own height (at most 0.557 m). That moves `FURN_WALL_M`'s meaning on those columns, a change only his words can make. One more probe run.
- **Q5 no.** Then the cut fails all 20 named runs, so the stop rule's question goes back to him with these numbers:
  - stage 7: 200 plaza pieces under awnings;
  - keep-outs: 196 plaza and lot pieces.

## 6. Pictures and probe

**Pictures** (6 x 6 seed 1, one-way on, at the recommendation):
- `C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\iprobe\i-seed1-plan.png`: the whole city, every ground prop as a coloured dot (615 props).
- `C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\iprobe\i-seed1-lane.png`: block 0:8 close up (1 cell = 5 m). It shows:
  - its lane with 4 bins;
  - the street runs round it, with every prop's footprint;
  - the door strips (purple);
  - escapes (red) and awnings (orange).

**Probe files** (`C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\iprobe`):
- `probe.ts`, the measurements. `OPEN=tile|av|avko` sets the plaza and lot rule; `LANE=cut|mid` sets the lane walk. One run measures all four rule sets.
- `sum.cjs`, the totals.
- `glbfront.cjs`, the ground keys' fronts from the GLB.
- `render.cjs`, the pictures.
- The results: `out-tile-cut.json`, `out-av-cut.json`, `out-avko-cut.json` and `out-av-mid.json`.
