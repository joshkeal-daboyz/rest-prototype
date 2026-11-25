ticket: 081-V1-wire-tint
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section V1 of ticket 081: every wire of the puzzle (`jobWires`, live or dead, cut spans included, no scenery and no hidden line) gets a steady ribbon-colour tint in one static instanced layer. It has no glow and no pulses, and the live glow and W4's pulses draw over it unchanged. Criterion 3 (through buildings) was dropped by V-Q1 ("Ribbon tint (Recommended)").

## Does the branch do it?
V1's own change is commit e91711a: `src/render3d/cityview.ts` (+19) and `src/render3d/windows.test.ts` (+14). Against `origin/main`, the rest of the PR is the ticket text and a cleanup line from the merges.

1. **The tint.** Met. `JOB_WIRE_TINT` (0xff3df0) and `JOB_WIRE_DIM` (0.55) are exported. `tintMesh` is one `InstancedMesh` over `wires` (= `jobWires(...)`). It is filled once at build from the live layer's `segMid/segQ/segLen`, and those indices line up because `liveWires = [...wires, ...sceneryDropWires]` puts the job wires first. Play never writes to it. Test: "the tinted wires are the file lines' spans and drops, a cut span among them, and no scenery drop (081 V1)". It checks that every wire is a file line's span or drop and that no scenery drop is among them. Hidden lines are already covered by the existing "hidden nodes stay hidden" case on the same `jobWires`.
2. **Dead reads dead.** Partly met. The tint has one material, no instance colour and no pulses, and a cut span is in the layer (the test asserts `cutSpan` is among the wires). But "a live wire's glow ... draws over it, unchanged" is not met by construction. See Must fix 1.
3. Dropped by V-Q1. Nothing was built for it, which is correct.
4. **Budget.** A browser check. It adds 1 draw call. One thing to watch: the tint mesh has no `instanceColor` while `glowMesh` does, so three.js may compile one more `MeshBasicMaterial` program variant. Check "no new program in play" with `perf=1`.
5. A browser check (Josh plays 03 and 04).

I ran `npx vitest run --maxWorkers=2 src/render3d/windows.test.ts`: 16 tests pass in 5.9 s. The PR adds 1 test case, which is within the policy. It uses the shared P0 city fixture that the file's other cases already use.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no file outside the ticket's list, no new dependency, no Decided rule changed. The tint shows nothing about faults, so "Only when readable" and "Faults hide faults" still hold.
- The test lives in `windows.test.ts`, not in a cityview-named file. That is acceptable, because the P0 fixture is there.
- The test checks which wires are chosen (`jobWires`), not `tintMesh` itself. Since `tintMesh` is built straight from `wires`, it is a fair proxy.

## Must fix
1. **The tint draws over the live glow, not under it** (`src/render3d/cityview.ts`, the V1 block). Criterion 2: "A live wire's glow and pulses draw over it, unchanged."
   - Both `glowMesh` and `tintMesh` are transparent children of `live` at the origin. Neither sets `renderOrder`.
   - three.js's `reversePainterSortStable` (node_modules/three/build/three.module.js:7869) sorts by groupOrder, then renderOrder, then z, then id. Here z is equal for both, so `glowMesh` (built first, lower id) draws first. The 55%-opaque magenta tint (`depthWrite: false`, 1.5x the glow's thickness, enclosing it) then draws over it.
   - So a live run's glow is seen through a magenta shell: dimmed and tinted. This is read from the code and the sort, not seen in a browser.
   - Fix: set `tintMesh.renderOrder = -1`, or build the tint before `glowMesh`. The tint then draws first and the additive glow (and the pulses, already later) add on top of it unchanged.

## Could improve
1. The test could also assert that every file line's spans and drops are in the layer, not only that the layer holds nothing else. "Exactly", in criterion 1, means both directions.
