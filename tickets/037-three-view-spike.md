# 037 · Spike: a Three.js 3D view of the Shrine circuit, power lines on poles along the streets

owner: renderer (with declared lines in `src/main.ts`, see Files)
status: approved (G1, Josh, 12 Nov 2026: "Approve 037")
branch: `ticket/037-three-view-spike`

## Josh's words
> "I would like to move to a 3d engine. Where power lines are physical objects between city streets."
> "I would like to use 3js"

## Assumptions (proposed by the main session, not yet confirmed by Josh; strike any that are wrong)
1. **A spike, not a port.** A 3D *view* of the existing map minigame, not the street layer: the camera sits above the town section, tilted. No avatar, no walking, no night clock. The same click to throw and click to repair.
2. **Power lines are visual only.** Poles and sagging wires are strung along the streets between nodes. Wire length, height and path never affect play. No rule, number, payload or puzzle changes; the GDD's Decided rules are untouched.
3. **One map is judged:** `puzzles/09-shrine-circuit.json`. Other maps may open in 3D but nobody checks them.
4. **Beside, not instead.** The 3D view is behind a URL parameter, `?view=3d`. Without it the Canvas 2D renderer runs exactly as on `main`, and nothing in `src/render/` is removed or changed.
5. **Out of scope:** the Relight cascade (the job still completes and the win splash still shows, as now), pulses, sparks' particles, shocks and the fuse-pop, labels and captions, the place highlight, zoom and pan polish, the editor, batteries and spring twangs beyond a plain object.

## Goal
Josh opens `npm run dev` with `?puzzle=09-shrine-circuit&view=3d` and sees the Shrine circuit as a small dark town in 3D, seen from above at a tilt. The ground has streets, and the city's buildings are simple blocks. Wooden poles carry sagging wires along the circuit's streets. The feed, the breakers, the switch and the fuse box are recognisable objects, and the lamps light up when lit. A live wire is clearly different from a dead one, and a brownout makes every lamp flicker. He solves it the same way as in 2D: throw `sw_1`, repair the damaged cable `l_b` by clicking its wire, throw `br_street`. The HUD, prompts, parts, sound and win splash all work as they do now. Then he can judge whether physical power lines between streets are worth a real port.

## What the code already gives (findings)
- **The circuit's lines are the streets.** `circuitStreets(puzzle)` in `src/render/city.ts` makes one street lane per `line` (node `pos` to node `pos`), plus one per `decor` segment. `feedLanes(puzzle)` runs each feed out to the ring road. `footprintLayout(puzzle, mapOrigin(id, puzzleBounds(puzzle)), DEFAULT_SCALE)` gives the lots (`buildings`) and each lamp's place (`places`, keyed by lamp id), all in map units. `cityForMap(...)` gives the city outside the footprint. So poles, wires, streets and building blocks can all be derived from `nodes[].pos` and `lines`, **with no schema change**. These helpers are pure: they import only `src/core`, a type from `src/grid`, and other pure `src/render/` files (`load`, `geometry`, `places`, `labels`).
- **How play gets clicks.** `createMapPlay(puzzle, grid, renderer, bus)` (`src/play/play.ts`) calls only `renderer.hitTest(x, y)`, with x and y in canvas CSS px. That returns a node id or a **line id** (a damaged cable is repaired by clicking its line), or null. `intentFor` in `src/play/prompt.ts` turns the id into a throw or a repair. `attachPan` (`src/play/pan.ts`) uses `MapPanView`. `main.ts` uses `MapRenderer & MapPanView & MapPlaces & MapBlockers`, plus `centreOn` (`MapCentre`) and `notify`. All of these interfaces are already exported from `src/render/index.ts` (`map-renderer.ts`). If the 3D renderer satisfies them, `src/play/` and `src/ui/` stay unchanged. **No `src/core/` change is needed.**
- **The playtest harness depends on the Canvas renderer only through its draw smoke.** `tests/playtest/replay.ts` imports `createMapRenderer` from `src/render`, and `fakes.ts` imports the `MapRenderer` type. Nothing there imports `main.ts`, and nothing will import `src/render3d/`. So if `src/render/` is untouched, `npm run playtest` replays the same 64 traces and draw smokes. **No snapshot may change.**
- **A canvas holds one context.** `index.html` has one `<canvas>`. Once `getContext("2d")` has been called on it, WebGL can't be had from it, and the reverse is also true. So the view is chosen once, at page load, from the URL. In 3D, the 2D renderer is never created on that canvas.

## Acceptance criteria

**Pure layout** (Vitest, in `src/render3d/*.test.ts`, no WebGL, no DOM)
- [ ] **One wire run per line.** `wireLayout(puzzle)` returns one run per `puzzle.lines` entry, keyed by line id and in file order. It doesn't return any for `decor` (the decor stays a street with no wire, or a dead wire tagged with no id; the builder says which). On `09-shrine-circuit` there are 15 runs.
- [ ] **Runs end on their nodes.** A run's first and last attachment points sit at its `from` and `to` node's `pos`, mapped to world `(x, height, z = y)` (map units, y up). Each pole stands on the straight segment between them. No two poles on a run are further apart than `POLE_SPACING`, and a run shorter than that has no intermediate pole.
- [ ] **Wires sag.** Each span between two attachment points is a polyline of `SAG_SEGMENTS + 1` points. Its two ends are exactly the attachment points, its lowest point is at mid-span, and the sag is `SAG_RATIO × span length` below the chord (within 1e-6). No point lies below ground (y > 0).
- [ ] **Deterministic, play-free.** The same puzzle gives deep-equal output twice. The module imports nothing from `src/grid/`, `src/play/` or `three`, and a test checks this by reading the file's import lines.
- [ ] **Building blocks.** `blockLayout(puzzle)` returns the `footprintLayout` buildings and places at `DEFAULT_SCALE`, plus the `cityForMap` lots in a fixed window around the footprint. Each block has a height from `stableHash`, inside `[BLOCK_MIN_H, BLOCK_MAX_H]`, and each place keeps its lamp id. No block's footprint overlaps a wire run's segment (the 2D layout already keeps lots clear of lanes; the test confirms that this holds in 3D).
- [ ] **Looks from state.** `wireLook(state, lineId)` gives `"live" | "dead" | "faulted"`, and `nodeLook(state, nodeId)` gives what is drawn: live/dead, faulted, lamp lit, breaker open/closed, switch output selected. Both come from `GridState` only. Tests cover the Shrine circuit's start state, the state after `sw_1`, after `repair:l_b` (brownout: `lampFlicker` is non-zero for every lamp), and after `br_street` (won: shrine and flood lit, street dark).

**Picking** (Vitest. Three's math, scene graph and `Raycaster` run in Node without a WebGL context, so these tests build the scene and camera with no `WebGLRenderer`.)
- [ ] `createPicker(scene, camera, size)` returns `hitTest(x, y)` in canvas CSS px. On `09-shrine-circuit`, at the opening camera pose and at 1280×720 with the main session's insets, the point each node's object projects to returns that node's id. That covers every breaker, switch, fuse box, junction, feed and lamp.
- [ ] At the projected midpoint of `l_b`'s wire, `hitTest` returns `"l_b"`. A line's pick target is wider than the drawn wire, within `WIRE_PICK_RADIUS` world units.
- [ ] A point on bare ground returns null. So does a point inside a rect given to `setBlockers`, or one off the canvas (as 035 does in 2D).
- [ ] A node's pick target takes priority over a wire passing in front of it. This is the same priority as `hitTestGeometry` in 2D.

**The renderer** (Josh checks these in the browser. They aren't unit-tested: they need WebGL.)
- [ ] `createMapRenderer3d(canvas, puzzle, opts)` in `src/render3d/index.ts` returns `MapRenderer & MapPanView & MapPlaces & MapCentre & MapBlockers & { dispose(): void }`, and type-checks against the existing interfaces unchanged. `notify` is a no-op, and `placeAt` returns null (no place highlight in the spike). Pan and zoom do the simplest thing: `setPan` slides the camera, `zoomStep` dollies it, `resetView`/`fitWhole` frame the footprint inside the insets, and `getScale` returns a px-per-map-unit at the ground's centre. `attachPan`'s keys, drag and wheel must not throw.
- [ ] Josh checks: `npm run dev`, then `/?puzzle=09-shrine-circuit&view=3d`. He sees ground, streets, block buildings, poles, sagging wires, the feed, both breakers, the switch, the fuse box, the junctions and the lamps. The objects read apart without labels. The camera is tilted and the map fits between the HUD panels.
- [ ] Josh checks: live wires look different from dead ones by more than colour (for example, a brighter emissive wire **and** a slow glow that travels or breathes; a dead wire is dull and still), per the GDD's accessibility rule. The damaged cable `l_b` shows a visible break once readable. A lit lamp has a light and a pool on the ground. In the brownout after repairing `l_b`, every lamp flickers.
- [ ] Josh checks: the three-move solution works by clicking objects in 3D. Hovering shows the same prompts as 2D. Clicking the dead junction gives *Needs: wire × 2*. Undo, Reset, the parts readout, sound and the win splash behave as in 2D. After the win, clicks do nothing (the Relight can't be interrupted: play enforces this already, and nothing here changes it).
- [ ] Josh checks: switching maps with the picker while in 3D keeps `view=3d`, doesn't stack WebGL contexts (each session's `dispose()` frees the previous one), and doesn't throw.
- [ ] Josh checks: without `view=3d`, the game is exactly as on `main`, and the browser's network tab shows no `three` chunk loaded (main.ts loads `src/render3d/` with a dynamic `import()`).

**Nothing else moves** (the main session checks)
- [ ] `npm run gate` is green, and its test count is the base's plus this ticket's new tests.
- [ ] `npm run playtest` is green with **no snapshot change**, and `git diff main -- tests/ src/render/ src/play/ src/ui/ src/grid/ src/core/ puzzles/` is empty.

## Files
- **`src/render3d/`** (new, owned by the `renderer` agent): `layout.ts` (pure: wire runs, poles, sag, blocks, heights), `look.ts` (pure: state to look), `pick.ts` (picker over a three scene), `scene.ts` (builds the three scene from the layout), `renderer.ts` and `index.ts` (`createMapRenderer3d`), with their tests. It may **import** the pure helpers from `src/render/` by file (`../render/city`, `../render/geometry`, `../render/motion`), never via `../render/index` (which pulls in the Canvas renderer). It imports the interfaces as types from `../render`. It never edits anything in `src/render/`. If a helper needs a change or a new export, the builder stops and asks for a re-cut.
- **`src/main.ts`, declared lines only** (as in 024 B, 027 C and 035 B): read `view=3d` once from the URL. When it's present, `await import("./render3d")` and build the session's renderer with `createMapRenderer3d` instead of `createMapRenderer`. Keep `view` in `urlFor`. Call `dispose()` in the session's `detach`. Nothing else in `main.ts`.
- **`package.json` / `package-lock.json`**: add `three` to `dependencies` and `@types/three` to `devDependencies` (see Interfaces). Nothing else.
- Out of scope: `src/render/`, `src/play/`, `src/ui/`, `src/grid/`, `src/core/`, `src/audio/`, `puzzles/`, `tests/`, `tools/`, `index.html`, `tsconfig.json`, `vite.config.ts`, the docs.

## Interfaces
- **No new `src/core/` types.** The 3D renderer satisfies the existing `MapRenderer`, `MapPanView`, `MapPlaces`, `MapCentre` and `MapBlockers` from `src/render/map-renderer.ts` (exported by `src/render/index.ts`), and adds `dispose(): void` on its own return type only.
- **No schema change.** Everything comes from `nodes[].pos`, `lines` and the existing city layout. World mapping: map `(x, y)` goes to world `(x, 0, y)`, 1 map unit = 1 world unit, y up.
- **New dependencies, which Josh's G1 must cover explicitly:**
  - `three` (runtime, `dependencies`), at the current release when the ticket is built, caret-pinned. The builder records the exact version in its report. Why: Josh asked for Three.js. It's the WebGL scene, camera, raycaster and materials, and it's only loaded behind `?view=3d`.
  - `@types/three` (`devDependencies`), matching `three`'s minor version. Why: `three` ships no TypeScript types, and the build is TS strict.
- **Docs that conflict, for the main session or Josh to edit (not the builder):**
  - `CLAUDE.md`, "Hard rules", Stack line: "Canvas 2D, no game framework" should allow Three.js for the 3D view (ticket 037).
  - `docs/prototype-brief.md`, "Stack": "Canvas 2D for the map, HTML/CSS for the UI, no game framework" needs the same note. The "Folders and owners" table gets a `src/render3d/` row, owned by `renderer`.
  - `.claude/agents/renderer.md`: its description and "You own" say 2D canvas and `src/render/` only. Add `src/render3d/` (Three.js), and say the same hard rules apply (state and events only, no input, light never by colour alone).

## Open questions for Josh (the defaults apply if you just approve)
1. **Scope.** Do assumptions 1–5 above stand? **Default: yes, a spike of the map view only.** "Move to a 3D engine" could also mean replacing the 2D view, or starting the street layer. Either is a later ticket, after you've played this one.
2. **One owner or two.** The `main.ts` toggle is a few declared lines, which the renderer writes here as `ui` did in 035 B. **Default: one ticket, renderer.** The alternative is splitting the toggle into its own `ui` ticket, built after this one.
3. **Wire height and look.** **Default:** poles 1.2 map units tall, at most 2 units apart, sag 4% of the span. Junctions are a cross-arm on a pole. Breakers and fuse boxes are boxes on posts. The switch is a box with a lever pointing down its selected line. Lamps are street lamps, or a glow in their place's building. The feed is a substation block. All tunable after you play it.
4. **Decided rules.** None are touched. If physical wires suggest a rule (for example, wire length costing wire parts), that is a proposal for the GDD, not part of this ticket.
