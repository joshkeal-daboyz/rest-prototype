# 11 · The small fuse (city form) — design note

The city form of [`puzzles/11-the-small-fuse.md`](../11-the-small-fuse.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the fuse rating**: the feed's number isn't the fuse's. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `11-the-small-fuse`. City: 6 x 6 seed 1, one-way on.
- District: `block:6:1`. `block:6:1`, from its corner by the feed's crossing over `x:1` to its far corner on `z:7`. `fb_1` stands on a roof across `x:1`; its run comes back over `x:1` to `j1` on the far corner roof, where the shrine, the market and the lantern branch off.
- Capacity **8**; `fb_1` rated **4**. Target: `shrine`, `home`. Parts: fuse, fuse.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:lo:272.50` (crossing, block:6:0, +z side) | 272.50, 69.25 |
| `j0` | junction | pole `pole:x:1:hi:272.50` (end, block:6:1, -z side) | 272.50, 85.75 |
| `br_h` | breaker, closed | pole `pole:x:1:hi:283.33` (slot, block:6:1, -z side) | 283.33, 85.75 |
| `home` | lamp, load 1, **target** | building `block:6:1/a\|outer\|-z\|55,18`, by its drop from `pole:x:1:hi:283.33` | 282.50, 90.00 |
| `fb_1` | fusebox, rating 4 | roof structure `roof:58:12` (mid, on `block:6:0/a\|outer\|+z\|57,12`) | 292.50, 64.40 |
| `j1` | junction | roof structure `roof:67:18` (corner, on `block:6:1/b\|outer\|+x\|67,18`) | 339.40, 90.60 |
| `br_s` | breaker, open | pole `pole:z:7:lo:104.17` (slot, block:6:1, +x side) | 344.25, 104.17 |
| `shrine` | lamp, load 2, **target** | building `block:6:1/b\|outer\|+x\|67,20`, by its drop from `pole:z:7:lo:104.17` | 340.00, 102.50 |
| `br_m` | breaker, closed | pole `pole:z:7:lo:92.50` (end, block:6:1, +x side) | 344.25, 92.50 |
| `market` | lamp, load 1 | building `block:6:1/b\|outer\|+x\|67,18`, by its drop from `pole:z:7:lo:92.50` | 340.00, 92.50 |
| `br_l` | breaker, closed | roof structure `roof:73:23` (mid, on `block:7:1/b\|outer\|-x\|73,21`) | 365.60, 117.50 |
| `lantern` | lamp, load 1 | building `block:7:1/b\|outer\|-x\|73,25`, by its drop from `pole:z:7:lo:127.50` across `z:7` | 365.00, 127.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_h0` | `j0` → `br_h` | 1 span: along | 10.83 |
| `l_home` | `br_h` → `home` | drop | — |
| `l_fb0` | `j0` → `fb_1` | 1 span: roof (street) | 29.25 |
| `l_fb1` | `fb_1` → `j1` | 3 spans: roof (street), 2 roof (pavement) | 60.21 |
| `l_s0` | `j1` → `br_s` | 1 span: roof (pavement) | 14.41 |
| `l_shrine` | `br_s` → `shrine` | drop | — |
| `l_m0` | `j1` → `br_m` | 1 span: roof (pavement) | 5.21 |
| `l_market` | `br_m` → `market` | drop | — |
| `l_l0` | `j1` → `br_l` | 1 span: roof (street) | 37.55 |
| `l_lantern` | `br_l` → `lantern` | 1 span: roof (street) + drop | 23.58 |

## What changed

- **`home` (a target) moved from a lamp post to a building**, fed by its drop.
- `shrine` (a target) stays a building (re-laid with the district).
- `market` stays a building (re-laid with the district).
- `lantern` stays a building (re-laid with the district).
- **District:** P2a laid it on `block:0:0`; now `block:6:1` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 6, fb_1 rating 2 becomes capacity 8, fb_1 rating 4. The job's poles carry 2 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens with the home (one pole along `x:1`), the market and the lantern lit. The feed 5 of 8. `fb_1`'s bar is **full**: 4 of 4 (the market, the lantern and two buildings on their runs).
2. **The shrine (2) is the building on `z:7`, on `br_s`'s pole, one pole down from `j1`'s corner.** `br_s` is open. `fb_1` has no room for it: the market and the lantern must go.
3. Open `br_m` and `br_l` (`fb_1` 2 of 4), close `br_s` (4 of 4). **Win.** The feed 5 of 8: the home and the shrine.

## The trap

The schematic's: the shrine's breaker is the obvious click, and the feed shows plenty of room (5 of 8). Close `br_s` first and **`fb_1` blows** (the shrine's 2 onto a bar already full at 4 of 4); the market and the lantern go dark with it. Recoverable: open `br_m` and `br_l`, then repair `fb_1` with a fuse. The quieter wrong read, shedding the home, does nothing for `fb_1`'s bar.

## To watch when Josh plays it

`fb_1`'s run crosses `x:1` twice (out to its roof on `block:6:0` and back), and the lantern's crosses `z:7` too. Every lay of 11 on seed 1 does this: `j0` and `j1` have four wires. Watch whether the three branches past `j1` read as `fb_1`'s.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 5 of 8; `fb_1` 4 of 4; schematic feed 3 of 6; `fb_1` 2 of 2
- win (br_m, br_l, br_s): city feed 5 of 8; `fb_1` 4 of 4; schematic feed 3 of 6; `fb_1` 2 of 2
- trap "the shrine's breaker first" (br_s): city feed 1 of 8; `fb_1` 0 of 4; blown `fb_1`; schematic feed 1 of 6; `fb_1` 0 of 2; blown `fb_1`

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/11-the-small-fuse.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 78, exhaustive | 78, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (br_m, br_l, br_s) | 3 (br_m, br_l, br_s) |
| Winning orders / configurations | 2 / 1 | 2 / 1 |
| Parts used | none | none |
| Feed at that win | feed 3 of 6 | **feed 5 of 8** |
| Fuses that blow (shortest win / any move) | none / fb_1 | none / fb_1 |
| Dead-end states | 16 of 78 (20.5%) | 16 of 78 (20.5%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: fuse, fuse. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/11-the-small-fuse.json` and through this file's conversion, and `npm run check puzzles/city/11-the-small-fuse.city.json` passes.

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
