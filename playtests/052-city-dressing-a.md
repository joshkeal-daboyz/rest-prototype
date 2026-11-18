ticket: 052-city-dressing-a
verdict: pass
regressions: 0

## What the ticket meant to change
Section A adds pure dressing slots (`dressStack` and its constants) in `src/render3d/dressing.ts`, not yet used by the town.

## What I ran
Static check only, no `npm run playtest` (stopped early by design). The section's own commit (8a7a7e1) adds exactly `src/render3d/dressing.ts` and `dressing.test.ts`. The only importer of `dressing.ts` is `dressing.test.ts`; no non-test module and nothing under `tests/` imports it. The `main...branch` stat is larger because the goal branch carries 050 and 051 work already played and passed in their own reports; this section adds none of it. `tests/`, `puzzles/`, `src/core/`, `src/grid/`, `src/play/`, `src/night/`, `src/ui/` and `src/main.ts` are untouched by this section. The harness loads only those layers plus a fake renderer, and does not reach `src/render3d/`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- `dressing.ts` imports `stableHash` from `../render/city`, a read of a render helper that is not changed. Nothing to act on.
