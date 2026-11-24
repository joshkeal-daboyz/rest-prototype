ticket: 082-B-game-pack-tool
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`npm run assets:game` re-converts each used source pack from its FBX with Blender, using the pack's own `pack.json` settings plus an include file. It writes `assets/private/out/game/`: one GLB per used pack, a game manifest (`game: { keys, from }`) and the used colourway images. It refuses missing or scale-suspect keys and any model that differs after the cut, and it never writes the full packs. No new dependency, fakes only in tests, at most 7 cases.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/082b-game-pack-tool` (worktree D:\rest-082b). The branch's own test files: `tools/assets/game.test.ts` 5 passed (62 ms), `tools/assets/convert.test.ts` 83 passed (1.25 s), run with 2 workers.

1. **The plan (pure).** `planGame` (`tools/assets/game.ts`) groups keys by pack. Each pack gets its sources sorted and de-duplicated, and packs with no key are left out. Every missing pack or name, and every `scale-suspect` entry, goes into `problems`. In that case `runGame` exits 1 before Blender or any write. Tests: "groups the keys by pack ..." and "refuses a key the manifest lacks ...". The second asserts both missing keys are named, `writes` is empty and Blender is never called, and it also covers scale-suspect through `planGame`. Met.
2. **The include filter.** `buildBlenderArgs` adds a single `--include-file <path>` only when `include` is set. `convert_fbx.py` reads the file (`read_include_file`) and skips FBX not in it, and `--exclude` still applies. The test "082 B: an included pack's Blender arguments ..." checks that the args without an include are unchanged and that the include run is the same args plus exactly two more. No existing `tools/assets` case was edited: the diff adds only an import name and two cases. Met.
3. **The game manifest.** `buildGameManifest` sets `version`, `game.keys` (sorted, unique) and `game.from = full.generatedAt`. Each pack is the full `AssetPack` with `assets` cut to the plan, `glb: "<pack>.glb"` and colourways cut to `gameColourways()`. The images are copied to `game/<pack>/colourways/` under the same relative path, which `loadColourways` resolves against `dir`. `compareEntries` checks name, scale, textures and bounds within `BOUNDS_TOLERANCE = 0.001`. A model that leaks in or goes missing fails too. Everything is written to `game/.tmp` and moved only after every pack passes. Tests: "is cut from the full manifest ..." (keys, from, assets, glb, only `02_A` copied, `B.png` absent) and "fails the run when ... bounds differ by more than 0.001 m". The second asserts the earlier `old.glb` survives and that no manifest or `town.glb` was moved. Met.
4. **The full pack is untouched.** The test "writes only under out/game/ ..." uses fake deps. Every write and rename target starts with `out/game/`, the full manifest text is unchanged, and every Blender `--out` is under `game/`. The code backs this up: `runGame` never calls `writeText`, `copyFile` or `rename` outside `game`, and it reads `L.manifest` only. Met.
5. **The selftest.** `build_selftest` adds `unlisted_box.fbx`. In selftest mode `main()` writes an include file of every FBX except it, so the selftest is an include run, and exclude still beats include for `excluded_box`. `checkSelftest` flags `unlisted_box` in the report. Test: "082 B: checkSelftest fails when a model the include file left out reaches the report". The Blender run is the builder's, as the ticket says. Met in code; I did not run Blender.
6. **The run.** I have not seen the builder's reply: per-GLB sizes, model counts, run time, and the backup diff and modified times of the full manifest. The main session's measurement shows the game pack exists and loads: 31.7 MB in 8 GLBs against 387.6 MB in 8 for `?packs=full`, 0.8 s / 0.8 s against 4.1 s / 4.3 s at `?view=3d&city=tiles`, 6x6 seed 1. The console had no "lacks" line, so the pack covers every key the page asks for. The street view looked the same. That satisfies the load-time side, A's criterion 6, which needed B's run. The full-manifest-unchanged check rests on the builder's report and on criterion 4's test. **Looks the same (A7): Josh's eye.** He has not yet done his side-by-side at the clean and ruin eras.
7. **README.** `tools/blender/README.md` gains a *Game pack (ticket 082)* section. It covers what the pack holds, when to run it (after a conversion, and when the page says it lacks models), that it is gitignored, and the licence line in Josh's words. Met.

**Count.** 7 `it(` added, 0 rewritten against main, which is the ticket's 7. `game.test.ts` runs in 62 ms.

**The checks I was asked for:**
- **Full packs and manifest never touched.** No write path outside `out/game/` (code and test, above). `.tmp` sits inside `game/`, with an `isInside` guard.
- **Nothing under `assets/private` committed.** `git ls-files assets/private` is empty, the diff touches no file there, and `.gitignore` still has `assets/private/` and is not edited.
- **No new dependency.** The only `package.json` change is the `assets:game` script line. The conversion is Blender, as Josh chose ("Stay with Blender").
- **Fakes only.** `game.test.ts` uses an in-memory file map, a fake `run` that writes a report, and injected `keys`/`colourwayIds`. It never imports `gamemodels.ts`: the CLI imports it dynamically at the bottom. The new `convert.test.ts` cases use the existing `report-selftest.json` fixture. No real GLB or manifest is read.

## Rule conflicts and risks
- `src/` is untouched (an empty diff over `src`, `public`, `assets`, `.gitignore`). `src/grid/` and `src/night/` are not involved.
- No GDD Decided rule is touched. The licence rule holds: output only under the gitignored `assets/private/out/game/`, nothing bundled or deployed.
- Minor: the swap step in `runGame` (lines 262 to 267) first deletes the old `game/` contents, then renames from `.tmp`. A rename that throws midway would leave a partial game pack. The loader would then see a stale or unreadable game manifest and fall back to the full packs. That is safe, not a blocker.

## Must fix
none

## Could improve
1. `tools/assets/game.ts`: in the swap step, move `manifest.json` last (it is already last in `moves`) and catch a rename failure, so the stderr says the game pack is partial and to re-run. Or rename the old `game/` aside before moving the new files in. Either way a failed swap is reported, not silent.
2. `tools/assets/game.ts` `compareEntries`: also compare `triangles`. It is a cheap extra sign that the include run made the same mesh. Optional, as the ticket names only name, scale, textures and bounds.
