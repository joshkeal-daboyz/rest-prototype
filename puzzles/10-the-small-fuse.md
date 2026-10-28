# 10 · The small fuse — design note

Rung 10. The feed has plenty (6), but the shrine hangs off a fuse box rated 2 that already carries the market and the lantern. The priests want the shrine lit and the home kept lit. Enoch has two fuses.

**Element under test:** the fuse rating. A fuse box carrying more than its rating **blows** when powered: a new fault that costs a part, unlike a brownout, which costs nothing. And a fuse only counts what's past it: the feed's own load is a different number.

## The map

12 nodes, 11 lines, no faults, 2 fuses. Feed capacity 6.

- `j0` → `br_h` (closed) → `home` (1, **target**). Not under the fuse.
- `j0` → `fb_1` (rating **2**) → `j1`, which feeds three breakers:
  - `br_s` (open) → `shrine` (2, target)
  - `br_m` (closed) → `market` (1)
  - `br_l` (closed) → `lantern` (1)

## The intended read

1. The map opens with the home, market and lantern lit. Feed load 3 of 6. `fb_1`'s bar is **full**: 2 of 2.
2. The shrine is 2 and `fb_1` is rated 2. The shrine has to be alone on it. The market and the lantern go.
3. Open `br_m`, open `br_l` (`fb_1` at 0 of 2), close `br_s` (2 of 2). **Win.** Feed load 3 of 6: home and shrine.

## The trap

The shrine's breaker is the obvious click, and the feed shows 3 of 6, plenty of room. Close `br_s` first and **`fb_1` blows**: load 4, rating 2, culprit `shrine`. The market and lantern go dark with it. The lesson is that the feed's number isn't the fuse's number.

A second, quieter wrong read: shed the home. It's nearest the feed and the only lamp not on the fuse box, so it looks like the spare one. Opening `br_h` does nothing for `fb_1` (its bar doesn't move) and darkens a target.

Readable: the full bar before, the ✕, the shock to the shrine and the notice after. Recoverable: open `br_m` and `br_l`, then repair `fb_1` with one fuse (3 actions after the blow). Repairing before shedding blows it again at once and spends the first fuse; the second still recovers. Only two premature repairs in a row leave the map stuck (Undo or Reset clears it), as in 11-which-fuse.

## What this map tests

- Whether the load bar (ticket 012) turns a rating into a plan *before* the first blow.
- Whether the player tells the two limits apart: the feed's brownout (free, 04) and a fuse blow (costs a part). GDD review, finding 1.
- Whether a blow you can recover from with a part on hand feels like a lesson, not a punishment (18-battery-run's "What it taught us").

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 12, lines 11, faults 0. Parts given: 2 fuses. Parts needed: **none** on the intended route; 1 after the trap.
- Fewest actions to win: **3** (open `br_m`, open `br_l`, close `br_s`). After the trap: 4 (trap + 3).
- Winning configurations: **1 of 16**.
- Fuse at start: `fb_1` 2 of 2 (full). At the win: `fb_1` 2 of 2 (shrine). Feed at the win: 3 of 6.
- Dead ends: 16 of 78 reachable states, all after two premature repairs. Every first move leaves the map winnable.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
