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
