# 037 · Spike: a Three.js 3D view of the Shrine circuit, power lines on poles along the streets

owner: renderer (with declared lines in `src/main.ts`, see Files)
status: approved (G1, Josh, 12 Nov 2026: "Approve 037"). Section A built, review must-fix 0, playtest regressions 0, not merged. Section B approved (G1, Josh, 12 Nov 2026: "Approve 037 B").
branch: `ticket/037-three-view-spike`

## Josh's words
> "I would like to move to a 3d engine. Where power lines are physical objects between city streets."
> "I would like to use 3js"

## Assumptions (proposed by the main session, not yet confirmed by Josh; strike any that are wrong)
1. **A spike, not a port.** A 3D *view* of the existing map minigame, not the street layer: the camera sits above the town section, tilted. No avatar, no walking, no night clock. The same click to throw and click to repair.
2. **Power lines are visual only.** Poles and sagging wires are strung along the streets between nodes. Wire length, height and path never affect play. No rule, number, payload or puzzle changes; the GDD's Decided rules are untouched.
3. **One map is judged:** `puzzles/09-shrine-circuit.json`. Other maps may open in 3D but nobody checks them.
4. **Beside, not instead.** The 3D view is behind a URL parameter, `?view=3d`. Without it the Canvas 2D renderer runs exactly as on `main`, and nothing in `src/render/` is removed or changed.
5. **Out of scope:** the Relight cascade (the job still completes and the win splash still shows, as now), pulses, sparks' particles, shocks and the fuse-pop, ~~labels and captions~~, the place highlight, zoom and pan polish, the editor, batteries and spring twangs beyond a plain object.
   *Struck 12 Nov 2026 (section B):* Josh played section A next to 2D and could not read the feed's level, the breakers' ON/OFF, the switch, the fuse's level and load, or the lamps' levels. Without captions the spike cannot answer its own question, so captions moved into scope as section B.

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

---

# Section B · Captions and readable objects in the 3D view

owner: renderer
branch: `ticket/037-three-view-spike` (same branch, on top of section A)
status: approved (G1, Josh, 12 Nov 2026: "Approve 037 B")

## Josh's words (12 Nov 2026, after playing section A beside 2D)
> "There aren't enough visual indicators to identify the objects. I can't see what level the powersource is. I cannot see that switches are on or off. I cannot see the level of the fuse or lamps."

He sent the 2D screenshot as the reference. In 2D the Shrine circuit shows:
- the feed: a box with a lightning bolt, captioned `Lv4 Powersource` / `using 3 of 4`;
- each breaker: a bar with `ON`/`OFF` under it, plus the tribe's magenta ribbon mark;
- the switch: a circle with its arm down the selected line;
- the fuse box: captioned `Lv3 Fuse`, with a segmented load bar (red at the limit);
- the lamps: captioned `Lv1 Lamp` / `Lv2 Lamp`, the target with a star and a dashed ring;
- the place name `shrine`;
- arrowheads on live wires.

In 3D he sees unlabelled blue boxes.

## Goal
Josh opens `/?puzzle=09-shrine-circuit&view=3d` and reads, without hovering, what he reads in 2D:
- The feed is a power source at `Lv4 Powersource`, `using 3 of 4`.
- Each breaker says `ON` or `OFF`, and its lever shows the same.
- The switch's lever and a mark on the ground show which line it feeds.
- The fuse box says `Lv3 Fuse`, and its load bar is full and alarmed at 3 of 3.
- Each lamp says its level. The shrine carries a star and its place name. A lit lamp is plainly different from a dark one.

The words are the 2D view's words, from the same helpers. Clicking still hits the object, never the caption.

## In and out (decided here)
- **In: the place name.** It's one string per target lamp, and `footprintLayout` already makes it (`places[].label`, via `placeName` in `src/core/words.ts`). It costs one caption.
- **Out: flow-direction arrowheads.**
  - Section A's travelling bead already leaves the node the current enters from (`state.flowFrom`), so direction reads by motion, not colour.
  - Josh did not name direction as missing.
  - Chevrons on every live span are pulse work, and assumption 5 keeps pulses out.
  - If the bead doesn't read once the captions are in, chevrons are a later ticket (B3).
- **Out:**
  - fuse carrying text: `carryingText` is hover-only in 2D, and hover is unchanged;
  - battery captions;
  - off-screen edge stars (`offscreenMarkers`);
  - checking the multi-feed heading: `createFeedCaptions` gives it free, and nobody checks it on this map.

## Where the words come from (findings)
All caption text is computed by a new pure module, `src/render3d/captions.ts`, from the `Puzzle` and `GridState` only. It imports by file, never through `../render/index`.

| Object | String / value | Helper (file) |
|---|---|---|
| Feed | `Lv4 Powersource`; `using 3 of 4`; alarm `! using 6 of 4 !`; whether it alarms; the multi-feed heading | `createFeedCaptions(puzzle)` with `.update(state)` and `.isOver(k, state)` (`src/render/feedcaps.ts`). It is pure: it imports only `../core`, a `GridState` type and `./labels`. |
| Fuse box | `Lv3 Fuse` (`""` when unrated) | `fuseCaption(rating)` (`src/render/labels.ts`) |
| Fuse bar | fill, colour step 0/1/2, ticks | `fuseFill(load, rating)`, `fuseStep(fill)`, `fuseTickOffsets(rating, width)` (`src/render/fusebar.ts`). The load is `state.fuseLoad.get(id) ?? 0`, as in 2D. |
| Lamp | `Lv1 Lamp` / `Lv2 Lamp` | `lampCaption(n.load ?? 1)` (`src/render/labels.ts`) |
| Target lamp | is a target | 2D's rule: no `target` list, or an empty one, means every lamp; otherwise the lamps the list names. `scene.ts` already has it. |
| Place name | `shrine` | `footprintLayout(...).places[].label` (`src/render/city.ts`, using `placeName` from `src/core/words.ts`). `blockLayout` in `src/render3d/layout.ts` drops it today. Section B carries it through as `PlaceBlock.label: string \| null`. |
| Breaker | `ON` / `OFF` | **No pure helper exports it.** The literal is inline in the Canvas renderer: `c.fillText(closed ? "ON" : "OFF", ...)`, in the breaker case of `src/render/map-renderer.ts`. It isn't in `src/core/words.ts` either. |
| Blown fuse | blown or not | Inline in the Canvas renderer (`readableNode && faultNode === K_FUSE`). 3D derives it from `GridState`: a fault in `state.faults` with `at === id`, `kind === "blown-fuse"`, and its id in `state.readableFaults`. This is `look.ts`'s `readableFaultAt` test plus the kind. |
| Star | the `★` glyph | Inline in the Canvas renderer. 3D draws the star as a **shape** instead: the ten-point outline, filled when lit and hollow when dark (the edge-star rule in `src/render/markers.ts`). No string is needed. |

**ON/OFF with no edit to `src/render/` or `src/core/`.** `captions.ts` exports `BREAKER_ON = "ON"` and `BREAKER_OFF = "OFF"`. A Vitest drift guard reads `src/render/map-renderer.ts` as text and checks that it still contains `closed ? "ON" : "OFF"`, so the two views can't drift apart silently. The clean fix would be `breakerStateText(closed)` in `src/core/words.ts`, imported by both renderers. That edits `src/core/` and `src/render/`, which is outside 037's approved scope, so it isn't done here (B1).

## How captions are drawn (decided here)
**Camera-facing `THREE.Sprite`s with a `CanvasTexture`, all inside `src/render3d/`.**

Why not an HTML layer:
- It needs elements added to the canvas's parent, plus CSS for `pointer-events: none` and the z-order against the HUD panels. That is DOM work that brushes `src/ui/` and `index.html`.
- It has to be re-projected every frame.

Why sprites:
- They always face the camera.
- They live in the scene, which is already disposed.
- They need no new dependency.
- The picker already ignores them, because it only collects objects tagged with `userData.pickKind`.

How:
- **Size and depth.** `sizeAttenuation: false`, so a caption stays the same pixel size at any dolly. `depthTest: false` and a high `renderOrder`, so no building hides a caption.
- **Placement.** Each caption sits above its object. A lamp's caption sits under the lamp head, and the feed's two lines sit above the feed, as in 2D.
- **Text.** Rasterised at `devicePixelRatio`, capped at 2 as the renderer already does. The 2D fonts and colours: 12px body, bold 15px for the feed, `#d3dae6` text, `#7b879a` dim, `#ff5a4d` alarm.
- **Redraws.** A node's texture is redrawn only when its string or step changes, the same rule as `createFeedCaptions.update`. No strings or canvases are made per frame.
- **Text surface.** It is injected: `buildScene(puzzle, opts?: { text?: TextSurfaceFactory })`. In the browser the default makes `document.createElement("canvas")`. Tests pass a stub, so `scene.test.ts` and `pick.test.ts` keep running in Node with no DOM.
- **Fuse bar.** A 3D object, not text: a flat bar of `rating` segments, with ticks from `fuseTickOffsets`. It fills to `fuseFill`, takes its colour from `fuseStep`, and reads by length and ticks first, colour second. A blown fuse shows an empty bar with a visible snap, the caption in alarm, and section A's scorched fuse.

## Object identity (each reads without a caption; defaults, tunable after Josh plays)
- **Feed:** the substation block, plus a lightning-bolt sign facing the camera. It is the largest node.
- **Breaker:** a box on a post. Its lever stands up for ON and lies flat for OFF. Section A has this lever but it is too small: B makes it at least 0.5 units long, light against a dark face. A magenta ribbon tag (2D's tribe mark, `#ff3df0`) sits on the box.
- **Switch:** a round body (a drum, matching 2D's circle, not a box) on a post.
  - Its lever is at least 0.6 units long and points down the selected line.
  - A dim stub points toward the other output, as in 2D.
  - It carries the ribbon tag.
  - A flat ground chevron sits on the first unit of the selected output line. It moves when the switch is thrown.
- **Fuse box:** a box with the fuse cartridge on its face, and the load bar under its caption.
- **Junction:** section A's cross-arm on a pole, with no caption, as in 2D.
- **Lamp:** a head on a post.
  - Lit: a bright head, a halo sprite, the point light and the ground pool.
  - Dark: a dull head, with no halo and no pool.
  - A target lamp adds the star (filled when lit, hollow when dark) and draws section A's ring dashed, as in 2D.

## Acceptance criteria (section B)

**Caption text** (Vitest, `src/render3d/captions.test.ts`; pure, no three, no DOM)

`captionsFor(puzzle).update(state)` fills one record per node id:
- every node: `{ lines: string[], tone: "text" | "dim" | "alarm" }`;
- a fuse box adds `{ fill, step, ticks, blown }`;
- a lamp adds `{ target, lit, place }`;
- a switch adds `{ selectedLine }`.

The Shrine-circuit values below were checked against `createGrid` on 12 Nov 2026.
- [ ] **Start:**
  - `feed` is `["Lv4 Powersource", "using 3 of 4"]`, tone text.
  - `br_main` and `br_street` are `["ON"]`.
  - `fb_A` is `["Lv3 Fuse"]`: fill 1, step 2 (at the limit), 2 ticks, not blown.
  - `street_1..3` and `shrine` are `["Lv1 Lamp"]`; `flood` is `["Lv2 Lamp"]`.
  - `shrine` is target, not lit, place `"shrine"`. The other lamps are not targets and have place null.
  - `sw_1` has no lines and `selectedLine: "l_a"`. Junctions have no lines.
- [ ] **After `sw_1`:** `sw_1` has `selectedLine: "l_b"`. `feed` still says `using 3 of 4`, and `fb_A` is still fill 1, step 2.
- [ ] **Brownout, after `repair:l_b`:** `feed` is `["Lv4 Powersource", "! using 6 of 4 !"]`, tone alarm (via `createFeedCaptions.isOver`). Every lamp is lit.
- [ ] **Won, after `br_street`:**
  - `br_street` is `["OFF"]`, tone dim; `br_main` is still `["ON"]`.
  - `feed` says `using 3 of 4`, tone text.
  - `fb_A` is fill 0, step 0, not blown.
  - `shrine` and `flood` are lit; `street_1..3` are not.
- [ ] **Same words as 2D:** for every puzzle in `puzzles/` (not `locked/`), at its start state, every feed, fuse and lamp line equals what `createFeedCaptions`, `fuseCaption` and `lampCaption` give. The test calls those helpers; it doesn't restate strings.
- [ ] **Blown vs at the limit:** the builder takes a puzzle in `puzzles/` with a `blown-fuse` fault at a fusebox, puts it in a state where that fault is readable, and names the puzzle in the test (for example `07-past-the-fuse`).
  - That box is `blown: true`, fill 0, tone alarm, and still captioned with its `LvN Fuse`.
  - An at-the-limit box is `blown: false`, step 2.
  - The two records differ.
- [ ] **ON/OFF drift guard:** the test reads `src/render/map-renderer.ts` and finds `closed ? "ON" : "OFF"`, and `BREAKER_ON`/`BREAKER_OFF` equal those literals.
- [ ] **Pure:**
  - `captions.ts` imports nothing from `three`, `src/play/` or `../render/index`, and only types from `src/grid/`. The test reads its import lines.
  - The same state twice gives deep-equal records.
  - An unchanged state returns the same string references (no new strings).

**Layout** (Vitest, `src/render3d/layout.test.ts`)
- [ ] `blockLayout(puzzle).places[]` carries `label`, equal to `footprintLayout`'s. On the Shrine circuit, `shrine` is `"shrine"` and the other lamps are null.

**Scene and picking** (Vitest, `scene.test.ts` / `pick.test.ts`, in Node, with a stub text surface)
- [ ] `buildScene(puzzle, { text: stub })` adds one caption sprite per node with lines, plus one for `shrine`'s place name. Each one carries `userData.caption = nodeId` and **no** `pickKind`.
- [ ] **Captions don't swallow clicks:**
  - With captions in the scene, all of section A's picking tests pass unchanged.
  - At the projected centre of every caption sprite, `hitTest` gives the same result with the captions as with them removed, and never a caption id.
- [ ] **Legible at the opening pose** (1280×720, the main session's insets):
  - Every caption's anchor projects inside the free area.
  - Each caption's on-screen text height is at least 12 css px, and at least 15 for the feed. A pure scale helper in `captions.ts` or `scene.ts` computes it from the sprite scale and the viewport.
- [ ] **Breaker shape:** closed, the lever tip is higher than its pivot. Open, it is no higher than pivot + 0.1. The lever is at least 0.5 units long.
- [ ] **Switch shape:** the lever's direction is within 5° of the direction to the selected output's far node, before and after `sw_1`. The ground chevron lies on the selected line's first segment.
- [ ] **Fuse bar:** the fill mesh's x-scale equals `fuseFill` for `fb_A`: 1 at start, 0 after the win.

**Browser** (Josh checks: `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`, beside 2D)
- [ ] Josh checks: without hovering, he can name each object as feed, breaker, switch, fuse box, junction or lamp. None of them is an unlabelled blue box.
- [ ] Josh checks: the feed reads as a power source (the bolt), with `Lv4 Powersource` / `using 3 of 4`. In the brownout it shows `! using 6 of 4 !` in alarm.
- [ ] Josh checks: each breaker shows `ON`/`OFF` and a lever up or flat. Both change when `br_street` is thrown. With DevTools' Rendering panel set to emulate achromatopsia, the state is still clear.
- [ ] Josh checks: `sw_1`'s selected line is readable before and after the throw, from the lever and the ground chevron.
- [ ] Josh checks: the fuse box shows `Lv3 Fuse` and a full, segmented, alarm bar at the start, and an empty bar after the win. On the builder's named map, a blown fuse shows an empty bar with a break and its caption in alarm.
- [ ] Josh checks: every lamp shows `LvN Lamp`. The shrine shows a star and `shrine`. Lit and dark lamps differ by more than colour: halo and pool, or none.
- [ ] Josh checks: at the opening camera every caption faces him, is readable, and doesn't hide another. After a zoom and a pan, the captions stay upright and the same size.
- [ ] Josh checks: clicking a caption over empty ground does nothing, and clicking an object under a caption still acts on the object.
- [ ] Josh checks: switching maps in 3D still frees everything (no stacked contexts), and section A's browser checks still hold.

**Nothing else moves** (the main session checks)
- [ ] `npm run gate` is green, and its test count is section A's plus section B's new tests.
- [ ] `npm run playtest` is green with no snapshot change, and `git diff main -- tests/ src/render/ src/play/ src/ui/ src/grid/ src/core/ puzzles/ index.html` is still empty.

## Files (section B)
- **`src/render3d/` only.**
  - New: `captions.ts` and `captions.test.ts`, and `text.ts` if the builder splits sprite and texture making out of `scene.ts` (`TextSurfaceFactory`, the browser default, the sprite builder).
  - Edited: `scene.ts`, `layout.ts` (`PlaceBlock.label`) and `renderer.ts` (passes the default text surface and the pixel ratio), with their tests.
- **New imports, by file only:** `../render/feedcaps`, `../render/labels` and `../render/fusebar`, plus `../render/city`, which is already imported. Never `../render/index`.
- **No edit** to `src/main.ts` (section A's lines suffice), `package.json`, `src/render/`, `src/core/`, `src/play/`, `src/ui/`, `index.html`, or anything else. If the builder needs one, it stops and asks for a re-cut.

## Interfaces (section B)
- No new `src/core/` types and no schema change. The new types are local to `src/render3d/`: `NodeCaption`, `CaptionSet`, `BREAKER_ON` and `BREAKER_OFF` in `captions.ts`, and `TextSurfaceFactory` in `text.ts`.
- **No new dependency.** `Sprite`, `SpriteMaterial` and `CanvasTexture` are part of `three`, which section A's G1 approved.

## Within approved scope?
**Yes.** Section B touches only `src/render3d/`. It adds no dependency and no new `main.ts` lines. It changes nothing in `src/render/`, `src/core/`, `src/ui/` or `index.html`. The one string with no pure helper (`ON`/`OFF`) is handled inside `src/render3d/`, with a drift guard. Moving it to `src/core/words.ts` would be a scope change, so that is left to Josh as B1.

## Open questions for Josh (section B; the defaults apply if you just approve)
- **B1. ON/OFF words.**
  - **Default:** 3D keeps its own `"ON"`/`"OFF"`, with a test that fails if 2D's change.
  - **The alternative:** a small later ticket moves them into `src/core/words.ts` for both renderers. It touches `src/core/` and `src/render/`, so it needs its own G1.
- **B2. Switch words.** 2D shows none, only the arm.
  - **Default:** none in 3D either, just a longer lever and a ground chevron.
  - If you want words, say which: none exist yet.
- **B3. Flow arrows.**
  - **Default: out.** Section A's travelling bead shows the direction.
  - If it doesn't read once the captions are in, chevrons on live spans are a later ticket.
- **B4. Caption size.**
  - **Default:** a fixed pixel size, as in 2D, at any zoom.
  - **The alternative:** captions that shrink with distance, like real signs. They look more 3D, but they stop being readable when you zoom out.
