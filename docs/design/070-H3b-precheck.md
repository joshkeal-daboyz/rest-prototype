# 070 H3b pre-check: the water-tower cap

**Josh's answer (21 Nov 2026, in chat).** Asked the three questions as recommended (1: count one water tower per X buildings on each street block, hashed pick; 2: X = 16, about 44 towers a city; 3: option (c), a roof that loses its tower gets a roof exit only where its row would otherwise have no big roof item, small props otherwise), he answered: "Yes to all".

21 Nov 2026, pipeline-designer, on `goal/city-style` at b8ba0be (H3 merged, 194643e).

**This is a sketch.** A throwaway probe outside the repo copies H3's merged `buildRoofs` and adds one hook: a tower refused by the cap. Everything else is imported read-only.
- With no cap, the copy gives exactly the merged `facades.roofs` (same digest) on all 20 runs.
- It runs on the 20 named runs only (6 x 6 seeds 1 to 10, one-way off and on). No 3 x 3 or 6 x 4 city was run.
- The salts are the cut's form: `rand("roof", "tower", <block id>, building id)`, and `"city"` in place of the block id under (b). The builder's numbers are the record.

Josh's words: "Create a rule where there can only be so many water towers per city blocks", then: "Fine. You get one water tower per x amount of buildings. I don't want to see water towers across the entire city because they just fit".

## 0. Premises the measurements change

- **H3 has 163 exits a city now, not about 80.** The cut says about 1,600 exits in 20 runs. That was the H3 note's figure from before NV. Since NV, roofs that used to take a novelty sign take towers and exits instead. Merged H3 has, in 20 runs:
  - 5,108 water towers (255 a city, 223 to 289);
  - **3,254 exits (163 a city, 1 building in 6)**;
  - 1,200 billboards (60 a city).
- **"Small props only" cannot be built at any X offered.** With plain roofs, *more* towers help R8, so the limit is the *highest* X that keeps 0.5, not the lowest. That X is **7**, below all four Xs offered:
  - counted per block, X = 7 gives 0.500 on seed 10 on, with nothing to spare;
  - at X = 8, seed 10 on is at 0.489;
  - at X = 12 and up, 19 or 20 of the 20 runs fail.
- **Per run (TX (c)) gives 0 towers at every X.** No B2 run has 8 or more buildings. Confirmed.

## 1. What holds

**With the freed roofs taking the rotation (i), or the middle option (c) below, everything holds on 20 of 20 runs at X = 8, 12, 16 and 24, under both countings:**
- R8 (both numbers);
- M9b;
- RX: 0 failures. The reviewer's latent mismatch is not tripped (section 2, Q6);
- the deck, the roofs and the cap;
- no block or city over its tower cap;
- every tower the pick keeps is placed.

**Plain roofs (ii) break R8 at every X offered.** Showing Josh the rotation's exits is the real question.

## 2. The questions, measured

**Q1. Towers per city and per block** (TS's hashed pick; blocks are the blocks with buildings, 29 to 43 a run, 35 on average).
- A block holds 13 to 54 buildings (median 23 to 29).
- Under (a) every block is over its cap today, so the towers placed always equal the cap.

| X | (a) per block: towers a city | Blocks with 0 / 1 / 2 / 3+ towers | Blocks under X buildings | (b) per city: towers a city |
| --- | --- | --- | --- | --- |
| today | 255 (223 to 289) | up to 21 on one block | none | 255 |
| 8 | 103 (90 to 117) | 0 / 0.8 / 12.6 / 21.9 | 0 | 118 (103 to 132) |
| 12 | 63 (53 to 71) | 0 / 13.3 / 17.2 / 4.8 | 0 | 79 (69 to 88) |
| **16** | **44 (36 to 52)** | **0.5 / 26.6 / 7.5 / 0.8** | 0.5 (0 to 2) | 59 (51 to 66) |
| 24 | 23 (18 to 29) | 13.2 / 21.4 / 0.8 / 0 | 13.2 (5 to 23) | 39 (34 to 44) |

**Q2. How they spread.** Each figure is a city average. "Nearest" is the median distance from a tower to its nearest other tower, in 5 m cells.

| | Nearest (cells) | Row-neighbour pairs | Rows with 2+ towers | Most on one block | Most on one block side |
| --- | --- | --- | --- | --- | --- |
| H3 today | 2.1 | 34.6 | 50.0 | 21 | 6 |
| (a) X 16, hashed | **9.6** (8.2 to 11.0) | 0.8 | 1.3 | 3 | 3 |
| (a) X 16, first-come | 9.4 | 1.4 | 2.8 | 3 | 2 |
| (b) X 16, hashed | 5.2 | 4.1 | 5.3 | 8 | 4 |
| (b) X 16, first-come | 2.2 | 6.6 | 9.7 | 17 | 5 |
| (a) X 24, hashed | 13.7 | 0.1 | 0.1 | 2 | 2 |

- **Per block spreads the towers by itself.** The hashed pick halves the row-neighbour pairs against first-come.
- **Per city clumps:**
  - with the hashed pick, up to 8 towers on one block and 7.6 blocks with none;
  - first-come puts up to 17 on one block.
- **No spacing rule is needed under (a).**
- **Picture:** `h3b-seed1.png` (section 6).

**Q3. What fills the freed roofs** (per block; a city average).

| X | Freed roofs | (i) rotation: exits a city (blind / mid) | Exit share of buildings | (c) bare-run top-up: exits a city | (ii) plain: exits a city |
| --- | --- | --- | --- | --- | --- |
| today | none | 163 (29 / 134) | 0.171 | 163 | 163 |
| 8 | 152 | 315 (60 / 255) | 0.331 | 241 | 163 |
| 12 | 192 | 355 (69 / 286) | 0.373 | 264 | 163 |
| **16** | **212** | **374 (73 / 301)** | **0.393** | **276** | 163 |
| 24 | 233 | 395 (78 / 317) | 0.415 | 289 | 163 |

- **Under (i):**
  - every freed roof becomes an exit (0 billboards, 0 bare roofs);
  - so exits go from 1 building in 6 to 2 in 5;
  - at X = 16 that is +211 a city (+196 counted per city). **This is the exits-everywhere risk, measured.**
- **Under (c):** about 113 freed roofs a city take an exit and 99 stay plain.

**Q4 and Q5. R8 under each option** (counted per block; the lowest of the 20 runs). Floors: 0.9 for the first number, 0.5 for the second.

| Freed roofs get | X 8 | X 12 | X 16 | X 24 | Highest X that keeps 0.5 |
| --- | --- | --- | --- | --- | --- |
| (i) the rotation (mostly exits) | 0.965 / 0.652 | 0.965 / 0.652 | 0.965 / 0.652 | 0.965 / 0.652 | any |
| (ii) small props only | 0.957 / **0.489** (1 fails) | 0.955 / **0.431** (19) | 0.953 / **0.411** (20) | 0.951 / **0.375** (20) | **7** (0.500) |
| (c) exit only where the run has no other big prop | 0.962 / 0.652 | 0.960 / 0.652 | 0.959 / 0.652 | 0.959 / 0.652 | any |
| (c2) exit only on a blind column, else small props | 0.960 / 0.543 | 0.958 / 0.504 | 0.957 / **0.491** (1) | 0.956 / **0.465** (5) | 12 |
| (c3) exits also capped at one per X | 0.955 / **0.492** (1) | **0.413** (20) | **0.375** (20) | **0.320** (20) | under 8 |

- The lowest of each number is on seed 6 on (first) and seed 10 on (second), except (c3), whose lowest is on seed 3 on or seed 10 on.
- (i) and (c) leave R8's second number exactly as H3's, run by run.

**Counted per city instead,** the picture is the same. The limits:
- (ii) is also limited to X = 7 (at X = 8, 0.498 on seed 6 off);
- (c2) holds to X = 16 (0.515) and fails at 24;
- (c3) holds only at X = 8 (0.522).

**What the middle options mean:**
- **(c) the bare-run top-up.**
  - A freed roof takes an exit only where its B2 run would otherwise have no big roof item. One building a run is picked by hash; the others are plain.
  - Every run that had a big prop keeps one, so R8 does not move.
  - The exits added are about half of (i)'s.
- **(c2)** puts exits only where the street can't see them. It is too thin for R8 above X = 12 (0.004 to spare at 12).
- **(c3)** reads "one per X" for exits too. Billboards rise to about 120 a city, and R8 fails from X = 12.

**Q6. RX and RC on the extra exits.**
- **The latent RX mismatch** (`roofcheck.ts`: a mid-column exit on a building whose blind column fits it) is **0 on every run, option, X and counting**.
- The cap (RC) turned away 1 exit in 20 runs, the same one as H3, and never moved an exit from a blind column onto a mid one.
- **No `roofcheck.ts` change is needed.**
- **Small props the cap turns away:** 606 in 20 runs under H3 and (i); 612 to 648 under (ii), (c) and (c2). A freed tower's column takes small props, a few of which meet a full column.

**Q7. What moves.**
- **The facades digest moves on all four pin cities under every option.** H3's pins (seeds 1, 2, 3, 8 on) are `85f425f5`, `40ff1675`, `e1ee93b5`, `06de80d5`. At X 16 per block with (c), the probe gives `ba2851a0`, `7aec0037`, `e135957c` and `4c376582`; the builder's are the record.
- **Roof pieces:** 2,569 a city under (i), (ii), (c) and (c2), against H3's 2,570. A tower and an exit are one piece each. Under (c3) there are about 60 more, from billboards.
- **Unchanged:** `ground`, `dressing`, `walls` and the earlier stages, since only `roofs` changes.

## 3. Recommendation and its cost

- **Count per street block (TX (a)), with TS's hashed pick.** It is Josh's "per city blocks". It keeps towers apart without a spacing rule (median 48 m between them at X = 16, at most 3 on a block). Per city bunches up to 8 on one block.
- **X = 16: about 44 towers a city (36 to 52), against 255.** Most blocks get one and a few get two.
  - X = 24 (about 23 a city) is the choice if Josh wants towers rare: a third of blocks then have none.
  - Every X from 8 to 24 holds under (i) and (c).
- **Freed roofs: (c), an exit only where the run would otherwise have no big roof item, else small props.**
  - It keeps R8 exactly as H3's on all 20 runs.
  - It adds about 113 exits a city (163 → 276) instead of the rotation's 211 (→ 374).
  - **This is a new rule, Josh's to make.** The plain option (ii), which needs no new rule, cannot be built at X ≥ 8 without lowering R8's 0.5. That floor is never lowered, and only Josh's own words could change it.
- **Cost of (c):**
  - `buildRoofs` places every building's big prop first, then tops up the bare runs, then places small props. A column's load is its own building's, so the reorder changes no other choice. The output order of `roofs` must be kept.
  - New checks: the tower cap per block, and a fixture for a block one over its cap.
  - The facades digest is re-pinned on the four pin cities.
  - No threshold moves, no merged section re-opens, and no `src/core/` change.
  - **RX's "holds it" fix is not needed:** the case never occurs.
- **Cost of (i) instead:** one `continue` in the kind loop. That is the cheapest build, but it gives exits on 2 buildings in 5.

## 4. Questions for Josh (Q25)

1. "Count one water tower per X buildings on each street block, so a block of fewer than X buildings gets none and towers stay spread (at 16, at most 3 on any block), rather than across the whole city (up to 8 on one block)?" (yes / no; **recommended yes**)
2. "X = 16? That gives about 44 water towers a city instead of 255; most blocks get one. (X 8 gives about 103, X 12 about 63, X 24 about 23, with a third of blocks getting none.)" (yes, or a number; **recommended 16**)
3. "A roof that loses its water tower gets a roof exit only where its row of buildings would otherwise have no big roof item, and otherwise just small roof props? That adds about 110 exits a city (163 to 276). Giving every such roof an exit adds about 210 (to 374, 2 buildings in 5). Small props only on every such roof is not possible: it breaks the 'half the rows have a big roof item' check at every X from 8 up." (yes / no; **recommended yes**)

## 5. What the orchestrator does for each answer

- **All yes.** The architect re-cuts H3b on those words, then spawns the builder. H1c's pre-check runs once H3b is merged.
  - **TX (a)** and `WATER_TOWER_PER_BUILDINGS` 16: typed in `roofkit.ts` and pinned in `roofpin.test.ts`, naming Q25.
  - **TS's hashed pick,** as cut.
  - **The bare-run top-up** as a new named rule in `roofs.ts`, placed in the order of section 3.
  - **Checks and fixtures:**
    - the tower cap per block;
    - a block one over its cap fails;
    - a block under X buildings with a tower fails.
  - **Report:** towers per block and per city, freed roofs by what they took, and R8.
  - **Digests:** the facades digest re-pinned on the four pin cities; `ground`, `dressing` and `walls` keep their pins.
  - **Dropped from the cut:** RX's `roofcheck.ts` change (0 cases).
- **Q1 no (per city).** TX (b), with the hashed pick.
  - Towers per city: 118, 79, 59 or 39 at X 8, 12, 16 or 24.
  - Towers bunch (up to 8 on one block at X = 16), so ask Josh whether he wants a spacing rule before the re-cut.
- **Q2, another X.** Any X from 8 to 24 holds with Q3 yes, or with the rotation. Type in his number.
- **Q3 no, "every such roof gets an exit".**
  - The re-cut is the cut's first reading: one `continue` in the kind loop.
  - R8 holds at any X.
  - The report shows about 374 exits a city at X = 16. J's screenshots should show Josh the exits.
- **Q3 no, "small props only".**
  - No X from 8 up can be built: R8's second number falls to 0.375 to 0.489.
  - Put to Josh: X of 7 or less (about 118 towers a city per block at 7, a halving only), or answer (c) or (i). The architect does not cut it until he chooses.
  - Lowering R8's 0.5 is a change only his own words can make; it is not recommended here.
- **Q3, "only out of the street's sight" ((c2), exits on blind columns only).** It holds per block only at X ≤ 12 (0.504 at 12, 0.004 to spare), and per city at X ≤ 16. Re-cut with that X.

## 6. Pictures and probe

- **`C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h3bprobe\h3b-seed1.png`:** 6 x 6 seed 1, one-way on.
  - **Colours:** red dots are water towers, blue dots roof exits, yellow dots billboards; grey cells are buildings, alternating shade by block.
  - **Top left:** H3 today (264 towers, 174 exits).
  - **Top right:** X 16 per block with the rotation (48 towers, 390 exits).
  - **Bottom left:** X 16 per block with (c), recommended (48 towers, 286 exits).
  - **Bottom right:** X 16 per block, small props only (48 towers, 174 exits; R8 fails at 0.455).
- **`C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h3bprobe\h3b-seed1-X.png`:** the same city per block with the rotation, at X 8, 12, 16 and 24 (106, 65, 48 and 22 towers).
- **Probe:** `C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h3bprobe`. It contains:
  - `capped.ts` (H3's `buildRoofs` with the hook);
  - `probe.ts`, with `XS=` for other Xs (`out-small.json` holds X 4 to 7, for information);
  - `sum.cjs` and `png.cjs`;
  - `out-main.json`, the results.
