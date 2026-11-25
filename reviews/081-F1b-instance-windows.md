ticket: 081-F1b-instance-windows
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A lit building's windows glow through a per-instance `windowLevel` attribute on the shared building instancers, read by one `onBeforeCompile` hook on the colourway materials. L1's per-building material clones and F1a's `exclude` path go, so lighting buildings adds no draw call and no program.

## Does the branch do it?
Round 2. The round 1 review (partly, 1 must-fix) was archived and the builder added commit `23a5792`. Everything round 1 found met is unchanged, and I have not reopened it.

- **1, the level attribute.** Round 1's must-fix is done. `plan3d.test.ts`, "draws one instancer per key, colourway and chunk, holding exactly the pieces that share them", now runs `plan3dGroups` and checks four things on every building instancer:
  - its geometry has a `WINDOW_LEVEL` attribute whose length is `count`, all 0;
  - after `setBuildingGlow(d.buildings, lit, { level: 1, flare: 0 })`, each slot is 1 exactly when it belongs to `instances.get(lit)` and 0 otherwise;
  - the set of lit slots is not empty;
  - each instancer's material is the same object before and after.

  If the `geo.setAttribute(WINDOW_LEVEL, ...)` line at `plan3d.ts:633` were deleted, `getAttribute(...).array` would throw and this case would fail. That gap is closed. The case runs on `planOf(DEFAULT)`, the case's existing city, not a hand-built three-building fixture. It is folded into an existing case and adds no test case or new city build, so I take it as meeting the request. The `windows.test.ts` case still covers the twin's mask, the flare value and the upload version. Met.
- **2, L1's clones go.** Unchanged from round 1. Met.
- **3, no program in play.** The main session's browser readings on the district view are 1,855 draw calls and 11 programs both before power and after the Relight. That meets "no new program" and "calls after <= calls before + 1". Met on those readings.
- **4, the bar.** I can't judge it from the code. It rests on the builder's M2 rows and the main session's run in view.
- **5.** Josh's play. Not judged here.
- **Count.** Against `origin/main`, the added `it(` lines are still the same 2: the rewritten windows case, and the renamed plan3d "with empty roots instances no piece..." case. The round 2 check went into an existing case. That is well under 15.
- **Tests run.** I ran `src/render3d/plan3d.test.ts` and `src/render3d/windows.test.ts` with `--maxWorkers=2`: 84 passed in 56.2 s, about the same as round 1.

## Rule conflicts and risks
- No hard-rule break. Every change is in `src/render3d/`, with no new dependency and nothing in `src/grid/` or `src/night/`.
- The dispose risk from round 1 is settled. `BuildingsDraw.dispose` (`plan3d.ts:661-668`) now deletes each attribute except `WINDOW_LEVEL` from the instancer's own geometry and sets its index to null before `geometry.dispose()`. Three then frees only the window level buffer, and the cached roots' position, normal, uv and index buffers stay alive for any other mesh drawing them.

## Must fix
none

## Could improve
1. The new check proves the material object never changes, but not that it is the `windowLit` twin. If `buildingBoxes` stopped calling `windowLit`, no test would fail, and the windows would not glow. One line in the same case would catch that: expect each painted instancer's material to have `emissiveMap` set and an `onBeforeCompile` different from its source's.
2. (Carried over from round 1.) Check that the pack's building materials have black emissive, so it is clear that an unlit building looks exactly as it did before F1b.
