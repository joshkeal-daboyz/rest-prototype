# 16 · Behind the first (city form) — design note

The city form of [`puzzles/16-behind-the-first.md`](../16-behind-the-first.md), fitted by `npm run fit` (ticket 081 P1) and **re-laid by hand** by the designer (P2a) for the camera, then raised with `npm run fit -- --raise`. The element under test (**faults hide faults**: open the dark first, read what it hides, spend last), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity and `fb_A`'s rating raised by the scenery the win lights. The re-lay moves places, not the puzzle.

## Where it stands

- `from`: `16-behind-the-first`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block. The whole job is `x:2`'s pole line on the block's south side, from the corner pole (`br_main`) east to the south-east corner, one node to a pole: `j1` (the yard), `fb_A`, `j2` (the gate), `j3` (the stair), and the shrine's building at the end.
- Capacity **8** (the schematic's 4, raised by 4), `fb_A` rating **5** (3, raised by 2), a fuse and 2 wires, target the shrine, priority the yard, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `br_main` | breaker, closed | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `j1` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `yard` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |
| `fb_A` | fuse box, rating 5 | pole `pole:x:2:lo:62.50` (slot, block:0:0, +z side) | 62.50, 109.25 |
| `j2` | junction | pole `pole:x:2:lo:74.17` (slot, block:0:0, +z side) | 74.17, 109.25 |
| `gate` | lamp, load 1 | building `block:0:2/b\|outer\|-z\|14,24`, its drop across `x:2` | 72.50, 120.00 |
| `j3` | junction | pole `pole:x:2:lo:85.83` (slot, block:0:0, +z side) | 85.83, 109.25 |
| `stair` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|15,20` | 87.50, 105.00 |
| `shrine` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|18,20` | 97.50, 105.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 6.50 |
| `l_main` | `br_main` → `j1` | 2 spans: 2 along | 23.33 |
| `l_yard` | `j1` → `yard` | drop. **Fault `f2` cuts the drop** | — |
| `l_fb` | `j1` → `fb_A` | 1 span: along | 11.67 |
| `l_out` | `fb_A` → `j2` | 1 span: along | 11.67 |
| `l_gate` | `j2` → `gate` | drop | — |
| `l_run` | `j2` → `j3` | 1 span: along | 11.67 |
| `l_stair` | `j3` → `stair` | drop | — |
| `l_shrine` | `j3` → `shrine` | 1 span: along + drop | 11.67 |

**Why the re-lay.** The fit put `j1` on the pole next to the corner, which has no building, so the yard became a lamp post fed by an underground lead from `j1`. A cut lead has no wire of its own in the 3D view: the conversion names the post's span as the cut (`converted.cuts`), and that span is `l_main`'s, the live line beside it. The yard's break would then be drawn on the wrong wire, and the trap is "two faults readable at the start". The designer moved `j1` one pole east, to the pole whose building can be the yard, so **`f2` cuts the yard's drop**: a wire of its own, from `j1`'s pole to the yard's wall. Everything past it moves one pole east with it (`fb_A`, `j2`, `j3`), and the shrine becomes the building at the end of the line instead of a lamp post. `l_main` now runs two spans, over a carrier pole with no building. The city check passes, and the analyzer's numbers and the check block are the schematic's.

## What changed from the schematic, and why

Two numbers changed: **the capacity, 4 to 8, and `fb_A`'s rating, 3 to 5.**

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights four scenery buildings, so 4 + 4 = 8. Two of them are past `fb_A` (on its own pole and on `j3`'s), so 3 + 2 = 5.
- **What the fuse reads.** `fb_A` peaks at its rating at the win (5 of 5, the gate, the stair, the shrine and its 2 buildings), as the schematic's 3 of 3, and never blows. Two buildings are lit from the start (on `br_main`'s and `j1`'s poles), so the HUD opens at 2 of 8 where the schematic's opened at 0 of 4; no job lamp is lit, as the schematic.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `fb_A~s` | node pole: `fb_A` | 1 | 1 / 0 | no | yes |
| `j1~s` | node pole: `j1` | 1 | 0 / 1 | yes | yes |
| `j3~s` | node pole: `j3` | 1 | 0 / 1 | no | yes |
| `l_feed~h2~s` | node pole: `br_main` | 1 | 1 / 0 | yes | yes |
| | | **4** | **2 / 2** | | |

Buildings: `l_feed~h2~s`: `block:0:0/b|outer|+z|5,20`; `fb_A~s`: `block:0:0/b|outer|+z|12,20`; `j1~s`: `block:0:2/a|outer|-z|8,24`; `j3~s`: `block:0:2/b|outer|-z|16,24`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 2 of 8; `fb_A` 0; schematic feed 0 of 4; `fb_A` 0
- win (repair:fb_A, repair:j3): city feed 7 of 8; `fb_A` 5; schematic feed 3 of 4; `fb_A` 3
- trap "fix everything you can see" (repair:fb_A, repair:l_yard): city feed 5 of 8; `fb_A` 2; schematic feed 2 of 4; `fb_A` 1

## The intended read from the default camera

1. The view opens with no job lamp lit. The wire runs from the corner to `j1` and splits:
   - one pole on, `fb_A` shows the blown ✕: in, none out. Everything past it (the gate, `j3`, the stair, the shrine at the south-east corner) is dark and unreadable;
   - at `j1` itself, the yard's drop wire carries a **break icon** and sparks. The yard is the tribe's priority.
   Two faults are readable, and the parts (fuse, wire, wire) seem to cover both with a wire to spare.
2. Repair `fb_A`. The gate's windows light; the current runs on to `j3` and stops: in, none out, no fuse. A **dead junction**, two wires. The fuse holds.
3. Repair `j3` with both wires. The stair and the shrine light. `fb_A` 5 of 5, the feed 7 of 8. **Win.** The yard stays dark.

## The trap

The schematic's: fix everything you can see, the fuse and the yard's sparking drop. That spends a wire before the player knows what is behind the fuse, and the dead junction it reveals needs two: the shrine stays dark, `j3`'s prompt says *needs wire × 2, have 1*, and Undo is the way back. Repairing the yard at any point makes the shrine unreachable.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/16-behind-the-first.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 9, exhaustive | 9, exhaustive |
| Solvable | yes | yes |
| Min clicks | 2 (repair:fb_A, repair:j3) | 2 (repair:fb_A, repair:j3) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | fuse, wire, wire | fuse, wire, wire |
| Feed at the win | feed 3 of 4 | **feed 7 of 8** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 4 of 9 (44.4%) | 4 of 9 (44.4%) |
| First moves that lead only to dead ends | repair:l_yard | repair:l_yard |

Parts needed: 1 fuse and 2 wires (all of them), as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/16-behind-the-first.json`) and through this file's conversion, and `npm run check puzzles/city/16-behind-the-first.city.json` passes.

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
