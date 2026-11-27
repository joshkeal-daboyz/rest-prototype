ticket: 083a-itch-render
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A of ticket 083: in the itch build (`MODE === ITCH_BUILD_MODE`) the 3D play route opens, the effects and the saved fronts load, and the models come from the game pack only. The full `manifest.json` is never fetched, and a gap in the pack gets one `console.error` line. Dev behaviour does not change. At most 2 test cases (1 added, 1 rewritten).

## Does the branch do it?
I read the diff against `origin/main` (3c5c312, the merge base). The builder's work is commit 411e80a. `src/core/itch.ts` and its `index.ts` export came with the architect's cut.

1. **The play route opens in the itch build.** Met. `renderRoute` (`src/render3d/cityview.ts`) takes `itch` and returns `"play"` for `(dev || itch) && city`. The other routes are unchanged. `renderer.ts` passes `itch: import.meta.env.MODE === ITCH_BUILD_MODE`. `assemble`, `plan` and `sheet` are still read behind `import.meta.env.DEV`, so they are never set in the itch build. Test: the existing case in `overlay.test.ts` is rewritten as the ticket said. It adds one line, `dev: false, itch: true` is `"play"`, and keeps the `dev: false` line as `"none"`.
2. **No fallback to the full packs.** Met. `LoadDeps` gains `gameOnly` and `error`. With `gameOnly`, `loadModels` calls `readGameOnly` and never reaches the full-manifest fetch: a null result returns `NO_MODELS`. `readGameOnly` keeps a game manifest that lacks keys and lets the existing per-key drops draw the rest as placeholders. It writes one `console.error` line in the ticket's wording, naming the count and the first three keys. With no game manifest, or one without `game`, it writes one error line naming the URL and draws placeholders. Without `gameOnly`, the old `readGamePack` path runs unchanged, so 082's "never used in part" rule still holds in dev. `loadPageModels` sets `gameOnly: itch`. Test: one added case in `src/render3d/models.test.ts`, "gameOnly (the itch build) never fetches the full manifest...". Its fixture manifest lacks `p:Pole4`. It checks that every URL is under `/game/`, that `/out/manifest.json` is never fetched, that only Pole9 loads, and that exactly one error line names `p:Pole4`. It would fail if the fallback came back or if the drop-in-part behaviour broke. The ticket names `models3d.test.ts`, but that file does not exist and `models.test.ts` is where `loadModels` is tested, so this is the right file.
3. **The effects load in the itch build.** Met. `sharedFx` (`fx.ts`) now gates on `DEV || MODE === ITCH_BUILD_MODE`. `fxTextures` and `fxMeshes` load from the game pack as in dev. As the ticket says, this has no test.
4. **The saved fronts load in the itch build.** Met. `loadPageModels` passes `dev: import.meta.env.DEV || itch` to `loadSavedCalibration`. `calibration.ts` itself is untouched. As the ticket says, this has no test.
5. **Looks the same.** This is a browser check, so I can't confirm it; that is Josh's or the builder's job. The builder's report should carry the side-by-side screenshots and a network tab with no `out/manifest.json` request. The code paths it depends on (1 to 4) are in place.

**Count.** 1 added, 1 rewritten: 2, within the ticket's 2 and the policy's 15. Both changed files pass: `npx vitest run --maxWorkers=2 src/render3d/models.test.ts src/render3d/overlay.test.ts` gave 54 passed. The new case is quick (`models.test.ts` runs in 0.5 s in all). The 3.1 s case in `overlay.test.ts` is an existing pipeline case that this branch did not touch.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, and no GDD rule touched.
- The files are within A's list: `cityview.ts`, `renderer.ts`, `models3d.ts`, `fx.ts`, `overlay.test.ts`, and the loader's test file. Nothing in `calibration.ts`, `src/ui/`, `src/main.ts`, `tools/`, `vite.config.ts` or `package.json` changes. The `src/core/itch.ts` and `src/core/index.ts` changes are from the architect's cut commit, not the builder's.
- A plain `npm run build` (mode `production`) is unaffected: every new gate needs `MODE === "itch"`, and `main.ts`'s notice still stops that build (B lifts it).
- The branch is named `ticket/083a-itch-render`, while the ticket says `ticket/083a-itch-city`. This is cosmetic.

## Must fix
none

## Could improve
1. In `src/render3d/models3d.ts`, `readGameOnly` and `readGamePack` repeat the same fetch, the same `isManifest`/`game` check and the same computation of the lacking keys, and differ only in what they do with the result. A shared helper that returns `{ game, lacking }` would keep the two from drifting apart. This is optional.
2. The ticket names the test file `models3d.test.ts`. The architect could correct it to `models.test.ts` so that C's or B's builder isn't misled.
