ticket: 070tr1d-mast-on-walk
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Josh's report and Q50 ("Back on the corner"): move each signal mast's axis to 2.6 m in from both kerb edges so the mast, its buttons and the box stand on the corner piece's raised walk behind the ramps. Type that walk as `CORNER_WALK_M` 2.1 (pinned to the GLB) and test it in TC4. Give every crossing at a corner its own push button on the mast face toward it. Heads over the near half are an accepted cost.

## Does the branch do it?
- **0. Q50 answered.** The caller gave Josh's choice, "Back on the corner (Recommended)". `constants.ts` sets `MAST_INSET_M = 2.6` and quotes Q50 in its doc comment.
- **1. Kit and numbers.** `trafficpin.test.ts` pins `MAST_INSET_M` to 2.6 (it was 0.75) and `CORNER_WALK_M` to 2.1. The other three Q43 numbers are unchanged. The new GLB block reads triangles lazily inside `it.skipIf(!HAVE_GLB)` and checks four things on `SM_Env_Sidewalk_Dip_Corner_01`:
  - a 0.05 m grid over a, b in [2.1, 4.9] is 0.19 to 0.26 m high;
  - the mast foot (centre and corner), both press points (2.6 - 0.09 - 0.17 - 0.3 = 2.04 m) and the box's four corners are on the walk;
  - no point above 0.26 m lies between a press point and the pole;
  - the diagonal edge is logged.
  I ran this file alone. The GLB is present, so the block ran rather than skipped. All 11 tests pass and it logs "CORNER WALK EDGE on the diagonal: 1.91 m", against the probe's 1.92. The builder's reading of the press point is right. The ticket puts the press point (2.04 m) on the pack's walk, not inside the 2.1 m square, and asks only for the button's centre (2.43 m) to be over the square. Criterion 2 says exactly that, so asserting only the centre in the square is the ticket's rule, not a loosening. The "joined to the cell's back corner" clause is checked only indirectly, by height (see could-improve 1).
- **2. The 20 named runs** (`signals.test.ts`). A new test derives the walk square on its own (`walkSquare`, from the junction rect, not `trafficcheck.ts`). It checks each mast foot and each box footprint inside the square. It also checks that each crossing cell next to the corner has exactly one button on the mast face toward it, facing it, at `MAST.buttonY`, with its centre over the square. It asserts `bad` is empty, with 884 masts, 1,768 buttons and 221 boxes. The TR1 test changes from one button per group to two. The arm, head and walk-head tests from TR1 are unchanged. Junction:50:14 is hand-worked: pole (267.6, 87.6), the arm pivot recomputed from that pole, and two buttons at 267.6 - 0.175 (yaw 270) and 87.6 - 0.175 (yaw 180), each at 1.1 m. Met.
- **3. Failing fixtures** (`fixtures.test.ts`). Each new fixture goes through `first(..., [check])`, which demands that exactly one check fails, and then asserts the reason:
  - the mast group moved back by 2.6 - 0.75 fails TC4 with "not on the corner's walk";
  - the box moved 1.5 m toward the mast fails the same TC4 reason;
  - removing one button fails "has 1 push button for 2 crossings", TC2 only;
  - a button turned around fails "does not face its crossing";
  - a button moved to the opposite face and turned outward fails the same.

  `poleAt` now reads `MAST_INSET_M`. The two mechanical edits do not loosen anything:
  - "Over the kerb edge" now shifts the whole group, by `MAST_INSET_M - 0.1`, so the same 0.1 m remains and it still fails TC4 alone. Moving the group rather than only the mast and arm keeps the walk heads and buttons on the pole, so TC2 stays quiet as before.
  - The arm slide goes from 10 m to 20 m, so the arm still passes its carriageway. The assertion `/past its carriageway/` is unchanged.

  The positive control is untouched.
- **4. Digests** (`stage.test.ts`). The four traffic pins are re-pinned. The ground and facades pins are unchanged, and no other stage's pin file is in the diff. The loop of per-seed `toBe` calls became one `toEqual(PINS)`. Its strength is the same and it shows all four at once on failure. Met.
- **5. Report** (`report.test.ts`). Reported only: masts, boxes and buttons off the walk, buttons per mast, each mast's margin to the square (min and max), and the smallest press-point a or b. Heads over and not over their lane, and the stage 7 and 8 clearances, carry over from TR1. Met.
- **6.** This is the main session's job, so I did not judge it.
- **7.** The files touched are within the ticket's list: `constants.ts`, `kit.ts`, `signals.ts`, `trafficcheck.ts`, the four `src/city/traffic` tests, and `src/render3d/trafficpin.test.ts` for criterion 1 only. There is no `src/core/`, `docs/` or dependency change.

**Checks not loosened.** In `trafficcheck.ts`, TC2's button count moves from `=== 1` to `=== crossings.length` and gains checks on facing, position and `y`, with a `used` set so two buttons cannot share one crossing. The old code checked only the count. TC4 adds the corner-walk test after the role and cell tests. It removes nothing.

**A corner with no crossing gets no button.** `signals.ts` drops TR1's fallback, `crossings[0] ?? [-c.sx, 0]`. This follows the ticket's "one for each crossing that lands at the corner" and Josh's reason ("to use the crosswalk"). Such a mast also has no walk heads. No named run has one: the new test asserts two crossings on every mast.

## Rule conflicts and risks
- This is not `src/grid/` or `src/night/`, so the purity rules do not apply. `src/city/traffic` stays pure: its only new imports are from its own folder.
- No GDD Decided rule is touched. MA's place and the button count change on Josh's report and Q50, as the ticket records.
- The zero-crossing case is a small rule edge, from one button to none. It follows the ticket's wording, but no run exercises it. TR2a's grammar line should say "one for each crossing".
- K2 must re-measure stage 6 clearances against the moved masts. The ticket already says this.

## Must fix
none

## Could improve
1. `trafficpin.test.ts`: the "joined to the cell's back corner" part of criterion 1 is checked only by surface height. A short walk along the straight line from each press point to the cell's back corner (4.9, 4.9), checking every point is 0.19 to 0.26 m high, would make "joined" literal.
2. `fixtures.test.ts` "a button moved to the face away from every crossing": the button is also turned around, so the facing check catches it and the new position check (`not on its mast's face toward its crossing`) is never exercised. One more fixture would cover that line: keep the button's yaw and move it only to the opposite face.
3. `fixtures.test.ts` arm fixture: at a 20 m slide the free end probably passes the far pavement too (about 3.6 m + 20 m against a 15 m carriageway and a 5 m walk), so "over a pavement" in the test name may no longer be true. About 15 m would keep the name honest. The assertion holds either way.
4. `fixtures.test.ts` box fixture: `expect(CELL_M).toBe(5)` is there only to use the import. Dropping the import and the line would be cleaner.
