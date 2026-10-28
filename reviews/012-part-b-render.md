ticket: 012-fuse-load-bar (part B)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
Each rated fusebox gets a horizontal load bar under it. The bar fills to fuseLoad / rating, has a tick per unit, and goes green, then amber, then the alarm colour, with full meaning "at the limit". Length and ticks alone must be enough to read it. An unrated fusebox gets no bar, and a blown fuse shows the bar empty and broken. The fill and colour mapping is pure and tested, and drawing it allocates nothing per frame.

## Does the branch do it?
- **Fill = load / rating:** `fuseFill` in `src/render/fusebar.ts` clamps the result to 0..1 and returns 0 when the load is zero or negative. Tested in the `fusebar.test.ts` case "fills to load / rating, clamped".
- **Ticks per unit:** `fuseTickOffsets` gives rating−1 dividers, one between each pair of units. They are drawn in the background colour over both the filled and the empty part, so the count stays readable. Above 12 units the ticks are left off and the bar reads by length only. That is a reasonable call and it is tested.
- **Green → amber → alarm, full = at the limit:** `fuseStep` gives amber from 60% and alarm only at a fill of 1 or more. The renderer uses `BATT_FILL` (green) → `BATT_FILL_RELEASED` (amber) → `ALARM`, and the outline also turns to alarm when the bar is full. Tested in "alarm only at the limit", including the cases fuseFill(1,1) → alarm and fuseFill(1,2) → green.
- **Readable without colour:** the fill length, the dividers and the outline carry the reading. Colour only backs it up.
- **No bar when unrated:** `fuseTicks[i]` is null for a fusebox with no rating, and the draw is skipped. `fuseFill(…, undefined)` returns 0, which is tested.
- **Blown = empty and broken:** a blown fuse forces fill = 0 and draws a split outline with a gap in the alarm colour.
- **battery-run `fb_east`:** its rating in `puzzles/battery-run.json` is 1. After the win its load is 1, so the bar reads 1 of 1: full, alarm colour, alarm outline, and no dividers because a rating of 1 has none. The builder's report that it "shows 1 of 3" is wrong. The code is right: it takes the rating from the puzzle node and never assumes 3.
- **No per-frame allocations:** the tick arrays, `fuseRating` and `BAR_COLOURS` are built once at setup. The draw path only does a `Map.get`, arithmetic and canvas calls.
- **Imports and scope:** `fusebar.ts` imports nothing. `map-renderer.ts` keeps its imports to `../core` plus the type-only import from `../grid`. All four changed files are in `src/render/`.
- **`render.test.ts` fix:** it adds `fuseLoad: new Map()` to the hand-built `GridState`. That is the minimal fix for the part-A interface change.
- **Gate:** `npm run gate` passes: 12 test files, 202 tests, including 4 new ones in `fusebar.test.ts`.

## Rule conflicts and risks
- A blown fuse whose box can't be read (no current reaches it) is drawn as an empty bar that is not broken. This is the same readability rule the box itself already follows, so it is consistent with the GDD's "readable means current reaches it".
- I did not check the layout in a browser. The bar sits at y+30, just under the rating label, which is at y+23, or y+25 in the big font when blown. A fusebox on the bottom row could be clipped by the canvas insets.

## Must fix
none

## Could improve
1. `src/render/map-renderer.ts`: the "unrated → no bar" path and the "blown → fill 0" path live only in the draw code and have no tests. Both could move into a small pure helper in `fusebar.ts` (for example `fuseBarState(rating, load, broken)`) and be tested there.
2. Josh should check by eye that the bar clears the enlarged "load ≤N" label on a blown fuse, and that it isn't clipped near the bottom edge of the canvas.

## Main session's response
agree. Merged onto `proto/012`, then `proto/012` into `main`. Could-improve 2 is checked in the browser by the main session and by Josh.
