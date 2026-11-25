# 08 · Where it stops (city form) — design note

The city form of [`puzzles/08-where-it-stops.md`](../08-where-it-stops.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the dead junction**, read by where the current stops, against a louder spark. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `08-where-it-stops`. City: 6 x 6 seed 1, one-way on.
- District: `block:3:2`. `block:3:2`'s corner by the feed's crossing over `x:2`; the job runs straight down `z:5`. The gate, the steps and the well are buildings across `z:5` (on `block:5:1`); the porch is on the block's own side.
- Capacity **5**. Target: `well`. Parts: wire, wire.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:lo:162.50` (end, block:3:0, +z side) | 162.50, 109.25 |
| `br_main` | breaker, closed | pole `pole:x:2:hi:162.50` (crossing, block:3:2, -z side) | 162.50, 115.75 |
| `j1` | junction | pole `pole:z:5:lo:122.50` (end, block:3:2, +x side) | 169.25, 122.50 |
| `gate` | lamp, load 1 | building `block:5:1/built\|outer\|-x\|38,23`, by its drop from `pole:z:5:lo:122.50` across `z:5` | 190.00, 122.50 |
| `j2` | junction | pole `pole:z:5:lo:132.50` (slot, block:3:2, +x side) | 169.25, 132.50 |
| `porch` | lamp, load 1 | building `block:3:2\|outer\|+x\|32,26`, by its drop from `pole:z:5:lo:132.50` | 165.00, 132.50 |
| `j3` | junction | pole `pole:z:5:lo:139.50` (slot, block:3:2, +x side) | 169.25, 139.50 |
| `steps` | lamp, load 1 | building `block:5:1/built\|outer\|-x\|38,27`, by its drop from `pole:z:5:lo:139.50` across `z:5` | 190.00, 137.50 |
| `well` | lamp, load 1, **target** | building `block:5:1/built\|outer\|-x\|38,29`, by its drop from `pole:z:5:lo:152.50` across `z:5` | 190.00, 152.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 6.50 |
| `l_main` | `br_main` → `j1` | 1 span: corner | 9.55 |
| `l_gate` | `j1` → `gate` | drop | — |
| `l_run` | `j1` → `j2` | 1 span: along | 10.00 |
| `l_porch` | `j2` → `porch` | drop | — |
| `l_up` | `j2` → `j3` | 1 span: along | 7.00 |
| `l_steps` | `j3` → `steps` | drop | — |
| `l_well` | `j3` → `well` | 1 span: along + drop | 13.00 |

## What changed

- **`gate` moved from a lamp post to a building**, fed by its drop.
- `porch` stays a building (re-laid with the district).
- `steps` stays a building (re-laid with the district).
- **`well` (a target) moved from a lamp post to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:3:2` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 4 becomes capacity 5. The job's poles carry 1 scenery building.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens with the gate lit, across `z:5` from `j1`. 1 of 5. Two faults are readable:
   - at `j2`, the next pole, the porch's drop carries a **break icon and sparks**;
   - at `j3`, one pole on, the wire runs in and nothing comes out, with no fuse to blame: a **dead junction**, two wires. Quiet.
2. **The well is the target: the building across `z:5` one span past `j3`.** Follow the current to it: its wire leaves `j3`. The sparking drop goes the other way, into the porch on the near side.
3. Repair `j3` with both wires. The steps (across from `j3`) and the well light. 4 of 5. **Win.** The porch stays dark.

## The trap

The schematic's: the sparks are the only thing moving, and they are the nearest fault on the way to the well, so a player who fixes "the fault on the way" spends a wire on the porch's drop. `j3` then needs two and Enoch has one: the well stays dark, `j3`'s prompt says *needs wire × 2, have 1*, and Undo is the way back.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 1 of 5; schematic feed 1 of 4
- win (repair:j3): city feed 4 of 5; schematic feed 3 of 4
- trap "mend the spark on the way" (repair:l_porch): city feed 2 of 5; schematic feed 2 of 4

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/08-where-it-stops.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 5, exhaustive | 5, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 1 (repair:j3) | 1 (repair:j3) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | wire, wire | wire, wire |
| Feed at that win | feed 3 of 4 | **feed 4 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 2 of 5 (40.0%) | 2 of 5 (40.0%) |
| First moves that lead only to dead ends | repair:l_porch | repair:l_porch |

Parts on hand: wire, wire. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, one trap renamed for the new lay). It replays the same on `puzzles/08-where-it-stops.json` and through this file's conversion, and `npm run check puzzles/city/08-where-it-stops.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["repair:j3"],
  "traps": [
    { "name": "mend the spark on the way",
      "moves": ["repair:l_porch"],
      "expect": { "readable": ["f1"], "complete": false },
      "recover": ["undo", "repair:j3"] }
  ]
}
```

## What it taught us
