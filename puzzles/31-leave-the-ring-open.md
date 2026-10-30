# 31 · Leave the ring open — design note

Rung 31. The square's ring carries the gate, the shrine and the well, and it can be fed from both ends: the west box has blown, the east feeder is switched off with its switch still on the mill, and there is a break in the ring between the shrine and the well. Enoch has two fuses and one wire. The priests want all three lamps.

**Element under test:** the ring as a partition, and which break gets the one wire. Two breaks are on the map. The one that shows first (in the ring) is the one to *leave*: an open ring splits the load between two boxes, and a mended ring puts it all on one. The wire belongs to the east feeder, which shows last.

## The map

18 nodes, 18 lines, 3 faults. Feed capacity 4. Parts: fuse, fuse, wire.

| Feeder | Controls | Reaches |
| --- | --- | --- |
| West | `fb_W` ≤3 (**blown**) | `pW` |
| East | `br_E` (**open**) → `fb_E` ≤2 → `sw_E`: 0 → `mill` 2 (start), 1 → `l_e` (**damaged**, hidden) → `pE` |

Ring: `pW` – `p1` – `p2` – `pE`, with `l_r2` (`p1`–`p2`) **damaged**. Lamps: `gate` 1 (target) and `lane` 1 (behind `br_ln`, closed) on `pW`; `shrine` 2 (target) on `p1`; `well` 1 (target) on `p2`. Home: `br_hm` (closed) → `home` 1 (priority).

Targets: gate 1 + shrine 2 + well 1 = 4, exactly the feed. The west box (3) can carry gate + shrine; the east box (2) can carry the well. Nothing carries all three.

## The intended read

1. The map opens at 1 of 4: the home. `fb_W` buzzes. Behind it: gate 1, lane 1, shrine 2 = 4 against 3. Open `br_ln`.
2. Repair `fb_W`. Gate and shrine light, `fb_W` 3 of 3, and the current runs to a **spark** on `l_r2`. The well is past it. Hold the wire: mending the ring would put the well on a full box.
3. East: throw `sw_E` off the mill (switch before breaker), close `br_E`. Pulses run to a **spark** on `l_e`, the east feeder.
4. Repair `l_e`. The well lights from the east, `fb_E` 1 of 2. Feed 4 + home 1 = 5 of 4, **brownout**.
5. Open `br_hm`. 4 of 4. **Win.** The ring stays broken: the break is what keeps the west box at 3.

## The trap

The ring break is the second fault the player sees and the natural one to mend: it sits between two lit targets and the dark one, and Enoch has a wire. Mending it puts the well on the west box: 4 against 3, and **`fb_W` blows** (culprit `well`). Readable: the ✕, the shock running from the box round to the well, and the bar that was full before the click. Not recoverable with parts: the ring is now whole, so whichever end feeds it carries all three targets (4 against 3 or 2), and the wire for the east feeder is spent. Undo is the way back, and the state says why: a ✕ on a box with a full bar and *needs wire, have 0* on the east feeder.

The softer traps from earlier rungs are here too, each covered by the spare fuse. Repairing `fb_W` first with the lane on blows it (4 against 3, culprit `shrine`); open `br_ln` and repair again. Closing `br_E` with the switch on the mill doesn't blow (mill 2 of 2), but it lights the mill and hides nothing.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (a closed spur, lamp loads against the rating), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- Whether the player can hold a part back from a fault they can afford to fix, because fixing it is wrong: restraint as a puzzle rule (*restraint is the virtue*).
- Whether a ring break reads as a partition between two fuse boxes rather than as damage.
- The toolkit so far at once: a shared fuse (rung 13), switch before breaker (27), which break gets the wire (30), a ring (14), shedding for capacity (07).

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 18. Lines: 18. Faults: 3 (`f1` blown `fb_W`, readable; `f2` `l_r2`, behind `f1`; `f3` `l_e`, behind `br_E` and `sw_E`). Readable at start: 1 of 3.
- Parts given: 2 fuses, 1 wire. Parts needed: 1 fuse, 1 wire (2 fuses after the lane trap).
- Fewest actions to win: 6 (open `br_ln`, repair `fb_W`, throw `sw_E`, close `br_E`, repair `l_e`, open `br_hm`).
- Final load: 4 of 4 (gate, shrine, well). `fb_W` 3 of 3, `fb_E` 1 of 2. `l_r2` left broken.
- Winning control settings: 1 of 16 (`br_ln` open, `br_E` closed, `sw_E` to the ring, `br_hm` open).
- Reachable states: 160. Dead-end states: 64 (the ring mended, or both fuses blown).
- Obvious first move (repair `fb_W` with the lane on): blows, load 4 > 3, culprit `shrine`; still winnable. Traced: mending `l_r2` after a good `fb_W` repair blows `fb_W` (load 4 > 3, culprit `well`) and leaves `l_e` at *needs wire, have 0*: dead end, Undo recovers.

## What it taught us

