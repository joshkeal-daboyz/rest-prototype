# 02 · This way or that (city form) — design note

The city form of [`puzzles/02-this-way-or-that.md`](../02-this-way-or-that.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the switch**: one way or the other), the read on the circuit, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets; the capacity would be raised by the scenery the win lights, and here there is none.

## Where it stands

- `from`: `02-this-way-or-that`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block. The job sits on the block's corner where `x:2` meets `z:0`: the corner pole, the corner building's roof, and one lamp post on each street.
- Capacity **3** (unchanged), no parts, target the shrine, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `sw_1` | switch, 0 `l_home`, 1 `l_on`; set 0 | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `home` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|5,20` | 27.50, 105.00 |
| `sw_2` | switch, 0 `l_well`, 1 `l_shrine`; set 0 | roof structure `roof:5:20` (corner, on `block:0:0/b\|outer\|+z\|5,20`) | 25.60, 104.40 |
| `well` | lamp, load 1 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |
| `shrine` | lamp, load 1 | lamp post under `span:pole:z:0:hi:102.50~pole:z:0:hi:90.00` | 20.75, 96.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw_1` | 1 span: crossing | 6.50 |
| `l_home` | `sw_1` → `home` | drop | — |
| `l_on` | `sw_1` → `sw_2` | 1 span: roof (pavement) | 5.21 |
| `l_well` | `sw_2` → `well` | 1 span: roof (pavement) + lead | 14.41 |
| `l_shrine` | `sw_2` → `shrine` | 1 span: roof (pavement) + lead | 5.21 |

The fit's places are kept. `sw_2` stands on the roof structure of the home's own building (CK17, B1-Q1 "Anything"): its two lines come down off the roof to a lamp post on each street, the well's along `x:2` and the shrine's round the corner along `z:0`.

## What changed from the schematic, and why

**Nothing: capacity 3 stays 3.** Section S (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; on cards "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", "Raise (Recommended)") raises a capacity by the scenery the win lights. This job has none: `sw_1`'s pole carries only the home (a job lamp), the roof structure carries no drop (CK17e), and the building on the feed's own pole stays dark ("Dark").

## The intended read from the default camera

1. The home's windows are lit, on the block's corner beside the feed's crossing. 1 of 3. `sw_1`'s icon is on the corner pole; `sw_2`'s on the roof above the home.
2. The shrine's lamp post is round the corner on `z:0`, about 8 m from `sw_2`'s roof and 13 m from `sw_1`. Both lamp posts are dark; the wire from `sw_1` up to the roof is dead.
3. Throw `sw_1`. The home goes dark; the wire to the roof goes live and the well's post on `x:2` lights.
4. Throw `sw_2`. The well goes dark and the shrine's post lights. 1 of 3. **Win.**

## The trap

The schematic's: `sw_2`, on the roof right above the corner and nearest the shrine, is the obvious first click, and it changes nothing anyone can see, because the wire up to it is dead. Its blade moves and nothing lights. On the city the dead roof wire is the tell: follow the live wire from the feed and it turns down into the home at `sw_1`. It costs nothing; `sw_2` is then already set, and `sw_1` wins in one.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/02-this-way-or-that.json`. **Equal.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 4, exhaustive | 4, exhaustive |
| Solvable | yes | yes |
| Min clicks | 2 (sw_1, sw_2) | 2 (sw_1, sw_2) |
| Winning orders / configurations | 2 / 1 | 2 / 1 |
| Parts used | none | none |
| Feed at the win | feed 1 of 3 | **feed 1 of 3** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 4 (0.0%) | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: none. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/02-this-way-or-that.json`) and through this file's conversion, and `npm run check puzzles/city/02-this-way-or-that.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["sw_1", "sw_2"],
  "traps": [
    { "name": "throw the switch beside the shrine",
      "moves": ["sw_2"],
      "expect": { "lit": ["home"], "complete": false },
      "recover": ["sw_1"] }
  ]
}
```

## What it taught us
