ticket: 081-NC2-control-cue
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
When the player hovers or taps a breaker or switch, the renderer draws the wires that throw would light (`CUE_ON`) and the wires it would darken (`CUE_OFF`). The cue comes from NC1's `lines` on the load preview entry, it has W4's see-through pass, and it is off whenever the preview is `null`. It costs at most 2 draw calls, adds no new program, and adds at most 0.5 ms.

## Does the branch do it?
1. **The right wires: met.** `cueWires` in `src/render3d/controlcue.ts` is pure.
   - It returns nothing for a null hover, a `null` preview, an id with no entry (lamp, fuse box), a repair entry (a break), and an entry with no `lines`.
   - It looks lines up in `jobWiresOfLine`. `cityview.ts` builds that from `wires` (`jobWires`, file lines only), not `liveWires`, so scenery drops and S1's `L~a`/`L~b` ids are never cued.
   - The cut rule: a wire with a `cutFault` that has a preview entry (a fault readable now) ends the cue at that span, counted from the end where current enters.
   - S1 keeps damaged cables on the middle `L` (`src/city/circuit/scenery.ts` line 67), so the cut always lies on the wires keyed `L`.
   - Test: case 1 in `src/render3d/controlcue.test.ts` covers the on/off split, the skipped `L1~a` and `scenery` ids, the cut in both directions, and the four empty cases (null, a lamp, the repair `f1`, the bare breaker).
2. **The layer: met.** `createCueLayer` makes one `InstancedMesh` at build, on the live layer's `unitBox`. It is additive, coloured by instance, and its instance colours start black.
   - `cityview.ts` writes its matrices once, at `CUE_THICK` times the wire thickness, and adds `xrayOf(cueLayer.mesh)`.
   - `update` returns early when the hover and preview are the same as last time. It also skips the write when nothing was lit before and nothing is lit now.
   - `CUE_ON` 0xffd27a and `CUE_OFF` 0xdfe9ff are both full colours, brighter than `JOB_WIRE_DIM` 0.4.
   - Test: case 2 checks the shared geometry and `instanceColor`, `GreaterDepth`, `depthWrite` false, `XRAY_OPACITY`, and that `version` holds on an unchanged second call.
   - Commit 845cc80 adds the missing per-frame call: `cueLayer.update(overlay.hover ?? null, preview)`, next to `drawLive`.
3. **Off when the numbers are off: met.** The `null`-preview branch is in case 1. The preview is `null` during the Relight, after the win and under `V` (V3/V4). The pane check recorded `V` hiding the cue.
4. **Touch: met (browser).** The main session's pane check in `docs/design/081-F-measurements.md` ("081 NC2"):
   - touch emulation at 375 x 812;
   - a tap throws the switch and leaves its cue up, and a tap on empty ground clears it;
   - event order seen: pointerdown, pointerup, click.
5. **Cost: met (browser).** Same note: 1,845 to 1,847 draw calls, 16 to 16 programs, CPU median 9.40 to 9.70 ms (+0.3 ms), whole frame 16.70 ms both. All within the limits, and the x-ray pass is kept.
6. **Josh plays: pending.** This criterion is his.

**Count.** 2 added `it(` cases, which matches the ticket's count. The file runs in 27 ms. Both cases pass locally (`npx vitest run --maxWorkers=2 src/render3d/controlcue.test.ts`). Both name the rule they check, and both would fail if the criterion broke.

## Rule conflicts and risks
- **Purity:** no change in `src/grid/` or `src/night/`.
- **Folders:** only `src/render3d/cityview.ts`, the new `controlcue.ts` and its test, plus the main session's notes (`docs/design/081-F-measurements.md`, `docs/ci-times.md`). None of the forbidden files (`src/core/`, `src/ui/`, `src/play/`, `main.ts`, `overlay.ts`, `windows.ts`, `fx.ts`) is touched. There is no new dependency.
- **Faults hide faults (Decided): holds.** The cue draws only what NC1's visible what-if lists, and a cut caps the cue only when its fault is in the preview.
- **A break that is known but not readable now: risk, not checked on a city.** Example: the player reads a break with its breaker closed, then opens the breaker.
  - The break is in `known` but not in `readableFaults`, so `loadPreview` gives it no repair entry.
  - NC1 stops current at that break. The cue does not cap there, so hovering the breaker cues the broken line's wires past the break as "would be live".
  - The criterion's word is "readable", so the branch meets it as written. The renderer cannot see `known` without changing `src/ui/`, which this ticket forbids.
- **Which end current enters, on a line that is dead now: may occur, not checked.** `reversed` reads the current state's `flowFrom`. A line that is not powered now has no entry, so the cue assumes current enters at the line's `from`. On a line with a readable cut that the throw would feed from its `to` end, the cue would show the wrong side of the cut.
- **Branch name:** the ticket names `ticket/081nc2-cue-drawn`; the branch is `ticket/081nc2-control-cue`. This is cosmetic only.

## Must fix
none

## Could improve
1. **Known breaks (risk above).** Ask the architect whether NC1's entry should also name each `on` line's cut, for example `cuts: Record<line, faultId>`, taken from the same `seen` set. Then `cueWires` would cap at known breaks too, not only at breaks readable now. This is a section for Josh, not a change to this branch.
2. **Entry end for dead lines (risk above).** If the grid exposed the after-run's `flowFrom` in the entry, or if `cueWires` were given it, the cut would be cued from the right end on a line that the throw powers from its `to` end. Same route as item 1.
3. `src/render3d/controlcue.test.ts` case 2 checks `instanceColor` twice: once with `toEqual` in the array, then with `toBe`. The `toBe` alone is the real check, so drop `instanceColor` from the array.
4. When nothing is cued, the cue mesh and its x-ray still draw every instance, in black. It is measured and within budget; setting `mesh.visible = lit` in `update` would save both calls when nothing is hovered.
