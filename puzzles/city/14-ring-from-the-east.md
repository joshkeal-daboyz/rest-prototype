# 14 · Ring from the east (city form) — design note

The city form of [`puzzles/14-ring-from-the-east.md`](../14-ring-from-the-east.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the ring circuit with a switch**: the same break looks different from each end, and a closed ring hangs on one feeder), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity and `fb_E`'s rating raised by the scenery the win lights. `fb_W`'s rating is unchanged.

## Where it stands

- `from`: `14-ring-from-the-east`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:4`, on the city's west edge, with roof structures and buildings on `block:0:2` across `x:4` (north) and on the blocks across `x:7` and `z:3` (CK14, B1-Q5 "Neighbouring blocks too"). The feed comes across `x:4` to `j0` on the block's north-west corner; `sw_r` is the next pole, on `z:0` (the west side).
  - **West:** `fb_W`, `pW` (the gate) and `p1` (the shrine's lamp post) down the west side, then `p2` on the south-west corner roof.
  - **The ring's far side, `l_r3`:** from `p2`'s roof over `x:7`, east along the far side of `x:7`, round the south-east corner over the roofs, and back west along `x:4` to `p3`, a roof structure on the block's north side (216 m, 11 spans). The well is across `x:4` from `p3`.
  - **East:** `fb_E` on the north-west corner roof, over `x:4` to `pE` (a roof on `block:0:2`), which closes the ring to `p3` and feeds the mill through `br_mill`.
- Capacity **11** (the schematic's 3, raised by 8); ratings `fb_W` **2** (unchanged), `fb_E` **10** (3, raised by 7); a wire and a fuse; target the shrine and the well, priority the gate, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:4:lo:27.50` (crossing, block:0:2, +z side) | 27.50, 169.25 |
| `j0` | junction | pole `pole:x:4:hi:27.50` (end, block:0:4, -z side) | 27.50, 185.75 |
| `sw_r` | switch, 0 `l_w`, 1 `l_e`; set 0 | pole `pole:z:0:hi:192.50` (end, block:0:4, -x side) | 20.75, 192.50 |
| `fb_W` | fuse box, rating 2 | pole `pole:z:0:hi:205.00` (slot, block:0:4, -x side) | 20.75, 205.00 |
| `pW` | junction | pole `pole:z:0:hi:217.50` (slot, block:0:4, -x side) | 20.75, 217.50 |
| `p1` | junction | pole `pole:z:0:hi:230.00` (slot, block:0:4, -x side) | 20.75, 230.00 |
| `p2` | junction | roof structure `roof:5:48` (corner, on `block:0:4/a\|outer\|-x\|5,46`) | 25.60, 244.40 |
| `p3` | junction | roof structure `roof:12:38` (mid, on `block:0:4/b\|outer\|-z\|12,38`) | 62.50, 190.60 |
| `fb_E` | fuse box, rating 10 | roof structure `roof:5:38` (corner, on `block:0:4/a\|outer\|-x\|5,38`) | 25.60, 190.60 |
| `pE` | junction | roof structure `roof:10:32` (mid, on `block:0:2/a\|outer\|+z\|9,32`) | 52.50, 164.40 |
| `gate` | lamp, load 1 | building `block:0:4/a\|outer\|-x\|5,42` | 25.00, 217.50 |
| `shrine` | lamp, load 1 | lamp post under `span:pole:z:0:hi:217.50~pole:z:0:hi:230.00` | 20.75, 223.75 |
| `well` | lamp, load 1 | building `block:0:2/a\|outer\|+z\|9,32`, its drop across `x:4` | 52.50, 165.00 |
| `br_mill` | breaker, closed | roof structure `roof:16:38` (mid, on `block:0:4/b\|outer\|-z\|16,38`) | 82.50, 190.60 |
| `mill` | lamp, load 2 | roof structure `roof:16:32` (mid, on `block:0:2/b\|outer\|+z\|14,32`) | 82.50, 164.40 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_sw` | `j0` → `sw_r` | 1 span: corner | 9.55 |
| `l_w` | `sw_r` → `fb_W` | 1 span: along | 12.50 |
| `l_w2` | `fb_W` → `pW` | 1 span: along | 12.50 |
| `l_e` | `sw_r` → `fb_E` | 1 span: roof (pavement) | 5.21 |
| `l_e2` | `fb_E` → `pE` | 1 span: roof (street) | 37.55 |
| `l_r1` | `pW` → `p1` | 1 span: along | 12.50 |
| `l_r2` | `p1` → `p2` | 1 span: roof (pavement) | 15.19 |
| `l_r3` | `p2` → `p3` | 11 spans: 4 roof (street), 4 along, 3 roof (pavement). **Fault `f1` cuts span 1 of 11, `span:roof:5:48~roof:9:54`** | 215.59 |
| `l_r4` | `p3` → `pE` | 1 span: roof (street) | 28.04 |
| `l_gate` | `pW` → `gate` | drop | — |
| `l_shrine` | `p1` → `shrine` | lead | — |
| `l_well` | `p3` → `well` | 1 span: roof (pavement) + drop | 12.63 |
| `l_mill` | `pE` → `br_mill` | 1 span: roof (street) | 39.83 |
| `l_mill2` | `br_mill` → `mill` | 1 span: roof (street) | 26.20 |

The fit's places are kept, and so is its cut, now named in the file: **`f1` cuts span 1 of `l_r3`'s 11**, `span:roof:5:48~roof:9:54`, the roof span from `p2`'s corner roof over `x:7`. The cut has to be on span 1 or 2, before the first of `l_r3`'s carriers with a scenery drop, so that from the west the current stops short of every one of them. The designer replayed all 11 places for the cut (raised each time): with it on span 3 or later, the carriers before it light from the west through `fb_W` (rating 2, already full with the gate and the shrine) and `fb_W` blows at the start. Of the two that play the same, span 1 is the one in plain view, over `x:7` at the district's corner. It also reads well: from the west the break is at the corner the current has just turned; from the east the current comes 216 m round the block to the other side of the same span.

## What changed from the schematic, and why

Two numbers changed: **the capacity, 3 to 11, and `fb_E`'s rating, 3 to 10.** `fb_W`'s 2 is unchanged.

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights 8 scenery buildings, so 3 + 8 = 11. Seven of them are on the ring, carried by `fb_E` at the win, so 3 + 7 = 10; the eighth is on `sw_r`'s pole, upstream of both fuses.
- **The ring's buildings** (6 on `l_r3`'s carriers past the cut, 1 on `l_well`'s carrier) are dark at the start, because the cut is on the ring's first span from the west. `fb_W` opens full, 2 of 2, as the schematic.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `l_r3~h2~s` | carrier of `l_r3` | 6 | 5 / 1 | no | yes |
| `l_sw~h2~s` | node pole: `sw_r` | 1 | 1 / 0 | yes | yes |
| `l_well~h1~s` | carrier of `l_well` | 1 | 1 / 0 | no | yes |
| | | **8** | **7 / 1** | | |

Buildings: `l_r3~h2~s`: `block:0:2/b|outer|+z|14,32`, `block:0:4/b|outer|-z|12,38`, `block:0:4/b|outer|-z|14,38`, `block:0:4/b|outer|-z|16,38`, `block:0:4/b|outer|+z|12,48`, `block:0:4/b|outer|+z|16,48`; `l_sw~h2~s`: `block:0:4/a|outer|-x|5,38`; `l_well~h1~s`: `block:0:4/b|outer|-z|9,38`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 3 of 11; `fb_W` 2, `fb_E` 0; schematic feed 2 of 3; `fb_W` 2, `fb_E` 0
- win (br_mill, sw_r, repair:l_r3): city feed 11 of 11; `fb_W` 0, `fb_E` 10; schematic feed 3 of 3; `fb_W` 0, `fb_E` 3
- trap "mend the spark from the west" (repair:l_r3): city feed 1 of 11; `fb_W` 0, `fb_E` 0; schematic feed 0 of 3; `fb_W` 0, `fb_E` 0

## The intended read from the default camera

1. The view opens fed from the west: the gate and the shrine's lamp post are lit down the block's west side, `fb_W`'s bar full (2 of 2). The current runs on to the south-west corner roof and stops at a **break icon** with sparks, on the roof span over `x:7`. The well, the mill and the east end are dark.
2. Count the ring whole: gate 1, shrine 1, well 1, mill 2. Neither box carries all of it; the east carries the three targets' worth if the mill is off.
3. Open `br_mill` (on the block's north side). Throw `sw_r` east: the current goes up onto the corner roof through `fb_E`, over `x:4` and back; the well lights from the east, and the break now sparks from its other end, the current having come round the block.
4. Repair `l_r3`. The ring closes and the east carries the gate, the shrine and the well: `fb_E` 10 of 10, the feed 11 of 11. **Win.**

## The trap

The schematic's: the break is visible from the start, on the lit side, and Enoch has the wire. Repairing it from the west closes the ring onto `fb_W`, and **`fb_W` blows** (12 against 2). Recoverable without Undo: throw `sw_r` east (which blows `fb_E` too, 13 against 10, with the mill still on), open `br_mill`, and repair `fb_E` with the fuse. Spending the fuse on `fb_W` instead and then blowing `fb_E` is the one way to get stuck; Undo clears it.

To watch when Josh plays it: the grid names the blow's culprit as the largest lamp newly under the fuse. In the schematic that is the mill; here it is the hidden lamp for the 6 buildings on `l_r3`'s carriers (load 6). The 3D view draws no shock to a culprit today and the notice gives only the load and the rating, so nothing on screen changes; if a shock path is drawn in 3D later, it would run to a scenery building, not the mill.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/14-ring-from-the-east.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 24, exhaustive | 24, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (sw_r, br_mill, repair:l_r3) | 3 (sw_r, br_mill, repair:l_r3) |
| Winning orders / configurations | 4 / 2 | 4 / 2 |
| Parts used | wire | wire |
| Feed at the win | feed 3 of 3 | **feed 11 of 11** |
| Fuses that blow (shortest win / any move) | fb_W / fb_E, fb_W | fb_W / fb_E, fb_W |
| Dead-end states | 6 of 24 (25.0%) | 6 of 24 (25.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: the wire (and the fuse after the trap), as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, with the note's own recovery (throw east, open the mill, repair `fb_E`), made executable. It replays the same on the schematic (`puzzles/14-ring-from-the-east.json`) and through this file's conversion, and `npm run check puzzles/city/14-ring-from-the-east.city.json` passes.

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
