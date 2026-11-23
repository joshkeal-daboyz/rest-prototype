ticket: 080-city-style-domains-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A only: a mechanical split of `docs/city-style-guide.md` into domain files under `docs/city-style/`, moving the text verbatim, with an index that maps old sections to new files, a short stub where the old file was, the six agent reading lists and live citations pointed at the new files, and the three guide tests reading the new files (two new cases, four deleted, three rewritten).

## Does the branch do it?
- **Every old `##`/`###` heading is in exactly one file, and the index names it (test).** Met. `styleguide.test.ts` case "holds every old heading in exactly one file, and the index map names that file (ticket 080 A)" uses the fixture list `OLD_HEADINGS` (55 headings, in the old order). It checks each heading appears as a whole line in exactly one of the files, and that `index.md` names that file. It fails if a heading is dropped, duplicated or left out of the index.
- **The text moves verbatim (no test).** Met. I checked it myself rather than taking the reply's word. I sorted the lines of `main:docs/city-style-guide.md` and of all the new files together and compared them (`comm`). No line of the old guide is missing. The only lines added are the 12 `# City style: ...` titles, one `#### From 16.9 (the colourway rule)` marker in `buildings.md`, and the body of `index.md`. Word count: old 37,010, new 37,277. The 267 extra words are the index (202) plus the titles and the marker.
- **The stub is under 15 lines (no test).** Met. `docs/city-style-guide.md` is now 7 lines and points at `docs/city-style/index.md` and `numbers.md`.
- **Agent reading lists exist and none cites the old guide (test).** Met. The case "every docs/city-style path an agent reading list cites exists, and none still cites the old guide (ticket 080 A)" scans every `.claude/agents/*.md`. A grep outside tickets, reviews and playtests finds no live citation of the old file. The only hits are `docs/city-state-2026-11-19.md` and `docs/handoff-2026-11-19.md`, and the ticket says history files are not edited.
- **The main session updated the six reading lists (no test).** Met. buildings, facades, landscape, planner, streetscape and tech-pass each now cite domain files and keep the old section numbers in brackets. landscape's broken "street furniture chapter (R10)" citation now points at `facades.md` (16.5), as the layout table says.
- **Live citations repointed (no test).** Met: `docs/city-grammar.md` and the headers of `citymetrics.ts` and `citymetrics.test.ts` (see Could improve 1 on how precise they are).
- **`styleguide.test.ts` reads by path through one helper; chapter-order cases deleted; three rewrites in stacktown and terracepack (test).** Met. `guideFile()` is the one reader. `readGuide()` puts the blocks back together in `OLD_HEADINGS` order, so the existing `chapter(n)` cases still see the same text. The four chapter-order cases ("has the sixteen chapters...", "has its nine parts", and both "has its eight parts") are deleted, not rewritten. `stacktown.test.ts` (two cases) now reads `buildings.md` and `buildings.md`+`packs.md`. `terracepack.test.ts` (one case) now reads `scale-and-lots.md`.
- **The three tests are green (no test).** Met. I ran `npx vitest run src/render3d/styleguide.test.ts src/render3d/stacktown.test.ts src/render3d/terracepack.test.ts --maxWorkers=2`: 3 files, 139 passed, 1 skipped (the optional manifest check), 19.1 s total. styleguide took 1.3 s; terracepack's 18 s is existing whole-map cases this branch did not add. `tsc --noEmit` is clean.

Test policy: styleguide has 79 cases on main and 77 on the branch. There are 2 new and 3 rewritten cases, 5 in all, within the ticket's "at most 6" and the policy's 15. No report-only test, no new whole-city test, no new slow file.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, no GDD Decided rule touched. The guide's text is unchanged, line for line.
- Files: everything the branch touches is in the ticket's Files list. The `.claude/agents/*.md` edits are the main session's, per Q1. `tickets/usage.md` is the usual token log.
- Section 1 ("Purpose and status") and the old title went to `decisions.md`, not `index.md` as the layout table says. The ticket allows the renderer to move a section, and the index records it, so this is not a conflict.
- The two deleted "eight parts" cases also checked that every bullet in chapters 18 and 19 carries a tag. The general case "tags every rule: Decided and Default name a ticket..." still runs over the whole rebuilt text, so that coverage mostly survives. The ticket asked for the deletion.

## Must fix
none

## Could improve
1. `citymetrics.ts` and `citymetrics.test.ts` headers say "chapter 16 of docs/city-style/index.md". The R1 to R13 checklist lives in `docs/city-style/evaluation.md` (16.8), so pointing there would save a hop. Likewise, `docs/city-grammar.md` says Law lines "quote a Decided line of `docs/city-style/index.md`", but the index has no Decided lines. "the domain files under `docs/city-style/`" would be accurate.
2. The index's "Read by" column and the reading lists disagree in places. The index says `scale-and-lots.md` is read by the planner, but the planner's list does not cite it. buildings reads `streets-and-blocks.md` (16.3), but the index lists only the planner for that file. The reading lists follow the old citations faithfully, so it is the index column that could be brought in line, in B1 or here.
3. The heading case also checks `index.md` is under 2 KB. That budget belongs to the standard in B1. It is harmless here, but B1 could move it into its budget case so one check lives in one place.
