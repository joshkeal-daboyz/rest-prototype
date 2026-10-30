# 27 · Switch before breaker — design note

Two jobs on one map. In the east, the shrine and the gate wait behind an open breaker, a small fuse box and a switch still set to the old mill. In the west, the well's fuse box has blown, and it shares that box with the lane. The yard is lit and the feed is small. Enoch has two fuses.

**Element under test:** the trap where the obvious first move blows a fuse, twice over. Each district has its own obvious first click that blows a box. One spare fuse covers one mistake; making both loses the map.

## The map

16 nodes, 15 lines, 1 fault. Feed capacity 3. Parts: fuse, fuse.

| District | Controls | Lamps (load) |
| --- | --- | --- |
| East | `br_E` (**open**) → `fb_E` ≤2 → `sw_E`: 0 → `mill` 3 (start), 1 → post `jT` | `shrine` 1, `gate` 1 (targets) on `jT` |
| West | `fb_W` ≤1 (**blown**) | `well` 1 (target); `lane` 1 behind `br_ln` (closed) |
| Yard | `br_yd` (closed) | `yard` 1 (priority) |

## The intended read

1. The map opens at 1 of 3: the yard. `fb_W` buzzes. The east is dark; its switch points at the mill, marked 3, and its box is rated 2.
2. East: throw `sw_E` to the shrine's post first (nothing changes, the breaker is open), then close `br_E`. Shrine and gate light, `fb_E` 2 of 2.
3. West: the box is rated 1, and well + lane are 2. Open `br_ln`, then repair `fb_W`. The well lights, `fb_W` 1 of 1.
4. Feed: shrine + gate + well + yard = 4 of 3, **brownout**. Open `br_yd`. 3 of 3. **Win.**

## The trap

Two obvious first clicks, both wrong. Closing `br_E` (the dark district's breaker) sends the mill's 3 into a box rated 2: **`fb_E` blows** (culprit `mill`). Repairing `fb_W` (the only buzzing fault) with the lane still on puts 2 on a box rated 1: **`fb_W` re-blows** (culprit `well`). Each is readable before (the mill's 3 against the east box's 2; two lamps of 1 behind a box rated 1) and after (✕, shock to the culprit). Each alone is recoverable: throw `sw_E` (or open `br_ln`) and repair with the spare fuse. Both together need three fuses for two boxes, and Enoch has two: the map is stuck with a ✕ that says *needs fuse, have 0*, and Undo clears it.

The lesson from *Which fuse* and *Battery run*, set the switch before you let the feed in, is the whole east district. The west is rung 13 again. The difficulty is doing both with one spare between them.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (a closed spur, lamp loads against the rating), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- Whether "switch before breaker" has become a habit: does the player throw `sw_E` before closing `br_E` without being burned first?
- Whether one spare fuse shared across two independent districts makes the player more careful in the second after a blow in the first.
- Whether three separate limits (two boxes and a feed) on one map stay readable at once.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 16. Lines: 15. Faults: 1 (`f1` blown `fb_W`). Readable at start: 1 of 1.
- Parts given: 2 fuses. Parts needed: 1 (2 after either trap; 3 after both, which the map can't give).
- Fewest actions to win: 5 (throw `sw_E`, close `br_E`, open `br_ln`, repair `fb_W`, open `br_yd`).
- Final load: 3 of 3 (shrine, gate, well). `fb_E` 2 of 2, `fb_W` 1 of 1.
- Winning control settings: 1 of 16 (`sw_E` to the post, `br_E` closed, `br_ln` open, `br_yd` open).
- Reachable states: 168. Dead-end states: 96 (both traps taken, or a fuse wasted on a re-blow).
- First moves: close `br_E` blows `fb_E` (load 3 > 2, culprit `mill`), still winnable; repair `fb_W` blows (load 2 > 1), still winnable. Traced: `br_E` (blow), `sw_E`, repair `fb_E`, `br_ln`, repair `fb_W`, `br_yd` completes at 3/3 with no fuse left.

## What it taught us

