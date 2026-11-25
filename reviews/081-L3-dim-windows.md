ticket: 081-L3-dim-windows
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Before any power, about 1 in 25 upper-storey window pieces across the city glow at a steady 0.15 of a lit window, never on a job lamp's building. They use F1b's per-instance `windowLevel`, set once when the city builds, with no material clone, no new program and no new draw call (ticket 081, section L3, criterion 2 as re-cut for section F).

## Does the branch do it?
- **Criterion 1 (which pieces).** `dimPieces` in `src/render3d/windows.ts` is pure. It skips buildings in `exclude`, picks only `floor` and `floor3` roles (the ground storey is not in a column's `pieces` in `plan3d.ts`, and roofs are refused), and picks by `hash01(seed, building id, piece index) < share`, so the pick is the same on every load. `DIM_SHARE = 1/25` and `DIM_LEVEL = 0.15` cite Josh's L-Q3 answer. In `cityview.ts` the exclude set is `lampsOf.keys()`, the same map L1 lights from, so the job lamps' buildings and the buildings backed onto them never get dim windows. The test "dim pieces (081 L3)..." uses a 200-piece fixture (50 buildings x 4 pieces). It checks the same pick twice, no excluded building, and no roof offset. It then checks the share on 3,000 floor pieces, within plus or minus 30 % of 1/25. That meets the "within a tolerance the builder states" wording. I checked by hand that the offsets line up with the instance lists. `plan3dGroups` numbers a building's instances in `columns` order, only for whole columns, with each piece's sub-meshes in `meshParts` order and the ground pieces last. `dimBuildings` rebuilds that same order from `draws`, which are in `columns` order: it groups by column and skips any column with a piece whose root has no parts.
- **Criterion 2 (per-instance level, no material change).** `setDimWindows` writes `DIM_LEVEL` into the picked instances' `windowLevel` slots and sets `needsUpdate`, and does nothing else. It is called once, in the build step. `setBuildingGlow` writes only to `litBuildings`, the same `lampsOf` keys, so nothing overwrites the dim slots during play, and the level stays steady. The test "dim windows (081 L3)..." shows the picked slot holds `DIM_LEVEL`, every other slot (including a lamp building's) holds 0, and the instancer's material is still the same twin.
- **Criterion 3 (budget).** It is recorded in `docs/design/081-F-measurements.md`, "L3, criterion 3". Main and the branch both show 1,778 draw calls and 12 programs. The CPU medians overlap (9.3 and 9.8 ms against 10.3 and 8.4 ms). That follows from the code: no material, mesh or program is made.
- **Criterion 4 (Josh's look).** Josh checked it in the pane on 24 Nov 2026: "Looks right".
- **Tests.** I ran `npx vitest run --maxWorkers=2 src/render3d/windows.test.ts`: 8 passed. The two new cases are fast. The 3.4 s case is L1's, which already existed.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, and no GDD Decided rule touched. The code files are the three the ticket lists (`windows.ts`, `windows.test.ts`, and one call in `cityview.ts`). The docs change is the main session's measurement.
- Test count: 2 added, which matches the ticket's "2 added". No test is report-only, and no test uses a whole city.
- `dimBuildings` must stay in step with how `plan3dGroups` orders `instances` (columns order, whole columns only, sub-mesh order). It has no test of its own. If F1a's ordering ever changes, the dim windows would quietly land on the wrong pieces. Josh's look check makes this low risk for now.
- The dim level is written whatever the light mode, so the faint windows would also show on a daylight city view. The dead city is drawn at night, so this is not a finding against the ticket.

## Must fix
none

## Could improve
1. `src/render3d/windows.test.ts`, the share test: the comments do not match the code. "1/25 of 141 floor pieces is about 6" refers to the 50-building fixture, but the share is checked on the 1,000-building one. "within a factor of 3 either way" is wrong, because the assertion is plus or minus 30 %. Correct the comments to match the assertion.
2. `dimBuildings` could be checked against `plan3dGroups`'s own `instances` lengths (offsets per building never past the list's end) in an existing plan3d fixture case, rather than in a new case. That would pin the ordering the dim pick depends on.
