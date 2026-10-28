# 02 · This way or that — design note

Rung 02. Two switches in a row. The first sends the feed either to the home or on to the second, and the second chooses between the well and the shrine.

**Element under test:** the switch. A switch sends power down one of its two lines, never both, so lighting one lamp darkens another. Chained, the player has to follow the current to see which switch matters first.

## The map

6 nodes, 5 lines, no faults, no parts. Feed capacity 3.

| Switch | Position 0 (start) | Position 1 |
| --- | --- | --- |
| `sw_1` (by the feed) | `home` (1) | on to `sw_2` |
| `sw_2` | `well` (1) | `shrine` (1, target) |

## The intended read

1. The map opens with the home lit through `sw_1`. Load 1 of 3. `sw_2` is dark: no pulses reach it.
2. Throw `sw_1`. The home goes dark; pulses run on to `sw_2` and light the well.
3. Throw `sw_2`. The well goes dark and the shrine lights. **Win.** Load 1 of 3.

## The trap

The switch drawn right next to the shrine, `sw_2`, is the obvious first click, and it changes nothing anyone can see, because no current reaches it. Its blade moves, but nothing lights. The read is to follow the pulses back from the feed: they turn off at `sw_1`, toward the home. It's readable (no pulses on `sw_2`'s lines) and costs nothing; `sw_2` is already set right if it was thrown first, so `sw_1` then wins in one.

The second lesson is quieter: winning darkens the home. A switch never feeds both lines. The priests asked for the shrine, and the home pays.

## What this map tests

- Whether a switch reads as "one or the other" from its drawing, before it's thrown.
- Whether the player traces current from the source instead of clicking the control nearest the target (GDD review, finding 1: reasoning over clicking).
- Whether losing the lit home to light the shrine feels like a choice rather than a bug (the first hint of "what stays dark").

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 6, lines 5, faults 0. Parts needed: none.
- Fewest actions to win: **2** (`sw_1`, `sw_2`, in either order).
- Winning configurations: **1 of 4**.
- Final load: 1 of 3 (the shrine). Capacity never binds.
- Dead ends: none. Reachable states: 4.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
