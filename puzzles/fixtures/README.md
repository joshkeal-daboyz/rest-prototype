# Test fixtures

Test fixtures only: never a stage and never a Map menu entry. Nothing here is swept by `npm run check`, the fit sweep or the playtest harness, and no loader lists this folder. P0 (`city-two-ways-round`) is kept here because nine test files assert on it and its schematic, and the old puzzles in `puzzles/city/` and `puzzles/` are going (ticket 084 A). These are byte-for-byte copies; the originals stay until A6 (the city file) and M6 (the schematic panels). The city form's note is `city-two-ways-round.city.md` here, because the schematic's note already holds the name `city-two-ways-round.md` and it is the one whose check block `convert.test.ts` replays.

Read by:
- `09-shrine-circuit`: core `load`, `check`; grid `grid`, `battery`, `fuseload`; play `play`, `elapsed`, `lastentry`, `pan`, `click-event`; render3d `look`, `overlay`, `relight3d`; ui `maps`; tools `analyze`, `check`, `sections`.
- `20-battery-run`: core `check`; grid `culprit`, `fuseload`; tools `analyze`.
- `12-which-fuse`: grid `spring`. `21-wake-the-relay`: play `click-event`. `61-charge-it-first`: tools `check`.
- `06-the-spark`, `10-around-the-dead-post`, `11-the-small-fuse`, `16-behind-the-first`, `49-two-cells`: tools `analyze`.
- `lamp-row.grid.json`: grid `grid`.
- `city-two-ways-round` (schematic `.json` and `.md`, and `.city.json`): `convert.test.ts` (replays the note's check block on both), `fit.test.ts`, `analyze.test.ts`; the render3d tests `circuitdraw`, `cityframe`, `overlay`, `windows` read the `.city.json`.
