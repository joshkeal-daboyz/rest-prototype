ticket: 081-F0-perf-breakdown
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section F0 of ticket 081: the dev `perf=1` log in `src/render3d/cityview.ts` adds draw calls and triangles in view per family, the median whole-frame interval, the canvas size and the pixel ratio. A dev-only `dpr=N` switch sets the pixel ratio the view renders at, so M1 can compare the native ratio with 1x for F-Q2. No tests (a dev log).

## Does the branch do it?
The branch's own work is one commit, f96dde2, and it touches only `src/render3d/cityview.ts`. The rest of `git diff origin/main...HEAD` is the section F ticket cut and earlier review files from the parent ticket branch, not this builder's work. `npm run typecheck` exits 0. The branch adds no tests, which matches "Count. 0 tests".

1. **Per family: met.** `perfFamilies()` maps the roots to family names: street tiles, interior, building pieces (every group in `city.buildings.groups`), grey boxes, dressing, furniture+traffic, era adds, circuit (both `city.circuit` and the puzzle `circuit`), lit shop glass and live layer. Anything else is "other". It walks the scene and skips invisible subtrees. It counts an object when its bounding sphere meets the camera frustum (the instancer's own sphere for an `InstancedMesh`, the geometry's sphere otherwise). Triangles are the index count (or position count) / 3, times the instance count. It prints the families and a sum on the line after `gl.info.render`. In the main session's M1 log the families add up to 4,135 calls against `gl.info` 4,124, so the gap is small and shows, as the criterion asks. Grey boxes and era adds are absent from that log, which is right: those subtrees are hidden or not built on that run.
2. **The whole frame: met.** `perfGap` records `t0 - perfLastStart` on each `draw` call over the same 300-frame window. The second log line prints its median, `canvas.width x canvas.height` and `gl.getPixelRatio()`.
3. **`dpr=N`: not met.** The regex at `cityview.ts:537` has lost its backslashes:
   ```ts
   /[?&]dpr=(d+(?:.d+)?)(&|$)/
   ```
   Here `d+` matches the letter "d", not a digit, so `?dpr=1` and `?dpr=1.5` never match. `devDpr` is always null, and `dpr` falls back to `opts.dpr`. The wiring after it is right: `gl.setPixelRatio(dpr)` in `resize()`, `createOverlayLayer(canvas, document, dpr)` and `paintOverlay(..., Math.min(Math.max(dpr, 1), 2), ...)`. The overlay clamps the same way as `createOverlayLayer` (line 406), so the overlay stays consistent with the renderer once the parse works. This explains the main session's finding exactly: with `&dpr=1` the log still said "pixel ratio 1.5" (`docs/design/081-F-measurements.md`, second M1 row).
4. **The builder's two logs: can't tell from the branch.** This criterion is about the builder's report, which I don't read. The measurements note has only the before-power run ("The after-Relight run was not taken").

## Rule conflicts and risks
- No purity issue: nothing in `src/grid/` or `src/night/` changes. The file stays inside the ticket's list, adds no dependency and changes no GDD rule.
- Everything new is gated on `import.meta.env.DEV`, through the existing `perf` flag and the `devDpr` ternary. The `gap` subtraction runs on every draw but costs nothing when `perf` is off.
- M1's `dpr=1` row in `docs/design/081-F-measurements.md` was not taken at 1x, so it does not measure the pixel ratio. That row also ran at a different window size (1930 x 1767 against 775 x 1765). The note's reading that the frame is draw-call bound still rests on that 2.5x pixel difference, so it is fair evidence. But F-Q2's condition ("only if `dpr=1` saves more than 2 ms") has not been measured as written.

## Must fix
1. `src/render3d/cityview.ts:537`: restore the escapes, `/[?&]dpr=(\d+(?:\.\d+)?)(&|$)/`. Effect: `?...&perf=1&dpr=1` makes the second log line say "pixel ratio 1" and the canvas pixel size drops by the ratio, so M1's `dpr=1` row can be taken again at the same window size and F-Q2's 2 ms condition can be judged. Without this, criterion 3 is unmet.

## Could improve
1. When M1 is taken again after the fix, take the default and `dpr=1` runs at the same window size, and add the after-Relight run, so the M1 row matches the order table ("before power and after the Relight, at the native pixel ratio and at `dpr=1`"). This is the main session's measurement, not the branch.
2. The first frame of each 300-frame window records the gap back to the last frame of the previous label (or to 0 on the very first draw). In a median of 300 this makes no difference, so this is noted only.
