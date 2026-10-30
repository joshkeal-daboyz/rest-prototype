ticket: 035-clicks-under-empty-insets
verdict: pass
regressions: 0

## What the ticket meant to change
Clicks hit nodes drawn in the empty middle of the HUD bands; only the real HUD panel rects block (renderer hit gate plus measured blockers).

## What I ran
`npm run playtest` at edc43c4 (ticket/035 integration stack): 64 ladder maps, 130 tests, all passed, 0 differed.

## Intended differences, snapshots updated
none. The committed traces already carry the 029 ids (01..64), have no level-done cue, and match the current replays, so nothing from 029/032/034 showed as a diff. No snapshot was edited.

## Regressions
none. Every map's script still wins within the README Min clicks. Fuse, battery, spring and brownout events, the Relight plan and the cues per event equal the committed traces. The Relight lock check holds on every map. Every replay frame draws on the real renderer with no non-finite numbers.

## Added to the harness
nothing

## Noticed
- The committed snapshots come from the 036 harness commit, not from main at 026. main has no harness, so "same as main through the 029 table" was not compared directly. The comparison is against the 036 traces and the Min clicks column.
- The harness never calls hitTest, placeAt or setBlockers. The ticket's hit-logic checks (bottom and top band hits, blockers, off-canvas null) belong in src/render/blockers.test.ts, and this harness did not re-check them.
- Not checkable headlessly: real DOM measurement of .hud, .inventory, .sound-dock and .sound-popover (measureBlockers on live layout), the per-frame wiring in main.ts, picker order and next-map order in the real UI, the win line, the target rows, and Josh's drag/zoom click check on 64 at about 1100x650.
