ticket: 027-larger-maps
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
This is the engineering for maps bigger than the screen:
- the opening scale, panning and the ward (A1, A2);
- edge stars (A3);
- discrete zoom with an overview (A4);
- the zoom and pan inputs (B);
- the click-to-centre list (C);
- scale tests (G);
- the design-check block and the tools (0, D1–D3).

This is round 2. It checks the two round-1 must-fix items, fixed in 8030c4a, and looks for regressions in `git diff 573b7bf..8030c4a`.

## Does the branch do it?
Round 1 found every criterion met apart from the two must-fix items. That reasoning is unchanged and is not repeated here. Only 8030c4a is new: 7 files, all in `src/render/` and `src/grid/scale.test.ts`.

On HEAD 8030c4a:
- `npm run typecheck` is clean.
- A full `npx vitest run` passed 54 files and 1049 tests.
- `zoom.test.ts` and `streets.test.ts` run alone also passed.

**Round-1 Must fix 1 (captions hidden at openings in [24, 27)): fixed.**
- `geometry.ts` adds `captionFloor(open) = min(CAPTION_MIN_SCALE, open)`. `captionsShown(scale, floor)` takes the floor, and its default keeps the old behaviour.
- `map-renderer.ts` `rebuildGeometry` sets `capFloor` from `openScale(fitScale(...))` for the current map and window, then `capsOn = captionsShown(sc, capFloor)`. `capsOn` gates the lamp captions, fuse ratings and feed readouts (lines 1185, 1495, 1507, 1873).
- `capFloor` goes through `labelCache.update` into `targetLabels` and `lampMarks`, so place labels and the room reserved for captions follow the same floor.
- The cache key includes `floor`, so a resize that changes the floor forces a recompute.
- The only other `lampMarks` caller is `city.ts:747`. It passes no scale, so it always reserves caption room, as before.
- The overview still hides captions: every level below the opening scale is below the floor.
- **Test:** `zoom.test.ts` "every file in puzzles/ draws its Lv captions, ratings and feed readouts right after resetView()":
  - it runs at 1920×1080, 1920×950 and 1366×768 with insets 220/140, after a `zoomStep(-1)` and `resetView()`;
  - it asserts a lamp caption for every map with lamps and a fuse rating for every map with fuses.
- **I checked that this test fails on the old code.** In a temporary worktree of 573b7bf with only the new `zoom.test.ts` copied in, it fails with `64-the-whole-chain @1920x1080 (scale 26.9) lamp caption: expected false to be true`. That is the round-1 case. The worktree has been removed.
- "captionFloor never exceeds the opening scale, and captionsShown honours it" pins the boundary.

**Round-1 Must fix 2 (slow render tests under load): partly fixed.**
- Done:
  - `{ timeout: 60000 }` on the two `zoom.test.ts` cases that failed in round 1 ("points in the insets return null…", "the renderer draws no Lv caption…");
  - the same on `streets.test.ts` "leave every line's ends…";
  - the unused `small` renderer is removed;
  - the new every-file test gets 300 s.
- Not done: the other six `zoom.test.ts` cases that round 1 listed by name still run on the default 5 s timeout:
  - "no level exceeds MAX_ZOOM_SCALE";
  - "the renderer visits exactly the levels zoomLevels lists";
  - "zoomStep(+1) at the top level…";
  - "a zoom stays inside the edge-stop clamp at every level";
  - "on the 64 x 40 map returns the node itself…";
  - "every shown label lies inside the free area".
- Their times:
  - on a quiet machine today: 1.2–1.6 s;
  - in the full parallel suite today: 2.4–2.8 s;
  - in round 1's loaded run: 3.0–4.7 s.
- Vitest 3.2 fails a synchronous test after the fact when it ran longer than its timeout (`withTimeout`, `now() - startTime >= timeout`). So these six can still turn the gate red on a busy machine, as their two siblings did. See Must fix 1.

**`scale.test.ts` change.**
- It still asserts `createGrid` < 50 ms and `reset` < 50 ms on the 400-node map.
- It now takes the median of 9 runs after one warm-up, instead of one cold sample. This is round-1 could-improve 5, and it is done.
- What it no longer pins is the cold first-call cost. The ticket's G budget doesn't ask for a cold number, so nothing it asserts is lost.

**Regressions.** None found.
- The diff touches only the caption path and tests.
- `captionsShown` defaults keep every pre-existing call and test unchanged; the "captionsShown flips at CAPTION_MIN_SCALE" test still passes.
- The label-cache equality tests still pass with the new key.

## Rule conflicts and risks
- **Purity and folders.** `src/grid/` gains only a test change, and `src/night/` is untouched. The fix stays in `src/render/`. No new dependency.
- **Ticket wording.** The ticket (line 135, and 291 under Interfaces) still says captions are hidden "below `CAPTION_MIN_SCALE = 27`". The code now hides them below `min(27, openScale)`. The architect should record this together with `LEGACY_FLOOR = 24` (Could improve 6).
- **Test name.** The new every-file test's name promises "feed readouts", but it asserts only lamp captions and fuse ratings. The feed readout shares the same `capsOn` gate, so the risk is low (Could improve 7).

## Must fix
1. **Give the remaining six slow `zoom.test.ts` cases an explicit timeout**, as round-1 Must fix 2 asked.
   - Where: `src/render/zoom.test.ts`. Add `{ timeout: 60000 }`, or one describe-level option, to the six cases named above under round-1 Must fix 2. Alternatively, share one synthetic-map renderer per `describe`.
   - Effect: none of the renderer-heavy zoom tests can fail the gate on the 5 s default when the machine is loaded. Two of their siblings already did.
   - This is a six-line change.

## Could improve
1. **Still open.** Arrows step by a third of the canvas, not the free area (`src/play/pan.ts` `areaSize`). Either expose the free area on `MapPanView`, or have the ticket say "a third of the canvas" (it still says free area at line 181).
2. **Still open.** Put `centreOn` on `MapPanView`, as the Interfaces section says, and drop `MapCentre` (`map-renderer.ts:156`).
3. **Still open.** On a map that fits, a list click shoves the map off-centre even when the lamp is in plain view. Consider centring only when the lamp is outside the free area. Ask Josh after he has tried it.
4. **Still open.** The pan view-only test "panning makes no grid call…" can't fail, because its `play` isn't connected to the fake view.
5. **Done** in 8030c4a: the grid timing test now takes a median.
6. **Still open, now wider.** Have the architect record these in the ticket's Decided section and Interfaces:
   - `LEGACY_FLOOR = 24`;
   - the caption floor `min(CAPTION_MIN_SCALE, openScale)`;
   - the "arrows use the canvas" choice.
7. **New, minor.** In the every-file caption test, also assert a feed readout ("using N of M" or the feed caption text) for maps with a feed, so the test checks what its name says.

### What only Josh can judge in a browser
These are unchanged from round 1:
- 56 at about 1100 × 650;
- the 24 px scale jump on resize;
- wheel and pinch feel;
- the `F` overview;
- zoom 96;
- zoom resets;
- the two-column list;
- ward backdrops;
- drag smoothness.

One addition: at 1920 × 950 or 1366 × 768, maps such as 64, 56 and 49 should now open with their Lv captions and fuse ratings visible, then lose them as soon as you zoom out one step.
