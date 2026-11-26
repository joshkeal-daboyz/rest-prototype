ticket: 081-TB1b1-joint-preview
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
A timed breaker's `loadPreview` entry should be the circuit at the moment its clock next flips, with every other timer placed where its own clock has it at that moment. Coincident flips count as one joint flip, and earlier timers count with every boundary they cross. One fresh grid pair per timer, nothing else changed, at most 2 test cases.

## Does the branch do it?
- **Criterion 1 (the entry is the grid at its moment): the code is right, the test covers half of it.** `src/grid/preview.ts` takes `m = own.next`. A timer whose `next` is more than `m + SAME_MOMENT` keeps the state's position. Every other timer gets its phase back from its readout (`closed - next` if closed, `cycle - next` if open, which is `timerAt` in `src/grid/grid.ts` run backwards). The code adds `m`, takes the result modulo the cycle and snaps it the way `timerAt` does, then sets `p < closed`. This covers all three bullets: joint, later, and earlier with repeated boundaries. It also works on the frozen readouts before the first move, because `timerReadouts` uses `clock ?? 0`. I checked one earlier-timer case by hand: closed 2, open 3, offset 0, at m = 6 gives phase 1, so closed, after two flips. That is correct. `kind`, `timed: true`, and `delta`/`over`/`blows`/`lines` against `base` are as specified. The new case in `src/grid/timer.test.ts` ("rule 6 and TB1b1: an alternating pair ...") uses a pair on capacity 1 with offsets 0 and 2. It asserts `delta` 0, `over` false, `blows` [], both entries equal, and `lines` on `l_lb` / off `l_la`. That meets the joint-flip clause. The criterion's last test clause, "A third timer flipping earlier is counted in the later entries", is not covered (see Must fix 1).
- **Criterion 2 (no settles between):** met. Each entry is one `entry(...)` call on the assembled breaker map. No test, as the ticket says.
- **Criterion 3 (unchanged elsewhere):** met. The player-breaker path is the old code without the `timed` branch, and the switch and repair paths are untouched. The diff to `timer.test.ts` only adds lines, so TB1's timed-preview assertions pass unedited. `src/grid/timer.test.ts` runs 7 of 7 green here. CI covered the V2/NC1 suites and the purity case.
- **Criterion 4 (its cost):** met by the diff. There is one `entry` call per timed breaker, and the inner loop only builds a map. No test, which the ticket allows.

## Rule conflicts and risks
- None found against the hard rules. `src/grid/` stays pure, there are no new imports or types, and `src/core/` is untouched. Only `src/grid/preview.ts` and `src/grid/timer.test.ts` change (plus the architect's ticket commit). Nothing here stops the 3D game taking the file.
- `SAME_MOMENT` (1e-6) in preview.ts and `EPS` (1e-9) in grid.ts are two tolerances for "the same moment". The ticket names 1e-6, so this is as asked. Two timers that are 1e-7 s apart would be one preview moment but two grid settles. Whole-second timers make that unreachable.

## Must fix
1. **`src/grid/timer.test.ts`: cover criterion 1's "a third timer flipping earlier" clause.** The ticket puts that clause in this criterion's test, and the cap is 2. The current case passes for two plausible wrong implementations:
   - one that skips earlier timers (`r.next < m - SAME_MOMENT` → `continue`);
   - one that toggles every timer with `next <= m` once (`b.set(t.id, !r.closed)`) instead of running its clock to `m`.

   In both, the pair's `next` values are equal, so the earlier-timer and repeated-boundary paths never run. Add a third timer whose `next` is less than `m` and which crosses two boundaries before `m`. For example, put the pair on closed 6 / open 6 (offsets 0 and 6, m = 6) and the third on closed 2 / open 3, offset 0 (flips at 2 and 5, closed at 6). Make it feed a lamp whose line the later entry's `lines` would show wrongly under either bug. Then assert that entry's `lines`/`delta`. This can be extra assertions in the existing case (count stays 1) or a second case (count 2). Either way the test then fails if the earlier-timer rule breaks.

## Could improve
1. The case could also assert the ticket's counterfactual ("flipped alone, the closing one would read `over` true"). For example, show that the fixture browns out with both lamps lit, so the `over: false` result clearly depends on the joint flip. The fixture's numbers (capacity 1, two load-1 lamps) make it plain already, so this is optional.
