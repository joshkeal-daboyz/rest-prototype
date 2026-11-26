# 07 · The long way — design note (series v1, puzzle 7)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 7). It has no schematic and no `from`.

- **New concept:** reroute instead of a repair you can't afford. A target can have two roads to it; when the fault on the straight one costs more than you hold, the other road is the answer.
- **The reasoning move:** when the repair is out of reach, look for another road to the same building, and send the power that way.
- **Builds on:** 2 (the switch: one line or the other), 4 (bring power to a dark line, then mend what shows), 5 (a dead junction costs two wires).
- It uses no breaker, fuse box, relay, spring, battery or second feed. The second road is the switch's other line; there is no choice of which end feeds what and no choice of where to mend (that is 9's). Nothing binds: the most the map draws is 15 of 16.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:11`**, a long block on the town's south edge, wired right round its four streets. The feed stands across `z:7` from its south-east corner.
- **One block, with neither (a) nor (b) of N2's lesson.** The two roads have to end side by side at the target. `block:6:11` is one of four blocks on this city whose poles join all the way round (`block:0:0`, `block:0:4`, `block:6:6`, `block:6:11`), so the second road goes round the block and comes to the target's pole from the other side.
- Capacity **16**: its own 2, raised once by `npm run fit -- --raise` for the 14 scenery buildings its solution lights.
- Target: `smithy`. Priority: `home`. Parts: **1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **The switch's two ways are two streets** (Josh, 26 Nov 2026, on puzzle 2: "You don't know which lines are turning off or on"). `sw` is on the corner pole, which holds no building's drop: one of its lines turns west into the south street and the other runs north up the east street, so each throw sends the pulses down one street or the other.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:7:hi:507.50` (crossing, block:7:11, across `z:7`) | 360.75, 507.50 |
| `sw` | switch, on `l_short` | pole `pole:z:7:lo:507.50` (end, block:6:11, +x side) | 344.25, 507.50 |
| `j_h` | junction | pole `pole:x:14:lo:337.50` (end, block:6:11, +z side) | 337.50, 514.25 |
| `home` | lamp, load 1 | building `block:6:11/b\|outer\|+z\|64,101`, by its drop from `j_h`'s pole | 337.50, 510.00 |
| `j_dead` | junction, **dead** | pole `pole:x:14:lo:326.67` (slot) | 326.67, 514.25 |
| `j_t` | junction | pole `pole:x:14:lo:315.83` (slot) | 315.83, 514.25 |
| `smithy` | lamp, load 1, **target** | building `block:6:11/b\|outer\|+z\|61,101`, by its drop from `j_t`'s pole | 317.50, 510.00 |
| `j_far` | junction | pole `pole:x:13:hi:272.50` (end, block:6:11, -z side), the far corner | 272.50, 465.75 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw` | 1 span: crossing (over `z:7`) | 16.50 |
| `l_short` | `sw` → `j_h` | 1 span: corner (into `x:14`) | 9.55 |
| `l_home` | `j_h` → `home` | drop | — |
| `l_a` | `j_h` → `j_dead` | 1 span: along `x:14` | 10.83 |
| `l_b` | `j_dead` → `j_t` | 1 span: along `x:14` | 10.83 |
| `l_smithy` | `j_t` → `smithy` | drop | — |
| `l_long` | `sw` → `j_far` | 10 spans: up `z:7`, the north-east corner, west along `x:13` | 109.55 |
| `l_far` | `j_far` → `j_t` | 9 spans: the north-west corner, down `z:6`, the south-west corner, east along `x:14` | 97.43 |

The straight road is 31 m (`l_short`, `l_a`, `l_b`); the long way is 207 m. `j_far` is a plain junction at the far corner. It is there for W1's reads-outward rule: one line right round the block comes back 36 m toward the switch, and two lines, each read from its own first pole, do not.

Faults (2): `f_j`, a dead junction at `j_dead` (2 wires), live and readable from the start; `f_cut`, a damaged cable on `l_far`, on its fourth span (`pole:z:6:hi:495.83` to `pole:z:6:hi:507.50`, at the south-west corner), dark at the start.

Scenery (section S), 14 buildings, all on the long way: 9 on `l_long` (6 on `block:6:11`, 3 across `x:13` on `block:6:9`), 3 on `l_far` before the cut (2 on the block, 1 across `z:6` on `block:5:10`), 2 on `l_far` past the cut. None hangs on the straight road.

## The intended read from the default camera

The camera opens on `block:6:11` and its four streets. **The smithy is on `x:14`, the block's south street, three poles west of the south-east corner** (31 m of wire from the switch), carrying the target mark. The feed's pole is across `z:7` from that corner.

1. The feed's wire crosses `z:7` to `sw`, the corner pole. Pulses run round the corner into `x:14` to a lit home, and one span on to a junction that **fizzes across two gaps**. The smithy is the next pole along, dark. The HUD reads 1 of 16; one wire is in hand.
2. Two gaps, one wire (5's rule). The junction's prompt reads *needs 2, have 1*. The straight road can't be paid for.
3. The switch has a second line, dark, going the other way: up `z:7`. Follow it: along the north street, down the west street, and back along `x:14` to the smithy's own pole from the far side.
4. Throw `sw`. The home goes dark. Pulses run up `z:7` and round the block, twelve houses light along the way, and the pulses stop at a **spark** at the south-west corner. 12 of 16. The spark reads +3.
5. Click the spark. The wire is spent, the last two houses light, and the smithy burns gold. 15 of 16. **Win.** The junction still fizzes, now from its other side.

**Hidden at the start (1 fact):** the spark on the long way. One free throw of the switch shows it, and nothing can be spent before it shows. **Layers (2):** the reroute, then the mend.

## The trap

**The dead junction is pointed at and can't be paid for; the switch is marked but turned away.** As the plan's row. The junction stands 11 m from the smithy, on the road the pulses are already running down, and the wire in hand looks meant for it. Clicking it does nothing: the repair is refused (*needs 2, have 1*) and the wire stays in hand. The player who waits for a second wire waits for ever; the one who looks at where the switch's other line goes has the answer.

There is no dead end in this puzzle: the one wire has one place it can go.

## The numbers (section V)

**None is red**, because nothing binds. At the start `sw` reads **+14**: it counts the unread spark as sound, so it promises the whole long way and the smithy, less the home. `j_dead` reads +15 and cannot be paid. After the throw the HUD has gone up by 11, not 14, and the spark has a number of its own, +3. The wrong move here is not a load and not a part: it is a click that is refused.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**: it is on the straight road, before the dead junction, and the switch has turned away from it. Fourteen houses round the block are lit in its place.

## Series rules

- Size 2 faults / wire / 1 switch, as the row. Own buildings: 2. Faults: 2.
- No fuse box, so no fuse blow.
- **Kit: 1 wire.** Puzzle 6's kit is fuse and bulb, puzzle 8's is 1 fuse: no repeat.
- Heavy building: none (puzzle 6 had none; puzzle 8's is the mill).
- **Shrine count: 1 of 5** (puzzle 1; the target here is the smithy).
- District `block:6:11`; puzzle 6 is on `block:0:8`, puzzle 8 on `block:6:3`. The feed's pole is across `z:7` on `block:7:11`; four scenery buildings are across streets on `block:6:9` and `block:5:10`. `block:6:9` is puzzle 10's district, which is not a neighbour of 7.
- Districts used so far: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`.

## Expected numbers

`npm run analyze puzzles/city/s07-the-long-way.city.json`:

| | |
| --- | --- |
| States | 3, exhaustive |
| Solvable | yes |
| Fewest clicks | **2** (`sw`, `repair:l_far`) |
| Winning click orders | 1 |
| Winning configurations | **1** |
| Parts used | wire (1 of 1) |
| Feed at the shortest win | 15 of 16 |
| Fuses that blow | none |
| Dead-end states | 0 of 3 (0.0%) |
| First moves that lead only to dead ends | none |
| First moves the simulator takes | `sw` only |
| Hidden at the start | 1: the spark on the long way |

**Short of N2's band by one click, and why (for the architect; "stop 081 N2" on this one number).** The band for 6 to 15 asks for 3 to 6 clicks; this is 2. The row's size (2 faults, 1 wire, 1 switch, one fault a dead junction) cannot give a third: the junction can never be paid, the wire mends one cable, and a second throw of the switch is never needed, because a cable the final position sends current through is already live, and so readable, in that position. A third click needs a third control, which the row's size does not have. The size is kept and the count is reported; nothing was changed to pass.

**The obvious wrong first move:** clicking the dead junction with the wire. Read: the prompt says *needs 2, have 1* and nothing changes. Verified by replaying `repair:j_dead` from the start through the conversion: it is refused ("needs 2 wire, have 1") and the state is the start's. Recovered by doing nothing. A check block cannot hold a refused move, so its trap is the half-solution: the switch alone darkens the home and shows the spark, and the mend wins from there.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw", "repair:l_far"],
  "traps": [
    { "name": "the switch alone",
      "moves": ["sw"],
      "expect": { "lit": [], "readable": ["f_cut"], "complete": false },
      "recover": ["repair:l_far"] }
  ]
}
```

## To watch when Josh plays it

- Whether the long way can be traced by eye right round the block, 207 m and 19 spans, from the one fixed camera.
- Fourteen scenery houses light with the job, so the HUD goes 1, 12, 15 of 16. Whether that reads as "the long way" or as noise.
- This puzzle has one order and no dead end, as 4 did. Whether the refused click on the junction is lesson enough, or it wants a place where the wire can be wasted.

## What it taught us
