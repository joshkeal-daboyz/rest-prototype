ticket: 081-V1-wire-tint
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section V1 of ticket 081: every wire of the puzzle (`jobWires`, live or dead, cut spans included, no scenery and no hidden line) gets a steady ribbon-colour tint in one static instanced layer. It has no glow and no pulses, and the live glow and W4's pulses draw over it unchanged. Criterion 3 (through buildings) was dropped by V-Q1 ("Ribbon tint (Recommended)").

## Does the branch do it?
Round 2. Round 1's only must-fix was that the tint drew after the live glow. The fix is commit bffe6ae: `src/render3d/cityview.ts` (+3) and `src/render3d/windows.test.ts` (+2).

1. **The tint.** Met, unchanged from round 1. `tintMesh` is one `InstancedMesh` over `wires` (= `jobWires(...)`). It is filled once at build from the live layer's segment data and never written in play. Test: "the tinted wires are the file lines' spans and drops, a cut span among them, and no scenery drop (081 V1)".
2. **Dead reads dead; the glow and pulses draw over it unchanged.** Now met.
   - `tintMesh.renderOrder = JOB_WIRE_TINT_ORDER` (-1), at cityview.ts:826.
   - No other mesh in `cityview.ts` sets `renderOrder`, so the glow, the pulses and W4's faded second pass stay at 0. The only other `renderOrder` in `src/render3d/` is the text sprites (10).
   - In three.js's transparent sort, renderOrder comes before z and id. So the tint now draws first, and the additive glow and pulses add on top of it.
   - The cut span is still in the layer, still with one material, no instance colour and no pulses.
3. Dropped by V-Q1. Nothing was built for it, which is correct.
4. **Budget.** A browser check, unchanged: 1 draw call. Watch for a possible extra program variant (no `instanceColor`) with `perf=1`.
5. A browser check (Josh plays 03 and 04).

I ran `npx vitest run --maxWorkers=2 src/render3d/windows.test.ts`: 16 tests pass in 6.2 s. The PR adds 1 test case; round 2 adds an assertion to it, not a new case.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no file outside the ticket's list, no new dependency, no Decided rule changed.
- renderOrder -1 also puts the tint ahead of every other transparent object at order 0, such as the x-ray passes. The tint has `depthWrite: false` and is only 55% opaque, so the only effect is that later transparents may draw over it. Nothing is hidden by it.

## Must fix
none

## Could improve
1. The new assertion `expect(JOB_WIRE_TINT_ORDER).toBeLessThan(0)` checks the constant, not that `tintMesh` uses it or that the glow stays at 0. It would still pass if line 826 were removed. That is acceptable for a one-line wiring, but a check on the built mesh's `renderOrder` against the glow's would test the rule itself.
2. (From round 1, still open.) The V1 test could also assert that every file line's spans and drops are in the layer. "Exactly", in criterion 1, means both directions.
