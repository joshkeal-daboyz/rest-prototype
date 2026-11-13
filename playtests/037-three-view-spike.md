ticket: 037-three-view-spike
verdict: pass
regressions: 0

## What the ticket meant to change
Add a Three.js 3D view of the map behind `?view=3d` (new `src/render3d/`, declared lines in `src/main.ts`), with no change to 2D play and no snapshot change.

## What I ran
`npm run playtest` at abbf0c9: 130 tests (every map's replay trace and draw smoke), 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The diff against main goes beyond the ticket's Files: `.claude/agents/asset-scout.md`, `.claude/agents/renderer.md`, `CLAUDE.md`, `docs/prototype-brief.md`, `tickets/usage.md`, and the ticket file itself. The ticket reserves the docs and agent edits for the main session, so these look like main-session commits on the branch, not the builder's. The main session should confirm.
- The harness never loads `src/main.ts` or `src/render3d/`, so the `view=3d` toggle and the "no three chunk without view=3d" criterion are not covered here. Josh checks those in the browser.
