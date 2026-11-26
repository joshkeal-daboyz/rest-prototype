ticket: 081-NC1-preview-lines
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section NC1 of `tickets/081-puzzles-on-the-city.md`: `loadPreview` should give every breaker, switch and readable-fault entry a `lines: { on, off }` field. It lists the lines the move would make live and dead, worked out from the same fuses-lifted, unread-faults-as-sound run that `delta` comes from, in `puzzle.lines` order. The test budget is one added case, and V2's numbers must not change.

## Does the branch do it?
- **Criterion 1 (the lines).** `src/grid/preview.ts`: `run` now keeps `lit.powered` from the `unrated: true` grid, which is the same run that gives `load`, so it is the same run as `delta`. `entry` builds `on` as `puzzle.lines` filtered to lines that are not in `base.powered` but are in `after.powered`, and `off` as the reverse. Both follow `puzzle.lines` order, which is what the criterion words. The new case in `src/grid/preview.test.ts` ("control lines rule: ...") uses the fixture the ticket names: a feed, an open breaker, a junction splitting to two lamps, and a switch on another line. It checks that the open breaker's entry is `{ on: [lb, x1, x2], off: [] }`, that the closed breaker's is the reverse, and that the switch's is `{ on: [sb], off: [sa] }`. `l0` (feed to breaker) is correctly left out: per `GridState.powered`'s doc, the line where current stops at the open breaker is powered both before and after the throw. Met.
- **Criterion 2 (Faults hide faults).** In the same case, an unread `damaged-cable` on `lb` leaves `on` as `[lb, x1, x2]`, so the break is treated as sound. With `k` in `known`, `on` is exactly `[lb]`: the cut line keeps its share and the lines past it do not. This is the Decided rule as written, not an approximation. The unread case is real here, because the open breaker keeps current off `lb` in the base state. Met. `tickets/rules-coverage.md` adds the matching NC1 pointer; that edit was in the architect's cut commit.
- **Criterion 3 (repair entries carry `lines`; V2 unchanged).** Repair entries go through the same `entry`, so they carry `lines`. `delta`, `over` and `blows` are computed exactly as before; the only change is that `load` is now read from a named `lit` state. V2's five cases pass.
  - The one edit you asked me to judge: in the "over and blows" case, `toEqual({ kind, delta: 2, over: true, blows: ["fbA"] })` became `toMatchObject` with the same object. In Vitest, `toMatchObject` still requires each listed key to be equal, and it matches arrays with their full length. So `blows: ["fbA"]` still fails on an extra or missing id, and `kind`, `delta` and `over` are pinned as before. The only thing given up is "no other keys", and the extra `lines` key is the change this ticket makes. It keeps the same assertion on the four V2 fields. Criterion 3 is met in substance.
- **Criterion 4 (purity).** The diff adds no imports to `src/grid/preview.ts`; it still imports only `../core` and `./grid`, with no DOM or timer. The existing purity case is untouched. Met.
- **Test run.** `npx vitest run --maxWorkers=2 src/grid/preview.test.ts`: 6 passed, 76 ms.

## Rule conflicts and risks
- None found against the hard rules. The builder's commits touch only `src/grid/preview.ts` and `src/grid/preview.test.ts`, the two files NC1 lists. `src/core/preview.ts` (the optional field), the ticket file and `tickets/rules-coverage.md` came from the architect's cut commit `32ec55c`, which the ticket names as written before NC1 on Josh's G1.
- No new dependency, and no GDD Decided rule changed.
- Test count against `main`: 1 added and 1 line rewritten in an existing case, well under 15. No report-only test, no whole-city run, nothing slow.
- The 3D game can take this as it is: the field is optional, built from the grid's own `powered` set, and needs nothing outside `src/grid/` and `src/core/`.
- Small risk, not a finding: the branch is `ticket/081nc1-preview-lines`, while the ticket says `ticket/081nc1-cue-lines`. It is a naming mismatch only.

## Must fix
none

## Could improve
1. `src/grid/preview.test.ts`, the new case: one more `expect` on a repair entry's `lines` (for example, a readable break's repair entry naming the lines past it) would pin criterion 3's "repair entries carry `lines` too". At the moment only the code shows it. It is optional, because NC2 doesn't draw repair cues yet and the count is one case.
2. The ticket's branch name could be corrected to `ticket/081nc1-preview-lines` when the architect next touches section NC.
