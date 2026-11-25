# 06 · The spark (city form) — design note

The city form of [`puzzles/06-the-spark.md`](../06-the-spark.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the damaged cable**: current runs up to a spark; faults are read by current), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights.

## Where it stands

- `from`: `06-the-spark`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, at its south-west corner. `br_main` is the corner pole; `sw_1` stands on the corner building's roof structure; one lamp post on each street (the home on `x:2`, the shrine on `z:0`).
- Capacity **4** (the schematic's 3, raised by 1), 1 wire, target the shrine, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `br_main` | breaker, open | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `sw_1` | switch, 0 `l_home`, 1 `l_lane`; set 0 | roof structure `roof:5:20` (corner, on `block:0:0/b\|outer\|+z\|5,20`) | 25.60, 104.40 |
| `home` | lamp, load 1 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |
| `shrine` | lamp, load 1 | lamp post under `span:pole:z:0:hi:102.50~pole:z:0:hi:90.00` | 20.75, 96.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 6.50 |
| `l_sw` | `br_main` → `sw_1` | 1 span: roof (pavement) | 5.21 |
| `l_home` | `sw_1` → `home` | 1 span: roof (pavement) + lead | 14.41 |
| `l_lane` | `sw_1` → `shrine` | 1 span: roof (pavement) + lead. **Fault `f1` cuts span 1 of 1, `span:pole:z:0:hi:102.50~roof:5:20`** | 5.21 |

The fit's places are kept. **The cut** (`f1`) is on `l_lane`'s one span, the 5.2 m roof span from `sw_1`'s roof down to the `z:0` pole whose lead feeds the shrine's post; the file names it (`span`), so the choice is recorded rather than left to "the first". There is no other span to choose.

## What changed from the schematic, and why

One thing changed: **the capacity, 3 to 4.**

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights one scenery building, so 3 + 1 = 4.
- **The one scenery building** drops from `br_main`'s pole. A breaker's building hangs on the line that feeds it, on the feed's side (S1's rule), so it is lit from the start, open breaker or not: the HUD opens at 1 of 4 where the schematic opened at 0 of 3. No job lamp is lit at the start, as the schematic.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `l_feed~h2~s` | node pole: `br_main` | 1 | 1 / 0 | yes | yes |
| | | **1** | **1 / 0** | | |

Building: `l_feed~h2~s`: `block:0:0/b|outer|+z|5,20`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 1 of 4; schematic feed 0 of 3
- win (br_main, sw_1, repair:l_lane): city feed 2 of 4; schematic feed 1 of 3
- trap "no spark in sight yet" (br_main): city feed 2 of 4; schematic feed 1 of 3

## The intended read from the default camera

1. The view opens with no job lamp lit. `br_main`'s icon is on the corner pole by the feed's crossing; the wire past it is dead. No break icon shows: no fault can be seen yet.
2. Close `br_main`. The wire runs up to `sw_1` on the roof and down to the home's lamp post on `x:2`, which lights. Still no break icon.
3. Throw `sw_1`. The home goes dark; the short roof span down to `z:0` goes live and a **break icon** and sparks appear on it, at the corner. One wire.
4. Click the break. The wire is spent and the shrine's lamp post on `z:0` lights. 2 of 4. **Win.**

## The trap

The schematic's: the player holds a wire and can see the shrine, so the instinct is to fix the dark line to it. It is dead, so there is nothing to click: no break icon is drawn while the fault is unreadable (Josh: "Only when readable"). Faults are read by current; bring power to the spark first. It costs nothing.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/06-the-spark.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 5, exhaustive | 5, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (br_main, sw_1, repair:l_lane) | 3 (br_main, sw_1, repair:l_lane) |
| Winning orders / configurations | 2 / 1 | 2 / 1 |
| Parts used | wire | wire |
| Feed at the win | feed 1 of 3 | **feed 2 of 4** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 5 (0.0%) | 0 of 5 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: 1 wire, as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/06-the-spark.json`) and through this file's conversion, and `npm run check puzzles/city/06-the-spark.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_main", "sw_1", "repair:l_lane"],
  "traps": [
    { "name": "no spark in sight yet",
      "moves": ["br_main"],
      "expect": { "readable": [], "lit": ["home"], "complete": false },
      "recover": ["sw_1", "repair:l_lane"] }
  ]
}
```

## What it taught us
