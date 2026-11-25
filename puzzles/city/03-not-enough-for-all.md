# 03 · Not enough for all (city form) — design note

The city form of [`puzzles/03-not-enough-for-all.md`](../03-not-enough-for-all.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**capacity, small**: which branch to shed), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights.

## Where it stands

- `from`: `03-not-enough-for-all`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block. The hub `j0` is the corner pole; the three branches leave it three ways: east along `x:2` (A, the shrine), round the corner down `z:0` (B, the homes), and up onto the corner roof and across `x:2` (C, the market).
- Capacity **5** (the schematic's 4, raised by 1), no parts, target the shrine, priority the homes, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `br_A` | breaker, closed | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `jA` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `shrine` | lamp, load 2 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |
| `lantern` | lamp, load 1 | building `block:0:2/a\|outer\|-z\|8,24`, its drop across `x:2` | 52.50, 120.00 |
| `br_B` | breaker, closed | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `jB` | junction | pole `pole:z:0:hi:90.00` (slot, block:0:0, -x side) | 20.75, 90.00 |
| `home_1` | lamp, load 1 | building `block:0:0/b\|outer\|-x\|5,17` | 25.00, 87.50 |
| `home_2` | lamp, load 1 | lamp post under `span:pole:z:0:hi:102.50~pole:z:0:hi:90.00` | 20.75, 96.25 |
| `br_C` | breaker, closed | roof structure `roof:5:20` (corner, on `block:0:0/b\|outer\|+z\|5,20`) | 25.60, 104.40 |
| `market` | lamp, load 1 | roof structure `roof:5:24` (corner, on `block:0:2/a\|outer\|-x\|5,24`) | 25.60, 120.60 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_a0` | `j0` → `br_A` | 1 span: along | 11.67 |
| `l_a1` | `br_A` → `jA` | 1 span: along | 11.67 |
| `l_shrine` | `jA` → `shrine` | drop | — |
| `l_lantern` | `jA` → `lantern` | drop | — |
| `l_b0` | `j0` → `br_B` | 1 span: corner | 9.55 |
| `l_b1` | `br_B` → `jB` | 1 span: along | 12.50 |
| `l_home1` | `jB` → `home_1` | drop | — |
| `l_home2` | `jB` → `home_2` | lead | — |
| `l_c0` | `j0` → `br_C` | 1 span: roof (pavement) | 5.21 |
| `l_c1` | `br_C` → `market` | 1 span: roof (street) | 16.20 |

The fit's places are kept. The lantern is a building across `x:2` (on `block:0:2`), its drop from `jA`'s pole. The market lamp stands on the corner roof structure of `block:0:2`, across `x:2` (B1-Q1, "Anything").

## What changed from the schematic, and why

One thing changed: **the capacity, 4 to 5.**

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole" (1 lamp-load a building), "Dark" (the feed's own pole), and "Raise (Recommended)": each capacity is raised by the scenery its intended win lights. The win lights one, so 4 + 1 = 5.
- **The one scenery building** is on `j0`'s pole, the hub, upstream of all three breakers, so it is lit in every state and adds exactly 1 to every load. Every sum of the schematic's arithmetic moves up by 1 and keeps its side of the line: A + B = 6 of 5 (over), A + C = 5 of 5 (fits), B + C = 4 of 5.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j0~s` | node pole: `j0` | 1 | 1 / 0 | yes | yes |
| | | **1** | **1 / 0** | | |

Building: `j0~s`: `block:0:0/b|outer|+z|5,20`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 7 of 5 (brownout); schematic feed 6 of 4 (brownout)
- win (br_B): city feed 5 of 5; schematic feed 4 of 4
- trap "shed the heaviest branch" (br_A): city feed 4 of 5; schematic feed 3 of 4
- trap "shed the market to save the homes" (br_C): city feed 6 of 5 (brownout); schematic feed 5 of 4 (brownout)

## The intended read from the default camera

1. The view opens **browned out**: every lit window and lamp flickers, 7 of 5. Three breaker icons stand round the corner pole: `br_A` one pole east on `x:2`, `br_B` round the corner on `z:0`, `br_C` on the corner roof.
2. Count. The shrine (2) and the lantern (1) hang off `jA`, two poles east; the two homes off `jB` on `z:0`; the market alone, on the roof across `x:2`.
3. Throw `br_B`. The homes go dark. 5 of 5: the shrine, the lantern and the market light. **Win.**

## The trap

The schematic's two wrong instincts, at the raised numbers. Shed the heaviest branch (`br_A`): the brownout clears at 4 of 5 and the homes and market light, but the shrine is on that branch. Shed the market to save the tribe's homes (`br_C`): 6 of 5, still a brownout. Only darkening the homes fits. Every state is free to undo with a breaker.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/03-not-enough-for-all.json`. **Equal but for the feed's load**, which carries the one scenery building.

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 8, exhaustive | 8, exhaustive |
| Solvable | yes | yes |
| Min clicks | 1 (br_B) | 1 (br_B) |
| Winning orders / configurations | 1 / 2 | 1 / 2 |
| Parts used | none | none |
| Feed at the win | feed 4 of 4 | **feed 5 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 8 (0.0%) | 0 of 8 (0.0%) |
| First moves that lead only to dead ends | none | none |

The two winning configurations are the schematic's: `br_B` open (market lit, 5 of 5), or `br_B` and `br_C` open (4 of 5). Parts: none. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and its two traps, made executable. It replays the same on the schematic (`puzzles/03-not-enough-for-all.json`) and through this file's conversion, and `npm run check puzzles/city/03-not-enough-for-all.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_B"],
  "traps": [
    { "name": "shed the heaviest branch",
      "moves": ["br_A"],
      "expect": { "brownout": false, "lit": ["home_1", "home_2", "market"], "complete": false },
      "recover": ["br_A", "br_B"] },
    { "name": "shed the market to save the homes",
      "moves": ["br_C"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_C", "br_B"] }
  ]
}
```

## What it taught us
