release: none (ticket 080 section A, branch ticket/080a-split)
verdict: can't tell
regressions: 0

## What the ticket meant to change
Split docs/city-style-guide.md into docs/city-style/*.md domain files; no game behaviour.

## What I ran
Nothing. My instructions run the playtester only on a full release Josh has called, never on a ticket. Not replayed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The diff vs main touches no map, grid, play, Relight or audio code. Changed code files: a doc-path comment in src/render3d/citymetrics.ts and doc-path reads in render3d tests (stacktown, styleguide, terracepack). Everything else is docs/, .claude/agents/ and tickets/. No play behaviour could have changed, so a replay would find nothing.
