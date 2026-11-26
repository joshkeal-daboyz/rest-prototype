ticket: 081-NS-series-select
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section NS: only series puzzles (`sNN-<slug>`) are stages. `stageNumber` reads that id form and gives null for the pilots and P0, so the stage select, the title's building and the recorded wins all follow the series. Next on the win splash goes along the series, and old progress is left in place.

## Does the branch do it?
Diff against main: `src/ui/progress.ts` (the `stageNumber` regex and two doc comments) and `src/ui/progress.test.ts` (one case rewritten). It touches no other file.

1. **A stage is a series puzzle.** Met. `stageNumber` now matches `/^s(\d+)-/`, so `s01-first-light` gives 1, and `01-first-light` and `city-two-ways-round` give null. `stageList` is unchanged and filters on it. The case `lists only the series stages: completed ones in number order, then the next, with a pilot or P0 win left out` is the existing one, rewritten as the ticket asked. Its fixture has the pilot `01-first-light`, three series entries and P0, with wins recorded for s03, s01, the pilot and P0. It asserts:
   - the order (s01, s03, then s02 as next);
   - the line text and the completed and next flags;
   - s01 alone when nothing is completed;
   - no next when everything is completed;
   - no lines with no series files.

   With the old regex the pilot would be listed and the case would fail, so it holds the rule. I ran it with `npx vitest run --maxWorkers=2 src/ui/progress.test.ts`: 3 passed in 1.18 s.
2. **What follows in `main.ts`, unchanged.** Met by reading. `startScreens` (main.ts:322) finds the title's stage 01 with `stageNumber(e.key) === 1`, which is now series 01. When there is none it returns false and the first puzzle opens, as T3 does. A locked copy's key `locked/s01-...` gives null and is also skipped by `!e.locked`. Wins are recorded only when `stageNumber(s.key) !== null` (main.ts:406), so only for series stages. `stageNumber` has no other callers in `src/` or `tools/`. `main.ts` is unchanged, as it should be.
3. **Next goes along the series.** Holds with no change, and the branch correctly adds no test.
   - `collectCityMaps` sorts by path with the default string sort. `puzzles/city/s..` comes after the `01-` to `16-` pilots and `city-two-ways-round`, because digits and `c` sort before `s`.
   - The two-digit ids keep s01 to s25 in number order.
   - `nextMap` skips entries whose `locked` differs, so `locked/` copies are passed over.
   - No file in `puzzles/city/` sorts after `s` (checked against the branch's listing), so the last series puzzle built gets no Next.
4. **Old progress is left alone.** Met. `PROGRESS_KEY`, `loadProgress`, `saveProgress` and `clearProgress` are untouched. Pilot wins stay in the map and are not listed (the test asserts that for the pilot and P0). Clear progress still empties the whole map.
5. **Browser.** Josh's, after N1 and NS merge. Not judged here.

Count: 1 case rewritten and 0 added, within the ticket's 2 and the policy's 15. It is a rule-named, fixture-based case, so there is no test-policy issue.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, no file outside the ticket's list, no Decided rule touched.
- Until N1 merges there is no `s01-...` file on main. With this branch alone, the page skips the title and opens its first puzzle, which is a pilot. The ticket's order (NS merges after N1) covers this, so the merge order matters.
- The branch name `ticket/081ns-series-select` differs from the ticket's `ticket/081ns-series-stages`. This is cosmetic.

## Must fix
none

## Could improve
1. The comment at `src/main.ts:405` still says "A numbered stage's win". "A series stage's win" would match the new meaning. `main.ts` is in the ticket's files only under criterion 2, which holds, so leave it unless the file is touched anyway.
2. `stageNumber` would also accept an unpadded `s1-foo`, which would then sort out of path order against `s10-...` for Next. SCHEMA.md (N1) fixes the form as `sNN`, so this is only a note. `/^s(\d{2})-/` would enforce it if wanted.
