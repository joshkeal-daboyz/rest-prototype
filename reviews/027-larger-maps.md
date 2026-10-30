ticket: 027-larger-maps
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
This is the engineering for maps bigger than the screen. The parts are:
- a readable opening scale with edge-stop panning, the opening view on the first feed, `centreOn`, free-area picking, label hiding and culling (A1);
- a city ward for large maps, plus cheap pans (A2);
- edge stars for off-screen targets (A3);
- discrete zoom with a whole-map view, and captions hidden in the overview (A4);
- wheel, pinch, arrow and zoom keys (B);
- a two-column, click-to-centre priests' list (C);
- 4-feed and 400-node simulator tests (G);
- a design-note check block (0), a replay tool (D1), a bounded analyzer (D2) and a per-section analyzer (D3).

Reviewed: the 027 commits only (f9c2ea7, d96d6ad, 23c9da3, 663a99b, 0a45361, 72f037f, 8d112ad, 2fe426d, 7a306ae, 7ac7382, 278b9b5, 570406d). The merges of main, 029 and 030 are left out. On HEAD 570406d:
- `npm run typecheck` is clean.
- My first `npx vitest run` passed 53 files and 1045 tests.
- My second run (verbose, with other processes on the machine) failed 3 tests on 5 s timeouts. See Must fix 2.

## Does the branch do it?
**Part 0.**
- `src/core/check.ts` follows the Interfaces section, plus `parseCheckMove` and `CHECK_CLICK_SECONDS`.
- `src/core/check.test.ts` has one named test for each rejection in the criterion: non-control move, repair with no fault, non-positive wait, trap without recover, node listed twice, node in two sections, uncovered nodes, link not a line or not joining two sections, stub on a wrong side, parts not a multiset match.
- `puzzles/SCHEMA.md` gained "Design checks (ticket 027)". Met.

**A1.**
- Edge-stop clamp, `overflows`, `initialPan`, `centreOn`, free-area `hitTest`/`placeAt`, label hiding, culling and spacing are all tested in `view.test.ts`, as the round-1 A1 review found.
- **The A1 must-fix is fixed in 2fe426d**, with option (c):
  - `openScale(fit)` returns the plain fit at or above `LEGACY_FLOOR = 24`, and `MIN_SCALE` below it.
  - `view.test.ts` "gives every file of puzzles/ exactly today's scale at 1920 x 1080 (the list that changes is empty)" now asserts `changed` equals `[]`.
  - "applies the floor only when the fit is below LEGACY_FLOOR" pins the boundary.
  - "keeps 64-the-whole-chain at its fit of about 26.9" covers the tightest real map.
  - The skips that round 1 objected to (`overflows`, `initialPan` on fitting files) are gone.
  - The fix itself is correct. It has a knock-on effect on A4's caption threshold (Must fix 1).

**A2.**
- `isLarge`, `wardOf`, `regionOf`: the clip in `circuitStreets` is gone (footprint = bounds ± margin).
- `ward.test.ts` covers:
  - the large set;
  - no ward/district overlap for 1–129, no ward/ward overlap for 1–512, no ward containing the hub;
  - whole footprints;
  - small maps unmoved;
  - 024 A3 clearance and connectivity at 36/50/80 on the large maps and the synthetic map;
  - buildings per pan ≤ a map-free window;
  - `footprintLayout` built 0 times on 48 pans.
- Pans no longer re-run `targetLabels` from scratch: `labelcache.ts` is tested as equal to a full recompute at every step of a drag. Met.

**A3.**
- `markers.ts` `offscreenMarkers` is pure.
- `markers.test.ts` covers: one marker per off-screen target, on the 14 px inset edge, on the ray (±1), ≥14 px apart for 5 in one direction and round a corner, and `filled` for lit.
- The renderer draws a filled star for a lit lamp and a hollow one for a dark lamp, and that is tested.
- Markers are recomputed in `rebuildGeometry`, so they follow every pan and zoom. `zoom.test.ts` "at fitWhole there are no off-screen markers; zoomed in there are" covers the zoom levels. Met.

**A4.**
- `zoomLevels`, `minZoomScale`, `zoomAbout` (signature as in Interfaces), `captionsShown`, and `zoomStep`/`fitWhole`/`getScale` on `MapPanView` are all present.
- `zoom.test.ts` has a named test for each bullet:
  - levels;
  - range on the synthetic map and on 09;
  - `zoomAbout` keeps the point or equals `clampPan`;
  - in then out round-trips;
  - `fitWhole` and `resetView`;
  - end-stops;
  - nearest-wins hit-testing at every level, and exact hits from `openScale` up;
  - insets give null at every level;
  - captions;
  - the city at min/open/max for the synthetic map and 56;
  - LRU of 4 with eviction;
  - labels inside the free area at every level;
  - culling at the extremes.
- `centreOn` and `rebuildGeometry` pass the zoomed scale. The A1 review's A4 risk is handled and tested ("centreOn and a refit (setInsets) use the zoomed scale").
- **One exception:** captions are hidden at the opening view of some maps (Must fix 1).

**B.**
- `pan.ts` adds the arrows, `+ = - F f`, and a `{ passive: false }` wheel listener with notch, line and pinch handling.
- Steps are capped at 3, guards match Home, and detach removes the wheel listener.
- Each criterion has a test in `pan.test.ts`.
- The view-only test now also fires the new inputs.
- **Deviation:** arrows step by a third of the canvas `clientWidth`/`clientHeight`, not of the free area. `MapPanView` doesn't expose the insets. On x this is the same in practice: main.ts only sets top and bottom insets. On y it is a third of the full canvas (about 360 px at 1080) rather than a third of the free area (about 240 px). See Could improve 1.

**C.**
- `.targets` toggles `many` past 6 entries.
- `click` and Enter call `deps.onShow(id)`.
- main.ts `onShow` calls `renderer.centreOn(lampId)`, the declared line.
- The CSS is in `index.html`.
- The tests are on the pure helpers (`targetsAreMany`, `isShowKey`, `targetRows` unchanged), not on jsdom. jsdom isn't a dependency and adding it would need a ticket, so the DOM wiring itself is untested. It is three plain lines in `ui/index.ts`. Met in substance (Could improve 3).

**G.**
- `scale.test.ts` covers:
  - the 400-node, 4-feed generated map;
  - the median-of-200 budget (logged);
  - 500 actions then 500 undos returning to `state()`;
  - a 6-fuse cascade, in order;
  - separate pools, nearest by hops with ties, the live meeting line with no load, `over` in file order, loads summing to `load`.
- `grid.ts` was optimised internally, with no `GridState` change.
- `rules-coverage.md` has the 027 G row. Met (already reviewed in 71516a6).

**D1.**
- `tools/check.ts` and `checkrun.ts`; `npm run check` is wired.
- 09 test data passes. A wrong solution fails naming the first differing move.
- Traps report `expect` and recovery.
- The gate scans every note: none has a block yet, which is allowed and tested.
- `clickSeconds` and `wait:` timing are tested on a battery map. Met.

**D2.**
- `tools/analyze.ts` is the `npm run analyze` script, with a default cap of 500 000.
- 06 and 09 match their notes, and the README ladder matches for every map under 300 states.
- `cap: 1000` on 49 gives `exhaustive: false` and `noWinBelow`. Met.

**D3.**
- `--sections` builds a valid v5 sub-puzzle per section, with feed, lamp (target when `must`) and cut stubs, the section's targets and its parts.
- It prints one row per section, and the full-map replay is a composition check.
- If the note has no block, or the block has no `sections`, it exits non-zero.
- The "two copies of 09" test joins them by a shared cable cut on both sides rather than a tie switch. A separate test covers a tie switch with feed and must-lamp stubs. Met.

## Rule conflicts and risks
- **Purity and folders.**
  - `src/grid/` imports only `../core` and itself; it has no DOM or timers. `src/night/` is untouched.
  - Every commit stays in its part's folders: 0 in core and SCHEMA; G in grid; D in tools and package.json scripts; A in render; B in play; C in ui, `index.html` CSS and the one declared main.ts line.
  - No new dependency. `src/audio/` is untouched.
- **The 24/36 scale rule isn't in the ticket.**
  - The ticket still says `scale = clamp(fitScale, MIN_SCALE, MAX_SCALE)` and "MIN_SCALE stays the floor for the opening view". The code now floors only below 24.
  - The lead-architect should amend the ticket and Josh should say yes to it, since it changes a "Decided in this cut" line.
  - It also brings back overlapping hit circles for 1-unit gaps at opening scales from 24 to 36. Nearest-wins handles that.
- **Captions at the opening view.**
  - `CAPTION_MIN_SCALE = 27` was set as "¾ of MIN_SCALE" on the assumption that nothing opens below 36. With the 24 floor, maps that open between 24 and 27 lose their Lv captions, the feed's "using N of M" readout and the fuse ratings at their opening view.
  - With insets 220/140 I measured:
    - **1920 × 1080:** 64-the-whole-chain (26.9).
    - **1920 × 950** (a maximised browser): 35, 40, 43, 48, 49, 55, 56 (24.3–26.4).
    - **1366 × 768:** 15, 19, 23, 24, 37, 62.
  - Before 027 all of these drew their captions. → Must fix 1.
- **Flaky tests (suspects, by evidence).**
  - Vitest's default timeout is 5 s. Several new `zoom.test.ts` cases take 3.0–4.7 s on a quiet machine and have no explicit timeout:
    - "captions > the renderer draws no Lv caption…": 3.6 s quiet, **6.7 s, failed**;
    - "hit-testing > points in the insets return null at every level": 3.6 s quiet, **5.9 s, failed**;
    - "hit-testing > … at every level; exactly it from the opening scale up": 3.3–3.9 s;
    - "zoom range > the renderer visits exactly the levels zoomLevels lists": 4.5 s;
    - "zoom range > no level exceeds MAX_ZOOM_SCALE": 3.7 s;
    - "view methods > a zoom stays inside the edge-stop clamp at every level": 3.1–4.1 s;
    - "view methods > zoomStep(+1) at the top level…": 3.0 s;
    - "overlays > every shown label lies inside the free area": 3.6 s.
  - `streets.test.ts` "footprint buildings > leave every line's ends…" (pre-027, but the file was edited in A2) also hit 5.0 s and failed.
  - The cost is mostly `createMapRenderer` on the synthetic map building a footprint layout per level. → Must fix 2.
  - `src/grid/scale.test.ts` "the starting settle and a full reset are also cheap (under 50 ms each)" asserts one cold, single-sample wall-clock time. It's generous, but it is the one timing test without a median.
  - I found no order-dependent test. `layoutStats` is a module counter, but every test that reads it takes a delta and uses a fresh or otherwise untouched puzzle object.
- **Worktree note.** While I was reviewing, an untracked `src/render/wholefit.test.ts` (not on the branch) appeared in `D:\rp-027`. Something else was writing to this worktree at the same time, which also explains the load. I didn't touch it. Whoever owns it should commit it or remove it before anything is merged from this worktree.

## Must fix
1. **The opening view must always draw its captions.**
   - Today, in `src/render/geometry.ts` (`captionsShown`), `map-renderer.ts` (`capsOn = captionsShown(sc)`) and `places.ts` (`targetLabels` and `lampMarks`), any opening scale in [24, 27) hides:
     - every Lv caption;
     - the feed readout;
     - the fuse ratings;
     - every place label.
   - 64-the-whole-chain does this at 1920 × 1080; 7 maps do it in a maximised 1920 × 950 browser.
   - This breaks the ticket's "MIN_SCALE stays the floor for the opening view; [below it] is the overview, and the player chooses it" and "At full size, every map opens exactly as before".
   - **Fix:** hide captions only below `min(CAPTION_MIN_SCALE, openScale)` of the current map/window. The renderer knows `openScale`; pass the threshold into `targetLabels`/`lampMarks` the same way as the scale. Alternatively, the architect sets `LEGACY_FLOOR ≥ CAPTION_MIN_SCALE`, but that makes 64 overflow at 1080.
   - **Test:** a `zoom.test.ts` case asserting that every file in `puzzles/` at 1920 × 1080 and 1920 × 950 (insets 220/140) draws its Lv captions at `resetView()`.
2. **Make the new heavy render tests safe under load.**
   - The gate failed 3 tests on 5 s timeouts in one of my two runs. Two builders also saw a one-off failure.
   - **Fix:** give the slow `src/render/zoom.test.ts` cases listed above an explicit `{ timeout: 60000 }`, as `ward.test.ts` and `places.test.ts` already do. Or share one synthetic-map renderer per `describe`. Do the same for `streets.test.ts` "leave every line's ends…".
   - The "captions > the renderer draws…" case also builds a `small` renderer that it only checks for `getScale() > 0`. Remove it.
   - **Effect:** `npm run gate` stays green on a loaded machine.

## Could improve
1. **Arrow step.** Arrows step by a third of the canvas, not the free area (`src/play/pan.ts` `areaSize`). Either expose the free area on `MapPanView` (a renderer + play change), or have the ticket say "a third of the canvas". The test's fake calls the canvas size "free area", so it would pass either way.
2. **`centreOn` placement.** Put `centreOn` on `MapPanView`, as the Interfaces section says, and drop `MapCentre`. This was round-1 A1 could-improve 1, and it is still open.
3. **List clicks on fitting maps.** On a map that fits, clicking a list entry now shoves the whole map off-centre, by up to the `PAN_KEEP` clamp, even when the lamp is already in plain view. Consider centring only when the lamp is outside the free area, or only on an overflowing map. Ask Josh after he has tried it.
4. **Pan view-only test.** The 022/027 test "panning makes no grid call…" builds a `play` that the fake view isn't connected to, so it can't fail. A real check would spy on `grid`'s methods through the fake `view` path, or drop the claim.
5. **Grid timing test.** In `scale.test.ts`, take the median of several `createGrid`/`reset` runs rather than one cold sample.
6. **Ticket record.** Have the architect record `LEGACY_FLOOR = 24` and the "arrows use the canvas" choice in the ticket's Decided section and Interfaces, so 028's designer and the next reviewer read the same rule.

### What only Josh can judge in a browser
- 56 at about 1100 × 650: readable, opens on the feed, stops at each edge with a small margin, Home returns, edge stars filled or hollow, list click centres, no clicks through the HUD or parts panel.
- The scale jump at the 24 px boundary: resizing a window across it switches the opening scale from about 24 to 36.
- Wheel feel: does one notch give one level on his mouse and browser? This matters most at Windows display scaling other than 100% and in Firefox. Do small touchpad scrolls add up sensibly? Does a pinch zoom the map and never the page?
- `F`: is the whole-map overview legible as a shape with captions hidden? Does hovering name each element? Do clicks on overlapping clusters hit the node nearest the pointer?
- Zoomed all the way in (96): nothing clipped, and buildings clear the wires.
- Zoom resets on pick, Reset and resize; Undo leaves it alone; zoom during the Relight.
- Two-column list layout with more than 6 targets, and whether the HUD stays short.
- 56's backdrop now in a ward: whole, with no ring road through the wiring. 33, 55 and 59 also change backdrop.
- Smoothness of a drag on a large map: the label cache and city repaint cost.
