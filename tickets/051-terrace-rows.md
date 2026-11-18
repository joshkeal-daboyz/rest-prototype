# 051 · Terrace rows: city blocks that abut along a street, and a street-level camera to judge them

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. G1 waived for the city-style goal (Josh, 18 Nov 2026, in chat). Section A may build now. B, C and D wait for the 050 sections named under each.
branch: `ticket/051-terrace-rows` (sections may use `ticket/051a-street-camera` and so on)

## Josh's words
> "leverage the city pack and establish a style guide that will allow you to build procedural cities by leveraging the city pack... a city guide that is able to yield similar quality results to that city in the image excluding the humans, animals and vehicles." (18 Nov 2026, the overnight goal; he waived ticket approvals for it)
> "Corner buildings should only be placed on corners. They must also have two sides facing the street. Only corner buildings have this restriction. Other buildings can be placed on corners normally." (17 Nov 2026, 042 A)
> "no building model is ever shrunk or grown to fit a lot" is 041's Decided rule (his words: "The buildings are also scaled variably. I can see the same building copied and pasted multiple times and scaled at different sized.", 17 Nov 2026).

**The look target** (the reference images of 18 Nov 2026): one continuous wall of 3 to 5 storey blocks along a street, no gaps between neighbours, floor counts varying block to block, a corner block turning the corner with two street faces, an open parking lot and a corner plaza breaking the wall once each. 050 builds the blocks (its Q5 left the terrace out). This ticket builds the wall.

## Findings (checked against `main` at `4aed8eb`, the goal branch at `880f211` and the local manifest, 18 Nov 2026; no browser)
1. **Where lots stand today** (`town.ts` `fillRow`, lines 1289 to 1360). Every lot is a fixed `LOT_TYPES` size with `LOT_GAP` between neighbours. Outer blocks are filled pinwheel-fashion: each side's row starts at its own corner and stops `LOT_GAP` short of the next side's band (the next row's deepest type). So each row's first lot is a true corner lot and its last lot faces the next row's corner lot's side.
2. **Places come first.** Places (and their pools) are laid out before any lot (`town.ts` around line 1180, lots from line 1280). A change confined to lot filling cannot change a place or a pool. `town.test.ts` "has no more pool places than 2D's footprintLayout..." pins the pool counts per map exactly.
3. **Picks do not see buildings.** `pick.ts` raycasts only objects with `userData.pickKind` "node" or "wire", which come from `layout.ts`, not from lots. A building can only hurt a pick by hiding a target from the camera, which `town.ts`'s occlusion rule (`clears`, `OCCLUDE_SLOPE`) and 041 B's ray test prevent per lot cap.
4. **Placeholders shrink.** `placeholderBuilding` scales each box by `FOOTPRINT_FACTORS` (under 1), so placeholder neighbours never touch.
5. **Bay widths** (finding 1 of 050): apartment mid columns are 5.00 / 5.17 / 5.28 m wide, corner columns 5.20 to 5.49 m, pieces 5.2 to 5.9 m deep, a storey 3.00 m, roofs at most 0.74 m. A terrace that abuts with no scaling must be packed from the pieces' true widths, which only the manifest knows. The layout itself is model-free (CI has no manifest).
6. **One camera.** `camera.ts` is a fixed 45° rig the picker shares. There is no low view of a street; the 050 B stack gallery shows stacks in a line, not a street.

## Goal
In the 3D view, each outer city block is walled by terraces: on every side, blocks of 3 to 5 storeys stand shoulder to shoulder along the street with shared party walls, varied in style and floor count, each row starting with a corner block that shows two street faces on its true corner. Where the City Pack is absent (CI, a fresh checkout), the same rows stand as abutting placeholder boxes. Play, the circuit's streets, places, pools, wires, poles and every pick target are exactly as on `main`. A dev-only street camera (`&cam=street`) frames any row from a low oblique angle like the reference, so the main session can judge quality by screenshot.

## The design (defaults; see Open questions)
1. **Terrace rows are the outer blocks' rows only** (Q1). The ring road's inside, the circuit's streets and decor keep `fillRow` exactly as today.
2. **Runs, pure, in `town.ts`.** An outer block's row becomes a run of nominal terrace lots:
   - each nominal lot is `bays x TERRACE_BAY_M` wide and `TERRACE_DEPTH_M` deep, `bays` by `stableHash(key)` in `TERRACE_BAYS`; neighbours in a run touch (gap 0);
   - every side's band is `TERRACE_DEPTH_M`, so a row runs on to the back wall of the next row's corner block, with no gap on the street;
   - each nominal lot gets the highest cap in `TERRACE_CAPS_M` that passes `clears` (the occlusion and wire rules unchanged), so blocks step down where the circuit is near; a slot that clears no cap ends the run, and the next run starts `FILL_STEP` on;
   - `Lot` gains an optional `terrace: { run: string; index: number; bays: number }`; `Town` gains `terraces: TerraceRun[]` and `openLots: OpenLot[]`;
   - lot `type` is `"large"` for every terrace lot (its cap is its own `hMax`); a terrace lot never takes a whole model (design item 5).
3. **Open lots** (Q4). At most one parking lot per run (runs of at least `PARKING_MIN_RUN_BAYS` nominal bays, `stableHash(run.id) % PARKING_ONE_IN === 0`), `PARKING_W_M x PARKING_D_M`, mid-run; at most one plaza per outer block (`stableHash(block.id) % PLAZA_ONE_IN === 0`), `PLAZA_W_M` square, at one row's start, in place of its corner block. Open lots are in `Town.openLots`, never in `Town.lots`, so drops, placeholders and building picks ignore them. They pass `clears` at cap 0. 052 C dresses them; until then they are bare yard.
4. **Packing, pure** (new `terrace.ts`). `packTerrace(run, styles, entries, fronts)` re-cuts a run's nominal lots into exact blocks from the pieces' true widths:
   - apartment styles only (`apartment-01` to `-03`, Q2); each block is one style, `TERRACE_BAYS` columns, its floors picked by hash within 050's `stackRange` under its nominal lot's cap;
   - the first block is a corner block (050 design item 4) exactly when the run's first nominal lot has that `cornerSides` side; no other block in the run is a corner block (Josh's rule);
   - blocks are laid flush from the run's start; the run's far end is the next row's corner block's back wall (or the plaza's edge, or a parking lot's edge, or the run's clearance end); the packer chooses bays and styles so the last gap is at most `TERRACE_SEAM_M`, and if no choice meets it the remainder is left at the far end only;
   - neighbours never share a style or a floor count; the 050 C variety rules (`STREET_REPEAT_GAP`, `FAMILY_SHARE_MAX`) hold across the map;
   - every block's footprint lies inside the union of its run's nominal lots and the next row's corner nominal lot (the strip behind a corner stack), so it is inside cleared ground.
5. **Placement** (`models3d.ts`). When the 050 C plan has the apartment styles, each run's nominal placeholders are replaced by its packed stacks; otherwise the placeholders stay. Placeholders on terrace lots use the whole lot footprint (no `FOOTPRINT_FACTORS`), so the CI town is abutting boxes.
6. **The street camera** (dev only, new `streetcam.ts`). `/?puzzle=<id>&view=3d&cam=street[&run=N][&at=T][&light=day]`:
   - rows are `town.terraces` (before section B lands: lots grouped by `street:side`, in fill order), sorted by length, longest first, ties by id; `run` picks one (default 0, wraps);
   - the eye stands across the row's road, `STREET_CAM_BACK_M` out from the row's front line, `STREET_CAM_EYE_M` up, turned `STREET_CAM_YAW_DEG` along the row, looking at the front line `STREET_CAM_LOOK_M` up at fraction `at` (default 0.5; 0 is the corner) of the row; FOV `STREET_CAM_FOV_DEG`;
   - it renders through its own `PerspectiveCamera`; the play rig and picker are untouched, `hitTest` returns null and pan and zoom do nothing while it is on;
   - `light=day` adds one dev-only `HemisphereLight` so form can be judged (the game stays a night scene);
   - it logs one `console.info("street camera: run N of M, <run id>, K blocks")` line once the models are applied, so a screenshot can wait for it;
   - it is read in `renderer.ts` behind `import.meta.env.DEV`, like the gallery, so it is not in `npm run build`.

## Sections (each at most a day)
- **A. The street camera** (about ½ day). Design item 6. Needs nothing from 050; may build now, in parallel with 050 A (no shared file).
- **B. Terrace runs in the layout** (about 1 day). Design items 1 to 3, the placeholder footprint of item 5, and the guide lines for them. Needs nothing from 050 (the layout is model-free). Build it after 050 B merges, so the main session can review one town change at a time.
- **C. Packing** (about ¾ day). Design item 4, pure. Needs 050 A merged (`stackRange`, `assembleStack`, `STACK_STYLES`) and 051 B.
- **D. Terraces in the town** (about ¾ day). Design item 5's swap. Needs 050 C and 051 C merged.

## Acceptance criteria
**CI-safe rules (every section).** Tests use fixture entries with names and bounds typed in as numbers (050 finding 1; the way `facing.test.ts` and `polygon.test.ts` do). No test reads `assets/private/` at module or `describe` level; a manifest check stays inside an `it` and is skipped when the file is absent. No Windows paths (build paths with `path.join` or `new URL(..., import.meta.url)`), no timer under 1 s, no wall-clock wait. Nothing from `assets/private/` is committed or bundled.

### A
1. [ ] (Vitest) `streetCamRequested(search)` parses `cam=street`, `run`, `at` (clamped to 0..1) and `light=day`; anything else is null or the default.
2. [ ] (Vitest) `streetPose(town, opts)` on `09-shrine-circuit` and `64-the-whole-chain`: the eye is above ground, outside every lot and place polygon and over a road or pavement; the look point is on the row's front line; at least three of the row's lots have both front corners (at y = 0 and at y = their `hMax`) projected inside the frame; the same inputs give the same pose.
3. [ ] (Vitest) With the street camera on, `hitTest` returns null for every point and the play rig's camera matrix is unchanged by `draw`; with it off, `renderer.ts` takes today's path (a source test: the street branch sits behind `import.meta.env.DEV`).
4. [ ] (Main session) `npm run build` then `dist/` contains no `street camera:` string.

### B
5. [ ] (Vitest, new `terrace.test.ts` or a new `describe` in `town.test.ts`) On every map (`puzzles/*.json`):
   - every outer block row is a run of terrace lots; within a run, consecutive lots share an edge within 1e-6 and do not overlap; every terrace lot is `bays x TERRACE_BAY_M` by `TERRACE_DEPTH_M`, `bays` in `TERRACE_BAYS`, `hMax` one of `TERRACE_CAPS_M`;
   - each row's last lot ends within 1e-6 of the next row's band (no street gap);
   - every terrace lot and open lot passes the lot rules (roads, pads, pavements, node squares, places, `WIRE_CLEAR`, the occlusion rule at its own cap);
   - cap tiers differ somewhere on the ladder, and each tier appears.
6. [ ] (Vitest) **Nothing else moves.** `townLayout(puzzle, { terraces: false })` is today's layout. For every map, `roads`, `kerbs`, `pavements`, `pads`, `blocks`, `places`, `ring` and `window` deep-equal between `terraces: true` and `false`, and so does every lot that is not on an outer block row. The pool-count test ("has no more pool places than 2D's footprintLayout...") passes unedited.
7. [ ] (Vitest) **Picks unchanged.** On `01-first-light`, `09-shrine-circuit` and `64-the-whole-chain` (three maps keep the suite fast), `buildScene` with terraces on and off (a test-only `terraces` option passed through to `townLayout`) has the same pick targets: the same `pickId`, `pickKind`, world matrix and geometry bounding box, in the same order. `pick.test.ts` passes unedited. 041 B's ray test passes unedited with terrace lots at their caps.
8. [ ] (Vitest) **Open lots.** At most one parking lot per run and one plaza per outer block, at the sizes above; a plaza stands only at a row's start; no open lot is in `Town.lots`; the hash rules are deterministic.
9. [ ] (Vitest) Placeholders on terrace lots fill their lot's footprint exactly and stay under `hMax`; other placeholders are unchanged.
10. [ ] (Vitest) Existing `town.test.ts` tests that terraces contradict by design (four exact types, `LOT_GAP` between every pair, block area coverage, pinwheel `LOT_GAP` row ends, `FILL_STEP` gaps) are changed only to call `townLayout(p, { terraces: false })`. The builder names each one in the report. Every other existing test in `src/render3d/` passes unedited.
11. [ ] (Vitest) `styleguide.test.ts` green with chapter 4 gaining the terrace rows rule (tagged **Default (051)**) and Numbers rows for every `TERRACE_*`, `PARKING_*`, `PLAZA_*` constant.

### C
12. [ ] (Vitest) On fixture widths, for every run on every map: blocks are flush (each block's start equals the previous block's end within 1e-6); the far gap is at most `TERRACE_SEAM_M` on at least 90% of runs and never negative; no two blocks overlap; every block lies inside the union described in design item 4.
13. [ ] (Vitest) A corner block appears only as a run's first block and exactly when its first nominal lot has the matching corner side, with its corner column on that side; no other block has a corner key. A run whose start is a plaza has no corner block.
14. [ ] (Vitest) Neighbouring blocks differ in style and in floor count; every block's top is at or under its nominal lot's cap; floors over the base are 2 to 4 (3 to 5 storeys); the packing is deterministic per run id; over the ladder each style and each floor count appears.

### D
15. [ ] (Vitest) With the stack fixture plan, every terrace run's placeholders are replaced by its packed stacks, one `stack:<style>` group per block; with no `city-pack` (the CI case) the scene's buildings equal section B's placeholders exactly. No stack child raycasts.
16. [ ] (Vitest) 050 C's variety, corner and "in the town" tests pass unedited with terraces on, and a new run of 041 B's ray test uses the packed stacks' fixture heights on `09-shrine-circuit` and `64-the-whole-chain`.
17. [ ] (Main session, screenshots) `npm run dev`, then `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0`, `&run=1`, `&run=0&at=0` and `&light=day`, and the same on `64-the-whole-chain`: continuous walls, varied heights, corner blocks with two faces, no floating or overlapping storeys, no slit between neighbours wider than a hairline. Then the play view of both maps: the circuit reads exactly as on `main`.

### Every section
18. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. Writes nothing under `assets/`.
19. [ ] (Main session) `npm run gate` green and the test count grew; `npm run playtest` green with no snapshot change; `git diff main -- src/core/ src/render/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html` empty; `git ls-files assets/private` empty; `dist/` has no `.glb`, `manifest.json` or `private` path.
20. [ ] **Keep** (Vitest, unedited): 041's live/dead, cut and Relight tests (`live.test.ts`, `relight3d.test.ts`), `pick.test.ts`, `polygon.test.ts`, `facing.test.ts`. Live still differs from dead by more than colour.

## Files
- **Renderer, may touch:**
  - A: new `src/render3d/streetcam.ts` and `streetcam.test.ts`; `renderer.ts` (the dev-only branch only).
  - B: `town.ts` (outer-block rows, runs, open lots, the `terraces` option), `placeholders.ts` (terrace footprint only), `scene.ts` (pass the test-only `terraces` option through; nothing else), `streetcam.ts` (read `town.terraces`), new tests, the named `town.test.ts` edits (criterion 10), `docs/city-style-guide.md` (chapter 4 and Numbers).
  - C: new `src/render3d/terrace.ts` and `terrace.test.ts`; `stacks.ts` only to let `stackRange`/`assembleStack` take a lot's own frontage and cap (a terrace lot is not `LOT_TYPES.large`'s size).
  - D: `models3d.ts` (`buildingPlacements`/`applyModels` for runs), `models.ts` (terrace lots skip whole models), their tests.
- **Must not touch:** `layout.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `calibration.ts`, `debug3d.ts`, `gallery.ts`; `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`; `tests/`, `puzzles/`, `tools/`, `package.json`, `vite.config.ts`, `index.html`, `public/`; anything under `assets/` (read only). A builder that needs one stops and asks for a re-cut.

## Interfaces
- **No `src/core/` change, no schema change, no event change, no new dependency.** Three is approved (037); `HemisphereLight` and `PerspectiveCamera` are Three's.
- **Local to `src/render3d/` (the builder may rename):**
  - `town.ts`: `townLayout(puzzle, opts?: { terraces?: boolean })` (default true; the cache keys on the option); `Lot.terrace?: { run: string; index: number; bays: number }`; `TerraceRun { id: string; block: string; road: string; side: 1 | -1; lots: readonly number[] /* indices into lots */; ax: number; az: number; ux: number; uz: number; len: number; startCorner: CornerSide | null; endAbuts: "corner" | "plaza" | "parking" | "end" }`; `OpenLot { kind: "parking" | "plaza"; run: string; x: number; z: number; w: number; d: number; yaw: number }`; constants `TERRACE_BAY_M = 5.2`, `TERRACE_DEPTH_M = 6`, `TERRACE_BAYS = { min: 2, max: 4 }`, `TERRACE_CAPS_M = [16, 13, 10]`, `PARKING_W_M = 10`, `PARKING_D_M = 10`, `PARKING_MIN_RUN_BAYS = 8`, `PARKING_ONE_IN = 3`, `PLAZA_W_M = 10.4`, `PLAZA_ONE_IN = 4`.
  - `terrace.ts`: `TERRACE_SEAM_M = 0.1`; `PackedBlock { lot: Lot; style: string; bays: number; floors: number; corner: boolean; stack: Stack }`; `packTerrace(run, nominal: readonly Lot[], styles: readonly StackStyle[], entries, fronts): { blocks: PackedBlock[]; farGap_m: number }`.
  - `streetcam.ts`: `STREET_CAM_BACK_M = 26`, `STREET_CAM_EYE_M = 9`, `STREET_CAM_LOOK_M = 6`, `STREET_CAM_YAW_DEG = 35`, `STREET_CAM_FOV_DEG = 50`; `streetCamRequested(search): { run: number; at: number; day: boolean } | null`; `streetRows(town)`; `streetPose(town, opts): { eye: [number, number, number]; look: [number, number, number]; fov: number; row: string }`.

## How play, pools and picks are guarded
Criteria 6 and 7 compare terraces on and off on every map: everything but outer-block lots is deep-equal, the pick targets are identical, and the pool-count test runs unedited. Criterion 19's diff keeps play code and the playtest snapshots untouched, and criterion 20 keeps the live/dead and pick tests unedited. The occlusion rule is applied per terrace lot at its own cap tier, so a taller block can only appear where 041's rule already allows it.

## Open questions (decided defaults; nobody was available to answer, Josh may overturn any)
1. **Which rows become terraces.** Default: outer-block rows only. The reference is a city street, and the outer blocks are where 050 Q1 puts the city; the ring's inside and the circuit's streets keep 048's Town Pack houses, so the circuit stays readable and the town edge becomes city. Alternative: the ring road's inside too.
2. **Which styles stand in a terrace.** Default: the three apartment styles only, because the reference's terrace is shopfronts with apartments over, and the offices' footprint depth would break the common front line. Offices stay on non-terrace `tall` lots (050 C).
3. **Depth.** Default: one bay deep (`TERRACE_DEPTH_M` 6), like 050's stacks; the block's inside stays yard. From the street the reference shows only fronts. Alternative (a later ticket, needs 050 recipes): back-to-back stacks for a solid block from the play camera.
4. **Open lots.** Default: yes, one parking lot per qualifying run and one corner plaza per one block in four, because the reference has both; dressed in 052 C. Alternative: none (an unbroken wall).
5. **Heights.** Default: three cap tiers (5, 4, 3 storeys) chosen by the occlusion rule, then floors by hash under the cap with neighbours differing, which gives the reference's 3 to 5 storey skyline. Alternative: one cap (16 m) with lots dropped where it fails.
6. **The camera.** Default: eye 9 m up, 26 m back, 35° along the row, so about four blocks and the roofline fit, as in the reference. Daylight only on `light=day`, dev only; the game stays a night scene.

Decided rules: none is touched (visual only); `rules-coverage.md` does not change.
