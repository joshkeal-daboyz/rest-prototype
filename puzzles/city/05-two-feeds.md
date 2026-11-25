# 05 · Two feeds (city form) — design note

The city form of [`puzzles/05-two-feeds.md`](../05-two-feeds.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**two feeds: each has its own limit**, ticket 015 rule 1), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only South's capacity raised by the scenery the win lights.

## Where it stands

- `from`: `05-two-feeds`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block. The whole job is one pole line, `x:2` on the block's south side, fed from both ends: North across `x:2` at its west end (27.50), South across `x:2` at its east end (97.50).
- North capacity **3** (unchanged), South capacity **8** (the schematic's 4, raised by 4); no top-level capacity; no parts; target the shrine, the inn, the bakery and the well, priority the lane, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `north` | feed, capacity 3 | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `south` | feed, capacity 8 | pole `pole:x:2:hi:97.50` (crossing, block:0:2, -z side) | 97.50, 115.75 |
| `j_n` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `inn` | lamp, load 2 | building `block:0:0/b\|outer\|+z\|5,20` | 27.50, 105.00 |
| `bakery` | lamp, load 1 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |
| `br_n` | breaker, open | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `j_sh` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `shrine` | lamp, load 2 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |
| `j_s` | junction | pole `pole:x:2:lo:85.83` (slot, block:0:0, +z side) | 85.83, 109.25 |
| `well` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|15,20` | 87.50, 105.00 |
| `sw_s` | switch, 0 `l_lane`, 1 `l_up`; set 0 | pole `pole:x:2:lo:74.17` (slot, block:0:0, +z side) | 74.17, 109.25 |
| `lane` | lamp, load 1 | building `block:0:2/b\|outer\|-z\|14,24`, its drop across `x:2` | 72.50, 120.00 |
| `j_u` | junction | pole `pole:x:2:lo:62.50` (slot, block:0:0, +z side) | 62.50, 109.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_n` | `north` → `j_n` | 1 span: crossing | 6.50 |
| `l_inn` | `j_n` → `inn` | drop | — |
| `l_bakery` | `j_n` → `bakery` | lead | — |
| `l_n_br` | `j_n` → `br_n` | 1 span: along | 11.67 |
| `l_br_sh` | `br_n` → `j_sh` | 1 span: along | 11.67 |
| `l_shrine` | `j_sh` → `shrine` | drop | — |
| `l_s` | `south` → `j_s` | 2 spans: crossing, along | 18.17 |
| `l_well` | `j_s` → `well` | drop | — |
| `l_s_sw` | `j_s` → `sw_s` | 1 span: along | 11.67 |
| `l_lane` | `sw_s` → `lane` | drop | — |
| `l_up` | `sw_s` → `j_u` | 1 span: along | 11.67 |
| `l_u_sh` | `j_u` → `j_sh` | 1 span: along | 11.67 |

The fit's places are kept. Along `x:2` from west to east the poles are `j_n`, `br_n`, `j_sh`, `j_u`, `sw_s`, `j_s`, then the carrier at the block's south-east corner where South's line comes in. The shrine's building sits on `j_sh`, between the two feeds; it is 3 hops from North (through `br_n`) and 4 from South (through `sw_s` and `j_u`), as the schematic.

## What changed from the schematic, and why

One thing changed: **South's capacity, 4 to 8.** North's 3 is unchanged.

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights four scenery buildings, all on South: 4 + 4 = 8. North carries none at the win, so it stays 3, and North is still **full at the start** (3 of 3), the read the map turns on.
- **The four buildings, by where they hang.** Two are lit from the start on South's side (`j_s`'s pole and the corner carrier); two are on `j_sh` and `j_u`, and light with whichever feed reaches them.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j_sh~s` | node pole: `j_sh` | 1 | 0 / 1 | no | yes |
| `j_s~s` | node pole: `j_s` | 1 | 0 / 1 | yes | yes |
| `j_u~s` | node pole: `j_u` | 1 | 1 / 0 | no | yes |
| `l_s~h1~s` | carrier of `l_s` | 1 | 1 / 0 | yes | yes |
| | | **4** | **2 / 2** | | |

Buildings: `j_u~s`: `block:0:0/b|outer|+z|12,20`; `l_s~h1~s`: `block:0:0/b|outer|+z|18,20`; `j_sh~s`: `block:0:2/a|outer|-z|8,24`; `j_s~s`: `block:0:2/b|outer|-z|16,24`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city north 3 of 3, south 4 of 8; schematic north 3 of 3, south 2 of 4
- win (sw_s): city north 3 of 3, south 7 of 8; schematic north 3 of 3, south 3 of 4
- trap "the short way, on North" (br_n): city north 7 of 3, south 4 of 8 (brownout); schematic north 5 of 3, south 2 of 4 (brownout)
- trap "throw both" (br_n, sw_s): city north 6 of 3, south 4 of 8 (brownout); schematic north 5 of 3, south 1 of 4 (brownout)

The schematic's lesson still holds to the unit: with `br_n` closed, North is 7 of 3 while South has room, and the two together carry 11, exactly 3 + 8. South's spare room does not help North.

## The intended read from the default camera

1. The HUD has two rows: North using 3 of 3, South using 4 of 8. The inn, the bakery's lamp post, the well and the lane are lit. The shrine's building, in the middle of the street, is dark.
2. The shrine has to come from South: North has nothing to spare. South's way to it is `sw_s`, two poles east of the shrine, and throwing it costs the lane, the building across `x:2`.
3. Throw `sw_s`. The lane goes dark; the shrine lights. North 3 of 3, South 7 of 8. **Win.**

## The trap

The schematic's: the breaker `br_n` is the short, cheap way and costs no lamp. Close it and the shrine lights from North: **North 7 of 3, brownout**, while South sits at 4 of 8. Open it again to recover. Throwing both still leaves the shrine on North (3 hops against 4): North 6 of 3. No state is a dead end.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/05-two-feeds.json`. **Equal but for South's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 4, exhaustive | 4, exhaustive |
| Solvable | yes | yes |
| Min clicks | 1 (sw_s) | 1 (sw_s) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | none | none |
| Feed at the win | north 3 of 3, south 3 of 4 | **north 3 of 3, south 7 of 8** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 4 (0.0%) | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts: none. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and its two traps, made executable. It replays the same on the schematic (`puzzles/05-two-feeds.json`) and through this file's conversion, and `npm run check puzzles/city/05-two-feeds.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["sw_s"],
  "traps": [
    { "name": "the short way, on North",
      "moves": ["br_n"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_n", "sw_s"] },
    { "name": "throw both",
      "moves": ["br_n", "sw_s"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_n"] }
  ]
}
```

## What it taught us
