ticket: 081-TB1b1-joint-preview
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A timed breaker's `loadPreview` entry should be the circuit at the moment its clock next flips, with every other timer placed where its own clock has it at that moment. Coincident flips count as one joint flip, and earlier timers count with every boundary they cross. One fresh grid pair per timer, nothing else changed, at most 2 test cases. (Round 2: round 1's one must-fix was the untested earlier-timer clause.)

## Does the branch do it?
- **Criterion 1 (the entry is the grid at its moment): met, and now covered in full.** `src/grid/preview.ts` is unchanged since round 1, and the reading I gave it then still holds. Commit 8e70b7b extends the single case in `src/grid/timer.test.ts` ("rule 6 and TB1b1: an alternating pair ...") with two earlier timers on zero-load lamps. `c` is closed 2 / open 3 at offset 0: it flips at 2 and 5 and is closed at m = 6, so `l_lc` does not change. `d` is closed 2 / open 2 at offset 1: it flips at 1, 3 and 5 and is open at m = 6, so `l_ld` goes off. I checked both by hand against the `tb` helper (`closed = offset % cycle < closed`). The new assertion is `lines.off` equal to `["l_la", "l_ld"]`.
  I applied round 1's two wrong versions to `preview.ts` one at a time and ran the case (the file was restored afterwards and `git status` is clean):
  - Skipping earlier timers (`|| r.next < m - SAME_MOMENT` → `continue`) fails with `lines.off` = `["l_la"]`, because `d` is never moved.
  - Toggling every timer with `next <= m` once (`b.set(t.id, !r.closed)`) fails with `lines.off` = `["l_la", "l_lc", "l_ld"]`, because `c` is flipped once instead of twice.

  Each wrong version is caught by a different timer, so the case now fails if the earlier-timer or repeated-boundary rule breaks. The joint-flip assertions from round 1 (`delta` 0, `over` false, `blows` [], `a` equals `b`, `l_lb` on) are untouched.
- **Criterion 2 (no settles between):** met, as in round 1.
- **Criterion 3 (unchanged elsewhere):** met. The diff to `timer.test.ts` still only adds lines to main's file. `src/grid/timer.test.ts` runs 7 of 7 green here (`npx vitest run --maxWorkers=2`).
- **Criterion 4 (its cost):** met by the diff, as in round 1.

Test count against main: 1 new case, under the ticket's 2 and the 15 cap.

## Rule conflicts and risks
- None found. `src/grid/` stays pure, there are no new imports and `src/core/` is untouched. Round 1's note on the two tolerances (`SAME_MOMENT` 1e-6 here, `EPS` 1e-9 in grid.ts) still stands. Whole-second timers keep it out of reach.

## Must fix
none

## Could improve
1. The case's name still describes only the joint pair. Something like "... and timers that flip earlier are run to that moment" would say what the `c`/`d` part guards.
2. Round 1's optional counterfactual (that the pair's lamps would brown out if the closing one flipped alone) is still unasserted. It is optional, as before.
