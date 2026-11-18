# 056 · Parking rules for the tile city: how many spaces per home and per shop, which go on the street and which in lots

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "I approve one through three"; item 3 is this ticket, with all six open questions at their defaults). Builds on `goal/city-style` after 055 B, C and E are merged into it. Sections A, then B and C (may run in parallel).
branch: one per section: `ticket/056a-parking-layout`, `ticket/056b-parking-draw`, `ticket/056c-parking-guide`

## Josh's words (18 Nov 2026, in chat, after looking at the tile city of 055 A to C)
> "Roads look good, parking spaces are overwhelming. Too many parking spaces. We should create rules in the style sheet that indicate how much parking should be available on the streets vs parking lots for residential and business style units."

No puzzle is in this ticket, and nothing on the ladder maps changes.

## Baseline (measured 18 Nov 2026 by the architect; no browser)
Measured on `ticket/055b-tile-lots` at `7e291ff`, the only branch with both bays and lots. `tileCity` was run, then `packTown` on 055 B's typed-in fixture stacks (`PIECE_SIZES` in `tilecity.test.ts`). The bays are counted at E's 3 per `ParkingLines_01` tile (criterion 27). The code on the branch says 2, so today's screen shows two thirds of these bay numbers, and **section E makes it 1.5 times worse**.

**Units.** These are stylised and read from the packed plan:
- **shop** (a business unit): one ground bay that is a shop or a shop corner (the `groundRow` kinds of `citymetrics.ts`). The two-column shop counts once.
- **home** (a residential unit): two column-floors of a stack's upper floors (2 x 5.2 m x 6 m, about 62 m²).
- Each block also has one residents' door bay.

**Default city (3 x 3, seed 1):**

| | Today (E: 3 bays per tile) |
| --- | --- |
| `ParkingLines_01` tiles | 122 (330 parking-band cells) |
| Kerbside bays | **366** (244 at today's 2 per tile) |
| Bays on the outer side of edge streets, facing yard and serving nobody | 66 |
| Bays facing a block | 300: 24 to 42 per block, mean 33 |
| Block kerb (both sides of every street, block intervals only) | 1,800 m |
| Bays per 100 m of block kerb | **20.3** (one bay every 4.9 m) |
| Share of each side's kerb that is bays | avenues 0.72; streets 0.38 over both sides, so about 0.75 on the parking side |
| Longest run of bays | a whole block side less one cell at each end: 6 to 10 cells, 3 to 5 tiles, 9 to 15 bays unbroken |
| Parking lots (10 x 10 m, two `ParkingLines_01` = 6 stalls each) | 3, so 18 stalls; plazas 2 |
| Packed stacks | 103 stacks, 273 columns, 2.97 floors over the base on average |
| Units | **405 homes** (811 column-floors), 37 to 52 per block; **166 shops**, 16 to 21 per block |
| Spaces per unit | 384 spaces for 571 units: 0.67 per unit, **95% of them on the street** |

**Seeds 1 to 10 (ranges):**

| | 3 x 3 | 6 x 4 |
| --- | --- | --- |
| Tiles | 111 to 134 | 249 to 301 |
| Bays | 333 to 402 | 747 to 903 |
| Outer bays | 66 to 78 | 108 to 123 |
| Bays per block | 9 to 57 | 0 to 60 |
| Bays per 100 m of block kerb | 18.2 to 20.8 | 15.6 to 18.5 |
| Avenue kerb share | 0.72 to 0.77 | 0.72 to 0.76 |
| Parking lots | 3 to 7 | 6 to 15 |
| Homes | 405 to 453 | 1,046 to 1,158 |
| Shops | 164 to 186 | 415 to 473 |

Seeds 1 to 5 sit inside the same ranges. Per block, both sizes hold about 45 homes and 18 shops.

**What makes it overwhelming:**
1. 055 A pairs every parking cell of every parking band between junction clearances (design item 5), so bays line about three quarters of every parking side.
2. The edge streets park on their outer side, facing yard.
3. Off-street parking is a floor (055 B: one lot per 4 blocks, or one where a block has under 4 bays), not a share of demand.

## The rules (draft guide text; section C puts them in `docs/city-style-guide.md` as a new chapter 18 "Parking")

### 18.1 Who parks where
- **Default (056):** shoppers park at the kerb, residents park off the street.
  - A **shop** gets `PARK_PER_SHOP` (1/3) short-stay kerbside bays, on its own block's sides.
  - A **home** gets `PARK_PER_HOME` (0.15) stalls in a parking lot, in its own block or across one street.
  - Residents never count on kerb bays, and shoppers never count on lot stalls.
- **Info:** these are drawn spaces, about half of what a real dense terraced core provides. A real core has about 0.3 spaces per home, and about 1 per 40 m² of shop, which here is about 0.7 per 31 m² shop bay. The camera reads every drawn stall at full size, and Josh found the full count overwhelming.

### 18.2 Units (read from the layout, checked against the plan)
- **Default:** units are counted per block from the nominal terrace lots, so the layout can place parking before anything is packed.
  - Shops = columns minus one door column per terrace lot.
  - Homes = floor(columns x `UNIT_FLOORS_NOMINAL` (3) / `HOME_COLUMN_FLOORS` (2)).
  - The packed plan measures 2.97 floors over the base, and shops within about 3% of the nominal count. The layout's numbers must stay within 10% of the packed plan's.

### 18.3 Kerbside bays (shoppers)
- **Default:** a block's quota is `max(BAY_TILES_PER_BLOCK_MIN (1), round(shops x PARK_PER_SHOP / BAYS_PER_PARKING_TILE))` `ParkingLines_01` tiles.
- Where the bays go:
  - They go on the block's own sides that have a parking band: both sides of an avenue, and the hash side of a street.
  - Avenue sides fill first, then longer sides, with ties by id.
  - Fill is round-robin: one run per side before any side takes a second.
  - A run is centred on its side's free stretch, offset by hash.
- Run and gap limits:
  - A run is at most `BAY_RUN_TILES_MAX` (2) tiles: 20 m, 6 bays.
  - Two runs on one side have at least `KERB_GAP_MIN_M` (10 m) of kerb without bays between them.
  - The `BAY_JUNCTION_CLEAR` (1) cell next to each crossing never holds a bay, as today.
- Caps:
  - A side's bay length is at most `KERB_BAY_SHARE_MAX` of its kerb: avenue 0.4, street 0.3.
  - The city has at most `BAYS_PER_100M_MAX` (6) bays per 100 m of block kerb.
- **Default:** the outer side of an edge street faces yard. It holds no bay, and its parking band is plain.

### 18.4 Lots (residents)
- **Default:** a block wants `clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX (2))` parking lots. `LOT_STALLS` is 2 x `BAYS_PER_PARKING_TILE` = 6.
- Every lot is placed by demand, through `parkRuns`. The terrace fill's hash lot (`PARKING_ONE_IN`) is switched off in the tile city.
- Lots stay 10 x 10 m on the tile grid with a kerb cut (055 B), and the cut's parking cells stay plain asphalt so cars can turn in.

### 18.5 The parking band without bays
- **Default:** a parking-band cell that holds no bay and is not in front of a kerb cut becomes a **build-out**: pavement level, a sidewalk tile, with a street tree on every `BUILDOUT_TREE_EVERY` (2)th build-out cell along a side, which is one every 10 m.
  - The kerb follows the build-out's edge.
  - A build-out next to a crossing is the classic corner bulb-out, and it shortens the crossing.
  - In front of a kerb cut the cell stays `parkingPlain`, and on an edge street's outer side too (Q2 decides whether that outer band becomes build-outs as well).

### 18.6 Too little, too much
- **Too little room for lots:** this is a block where no run of at least `TILE_PARK_MIN_RUN_M` can take a lot.
  - Its lot quota moves to the neighbour across its longest street, up to that neighbour's `LOTS_PER_BLOCK_MAX`.
  - If no neighbour can take it, the shortfall is recorded on the block (`parkingShort`).
  - At most one block in nine may be short.
- **Too little room for bays:** this is a block with no parking side, or one where every side is at its cap.
  - Its shoppers' bays go in the parking band across its longest street. They are recorded as serving it (`ParkingBay.serves`).
  - Each run there still obeys 18.3's limits.
- **Too much:** bays past a block's quota, or past a cap, are never laid. Their cells are build-outs. A block never holds more than `LOTS_PER_BLOCK_MAX` lots, its own and borrowed together.

### The arithmetic against the baseline (default city)

| | Today | Under these rules |
| --- | --- | --- |
| Shoppers' bays | 166 shops x 1/3 = 55 wanted, 300 on block sides (5.4 times too many) | 16 to 21 shops per block: 5.3 to 7 bays, so 2 tiles (6 bays) per block, **54 bays** |
| Residents' stalls | 405 homes x 0.15 = 61 wanted, 18 in lots (0.3 of it) | 37 to 52 homes per block: 5.6 to 7.8 stalls, so 1 lot per block, **9 lots, 54 stalls** (0.89 of demand) |
| Outer bays | 66 | **0** |
| Total spaces | 384 (95% kerb) | **108** (50% kerb, 50% lots): **-72%**, about 0.19 per unit |
| Bays per 100 m of block kerb | 20.3 | **3.0** (cap 6) |
| Kerb share | avenue 0.72, street parking side about 0.75 | at most 20 m of a 40 to 60 m side, so 0.33 to 0.5 on the one or two sides that take a run, and 0.10 overall (caps 0.4 and 0.3; a 40 m street side takes one tile) |
| Lot frontage | 30 m of terrace front | 90 m of the 1,800 m |

The 6 x 4 seeds land the same per block (about 18 shops and 45 homes), so 2 tiles and 1 lot each: about 144 bays and 24 lots, against 747 to 903 bays and 6 to 15 lots today.

Today's city fails every check below, so it is the failing fixture for P1, P2, P3, P4 and P6 as it stands.

## Goal
In a dev build, Josh opens `/?puzzle=<any>&view=3d&city=tiles` and sees:
- a few short runs of parking bays on each block, mostly on the avenues;
- kerb build-outs with street trees in the rest of the parking band;
- one or two parking lots per block for the residents;
- no bays on the yard side of the edge streets.

The guide has a parking chapter that says how many spaces a home and a shop get, which go on the street and which in lots, and the caps. A check (P1 to P6) holds the default city and seeds 1 to 10 to it. Nothing on the ladder maps changes.

## Sections (each at most a day)
- **A. The rules in the layout, and the checks** (about 1 day, pure). It covers 18.1 to 18.6 in `tilecity.ts`, the `parkByHash` switch in `town.ts`, and a new `parkmetrics.ts`. It needs 055 B, C and E merged.
- **B. Drawing** (about ½ day). Build-out cells and their trees in `tilecity3d.ts` and `tileslots.ts`, plus the eye check. It needs A.
- **C. The guide** (about ½ day). Chapter 18, the Numbers rows, and a drift check for the new names. It needs A, and may run beside B.

## Acceptance criteria
**CI-safe rules (every section)**, as 055's:
- Use typed-in fixtures, never `assets/private/` at module or `describe` level.
- No Windows paths, no timer under 1 s.
- The largest city a test builds is 6 x 6.
- The packed cross-check (criterion 3) runs at most the default city and seeds 1 to 10 at 3 x 3.

### A (Vitest; new `parkmetrics.test.ts`, new cases in `tilecity.test.ts`)
1. [ ] **Constants.** `tilecity.ts` exports these, with a test pinning each:
   - `PARK_PER_SHOP = 1/3`, `PARK_PER_HOME = 0.15`;
   - `HOME_COLUMN_FLOORS = 2`, `UNIT_FLOORS_NOMINAL = 3`;
   - `BAY_TILES_PER_BLOCK_MIN = 1`, `BAY_RUN_TILES_MAX = 2`, `KERB_GAP_MIN_M = 10`;
   - `KERB_BAY_SHARE_MAX = { avenue: 0.4, street: 0.3 }`, `BAYS_PER_100M_MAX = 6`;
   - `LOTS_PER_BLOCK_MAX = 2`, `LOT_STALLS = 2 * BAYS_PER_PARKING_TILE`;
   - `PARK_SUPPLY_BAND = { lo: 0.75, hi: 1.5 }`, `BUILDOUT_TREE_EVERY = 2`.

   `CITY_BAYS_PER_BLOCK_MIN` and `CITY_LOTS_PER_BLOCKS` are removed (they are replaced by 18.3 and 18.4), together with their test cases. `BAYS_PER_PARKING_TILE` stays 3.
2. [ ] **Units.** Each `TileBlock` carries `units: { columns, shops, homes }`, computed from its nominal terrace lots by 18.2. Their sums on the default city are within 10% of the baseline's 273 columns, 166 shops and 405 homes.
3. [ ] **Units match the plan.** On the default city and seeds 1 to 10 at 3 x 3, `packTown` runs on the fixture stacks. For every city, the city-wide shop count of `groundRow` kinds and the homes (column-floors / 2) are each within 10% of the layout's sums.
4. [ ] **The layout.**
   - Bays: the bays serving each block number its 18.3 quota in tiles times `BAYS_PER_PARKING_TILE`, or fewer only where 18.6's caps stop them, and then the shortfall is recorded. No bay lies on an edge street's outer side.
   - Lots: each block has its 18.4 lot quota, its own or borrowed under 18.6.
   - Hash lots: with `parkByHash: false`, no lot comes from `PARKING_ONE_IN`.
   - Order: deterministic per (size, seed).
5. [ ] **Build-outs.** Every parking-band cell is exactly one of: half of a `ParkingLines_01` tile, `parkingPlain` in front of a kerb cut or on an edge street's outer side, or the new role `buildout`.
   - A kerb segment lies on every edge between a `pavement` or `buildout` cell and a carriageway cell, and on no other edge. This matches 055: a `kerbCut` breaks the kerb (design item 6 and T4), and a `pavementCorner`'s edges carry none (055 A's kerbs are the merged block-side segments between corners). *(Wording fixed 18 Nov 2026 after the 056 A review, before section C writes chapter 18.)*
   - 055 A's criteria 1 to 4 and 6 still pass, with `buildout` counted as pavement in criterion 4.
   - Pole slots do not move.
   - `city.buildoutTrees` holds one tree on every `BUILDOUT_TREE_EVERY`th build-out cell along each side, at the cell centre, and never on a cell next to a crossing.
6. [ ] **The checks.** New `parkmetrics.ts`, pure:
   - `parkingMetrics(city)`, `PARK_CHECK`, and `evaluateParking(m)`, returning one verdict per check (P1 to P6), as `evaluateCity` does:
     - **P1 shoppers at the kerb:** city kerb bays within `PARK_SUPPLY_BAND` x shops x `PARK_PER_SHOP`, and every block at least `BAY_TILES_PER_BLOCK_MIN` tiles, its own or across one street.
     - **P2 residents in lots:** city lot stalls within `PARK_SUPPLY_BAND` x homes x `PARK_PER_HOME`. Every block has a lot or a neighbour's lot across one street, none has more than `LOTS_PER_BLOCK_MAX`, and at most ceil(blocks / 9) blocks are short.
     - **P3 kerb share:** every side within its profile's `KERB_BAY_SHARE_MAX`, and 0 bays on outer sides.
     - **P4 runs:** every run at most `BAY_RUN_TILES_MAX` tiles, every gap between runs on a side at least `KERB_GAP_MIN_M`, and no bay in a cell next to a crossing.
     - **P5 the band:** criterion 5's three-way rule, and the tree pitch.
     - **P6 not overwhelming:** bays per 100 m of block kerb at most `BAYS_PER_100M_MAX`.
   - Each check passes on the default city and seeds 1 to 10 at 3 x 3, and on seeds 1 to 3 at 6 x 4.
   - Each check fails on its own fixture:
     - P1, P2, P3, P4 and P6 fail on a city laid by 055's rule (every parking cell paired; a test-only copy of today's pairing, or a frozen fixture of today's default city's cells and bays);
     - P5 fails on a city with one build-out turned to `parkingPlain` away from any kerb cut.
7. [ ] **Nothing moves on the ladder.**
   - `town.ts` gains only `TerraceRowOpts.parkByHash?: boolean`, default `true`.
   - `townpin.test.ts` (055 B) passes unedited.
   - The eight suites of 055 criterion 9 pass unedited.
   - `bayMeters` and `tileKeepouts` keep their signatures; meters follow the bays, so there are fewer of them, and 055 criterion 23 still holds.
8. [ ] **Pure.** `parkmetrics.ts` imports nothing from three, the DOM, `src/grid/` or `src/night/` (a source test). `tilecity.ts`'s import test still passes.

### B (Vitest unless marked)
9. [ ] **Build-outs drawn.** `buildout` is in `TILE_SLOTS` with the sidewalk straight keys. `TILE_FRONTS` turns it so its kerb edge faces the lane.
   - It stands on the carriageway like every sidewalk-family tile (055 criterion 28: walk at 0, the carriageway at `-SIDEWALK_WALK_M`).
   - With its keys absent, it is code-drawn as the pavement box, and criterion 13's per-role fallback test covers the new role.
   - Each of `city.buildoutTrees` is one `SM_Env_Tree_01..03` instance, chosen by hash, at its point, at y 0, through one `InstancedMesh` per key.
   - `TILE_DRAW_CALLS_MAX` still holds, or the builder raises it in the report with the count.
10. [ ] **The sheet.** `&sheet=1` shows `buildout` once, labelled, with 055 criterion 30's layout rules (no label overlap at 1280 x 720 and 390 x 844).
11. [ ] (Main session, screenshots, `npm run dev`) The main session checks each of these URLs, with and without `&light=day`:
    - `/?puzzle=01-first-light&view=3d&city=tiles`
    - `&city=tiles&blocks=6x4&seed=3`
    - `&city=tiles&cam=street&run=0`
    - `&city=tiles&cam=street&run=1`

    On them:
    - Bays come in short runs (at most 6 bays) with build-outs and trees between them. Most runs are on the avenues.
    - No bays are on the edge streets' yard side.
    - Each block has one or two lots, behind kerb cuts.
    - Build-out kerbs read as kerbs, with no gap and no floating tile at a build-out's ends.
    - The corner bulb-outs do not cover a zebra.

    Then `&city=tiles&sheet=1`: the build-out is readable. Then `/?puzzle=09-shrine-circuit&view=3d` reads exactly as on `goal/city-style`. The screenshots go to Josh.

### C (Vitest unless marked)
12. [ ] **Guide.** `docs/city-style-guide.md` gains chapter 18 "Parking", sections 18.1 to 18.6 as drafted above.
    - Josh's words above are its **Decided** line, and every number is a Default with the constant's name.
    - The baseline and the arithmetic table go in as **Info**, re-measured on the merged A (the test's numbers, not this ticket's).
    - Josh's answers to the open questions replace the defaults they settle.
    - If chapter 17 exists (055 D), its parking paragraph points to chapter 18 and says nothing that disagrees with it. If it does not exist yet, chapter 18 says that 055 D's chapter 17 defers to it on parking.
13. [ ] **Numbers.** The Numbers table gains a row for every constant of criterion 1 and every export of `parkmetrics.ts`. `styleguide.test.ts` gains a drift check for those names only: a new check, with the existing checks unedited. 055 D's later check over all of `tilecity.ts` will include them.
    - *Guide test (added 18 Nov 2026):* `styleguide.test.ts`'s "has the sixteen chapters" check lists the chapter numbers, so it must be extended to include chapter 18. That one edit to an existing check is allowed. Every constant the new text names must be exported by a module the test reads.

### Every section
14. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. Writes nothing under `assets/`.
15. [ ] (Main session) Before review:
    - `npm run gate` is green and the test count grew.
    - `npm run playtest` is green with **no snapshot change**.
    - `git diff` of the section touches only its Files.
    - `git diff -- src/core/ src/render/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html vite.config.ts` is empty.
    - `git ls-files assets/private` is empty.

## Files
- **A, may touch:** *(widened by the main session during 056 A, 18 Nov 2026: adding a `TileRole` forces these, so A also edited the four B test lists, and added `buildout` to `tileslots.ts`'s `TILE_SLOTS`, `TILE_LEVELS` and `TILE_FRONT_TEXT`; B keeps the drawing itself)* `src/render3d/tilecity.ts`; `town.ts` (only `TerraceRowOpts.parkByHash`, default `true`, read where the hash lot is chosen); new `parkmetrics.ts` and `parkmetrics.test.ts`; `tilecity.test.ts` (new cases, plus the removed constants' cases replaced); `tileintegrate.test.ts` (only cases whose counts follow the new bays and lots).
- **B, may touch:** `tileslots.ts` (the `buildout` slot and front, the sheet entry), `tilecity3d.ts` (drawing build-outs and trees), `tileslots.test.ts`, `tilecity3d.test.ts`.
- **C, may touch:** `docs/city-style-guide.md` (chapter 18, the Numbers rows, and one pointer line in chapter 17 if it exists), `styleguide.test.ts` (the new drift check only).
- **Must not touch (every section):**
  - `furniture.ts`, `dressing.ts`, `streetcam.ts`, `citymetrics.ts`, `terrace.ts`, `stacks.ts`, `models3d.ts`, `renderer.ts`, `layout.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `scene.ts`, `colourway.ts`, `gallery.ts`, `calibration.ts`;
  - `tilemetrics.ts`, if 055 D has made it (see Dependencies);
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/` (never `puzzles/locked/`), `tools/`, `package.json`, `vite.config.ts`, `index.html`, `public/`, `assets/`;
  - `tickets/`.

  A builder who needs one of these stops and asks for a re-cut.

## Dependencies on 055
- **Must be merged into `goal/city-style` first:**
  - 055 B: lots, kerb cuts, `parkRuns`, `TILE_PARK_MIN_RUN_M`;
  - 055 C: drawing, `TILE_SLOTS`, the sheet;
  - 055 E: 3 bays per tile, `SIDEWALK_WALK_M`, the lot cells drawn, `bayMeters` and the keep-outs wired.

  056 A's numbers assume E's 3 bays per tile.
- **055 D** may land before or after 056.
  - If 056 lands first, D's T6 ("parking on every block") is satisfied by P1 and P2, and should be re-cut to defer to them. D's chapter 17 then points to chapter 18.
  - If D lands first, 056 C adds the pointer line in chapter 17, and the main session re-cuts T6 to use P1 and P2. 056 does not edit `tilemetrics.ts`.

  055 D's T6 is re-cut to defer to P1 and P2 (recorded in 055 on 18 Nov 2026).
- **055 criteria that 056 changes** (each recorded in 055 as a "From 056" note on 18 Nov 2026):
  - **27** keeps 3 bays per tile, but "`CITY_BAYS_PER_BLOCK_MIN` stays 4" is replaced by 18.3, and "criteria 5 and 11 hold with the new number" becomes "criterion 5 holds; criterion 11 is replaced by 056 criteria 4 and 6".
  - **5** (A): "every `ParkingLines_01` is two parking cells of one street" still holds. Most parking cells are no longer paired.
  - **11** (B): "at least 4 bays or a lot per block; ceil(blocks / 4) lots" is replaced by P1 and P2. The kerb-cut parts stay.
  - **4** (A): the kerbs now also run along build-outs.
  - **23**: unchanged in wording, but fewer meters.
  - **26**: more lot cells, so the instance counts follow.
  - **28**: build-outs are sidewalk-family, so the same levels apply.
  - **31**: "three bays per parking tile visible" still holds, on fewer tiles.

  055 criteria 1 to 3, 6 to 10, 12 to 22, 24, 25, 29, 30 and 32 are unaffected.

## Interfaces
- **No `src/core/` change, no schema or event change, no new dependency.** Everything is local to `src/render3d/`, and the builder may rename any of it.
- `tilecity.ts` (A):
  - the constants of criterion 1;
  - `TileRole` gains `"buildout"`;
  - `TileBlock.units: { columns: number; shops: number; homes: number }`, `TileBlock.parkingShort: { stalls: number; bays: number }` (zero when met), and `TileBlock.lots: number` (own and borrowed);
  - `ParkingBay.serves: string`: the block whose quota it counts toward, usually `block`;
  - `TileCity.lotStalls: readonly ParkingBay[]`: 6 per lot, the same record shape, `street` the lot's street, so a later cars ticket has every space (Q4);
  - `TileCity.buildoutTrees: readonly { x_m: number; z_m: number; street: string }[]`.
- `town.ts` (A): `TerraceRowOpts.parkByHash?: boolean`, default `true`, which is today's behaviour.
- `parkmetrics.ts` (A):
  - `type ParkCheckId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6"`;
  - `PARK_CHECK: Readonly<Record<ParkCheckId, number>>`;
  - `interface ParkingMetrics { kerbBays; lotStalls; shops; homes; bays100m; sideShares; runs; gaps; outerBays; shortBlocks; badBandCells }`, shaped by the builder;
  - `parkingMetrics(city: TileCity): ParkingMetrics`;
  - `evaluateParking(m): { id: ParkCheckId; value: number; pass: boolean }[]`.
- `tileslots.ts` (B): `TILE_SLOTS.buildout`, `TILE_FRONTS` for it.

## Open questions for Josh (answered 18 Nov 2026: every default applies, "I approve one through three")
1. **The ratios.** Default: shops get **1 kerb bay per 3 shops**, homes get **1 lot stall per 7 homes** (0.15). On the default city that is 54 bays and 9 lots, 108 spaces against 384 today. Alternative: double both (about 0.3 per home and 2 per 3 shops: about 110 bays and 18 lots, closer to a real dense core).
2. **What fills the parking band where no bay is.** Default: **kerb build-outs at pavement level with a street tree every 10 m**, and corner bulb-outs at the crossings. Alternatives:
   - (a) plain asphalt (`Road_01`, no lines): the cheapest, but it reads as a very wide road;
   - (b) narrow the profiles instead: streets lose their parking band (20 m), avenues keep one band on each side for the short runs. This changes 055 A's grid criteria, so it is a bigger ticket.

   Also: should the edge streets' outer, yard-side band become build-outs too? Default: it stays plain.
3. **Rear courts.** Default: **no**. The lots stay 10 x 10 m on the frontage, 1 or 2 per block, costing about 90 m of the 1,800 m of terrace front. Alternative: a later ticket puts residents' lots in rear courts inside the blocks, reached through one gap in the terrace. The blocks' insides are dark yard now, so this would free the frontage and could hold the double ratio of Q1.
4. **Bay records for later cars.** Default: **keep them**: kerb bays as today, plus 6 `lotStalls` records per lot, so a cars ticket can fill both in one step. Alternative: drop the lot stall records until cars come.
5. **Residents at the kerb.** Default: **none**: residents' spaces are off-street only. Alternative: up to a third of residents' demand may take kerb bays on the streets, not the avenues, in place of build-outs.
6. **Units.** Default: a home is 2 column-floors (about 62 m²) and a shop is one shop ground bay. Alternative: a home is one column-floor (about 31 m², twice the homes, so halve `PARK_PER_HOME` to keep the same picture).


### Open items (added 18 Nov 2026 after the 056 A review; for Josh)
7. **A tile-city R6 floor** (like `TILE_CITY_R7_MIN`). R6 (share of shop bays with a sign) sits at its 0.5 floor on the tile city only through the dressing's sign chance, and 056 A tunes `LOT_RUN_SALT = 46` to keep it there. Default until Josh answers: keep the salt and the 0.5 floor. The question for him is whether to set a tile-city R6 floor (for example 0.45, as R7 got 0.4) so that a later layout change does not need re-tuning.

Decided rules: none is touched (rendering only, no puzzle); `rules-coverage.md` does not change.
