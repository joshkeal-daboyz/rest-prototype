ticket: 023-city-backdrop
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A dim, top-down, procedurally generated city under every map: one shared city (hub and spokes, map 01 on the town square, others in ladder runs along 8 avenues), placed from the map id alone, with one "place" beside each lamp that glows when the lamp is in `state.lit` (dark in brownout, staged by the Relight's `nodeArrive`). It is drawn first, through the same pan-aware `Fit`, from an offscreen cache, in `src/render/` only.

## Does the branch do it?
Reviewed only `fde80ed` on top of 022 A (`4743bc7`): `src/render/city.ts`, `src/render/city.test.ts`, `src/render/map-renderer.ts`. On the branch, `npm run typecheck` is clean and `npm test` gives 36 files and 671 tests passing. `city.test.ts` adds 27 tests, and no existing test file is edited.

**Vitest / pure module.** `city.ts` imports only types from `../core`, `../grid` and `./geometry`. It uses no DOM, canvas or timers.
- *One city:* "is deterministic" and "gives identical buildings where rects overlap". Cells are `hash(CITY_SEED, cx, cy)` (`cellBuildings`), cached in a module `Map`.
- *Ladder number:* "reads the leading digits" covers 07, `locked/07`, 56 and `lamp-row` → null.
- *District layout:*
  - Map 01 on the hub: "puts map 01 on the hub".
  - Distinct and non-overlapping over 1..128: the pairwise test.
  - Neighbours adjacent: the step test, with an edge on axis spokes and a corner on diagonals.
  - Runs (2–9, 10, 58, 64, 65, 66): "runs 8 maps per spoke".
  - Hub reachable from every spoke: the centre-on-ray test, the slot-0 square clear of 01, its nearest point between `HUB_R` and `R0`, and `onAvenue` true from `HUB_R` to the far end of slot 7.
  - No buildings on avenues, and the town square is built: one test that checks building centres and also their corners.
  - `districtOf` matches the cut formula, including `slot = k%8 + 8*floor(k/64)`.
- *Map origins:* run over every map file in `puzzles/` and `puzzles/locked/`. Whole cells, centre within half a cell, bounds inside the district. Locked copies get the same origin. An unnumbered id lands in 65..128 and stays stable.
- *Neighbouring maps share streets:* 07/08 and 01/02, through `cityForMap` from each side, equal to `cityCells(strip)`.
- *Places:* one per lamp, in `nodes` order, ≥ 0.6 from every node, no overlaps, over every open map. There is also a side-with-fewest-lines check.
- *Filtering:* no building within 0.6 of a node and none overlapping a place, over every open map.
- *Linking:* nearest lamp, exact tie goes to the earlier lamp, and a building beside the breaker does not link. The code filters on `type === "lamp"`.
- *Glow:* lit → 1. Brownout → 0 for every lamp, even ones in `lit`. Relight → 0 before `nodeArrive` and 1 at or after it, using `planRelight` on 08-shrine-circuit.
- *Easing:* reaches the target in 0.25 s, no overshoot, dt 0 is a no-op.
- *Contrast:* building, street, avenue, place and place-edge colours are all ≤ 1.6 against `#0b0f17`. Fill alpha is 0.33, and the halo alphas sum to 0.19.

**Renderer code.**
- `createMapRenderer` computes `mapOrigin(puzzle.id, mapBounds)` once.
- `rebuildCity()` runs at the end of `rebuildGeometry()`, so it reruns on resize, insets and `setPan`.
  - It filters buildings for the visible rect plus one cell.
  - It precomputes screen rects for places and linked buildings.
  - It paints the dark layer once to an `OffscreenCanvas` (or a detached canvas, or draws directly as a fallback), sized at devicePixelRatio with `setTransform(dpr…)`.
- `drawCity` replaces the old background clear as the first layer of `draw`.
  - It eases each place's glow with `t` in seconds (`main.ts` passes `now / 1000`), and snaps on the first frame.
  - During the Relight it reads `rp.nodeArrive[nodeIndex]`. That is the same plan and indexing the lamps use, so places come on with their lamps.
  - It blits the layer, then draws warm fill plus 3 stacked halo rects per lit place, and half strength for linked buildings. No gradients.
- Every screen position uses `geo.fit` (`mx*scale + offsetX`), which carries 022's pan.
- The `MapRenderer` and `MapPanView` interfaces are unchanged. `main.ts` and the hit-testing code are untouched.

**Browser checks (Josh).** Not mine to judge. On the paths the builder could not check:
- *Pan:* the city is rebuilt inside `rebuildGeometry`, which `setPan` calls, and everything goes through the same `Fit`. It should move exactly with the circuit.
- *Relight:* the wiring is right by reading, and `glowTarget` is tested against a real plan. The renderer loop itself is untested, which is normal for this folder.
- *Brownout:* `glowTarget` returns 0 on `state.brownout` before it looks at `lit`, and that is tested.
- *High-DPI:* the layer is allocated at device pixels and drawn back at CSS size. That is correct as long as the main context is dpr-scaled, which the existing renderer already does.

**2 ms budget.** Credible, though not measured in a test.
- Per frame the cost is one full-canvas `drawImage`, plus up to 4 rects per lit place and linked building. That is tens of rects on map 56.
- The heavy work (cell generation, node/place filtering, a few hundred `fillRect`s) runs only on resize or pan. At 1920×1080 that is roughly 150–250 cells.
- During a right-drag it runs once per pointer move. It is cheap but allocating, so Josh's "panning stays smooth" check on 56 is the real test.

## Rule conflicts and risks
- No hard rule broken.
  - Only `src/render/` is touched (`git diff --stat` shows the three files). No change to `src/grid/`, `src/night/`, `src/core/`, `puzzles/`, `package.json`, `index.html` or `main.ts`.
  - No assets and no dependencies.
- No GDD rule changed. `state.lit` and `state.brownout` are only read, and the Relight timing is the cascade's own.
- Risk: `CITY_BG` in `city.ts` duplicates `BG` in `map-renderer.ts`. If `BG` changes, the contrast test keeps passing against the stale value.
- Risk: a right-drag rebuilds the offscreen layer on every pointer move. That is fine at today's map sizes, but it is the one place the per-frame budget could slip on a slow machine.

## Must fix
none

## Could improve
1. `src/render/city.test.ts` / `map-renderer.ts`: export `BG` (or import `CITY_BG` into the renderer as its background) so the contrast test checks the colour actually cleared to.
2. `city.test.ts` linking test: put a building within `CITY_LINK_R` of the junction `j1` and of `feed`, so "never links to other parts" is exercised for more than the breaker.
3. `city.test.ts` brownout: use a real over-capacity state of `03-not-enough-for-all` instead of a hand-built `{ brownout: true }` stub, as the ticket's "brownout fixture" suggests.
4. Optional: a short Vitest timing check of `cityForMap` + `linkBuildings` for 56 at a 1920×1080 fit, to put a number on the pan-rebuild cost.
