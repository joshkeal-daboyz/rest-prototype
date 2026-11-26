ticket: 081-Y1-arc-flash-once
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Y1: the brownout arc's soft flash should fire once when each arc strikes, not on every frame of its window, through a pure `arcFlashes` in `fx.ts` wired into both of `drawFx`'s arc loops. Y2: a doc comment on `overlayLabels` saying the fuse label's red is a guard that never shows in play (Josh: "Comment only (Recommended)"), with no code change.

## Does the branch do it?
The builder's commit (4d56daa) touches only `src/render3d/cityview.ts`, `fx.ts`, `fx.test.ts` and `overlay.ts`. The other commit on the branch (c7a532c) is the architect's cut of `tickets/081-puzzles-on-the-city.md`.

**Y1.1, `arcFlashes`: met.** `src/render3d/fx.ts` exports `arcFlashes(spots, time, last, out)` beside `arcSpots`. It is pure: it clears `out`, uses the private `ARC_SLOT_S` (0.2 s, the slot `arcSpots` uses), skips a spot whose `last[i]` is already the current slot, stamps the others and returns them. `arcSpots` gives a window of start 0 to 0.05 s plus a duration of 0.08 to 0.15 s, so at most 0.2 s, and it fits in one slot as the ticket says. So the stamp-per-slot rule gives one flash per window. The new case in `fx.test.ts` ("arc flashes: once per slot for a spot, unstamped ports stay unstamped, and a later slot flashes again") uses 3 ports and covers all four points the ticket lists: the first call in slot 0 returns [0, 2], a second call in the same slot returns [], port 1 stays -1, and slot 1 returns [0] again. Each assertion would fail if the rule broke (no stamp, stamping every port, or a stamp that never clears). It is a real test.

**Y1.2, wiring: met.** `cityview.ts` makes `arcFlashIdx`, `arcLast` and `arcLastAll` (each an `Int32Array(arcPorts.length).fill(-1)`) right next to `arcIdx`. Each loop has its own `last`: normal play uses `arcLast` and `fx=all` uses `arcLastAll`. The `fx.arcAt` loops are unchanged, so an arc is still drawn on every frame of its window. Only `fx.arcFlashAt` moved behind `arcFlashes`. `spots` (`arcIdx`) and `flashes` (`arcFlashIdx`) are separate buffers, so the shared out-array is safe: each call's result is used up before the next call clears it. `arcSpots`' rule and `arcFlashAt`'s look are not touched.

**Y1.3, the look and the count: pending.** As the caller said, the `s03-not-enough-for-all` check in the browser and the before-and-after "soft spot" peak under `perf=1&fx=all` wait until the pane is shown on Josh's PC. I do not count these against the branch, but they are still open.

**Y2.1, comment only: met.** In `overlay.ts`, only `overlayLabels`' doc comment changes. It states all three points the ticket asks for: the grid blows the fuse in the same settle, a blown fuse reads "0 of y", and so the red shows only on a state the grid did not make. It also says the feed's red is real. No code line changes.

**Y2.2, the feed label, the preview numbers and the Relight as today: met.** `overlay.test.ts` is not touched and CI passed.

**Count.** 1 case added and 0 rewritten, which matches the ticket and is well under 15. I ran `npx vitest run --maxWorkers=2 src/render3d/fx.test.ts`: 12 passed in 1.1 s.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, no Decided rule touched, and no file outside the listed ones.
- The `last` stamps assume `time` only moves forward. If the renderer's clock ever jumped back into a slot already stamped, that port's flash would be skipped for that one slot. This is cosmetic, and I have not seen it happen (not checked).
- Under `fx=all`, `arcSpots(..., every = true)` returns every port on every frame, so each port now flashes once per 0.2 s slot. That is the "what play would draw" upper bound the ticket wants for the peak count.

## Must fix
none

## Could improve
1. The two pending checks from Y1.3 (the flash still visible on `s03-not-enough-for-all`, and the soft-spot peak before and after with `perf=1&fx=all`) should be done and recorded in the PR before Josh is asked to merge.
