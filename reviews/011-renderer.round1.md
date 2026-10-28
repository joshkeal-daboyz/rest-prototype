ticket: 011-readable-failures (renderer: B, B1, B2, E)
assessment: partly
must-fix: 1

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 1.*

## What the ticket asked for, as I understood it
For `src/render/`: a readable blown fuse should look snapped and scorched, with its `≤rating` in the alarm colour and a pop about twice as big as before. A lamp's load should show as bulb count, size and brightness (1×/2×/3×, capped). The feed, fuse and lamps should all use the unit word `load`. A readable dead junction should be drawn as a box with one broken stub per part, and every readable fault should give off its own signal while unreadable faults show nothing. The map fit should leave room for a top HUD inset. Finally, `notify(fuse:blown)` should play a shock along `path` to the culprit, then the pop, and only then the broken look, with the timing in a pure tested module and preallocated slots.

## Does the branch do it?
- **Tests:** `npm test` passes, 164/164, including 13 new tests in `src/render/readable-failures.test.ts`. `npm run typecheck` shows only the two known errors: `src/grid/grid.ts:157` (part D) and the fake renderer in `src/play/play.test.ts:24`, which lacks `setInsets` and `notify`. The scratch worktree has been removed.
- **B, broken fuse:** met. In `map-renderer.ts`, under `case "fusebox"` with the `broken` branch, a readable `K_FUSE` gets a scorch disc, two snapped bar halves with curled ends in `ALARM`, and the `≤rating` label in `ALARM` at `FONT_BIG`. It no longer gets the old X.
- **B, bigger pop:** met. The ring grows to 16+70 px against the old 20+26, and 18 sparks reach up to about 150 px (`drawSequences`).
- **B, lamp load:** met. `load.ts` is pure and gives 1, 2 or 3 bulbs (radius 14 alone, 11 in a cluster) and a `load N` caption under the cluster.
  - Brightness: `brightness` is 1/2/3. `poolAlpha` scales the three pool discs 1×/2×/3× and caps them at 0.55. `poolRadiusScale` gives 1/1.6/2.2×. Lit bulbs get a hotter core, `min(0.25·nb, 0.8)`.
  - Dark state: a bigger, dim footprint, `cr+10` at alpha `0.05+0.02·nb`.
  - Cap: `LOAD_CAP = 3`, so a load-5 lamp looks like a load-3 lamp.
  - Tests cover count, area, the 1/2/3 curve, the caps and the alpha scaling.
- **B, unit word `load`:** **not met** (Must fix 1).
  - The lamp caption says `load 3`.
  - The feed readout is still `${load} / ${capacity}` (`feedLabel`, near the end of `draw`) and never says `load`.
  - The fuse label is a bare `≤1`.
  - The criterion says the feed's readout and the fuse's `≤1` use the same unit word so that `≤1` reads as "carries load 1". Right now only the lamps carry the word.
  - On the question of whether a `≤rating` without `load` is acceptable: a bare `≤1` would be defensible if the feed said `load 3 / 4` next to it, since the ticket's own notice and hover strings (*a ≤1 fuse*, *Fuse ≤1 — carrying 3*) use a bare `≤1`. With the feed also wordless, nothing on the map ties `≤1` to load except the lamp captions.
- **B1, dead junction:** met.
  - A readable `K_JUNCTION` draws a box plus `junctionStubs = FAULT_RULES["dead-junction"].count` broken stubs (2, taken from the rules rather than hard-coded). Each stub has a gap and a char dot.
  - A healthy or unreadable junction stays the plain dot.
  - The fizz is hash-gated at 9 Hz and `>0.55`, one small arc per stub, quieter than a cable spark.
  - A readable blown fuse buzzes: a 14 Hz gated flicker across the snapped ends.
  - A readable dead lamp keeps its X and adds a red socket flicker.
  - Every signal is gated on `readableNode[i] === 1`, so unreadable faults show nothing. The buzz and fizz are also gated on `live`, which only adds relight-arrival timing, because readable means powered (`grid.ts` ~197).
  - "One gap per part" is only needed for junctions: every other rule has count 1.
- **B2, insets:** met in the renderer. `computeFit` and `buildGeometry` take optional `Insets` and fit into what remains. `createMapRenderer(canvas, puzzle, opts?)` plus `setInsets()` refits and rebuilds any active shock paths. The tests check every node stays inside top/right/bottom/left plus padding at three sizes, and that no insets equals `{}`.
- **E, shock then blow:** met in the renderer.
  - `shock.ts` is pure and allocation-free: phases, `fuseIntact`, `popFraction`, `pointAlong`, `sliceVertices`. Tests cover phase order, the fuse staying intact until the pop, the no-path case (pop at once), and polyline maths round a corner.
  - Preallocated slots: there are 4 (`SLOTS = 4`), all typed arrays, plus preallocated `ptX`/`ptY`/`sliceOut`/`headOut`.
  - `notify` only records the slot. Its start is NaN until the next frame stamps it, so the age is measured on the draw clock.
  - The fuse is held intact through `holdIntact` while `fuseIntact(age)` is true, then the pop plays over the broken look.
  - Without a notify, a fresh blow still starts a pop-only slot, as before.
  - A slot is freed if the fault disappears (undo or repair) or the sequence ends.
- **No allocations in the draw loop:** verified across the whole diff.
  - Event-time and resize only: `notify` (the `for…of` over `path`) and `setInsets`.
  - Writes into scratch arrays: `bulbOffsets`, `sliceVertices`, `pointAlong`.
  - No template literals or closures were added to per-frame code. `feedLabel` is rebuilt only when it changes.
- **Imports:** `../core` (the `FAULT_RULES` value plus types) and `import type` from `../grid`. That is fine.
- **Wiring:** `src/main.ts` does not yet call `setInsets` or forward `fuse:blown` to `notify`. It is outside this ticket's folders, but until it does, B2 and the shock do not appear in the game. Only the pop-only fallback runs.

## Rule conflicts and risks
- No hard-rule breaks. Only `src/render/` is touched, there are no new dependencies, and the pure folders are untouched.
- `main.ts` wiring is outstanding (see above). Whoever owns it must pass the HUD's top inset and forward `fuse:blown`, or Josh will see neither B2 nor E.
- `play.test.ts` needs `setInsets`/`notify` stubs on the fake renderer (known; the interaction agent is adding them).

## Must fix
1. **`src/render/map-renderer.ts`: put the unit word `load` on the feed readout and the fuse rating** (B: "The feed's readout and the fuse's ≤1 use the same unit word (load)"). For example, build `feedLabel` as `load ${state.load} / ${cap}` (it is already rebuilt only on change, so no per-frame allocation). For the fuse, either `ratingLabel` as `≤1 load` / `load ≤1`, or leave `≤1` bare if Josh prefers, as long as the feed carries the word. Expected effect: the `≤1` beside the box reads as a load number, matching the lamp captions.

## Could improve
1. `NODE_HIT_RADIUS = 18` (`geometry.ts`) is smaller than a load-3 cluster's `clusterRadius` of 22. Hovering the outer bulbs of the mill misses, which matters for part C's *Lamp, load 3*. A per-node hit radius, or `max(18, clusterRadius + 4)` for lamps, would fix it.
2. In `drawLamp`, `const br = nb === 1 ? 14 : 11` duplicates `bulbRadius(load)` from `load.ts`. Using the function keeps size and offsets in one place.
3. The junction stubs are drawn at fixed angles (left and right), not along the junction's actual lines. On a vertical run they will stick out sideways from the wires. Josh checks the look; aiming the stubs along `fromIdx`/`toIdx` directions would read better.
4. `lineCap = "round"` and `lineJoin = "round"` set in the fusebox, junction and shock code are not reset, so later strokes in the same frame inherit them. They are only reset at the top of `draw` for decor. This is harmless today, but worth a reset or save/restore around those blocks.
5. In the pop-spark loop, `e0` and `e1` don't depend on `k`. Hoist them out of the loop (trivial).
6. Export the `Insets` type from `src/render/index.ts` so `main.ts` can type its inset object.

## Main session's response
agree on the must-fix; also applying could-improve 1 (the hover miss on a load-3 lamp would be the first thing Josh hits) and 6 (needed for the wiring). 3 (stub angles) is for Josh's eye after he sees it; 2, 4, 5 join ticket 006's housekeeping.
