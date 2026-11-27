# 083 · The itch.io build: a zip that plays the city, with the game pack inside

owner: per section (renderer for A; ui for B; grid-simulator for C, as owner of `tools/`)
status: approved (G1, Josh, 26 Nov 2026, on a card: "Approve 083 (Recommended)"; zip writer: "Own zip writer (Recommended)"; zip folder: "Outside the repo")
branch: `ticket/083-itch-build` holds this cut (this file and `src/core/itch.ts`). One branch per pull request: `ticket/083a-itch-city`, `ticket/083b-itch-page`, `ticket/083c-itch-zip`.

## Josh's words (26 Nov 2026, remote)
> "For the release, I want to create a zip package for use with itch.io. it will need all of the buildings textures in the package."

> "I'll be putting a password on the application so that people in my class are able to access it"

On a card, on the licence: **"Password page, include"** (the Synty models and textures go in the zip, for a password-protected itch.io page; he accepted that an invited tester could pull the files out). On cutting: **"Cut the ticket (Recommended)"**.

On the cut's cards (26 Nov 2026):
- G1: **"Approve 083 (Recommended)"**.
- How the zip is written: **"Own zip writer (Recommended)"**. This means our own writer on Node's built-in `zlib`, with no new dependency.
- Where the zip goes: **"Outside the repo"**. There is no `dist-itch/` in the checkout and no `.gitignore` line for it. The script writes to a folder outside the repo, and refuses one inside it.

## Goal
Josh runs `npm run build:itch` on his PC. It checks that the game pack holds every model, colourway and effect texture the game loads, and fails naming each one if not. Then it builds the game for a subfolder (relative base) and writes one zip to a folder outside the repo (by default `rest-itch`, beside the checkout: `D:\rest-itch\`). The zip holds the built page, the game pack (`assets/private/out/game/`) and the saved front calibration, and nothing else. He uploads the zip to a password-protected itch.io HTML5 page. His class opens it, sees the splash, picks a stage and plays the puzzles in the 3D city, looking as it does in `npm run dev`.

## What exists (read at 3c5c312)
- **`src/main.ts:46-48`** stops every production build with "This prototype plays in `npm run dev`. The city view is not in this build." (the 16 Nov 2026 licence ruling). Josh's 26 Nov answer supersedes it **for the itch build only**.
- **Three more dev gates sit in `src/render3d/`.** Lifting the `main.ts` gate alone would show an empty page:
  - `renderRoute` (`cityview.ts:211`) returns `"play"` only when `dev` is set, so a production build draws no city.
  - `sharedFx` (`fx.ts:450`) loads the particle textures and meshes only in dev, and draws code-made stand-ins otherwise.
  - `loadSavedCalibration` (`calibration.ts`) reads `assets/private/calibration/fronts.json` only in dev. Without it the fronts are the code's tables, which may differ from what Josh sees in dev.
- **The loader.** `loadModels` (`models3d.ts`) fetches `${BASE_URL}assets/private/out/game/manifest.json` first. If the game pack is missing or lacks a key, it falls back to the full `manifest.json` and the 440 MB full packs. In the zip there are no full packs, so that fallback would fetch 404s and draw placeholders, with no more than an info line.
- **The game pack** (`npm run assets:game`, ticket 082 B) is 36 MB in 23 files, dated 25 Nov 2026. Whether it covers every key the series asks for today is unknown; C's check answers that. Re-cutting it needs `assets/private/in/` and Blender, so it is Josh's machine only.
- **The base.** `vite.config.ts` sets `base` to `/` (or `/rest-prototype/` with `GITHUB_PAGES`). itch.io serves an HTML5 game from a subfolder on its own domain, inside an iframe, so the itch build needs a relative base. `vite build --base ./` works, and the CLI flag overrides the config, so `vite.config.ts` is not edited.
- **Dev-only paths stay out.** These are already behind `import.meta.env.DEV`, which a build sets false:
  - the calibration plugin (`apply: "serve"`);
  - `?cam=`, `?packs=full`, `?dpr=`, `?lights=` and the day toggle;
  - the plan, assemble and sheet routes;
  - the asset gallery.

  Nothing in this ticket moves any of them.
- **No `public/` folder, and no deploy workflow.** `.github/workflows/ci.yml` only tests.

## Rules this ticket holds
- **The licence, as Josh ruled on 26 Nov 2026.** The game pack goes in the itch zip, for a password-protected page.
  - The build and the zip are written only outside the repo (`ITCH_OUT_DIR`, or `--out`). The script refuses any folder inside the checkout. No GLB, texture or zip is ever committed.
  - Nothing is copied into `public/` or `dist/`. No workflow builds or deploys it, and there is no GitHub Pages deploy of it.
  - A plain `npm run build` is unchanged. It carries no pack, and its page still stops at the existing notice.
- **Only the game pack ships.** The zip never holds the full packs, the full `manifest.json`, `assets/private/in/`, or anything else under `assets/private/` except `out/game/**` and `calibration/fronts.json`.
- **CI has no assets.** No test reads a real GLB, the real manifest or the real calibration file. Tests use typed fixtures and fake file-system deps, as `tools/assets/game.test.ts` does.
- **No Decided rule changes**, so no pipeline-designer pre-check. Nothing here touches `src/grid/`, `src/play/` or a puzzle. `tickets/rules-coverage.md` is unchanged.

## Sections, in order
| # | Section | Owner | After | Tests in its PR |
| --- | --- | --- | --- | --- |
| A | The itch build draws the city from the game pack | renderer | G1 | at most 2 (1 added, 1 rewritten) |
| B | The itch build's page plays (splash, stage select, puzzles) | ui | A merges | 0 |
| C | `npm run build:itch`: check the pack, build, zip | grid-simulator | G1; runs alongside A. Its criterion 6 (the real run) waits for A and B | 7 |

Three PRs, at most 9 cases in all. A and C share no file. C's real run (criterion 6) and the itch.io check (criterion 7) come last, on `main` after A and B merge.

**How code knows it is the itch build.** It asks `import.meta.env.MODE === ITCH_BUILD_MODE` (`src/core/itch.ts`; the script runs `vite build --mode itch --base ./`). Pure helpers take that as a boolean argument, as they take `dev` today. There is no new env file and no new `vite-env.d.ts` typing.

---

### A · The itch build draws the city from the game pack (renderer). Branch `ticket/083a-itch-city`
**Goal.** In the itch build, the play route opens, the effects and the saved fronts load, and the models come from the game pack only, never the full packs.

**Acceptance criteria.**
1. [ ] **The play route opens in the itch build.** `renderRoute` takes an `itch` flag and returns `"play"` for a city view when `dev || itch`. Every other route stays dev only; in the itch build, `assemble`, `plan` and `sheet` are never set, since `renderer.ts` reads them behind `import.meta.env.DEV`. **test**: rewrite the existing case in `overlay.test.ts` ("a city view given is the play route...") to add one line: `city: true, dev: false, itch: true` is `"play"`. The existing `dev: false` line stays `"none"`. 1 rewritten.
2. [ ] **The loader never falls back to the full packs in the itch build.** `loadModels` takes a `gameOnly` dep, set by `loadPageModels` from the itch mode. With it set:
   - the full `manifest.json` is never fetched;
   - a game manifest lacking keys is still used for what it has (the existing per-key drops draw the rest as placeholders), with one `console.error` line: `3D models: the game pack lacks N model(s) (first three keys); this build ships only the game pack. Re-run npm run assets:game and npm run build:itch.`;
   - with no game manifest at all, it is the existing placeholder path, with one `console.error` line naming the game manifest URL.

   Without `gameOnly`, behaviour is exactly as today: ticket 082's "never used in part" rule holds in dev. **test**: 1 case, with fake `fetchJson` and `loadGlb`: `gameOnly` and a game manifest lacking one asked-for key. It checks three things: `manifest.json` is never fetched, every GLB URL is under `game/`, and one error line names the key. **Added in** `models3d.test.ts`.
3. [ ] **The effects load in the itch build.** `sharedFx` fetches the textures and meshes when `dev || itch`, from the game pack as in dev. **no test**: a flag on an existing tested path (`fxTextures` and `fxMeshes` have their own cases). It is checked in criterion 5.
4. [ ] **The saved fronts load in the itch build.** `loadPageModels` passes `dev: DEV || itch` to `loadSavedCalibration`, so `calibration/fronts.json` is read beside the page. A missing file is still null with no message. **no test**: `calibration.test.ts` already covers a non-default base ("in dev fetches the file under the base..."), and only the caller's flag changes.
5. [ ] **Looks the same.** Josh's PC, Edge. Compare `npm run dev` with the itch build served by `npx vite preview --outDir D:\rest-itch\build --base ./` (from C's `--build-only`, or the builder's own `vite build --mode itch --base ./ --outDir <a scratch folder outside the repo> --emptyOutDir` with the game pack and fronts copied beside it by hand). Use the first series puzzle and the default camera:
   - the same models in the same places;
   - the same effects on a fuse blow;
   - no request for `assets/private/out/manifest.json` in the network tab.

   Screenshots go side by side in the reply. **browser**.

**Count.** 1 added, 1 rewritten: at most 2.

**Files.** `src/render3d/cityview.ts` (`renderRoute` and its call's flag only), `renderer.ts` (passing the flag), `models3d.ts` (`gameOnly`, `loadPageModels`), `fx.ts` (`sharedFx`'s gate), `overlay.test.ts` (the one case), and `models3d.test.ts`.

**Must not:** `calibration.ts`'s logic (only its caller changes), `assetviewer.ts`, `plan3d.ts`, `src/core/`, `src/ui/`, `src/main.ts`, `tools/`, `vite.config.ts`, `package.json`.

---

### B · The itch build's page plays (ui). Branch `ticket/083b-itch-page`, after A merges
**Goal.** The itch build opens to the splash, the stage select and the puzzles. Every other production build still stops at the notice.

**Acceptance criteria.**
1. [ ] **The gate lets the itch build through.** `src/main.ts:47` becomes `if (!import.meta.env.DEV && import.meta.env.MODE !== ITCH_BUILD_MODE)`, and the notice text is unchanged. Its comment cites Josh's 26 Nov words ("Password page, include") and this ticket. **no test**: one condition, checked in criterion 3.
2. [ ] **The dev-only paths stay dev only.** These are still `import.meta.env.DEV` only:
   - the asset gallery branch (`main.ts:450`);
   - `planHidesHud`;
   - `startScreen`'s dev routes (`startScreen(search, false)` is already `"splash"`).

   No other line of `main.ts` changes. **no test**: the reviewer reads the diff.
3. [ ] **It plays.** Serve the itch build with `npx vite preview` and play it end to end, as Josh would:
   - the splash, then the stage select;
   - win the first series puzzle;
   - the next puzzle opens, and progress survives a reload.

   Do the same with a plain `npm run build` and `vite preview`, which still shows the notice. **browser**.

**Count.** 0.

**Files.** `src/main.ts` (the gate and its comment only).

**Must not:** everything else, including `src/ui/` and `src/render3d/`.

---

### C · `npm run build:itch`: check the pack, build, zip (grid-simulator). Branch `ticket/083c-itch-zip`
**Goal.** One command writes `<out>/rest-circuits-<version>-<short sha>.zip`, or fails before building, naming every problem. `<out>` is `--out <folder>`, or by default `ITCH_OUT_DIR` (`../rest-itch/`), resolved from the repo's top level (`git rev-parse --show-toplevel`). From `D:\rest-prototype` or a worktree such as `D:\rest-083`, that is `D:\rest-itch\`.

**How it works.** A new `tools/itch/` holds a pure core (`package.ts`) and a CLI (`run.ts`, imported by nothing). The CLI runs these steps in order and stops at the first that fails:
0. **Check the output folder.** Resolve `<out>`. If it is the repo's top level or inside it, refuse: print `build:itch: <out> is inside the repo (<top level>); pass --out a folder outside it.` and exit 1, having built and written nothing. The comparison ignores case on Windows. It is made after resolving `..` and symbolic links (or junctions) on the part of the path that exists.
1. **Check the game pack.** Read `assets/private/out/game/manifest.json` (and the full `out/manifest.json` if present). Check it against:
   - `gameModelKeys()` and `gameColourways()` (`src/render3d/gamemodels.ts`, which `tools/assets/game.ts` already imports this way);
   - the `FX_MESHES` keys and the `FX_TEXTURES` ids (`src/core/fx.ts`);
   - the files on disk.

   Any problem: print every `ItchProblem` (`src/core/itch.ts`) and exit 1, having built and written nothing.
2. **Typecheck and build.** Run `tsc --noEmit`, then `vite build --mode itch --base ./ --outDir <out>/build --emptyOutDir` (spawned, as `tools/assets/convert.ts` spawns Blender).
3. **Plan the zip.** The plan is:
   - every file of `<out>/build/` at the zip root (`index.html` at the top level, as itch.io requires);
   - `assets/private/out/game/**`, under the same relative path;
   - `assets/private/calibration/fronts.json`, if present.

   Check the plan against `ITCH_LIMITS`.
4. **Write the zip.** Write it to a temp name in `<out>/`, then rename it. Print the path, the file count, the zip's MB and the extracted MB.

**Acceptance criteria.**
1. [ ] **The pack check (pure).** `checkGamePack(game, full, keys, colourways, exists)` returns every problem, not the first:
   - a key the game loads that is not an entry of its pack (`missing-key`; this includes an `FX_MESHES` key);
   - a listed GLB, colourway image or `fx` texture not on disk (`missing-file`);
   - a colourway id not listed (`missing-colourway`);
   - an `FX_TEXTURES` id not in `fx` (`missing-fx`);
   - `game.from` not equal to the full manifest's `generatedAt` (`stale`), checked only when a full manifest was read;
   - no readable game manifest (`no-game-pack`).

   A complete fixture gives `[]`. **test**: 2 cases on a fixture manifest. One fixture breaks one of each kind and expects all six problems listed. One complete fixture expects none.
2. [ ] **It fails loudly.** With any problem, the CLI prints `build:itch: the game pack is not ready (N problem(s)):` and one line per problem. It then prints `Run npm run assets:game, then npm run build:itch again.` and exits 1. Nothing is spawned and nothing is written under `<out>`. **test**: 1 case through the CLI's main with fake deps (a fake spawn and a fake file system): a stale pack exits 1, and spawn and write are never called.
3. [ ] **The zip plan (pure).** `zipPlan(buildFiles, gameFiles, calibration)` returns `ItchFile[]`, sorted. Paths use forward slashes and are relative to the zip root. `index.html` must be at the top level. A path that is absolute, holds `..` or a backslash, or comes from anywhere else is refused (`outside-plan`). `checkLimits(files)` returns a `limit` problem for each `ITCH_LIMITS` bound passed. **test**: 2 cases.
   - A fixture with a build, a game pack and the calibration file gives the expected paths. A full-pack GLB (`assets/private/out/city-pack.glb`) or `assets/private/out/manifest.json` offered in the game list is refused.
   - 1,001 files, or one file over 200 MB, gives a `limit` problem.
4. [ ] **The zip is a zip itch.io reads.** Our own writer (Josh: "Own zip writer (Recommended)"), in `tools/itch/zip.ts`, on Node's built-in `zlib` (`deflateRawSync`, `crc32`), with no new dependency. It writes deflate entries, with forward-slash paths and `index.html` at the root. It needs no ZIP64: under 1,000 files and 500 MB, well inside the classic format's limits, and it refuses anything past 4 GB or 65,535 entries. **test**: 1 case. It writes three small entries to a buffer and reads back the central directory with a small parser in the test. The names match, each CRC equals `zlib.crc32` of its input, and each entry inflates to its input.
5. [ ] **Nothing reaches git or CI.**
   - The output folder is outside the repo (Josh: "Outside the repo"). `outsideRepo(out, topLevel, platform)` (pure, in `package.ts`) is false for:
     - the top level itself;
     - any folder under it, including through `..` and a different letter case on `win32`.

     It is true for a sibling such as `D:\rest-itch`. **test**: 1 case.
   - No `.gitignore` change, and no `dist-itch/` anywhere.
   - `package.json` gains `"build:itch": "tsx tools/itch/run.ts"`, and `--build-only` skips the zip (for A's and B's browser checks).
   - No workflow file changes, and the existing `build` script is unchanged.

   Apart from `outsideRepo`, this is **no test**: the reviewer reads the diff and runs `git status` after criterion 6.
6. [ ] **The run** (the builder, on Josh's machine, after A and B merge, on `main` in a worktree with the asset junctions). Run `npm run build:itch`.
   - If the check fails, the reply lists the problems, and Josh runs `npm run assets:game` (Blender) and the builder runs it again. The builder does not re-cut the pack itself without Josh's word, as it rewrites `out/game/`.
   - Then unzip the zip into a scratch folder and serve it with `npx vite preview --outDir <that folder>` (or any static server). Play the first series puzzle there.
   - `git status` shows nothing new: no GLB, texture, zip or build file. Everything is under `D:\rest-itch\`.
   - `npm run build:itch -- --out <a folder inside the checkout>` is refused, as step 0 says.

   The reply gives the zip's path, its MB, the extracted MB, the file count, and how long the run took. **no test**.
7. [ ] **itch.io's limits, recorded.** The builder re-reads itch.io's HTML5 documentation (itch.io/docs/creators/html5) and corrects `ITCH_LIMITS` in `src/core/itch.ts` if it differs, saying so in the reply. That file is the architect's, so this one edit is allowed and named in the reply. The builder also adds a short **Uploading to itch.io** section to the bottom of this ticket. It covers:
   - "Kind of project: HTML";
   - the zip marked "This file will be played in the browser";
   - the embed options: a viewport size, or "Click to launch in fullscreen", and a fullscreen button;
   - visibility "Restricted" with a password;
   - the limits as read, with the date.

   **no test**.

**itch.io's HTML5 limits, as read for this cut** (to be confirmed by C7):
- at most 1,000 files;
- 500 MB extracted in all;
- 200 MB for any one file;
- `index.html` at the zip's top level;
- paths are case-sensitive (the server is not Windows);
- the game runs in an iframe on another domain, so every URL must be relative. That is why the base is `./`.

Today's game pack is 23 files and 36 MB, well inside these.

**Count.** Exactly 7: 2 (C1) + 1 (C2) + 2 (C3) + 1 (C4) + 1 (C5). Each test file must run in under 2 s.

**Files.** New `tools/itch/package.ts`, `zip.ts`, `run.ts`, `package.test.ts` and `zip.test.ts`. `package.json` (the `build:itch` script line only). `src/core/itch.ts` (C7's limit numbers only, if they differ).

**Must not:** `.gitignore`, `src/` apart from that one file, `tools/assets/` (import from it, don't edit it), `vite.config.ts`, `.github/`, `public/`, `assets/private/` (it only reads there), and `puzzles/`.

## Interfaces
- **New, in `src/core/itch.ts`** (written with this cut, exported from `src/core/index.ts`): `ITCH_BUILD_MODE`, `ITCH_OUT_DIR`, `ITCH_LIMITS`, `ItchFile`, `ItchProblemKind`, `ItchProblem`.
- **No new dependency.** The zip writer is our own, on Node's `zlib.deflateRawSync` and `zlib.crc32` (Node 22.2 and later; the project is on Node 24). Josh: "Own zip writer (Recommended)".

## Open questions
None. Both were answered on 26 Nov 2026 (see *Josh's words*):
- the zip writer: "Own zip writer (Recommended)";
- the zip folder: "Outside the repo".

## Measured
(C6's numbers go here.)
