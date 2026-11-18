ticket: 054-city-colour-variety-c
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C covers documentation and checks. It writes the colourways into chapter 16 of the city style guide (pool, neighbour rule, dressing keeps the base and why, fallback, hue/tone table, risk 1 as an Open line). It adds R13 "neighbours in a run differ in colourway" to 16.8 with an auto half and an eye half, adds Numbers rows for `COLOURWAY_POOL` and `CITY_CHECK.R13`, a `colourwayNeighbourDiffer` metric with `CITY_CHECK.R13 = 1.0` in `citymetrics.ts`, and a new drift check that takes in `colourway.ts`.

## Does the branch do it?
- **AC 12 (Numbers rows, drift check fails on an unpinned constant).** Met. `styleguide.test.ts` adds `colourway.ts` to `MODULES` and a new describe block. Its `uncovered()` check runs on the real module, so any new non-function export of `colourway.ts` with no row fails. The test also shows it is not vacuous: `{...module, NEW_TUNING: 3}` is reported, and an empty row list reports `COLOURWAY_POOL`. The check is wider than "numeric" (any constant), which is stricter than the ticket and fine. The `CITY_CHECK` row gains `x 1` and the existing 053 numeric check reads it. Flag 2 (the pool pinned by `COLOURWAY_POOL.length` = 8, with its ids pinned by the 16.9 table plus a test that the table equals `COLOURWAY_POOL` in order) is a sound reading. The existing record-row parser only takes numbers, and the ids are still fully pinned, order included.
- **AC 13 (R13 at 1.0 on the protocol maps with the fake 8 ids; a shared-id fixture fails).** Met. `citymetrics.test.ts` "R13 ..." checks, for every map in `MAPS`, that there are more than 30 pairs, the share is 1 and the verdict passes. "fails when two neighbours in a run share an id, and only R13 fails" overwrites one in-run pair through `extra.colourways`. Two more cases also fail: all blocks the same id, and only `base` available. The cross-run case does not fail, which matches Q3 (corners are not forced to differ). R13 can therefore fail on a plan built to break it. Flag 5 is honest and documented in both the code comment and the 16.9 Info line: with the fake set, R13 measures the assignment rule, not the real atlases.
- **AC 14 (16.9 names every pool id and R13; 16.8 lists R13 with its eye half).** Met. The test reads the 16.9 id table, the R13 row of the 16.8 table (auto and eye, "at least four wall colours", `cam=street&run=0&light=day`) and the Open line for risk 1.
- **Flag 1 (colourways as a labelled sub-block inside 16.9, no new heading).** Accepted. 053's test pins headings 16.1 to 16.9, and renumbering would edit an existing check that C may not touch.
- **Flag 3 (the R1..R12 key list becomes R1..R13 in an existing assertion).** Unavoidable once `CITY_CHECK` gains a key. It is a one-line edit with the same intent.
- **Flag 4 ("chapter 5/6 notes" read as one-line mentions in 16.4, 16.5 and 16.7).** Reasonable. 16.4's old "the only colour variety" line would otherwise have become false.

**Accuracy against the code.**
- **Pool.** The order and ids match `colourway.ts:16` exactly.
- **Neighbour rule.** Hash of the lot key through the murmur finaliser, then a step to the next index on a same-run repeat, matches `assignColourways`.
- **Lone lots, corners and the fallback.** A lone lot takes its hash's id. Corners are not forced to differ (1 in 8). With `base` alone, every block gets `base`.
- **What is painted.** Only base-atlas maps on stack pieces. Glass and mapless materials keep their objects. Clones are cached per (source, id). Flip, colour space and wrap are copied, the filter is nearest and there are no mipmaps. No emissive map is set. This matches `paintStack` and `colourwayTexture` (`models3d.ts:415-463`).
- **Dressing and the base atlas.** The `InstancedMesh` and draw-call cap reason, plus the reference's contrast, matches ticket design 4.
- **Lazy loading.** Only when stack keys were asked for, pool ids only, in parallel, one line per failure. This matches `loadColourways` (`models3d.ts:205-256`).
- **Cost.** 4 MiB each, 28 MiB for 7, materials x 7, no extra draw calls or shader programs. This matches findings 6 and risk 4.

**Hex colours.** Every hex in the 16.9 table comes from the ticket's findings 3: base `#956257`, 01_C `#a16458`, 02_A `#475343`, 03_A `#ac8f79`, 04_A `#497d7e`. The C tones of 02, 03 and 04 are described in words with no hex, which is right because the findings give none. Nothing is invented.

**Notes item 14.** It says accurately what the caller reports: 12 PNGs and an additive field written to the main checkout's gitignored `assets/private/out`, the `manifest.json.bak-054` backup, a recolour of mostly the brick upper floors, and the main session's by-eye red, dark green, cream-tan and teal. It is attributed to the main session, not claimed by the builder.

**CI-safety.** The new tests read only puzzles and the guide. They do not read `assets/private`, use Windows paths or timers. `git ls-files assets/private` is empty. No pack content is committed, only hex values and file stems.

## Rule conflicts and risks
- `docs/overnight-city-goal-notes.md` is not in section C's Files list (C may touch `docs/city-style-guide.md`, `citymetrics.ts`, its test and `styleguide.test.ts`). It is a goal log edited at the main session's request and touches no rule or code, so I do not treat it as a blocker. Note it for Josh.
- Notes item 14 discloses that the export wrote into the main checkout. That contradicts section A's default step and AC 5 ("Nothing is written into the main worktree"; "the main worktree's files are unchanged"). This is a section A run issue, not a C defect, and the notes are right to say it plainly. Josh should know AC 5 was not met as written.
- R13's auto half uses the fake 8-id set and the metric's `runBlocks` order. The town assigns over `[...paintTerrace, ...paintLone]` in `models3d.ts:998`. Both are run-ordered and the rule only looks at the previous same-run block, so they agree today. Still, R13 does not observe the drawn town.
- No GDD Decided rule touched, no dependency added, nothing in `src/grid/` or `src/night/`.

## Must fix
none

## Could improve
1. `docs/city-style-guide.md` 16.9, painting line: "the texture or image is named for the base". `paintStack` checks only `map.name` (the texture name, `models3d.ts:451`), not the image's name. Either say "the texture is named", or have B check the image name as well (a B change, not C).
2. In the 16.9 pool table, `base` is listed as series 01. The base is `PolygonCity_Texture` (findings 1), which matches 01_A but is not itself a series-01 file. "base (as 01_A)" would be more exact.
3. Add `docs/overnight-city-goal-notes.md` to the ticket's section C Files list (architect) so the diff matches its Files.
