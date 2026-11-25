# 06 · The spark (city form) — design note

The city form of [`puzzles/06-the-spark.md`](../06-the-spark.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the damaged cable**: current runs up to a spark; faults are read by current. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `06-the-spark`. City: 6 x 6 seed 1, one-way on.
- District: `block:5:0`. `block:5:0`'s corner by the feed's crossing over `z:5`; the job runs round the corner along `x:0`. Both lamps are buildings on the block's `-z` side.
- Capacity **4**. Target: `shrine`. Parts: wire.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:5:lo:27.50` (end, block:3:0, +x side) | 169.25, 27.50 |
| `br_main` | breaker, open | pole `pole:z:5:hi:27.50` (crossing, block:5:0, -x side) | 185.75, 27.50 |
| `sw_1` | switch, 0 `l_home`, 1 `l_lane`; set 0 | pole `pole:x:0:hi:205.00` (slot, block:5:0, -z side) | 205.00, 20.75 |
| `home` | lamp, load 1 | building `block:5:0\|outer\|-z\|39,5`, by its drop from `pole:x:0:hi:205.00` | 202.50, 25.00 |
| `shrine` | lamp, load 1, **target** | building `block:5:0\|outer\|-z\|44,5`, by its drop from `pole:x:0:hi:220.50` | 222.50, 25.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 16.50 |
| `l_sw` | `br_main` → `sw_1` | 2 spans: corner, along | 22.05 |
| `l_home` | `sw_1` → `home` | drop | — |
| `l_lane` | `sw_1` → `shrine` | 1 span: along + drop | 15.50 |

## What changed

- **`home` moved from a lamp post to a building**, fed by its drop.
- **`shrine` (a target) moved from a lamp post to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:5:0` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 3 becomes capacity 4. The job's poles carry 1 scenery building.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens with no job lamp lit. `br_main`'s icon is on the corner pole across `z:5` from the feed; the wire past it is dead. No break icon shows: no fault can be seen yet.
2. Close `br_main`. The current runs round the corner along `x:0` to `sw_1` and down the home's drop. The home lights. Still no break icon.
3. Throw `sw_1`. The home goes dark; the span on along `x:0` goes live, and a **break icon** and sparks appear on it. One wire.
4. Repair it. **The shrine, the next building along `x:0`, on the pole after `sw_1`,** lights. 2 of 4. **Win.**

## The trap

The schematic's: the player holds a wire and can see the shrine, so the instinct is to fix the dark line to it. It is dead, so there is nothing to click: no break icon is drawn while the fault is unreadable (Josh: "Only when readable"). Faults are read by current; bring power to the spark first. It costs nothing.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 1 of 4; schematic feed 0 of 3
- win (br_main, sw_1, repair:l_lane): city feed 2 of 4; schematic feed 1 of 3
- trap "no spark in sight yet" (br_main): city feed 2 of 4; schematic feed 1 of 3

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/06-the-spark.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 5, exhaustive | 5, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (br_main, sw_1, repair:l_lane) | 3 (br_main, sw_1, repair:l_lane) |
| Winning orders / configurations | 2 / 1 | 2 / 1 |
| Parts used | wire | wire |
| Feed at that win | feed 1 of 3 | **feed 2 of 4** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 5 (0.0%) | 0 of 5 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: wire. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/06-the-spark.json` and through this file's conversion, and `npm run check puzzles/city/06-the-spark.city.json` passes.

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
