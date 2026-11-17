ticket: 041-city-layout-and-power-lines-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B switches the 3D scene from 2D's lanes and `blockLayout` to section A's `Town`. It draws roads, kerbs, pavements, pads, centre lines and yards in code. It puts every building at `WORLD_PER_METRE`, picks SIMPLE Town models by lot type with no copy beside itself, and gives every lot a placeholder that reads as a building when no model is loaded. Places, captions and glow stay as they are.

## Does the branch do it?
Reviewed `git diff ticket/041-city-layout-and-power-lines-a...3a7837e`. I did not re-run the suite (the main session ran it on this commit: 1433 passed, tsc clean).

- **One scale.** Met. `modelScale` (`src/render3d/models.ts`) returns `WORLD_PER_METRE` for every building, and `fitBuilding`, `buildingYaw` and the `lot` parameter are gone. `lotTypeOf` takes the first of small, house, large, tall whose frontage, depth and cap hold the model, with a quarter-turn `front` swapping width and depth. Tests in `models.test.ts`:
  - "puts every building at WORLD_PER_METRE, whatever its size";
  - "lotTypeOf puts a 10 x 11 x 10 m model in small, an 11.6 x 16.7 x 11.8 m one in tall, and a 46 x 10 x 43 m one in none" (the exact fixtures the criterion names);
  - "lotTypeOf turns a quarter-turn front".
- **Every building fits its lot.** Met. "gives every building clone WORLD_PER_METRE on all axes and yaw lot.yaw + front, its scaled, turned bounds inside the lot" runs on every map, with over 5000 clones and one row at `front` = π/2. It drives `buildingPlacements`, which `applyModels` uses. The `applyModels` test on 09 then checks the real clones' scale (x, y, z), position and `rotation.y`. Models are placed at the lot centre; the converter puts each pivot at the base centre (`src/core/assets.ts` contract), so a footprint inside the lot holds in world space too.
- **No copy beside itself.** Met.
  - `pickBuildings` and `pickPlaceholders` share `pickDistinct` (hash start, then the next index not used by an earlier same-type neighbour within `NEIGHBOUR_GAP`, measured as a true polygon gap by `lotGap`).
  - Both have an every-map pairwise test with over 1000 neighbour pairs: `models.test.ts` "gives no two lots within NEIGHBOUR_GAP the same model…" and `placeholders.test.ts` "…the same variant…".
  - Determinism is tested for both, and `lotGap` has its own geometric test, including a 45° case.
- **Placeholders.** Met. `placeholderBuilding` (`src/render3d/placeholders.ts`):
  - footprint is lot × {0.8, 0.9} by hash;
  - storeys by type match the ticket (house pitched, the rest flat);
  - the roof is clamped so body plus roof never passes `hMax`;
  - four dark tints;
  - no emissive, so nothing is lit.
  `placeholders.test.ts` checks, on every map, that the footprint is inside the lot, the height is storeys × `STOREY_M` × `WORLD_PER_METRE`, and the cap holds. The scene tests check one body per lot in its type's group, and that each place is its own warm-able material with one box per part.
- **Streets drawn.** Met. In `streets.test.ts`, on 09, 56, 49 and 01, the instance counts equal `town.roads`, `town.kerbs` and `town.blocks` (yards), there is one mesh per pad with three or more points, and the pavement triangle count matches. Further tests check:
  - each road's and kerb's matrix lies along its own segment;
  - the ground layers stack in order;
  - every pavement and pad triangle faces up;
  - dashes are drawn only on ring and grid roads, and none sits on a crossing.
  "draws no 2D lanes" checks that `scene.ts` no longer imports `../render/city` or names `circuitStreets`, `feedLanes`, `footprintLayout`, `cityForMap` or `blockLayout`.
- **Nothing hides the circuit.** Met. `scene.test.ts` "lets no building or place stand between the camera and a wire's middle or a node's pick point" uses the 1280 × 720 rig with insets top 120 and bottom 90. It raycasts against the placeholder root (instanced, so per instance) and every place mesh, up to each wire's `mid` and each node at `NODE_BODY_Y`. `NODE_BODY_Y` is lower than the old `POLE_HEIGHT` target, so the test is stricter than before. `pick.ts` and `pick.test.ts` are untouched.
- **Old tests.** Met. The amended A criterion required B to remove `blockLayout`, its types and its tests, and the branch does. Removed: `layout.test.ts` "has the footprint's and the city's blocks…", "keeps each lamp's id on its place…", "puts no block over a wire run", "carries footprintLayout's label…" and "keeps the footprint's buildings and places under the wires…"; `models.test.ts` "puts a 10 x 10 x 8 m building … never grows it", "shrinks a building to a lot…" and the old `applyModels` footprint and city block test. The builder's report should name these; the commit message doesn't.
- **Which models.** Met, with deviations named as the ticket asks. The table follows the ticket, except that the `MODEL_TABLE` comment names three models the bounds put elsewhere:
  - `house_mesh` (13.4 m deep) goes to house;
  - `Building_CoffeeShop` (15.6 m high) goes to large;
  - `office_stepped_mesh` fits no lot and is left out.
  The type is computed by `lotTypeOf` from bounds, not from the row, and "the shipped table's names each land in a lot type, from the real manifest's sizes" checks it when the packs are present. These three should reach Josh in the show-Josh summary.
- **Josh checks (two).** Not judged here, by design.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are untouched. `git diff main...HEAD` is empty for every must-not-touch path (`src/render/`, `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`, `tests/`, `puzzles/`, `tools/`, `package.json`, `public/`, `index.html`, `camera.ts`, `pick.ts`). `assets/private` is not tracked. No new dependency. No GDD Decided rule is touched; this is visual only.
- `src/render3d/town.ts` and `town.test.ts` are section A's files, not in B's list. The change is small and inside `src/render3d/`: the cached `Town` is deep-frozen and typed `DeepReadonly`, because the scene now hands `town.lots` to `slots.blocks.list` and a shared cache must not be mutated. It is reasonable, but it is scope beyond B's file list (see Could improve 1).
- Every model and placeholder body is centred on its lot. A building shallower than its lot therefore stands further back than `SETBACK` (up to about 0.5 units for a 0.8-deep placeholder on a `large` lot). The Goal's "set back the same distance" is met by the lots, not the buildings. No acceptance criterion requires more, but Josh may notice uneven frontages.
- The model `front` is 0 for every row. Whether SIMPLE Town doors face +z is only visible in Josh's browser check. The field is there for him to edit.

## Must fix
none

## Could improve
1. `src/render3d/town.ts`: the freeze is out of B's listed files. Either note it in the ticket as an accepted B change, or, if the main session prefers strict file lists, move the defensive copy into `scene.ts`. I lean to keeping it and recording it.
2. `src/render3d/models3d.ts` and `scene.ts`: optionally offset each clone and placeholder body toward its lot's front edge by (lot depth − body depth) / 2. Every building's face would then sit at the same setback from the pavement, which matches the Goal's wording.
3. `src/render3d/placeholders.test.ts` "puts each body inside its lot: matrices carry the lot's yaw…" checks centre and scale but not yaw, and checks only the first 25 bodies per type. Asserting `atan2(e[8], e[10]) ≈ lot.yaw` would make the name true.
4. `src/render3d/scene.test.ts` "lets no building or place stand between…" runs on 09 only. Running the same ray check on `56-whole-ward` (the largest map, also in Josh's check) would cover denser lots near wires.
5. `src/render3d/placeholders.ts`: the ticket says "instanced per variant". The build instances per lot type with per-instance colour, which costs the same and draws the same. Worth one line in the builder's report so it isn't read as a gap.
