# 13 · One box, three lamps (city form) — design note

The city form of [`puzzles/13-one-box-three-lamps.md`](../13-one-box-three-lamps.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the shared fuse**: count the box's lamps before spending a fuse), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets; the capacity and rating would be raised by the scenery the win lights, and here there is none.

## Where it stands

- `from`: `13-one-box-three-lamps`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, at its south-west corner. `j0` is the corner pole (the porch is its building); `fb_A` one pole east on `x:2`, then `j1` (the shrine on the district's side, the well across `x:2`), then `br_lane` (the lane); `br_yard` round the corner on `z:0` (the yard's lamp post).
- Capacity **3** and `fb_A` rating **2** (both unchanged), 2 fuses, target the shrine and the well, priority the lane, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `fb_A` | fuse box, rating 2 | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `j1` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `shrine` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |
| `well` | lamp, load 1 | building `block:0:2/a\|outer\|-z\|8,24`, its drop across `x:2` | 52.50, 120.00 |
| `br_lane` | breaker, closed | pole `pole:x:2:lo:62.50` (slot, block:0:0, +z side) | 62.50, 109.25 |
| `lane` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|12,20` | 62.50, 105.00 |
| `br_yard` | breaker, closed | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `yard` | lamp, load 2 | lamp post under `span:pole:z:0:hi:102.50~pole:z:0:hi:90.00` | 20.75, 96.25 |
| `porch` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|5,20` | 27.50, 105.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_a` | `j0` → `fb_A` | 1 span: along | 11.67 |
| `l_a2` | `fb_A` → `j1` | 1 span: along | 11.67 |
| `l_shrine` | `j1` → `shrine` | drop | — |
| `l_well` | `j1` → `well` | drop | — |
| `l_lane` | `j1` → `br_lane` | 1 span: along | 11.67 |
| `l_lane2` | `br_lane` → `lane` | drop | — |
| `l_yard` | `j0` → `br_yard` | 1 span: corner | 9.55 |
| `l_yard2` | `br_yard` → `yard` | lead | — |
| `l_porch` | `j0` → `porch` | drop | — |

The fit's places are kept.

## What changed from the schematic, and why

**Nothing: capacity 3 and `fb_A`'s rating 2 stay as they are.** Section S (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; on cards "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", "Raise (Recommended)") raises the numbers by the scenery the win lights. This job has none: every building that drops from its poles is one of its lamps (the porch on `j0`'s, the shrine and the well on `j1`'s, the lane on `br_lane`'s), the other poles carry none, and the building on the feed's own pole stays dark ("Dark"). So both limits are exactly the schematic's, and the HUD reads as its note says.

## The intended read from the default camera

1. The view opens at 3 of 3: the porch (the corner building) and the yard's lamp post (round the corner on `z:0`) are lit. `fb_A`, one pole east on `x:2`, shows the blown ✕: in, none out. Behind it, three lamps of 1: the shrine and the well on the next pole, the lane one further. The box is rated 2.
2. Count the box: three lamps, rating 2. One must go dark, and it isn't a target: open `br_lane`.
3. Count the feed: shrine, well and porch are 3, and the yard's 2 makes 5. Open `br_yard`.
4. Repair `fb_A`. The shrine and the well light; `fb_A` 2 of 2, the feed 3 of 3. **Win.**

## The trap

The schematic's: repair the blown fuse you can see first. With the lane still on, the box carries 3 against 2 and **blows again at once**. Readable (the ✕ returns, the notice gives 3 against 2) and recoverable with the second fuse once the lane is open; the brownout that follows (5 of 3) says the yard must go too. Only two premature repairs in a row leave the map stuck, and Undo clears it.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/13-one-box-three-lamps.json`. **Equal.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (br_lane, br_yard, repair:fb_A) | 3 (br_lane, br_yard, repair:fb_A) |
| Winning orders / configurations | 3 / 1 | 3 / 1 |
| Parts used | fuse | fuse |
| Feed at the win | feed 3 of 3 | **feed 3 of 3** |
| Fuses that blow (shortest win / any move) | none / fb_A | none / fb_A |
| Dead-end states | 4 of 16 (25.0%) | 4 of 16 (25.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: 1 fuse (2 after the trap), as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/13-one-box-three-lamps.json`) and through this file's conversion, and `npm run check puzzles/city/13-one-box-three-lamps.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_lane", "br_yard", "repair:fb_A"],
  "traps": [
    { "name": "repair the fuse you can see",
      "moves": ["repair:fb_A"],
      "expect": { "blown": ["fb_A"], "complete": false },
      "recover": ["br_lane", "br_yard", "repair:fb_A"] }
  ]
}
```

## What it taught us
