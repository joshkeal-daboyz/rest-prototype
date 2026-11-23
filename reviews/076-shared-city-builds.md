ticket: 076-shared-city-builds
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A: a test-only helper in `src/city/testing/` that builds each named city (per stage-list profile) and each era run once per worker per test run, shares it through a per-run disk cache made by a `globalSetup`, and hands each file a deep-frozen copy that equals a direct build. Section B: switch the slow helpers and local caches over to it, changing only the city-building code, with no change to any `expect`, `it`, `describe`, pin, timeout, threshold or city list.

## Does the branch do it?

### Section A
- **Miss writes one file; a fresh module reads it without building; a corrupt or truncated file is rebuilt; no folder means memory only.** `src/city/testing/cache.test.ts`: "writes one file on a miss, and a fresh module instance reads it without calling the builder", "rebuilds a corrupt, empty or truncated file instead of throwing...", "with no folder builds in memory only and writes nothing". `cache.ts` checks a length header (`RCC1` plus a u64 length) before it calls `deserialize`, and falls back to a build on any read error. `injectedDir()` returns `undefined` when nothing was provided, so the playtest config (`tests/playtest/vitest.config.ts`, which has no globalSetup) runs in memory only. Met.
- **An existing file is never overwritten.** `write` returns early when a good file exists. It links the temporary file into place with `linkSync`, which fails with EEXIST if another worker got there first. Only a file that `read` rejects is replaced by rename. Tests: "never overwrites an existing file: two builds of one key leave one file, byte for byte the first" and "does not replace a good file even when a build runs after it appeared". Met.
- **Each profile on `DEFAULT` and seed 1 one-way off reads back `toStrictEqual` to a direct `runCity`, and the digests match.** `namedcities.test.ts`, "a plan read back from the cache is a direct build" (5 profiles x 2 cities). The direct build takes its stage list from `directStages`, written out in the test, with `until` set to the profile's last stage. Separately, "each profile is the built stages..." pins `edge` and `buildings` literally and derives the others from `CITY_STAGES`, so the profiles are not checked only against themselves. Met.
- **`sharedEra` for tech, holdout and ruin `toStrictEqual`s `runCityEra`, failure included.** "sharedEra on the default city is runCityEra..." covers a first build and a read in a fresh module, and the log shows nothing was built twice. "an era run of a city whose clean stages fail..." uses a 1 x 1 city. Met.
- **`NAMED`, `PINNED`, `DEFAULT`, `label`.** "the lists" describe. The label text matches the facades, ground, traffic, tech, holdout and ruin helpers byte for byte. Met.
- **The guard.** It walks every object reachable from `sharedCity(DEFAULT, "facades")` and `sharedEra(DEFAULT, "ruin")`, on a build and on a read, and fails on any Map, Set or typed array that would escape `deepFreeze`. Assigning, pushing, deleting and writing to a nested field or to `digests` each throw `TypeError`. The file's bytes stay the same, and a fresh read still `toStrictEqual`s a direct build. Met.
- **Imports and `.biome`.** "the folder's imports" test. Met; the land test still passes in the gate.
- **`REST_CITY_CACHE_LOG`.** `createCityCache` appends `key\tpid` on each build and nothing on a hit (tested). Off when the variable is unset. Met.
- **`vite.config.ts`** gains only the `globalSetup` line and its comment. `globalsetup.ts` uses `mkdtempSync(tmpdir())`, prunes `rest-city-cache-*` folders older than a day, empties the folder on `onTestsRerun` and removes it at teardown. It contains no Windows path and no timer. Met.

### Section B, row by row
For every switched file I counted `expect(`, `it(`, `describe(` and `test(` on b6f3de0 and on HEAD, and the counts are equal in each file. No added or removed diff line contains `expect(`, `it(`, `describe(`, a timeout, `NAMED`, `PINNED` or a pin. Every hunk is imports plus the body of the city-building function.

- **B1 facades `testcities.ts`.** Before: `runCity(o, undefined, stagesOf(way))` with `BUILT_STAGES` up to facades. Now `"facades"`, which is streets, land, mass, edge, buildings, facades. Same list. `stagesOf` and the swap path are kept for the swapped-stage tests. Matches.
- **B2 ground `testcities.ts`.** Before: `BUILT_STAGES` without traffic. Now `"ground"`. Matches.
- **B3 traffic `testcities.ts`.** Before: all `BUILT_STAGES`. Now `"clean"`. Matches.
- **B3 edge.** `stage.test.ts` and `kerb.test.ts` used `runCity(opt, "edge")` (the default list, stopping after edge: streets, land, mass, edge) when one-way was on, and streets(0), land, mass, edge when it was off. That is the `"edge"` profile either way. `report.test.ts` now asks for `"edge"` for 6 x 6 only. Its 3 x 3 and 6 x 4 "outside" cities still build directly, as before. Matches.
- **B4 buildings.** `columns.test.ts`, `stage.test.ts` and `columnreport.test.ts` (6 x 6 only; the outside cities stay direct) used streets, land, mass, buildings with `until` "buildings". That is the `"buildings"` profile. The swapped-`last` path in `stage.test.ts`'s `stagesOf` is untouched. **`buildings/report.test.ts` is correctly left as it is.** Its list is streets, land, mass, **edge**, buildings, which matches no profile, so under the second criterion it stays unswitched and should be named in the builder's report.
- **B5 tech `cleanOf`.** Before: `BUILT_STAGES`, with streets(0) when one-way is off, and a throw on failure. Now `"clean"` with the same throw. History and `techOf` are unchanged. Matches.
- **B6 and B7 holdout and ruin `eraRun`.** Before: an uncached `runCityEra(o, era, ERA_STAGES, stagesOf(way))`. Now `sharedEra`, which is `runEraStages(shared clean plan, era, ERA_STAGES)`, the same thing `runCityEra` does after its clean run. One effect: two calls in one file now return the same object. I checked the determinism tests ("the same city twice gives the same layer", R-3 in both `named.test.ts` files). They rebuild with `buildHoldout` and `buildRuin` directly and compare against the shared layer, so neither check is now comparing an object to itself.
- **B8 render3d.** `plan3d.test.ts`: `runCity(opts, "traffic")` with one-way on, and the full off list, both become `"clean"`. `daytoggle`, `eraview` (`cleanRun` and `eraRunOf` only; `noPassRunOf` with `HISTORY_ONLY` is untouched), `holdoutdraw`, `ruindraw` and `techdraw`: seed 1 `runCity(...,"traffic")` becomes `"clean"`, and `runCityEra(OPTS, era)` becomes `sharedEra`. Nothing in `eraview` mutates a shared run; `removingRun` and the "bad" run spread into new objects. Matches.
- **Swapped, writer, double, `HISTORY_ONLY` and direct runner calls are untouched.** The `stagesOf(way, swap)` exports stay in facades, ground and traffic. `noPassRunOf` stays. The `vi.spyOn(holdoutStage/ruinStage, "run")` tests still call `runCity` directly.
- **Folder test counts.** I ran `src/city/testing/` and `src/city/edge/` at `--maxWorkers=2`: 7 files, 518 tests, all passing. `npm run typecheck` is clean. The main session's gate reports 4,908 tests, which is 4,877 plus A's 31: the count grew by exactly A's tests.
- **Timing (section C, main session).** 665.5 s against 852.9 s is 78% of the before time, inside Q3's 80% (682 s). Facades at 297 s is under 300 s.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change. No new dependency: `node:fs`, `node:os`, `node:path`, `node:v8` and vitest's `provide`/`inject` are already available. No stage, pass, pin, puzzle or Decided rule changes. Josh waived the folder rule for B's files ("Yes to all recommendations"), and no file outside A's folder, `vite.config.ts` and B's table is touched.
- A shared run is now frozen down to the outer `{ ok, plan }` object (and `failure`). Before, only the plan was frozen. This is stricter, not looser, and the whole suite passes under it.
- `sharedCity` caches any city it is given, not only the 6 x 6 default runs the mechanism's point 5 names. Every switched caller today passes only 6 x 6 cities: `columnreport` and the edge report guard their outside cities. So nothing extra is cached in practice.

## Must fix
none

## Could improve
1. `src/city/facades/testcities.ts`, `src/city/ground/testcities.ts` and `src/city/traffic/testcities.ts`: the file header still says "each built once per test file through a module-level cache". The `cityOf` comment below it was updated; the header should match it.
2. `src/city/testing/namedcities.ts` `sharedCity`: a short note, or a guard, that only the default 6 x 6 runs are meant to be shared would keep a later caller from filling the temp folder with other sizes.
3. The builder's report should name `src/city/buildings/report.test.ts` as the B4 file left unswitched because its stage list (with edge) matches no profile, as the second B criterion asks.
