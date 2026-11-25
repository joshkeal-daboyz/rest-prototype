ticket: 081-U3-quiet-scenery
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section U3 of ticket 081: the Relight sound chimes only for the lamps the puzzle file names, not for the hidden scenery lamps that S1's conversion adds. To do this, `relightCues` moves out of `src/main.ts` into `src/ui/` and gets a `hidden` argument (the duration stays the same), and `main.ts`'s highlight set `lampIds` leaves out hidden ids.

## Does the branch do it?
The branch's own commit (579f9f4) touches `src/main.ts`, plus the new `src/ui/relightcues.ts` and `src/ui/relightcues.test.ts`. The other files in the diff against `main` come from merging `origin/main` into the branch.

1. **The cues (met).** `src/ui/relightcues.ts` holds the same arithmetic as the old `main.ts` function, with two changes. It now takes the plan, which keeps `src/render/`'s `planRelight` out of `src/ui/`, as the ticket's "or a new `relightcues.ts`" allows. It also drops hidden ids from `lampOrder` before mapping them to `nodeArrive`. `duration` is passed through from the plan unchanged. The ticket's single test is `relightcues.test.ts`: one hidden lamp among three gives `igniteAt` `[1.5, 4]` and duration 6. It fails if the filter is removed (it would then give `[1.5, 2.5, 4]`), so it is real coverage. It passes (1 test, 4 ms).
   **The wiring gap I was asked to check: there isn't one.** The builder's note that "until S1 merges the hidden list is empty" no longer applies, because S1 is on the branch and the value goes through end to end:
   - `src/city/circuit/convert.ts:100` returns `hidden: hung.hidden`, filled in `scenery.ts:50,112` with the split junctions and segments and every scenery lamp with its line.
   - `src/render3d/cityview.ts:72` `loadCityView` returns `convertCityPuzzle(city, plan)` unchanged as `converted`.
   - `src/main.ts:120-126` `open()` (the only way a puzzle opens) takes `view.converted.hidden ?? []`. It stores it in the session (`hidden`, line 238) and passes `s.hidden` into `relightCues` at line 296.
   - The node index matches the plan's. `planRelight` indexes `nodeArrive` by `puzzle.nodes` (`src/render/relight.ts:21`), and `main.ts` passes `s.puzzle.nodes.map((n) => n.id)` from the same converted puzzle the plan was built on. `lampOrder` keeps only lit lamps whose `nodeArrive` is finite, so the `?? 0` fallback is never reached in play.
2. **`lampIds` (met).** `src/main.ts:143` filters out `hiddenIds`. The ticket asks for no test here, and none was added.
3. **Browser (Josh).** Not mine to check. From the code, `city-two-ways-round` should play one ignition per lit file lamp.

Test count against `main`: 1 added (`it(` in the added lines). The cap is 15.

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are untouched. Nothing in `src/render/`, `src/render3d/`, `src/play/` or `src/core/` is touched. `relightcues.ts` imports nothing, and `main.ts` is the only file that calls `planRelight`. No new dependency, and no GDD Decided rule changed.
- `duration` is still the whole cascade's length, so it includes the flare of a hidden lamp lit last. The sound can run past its last audible chime. The ticket asks for exactly this ("the duration is unchanged"), and the renderer's light cascade still runs that long.

## Must fix
none

## Could improve
1. `src/ui/relightcues.ts`: `hidden` defaults to `[]` and has one caller that always passes it. The default could go, so that a future caller can't silently leave scenery chiming. This is minor.
