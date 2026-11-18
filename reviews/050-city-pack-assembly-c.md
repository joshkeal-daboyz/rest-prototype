ticket: 050-city-pack-assembly-c
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C: put the assembled City Pack stacks on the town's large and tall lots through a three-step chain (stacks, else Town Pack, else SIMPLE Town, never mixed), with the variety and corner rules holding, every stack inside its lot, under its cap and facing its road. It also promotes the stack pieces' fronts into `BUILDING_FRONTS` and updates the guide. A fresh checkout and CI must stay exactly today's town, and `town.ts` must not change.

## Does the branch do it?
- **10, the chain.** `buildingPlan` (models.ts) takes an optional `stacks: StackOffer[]`. For a type in `STACK_LOT_TYPES` it uses only `stack:<style>` names when the offered styles reach `POLYGON_MIN_FAMILIES`, and otherwise falls through to the unchanged 048 rule. stacktown.test.ts covers all three fixture sets:
  - with stacks: "large and tall are stacks (six and four styles), small and house are the Town Pack";
  - without a City Pack: "every type is as on main", which pins the large and tall SIMPLE names;
  - with no POLYGON pack: "the same plan and picks on every map for a SIMPLE-Town-only manifest", built against `MODEL_TABLE` with the town-pack rows stripped, i.e. pre-048.
  - "never mixes" and the fallback test (tall drops to SIMPLE at 2 styles; large falls past the Town Pack to SIMPLE) cover the rest. Met.
- **11, variety and corners.** Run on the stack plan over every map:
  - families per type (6 / 4), the neighbour rule (more than 1000 pairs), `FAMILY_SHARE_MAX` and determinism all pass strictly;
  - the street-repeat rule is strict on large (more than 200 checks). Tall has exactly `STREET_REPEAT_GAP + 1` = 4 families, so it is checked with a tolerance: 2 repeats in 2203 checks, with at most 0.5% allowed. See the first risk. The repeats come from `pickBuildings`' documented last-resort order (cap, then street rule, then neighbour rule), which the ticket says applies to stacks unchanged. So it is met in substance, not to the letter;
  - corner columns only on sides the lot has, and none mid-row: "gives a stack a corner column only on a side its lot has ..." plus the fallback test. Met.
- **12, in the town.** "keeps every stack's footprint inside its lot and its height under the lot's cap, on every map" checks every piece's four turned corners against the lot rectangle (more than 100 placements). "points every street face at the lot's road" checks the stack marker and each front-row piece within 0.5°. The new 041 B ray run on 09 and 64 uses stack-sized boxes. 041 B's own test is not in the diff, so it is unedited. Met.
- **13, fronts promoted.** All 34 recipe keys have lines, and the 8 `_Corner_` pieces carry `corner: true, open: "+x"`. The test lists the 25 keys in the saved file and the 9 that are not, checks there is no other city-pack line, and checks that the savedAt `2026-11-18T03:50:16.193Z` is in models.ts and in the guide. I read the saved file's `savedAt` and its 49 city-pack lines: all are "+z", which matches. Met as written. The lines are guesses, and both the code and the guide say so.
- **14, the guide.** It covers chapter 5 (the chain and `STACK_LOT_TYPES`), 6 (the 26 provisional lines), 7 (the corner table, Josh's "base units" quote as Decided, corner columns as Default), 13 (`in use`, and the Open line narrowed), 15 (step 10 and the 050 B gallery line) and Numbers (`STACK_FLOORS.*`, `STACK_STYLES[i].pitch_m`). styleguide.test.ts pins the new Numbers rows, and stacktown.test.ts checks the chapter contents. Met. Wording nit: criterion 13 asked for "in use (stacked buildings)", and the table has `in use` with "stacked buildings" in the supplies column. That is fine, since the drift test needs the bare status.
- **15**: Josh's browser check, not judged.
- **Fresh checkout and CI.**
  - With no manifest, `loadModels` returns `NO_MODELS` before any stack code runs.
  - With no city-pack in the manifest, `set.stack` is null, `stackInput` is null, and `buildingPlacements` and `applyModels` take the old path. Tests: "adds no stack group at all when no stack piece loaded", "gives the same placements when ... its GLB fails to load", and the SIMPLE-only picks test.
- **town.ts and assets.** `git diff goal/city-style...HEAD -- src/render3d/town.ts` is empty. `git ls-files assets/private` is empty. No other forbidden path is in the diff (seven files, all in `src/render3d/` and `docs/city-style-guide.md`).
- **CI safety.** stacktown.test.ts reads only `puzzles/` and repo source at module level. It uses fake GLBs and typed-in sizes, never reads `assets/private`, uses no Windows paths and no timers. Its top-level `await setOf(...)` uses in-memory fakes only.

## Rule conflicts and risks
- **Tall street-repeat (builder's flag 1). A decision for Josh, not a builder fix.**
  - Criterion 11 says the existing street-repeat test passes as a second fixture. The existing form in facing.test.ts and polygon.test.ts is strict for any type with more than 3 families, and with 4 tall styles it would fail twice in 2203 checks.
  - The ticket also says `pickBuildings`' rules apply unchanged, and `pickBuildings` is not on C's file list. Its documented fallback drops the street rule before the neighbour rule. Stack families are shared across large and tall (`city-pack:stack:<style>`, as the ticket specifies), so a large neighbour can block one of tall's four families.
  - The ways to get zero repeats are all outside this section's remit: a fifth tall style, per-type stack families (against design item 6's family name), or a `pickBuildings` change.
  - The 0.5% tolerance is honest and is named in the test. Put it to Josh: accept about 0.1% street repeats on tall, or re-cut for one of those options.
- **Existing tests edited (flag 2).** The ticket says "Existing tests are not edited", and criterion 18 lists polygon.test.ts as "Keep (unedited)". The branch edits polygon.test.ts (one test now filters `town-pack:` instead of `!simple-town:`, and is renamed) and styleguide.test.ts (stacks.ts as a known module, a dotted/indexed lookup, the 05x tag regex, recipe packs counting as in use, the new required Numbers rows).
  - Each edit is forced by another criterion. Criterion 13 requires city-pack lines, which the old "none for the City Pack" assertion forbids. Criterion 14 requires 050 tags, stacks.ts Numbers rows and city-pack "in use", which the old regex, module list and `tablePacks` reject.
  - The edits are minimal, and none weakens an assertion on anything they did not have to touch: the 14 Town Pack lines and the no-corner check are kept, and the city-pack lines are pinned exactly in stacktown.test.ts.
  - This is a contradiction in the ticket, and the architect should note it. I don't count it against the builder.
- **stacks.ts touched in C (flag 3).** One new pure function, `offeredStacks`, plus an import. stacks.ts is the renderer's own file and was on A's and B's lists. Putting `StackOffer` in models.ts and the function in stacks.ts avoids a models.ts to stacks.ts cycle. Minor scope drift, harmless.
- **Every caption now unmarked (flag 4).** Criterion 13 puts every recipe key in `BUILDING_FRONTS`, so the stack gallery never shows `guess` again, although all 34 fronts and all 8 `open` sides are unconfirmed. The code comment and chapters 6, 7 and 15 say "provisional" and "an unmarked piece still needs a look", so the record is honest. But the gallery's own signal is gone. Fixing it needs gallery.ts or stackgallery.ts, which are not on C's list.
- **Exclude drops a recipe piece (flag 5).** This is design item 6 ("a style with any excluded required piece drops out"), and "drops an excluded piece like a missing one" tests it. The stack gallery builds its keys itself and does not go through `loadModels`' exclude, so an excluded piece still shows in the gallery and can be un-excluded there. Fine.
- **`sharedModels` always asks for the stack keys (flag 6).**
  - No manifest: `NO_MODELS` as before.
  - A manifest without city-pack: `stack: null` and the old placements.
  - Side effects: one extra console `info` line ("34 stack piece(s) are not in the manifest") on every such load. The comment "the set has no stack slot" is slightly wrong: the slot is present and null. No behaviour change.
- **Corner fallback (flag 7).** A corner lot whose corner columns don't fit gets the same style mid-row, an ordinary building, which Josh's 042 A rule allows. The tests check that a stack with corner columns always gets the columns the lot asks for, and that the fallback has none. A lot left bare after both attempts would keep its placeholder hidden, but "leaves no lot bare" shows it never happens on any map.
- **Instancing (flag 8).** Not built, as design item 5 and Q6 say. About 24 clones per large stack. Josh's load check in 15 decides.
- **Josh's B-check words are not recorded.** The ticket's "Josh's words" has no entry for his "the stacks look right", which is C's start condition. The saved file's `savedAt` is unchanged from finding 2, so he saved no correction in B. The main session should put his words in the merge commit.
- Purity of `src/grid/` and `src/night/`: untouched. No new dependency. No GDD Decided rule changed.

## Must fix
none

## Could improve
1. stacktown.test.ts, "asks for every key every recipe names ...": the `readFileSync("src/render3d/models3d.ts")` regex for `stackKeys: allStackKeys()` is a source-grep, not behaviour. It would be stronger to inject or spy on `loadModels` from `sharedModels`, or to drop that line, since the "the loader and the town agree" tests already cover the behaviour.
2. models3d.ts `loadModels`: only log "N stack piece(s) are not in the manifest" when the manifest has a `city-pack` entry, so a Town-Pack-only checkout does not print a City Pack warning on every load. Also fix the `sharedModels` comment ("no stack slot" should be "a null stack slot").
3. A follow-up ticket (gallery owner): show `provisional` in the stack gallery's captions for `BUILDING_FRONTS` lines that are still first-click guesses, so the `guess` signal criterion 8 gave is not lost now that every key has a line.
4. The architect should record, in the ticket or the next one, that criterion 18's "polygon.test.ts unedited" and criterion 13 conflict, and that criterion 11's strict street-repeat on tall needs a fifth tall family or per-type stack families. That way the 0.5% tolerance is a recorded decision, not a test-local one.
