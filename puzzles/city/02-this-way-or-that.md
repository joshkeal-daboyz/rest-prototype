# 02 · This way or that (city form) — design note

The city form of [`puzzles/02-this-way-or-that.md`](../02-this-way-or-that.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the switch**: one way or the other. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `02-this-way-or-that`. City: 6 x 6 seed 1, one-way on.
- District: `block:3:0`. The job is three poles of `x:2`, on the `+z` side of `block:3:0`, running one way from the feed's crossing. The home and the shrine are on the block's own side; the well is across `x:2`.
- Capacity **3**. Target: `shrine`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:162.50` (crossing, block:3:2, -z side) | 162.50, 115.75 |
| `sw_1` | switch, 0 `l_home`, 1 `l_on`; set 0 | pole `pole:x:2:lo:162.50` (end, block:3:0, +z side) | 162.50, 109.25 |
| `home` | lamp, load 1 | building `block:3:0/b\|outer\|+z\|30,20`, by its drop from `pole:x:2:lo:162.50` | 162.50, 105.00 |
| `sw_2` | switch, 0 `l_well`, 1 `l_shrine`; set 0 | pole `pole:x:2:lo:150.83` (slot, block:3:0, +z side) | 150.83, 109.25 |
| `well` | lamp, load 1 | building `block:3:2\|outer\|-z\|28,24`, by its drop from `pole:x:2:lo:150.83` across `x:2` | 152.50, 120.00 |
| `shrine` | lamp, load 1, **target** | building `block:3:0/b\|outer\|+z\|26,20`, by its drop from `pole:x:2:lo:139.17` | 137.50, 105.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw_1` | 1 span: crossing | 6.50 |
| `l_home` | `sw_1` → `home` | drop | — |
| `l_on` | `sw_1` → `sw_2` | 1 span: along | 11.67 |
| `l_well` | `sw_2` → `well` | drop | — |
| `l_shrine` | `sw_2` → `shrine` | 1 span: along + drop | 11.67 |

## What changed

- `home` stays a building (re-laid with the district).
- **`well` moved from a lamp post to a building**, fed by its drop.
- **`shrine` (a target) moved from a lamp post to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:3:0` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers:** unchanged (capacity 3): no scenery building on the job's poles lights in the win.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The home's windows are lit, on the corner by the feed's crossing, on `sw_1`'s pole. 1 of 3. The wire on along `x:2` to `sw_2` is dead.
2. **The shrine is two poles along, the next building past `sw_2`, with its drop on the pole after `sw_2`.** `sw_2`'s other line is the drop across the street to the well.
3. Throw `sw_1`. The home goes dark and the wire to `sw_2` goes live: the well, across `x:2`, lights.
4. Throw `sw_2`. The well goes dark; the current runs one span on and down the shrine's drop. 1 of 3. **Win.**

Both runs leave the feed and go the same way along `x:2`, so no pulse ever runs back towards the feed (Josh's Lv2: "the flow of electricity is moving away from the power source on one side").

## The trap

The schematic's: `sw_2`, nearest the shrine, is the obvious first click, and it changes nothing anyone can see, because the wire up to it is dead. Its blade moves and nothing lights. The dead wire is the tell: follow the live wire from the feed and it stops at the home's drop on `sw_1`. It costs nothing; `sw_2` is then already set, and `sw_1` wins in one click.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 1 of 3; schematic feed 1 of 3
- win (sw_1, sw_2): city feed 1 of 3; schematic feed 1 of 3
- trap "throw the switch beside the shrine" (sw_2): city feed 1 of 3; schematic feed 1 of 3

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/02-this-way-or-that.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 4, exhaustive | 4, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 2 (sw_1, sw_2) | 2 (sw_1, sw_2) |
| Winning orders / configurations | 2 / 1 | 2 / 1 |
| Parts used | none | none |
| Feed at that win | feed 1 of 3 | **feed 1 of 3** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 4 (0.0%) | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/02-this-way-or-that.json` and through this file's conversion, and `npm run check puzzles/city/02-this-way-or-that.city.json` passes.

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
