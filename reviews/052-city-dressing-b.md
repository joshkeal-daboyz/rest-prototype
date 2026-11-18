ticket: 052-city-dressing-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B draws section A's pure placements (design item 5). The dressing keys load from the City Pack GLB into an optional `ModelSet.dress`. They are drawn as one `InstancedMesh` per key and sub-mesh, in the town and in the stack gallery with `&dress=1`. Nothing raycasts, nothing glows, pick targets and the 041 B ray test are unchanged, and a checkout without the pack is exactly as before. Criteria 5 to 7 are Vitest. Criterion 8 (screenshots) belongs to the main session.

## Does the branch do it?
Scope: the diff against `goal/city-style` (aae3816) touches four files, all on the ticket's list for B.
- `models3d.ts`: the `dress` slot, `dressInput`, `dressMatrix`, `dressSites`, `dressPlacements`, `dressGroup`, and the step in `applyModels`.
- `models.ts`: `planDressPieces` and a shared `planPieces` helper only.
- `gallery.ts`: `dressRequested` and `dress` on the stack-gallery layout and scene.
- New `dressdraw.test.ts`.

I ran `src/render3d/dressdraw.test.ts` alone: 20 passed. For everything else I relied on the main session's gate.

- **Criterion 5 (loading): met.**
  - "loads every key the manifest and its GLB have…" checks two things: `SET.dress` follows `dressKeys()` order, and the flat `Shop_02_Glass` (depth 0) loads.
  - "leaves the slot absent… and null when… no City Pack" covers the slot being absent when not asked for, null with no `city-pack`, and `NO_MODELS`.
  - "drops only the missing key" covers both cases, a key missing from the manifest and a node missing from the GLB. In each, exactly one key is gone, and 64 is still dressed with the other signs.
  - In `loadModels`, dressing keys go through the same `exclude` filter and GLB set as the stack keys.
- **Criterion 6 (transforms, draw calls, no ray, no emission): met.**
  - Transforms: on 01, 09 and 64, every instance matrix is checked element by element against `dressMatrix(frame, piece)` (float32-rounded, < 1e-6). It is also checked against a hand-worked position, yaw and scale. The second sub-mesh of `TWO` is checked with its offset in its root, so `meshParts`' local matrix is exercised.
  - Draw calls: `dressCalls` equals the number of `InstancedMesh`es, and is at most `DRESS_DRAW_CALLS_MAX` on 64.
  - No ray: the group and every `InstancedMesh` have a no-op `raycast`, and a real `Raycaster` from above hits none. The gallery also runs `noRay(scene)`.
  - No emission: every dressing material has `emissive` 0 and no `emissiveMap`. The fixture's `GLOWING` sign is swapped for a dark clone, and the cached `GLOWING` stays 0xffffff. `plain()` clones only when `emissive` is non-zero or an `emissiveMap` is set, and maps over material arrays.
- **Criterion 7 (ray test, pick targets): met.**
  - Ray test: "the dressing in the 041 B occlusion test" runs on 09 and 64. Every terrace stack is a box at its fixture height and every dressing piece a box of its turned size. Every wire middle and node pick point is clear from the rig camera.
  - Pick targets: on 01, 09 and 64, `pickKind|pickId|matrixWorld` is identical, in order, between stacks-only and stacks-plus-dressing. No dressing object carries a `pickKind`.
- **Criterion 8:** belongs to the main session. The brief says the main session already saw fire escapes, roof AC, a roof sign, awnings and a HOTEL blade on 64 through the street camera.
- **Criteria 13 to 15:** I can't tell 13 from the branch. 14 is the main session's. On 15, no kept test is edited: the diff adds a test file only.

Checks the caller asked for:
- **Fresh checkout / CI.** `dressInput` returns null when `set.dress` is null, undefined or empty. In that case `applyModels` adds no group, `dress` is `[]` and `dressCalls` is 0. This is tested against `NO_MODELS`, a set without a City Pack, and a set with dressing not asked for. `sharedModels` asks for `dressKeys()`, but with no `city-pack` in the manifest `planDressPieces` returns null and no GLB is added.
- **Determinism.** Placement is the pure `dressTown`. `dressPlacements` run twice gives deep-equal results, and the gallery layout built twice is deep-equal.
- **Caps carried along each run.** `dressSites` gives every terrace block its terrace run id and every stacked lot `lots:<street>:<side>`. It numbers blocks in order and marks exactly one lowest per run (tested). `dressTown` keys its run state by `run.id` in a map, so a run's caps hold even when its sites are not contiguous. The novelty-sign cap of one per run is checked town-wide on 64.
- **Cached roots untouched.**
  - Geometry is shared, never disposed: `InstancedMesh.dispose()` in three 0.187 frees only `instanceMatrix`, `instanceColor` and `morphTexture`.
  - Materials are the root's own unless emissive (clone) or glass (new). Only those are in `owned`, and `Material.dispose` does not dispose textures.
  - A test listens on `BOX` and `PLAIN` for `dispose` and sees none after `remove()`, while the owned glass and clone are freed.
- **Flag 6 (no leak).** The group is `sharedModel`, so `bundle.dispose()` skips it on purpose. `applyModels` pushes `parent.remove` and then `drawn.dispose()` onto `undo`. `remove()` runs them in reverse, and `renderer.ts` always calls `applied?.remove()` before `bundle.dispose()`. In the gallery, `own(drawn)` puts it on the scene's `owned` list, which `dispose()` frees. Nothing leaks.
- **Frames.** `slots.models` is a bare `Object3D` at the scene origin (`scene.ts` 640). A sibling group in scene space therefore lines up with the stack groups. The `dressSites` frames use the same front-centre formulas as `applyModels` for both lot stacks and terrace blocks.
- **CI-safety.**
  - Fixtures: every size is typed in, and the fake GLB is built from those fixtures.
  - Top-level reads: the module-level `await setOf(...)` uses in-memory fixtures only. The only file read is `puzzles/<id>.json` via `join`, inside `it` bodies.
  - No timers, no Windows paths, no `assets/private` read anywhere in the file.
  - Pack files: `git ls-files assets/private` is empty on the branch.
- **Purity.** No `src/grid/` or `src/night/` change. New imports are three (allowed in `src/render3d/`) and `./dressing`. No new dependency.

Builder's flags:
1. **One kerb value for every site: accepted.** Ordinary lots and terrace blocks all front a road at `PAVE_W + SETBACK`. A stacked lot's footprint sits on the lot front (`models.ts` around 421). `town.ts` 1225 confirms that only places face service runs. `DressSite.kerbM` is there for when that changes.
2. **"+z" dropped from `dressInput.fronts`: latent only.** Today it is equivalent, because `dressing.ts` `yawOf` falls back to `DRESS_FRONTS[key] ?? "+z"` and `DRESS_FRONTS` is empty. See could-improve 1.
3. **Glass material: fine for B.** It is dark, 50% see-through, double-sided, with `depthWrite: false` and no emission. Its look is for Josh to judge in criterion 8.
4. **`planDressPieces`: justified, and within "only to plan the dressing keys".** It skips `scale-suspect` and requires width and height above zero.
5. **Draw-call cap: correct against the fixture.** It is tested to keep the keys with the most instances. Not measured on the real pack (could-improve 2).
6. **No leak:** see above.
7. **`&dress=1` only with the stack gallery:** tested, as the ticket asks.
8. **Screenshots:** the main session's.

## Rule conflicts and risks
- None found against the hard rules or the ticket's must-not-touch list.
- Risk: with the real pack, keys with several sub-meshes could push the total past 120. The cap then drops the keys with the fewest instances first. Those are exactly the one-per-block or one-per-run pieces: water tower, roof access, billboard, novelty sign and ATM. "One big one on some roofs" could silently vanish, and nobody has counted the real number.
- `AppliedModels.dress` lists every placement, including those of keys the cap dropped. A future consumer, such as 052 C's keep-outs or a debug overlay, would see pieces that are not drawn.

## Must fix
none

## Could improve
1. Make the town and the gallery read fronts the same way. `dressInput` could carry the effective `FrontTable` lines for the dressing keys instead of rebuilding them from `LoadedModel.front`. Then an explicit "+z" in a saved calibration still beats a future `DRESS_FRONTS` entry, as it already does in the gallery, which passes the full table.
2. Add a manifest-gated `it` (skips when `assets/private/out/manifest.json` is absent) that counts sub-meshes per dressing key. Alternatively, log `dressCalls` against `DRESS_DRAW_CALLS_MAX` once in dev. Either way, someone learns whether the real pack hits the cap. If it does, rank the large roof props ahead of instance count, so the cap drops the commonest small props, not the rare showpieces.
3. Have `applyModels` return in `dress` only the placements it actually drew, or add a `drawnKeys` set.
4. In the occlusion test, add the stacks standing on ordinary lots (`applied.buildings` with `stack`) as solids too, not only the terrace blocks. Criterion 7 says "stacks and their dressing". The lot stacks' dressing is in, but the lot stacks themselves are not.
5. Small check: assert `GLOWING` sees no `dispose` in the `remove()` test, as `PLAIN` already does.
