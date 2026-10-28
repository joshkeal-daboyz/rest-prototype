# 12 · One box, three lamps — design note

The priests want the shrine and the well. Both hang off one fuse box with the lane, and the box has blown. The yard and the porch are lit; the feed is already full. Enoch has two fuses.

**Element under test:** the shared fuse. One fuse box feeds three lamps, and its rating holds only two. The fuse box and the feed are two different limits, and here each one darkens a different lamp.

## The map

11 nodes, 10 lines, 1 fault. Feed capacity 3. Parts: fuse, fuse.

| Branch | Control | Lamps (load) |
| --- | --- | --- |
| North | `fb_A` ≤2 (**blown**) | `shrine` 1 (target), `well` 1 (target), `lane` 1 (priority, behind `br_lane`, closed) |
| Yard | `br_yard` (closed) | `yard` 2 |
| Porch | none | `porch` 1, always on |

## The intended read

1. The map opens at 3 of 3: yard and porch lit. `fb_A` buzzes: pulses in, none out. Behind it, three lamps: shrine, well, lane, all 1. The box is rated 2.
2. Count the box: 3 lamps, rating 2. One must go dark, and it isn't a target: open `br_lane`.
3. Count the feed: shrine + well + porch = 3, plus the yard's 2 = 5. Open `br_yard`.
4. Repair `fb_A`. Shrine and well light; `fb_A` 2 of 2, feed 3 of 3. **Win.**

Steps 2–4 can come in any order, as long as `br_lane` is open before the repair.

## The trap

The obvious first move is to repair the blown fuse you can see. With the lane still closed, the box carries 3 against a rating of 2 and **blows again at once** (`fuse:blown`, load 3, rating 2, culprit `shrine`). It's readable: the ✕ returns, the shock runs to the shrine, and the hover shows rating 2 against three lamps of 1. It's recoverable with the part on hand: open `br_lane`, repair with the second fuse; the brownout that follows (5 of 3) tells the player the yard has to go too.

Only a second premature repair (repairing again with the lane still closed) leaves the map stuck: two ✕ blows in a row, no fuse left, and Undo clears it.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (a closed spur, lamp loads against the rating), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- The GDD review's *shared fuse* idea in map form: does a player count the box's lamps before spending a fuse?
- Whether a fuse blow (box over its rating) and a brownout (feed over capacity) read as two different limits when they happen one after the other.
- Whether shedding the priority lane to save the fuse lands as a choice.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 11. Lines: 10. Faults: 1 (`f1` blown `fb_A`). Readable at start: 1 of 1.
- Parts given: 2 fuses. Parts needed: 1 (2 after the trap).
- Fewest actions to win: 3 (open `br_lane`, open `br_yard`, repair `fb_A`). After the trap: 5.
- Final load: 3 of 3 (shrine, well, porch). `fb_A` 2 of 2.
- Winning control settings: 1 of 4 (`br_lane` open, `br_yard` open).
- Reachable states: 16. Dead-end states: 4 (both fuses blown by premature repairs).
- Obvious first move (repair `fb_A`): blows, load 3 > 2, culprit `shrine`; still winnable.

## What it taught us

