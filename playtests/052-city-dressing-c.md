ticket: 052-city-dressing-c
verdict: pass
regressions: 0

## What the ticket meant to change
Section C draws street furniture (new `furniture.ts`, drawn from `models3d.ts`) in the 3D view only; no criterion touches grid, play, the Relight plan or audio cues.

## What I ran
`npm run playtest` not run, by design: nothing the harness loads can have changed. Checked on `ticket/052-city-dressing-c`:
- `tests/playtest/*.ts` import only `src/core`, `src/grid`, `src/play`, `src/render` (2D), `src/audio/cues` and Node/Vitest. None imports `src/render3d` or `src/main.ts`.
- Outside `src/render3d/`, only `src/main.ts` (a dynamic `import("./render3d")`) and a comment in `src/core/calibration.ts` mention render3d. The harness reaches neither.
- `git diff main...HEAD` over `src/core src/render src/grid src/night src/play src/ui src/main.ts tests puzzles tools package.json` is empty. Section C's own commits touch only `src/render3d/` (`furniture.ts`, `furniture.test.ts`, `dressdraw.test.ts`, `gallery.ts`, `models.ts`, `models3d.ts`), plus `tickets/usage.md`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (no new control, fault or cue; the change is visual only and a replay cannot reach it)

## Noticed
- The diff against `main` also carries sections 050 and 051 and the earlier 052 reports because the branch is stacked; the Section C commits alone stay inside the ticket's Files.
- `gallery.ts` and `models.ts` are touched by Section C's commits. The ticket's Files list names them under B, not C; that is for the reviewer, and neither is reachable from the harness.
