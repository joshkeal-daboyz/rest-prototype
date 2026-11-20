ticket: 070a2b-plan-default
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A2b of ticket 070: `?city=plan` with no `blocks`/`seed` opens the 6 x 6 seed 1 city by reading A4d's `PLAN_BLOCKS_DEFAULT`, while `city=tiles` keeps its 3 x 3 default. Only the two default lines and doc comment in `planview.ts`, and the two default assertions in `planview.test.ts`, may change.

## Does the branch do it?
1. **The default.** `src/render3d/planview.ts` lines 45-46 start `blocksX`/`blocksZ` at `PLAN_BLOCKS_DEFAULT`; the import swaps `CITY_BLOCKS_DEFAULT` for it (needed, since the old name would be unused). Seed default stays 1; the clamp and the regex are untouched. The doc comment now says "the default 6 x 6". In `planview.test.ts` the `"?city=plan"` test (renamed "defaults to 6 x 6, seed 1 ...") and the `"?city=plan&blocks=big&seed=abc"` assertion now expect 6 x 6 seed 1; no other assertion changed. I ran `npx vitest run --maxWorkers=2 src/render3d/planview.test.ts`: 25 passed. Met.
2. **`city=tiles` keeps 3 x 3.** The diff `267cce9..13c3d16` touches only the two planview files. `tileslots.ts`, `tilecity.ts` and `layout.ts` still read `CITY_BLOCKS_DEFAULT`, which is still 3 (`src/city/streets/constants.ts:11`). Met.
3. Main session's screenshot. Not judged here.
4. **R-8, R-11.** No ladder file or `src/city/` file edited; diff stays inside the section's Files; no new dependency. The main session reports tsc clean and planview + pipeline 49 passed. Met as far as the section's gate goes; the full `npm run gate` is due when all eight sections merge together, as the ticket says.

## Rule conflicts and risks
- none found. `src/grid/` and `src/night/` are not touched.
- The 3D game's `src/grid/` and `src/night/` are not affected.

## Must fix
none

## Could improve
none
