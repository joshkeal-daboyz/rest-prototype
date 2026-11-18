# 054 · City colour variety: each block in one of the City Pack's colourway atlases, so neighbours differ

owner: renderer (src/render3d/, docs/city-style-guide.md); section A: grid-simulator (tools/)
status: open. G1 waived for the city-style goal (Josh, 18 Nov 2026, in chat). A and B can build in parallel; C waits for B and for 053 to merge.
branch: `ticket/054-city-colour-variety` (one branch per section: `ticket/054a-colourway-export`, `ticket/054b-colourway-blocks`, `ticket/054c-colourway-guide`)

## Josh's words
> "leverage the city pack and establish a style guide that will allow you to build procedural cities by leveraging the city pack... a city guide that is able to yield similar quality results to that city in the image excluding the humans, animals and vehicles." (18 Nov 2026; approvals waived for this goal)

**The look target**: the reference street shows teal, green, tan, orange, red and cream blocks side by side. Today every City Pack block renders in the one atlas the GLB embeds, so every brick wall is the same red.

## Findings (read 18 Nov 2026 by the architect; nothing from the pack is committed)
1. **One atlas for everything.** `MaterialList_PolygonCity.txt` gives one albedo slot, `PolygonCity_01_A`, for 433 of 461 slots (all buildings, props, environment, vehicles; the rest are glass, road, billboard, skyline). In the converted `city-pack.glb` the 4 embedded images are `PolygonCity_Texture` (the base; 83 of 84 `SM_Bld_*`, 63 `SM_Env_*`, all 179 `SM_Prop_*`), `PolygonCity_Texture_01_A` (only `SM_Bld_Shop_Corner_02` and three sidewalk pieces), and `PolygonCity_Texture_01_C` (characters, never used). The manifest's city-pack `atlas` is `null` (per-model mode), and the GLB's 363 materials share those 4 images.
2. **All 13 atlases share one UV layout.** Every `PolygonCity_Texture*.png` is 1024 x 1024 RGBA. A 16 x 16 cell diff against the base shows no shifted region in any of them: only cell colours change. The base and `_01_A` are nearly identical (01_A adds street-name and traffic signs in empty space).
3. **What the 12 variants are.** Two axes:
   - **Series 01 to 04 (hue)**: 02, 03 and 04 recolour the wall gradient block (x 0 to 232, y 624 to 800) where the building walls sample. The red-brick column (base `#956257`) becomes dark green `#475343` (02), cream-tan `#ac8f79` (03), teal `#497d7e` (04); the warm-brown trim columns go dark brown (03) or redder (04); the last column goes tan (02) or grey (04). The series also repaint the taxi, police and ambulance signs (02 to 04) and turn the blue panels at bottom right grey (02, 04).
   - **Tone A, B, C**: A is the series as drawn; B is the whole atlas dimmed and desaturated (about 8% darker); C is brighter and more saturated (the brick of 01_C is a warmer orange-red, `#a16458`). A, B and C also change the skin swatches (characters only).
   So there are **12 colourways** of the base (01_A, 01_B, 01_C, 02_A to 04_C), giving 4 hues x 3 tones. Emissive_01 to _05, BillboardAds, Normal, Metallic and Skyline are not colourways and are never used here.
4. **Where buildings sample.** By triangle count over every `SM_Bld_*` mesh in the GLB: 85.7% in the wall gradient block, 6.5% in the blue panels (bottom right), 4.9% other bottom-left cells, 2.9% the palette strip, **0% in the sign region**. So swapping a block's atlas changes its walls (and its blue panels in 02 and 04), never a sign on it. The grey columns (e.g. `SM_Bld_Shop_01`'s walls, x 96) are the same in every colourway: grey-walled styles and the shopfront ground floors do not change colour (risk 1).
5. **Where dressing samples.** `SM_Prop_*`: 63% wall gradient block, 25% palette strip, 1% signs. Awnings and escapes would recolour with the atlas if swapped.
6. **Cost.** Each PNG is 78 to 118 KB on disk; decoded, 4 MiB of texture memory each (the renderer turns mipmaps off for the nearest filter, `nearestTextures`). The default pool (below) loads 7: about 0.8 MB fetched, 28 MiB of texture memory.
7. **The converter does not export them.** `npm run assets:convert` (tools/assets/convert.ts, ticket 038) only writes GLBs and `manifest.json`; Blender embeds the images a model references, so the 12 alternates never reach `assets/private/out/`. The goal worktree has no `assets/private/in/` at all (its `out` and `calibration` are symlinks into the main worktree).

## The design
1. **Colourway pool (Default)**: `COLOURWAY_POOL = ["base", "01_C", "02_A", "02_C", "03_A", "03_C", "04_A", "04_C"]`: red, orange-red, green, bright green, cream-tan, bright tan, teal, bright teal. `"base"` is today's look and needs no file. The B tones and 01_A are left out: B is darker in a night scene that is already dark, 01_A looks the same as the base.
2. **Per-block, deterministic, neighbours differ.** A pure `assignColourways(blocks, available)` in new `src/render3d/colourway.ts`: blocks in run order, each `{ key, run }` (`run` absent for a stack on a lone lot). A block's start index is a pure function of its lot key (`stableHash` through the murmur-style finaliser `dressing.ts` uses, because FNV's low bits are weak on short keys) modulo the available count; if that equals the previous block's in the same run, it steps to the next index (mod count). So two neighbours in a run never share a colourway when two or more are available. `available` is `"base"` plus the pool ids that loaded, in pool order; with only `"base"` every block gets `"base"`.
3. **Applied by cloning materials, never the cached roots.** After `stackGroup` clones a block (clones share the cache's materials), `paintStack(group, id, colourways, cache)` replaces each mesh's material with a clone whose `map` is the colourway's texture, but only for a material whose `map` is the base atlas (the texture or image name equals the colourway's `base`, or starts with `base + "_"`, which catches `_01_A`). Every other material (glass, the replaced-glass, anything without a map) is left as the same object. Clones are cached per (source material, id), so materials grow by distinct sources x 7, not per block. The `"base"` id clones nothing: the block's materials are the very objects they are today. The new texture copies the replaced map's `flipY`, `colorSpace`, `wrapS`/`wrapT`, `channel`, and gets `NearestFilter`, no mipmaps. Emissive maps are never set from a colourway; a material's emissive stays as its source's.
4. **Dressing and furniture keep the base atlas (Default).** Why: 052 draws each dressing key as one `InstancedMesh` shared by every block under a draw-call cap (`maxCalls`); matching the block would split each key into up to 8 meshes and break the cap. And the reference's awnings and escapes contrast with their walls, they do not match them. A colourway only ever touches stack pieces.
5. **Lazy, optional loading.** `loadModels` reads the city-pack entry's `colourways` only when stack keys were asked for, and loads only the ids in `COLOURWAY_POOL` (never B tones, emissive, billboard, normal maps), in parallel, through an injected `loadTexture(url)` (the real one: three's `TextureLoader`, already in `three`; no new dependency). A colourway whose image fails drops that id only, with one `info` line. No `colourways` field, no city-pack, a fresh checkout or CI: nothing is fetched, and the scene is **exactly** today's (same material objects).
6. **Export (section A).** The converter copies the colourway PNGs verbatim (no Blender) to `assets/private/out/<pack>/colourways/<file>` and writes `colourways` into that pack's manifest entry (type `AssetColourway` in `src/core/assets.ts`, already written). Which files are colourways of which base is a committed table in `tools/assets/colourways.ts` (file names only, no pack content): for `city-pack`, base `Textures/PolygonCity_Texture.png` and the 12 `Textures/PolygonCity_Texture_0{1..4}_{A,B,C}.png`. All 12 are exported (they are small); the renderer's pool picks which to load.
7. **Checking the look.** Chapter 16 gets 16.9 "Colourways" and a reference item **R13: neighbours in a run differ in colourway** (auto, in `citymetrics.ts`), plus an eye item: in the `cam=street&run=0&light=day` screenshot at least four wall colours are visible.

## Sections
### A · Export the colourway atlases (owner: grid-simulator, tools/; about ½ day)
- `tools/assets/colourways.ts`: `COLOURWAY_SOURCES: Readonly<Record<string, { base: string; files: readonly string[] }>>` (paths relative to the pack's input folder), and the pure planning: id from the stem (`PolygonCity_Texture_02_A` gives `02_A`), out path, size check.
- `tools/assets/convert.ts`: a full convert of a pack that has a table entry runs the colourway step after its GLB; and `npm run assets:convert -- --colourways [pack...]` runs only the colourway step (no Blender, no GLB rewrite): copy each file, read each PNG's width and height from its IHDR, compare to the base's, and rewrite only that pack's `colourways` field in `manifest.json` (every other byte of the entry the same, as `JSON.parse` sees it). A missing file or a size mismatch is one warning line and that file is skipped; a missing manifest is exit 1. `ConvertDeps` gains `readBytes` and `copyFile`, injected like the rest.
- `tools/assets/manifest.ts`: `readPriorPacks` and `buildManifest` keep a pack's `colourways` across a re-convert of other packs.
- Run (main session, after the merge): the goal worktree has no `assets/private/in`, and its `assets/private/out` is a symlink into the main worktree. Default: replace the goal worktree's `out` symlink with a real copy of that folder, add `assets/private/in/city-pack` as a symlink (read-only use), then `npm run assets:convert -- --colourways city-pack`. Nothing is written into the main worktree.

### B · Blocks drawn in their colourway (owner: renderer, src/render3d/; about 1 day)
- New `src/render3d/colourway.ts` (no three import): `COLOURWAY_POOL`, `assignColourways`.
- `src/render3d/models3d.ts`: `LoadDeps.loadTexture?`; `ModelSet.colourways?: ReadonlyMap<string, Texture>` (render3d-local, not core); the lazy load (design 5); `paintStack` and its per-set material cache; the town paints each terrace block (key `b.lot.key`, run `run.id`) and each stack on a lone lot (key the lot's key, no run). One console line: `3D models: city-pack colourways: N of 7 loaded`.
- `src/render3d/gallery.ts`: `gallery=city-pack&stacks=1&colourway=<id>` paints every stack in that one colourway (for the eye check); an unknown or unloaded id shows the base and says so in one line.

### C · Guide, metrics and the drift test (owner: renderer; about ½ day; after B and after 053 merges)
- `docs/city-style-guide.md`: 16.9 "Colourways" (pool, the neighbour rule, dressing keeps the base and why, the fallback, the findings' hue/tone table, risk 1 as an **Open** line); R13 added to 16.8's checklist with its eye half; Numbers rows for `COLOURWAY_POOL` (a record row) and `CITY_CHECK.R13`.
- `src/render3d/citymetrics.ts`: `CityMetrics.colourwayNeighbourDiffer` (share of adjacent block pairs in a run with different ids, over the fixture plan with a fixed fake set of 8 available ids) and `CITY_CHECK.R13 = 1.0`.
- `src/render3d/styleguide.test.ts`: `colourway.ts` joins the drift-checked files (a new check, existing checks unedited).

## Acceptance criteria
**CI-safe rules (every section).** No test reads `assets/private/` at module or `describe` level; a check on the real manifest stays inside an `it` and skips when the file is absent. PNG headers in tests are built in the test (a 24-byte signature + IHDR buffer), never read from the pack. Fixture roots are built from three `Mesh` and `MeshStandardMaterial` in the test; fake textures are `new Texture()` with a name. No Windows paths (use `path.join` and forward-slash literals), no timer under 1 s, no wall-clock wait. Nothing from `assets/private/` is committed, copied into the repo or bundled (`git ls-files assets/private` empty). Builders run only their folder's tests with `--maxWorkers=2` and one `npx tsc --noEmit`; no dev server, no browser.

**A**
1. [ ] (Vitest) `planColourways` for the city-pack table gives 12 entries with ids `01_A` to `04_C`, out paths `city-pack/colourways/PolygonCity_Texture_02_A.png` (forward slashes), and `base: "PolygonCity_Texture"`.
2. [ ] (Vitest) `--colourways city-pack` on injected deps copies each file, reads width and height from in-test PNG headers, writes `colourways` into only the city-pack entry, leaves every other pack and field deep-equal, and never calls `run` (no Blender).
3. [ ] (Vitest) A missing file, a non-PNG, and a 512 x 512 file against a 1024 x 1024 base each give one warning line naming the file and are left out; the rest are written; exit 0. A missing manifest: exit 1, nothing written.
4. [ ] (Vitest) A full convert of another pack keeps city-pack's `colourways` (through `readPriorPacks`); a full convert of city-pack runs the colourway step after the GLB.
5. [ ] (Main session) After the run in "Sections, A": `assets/private/out/city-pack/colourways/` holds 12 PNGs, the manifest lists 12, each 1024 x 1024; the main worktree's files are unchanged (`git -C` status and timestamps).

**B**
6. [ ] (Vitest) `assignColourways`: deterministic (same input, same output); with 2 to 8 available ids no two adjacent blocks in a run share one, over every terrace run of every ladder map's fixture plan; with only `"base"` every block is `"base"`; a lone-lot stack takes its hash's id; over the ladder each pool id is used by at least 5% of blocks.
7. [ ] (Vitest) `paintStack` on a fixture stack: a material whose map is named `PolygonCity_Texture` (and one named `PolygonCity_Texture_01_A`) is replaced by a clone whose map is the colourway texture with the source map's `flipY`, `colorSpace`, wrap and `NearestFilter`; a glass material and a mapless material are the same objects; two blocks in the same colourway share the clone; the cached root's materials and maps are the same objects with the same `map` after painting (identity and `uuid`); `"base"` replaces nothing.
8. [ ] (Vitest) With no `colourways` field, no `loadTexture`, or every load failing, the town's stack groups hold exactly the cached materials (identity), and no texture is requested; with one load failing, that id is dropped with one `info` line and the others are used. No emissive map is ever set by a paint.
9. [ ] (Vitest) Only pool ids are requested (never a B tone, `Emissive_*`, `BillboardAds`), only when stack keys were asked for, each once per page.
10. [ ] (Vitest) The gallery's `colourway=` parameter parses (`02_A` ok, `../x` and unknown ids rejected to base with one line).
11. [ ] (Main session) `npm run dev`, `09-shrine-circuit`, `view=3d&cam=street&run=0&light=day`: neighbouring blocks show different wall colours, awnings and escapes look as on `main`; the play view reads as on `main`; console shows `colourways: 7 of 7`. Screenshot sent to Josh.

**C**
12. [ ] (Vitest) `styleguide.test.ts` green with Numbers rows for `COLOURWAY_POOL` and `CITY_CHECK.R13`; the new drift check fails if `colourway.ts` exports a constant with no row.
13. [ ] (Vitest) `citymetrics.test.ts`: R13 meets 1.0 on every map of the protocol with the fake 8-id set; a fixture whose two neighbours share an id fails it.
14. [ ] (Vitest) Chapter 16.9 names every pool id and R13; 16.8 lists R13 with its eye half.

**Every section**
15. [ ] (Main session) `npm run gate` green and the test count grew; `npm run playtest` green with no snapshot change (CI has no atlases, so every map renders as on `main`); `git diff` of the section touches only its Files; `git ls-files assets/private` empty.

## Files
- **A, grid-simulator, may touch:** `tools/assets/colourways.ts` and `colourways.test.ts` (new), `tools/assets/convert.ts`, `convert.test.ts`, `tools/assets/manifest.ts`, `manifest.test.ts`. Must not touch `src/`, `docs/`, `puzzles/`, `tests/`, `package.json`, `tools/blender/`.
- **B, renderer, may touch:** `src/render3d/colourway.ts` and `colourway.test.ts` (new), `src/render3d/models3d.ts`, `src/render3d/gallery.ts`, and their tests (`models.test.ts`, `stacktown.test.ts`, `gallery.test.ts`, `stackgallery.test.ts`: new cases; existing ones unedited). Must not touch `dressing.ts`, `furniture.ts`, `terrace.ts`, `stacks.ts`, `town.ts`, `scene.ts`, `src/core/`, `tools/`, `docs/`.
- **C, renderer, may touch:** `docs/city-style-guide.md` (16.8, 16.9, Numbers), `src/render3d/citymetrics.ts`, `citymetrics.test.ts`, `styleguide.test.ts` (the new drift check only).
- Nobody touches `assets/`, `puzzles/locked/`, `public/`, `index.html`.

## Interfaces
- **`src/core/assets.ts` (written, architect, 18 Nov 2026):** `AssetPack.colourways?: readonly AssetColourway[]` and `interface AssetColourway { id; image; base; width; height }`. Optional, so `ASSET_MANIFEST_VERSION` stays 1 and `isManifest` and `main`'s reader are unaffected.
- **No event change, no schema change, no new dependency** (`TextureLoader` is part of `three`, already allowed in `src/render3d/` by ticket 037).
- **Local to `src/render3d/`:** `COLOURWAY_POOL: readonly string[]`, `assignColourways(blocks: readonly { key: string; run?: string }[], available: readonly string[]): string[]`, `paintStack(group: Object3D, id: string, set: ModelSet, cache: ColourwayCache): void`, `LoadDeps.loadTexture?: (url: string) => Promise<Texture>`, `ModelSet.colourways?`.
- **Local to `tools/assets/`:** `COLOURWAY_SOURCES`, `planColourways(pack, table)`, `pngSize(bytes)`, `ConvertDeps.readBytes`, `ConvertDeps.copyFile`.

## Risks
1. **Not every wall changes.** The colourways recolour only some gradient columns (the brick, the warm browns, one tan). Grey-walled styles and the shopfront ground floors are the same in every colourway, so the variety is mostly the brick upper floors. If the eye check finds too few colours, the follow-up is a generated recolour (a per-column hue remap of the base, made by the converter) as a new ticket, not more of this one.
2. **Side effects of 02 and 04**: their blue panels turn grey on the 6.5% of building triangles that sample them (likely door and window panels). Accepted as more variety; flagged for the eye check.
3. **Night**: the hue difference is subtle in the night scene; the colour judgement is made with `light=day`.
4. **Texture memory**: 28 MiB more with all 7 loaded; nothing on CI or a fresh checkout. Material count grows by (distinct base-atlas materials on stack pieces) x 7; draw calls do not change (stacks are cloned per block already, dressing is untouched), and the clones keep the same shader defines, so no new programs.
5. **The symlinked `out` folder** (Sections, A): running the export without replacing the symlink would write into the main worktree. The default step avoids it.
6. **Licence**: the PNGs are Synty content: gitignored, fetched by URL string at dev time only, never in `dist/` (as the GLBs, 038 and the 16 Nov 2026 licence decision).

## Open questions (decided defaults; nobody was available to answer, Josh may overturn any)
1. **Dressing matches its block?** Default: no, dressing keeps the base atlas (design 4: draw-call cap; the reference contrasts awnings with walls).
2. **Pool.** Default: the 8 ids in design 1; B tones out. Josh may want B in for a grimier street.
3. **Neighbours across a corner** (the last block of one run and the corner block of the next) are not forced to differ; the hash makes a match 1 in 8. Default: accepted; R13 counts within a run only.
4. **Table in `tools/` vs `pack.json`.** Default: a committed table of file names in `tools/assets/colourways.ts`, so nobody edits the gitignored input folder in the main worktree. A `pack.json` key can come later.

Decided rules: none is touched (rendering only); `rules-coverage.md` does not change.
