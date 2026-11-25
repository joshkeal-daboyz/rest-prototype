ticket: 081-X1c-delete-render
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Delete `src/render/` and its tests, remove the relight drift case that read `map-renderer.ts`, widen X1a's import guard to all of `src/` and `tests/playtest/`, drop any 2D-only routes in `renderer.ts`, and touch nothing outside `src/render/` and `src/render3d/` (comments elsewhere are listed, not edited).

## Does the branch do it?
Round 2. Read against `origin/main`. The head is c0302ba. Round 1 had 2 must-fix items, and both are applied.
1. **Deleted.** Met, as in round 1. `src/render/` is gone. The `describe("drift guard")` block has been removed from `src/render3d/relight3d.test.ts`, and the header of `relight3d.ts` now says the 2D renderer is gone.
2. **Nothing imports `src/render/`.** Met. `src/render3d/maprender.test.ts` changes the existing case instead of adding a new one. It now walks every `.ts`/`.tsx` file under `src/` and `tests/playtest/`, recursively, and skips only itself. Its regex `(?:\.{1,2}\/)+(?:src\/)?render(?:\/[^"']*)?["']` catches `./render`, `../render/...` and `../../src/render/...`. It does not match `render3d`, because after `render` it needs `/` or a closing quote. The case passes on the branch.
3. **2D-only routes.** Met, as in round 1: `renderRoute` had no branch that fed the 2D map.
4. **Typecheck.** `npm run typecheck` passes on the head.

Tests run: `maprender.test.ts`, `glyphs.test.ts` and `relight3d.test.ts`. 3 files, 9 passed, 1.1 s. The diff adds 2 `it(` lines (the rewritten guard and the new glyph case), which is well under the cap.

## Rule conflicts and risks
- `src/city/pipeline/hash.ts` and `hash.test.ts` no longer differ from main. That comment still names `src/render/city.ts` and should be listed for the docs step, as the ticket says.
- `src/grid/`, `src/night/` and the locked puzzles folder are unchanged. There is no new dependency.
- The diff against `origin/main` still includes `cleanups/2026-11-25.md` and this review. Both come from the main session, not the builder.

## Must fix
none

## Could improve
1. `src/render3d/glyphs.test.ts` adds 1 case where the ticket counted 0 added. It guards a live module and is far under the cap. Keep it, but say so in the count.
2. The `styleguide.test.ts` comment that says "`src/render/city.ts`, which X1c deletes" can move to the past tense.
