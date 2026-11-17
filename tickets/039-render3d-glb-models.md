# 039 · The 3D view loads converted GLB models, falling back to the placeholder shapes

owner: renderer
status: open
branch: `ticket/039-render3d-glb-models`

## Josh's words
> (the request, via the main session) load the converted packs in the 3D view, with a clean fallback to today's shapes.

On serving the converted files (recorded for this ticket):
> "I have confirmed #4 is fine as long as the assets aren't available to the end user and I place the site behind a password"
> "Testers may fetch it"

## Starts after
**Ticket 037 is merged.** `src/render3d/` exists only on `ticket/037-three-view-spike`; this branch is cut from `main` after that merge. It does not need ticket 040: it reads `bounds` (metres, already scaled) and ignores the optional `scale` fields 040 adds. With 040 landed, SIMPLE Town's two stations stop being `scale-suspect` and so start being used (see Mapping).

## Goal
Josh runs `npm run assets:convert` (ticket 038), then `npm run dev` with `?puzzle=09-shrine-circuit&view=3d`, and the poles, lamp posts and city buildings are the converted Synty models, at sensible sizes, textured with crisp (NEAREST) pixels. Wires, the feed, breakers, switch, fuse box, junctions, captions, lamp light and the Relight stay drawn in code exactly as now. On a fresh clone with no `assets/private/` (or any missing or broken file), the view is today's placeholder view, with no error.

## What is loaded, and how
- **At runtime, never bundled.** The loader fetches `${import.meta.env.BASE_URL}assets/private/out/manifest.json`, then each used pack's GLB at the manifest's `glb` path relative to it, with `GLTFLoader` (`three/examples/jsm/loaders/GLTFLoader.js`, part of the existing `three` dependency). The URL is a runtime string: no `import`, no `new URL(..., import.meta.url)`, no `?url`/`?raw`, nothing in `public/`. So Vite's dev server serves the files from the project folder, and `vite build` never sees them.
- **Where it can work.** Dev (`npm run dev`) on Josh's machine; and a deployment behind a password Josh controls, where **Josh copies** `assets/private/out/` to `<site>/assets/private/out/` **himself**. No script, workflow or agent uploads a GLB anywhere. The public GitHub Pages build has no such files, gets 404, and shows placeholders.
- **Fallback, per slot.** No manifest (404, network error, bad JSON, `version` not `ASSET_MANIFEST_VERSION`), or a GLB that fails to load: every slot uses its placeholder, and one `console.info` line says why. A name in the table that is missing from the manifest or from the GLB, or that carries `scale-suspect`: that one choice is skipped; a slot with no usable choice keeps its placeholder. Nothing throws, no unhandled rejection, and play never waits for it.
- **Swap in after load.** `createMapRenderer3d` stays synchronous and builds today's scene; when models resolve, they replace the placeholders in place. The parsed GLBs are cached for the page, so changing maps doesn't refetch. A session's `dispose()` removes its clones and does not dispose the cached geometry or textures.

## Mapping (a small table in `src/render3d/models.ts`)
`MODEL_TABLE: readonly ModelChoice[]`, `ModelChoice = { slot: ModelSlot; pack: string; names: readonly string[] }`, `ModelSlot = "pole" | "lamp" | "building"`. The builder fills it from the real local manifest, which holds two packs: `simple-town` (scale 100) and `apocalypse-power` (a 96-model subset of the POLYGON Apocalypse pack, scale 1, no `scale-suspect`). SIMPLE Town has no power poles and one street lamp, so:
- `pole`: from `apocalypse-power`, `SM_Prop_Powerpole_Single_01` (6.3 m, 112 tris) and/or `SM_Prop_Powerpole_01` (6.3 m, 621 tris, with a cross-arm). Pole models with wires baked in (`_Preset_`, `_Lines_` in the name) are **not** used: wires stay drawn in code.
- `lamp`: `SM_Prop_LightPole_01` or `SM_Prop_LightPole_Base_04` from `apocalypse-power`, or SIMPLE Town's street lamp.
- `building`: from either pack, e.g. `SM_Bld_Cafe_01`, `SM_Bld_Apartment_01`, `SM_Bld_Church_01` (`apocalypse-power`) and SIMPLE Town's `Building_*`.

The builder names each pick and its pack in its report, and Josh can edit the table. Model names are not licensed content and may be committed.

| slot | replaces | fit |
|---|---|---|
| `pole` | each intermediate pole and its cross-arm | uniform scale so its height is `POLE_HEIGHT` (wires attach there) |
| `lamp` | a lamp's post only; the head, light, pool, halo, flare, ring and star stay | uniform scale so its height is `POLE_HEIGHT` |
| `building` | the footprint and city blocks (`kind` `"building"` and `"city"`); not the lamps' places, which warm when lit | `bounds` × `WORLD_PER_METRE`, shrunk uniformly (never grown) to fit inside the block's `w` × `d`; picked per block by `stableHash` of its position |

`WORLD_PER_METRE` = 0.18 (a 1.6-unit pole is about 9 m). The fit uses the manifest's metre bounds, which carry the pack's `pack.json` scale (`simple-town` is converted at 100, `apocalypse-power` at 1), so a correctly converted pack lands at the right size whatever its source units. Every texture in a loaded GLB gets `magFilter` and `minFilter` = `NearestFilter`. Models never take part in picking (raycast off); the existing pick targets are unchanged.

## Acceptance criteria

**Pure, headless** (Vitest, `src/render3d/models.test.ts`, no WebGL, no fetch, no GLB: manifests are hand-written fixtures, the GLB is a fake three `Group` built from boxes named like manifest entries)
- [ ] **Plan.** `planModels(manifest, table)` returns, per slot, the usable entries in table order. Covered: a name absent from the manifest, a `scale-suspect` entry, a pack absent from the manifest, and a slot with nothing usable (null: placeholder).
- [ ] **Scale.** `modelScale(entry, slot, block?)`: a 9 m pole and a 4 m pole both come out `POLE_HEIGHT` tall; a 10 × 10 × 8 m building gives `10 × WORLD_PER_METRE` wide in a lot that fits it, and is shrunk to the lot (aspect kept) in one that doesn't; never grown.
- [ ] **Bad manifests fall back.** `loadModels({ fetchJson, loadGlb })` with injected fakes resolves to the all-placeholder result (and never rejects) for: fetch rejects, 404, non-JSON, wrong `version`, a GLB load that rejects, a GLB missing a planned root name (that choice only is dropped).
- [ ] **Applied to the scene.** With a fake model set, `buildScene` plus `applyModels` puts a clone at every intermediate pole and every non-place block, keeps every lamp's head, light, pool and halo, sets every map texture to `NearestFilter`, and the 037 picker tests pass unchanged on that scene (models are not hit).
- [ ] **Nothing private is bundled (static).** A test reads every `src/**/*.ts` and fails if `assets/private` appears in an `import`, `new URL(`, `?url` or `?raw` form; and checks `public/` holds no `.glb`, `.fbx`, image or `manifest.json` from the pipeline.
- [ ] **Pure rules held.** `models.ts` imports only from `src/core/` and `./layout` (and `three` types, if needed); nothing from `src/grid/`, `src/play/`, `src/ui/`.

**In the browser** (Josh checks)
- [ ] With `assets/private/out/` from a real conversion of `simple-town` and `apocalypse-power`: `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`. The poles, lamp posts and buildings are the models, upright, at plausible relative sizes, textures crisp, no rainbow stripes. Wires still meet the pole tops. The three-move solve, prompts, captions, brownout flicker and Relight look and work as before.
- [ ] Rename `assets/private/out` (or open a fresh clone) and reload: the view is the placeholder view as on `main`, the console shows one info line and no error.
- [ ] Switching maps in 3D keeps the models without a second network fetch of the GLB.

**Nothing leaks, nothing else moves** (the main session checks)
- [ ] With a real GLB present in `assets/private/out/`, `npm run build`, then: `dist/` contains no `.glb`, `.fbx`, no `manifest.json` and no path containing `private`.
- [ ] `git ls-files assets/private` is empty. No GLB, FBX or texture is committed.
- [ ] `npm run gate` green with the test count grown; `npm run playtest` green with no snapshot change; `git diff main -- src/render/ src/play/ src/ui/ src/grid/ src/core/ tests/ puzzles/` empty.

## Files
- `src/render3d/`: new `models.ts` (pure table, plan, scale), `models3d.ts` (fetch, `GLTFLoader`, cache, NEAREST, `applyModels`), their tests and fixtures; edits to `scene.ts` and `renderer.ts` to apply models after load. Nothing else.
- Out of scope: `src/core/` (no type needed; ask for a re-cut if one is), `src/main.ts`, `vite.config.ts`, `index.html`, `public/`, `tools/`, `tests/`, the password gate and any deployment, the node objects (feed, breakers, switch, fuse box, junctions) and the lamps' places, street props, wires (they stay drawn in code), instancing or optimising models.

## Interfaces
- **No new dependency.** `GLTFLoader` ships inside `three` (approved in 037).
- **No `src/core/` change.** Reads `AssetManifest` / `AssetEntry` from `src/core/assets.ts` as they are; the optional `scale` fields (ticket 040) are ignored.

## Open questions for Josh (defaults apply if you just approve)
1. **Fit rules.** Default: poles and lamp posts fit to the wire height; buildings at true metres × 0.18, shrunk to their lot. Alternative: everything at true metres (poles then won't meet the wires).
2. **No props.** The 3D view draws no props today (only poles, lamps, node objects, blocks and places). Default: none in this ticket. Street props (bins, hydrants, benches on free lots) would be a follow-up.
3. **Node objects stay code-drawn** (their levers and drums show state). Default: yes.
4. **Ticket 038's open question 1 (licence, web build) is closed** by your words above. The loader doesn't care where it runs; the gate and the copy are yours.
5. **Decided rules.** None touched; visual only. No `rules-coverage.md` change.
