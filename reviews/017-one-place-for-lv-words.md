ticket: 017-one-place-for-lv-words
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move the level words from ticket 014 (`LvN Lamp/Fuse/Powersource`, `using N of M`, `carrying N of M`) into one pure module, `src/core/words.ts`. The map captions, hover text and HUD/notices then call that module, and every on-screen string stays the same except one: a feed with no limit now reads `using N (no limit)` on the map (and `! using N (no limit) !` in the alarm).

## Does the branch do it?
- **Part 0 (core).** `src/core/words.ts` matches the interface in the ticket: `THING_NAMES`, `levelLabel`, `lampLabel`, `fuseLabel`, `powersourceLabel`, `usingText`, `carryingText`, `NO_LIMIT`. It has no imports. `src/core/words.test.ts` covers every string the criterion lists: `levelLabel` for each thing with a level, with null and with undefined; each named label; `usingText` with a limit and with null; `carryingText` with a rating, undefined and null; the non-integer cases `Lv2.5 Lamp` and `using 2.5 of 4`; `NO_LIMIT`. It also checks the source for `import`/`require` lines and checks the re-export from `src/core/index.ts`, which gains one export line. Met.
- **A (render).** `src/render/labels.ts` builds its strings from `../core`. The exported names and signatures are unchanged, and `map-renderer.ts` is not touched. `fuseCaption` keeps the `""` for an unrated fuse. The `feedUsing` doc comment now says `using 3 (no limit)`. In `labels.test.ts`, exactly the two allowed lines changed: `feedUsing(3, null)` and `feedAlarm(5, null)`. A grep of `labels.ts` for level-word literals finds only doc comments, no string literals. Met.
- **B (play).** `src/play/prompt.ts` builds the lamp hover, both fusebox hovers and `TEXT.wouldBlowAgain` from `lampLabel`/`fuseLabel`/`carryingText`, as the table says. `wouldBlowAgain` keeps its name and signature. No test file in `src/play/` is in the diff, and they all pass. The grep finds no `Lv`, `carrying ${` or level-name literals. Met.
- **C (ui).** `capacityReadout` and `noticeFor` (`fuse:blown`, `grid:brownout`) in `src/ui/logic.ts` use the core words. `NO_LIMIT` is not appended twice: the null case gives `Powersource — using N (no limit)`, the same as on main. `logic.test.ts` is not edited and passes. The grep finds only one doc comment at line 47, no string literals. Met.
- **All parts.** Only the recorded no-limit string changes. The only test file in the diff is `labels.test.ts`, with its two allowed lines. `src/grid/`, `src/night/` and `puzzles/` are untouched. `npm run typecheck` is clean. `npm test`: 18 files, 290 tests passed, and the count grew with `words.test.ts`.

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are untouched. `words.ts` is in `src/core/` (shared types/words, which every folder may import) and has no imports, so the 3D game can take it as is. No new dependency, no GDD rule touched, and every file is within each part's Files list.

## Must fix
none

## Could improve
1. The doc comments in `src/render/labels.ts` (lines 7, 12, 17, 22) and `src/ui/logic.ts` (line 47) still spell the strings out, e.g. `` `Lv2 Lamp` ``. They are not code and the ticket's grep is for string literals, but if a word changes later they will go stale. They could point at `src/core/words.ts` instead.
2. `capacityReadout` and the `grid:brownout` notice now print `Powersource … (no limit)` if capacity is ever null. That cannot happen today, because the event types say `capacity: number`. Before this branch the same case would have printed `Lvnull`, so this is only an improvement. No action needed.
