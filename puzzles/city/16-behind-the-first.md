# 16 · Behind the first (city form) — design note

The city form of [`puzzles/16-behind-the-first.md`](../16-behind-the-first.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **faults hide faults**: open the dark first, read what it hides, spend last. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `16-behind-the-first`. City: 6 x 6 seed 1, one-way on.
- District: `block:5:4`. `block:5:4`'s corner by the feed's crossing over `z:5`; the job runs straight along `x:7`. Every lamp but the shrine is on the block's own side; the shrine is across `x:7`.
- Capacity **8**; `fb_A` rated **5**. Target: `shrine`; priority: `yard`. Parts: fuse, wire, wire.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:5:lo:242.50` (end, block:3:4, +x side) | 169.25, 242.50 |
| `br_main` | breaker, closed | pole `pole:z:5:hi:242.50` (crossing, block:5:4, -x side) | 185.75, 242.50 |
| `j1` | junction | pole `pole:x:7:lo:192.50` (end, block:5:4, +z side) | 192.50, 249.25 |
| `yard` | lamp, load 1 | building `block:5:4/built\|outer\|+z\|38,48`, by its drop from `pole:x:7:lo:192.50` | 192.50, 245.00 |
| `fb_A` | fusebox, rating 5 | pole `pole:x:7:lo:205.00` (slot, block:5:4, +z side) | 205.00, 249.25 |
| `j2` | junction | pole `pole:x:7:lo:217.50` (slot, block:5:4, +z side) | 217.50, 249.25 |
| `gate` | lamp, load 1 | building `block:5:4/built\|outer\|+z\|42,48`, by its drop from `pole:x:7:lo:217.50` | 217.50, 245.00 |
| `j3` | junction | pole `pole:x:7:lo:230.50` (slot, block:5:4, +z side) | 230.50, 249.25 |
| `stair` | lamp, load 1 | building `block:5:4/built\|outer\|+z\|46,48`, by its drop from `pole:x:7:lo:230.50` | 232.50, 245.00 |
| `shrine` | lamp, load 1, **target** | building `block:5:7\|outer\|-z\|45,54`, by its drop from `pole:x:7:lo:230.50` across `x:7` | 232.50, 270.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 16.50 |
| `l_main` | `br_main` → `j1` | 1 span: corner | 9.55 |
| `l_yard` | `j1` → `yard` | drop | — |
| `l_fb` | `j1` → `fb_A` | 1 span: along | 12.50 |
| `l_out` | `fb_A` → `j2` | 1 span: along | 12.50 |
| `l_gate` | `j2` → `gate` | drop | — |
| `l_run` | `j2` → `j3` | 1 span: along | 13.00 |
| `l_stair` | `j3` → `stair` | drop | — |
| `l_shrine` | `j3` → `shrine` | drop | — |

## What changed

- `yard` stays a building (re-laid with the district).
- `gate` stays a building (re-laid with the district).
- `stair` stays a building (re-laid with the district).
- `shrine` (a target) stays a building (re-laid with the district).
- **District:** P2a laid it on `block:0:0`; now `block:5:4` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 4, fb_A rating 3 becomes capacity 8, fb_A rating 5. The job's poles carry 4 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens with no job lamp lit. The current runs from the corner to `j1` and splits:
   - one pole on, `fb_A` shows the blown ✕: in, none out. Everything past it (the gate, `j3`, the stair, the shrine) is dark and unreadable;
   - at `j1` itself, the yard's drop carries a **break icon** and sparks. The yard is the tribe's priority.
   Two faults are readable, and the parts (fuse, wire, wire) seem to cover both with a wire to spare.
2. Repair `fb_A`. The gate lights on `j2`; the current runs on to `j3` and stops: in, none out, no fuse. A **dead junction**, two wires. The fuse holds.
3. Repair `j3` with both wires. The stair and **the shrine, across `x:7` from `j3`, the last pole of the run,** light. `fb_A` 5 of 5, the feed 7 of 8. **Win.** The yard stays dark.

## The trap

The schematic's: fix everything you can see, the fuse and the yard's sparking drop. That spends a wire before the player knows what is behind the fuse, and the dead junction it reveals needs two: the shrine stays dark, `j3`'s prompt says *needs wire × 2, have 1*, and Undo is the way back. Repairing the yard at any point makes the shrine unreachable.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 2 of 8; `fb_A` 0 of 5; blown `fb_A`; schematic feed 0 of 4; `fb_A` 0 of 3; blown `fb_A`
- win (repair:fb_A, repair:j3): city feed 7 of 8; `fb_A` 5 of 5; schematic feed 3 of 4; `fb_A` 3 of 3
- trap "fix everything you can see" (repair:fb_A, repair:l_yard): city feed 6 of 8; `fb_A` 3 of 5; schematic feed 2 of 4; `fb_A` 1 of 3

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/16-behind-the-first.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 9, exhaustive | 9, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 2 (repair:fb_A, repair:j3) | 2 (repair:fb_A, repair:j3) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | fuse, wire, wire | fuse, wire, wire |
| Feed at that win | feed 3 of 4 | **feed 7 of 8** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 4 of 9 (44.4%) | 4 of 9 (44.4%) |
| First moves that lead only to dead ends | repair:l_yard | repair:l_yard |

Parts on hand: fuse, wire, wire. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/16-behind-the-first.json` and through this file's conversion, and `npm run check puzzles/city/16-behind-the-first.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb_A", "repair:j3"],
  "traps": [
    { "name": "fix everything you can see",
      "moves": ["repair:fb_A", "repair:l_yard"],
      "expect": { "readable": ["f3"], "complete": false },
      "recover": ["undo", "repair:j3"] }
  ]
}
```

## What it taught us
