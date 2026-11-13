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
