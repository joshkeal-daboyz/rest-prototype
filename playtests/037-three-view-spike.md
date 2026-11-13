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

---

# Section B (captions and readable objects)

ticket: 037-three-view-spike (section B)
verdict: pass
regressions: 0

## What the ticket meant to change
Make the 3D view readable without hovering: captions, ON/OFF levers, fuse load bar, lamp levels and place name, using the 2D view's words. No 2D or play change.

## What I ran
`npm run playtest` at b81953c: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Section B's diff since 78c5843 touches only `src/render3d/`, `tickets/037-three-view-spike.md` and `tickets/usage.md`. Nothing outside the ticket's Files except the ticket and usage log (main-session edits).
- The harness never loads `src/render3d/`, so caption legibility, lever pose, and "clicks hit the object, not the caption" in the browser are Josh's to check.

---

# Section C (wires, visible break, Relight in 3D)

ticket: 037-three-view-spike (section C)
verdict: pass
regressions: 0

## What the ticket meant to change
Draw wires strung on poles, show the damaged cable's break, and play the Relight in the 3D view only. No 2D or play change.

## What I ran
`npm run playtest` at 2898b81 (detached worktree, so the uncommitted 038 files were not included): 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Section C's diff since bc6cd0b touches only `src/render3d/`. Nothing outside the ticket's Files.
- The harness never loads `src/render3d/`, so the wires, the break and the Relight animation are Josh's to check in the browser.
