ticket: 041-city-layout-and-power-lines-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A only: a pure, deterministic `townLayout(puzzle)` in a new `src/render3d/town.ts`. It lays out roads beside the long circuit lines, service runs, junction pads, clipped kerbs and pavements, a ring road with one ring of outer blocks at `BLOCK_PITCH` 12 filled pinwheel-fashion, fixed-size lots that clear the circuit and don't hide it from the camera, and one place per lamp. It comes with Vitest coverage on every map, as amended by Josh's A-Q1 ("Pitch 12, pinwheel") and the A-Q2 defaults. Nothing is drawn yet.

## Does the branch do it?
The diff is two new files, `src/render3d/town.ts` and `src/render3d/town.test.ts`. On the branch, `npm run typecheck` is clean and `npm test` passes: 78 files, 1400 tests, 28 of them in `town.test.ts`.

- **Pure.** `town.ts` imports only `../core`, `../render/city` and `./layout`, with no `three` and no DOM. The test "imports only from src/core, ../render/city and ./layout" parses the import lines and rejects `three`, `../grid`, `../play`, `../ui`, `../render/index` and `../night`. Met.
- **Deterministic.** "is deterministic: a freshly loaded copy..." runs `townLayout(load(f))` twice with `toEqual` on 09, 56 and lamp-row. The `WeakMap` cache is keyed on the puzzle object, so a fresh load really is a second build. Met.
- **Every map.** Module setup lays out every `puzzles/*.json`, lamp-row included, through `loadPuzzle`. The "has maps to lay out" test asserts more than 60 maps and that lamp-row is present, and "lays all of them out in under 3 s" checks the time. Every per-map test below loops over `maps`. Met.
- **Streets beside the wires.**
  - The test "gives each line of STREET_MIN_LEN or more exactly one road..." works the side rule out again independently: toward +z, +x for a line parallel to z, the other side if the road covers another node's square, none if both sides are blocked. It checks that the road is parallel and runs the same way, that its near edge is `KERB_OFFSET` and its far edge `KERB_OFFSET + ROAD_W` (to 1e-6), that it is on the side the rule gives, and that a short line has no road.
  - The amended square rule (roads and kerbs off every square; a pad off every square but its own node's) is checked by "keeps every road and kerb off every node's square...". It collects failures into a list and asserts the list is empty, so a failing map would be named.
  - The ring road, the grid streets and a feed lane from every feed to the ring are checked by "builds the ring road at RING_MARGIN...". The ring is checked against `puzzleBounds`.
  - Met.
- **Junctions and kerbs.** "gives every node where two or more roads end a pad that holds each road's end edge" checks more than 100 junctions, and "leaves no kerb inside another road or a pad" checks that no kerb sits inside another road or a pad. In the code, `freeRanges` clips kerbs and pavements against every road and pad except their own road. Met.
- **Lots.**
  - The exact `LOT_TYPES` size × `WORLD_PER_METRE`, a unique key and the height cap are checked by "has lots on every map...".
  - The front edge at the pavement edge plus `SETBACK`, the yaw facing the road, and the lot lying within its frontage are checked by "stands each lot's front edge...".
  - No overlap with any road, pad, pavement, node square, place or other lot, with `LOT_GAP` kept, is checked by "overlaps no road...".
  - `WIRE_CLEAR` and the occlusion rule against every wire span point, node top and lamp head are checked by "keeps WIRE_CLEAR...". That test has its own march toward the camera (`hidesPoint`), separate from `town.ts`'s `hides`.
  - `tall` lots stand outside the ring ("puts tall lots outside the ring", with more than 50 talls seen).
  - Met.
- **Built up on four sides (amended).**
  - "builds every outer block up on all four sides, mean coverage 0.45 or more, no block under 0.35" asserts the four facings per block, the minimum and the mean.
  - I measured it on the branch: 766 outer blocks, mean 0.470, lowest 0.400, highest 0.574.
  - Pinwheel order is in `town.ts`, in the `blockDefs` loop (each row starts at its own corner and stops `LOT_GAP` short of the next side's reserved band). The test "fills a block's rows pinwheel-fashion" spot-checks it on 56.
  - Met.
- **Places.**
  - One place per lamp, in `nodes` order, with its `slotKind` and today's label: "has one place per lamp...".
  - Reach, nearer its own lamp than any other, and every lot rule including occlusion at `PLACE_H`: "keeps every non-pool part within PLACE_REACH...".
  - Fixed-scale sizes for all four kinds, each of which appears somewhere: "sizes places at fixed scale...".
  - The pinned `KNOWN_POOL_EXCESS` matches the ticket's list exactly: 1 on the 13 named maps, 2 on 50, 53, 54 and 56, 3 on 49.
  - The shrine on 09 is a building, and the flood is a pool in both views.
  - The A-Q2 additions, service-run fronts (`serviceFronts`) and the gate's free-side fallback (the `pairs` list), are in the code as the ticket accepts them.
  - Met, with one weakness in the pool test noted under Could improve 1.
- **Drift guard.** `OCCLUDE_SLOPE` is checked against `ELEVATION` and `FOV_DEG` imported from `camera.ts`. `WORLD_PER_METRE` is also checked against `models.ts`, and `NODE_TOP_Y` against `POLE_HEIGHT`. Met.
- **Old tests (amended).** `layout.ts` and `layout.test.ts` are untouched, and `blockLayout` stays until B. Met.

## Rule conflicts and risks
- No hard-rule break found:
  - `src/grid/` and `src/night/` are untouched;
  - no file outside the two section A files is touched;
  - there's no new dependency, no `src/core/` or schema change, and nothing in `puzzles/`;
  - no GDD Decided rule is involved, since this is layout data only and nothing reaches play;
  - the 3D game can still take `src/grid/` and `src/night/` unchanged.
- The ticket's design text says `town.ts` takes only `stableHash`, `slotKind` and `GATE_POST` from `render/city`. It also takes `NODE_SQUARE`, `feedLanes` and the `CityRect` type. The design itself needs those (node squares, and feed lanes becoming streets), and the acceptance criterion is by file, which is met. Still, the ticket's sentence is now inaccurate.
- The builder narrowed `large` in outer blocks to one side per block, chosen by hash, and only where `ROW_MIN_SMALLS` small lots still fit beside its band. It also added `PLACE_STEP` 0.1. Neither is in the ticket, which only says that at pitch 12 `large` fits outer blocks too. Both are reasonable, and the coverage bar still holds.
- `townLayout` returns a cached, mutable `Town` that is shared between callers. When B's scene uses it, any mutation would leak into every later call for that puzzle.

## Must fix
none

## Could improve
1. `town.test.ts`, test "has no more pool places than 2D's footprintLayout...". The test clamps the difference with `Math.max(0, ...)`. The amended criterion says the difference must equal the pinned entry exactly, so "any change, better or worse, fails". With the clamp, a map that isn't listed and ends up with fewer pools than 2D would pass silently. I checked, and no map is below 2D today, so dropping the clamp changes no result now. The test name also still carries the pre-amendment wording.
2. `town.test.ts`, test "steps by FILL_STEP when nothing fits...". The name claims no gap is left that a smaller lot could use, but the test only asserts gaps of at least `LOT_GAP`. Either rename it or assert that every gap is under the smallest frontage plus `LOT_GAP` + `FILL_STEP`.
3. `town.test.ts`, test "builds the ring road...". It checks that a feed lane's road overlaps the ring road. The criterion says the lane reaches the ring's centreline. The code does that (`end` is set on `ring.maxX`/`minX`/`maxY`/`minY`), but the test could assert the lane's end coordinate directly.
4. In the ticket's section A deviations (the architect's file), record the extra `render/city` imports and the one-`large`-side-per-block, `ROW_MIN_SMALLS` and `PLACE_STEP` choices, so B's builder and Josh see them.
5. `town.ts`. Consider typing `Town`'s arrays as `readonly`, or document that callers must not mutate the cached result, before B's scene starts consuming it.
