ticket: 070d2-edge-kerb
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section D2 of ticket 070: stage 4 (edge) lays every street piece as a `CityGroundCell` and one kerb path per block side, from block corner to block corner. The far side of a T runs straight and is dropped at its two crossings, and a bare one-way street's kerb is straight. Rule 10's two additions and G4 are checked on the layer, the picture gains "dropped kerb" and "kerb return", and R-1 to R-7 hold on the 20 named runs. All of it is pure and stays in `src/city/edge/`.

## Does the branch do it?
Round 2. I reviewed a42dc73 against the round 1 review (`reviews/070d2-edge-kerb-round1.md`), which judged 26a6fe7 as meeting criteria 1 and 3 to 8 and leaving one part of criterion 2 unmet. The fix touches only `src/city/edge/kerb.test.ts` and `src/city/edge/stage.test.ts`. I ran `npx vitest run --maxWorkers=2 src/city/edge/kerb.test.ts`: 257 passed. The main session's full gate on a42dc73 is green (tsc clean, 3610 passed).

**Criterion 2, the 063 F cases: now met.** The new named-run test "kerb line: every inlet goes round as Josh drew it..." runs on all 20 runs. For every path it checks:
- Each inlet id has exactly one near return and one far return.
- Each inlet has a dip whose `a` equals the near return's `at` and whose `b` equals the far return's `at` (within 1e-9).
- Each `openings` entry has a `return` directly before it and directly after it on the dip-free chain.
- `openings.length === dips.length`.
- Every `return` segment is `TILE_M` or `2 * TILE_M` long (5 m or 10 m).

I checked the indexing against `kerbline.ts`. `openings` holds `[idx, idx + 1]`, where `idx` is the opening segment's index in `chain`. So `kinds[i0 - 1]` is the segment before the opening and `kinds[i1]` is the one after it, which is right. The test builds `chain` the same way the walker does, with the dips filtered out.

**Could improve 1 from round 1 was applied.** The stale D1b comment in `stage.test.ts` is reworded. It no longer claims the stage runs ok on that fixture.

Nothing else changed, so the round 1 findings on the other criteria still stand.

## Rule conflicts and risks
- None found in the fix. It changes tests only. No source file outside `src/city/edge/` is touched, and there is no new dependency and no rule change.
- The round 1 risks still stand and are not blockers:
  - The wall-plane check reads `returns[].end`, not the drawn segment.
  - The stage error reads "G4: G4:".

## Must fix
none

## Could improve
1. `src/city/edge/kerbcheck.ts`: check that each return segment's far end equals its `returns[].end` (round 1, Could improve 2). Then the wall-plane rule judges the line that is drawn.
2. `src/city/edge/stage.ts`: drop the duplicated "G4:" prefix (round 1, Could improve 3).
