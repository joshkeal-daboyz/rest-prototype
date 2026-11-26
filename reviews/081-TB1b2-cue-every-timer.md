ticket: 081-TB1b2-cue-every-timer
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Now that TB1b1 makes a timed breaker's preview the joint flip at its moment, the renderer stops withholding the next cue and number from timers that share or follow another flip. `timerNextShows` drops `timerNextExact`, which goes, along with `SAME_MOMENT` if nothing else in the folder uses it. TB3's cue case is rewritten, and no case is added.

## Does the branch do it?
- **Criterion 1 (drop `timerNextExact`): met.** In `src/render3d/timerring.ts`, `timerNextExact` and the renderer's `SAME_MOMENT` are removed. `timerNextShows` now reads only `hover === id || (clock !== null && r.next <= TIMER_WARN_S)`. Nothing else in `src/`, `tools/` or `tests/` imports `timerNextExact`. The only other `SAME_MOMENT` is `src/grid/preview.ts`'s own private constant, which this branch leaves alone. `cueIds` is unchanged. The test case in `src/render3d/timerring.test.ts` is rewritten in place (1 rewritten, 0 added):
  - a coincident pair shows both, on hover (`["a","b"]`) and within 3 s with nothing hovered (`["a","b"]`);
  - a timer that flips after another shows too (`a` at 2 s and `b` at 3 s give `["a","b"]`; hovering `b` with `a` earlier gives `["b","a"]`);
  - the cases for hover, the 3 s edge (3 vs 3.1), the clock not started, and the numbers suppressed under V or the Relight are kept unedited.

  The rewritten assertions fail if the old exactness filter comes back, so the case still guards the rule. I ran `npx vitest run --maxWorkers=2 src/render3d/timerring.test.ts`: 2 passed, 463 ms.
- **Criterion 2 (browser, joint numbers on TB6): pending.** The main session runs it with TB6, as briefed. I did not run a browser.
- **Files.** The branch touches only `src/render3d/timerring.ts` and `src/render3d/timerring.test.ts`, the two the ticket lists. `cityview.ts`, `controlcue.ts` and `overlay.ts` are untouched.

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are untouched, there is no new dependency and no Decided rule changes. Rule 9 (red only if the flip browns out) now rests on TB1b1's joint entry, which is merged (#110).
- The ticket's TB1b heading still reads "Not approved (awaiting G1)". TB1b1 has merged, so this is presumably a stale status line for the architect. It is not this branch's concern.
- A stale comment at `src/render3d/overlay.ts:257` still says the entry "is exact (see `timerNextExact`)". The symbol no longer exists. This ticket bars `overlay.ts`, so it is not a must-fix here.

## Must fix
none

## Could improve
1. In a later renderer ticket that may touch `src/render3d/overlay.ts`, reword the line 257 comment to say the entry is the joint flip (TB1b1) and drop the reference to `timerNextExact`.
