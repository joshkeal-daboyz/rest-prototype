# 027 · Larger maps: readable scale, a ward in the city, and a way to verify them

owner: lead-architect (0), renderer (A1, A2, A3, A4), grid-simulator (G, D1, D2, D3), interaction (B), ui (C)
status: approved (G1, Josh, 29 Oct 2026: "yes I approve")
branch: one per part: `ticket/027-larger-maps-a1`, `-a2`, `-a3`, `-a4`, `-g`, `-d1`, `-d2`, `-d3`, `-b`, `-c` (part 0 is committed with the ticket on G1)

## Josh's words
"Now that we have the ability to grab and drag the map, I would like to implement LARGER maps. Multiple puzzles and multiple power sources connected together and forcing the player to break down a problem into smaller subproblems that could be interlinked."

This ticket is the **engineering** that larger maps need. It designs no puzzle. The maps themselves are ticket **028 · A tier of large maps** (puzzle-designer), cut after this one (see Order).

## Where it is today (read from `main` at 6f30570)
**Sizes now.** The largest maps are about 30 nodes: `56-whole-ward` has 31 nodes, 33 lines, is 29 × 19 units and has 5 targets. Every map but two has one feed. The smallest gap between two nodes is 1 unit (several maps).

**1. The fit shrinks a big map until it is unreadable** (`src/render/geometry.ts` `computeFit`).
- `scale = min(availX / spanX, availY / spanY, MAX_SCALE = 80)`. There is no lower limit.
- Icons, hit radii (`NODE_HIT_RADIUS = 18`), Lv captions and the 024 clearances are all in **CSS px**, so they do not shrink with the scale. Only the gaps between nodes shrink.
- At 1920 × 1080, `56` already fits at about 37 px per unit. A 64 × 40 map would get about 17 px per unit. Two nodes 1 unit apart would then sit 17 px apart, inside each other's 18 px hit circles, and their captions would collide.
- **The pan clamp (022)** assumes the map fits. `clampPan` keeps `PAN_KEEP = 96` px of the box inside the free area. On a map bigger than the screen, that lets the player drag almost the whole map away, leaving a 96 px sliver.
- `resetView`, Home and double right-click all go to pan `{0, 0}`, the centred fit.
- **Labels (024 A3)** whose place doesn't fit are **shifted inside the free area**. That is right when the whole map is on screen. On an overflowing map, a target far off-screen would have its name dragged to the screen edge, away from its place.
- **`hitTest`** answers anywhere on the canvas. Once a map can be bigger than the free area, nodes will sit under the HUD and the parts panel. A click on a panel area that lets pointer events through would throw a breaker the player can't see.

**2. The city has a 32-unit cap** (`src/render/city.ts`).
- `DISTRICT = 32`. Districts sit hub-and-spoke from the ladder number (`districtOf`): 8 spokes × 8 slots, which fills exactly at ladder 65.
- `circuitStreets` clips each map's footprint (bounds + `FOOTPRINT_MARGIN = 2`) to its district. Four maps are clipped today: 33, 55, 56 and 59.
- A 64 × 40 map would be cut to 32 × 32. Its ring road would run through the middle of its own wiring, and its lots would not clear the wires outside the clip.
- **Work per pan is bounded by the screen, not the map:** `cityForMap` already takes the visible rect, and `footprintLayout` is cached per scale. But `rebuildGeometry` runs on every pointer move of a drag. It rebuilds the geometry, re-places every label and repaints the whole city layer.

**3. The schema, validator and simulator have no size limit, and need no change.**
- **Validator (`src/core/load.ts`):** there is no cap on nodes, lines, feeds or targets. It is linear apart from one `lines.find` per battery.
- **Several feeds:** draft 5 already allows several feeds, each judged against its own `capacity`. Rule 2 (*nearest feed carries it*) is exactly how sections interlink: a tie switch, or a mended cable, moves a lamp to another feed. Tests so far only use 2 feeds.
- **Several lamps for one job:** `target` is a list of lamp ids. A section's targets are simply its lamps in that list. Grouping targets by section is not in the schema (Open question 6).
- **Simulator cost (`src/grid/grid.ts`):**
  - Each settle is one breadth-first flow, plus walks up the parent chain for each lamp (`under`), roughly O(N × depth).
  - Each fuse that blows restarts the settle.
  - `wouldBlow` runs one extra flow for each readable blown fuse.
  - At about 120 nodes this is small. It is not yet measured.
- **Undo:** each snapshot copies only the breaker and switch maps, the faults and the parts. That is O(controls + faults), not the map's size, and the history is unbounded.
- **Relight:** fixed at 2.4 s to the farthest lamp, whatever the size. On a big map most of it plays off-screen.

**4. Puzzle verification is not built.**
- `package.json` has `"analyze": "tsx tools/analyze.ts"`, but `tools/analyze.ts` does not exist.
- Every design note's numbers come from a **throwaway brute force** over `createGrid`, written fresh by each designer.
- That search already runs out of time on `49` and `54` (puzzles/README.md: "the search runs out of time on them"). At four sections of that size, brute force over the whole map is hopeless: the state space is roughly the product of the sections' state spaces.
- Nothing re-checks a map once its note is written.

**5. Overlays.**
- Lv captions, feed captions, target stars, the inventory panel and the win splash are all in px or the DOM. They don't change with map size.
- **The "Priests want lit" list** is one vertical column. With 10–12 targets and a capacity row per feed (4 feeds), the HUD grows tall, the top inset grows, and the free area shrinks.
- **Off-screen targets:** when a target is off-screen, nothing on the map says where it is.

## Josh's answers (relayed by the main session; not G1 approval)
Josh, on the ten open questions: "all default answers are good except 4, lets see the big map whole and add zoom functionality."
1. **Size:** up to about 64 × 40 units, about 120 nodes. Yes.
2. **Sections:** 2–4 sections, usually one feed each, linked by tie switches, shared cables or a battery. Yes.
3. **Opening view:** a large map opens on its first feed. Yes.
4. **Seeing it whole: changed.** Josh wants to **see the big map whole**, and wants **zoom**. Folded in as part **A4** (renderer: zoom state and math) and an extended **B** (interaction: wheel and keys). See "Zoom (A4, B)" below. The default (accept panning, no zoom) is withdrawn.
5. **Edge stars:** on targets only, and clicking centres the map on a target. The click is the list entry's (C). Stars stay display-only. Yes.
6. **The list:** no `sections` field in this ticket; one list, in two columns past 6 entries. Yes.
7. **Arrow keys:** kept (B). Yes.
8. **The ladder:** large maps go at the **end** of it, from 65 on. This goes to 028.
9. **028:** starts with **one pilot map**. Yes.
10. **The puzzle-designer's instructions** are updated together with 028, by Josh or the main session.

## Goal
A map can be bigger than the screen. The player can also **zoom**: the mouse wheel zooms about the pointer, and one key shows the **whole map** at once. It opens at a readable scale: never smaller than `MIN_SCALE` px per unit, so every icon, caption and click target is the same size as on today's maps.
- **Fits:** a map that fits the free area at that scale or more opens centred, exactly as now.
- **Too big:** a map that doesn't fit opens on its first feed, and the player pans it with the right-drag (or the arrow keys). Panning stops at the map's edges, so the screen is never mostly empty.
- **Off-screen targets:** each target that is off-screen has a small star marker at the screen edge pointing to it. Clicking its name in the "Priests want lit" list brings it to the centre.
- **The city:** a large map sits in its own **ward** of the city, whole and unclipped, with streets under every wire.
- **Verifying:** the puzzle designer can verify a large map without brute-forcing the whole of it, in three steps:
  - a **check block** in the design note replays the intended solution and every trap with its recovery, on the real simulator, in the gate, forever;
  - `npm run analyze` (finally built) searches a map exhaustively up to a state cap, or, past the cap, proves a lower bound on the clicks to win;
  - it brute-forces each **section** of a sectioned map on its own, with the links between sections stubbed as the designer declares.
- The simulator is shown to stay fast at 4 feeds and about 400 nodes.

## Decided in this cut
### Scale and view (A1, renderer)
- **`MIN_SCALE = 36` px per unit.** `computeFit` becomes `scale = clamp(fitScale, MIN_SCALE, MAX_SCALE)`.
  - 36 is `2 × NODE_HIT_RADIUS`: two nodes 1 unit apart (today's tightest spacing) never share a hit circle.
  - At 1920 × 1080 every current map already fits at 36 or more, so nothing changes there.
  - **On a small window**, a map that would have shrunk below 36 now overflows and pans instead. 022's "~400 px wide" check changes accordingly.
- **Overflow:** an axis where the map's box (bounds × scale, plus `PADDING` each side) is larger than the free area **overflows**.
- **Edge-stop clamp on an overflowing axis.**
  - The pan is clamped so the map's edge can come no further in than `PADDING` (64 px) from the free area's edge on that side. For x: `area.right − PADDING − box.right ≤ pan.x ≤ area.left + PADDING − box.left`, and the same for y.
  - On an axis that fits, 022's `PAN_KEEP` rule is unchanged. `clampPan` gains the rule, and every existing 022 test case (all with boxes that fit) passes unchanged.
- **Initial view and Home.**
  - A map that fits on both axes opens at pan `{0, 0}`, as now.
  - A map that overflows opens **with its first feed** (the first `feed` in `nodes`) at the free area's centre, clamped (Josh's answer 3).
  - `resetView()` (load, Reset, resize, Home, double right-click) returns to this initial view, not always to `{0, 0}`. main.ts and `src/play/pan.ts` call it as they do now and need no change.
- **`centreOn(nodeId)`** is added to `MapPanView`. It pans so the node sits at the free area's centre, clamped, and returns the pan.
- **Zoom** is in this ticket (Josh's answer 4). A1 builds the view at one scale per map. A4 makes the scale change; see "Zoom (A4, B)" below.
- **`hitTest` returns `null` outside the free area.** A click over the HUD or the parts panel never reaches a node hidden under it. `hitTestGeometry` itself is unchanged; the renderer checks the free area first. The same applies to `placeAt`.
- **Labels on an overflowing map.** A target label whose place is outside the free area is **hidden**, not clamped onto the screen. The far-side shift from 024 A3 applies only when the place itself is inside the free area.
- **Off-screen work is skipped.**
  - A line whose screen box misses the canvas by more than 32 px draws no pulses or sparks. A node in the same position draws nothing.
  - `visibleLines` and `visibleNodes` are pure, tested functions.
  - `hitTestGeometry` still sees everything. It is O(N + L), which is fine at these sizes.
- **Relight** is unchanged: 2.4 s, and it can't be interrupted. The player may pan during it (022).

### The city: a ward for a large map (A2, renderer)
- **A map is large** when its footprint (bounds grown by `FOOTPRINT_MARGIN` on every side) is wider or taller than `DISTRICT`. This is derived from the bounds; **no schema field**.
  - Today that is 33, 55, 56 and 59.
  - They move to wards and are no longer clipped. Josh will see a slightly different backdrop on those four.
- **Wards** are on a ring beyond every spoke slot that ladder numbers 1–129 can reach (slots 0–15). A large map's ward is centred at:
  - **radius:** `WARD_R + WARD_RING_STEP × floor(n / WARD_SLOTS)`;
  - **angle:** `(n mod WARD_SLOTS) × 2π / WARD_SLOTS`;
  - `n` is its `mapNumber`. Constants: `WARD = 96` units square, `WARD_R = 1024`, `WARD_SLOTS = 16`, `WARD_RING_STEP = 160`.
- **Small maps stay where they are.** Their districts are exactly as in 023/024: the same `districtOf` and `mapOrigin`. A large map's spoke slot is left as plain city.
- **The clip goes.** Every footprint fits its district or its ward whole. The `Math.max` / `Math.min` clip in `circuitStreets` is removed, and the ring road is the real bounds + margin.
- **Avenues** that pass through a ward stop at the footprint, as 024 already does.
- **Pan cost.**
  - `setPan` no longer re-runs `placeLabels` or repaints the city layer from scratch when the scale is unchanged. The city layer is rebuilt only for the newly visible area, or repainted from the cached layout with the new offset; the builder may choose either, as long as the test below holds.
  - The work per pan must be bounded by the screen, not the map.

### Zoom (A4 renderer, B interaction)
Josh: "lets see the big map whole and add zoom functionality."

**Who owns what.**
- The **renderer (A4)** owns the zoom state, the zoom levels, the "zoom about a point" maths, the clamp, and redrawing at the new scale.
- **Interaction (B)** owns the wheel, the pinch gesture and the keys. It only calls `MapPanView` methods.
- main.ts needs no change: `resetView` already runs at load, Reset and resize.

**The scale range, per map.**
- **`wholeScale`:** the scale at which the whole map, plus `PADDING`, fits the free area. This is `computeFit`'s fit scale with no `MIN_SCALE` floor (capped at `MAX_SCALE`).
- **`openScale`:** `clamp(wholeScale, MIN_SCALE, MAX_SCALE)`. This is A1's opening scale: never below the readable `MIN_SCALE = 36`.
- **`minZoomScale`:** `min(wholeScale, openScale)`. The player can zoom out until the whole map fits, and no further. On a map that already fits at its opening scale, zooming out does nothing.
- **`maxZoomScale`:** `MAX_ZOOM_SCALE = 96` px per unit. That is 2.67 × `MIN_SCALE`, a little past today's `MAX_SCALE = 80`, so the player can look closer at a cluttered junction on any map.

**How `MIN_SCALE` and zoom fit together.**
- `MIN_SCALE` stays the floor for the **opening** view and for **Home** only.
- Zooming out may go below it, down to the whole-map fit. On a 64 × 40 map at 1080p that is about 15–20 px per unit. This is the **overview**, and the player chooses it.
- **Icons stay the same px size at every zoom.** The feed, switches, lamps, the star and the battery are not scaled; only the gaps between them change. So in the overview, nodes closer than about 36 px may overlap. Josh accepted that.
- **Lv captions** (lamp, fuse and feed) and the 024 **place labels** are hidden below `CAPTION_MIN_SCALE = 27` px per unit, three quarters of `MIN_SCALE`. Lamps, targets, the target star, sparks, pulses, brownout flicker and the fuse bars are still drawn. Hovering still shows the full prompt, which names the element and its Lv.
- **Hit-testing in the overview** stays usable, with one rule: `hitTestGeometry` already picks the **nearest** node whose hit circle contains the point, so overlapping circles resolve to the closest centre. Clicks throw and repair as at any scale, and the hover prompt names the target before the click. Hit radii stay in px. Nothing is disabled in the overview (Open question 13).

**Zoom levels (discrete, so the city layout can be cached).**
- Levels are `openScale × ZOOM_STEP^k` for whole k, with `ZOOM_STEP = 2^(1/4)` (about 1.19, four steps to double). They are kept to `[minZoomScale, maxZoomScale]`, and both ends are added as levels themselves.
- So the levels always include the opening scale, the whole-map scale and the maximum. `zoomLevels(minZoomScale, openScale, maxZoomScale)` is pure.
- `footprintLayout` and the city layer are cached **per level**, holding the most recent 4. Each level computes its px clearances (024 A3) at its own scale, so lots clear the wires at every zoom.

**Zoom about a point.**
- `zoomAbout(fit, px, py, newScale)` is pure. It returns the pan that keeps the map point under the canvas point `(px, py)` at the same screen position after the scale change. The pan is then clamped (edge-stop or `PAN_KEEP`, per axis, at the new scale).
- The pan stays measured from the centred fit at the current scale, as in 022, so `clampPan` and A1's rules work unchanged at every level.

**Inputs (B).**
- **Mouse wheel** over the canvas: one notch (`deltaY` about ±100 with `deltaMode` 0, or ±3 lines with `deltaMode` 1) moves one level, about the pointer. Wheel down zooms out. Bigger deltas move several levels, limited to 3 per event.
  - The wheel listener is `{ passive: false }` and calls `preventDefault`, so the page doesn't scroll.
- **Touchpad pinch** is a `wheel` event with `ctrlKey` in Chrome, Edge and Firefox. B adds up its `deltaY` and moves one level per 40 units, about the pointer, so the browser doesn't zoom the page.
  - Touch-screen two-finger pinch (pointer events) is **not** in this ticket (Open question 12).
- **Keys:** these have the same guards as Home and the arrows (not from `select`, `input` or `textarea`, not with Ctrl, Alt or Meta held), and call `preventDefault`.
  - `+` or `=` zooms in one level, and `-` zooms out one level, both about the free area's centre.
  - **`F` shows the whole map** (`fitWhole()`: `minZoomScale`, centred, as 022's centring at that scale).
  - **`Home` and double right-click** go back to the opening view (`resetView()`: `openScale`, on the first feed for an overflowing map, otherwise centred).
- **Zoom is view-only:** no grid call, no log entry, no bus event. It is allowed during the Relight.

**When the zoom resets.**
- The zoom is per map and is not remembered. Load, picking another map, Next level, Reset and window resize all call `resetView()`, which now also resets the scale to `openScale`.
- Undo leaves the zoom and pan alone.

**Everything stays correct at every level.**
- Drawing and `hitTest` share one geometry, rebuilt on each zoom as on each pan, so they cannot drift apart.
- At every level:
  - the free-area rule for `hitTest` and `placeAt` (A1) holds;
  - the edge stars (A3) work, and in the overview every target is on screen, so there are none;
  - labels never clip (024 A3) and are hidden off the free area (A1);
  - culling works;
  - the switch direction marks and the blow-slot paths are rebuilt, as on a pan.
- **Zoom indicator:** none in this cut (Open question 11).

### Off-screen target markers (A3, renderer)
- **Which targets:** each `target` lamp whose node is outside the free area gets a marker.
  - **Shape:** a 10 px star, in the target star's colour, **filled** when that lamp is lit and **hollow** when it is not.
  - **Where:** on the free area's edge (inset 14 px), where the ray from the free area's centre to the lamp crosses it.
  - Markers never overlap one another: they are spread along the edge, at least 14 px apart.
- **Display only.** Markers aren't clickable; the list does the centring (C), per Josh's answer 5.
- **Brownout and blow** need no marker. The brownout flickers every lamp on screen, and the blow notice is a DOM toast.

### Arrow keys (B, interaction; B also has the zoom inputs above)
- **Arrows pan:** ←/→/↑/↓ on the document pan by a third of the free area on that axis (`setPan`).
  - The same guards as Home: not from `select`, `input` or `textarea`, not with Ctrl, Alt or Meta held, and `preventDefault`.
  - Keeping the key held repeats the pan through the browser's key repeat.
- Like 022, this is view-only: no grid call, no log entry and no bus event.
- Josh kept the arrow keys (answer 7).

### The list on a large map (C, ui, plus a main.ts line)
- **Long lists:** with more than 6 targets, the "Priests want lit" list lays out in two columns (class `many` on `.targets`). The capacity readout puts its per-feed rows on one line each, as it does now.
- **Click to find:** clicking an entry, or pressing Enter on a focused one, calls `deps.onShow(id)`. main.ts calls `renderer.centreOn(id)`. Hover still highlights (024 B).

### The simulator at size (G, grid-simulator)
- **Tests, not features.** Add tests on a generated map: 4 feeds, 4 sections joined by tie switches, about 400 nodes, 24 fuseboxes and 6 batteries. The generator lives in the test file.
- **If the budget fails,** the builder may optimise inside `src/grid/` without changing any rule or `GridState` field. For example, `under` could come from the reverse-order subtree pass that `sub` already uses, instead of a walk up the parent chain per lamp.
- **4-feed rules:** add tests that check draft 5's rules at 4 feeds:
  - separate pools;
  - nearest feed by hops, with ties broken first by feed order and then by line order;
  - a meeting line that is live and carries no load;
  - brownout when any one feed is over, with `over` listing exactly the feeds that are over.

### Verifying a large map (0, D1, D2, D3)
The process, which the puzzle-designer follows on 028:
1. **Design in sections.** Each section is about the size of a current map: at most 24 × 14 units, about 30 nodes, at most 4 faults, and usually one feed. Sections are joined by a few **links**, which are lines: a tie switch, a shared cable, or a battery's far side. The links are where the subproblems interlock.
2. **Write the check block in the design note.** It is a fenced block tagged `check` holding JSON. It gives:
   - the intended solution, as moves;
   - every trap, with its moves, what must happen, and the recovery moves that still win;
   - optionally, the sections, the links, and each section's share of the parts.
3. **`npm run check puzzles/<id>.json` (D1)** replays it on the real `createGrid`: the solution must win, each trap must show its expected signal, and each recovery must win. The gate runs every note's check block, so a later simulator change that breaks a map fails CI.
4. **`npm run analyze puzzles/<id>.json` (D2)** is a bounded breadth-first search over the whole map, capped at 500 000 states.
   - **Under the cap:** it is exhaustive. It reports the brief's numbers: solvable, min clicks, winning configurations, the share of dead-end states, whether the obvious first moves are dead ends, and any fuse that blows on the way.
   - **Over the cap:** it reports the depth it completed: **"no win in fewer than D clicks"**. This is a proved lower bound to set against the check block's solution length.
5. **`npm run analyze -- --sections` (D3)** builds one sub-puzzle per section and brute-forces each with the same search:
   - the sub-puzzle is the section's nodes, the lines inside it, and a **stub** for each link (as the check block declares: a feed with a capacity where power comes in, a lamp with a load where power must leave, or cut);
   - it takes the section's targets, plus any stub lamp marked as a target, and the section's share of the parts.
   - So every subproblem gets the full analyzer numbers, the full-map replay proves the subproblems compose, and the traps prove the interlocks fail in the intended ways.
   - **What it can't prove:** that there is no unintended shortcut across sections. The lower bound from step 4 is the guard against that, and the design note must say how far it reached.

The check-block format is part 0. It lives in the design note, not in a new `.json` file, because `src/main.ts` globs `puzzles/**/*.json` as maps and `load.test.ts` validates every `.json` there.

### Rules
No rule changes. Multi-feed maps use draft 5's Draft rules as they stand. *The Relight can't be interrupted* holds, since panning, the arrow keys and centring are view-only. *Faults hide faults* is unchanged. Off-screen markers show only targets, never an unreadable fault.

## Acceptance criteria
- [ ] **0 (lead-architect), Vitest in `src/core/check.test.ts`, at G1 before D1 starts:**
  - `parseCheckBlock(md)` returns the parsed JSON of the first fenced block tagged `check`. It returns `null` when there is none, and an error result on bad JSON.
  - `validateCheck(json, puzzle)` accepts a well-formed block. It rejects, with one message each:
    - a move naming a node that isn't a breaker, switch or battery;
    - a `repair:` move on an id with no fault;
    - a `wait:` that isn't positive;
    - a trap without `recover`;
    - a section listing a node twice, or a node in two sections;
    - sections that don't cover every node;
    - a link that isn't a line, or doesn't join two different sections;
    - a stub on a side the link doesn't touch;
    - section parts that don't add up to `startingParts` (as multisets).
  - `puzzles/SCHEMA.md` gains a "Design checks (ticket 027)" section describing the block.
  - `npm run gate` is green.
- [ ] **A1 (renderer), Vitest in `src/render/` (pure):**
  - **Scale clamp:**
    - `computeFit` never returns a scale below `MIN_SCALE` or above `MAX_SCALE`.
    - For every file in `puzzles/` at 1920 × 1080 with insets `{ top: 220, bottom: 140 }`, the scale equals today's (they all fit).
    - A synthetic 64 × 40-unit puzzle gets exactly `MIN_SCALE`.
  - **Edge-stop clamp:**
    - On an overflowing axis, extreme pans (±10 000) are clamped so the box edge sits exactly `PADDING` inside the free area's edge, on each of the four sides.
    - On a fitting axis, every existing 022 `clampPan` case passes unchanged.
    - A box overflowing on x and fitting on y uses each rule on its own axis.
  - **Initial view:**
    - On the synthetic large map, after `resetView()`, the first feed's screen position is the free area's centre (±0.5) unless that position is clamped. If it is clamped, the pan sits on the clamp's edge.
    - A map that fits gets `{0, 0}`.
  - **`centreOn`:** a node in the middle of the large map ends up at the free area's centre (±0.5). A corner node is clamped. An unknown id leaves the pan unchanged.
  - **Hit-testing:**
    - On the large map at `MIN_SCALE`, after a pan, `hitTest` at each of 20 sampled nodes' screen positions returns that node.
    - A point inside the top or bottom inset returns `null`, even when a node is drawn there. `placeAt` behaves the same.
    - With no insets, every existing `hitTest` test passes without edits.
  - **Spacing:** at `MIN_SCALE`, no two nodes 1 unit or more apart have overlapping hit circles unless one is a lamp with load ≥ 2. The test lists such pairs in today's files, informational only.
  - **Labels:** on the large map, a target whose place is outside the free area has no shown label at any pan. Every shown label is inside the free area, and within 1 lot of its place.
  - **Culling:** `visibleLines(geo, area, 32)` and `visibleNodes(...)` contain every line or node with any part on screen, and none wholly more than 32 px off. On the large map at its initial view, they are fewer than all.
  - Every existing `src/render/` test passes. `npm run gate` is green, and the test count grows.
- [ ] **A2 (renderer), Vitest in `src/render/`:**
  - `isLarge` is true for exactly the maps whose bounds + 2 × `FOOTPRINT_MARGIN` exceed `DISTRICT` on an axis (today 33, 55, 56, 59), and for the synthetic 64 × 40 map.
  - **No overlap:** no ward square overlaps any spoke district for ladder numbers 1–129. No two wards overlap for 1–512. No ward contains the hub.
  - **Whole footprints:** every file's footprint (bounds + margin, unclipped) lies inside its district or its ward, and so does the synthetic map's. The clip is gone from `circuitStreets`.
  - **Small maps unmoved:** `mapOrigin` is identical to today's for every map that isn't large. The 023/024 hub-and-spoke tests pass.
  - **024 A3 still holds on the large maps:** the 024 A3 "no overlap with the circuit" and "streets connect" tests pass for the four large maps and the synthetic map, at scales 36, 50 and 80.
  - **Pan is bounded by the screen:**
    - On the synthetic map at `MIN_SCALE` and 1920 × 1080, the number of buildings computed per `setPan` is at most that for a map-free window of the same canvas size. It doesn't grow with the map's area.
    - `footprintLayout` is called once per scale, not once per pan.
  - `npm run gate` is green.
- [ ] **A3 (renderer), Vitest in `src/render/` (pure):**
  - `offscreenMarkers(geo, area, targets, lit)` returns one marker per target whose node is outside `area`, and none for on-screen targets.
  - Each marker lies on the edge of `area` inset 14 px, on the ray from the area's centre to the lamp (±1 px before spreading).
  - Markers are at least 14 px apart (constructed case: 5 targets in one direction).
  - `lit` gives `filled: true`.
  - `npm run gate` is green.
- [ ] **A4 (renderer), Vitest in `src/render/` (pure):**
  - **Levels:** `zoomLevels(min, open, max)` is sorted and has no duplicates. It contains `min`, `open` and `max`, and consecutive levels differ by at most `ZOOM_STEP` (±1e-9). If `min === open` (a map that fits), it has no level below `open`.
  - **Range:**
    - On the synthetic 64 × 40 map at 1920 × 1080 with insets `{ top: 220, bottom: 140 }`, `minZoomScale` is below `MIN_SCALE`. At that scale the whole map plus `PADDING` is inside the free area, and centred (±0.5).
    - On `09-shrine-circuit`, `minZoomScale === openScale`.
    - No level exceeds `MAX_ZOOM_SCALE`.
  - **Zoom about a point:**
    - For 10 sampled canvas points and every pair of adjacent levels, `zoomAbout` keeps the map point under the canvas point within 0.5 px, unless the clamp moved it. When the clamp moved it, the result equals `clampPan` of the unclamped pan.
    - Zooming in a level and then out again about the same point returns the same pan (±0.5 px).
  - **View methods:**
    - `fitWhole()` gives `minZoomScale` with the map centred.
    - `resetView()` gives `openScale` and A1's initial pan, from any zoom.
    - `zoomStep(+1)` at the top level and `zoomStep(-1)` at the bottom change nothing.
  - **Hit-testing at every level:**
    - On the synthetic map at every level, `hitTest` at each sampled node's screen position (in the free area) returns either that node, or a node whose centre is no farther from the point. The nearest-wins rule is tested directly with two overlapping circles.
    - At `openScale` and above, it returns exactly that node.
    - Points in the insets return `null` at every level.
  - **Captions:** below `CAPTION_MIN_SCALE` no Lv caption box or place label is emitted. At or above it, the same captions as A1 are emitted.
  - **City at every level:**
    - The 024 A3 "no overlap with the circuit" test passes at `minZoomScale`, `openScale` and `MAX_ZOOM_SCALE` for the synthetic map and for `56`.
    - `footprintLayout` is computed once per level visited. Repeat visits to 4 levels hit the cache, and a 5th level evicts the oldest.
  - **Overlays at every level:** every shown label is inside the free area. At `fitWhole` on the synthetic map, `offscreenMarkers` is empty. Culling is correct at the extreme levels.
  - Every A1, A2 and A3 test still passes at `openScale`. `npm run gate` is green, and the test count grows.
- [ ] **B (interaction), Vitest in `src/play/` (fakes as in `pan.test.ts`):**
  - **Arrows:**
    - ArrowRight pans by `-(free width / 3)` on x, and the other arrows likewise. (Pan direction: the map moves so the view goes right; the test fixes the sign.)
    - A `select` target, or Ctrl held, does nothing.
  - **Wheel:**
    - A wheel event with `deltaY: -100, deltaMode: 0` at `(300, 200)` calls `zoomStep(+1, 300, 200)` once. `deltaY: 100` calls `zoomStep(-1, …)`.
    - `deltaMode: 1, deltaY: 3` counts as one notch. `deltaY: 1000` is limited to 3 steps.
    - `preventDefault` is called, and the listener is added with `passive: false`.
  - **Pinch:** `ctrlKey` wheel events with `deltaY` −15, −15 and −15 (45 in total) make one `zoomStep(+1, …)`, about the last pointer. Below 40 they make none.
  - **Keys:**
    - `+`, `=` and `-` call `zoomStep(±1)` with no point (the centre).
    - `F` and `f` call `fitWhole()`.
    - Home still calls `resetView()`.
    - All are guarded as Home is.
  - Detach removes every listener (wheel included).
  - No grid call, no log entry and no `play:click` for any of these inputs.
  - Every existing `src/play/` test passes. `npm run gate` is green.
- [ ] **C (ui), Vitest in `src/ui/` (jsdom):**
  - With more than 6 targets, `.targets` has class `many`; with 6 or fewer, it doesn't.
  - `click`, and `keydown` Enter on a focused entry, call `deps.onShow(id)`.
  - In `src/main.ts`, `onShow` calls `renderer.centreOn(id)`.
  - The list text and the 024 B highlight are unchanged.
  - `npm run gate` is green.
- [ ] **G (grid-simulator), Vitest in `src/grid/`:**
  - **Budget:** on the generated 400-node, 4-feed map, the median time of 200 random actions (throw, repair, undo), each with its settle, is under 5 ms in Vitest. This is a generous bound: the target is under 1 ms, and the test logs the real figure for the review.
  - **Long undo:** 500 actions, then 500 undos, return `state()` to equal the initial `state()` (lit, powered, faults, parts, switches, breakers).
  - **A cascade:** a cascade that blows 6 fuses in one action settles, emits 6 `fuse:blown` in order, and stays within the budget.
  - **Four feeds:**
    - separate pools: no load moves between feeds;
    - nearest by hops, ties by feed order and then by line order;
    - the meeting line is live with no load across;
    - `over` lists exactly the feeds that are over, in file order;
    - the loads in `feeds` add up to `load`.
  - Every existing `src/grid/` test passes, and no `GridState` field changes. `npm run gate` is green.
- [ ] **D1 (grid-simulator), Vitest in `tools/`:**
  - `npm run check puzzles/<id>.json` reads `puzzles/<id>.md`'s check block and replays it on `createGrid`. Each click is followed by `clickSeconds` (default 1, the convention the notes use), and `wait:N` advances N seconds.
  - It prints, then exits non-zero on any failure:
    - for the solution: complete, clicks, parts used, and each feed's load against its capacity;
    - for each trap: whether its `expect` held (`blown`, `brownout`, `readable`, `lit`, `complete: false`) and whether the recovery won.
  - **In the gate:** `tools/check.test.ts` runs every note in `puzzles/` that has a check block, so a block that stops winning fails CI.
  - **Proven on a real map:** a check block for `09-shrine-circuit`, written as test data inside the test file (not in the note), passes. A deliberately wrong solution fails, with a message naming the first move whose state differs.
  - `npm run gate` is green.
- [ ] **D2 (grid-simulator), Vitest in `tools/`:**
  - `tools/analyze.ts` exists and is the existing `npm run analyze` script.
  - It runs a bounded BFS over play states with the 1 s / 0.5 s time convention, deduplicated on (breakers, switches, faults, parts, battery charge and released, rounded to 0.5 s).
  - It reports: solvable, min clicks, the number of winning control configurations, the share of reachable states that can't win any more, the first moves that lead only to such states, and the fuses that blow on any shortest win.
  - On `06-the-spark` and `09-shrine-circuit` its min clicks and winners equal the numbers in their notes.
  - Over the cap (a test sets `cap: 1000` on `49`), it reports `exhaustive: false` and a lower bound `noWinBelow: D`, where D is the deepest fully searched layer + 1.
  - `npm run gate` is green.
- [ ] **D3 (grid-simulator), Vitest in `tools/`:**
  - `analyze --sections` builds one valid (`validatePuzzle`) version-5 sub-puzzle per section. It has:
    - the section's nodes and its inner lines;
    - one stub per touching link: a stub feed with the declared capacity, or a stub lamp with the declared load, as a target when `must: true`, or cut;
    - the section's targets;
    - the section's parts.
  - It runs D2's search on each sub-puzzle and prints a table, one row per section.
  - On a generated two-section map (two copies of `09` joined by a tie switch), each section's numbers equal `09`'s.
  - The full-map replay of the check block also passes.
  - `npm run gate` is green.
- [ ] **Josh in the browser** (`npm run dev`), **now** on existing maps, after A1 to A3, B and C:
  - Open `56-whole-ward`, then make the window small (about 1100 × 650, or 1366 × 768 with devtools open). The map stays readable (icons and captions as large as on a big screen) and overflows.
    - It opens on its feed.
    - Right-drag and the arrow keys move it, and it stops with a small margin at each edge. It never slides away leaving an empty screen.
    - Home goes back to the feed view.
    - Off-screen targets show edge stars, filled when lit.
    - Click a target in the list: the map brings it to the centre.
    - Clicks over the HUD or the parts panel never throw anything underneath.
  - **Zoom** (after A4 and B), on `56` and on `09`:
    - The wheel zooms about the pointer: the spot under the pointer stays put, and the page never scrolls.
    - A touchpad pinch zooms the map, not the page.
    - `+` and `-` zoom about the centre.
    - **`F` shows the whole map at once.** In that view the Lv captions are hidden, and hovering still names each element. A click on an overlapping cluster hits the node nearest the pointer, and the prompt says which before you click.
    - Home goes back to the readable opening view.
    - Zoomed all the way in, nothing is cut off and the city's buildings still clear every wire.
    - Pick another map, press Reset, or resize the window: the zoom resets. Undo leaves it alone. Zoom during the Relight: it carries on.
  - At full size, every map opens exactly as before. `56`'s city backdrop is whole, with no ring road cutting through its wiring.
- [ ] **Josh in the browser, on 028's first large map** (the pilot), once it exists: all of the above at real size, zoom and `F` included. Also: the Relight plays while panning, panning stays smooth, and the HUD stays short enough to leave most of the screen for the map.

## Files
- **0 (lead-architect):** `src/core/check.ts`, `src/core/check.test.ts`, `src/core/index.ts` (export), and `puzzles/SCHEMA.md` (the "Design checks" section only).
- **A1, A2, A3 (renderer):** `src/render/` only.
- **A4 (renderer):** `src/render/` only (`geometry.ts`, `map-renderer.ts`, `city.ts` cache, `index.ts`, tests).
- **B (interaction):** `src/play/` only (`pan.ts` and its tests: arrows, wheel, pinch, zoom keys). No main.ts change, because `attachPan` already gets the view and `resetView` already runs at load, Reset and resize.
- **C (ui):** `src/ui/`, `index.html` (the `.targets.many` CSS only), and **`src/main.ts`** (the `onShow` → `centreOn` line; a declared cross-folder edit, as in 024 B).
- **G (grid-simulator):** `src/grid/` only.
- **D1, D2, D3 (grid-simulator):** `tools/` and `package.json` (a `"check": "tsx tools/check.ts"` script only, with no new dependency).

Out of scope for every part: the puzzle files, design notes and `puzzles/locked/` (028 writes maps), and `src/audio/`.

## Order
1. **Part 0** at G1, about an hour. D1 needs it.
2. **A1, G and D1 in parallel**, each about a day; G is about half a day. They touch different folders.
3. **A2** after A1 merges: both edit render and A2's tests use `MIN_SCALE`. **D2** after D1.
4. **A3 and C** after A1 merges. They need `centreOn`, the overflow and the free-area hit rule. They are independent of each other.
5. **A4 (zoom)** after A1 and A2 merge (about a day). It changes the scale that A1's view and A2's city cache depend on. It may run in parallel with A3, but merges after it, so A4's every-level overlay tests cover the edge stars.
6. **B** after A4 merges, because it calls `zoomStep` and `fitWhole`. B may write the arrow keys and its fakes against the interfaces below earlier. About half a day.
7. **D3** after D2.
8. **Josh's first browser check** on `56` in a small window, and on `09`, after A1–A4, B and C.
7. **028 · A tier of large maps (puzzle-designer)** is cut when D1 and D2 are merged, so the designer has the check block and the analyzer. It is ideally cut after D3 too. 028 starts with **one pilot map** (two sections, two feeds) for Josh to play before any tier. Josh's second browser check for 027 runs on that pilot.

Not started without Josh's word: each part's G1 is his.

## Interfaces
`src/core/check.ts` (part 0, written at G1):
```ts
/** "br_1" throws a breaker or switch; "repair:<node or line id>"; "release:<battery>"; "wait:<seconds>"; "undo". */
export type CheckMove = string;
export interface CheckExpect {
  blown?: readonly string[];     // fuseboxes that gained a blown fault
  brownout?: boolean;
  readable?: readonly string[];  // fault ids readable after the moves
  lit?: readonly string[];
  complete?: false;
}
export interface CheckTrap { name: string; moves: readonly CheckMove[]; expect: CheckExpect; recover: readonly CheckMove[] }
export interface CheckSection { id: string; nodes: readonly string[]; parts?: readonly Part[] }
export type CheckStub =
  | { feed: { capacity: number | null } }
  | { lamp: { load: number; must?: boolean } }
  | "cut";
export interface CheckLink { line: string; sides: Readonly<Record<string, CheckStub>> } // section id -> stub seen from that section
export interface PuzzleCheck {
  clickSeconds?: number;          // default 1
  solution: readonly CheckMove[];
  traps?: readonly CheckTrap[];
  sections?: readonly CheckSection[];
  links?: readonly CheckLink[];
}
export function parseCheckBlock(md: string): { ok: true; json: unknown } | { ok: false; error: string } | null;
export function validateCheck(json: unknown, puzzle: Puzzle): { ok: true; check: PuzzleCheck } | { ok: false; errors: readonly string[] };
```

`src/render/` (A1–A3, internal plus the `MapPanView` export):
```ts
export const MIN_SCALE = 36;
export function overflows(bounds: Bounds, fit: Fit, area: Rect, padding: number): { x: boolean; y: boolean };
export function clampPan(pan: Pan, box: Rect, area: Rect, keep?: number, edgePad?: number): Pan; // edge-stop on overflowing axes
export function initialPan(puzzle: Puzzle, width: number, height: number, padding: number, insets?: Insets): Pan;
export function visibleLines(g: Geometry, area: Rect, margin: number): Int32Array;
export function visibleNodes(g: Geometry, area: Rect, margin: number): Int32Array;
export interface MapPanView {
  getPan(): Pan; setPan(x: number, y: number): Pan;
  /** Opening view: openScale, first feed (overflowing) or centred. Load, Reset, resize, Home, double right-click. */
  resetView(): void;
  centreOn(nodeId: string): Pan;
  // A4:
  getScale(): number;
  /** One zoom level in (+1) or out (-1) about canvas point (x, y), default the free area's centre; clamped at the ends. Returns the new scale. */
  zoomStep(dir: 1 | -1, x?: number, y?: number): number;
  /** minZoomScale, map centred: the whole map. */
  fitWhole(): void;
}
// A4:
export const MAX_ZOOM_SCALE = 96;
export const ZOOM_STEP = Math.SQRT2 ** 0.5;      // 2^(1/4)
export const CAPTION_MIN_SCALE = 27;            // Lv captions and place labels hidden below
export function zoomLevels(min: number, open: number, max: number): number[];
export function zoomAbout(bounds: Bounds, width: number, height: number, padding: number, insets: Insets | undefined, pan: Pan, scale: number, px: number, py: number, newScale: number): Pan;
// computeFit/buildGeometry gain an optional explicit `scale` (callers unchanged).
export const WARD = 96, WARD_R = 1024, WARD_SLOTS = 16, WARD_RING_STEP = 160;
export function isLarge(bounds: Bounds): boolean;
export function wardOf(n: number): Vec;
export interface OffscreenMarker { lamp: string; x: number; y: number; angle: number; filled: boolean }
export function offscreenMarkers(g: Geometry, area: Rect, targets: readonly string[], lit: ReadonlySet<string>): OffscreenMarker[];
```
`MapRenderer` is unchanged. `MapPanView` gains `centreOn`, `getScale`, `zoomStep` and `fitWhole`. The play fakes that implement `MapPanView` add stubs; that is a test-only edit in B's folder.

`src/play/pan.ts` (B): `attachPan`'s signature is unchanged. It adds `keydown` handling for the arrows, `+`, `=`, `-`, `F` and `f`, and a `wheel` listener with `{ passive: false }`. New constants: `WHEEL_NOTCH_PX = 100`, `WHEEL_NOTCH_LINES = 3`, `WHEEL_MAX_STEPS = 3` and `PINCH_STEP = 40`.

`src/ui/` (C): `UIDeps` gains `onShow?(lampId: string): void`.

`package.json` (D1): adds the script `"check": "tsx tools/check.ts"`. **No new dependencies** anywhere: `tsx` is already a devDependency.

No event or payload changes. **No puzzle schema change** (the check block lives in the design note).

## GDD check
No Decided rule changes. Capacity, fuses, faults, parts and the win are only read. Draft 5's multi-feed rules are tested at 4 feeds, not changed. *The Relight can't be interrupted* holds: panning, the arrow keys and `centreOn` are view-only. Off-screen markers show targets only, so *faults hide faults* is untouched. `tickets/rules-coverage.md` gains 027 G against the per-feed capacity row.

## Open questions
Questions 1–10 are answered (see "Josh's answers"). They are kept below for the record. New with zoom:

11. **Zoom indicator?** None is cut, since the map itself shows the zoom. Alternatives:
    - a small, quiet `×1.5` / "whole map" badge in a corner of the free area;
    - a small −/⤢/+ button cluster for people without a wheel. That would be a ui part.
12. **Zoom speed and touch:** one wheel notch is a quarter of a doubling (`ZOOM_STEP` ≈ 1.19), and a touchpad pinch zooms in the same steps. Faster or slower? Should a **touch screen** two-finger pinch work too (a further interaction part), or only mouse and touchpad?
13. **Clicks in the whole-map view:** cut so clicks still work, with the nearest node winning where icons overlap and the hover prompt naming it first. Or should the overview be **look-only**, with clicks ignored until you zoom back in?
14. **Overview key:** `F` for the whole map, and Home for the readable opening view. Is `F` right, or would you prefer `0`, `Tab` or the space bar?
15. **Captions in the overview:** cut so Lv captions and place labels hide below 27 px per unit, so the whole map stays legible as a shape. Keep them at every zoom, even if they overlap?

Answered:
1. **How large?** Cut for up to about **64 × 40 units**, about 120 nodes and 2–4 sections. At 36 px per unit that is about 2300 × 1450 px: roughly 1.5 × 2 screens at 1080p. Bigger is supported technically (wards are 96 units), but is that the size you picture?
2. **How many sections, and a hub of several feeds?** Cut for **2–4 sections, usually one feed each**, linked by tie switches, shared cables or a battery. Or do you want a single **hub** with several feeds feeding into a shared middle?
3. **Where should a large map open?** Cut on the **first feed**. Alternatives:
   - the first target, so the priests' ask is the first thing seen;
   - the centre of the map.
4. **Seeing it whole.** The brief asks "does *faults hide faults* work as deduction on a map the player can **see whole**?". A map bigger than the screen can't be seen whole at a readable scale. With no wheel zoom (your call in 022), the options are:
   - accept panning;
   - add a hold-key **overview** that shows the whole map at fit scale while held (a small renderer and interaction follow-up);
   - add wheel zoom after all.
   **Answered: see the big map whole, and add zoom (part A4, B).**
5. **Edge stars:** cut as display-only, with clicking the list entry to centre. Should clicking a star centre its target too? And should readable faults (sparks, blown fuses) also get edge markers, or only targets?
6. **The priests' list by section.** Cut as one list, in two columns past 6 entries. Should it be grouped by section (for example "North ward: shrine, well")? That needs an optional `sections` field in the puzzle file (draft 6), a schema change.
7. **Arrow keys (B):** cut in, as a cheap second way to pan. Drop it?
8. **The ladder:** should large maps **end** the ladder (065 onwards, after the deep tier), or **interleave** (one large map after each tier as its finale)? The city handles either. This shapes 028.
9. **028 pilot first?** Cut so 028 starts with one two-section pilot map for you to play before a tier of 4–6 is designed. Yes?
10. **The puzzle-designer's instructions** (`.claude/agents/puzzle-designer.md`) should say: design large maps in sections, write the check block, and run `npm run check` and `npm run analyze -- --sections`. That file is agent configuration, so you or the main session would update it, not this ticket. Do you want it updated with 028?

## Josh's answers to questions 11-15 (29 Oct 2026)
11. Zoom indicator or -/+ buttons: none, "scroll wheel should be enough".
12. Zoom speed and touch: "not yet, just mouse and touchpad" (no touch-screen pinch).
13. Whole-map view accepts clicks.
14. Whole-map key: F.
15. Captions: hide below 27 px per unit.
