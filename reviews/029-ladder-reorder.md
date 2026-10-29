ticket: 029-ladder-reorder
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move `55-two-feeds` to 05 and `56-meet-in-the-middle` to 15 by renumbering every map in between (old 05–13 up by one, old 14–54 up by two). Map content stays the same, tests keep their assertions, the notes and README follow the new numbers, and no production code changes.

## Does the branch do it?
- **load.test validates all 64 maps + lamp-row.** `src/core/load.test.ts` only swaps `08-shrine-circuit` for `09-shrine-circuit` (5 reads, 1 comment). It passes. The full suite is 805/805 and `tsc --noEmit` is clean on the branch.
- **Id = file name, name and heading prefixes, 01–64 used once.** I checked this with a node script over `puzzles/NN-*.json` and the matching `.md`. Every id equals its file name. Every `name` starts with `NN · ` and every note heading with `# NN · `. 64 distinct numbers, no gap.
- **104 renames.** `git diff -M --name-status` shows 104 `R` entries (R090–R099) and no `D`/`A`. The modified files are `59-move-the-meeting.md`, `README.md`, the test files, and `tickets/027-larger-maps.md`. The main session already checked that the JSON content is identical.
- **No old full id left.** I grepped all 52 old ids with `(?<![\w-])id(?![\w-])` over `src/`, every `puzzles/*.md` and `*.json` except the README, and the open tickets 027, 030 and 031. The only hit is the known comment in `src/render/city.ts:149`, which is production code and out of scope.
- **Test edits keep their assertions.** I read every changed line under `src/`. Each one is a path, an id, a title naming a map, or one of the C/D items:
  - `city.test.ts` `ladderNumber` cases: 07→08 and 56→15, with the expected values changed to match.
  - `places.test.ts`: `startsWith("08")` → `=== "09-shrine-circuit"`. This is tighter than before, not looser, and it's what the ticket asked for.
  - `win.test.ts`: the last open entry is now `64-the-whole-chain`, and the `toBeNull` assertion is unchanged.

  No `expect` was removed or weakened, and no test was added or skipped. The count equals main's 805.
- **City tests.** `city.test.ts` changes only the lines named above, and `streets.test.ts` is untouched. Both pass.
- **Notes: bare ladder numbers.** The designer rewrote about 75 bare references, such as "map 56's lesson" → 15, "(47, 49, 52)" → (49, 51, 54), and "22, 32, 35, … 46" → 24, 34, 37, … 48. I spot-checked about 30 against the table and all were right, including self-references ("37 is recoverable" in its own note → 39) and the unmoved `59-move-the-meeting.md` ("as on 56" → 15).
  - I then grepped every note for remaining unchanged lines with bare two-digit references ("rung N", "map N", "as in N", "N's", "(NN)", "after/over/from NN", "NN *Title*"). Every hit names an unmoved map (02, 03, 04, 57, 58, 60, 62). Notes 01–04 and 57–64 have no other bare references to moved maps.
- **README.**
  - The rows are in the new order: Two feeds is 05 and Meet in the middle is 15, numbered 01–64 with no gap.
  - The intro now says 01–56 are ranked.
  - The "55 and 56" paragraph is replaced by a ticket-029 paragraph quoting Josh.
  - The 018 history ("12, 20, 36") is translated to "13, 22, 38 today".
  - "Min clicks for 47 and 52" → 49 and 54.
  - The 018 table is kept as written, with a pointer, and the new 029 table matches the ticket's table.
- **Open ticket 027.** Every map id and number has been remapped (54→56, 31/53/54→33/55/56, 47/52→49/54, 08→09, 05-the-spark→06). I found none left. 026 was left alone, which is right: it was marked done before this branch, and closed tickets keep their ids.
- **Browser criterion.** This is Josh's to check. No production code changed, and the picker and Next order follow file names, so it should hold.

## Rule conflicts and risks
- No production code, `src/grid/`/`src/night/` purity, `puzzles/locked/`, schema, GDD rule or dependency is touched.
- `src/render/focus.test.ts` is outside part C's listed files. It arrived with 026 after the ticket was cut, and the change is only a path (`21-make-room.json` → `23-make-room.json`), so it falls under "every test loads the renamed file". Not a problem.
- The two known pre-018 references (`30-which-break` "rungs 22 and 14", `22-look-both-ways` "rung 13's") were mapped mechanically, and the main session already knows about them. In both, the lesson the sentence names reads like *Behind the first* (now 16) rather than the map the number points at. That was already true before this branch.

## Must fix
none

## Could improve
1. `src/render/city.ts:149`: the doc-comment example `07-where-it-stops` is now an old id. It's production code and out of scope here, so fold it into the next ticket that touches `city.ts`.
2. `puzzles/30-which-break.md` ("rungs 22 and 14") and `puzzles/22-look-both-ways.md` ("rung 13's"): have the puzzle-designer confirm which map each sentence means (probably 16 *Behind the first*) in a later note pass. The fix is to name the map by title so the next renumber can't break it.
3. The ticket's own follow-ups still apply: `.claude/agents/sound.md` and `.claude/agents/puzzle-designer.md` name old ids.
