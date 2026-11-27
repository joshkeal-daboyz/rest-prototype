ticket: 083b-itch-gate
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B lifts `src/main.ts`'s production stop for the itch build only (`MODE === ITCH_BUILD_MODE`), with the notice text unchanged and a comment citing Josh's 26 Nov words. Every other dev-only path stays dev-only, and no other line of `main.ts` changes. Its count is 0 tests.

## Does the branch do it?
Against `origin/main` (which already has A, #127), the branch is one commit (76ad505) that changes only `src/main.ts`, by 3 lines added and 2 removed.

- **B1, the gate.** `main.ts:48` is now `if (!import.meta.env.DEV && import.meta.env.MODE !== ITCH_BUILD_MODE)`. `ITCH_BUILD_MODE` is imported from `./core`, where it is already exported (`src/core/index.ts:19`). The notice text is the same, byte for byte. The new comment line cites ticket 083 B and Josh's "Password page, include". Met.
- **B2, dev-only paths.** Three lines still read `import.meta.env.DEV` only, and none of them is in the diff:
  - `planHidesHud(location.search, import.meta.env.DEV)` (line 382);
  - `startScreen(location.search, import.meta.env.DEV)` (line 384);
  - the asset gallery branch `if (import.meta.env.DEV && assetGalleryRequested(...))` (line 451).

  The only lines changed are the import, the gate and its comment. Met.
- **B3, it plays (browser).** I don't run the game in a browser. The main session reports that it served an itch zip built from main plus B and C and saw the title, the stage select and stage 01 play with real models. It saw no console errors, and the only manifest fetched was `assets/private/out/game/manifest.json`. That report doesn't say whether a puzzle was won, whether the next one opened, or whether progress survived a reload. Josh should check those three when he plays. The plain-build half was untested, so I checked it without a browser:
  - I ran `npx vite build` (mode production) into a scratch folder outside the repo, then deleted the folder.
  - The output is `index.html` plus one 140 kB JS chunk, with no GLB, texture or pack.
  - The bundle reads `e.textContent="This prototype plays in \`npm run dev\`. The city view is not in this build.";return`. The gate is constant-folded to always-true, so the plain build still stops at the notice and carries none of the city code. This half is met, short of seeing it in a browser.
- **Count.** No test files touched: 0 cases, as the ticket says.

## Rule conflicts and risks
- No file outside the ticket's list (`src/main.ts` only). No `src/grid/` or `src/night/` change, no new dependency, no Decided rule touched.
- The licence holds as Josh ruled. Only the `itch` mode passes the gate, and the plain build's bundle drops the city path entirely (checked above).
- Small risk: anyone running `vite build --mode itch` gets a page that expects the pack beside it. That is the intended design (C's script supplies the pack), not a defect.

## Must fix
none

## Could improve
1. The old comment line above the gate still says the city view is built "only [by] the dev server". The new line right after it gives the exception, so it reads fine. Merging the two lines into one would be slightly clearer.
