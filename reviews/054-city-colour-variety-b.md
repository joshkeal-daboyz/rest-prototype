ticket: 054-city-colour-variety-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B: a pure `assignColourways` that gives each City Pack block one colourway (deterministic per lot key, never the same as its run-mate before it), a lazy and optional load of the pool's seven atlases through an injected `loadTexture`, a `paintStack` that clones only base-atlas materials onto the colourway texture without touching the cached roots, the town painting every terrace block and lone-lot stack, and a gallery `colourway=` parameter for the eye check. With no atlases the scene must be exactly today's.

## Does the branch do it?
Files touched: `src/render3d/colourway.ts` and `colourway.test.ts` (new), `models3d.ts`, `gallery.ts`. All four are in B's list. `dressing.ts`, `furniture.ts`, `terrace.ts`, `stacks.ts`, `town.ts`, `scene.ts`, `src/core/`, `tools/` and `docs/` are untouched. `git ls-files assets/private` is empty. No new dependency: `TextureLoader` is part of `three` and is used only in `src/render3d/`.

- **6 (assignColourways).** `colourway.ts` hashes with `stableHash` plus a murmur finaliser, takes the index modulo the available count, and steps on one place when the block before it is in the same run and has that id. Tests in `colourway.test.ts` under "assignColourways": it is deterministic; "base"-only and empty inputs give all "base"; a lone lot takes `available[colourwayStart(key, n)]`; the step happens within a run only, checked with a constructed hash twin; for n = 2 to 8, no two run-neighbours match over every ladder map's terrace runs; each pool id covers at least 5% of more than 500 ladder blocks. Met.
- **7 (paintStack).** Covered by the `paintStack` describe:
  - Materials whose map is named `PolygonCity_Texture` or `PolygonCity_Texture_01_A` are replaced. The clone's map shares the colourway's `source` and copies flipY, colorSpace, wrapS/T and channel, with Nearest filtering and no mipmaps.
  - Glass, a mapless material and an unrelated map stay as the same objects.
  - Two blocks in one colourway share the clone, and a different id gets a different clone.
  - The cached root's materials, maps and uuids are unchanged after painting.
  - "base", an id that didn't load, and an empty set create nothing.

  On the filtering question: `nearestTextures` already sets every GLB map to Nearest/Nearest with `generateMipmaps = false` at load. The colourway texture gets the same settings, so it samples exactly like the base. The look changes only through the atlas colours. Met.
- **8 (no atlases means today's scene; failures; emissive).** "fetches nothing and sets no `colourways`…" covers no field, an empty list, no loader and no stack keys. There is also a case where no stack piece loaded. "with none loaded, every stack holds exactly the cached materials (identity)" runs the full town on map 09 for no field, no loader and all loads failing. One failing id is dropped with one line, giving "6 of 7". `emissiveMap` is checked to stay null on the clone, and `paintStack` writes only `.map`. Met.
- **9 (only pool ids, only with stack keys, once).** One test checks the exact sorted list of seven URLs, no duplicates, and that nothing matches `_B`, `Emissive`, `Billboard` or `_01_A`, with the manifest also listing all twelve plus two decoys. Another checks that a partial manifest asks only for what it lists. "Once per page" holds because `sharedModels()` is memoised and the gallery loads one texture. Met.
- **10 (gallery colourway=).** `colourwayRequested` is read only on the stack gallery. `chooseColourway` accepts listed ids and refuses `../x`, `05_Z`, `<script>` and unlisted ids, each with one line. `loadGalleryPack` tests show one fetch for `02_A`, and no fetch plus one line for a bad id, an unlisted id, a manifest with none, or no loader. `buildGalleryScene` paints every stack's walls and leaves glass alone, and with no parameter the scene keeps the cached materials. Met.
- **Pick targets.** Stack groups were not pickable before and still aren't. Two raycast tests (on a painted group, and on the town's terrace row) confirm nothing is hit. `paintStack` does not touch userData or the scene graph.
- **CI safety.** Fixtures are three `Mesh`/`MeshStandardMaterial` objects and `new Texture()` built in the test, with a fake `loadTexture`. Nothing reads `assets/private/`. The only file reads are committed `puzzles/*.json`, through `path.join`. No timers, no Windows paths.
- **Disposal.**
  - Town: stack groups are `sharedModel`, so `bundle.dispose()` skips them. The `ColourwayCache` is disposed by the `undo` that `applied.remove()` runs, and `renderer.ts` calls that before `bundle.dispose()`. The cache disposes only its clones and their textures. The test "frees only what it made" checks that the loaded texture and the base map get no dispose event. The loaded colourway textures live with the page-long shared set, as the GLB roots do.
  - Gallery: each scene's cache is `own`ed and freed with the scene. The one loaded texture is freed in the renderer's `dispose` (or at once if it arrives after dispose).
  - Nothing is disposed twice, and I found no leak path.
- **Builder flags.** (1) The stricter `isBaseAtlasName` still meets criterion 7. It is safer than the ticket's prefix rule, which would also have matched `PolygonCity_Texture_Emissive_01`. (2) and (3) Matching by `map.name` and carrying the base on `userData` is reasonable, and the main session confirmed it works in the browser. (4) Skipping silently and printing one summary line fits design 5. (5) Accepting any listed id, including B tones and 01_A, in the gallery is in line with the criterion: "unknown" means not a colourway id or not listed. (6) and (7) are as the design says.

Criterion 11 (browser) and 15 (gate, playtest) belong to the main session. The brief says the gate is green and the browser check showed four wall colours.

## Rule conflicts and risks
- No hard rule is broken: `src/grid/` and `src/night/` are untouched, no Decided rule changes, no new dependency, no locked puzzle touched.
- `colourwayTexture` copies flipY, colorSpace, wrap and channel but not `offset`, `repeat`, `rotation` or `anisotropy`. If a pack map ever used KHR_texture_transform, the colourway would sample differently. The City Pack evidently doesn't (the browser check looked right), so this is not a blocker.
- The fallback base name `"PolygonCity_Texture"` in `paintStack` is a pack name hard-coded in a general function. It only matters for a texture loaded without `userData.colourwayBase`, and both loaders always set it.

## Must fix
none

## Could improve
1. `src/render3d/models3d.ts` `colourwayTexture`: also copy `offset`, `repeat`, `rotation`, `center` and `anisotropy` from the replaced map, so a transformed map would keep its UVs.
2. `src/render3d/models3d.ts` `paintStack`: drop the `"PolygonCity_Texture"` fallback and skip painting when `colourwayBase` is missing, so a pack name doesn't live in a general function.
3. `src/render3d/models3d.ts` and `gallery.ts`: the colourway-loading code (the `..` check, setting `userData.colourwayBase`, the name fallback) is duplicated between `loadColourways` and `loadGalleryPack`. One shared helper would keep the two from drifting.
