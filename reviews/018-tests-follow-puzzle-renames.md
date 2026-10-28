ticket: 018-tests-follow-puzzle-renames
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
The puzzles are now one ladder of 54 maps, `puzzles/NN-<slug>.json`. Every test that loaded `shrine-circuit`, `which-fuse` or `battery-run` by its old file name or id should now use the new name, and nothing else in the tests should change. The work is test files only, no assertion is weakened, and the gate is green at 317 tests.

## Does the branch do it?
- **Same assertions; only paths, ids, titles and one comment change.** I read every hunk of `git diff main...HEAD -- src/`. The 11 files the ticket lists are the only `src/` files touched, and every changed line is one of these: a fixture path (`08-shrine-circuit.json`, `11-which-fuse.json`, `18-battery-run.json`), an expected id (`grid.test.ts` `job:completed` puzzleId, `play.test.ts` `log.puzzle`, the `maps.test.ts` keys and duplicate-key message), a title's map name, or the `blownlamps.test.ts` comment. No `expect` value, element id or matcher changed in any other way. The `maps.test.ts` "lists a locked copy beside its original" test keeps its `x.json` keys and only its expected id changes, which is correct because the key comes from `shrine.id`. Met.
- **Nothing added, removed, skipped or loosened.** None of the changed lines contains `.skip`, `.todo`, `it.fails`, `toBeTruthy`, `toContain`, `toMatch` or `any(`. Per-file counts on the branch match the ticket exactly: core/load 66, grid/battery 23, blownlamps 5, culprit 7, fuseload 7, grid 47, spring 16, play/battery 3, play/play 30, ui/logic 29, ui/maps 5, fusebar 4, labels 2, readable-failures 14, render 29, shock-lamps 25, render/spring 5. Met.
- **Gate.** On the branch, `npm run typecheck` is clean and `npx vitest run` gives 17 files and **317 passed**. Met.
- **Grep.** The ticket's regex over `src/` finds no unprefixed `shrine-circuit` / `battery-run` / `which-fuse` form. Met.
- **Diff scope.** Commit `38ddad6` touches the 11 test files plus the ticket file itself, which is the main session's to commit. No production code and nothing in `puzzles/`. Met.

**Reorg sample check (commit `f9155eb`, which this branch carries):**
- **Compared field by field against `main`.** Only 13 of the 54 maps exist on `main`. The other 41, including 45 and 54, were never committed under their old ids (`git log --all` finds nothing). Results for the 13:
  - **10 differ only in `id` and `name`:** 03 not-enough-for-all, 06 past-the-fuse, 07 where-it-stops, 08 shrine-circuit, 11 which-fuse, 14 behind-the-first, 18 battery-run, 22 one-wire, 27 open-point, 35 spend-the-fuse-first. Their nodes, lines, faults, parts, capacity, target and priority are identical.
  - **3 have gameplay changes** (see the risks below): 12 one-box-three-lamps, 20 look-both-ways and 36 look-behind.
- **17-why-it-blew** matches the inline copy in `blownlamps.test.ts` in every field except `id` and `name`.
- **45-open-point and 54-whole-ward** have no old-id copy in history. I checked them against their own notes instead: 20/20/2 with capacity 6, and 31/33/5 with capacity 7 and `fb_M` ≤7. The counts and values agree.
- **No two maps share an id.** There are 55 JSON files with 55 distinct ids. Every file's id equals its file name, and every `NN-` map's name starts `NN · `.
- **`puzzles/README.md`.** The ladder table's 54 names match the JSON `name`s. The mapping table has 54 rows, with 54 distinct old ids and 54 distinct new ids, and every new id exists as a file. The 13 git renames agree with the table (for example `ladder-10-past-the-fuse` → `06`, `ladder-29-look-behind` → `36`).
- **Josh's quotes are intact.** Under "What it taught us", `11-which-fuse.md` and `18-battery-run.md` are byte-identical to `main`. The only changes to those notes are the title line and one cross-reference (`battery-run's` → `18-battery-run's`).

## Rule conflicts and risks
- **Three maps changed gameplay in a commit that says they didn't.** The reorg commit message and `puzzles/README.md` both say map content is unchanged ("Nothing on any map changed"). Against `main`, three maps changed:
  - `12-one-box-three-lamps.json` gains a `porch` lamp (load 1) and line `l_porch`.
  - `20-look-both-ways.json` drops `capacity` from 4 to 3.
  - `36-look-behind.json` raises `fb_L` `rating` from 4 to 5.

  Each new value matches its design note, and those notes were never committed on `main`. So these are most likely designer revisions that sat uncommitted in the working tree and rode in with the rename, not edits made by the reorg. No locked puzzle is involved (`puzzles/locked/` doesn't exist), so no hard rule is broken. But the record is wrong, and Josh may have played the `main` versions. This is outside 018's own acceptance criteria, which cover tests only, so I don't count it as must-fix. The main session should tell Josh before merge.
- **Two maps are both called "The open point"** (27 and 45). Their ids differ, so nothing collides; it's only confusing in the picker.
- **`blownlamps.test.ts` still says the file "may be untracked".** The inline copy keeps its old id `ladder-08-why-it-blew`, which the ticket requires. Now that `17-why-it-blew.json` is tracked, that phrase in the comment is out of date.

## Must fix
none

## Could improve
1. `puzzles/README.md` (the "Nothing on any map changed" sentence): list the three gameplay changes (12: porch lamp added; 20: capacity 4→3; 36: `fb_L` ≤4→≤5), or get Josh's word on them, so the record matches the files. Not a code change for this ticket.
2. `src/grid/blownlamps.test.ts` line 7: drop "that file may be untracked", since `17-why-it-blew.json` is committed now. Keep the inline copy.
3. Rename one of the two "The open point" maps (27 / 45) in a later puzzle pass so the picker doesn't show the same name twice.
