# 14 · Ring from the east — design note

The lamps around the old square sit on a ring that can be fed from either end. Tonight it's fed from the west, and the gate and shrine are lit; the well, past a break in the ring, is dark. The priests want the shrine and the well. Enoch has a wire and a fuse.

**Element under test:** the ring main with a switch, combined with fuse ratings. A single repair closes the ring, and then the whole ring hangs on whichever end feeds it. Which end can carry it is a question for the fuse ratings, not the map's shape.

## The map

15 nodes, 15 lines, 1 fault. Feed capacity 3. Parts: wire, fuse.

`sw_r` picks the end: position 0 → `fb_W` ≤2 → west end `pW`; position 1 → `fb_E` ≤3 → east end `pE`.

Ring: `pW` – `p1` – `p2` – `p3` – `pE`. Lamps: `gate` 1 (priority) on `pW`, `shrine` 1 (target) on `p1`, `well` 1 (target) on `p3`, `mill` 2 behind `br_mill` (closed) on `pE`. The break: `l_r3` (`p2`–`p3`), damaged.

## The intended read

1. The map opens fed from the west: gate and shrine lit, `fb_W` 2 of 2 (bar full). The current runs round the ring to a **spark** on `l_r3`. The well, the mill and the east end are dark.
2. Count the ring whole: gate 1 + shrine 1 + well 1 + mill 2 = 5. West box: 2. East box: 3. Neither carries 5; the east carries 3 if the mill is off.
3. Open `br_mill`. Throw `sw_r` east: the well lights from the east, `fb_E` 1 of 3. The spark is now seen from the other side.
4. Repair `l_r3`. The ring closes and the east end carries gate, shrine, well: `fb_E` 3 of 3, feed 3 of 3. **Win.**

## The trap

The spark is visible from the start, on the side that's already lit, and Enoch has exactly the wire for it. Repairing it from the west closes the ring onto `fb_W`: 5 against 2, and **`fb_W` blows** (culprit `mill`, the shock running all the way round the ring). Readable: the ✕, the shock to the mill, and the bar that was full before the click. Recoverable without Undo: throw `sw_r` east (which blows `fb_E` too, 5 against 3, if the mill is still on), open `br_mill`, and repair `fb_E` with the fuse. The fuse in the satchel is there for this mistake.

Only spending the fuse on `fb_W` (which re-blows while the ring is whole and the west end feeds it) and then blowing `fb_E` leaves the map stuck; Undo clears it.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (the whole ring's load against the feeding box), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- The GDD review's *ring circuit with a switch*: does the player understand that the same break looks different from each end, and that a closed ring hangs on one feeder?
- Whether "repair everything you can see" gives way to "count before you close the loop" once the fuse bars are visible.
- Whether the shock travelling round the ring to the mill makes the blow's cause readable.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 15. Lines: 15. Faults: 1 (`f1` `l_r3`). Readable at start: 1 of 1.
- Parts given: wire, fuse. Parts needed: wire (plus the fuse after the trap).
- Fewest actions to win: 3 (open `br_mill`, throw `sw_r`, repair `l_r3`; the repair last).
- Final load: 3 of 3 (gate, shrine, well). `fb_E` 3 of 3, `fb_W` dark.
- Winning control settings: 1 of 4 (`sw_r` east, `br_mill` open).
- Reachable states: 24. Dead-end states: 6, all with fuses blown and none left.
- Obvious first move (repair `l_r3` from the west): blows `fb_W`, load 5 > 2, culprit `mill`; still winnable (throw east, open the mill, repair `fb_E`).

## What it taught us

