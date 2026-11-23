# 076 · Build each named city once per test run, and share it across the slow test files

owner: planner (sections A and B; Q1 option 2, Josh's G1 below)
status: approved to build (G1, 23 Nov 2026)
branch: `ticket/076-shared-city-builds` (one branch per section: `ticket/076a-city-cache`, then one `ticket/076b-switch-over`, Q1 option 2)

## Josh's words (23 Nov 2026, in chat)
> "Why are we perform 4K+ tests this seems excessive"

He was shown that the count is cheap but the full gate takes about 16 minutes on his PC, mostly because many test files each rebuild the 20 named cities (6 x 6, seeds 1 to 10, one-way on and off) and every earlier stage from scratch. He was offered: "Build each named city once per test run and share it across test files, instead of every slow file rebuilding all 20. Same tests, same checks." He answered:
> "Yes"

That is his word to cut this ticket. Nothing here changes a city stage, a pass, a pin, a puzzle or a Decided rule.

## G1 (Josh, 23 Nov 2026, in chat; as relayed by the main session)
He was shown the ticket's summary with its three open questions, each marked "Recommended: yes": Q1, the planner does all of section B on one branch, waiving the "Each agent stays in its folder" rule for this ticket only; Q2, the new `src/city/testing/` folder and the one `globalSetup` line in `vite.config.ts`; Q3, the target, the full gate at 765 s or less, at least 20% faster than 956 s. He answered:
> "Yes to all recommendations"

That is his G1 and his answer to each question:
- **Q1:** "Yes to all recommendations". Option 2: the planner does all of section B on one branch, `ticket/076b-switch-over`, after A merges. The folder rule is waived for the files in B's table and this ticket only. Each row's acceptance criteria still apply; the reviewer checks them row by row in one review.
- **Q2:** "Yes to all recommendations". `src/city/testing/` is a new folder owned by the planner; section A may add the one `globalSetup` line to `vite.config.ts`, and nothing else in it.
- **Q3:** "Yes to all recommendations". The target is the full gate at `--maxWorkers=2` on Josh's PC at most 80% of the "before" wall time (at least 20% faster); `src/city/facades` summed time below 300 s.

**The "before" number.** The 956 s figure came from an earlier head. The goal head is now c46827b, which includes `goal/city-style`'s merge. The main session is timing the "before" gate now, on c46827b, alone on the machine. **That run's wall time is the "before" for Q3** (so the target is 0.8 times it, which is 765 s only if it again comes to 956 s), and it replaces section C's first criterion's baseline at 0823a30.

## What the architect found (read 23 Nov 2026 on `goal/city-transformations` at 0823a30)

**Where the named cities are built.** 43 test files loop over the named cities. Each builds them through its own module-level cache, which lasts **one test file**: vitest runs every file isolated (the default `isolate: true`; in the `forks` pool a file gets a fresh child process), so no cache outlives its file. The slow ones:

| Folder | Built in | Stages each file builds | Files that build the named set |
| --- | --- | --- | --- |
| `src/city/facades/` | `testcities.ts` `cityOf` | streets to facades (6) | about 14 (stage, dress, escape, novelty, party, roof and their reports) |
| `src/city/ground/` | `testcities.ts` `cityOf` | all clean but traffic (7) | 7 (greens, lanes, lots, pavement, runs, report, stage; stage uses the 4 pin cities) |
| `src/city/traffic/` | `testcities.ts` `cityOf` | all clean (8) | 5 (control, report, signals, signs, stage) |
| `src/city/buildings/` | a local cache in each test file | streets, land, mass, buildings (no edge) | 4 (columnreport, columns, report, stage) |
| `src/city/edge/` | a local cache in each test file | streets to edge (4) | 3 (kerb, report, stage) |
| `src/city/tech/` | `testcities.ts` `cleanOf` | all clean, then history | 1 (named) |
| `src/city/holdout/` | `testcities.ts` `eraRun`, **not cached** | all clean, history, tech, holdout | 2 (named: 20 cities; stage: 1) |
| `src/city/ruin/` | `testcities.ts` `eraRun`, **not cached** | all clean, history, tech, holdout, ruin | 2 (named: 20 cities; stage: 1) |
| `src/render3d/` | local caches in `plan3d.test.ts`; `runCityEra` in eraview, holdoutdraw, ruindraw, techdraw, daytoggle | all clean; seed 1 eras | `plan3d.test.ts` (20), the others seed 1 only |

The cheap stage folders (`streets`, `land`, `mass`, `history`) also loop over the named set but stop at stage 1 to 3 and are not worth changing.

**One city's cost** (one-off scratch probe, not committed; Josh's PC, nothing else heavy running, one process, warm JIT): the clean city (all 8 stages) takes 840 to 870 ms (seeds 1 and 2); facades alone is 370 to 520 ms of it. The ruin era run (clean, history, tech, holdout, ruin) takes 1.38 to 1.46 s. The ruin-era plan is 9.8 to 10.4 MB through `node:v8` `serialize` (about 50 ms) and reads back in 90 to 110 ms; the clean plan is 8.3 MB and reads back in about 100 ms. **Reading a built city is about 8 times cheaper than building it.**

**Rough share of the gate** (estimate, from the table and the probe, inflated by about 1.5 for two loaded workers): city building is roughly 750 to 800 s of the about 1 600 s of summed test time: facades about 330 s of its 507, ground about 120 of 174, traffic about 100 of 129, buildings about 50 of 106, edge about 30 of 61, holdout about 40 of 54, ruin about 45 of 139 (`ruin/named.test.ts` spends most of its 137 s in its own assertions, which stay), tech about 30 of 41, render3d about 30 of 401 (the rest of `src/render3d/` is drawing and the older `tileCity` tests, out of scope here). Section A's baseline measures this instead of trusting the estimate.

## The mechanism (decided here; Josh can overrule in Q2)

**A per-run disk cache of built cities, read lazily, with each test file deep-freezing its own copy.** In detail:

1. A vitest `globalSetup` (one line in `vite.config.ts`, Q2) makes a fresh, empty folder for the run under `os.tmpdir()` (`mkdtempSync`, so no fixed or Windows path) and hands its path to the workers with vitest's `provide` / `inject`. Its teardown deletes the folder. On start it also deletes any `rest-city-cache-*` folder older than a day (a crashed run's). In watch mode its `onTestsRerun` hook empties the folder, so a rerun after a code change never reads a city built by older code.
2. The shared helper's `sharedCity(city, profile)` and `sharedEra(city, era)` look in the folder for the key. On a miss the worker builds the city exactly as the test file built it before, writes it with `node:v8` `serialize` to a temporary name and renames it into place (an existing file is never overwritten: the write is skipped, or opened with the exclusive `wx` flag). On a hit it reads and `deserialize`s it. Either way the plan is deep-frozen before it is returned and kept in an in-memory map for the rest of that file.
3. The key is the city (blocks, seed, one-way) and the **exact stage list the file built before** (a named profile, below), or the era. A file gets the same plan, layer for layer, that it built for itself before: no derived view, no "this layer does not depend on that stage" argument.
4. An era run is `runEraStages(clean plan, era, ERA_STAGES)` over the shared clean plan. That is exactly what `runCityEra` does after its own `runCity`, so the era plan is the same; only the clean rebuild is saved. On disk an era entry holds only the era layers, digests and outcome; the clean plan is re-attached from the clean entry.
5. Only the default runs are shared: the 20 named cities, the 4 pin cities and seed 1, with the default `BUILT_STAGES` / `ERA_STAGES` (one-way off through `streetsStageWith(0)`, as now). A test that builds with a swapped, doubled or writer stage, with `HISTORY_ONLY`, with options, or that calls `runCity` / `runCityEra` itself to test the runner keeps doing so, uncached.

**Why this and not the others:**
- *A per-worker memo with `isolate: false`*: no read cost, but it turns off file isolation for every file it covers (spies, module state and mocks could leak between files), and one worker would hold every profile of all 20 cities at once (several GB of heap; Josh's PC froze on 17 Nov). Rejected.
- *Grouping files so one worker builds each city once*: vitest has no supported way to pin files to a worker, and merging files would change the files. Rejected.
- *A `globalSetup` that builds everything up front*: it runs on one core in the main process before any test starts (about 2 minutes idle for the second core) and builds profiles nobody asked for when one file is run alone. The lazy build-on-miss keeps the cache and drops those costs.
- *A cache kept between runs* (keyed by a hash of the source): it would mean a gate no longer runs the stages at all, so the "the stage returns ok on all 20 named runs" tests would read last run's answers. Rejected: the cache lives for one run, so every gate still builds every city from the current code at least once.

**Frozen stays frozen.** Every test file gets its own deserialised copy, deep-frozen before it is handed out (ES modules are strict mode, so a write throws `TypeError`), and nothing is ever written to the disk copy after it is created. A test that mutated a plan would fail in its own file and could never reach another file. A guard test proves both (A, criterion 6).

**At most once per worker.** Two workers may miss the same key at the same moment and both build it. So "once per worker" is the bound: at most 2 builds of a key per run at `--maxWorkers=2`, and usually one.

## Goal
`npm run gate` on Josh's PC runs the same tests with the same assertions and pins, and finishes markedly faster (target: Q3), because each named city (and each era run) is built at most once per test worker per run and the slow files share it. Nothing in `src/` outside the test helpers changes behaviour.

## Sections

### A · The shared helper and its guard tests (planner)
Goes first. It adds the helper and switches **no** existing test file.

Acceptance criteria:
- [ ] (Vitest, `src/city/testing/cache.test.ts`) A build on a miss writes one file into the run's folder; a second call in a fresh module instance (use `vi.resetModules()` and a fresh import) reads it and does not call the builder; a corrupt or truncated file is rebuilt, not thrown; with no folder injected (for example under `tests/playtest/vitest.config.ts`) the helper builds in memory only and writes nothing.
- [ ] (Vitest) An existing file is never overwritten: two builds of one key leave one file, byte for byte the first.
- [ ] (Vitest, `src/city/testing/namedcities.test.ts`) For each profile in `PROFILE_STAGES`, on `DEFAULT` and on seed 1 one-way off: the plan read back from the cache `toStrictEqual`s a direct `runCity` with that stage list (so `-0`, `undefined` fields and key order survive the round trip), and `digestOf` of every layer equals the recorded digest.
- [ ] (Vitest) `sharedEra(DEFAULT, era)` for tech, holdout and ruin `toStrictEqual`s `runCityEra(options, era)`, ok and failure included.
- [ ] (Vitest) `NAMED`, `PINNED`, `DEFAULT` and `label` are the 20 runs, the pin seeds 1, 2, 3 and 8 and the label text every helper uses today, so the switched files keep their test names.
- [ ] (Vitest, the guard) Every object reachable from a `sharedCity` and a `sharedEra` result is frozen (a full walk, not a sample); assigning to a nested layer field, pushing to a layer's array and deleting a key each throw `TypeError`; after those attempts the cache file's bytes are unchanged and a fresh read still `toStrictEqual`s a direct build.
- [ ] (Vitest) `src/city/testing/` files import only `src/core/`, `src/city/` and node built-ins; none mentions `.biome` (the land test walks every non-test file under `src/city/`, so it must still pass unchanged).
- [ ] (Builder report) When `REST_CITY_CACHE_LOG` names a file, each build appends one line (key, process id) to it. Off by default; for the main session's measuring run only.
- [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/city/testing/` and one `npx tsc --noEmit`. No full gate (the main session runs it), no dev server, no browser.

Files: **may touch** `src/city/testing/` (new) and `vite.config.ts` (the one `globalSetup` line, Q2). **Must not touch** anything else.

### B · Switch the slow files over (one row per owner, after A merges)
Each row replaces its helper's or test file's city building with `sharedCity` / `sharedEra` and nothing else.

| Row | Owner | Files | Today's build | Becomes |
| --- | --- | --- | --- | --- |
| B1 | facades | `src/city/facades/testcities.ts` | `cityOf`: streets to facades | `sharedCity(o, "facades")` |
| B2 | landscape | `src/city/ground/testcities.ts` | `cityOf`: all clean but traffic | `sharedCity(o, "ground")` |
| B3 | streetscape | `src/city/traffic/testcities.ts`; the local caches in `src/city/edge/stage.test.ts`, `kerb.test.ts`, `report.test.ts` | all clean; streets to edge | `"clean"`; `"edge"` |
| B4 | buildings | the local caches in `src/city/buildings/columnreport.test.ts`, `columns.test.ts`, `report.test.ts`, `stage.test.ts` | streets, land, mass, buildings | `"buildings"` |
| B5 | tech-pass | `src/city/tech/testcities.ts` `cleanOf` | all clean | `"clean"` (history and `techOf` stay as they are) |
| B6 | holdout-pass | `src/city/holdout/testcities.ts` `eraRun` | uncached era runs | `sharedEra(o, era)` |
| B7 | ruin-pass | `src/city/ruin/testcities.ts` `eraRun` | uncached era runs | `sharedEra(o, era)` |
| B8 | renderer | the local caches in `src/render3d/plan3d.test.ts`, `daytoggle.test.ts`, `eraview.test.ts` (`cleanRun`, `eraRunOf` only), `holdoutdraw.test.ts`, `ruindraw.test.ts`, `techdraw.test.ts` | all clean; seed 1 eras | `"clean"`; `sharedEra` |

Order: B1 first (the biggest share), then any order. Each row is its own branch and review unless Josh takes Q1 option 2.

Acceptance criteria, every row:
- [ ] (Reviewer, from the diff) In each `*.test.ts` touched, only imports and the body of the city-building function change: no `expect`, `it`, `describe`, pin, timeout, threshold or city list changes, and the count of `expect(` in each file is unchanged. The test names are unchanged.
- [ ] (Reviewer) The profile each file now asks for is the exact stage list (and `until`) it built before; a file whose list matches no profile stays as it is and is named in the report.
- [ ] (Reviewer) Swapped-stage, writer, double, `HISTORY_ONLY` and direct `runCity` / `runCityEra` calls are untouched.
- [ ] (Vitest) The row's folder passes with the same test count as before the row (`npx vitest run --maxWorkers=2 <folder>`), run once by the builder. No full gate, no browser.
- [ ] (Builder report) The row's folder summed test time before and after, from that one run and the baseline.

Files: the row's files only. `testcities.ts` keeps its exports (`NAMED`, `PINNED`, `DEFAULT`, `label`, `cityOf`, `layersOf`, `stagesOf`, `eraRun`, ...), re-exported or wrapped, so no test file that imports it changes.

### C · Measure (main session)
- [ ] (Main session, before A starts) The baseline: on `goal/city-transformations` at c46827b (was 0823a30; see G1) in a detached worktree, alone on the machine, `npx tsc --noEmit`, then `npx vitest run --maxWorkers=2 --reporter=default --reporter=json --outputFile=<scratchpad>/076-before.json`. The wall time, the test count, and the summed time per folder and per file.
- [ ] (Main session, after the last B row merges into the goal branch) The same run on the result, with `REST_CITY_CACHE_LOG` set: the wall time, the per-folder sums, the test count, and the most builds of any one key (at most 2).
- [ ] The full gate passes with **the same test count plus exactly the tests section A adds**, and every pin and digest test passes unchanged.
- [ ] The wall time meets Q3's target. If it does not, the main session reports the per-file numbers to Josh; no check is loosened and no city is dropped to reach it.
- [ ] (CI) The GitHub Actions run (Linux, `npm test`) is green on the push to `main` after Josh's merge word: the cache folder comes from `os.tmpdir()`, no Windows path, no timer, no asset read.
- [ ] Load: one heavy step at a time. The two measuring runs are never run together or alongside a builder, reviewer or playtester run; `--maxWorkers=2` always. The peak size of the cache folder during the after-run is reported (estimate: up to about 650 MB of temporary disk, freed at teardown).

## Interfaces
No new `src/core/` types: everything below is test support and lives in `src/city/testing/`, which no stage imports.

```ts
// src/city/testing/namedcities.ts
export interface NamedCity { readonly blocksX: number; readonly blocksZ: number; readonly seed: number; readonly way: "on" | "off" }
export const NAMED: readonly NamedCity[];   // 6 x 6 seeds 1 to 10, one-way on then off, as today
export const PINNED: readonly NamedCity[];  // seeds 1, 2, 3, 8, one-way on
export const DEFAULT: NamedCity;            // 6 x 6 seed 1 one-way on
export const label: (o: NamedCity) => string;
export type CityProfile = "buildings" | "edge" | "facades" | "ground" | "clean";
/** The exact stage names each profile runs, in order; the last is `until`. */
export const PROFILE_STAGES: Readonly<Record<CityProfile, readonly CityPlanStage[]>>;
/** The run, built at most once per worker per test run, deep-frozen. */
export function sharedCity(o: NamedCity, profile: CityProfile): CityPlanRun;
export function sharedEra(o: NamedCity, era: "tech" | "holdout" | "ruin"): CityEraRun;

// src/city/testing/cache.ts: the per-run disk cache (`cached(key, build)`), node:fs, node:os, node:path, node:v8 only
// src/city/testing/globalsetup.ts: makes and removes the run's folder; provides "cityCacheDir"
```

`vite.config.ts` gains `globalSetup: ["src/city/testing/globalsetup.ts"]` under `test` (Q2). **No new dependency**: `node:v8`, `node:fs`, `node:os` and `node:path` are Node built-ins, and `provide` / `inject` are in the `vitest` 3 already installed.

## Open questions (for Josh)
- **Q1, who does section B.** Option 1 (no rule waived): eight rows, each by its folder's owner on its own branch, eight small reviews. Option 2 (recommended, cheaper in tokens and time): the planner does all of B on one branch, because each change is a few setup lines. That needs Josh's word to waive the CLAUDE.md rule "Each agent stays in its folder" for these files and this ticket only. The hook does not police `src/` folders (it guards tickets, reviews, playtests, the playtester and `puzzles/locked/`), so nothing in the hook changes.
- **Q2, the new folder and the config line.** `src/city/testing/` is a new folder not in the brief's owner table: the planner would own it (it owns the runner in `src/city/pipeline/`). `vite.config.ts` has no owner in the table; section A edits one line of it. Both need Josh's word.
- **Q3, the target.** Proposed: the full gate's wall time on Josh's PC at `--maxWorkers=2` falls from 956 s to **765 s or less (at least 20% faster)**; the estimate above suggests 25 to 35%. `src/city/facades` summed time should fall below 300 s. Josh may set another number.

## Not in this ticket (separate options, each needing Josh's word)
- **Only the changed folders between review rounds.** Between round 1 and round 2 of a ticket, the main session's gate could run `tsc` and only the test folders the fix touched (plus `src/core/` and `puzzles/` validation), and keep the full gate for the last round before Josh's merge word. Saves most of a gate per round, but a round-2 regression elsewhere would only show at the final gate. It changes CLAUDE.md's loop (step 3), so Josh decides.
- **Fewer named cities for the later passes.** The holdout, ruin, render3d draw and tech tests could run, for example, the 4 pin cities plus 2 one-way-off cities instead of all 20. It would cut those folders by about two thirds, but it is a check loosened: the "stage returns ok on all 20 named runs" rules (070 R-2, 073 X-4) would then hold on fewer cities, so it needs Josh's ruling on those rules first.
- **The older `tileCity` tests in `src/render3d/`** (alleys, frontage, kerbline, parkmetrics, tilecity) are most of that folder's 401 s and do not use the pipeline. If Josh wants that folder faster, a renderer ticket should measure them first.

## Within approved scope?
Yes, once Josh gives G1: test support only. No stage, pass, schema, pin, Decided rule or dependency changes. No rule in "Rules carried over" is touched, so `tickets/rules-coverage.md` is unchanged.
