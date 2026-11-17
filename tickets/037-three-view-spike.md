# 037 · Spike: a Three.js 3D view of the Shrine circuit, power lines on poles along the streets

owner: renderer (with declared lines in `src/main.ts`, see Files)
status: done. Sections A, B and C approved by Josh (12 Nov 2026: "Approve 037", "Approve 037 B", "Approve 037 C"), each reviewed and playtested (must-fix 0, regressions 0); merged on 17 Nov 2026 together with 039 (Josh: "Merge both").
branch: `ticket/037-three-view-spike`

## Josh's words
> "I would like to move to a 3d engine. Where power lines are physical objects between city streets."
> "I would like to use 3js"

## Assumptions (proposed by the main session, not yet confirmed by Josh; strike any that are wrong)
1. **A spike, not a port.** A 3D *view* of the existing map minigame, not the street layer: the camera sits above the town section, tilted. No avatar, no walking, no night clock. The same click to throw and click to repair.
2. **Power lines are visual only.** Poles and sagging wires are strung along the streets between nodes. Wire length, height and path never affect play. No rule, number, payload or puzzle changes; the GDD's Decided rules are untouched.
3. **One map is judged:** `puzzles/09-shrine-circuit.json`. Other maps may open in 3D but nobody checks them.
4. **Beside, not instead.** The 3D view is behind a URL parameter, `?view=3d`. Without it the Canvas 2D renderer runs exactly as on `main`, and nothing in `src/render/` is removed or changed.
5. **Out of scope:** ~~the Relight cascade (the job still completes and the win splash still shows, as now)~~, pulses, sparks' particles, shocks and the fuse-pop, ~~labels and captions~~, the place highlight, zoom and pan polish, the editor, batteries and spring twangs beyond a plain object.
   *Struck 12 Nov 2026 (section B):* Josh played section A next to 2D and could not read the feed's level, the breakers' ON/OFF, the switch, the fuse's level and load, or the lamps' levels. Without captions the spike cannot answer its own question, so captions moved into scope as section B.
   *Struck 12 Nov 2026 (section C):* the Relight cascade. Josh played section B and said "the animation to light the lamps [is] absent". The win is the moment the map minigame pays off, and the 3D view can't be judged against 2D without it, so it moved into scope as C3.
   *Kept out (section C):* sparks' particles. C2 needs a visible break with section A's single spark at the gap, not 2D's spark streaks. Wires and poles (C1) and the cable's break (C2) were never in this list: both were already in scope from section A, so C1 and C2 fix how they read. Neither is a new feature.

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
- [ ] `createMapRenderer3d(canvas, puzzle, opts)` in `src/render3d/index.ts` returns `MapRenderer & MapPanView & MapPlaces & MapCentre & MapBlockers & { dispose(): void }`, and type-checks against the existing interfaces unchanged. `notify` is a no-op, and `placeAt` returns null (no place highlight in the spike). Pan and zoom do the simplest thing: `setPan` slides the camera, `zoomStep` dollies it, ~~`resetView`/`fitWhole` frame the footprint inside the insets~~ `resetView` frames the circuit (`puzzleBounds` + 1) to about 80% of the free area and only `fitWhole` frames the whole footprint inside the insets (changed in section B, see "Design changes recorded" under section B), and `getScale` returns a px-per-map-unit at the ground's centre. `attachPan`'s keys, drag and wheel must not throw.
- [ ] Josh checks: `npm run dev`, then `/?puzzle=09-shrine-circuit&view=3d`. He sees ground, streets, block buildings, poles, sagging wires, the feed, both breakers, the switch, the fuse box, the junctions and the lamps. The objects read apart without labels. The camera is tilted and the map fits between the HUD panels.
- [ ] Josh checks: live wires look different from dead ones by more than colour (for example, a brighter emissive wire **and** a slow glow that travels or breathes; a dead wire is dull and still), per the GDD's accessibility rule. The damaged cable `l_b` shows a visible break once readable (not met by sections A and B; made concrete as C2). A lit lamp has a light and a pool on the ground. In the brownout after repairing `l_b`, every lamp flickers.
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
- **Placement.** Each caption sits above its object. ~~A lamp's caption sits under the lamp head~~ A lamp's caption sits beside the lamp, on the side away from its wire (built that way; see "Design changes recorded"). The feed's two lines sit above the feed, as in 2D.
- **Text.** Rasterised at `devicePixelRatio`, capped at 2 as the renderer already does. The 2D fonts and colours: 12px body, bold 15px for the feed, `#d3dae6` text, `#7b879a` dim, `#ff5a4d` alarm.
- **Redraws.** A node's texture is redrawn only when its string or step changes, the same rule as `createFeedCaptions.update`. No strings or canvases are made per frame.
- **Text surface.** It is injected: `buildScene(puzzle, opts?: { text?: TextSurfaceFactory })`. In the browser the default makes `document.createElement("canvas")`. Tests pass a stub, so `scene.test.ts` and `pick.test.ts` keep running in Node with no DOM.
- **Fuse bar.** ~~A 3D object, not text~~ A fixed-pixel-size, camera-facing sprite under the caption, like the captions (built that way; see "Design changes recorded"): a flat bar of `rating` segments, with ticks from `fuseTickOffsets`. It fills to `fuseFill`, takes its colour from `fuseStep`, and reads by length and ticks first, colour second. A blown fuse shows an empty bar with a visible snap, the caption in alarm, and section A's scorched fuse.

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
- [ ] **Fuse bar:** ~~the fill mesh's x-scale equals~~ the fill the bar sprite was last drawn with (`userData.fill`) equals `fuseFill` for `fb_A`: 1 at start, 0 after the win.

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

## Design changes recorded (section B, at the reviewer's request)
The builder made these while fixing section B after Josh played it. The review (`reviews/037-three-view-spike.md`, Could improve 1 and 2) asked for them to be written down. They are recorded here, and the criteria above are corrected to match. None of them touches a rule.
1. **The fuse bar is a fixed-size, camera-facing sprite**, drawn like a caption (`sizeAttenuation: false`) under the fuse box's caption. It is not a 3D mesh. The criterion is now "the fill the bar was last drawn with (`userData.fill`) equals `fuseFill`".
2. **Lamp captions sit beside the lamp**, `LAMP_CAPTION_OFFSET` (1.0) units out on the side away from its wire, at the lamp head's height. They are not under the head.
3. **The opening camera frames the circuit tighter.** `resetView` (the opening pose) frames `puzzleBounds` grown by 1 unit to about 80% of the free area's limiting dimension. Only `fitWhole` frames the whole footprint inside the insets. Section A's criterion "`resetView`/`fitWhole` frame the footprint" now holds for `fitWhole` only. Josh should know that the opening frame he judged in section A has changed.

---

# Section C · Wires in the air, a visible break, and the Relight in 3D

owner: renderer
branch: `ticket/037-three-view-spike` (same branch, on top of section B)
status: approved (G1, Josh, 12 Nov 2026: "Approve 037 C")

## Josh's words (12 Nov 2026, after playing section B)
The main session told him two things it knew were weak:
- "Wires and poles: the wires sit low, so they read more like strips on the ground than strung cables."
- "The damaged cable: it shows as an unbroken orange wire with a spark, not a visible break."

Josh replied:
> "both are on my list, in addition, the animation to light the lamps absent."

## Goal
Josh opens `/?puzzle=09-shrine-circuit&view=3d`.
- At the opening camera, the wires hang in the air above the streets on distinct wooden poles with cross-arms. Each has a shadow on the street below and a visible sag.
- Once `sw_1` is thrown, the damaged cable `l_b` is plainly cut. Two ends hang from the poles either side, with a gap and a spark between them. The side toward the switch is live and the far side is dead. After the repair it is one whole wire again.
- When he throws `br_street` and wins, the 3D view plays 2D's Relight. Power runs out from the feed along the wires, and the flood lamp, then the shrine, ignite in turn with a flare. The ignition sounds and the win splash land on the same beats as in 2D.

## C1 · Wires and poles read as strung power lines

### What the code does now (findings, read 12 Nov 2026)
| What | Now | Where |
|---|---|---|
| Pole height (every attachment point, node ends included) | `POLE_HEIGHT = 1.2` | `layout.ts` |
| Pole spacing | `POLE_SPACING = 2`. On the Shrine circuit, 9 intermediate poles. Most 2-unit runs have none: the node posts carry them. | `layout.ts` |
| Sag | `SAG_RATIO = 0.04`. A 2-unit span sags 0.08 units, about 3 px at the opening pose. | `layout.ts` |
| Pole | `CylinderGeometry(0.045, 0.06, POLE_HEIGHT)`, colour `WOOD 0x3b3128`. That is dark brown on ground `0x0e131d` and street `0x1a2331`, so it nearly vanishes. | `scene.ts` |
| Cross-arm | `BoxGeometry(0.3, 0.05, 0.06)` at `POLE_HEIGHT - 0.04`. It is always along world x and **not turned to its run**, so on an east-west run it lies along the wire and reads as nothing. | `scene.ts` |
| Wire | `TubeGeometry` with radius 0.035 and 5 radial segments | `scene.ts` |
| Shadow | none (no shadow map and no fake shadow), so nothing on the ground shows the wire's height | `scene.ts` |
| Camera | `ELEVATION` 55°, `FOV_DEG` 40. The opening scale is roughly 50 px per map unit at 1280×720 with insets 120/90. | `camera.ts` |
| Buildings | `BLOCK_MIN_H` 0.6 to `BLOCK_MAX_H` 2.6, places 1.2 to 2.6. That is taller than the wires, so blocks south of a street can hide its wire. | `layout.ts` |
| Node bodies | breaker, fuse box and battery box centres at y 0.95; switch drum at 0.95, lever pivot 1.2; pick boxes centred at y 1.0, 0.6×0.7×0.6 | `scene.ts` |

Why it reads as strips: the wire is thin and casts nothing, and the pole that would show its height is too dark to see. The sag is a few pixels. At 55° a north-south wire projects straight onto its own street.

### What changes (defaults; tunable after Josh plays)
- **Height.** `POLE_HEIGHT` 1.2 → **1.6**. Every attachment point stays at `POLE_HEIGHT`, node ends included, so section A's "runs end on their nodes" still holds.
- **Sag.** `SAG_RATIO` 0.04 → **0.12**. A 2-unit span sags 0.24 units, and its lowest point stays at 1.36, above ground. `POLE_SPACING` stays 2, so section A's pole tests and the 15 runs are unchanged.
- **Poles.**
  - The cylinder goes to **0.07 top / 0.09 base** radius.
  - It takes a new colour, `POLE_WOOD = 0x8b6b4a` (weathered wood). Its luminance contrast against `STREET` is at least 3:1 (about 3.2), so it reads by brightness, not hue.
  - A dark foot disc (radius 0.15) goes on the ground at each pole and node post.
- **Cross-arms.**
  - `0.7 × 0.08 × 0.08`, at `POLE_HEIGHT - 0.08`.
  - Each is **turned perpendicular to its run**: the instance matrix includes the run's yaw.
  - The wire passes over its centre.
- **Wire.** Tube radius 0.035 → **0.05**, with 6 radial segments.
- **Shadow.** One flat strip on the ground under each run, a pure function of the run's points:
  - `shadowOf(points)` gives the same x and z with y = `SHADOW_Y` (0.025).
  - It is 0.1 wide, black at opacity 0.55, `depthWrite: false`, with no pick tag.
  - A broken cable's two halves (C2) each get their own shadow.
  - The gap between the wire and its shadow is what shows the height.
- **Camera tilt: lowered**, `ELEVATION` 55° → **45°**. At 45°, a height h projects at about cos 45° (0.71) of h, against 0.57 now. With the higher poles, a mid-span wire sits about 55–60 px above its shadow at the opening pose, against about 34 px now. Ground depth compresses less than it would at 40° or below. The fit search (`fitTo`) is unchanged, so the opening frame still fills about 80%.
- **Buildings below the wires.**
  - `"building"` blocks inside the footprint take heights in `[BLOCK_MIN_H, FOOTPRINT_MAX_H = 1.4]`.
  - Place boxes take heights in `[1.0, PLACE_MAX_H = 1.8]`.
  - City lots outside the footprint keep `[BLOCK_MIN_H, BLOCK_MAX_H]`.
  - Section A's "heights within range" criterion still holds.
- **Nodes meet their wires at the new height.**
  - Breaker, fuse box and battery box centres move to `NODE_BODY_Y = POLE_HEIGHT - 0.3` (1.3), so the wire meets the top of the box.
  - The switch drum centre moves to `POLE_HEIGHT - 0.25`, with the lever pivot at `POLE_HEIGHT`.
  - The lamp head stays at `POLE_HEIGHT + 0.05`, and the junction arm stays at `POLE_HEIGHT - 0.04`. Both are already relative.
  - The feed's two roof bushings grow to reach `POLE_HEIGHT`.
  - Caption heights become relative to `POLE_HEIGHT`: feed `POLE_HEIGHT + 0.15`, `FUSE_CAPTION_Y = POLE_HEIGHT + 0.4`, `LAMP_HEAD_Y = POLE_HEIGHT + 0.1`. The breaker's caption already follows its body. A later height change then moves them all together.
- **Pick boxes follow.** Each node's pick box is centred at `NODE_BODY_Y` and is 0.6×0.9×0.6, so it covers the body and the wire's attachment point. The node-over-wire priority is unchanged.

### Acceptance criteria (C1)
**Layout** (Vitest, `layout.test.ts`)
- [ ] `POLE_HEIGHT >= 1.6`, and every run's first and last attachment points sit at `POLE_HEIGHT` (section A's test, run with the new constant).
- [ ] Sag: section A's sag test passes with `SAG_RATIO = 0.12`. `l_feed`'s single 2-unit span sags 0.24 ± 1e-6 below its chord, and no point lies below `POLE_HEIGHT - 0.3`.
- [ ] `shadowOf(runPoints(run))` has the run's points with y = `SHADOW_Y` and x and z unchanged, for every run.
- [ ] Every footprint `"building"` block is at most `FOOTPRINT_MAX_H`, which is less than `POLE_HEIGHT`. Every place box is at most `PLACE_MAX_H`. City lots stay within `[BLOCK_MIN_H, BLOCK_MAX_H]`.

**Scene and camera** (Vitest, `scene.test.ts`, Node, stub text surface, opening pose 1280×720 with insets top 120 and bottom 90)
- [ ] **Poles are objects.**
  - The pole and cross-arm instance counts equal the number of intermediate attachment points (9 on the Shrine circuit).
  - Each cross-arm's long axis is within 5° of perpendicular to its run in the ground plane, and is at least 0.6 long.
  - The pole material's colour has luminance contrast of at least 3:1 against `STREET` (WCAG relative luminance, computed in the test).
- [ ] **The wire is in the air.**
  - For every run, the projected screen distance between the run's `mid` and its shadow's mid is at least 30 px.
  - For `l_feed`, the projected distance between the chord's midpoint and the sagging midpoint is at least 6 px.
  - The wire tube's radius is at least 0.05.
- [ ] **Nothing hides a wire.** At the opening pose, a ray from the camera to each run's `mid`, and to each node's attachment point, meets no block (instanced or place mesh) before it.
- [ ] **Nodes still meet their wires.** Every run's end attachment point is within 0.15 of its node's group's world bounding box.
- [ ] **Camera tests, updated deliberately.**
  - `ELEVATION` is 45°.
  - The opening-frame test (`scene.test.ts`, "opens with the circuit filling about 80%...") projects its corners at y 0 and `POLE_HEIGHT`, not the literal `1.2`. It keeps its 0.72–0.85 bounds and the inset checks.
  - The `fitWhole` half is unchanged.
- [ ] **Caption tests still pass.**
  - The legibility test is unchanged.
  - The overlap test ("no two captions or fuse bars overlap, and none covers a node") probes each node at `NODE_BODY_Y` and `POLE_HEIGHT`, not the literals `1.0` and `1.3`. That edit is deliberate, because the objects moved. Its overlap assertions are unchanged and must pass.
- [ ] **Picking still works.** `pick.test.ts` passes unchanged: every node at its projected pick box, every wire at its `mid`, null on bare ground, blockers, and node-over-wire priority.

**Browser** (Josh checks)
- [ ] At the opening camera, each wire reads as a cable strung in the air above its street. Its shadow on the street and the gap between them are visible. The sag shows. Poles are distinct wooden posts with cross-arms across the line.
- [ ] Breakers, the fuse box, the switch, the lamps and the feed sit where their wires meet them. Clicking each still acts on it, and the three-move solution still works.
- [ ] No building hides a wire or a node at the opening camera. After a zoom and pan, the picture still holds together.

## C2 · The damaged cable shows a visible break

### The 2D rule (findings)
In 2D (`drawLine`, `src/render/map-renderer.ts`), a damaged cable draws current only from the end it enters up to mid-line, and the break shows only while `state.sparking.has(id)`. In the grid (`src/grid/grid.ts`), `sparking` is exactly "a `damaged-cable` fault on a powered line". `readableFaults` is "the fault's `at` is powered". So **a dead damaged cable is unreadable, and it looks like any other dead cable**: the plain dull stroke, with no gap, no spark and no mark. Once repaired, a line that had a fault in the file and has none now draws its base in `LINE_REPAIRED = "#5a6f92"` instead of `LINE_DEAD = "#2a3445"`. That is the "new cable" look, and it shows wherever the line isn't live.

### What changes
- **Pure geometry** (`layout.ts`):
  - `WireRun` gains `brk: WireBreak | null`. It is set for every line that has a `damaged-cable` fault in `puzzle.faults`, and is null otherwise. The layout stays play-free: it reads the file's faults, not the state.
  - **The broken span** is the span that contains the run's midpoint by length. When the midpoint falls on a pole (an even span count), it is span `n / 2`. `l_b` has 3 spans, so the break is in span 1, between the poles at (7, −1) and (8, −2).
  - **The two hanging ends.** Each leaves the attachment point on its side of the broken span (`attach[span]` and `attach[span + 1]`), heading toward the gap.
    - Each has `HANG_SEGMENTS + 1` points (`HANG_SEGMENTS = 6`).
    - Its horizontal position is linear in s (0..1) along the chord, up to `spanLen_h / 2 - BREAK_GAP / 2`.
    - Its height is `y(s) = attach.y - HANG_DROP × s²`, so it leaves level and droops.
    - `BREAK_GAP = 0.3` and `HANG_DROP = 0.6`. The tips sit at `POLE_HEIGHT - 0.6` (1.0), above ground.
    - On a 1-span run, the ends hang from the two nodes' own attachment points.
  - `halves: [Vec3[], Vec3[]]`. Half 0 runs from the `from` node along the whole spans to its tip. Half 1 runs from the `to` node to its tip. Each half's last point is its hanging end's tip.
  - `gap`: the broken span's chord midpoint in x and z, at the tips' height.
- **Scene** (`scene.ts`):
  - A run with `brk` builds a whole tube plus one tube per half, and a shadow for each.
  - **While `state.sparking.has(id)`:**
    - The halves show and the whole tube hides.
    - The half that starts at `state.flowFrom.get(id)` takes the live look (section A's breathing emissive). Its bead runs from that node to its tip only.
    - The other half takes the dead look.
    - Section A's spark sits at the live half's tip, inside the gap.
    - The whole-wire orange `FAULT_GLOW` is gone, as in 2D: live up to the break, dead beyond.
  - **Otherwise:**
    - The whole tube shows, with the halves and the spark hidden.
    - An unpowered damaged cable is plain dead: `DEAD_WIRE`, emissive 0, no spark. It looks exactly like any other dead wire, matching 2D's rule that a fault past a fault can't be read.
    - Once repaired, a whole wire that isn't live takes `REPAIRED_WIRE = 0x5a6f92` (2D's `LINE_REPAIRED`). A live one takes the live look.
- **Picking** (`pick.ts`, `scene.ts`):
  - The whole run's pick line stays on at all times. It already spans the gap along the chord.
  - A broken run adds one pick line along each hanging end, plus one invisible gap box. The box is `BREAK_GAP + 0.2` wide and 0.3 deep, from the tips' height up to the chord.
  - All three are tagged `pickKind: "wire"` with the line id.
  - They carry `userData.pickOff = true` except while the break shows. `createPicker` skips any object with `pickOff === true`, read at each `hitTest`, because the picker collects its targets once.
  - So clicking either hanging end or the gap returns the line id, and `intentFor` turns it into the repair as now.

### Acceptance criteria (C2)
**Layout** (Vitest, `layout.test.ts`)
- [ ] Only `l_b` has a `brk` on the Shrine circuit. Every other run's `brk` is null.
- [ ] `l_b`:
  - `brk.span` is 1.
  - `ends[0][0]` equals `attach[1]` and `ends[1][0]` equals `attach[2]`.
  - Each end has `HANG_SEGMENTS + 1` points, and their heights never increase along the end.
  - Each tip's y is `POLE_HEIGHT - HANG_DROP`, and is greater than 0.
  - The horizontal distance between the tips is `BREAK_GAP` (within 1e-6).
  - `gap` is the midpoint of `attach[1]` and `attach[2]` in x and z.
- [ ] `halves[0]` starts at `attach[0]` (`sw_1`) and ends at tip 0. `halves[1]` starts at `attach[3]` (`j4`) and ends at tip 1. Neither crosses the gap: every point of half 0 is on `sw_1`'s side of the gap's perpendicular plane, and every point of half 1 on `j4`'s side.
- [ ] Synthetic puzzles in the test give the other cases:
  - a 2-span run breaks in span 1;
  - a 1-span run hangs its ends from the two nodes' own attachment points.

**Scene and picking** (Vitest, `live.test.ts` through `bundle.update`, and `pick.test.ts`, at the opening pose)
- [ ] **Start** (`l_b` unpowered):
  - `l_b`'s whole tube is visible, and its halves and spark are hidden.
  - Its material colour and emissive equal `l_a2`'s, another dead wire.
  - Its hanging-end and gap targets carry `pickOff: true`.
- [ ] **After `sw_1`** (`l_b` sparking):
  - The halves are visible and the whole tube is hidden.
  - Half 0 (`sw_1`'s side) has `LIVE_WIRE` and emissive above 0. Half 1 has `DEAD_WIRE` and emissive 0.
  - The spark is visible, within 0.05 of tip 0.
  - At t = 0, 0.3, 0.6 and 0.9, the bead lies on half 0.
  - `hitTest` at the projected point s = 0.75 along each hanging end, and at the projected `gap`, returns `"l_b"`.
- [ ] **After `repair:l_b`:**
  - The whole tube is visible with the live look, and the halves and spark are hidden.
  - The targets have `pickOff: true` again.
  - `hitTest` at `l_b`'s `mid` returns `"l_b"`.
- [ ] **Repaired and dead:** after `repair:l_b`, throw `sw_1` back to `l_a`. `l_b` is whole with colour `REPAIRED_WIRE` and emissive 0, while `l_a2` stays `DEAD_WIRE`.
- [ ] **Drift guard:** the test reads `src/render/map-renderer.ts` and finds `const LINE_REPAIRED = "#5a6f92";`. `REPAIRED_WIRE` equals that colour.

**Browser** (Josh checks)
- [ ] At the start, `l_b` looks like any dead wire.
- [ ] After `sw_1`, `l_b` shows two ends hanging from the poles either side of a gap, with a spark at the gap. The `sw_1` side is live and the `j4` side is dead.
- [ ] Clicking either hanging end, or the gap, repairs it (with the parts). Hovering either end or the gap shows the same prompt as 2D.
- [ ] After the repair it is one whole live wire.

## C3 · The animation that lights the lamps

### What 2D has (findings)
**The Relight cascade, on the win.**
- **The clock.** `src/play` sets `view.relightT` to 0 when the job completes and advances it with `tick(dt)`. `main.ts` passes it to `renderer.draw` as `overlay.relightT`. The renderer doesn't listen for `job:completed`: the clock reaches it through the overlay.
- **The plan.** On the first frame with `relightT` defined, `draw` calls `planRelight(puzzle, state)` (`src/render/relight.ts`) and keeps that plan until `relightT` is undefined again (a reset). The plan is used only while `relightT < plan.duration`.
  - Distances run from every feed along powered lines, in the direction of `flowFrom`.
  - The farthest reached node is placed at `RELIGHT_TRAVEL_SECONDS` (2.4).
  - Everything is offset by `RELIGHT_LEAD_SECONDS` (0.25).
  - `duration` is the last lit lamp's arrival plus `FLARE_SECONDS` (0.6).
- **Lines.** Each powered line lights from its flow-from end. The lit fraction is `frac = e > s ? clamp01((relT - s) / (e - s)) : relT >= e ? 1 : 0`, where s and e are `lineStart[i]` and `lineEnd[i]`. A warm head (two discs) rides the front while `frac < 1`. Pulses run only inside the lit part.
- **Nodes.** A node looks live only once `relT >= nodeArrive[i]`.
- **Lamps.**
  - A lamp is dark until `state.lit.has(id) && relT >= arrive`. Then it snaps fully lit (no brownout is possible on a win).
  - It **flares** for `FLARE_SECONDS`: a hot ring grows outward with alpha `1 - f`, and a hot core shrinks with alpha `(1 - f) × 0.5`, where `f = flareAge / FLARE_SECONDS`.
- **Places.** `drawCity` eases each place's glow toward `glowTarget(lamp, state, { t: relT, arriveAt })`. That is 0 until the lamp's arrival. It is eased by `easeGlow` over `GLOW_EASE_SECONDS` (0.25) (`src/render/city.ts`).
- **Sound and splash.**
  - `main.ts` computes the sound cues from the same `planRelight(puzzle, state)` on the same frame (`relightCues`): `igniteAt` is `plan.lampOrder` mapped to `nodeArrive`. It passes them to `audio.relight(igniteAt, duration)`.
  - The win splash waits for `splashDue(relightT, duration)`.
  - So a view that plans from the same function, the same state and the same `relightT` stays in step with both, with no new wiring.

On the Shrine circuit's win (`sw_1`, `repair:l_b`, `br_street`), the lamp order is `flood` then `shrine`. The shrine is the farthest node (path 16.49 units), so it ignites at `RELIGHT_LEAD_SECONDS + RELIGHT_TRAVEL_SECONDS` = 2.65 s. The flood lamp ignites at about 2.24 s, and `duration` is 3.25 s.

**In ordinary play (no Relight):**
- A lamp's bulb, pool and caption **snap** on and off with `state.lit`. In a brownout the bulb flickers (`flicker` in `src/render/motion.ts`). The 3D view already does this.
- A lamp's **place glow eases** over `GLOW_EASE_SECONDS` toward `glowTarget(..., null)`. That target is **0 during a brownout**: the place goes dark while the bulb flickers. The 3D view currently flickers the place with the bulb (`placeMat.emissiveIntensity = 0.5 * b`). C3 changes it to 2D's rule.
- 2D has no ignition flare outside the Relight. The flare on the lamp that blew a fuse is part of the shock, which stays out of scope.
- `src/core/timing.ts` holds only `BLOW_TIMING`, the blown-fuse sequence. It isn't used here.

### What changes
- **New pure module `src/render3d/relight3d.ts`** (no three, no DOM). It imports by file only:
  - `planRelight`, `FLARE_SECONDS` and the `RelightPlan` type from `../render/relight`;
  - `clamp01` from `../render/motion`;
  - `glowTarget`, `easeGlow` and `GLOW_EASE_SECONDS` from `../render/city`.

  It exports:
  - `createRelightClock(puzzle).update(state, relT): RelightPlan | null`. It plans on the first defined `relT` and keeps that same plan object until `relT` is undefined, then drops it. It returns the plan while `relT < duration`, and null otherwise. This is 2D's caching rule.
  - `lineFraction(plan, lineIndex, relT)`: 2D's formula.
  - `nodeArrived(plan, nodeIndex, relT)`.
  - `lampIgnition(plan, state, lampId, nodeIndex, relT): { on: boolean; flareAge: number }`. `flareAge` is −1 when there is no flare.
- **`SceneBundle.update(state, hover, t, relightT?: number)`.** `renderer.draw` passes `overlay.relightT`. While the clock returns a plan:
  - **Wires.** Each powered run lights from its flow-from end to `lineFraction` and is dead beyond.
    - This is done with a live overlay tube per direction (built forward and reversed), with `geometry.setDrawRange` set to that fraction of its index count.
    - A warm front bead sits at the front of each run with `0 < frac < 1`.
    - Section A's travelling bead runs only inside the lit part.
  - **Nodes.** A node's live glow waits for `nodeArrived`.
  - **Lamps.**
    - A lamp stays dark (light, head, halo and pool off) until `lampIgnition.on`, then snaps lit.
    - While `0 <= flareAge < FLARE_SECONDS` it flares: a ground ring grows from radius 0.3 to 1.5 with opacity `1 - f`, and the halo is scaled by `1 + (1 - f)`.
    - `parts.get(lampId).flare` exposes the ring.
  - **Places.** Each place's glow eases by `easeGlow` toward `glowTarget(lamp, state, { t: relT, arriveAt })`.
  - When the plan ends, the view is the ordinary one.
- **Ordinary play.** A place's glow eases toward `glowTarget(lamp, state, null)` over `GLOW_EASE_SECONDS`, snapping on the first frame. So it is 0 in a brownout, as in 2D. The bulb's snap and flicker are unchanged.
- **`notify` stays a no-op.** 2D's `notify` carries only `fuse:blown` (the shock and pop) and `switch:thrown` with `spring` (the twang), and both are still out of scope. The Relight reaches the renderer through `overlay.relightT`, as in 2D.
- **`main.ts`: no change.** It already passes `overlay.relightT` to whichever renderer the session has. It already plans the sound cues and the splash from `planRelight` on the frame the Relight starts.
- **The Relight can't be interrupted** (GDD Decided rule). `src/play` enforces it by ignoring input during the Relight. The 3D view only draws from `relightT`, and nothing in section C touches `src/play`, `main.ts` or the clock.

### Acceptance criteria (C3)
**Pure** (Vitest, new `src/render3d/relight3d.test.ts`)
- [ ] **Import guard.** `relight3d.ts` imports nothing from `three`, `src/play/` or `../render/index`, and only types from `src/grid/`. The test reads its import lines.
- [ ] **Same schedule as 2D.** On the Shrine circuit's won state:
  - `createRelightClock(shrine).update(state, 0)` deep-equals `planRelight(shrine, state)`.
  - `lampOrder` is `["flood", "shrine"]`.
  - The ignition times computed main.ts's way (`lampOrder` mapped to `nodeArrive`, as in `relightCues`) equal the first `relT` at which `lampIgnition(...).on` turns true for each lamp. The test scans in 1 ms steps, so they match within 1e-3.
  - The shrine ignites at `RELIGHT_LEAD_SECONDS + RELIGHT_TRAVEL_SECONDS` (within 1e-9).
  - `duration` equals that plus `FLARE_SECONDS`.
- [ ] **Clock rules.**
  - The clock returns the same plan object on every frame of one Relight. It returns null at `relT = duration`.
  - After an `update(state, undefined)` it plans again. Changing the state mid-Relight doesn't re-plan.
- [ ] `lineFraction` for `l_feed` is 0 at `relT <= RELIGHT_LEAD_SECONDS`, 1 at its `lineEnd`, and non-decreasing between. A run that isn't powered stays at 0.
- [ ] **Drift guard.** The test reads `src/render/map-renderer.ts` and finds each of these 2D lines verbatim:
  - `frac = e > s ? clamp01((relT - s) / (e - s)) : relT >= e ? 1 : 0;`
  - `if (state.lit.has(id) && relT >= arrive) {`
  - `if (relT < plan.duration) rp = plan;`
  - `if (!plan) plan = planRelight(puzzle, state);`

**Scene-level** (Vitest, `live.test.ts`, through `bundle.update`, won Shrine state)
- [ ] **`relT = 0`:**
  - Every `PointLight` has intensity 0.
  - No flare is visible.
  - Every live overlay's draw range is 0.
  - The feed's body emissive is 0.
- [ ] **`relT` = flood's arrival + 0.1:**
  - The flood's light is above 0, and the shrine's is 0.
  - The flood's flare is visible, with opacity `1 - 0.1 / FLARE_SECONDS` (within 1e-6).
  - A front bead is visible on exactly the runs with `0 < lineFraction < 1`.
- [ ] **`relT = duration`:**
  - The flood and shrine lights are above 0, and every other light is 0.
  - No flare is visible.
  - Every powered run's overlay is full.
- [ ] **Reset and replay.** `relT` undefined, then a reset and the win again, then `relT = 0`: all lights are 0 again. The plan was replanned.
- [ ] **Ordinary place glow.**
  - In the brownout (after `sw_1` and `repair:l_b`), the shrine place's emissive is 0 while its bulb's light is above 0.
  - Throw `br_street` at t. Then update at t, t + 0.1 and t + 0.3 with no `relT`: the shrine place's glow is 0, then 0.4 (within 1e-6, which is 0.1 / `GLOW_EASE_SECONDS`), then 1.
  - The bulb's light is full from t.

**Browser** (Josh checks, `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`, then beside 2D)
- [ ] After `br_street`, the lamps go dark for a beat. Then a warm front runs out from the feed along each powered wire, lighting it behind itself. The flood lamp ignites with a flare, then the shrine with its own. This matches 2D's Relight order and pace.
- [ ] The ignition sounds land on each flare, and the win splash appears after the shrine's flare ends, as in 2D.
- [ ] Clicks and keys during the Relight do nothing (the Relight can't be interrupted). Reset afterwards, then win again: the Relight plays again.
- [ ] In the brownout, the bulbs flicker and their places go dark, as in 2D. When a lamp lights in ordinary play, its place warms over a quarter-second.

## Nothing else moves (section C; the main session checks)
- [ ] `npm run gate` is green, and its test count is section B's plus section C's new tests.
- [ ] `npm run playtest` is green with **no snapshot change**.
- [ ] `git diff main -- tests/ src/render/ src/play/ src/ui/ src/grid/ src/core/ src/main.ts puzzles/ index.html package.json` shows only section A's declared `main.ts` lines and `package.json`/`package-lock.json` entries. Section C adds nothing to that diff.

## Files (section C)
- **`src/render3d/` only.**
  - Edited: `layout.ts` (constants, `brk`, `shadowOf`, heights), `scene.ts`, `camera.ts` (`ELEVATION`), `pick.ts` (`pickOff`) and `renderer.ts` (passes `overlay.relightT`).
  - Edited tests: `layout.test.ts`, `scene.test.ts` (the two deliberate test edits named in C1), `live.test.ts` and `pick.test.ts`.
  - New: `relight3d.ts` and `relight3d.test.ts`.
- **New import, by file only:** `../render/relight`. The others it uses (`../render/city` and `../render/motion`) are already imported. Never `../render/index`. The drift guards **read** `src/render/map-renderer.ts` as text, and edit nothing there.
- **No edit** to `src/main.ts`, `package.json`, `src/render/`, `src/core/`, `src/play/`, `src/ui/`, `src/audio/`, `tests/`, `puzzles/` or `index.html`. If the builder needs one, it stops and asks for a re-cut.

## Interfaces (section C)
- **No new `src/core/` types, no schema change and no new dependency.**
- **Local to `src/render3d/`:**
  - In `layout.ts`: `WireBreak`, `WireRun.brk`, `shadowOf`, `SHADOW_Y`, `BREAK_GAP`, `HANG_DROP`, `HANG_SEGMENTS`, `FOOTPRINT_MAX_H` and `PLACE_MAX_H`.
  - In `relight3d.ts`: `RelightClock`, `createRelightClock`, `lineFraction`, `nodeArrived` and `lampIgnition`.
  - The 4th, optional parameter `relightT?: number` on `SceneBundle.update`.
  - `NodeParts.flare`, and `userData.pickOff` on pick targets.
- `MapRenderer` and the other `src/render/` interfaces are unchanged. `overlay.relightT` already exists on `MapOverlay`.

## Within approved scope?
**Yes.** Section C touches only `src/render3d/`. It adds no dependency. It makes no edit to `src/render/`, `src/core/`, `src/ui/`, `src/main.ts`, `tests/` or `puzzles/`, and adds no new `main.ts` lines. Everything it needs from 2D is already a pure export, imported by file: `planRelight`, `FLARE_SECONDS`, `RELIGHT_LEAD_SECONDS` and `RELIGHT_TRAVEL_SECONDS` (`../render/relight`), `glowTarget`, `easeGlow` and `GLOW_EASE_SECONDS` (`../render/city`), and `clamp01` (`../render/motion`). The Relight clock is already passed to every renderer by `main.ts`. Three bits of 2D logic are inline in the Canvas renderer, not exported: the line fraction, the lamp ignition test and `LINE_REPAIRED`. They are mirrored in `src/render3d/`, with drift guards, as section B did for `ON`/`OFF`.

## Open questions for Josh (section C; the defaults apply if you just approve)
- **C-Q1. Camera tilt.**
  - **Default:** lower it from 55° to 45°, so height reads as height.
  - **The alternative:** keep 55° and rely on the taller poles and the shadows alone. That gives a flatter, more map-like view, but the wires sit closer to their streets.
- **C-Q2. Heights.**
  - **Default:**
    - poles 1.6 tall (from 1.2), sag 12% (from 4%), wire radius 0.05;
    - buildings inside the footprint at most 1.4 tall and places at most 1.8, so no building hides a wire;
    - the city outside the footprint unchanged.
  - These replace section A's Q3 numbers, and all of them are tunable after you play it.
- **C-Q3. Repaired look on nodes.**
  - **Default: out.** C2 gives the repaired cable 2D's "new cable" colour. 2D also has a repaired look for nodes (`NODE_REPAIRED`), but the Shrine solution repairs no node, so nobody would see it here. If you want it, it is a small later section.
