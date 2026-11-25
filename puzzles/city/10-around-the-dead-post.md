# 10 · Around the dead post (city form) — design note

The city form of [`puzzles/10-around-the-dead-post.md`](../10-around-the-dead-post.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the reroute**, at early-ladder strength: the dead junction on the straight line, the long way round, and a brownout from the repair. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `10-around-the-dead-post`. City: 6 x 6 seed 1, one-way on.
- District: `block:6:0`. `block:6:0`'s `-x` side, down `z:6` from the corner by the feed's crossing over `x:1`. The straight way runs down `z:6`; the long way goes over `z:6` to a roof on `block:5:0` and back to the block's far corner. The shrine is across `z:6`, on `block:5:0`.
- Capacity **6**. Target: `shrine`. Parts: wire.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:hi:272.50` (end, block:6:1, -z side) | 272.50, 85.75 |
| `j0` | junction | pole `pole:x:1:lo:272.50` (crossing, block:6:0, +z side) | 272.50, 69.25 |
| `home` | lamp, load 1 | building `block:6:0/a\|outer\|+z\|55,12`, by its drop from `pole:x:1:lo:272.50` | 277.50, 65.00 |
| `sw_1` | switch, 0 `l_short`, 1 `l_long`; set 0 | pole `pole:z:6:hi:62.50` (end, block:6:0, -x side) | 265.75, 62.50 |
| `j_dead` | junction | pole `pole:z:6:hi:50.83` (slot, block:6:0, -x side) | 265.75, 50.83 |
| `br_long` | breaker, open | roof structure `roof:48:10` (mid, on `block:5:0\|outer\|+x\|48,9`) | 244.40, 52.50 |
| `j_mid` | junction | pole `pole:z:6:hi:27.50` (end, block:6:0, -x side) | 265.75, 27.50 |
| `br_mill` | breaker, closed | pole `pole:x:0:hi:272.50` (end, block:6:0, -z side) | 272.50, 20.75 |
| `mill` | lamp, load 2 | building `block:6:0/a\|outer\|-z\|55,5`, by its drop from `pole:x:0:hi:283.33` | 282.50, 25.00 |
| `j_post` | junction | pole `pole:z:6:hi:39.17` (slot, block:6:0, -x side) | 265.75, 39.17 |
| `shrine` | lamp, load 1, **target** | building `block:5:0\|outer\|+x\|48,7`, by its drop from `pole:z:6:hi:39.17` across `z:6` | 245.00, 37.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_home` | `j0` → `home` | drop | — |
| `l_sw` | `j0` → `sw_1` | 1 span: corner | 9.55 |
| `l_short` | `sw_1` → `j_dead` | 1 span: along | 11.67 |
| `l_post` | `j_dead` → `j_post` | 1 span: along | 11.67 |
| `l_long` | `sw_1` → `br_long` | 1 span: roof (street) | 23.58 |
| `l_long2` | `br_long` → `j_mid` | 1 span: roof (street) | 32.88 |
| `l_long3` | `j_mid` → `j_post` | 1 span: along | 11.67 |
| `l_m0` | `j_mid` → `br_mill` | 1 span: corner | 9.55 |
| `l_mill` | `br_mill` → `mill` | 1 span: along + drop | 10.83 |
| `l_shrine` | `j_post` → `shrine` | drop | — |

## What changed

- `home` stays a building (re-laid with the district).
- **`mill` moved from a lamp post to a building**, fed by its drop.
- `shrine` (a target) stays a building (re-laid with the district).
- **District:** P2a laid it on `block:0:0`; now `block:6:0` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 3 becomes capacity 6. The job's poles carry 4 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens at 2 of 6, the home lit on the corner by the feed. `sw_1`, round the corner on `z:6`, sends the current one pole on to `j_dead` and it stops: in, none out, no fuse. A **dead junction**, *needs wire × 2*. Enoch has one. **The shrine is the building across `z:6` from `j_post`, the pole after `j_dead`.**
2. Throw `sw_1`. The current goes over `z:6` to `br_long` on a roof of `block:5:0` and stops: open, not broken.
3. Close `br_long`. The current runs back over `z:6` towards `j_mid` at the block's far corner and stops at a **break icon** with sparks on that span.
4. Repair it. The long way goes live: from `j_mid` round the corner to the mill (2), and one span back up `z:6` to `j_post`, where the shrine (1) lights across the street. **7 of 6, brownout.**
5. Open `br_mill`, round the corner on `x:0`. 5 of 6. **Win.** (`br_mill` can be opened at any point.)

## The trap

The schematic's: the dead junction is the first fault the player can read, on the straight way to the shrine, and its prompt says *needs wire × 2* and spends nothing. The switch before it is pointed away. Then the reroute ends in a brownout, which looks as if the repair broke something; the HUD says 7 of 6 and the mill is the branch to shed. The one wire can only be spent on the long way's break, so it can't be wasted.

## To watch when Josh plays it

The long way is a ring: it crosses `z:6` out and back, passes `j_post`'s pole at the corner and comes back one span to it, so the shrine is fed from the far side (as the schematic has it). W1 reads a ring line from its own first structure, so it passes; watch whether the one span back up `z:6` reads as "round the dead post".

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 2 of 6; schematic feed 1 of 3
- win (sw_1, br_long, br_mill, repair:l_long2): city feed 5 of 6; schematic feed 2 of 3
- trap "the repair browns it out" (sw_1, br_long, repair:l_long2): city feed 7 of 6 (brownout); schematic feed 4 of 3 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/10-around-the-dead-post.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 4 (sw_1, br_long, br_mill, repair:l_long2) | 4 (sw_1, br_long, br_mill, repair:l_long2) |
| Winning orders / configurations | 8 / 1 | 8 / 1 |
| Parts used | wire | wire |
| Feed at that win | feed 2 of 3 | **feed 5 of 6** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: wire. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/10-around-the-dead-post.json` and through this file's conversion, and `npm run check puzzles/city/10-around-the-dead-post.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["sw_1", "br_long", "br_mill", "repair:l_long2"],
  "traps": [
    { "name": "the repair browns it out",
      "moves": ["sw_1", "br_long", "repair:l_long2"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_mill"] }
  ]
}
```

## What it taught us
