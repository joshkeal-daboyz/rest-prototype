ticket: 037-three-view-spike
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A Three.js spike: a tilted 3D view of the existing map behind `?view=3d`, with poles and sagging wires along the circuit's lines, block buildings, and objects for each node. It satisfies the existing renderer interfaces so play and ui are unchanged. Pure layout, look and picking are unit-tested without WebGL. Nothing in `src/render/`, `src/play/`, `src/ui/`, `src/grid/`, `src/core/`, `tests/` or `puzzles/` moves.

## Does the branch do it?
`npm run typecheck` is clean. `npm test` passes: 70 files, 1189 tests. `git diff main...branch -- tests/ src/render/ src/play/ src/ui/ src/grid/ src/core/ src/night/ puzzles/` is empty.

**Pure layout** (`src/render3d/layout.ts`, `layout.test.ts`)
- One run per line: `wireLayout` loops over `puzzle.lines` only. A test checks there are 15 runs in file order, and another checks that adding a `decor` path adds no run (decor stays a street, drawn through `circuitStreets` in `scene.ts`). Met.
- Runs end on their nodes: a test checks the first and last attachment points equal `(pos.x, POLE_HEIGHT, pos.y)`. Further tests check that every pole lies on the segment (zero cross product), that spacing is at most `POLE_SPACING`, and that a short run has exactly two points. They also check that both cases occur on the map. Met.
- Wires sag: `sagSpan` is a parabola with zero sag at the ends. A test checks `SAG_SEGMENTS + 1` points, exact ends, the lowest point at mid-span, sag equal to `SAG_RATIO × len` within 1e-6, and y > 0 everywhere. Met.
- Deterministic and play-free: there is a deep-equal test for both layouts. The import-line test checks that `layout.ts` imports nothing matching grid, play or three. Met.
- Building blocks: `blockLayout` combines `footprintLayout` at `DEFAULT_SCALE` with `cityForMap` in a fixed `CITY_WINDOW` and drops duplicate footprint lots. Heights come from `stableHash`. Tests check the height range, that lamp ids are kept in node order, and that no block overlaps a wire's segment (Liang-Barsky in x/z). Met.
- Looks from state (`look.ts`, `look.test.ts`): `wireLook` and `nodeLook` read only `GridState`. A fault shows as faulted only when it is in `state.readableFaults` or the line is sparking, so "readable means current reaches it" comes from the grid and is not approximated here. The tests cover the start state, after `sw_1` (`l_b` faulted), after `repair:l_b` (brownout, `lampFlicker` > 0 for every lamp at several times), and after `br_street` (complete, shrine and flood lit, street dark, breaker open). Met.

**Picking** (`pick.ts`, `pick.test.ts`, with no `WebGLRenderer`)
- Every node's pick box, projected at 1280×720 with insets `{top: 120, bottom: 90}`, returns its own id. The test asserts that all six node kinds are present. Met.
- `l_b`, and every other wire, returns its own id at its projected `mid`. The pick target is an invisible `Line` with `Raycaster.params.Line.threshold = WIRE_PICK_RADIUS` (0.15), and the drawn tube has radius 0.035. Met in code. The "wider than drawn" part is tested only by `WIRE_PICK_RADIUS > 0.035` (see Could improve 1).
- Bare ground, off-canvas points and points inside blockers return null, and clearing the blockers restores the hit. Met.
- A node beats a wire in front of it: `hitTest` checks nodes before wires. A test builds a wire on the ray in front of a node and shows that the wire wins alone and the node wins when both are present. Met.

**The renderer** (needs WebGL, so Josh checks it)
- `createMapRenderer3d` in `index.ts`/`renderer.ts` returns the required intersection plus `dispose()`, and it type-checks against the existing interfaces, which are imported as types from `../render`. `notify` is a no-op and `placeAt` returns null. Pan, zoom, reset and fit are in `camera.ts`. Tests check the opening fit inside the insets, and that pan, zoom and reset don't throw and that reset restores the opening scale.
- `main.ts` stays within the declared lines. It reads `view=3d` once, loads `./render3d` with a dynamic `import()`, and keeps `view` in `urlFor` because the URL is built from `location.href`. It calls `renderer.dispose?.()` in detach. Contexts don't stack: there is one `WebGLRenderer` per canvas in a `WeakMap`, reused across sessions, and each session's `dispose` frees its own scene's geometries, materials and pool texture. That meets the intent of "doesn't stack WebGL contexts".
- The accessibility rule (live is more than colour): live wires breathe and carry a bead in the direction of flow, dead wires are dull and still, and a faulted cable flickers and shows a spark. A lit lamp gets a `PointLight` and an additive ground pool. A scene test confirms that only the lit lamps have a light and that all five vary in the brownout.

**Nothing else moves:** the scoped diff is empty and the gate is green. The playtest is the playtester's to confirm.

## Rule conflicts and risks
- No GDD Decided rule is touched, and no schema or puzzle change is made. `src/grid/` and `src/night/` are untouched.
- New dependencies: `three` and `@types/three` at `^0.187.0`, as the ticket's G1 covered. The lock also pulls in `@types/three`'s own type dependencies (`@dimforge/rapier3d-compat`, `@tweenjs/tween.js`, `@types/stats.js`, `@types/webxr`, `fflate`, `meshoptimizer`). These are normal for `@types/three`, but they are dev-only additions Josh may not expect.
- The branch carries a commit the builder didn't write that has nothing to do with this ticket: `38e7c4e`, which adds `.claude/agents/asset-scout.md`. Merging 037 brings it in. The doc and agent edits in `ef6c36a` (CLAUDE.md, the brief, `renderer.md`) are the ones the ticket asked the main session to make, so they are fine.
- `src/render3d/` imports value helpers from `src/render/city`, `geometry` and `motion` by file, as the ticket allows, and never imports `../render/index` except as types. If those helpers ever gain a canvas dependency, the 3D view would inherit it.

## Must fix
none

## Could improve
1. `src/render3d/pick.test.ts`: the "pick target wider than the drawn wire" criterion is asserted only as `WIRE_PICK_RADIUS > 0.035`. Add a hit at a point offset from `l_b`'s mid by about 0.1 world units perpendicular to the wire (outside the tube, inside the radius). That makes the claim behavioural.
2. `src/render3d/scene.ts`: a faulted cable is still drawn as one continuous tube, with a spark at mid and the bead stopping halfway. The ticket asks for a "visible break". If Josh doesn't read it as broken, split the tube at mid (or hide a short section there) when the look is `faulted`.
3. Move or drop the unrelated asset-scout commit (`38e7c4e`) from this branch, so the merge commit carrying Josh's words covers only 037.
4. `layout.test.ts`'s import check only matches `import ... from "x"`. A bare `import "three"` side-effect import would slip through. Widening the regex to cover `import\s+["']` would close that.

---

# Section B · Captions and readable objects (commits 88f575f, 911535f, b81953c)

## What the ticket asked for, as I understood it
Section B adds captions to the 3D view, using the 2D helpers' words: the feed's level and use, breaker ON/OFF, the fuse's rating, a segmented load bar and the blown state, each lamp's level, and the shrine's star and place name. These are camera-facing sprites that never take a click. It also makes each object readable without a caption: a breaker lever, a switch lever with a ground chevron, a lamp halo and a star. All of it stays in `src/render3d/`, with no new dependency and no edit to `main.ts`.

## Does the branch do it?
`npm run typecheck` is clean. `npm test` passes: 72 files, 1214 tests. Section A had 1189, so section B adds 25. Since 78c5843 the branch touches only `src/render3d/`. `git diff main...branch` over `tests/ src/render/ src/play/ src/ui/ src/grid/ src/core/ src/night/ puzzles/ index.html` is empty. Against `main`, only section A's declared `main.ts` lines and `package.json` differ.

**Caption text** (`captions.ts`, `captions.test.ts`)
- Start, after `sw_1`, brownout and won: four tests assert exactly the ticket's listed values. These are the feed lines and tone, ON/OFF with dim when open, `fb_A`'s fill 1, step 2, 2 ticks, not blown (then fill 0 and step 0 after the win), the `LvN Lamp` words, the shrine as target with place `"shrine"`, the other lamps with place null, `sw_1`'s `selectedLine` going `l_a` then `l_b`, junctions with no lines, and the brownout alarm `! using 6 of 4 !`. Met.
- Same words as 2D: a test loops over every `puzzles/*.json` (not `locked/`) and compares against `createFeedCaptions`, `fuseCaption` and `lampCaption` called in the test. It doesn't restate strings. Met.
- Blown vs at the limit: on `07-past-the-fuse`, `fb_A` at start reads `blown: true`, fill 0, alarm, `["Lv3 Fuse"]`, and the test checks that the readable fault exists. The Shrine's `fb_A` is `blown: false`, step 2, and the two records differ. The blown test reads `state.faults` with `kind === "blown-fuse"` and `state.readableFaults`. So "readable" comes from the grid; captions don't approximate it. Met.
- ON/OFF drift guard: a test reads `src/render/map-renderer.ts` for `closed ? "ON" : "OFF"` and checks the constants. Met.
- Pure: a test reads the import lines. They show no `three`, `play`, `../render` or `../render/index`, and only types from grid. The file imports `cityPlaces` from `../render/city`, which is allowed. Deep-equal on repeat, and the same `lines` references while unchanged, with a new reference only for the thrown breaker. Met.

**Layout**
- `PlaceBlock.label` carries `footprintLayout`'s label. `layout.test.ts` checks `"shrine"`, null for the rest, and equality with `footprintLayout`. Met.

**Scene and picking**
- One sprite per node with words, plus `shrine:place`. The test checks the exact id list and that no `pickKind` is set. Met.
- Captions don't take clicks: section A's `pick.test.ts` builds `buildScene(puzzle)` with no options. In Node that picks the stub surface, so A's picking tests now run with captions in the scene, and they pass. A new test compares `hitTest` at each caption's centre with and without the sprites, and accepts only node or line ids or null. Met.
- Legible: every anchor projects inside the free area at the opening pose. Text height is checked at three viewports through `captionTextPx`. Met (but see Could improve 3).
- Breaker shape: the lever is 0.55 long. Closed, the tip is more than 0.4 above the pivot. Open, the tip is no higher than pivot + 0.1: `BREAKER_OFF_ANGLE` 2.2 rad puts it about 0.33 below the pivot. `live.test.ts` also checks it returns to ON. Met.
- Switch shape: the lever is at least 0.6 long and within 5° of the far node, before and after `sw_1`. The chevron is within 1° of that direction and nearer than the far node. Met.
- Fuse bar: fill 1 at start and 0 after the win. The ticket's wording is "the fill mesh's x-scale". The builder made the bar a camera-facing canvas sprite (911535f), so the test reads the fill the bar was last drawn with (`userData.fill`), not a mesh scale. The behaviour the criterion protects (the bar follows `fuseFill`) is tested, and `live.test.ts` also covers blown, then repaired, then filled. I count it as met in substance; see Could improve 1.

**Browser**: these are Josh's checks. In code: there is a bolt shape on the feed's roof. The breaker box is at least the fuse box's size and carries a ribbon tag, unconditionally, as in 2D. The switch is a drum with a lever, a dim stub and a chevron. The fuse cartridge turns scorched on `cap.blown`. A lit lamp has a halo, a pool and a point light, and the halo is hidden when dark (`live.test.ts` checks the lights through start, brownout and win). A target has a dashed ring and a star outline, filled when lit. Caption sprites use `sizeAttenuation: false`, `depthTest: false` and `renderOrder` 10. A test checks that no two captions or bars overlap each other or cover a node at the opening pose. Textures are rebuilt when the caption size changes and freed. Every sprite's map is disposed in `dispose()`.

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are untouched, with no new dependency, no schema change and no puzzle change. No GDD Decided rule is touched.
- Three items go beyond what section B's text described. They are all inside `src/render3d/`, and the commit names suggest they are fixes after Josh played it:
  - The opening camera now frames `puzzleBounds` + 1 to about 80% of the free area, and `fitWhole` alone frames the footprint. Section A's criterion grouped them: "`resetView`/`fitWhole` frame the footprint inside the insets". `camera.ts` isn't in section B's edited list.
  - Lamp captions sit beside the lamp, away from its wire, rather than "under the lamp head".
  - The fuse bar is a sprite, not a 3D bar.
  None breaks a rule. But Josh should know that the opening frame he judged in section A has changed.
- `captionsFor.update` builds a few small arrays per node every frame, before `settle` compares them. It makes no new strings and no canvases, so it is within the ticket's letter, but it is not allocation-free.
- `dispose()` disposes the halo's map (`poolTex`) through the sprite loop and then again explicitly. Disposing twice is harmless in three.

## Must fix
none

## Could improve
1. `tickets/037-three-view-spike.md` (for the architect): record that the fuse bar is a fixed-pixel sprite, and that the criterion is now "the bar's drawn fill equals `fuseFill`". Record too that lamp captions sit beside the lamp. This keeps the ticket truthful. Otherwise, if a 3D mesh bar is wanted, add a fill mesh whose `scale.x` is the fill.
2. `src/render3d/camera.ts`: the opening-frame change is out of section B's described scope. Name it to Josh. If he didn't ask for it, move it to its own ticket. In either case, section A's "frame the footprint" criterion now holds only for `fitWhole`.
3. `scene.test.ts` legibility: `captionTextPx(scale.y, cssH, fontPx, …)` returns `fontPx` by construction for any sprite built by `createCaptionSprite`, so the check can't fail unless `setViewport` is skipped. A stronger test would project the sprite's top and bottom edge at the opening pose and measure the pixel height.
4. `captions.ts`: compare the parts against `rec.lines` directly, rather than building the `next` array each frame, so `update` allocates nothing when the state is unchanged.

---

# Section C · Wires in the air, a visible break, the Relight in 3D (commit 2898b81)

## What the ticket asked for, as I understood it
C1 raises the wires (taller, lighter poles with cross-arms turned across the run, more sag, a thicker tube, a shadow strip under each run, the camera lowered to 45°, footprint buildings kept below the wires). C2 draws a damaged cable as two hanging ends with a gap and a spark while it sparks, plain dead when it is unpowered, and "new cable" blue once it is mended and not live. C3 plays 2D's Relight in 3D from the same `planRelight`, so the sounds and the splash stay in step. Place glow eases as in 2D. All of it stays in `src/render3d/`.

## Does the branch do it?
I reviewed the committed branch in a detached worktree at 2898b81, so the uncommitted 038 files were left out. `npm run typecheck` is clean. `npm test` passes: 73 files, 1247 tests, against section B's 1214, so section C adds 33 tests. 2898b81 touches only `src/render3d/`. `git diff main 2898b81` over `src/grid src/night tests src/render src/play src/ui src/core puzzles index.html` is empty. No dependency was added.

**C1, layout** (`layout.ts`, `layout.test.ts` "wires in the air (C1)")
- `POLE_HEIGHT` is 1.6. Section A's ends-on-nodes test still passes. Met.
- `SAG_RATIO` is 0.12. `l_feed` sags 0.24 within 1e-6, and no point is below `POLE_HEIGHT - 0.3`. Met.
- `shadowOf`: same x and z, y = `SHADOW_Y`, for every run. Met.
- Heights: footprint buildings are at most `FOOTPRINT_MAX_H` (1.4, which is below `POLE_HEIGHT`). Places are at most `PLACE_MAX_H`. City lots stay in `[BLOCK_MIN_H, BLOCK_MAX_H]`. Met.

**C1, scene and camera** (`scene.test.ts` "wires and poles (C1)")
- Poles and arms: 9 instances each. Each arm is between 85° and 95° of its run in the ground plane, and is 0.7 long. Pole contrast is at least 3:1 (WCAG luminance, computed in the test). Met.
- The wire is in the air: each run's `mid` is at least 30 px from the shadow point directly below it, and `l_feed`'s chord-to-sag distance is at least 6 px. The whole tube's radius is at least 0.05. Met.
- Nothing hides a wire: rays from the camera to every run's `mid` and every node at `POLE_HEIGHT` meet no box from `blockLayout` (blocks and place boxes). The test uses the layout boxes the meshes are built from, not the meshes. I count it as met.
- Nodes meet their wires: every end attachment point is within 0.15 of its node group's `Box3`. Met (see Could improve 2).
- Camera: `ELEVATION` is 45°. The opening-frame test now projects at `POLE_HEIGHT`. That is the one deliberate edit, and its bounds are unchanged. Met.
- Captions: the overlap test probes at `NODE_BODY_Y` and `POLE_HEIGHT`, which is the second deliberate edit. Its assertions are unchanged and pass. Met.
- Picking: the existing tests in `pick.test.ts` are unchanged and pass. One new test is added for `pickOff`. Met.

**C2, layout**
- Only `l_b` has a `brk`.
- `l_b`:
  - span 1;
  - the ends start at `attach[1]` and `attach[2]`, with `HANG_SEGMENTS + 1` points, and their heights never rise;
  - the tips are at `POLE_HEIGHT - HANG_DROP`, above 0, and `BREAK_GAP` apart within 1e-6;
  - `gap` is the midpoint of the broken span in x and z;
  - the halves start at `attach[0]` and `attach[3]` and end at their tips, each on its own side of the gap's perpendicular plane.
- The synthetic 2-span run breaks in span 1. The synthetic 1-span run hangs its ends from the two nodes.

Met. `breakOf` matches the ticket's geometry: linear reach, `y = attach.y - HANG_DROP*s^2`, and the span is `floor(n/2)`.

**C2, scene and picking** (`live.test.ts` "the damaged cable (C2)")
- Start: the whole tube is visible, and the halves and spark are hidden. Colour, emissive and intensity equal `l_a2`'s. All 3 targets have `pickOff: true`. Met.
- After `sw_1`:
  - The halves show and the whole tube is hidden. The shadows switch from the whole run's to the halves'.
  - Half 0 is `LIVE_WIRE` with emissive above 0, and half 1 is `DEAD_WIRE` with emissive 0.
  - The spark is within 0.05 of tip 0.
  - The bead is on half 0 at t = 0, 0.3, 0.6 and 0.9.
  - `hitTest` returns `l_b` on each hanging end (between points 4 and 5, which is s ≈ 0.75) and at the gap.

  Met. Which half is live comes from `state.flowFrom`, so "live from the end it enters" comes from the grid, not a guess.
- After the repair: whole and live, the halves and spark hidden, `pickOff` back on, and `mid` hits `l_b`. Met.
- Repaired and dead: `REPAIRED_WIRE` with emissive 0, while `l_a2` stays `DEAD_WIRE`. Met.
- Drift guard on `LINE_REPAIRED`: met.
- `pick.ts` skips `pickOff === true` and reads the flag on every call. Met.

**C3, pure** (`relight3d.test.ts`)
- Import guard: met. `relight3d.ts` imports `../render/city`, `motion` and `relight` by file, and only types from grid and core. All three 2D files are free of DOM and canvas imports.
- Same schedule as 2D:
  - `createRelightClock(...).update(state, 0)` deep-equals `planRelight`. `lampOrder` is `["flood", "shrine"]`. The 1 ms scan matches the `relightCues` times within 1e-3.
  - **One deviation from the AC's text, and the builder is right.** The AC says the shrine ignites at `LEAD + TRAVEL` (2.65 s) and that `duration` is that plus `FLARE_SECONDS`. That premise is false. `planRelight` paces on the farthest reached *node*, and on the won state that is the powered dead junction `j_dead`, reached back through `l_a2`, not the shrine. Because the AC also requires a deep-equal to `planRelight`, the two can't both hold. The test asserts the real figures instead: `j_dead` at `LEAD + TRAVEL`, the shrine between the flood and that, and `duration = shrine's arrival + FLARE_SECONDS`. The 3D view uses 2D's planner unchanged, so it stays in step with the sounds and the splash, which is what the criterion protects. I count it as met in substance; the ticket's numbers need correcting (Could improve 1).
- Clock rules: the same plan object across frames, no re-plan when the state changes mid-Relight, null at `duration`, and a fresh plan after `undefined`. Met.
- `lineFraction`: 0 up to the lead, 1 at `lineEnd`, non-decreasing, and 0 for unpowered lines. Met.
- Drift guard on the four 2D lines: met.

**C3, scene-level** (`live.test.ts` "the Relight (C3)")
- `relT = 0`: all `PointLight`s at 0, no flare, every overlay `drawRange.count` 0, feed body emissive 0. Met.
- Flood's arrival + 0.1: flood light above 0, shrine at 0. The flood flare is visible with opacity `1 - 0.1/FLARE_SECONDS` within 1e-6. A front shows on exactly the runs with `0 < frac < 1`. The overlay ratio follows `frac`. Met.
- `relT = duration`: only the flood and shrine are lit, no flare, and the powered overlays are full while the others are empty. Met.
- Reset and replay: lights go back to 0 after the replan. Met.
- Ordinary place glow: in the brownout the place is at 0 while the bulb is above 0. After `br_street`, the glow goes 0, then 0.4 within 1e-6, then 1, and the bulb is at 5 from t. Met.
- Not in the ticket: an extra monotonic-schedule test, "the lit part only grows; flood before shrine".
- Implementation note: the ticket describes "a live overlay tube per direction (built forward and reversed)". The builder uses one overlay tube. A reversed flow draws the range `[total - count, total)`. `TubeGeometry` orders its indices along the path, so this gives the same result with half the geometry. It is the same in substance.

**Browser**: these are Josh's checks.
- In code: `renderer.ts` passes `overlay.relightT`, and `main.ts` is untouched, so the sounds and the splash still come from `main.ts`'s own `planRelight` on the same frame.
- The Relight can't be interrupted. That stays enforced in `src/play`, which section C doesn't touch.
- Every new geometry and material is freed by `dispose()`, which traverses the scene.
- This resolves section A's Could improve 2 (the visible break).

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are untouched. There is no new dependency, schema change or puzzle change, and no GDD Decided rule is changed. "Readable means current reaches it" is kept: an unpowered damaged cable is drawn exactly like a dead wire, and the break shows only on `state.sparking`.
- The Relight's pace on the Shrine is set by `j_dead`, a dead-end junction that holds no lamp, not by the shrine. This is 2D's own behaviour (`src/render/relight.ts` paces on the farthest reached node, although its comment says "farthest lamp"), and 3D mirrors it faithfully. Josh may notice that the shrine ignites before the clock's 2.65 s mark and that the splash comes sooner than the ticket said. Any change belongs in 2D, in its own ticket.
- Small extras inside `src/render3d/`: the street slab drops from 0.03 to 0.02 thick so the shadows sit on top of it, and `SceneBundle` gains `wires`, `places` and `poles` for the tests. Neither is a problem.
- `look.ts`'s `wireLook` is no longer used by the scene. It is still exported and tested.

## Must fix
none

## Could improve
1. `tickets/037-three-view-spike.md` (for the architect): correct C3's findings and AC. The farthest node on the won Shrine is `j_dead`, not the shrine. The shrine ignites before 2.65 s, and `duration` is the shrine's arrival + 0.6, not 3.25. Record that the single-overlay draw range replaced "a tube per direction".
2. `scene.test.ts`, "brings every wire end within 0.15 of its node's body": `Box3.setFromObject(group)` takes in the lamp's pool, halo and flare ring (radius 1, counted even while invisible). For lamps the check is therefore much looser than "where the wire meets it". Measuring against the post or body mesh's own box would make it bite.
3. `scene.test.ts`, the pole-contrast test, restates the street colour as the literal `0x1a2331`. Exporting `STREET` from `scene.ts` and reading it would keep the test honest if the street colour changes.
4. `look.ts`: drop `wireLook` (and its tests), or note that it is no longer drawn from, so a later reader doesn't take it as the 3D wire rule.
