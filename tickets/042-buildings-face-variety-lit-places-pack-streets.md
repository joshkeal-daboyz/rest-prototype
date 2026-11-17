# 042 · The 3D town: buildings that face their road, fewer repeats, real buildings that light up, and streets and pole hardware from asset packs

owner: renderer
status: approved (G1, Josh, 17 Nov 2026: "Yes, both", i.e. merge 041 and start sections A and B; every open-question default applies). Sections C, D, E wait for his downloads.
branch: `ticket/042-buildings-face-variety-lit-places-pack-streets` (one branch per section: `-a`, `-b`, ...)

## Josh's words (17 Nov 2026, after playing ticket 041 A, B and C together on `ticket/041-city-layout-and-power-lines-c`)
> "The buildings aren't all facing the road."
> "There are too many video rental stores."
> "You don't have to make your own curbs. Rely on the asset agent to tell me to download road asset packs from the subscription I purchased."
> "Powerlines can be generated from the asset packs too."
> "The cut game looks ok, good for testing (not a final product)"
> "Relight looks good"
> "The objects being lit are still just squares. Can we light up buildings from the asset pack instead?"

## Before this ticket: 041 is unmerged
042 builds on 041's code (`town.ts`, `models.ts`, `models3d.ts`, `placeholders.ts`, the three-conductor wires).
- **Recommended:** Josh merges 041 (A, B and C, branch `ticket/041-city-layout-and-power-lines-c`) into `main` as it stands, in his own words. His C checks passed: the cut and the Relight are fine. Two of his B checks did not pass ("facing the streets", "no model next to a copy of itself", which a same-mesh copy under another name defeats, see finding 2). Both move to 042 A. Every 042 section then branches from `main`.
- **If he won't merge 041 first:** 042 A branches from `ticket/041-city-layout-and-power-lines-c` and can't merge before 041 does.

## Findings (checked against `ticket/041-city-layout-and-power-lines-c` and the local manifest, 17 Nov 2026; no browser)

### 1. "The buildings aren't all facing the road": the layout is right, the models' front data is a guess
- **The lots face their road.**
  - `town.ts` gives each lot `yaw = atan2(fx, fz)`, where (fx, fz) = −(the frontage's outward normal). That is the unit vector from the lot toward its road.
  - Three's `rotation.y = yaw` turns local +z onto (sin yaw, cos yaw), and `atFront` moves the model along that same vector.
  - 041 A's test already checks that each lot's yaw faces its road. The lot maths is consistent.
- **The models are turned by `lot.yaw + front`, and `front` is 0 on every `MODEL_TABLE` building row.** So the code assumes every model's door faces its own local +z.
- **Nothing records the true door direction.**
  - The converter (`tools/blender/convert_fbx.py`, tickets 038/040) applies transforms and puts each pivot at the base centre. The manifest only carries centred bounds: every building's bounds centre is (0, 0). So the bounds can't show which face is the front, and no data in the repo says which side the door is on.
- **The pack mixes two generations of model** whose authors need not share a convention:
  - `Building_*` (`Building_Shop_01..05`, `_House_*`, `_Garage_*`, `_Gym`, `_BaberShop`, `_CoffeeShop`, `_AutoRepair`, ...) on the `SimpleTown.png` atlas, with `lambert54.*` / `lambert1.*` materials;
  - `*_mesh` (`house_mesh`, `store_small_mesh`, `store_corner_mesh`, `apartment_*`, `office_*`) on `Building01a.png` / `Building02a.png`, with `store_material`, `apartment_material` and `office_material`.
  - A model whose door is on −z, +x or −x shows its back or its side to the road. That matches "not all".
- **`store_corner_mesh` is a corner shop.** Its frontage wraps two faces, so in mid-row it shows a side wall either way.
- **What is ruled out.**
  - Placeholders are symmetric boxes, so they have no facing.
  - Places are boxes in 041 and have no facing either.
  - Pivots are centred (bounds), so a clone is not offset from its lot.
- **Fix:** an explicit per-model front table that every building name must appear in, a debug overlay so Josh can see each model's declared front, and a test that composes the two (section A).

### 2. "Too many video rental stores": duplicated meshes under different names
- **Many building names are the same model.** In the GLB each building is one mesh and one material. Equal bounds and equal triangle counts mark recoloured or resigned copies of one model:
  - `Building_Shop_01/02` (278 triangles, 10.5 × 11.4 × 10.2 m);
  - `Building_Shop_03/04/05` (588 triangles, 10.9 × 10.4 × 11.9 m);
  - `Building_House_01..04`, `_05..08`, `_09..011` and `_012..015`;
  - `Building_Garage_01..03`.
- **The `small` row** (the commonest lot type) has 10 names but only 7 distinct models. 5 of the 10 picks are a `Building_Shop_*`, and 3 of 10 are the `Shop_03..05` model alone.
- **`pickDistinct` compares names, not models.** So `Shop_03` can stand beside `Shop_04`, and the neighbour rule never sees a "copy". The hash picks per name, so a model with three names is drawn three times as often.
- **Which model is the "video rental store": I can't tell from the data.** The names don't say it and no agent can see the textures. My best guess is the `Shop_03..05` family (the most-weighted small model), or else `Shop_01/02`. Section A's overlay captions each building with its name, so Josh can say which.

### 3 and 4. Roads, kerbs and power lines from packs
- **The asset-scout's shortlist is in:** `assets/candidates/synty-subscription-town-view.md` (17 Nov 2026; pack contents are from search summaries, to be checked on the pack page). Earlier survey: `synty-store.md`. So the gated sections below name slots, not models, and the builder fills each slot from the manifest once Josh has converted the pack.
- **The local manifest already has some candidates:**
  - SIMPLE Town road tiles: `road_straight_mesh` 5 × 10 m, `road_t_mesh` and `road_cornerLines_mesh` 20 × 20, `road_corner_mesh`, `road_square_mesh`, `roadLane_*`, `road_crossing_center_mesh`, `path_*`;
  - Apocalypse `SM_Env_Road_*`;
  - Apocalypse power: `SM_Prop_Powerpole_Lines_01` (a fixed 15 m line mesh), `_Preset_01..03` (30.8 m fixed pole-and-line sets), `SM_Prop_Transformer_01/02` (2 to 3 m ground boxes) and `SM_Prop_PowerBoxes_01/02`.
  - There is still no pole-mounted transformer can and no separate insulator (041 Q9).
- **Grid tiles can't follow a diagonal junction.**
  - Pack road tiles are 90-degree grid pieces. The ring and grid roads are axis-aligned, but the circuit's streets run at any angle and meet at odd-angled pads.
  - A *straight* tile is a linear piece, so it can be laid, turned, along a street at any angle. Only the *junctions* can't come from the pack.
- **Pack line meshes can't carry the wire's look.**
  - They are fixed-length spans. The wire's sag, live/dead look, the cut on `l_b` and the Relight's front are all per-span code geometry that Josh has just approved.
  - So "power lines from the packs" can mean the pole hardware, but the conductors must stay generated in code.

### 5. "The objects being lit are still just squares"
- **What a place is today.** `scene.ts` draws each place's `PlaceBox`es as a box with one `MeshStandardMaterial` per lamp (warm emissive). Its glow is eased by `placeGlowStep`. Captions anchor on `town.places`. Places are not pick targets: `pick.ts` picks nodes and wires.
- **What each place carries.** `PlaceLot` has `kind: SlotKind` (whole, quarter, row3, gate, none). The finer `placeKind(lamp)` (sacred, water, mill, gate, work, market, hall, homes, home, streetlight) comes from `src/core/words.ts`, which `src/render3d/` may import.
- **The models have no separate window material.** Every SIMPLE Town building is one primitive with one material, so no window can be lit on its own. A lit place has to warm the whole model: an emissive tint with the model's own texture as its emissive map, so its paler parts (windows, signs) glow most.
- **SIMPLE Town models that could stand for a kind, at the 041 place sizes** (whole 10 × 10 m, quarter 6 × 6 m, row3 home 6 × 8 m):
  - sacred: `memorial_mesh` (4.7 × 4.6 × 4.7 m; fits whole and quarter at true scale). No church in SIMPLE Town. Apocalypse has `SM_Bld_Church_01` (16.5 × 17.1 × 12.3 m), but it is the ruined style 041 Q4 left out.
  - work: `Building_Garage_01..03` (one model), `Building_AutoRepair`.
  - market: `Building_Shop_01`, `store_small_mesh`, `store_corner_mesh`.
  - hall (inn, hall, infirmary, lamphouse): `apartment_small_mesh`, `office_small_mesh`. `town_hall_mesh` is `texture-guessed`.
  - home and homes: `house_mesh`, `Building_House_09`.
  - **Missing (for section E):** a well (water), a mill, a chapel or church in this style, and a bell tower. The gate stays as its two code-drawn posts.

## Goal
Josh opens `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`, then `56-whole-ward`.
- Every building's door faces its road.
- No one shop front dominates the streets.
- The shrine and every other lit place is a real building from the pack that warms when its lamp lights, with the same easing, caption and Relight timing as before.
- Once Josh has downloaded the road and power packs the asset-scout recommends: the roads, kerbs and pavements, and the poles' arms, insulators and transformer cans, come from those packs. The wires stay code-generated, with today's cut and Relight look.
- With any pack absent, that part looks exactly as it does in 041.
- Play is unchanged.

## Sections, order and size
| Section | Needs | Size | Starts |
|---|---|---|---|
| **A**: facing and variety | nothing new | about ¾ day | now, on G1 |
| **B**: lit places from existing models | nothing new (after A, for the front table) | about ¾ day | after A |
| **C**: roads, kerbs and pavements from a road pack | Josh downloads and converts a road pack | about 1 day | when its slots resolve in the manifest |
| **D**: pole hardware from a power pack | Josh downloads and converts a power pack (or approves the Apocalypse subset already converted) | about ½ day | when its slots resolve |
| **E**: landmark buildings for places | Josh downloads and converts a landmark pack | about ½ day | after B, when its names resolve |

- A and B answer four of Josh's seven remarks with no download.
- C, D and E are independent of one another. Each is its own build, review and playtest, like 041's sections.

### What Josh does for C, D and E (and when)
1. Read the asset-scout's lists in `assets/candidates/` (roads, power lines, landmark buildings, building variety) and pick packs from his subscription.
2. Download each pack's FBX source and unpack it under `assets/private/in/<pack-id>/` as ticket 038 describes. That folder is gitignored and never committed.
3. Run `npm run assets:convert`. The new pack appears in `assets/private/out/manifest.json`.
4. Tell the main session which pack ids now exist. The section's builder then fills its slot rows from the manifest's names and bounds. **He can do this any time; A and B don't wait for it.**

## The design (defaults; the real choices are the open questions)

### Section A: buildings face their road, and no model dominates (`models.ts`, `models3d.ts`, `town.ts`, `renderer.ts`, new `debug3d.ts`)
1. **The front table.**
   - `BUILDING_FRONTS: Record<string, { front: ModelFront; corner?: true }>` in `models.ts`, with `ModelFront = "+z" | "-z" | "+x" | "-x"`. It is the axis, in the GLB's own frame, that the model's door faces.
   - `frontYaw(f)` gives 0, π, −π/2 and +π/2 respectively, so a clone's yaw is `lot.yaw + frontYaw(f)`.
   - The rows' `front` field goes; rows only group names by lot type.
   - Every building name in `MODEL_TABLE` must have an entry, and a test fails on a missing one. The first values are the builder's starting guess ("+z"). Josh corrects them with the overlay (item 2); each correction is a one-line edit to the table.
   - `store_corner_mesh` is `corner: true`. A corner model only goes on a **corner lot**: the first or last lot of its row, or a lot whose side edge is within `NEIGHBOUR_GAP` of another road's pavement. It faces its own road, with its open corner on the row's outer end (mirrored by yaw, not scale).
   - `Lot.corner: boolean` is added in `town.ts`; nothing else in `town.ts` changes.
2. **The fronts overlay (debug only).**
   - `/?puzzle=...&view=3d&fronts=1` is read in `renderer.ts`, with `location.search` read there only.
   - It draws, over every building clone, a short red arrow along its declared front and a small caption with its model name.
   - It is off by default and drawn with the existing caption code. It is never a pick target and never in a playtest.
   - `main.ts` is untouched.
3. **Families.**
   - `meshFamily(pack, entry)` is pure: entries of one pack whose bounds agree to 1 cm and whose triangle counts are equal form one family (for example `Building_Shop_03/04/05`).
4. **Variety.** `pickBuildings` changes:
   - It picks a **family** first, by `stableHash(lot.key)` over the type's families, each weighted equally. Then it picks a variant inside the family by a second hash. A model with three names is no longer three times as likely.
   - **Neighbours** compare families, not names. With three or more families in a type, no two neighbours share one.
   - **Street repeat:** along one road side, a family doesn't recur within `STREET_REPEAT_GAP` 3 lots.
   - **Cap:** on each map, no family takes more than `FAMILY_SHARE_MAX` 0.25 of its type's lots when the type has four or more families. A pick that would break the cap takes the next family in the list.
   - `BUILDING_EXCLUDE: readonly string[]` (default empty) drops names outright. Josh's "video rental store" goes here, or gets a lower weight, once he names it (Q3).

### Section B: lit places are buildings (`models.ts`, `models3d.ts`, `scene.ts`)
1. **Models by kind.**
   - `PLACE_MODELS: Record<PlaceKind, readonly string[]>` in `models.ts`, keyed by `placeKind(lamp)` from `src/core`, in order of preference. Defaults:
     - sacred: `memorial_mesh`;
     - work: `Building_Garage_01`, `Building_AutoRepair`;
     - market: `Building_Shop_01`, `store_small_mesh`;
     - hall: `apartment_small_mesh`, `office_small_mesh`;
     - home and homes: `house_mesh`, `Building_House_09`;
     - water, mill and gate: none, so they stay boxes or posts as today;
     - streetlight: pool, no building.
   - Every name also needs a `BUILDING_FRONTS` entry.
2. **Fit.**
   - 041's `PlaceBox` sizes and positions are kept, so `townLayout`, the pool counts and `KNOWN_POOL_EXCESS` don't change.
   - The model's scale is `WORLD_PER_METRE` when its front-turned footprint fits the box. Otherwise it is the largest uniform scale that fits, but not below `PLACE_MIN_SCALE` × `WORLD_PER_METRE` (0.45).
   - A model that would need less is skipped for the next one; none left means today's box.
   - A row3's three homes each get a model, never the same family side by side.
   - The model stands at the box's front edge, facing the box's road (`atFront`, as lots do).
3. **Glow.**
   - Each place's model is cloned with its **own material clones** (never shared with town clones or other places).
   - Each material clone gets `emissive` = `WARM` and `emissiveMap` = its own `map`. Its `emissiveIntensity` = `PLACE_GLOW_MAX` × glow, where glow is today's `placeGlowStep` value for that lamp, unchanged.
   - When the model is present, the place's box is hidden. `SceneBundle.places` keeps its key (lamp id), and each frame the model's materials follow the same glow.
   - Captions, the target star and their anchors are unchanged (they come from `town.places`).
   - Disposal frees the material clones.
4. **Fallback.** No manifest, a missing name, or nothing that fits: today's warm box, exactly as 041 draws it.

### Section C (gated): roads, kerbs and pavements from a road pack (`models.ts`, `models3d.ts`, `scene.ts`)
1. **New slots** in `MODEL_TABLE`: `roadStraight` (a straight road surface tile), `roadJunction` (a cross, T and corner, each tagged by kind), `kerb` (a linear kerb piece) and `pavement` (a linear pavement piece). Optionally `roadMarking`.
   - The builder fills the names from the manifest once Josh has converted the pack.
   - A slot with no usable name falls back to 041's code-drawn part, per slot, as in 039.
2. **Recommended use** (Q7):
   - Straight tiles are laid along **every** road, ring, grid and diagonal circuit streets alike, turned to the road's angle. They are repeated at true length × `WORLD_PER_METRE` and scaled across to `ROAD_W`. The last tile of a run is scaled along its length to end on the pad.
   - Pack junction pieces stand only where the ring and grid cross at right angles.
   - The circuit's odd-angled pads stay code-drawn, with the pack's road material on them, so they match.
   - Kerbs and pavements are pack linear pieces laid along every kerb and pavement segment `Town` already gives, at any angle. Clipped ends are a scaled last piece.
   - `Town`'s geometry is unchanged.
3. **Clearance.** No pack piece rises above `KERB_H` + 0.05 inside a road or pad. "Nothing hides the circuit" still holds.

### Section D (gated): pole hardware from a power pack (`models.ts`, `models3d.ts`, `scene.ts`, `layout.ts` only if an attachment point moves)
1. **New slots:** `crossarm` (a cross-arm with or without insulators), `insulator`, `transformerCan` (pole-mounted) and optionally `serviceDrop` hardware. Each falls back to 041's code-drawn part.
2. **The conductors stay code-generated tubes:** three per run, sag 4%, the per-conductor break, the live/dead look and the Relight front. The attachment points move only if a pack arm's insulator tops differ from `PHASE_OFFSET` 0.22. If so, `PHASE_OFFSET` follows the model, and `WIRE_PICK_RADIUS` is re-checked.
3. Pack line meshes (`*_Lines_*`, `*_Preset_*`) are not used.

### Section E (gated): landmark buildings for places (`models.ts`)
`PLACE_MODELS` gains the landmark pack's names (a chapel or church for sacred, a well, a mill, a bell tower, an inn for hall), with the same fit, glow and fallback as B. It is only a table change plus tests, if the pack's style sits with SIMPLE Town (Q8).

## Acceptance criteria

### Section A (Vitest, `models.test.ts`, `town.test.ts`, no WebGL)
- [ ] **Every building has a front.** Every name in a `MODEL_TABLE` building row, and every name in `PLACE_MODELS`, has a `BUILDING_FRONTS` entry. `frontYaw` maps "+z", "-z", "+x" and "-x" to 0, π, −π/2 and π/2.
- [ ] **Every placed building faces its road, on every map.**
  - A fake model set gives each fake building root a child marker 1 m along its declared front axis. `applyModels` runs on every `puzzles/*.json` and `puzzles/lamp-row.grid.json`.
  - For every clone: the marker's world position minus the clone's, in the ground plane, is computed **independently of `lot.yaw`**. It is compared with the vector from the lot centre to the nearest point of its own road's centreline (`town.roads`, by `lot.street`). The angle between them is under 0.5°.
- [ ] **Corner models.** A `corner: true` model stands only on lots with `corner` true. Every map has at least one corner lot.
- [ ] **Families.** `meshFamily` groups `Building_Shop_03/04/05` into one family, and `_01/02` into another, on a fixture copied from the manifest's bounds and triangle counts. `Building_Gym` is in neither.
- [ ] **Variety, on every map.**
  - No two neighbours (`NEIGHBOUR_GAP`) share a family when their type has three or more.
  - No family recurs within `STREET_REPEAT_GAP` lots on one road side.
  - No family exceeds `FAMILY_SHARE_MAX` of its type's lots when the type has four or more families.
  - A name in `BUILDING_EXCLUDE` is never placed.
  - `pickBuildings` is deterministic.
- [ ] **Weighting.** Over all maps, the `small` type's most-used family's share is at most 1.5 times its least-used family's. The builder reports the per-family counts for `09-shrine-circuit` and `56-whole-ward`.
- [ ] **Town unchanged apart from `corner`.** 041's `town.test.ts` tests pass unedited, including `KNOWN_POOL_EXCESS`. The `town.ts` diff adds the `corner` field and its computation, and changes no lot's position, size, yaw or type.
- [ ] **Josh checks:** `/?puzzle=56-whole-ward&view=3d&fronts=1` with the packs converted.
  - He names every model whose arrow points away from its door (the front table is edited and rechecked in A's settle round).
  - He names the "video rental store".
  - Then, without `fronts=1`: every building faces its road, and no shop front dominates.

### Section B (Vitest without WebGL, except "Josh checks")
- [ ] **Choice by kind.** On every map, with a fake set holding every `PLACE_MODELS` name, each non-pool, non-gate place of a kind with models gets the first listed model that fits. Its scale is within [`PLACE_MIN_SCALE` × `WORLD_PER_METRE`, `WORLD_PER_METRE`], and its scaled, turned footprint lies inside its `PlaceBox`. It faces its road, by the same marker test as A. Kinds with no model keep their box.
- [ ] **Own materials.** No material of a place clone is shared with another place, a town clone or the cached model.
- [ ] **Glow follows the lamp.** In the shrine circuit's start state, after `sw_1`, after `repair:l_b`, after `br_street`, during a brownout and through the Relight: each place model's `emissiveIntensity` equals `PLACE_GLOW_MAX` × that lamp's `placeGlowStep` glow (within 1e-6). It is 0 exactly when the 041 box's would be 0.
- [ ] **Fallback.** With no models, every place is 041's box with 041's material behaviour (the 041 place tests pass unchanged).
- [ ] **Nothing hides the circuit.** 041 B's ray test passes with place models in place.
- [ ] **Josh checks:** `/?puzzle=09-shrine-circuit&view=3d`. The shrine is a building (the memorial) that warms when lit, and its caption and star are where they were. The other lit places on `56-whole-ward` are buildings.

### Sections C, D and E (written now; their slot names are filled by the builder from the manifest)
- [ ] **C, per-slot fallback.** With each road slot absent in turn, that part is drawn as in 041. The scene's road, kerb and pavement mesh counts equal 041's for that part.
- [ ] **C, coverage.** With all road slots present, every `Town` road, kerb and pavement segment is covered end to end by pack pieces (summed lengths within 1e-6 of the segment's). Each piece is parallel to its segment. Ring and grid right-angle crossings carry a junction piece. No piece rises above `KERB_H` + 0.05 inside a road or pad.
- [ ] **D, per-slot fallback and hardware.** Each power slot absent in turn falls back to 041's code part. With all of them present there are three insulator tops per intermediate pole, at the conductors' attachment points. Cans hang only on poles with drops.
- [ ] **E.** As B's "Choice by kind", for the new names.
- [ ] **Josh checks** (each gated section): the same two maps, with the pack converted, then with `assets/private/out` renamed (041's placeholder town, one console info line, no error).

### Keep (every section; Josh: "The cut game looks ok", "Relight looks good")
- [ ] 041's live/dead, cut and Relight tests (`live.test.ts`, `relight3d.test.ts`, the break and conductor tests in `layout.test.ts` and `scene.test.ts`, `pick.test.ts`) pass **unchanged**. The builder may add tests, not edit these.
- [ ] Live still differs from dead by more than colour (the GDD's accessibility rule, as 037 and 041 C test it).

### Nothing else moves (the main session checks, every section)
- [ ] `npm run gate` is green and the test count grew. `npm run playtest` is green with no snapshot change.
- [ ] `git diff main -- src/render/ src/core/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html` is empty, and `git ls-files assets/private` is empty.
- [ ] With the packs present, `npm run build` puts no `.glb`, no `manifest.json` and no path containing `private` in `dist/` (039's check).

## Files
- **May touch (`src/render3d/` only):**
  - A: `models.ts`, `models3d.ts`, `town.ts` (`Lot.corner` only), `renderer.ts` (reads `fronts=1`), new `debug3d.ts` (the overlay), and their tests.
  - B: `models.ts`, `models3d.ts`, `scene.ts`, and their tests (`live.test.ts` only to add tests).
  - C: `models.ts`, `models3d.ts`, `scene.ts`, and their tests.
  - D: `models.ts`, `models3d.ts`, `scene.ts`, `layout.ts` (`PHASE_OFFSET` only if a pack arm sets it), and their tests.
  - E: `models.ts` and `models.test.ts`.
- **Must not touch:** `src/render/` (import by file, as 041 does), `src/core/` (read `placeKind`, `PlaceKind` and `AssetEntry` only), `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`, `camera.ts`, `tests/`, `puzzles/`, `tools/`, `assets/` (Josh's downloads only, never committed), `package.json`, `vite.config.ts`, `index.html` and `public/`. If the builder needs any of them, it stops and asks for a re-cut.
- **Docs that conflict:**
  - 041 Q7 ("roads code-drawn everywhere") is superseded for C by Josh's words above.
  - 041 Q10 ("places' look unchanged, a box") is superseded for B.
  - 041 B2's per-row `front` is replaced by `BUILDING_FRONTS`.

## Interfaces
- **No `src/core/` change and no schema change.** `placeKind` and `PlaceKind` already exist in `src/core/words.ts`; `AssetEntry` (bounds, triangles) in `src/core/assets.ts` is enough for `meshFamily`.
- **No new dependency.** Three (037) and its GLTFLoader (039) are already approved.
- **Local to `src/render3d/`** (the builder writes them):
  - `models.ts`: `ModelFront`, `BUILDING_FRONTS`, `frontYaw`, `meshFamily`, `FAMILY_SHARE_MAX`, `STREET_REPEAT_GAP`, `BUILDING_EXCLUDE`, `PLACE_MODELS`, `PLACE_MIN_SCALE`, `PLACE_GLOW_MAX`; `ModelSlot` gains `roadStraight`, `roadJunction`, `kerb`, `pavement` (C) and `crossarm`, `insulator`, `transformerCan` (D).
  - `town.ts`: `Lot.corner`.
  - `scene.ts`: `SceneBundle.slots.places` (each lamp's boxes and `PlaceBox`es, so `applyModels` can hide them and register its material clones); `SceneBundle.slots.streets` (C) and `slots.hardware` (D).
  - `debug3d.ts`: `frontsOverlay(bundle, applied): Object3D`.

## Open questions for Josh (defaults apply if you just approve)
1. **041 first.** Default: merge 041 (A, B, C) now as it stands, with facing and variety carried into 042 A. The alternative is to keep 041 open and stack 042 A on its branch.
2. **Facing calibration.** Default: A ships the table with the "+z" starting guess and the `fronts=1` overlay; you name the wrong models in one browser pass and the table is fixed in A's settle round. No agent can see the models, so there is no better first guess than this.
3. **The "video rental store".** Default: family weighting and the 0.25 cap only, with no model removed until you name it with the overlay. Then it goes into `BUILDING_EXCLUDE`. The alternative is to keep it at a lower weight.
4. **Variety numbers.** Default: `FAMILY_SHARE_MAX` 0.25, `STREET_REPEAT_GAP` 3.
5. **Corner shop.** Default: `store_corner_mesh` on corner lots only. The alternative is to drop it.
6. **Place size.** Default: keep 041's place boxes and fit models inside them, between 0.45 and 1.0 of true scale. Small places are then slightly toy-sized beside full-scale neighbours, but the town layout, the pool counts and `KNOWN_POOL_EXCESS` don't move. The alternative is to grow place boxes to true-scale models, which changes 041 A's layout and re-pins the pool counts.
7. **Roads (C).** Default: pack straight tiles along every road at its own angle, pack junctions only at the ring and grid's right-angle crossings, the circuit's odd-angled pads code-drawn in the pack's road material, and pack kerb and pavement pieces everywhere. The alternatives:
   - (b) keep code asphalt and take only kerbs, pavements and markings from the pack;
   - (c) start C now with SIMPLE Town's own road tiles, already converted, with no download.
8. **Style (E, and sacred in B).** Default: SIMPLE Town style only, so the shrine is `memorial_mesh` until a landmark pack in a matching style arrives. The alternative is Apocalypse's `SM_Bld_Church_01`, in the ruined style 041 Q4 left out.
9. **Wires.** Default: conductors stay code-generated (your cut and Relight looks depend on them). Packs supply arms, insulators and cans only.
10. **Decided rules.** None is touched; this is visual only. There is no `rules-coverage.md` change, and the accessibility rule is re-checked under "Keep".

## Within approved scope?
**Yes, for A and B.**
- The work is all in `src/render3d/`: no dependency, no schema, no `src/core/` type, and no edit to `src/render/`, `main.ts`, `tests/` or `puzzles/`.
- It replaces two 041 defaults (Q7 and Q10) that your words above overturn.

**C, D and E** are within scope as code. They need your downloads and conversion first, and models are never committed. That stands with your licence decision of 16 Nov 2026: GLBs reach a web build only if end users can't get them and the site is password-gated.

Each section starts only on your G1.
