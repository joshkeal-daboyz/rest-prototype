ticket: 081-X1c-delete-render
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Delete `src/render/` and its tests, remove the relight drift case that read `map-renderer.ts`, widen X1a's import guard to all of `src/` and `tests/playtest/`, drop any 2D-only routes in `renderer.ts`, and touch nothing outside `src/render/` and `src/render3d/` (comments elsewhere are listed, not edited).

## Does the branch do it?
Read against `origin/main` (613786e), the merge base.
1. **Deleted.** Met. `src/render/` no longer exists (38 files in the branch commit's stat, 40 against main). The drift guard `describe("drift guard")` is gone from `src/render3d/relight3d.test.ts`. `styleguide.test.ts` already had no `../render/city` import on main (X1a took it), so there was nothing to rewrite. One case from the deleted `src/render/glyphs.test.ts` comes back as `src/render3d/glyphs.test.ts` (1 case: save/restore balance and scale). It tests a module that is still live (the overlay's icons), but the ticket's count says "0 added".
2. **Nothing imports `src/render/`.** The code meets it. Grep over `src`, `tests`, `tools`, `vite.config.*`, `tsconfig*.json`, `package.json` and `.github` finds no import. The only hits are comments in `src/core/timing.ts` and `src/core/words.ts`, plus the PENDING comment in `styleguide.test.ts`. **The test half is missing.** The criterion says "X1a's case is widened to every file under `src/` and `tests/playtest/`. **test**: 1 rewritten." `src/render3d/maprender.test.ts` is unchanged. It still scans only `src/render3d/` with `readdirSync(__dirname)`.
3. **2D-only routes.** `renderRoute` in `renderer.ts`/`cityview.ts` only takes city, assemble, plan and sheet branches (see `renderer.ts:44`). No branch fed the 2D map, so there is nothing to remove. Met, but the builder should say so in its list.
4. **Typecheck and the tools.** `npm run typecheck` passes on the branch. I did not run `fit`, `check` or `analyze`: `tools/` imports nothing from `src/render/` (grep), so they cannot be broken by this. Josh plays it (browser).

Tests run: `glyphs.test.ts`, `relight3d.test.ts` and `hash.test.ts`. 3 files, 9 passed.

## Rule conflicts and risks
- `src/city/pipeline/hash.ts` and `src/city/pipeline/hash.test.ts` are edited. That is outside the ticket's folders, and the ticket names `hash.ts` as one of the comments to "list in the reply ... not edited". The new text is also garbled: "a copy of `stableHash` in `the deleted 2D map's city.ts`".
- `src/grid/`, `src/night/` and `puzzles/locked/`: no change against main.
- No new dependency. `package.json`, the vite config and `.github` are unchanged.
- The pull request's diff against `origin/main` also carries `cleanups/2026-11-25.md`. That file comes from the main session's local commits, not from the builder. Harmless, but the main session should know it rides along.

## Must fix
1. `src/render3d/maprender.test.ts`: widen the existing case (rewrite it, do not add one) so it walks every `.ts` file under `src/` and `tests/playtest/` and fails on any import of `src/render/` (`../render`, `../../render/...`, and so on, but not `render3d`). Expected effect: criterion 2's "1 rewritten" is met, and the 2D map cannot quietly return.
2. `src/city/pipeline/hash.ts` and `src/city/pipeline/hash.test.ts`: revert both to main. List the comment in the reply for the docs step, as the ticket says. Expected effect: the branch touches only `src/render/` and `src/render3d/`, and the garbled comment goes away.

## Could improve
1. `src/render3d/glyphs.test.ts` adds 1 case where the ticket counted 0 added. It is well under the cap and it guards a live module, so keep it, but say so in the reply so the count is honest. Or drop it if Josh wants the count held exactly.
2. The `styleguide.test.ts:259` comment still says "`src/render/city.ts`, which X1c deletes". It is in `src/render3d/`, so the builder may update it to the past tense.
