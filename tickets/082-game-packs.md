# 082 · The game packs: one small GLB per source pack, holding only the models the game loads

owner: per section (renderer for A; grid-simulator for B, as owner of `tools/`; Python in `tools/blender/` only)
status: approved (G1, Josh, 24 Nov 2026, on a card: "Approve 082 (Recommended)"; on the dependency: "Stay with Blender (Recommended)"). Cut 24 Nov 2026 on Josh's request (below). A starts after 081 K3 merges, then B.
branch: `ticket/081-puzzles-on-the-city` holds this cut (this file and the `src/core/assets.ts` types). One branch per pull request: `ticket/082a-game-pack-load`, `ticket/082b-game-pack-tool`.

## Josh's words (24 Nov 2026, in chat)
> "Because the model packs run so slowly, I think we should work on consolidated packs for the game."

## Why
The city view (`?view=3d&city=tiles`) loads whole packs for a few models each: Palm City (103 MB), Sci-Fi Frontier (103 MB), Sci-Fi City (35 MB), City Pack (23 MB), plus Apocalypse, Nature and the two Apocalypse subsets (about 280 MB of GLB on disk, read 24 Nov 2026). K3 measured the load at 6.0 to 7.5 s on swiftshader; headless Edge needs well over 40 s. Ticket 071 D planned small subset GLBs for the power poles; they were never built (081 open question 5). This ticket replaces 071 D with one subset per used pack, cut from one list of every model the game loads.

## What exists (read at 024ce75)
- Every model is named by a `pack:name` key (`CalibrationKey`). The loader (`loadModels`, `src/render3d/models3d.ts`) reads `assets/private/out/manifest.json`, finds each key's pack, fetches that pack's `glb`, and finds the root node by name. A missing manifest, pack or root falls back to placeholders with one line.
- The page asks through `loadPageModels` in `models3d.ts`, in two calls:
  - `sharedModels()` (the schematic 3D page): `MODEL_TABLE`, `allStackKeys()`, `dressKeys()`, `furnitureKeys()` and `STEPS_KEY`;
  - `sharedTileModels(planKeys(), [STOP_SIGN_COLOURWAY])` (the city view): an empty table, plus the stack, dress and furniture keys; `planKeys()` (tile keys, arrow, door corners, party walls, traffic, and with K3 the circuit keys); the era kits (`TECH_BOUNDS`, the hold-out `KIT_KEYS` and the ruin `KIT_KEYS`); and the City Pack colourway pool and the stop-sign colourway.
- The circuit keys: `GROUND_POLE_MIX` (`src/core/powerpoles.ts`), `POWER_LINE` (`powerkit.ts`), every non-null `COMPONENT_MODELS` key (`componentmodels.ts`), and 059's street light. K3 (`ticket/081k3-circuit-drawn`, not merged) adds them to `planKeys()`. It does not touch `models3d.ts`.
- The asset gallery (`assetviewer.ts`) browses whole packs and keeps doing so.
- The converter (`tools/assets/convert.ts`, `convert_fbx.py`) makes one GLB per pack from its FBX folder and `pack.json`. It has `exclude` (folders or files) but no include list.

## Rules this ticket holds
- **The Synty licence (Josh, 16 Nov 2026):** "as long as the assets aren't available to the end user and I place the site behind a password". The game pack lives in the gitignored `assets/private/out/game/`. It is never committed, bundled, or copied into `dist/` or `public/`. Nothing here deploys anything. The city view stays dev only (081 open question 8).
- **CI has no assets.** No test reads a real GLB or the real manifest. Tests use typed fixtures and fake `fetchJson` / `loadGlb` / file-system deps, as the existing `models3d` and `tools/assets` tests do.
- **Same models, smaller files.** A game GLB holds the same root names, metre bounds, scale and textures as its full pack. The city looks identical; only the bytes fetched change.

## Sections, in order
| # | Section | Owner | After | Tests in its PR |
| --- | --- | --- | --- | --- |
| A | The used-model list, and the loader prefers the game pack | renderer | K3 merges | at most 5 (3 added, up to 2 rewritten) |
| B | `npm run assets:game`: cut the game pack | grid-simulator | A merges (it imports A's `gameModelKeys`); may branch from A's branch | at most 7 |

Two PRs, 12 cases between them, each well under 15.

**Alongside E2.** A touches `models3d.ts` and two new files. E2's files are `renderer.ts`, `plan3d.ts`, `pick.ts`, `overlay.ts`, `circuitdraw.ts`, `index.ts` and `cityview.ts`. A only imports `planKeys` from `plan3d.ts` and never edits it, so A and E2 share no file. B is in `tools/` only. A waits for K3 for two reasons: the circuit keys reach `planKeys()`, and the "before" time includes the circuit's packs.

**No rule or number changes, so no pipeline-designer pre-check.**

---

### A · The used-model list, and the loader prefers the game pack (renderer). Branch `ticket/082a-game-pack-load`
**Goal.** One function names every model the game loads. Each page load fetches the small game GLBs when they are present and up to date. Otherwise it fetches the full packs, exactly as today, and says why in one line.

**Acceptance criteria.**
1. [ ] **The page's load lists in one place.** A new pure module, `src/render3d/pageloads.ts`, holds what `loadPageModels` asks for, and `loadPageModels` takes its lists from it:
   - `pageLoadLists(extra)` returns the key lists `loadModels` is called with;
   - `TECH_KEYS`, `HOLDOUT_KEYS`, `RUIN_KEYS` and `STEPS_KEY`'s use move here from `models3d.ts`.

   It imports neither `models3d.ts` nor `plan3d.ts`, so there is no import cycle. The stack keys come from `stacks.ts` directly. `allStackKeys()` stays exported from `models3d.ts` (as `plan3d.ts` imports it), returning the same list. What each page asks for is unchanged. **no test**: criterion 2's case and the existing `models3d` tests hold it.
2. [ ] **`gameModelKeys()`** (new `src/render3d/gamemodels.ts`) is sorted, has no duplicates, and is the union of:
   - `pageLoadLists` for both page calls (the city view's with `planKeys()`);
   - `tileKeys()` (the dev tile city);
   - and, named on their own so the list is right before and after K3, every `GROUND_POLE_MIX` key, `POWER_LINE`'s key, every non-null `COMPONENT_MODELS` key and the street light.

   `gameColourways()` lists the colourway ids those calls fetch (the City Pack pool and `STOP_SIGN_COLOURWAY`). This is the list B cuts, and it stays current by construction: a key the page asks for comes from `pageLoadLists`, so it cannot be left out. **test**: 1 case. Every key of both `pageLoadLists` calls and every non-null `COMPONENT_MODELS` key is in `gameModelKeys()`, and the list is sorted and unique.
3. [ ] **The loader prefers the game pack.** In `loadModels` (or a step before it; the builder's choice), `${dir}game/manifest.json` (`GAME_PACK_DIR`, `src/core/assets.ts`) is fetched first. It is used only when all of these hold:
   - it is a manifest this build reads;
   - it carries `game`;
   - every key the call asks for is an entry of its pack in it.

   Then every GLB comes from `game/` and the full manifest is not fetched. Otherwise the full `manifest.json` is used as today, with one line:
   - with no game pack: `3D models: no game pack; loading the full packs (npm run assets:game makes it).`
   - with a stale one: `3D models: the game pack lacks N model(s) (first three keys); loading the full packs. Run npm run assets:game.`

   A stale game pack is never used in part. **test**: 2 cases, with fake `fetchJson` and `loadGlb`: a covering game manifest (every GLB URL under `game/`, and `manifest.json` never fetched); a game manifest lacking one asked-for key (full GLB URLs, one line naming the key). Existing cases that count `info` lines may be rewritten for the no-game-pack line: at most 2, listed in the reply.
4. [ ] **`?packs=full`** (dev only, read from `location.search` in `loadPageModels`, behind `import.meta.env.DEV`) skips the game pack, for the before-and-after measurement. **no test**: an address flag, used in criterion 6.
5. [ ] **One load line (dev only).** When the models are loaded, one console line gives the manifest used (game or full), the number of GLBs, their MB (summed from `performance.getEntriesByType("resource")` for `.glb` URLs), and the time from the first manifest fetch. **no test**: browser.
6. [ ] **Measured, before and after** (the builder, after B's run; Josh's PC, Edge, cache disabled in DevTools, 6 x 6 seed 1 at `?view=3d&city=tiles`, median of 3):
   - the criterion 5 line with `?packs=full` (before) and without (after);
   - the same two runs headless on swiftshader, as K3 measured.

   The after run loads fewer MB and is faster. The builder records both numbers in this ticket under *Measured* and in its reply. If "after" is not faster, it stops and reports. That is a finding, not a tuning job. **browser**.
7. [ ] **Looks the same.** The default camera by day, at the clean era and at the ruin era, with and without `?packs=full`: the same models in the same places, side by side in the reply. Josh views it. **browser**.
8. [ ] **The gallery is unchanged.** `assetviewer.ts` still reads the full manifest. **no test** (file not edited).

**Count.** 3 added (1 in new `gamemodels.test.ts`, 2 in `models3d.test.ts` or a new `gamepack.test.ts`), up to 2 rewritten: at most 5. `gamemodels.test.ts` imports `plan3d.ts`. The builder gives its time; it must be under 2 s.

**Files.**
- new: `src/render3d/pageloads.ts`, `gamemodels.ts` and `gamemodels.test.ts`;
- `src/render3d/models3d.ts`: `loadPageModels`, `loadModels`'s manifest step, the load line and `?packs=full`; and `models3d.test.ts`, or new `gamepack.test.ts`.

**Must not:** `plan3d.ts`, `renderer.ts`, `index.ts`, `circuitdraw.ts`, `overlay.ts`, `pick.ts`, `cityview.ts` (K3's and E2's), `assetviewer.ts`, `src/core/`, `src/city/`, `tools/`, `vite.config.ts`, `public/`.

---

### B · `npm run assets:game`: cut the game pack (grid-simulator). Branch `ticket/082b-game-pack-tool`, after A merges (or from A's branch, opened as a PR after A merges)
**Goal.** Josh runs `npm run assets:game` after a conversion, or when the page says the game pack is stale. The command writes `assets/private/out/game/`, which holds:
- one GLB per source pack that has a used model, holding only those models;
- `manifest.json`;
- the used colourway images.

It never writes the full packs or the full manifest.

**How it works.** It imports `gameModelKeys()` and `gameColourways()` from `src/render3d/gamemodels.ts`. It reads the full `out/manifest.json`, and groups the keys by pack into each pack's list of FBX `source` paths. It then re-runs the normal FBX-to-GLB conversion for each used pack:
- with that pack's own `pack.json` settings (scale, scale overrides, atlas, texture overrides and aliases);
- with an include filter, so that only the listed FBX are converted (071 D's planned mechanism).

Re-converting from the FBX keeps names, bounds, scale and textures identical to the full pack, and needs no new dependency. **Why one GLB per pack, not one GLB in all:** root names are only unique within a pack (`SM_Prop_Powerpole_01` is in both `apocalypse-power` and `palm-city-pack`, and both are in `GROUND_POLE_MIX`), and the loader finds roots by name in their pack's GLB.

**Acceptance criteria.**
1. [ ] **The plan (pure).** From a manifest and a key list: per pack, the sorted `source` list of its keys' entries; packs with no key are left out.
   - A key whose pack or name the manifest lacks is listed (every one), and the command exits 1 having written nothing.
   - An entry with `scale-suspect` is listed the same way.

   **test**: 2 cases on a fixture manifest (the grouping; a missing key refused).
2. [ ] **The include filter.** The converter's arguments for an included pack carry the pack's own settings plus the include list. The list goes in an argument file, or an `--include` filter in `convert_fbx.py`: never one argument per FBX, since Palm City's list would pass Windows' 32,767-character command line. Without an include, the arguments are exactly as today, and the existing `tools/assets` tests pass unedited. **test**: 1 case.
3. [ ] **The game manifest.** `out/game/manifest.json` holds:
   - `version`, and `game: { keys, from }` (`AssetGameBuild`, `src/core/assets.ts`; `from` is the full manifest's `generatedAt`);
   - per used pack, its full-manifest `AssetPack` with `assets` cut to the included entries and `glb: "<pack>.glb"`;
   - its `colourways` cut to `gameColourways()`, with those images copied to `out/game/<pack>/colourways/`, paths relative to the game manifest.

   A converted entry whose name, scale or textures differ from the full manifest's, or whose bounds differ by more than 0.001 m, fails the run. The earlier game pack stays, since GLBs and the manifest are written to temp names and moved only when every pack passes. **test**: 2 cases (the manifest built from a fixture; a bounds mismatch refused, nothing moved).
4. [ ] **The full pack is untouched.** With fake file-system deps, the command writes only under `out/game/`. **test**: 1 case.
5. [ ] **The selftest** (`npm run assets:selftest`, Blender) gains an include run. `checkSelftest` fails if a model outside the include reaches its GLB. **test**: 1 case on `checkSelftest` with a fixture report. The Blender run itself is the builder's, not `npm test`.
6. [ ] **The run** (the builder, on Josh's machine). Back up `out/manifest.json` first, then run `npm run assets:game`. Afterwards, the full manifest equals its backup and the full GLBs keep their modified times. The reply gives:
   - each game GLB's size and model count;
   - the game pack's total MB against the same packs' full total;
   - how long the run took.

   **no test**.
7. [ ] **README.** `tools/blender/README.md` gains a *Game pack* section: what it holds, when to run it (after any conversion, and when the page says it is stale), that it is gitignored, and the licence line. **no test**.

**Count.** 7 added, in new `tools/assets/game.test.ts` (under 2 s), and `convert.test.ts` for criteria 2 and 5.

**Files.**
- new `tools/assets/game.ts` and `game.test.ts`;
- `tools/assets/convert.ts` and `convert.test.ts` (the include filter and the selftest), `tools/assets/fixtures/`;
- `tools/blender/convert_fbx.py` (only if the filter must live there) and `tools/blender/README.md`;
- `package.json`: the one `assets:game` script line;
- not in git: `assets/private/out/game/`.

**Must not:** `src/` (it imports `gamemodels.ts` and `src/core`, and edits neither), the full packs' files, `.gitignore` (`assets/private/` already covers `game/`).

---

## Measured
(Filled by A's builder at criterion 6: before and after, Edge and swiftshader.)

## Files
Per section, above. This cut: `tickets/082-game-packs.md`, `src/core/assets.ts` (`GAME_PACK_DIR`, `AssetGameBuild`, `AssetManifest.game?`), and pointer lines in `tickets/071-pack-power-lines.md` (D is replaced) and `tickets/081-puzzles-on-the-city.md` (open question 5).

## Interfaces
Written into `src/core/assets.ts` with this cut (typecheck passes):
- `GAME_PACK_DIR = "game/"`;
- `AssetGameBuild { keys, from }`;
- `AssetManifest.game?: AssetGameBuild`. It is optional, so `ASSET_MANIFEST_VERSION` stays 1, and the full manifest and the gallery read as before.

A's exports, internal to `src/render3d/` but imported by B: `gameModelKeys(): CalibrationKey[]` and `gameColourways(): string[]` (`gamemodels.ts`).

**No new dependency.** Blender is already the pipeline's tool. A glTF library (for example `@gltf-transform/core`) could cut subsets from the full GLBs without Blender, but that would be a new dependency, so it is not taken. See question 3.

**Events:** none.

## Open questions (for Josh)
1. **Default this cut takes:** one game GLB per source pack, not one GLB for everything. Root names clash across packs (`SM_Prop_Powerpole_01`). One file would mean renaming roots and changing every key.
2. **Default this cut takes:** a stale game pack is not used at all. The page loads the full packs, slowly, says which models are missing, and names `npm run assets:game`. The alternative would be to load the game pack plus the full packs for the missing keys only.
3. **Default this cut takes:** no new dependency. B re-converts from the FBX with Blender (minutes per run). If you would rather cut from the GLBs directly with `@gltf-transform/core` (faster, no Blender), say so, and B is re-cut with that dependency named.
4. **Default this cut takes:** until X1 and X2, the list also covers the schematic 3D page's `MODEL_TABLE` (Town Pack and SIMPLE Town buildings and poles). It is small, and it goes when X2 removes that page.
