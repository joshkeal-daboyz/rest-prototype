ticket: 084-a4-renderer-off-pilots
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
No renderer file reads a pilot or `puzzles/city/city-two-ways-round`. The four P0 readers and `overlay.test.ts`'s shrine panel read the copies A3 put in `puzzles/fixtures/`, and the title backdrop is built on `s01-first-light` instead of the pilot `01-first-light`. Only paths change: no case, assertion, `TITLE_VIEW` or pose is edited.

## Does the branch do it?
The diff against `origin/main` (24cd7c9) is 6 files, 10 lines changed, and every change is a path string.

1. **P0 by its fixture path.** `circuitdraw.test.ts:105`, `cityframe.test.ts:12`, `overlay.test.ts:156`, and all three reads in `windows.test.ts` (lines 42, 203, 311) now read `puzzles/fixtures/city-two-ways-round.city.json`. `overlay.test.ts:20` reads `puzzles/fixtures/09-shrine-circuit.json`. No `it(` line, name or assertion is touched: the diff adds 0 test lines. Met.
2. **The title stands on `s01-first-light`.** `title3d.ts:435` (the glob) and `:449` (the error text) name `puzzles/city/s01-first-light.city.json`, and `title3d.test.ts:12` reads it. Both title cases pass. Met. On the question I was asked to look at, I checked it directly with a throwaway probe in vitest, deleted afterwards:
   - The building exists in the default city's plan: `block:4:8/b|outer|+z|26,80`, the place of s01's `shrine` lamp, the first and only `target`. `titleWindow` finds it, and `target.lit` holds it plus the building backed onto it (`block:4:8/b|inner|-z|27,79`).
   - It is 9 m tall, the same as the old building (`block:8:0/a|outer|-x|85,8`). The city's median is 12 m and its tallest is 15 m.
   - At 16:9 the building's mid-height projects to NDC x 0.363 (it was 0.454) and its roof to y 0.174 (unchanged). It is still in the right third, but only 0.03 inside the 1/3 bound the composition case asserts. See Could improve 1.
   - The window is 3 blocks, where the old one was 4, because block 4:8 sits on the city's edge. The case's `win.blocks.size > 1` and its left-third-clear check both pass.
3. **The title looks right in the browser.** This criterion is browser-only. Josh checks it from the builder's before and after screenshots, and I did not run the game. The numbers above say the building lands right of centre with its roof in the upper half, as before.

Other readers: `grep` finds no other renderer read of `puzzles/city/<pilot>` or of `city-two-ways-round` outside `puzzles/fixtures/`. Some strings remain, and none of them is A4's:
- `?puzzle=01-first-light` in `plan3d.test.ts` and `tileslots.test.ts` is a URL fixture, not a file read.
- `styleguide.test.ts` MAPS and `look.test.ts` / `relight3d.test.ts` read `09-shrine-circuit`, which is M5's job.
- `cityframe.test.ts:56` already read s01.

Tests: I ran the five changed files with `--maxWorkers=2`. 45 passed in 10.2 s.

## Rule conflicts and risks
- None found. Nothing is touched in `src/grid/` or `src/night/`, no file is outside the listed five tests plus `title3d.ts`, `TITLE_VIEW` and the poses are untouched, there is no new dependency, and 0 test cases are added or rewritten.
- Risk, not a blocker: the title's building is now 0.03 NDC from the composition bound at 16:9. A later re-lay of s01 (E2a does not touch s01, D1 adds a guide only) or a city-pipeline change that moves block 4:8's row could tip it over. The stop rule in criterion 2 covers that case.

## Must fix
none

## Could improve
1. When Josh looks at `?title=title` (criterion 3), point him at the building sitting nearer the centre than before (NDC x 0.36 against 0.45 at 16:9). If he wants it further right, that is a `TITLE_VIEW` change, which needs its own ticket line under criterion 2's stop rule. It is not something to tune on this branch.
