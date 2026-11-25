# 04 · The tired feed (city form) — design note

The city form of [`puzzles/04-the-tired-feed.md`](../04-the-tired-feed.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**capacity, small**: count before you shed), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights.

## Where it stands

- `from`: `04-the-tired-feed`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, at its south-west corner. The hub `j0` is the corner pole; four breakers leave it: `br_A` one pole east on `x:2`, `br_B` round the corner on `z:0`, and `br_C` and `br_D` on two roof structures of the corner building, each sending a roof span across `x:2` to a lamp on a roof on `block:0:2`.
- Capacity **4** (the schematic's 3, raised by 1), no parts, target the shrine, priority the home, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `br_A` | breaker, open | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `shrine` | lamp, load 2 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |
| `br_B` | breaker, closed | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `jB` | junction | pole `pole:z:0:hi:90.00` (slot, block:0:0, -x side) | 20.75, 90.00 |
| `home` | lamp, load 1 | building `block:0:0/b\|outer\|-x\|5,17` | 25.00, 87.50 |
| `well` | lamp, load 1 | lamp post under `span:pole:z:0:hi:102.50~pole:z:0:hi:90.00` | 20.75, 96.25 |
| `br_C` | breaker, closed | roof structure `roof:5:20` (corner, on `block:0:0/b\|outer\|+z\|5,20`) | 25.60, 104.40 |
| `market` | lamp, load 1 | roof structure `roof:5:24` (corner, on `block:0:2/a\|outer\|-x\|5,24`) | 25.60, 120.60 |
| `br_D` | breaker, closed | roof structure `roof:6:20` (mid, on `block:0:0/b\|outer\|+z\|5,20`) | 32.50, 104.40 |
| `lantern` | lamp, load 1 | roof structure `roof:9:24` (mid, on `block:0:2/a\|outer\|-z\|8,24`) | 47.50, 120.60 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_a0` | `j0` → `br_A` | 1 span: along | 11.67 |
| `l_shrine` | `br_A` → `shrine` | lead | — |
| `l_b0` | `j0` → `br_B` | 1 span: corner | 9.55 |
| `l_b1` | `br_B` → `jB` | 1 span: along | 12.50 |
| `l_home` | `jB` → `home` | drop | — |
| `l_well` | `jB` → `well` | lead | — |
| `l_c0` | `j0` → `br_C` | 1 span: roof (pavement) | 5.21 |
| `l_market` | `br_C` → `market` | 1 span: roof (street) | 16.20 |
| `l_d0` | `j0` → `br_D` | 1 span: roof (pavement) | 6.97 |
| `l_lantern` | `br_D` → `lantern` | 1 span: roof (street) | 22.08 |

The fit's places are kept. The home and the well share `br_B`'s branch, as in the schematic: the home a building and the well a lamp post on `z:0`, both off `jB`. `br_D`'s roof structure (`roof:6:20`) and the lantern's (`roof:9:24`) are mid-row places, clear of stage 7's roof pieces (P1's clearance check).

## What changed from the schematic, and why

One thing changed: **the capacity, 3 to 4.**

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights one scenery building, so 3 + 1 = 4.
- **The one scenery building** is on `j0`'s pole, upstream of every breaker: lit in every state, it adds exactly 1 to every load. The win still has **no headroom** (4 of 4), as the schematic's 3 of 3.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j0~s` | node pole: `j0` | 1 | 1 / 0 | yes | yes |
| | | **1** | **1 / 0** | | |

Building: `j0~s`: `block:0:0/b|outer|+z|5,20`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 5 of 4 (brownout); schematic feed 4 of 3 (brownout)
- win (br_B, br_A, br_C): city feed 4 of 4; schematic feed 3 of 3
- trap "shed the small lamps" (br_C, br_D, br_A): city feed 5 of 4 (brownout); schematic feed 4 of 3 (brownout)

## The intended read from the default camera

1. The view opens in **brownout**, 5 of 4: the home, the well, the market and the lantern flicker. Nothing is broken.
2. The shrine is the dark lamp post one span east of the corner, behind `br_A`. It is 2; with it only 1 more fits. The home and the well hang off one junction on `z:0`, behind one breaker, so they go together (2).
3. Open `br_B` (3 of 4, the flicker clears), close `br_A` (5 of 4, brownout again), open `br_C` or `br_D` (4 of 4). **Win.**

## The trap

The schematic's: shed the small, unmarked lamps first, the market and the lantern on their two roofs across `x:2`. Open both and close the shrine: **5 of 4, still a brownout.** The home's branch is the one that has to go, though it is the tribe's priority. The HUD's count says why, and breakers undo for free.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/04-the-tired-feed.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (br_A, br_B, br_C) | 3 (br_A, br_B, br_C) |
| Winning orders / configurations | 12 / 3 | 12 / 3 |
| Parts used | none | none |
| Feed at the win | feed 3 of 3 | **feed 4 of 4** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts: none. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/04-the-tired-feed.json`) and through this file's conversion, and `npm run check puzzles/city/04-the-tired-feed.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_B", "br_A", "br_C"],
  "traps": [
    { "name": "shed the small lamps",
      "moves": ["br_C", "br_D", "br_A"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_B"] }
  ]
}
```

## What it taught us
