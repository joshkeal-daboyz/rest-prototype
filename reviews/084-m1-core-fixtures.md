ticket: 084-m1-core-fixtures
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section M1 of `tickets/084-first-play.md`: point `src/core/load.test.ts` and `check.test.ts` at the copies in `puzzles/fixtures/`, remove the three corpus sweeps it names, and reword `check.ts`'s doc comment to `puzzles/city/<id>.md` (or a fixture's note). It adds and rewrites no tests, and touches only those four files.

## Does the branch do it?
I diffed against `origin/main` (24cd7c9, the A3 merge). The local `main` is stale and shows 111 files. The branch changes 4 files: +7 lines, -68.

1. **The paths.** Both `load.test.ts` and `check.test.ts` now set `PUZZLES = join(__dirname, "..", "..", "puzzles", "fixtures")`. Only that line changed. `09-shrine-circuit.json` and `20-battery-run.json` are both in `puzzles/fixtures/`. Met.
2. **The three removals.** Removed: `load.test.ts`'s "every puzzle file in puzzles/ validates", `check.test.ts`'s "every check block in puzzles/*.md is valid" (its own `(the scan runs)` floor case went with it), and `words.test.ts`'s "every lamp id in puzzles/ has a place kind of its own" (both of its cases). The unused `existsSync` and `readdirSync` imports were dropped. `PLACE_KINDS` and `placeBase` are still used by the `placeKind` cases. Met.
3. **The comment.** The `check.ts` doc comment now reads `puzzles/city/<id>.md`, or a fixture's in `puzzles/fixtures/`. Only the comment changed. Met.

**The removal beyond the ticket** is `load.test.ts`'s "puzzleFeeds: multi-feed maps give one entry per feed node, with its own capacity". It is sound, with one gap.
- **It had to go or change.** It ends with `expect(seen).toBeGreaterThan(0)`. I counted the feed nodes in all 13 files in `puzzles/fixtures/`: each has exactly one. On the fixtures the case would fail. It is the kind of corpus-only sweep the M preamble says to remove ("removes the sweeps that only existed for the 66-map corpus"), so the removal is inside the section's intent, not extra scope.
- **What still covers it.** The built case "puzzleFeeds: per-feed capacity and names, in file order; the id stands in for a missing name" uses `twoFeeds()`, which is 09 plus a `south` feed. It asserts one entry per feed node, in file order, with ids, names and capacities. That covers the removed sweep's id and order assertions.
- **The gap.** Both built feeds have capacity 2. The corpus maps the sweep caught had different capacities on their feeds. I read their feed capacities: 3 and 4 in `05-two-feeds`, `15-meet-in-the-middle`, `59-move-the-meeting`, `63-keep-the-wire` and `64-the-whole-chain`. If `puzzleFeeds` gave every feed the first feed's capacity, the sweep would have caught it and the built case would not. This is a narrow loss, not an unmet criterion (see Could improve 1).

**Tests run** (the three changed files, `--maxWorkers=2`): `load.test.ts` 32, `words.test.ts` 37, `check.test.ts` 28, all passed in 1.7 s.

**Count against main:** 0 added or rewritten. The diff's added lines hold no `it(`. Removed cases don't count.

## Rule conflicts and risks
- None found against the hard rules. Nothing in `src/grid/` or `src/night/` changed, there is no new dependency, no Decided rule changed, and no file is outside M1's list.
- The one-feed sweep "puzzleFeeds: one-feed maps give the old capacity, unchanged" now walks the 13 fixtures. It skips any file that fails `validatePuzzle`, including the `.city.json` file, and it has no floor. That is fine while 09 and the other fixtures validate. It was the same before.
- After M2, `src/grid/feeds.test.ts`'s multi-feed branch (around line 382) will also find no two-feed fixture. Multi-feed behaviour will then rest on built cases alone. That is M2's question, not this branch's, but it makes the gap below worth closing somewhere.

## Must fix
none

## Could improve
1. `src/core/load.test.ts`, the "puzzleFeeds: per-feed capacity and names, in file order" case: give `south` a capacity different from the north feed (say 3) and expect `{ id: "south", name: "South", capacity: 3 }`. The built case would then catch the mistake the removed sweep caught on 05, 15, 59, 63 and 64: one feed's capacity handed to every feed. It is 1 rewritten case, within the cap. Change only that case, because the other `twoFeeds()` cases don't depend on the number.
