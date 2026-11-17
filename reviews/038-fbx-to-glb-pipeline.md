ticket: 038-fbx-to-glb-pipeline
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A local pipeline that is never committed. `npm run assets:convert` runs `tools/blender/convert_fbx.py` in headless Blender once per pack and writes one GLB per pack, plus `assets/private/out/manifest.json`. Each FBX becomes one root node named exactly its file stem, and the manifest names that node. Amendment A finds each model's own texture in the pack and embeds each image once. Amendment B adds `textureAliases`, a stem-plus-digits OBJ hint and a scale-suspect report. Round 2 checks the round-1 must-fix: a GLB root came out as `grass_square_mesh.002`.

## Does the branch do it?
Round 2 is at 1e68fd3. It touches only `tools/blender/convert_fbx.py` and `tools/assets/convert.test.ts`. On the branch, `npm run typecheck` is clean and `npx vitest run tools/assets` passes 3 files and 71 tests, one more than round 1. The main session reports the full gate green at 1238.

**Round-1 must-fix 1 (root named exactly its stem): resolved.**
- `import_one` now calls `bpy.data.objects.get(stem)` before it creates the root. If an object from an earlier file already holds the stem, it is renamed to `stem + "_child"`. This is the real-pack case: an earlier file's mesh named `X` was renamed `X_mesh`, and a later file is called `X_mesh`. The clash can only be a child mesh, for two reasons. `convert()` rejects a second file with the same stem before importing it, so an earlier root is never the object renamed. And the current file's own meshes were already moved off the stem a few lines above.
- If `root.name != stem` after creation, the root is removed and a `RuntimeError` naming both names is raised. The per-file handler records it as a failure, so a future clash is loud rather than a silent mismatch.
- After export, `glb_root_names` reads the GLB's JSON chunk (magic, chunk type, `scenes[scene].nodes`), and `missing_root_names` lists every manifest name that no root carries. The script then exits 1, and the wrapper turns any non-zero exit into an error before it writes the manifest (`convert.ts` around line 333). The check is sound because it reads the exported file, so it would also catch a rename by the exporter, not only Blender's `.NNN`. `check_helpers()` asserts the `.002` case on plain data. It is a set check, so an extra root that is in no manifest entry would pass. That is harmless, because the loader reads by manifest names.
- `build_selftest` adds a clash pair: `clash_holder.fbx` (its mesh is called `clash_stem`) and `clash_stem.fbx`. The selftest goes through the same `convert()`, so the post-export check covers it.
- I checked the private output in this worktree myself with a Node one-liner over `simple-town.glb` and `manifest.json`. It has 173 roots and 173 manifest names, none missing, none extra, and no `.NNN` suffixes. The only renamed child is `grass_square_mesh_child`. The GLB still holds 23 images. This agrees with the builder's 173/173.

**Earlier criteria.** This commit doesn't touch the wrapper criteria from round 1 or Amendments A and B, and their tests still pass. `git diff main...` lists the same files as round 1, plus the playtest and review files.

**Test realism.** The new Vitest case asserts on the Python source text: regexes on the rename, the raise and the call to the check. It shows the guard is present, not that it works. The behaviour is shown by `check_helpers()`, the selftest clash pair and the GLB comparison above. The other Python-side tests use the same pattern, and that is acceptable for a tool that needs Blender.

**Not verified by me** (I didn't run Blender):
1. The builder's `selftest ok` on Blender 5.3 with the new clash pair.
2. The builder's atlas-mode re-run on a 2-FBX temp pack. Nothing committed exercises atlas mode, and I had no output from that run to read.
3. Josh's checks: the GLB opened in a glTF viewer, and the selftest GLB upright at its base.
4. Still open from round 1: whether the baked `matrix_world` survives the deletion of non-mesh parents (could-improve 1), and so whether the two stations' 100x size is real or comes from this.

## Rule conflicts and risks
- No hard-rule break. 1e68fd3 touches only `tools/`. Nothing under `src/grid/`, `src/night/`, `puzzles/` or `tests/` changed, and there is no new dependency. `git ls-files assets/private` is still empty.
- When the post-export root check fails, the new GLB has already replaced the old one in `assets/private/out`, but the wrapper does not rewrite the manifest. The old manifest entry and the new GLB can then disagree until the next good run. This is local and loud (exit 1, error printed), so it is not a blocker.
- Carried from round 1: `Building_PetrolStation` and `Building_PoliceStation` come out about 100x too large. A per-model scale would need a new ticket. `wire_image` points every `TEX_IMAGE` node at the base colour, which is a risk for packs with normal maps.

## Must fix
none

## Could improve
1. (Open since round 1.) Snapshot `matrix_world` for every mesh right after `view_layer.update()`, before the non-mesh objects are deleted, and bake from the snapshot. If the station sizes change after this, the 100x came from this bug.
2. (Open since round 1.) Set `o.matrix_parent_inverse = Matrix.Identity(4)` where `o.parent = root` is set.
3. (Open since round 1.) Give the selftest pole a parent empty with a rotation and a 0.01 scale, so `selftest ok` exercises the transform bake. Add an atlas-mode selftest pass, so the atlas branch is covered by something repeatable and not only by a one-off temp pack.
4. (Open since round 1.) `wire_image`: repoint only the image nodes that used the same original image as the base-colour node, not every `TEX_IMAGE` node.
5. (Open since round 1.) The kept-manifest merge doesn't check that the kept pack's GLB exists.
6. (Open since round 1.) Add a README line saying atlas mode uses `Closest` (a NEAREST sampler).
7. (New, small.) Export to a temporary path and move the GLB into `out/` only after the root check passes, so a failed check never leaves a GLB that disagrees with the manifest.
