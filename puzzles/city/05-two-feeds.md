# 05 · Two feeds (city form) — design note

The city form of [`puzzles/05-two-feeds.md`](../05-two-feeds.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **two feeds: each has its own limit** (ticket 015 rule 1). The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `05-two-feeds`. City: 6 x 6 seed 1, one-way on.
- District: `block:8:0`. `block:8:0`. North comes in from `x:1` round the block's `+x` corner to `j_n`; South comes in from `z:8` round the `-x` corner along `x:0`. The two meet at `j_sh` on `x:0`, by the shrine.
- North (`north`) capacity **5**, South (`south`) capacity **5**. Target: `shrine`, `inn`, `bakery`, `well`; priority: `lane`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `north` | feed "North", capacity 5 | pole `pole:x:1:hi:482.50` (end, block:8:1, -z side) | 482.50, 85.75 |
| `south` | feed "South", capacity 5 | pole `pole:z:8:lo:27.50` (end, block:7:0, +x side) | 409.25, 27.50 |
| `j_n` | junction | pole `pole:z:9:lo:39.17` (slot, block:8:0, +x side) | 489.25, 39.17 |
| `inn` | lamp, load 2, **target** | building `block:8:0/b\|outer\|+x\|96,6`, by its drop from `pole:z:9:lo:39.17` | 485.00, 37.50 |
| `bakery` | lamp, load 1, **target** | building `block:8:0/b\|outer\|-z\|95,5`, by its drop from `pole:x:0:hi:482.50` | 482.50, 25.00 |
| `br_n` | breaker, open | roof structure `roof:96:5` (corner, on `block:8:0/b\|outer\|-z\|95,5`) | 484.40, 25.60 |
| `j_sh` | junction | pole `pole:x:0:hi:471.50` (slot, block:8:0, -z side) | 471.50, 20.75 |
| `shrine` | lamp, load 2, **target** | building `block:8:0/b\|outer\|-z\|92,5`, by its drop from `pole:x:0:hi:471.50` | 472.50, 25.00 |
| `j_s` | junction | pole `pole:x:0:hi:440.50` (slot, block:8:0, -z side) | 440.50, 20.75 |
| `well` | lamp, load 1, **target** | building `block:8:0/b\|outer\|-z\|88,5`, by its drop from `pole:x:0:hi:440.50` | 442.50, 25.00 |
| `sw_s` | switch, 0 `l_lane`, 1 `l_up`; set 0 | pole `pole:x:0:hi:449.50` (slot, block:8:0, -z side) | 449.50, 20.75 |
| `lane` | lamp, load 1 | building `block:8:0/b\|outer\|-z\|90,5`, by its drop from `pole:x:0:hi:449.50` | 452.50, 25.00 |
| `j_u` | junction | pole `pole:x:0:hi:460.50` (slot, block:8:0, -z side) | 460.50, 20.75 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_n` | `north` → `j_n` | 4 spans: crossing, corner, 2 along | 49.38 |
| `l_inn` | `j_n` → `inn` | drop | — |
| `l_bakery` | `j_n` → `bakery` | 2 spans: along, corner + drop | 21.21 |
| `l_n_br` | `j_n` → `br_n` | 1 span: roof (pavement) | 14.41 |
| `l_br_sh` | `br_n` → `j_sh` | 1 span: roof (pavement) | 13.78 |
| `l_shrine` | `j_sh` → `shrine` | drop | — |
| `l_s` | `south` → `j_s` | 3 spans: crossing, corner, along | 34.05 |
| `l_well` | `j_s` → `well` | drop | — |
| `l_s_sw` | `j_s` → `sw_s` | 1 span: along | 9.00 |
| `l_lane` | `sw_s` → `lane` | drop | — |
| `l_up` | `sw_s` → `j_u` | 1 span: along | 11.00 |
| `l_u_sh` | `j_u` → `j_sh` | 1 span: along | 11.00 |

## What changed

- `inn` (a target) stays a building (re-laid with the district).
- **`bakery` (a target) moved from a lamp post to a building**, fed by its drop.
- `shrine` (a target) stays a building (re-laid with the district).
- `well` (a target) stays a building (re-laid with the district).
- `lane` stays a building (re-laid with the district).
- **District:** P2a laid it on `block:0:0`; now `block:8:0` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): north capacity 3, south capacity 4 becomes north capacity 5, south capacity 5. The job's poles carry 3 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The HUD has two rows: North using 5 of 5, South 3 of 5. The inn, the bakery, the well and the lane are lit.
2. **The shrine (2) is the building on `x:0` between the two runs, on `j_sh`'s pole.** Two ways reach it: `br_n` (open), on the corner roof just round from the bakery, is North's; `sw_s`, two poles along `x:0` from the shrine on the other side, is South's.
3. North has nothing to spare. South's way costs the lane, on `sw_s`'s pole.
4. Throw `sw_s`. The lane goes dark; the current runs on through `j_u` and the shrine lights. North 5 of 5, South 4 of 5. **Win.**

## The trap

The schematic's: `br_n` is the short, cheap way and costs no lamp. Close it and the shrine lights from North: **North 7 of 5, brownout**, while South sits at 3 of 5. Open it again to recover. Throwing both still leaves the shrine on North (3 hops against 4): North 7 of 5. No state is a dead end.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city north 5 of 5, south 3 of 5; schematic north 3 of 3, south 2 of 4
- win (sw_s): city north 5 of 5, south 4 of 5; schematic north 3 of 3, south 3 of 4
- trap "the short way, on North" (br_n): city north 7 of 5, south 3 of 5 (brownout); schematic north 5 of 3, south 2 of 4 (brownout)
- trap "throw both" (br_n, sw_s): city north 7 of 5, south 2 of 5 (brownout); schematic north 5 of 3, south 1 of 4 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/05-two-feeds.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 4, exhaustive | 4, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 1 (sw_s) | 1 (sw_s) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | none | none |
| Feed at that win | north 3 of 3, south 3 of 4 | **north 5 of 5, south 4 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 4 (0.0%) | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and traps, made executable (P2a's, unchanged). It replays the same on `puzzles/05-two-feeds.json` and through this file's conversion, and `npm run check puzzles/city/05-two-feeds.city.json` passes.

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
