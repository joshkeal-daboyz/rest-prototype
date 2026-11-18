# 052 · City dressing: awnings, glass, signs, fire escapes, rooftop props and street furniture

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. G1 waived for the city-style goal (Josh, 18 Nov 2026, in chat). Waits for the 050 and 051 sections named under each section.
branch: `ticket/052-city-dressing`

## Josh's words
> "leverage the city pack and establish a style guide that will allow you to build procedural cities by leveraging the city pack... a city guide that is able to yield similar quality results to that city in the image excluding the humans, animals and vehicles." (18 Nov 2026; approvals waived for this goal)

**The look target**: the reference street's ground floors have glass shopfronts, awnings, shop signs and an ATM; the upper floors have fire escapes on the street faces; every roof carries props (AC units, vents, billboards, water tanks, satellite dishes, a pizza-slice shop sign); the pavement has street furniture; a parking lot and a corner plaza break the wall. No people, animals or vehicles. 050 Q6 left all of this out.

## Findings: what the City Pack has (`assets/private/out/manifest.json`, the `packs[]` entry with `pack: "city-pack"`, its `assets[]`, read 18 Nov 2026)
Sizes are width x height x depth in metres (bounds after the pack's `"scale": 100`). Every pivot is centred in x and z with the base at y = 0 (050 finding 1), so where a piece attaches to its building is a rule here, not data.

| Use | Keys | Size (m) |
| --- | --- | --- |
| Awnings | `SM_Bld_Shop_Cover_01`, `_02`, `_03`, `_04`; `_05` (L-shaped, for a corner) | 4.57x0.30x2.81, 4.71x1.20x3.24, 5.00x1.76x3.50, 5.10x0.66x0.73; 5.39x0.68x5.39 |
| Door canopies | `SM_Bld_Cover_01`, `_02` | 4.83x1.07x1.00, 1.37x0.97x0.70 |
| Shop glass | `SM_Bld_Shop_01_Glass` to `_05_Glass`, `SM_Bld_Shop_Corner_01_Glass`, `_02_Glass` (`Shop_06` has none) | 4.3 to 8.7 wide, 1.7 to 2.5 high, 0.00 to 0.71 deep; corners 4.7 to 4.8 square |
| Shop signs (fascia, blade) | `SM_Prop_Sign_Bar_01`, `_Cafe_01`, `_Chinese_Noodles_01`, `_Pizza_01`, `_Pub_01`, `_Entrance_01`; blade: `_Barber_01`, `_DeliPizza_01`, `_Hotel_01`; brackets `SM_Prop_Sign_Attachment_01` to `_03` | 0.85 to 2.21 wide, 0.44 to 0.70 high; blades 0.3 to 1.3 wide, 0.95 to 3.80 high |
| Ground-floor wall props | `SM_Prop_ATM_01`, `SM_Prop_Phones_01`, `SM_Prop_Poster_01` to `_03` (+ `_Frame_01`), `SM_Prop_SecurityCamera_01` | 1.13x1.54x0.52, 2.63x2.50x1.05, 0.65x0.96x0.04, 0.41x0.52x0.64 |
| Fire escapes | `SM_Bld_FireEscape_01`, `_02`, `_03` | 3.25x1.49x1.64, 3.25x3.61x1.64, 4.25x3.80x1.76 |
| Upper-floor wall props | `SM_Prop_Aircon_01` (wall AC), `SM_Prop_PlanterWindow_01`, `_02`, `SM_Prop_Pipe_Small_01`, `_02`, `SM_Prop_Washingline_01` to `_04` | 0.82x1.00x0.65; about 0.9x0.74x0.35; 0.15 to 1.34 wide x 3.6 to 4.0 high; 5.21 wide |
| Roof, small | `SM_Prop_Roof_Aircon_01`, `_02`, `_03`, `SM_Prop_SatDish_01`, `SM_Prop_Vents_Exhaust_01`, `SM_Prop_Vents_Straight_01` + `_End_01`, `SM_Prop_Skylight_01` (+ `_Glass`) | 0.95 to 1.59 wide, 0.59 to 1.07 high; 1.21x1.34x0.68; 0.87x1.63x2.73; 0.87x0.80x2.50; 3.86x0.78x1.58 |
| Roof, large (one per block at most) | `SM_Prop_Water_Tower_01`, `SM_Bld_Roof_Access_01`, `SM_Prop_Billboard_Roof_01` + `SM_Prop_Billboard_Sign_01` to `_07`, `SM_Prop_LargeSign_*` (17: Pizza, Burger, Donut, Coffee, Hotdog, Icecream, Milkshake, Noodles, Popcorn, Soda, Taco, Beer, Bottle, Guitar, Lollypop, BowlingBall, BowlingPin) | 2.42x5.51x2.42; 2.76x2.74x2.85; 4.43x3.06x1.61 (faces 4.19x2.03x0.12); 1.2 to 3.8 wide, 0.56 to 6.38 high (`Pizza_01` 3.37x0.56x2.96) |
| Pavement | `SM_Prop_Trashbin_01`, `_02`, `SM_Prop_TrashCan_01` (+ `_Lid_01`), `SM_Prop_Hydrant_01`, `SM_Prop_ParkBench_01`, `SM_Prop_Mailbox_01`, `SM_Prop_Newspaper_02`, `SM_Prop_ParkingMeter_01`, `SM_Prop_SidewalkPoles_01`, `_02`, `SM_Prop_BusStop_01` (+ `_Glass`, `SM_Prop_Sign_Bustop_01`), `SM_Prop_Planter_01`, `_02`, `SM_Prop_PotPlant_01`, `_02`, `SM_Env_Tree_01` to `_03` | 0.55 to 2.08 wide, 1.05 to 1.87 high; bus stop 4.51x3.07x1.57; trees 1.9 to 2.2 wide, 3.85 to 4.68 high |
| Open lots | `SM_Env_Road_ParkingLines_01`, `SM_Prop_Barrier_01`, `SM_Prop_ParkingMeter_02`, `SM_Prop_Billboard_Pole_01` + `SM_Prop_Billboard_01`; plaza: `SM_Env_Sidewalk_Panel_01`, `SM_Env_Path_*`, `SM_Env_Grass_01`, `SM_Prop_PicnicTable_01`, `SM_Prop_Umbrella_01`, `SM_Prop_HotdogStand_01`, `SM_Env_Fence_01` | 10.00x0.00x5.00 tile; 1.43x0.98x0.66; 0.77x1.87x0.53; pole 6.90 high, board 4.43x2.35; 5 m tiles; 2.48x1.01x1.69, 1.60x1.35x1.60, 2.96x3.66x2.39, 5.00x2.14x0.44 |
| Never used | `SK_*` (people), `SM_Veh_*` (vehicles), `SM_Env_Skyline_*`; `SM_Env_PalmTree_*` (13.7 m, through the wires); `SM_Prop_LightPole_*` (a lamp reads as a puzzle lamp); `SM_Prop_TrafficLight_*` (red and green read as state); `SM_Prop_PowerBox_01` (reads as a puzzle part); `SM_Prop_Power_Cables_*` (042 Q9); `SM_Bld_Apartment_Stairs_*` (5.5 to 10.3 m deep: past the kerb); `SM_Prop_Sign_XXX_01`, `_Police_01`, `_Hospital_01`, `_FireDepartment_01` (wrong for a shop); `SM_Prop_ShopInterior_*`, the junk-sized props (`Buger`, `Soda_*`, `SmartPhone`, `Paper_*`, `Police_Baton`), bridges, water edges, the subway entrances (8 to 15 m deep), `SM_Prop_Pipe_Present_*` (back walls only) | |

**Missing from the pack, against the reference:** no glass for apartment windows and no lit-window variant (windows are baked into the floor pieces); no balconies, cornices or separate parapets; no roof railings or ladders; no roller shutters; one water tower, one satellite dish and one ATM model only (variety comes from placement, not models); awnings come in five fixed shapes and colours (one texture atlas); no sign pole for the street-name signs; `Sign_Street_*` and the traffic signs are not used for that reason. None blocks the look; the guide (053) records them as known gaps.

## Goal
In the 3D view, every City Pack block reads like the reference: glass in every shop that has it, an awning and a sign over most shopfronts, an ATM now and then, a fire-escape column on many street faces, wall AC units and window planters here and there, two or three props on every roof and one big one (water tower, billboard, roof stair hut or a novelty sign like the pizza slice) on some, and street furniture along the terrace pavements, with the parking lot and plaza dressed. It reads busy, not noisy: every placement is hash-seeded and capped. Dressing never changes play, never lights up and is never a pick target. On CI and a fresh checkout nothing changes.

## The design (defaults; see Open questions)
1. **Slots per recipe role** (`dressing.ts`, pure). `DRESS_SLOTS` lists, per 050 role (`base.mid` shop, `base.door`, `base.corner`, `floor.mid`, `floor.corner`, `roof.mid`, `roof.corner`), the slots on that piece in its own frame: `glass`, `awning`, `sign`, `wall` (ATM, phones, posters), `escape`, `wallUpper` (AC, planters), `roofSmall`, `roofLarge`. A slot is a box (centre, size, facing) on the piece's front face or roof top. Placing is a pure function of `(Stack, lot, run context, entries, fronts)`.
2. **Attachment** (because pivots are centred): a front-face prop's back face lies on its piece's front face (the piece's front-turned depth / 2 from its axis), centred on its column in x unless the slot says an edge; a roof prop's base lies on the roof's top (`pitch_m.roof`), inset `ROOF_EDGE_M` from every roof edge. A shop's `_Glass` is its own key's name plus `_Glass`, centred on the shop in x, its back on the shop's front face minus `GLASS_INSET_M`, its base at `GLASS_SILL_M`. A per-key `dressNudge_m` corrects any piece the stack gallery shows off (050's `nudge_m` pattern).
3. **Rules and caps** (all by `stableHash(lot.key + slot + column)`):
   - glass: always, where the key exists;
   - awning: one key per block (every awned bay in a block matches), on each shop bay with probability `P_AWNING`; only awnings whose depth, from the shop's own front face, stops `AWNING_KERB_M` short of the kerb (measured, so no list is hand-typed); `Shop_Cover_05` only on a corner column;
   - sign: on each shop bay with probability `P_SIGN`, above the awning or the glass; no key twice in a block; at most one blade sign per block;
   - ATM: at most one per block (probability `P_ATM`), at most `ATM_PER_RUN` per run, on a shop pier at ground level;
   - door canopy: on the door bay with probability `P_CANOPY`;
   - fire escape: one column per block of at least `ESCAPE_MIN_BAYS` bays and 2 floors (probability `P_ESCAPE`), never on a corner or door column; `_03` on the first floor, `_02` on each floor up to the top, `_01` on top; at most one block in two along a run has one unless every block qualifies;
   - wall AC and window planters: each floor bay with probability `P_WALL_AC` / `P_PLANTER`, never on the fire-escape column, at most `WALL_PROPS_PER_BLOCK` per block;
   - roof small: each roof column with probability `P_ROOF_SMALL`, at most `ROOF_SMALL_PER_BAY` per column;
   - roof large: at most one per block (probability `P_ROOF_LARGE`), at most one billboard and one novelty sign per run; a novelty sign goes on the run's lowest block; a large prop stands only where the block's top plus its height stays at or under the lot's `hMax` (so it never breaks the occlusion rule), facing the street;
   - whole block: at most `DRESS_PER_BAY_MAX` pieces per bay; whole town at most `DRESS_MAX`.
4. **Street furniture** (`furniture.ts`, pure). Only on the pavements in front of 051's terrace runs (the outer blocks), never on the circuit's streets or the ring's inside, so nothing new stands near a node or wire. Items stand on a kerb-side line `FURN_KERB_M` in from the kerb and a wall-side line `FURN_WALL_M` out from the fronts, at least `FURN_PITCH_M` apart on a line, by weighted hash (bins, hydrant at most one per run side, benches, mailbox, newspaper box, parking meters, bollards near corners, trees at least `TREE_PITCH_M` apart, a bus stop at most one per run of at least `BUS_STOP_MIN_RUN_M`). Keep-outs: `FURN_KEEP_M` from every pole, lamp post, node square, pad and drop's ground line; `FURN_CORNER_M` from a run's corner; nothing over `FURN_MAX_H_M` within `WIRE_CLEAR` of a wire span. Open lots: parking gets `ParkingLines` tiles, a barrier, a meter and a pole billboard (only under its run's lowest cap); a plaza gets paving, one or two trees, benches, planters, and a picnic table with an umbrella or a hot-dog stand by hash.
5. **Drawing** (`models3d.ts`). Dressing keys load from the same `city-pack.glb` as 050 B. Each key is drawn as `InstancedMesh`es (one per key and sub-mesh), so the dressing adds at most a few dozen draw calls. No dressing object raycasts (`raycast` is a no-op), none is emissive or animated, and materials are the cached roots' (glass may get one shared dark, slightly glossy material clone). Dressing shows in 050 B's stack gallery (`&dress=1`) and in the town.

## Sections (each at most a day)
- **A. Building dressing, pure** (about ¾ day). Design items 1 to 3. Needs 050 A and 051 C merged.
- **B. Drawing it** (about ¾ day). Design item 5, for item 3's output, in the stack gallery and the town. Needs 050 B, 051 D and 052 A merged.
- **C. Street furniture and open lots** (about 1 day). Design item 4, pure, then drawn through B's instancer. Needs 051 B and 052 B merged.

## Acceptance criteria
**CI-safe rules (every section).** Fixture entries only, names and bounds typed in from the findings table. No test reads `assets/private/` at module or `describe` level; a manifest check stays inside an `it` and skips when the file is absent. No Windows paths, no timer under 1 s, no wall-clock wait. Nothing from `assets/private/` is committed or bundled.

### A
1. [ ] (Vitest) Every key in `DRESS_SLOTS` and the rule tables is `city-pack:<name>` and in the fixture; no key from the findings' "Never used" row appears anywhere in `dressing.ts` or `furniture.ts`.
2. [ ] (Vitest) Over every style, floor count and corner variant (050 A's assembled fixtures) and 50 fixture lot keys: every front-face prop's back face lies on its piece's front face within 1e-6 (plus nudge), within its column in x; every roof prop's base is on the roof top and its footprint inside the roof inset by `ROOF_EDGE_M`; no two props' boxes overlap; no prop reaches past the kerb line.
3. [ ] (Vitest) The caps hold: awning keys are uniform within a block; at most one ATM, one blade sign, one fire-escape column and one large roof prop per block; at most one billboard and one novelty sign per run; `DRESS_PER_BAY_MAX`; no fire escape on a corner or door column; a large prop never lifts a block over `hMax`.
4. [ ] (Vitest) Deterministic per lot key; over the 50 keys every slot kind is used and each probability lands within ±0.15 of its constant (busy, not empty); every shop key with a `_Glass` gets it.

### B
5. [ ] (Vitest) With a fixture manifest and a fake GLB, dressing keys load into an optional `ModelSet.dress` slot; with no `city-pack` it is null and the scene is unchanged; a missing key drops only its placements.
6. [ ] (Vitest) Each instance's world transform equals the pure placement within 1e-6; the dressing adds at most `DRESS_DRAW_CALLS_MAX` draw calls on `64-the-whole-chain` (count of `InstancedMesh`es); no dressing object raycasts; no dressing material is emissive.
7. [ ] (Vitest) 041 B's ray test passes with stacks and their dressing at fixture heights on `09-shrine-circuit` and `64-the-whole-chain`; the pick targets are identical with and without dressing (ids, kinds, world matrices, in order).
8. [ ] (Main session, screenshots) `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1&dress=1`, then `&cam=street&run=0`, `&run=1`, `&at=0`, `&light=day` on `09-shrine-circuit` and `64-the-whole-chain`: glass in shopfronts, awnings and signs over most of them, fire escapes on street faces, every roof dressed, nothing floating, nothing inside a wall, no prop over the street.

### C
9. [ ] (Vitest) On every map: furniture stands only on pavements in front of terrace runs, on its two lines, at least `FURN_PITCH_M` apart (trees `TREE_PITCH_M`); nothing within `FURN_KEEP_M` of a pole, lamp post, node square, pad or drop line, or within `FURN_CORNER_M` of a corner; nothing over `FURN_MAX_H_M` within `WIRE_CLEAR` of a wire span; caps per run hold; deterministic.
10. [ ] (Vitest) Every open lot is dressed inside its own rectangle; a parking lot's tiles cover it without overlap; the pole billboard is under the run's lowest cap.
11. [ ] (Vitest) Places, pools, lots, runs and pick targets are unchanged by furniture (deep-equal with furniture off).
12. [ ] (Main session, screenshots) The criterion 8 URLs again: furniture along the pavement, not cluttered; a parking lot and a plaza where 051 put them.

### Every section
13. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. Writes nothing under `assets/`.
14. [ ] (Main session) `npm run gate` green and the test count grew; `npm run playtest` green with no snapshot change; `git diff main -- src/core/ src/render/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts src/render3d/town.ts src/render3d/layout.ts tests/ puzzles/ tools/ package.json public/ index.html` empty; `git ls-files assets/private` empty; `dist/` has no `.glb`, `manifest.json` or `private` path.
15. [ ] **Keep** (Vitest, unedited): `live.test.ts`, `relight3d.test.ts`, `pick.test.ts`, `polygon.test.ts`, `facing.test.ts`, 050's and 051's tests. Live still differs from dead by more than colour; no dressing glows.

## Files
- **Renderer, may touch:** A: new `src/render3d/dressing.ts`, `dressing.test.ts`. B: `models3d.ts` (the `dress` slot, instancing, placement), `models.ts` (only to plan the dressing keys for loading), `gallery.ts` (`dress=1` in the stack gallery), new tests. C: new `src/render3d/furniture.ts`, `furniture.test.ts`, `models3d.ts` (drawing it). Any section: `docs/city-style-guide.md` only where a rule it adds needs a line (053 writes the chapter).
- **Must not touch:** `town.ts`, `layout.ts`, `scene.ts`, `placeholders.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `calibration.ts`, `debug3d.ts`, `renderer.ts`, `stacks.ts`, `terrace.ts`; `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`; `tests/`, `puzzles/`, `tools/`, `package.json`, `vite.config.ts`, `index.html`, `public/`; anything under `assets/`. A builder that needs one stops and asks for a re-cut.

## Interfaces
- **No `src/core/` change, no schema change, no event change, no new dependency.** `InstancedMesh` is Three's (037).
- **Local to `src/render3d/` (the builder may rename):**
  - `dressing.ts`: `DressSlotKind = "glass" | "awning" | "sign" | "wall" | "escape" | "wallUpper" | "roofSmall" | "roofLarge"`; `DressPiece { key: CalibrationKey; slot: DressSlotKind; x: number; y: number; z: number; yaw: number }` (metres, lot frame, like 050's `StackPiece`); `DRESS_SLOTS`; `dressStack(stack, lot, run: { id: string; index: number; lowest: boolean }, entries, fronts): DressPiece[]`; constants `P_AWNING = 0.75`, `P_SIGN = 0.6`, `P_ATM = 0.3`, `ATM_PER_RUN = 2`, `P_CANOPY = 0.5`, `P_ESCAPE = 0.6`, `ESCAPE_MIN_BAYS = 3`, `P_WALL_AC = 0.15`, `P_PLANTER = 0.1`, `WALL_PROPS_PER_BLOCK = 4`, `P_ROOF_SMALL = 0.7`, `ROOF_SMALL_PER_BAY = 2`, `P_ROOF_LARGE = 0.5`, `DRESS_PER_BAY_MAX = 6`, `DRESS_MAX = 6000`, `ROOF_EDGE_M = 0.3`, `AWNING_KERB_M = 0.3`, `GLASS_INSET_M = 0.05`, `GLASS_SILL_M = 0.3`, `DRESS_DRAW_CALLS_MAX = 120`.
  - `furniture.ts`: `FurniturePiece { key; x; z; yaw }` (world units); `furnitureLayout(town, layoutParts, entries): FurniturePiece[]`; `FURN_KERB_M = 0.5`, `FURN_WALL_M = 0.4`, `FURN_PITCH_M = 7`, `TREE_PITCH_M = 12`, `BUS_STOP_MIN_RUN_M = 40`, `FURN_KEEP_M = 1.5`, `FURN_CORNER_M = 4`, `FURN_MAX_H_M = 3.2`.
  - `models3d.ts`: `ModelSet.dress?: LoadedModel[] | null`.

## Open questions (decided defaults; nobody was available to answer, Josh may overturn any)
1. **Density.** Default: the probabilities above, which put an awning on three shop bays in four, a sign on most, a fire escape on most 3-bay blocks and two or three props on every roof: about the reference's density. Every number is a constant pinned by 053's Numbers table, so tuning is a one-line change.
2. **Furniture on the circuit's streets.** Default: none. A hydrant or bin beside a node could be misread as a puzzle part, and the play view must read exactly as on `main`. Alternative: furniture everywhere, with the keep-outs.
3. **Lamps and signals in the pack.** Default: never used (`LightPole_*`, `TrafficLight_*`, `PowerBox_01`), because a lamp, a red/green light or an electrical cabinet would read as puzzle state. Street lighting stays the game's own lamps.
4. **Glass.** Default: placed by the attachment rule with a dark glossy material, and judged in the stack gallery screenshots; no window ever glows (emission is reserved for lit places and live wires, chapter 12).
5. **Novelty signs.** Default: all 17 `LargeSign_*` allowed, one per run at most, on the lowest block, because the reference has one (the pizza slice) and more would be noise.
6. **Instancing.** Default: yes, from the start (`InstancedMesh` per key and sub-mesh), because the dressing multiplies the piece count and Josh's PC froze on 17 Nov under load.

Decided rules: none is touched (visual only); `rules-coverage.md` does not change.
