# 01 · First light (city form) — design note

The city form of [`puzzles/01-first-light.md`](../01-first-light.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the breaker**), the read on the circuit, the trap (none, on purpose) and the schematic's numbers are in that note and are not repeated here. This note says where the pieces stand on the city, how the job reads in 3D, and what the scenery changed. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights. Here that is none.

## Where it stands

- `from`: `01-first-light`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, on its `+z` side: the job is the first two poles of the `x:2` pole line and the feed across `x:2` from them.
- Capacity **3** (unchanged), no parts, target the shrine, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `home` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|5,20` | 27.50, 105.00 |
| `br_1` | breaker, open | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `shrine` | lamp, load 1 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_home` | `j0` → `home` | drop | — |
| `l_br` | `j0` → `br_1` | 1 span: along | 11.67 |
| `l_shrine` | `br_1` → `shrine` | lead | — |

The fit's places are kept. The home is a building on `j0`'s pole; the shrine is a lamp post under the span from `j0` to `br_1`, fed by its underground lead from `br_1`.

## What changed from the schematic, and why

**Nothing: capacity 3 stays 3.** Section S (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; on cards "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", "Raise (Recommended)") raises a capacity by the scenery the win lights. This job has none: `j0`'s pole has one building, the home, which is a job lamp; `br_1`'s pole has none; the building on the feed's own pole stays dark ("Dark").

## The intended read from the default camera

The camera opens on `block:0:0` and its four streets (E3); the overlay shows each piece's icon, no lines (E4).

1. The home's windows are lit (L1), on the corner of the block beside the feed's crossing. The HUD reads 1 of 3.
2. `br_1`'s icon stands on the next pole east along `x:2`, 11.7 m on. The wire from `j0` to it is live and stops there: an open breaker, nothing broken. The shrine's lamp post, halfway between the two poles, is dark and carries the target mark.
3. Click `br_1`. The lamp post lights. 2 of 3. **Win.**

## The trap

None, as the schematic. The one wrong read is to look for a fault; there is none, and the live wire stopping at the breaker's icon is the lesson.

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/01-first-light.json`. **Equal.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 2, exhaustive | 2, exhaustive |
| Solvable | yes | yes |
| Min clicks | 1 (br_1) | 1 (br_1) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | none | none |
| Feed at the win | feed 2 of 3 | **feed 2 of 3** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 2 (0.0%) | 0 of 2 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read, made executable. It replays the same on the schematic (`puzzles/01-first-light.json`) and through this file's conversion, and `npm run check puzzles/city/01-first-light.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_1"]
}
```

## What it taught us
