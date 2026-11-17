ticket: 039-render3d-glb-models
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
The 3D view fetches the converted Synty GLBs at runtime from `assets/private/out/` (never imported or bundled). It swaps them in for the pole, lamp-post and building placeholders at fitted sizes with NEAREST textures. On any missing or broken file it falls back, slot by slot, to today's placeholders without an error. Reviewed as `git diff 466ac53..162d609` (commit 162d609, `src/render3d/` only).

## Does the branch do it?
- **Plan.** `planModels` in `src/render3d/models.ts` walks the table in order and skips a pack absent from the manifest, a name absent from the pack, a `scale-suspect` entry and degenerate bounds. A slot with nothing usable stays `null`. Tests in `models.test.ts > planModels` cover all four cases in the criterion ("Gone", "Odd" scale-suspect, the pack-absent manifest, the all-suspect lamp, the empty manifest). Met.
- **Scale.** `modelScale` gives `POLE_HEIGHT / h` for poles and lamps. For buildings it gives `WORLD_PER_METRE × min(1, lot/size)`, and a quarter turn is allowed when it gives the larger fit. The tests cover the 9 m and 4 m poles reaching `POLE_HEIGHT`, the 10×10×8 m building at true size in a 3×3 lot and in a 50×50 lot (never grown), and shrinking to a 0.9×1.8 lot with aspect kept. Met. The quarter turn (`buildingYaw`) goes slightly beyond the table's "shrunk to fit". It is tested and does not break a rule.
- **Bad manifests fall back.** `loadModels` takes `fetchJson`/`loadGlb` as injected dependencies, has an outer try/catch and never rejects. The `it.each` table covers fetch rejects, 404, non-JSON, JSON of another shape, wrong version, a malformed pack list and every GLB rejecting; each resolves to all-null. Separate tests cover one failed GLB (only that pack's choices dropped), a missing root (only that choice dropped) and a synchronous throw. Met.
- **Applied to the scene.** `applyModels` in `models3d.ts` hides the instanced pole and arm meshes, each lamp's `post` and the block mesh, and adds wrappers to `slots.models` or to the lamp's group. `scene.ts` only exposes `slots` and leaves the scene unchanged until models are applied. The tests in `describe("applyModels")` check:
  - one clone per pole spot plus one per block, with no `place` kind in the list;
  - pole height reaches `POLE_HEIGHT`, and no building is larger than its lot;
  - lamp head, light, pool, halo, flare and star are all kept (child counts per type are unchanged apart from the one added clone);
  - every texture on the clones is NEAREST;
  - `remove()` restores the placeholders;
  - `dispose()` does not dispose the cached geometry, materials or maps, and a second map reuses the set;
  - every node and wire is still picked with models in place, and the clone meshes have a no-op `raycast`.

  Met.
- **Nothing private is bundled (static).** The "nothing private is bundled" tests scan every `src/**/*.ts` line that mentions `assets/private` for `import`, `from`, `new URL(`, `?url`, `?raw`, `require(` and `import.meta.glob`, and scan `public/` for GLB, FBX, image and `manifest.json` files. My own check agrees: `git grep assets/private -- src` finds only comments and the template string in `defaultDir()`. Met.
- **Pure rules held.** `models.ts` imports only `../core` and `./layout`, and a test enforces this. `models3d.ts` imports `three`, `GLTFLoader` (part of the existing `three` dependency), `../core`, `./models`, `./scene` and `stableHash` from `../render/city`. The ticket names `stableHash` itself, and `src/render3d/` already imports from `src/render/` (layout, camera, captions). Met.
- **Browser criteria (Josh).** I can't verify these here. The code path exists:
  - `createMapRenderer3d` stays synchronous and applies models in `.then` behind a `disposed` guard.
  - `sharedModels()` memoises the promise per page, so changing maps does not fetch again, and a failed load is cached as all-placeholder too.
  - The renderer has a `.catch` that logs with `console.info`.
- **Main-session criteria.** `git ls-files assets/private` is empty on the branch. `git diff 466ac53 162d609` is empty for `src/render/`, `src/play/`, `src/ui/`, `src/grid/`, `src/core/`, `tests/`, `puzzles/`, `src/main.ts`, `vite.config.ts`, `index.html`, `public/` and `package.json`. On the branch, `npm run typecheck` is clean and `npm test` passes: 77 files, 1372 tests. I did not run `npm run build` against a real GLB; that check is listed for the main session.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, so their purity is untouched. No new dependency, no Decided rule touched, and no file outside `src/render3d/`.
- Risk (visual only): the clone is placed at its own origin. The manifest bounds are used for scale but not to ground or centre the model. A model whose pivot is not at its base centre will float, sink, or stand off-centre in (and possibly spill out of) its lot. Josh's browser check will show this. See could-improve 1.
- Risk: `m.root.clone(true)` carries the root node's local transform from the pack scene. If the converter leaves a root with a non-zero position, rotation or scale, every clone is offset by it. See could-improve 2.

## Must fix
none

## Could improve
1. `src/render3d/models3d.ts` `place()`: offset the inner clone by `-(centre x, min y, centre z)` of `entry.bounds` (scaled by the wrapper), so every model stands on the ground and is centred on its spot or lot whatever its pivot. Add a test with an off-centre fixture box.
2. Same function: reset the clone's own `position`/`rotation`/`scale` (or bake the root's local transform into the fit) so a GLB root that is not at the origin does not displace every instance. This depends on what the converter writes; if roots are guaranteed to be at the origin, a comment saying so would do.
3. `sharedModels()` (the once-per-page fetch behind "switching maps keeps the models without a second fetch") has no unit test. A small test with injectable loaders, or a check that it returns the same promise twice, would cover that browser criterion headlessly.
4. The fallback tests allow up to two info lines (`toBeLessThanOrEqual(2)`), while the ticket says "one `console.info` line says why". With two packs failing, the loader logs one line per GLB. Either collapse to one line when every GLB fails, or note that the second line is intended.
5. Minor: in `MODEL_TABLE`, the building names line is missing a space after `"Building_House_012",`.
