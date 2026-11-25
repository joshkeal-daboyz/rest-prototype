# 11 · The small fuse (city form) — design note

The city form of [`puzzles/11-the-small-fuse.md`](../11-the-small-fuse.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the fuse rating**: the feed's number isn't the fuse's), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights. `fb_1`'s rating is unchanged.

## Where it stands

- `from`: `11-the-small-fuse`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, on its south side and across `x:2` on `block:0:2`'s roofs. `j0` is the south-west corner pole; the home's branch goes one pole east on `x:2`; `fb_1` stands round the corner on `z:0`, and its line climbs to the corner roof and runs east over the roofs either side of `x:2` to `j1`, a roof structure in the middle of the block's south side. The shrine's, the market's and the lantern's breakers leave `j1`.
- Capacity **7** (the schematic's 6, raised by 1), `fb_1` rating **2** (unchanged), 2 fuses, target the shrine and the home, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `br_h` | breaker, closed | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `home` | lamp, load 1 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |
| `fb_1` | fuse box, rating 2 | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `j1` | junction | roof structure `roof:14:20` (mid, on `block:0:0/b\|outer\|+z\|12,20`) | 72.50, 104.40 |
| `br_s` | breaker, open | pole `pole:x:2:lo:62.50` (slot, block:0:0, +z side) | 62.50, 109.25 |
| `shrine` | lamp, load 2 | building `block:0:0/b\|outer\|+z\|12,20` | 62.50, 105.00 |
| `br_m` | breaker, closed | pole `pole:x:2:lo:74.17` (slot, block:0:0, +z side) | 74.17, 109.25 |
| `market` | lamp, load 1 | building `block:0:2/b\|outer\|-z\|14,24`, its drop across `x:2` | 72.50, 120.00 |
| `br_l` | breaker, closed | roof structure `roof:14:24` (mid, on `block:0:2/b\|outer\|-z\|14,24`) | 72.50, 120.60 |
| `lantern` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|18,20` | 97.50, 105.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_h0` | `j0` → `br_h` | 1 span: along | 11.67 |
| `l_home` | `br_h` → `home` | lead | — |
| `l_fb0` | `j0` → `fb_1` | 1 span: corner | 9.55 |
| `l_fb1` | `fb_1` → `j1` | 5 spans: roof (pavement), 4 roof (street) | 94.64 |
| `l_s0` | `j1` → `br_s` | 1 span: roof (pavement) | 11.11 |
| `l_shrine` | `br_s` → `shrine` | drop | — |
| `l_m0` | `j1` → `br_m` | 1 span: roof (pavement) | 5.13 |
| `l_market` | `br_m` → `market` | drop | — |
| `l_l0` | `j1` → `br_l` | 1 span: roof (street) | 16.20 |
| `l_lantern` | `br_l` → `lantern` | 1 span: roof (street) + drop | 27.46 |

The fit's places are kept. `fb_1`'s line (`l_fb1`) is five roof spans that cross `x:2` four times, zig-zagging between the roof structures of `block:0:0` and `block:0:2`, and the lantern's line crosses it twice more. The designer looked at plainer lays on this block (the fuse box and `j1` on the `x:2` pole line) and kept the fit's: `j1` needs four attachments, and the poles that offer them here (50.83 and 85.83) carry scenery drops, so each plainer lay hangs 1 or 2 loads under the rating 2 fuse that the player cannot see until S4 lights scenery windows, and spoils the read this map is about (the shrine's 2 against the bar's 2). On the fit's roofs, nothing but the three job lamps is under `fb_1`. To watch when Josh plays it: whether the roof wires over `x:2` read as one line.

## What changed from the schematic, and why

One thing changed: **the capacity, 6 to 7.** `fb_1`'s rating stays 2.

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights one scenery building, so 6 + 1 = 7.
- **The one scenery building** is on `j0`'s pole, upstream of the fuse and every breaker: lit in every state, it adds 1 to the feed and nothing to `fb_1`. So `fb_1`'s bar reads exactly as the schematic's: full at 2 of 2 at the start, 2 of 2 at the win.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j0~s` | node pole: `j0` | 1 | 1 / 0 | yes | yes |
| | | **1** | **1 / 0** | | |

Building: `j0~s`: `block:0:0/b|outer|+z|5,20`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 4 of 7; `fb_1` 2; schematic feed 3 of 6; `fb_1` 2
- win (br_m, br_l, br_s): city feed 4 of 7; `fb_1` 2; schematic feed 3 of 6; `fb_1` 2
- trap "the shrine's breaker first" (br_s): city feed 2 of 7; `fb_1` 0; schematic feed 1 of 6; `fb_1` 0

## The intended read from the default camera

1. The view opens with the home's lamp post, the market (across `x:2`) and the lantern (at the block's south-east corner) lit. The feed 4 of 7. `fb_1`'s bar is **full**: 2 of 2.
2. The shrine, the building under `j1`'s roof, is 2, and `fb_1` is rated 2. The shrine has to be alone on it: the market and the lantern go.
3. Open `br_m` and `br_l` (`fb_1` 0 of 2), close `br_s` (2 of 2). **Win.** The feed 4 of 7: the home and the shrine.

## The trap

The schematic's: the shrine's breaker is the obvious click, and the feed shows plenty of room (4 of 7). Close `br_s` first and **`fb_1` blows** (4 against 2, culprit the shrine); the market and the lantern go dark with it. Recoverable: open `br_m` and `br_l`, then repair `fb_1` with a fuse. The quieter wrong read, shedding the home, does nothing for `fb_1`'s bar.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/11-the-small-fuse.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 78, exhaustive | 78, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (br_m, br_l, br_s) | 3 (br_m, br_l, br_s) |
| Winning orders / configurations | 2 / 1 | 2 / 1 |
| Parts used | none | none |
| Feed at the win | feed 3 of 6 | **feed 4 of 7** |
| Fuses that blow (shortest win / any move) | none / fb_1 | none / fb_1 |
| Dead-end states | 16 of 78 (20.5%) | 16 of 78 (20.5%) |
| First moves that lead only to dead ends | none | none |

Parts needed: none on the intended route; 1 fuse after the trap, as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/11-the-small-fuse.json`) and through this file's conversion, and `npm run check puzzles/city/11-the-small-fuse.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_m", "br_l", "br_s"],
  "traps": [
    { "name": "the shrine's breaker first",
      "moves": ["br_s"],
      "expect": { "blown": ["fb_1"], "complete": false },
      "recover": ["br_m", "br_l", "repair:fb_1"] }
  ]
}
```

## What it taught us
