# 050 · City Pack buildings assembled from stacked pieces (base, floors, roof)

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. Waits for G1. Builds after 049 merges, because both change `models.ts` and `models3d.ts`.
branch: `ticket/050-city-pack-assembly`

## Josh's words
> "Cut the ticket" (18 Nov 2026, for assembling stacked City Pack buildings)
> "the shop corners are intended to be base units for the larger structures." (18 Nov 2026)
> "SIMPLE town was a test, the city stuff is higher detail" (17 Nov 2026, 043 Q4)
> "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally." (17 Nov 2026, 042 A)

**The look target** is the two pictures Josh showed on 18 Nov 2026:
- stacked city blocks, each with a shopfront ground floor, apartment floors above, fire escapes and a roof;
- a City Pack showcase street. It is a continuous terrace of 3 to 5 storey blocks with no gaps between neighbours. Each block has its own shops, awnings, signs and an ATM on the ground floor, 2 to 4 apartment floors in different colours and window styles, and rooftop props (AC units, vents, billboards, water tanks). Fire escapes are on the street faces, and floor counts vary from block to block.

This ticket builds the stacks: bases, floors and roofs. The terrace and the dressing (awnings, fire escapes, rooftop props) are Q5 and Q6.

## Findings (checked against `main` at `4aed8eb` and the local manifest, 18 Nov 2026; no browser)

### 1. The pieces (from `assets/private/out/manifest.json`, `packs[]` entry with `pack: "city-pack"`, `city-pack.glb`, `"scale": 100`)
The converter centres every pivot in x and z and puts the base at y = 0. So each piece's bounds run from -w/2 to +w/2, 0 to h, and -d/2 to +d/2, and the pack's own relative offsets are lost. Sizes are width x height x depth in metres.

| Set | Pieces | Size (m) |
| --- | --- | --- |
| Apartment floor, 3 styles | `SM_Bld_Apartment_01`, `_02`, `_03` | 5.00 / 5.16 / 5.28 x 3.00 x 5.2 to 5.5 |
| Apartment three-floor stack | `SM_Bld_Apartment_Stack_01`, `_02`, `_03` | same footprint as `_01` to `_03` x 9.00 |
| Apartment corner floor | `SM_Bld_Apartment_Corner_01`, `_02`, `_03` | 5.2 to 5.5 square x 3.00 |
| Apartment roof (+ corner) | `SM_Bld_Apartment_Roof_01` to `_03`, `_Roof_Corner_01` to `_03` | about 5.3 x 0.50 to 0.74 x 5.5 to 5.9 |
| Ground: shop | `SM_Bld_Shop_01`, `_02`, `_04`, `_05`, `_06` (one bay); `_03` (two bays, 10.1 wide) | about 5.1 x 3.00 to 3.30 x 5.2 to 5.9 |
| Ground: shop corner | `SM_Bld_Shop_Corner_01`, `_02` | 5.4 x 3.00 x 5.5 |
| Ground: residents' door (+ corner) | `SM_Bld_Apartment_Door_01`, `_02`, `_Door_Corner_01`, `_02` | about 5.1 to 5.6 x 3.00 |
| Office, old small | `SM_Bld_OfficeOld_Small_Base_01` / `_Floor_01` / `_Roof_01` | 10.9 x 6.00 / 10.0 x 3.19 / 11.1 x 4.22 |
| Office, old large | `SM_Bld_OfficeOld_Large_Base_01` / `_Floor_01` / `_Roof_01` | 15.9 x 6.00 / 15.0 x 3.19 / 16.1 x 4.23 |
| Office, octagon | `SM_Bld_OfficeOctagon_Base_01` / `_Floor_01` / `_Roof_01` | 20.8 x 3.90 / 20.5 x 3.00 / 20.5 x 5.38 |
| Office, square / round | `_Base_01`, `_Roof_01`, `_Base_01_Glass`; no `_Floor_` piece | `_02`/`_04` (7.5 to 9 m) may be floor segments (048 Q2, never confirmed) |
| Dressing (not in this ticket) | `SM_Bld_FireEscape_01` to `_03`, `SM_Bld_Shop_Cover_01` to `_05`, `SM_Bld_Cover_01`/`_02`, `SM_Bld_Roof_Access_01`, `SM_Bld_Apartment_Stairs_*`, every `*_Glass`, `SM_Prop_Roof_Aircon_*`, `SM_Prop_Vents_*`, `SM_Prop_Billboard_*`, `SM_Prop_ATM_01`, `SM_Prop_Sign_*` | |
| Whole (not in this ticket) | `SM_Bld_CityHall_01` (042 E), `SM_Bld_Station_02`/`_03`, the whole towers `SM_Bld_Office*_01` to `_04` | |

- Apartment and shop pieces are one 3.00 m storey. The shop pieces measured 3.05 to 3.30 m stick up past it, which is taken to be signs or parapets. So the storey pitch is a recipe number (`pitch_m`), not each piece's bounds (design item 3).
- The manifest names its pieces `_Floor_`, `_Base_`, `_Roof_`, `_Corner_` and `_Stack_`. That is the only "recipe" data the pack gives, so the recipes are written in code (Interfaces).

### 2. Josh's saved fronts are guesses
`assets/private/calibration/fronts.json` (`savedAt` 2026-11-18T03:50:16.193Z) has 49 `city-pack:` lines, all `"+z"`. Clicking the first copy in the gallery saves the "+z" guess, so they do not show that Josh saw a door.
- Missing from the file: `Apartment_Corner_01`/`_03`, `Apartment_Door_01`, `Apartment_Stairs_03`, every roof, cover and fire escape. The gallery's size filter (`BUILDING_MIN_HEIGHT_M`, 3 m) leaves roofs out, so they cannot be clicked today.
- Corner pieces also need an `open` side, and a gallery click never sets one (048 Q5).
- So this ticket confirms fronts by showing assembled stacks (section B) before anything stands in the town (section C).

### 3. What fits each lot (`LOT_TYPES`, frontage x depth x cap)
Apartment stacks are one bay (about 5.2 m) deep, with a 3.00 m base, 3.00 m floors and a roof of at most 0.74 m.

| Lot | Bays across | Floors over the base, max (height) | Offices that fit |
| --- | --- | --- | --- |
| small 12 x 13 x 12 | 2 | 2 (9.74 m) | none |
| house 16 x 19 x 15 | 3 | 3 (12.74 m) | Old Small, base + 1 floor (13.41 m) |
| large 25 x 28 x 16 | 4 (5 of `_01`, 25.0 m) | 4 (15.74 m) | Old Small or Old Large, base + 1 (13.42 m); Octagon, base + 2 (15.28 m) |
| tall 14 x 16 x 28 | 2 | 8 (27.74 m) | Old Small, base + 5 (26.17 m) |

- Families per type, using the stack style as the family: apartments give 3, plus Old Small on tall makes 4. That is at least `POLYGON_MIN_FAMILIES.tall` (3), and the Town Pack gives tall nothing.
- On large: 3 apartment styles + Old Small + Old Large + Octagon = 6, at least 4. Today large is SIMPLE Town, because the Town Pack has only `_08` and `_11` there.
- Small and house already go Town Pack (048).
- A lot is kept only if its cap clears the circuit (`OCCLUDE_SLOPE`), so a stack at or under `lot.hMax` hides nothing that a placeholder would not.

## Goal
Josh opens a stack gallery and sees every City Pack recipe assembled: shopfront base, apartment or office floors, a roof, and corner columns where a corner lot would have them. He fixes any wrong door by clicking that piece, and says when the stacks look right. Then, on his PC, the town's tall and large lots show those stacks. Each one faces its road, sits within its lot and under its lot's height cap, and has no gaps between storeys. Floor counts vary from lot to lot, and the variety and corner rules hold as before. On CI and a fresh checkout, with no private assets, the town is exactly today's.

## The design (defaults; the real choices are the open questions)

1. **Recipes are data** (`src/render3d/stacks.ts`, new). A `StackStyle` lists, by role, the `city-pack:` keys it may use:
   - `base.mid` (shops and doors), `base.corner` (the shop corners, Josh's "base units");
   - `floor.mid`, `floor.corner`, and optionally `floor.stack3` (the 9 m `_Stack_` piece, used for runs of three mid floors);
   - `roof.mid`, `roof.corner`;
   - `pitch_m` for each role, and `depth: "bay" | "footprint"`.

   The styles are `apartment-01`, `-02` and `-03` (the base is shared, the floors and roofs are per style), `office-old-small`, `office-old-large` and `office-octagon` (Q3). Their sizes come from the manifest entries at run time and from typed-in fixtures in tests. No size is hand-typed into the recipe.
2. **Floor counts** (pure). For a style on a lot type:
   - the bays across are the most whole columns whose widths fit the frontage;
   - the floors over the base run from `min` to `max`, where `max` is the most that keeps base + floors x pitch + roof at or under the type's cap, and `min` is in `STACK_FLOORS` (Q2);
   - `stableHash(lot.key + style)` picks within the range, so heights vary from block to block and are deterministic;
   - a style that cannot reach its `min` on a type is not offered for that type.
3. **Assembly** (pure: `assembleStack`). The result is a list of pieces in the lot's frame, in metres, with the origin at the front-centre of the lot:
   - columns are laid side by side along x, each column as wide as its floor piece, with no gaps between columns;
   - storeys sit at y = base pitch + i x floor pitch, and the roof sits on the last storey;
   - each piece is centred on its column's axis in x;
   - in z, each piece's **back** face lies on one line, one bay (or the office footprint) behind the front. So the deeper shop pieces stick out toward the street, which is taken to be their sills and signs (Q4's check). A per-key `nudge_m` in the recipe corrects any piece the gallery shows off;
   - each piece's yaw is `frontYaw(its front)`, and a quarter-turn front swaps its width and depth;
   - the ground row of an apartment stack is shops picked by hash per bay (a two-bay `Shop_03` takes two), with one residents' door bay that is never at a corner (Q4).
4. **Corners** (Josh's rule):
   - a stack has a corner column (shop corner base, corner floors, corner roof; no `_Stack_` piece) on each side in its lot's `cornerSides`, and on no other side;
   - a stack with a corner column is a corner building: it stands only on a lot that has that corner side, with its second street face on the cross street;
   - a stack with no corner column is an ordinary building, and may stand on a corner lot as any model may;
   - a corner piece's `open` side is in the recipe. At the other end of the row the corner column turns a quarter, so one corner piece serves both ends;
   - every `open` is a guess until Josh confirms it in the stack gallery.
5. **One placed unit** (`models3d.ts`):
   - a stack is one `Group` named `stack:<style>`, standing where `atFront` puts its depth, at `lot.yaw`;
   - its children are clones of the pieces' roots, which share the cached geometry and materials (as `place` does today), at `WORLD_PER_METRE`;
   - nothing in it can be picked;
   - instancing is left for later, unless Josh's load check (Q6) says otherwise.
6. **Choice per lot type, in order:**
   - City Pack stacks, if the type is in `STACK_LOT_TYPES` (Q1) and its stack styles reach `POLYGON_MIN_FAMILIES` after `BUILDING_EXCLUDE` (a style with any excluded required piece drops out);
   - else Town Pack whole houses, if they reach `POLYGON_MIN_FAMILIES` (048);
   - else SIMPLE Town.

   The three never mix within a type. A stack's family is `city-pack:stack:<style>`. `pickBuildings`' neighbour, street-repeat, share-cap and corner rules apply to stacks unchanged. A missing piece root or a failed `city-pack.glb` drops that style, and if every style drops, the type falls down the chain.
7. **The stack gallery** (dev and flag only): `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1`.
   - Every style is shown on each lot type it serves, at its max floors, as a mid-row stack and as a corner stack at each end, seen from the street.
   - Each stack is captioned with its style, lot type, floors, height against the cap, and every piece key with its front, marked `guess` unless it is in the code's table or the saved file.
   - Below the stacks, the usual four-copy click line shows exactly the recipe pieces, roofs included. A click saves a front through 045's saver unchanged, and the stacks above redraw with it.
   - It is never in `npm run build`, never a pick target and never part of a playtest.

## Sections (each at most a day; A and B are the first slice and ship before C)

- **A. Recipes and assembly, pure** (about ¾ day): `stacks.ts` and `stacks.test.ts`, design items 1 to 4. The town and the gallery are not touched.
- **B. Stacks in a gallery** (about ¾ day): load the recipe pieces, build the stack `Group` (item 5) and the stack gallery (item 7). The town is not touched. It ends with Josh's check, in which he confirms the fronts and `open` sides and fixes any by clicking.
- **C. Stacks in the town** (about ¾ day). It starts only after Josh says in chat that the stacks look right. It covers the chain (item 6), the placements, promoting his confirmed fronts into `BUILDING_FRONTS` the way 048 did, and the guide.

The first slice (A + B) changes nothing a player or CI sees, and gives Josh the fronts check before any stack stands in the town.

## Acceptance criteria
All Vitest tests use fixture entries, with names and bounds typed in as numbers from finding 1 (the way `facing.test.ts`'s `SIZES` and `polygon.test.ts` do). No test reads `assets/private/` at module or `describe` level. A manifest check stays inside an `it` and is skipped when the file is absent. Tests use no Windows paths, no timers under 1 s and no wall-clock waits.

### A
1. [ ] (Vitest) **The recipes.** Every key in `STACK_STYLES` is `city-pack:<name>` and names an entry in the fixture. Every style has base, floor and roof pieces, and corner pieces for every role that has them. No dressing or whole-building key (finding 1) is in any recipe.
2. [ ] (Vitest) **Floors and fit.** For every style and lot type, `stackRange` gives the bays and the floor range in finding 3's table, or none where the table has none.
   - On every assembled stack (all styles x types x floor counts x corner sides none / "+x" / "-x" / both), the turned footprint lies inside the lot's frontage x depth, within 1e-6.
   - Its top is at or under the type's cap.
   - The picked floor count is deterministic per `lot.key` and covers more than one value over 50 fixture keys on tall.
3. [ ] (Vitest) **No gaps.** In every assembled stack:
   - each piece's bottom equals the top of the storey under it (`pitch_m`) within 1e-6, and the roof sits on the last storey;
   - neighbouring columns touch along x within 1e-6;
   - pieces in one column share the column's x axis, and their back faces share one line in z (plus any `nudge_m`).
4. [ ] (Vitest) **Faces the street.** In every assembled stack, each piece's declared front (a marker 1 m along it, after its yaw) points to the lot's +z, within 0.5°. A fixture with a "-z" and a "+x" piece proves that the yaw and the width/depth swap follow the front.
5. [ ] (Vitest) **Corners.**
   - A corner column appears on exactly the sides listed in `cornerSides`, and its pieces are all `corner` keys.
   - A mid-row stack has no corner key.
   - The residents' door is never in a corner column.
   - The corner piece's `open` face points along the lot's corner side, a 90° turn at the other end.

### B
6. [ ] (Vitest) **Loading.**
   - With a fixture manifest and a fake GLB, the recipe pieces load into an optional `ModelSet.stack` slot. `NO_MODELS` and every existing `ModelSet` literal still typecheck, and the existing load tests pass unedited.
   - A missing piece root drops only the styles that need it.
   - With no `city-pack` in the manifest, the slot is null and nothing else in the set changes.
7. [ ] (Vitest) **One unit.** `stackGroup` returns one `Group` named `stack:<style>`. Its child count equals the assembly's piece count, and every child's world transform equals the assembly's, within 1e-6. Child geometry and materials are the cached roots' (the same objects). No child raycasts.
8. [ ] (Vitest) **The stack gallery.**
   - `stacks=1` parses only alongside `gallery=`.
   - Its layout holds every style on each type it serves, with mid-row and both corner variants, and no two rects overlap (`galleryRectsOverlap`).
   - Its click line lists exactly the recipe pieces, roofs included, and a click there yields the same `CalibrationPatch` as in the pack gallery.
   - Captions mark `guess` exactly where neither the code's table nor the saved file has the key.
   - The existing gallery tests pass unedited.
9. [ ] (Josh checks) `npm run dev`, then `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1`.
   - Every stack has its shopfronts and windows facing him, no floor floats or overlaps, and the corner stacks show two street faces.
   - He clicks the door of any piece that is wrong in the line below. Then he says in chat which corner pieces' second faces are wrong (if any) and that the stacks look right. That is section C's start condition.

### C
10. [ ] (Vitest) **The chain.** `buildingPlan` per type follows design item 6, on three fixture sets:
    - with stacks: tall and large are stacks, small and house are Town Pack;
    - without `city-pack`: each type is as on `main`;
    - with no POLYGON pack (the CI case): the plan and picks on every map equal today's SIMPLE Town plan and picks exactly.

    Types never mix.
11. [ ] (Vitest) **Variety and corners in the town.** On the stack fixture plan, over every map (`puzzles/*.json`), the existing variety tests pass as a second fixture:
    - families per type;
    - no neighbours of one family;
    - no family back within `STREET_REPEAT_GAP` on one road side;
    - the `FAMILY_SHARE_MAX` cap;
    - determinism.

    A stack with a corner column stands only on a lot whose `cornerSides` has that side, and never mid-row.
12. [ ] (Vitest) **In the town.** Every stack placement's footprint lies inside its lot and its height is at most `lot.hMax`. Its front marker points at its road, as in 042 A. 041 B's ray test ("lets no building or place stand between the camera and ...") passes unedited, and a new run of it uses stacks at their fixture heights on `09-shrine-circuit` and `64-the-whole-chain`.
13. [ ] (Vitest) **Fronts promoted.** Every recipe key has a `BUILDING_FRONTS` line, with `corner`/`open` for corner pieces. The lines equal Josh's saved file as it stands after his B check, and the test lists them. The code comment and the guide give that `savedAt`.
14. [ ] (Vitest) `styleguide.test.ts` is green with `docs/city-style-guide.md` updated:
    - chapter 5: the three-step chain and `STACK_LOT_TYPES`;
    - chapter 6: the promoted City Pack fronts;
    - chapter 7: corner columns;
    - chapter 13: `city-pack` becomes "in use (stacked buildings)", and the 043 Q4 Open line is narrowed;
    - chapter 15: a step for recipes and the stack gallery;
    - Numbers: rows for `STACK_FLOORS` and the pitches.
15. [ ] (Josh checks) `npm run dev`, then `/?puzzle=09-shrine-circuit&view=3d`, then `/?puzzle=64-the-whole-chain&view=3d`.
    - Tall and large lots are City Pack stacks of varied heights, each with its shops to its road. `&fronts=1` arrows point out of the shopfronts.
    - Corner stacks stand only on corners.
    - Nothing overhangs a lot or a pavement.
    - Small and house lots are as before.
    - He notes the time from page load to buildings shown (Q6).

### Every section
16. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. Reads the manifest and the saved file only to check fixture numbers (and, in C, to promote), and writes nothing under `assets/`.
17. [ ] (Main session)
    - `npm run gate` is green and the test count grew.
    - `npm run playtest` is green with no snapshot change (the 3D view is not in the trace).
    - `git diff main -- src/render/ src/core/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts src/render3d/town.ts tests/ puzzles/ tools/ package.json public/ index.html` is empty.
    - `git ls-files assets/private` is empty, and `npm run build`'s `dist/` has no `.glb`, `manifest.json` or `private` path.
18. [ ] **Keep** (Vitest, unedited): 041's live/dead, cut and Relight tests, 048's `polygon.test.ts` and `facing.test.ts`, and 049's place tests all pass. Live still differs from dead by more than colour.

## Files
- **Renderer, may touch:**
  - A: new `src/render3d/stacks.ts` and `src/render3d/stacks.test.ts`;
  - B: `stacks.ts`;
    - `models3d.ts`: the optional `stack` slot in `ModelSet` and `loadModels`, and `stackGroup`;
    - `models.ts`: only to plan the recipe pieces for loading;
    - `gallery.ts`: the `stacks=1` mode;
    - new tests, or new tests in `gallery.test.ts` and `models.test.ts`;
  - C: `models.ts` (`STACK_LOT_TYPES`, the chain in `buildingPlan`, `traitsOf`, `BUILDING_FRONTS`), `models3d.ts` (`buildingPlacements` and `applyModels` placing stacks), their tests, and `docs/city-style-guide.md` (chapters 5, 6, 7, 13, 15 and Numbers).
- **Must not touch:**
  - `town.ts` (no lot, layout, cap or clearance change: Q5 is a later ticket), `layout.ts`, `scene.ts`, `placeholders.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `calibration.ts`, `debug3d.ts` and `renderer.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/` and `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `vite.config.ts`, `index.html` and `public/`;
  - everything under `assets/`, which is read only. Existing tests are not edited.

  A builder that needs any of them stops and asks for a re-cut.
- **Josh:** the B check, and saying in chat that the stacks look right before C starts.

## Interfaces
- **No `src/core/` change, no schema change, no event change, no new dependency.** Three (037) and GLTFLoader (039) are already approved. `calibrationKey`, `CalibrationKey` and `AssetEntry` already exist.
- **Local to `src/render3d/` (the builder may rename):**
  - `stacks.ts`:
    - `StackRole = "base" | "floor" | "roof"`;
    - `StackStyle { id: string; pack: "city-pack"; base: { mid: CalibrationKey[]; door?: CalibrationKey[]; corner: CalibrationKey[] }; floor: { mid: CalibrationKey[]; corner: CalibrationKey[]; stack3?: CalibrationKey[] }; roof: { mid: CalibrationKey[]; corner: CalibrationKey[] }; pitch_m: Record<StackRole, number>; depth: "bay" | "footprint"; open?: Partial<Record<CalibrationKey, "+x" | "-x">>; nudge_m?: Partial<Record<CalibrationKey, number>> }`;
    - `STACK_STYLES: readonly StackStyle[]`;
    - `STACK_FLOORS: Readonly<Record<LotType, number>>` (the min floors over the base, Q2);
    - `StackPiece { key: CalibrationKey; x: number; y: number; z: number; yaw: number }` (metres, lot frame);
    - `Stack { style: string; family: string; bays: number; floors: number; width_m: number; depth_m: number; height_m: number; cornerSides: readonly ("+x" | "-x")[]; pieces: readonly StackPiece[] }`;
    - `stackRange(style, type, entries): { bays: number; min: number; max: number } | null`;
    - `assembleStack(style, lot: Pick<Lot, "type" | "key" | "cornerSides">, entries: ReadonlyMap<CalibrationKey, AssetEntry>, fronts: FrontTable): Stack | null`.
  - `models3d.ts`: `ModelSet` gains an optional `stack?: LoadedModel[] | null` (049's pattern), `stackGroup(stack, roots): Group`, and `BuildingPlacement` gains an optional `stack?: Stack`.
  - `models.ts` (C): `STACK_LOT_TYPES: readonly LotType[]` = `["large", "tall"]`.

## Out of this ticket
- City Pack roads (042 C), lit places (049), landmarks (the City Hall, 042 E), stations and whole towers.
- The terrace (Q5) and the dressing: awnings, fire escapes, rooftop props, glass panes, stairs (Q6). These are later tickets.
- Any `town.ts` change.

## Risks
- **Lost pivots.** The converter centred every piece, so the pack's own stacking offsets are gone, and design item 3's back-face rule is an assumption. The stack gallery is the check, and `nudge_m` is the fix. If many pieces need nudges, the right fix is a converter option to keep pivots (a `tools/` ticket, grid-simulator), not more nudges.
- **The `+z` guesses.** All 49 saved City Pack fronts may be unseen guesses. Section C does not start until Josh confirms them in B.
- **Glass.** The shop and office `_Glass` panes are separate centred pieces, so they cannot be placed yet. Shop windows may read as empty holes, which Josh judges in B.
- **Load.** `city-pack.glb` is about 23 MB. It is fetched only when a recipe is planned: in B only for the stack gallery, in C for the town. A large stack is about 24 clones. Josh notes the load time and frame feel in C (Q6).

## Open questions for Josh (defaults apply if you just approve)
1. **Which lots get stacks.** Default: tall and large only (`STACK_LOT_TYPES`). Small and house keep the Town Pack houses you approved in 048, so the circuit's streets stay a town and the ring and outer blocks gain a city edge. Alternative: stacks on every lot of the ring and outer blocks, whatever its type, with Town Pack houses only on the circuit's streets.
2. **Floor counts.** Default: the floors over the base are picked by hash from `STACK_FLOORS` up to the cap's max, so heights vary from block to block. That gives large 2 to 4 (3 to 5 storeys, your showcase's range), tall 5 to 8 apartment floors or 3 to 5 office floors, and house and small 1 up to their max if Q1 adds them. Alternative: always the max (an even skyline).
3. **Which offices.** Default: Old Small, Old Large and Octagon are assembled (each has Base, Floor and Roof pieces). Square and Round are left out, because they have no Floor piece and `_02`/`_04` were never confirmed as segments. The whole towers are never used.
4. **Ground floor.** Default: shops by hash for each bay, plus one residents' door bay per apartment stack that is never at a corner. A corner lot's stack always takes the shop corner on its corner sides (your "shop corners are base units"), so on a corner it is a corner building with two street faces. In the stack gallery, you also judge whether the deeper shop pieces are right sticking out toward the street (design item 3).
5. **Terrace.** Your showcase street is one continuous wall. Default: not in 050. Lots keep their sizes and their `LOT_GAP`, so stacks stand as separate blocks with small gaps, like the houses today. A follow-up ticket (renderer, `town.ts`) sizes city lots to whole bays, abuts them along a street (shared depth, varied heights) and keeps the corner rule. That moves the layout, so it is its own ticket after you have seen C. Alternative: cut it now, to build straight after 050 A.
6. **Dressing.** Default: awnings (`Shop_Cover_*`), fire escapes on street faces (`FireEscape_*`), rooftop props (`Roof_Access_01`, `SM_Prop_Roof_Aircon_*`, `SM_Prop_Vents_*`, `SM_Prop_Billboard_*`), glass panes and stoop stairs are a later ticket (or a 050 D), cut after you have played C. The first slice stays bases, floors and roofs. That ticket also takes the instancing question if your C load check says the town is slow.

Decided rules: none is touched. This is visual only, so `rules-coverage.md` does not change.

## Within approved scope?
Yes, on Josh's 18 Nov 2026 "Cut the ticket" and his 043 Q4 words. The corner rule is his 042 A ruling, and design item 4 and criteria 5 and 11 test it. The licence ruling (16 Nov 2026) holds: names and sizes are not licensed content, nothing from `assets/private/` is committed or bundled, and CI and a fresh checkout look as today. It starts only on Josh's G1.
