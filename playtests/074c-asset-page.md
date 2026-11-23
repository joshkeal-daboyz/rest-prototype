ticket: 074c-asset-page
verdict: pass
regressions: 0

## What the ticket meant to change
Add a dev-only asset gallery (viewer in render3d, page in ui) at `/?assets=<pack>`, with no change to how any map plays.

## What I ran
`npm run playtest -- --maxWorkers=1` at 87a3e8c on ticket/074c-asset-page: 130 tests, 130 passed, 0 differed. Every map replays to the Relight with its snapshot unchanged.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The harness starts from `loadPuzzle`, so it does not run `src/main.ts`. I checked the C wrap by reading the diff only. `startPuzzle()` holds the old body unchanged. It is called in the else of `import.meta.env.DEV && assetGalleryRequested(location.search) !== null`. Without `assets=` the puzzle page starts as before. The gallery branch lazy-imports `./render3d` and `./ui/assetgallery`. The one static import is the pure `assetgallerylogic`. The ticket's static source-read test covers this branch. A browser check that the plain puzzle page and `?view=3d` both start belongs to Josh.
- The `planHidesHud` line in `main.ts` comes from 070 A3, not from this ticket.
- `git diff --stat main...HEAD` shows 631 files, far beyond the ticket's Files list. The branch carries the goal/city-transformations history (tickets 054-073, `tools/assets`, city and facades code). Only the 074 files are this ticket's. The merge base needs checking before merge.
