# 10 · Around the dead post (city form) — design note

The city form of [`puzzles/10-around-the-dead-post.md`](../10-around-the-dead-post.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the reroute**, at early-ladder strength: the dead junction on the straight line, the long way round, and a brownout from the repair), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights.

## Where it stands

- `from`: `10-around-the-dead-post`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, about 75 m square. The short way and the long way are literal: the dead post `j_dead` is one pole east of the south-west corner on `x:2` and the shrine two poles east, 26 m of wire from `sw_1`; the long way leaves the corner roof down `z:0` (the west side), past `br_long` and `j_mid`, and goes right round the block's north and east sides back along `x:2` to the shrine's pole, 288 m in all.
- Capacity **22** (the schematic's 3, raised by 19), 1 wire, target the shrine, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `home` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|5,20` | 27.50, 105.00 |
| `sw_1` | switch, 0 `l_short`, 1 `l_long`; set 0 | roof structure `roof:5:20` (corner, on `block:0:0/b\|outer\|+z\|5,20`) | 25.60, 104.40 |
| `j_dead` | junction | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `br_long` | breaker, open | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `j_mid` | junction | pole `pole:z:0:hi:40.00` (slot, block:0:0, -x side) | 20.75, 40.00 |
| `br_mill` | breaker, closed | pole `pole:z:0:hi:27.50` (end, block:0:0, -x side) | 20.75, 27.50 |
| `mill` | lamp, load 2 | lamp post under `span:pole:z:0:hi:27.50~pole:z:0:hi:40.00` | 20.75, 33.75 |
| `j_post` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `shrine` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_home` | `j0` → `home` | drop | — |
| `l_sw` | `j0` → `sw_1` | 1 span: roof (pavement) | 5.21 |
| `l_short` | `sw_1` → `j_dead` | 1 span: roof (pavement) | 14.41 |
| `l_post` | `j_dead` → `j_post` | 1 span: along | 11.67 |
| `l_long` | `sw_1` → `br_long` | 1 span: roof (pavement) | 5.21 |
| `l_long2` | `br_long` → `j_mid` | 5 spans: 5 along. **Fault `f2` cuts span 3 of 5, `span:pole:z:0:hi:65.50~pole:z:0:hi:77.50`** | 62.50 |
| `l_long3` | `j_mid` → `j_post` | 17 spans: 6 roof (pavement), 11 along | 220.47 |
| `l_m0` | `j_mid` → `br_mill` | 1 span: along | 12.50 |
| `l_mill` | `br_mill` → `mill` | lead | — |
| `l_shrine` | `j_post` → `shrine` | drop | — |

The fit's places are kept, with one choice of the designer's: **the cut** (`f2`) is on span 3 of `l_long2`'s 5, `span:pole:z:0:hi:65.50~pole:z:0:hi:77.50`, half-way down the block's west side. The fit's default, the first span, has its middle 6 m from `br_long`'s icon at the corner; in the middle of the run the break reads as a break in the long way's wire, away from the breaker the player has just closed, and inside the frame. The designer replayed the cut on each of the five spans (raised each time): all five play the same as the schematic, so the choice is the camera's alone.

## What changed from the schematic, and why

One thing changed: **the capacity, 3 to 22.**

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights 19 scenery buildings, all along the long way, so 3 + 19 = 22.
- **The 19 buildings.** All are on the long way's poles, past `br_long`, so none is lit at the start (1 of 22, the home, as the schematic's 1 of 3). Two light when `br_long` closes (the carriers before the cut); the other 17 light with the repair. 14 are on `l_long3`'s carriers round the block's north and east sides; 5 stand across a street, on `block:3:0` and `block:0:2`.
- The win keeps the schematic's margin, 1 to spare (21 of 22), and leaving the mill on is still 1 over (23 of 22).

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j_mid~s` | node pole: `j_mid` | 1 | 1 / 0 | no | yes |
| `j_post~s` | node pole: `j_post` | 1 | 0 / 1 | no | yes |
| `l_long2~h1~s` | carrier of `l_long2` | 2 | 2 / 0 | no | yes |
| `l_long2~h2~s` | carrier of `l_long2` | 1 | 1 / 0 | no | yes |
| `l_long3~h1~s` | carrier of `l_long3` | 14 | 10 / 4 | no | yes |
| | | **19** | **14 / 5** | | |

Buildings: `l_long3~h1~s`: `block:0:0/a|outer|-z|8,5`, `block:0:0/a|outer|-z|12,5`, `block:0:0/a|outer|-z|16,5`, `block:0:0/a|outer|+x|19,6`, `block:0:0/a|outer|+x|19,9`, `block:0:0/b|outer|+x|19,13`, `block:0:0/b|outer|+x|19,15`, `block:0:0/b|outer|+x|19,17`, `block:0:0/b|outer|+z|12,20`, `block:0:0/b|outer|+z|15,20`, `block:3:0/a|outer|-x|25,9`, `block:3:0/b|outer|-x|25,13`, `block:0:2/b|outer|-z|14,24`, `block:0:2/b|outer|-z|16,24`; `j_mid~s`: `block:0:0/a|outer|-x|5,6`; `l_long2~h2~s`: `block:0:0/a|outer|-x|5,10`; `l_long2~h1~s`: `block:0:0/b|outer|-x|5,14`, `block:0:0/b|outer|-x|5,17`; `j_post~s`: `block:0:2/a|outer|-z|8,24`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 1 of 22; schematic feed 1 of 3
- win (sw_1, br_long, br_mill, repair:l_long2): city feed 21 of 22; schematic feed 2 of 3
- trap "the repair browns it out" (sw_1, br_long, repair:l_long2): city feed 23 of 22 (brownout); schematic feed 4 of 3 (brownout)

## The intended read from the default camera

1. The view opens at 1 of 22, the home's windows lit on the south-west corner. The current runs from `sw_1` on the corner roof to `j_dead`, one pole east, and stops: in, none out, no fuse. A **dead junction**, *needs wire × 2*. Enoch has one. The shrine's building is the next pole on.
2. Throw `sw_1`. The current runs down to `br_long` on the corner of `z:0` and stops: open, not broken.
3. Close `br_long`. The current runs down the block's west side and stops at a **break icon** with sparks half-way down. The mill's lamp post and the shrine are still dark.
4. Repair it. The long way goes live round the block; the mill (2) and the shrine (1) light: **23 of 22, brownout.**
5. Open `br_mill`, at the block's north-west corner. 21 of 22. **Win.** (`br_mill` can be opened at any point.)

## The trap

The schematic's: the dead junction is the first fault the player can read, on the straight way to the shrine, and its prompt says *needs wire × 2* and spends nothing. The switch beside it, on the corner roof, is pointed away. Then the reroute ends in a brownout, which looks as if the repair broke something; the HUD says 23 of 22 and the mill is the branch to shed. The one wire can only be spent on the long way's break, so it can't be wasted.

As the schematic notes, once the long way is live the current also runs back from the shrine's pole to `j_dead` from the far side; here that is one span along `x:2`.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/10-around-the-dead-post.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks | 4 (sw_1, br_long, br_mill, repair:l_long2) | 4 (sw_1, br_long, br_mill, repair:l_long2) |
| Winning orders / configurations | 8 / 1 | 8 / 1 |
| Parts used | wire | wire |
| Feed at the win | feed 2 of 3 | **feed 21 of 22** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: 1 wire, as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and its second trap (the repair's brownout), made executable; the first trap (trying the dead junction) is refused by its prompt and leaves no state to check. It replays the same on the schematic (`puzzles/10-around-the-dead-post.json`) and through this file's conversion, and `npm run check puzzles/city/10-around-the-dead-post.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["sw_1", "br_long", "br_mill", "repair:l_long2"],
  "traps": [
    { "name": "the repair browns it out",
      "moves": ["sw_1", "br_long", "repair:l_long2"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_mill"] }
  ]
}
```

## What it taught us
