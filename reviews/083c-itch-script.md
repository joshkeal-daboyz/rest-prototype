ticket: 083c-itch-script
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C of ticket 083 asks for `npm run build:itch`. It refuses an output folder inside the checkout, checks the game pack against what the game loads, typechecks, runs `vite build --mode itch --base ./`, plans the zip (the build at the root, plus `out/game/**` and `calibration/fronts.json`), checks it against itch.io's limits, and writes it with our own zlib-based zip writer. It should have 7 tests at most. Criteria 6 (the real run) and 7 (re-reading itch.io's docs and the upload notes) are meant to happen on `main` after A and B merge.

## Does the branch do it?
I compared against `origin/main` (3c5c312). The local `main` is behind. The branch touches `package.json`, `src/core/itch.ts` and `src/core/index.ts` (both from the architect's cut commit 9e92c48), the ticket, and the five new `tools/itch/` files.

- **C1, the pack check: met.**
  - `checkGamePack` in `tools/itch/package.ts` collects every problem and does not stop at the first. It covers `missing-key` (`gameModelKeys()` plus the `FX_MESHES` values), `missing-colourway`, `missing-fx`, `missing-file` (GLBs, colourway images and fx images) and `stale` (only when a full manifest is given). A null manifest gives `no-game-pack`.
  - The test is `package.test.ts` "a complete pack gives no problem, and a broken one lists every kind, not the first". A complete fixture gives `[]`. The broken fixture expects five kinds together. A null manifest gives `no-game-pack` on its own, which is correct, since that kind can't occur alongside the others.
  - The ticket's two cases are folded into one.
- **C2, fails loudly: met.**
  - `runItch` prints `build:itch: the game pack is not ready (N problem(s)):`, then one line per problem, then the `Run npm run assets:game ...` line, and returns 1. This happens before `mkdirp` or any spawn.
  - The test "a stale pack exits 1, prints the problem and the fix, and spawns and writes nothing" asserts the exit code, both texts, and that `calls` is empty (no mkdirp, spawn, list, write or rename).
- **C3, the zip plan and the limits: met.**
  - `zipPlan` sorts its paths. It refuses as `outside-plan`:
    - unsafe paths (absolute, a drive letter, a backslash, an empty part or `..`);
    - build files under `assets/private/`;
    - game files not under `assets/private/out/game/`;
    - a calibration path other than `fronts.json`;
    - a missing top-level `index.html`.
  - `checkLimits` gives one `limit` problem for each bound passed.
  - Two tests cover this. The first takes the expected paths, then offers `out/city-pack.glb`, `out/manifest.json` and `..\x` and expects all three refused, then a build with no `index.html`. The second covers 1,001 files and one file of 200 MB + 1 byte.
- **C4, the zip writer: met.**
  - `tools/itch/zip.ts` uses only `deflateRawSync` and `crc32` from `node:zlib`, with no new dependency.
  - I checked the header layout field by field: local header 30 bytes, central header 46 with the local offset at 42, end record 22. It writes UTF-8 names, uses fixed dates, throws past 65,535 entries or 4 GB, and passes each entry to `sink` as it goes.
  - The test in `zip.test.ts` parses the central directory independently. For each entry it checks the name, that the CRC equals `zlib.crc32`, and that it inflates to its input. The entries include an empty one.
- **C5, nothing reaches git or CI: met.**
  - `outsideRepo` is tested in "the output folder must be outside the checkout, through .. and case on win32": a sibling, the top level itself, a different letter case, a path through `..`, and the posix cases.
  - `runItch` resolves junctions first (`realpathExisting`, the part that exists).
  - `package.json` adds only the `build:itch` line.
  - `--build-only` returns after vite.
  - There is no `.gitignore`, `.github/`, `public/` or `vite.config.ts` change, and no `dist-itch`.
  - `git status` in the worktree is clean after the test run.
- **C6, the real run, and C7, itch.io's limits and the upload notes:** not in this branch. The ticket puts both on `main` after A and B merge, so this is by design, not a gap. `ITCH_LIMITS` is untouched, and the ticket's *Measured* and *Uploading to itch.io* sections are still empty. Both have to be done before 083 is marked done.

Tests: I ran `npx vitest run --maxWorkers=2 tools/itch/package.test.ts tools/itch/zip.test.ts`. 6 passed: 67 ms and 11 ms per file, 664 ms in all.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change. `run.ts` loads `src/render3d/gamemodels` with a dynamic import inside the CLI only, as `tools/assets/game.ts` already does. Nothing imports `run.ts` for its side effects; the `same` guard stops the test from running the CLI.
- No new dependency and no workflow change. A plain `npm run build` is unchanged.
- Test count: 6 new cases against `main`, under the ticket's 7 and the cap of 15. No report-only tests, no whole-city tests, and no real assets are read (the fixtures are typed and the file system is faked).
- Junction resolution, as the ticket asks, has one side effect. In a worktree, `node_modules` and `assets/private/*` are junctions into `D:\rest-prototype-main`. So `--out D:\rest-083c\assets\private\x` resolves outside the worktree's top level and would be allowed, even though it looks like a folder inside the checkout. I did not run this. Those folders are gitignored, so nothing would be committed. The ticket's step 0 wording is followed exactly.
- The branch is named `ticket/083c-itch-script`, not the ticket's `ticket/083c-itch-zip`. This is cosmetic.

## Must fix
none

## Could improve
1. `tools/itch/run.ts` step 0: refuse when either the path as given or the resolved path is inside the top level, not only the resolved one. This closes the junction case above without dropping the ticket's realpath rule.
2. `tools/itch/package.ts` `checkGamePack`: no test covers the `FX_MESHES` key that C1 names under `missing-key`. One more `expect` on the existing broken fixture would cover it (drop `shardName` from the fx pack's assets) without adding a case.
3. When C6 and C7 run on `main`, the builder's reply should cover `ITCH_LIMITS` and both empty ticket sections (*Measured*, *Uploading to itch.io*). The ticket is the architect's file, so the main session routes those words there.
