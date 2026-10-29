ticket: 026-buildings-focus
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A (renderer): put each lamp's building in a free slot right beside its own lamp. Search a 0.1-unit grid, ranked by edge distance, own lamp first, kept clear of wires, nodes, captions and stars. Make lamps smaller (7/6 px bulbs, hit radius never below 18) and make places brighter and fuller. B (ui): hovering any lamp, street lights included, highlights its "Priests want lit" entry. Any other circuit element highlights nothing.

## Does the branch do it?
I ran the gate on the merged branch (2da57d5): `npm run typecheck` is clean and `npm test` passes 805 tests in 43 files. Most of the new tests are in `src/render/focus.test.ts`, and `placeHighlight` gains four new cases.

**A: near its own lamp.** `focus.test.ts` "is nearer to its own lamp than any other…" walks every open map at 30/50/80 px per unit. For each non-pool, non-streetlight place it asserts:
- no other lamp's centre is nearer by edge distance;
- every non-gate place is ≤ 60 px from its lamp;
- the median gap is ≤ 30 px and p90 is ≤ 40 px;
- pools are ≤ 1 % of non-streetlight lamps.

These are the ticket's statistics, measured from `puzzle.nodes` positions and `placeParts`, not from layout internals.

**A: the free slot.** `freeCandidates` in `city.ts` follows the ticket:
- the grid is ±3 units in 0.1 steps, relative to the lamp;
- `row3` is tried both along x and along y;
- candidates are sorted by `pointBoxDistance`, ties broken by dy, then dx, then orientation;
- the A3 lot slots come after as the fallback, then the pool.

The constructed tests check the lone shrine at 50 px (≤ 36 px, clear of the wire, the caption and the star, measured independently in px) and the two lamps 3 units apart at three scales.

**Pass order (builder's note).** Pass 0 tries the free candidates and then the lots, each filtered by "not nearer another lamp". Pass 1 repeats both without the filter. So a lot slot that is nearest its own lamp beats a free candidate that is nearer another lamp. The ticket's wording ("a second pass … only if the first finds nothing") allows either reading. This one serves the Goal ("nearer to it than to any other lamp"), so I accept it.

**A: clear of the circuit.** The new test builds its wire samples from `puzzle.lines`, `puzzle.decor` and `feedLanes`, not from `layout.streets` (could-improve 7 of 024). It samples every 2 px at 30/50/80 and checks buildings and places against `WIRE_CLEAR_PX` and `nodeClearPx`. Labels against wires are still covered by the existing `town.test.ts` "keeps every shown label WIRE_CLEAR_PX from every wire sample…", which passes.

**A: clear of captions and stars.** Checked at 15/30/45/70/120 px per unit over every open map, against every lamp's `lampMarks`.

Builder's notes on this criterion:
- **Gates also clear captions and stars.** Gate posts go through the same `fits()`. The criterion says "no place overlaps", and gates are places, so this follows from the ticket.
- **The star box is reserved for every lamp, not only targets.** This matches what `targetLabels` already did ("the boxes `targetLabels` already uses"), so it is the ticket's rule.

**A: labels.** `focus.test.ts` "labels at the new sizes" checks every shown label at 1920 × 1080 and 400 × 700 with insets. Each must be inside the free area and clear of every lamp's caption and star, and at most 1 label per map may be hidden at 1920. The 024 tests with pans to the clamp extremes still pass. The `places.test.ts` label test now checks against all lamps (could-improve 11).

**A: smaller lamps.** `focus.test.ts` "smaller lamps" checks:
- the bulb and cluster radii;
- that load still shows (area and radius);
- `hitR ≥ 18`, `nodeClearPx ≥ hitR + 2` and `≥ cr + 8` for loads 1–5;
- a hit at cr + 1 px, along both axes;
- the caption and star box sizes.

The code matches the ticket's table:
- `load.ts`: `bulbRadius` and the `poolAlpha` cap of 0.4;
- `geometry.ts`: only the `hitR` formula changed;
- `city.ts`: `nodeClearPx`;
- `map-renderer.ts`: every ring, pool, caption, star, X and flicker value, and `br = bulbRadius(load)` as the single source. The 3 px `CITY_BG` outline is drawn with `strokeText` before `fillText`.

**A: colours.** `town.test.ts` contrast tests check that `CITY_PLACE_FILL` is 2.0–2.4 against `CITY_BG`, ≥ 1.9 against `CITY_BUILDING`, and below `#4a586f`. They also check the edge rules and that the background town stays ≤ 1.6. The glow test pins `glowRadiusPx = max(2.2·h, 32)` at five values and `POOL_PX === 28`. `GLOW_MAX` is 0.5 and `LIT_FILL_ALPHA` is 0.5, each tested ≤ 0.5. The plans fill their box as specified (cross 0.9, water ring 0.6 with a 3 px stroke drawn inside the box, mill 0.6), and the "fuller plans" test checks this. The "never bigger than lot size" test covers Josh's answer 2.

**A: unchanged.** These existing tests still pass:
- `placeShapes` gives ten signatures;
- `glowTarget`/`easeGlow`;
- hub-and-spoke and calm blocks;
- determinism.

`placeAtPoint` inside / just outside is restored in `focus.test.ts` (could-improve 8).

**A: changed existing tests.** Each one checked against the ticket:
- **`city.test.ts`**:
  - The 1.6 cap now covers only `CITY_BUILDING`, `CITY_STREET_LINE` and `CITY_AVENUE_COLOUR`. The ticket replaces the cap for places.
  - `LIT_FILL_ALPHA ≤ 0.35` becomes `≤ 0.5`, which the ticket lists.
- **`town.test.ts`**:
  - Fill against building goes from ≥ 1.25 to ≥ 1.9, which is stronger.
  - The place 1.6 cap is replaced by the 2.0–2.4 band, the `NODE_DEAD` bound and a new edge test.
  - `GLOW_MAX ≤ 0.3` / `LIT ≤ 0.3` become ≤ 0.5.
  - The glow floor goes from 28 to 32 and `POOL_PX` from 36 to 28.
  - All of these are listed replacements.
- **`readable-failures.test.ts`**: `hitR > 18` becomes `≥ 18`, as the ticket says. The "outer bulb edge > 18" line becomes "outer bulb edge ≤ hitR", which now proves the outer bulb is inside the hit disc. That is the right replacement. The other asserts are unchanged.
- **`places.test.ts`**: the inline old-size caption and star boxes are replaced by `lampMarks`, checked against every lamp. That is stronger, and `lampMarks`' own sizes are pinned independently in `focus.test.ts`.

No test was weakened beyond what the ticket replaces.

**B.** `placeHighlight(hit, lampIds, placeLamp)` in `src/ui/logic.ts` returns the lamp if `hit` is in `lampIds`, `null` for any other hit, and `placeLamp` when nothing is hit. `logic.test.ts` covers:
- the lantern highlighting itself;
- a hit lamp beating another `placeLamp`;
- all seven non-lamp element kinds, plus line ids, giving null;
- no hit giving `placeLamp`, including null;
- the given set being used, not a fixed list.

In `src/main.ts`, `lampIds` is built from `entry.puzzle.nodes` inside the per-map open block and passed with `renderer.hitTest(x, y)` and `renderer.placeAt(x, y)`. No game rule is in `main.ts`. Clicks are untouched.

**Josh in the browser.** Still to do, by eye.

## Rule conflicts and risks
- **Folders.** A touches only `src/render/`. B touches `src/ui/logic.ts`, `src/ui/logic.test.ts` and the declared `src/main.ts` edit. `src/grid/`, `src/night/`, `src/core/`, `puzzles/` and `package.json` are untouched, and there are no new dependencies. The 3D port is unaffected.
- **GDD.** No rule is changed. Lit, brownout and Relight are only read. `hitTestGeometry` is unchanged, and no lamp's hit radius goes below 18.
- **2 ms frame budget.** It holds:
  - `footprintLayout` is cached per puzzle, scale and origin.
  - Pan calls `rebuildGeometry → rebuildCity`, but the scale is the same, so it hits the cache.
  - Per-frame drawing is unchanged (one layer `drawImage`, sprites, labels).
- **Layout cost.** I timed it with vite-node on this machine. A real-scale layout costs about 11–25 ms per map (`54-whole-ward` is 16 ms at 50 px and 25 ms at 30 px), which agrees with the builder's ~13 ms. It runs only on load and on scale change, so on resize it runs once per resize event. That is a small hitch while resizing, not per frame.
  - The renderer also builds a throwaway layout at scale 1 (`map-renderer.ts:319`, existing code) to size its arrays. At scale 1 every free candidate fails, so that call now costs about 40–75 ms per map load.
- **Circular import.** `city.ts` now imports `LABEL_GAP_PX`/`lampMarks` from `places.ts`, which imports from `city.ts`. It works because both are used only inside function bodies. A top-level use would break it.
- **The ticket's own numbers** put the highlight ring (cr + 8 = 20 px for loads 2–3) exactly at `nodeClearPx` (20). Its 1.5 px stroke can graze a building edge by under 1 px. This is the ticket's arithmetic, not a builder error.

## Must fix
none

## Could improve
1. `src/render/map-renderer.ts:319`: the scale-1 `footprintLayout` call only sizes arrays. It now scans every free candidate for every lamp and fails each one (~40–75 ms on load). Size `nPlaces` from the lamp count instead, or skip the free search at that call.
2. `src/render/city.ts` `freeCandidates`: the sorted candidate list depends only on the slot kind, not on the lamp, because offsets are lamp-relative. Cache it once per kind. This removes a 3,721–7,442-element sort per lamp per rebuild.
3. Move `lampMarks`, `LABEL_GAP_PX` and the caption/star constants to a leaf module (e.g. `labels.ts`) to break the `city.ts` ↔ `places.ts` cycle.
4. `town.test.ts` "gives a place a visible edge": "lighter" is tested by comparing the packed hex integer, which is mostly the red channel. Compare relative luminance (the helper behind `contrastRatio`) instead.
5. Rename two stale test titles:
   - `readable-failures.test.ts` "hits on the outer bulb, which a flat 18 px would miss": a flat 18 px no longer misses.
   - `town.test.ts` "…in a lot slot of the kind's size…": places are no longer in lot slots, and the test checks sizes only.
6. `map-renderer.ts`: the flare's inner disc changed from `cr + 14·(1−f)` to `cr + 8·(1−f)`, which the ticket's table doesn't list. It is consistent with the shrink, but should be mentioned to Josh.
