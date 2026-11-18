# 045 · Click a building's door in the gallery and the choice is saved to disk

owner: lead-architect (section 0), renderer (A, C), grid-simulator (B, `tools/` and the Vite plugin)
status: approved (G1, Josh, 17 Nov 2026: "approved", after the trims under "Amendments at approval"; every other open-question default applies). Sections build in order 0, then A and B (either order), then C. Section D is dropped.
branch: `ticket/045-click-to-calibrate-fronts` (one branch per section: `-0`, `-a`, `-b`, `-c`)

## Amendments at approval (17 Nov 2026)
Josh: "This is a dev only tool, this will not be something we leverage in the final game." The main session proposed these trims and he approved ("approved"):
- **Section D is dropped for now** (promoting saved values into code); it is cut again only when Josh says a pack is done.
- **Marks:** click a copy = that side is the door (click another = undo); Shift+click = exclude; Delete = clear the model. **No** "not a building" mark and **no** moving models to the end of the line.
- **Kept:** `pack:name` keys (names collide across packs), the temp-file-and-rename write, the dev-only endpoint (`apply: "serve"`), the `vite.config.ts` plugin line and watch-ignore, the new `tools/calibration/` folder and the validator in `src/core/`.
- Merge order when Josh says so: 0, then A and B, then C (A and B may stack on section 0's branch until it is merged).

## Josh's words (17 Nov 2026)
> "could we set it up so that i can run the game and click the front of each model and have it save the data to disk?"

Earlier words this ticket rests on (17 Nov 2026 unless marked):
> "SIMPLE town was a test, the city stuff is higher detail" (043 Q4: POLYGON City and Town Packs are the target style)

> Licence ruling, 16 Nov 2026: nothing from the Synty packs in the public repo; GLBs reach a web build only if end users can't get them and the site is password-gated.

## Findings (checked against `main` at `fd4586a` and the 043 B branch at `09a95c8`, 17 Nov 2026; no browser)

### 1. The gallery already shows the choice; it just can't take it
- **043 B's gallery** (`src/render3d/gallery.ts`, branch `ticket/043-city-style-guide-b`, reviewed "meets", must-fix 0, not merged):
  - one straight line of every building-sized model of one pack;
  - four copies per model, copy `f` turned by `frontYaw(f)` for f in `+z`, `+x`, `-z`, `-x`, each captioned `door: f`;
  - the copy matching the table now is captioned `current`, with a green outline.
  - The copy whose real door faces the camera is the true front. Today Josh has to read its name and type it in chat.
- **It is never pickable, by design and by test:** `noRay(scene)` blanks every raycast, `hitTest` returns null, and `gallery.test.ts` asserts "no object can be picked". Left-drag pans the line.
- **Packs to calibrate** (the 043 B gallery's counts, real manifest, 17 Nov 2026):
  - `city-pack`: 49 building-sized models;
  - `town-pack`: 18;
  - `apocalypse-power`: 10;
  - `simple-town`: 45, already calibrated by Josh (042 A). It stays the fallback style.

### 2. The front table is keyed by bare name, and names collide across packs
- `BUILDING_FRONTS: Record<string, BuildingFront>` and `BUILDING_EXCLUDE: string[]` in `models.ts` are keyed by bare name. Every line today is a SIMPLE Town name.
- `SM_Bld_Shop_01..03`, `SM_Bld_Apartment_01` and `SM_Bld_Church_01` exist in more than one pack. A bare-name table can't give the City Pack's `SM_Bld_Shop_01` a different door from the Town Pack's.
- **Readers of the bare keys:**
  - `planModels` (`fronts[name]`);
  - `buildingPlan` (`exclude.includes(name)`);
  - `galleryEntries` (`fronts[entry.name]`, `exclude.includes`);
  - `facing.test.ts`, `debug3d.test.ts`, `gallery.test.ts`;
  - `styleguide.test.ts` (it compares the guide's chapter 6 and 7 tables, and chapter 5's exclude list, with the table);
  - `docs/city-style-guide.md` chapters 5, 6, 7 and 15.

### 3. A browser can't write a file by itself
The page needs a writer. There are three ways:

| | (a) dev-server endpoint (Vite plugin, `apply: "serve"`) | (b) download a JSON file | (c) File System Access API |
|---|---|---|---|
| **Josh's steps** | none: every click is saved | after each session, move the downloaded file into the folder | pick the folder once per browser session and grant write permission |
| **Shows up in the town** | at once, on reload | only after he moves the file | at once |
| **Browsers** | any | any | Chrome and Edge only |
| **Testable on CI** | yes: the handler is a plain function over a temp dir | yes | barely (permission prompts, no Node equivalent) |
| **What it touches** | `vite.config.ts` (one plugin line), forbidden to the 3D tickets until now | nothing outside `src/render3d/` | nothing outside `src/render3d/` |
| **In `npm run build` / Pages** | absent: `apply: "serve"` drops it from builds, and it has no preview hook | the button would exist unless gated | the code would exist unless gated |

- **Recommended: (a).** It is the only one that matches "click ... and have it save the data to disk" with no extra step.
- (b) is a fallback if Josh won't have `vite.config.ts` touched (Q2).
- Whichever is chosen, the gallery and the save code are compiled out of the production build (C).

### 4. Dev serving already reaches `assets/private/`
- In dev, models load from `${BASE_URL}assets/private/out/`. Vite serves the repo root, so a file at `assets/private/calibration/fronts.json` can be read the same way. The town can read it with no endpoint.
- `.gitignore` already ignores `assets/private/`, so the file can't be committed by accident.
- Vite watches the repo root, the 110 MB GLBs included. A file the page fetches (not imports) is not in the module graph, so writing it shouldn't reload the page. B's builder confirms this. B also adds `assets/private/**` to `server.watch.ignored` so it can't happen (and the watcher does less work on Josh's PC).

## Goal
- **Josh runs `npm run dev` and opens `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack`.** For each model he clicks the copy whose door faces him. That copy becomes `current` and the choice is written to `assets/private/calibration/fronts.json` on his disk.
- **He can also:**
  - mark a model as "excluded" (Shift+click: a model he never wants placed);
  - change his mind by clicking another copy;
  - clear a model (Delete).
- **The 3D town in dev uses his saved fronts and exclusions at once**, with no code edit and no message in chat.
- **The production build has neither the gallery nor the endpoint.**
- Play is unchanged.

## Sections, order and size
| Section | What | Owner | Needs | Size |
|---|---|---|---|---|
| **0**: the file's validator | `validateCalibration` and `calibrationKey` in `src/core/calibration.ts` (the types are written already), tests | lead-architect | G1 | about 1 hour |
| **A**: keys and the dev loader | `BUILDING_FRONTS` and `BUILDING_EXCLUDE` keyed `pack:name`; the dev-only read of the file; saved values override the table for the town and the gallery | renderer | 0; 043 B merged (Q1) | about ¾ day |
| **B**: the endpoint | a dev-only Vite plugin that reads and patches the file atomically | grid-simulator | 0 (not A, not 043 B) | about ½ day |
| **C**: click to choose | gallery clicks, marks, saving, the "saved" feedback; the gallery compiled out of production | renderer | A and B | about ¾ day |

Section D (promoting saved values into code) was dropped at approval; it is cut again only if Josh says a pack is done.

- Each section is its own build, review and playtest.
- A and B are independent of each other and can run in parallel. On Josh's PC, run one heavy step at a time (memory note, 17 Nov 2026).

## The design (defaults; the real choices are the open questions)

### Section 0: the validator (`src/core/calibration.ts`, lead-architect)
- **Types and constants, written now** (in `src/core/calibration.ts`, exported from `src/core/index.ts`):
  - `CALIBRATION_VERSION` 1;
  - `CALIBRATION_FILE` `assets/private/calibration/fronts.json`;
  - `CALIBRATION_ENDPOINT` `/__calibration/fronts`;
  - `CalibrationFront`, `CalibrationKey`, `CalibrationEntry`, `CalibrationFile`, `CalibrationPatch`, `CalibrationResult`.
- **Added at G1:**
  - `calibrationKey(pack, name): CalibrationKey`;
  - `parseCalibrationKey(key): { pack, name } | null`. The pack is `[a-z0-9-]+`. The name is the rest after the first colon: non-empty, with no `/`, `\` or control characters.
  - `validateCalibration(json: unknown): CalibrationResult`. It refuses:
    - another version;
    - a bad key;
    - an entry with neither `front` nor `exclude`;
    - a front outside the four;
    - a missing or unparseable `at` or `savedAt`;
    - unknown fields.
  - `applyCalibrationPatch(file | null, patch, now): CalibrationFile` (pure). A null entry deletes the key. Keys are written sorted.
  - `emptyCalibration(now)`.
- No logic beyond these. The file format is the contract between B (writer) and A and C (readers).

### Section A: `pack:name` keys and the dev loader (`src/render3d/`, renderer)
1. **Re-key the tables.** `BUILDING_FRONTS` becomes `Record<CalibrationKey, BuildingFront>` and `BUILDING_EXCLUDE` becomes `readonly CalibrationKey[]`. Every existing line gets `simple-town:` in front of its name, and no value changes.
   - Readers look up `calibrationKey(pack, name)`: `planModels`, `buildingPlan`, `galleryEntries`, and `PlannedModel`'s front and corner.
   - Tests that index the table by bare name are edited **mechanically**, spelling the key only. One new test pins the re-key: the new table equals the old literal with `simple-town:` added, line for line. The reviewer checks that no test changed meaning.
   - Guide: the chapter 6 and 7 tables show `simple-town:store_small_mesh` (and so on). Chapter 6 says "one line per `pack:name`". Chapter 5's exclude wording reads keys. The drift test (`styleguide.test.ts`) parses the keyed form.
   - Why now: the saved file is keyed `pack:name` from day one. One key space means the merge is a plain lookup, and any later promotion into code is a copy.
2. **The dev loader** (`src/render3d/calibration.ts`, new):
   - `loadSavedCalibration(deps: { dev: boolean; fetchJson; info? }): Promise<CalibrationFile | null>`.
     - With `dev` false it returns null and fetches nothing.
     - In dev it fetches `${BASE_URL}${CALIBRATION_FILE}` with `cache: "no-store"` and validates it with `validateCalibration`.
     - Absent: null, silently (the normal case on CI and a fresh checkout).
     - Invalid: null, with one `console.info` line naming the first error. It never throws.
   - The real call passes `dev: import.meta.env.DEV`, so the production build never fetches it.
3. **The merge** (pure): `effectiveFronts(code, saved): { fronts, exclude }`.
   - A saved `front` replaces the code's `front` and keeps the code's `corner` and `open`. For a corner model whose saved front differs from the code's, one info line: its `open` side is not recalibrated.
   - A saved key the code lacks is added.
   - `exclude: true` adds the key to `exclude`.
   - Code keys with no saved entry are unchanged. With `saved` null the result is the code's tables exactly.
4. **Who uses it:**
   - `sharedModels()` (town) loads the saved file before planning and passes the merged `fronts` and `exclude` into `loadModels` / `applyModels`.
   - The gallery's renderer passes the merged tables to `galleryLayout`.
   - `fronts=1` shows the merged fronts, because it reads the plan.
5. **What the gallery shows (read-only in A):**
   - The `current` copy says where its front came from: `current` (code), `current, saved` (the file) or `current ?` (the guess).
   - A group's caption has `excluded` when marked.
   - The line's order is unchanged by marks (no model moves).
   - The title adds "`N` of `M` marked" for the pack.

### Section B: the dev-server endpoint (`tools/calibration/`, `vite.config.ts`; grid-simulator)
1. **`tools/calibration/store.ts`** (Node, no Vite import):
   - `readCalibration(file): CalibrationFile | null`;
   - `patchCalibration(file, patch, now): CalibrationFile`. It reads the file (or starts empty), calls `applyCalibrationPatch` and validates the result. It writes atomically: `fronts.json.tmp` in the same folder, then `renameSync` over `fronts.json`, retrying a few times on Windows `EPERM`/`EBUSY` (an editor or a virus scanner holding the file). It creates the folder if it is missing.
   - Nothing from the request becomes a path. The file path is fixed: `CALIBRATION_FILE` under the Vite root.
2. **`tools/calibration/plugin.ts`:** `calibrationPlugin(opts?: { root?: string }): Plugin`, with `apply: "serve"`.
   - It has only a `configureServer` hook, with middleware on `CALIBRATION_ENDPOINT`. There is no `configurePreviewServer`, so `vite preview` doesn't have it either.
   - `GET`: 200 with the file, or `emptyCalibration`.
   - `POST`: the body is one `CalibrationPatch` as JSON, `content-type: application/json`, at most 64 KB. Valid: 200 with the whole file after the write. Malformed: 400 with the validator's errors. Anything else: 405.
   - It refuses a request whose remote address is not loopback (403), so `npm run dev -- --host` can't let the LAN write.
   - The handler is a plain function over `(method, headers, body, remoteAddress)`. It is tested without starting a server.
3. **`vite.config.ts`:** adds `plugins: [calibrationPlugin()]` and `server.watch.ignored: ["**/assets/private/**"]`. Nothing else changes. This file was out of bounds for 037 to 043, so Josh approves it here (Q2).
4. **Owner:** `tools/` is the grid-simulator's (brief's table). `vite.config.ts` has no owner in the table, so this ticket gives the one change to B's owner.

### Section C: click to choose (`src/render3d/gallery.ts`, `renderer.ts`; renderer)
1. **Hit test, pure:** `galleryHitAt(layout, origin, dir): GallerySlot | null`.
   - The ray comes from the gallery camera through the pointer (three's maths, no WebGL, no scene raycast).
   - A slot is hit when the ray meets the vertical plane through the middle of its outline (z = `outline.cz`) inside its cell's x range, between the bottom of its copy caption and the model's top plus 0.5. A click on the model or on its `door: f` caption counts. Gaps hit nothing.
   - **The scene stays unraycastable:** `noRay` stays, and `hitTest` still returns null, so play never sees a pick target. Only the gallery's own pointer handler calls `galleryHitAt`. The town's picker and `pick.ts` are untouched.
2. **Click, not drag:** a left button down and up within `CLICK_SLOP_PX` 5 px is a click. More is a pan, as today. `isGalleryClick(down, up)` is pure.
3. **Actions** (pure: `galleryAction(entry, slot, modifiers): CalibrationPatch | null`):
   - **click a copy:** that model's `front` = the copy's `f` (`exclude` kept). Clicking another copy is the undo. Clicking the `current` copy again does nothing.
   - **Shift+click a copy:** sets that front and toggles `exclude`.
   - **Delete or Backspace:** clears the last-clicked model's entry, so the code's table applies again.
   - There are no other marks (no "Ctrl+click"). No new letter keys, so nothing collides with play's pan keys (arrows, Home, F, +, -).
4. **Saving** (`saveCalibrationPatch(patch, deps: { postJson })`, in `gallery.ts` only):
   - It POSTs to `CALIBRATION_ENDPOINT`, one patch at a time and in click order (a queue, so two quick clicks can't land out of order). The server's reply replaces the gallery's copy of the file.
   - The layout is rebuilt in place, keeping the camera's pan and zoom. The `current` mark moves and the copy caption shows `saved`.
   - On failure (no endpoint, 4xx, network): the mark is shown, with `not saved: <reason>` under the group's caption and in the title. The next click retries the queue. Nothing throws.
5. **Not in production:**
   - `renderer.ts` switches the gallery on only when `import.meta.env.DEV` is true, so Rollup drops `gallery.ts` and its save code from `npm run build`.
   - The 043 B isolation test keeps passing (`galleryRequested(location.search)` is still the one switch).
   - New isolation tests:
     - `saveCalibrationPatch` and `CALIBRATION_ENDPOINT` are referenced only by `gallery.ts`;
     - `scene.ts`, `town.ts`, `models.ts`, `models3d.ts`, `pick.ts`, `layout.ts` and `camera.ts` don't import `./gallery`;
     - `models3d.ts` imports the loader, never the saver.
6. **Title help line:** "click a copy: its door faces you; shift-click: exclude; Delete: clear".

### Section D: dropped at approval (17 Nov 2026)
Promoting a pack's saved values into code is not part of this ticket. It is cut again only when Josh says a pack is done.

## Acceptance criteria

### Section 0 (Vitest, `src/core/calibration.test.ts`)
- [ ] `calibrationKey("city-pack", "SM_Bld_Shop_01")` is `"city-pack:SM_Bld_Shop_01"`. `parseCalibrationKey` round-trips it and refuses `"SM_Bld_Shop_01"`, `":x"`, `"City:x"`, `"a:"`, `"a:b/c"` and `"a:b\\c"`.
- [ ] `validateCalibration` accepts a valid file. It refuses, each with an error naming the key: another version, a bad key, an empty entry, a front outside the four, a bad `at` or `savedAt`, an unknown field, and a non-object.
- [ ] `applyCalibrationPatch` sets, replaces and (on null) deletes one key, sets `at` and `savedAt` to `now`, writes keys sorted, and always returns a file `validateCalibration` accepts. It never mutates its input.

### Section A (Vitest, no WebGL, no manifest)
- [ ] **Re-key, nothing else:** `BUILDING_FRONTS` equals the 043 B table with every key prefixed `simple-town:`, values identical. `BUILDING_EXCLUDE` is still empty. All 042 A and 043 B tests pass, with only their key spelling edited (the reviewer checks the diff of each test file is key spelling only).
- [ ] **Two packs, one name:** with a fixture manifest holding `SM_Bld_Shop_01` in both `city-pack` and `town-pack`, and fronts `city-pack:SM_Bld_Shop_01` `"+x"` and `town-pack:SM_Bld_Shop_01` `"-z"`, `planModels` and `galleryEntries` give each pack's entry its own front.
- [ ] **The merge:**
  - `effectiveFronts(code, null)` deep-equals the code's tables;
  - a saved front replaces only `front` (a corner model keeps `corner` and `open`, and one info line says so);
  - a saved key the code lacks is added;
  - a saved `exclude: true` lands in `exclude`;
  - the inputs are not mutated.
- [ ] **The town follows the file:** with a fake model set and a saved file that turns `simple-town:Building_Gym` to `"+x"` and excludes `simple-town:house_mesh`, applied on `09-shrine-circuit`:
  - every `Building_Gym` clone faces its road by 042 A's marker test, with the `"+x"` front;
  - no `house_mesh` is placed;
  - with no file, the clones are exactly as on `main`.
- [ ] **Dev only and quiet:** `loadSavedCalibration({ dev: false })` makes no fetch. In dev it is quiet when absent (a 404 or a network error: null, no log). When invalid, null and one info line. It never rejects.
- [ ] **Gallery reads it:**
  - the `current` copy's caption is `current`, `current, saved` or `current ?` by source;
  - an excluded group says so;
  - the order of groups is the same with and without a saved file;
  - the title has "`N` of `M` marked".
- [ ] **Guide and drift test:** chapters 5, 6, 7 and 15 use `pack:name`, and step 5 of chapter 15 is "click each door in the gallery (ticket 045)". `styleguide.test.ts` passes on the keyed form and fails when one key in the guide's tables is changed (the builder shows the failure message once).
- [ ] **CI-safe:** no test reads `assets/private/` at collection. Any real-file test checks the file's existence and reads it only inside the test, skipping when absent.

### Section B (Vitest, `tools/calibration/*.test.ts`, temp dirs only)
- [ ] **Store:** in a folder from `fs.mkdtempSync(path.join(os.tmpdir(), "rest-cal-"))` (paths built with `path.join`, no drive letters or backslash literals in fixtures):
  - the first patch creates the folder and the file;
  - a second patch keeps the first key;
  - a null patch deletes a key;
  - the file is valid by `validateCalibration` after every write;
  - no `.tmp` is left behind.
- [ ] **Atomic:** with the rename made to fail by a fake, the old file is untouched and readable, and the error is returned, not thrown past the handler. With a fake rename that fails once with `EPERM`, the write succeeds on the retry.
- [ ] **Handler:**
  - GET with no file returns `emptyCalibration`, and with a file returns it;
  - POST of a valid patch returns 200 and the new file;
  - a malformed body returns 400 with errors, and the file is unchanged;
  - a body over 64 KB returns 413;
  - a wrong content type returns 415;
  - PUT returns 405;
  - a non-loopback remote address returns 403 (`127.0.0.1`, `::1` and `::ffff:127.0.0.1` are loopback).
- [ ] **Dev only:** `calibrationPlugin().apply` is `"serve"`. It has `configureServer` and no `configurePreviewServer`, `transform` or `load` hook (nothing of it can reach a bundle).
- [ ] **Config:** `vite.config.ts` differs from `main` only by the plugin line, its import and `server.watch.ignored`. The reviewer checks.
- [ ] **Josh checks (or the main session, on his PC):** with `npm run dev` running, `curl -X POST -H "content-type: application/json" -d '{"key":"city-pack:SM_Bld_Shop_01","entry":{"front":"-x"}}' http://localhost:5173/__calibration/fronts` writes `assets/private/calibration/fronts.json`, and `git status` shows nothing new (`git check-ignore` names the file).

### Section C (Vitest without WebGL, except "Josh checks")
- [ ] **Hit test:** on the 043 B manifest fixture, with `createGalleryRig` at 800 × 450, the ray through the projected middle of each copy's model, on the first screen and after panning to the line's end, hits that copy. Rays through the gaps between copies and between groups hit nothing. The scene still has no raycastable object, and the gallery's `hitTest` still returns null.
- [ ] **Click vs drag:** `isGalleryClick` is true at 0 to 5 px of travel, false beyond. A pan of more than 5 px sends no patch.
- [ ] **Actions:** for each of click, Shift+click and Delete, from each starting state (none, front, front+exclude), `galleryAction` gives the patch in the design's table. The patch validates under `applyCalibrationPatch` and `validateCalibration`.
- [ ] **Saving, with a fake `postJson`:**
  - three quick clicks are posted in order, one at a time;
  - the reply replaces the state, and the `current` copy moves to the clicked one, captioned `saved`;
  - a rejecting `postJson` shows `not saved: <reason>` and throws nothing;
  - the next click retries.
- [ ] **Isolation:** the new isolation tests in C5 pass. The 043 B isolation tests pass unedited. `pick.test.ts` and the scene tests pass unedited.
- [ ] **Not in production (the main session checks, on Josh's PC, one heavy step at a time):**
  - `npm run build` succeeds;
  - `dist/` has no `__calibration`, no gallery title text ("four sides each"), no `.glb`, no `manifest.json`, no `fronts.json` and no path containing `private` (039's check, extended).
- [ ] **Josh checks:** `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack`.
  - He clicks the door copy of a few models; each becomes `current, saved` and the page doesn't reload.
  - He shift-clicks one (`excluded`) and clears one with Delete.
  - He reloads: the marks are still there, and no model has moved in the line.
  - He opens `/?puzzle=09-shrine-circuit&view=3d&fronts=1`: a SIMPLE Town model he re-clicked in `gallery=simple-town` shows its new front.

### Nothing else moves (the main session checks, every section)
- [ ] `npm run gate` is green and the test count grew. `npm run playtest` is green with no snapshot change.
- [ ] `git diff main -- src/render/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ package.json public/ index.html .gitignore` is empty. `src/core/` changes only in section 0, `tools/` and `vite.config.ts` only in B. `git ls-files assets/private` is empty.
- [ ] The town with no calibration file is exactly 043 B's: 042 A's facing and variety tests pass with key spelling edited only.

## Files
- **Section 0 (lead-architect):** `src/core/calibration.ts`, new `src/core/calibration.test.ts`, `src/core/index.ts` (one export line, already added).
- **Section A (renderer):**
  - `src/render3d/models.ts`, `models3d.ts` and `gallery.ts`;
  - new `src/render3d/calibration.ts` and `calibration.test.ts`;
  - `facing.test.ts`, `debug3d.test.ts`, `gallery.test.ts` and `styleguide.test.ts` (key spelling, plus new tests);
  - `docs/city-style-guide.md` (chapters 5, 6, 7 and 15).
- **Section B (grid-simulator):** new `tools/calibration/store.ts`, `plugin.ts` and their tests; `vite.config.ts` (the plugin and the watch ignore only).
- **Section C (renderer):** `src/render3d/gallery.ts`, `gallery.test.ts`, `renderer.ts` (the `import.meta.env.DEV` guard only), and `docs/city-style-guide.md` (the gallery's how-to in chapter 6).
- **Must not touch (all sections):**
  - `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/` and `src/main.ts`;
  - `town.ts`, `layout.ts`, `camera.ts`, `pick.ts` and `scene.ts`;
  - `tests/`, `puzzles/`, `package.json`, `index.html`, `public/` and `.gitignore`;
  - `assets/` (the file is written by the running dev server on Josh's PC, never by an agent and never committed).

  A builder that needs any of them stops and asks for a re-cut.

## Interfaces
- **`src/core/calibration.ts` (written now, types and constants only):** `CALIBRATION_VERSION`, `CALIBRATION_FILE`, `CALIBRATION_ENDPOINT`, `CalibrationFront`, `CalibrationKey`, `CalibrationEntry`, `CalibrationFile`, `CalibrationPatch`, `CalibrationResult`. Section 0 adds `calibrationKey`, `parseCalibrationKey`, `validateCalibration`, `applyCalibrationPatch` and `emptyCalibration`.
- **File format, version 1** (example):
  ```json
  { "version": 1, "savedAt": "2026-11-18T10:02:11.000Z",
    "entries": {
      "city-pack:SM_Bld_Shop_01": { "front": "-x", "at": "2026-11-18T10:01:40.000Z" },
      "town-pack:SM_Bld_Shop_01": { "front": "+z", "exclude": true, "at": "2026-11-18T10:02:11.000Z" } } }
  ```
- **Local to `src/render3d/` (A and C):**
  - `loadSavedCalibration`, `effectiveFronts` (`calibration.ts`);
  - `galleryHitAt`, `isGalleryClick`, `CLICK_SLOP_PX`, `galleryAction`, `saveCalibrationPatch` (`gallery.ts`).
- **Local to `tools/calibration/` (B):** `readCalibration`, `patchCalibration`, `handleCalibrationRequest`, `calibrationPlugin`.
- **No new dependency.** The plugin uses Vite's own `Plugin` type and Node's `fs`, `path` and `os`. Vite and `@types/node` are already devDependencies.
- **No puzzle schema change.**

## Open questions for Josh (defaults apply if you just approve)
1. **Order with 043 B.** Default: you merge 043 B first (it is reviewed "meets", must-fix 0, regressions 0). Then 045 A and C branch from `main`. Sections 0 and B don't need the gallery and can start from `main` now. The alternative is to stack A and C on `ticket/043-city-style-guide-b`; they can't merge before it.
2. **Where it saves.** Default (a): the dev-server endpoint. It means a dev-only Vite plugin and a change to `vite.config.ts`, which the 3D tickets have kept off-limits until now. Say yes to that here. The alternatives:
   - (b) a "download" key that saves the JSON for you to drop into `assets/private/calibration/`, with no config change;
   - (c) the browser's folder-permission API (Chrome and Edge, a prompt every session).
3. **Marks.** Settled at approval: click = this is the door; Shift+click = exclude (with that door); Delete = clear. There is no other mark, and no separate "no door" mark: for a building with no clear door, you click its best street side.
4. *(Settled at approval: there is no third mark, and no model moves in the line.)*
5. **Re-key now.** Default: A changes `BUILDING_FRONTS` and `BUILDING_EXCLUDE` to `pack:name` keys at once, values unchanged, so City and Town Pack shops with the same name can face differently. It edits key spelling in four test files and the guide's tables. The alternative is to keep bare names for SIMPLE Town and add a second, keyed table for the POLYGON packs (two lookups for ever).
6. **Promotion.** Settled at approval: dropped from this ticket (section D). The town uses saved values only in dev on your PC; a fresh checkout (or CI) uses the code's table. A promotion ticket is cut only when you say a pack is done.
7. **Corner models.** Default: a click sets only a corner model's door. Its `open` side (the second street face) stays in code and is re-checked by eye. A later ticket can add a way to click the open side.
8. **Decided rules.** None is touched. This is a dev tool and data. There is no `rules-coverage.md` change, and play, the 2D view and the town's look without the file are unchanged.

## Within approved scope?
**Yes, with two things for you to approve at G1:**
- **The change to `vite.config.ts`** (Q2): one dev-only plugin and a watch-ignore for `assets/private/`.
- **New files outside `src/render3d/`:** `tools/calibration/` (the grid-simulator's folder) and the validator in `src/core/` (the lead-architect's).

Otherwise:
- No new dependency and no puzzle schema change. The `src/core/` addition is a new, separate file format.
- Nothing from the packs is committed. The file lives under the gitignored `assets/private/`.
- The production build has neither the gallery nor the endpoint, consistent with your licence ruling of 16 Nov 2026.

Each section starts only on your G1.
