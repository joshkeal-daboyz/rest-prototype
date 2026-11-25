# 13 · One box, three lamps (city form) — design note

The city form of [`puzzles/13-one-box-three-lamps.md`](../13-one-box-three-lamps.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the shared fuse**: count the box's lamps before spending a fuse. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `13-one-box-three-lamps`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`. `block:0:0`'s corner by the feed's crossing over `x:2`; `fb_A`'s branch runs along `x:2`, the yard's round the corner down `z:0`.
- Capacity **3**; `fb_A` rated **2**. Target: `shrine`, `well`; priority: `lane`. Parts: fuse, fuse.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `fb_A` | fusebox, rating 2 | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `j1` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `shrine` | lamp, load 1, **target** | building `block:0:0/b\|outer\|+z\|9,20`, by its drop from `pole:x:2:lo:50.83` | 52.50, 105.00 |
| `well` | lamp, load 1, **target** | building `block:0:2/a\|outer\|-z\|8,24`, by its drop from `pole:x:2:lo:50.83` across `x:2` | 52.50, 120.00 |
| `br_lane` | breaker, closed | pole `pole:x:2:lo:62.50` (slot, block:0:0, +z side) | 62.50, 109.25 |
| `lane` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|12,20`, by its drop from `pole:x:2:lo:62.50` | 62.50, 105.00 |
| `br_yard` | breaker, closed | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `yard` | lamp, load 2 | building `block:0:0/b\|outer\|-x\|5,17`, by its drop from `pole:z:0:hi:90.00` | 25.00, 87.50 |
| `porch` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|5,20`, by its drop from `pole:x:2:lo:27.50` | 27.50, 105.00 |

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
| `l_yard2` | `br_yard` → `yard` | 1 span: along + drop | 12.50 |
| `l_porch` | `j0` → `porch` | drop | — |

## What changed

- `shrine` (a target) stays a building (re-laid with the district).
- `well` (a target) stays a building (re-laid with the district).
- `lane` stays a building (re-laid with the district).
- **`yard` moved from a lamp post to a building**, fed by its drop.
- `porch` stays a building (re-laid with the district).
- **District:** P2a laid it on `block:0:0`; now `block:0:0` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers:** unchanged (capacity 3, fb_A rating 2): no scenery building on the job's poles lights in the win.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).
- **This lay keeps the schematic's numbers exactly** (capacity 3, `fb_A` 2): no scenery building hangs on the job's poles. The other lays on seed 1 put one under `fb_A` (rating raised to 3), so "three lamps on a box of 2" would read as three lamps on a box of 3 that still blows. That is why it is back on `block:0:0`, the corner P2a used; 01 and 16 moved off it so it does not open on the same corner as another pilot.

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens at 3 of 3: the porch (the corner building) and the yard (down `z:0`) are lit. `fb_A`, one pole along `x:2`, shows the blown ✕: in, none out. Behind it, three lamps of 1: **the shrine (on the block's side) and the well (across `x:2`) on `j1`, the next pole,** and the lane one pole further, behind `br_lane`. The box is rated 2.
2. Count the box: three lamps, rating 2. One must go dark, and it isn't a target: open `br_lane`.
3. Count the feed: the shrine, the well and the porch are 3, and the yard's 2 makes 5. Open `br_yard`.
4. Repair `fb_A`. The shrine and the well light; `fb_A` 2 of 2, the feed 3 of 3. **Win.**

## The trap

The schematic's: repair the blown fuse you can see first. With the lane still on, the box carries 3 against 2 and **blows again at once**. Readable (the ✕ returns, the notice gives 3 against 2) and recoverable with the second fuse once the lane is open; the brownout that follows (5 of 3) says the yard must go too. Only two premature repairs in a row leave the map stuck, and Undo clears it.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 3 of 3; `fb_A` 0 of 2; blown `fb_A`; schematic feed 3 of 3; `fb_A` 0 of 2; blown `fb_A`
- win (br_lane, br_yard, repair:fb_A): city feed 3 of 3; `fb_A` 2 of 2; schematic feed 3 of 3; `fb_A` 2 of 2
- trap "repair the fuse you can see" (repair:fb_A): city feed 3 of 3; `fb_A` 0 of 2; blown `fb_A`; schematic feed 3 of 3; `fb_A` 0 of 2; blown `fb_A`

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/13-one-box-three-lamps.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (br_lane, br_yard, repair:fb_A) | 3 (br_lane, br_yard, repair:fb_A) |
| Winning orders / configurations | 3 / 1 | 3 / 1 |
| Parts used | fuse | fuse |
| Feed at that win | feed 3 of 3 | **feed 3 of 3** |
| Fuses that blow (shortest win / any move) | none / fb_A | none / fb_A |
| Dead-end states | 4 of 16 (25.0%) | 4 of 16 (25.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: fuse, fuse. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/13-one-box-three-lamps.json` and through this file's conversion, and `npm run check puzzles/city/13-one-box-three-lamps.city.json` passes.

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
