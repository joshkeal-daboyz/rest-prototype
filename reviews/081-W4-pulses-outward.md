ticket: 081-W4-pulses-outward
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Find and fix why the live pulses run back toward the feed on the city pilots (01, 02, 04). Pin pulse direction for P0 and the 16 pilots in one pure test. Draw the live glow and pulses a second time, faded, where buildings hide them.

## Does the branch do it?
I reviewed W4's own commit `b29ee49` (`src/render3d/cityview.ts`, new `src/render3d/pulsedir.test.ts`). The merges of main and the goal branch are not W4's work.

1. **The cause** (reported in the builder's reply; checked in code). It was suspect (a), with a twist. The conversion splits each file line `L` into `L~a`, `L` and `L~b`, and the middle `L` runs between hidden nodes that have no place. In `jobWires`, a one-span run's start guess used `converted.places[line.from]`, so `here` was null, `da = db = 0`, and the start fell back to `first.a`, which is arbitrary. The fix (cityview.ts, the `fileFrom` map) reads the `~a` segment's `from`, the file line's own from node. The multi-span path (the shared pole) was right already.
2. **The fix** is at the cause, in `src/render3d/` only. No other files are touched.
3. **Direction pinned.** `pulsedir.test.ts` case 1 converts all 17 files (P0 plus 01 to 16) on 6 x 6 seed 1 with one city build. It reads the start and end points of each wire through `jobWires`, `wireLit` and `pointOnWire`, the same expressions the frame loop uses at cityview.ts:1011/1029. It walks each line from its entry place and requires every wire's pulse start to be nearer the entry than its end. It passes in 2.5 s. That is over 2 s, but the ticket allows one city build and asked for the time. I checked that it bites: with the one-line fix reverted, it fails on 01 `l_br`, 02 `l_on` and `l_shrine`, 03 `l_feed`, 04 `l_a0`, `l_b0` and `l_market`, and many lines on 05 to 11 (the list was cut off at 60). That matches Josh's 01, 02 and 04 notes. In 02 the whole run is a chain of one-span lines, which is why it looked like a multi-span fault. The test does not take its directions from each check block's winning state through `lineFlow`. It tries both directions on every line, which covers every state the grid can produce, but not the `flowFrom` to `reversed` mapping (Could improve 1).
4. **Which were affected** is in the builder's reply, with no test. My revert run above gives the list independently.
5. **Faded pass.** `xrayOf` (cityview.ts) makes a second `InstancedMesh` on the same geometry, `instanceMatrix` and `instanceColor` objects, with `GreaterDepth`, `depthWrite` false, transparent, `XRAY_OPACITY` 0.25, and the base material's colour and additive blending. It is built for `glowMesh` (after its colours exist) and for `pulseMesh`, so there are no second per-frame writes. Dead segments are black under additive blending, so they add nothing, and the dark circuit gets no x-ray. The overlay is untouched. Transparent meshes draw after the opaque city, and the overlay is a separate canvas. Case 2 checks the shared objects and the material flags.
6. **Cost** (browser). Two meshes means two more draw calls. The materials are built with the scene, but whether their programs compile at build or at first draw is for the builder's `perf=1` report. I did not run it.
7. **Josh plays 01, 02 and 03** (browser, his job).

There are 2 test cases, within the ticket's count and the 15 cap.

## Rule conflicts and risks
- None against the hard rules. Nothing in `src/grid/`, `src/night/` or `src/core/` changed, there is no new dependency, and both files are in the ticket's list.
- Risk: the first-pass glow box surrounds the opaque dark wire. Where the box's back faces sit behind the wire, the x-ray glow may add a little extra brightness on a wire that is already visible. This is an inference, not checked; it is for the browser.

## Must fix
none

## Could improve
1. `src/render3d/pulsedir.test.ts`: as cut, criterion 3 takes `reversed` from `lineFlow` in each check block's winning state. Doing that, or adding one `lineFlow` call per line in the existing loop, would also pin the `flowFrom === line.to` link, at no extra cases.
2. The test skips the first wire's check for a line with no `~a` segment (`from` undefined, so `ref` is null). That is harmless on today's files but silent. An `expect(from).toBeDefined()` would make it fail loudly.
