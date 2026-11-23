ticket: 080-city-style-domains-b1
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B1: write `STANDARD.md` (the nine points, under 3 KB), add a mapping table to `decisions.md` (one row per Decided line and per Default or Info line that quotes Josh, the old line verbatim), add drift checks for budget, shape, provenance and the mapping, delete the wording-pin cases the standard replaces, and condense the first two domains, `exclusions.md` and `packs.md`, to the standard.

## Does the branch do it?
I compared against `refs/heads/main` (c6fbd72, which has section A merged). The B1 diff is the single commit e2fe703: 11 files, all within the ticket's file list. It touches nothing in `src/grid/` or `src/night/` and adds no dependency.

- **STANDARD.md, nine points, under 3 KB.** Met. `docs/city-style/STANDARD.md` is 1,966 bytes and has points 1 to 9 in the ticket's order. It adds three refinements that don't contradict the ticket: facts carry no status, old numbered headings stay under Rules, and the file's own budget is 3 KB.
- **Mapping table, a row for every Decided line and every Josh-quoting Default/Info line.** Met. I checked this with a script, not by eye. There are 112 rows and no duplicate ids. For each row I unescaped the `\|` and searched for the "old line, verbatim" cell in the pre-split guide (`6d4eadd:docs/city-style-guide.md`). **All 112 are exact substrings: none was paraphrased.** In the other direction, every old-guide line tagged Decided, and every Default/Info/Pending line that names Josh and has quotation marks, is a row. That is 77 candidate lines. The only three not mapped are the tag definition, the "Open (waits for Josh's own verdict on the match)" placeholder and the "These are not chapters yet" paragraph, and none of those is a ruling. The rows for converted lines (D-043b, D-048n, D-039a, D-038a, D-070a, D-070b, D-042z) name a file and rule that cite their id.
- **(test) Budget, header and parts in order, no quotes, dates or `Q<n>` in a `standard: yes` domain.** Met: `styleguide.test.ts`, "keeps the standard, the index and every standard: yes domain within budget", "gives each standard domain its header, then Rules, then Open questions last, and only the three statuses", and "puts no quoted words, date or question number in a standard domain". Each would fail on a broken file: the order uses `findIndex`, the status regex is strict, and `DATE` covers `18 Nov 2026`, `Nov 18, 2026` and ISO dates. `exclusions.md` is 4,338 B and `packs.md` is 7,237 B.
- **(test) Every `[D-...]` resolves, and every row's home cites its id.** Met: "keeps the mapping table whole: ...". It checks that ids are unique, that every `[D-...]` in any non-log file is on a row, and that a non-verbatim home contains `[id]`, names a `standard: yes` file, and that file holds the id.
- **(test) No empty home; `verbatim` only for unconverted domains.** Met, in the same case: a `verbatim` row's line must still stand in a file that is not `standard: yes`, and once every domain is converted no row may say `verbatim`. The ticket asked for five cases and the builder merged two of them. That still fails on either break, so fewer cases is fine.
- **(test, removed) The wording pins are deleted, and the kept list stays.** Met. `styleguide.test.ts` goes from 76 to 54 cases: 26 deleted and 4 added. Rewritten: the A heading case (its index-budget line moved into the budget case), the tag case (it now skips condensed lines), the never-used case (it now also checks the reason column), and one `stacktown.test.ts` case. That is 8 new or rewritten cases, within the ticket's 8 and the policy's 15. All of the kept list is still present: the Numbers drift, files and constants exist, the pack table vs `MODEL_TABLE`, fronts and corners, never-used = `CITY_NEVER_USED`, the colourway ids, R1 to R13, and the view URLs.
- **First batch is `exclusions.md` and `packs.md`.** Met. Both say `standard: yes`. The manifest readings and the two gallery descriptions moved verbatim to the end of `evaluation.md` (I checked them against main's `packs.md`).

Gate: `npx vitest run src/render3d/styleguide.test.ts src/render3d/stacktown.test.ts src/render3d/terracepack.test.ts --maxWorkers=2` gave 3 files, 117 passed and 1 skipped, in 18.0 s (styleguide 818 ms). `tsc --noEmit` is clean.

### Condensing: did any rule change meaning or get dropped? (the comparison you asked for)
**`exclusions.md` vs main: no rule changed meaning and none was dropped.** The never-used table is identical row for row. The only change is that the Josh quote in the `SM_Prop_LightPole_*` row became `[D-070a]` and "(042 Q9)" became `[D-042z]`. Removed: "Info" labels and the "055 F" tag on the steps fact (the standard says facts carry no status), "(Josh, Q35)" and "Q42" (now in D-070b), "057 D" shortened to "057", and two measurements. Both measurements still live elsewhere: the steps' 1.2 x 0.5 x 0.9 m is in `facades.md` 16.10, and the stairs' depth is in the table row. The five Open lines keep their text, with "waits for" moved to a trailing `Waits for:`.

**`packs.md` vs main: no rule was dropped. One sentence was reinterpreted, and one fact was deleted rather than moved.**
- D-043b keeps its meaning. It drops the history clause "This overtakes 041 Q4's 'SIMPLE Town only'" but keeps "stays the working set until a ticket adopts POLYGON buildings".
- D-048n has the reinterpretation. Old: "Lots are not resized for either pack (a later ticket does that: "lots are sized to buildings", 041; the terrace is 051)". New: "a later ticket does that, and the terrace is the one exception". `scale-and-lots.md` 051 (blocks packed as wide as their columns) supports this reading, but "the one exception" is a claim the old line didn't make. The same rule also drops "for now" and "042 E's".
- D-039a and D-038a are unchanged apart from "(039's check)".
- Step 5 drops "(ticket 045)", "(ticket 048)" and the Town Pack's `savedAt` timestamp. The timestamp still stands in `buildings.md` (D-048l, line 66).
- The gotcha "so `town-pack` is a GLB of about 110 MB" was deleted, not moved to `evaluation.md`.
- The two Pending/Open lines became Open questions with the same content.
- The new sentence "Both are dev only" is true of the code: `renderer.ts:55-56` gates the gallery on `import.meta.env.DEV`.

### Deleted and rewritten cases: did any remove a real check? (the second check you asked for)
Most of the 26 deleted cases pin wording: quotes, "records", "no longer holds", "points chapter ... at", "drops the retired lines". These cases also held real checks, each listed with what still covers it:
- `sills.STEPS_KEY` equals `town-pack:SM_Bld_House_Concrete_Steps_01`: still pinned at `sills.test.ts:325`.
- `CITY_NEVER_USED` contains the LightPole and TrafficLight stems: covered by "lists exactly CITY_NEVER_USED", and the rewritten case now also checks both rows' reasons.
- The constants named in 16.10 and 16.11 exist in `escapes.ts` and `sills.ts`: covered by "names only constants that exist" and the two Numbers-row coverage cases.
- `FRONTAGE_CHECK` and `VARIETY_CHECK` ids: the code side is still pinned at line 910. Only the doc's `| G1, ` table rows lost their pin.
- **L2c: `CELL_M` is 5, and 18.2's "2 x 5.0 m x 5.0 m = 50 m2" is built from `CELL_M`.** This is the one real doc-to-constant tie that is lost. `CELL_M` = 5 is still pinned at `src/city/traffic/fixtures.test.ts:238`, but the figure in `parking.md` 18.2 no longer fails if `CELL_M` changes. The ticket named the "L1 leftovers" cases for deletion, so this is per the ticket, not a must-fix.
- `tilecity.ts` no longer exports `CITY_BAYS_PER_BLOCK_MIN` and the other retired names: a stale cleanup guard, low value.
- 16.12's "View | Opens in" literal column: a doc pin. The behaviour is in `daytoggle.test.ts`.

The `stacktown.test.ts` rewrite stays as strong as before for what is still in the domain. It drops the `Open (043 Q4, ...)` wording pin, splits the stack-gallery URL into two `toContain`s (the domain no longer gives it whole; the whole URL is in `evaluation.md`), and the step-10 regex follows the de-indented list.

## Rule conflicts and risks
- No hard-rule break. Every file is in the ticket's list, `src/grid/` and `src/night/` are untouched, no GDD Decided rule changes, and there is no new dependency.
- `readGuide()` lays out only `OLD_HEADINGS` blocks. The new `## Moved from packs.md ...` block in `evaluation.md` is therefore dropped from `doc`, so "names only files that exist" and "names only constants that exist" no longer scan the moved gallery and manifest text (`BUILDING_FRONTS`, `STACK_STYLES`, `stackgallery.ts` and others).
- The end-state check will block B2. It requires that no row says `verbatim` once every domain is converted, and a non-verbatim home must name a `standard: yes` file. Rows whose line lives in `evaluation.md` can't meet that, because `evaluation.md` is never `standard: yes`: D-043c (now there), and D-053a, D-053b, D-000b, D-000c, D-063d and D-057e (old 16.8, 18.8 and 19.7).
- `index.md`'s "Read by" column now says what the agents' reading lists actually cite, which differs from the ticket's layout table. For example, planner no longer reads `scale-and-lots.md`, and no list cites `packs.md` or `light-and-accessibility.md`. This records the gap; it doesn't close it.

## Must fix
none

## Could improve
1. `docs/city-style/packs.md` 13, D-048n: put the old parenthesis back in standard form, for example "a later ticket does that; the terrace (051) sizes its blocks to the buildings". Otherwise make sure Josh's domain screen shows the old and new lines side by side. "The one exception" is a new claim.
2. `docs/city-style/packs.md` gotchas: move "so `town-pack` is a GLB of about 110 MB" to `evaluation.md` with the other manifest readings instead of deleting it.
3. `src/render3d/styleguide.test.ts` `readGuide()`: append blocks whose heading isn't in `OLD_HEADINGS` (or just the whole text of `evaluation.md`) so that the file-exists and constant-exists checks keep scanning moved text.
4. `styleguide.test.ts` mapping case: before B2's last domain, allow a row's home to be `evaluation.md` (a non-domain) explicitly, or the end-state assertion will fail on the measurement rows listed above.
5. The main session should decide whether the agents' reading lists or the ticket's layout table is right. `index.md` now documents the difference (planner and `scale-and-lots.md`; asset-scout and renderer and `packs.md`).
6. The ids D-000b and D-000c stand for "no ticket". A ticket-based id (056 or 070 for the P1 and P3 rows) would read more consistently.
