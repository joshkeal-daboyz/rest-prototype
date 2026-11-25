# 08 · Where it stops (city form) — design note

The city form of [`puzzles/08-where-it-stops.md`](../08-where-it-stops.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the dead junction**, read by where the current stops, against a louder spark), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights.

## Where it stands

- `from`: `08-where-it-stops`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block. The whole job is the first four poles of `x:2`'s pole line on the block's south side: `br_main` on the corner, then `j1`, `j2`, `j3` at 11.7 m apart.
- Capacity **6** (the schematic's 4, raised by 2), 2 wires, target the well, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `br_main` | breaker, closed | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `j1` | junction | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `gate` | lamp, load 1 | lamp post under `span:pole:x:2:lo:27.50~pole:x:2:lo:39.17` | 33.33, 109.25 |
| `j2` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `porch` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |
| `j3` | junction | pole `pole:x:2:lo:62.50` (slot, block:0:0, +z side) | 62.50, 109.25 |
| `steps` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|12,20` | 62.50, 105.00 |
| `well` | lamp, load 1 | lamp post under `span:pole:x:2:lo:50.83~pole:x:2:lo:62.50` | 56.67, 109.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 6.50 |
| `l_main` | `br_main` → `j1` | 1 span: along | 11.67 |
| `l_gate` | `j1` → `gate` | lead | — |
| `l_run` | `j1` → `j2` | 1 span: along | 11.67 |
| `l_porch` | `j2` → `porch` | drop. **Fault `f2` cuts the drop** | — |
| `l_up` | `j2` → `j3` | 1 span: along | 11.67 |
| `l_steps` | `j3` → `steps` | drop | — |
| `l_well` | `j3` → `well` | lead | — |

The fit's places are kept, and they keep the schematic's misdirection: the porch (a building, its drop from `j2`) and the well (a lamp post under the span from `j2` to `j3`, fed by its lead from `j3`) stand 6 m apart. **The cut** (`f2`) is the porch's drop, the line's only piece, so there is no span to choose: the break shows on the drop wire from `j2`'s pole to the porch's wall.

## What changed from the schematic, and why

One thing changed: **the capacity, 4 to 6.**

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights two scenery buildings, so 4 + 2 = 6.
- **The two scenery buildings** are on `br_main`'s pole (on the feed's side of the breaker) and on `j2`'s (across `x:2`). Both are upstream of both faults, so they are lit in every state and add 2 to every load. Nothing hangs behind `j3`: its pole carries only the steps.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j2~s` | node pole: `j2` | 1 | 0 / 1 | yes | yes |
| `l_feed~h2~s` | node pole: `br_main` | 1 | 1 / 0 | yes | yes |
| | | **2** | **1 / 1** | | |

Buildings: `l_feed~h2~s`: `block:0:0/b|outer|+z|5,20`; `j2~s`: `block:0:2/a|outer|-z|8,24`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 3 of 6; schematic feed 1 of 4
- win (repair:j3): city feed 5 of 6; schematic feed 3 of 4
- trap "mend the spark beside the well" (repair:l_porch): city feed 4 of 6; schematic feed 2 of 4

## The intended read from the default camera

1. The view opens with the gate's lamp post lit, between the corner and `j1`. 3 of 6. Two faults are readable:
   - at `j2`, the porch's drop wire carries a **break icon and sparks**, right beside the dark well's lamp post;
   - at `j3`, one pole on, the wire runs in and nothing comes out, with no fuse to blame: a **dead junction**, two wires. Quiet.
2. Follow the current to the well, not the eye: the well's lead leaves `j3`, not the sparking drop.
3. Repair `j3` with both wires. The steps' windows and the well's lamp post light. 5 of 6. **Win.** The porch stays dark.

## The trap

The schematic's: the sparks are the only thing moving, and they sit beside the dark target, so a player who fixes "the fault near the well" spends a wire on the porch's drop. `j3` then needs two and Enoch has one: the well stays dark, `j3`'s prompt says *needs wire × 2, have 1*, and Undo is the way back.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/08-where-it-stops.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 5, exhaustive | 5, exhaustive |
| Solvable | yes | yes |
| Min clicks | 1 (repair:j3) | 1 (repair:j3) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | wire, wire | wire, wire |
| Feed at the win | feed 3 of 4 | **feed 5 of 6** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 2 of 5 (40.0%) | 2 of 5 (40.0%) |
| First moves that lead only to dead ends | repair:l_porch | repair:l_porch |

Parts needed: 2 wires, as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/08-where-it-stops.json`) and through this file's conversion, and `npm run check puzzles/city/08-where-it-stops.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["repair:j3"],
  "traps": [
    { "name": "mend the spark beside the well",
      "moves": ["repair:l_porch"],
      "expect": { "readable": ["f1"], "complete": false },
      "recover": ["undo", "repair:j3"] }
  ]
}
```

## What it taught us
