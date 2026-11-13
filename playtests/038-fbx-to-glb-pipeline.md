ticket: 038-fbx-to-glb-pipeline
verdict: pass
regressions: 0

## What the ticket meant to change
Add an offline FBX-to-GLB converter and asset manifest under `tools/assets/` and `tools/blender/`, with no change to how any map plays ("`npm run playtest` is green with no snapshot change").

## What I ran
`npm run playtest` at e139fee (worktree D:\rest-prototype-038): 130 tests (whole ladder, every map's winning script), 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The only `src/` change is `src/core/assets.ts` (types and three constants, no logic) plus its one export line in `src/core/index.ts`. Both are exactly what the acceptance criteria allow. Nothing in the game imports them, so play cannot move. The replay run was a cheap confirmation, not a necessity.
- Everything else (`tools/`, `.gitignore`, two `package.json` scripts, `assets/candidates/synty-store.md`, the ticket) is outside the runtime path of any map.
- `assets/candidates/synty-store.md` is not listed in the ticket's Files section; it is a doc and does not affect play, but it is beyond the ticket's file list.
