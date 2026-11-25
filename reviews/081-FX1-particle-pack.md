ticket: 081-FX1-particle-pack
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`npm run assets:game` should also copy the four `FX_TEXTURES` PNGs into `out/game/fx/` and list them in the game manifest's `fx`. It should also cut the two `FX_MESHES` keys into `particle-fx-pack.glb` when the full manifest holds them. A missing texture or mesh gets one line and is skipped, and the models are still cut (exit 0). The particle pack is converted on Josh's machine and nothing is committed.

## Does the branch do it?
The builder's work is one commit, 773dc4d, touching `tools/assets/game.ts`, `tools/assets/game.test.ts` and `tools/blender/README.md`. The rest of the PR's diff against `origin/main` is the architect's cut and docs from the goal branch (`src/core/fx.ts`, `AssetManifest.fx?`, the ticket, earlier reviews, the handoff).

1. **The copy: met.** In `runGame`, each `FX_TEXTURES` id is walked in key order. Each file is copied from `in/particle-fx-pack/Source Files/Textures/` into `tmp/fx/` and pushed onto `moves`. That is the same temp-then-move step the GLBs use, and a `fail()` earlier in the run leaves the old pack whole. `fx` gets `{ id, image: "fx/<file>" }`. Test "copies the four particle PNGs under out/game/fx/ ... in FX_TEXTURES order" seeds the files in reverse order. It checks each copy's contents and that `fx` equals the four ids in `FX_TEXTURES` order. It would fail on a wrong order, a wrong path or a missing copy.
2. **Missing textures: met.** A missing file goes into `fxMissing`, and one line names those files and the folder looked in. `buildGameManifest` leaves `fx` out when the list is empty. Test "still writes the game pack when textures are missing" gives 2 of 4 files and checks:
   - exit 0;
   - `fx` ids are `sparkle` and `softSpot`;
   - exactly one line, naming both missing files and `FX_DIR`;
   - `town.glb` is still written.

   The "none present, `fx` absent" case is not tested. The code is plain (`a.fx.length > 0`), and the ticket asked for one case.
3. **Nothing else changes: met.** No existing `it(` case was rewritten (0 of the 1 allowed). The `setup` helper only gained optional parameters, so with no FX files the existing whole-manifest comparisons are unchanged, and all 8 cases pass. The page keys go through `planGame` as before, and FX keys are only added after them.
4. **README: met.** There is one new paragraph in *Game pack*. It names `fx/`, its source folder, the mesh cut and the conversion command, and says the files are git-ignored and never committed, bundled or shipped.
5. **The particle meshes: met.**
   - Each `FX_MESHES` key is checked on its own with `planGame(full, [key])`. A clean key joins `keys`, and so the plan, the include file and `game.keys`. A missing or scale-suspect key goes into `fxSkipped`, and one line names it and says `run npm run assets:convert particle-fx-pack`.
   - `deps.keys()` is not edited, so a missing FX mesh can no longer cause the `plan.problems` failure.
   - Test "cuts a particle mesh the full manifest holds ..." uses a fixture with the spark but not the shard. It checks exit 0, the spark in `game.keys` and in the cut pack's assets (only it), the shard absent, and one line naming the shard and the convert command.
6. **The conversion: done on Josh's machine (checked, not just reported).**
   - `D:\rest-prototype-main\assets\private\in\particle-fx-pack\pack.json` is `{"textures": "Source Files/Textures", "scale": 1}`.
   - The full manifest at `D:\rest-prototype-main\assets\private\out\manifest.json` holds `particle-fx-pack` with 57 assets and 1 failure. `FX_Spark_01` has bounds z from -0.41 to 0.41, about 82 cm long and 11 cm high. `FX_Shard_Rock_Small_01` is about 8 x 15 x 8 cm. Both are at scale 1, and neither has `scale-suspect`; both carry `missing-texture`, which the ticket expects.
   - Both root names match `FX_MESHES`. The builder's reply should still give these numbers and name the one failed source; I did not look at which source it is.
7. **The run:** this is the main session's, after merge. Not judged.

The 3 new cases are within the ticket's budget of 4 and the cap of 15 per pull request. The file runs in about 120 ms (`npx vitest run --maxWorkers=2 tools/assets/game.test.ts`: 8 passed).

## Rule conflicts and risks
- None of the hard rules apply: there is no `src/grid/` or `src/night/` change, and no new dependency. The builder did not edit `src/`, `convert.ts`, `convert_fbx.py`, `package.json` or `.gitignore`.
- PR #61 is into `main`, but the branch was cut from `ticket/081-puzzles-on-the-city`. So the PR also carries the architect's FX cut (`src/core/fx.ts`, `src/core/assets.ts`, `src/core/index.ts`, the ticket) and the goal branch's docs and reviews. Those belong to the cut, not the builder, and the ticket says they are committed with it. The main session should know that merging #61 lands them too.
- Suppose a machine's full manifest lists `particle-fx-pack` but `assets/private/in/particle-fx-pack/` is not there (an `out/` copied without its `in/`). Then `readPackSettings` fails the whole run, which goes against the spirit of "a missing FX mesh never fails the cut". This may occur, not checked. On `D:\rest-main-play` the `in/` junction reaches the pack, so criterion 7's run is not affected.

## Must fix
none

## Could improve
1. `tools/assets/game.ts`: when checking whether an FX key is usable, also require that its pack folder exists under `in/` (`deps.exists(join(L.inRoot, FX_SOURCE_PACK))`). Then the case in the last risk above is skipped with the "particle meshes left out" line instead of failing the run.
2. The branch is named `ticket/081fx1-particle-pack`, but the ticket says `ticket/081fx1-fx-textures`. The architect could bring the ticket line in line with the real branch name.
