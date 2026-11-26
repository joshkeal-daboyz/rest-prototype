ticket: 081-TB5-timer-sound
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
When the clock flips a timed breaker (`breaker:thrown` with `timer: true`), play a heavier mechanical clunk that sounds different from the player's own throw, and leave the player's throw as it is. Play a soft tick at each of the last 3 whole seconds before a flip, read from `SoundView.timers`, with no tick before the first move or after the win, and keep pitched voices on the 432 Hz grid. At most 2 test cases, `src/audio/` only.

## Does the branch do it?
- **AC1, the flip.** `cuesFor` in `src/audio/cues.ts` sends `timer === true` to a cue of its own, `breaker:timer`, with voices from `R.timerClunk(closed)` (`src/audio/recipes.ts`). That is the player's `breakerThrow` voices 2 dB louder, plus a square A3 clack and a 1200 Hz band-passed noise click. The player's path is not changed. Because the clunk has its own cue name, the mixer's per-name rate limit never lets a clock flip suppress a player throw in the same frame, or the other way round. Two flips at the same instant (rule 6) give one clunk, since the second `breaker:timer` is rate-limited, which suits "one settle". Test: `cues.test.ts`, "a timed breaker's flip is its own heavier clunk, and the player's throw is unchanged". It checks for a different name, more voices and a louder peak, and that the player's cue still equals `R.breakerThrow(true)`. The last check compares the code with itself, but the rule is in the test's name and the other three checks would fail if the two sounds were made the same. Met.
- **AC2, the count-in.** `layersFor` in `src/audio/layers.ts` keeps `ceil(next)` for each timer in `LayerState.secs`. It sets `timerTick` on the frame where that number changes to 3, 2 or 1. It does this only while `view.clock != null && !view.complete`, so nothing ticks before the first move, after Reset, or after the win. `engine.ts` plays `timerTickCue()` (a sine on A5, -26 dB) on such a frame. The data really does reach the engine: `src/main.ts:419` passes the grid state to `audio.update`, and since TB1 that state carries `clock` and `timers`. Test: `layers.test.ts`, "ticks once as whole seconds left reach 3, 2 and 1, and not before the first move or after the win". It runs a frame sequence from 5 s down to 0.4 s and expects exactly three ticks, then expects none with `clock: null` and none with `complete: true`. This is a real rule test. Pitch: `tuningScan.test.ts` adds `timerClunk` (both positions) and `timerTick` to its recipe table, and the scan passes (A3 and A5 are on the grid; the noise voice has no pitch). Met.
- **AC3, Josh listens.** This is for the browser, on TB6. It is not mine to judge.
- **Count.** 2 new `it(` cases (the tuning-scan lines are table entries, not cases). Within the ticket's limit of 2 and the policy's 15.
- **Tests run:** `npx vitest run --maxWorkers=2 src/audio/cues.test.ts src/audio/layers.test.ts src/audio/tuningScan.test.ts` gave 3 files and 51 tests passed in 1.29 s.

## Rule conflicts and risks
- None found against the hard rules. Every change is in `src/audio/`. There is no `src/grid/` or `src/night/` change, no new dependency, and no Decided rule touched. Rule 8 holds: the count-in is gated on `complete`, and the grid stops flipping at the win.
- The `else run([])` in `engine.ts` `applyLayers` is now attached to `if (l.timerTick)`, not to `if (l.fullTick)`. On a frame with a full tick and no timer tick, the engine now calls `mixer.take` twice, the second time with no cues. I read `mixer.take`: an empty take only releases a spark burst that is due, and the first call has already done that, so the second call does nothing. It is harmless, but it reads like a mistake.
- If a timer is already 3 s or less from its flip when the clock starts (an `offset` near the end of a share), the first tick of the count-in is skipped: the frame before had no entry, so nothing changes. I inferred this from the code and did not check it on a puzzle.
- With a 2 s or 3 s share (`TIMER_LIMITS.minSeconds` is 2), the whole-seconds number jumps from 1 to 2 or 3 at the flip itself, so a tick sounds together with the clunk. By the letter of AC2 this is right (it is one of the last 3 seconds before the next flip), but Josh may hear it as noise on TB6. I inferred this from the code and did not check it.

## Must fix
none

## Could improve
1. `src/audio/engine.ts` `applyLayers`: write the timer tick so the `else` keeps its old meaning, for example `const cues = [...(l.fullTick ? [fullTickCue()] : []), ...(l.timerTick ? [timerTickCue()] : [])]; run(cues);`. That is one take per frame, and nobody has to work out whether two takes matter.
2. `src/audio/layers.ts`: skip a tick that falls on the frame where a timer's seconds go up, which is the flip, so a short share does not tick on top of its clunk. Leave this until Josh has listened on TB6.
