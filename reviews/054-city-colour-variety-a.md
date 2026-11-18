ticket: 054-city-colour-variety-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A: a committed table of file names for the City Pack's 12 colourway atlases, plus a converter step (`--colourways [pack...]`, and after a full convert of a pack with a table) that copies those PNGs into `out/<pack>/colourways/` without Blender, checks each one's IHDR size against the base atlas, and writes only that pack's `colourways` field into `manifest.json`. A later convert of other packs must keep that field.

## Does the branch do it?
Reviewed commit f566408 against `goal/city-style`. The diff touches only `tools/assets/colourways.ts`, `colourways.test.ts`, `convert.ts`, `convert.test.ts`, `manifest.ts` and `manifest.test.ts`. Nothing changed in `src/`, `package.json` or `tools/blender/`, and `git ls-files assets/private` is empty.

1. **planColourways, 12 entries.** Met. `COLOURWAY_SOURCES["city-pack"]` is built from series 01 to 04 times tones A to C. `colourways.test.ts` "the city-pack table gives 12 entries..." checks the 12 ids in order, `base: "PolygonCity_Texture"`, the exact entry for `02_A` (`city-pack/colourways/PolygonCity_Texture_02_A.png`), and that no path contains a backslash. The table only gets this far if it is sound: a file that doesn't extend the base stem, or a repeated id, throws.
2. **`--colourways city-pack` on injected deps.** Met. `convert()` returns `runColourways` before `resolveBlender`, so Blender is never looked for. The test checks `s.calls` equals `[]` (no `--version` either), 12 copies into `assets/private/`, one write (the manifest), ids and one full entry read from in-test 24-byte headers, the other pack deep-equal (including an unknown `note` field), and the city-pack entry minus `colourways` deep-equal. Running the step twice gives the same manifest text.
3. **Failures.** Met. The test "a missing file, a non-PNG and a 512 x 512 file..." expects exactly 3 stderr lines. Each line names its file, and the size line gives both sizes. The run still exits 0, writes 9 entries and makes 9 copies, so a rejected file is never copied. "a missing manifest exits 1 and writes and copies nothing" also checks that no folder was created (`mkdirs` empty). Each line starts with `warning:` (from `applyColourways`).
4. **Full converts.** Met. In "a full convert of another pack keeps city-pack's colourways", `readColourways` reads the field back inside `readPriorPacks`, and `buildManifest`'s `keep` carries the pack object over whole. "a full convert of city-pack runs the colourway step after its GLB" checks the order of the Blender call and the 12 copies. `manifest.test.ts` covers the same two cases at the `readPriorPacks`/`buildManifest` level.
5. **The real run.** Believable from the code. `realDeps.copyFile` is `copyFileSync`, so the copy is byte for byte. The manifest is parsed, `entry["colourways"]` is set (the new key goes last), and the file is written back with `JSON.stringify(raw, null, 2) + "\n"`. That is the same format `runPacks` writes, so removing the field gives back the `.bak-054` text exactly, which matches what the builder reported. I did not check the files on disk; that is for the main session.

**Manifest compatibility.** The field is optional on `AssetPack` (`src/core/assets.ts`, written by the architect, not touched here). `isManifest` in `src/render3d/models.ts` only checks `version === 1` and that `packs` is an array, so the added field doesn't affect it. `readPriorPacks` drops a malformed field (not an array, a non-object entry, size 0, `../` or `C:/` paths, duplicate ids, missing keys) and keeps the pack. `manifest.test.ts` "a malformed colourways field is dropped (the pack is kept)" tests exactly that.

**CI safety.** Every PNG is a 24-byte header built in the test, and every file system is the in-memory `setup()` fake. Paths are built with `path.join` or forward-slash strings. No new test reads `assets/private/`, uses a timer, or does anything at `describe` level.

**The builder's choices.**
- A missing base atlas exits 1 for `--colourways` but only warns in a full convert. I agree. When you ask only for colourways, an unusable base means nothing could be done, so 1 is the honest exit code. In a full convert the GLB has already succeeded, and an optional step shouldn't turn that into a failure. A test covers each side.
- When no file passes, the entry is left unchanged; a partial result replaces the field. Acceptable. When nothing passes, the earlier copies are still in `out/`, so the old list is still true about what is on disk. A partial result lists exactly what this run checked. In a full convert of city-pack, `buildManifest` has already rebuilt the entry without the field, so there "no file passes" means "no field". That is consistent. The one oddity is in Could improve 1.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, no Decided rule touched, no file outside A's list.
- **How the real run was done.** The ticket's default run (Sections, A, and risk 5) says nothing is written into the main worktree, and criterion 5 says the main worktree's files are unchanged, judged by git status and timestamps. The builder's report says the 12 PNGs and the rewritten `manifest.json` went into the main checkout's `assets/private/out/` through a junction. Those files are gitignored and the code is not at fault, but that is a departure from the ticket's default run. The main session should tell Josh and decide whether criterion 5 counts as met. The backup `manifest.json.bak-054` makes it reversible.
- A re-convert of city-pack while `in/` lacks the colourway files drops the field, even though copies from an earlier run are still in `out/`. That matches the "replaces its entry" test and is harmless: the renderer just shows the base.

## Must fix
none

## Could improve
1. `convert.ts` `applyColourways`: when no file passes, the stdout line says the entry is unchanged, but it doesn't say whether earlier colourways are still listed. Adding "(N kept from an earlier run)" when the field exists would make a stale list visible.
2. `convert.ts` `runPacks`: `applyColourways(deps, withTable, false)` throws away its return value. It can only be non-zero for a manifest that was just written, so this is fine today. A one-line comment saying so would stop a later reader from wondering.
3. `colourways.test.ts` and `convert.test.ts` each build the same 24-byte PNG header. A shared test helper would remove the copy; optional.
