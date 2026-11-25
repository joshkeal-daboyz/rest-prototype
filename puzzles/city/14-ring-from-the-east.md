# 14 · Ring from the east (city form) — design note

The city form of [`puzzles/14-ring-from-the-east.md`](../14-ring-from-the-east.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the ring circuit with a switch**: the same break looks different from each end, and a closed ring hangs on one feeder. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `14-ring-from-the-east`. City: 6 x 6 seed 1, one-way on.
- District: `block:7:5`. `block:7:5`: the ring runs down its `+x` side on `z:8` and back along `x:8`. `fb_E` stands on a roof across `z:8` (on `block:8:5`); the mill's breaker on a roof across `x:8`.
- Capacity **8**; `fb_W` rated **3**, `fb_E` rated **6**. Target: `shrine`, `well`; priority: `gate`. Parts: wire, fuse.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:5:lo:402.50` (end, block:7:1, +z side) | 402.50, 174.25 |
| `j0` | junction | pole `pole:x:5:hi:402.50` (crossing, block:7:5, -z side) | 402.50, 190.75 |
| `sw_r` | switch, 0 `l_w`, 1 `l_e`; set 0 | pole `pole:z:8:lo:197.50` (end, block:7:5, +x side) | 409.25, 197.50 |
| `fb_W` | fusebox, rating 3 | pole `pole:z:8:lo:208.75` (slot, block:7:5, +x side) | 409.25, 208.75 |
| `pW` | junction | pole `pole:z:8:lo:214.50` (slot, block:7:5, +x side) | 409.25, 214.50 |
| `p1` | junction | pole `pole:z:8:lo:231.25` (slot, block:7:5, +x side) | 409.25, 231.25 |
| `p2` | junction | roof structure `roof:80:48` (corner, on `block:7:5\|outer\|+z\|77,48`) | 404.40, 244.40 |
| `p3` | junction | pole `pole:x:8:lo:390.83` (slot, block:7:5, +z side) | 390.83, 249.25 |
| `fb_E` | fusebox, rating 6 | roof structure `roof:85:41` (mid, on `block:8:5\|outer\|-x\|85,39`) | 425.60, 207.50 |
| `pE` | junction | pole `pole:x:8:lo:402.50` (end, block:7:5, +z side) | 402.50, 249.25 |
| `gate` | lamp, load 1 | building `block:8:5\|outer\|-x\|85,43`, by its drop from `pole:z:8:lo:214.50` across `z:8` | 425.00, 217.50 |
| `shrine` | lamp, load 1, **target** | building `block:7:5\|outer\|+x\|80,45`, by its drop from `pole:z:8:lo:231.25` | 405.00, 232.50 |
| `well` | lamp, load 1, **target** | building `block:7:5\|outer\|+z\|74,48`, by its drop from `pole:x:8:lo:379.17` | 377.50, 245.00 |
| `br_mill` | breaker, closed | roof structure `roof:75:54` (mid, on `block:7:7\|outer\|-z\|74,54`) | 377.50, 270.60 |
| `mill` | lamp, load 2 | building `block:7:5\|outer\|-x\|73,47`, by its drop from `pole:z:7:hi:242.50` | 365.00, 242.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_sw` | `j0` → `sw_r` | 1 span: corner | 9.55 |
| `l_w` | `sw_r` → `fb_W` | 1 span: along | 11.25 |
| `l_w2` | `fb_W` → `pW` | 1 span: along | 5.75 |
| `l_e` | `sw_r` → `fb_E` | 1 span: roof (street) | 19.17 |
| `l_e2` | `fb_E` → `pE` | 2 spans: roof (street), corner | 48.18 |
| `l_r1` | `pW` → `p1` | 1 span: along | 16.75 |
| `l_r2` | `p1` → `p2` | 1 span: roof (pavement) | 14.02 |
| `l_r3` | `p2` → `p3` | 1 span: roof (pavement) | 14.41 |
| `l_r4` | `p3` → `pE` | 1 span: along | 11.67 |
| `l_gate` | `pW` → `gate` | drop | — |
| `l_shrine` | `p1` → `shrine` | drop | — |
| `l_well` | `p3` → `well` | 1 span: along + drop | 11.67 |
| `l_mill` | `pE` → `br_mill` | 1 span: roof (street) | 32.88 |
| `l_mill2` | `br_mill` → `mill` | 2 spans: roof (street), corner + drop | 33.12 |

## What changed

- `gate` stays a building (re-laid with the district).
- **`shrine` (a target) moved from a lamp post to a building**, fed by its drop.
- `well` (a target) stays a building (re-laid with the district).
- **`mill` moved from a roof structure to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:4`; now `block:7:5` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 3, fb_W rating 2, fb_E rating 3 becomes capacity 8, fb_W rating 3, fb_E rating 6. The job's poles carry 5 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens fed from the west: the gate (across `z:8` from `pW`) and the shrine (on `p1`'s pole) are lit down the block's `+x` side, `fb_W`'s bar full (3 of 3). The current runs on to the corner roof `p2` and stops at a **break icon** with sparks, on the roof span to `p3`. **The well, the building on `x:8` by `p3`, is dark**, and so are the mill and the east side.
2. Count the ring whole: gate 1, shrine 1, well 1, mill 2. Neither box carries all of it; the east carries the three targets if the mill is off.
3. Open `br_mill` (on the roof across `x:8`). Throw `sw_r` east: the current goes over `z:8` through `fb_E` and back round the corner to `pE`; the well lights from the east, and the break now sparks from its other end.
4. Repair `l_r3`. The ring closes and the east carries the gate, the shrine and the well: `fb_E` 6 of 6, the feed 8 of 8. **Win.**

## The trap

The schematic's: the break is visible from the start, on the lit side, and Enoch has the wire. Repairing it from the west closes the ring onto `fb_W`, and **`fb_W` blows**. Recoverable without Undo: throw `sw_r` east (which blows `fb_E` too, with the mill still on), open `br_mill`, and repair `fb_E` with the fuse. Spending the fuse on `fb_W` instead and then blowing `fb_E` is the one way to get stuck; Undo clears it.

## To watch when Josh plays it

The mill's run crosses `x:8` twice (to `br_mill`'s roof on `block:7:7` and back to the mill on `block:7:5`'s `-x` side).

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 5 of 8; `fb_W` 3 of 3, `fb_E` 0 of 6; schematic feed 2 of 3; `fb_W` 2 of 2, `fb_E` 0 of 3
- win (br_mill, sw_r, repair:l_r3): city feed 8 of 8; `fb_W` 1 of 3, `fb_E` 6 of 6; schematic feed 3 of 3; `fb_W` 0 of 2, `fb_E` 3 of 3
- trap "mend the spark from the west" (repair:l_r3): city feed 2 of 8; `fb_W` 0 of 3, `fb_E` 0 of 6; blown `fb_W`; schematic feed 0 of 3; `fb_W` 0 of 2, `fb_E` 0 of 3; blown `fb_W`

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/14-ring-from-the-east.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 24, exhaustive | 24, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (sw_r, br_mill, repair:l_r3) | 3 (sw_r, br_mill, repair:l_r3) |
| Winning orders / configurations | 4 / 2 | 4 / 2 |
| Parts used | wire | wire |
| Feed at that win | feed 3 of 3 | **feed 8 of 8** |
| Fuses that blow (shortest win / any move) | fb_W / fb_E, fb_W | fb_W / fb_E, fb_W |
| Dead-end states | 6 of 24 (25.0%) | 6 of 24 (25.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: wire, fuse. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/14-ring-from-the-east.json` and through this file's conversion, and `npm run check puzzles/city/14-ring-from-the-east.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_mill", "sw_r", "repair:l_r3"],
  "traps": [
    { "name": "mend the spark from the west",
      "moves": ["repair:l_r3"],
      "expect": { "blown": ["fb_W"], "complete": false },
      "recover": ["sw_r", "br_mill", "repair:fb_E"] }
  ]
}
```

## What it taught us
