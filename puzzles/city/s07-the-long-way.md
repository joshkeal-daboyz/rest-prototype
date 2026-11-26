# 07 · The long way — design note (series v1, puzzle 7)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 7). It has no schematic and no `from`.

- **New concept:** reroute instead of a repair you can't afford. A target can have two roads to it; when the fault on the straight one costs more than you hold, the other road is the answer.
- **The reasoning move:** when the repair is out of reach, look for another road to the same building, and clear that road instead: follow it from the switch and deal with each thing that stops the current, in the order the current meets them.
- **Builds on:** 1 (a whole wire that is dark stops at an open breaker), 2 (the switch: one line or the other), 4 (bring power to a dark line, then mend what shows), 5 (a dead junction costs two wires).
- It uses no fuse box, relay, spring, battery or second feed. The second road is the switch's other line; there is no choice of which end feeds what and no choice of where to mend (that is 9's). Nothing binds: the most the map draws is 15 of 16.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:11`**, a long block on the town's south edge, wired right round its four streets. The feed stands across `z:7` from its south-east corner.
- **One block, with neither (a) nor (b) of N2's lesson.** The two roads have to end side by side at the target. `block:6:11` is one of four blocks on this city whose poles join all the way round (`block:0:0`, `block:0:4`, `block:6:6`, `block:6:11`), so the second road goes round the block and comes to the target's pole from the other side.
- Capacity **16**: its own 2, raised once by `npm run fit -- --raise` for the 14 scenery buildings its solution lights.
- Target: `smithy`. Priority: `home`. Parts: **1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, switch or fuse box on a branch pole** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split"; on puzzle 2: "You don't know which lines are turning off or on"). The rule counts every wire the city hangs on the pole, the job's or not. `br_l` is on `pole:x:14:lo:285.83`, which carries two spans and nothing else (along to `x:14:lo:272.50`, `l_far`; along to `x:14:lo:294.17`, `l_last`). `sw` is on the corner pole `pole:z:7:lo:507.50`, which carries its own three wires and nothing else (the crossing from the feed, `l_feed`; the corner to `x:14:lo:337.50`, `l_short`; along to `z:7:lo:495.83`, `l_long`): one way turns west into the south street and the other runs north up the east street, so each throw sends the pulses down one street or the other.

**Josh's ruling, 26 Nov 2026, on a card ("stop 081 N2": the row's size gave 2 clicks, under the band's 3): "Add a breaker".** The breaker is `br_l`, an **open** breaker on the long way, two poles short of the smithy. Its job: the long way is not only broken, it is also switched off, so the road has two stops on it, a free one and one that costs the wire. (A first version had a closed breaker that shed a works past the target; the review found that the same move as puzzle 9's added breaker, and Josh's complaint was repetition, so 7's breaker now does 1's job on a new road and 9's does the shedding.) The size is 2 faults / wire / 1 switch, 1 breaker.

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
| `br_l` | breaker, **open** | pole `pole:x:14:lo:285.83` (slot, two spans, no drop) | 285.83, 514.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw` | 1 span: crossing (over `z:7`) | 16.50 |
| `l_short` | `sw` → `j_h` | 1 span: corner (into `x:14`) | 9.55 |
| `l_home` | `j_h` → `home` | drop | — |
| `l_a` | `j_h` → `j_dead` | 1 span: along `x:14` | 10.83 |
| `l_b` | `j_dead` → `j_t` | 1 span: along `x:14` | 10.83 |
| `l_smithy` | `j_t` → `smithy` | drop | — |
| `l_long` | `sw` → `j_far` | 10 spans: up `z:7`, the north-east corner, west along `x:13` | 109.55 |
| `l_far` | `j_far` → `br_l` | 6 spans: the north-west corner, down `z:6`, the south-west corner, east along `x:14` | 67.43 |
| `l_last` | `br_l` → `j_t` | 3 spans: along `x:14` | 30.00 |

The straight road is 31 m along the south street: home, dead junction, smithy. The long way is 207 m and comes to the smithy's pole from the west, through `br_l`. `j_far` is a plain junction at the far corner. It is there for W1's reads-outward rule: one line right round the block comes back toward the switch, and lines read each from its own first pole do not.

Faults (2): `f_j`, a dead junction at `j_dead` (2 wires), live and readable from the start; `f_cut`, a damaged cable on `l_last`, on its second span (`pole:x:14:lo:294.17` to `pole:x:14:lo:305.00`), past the open breaker and dark at the start.

Scenery (section S), 14 buildings, all on the long way: 9 on `l_long` (6 on `block:6:11`, 3 across `x:13` on `block:6:9`), 4 on `l_far` (3 on the block, 1 across `z:6` on `block:5:10`), 1 on `l_last` before the cut. None hangs on the straight road.

## The intended read from the default camera

The camera opens on `block:6:11` and its four streets. **The smithy is on `x:14`, the block's south street, three poles west of the south-east corner** (31 m of wire from the switch), carrying the target mark. The feed's pole is across `z:7` from that corner.

1. The feed's wire crosses `z:7` to `sw`, the corner pole. Pulses run round the corner into `x:14` to a lit home, and one span on to a junction that **fizzes across two gaps**. The smithy is the next pole along, dark. The HUD reads 1 of 16; one wire is in hand.
2. Two gaps, one wire (5's rule). The junction's prompt reads *needs 2, have 1*. The straight road can't be paid for.
3. The switch has a second line, dark, going the other way: up `z:7`. Follow it: along the north street, down the west street, and back along `x:14` to the smithy's own pole from the far side, through a breaker that stands open.
4. Throw `sw`. The home goes dark. Pulses run up `z:7` and round the block, thirteen houses light along the way, and the pulses stop at the **open breaker**, three poles short of the smithy. 13 of 16.
5. Close `br_l`. One more house lights, and one span on the pulses stop again, at a **spark**. 14 of 16. The spark reads +1.
6. Click the spark. The wire is spent and the smithy burns gold. 15 of 16. **Win.** The junction still fizzes, now from its other side.

**Hidden at the start (1 fact):** the spark on the long way, behind the open breaker. The throw and the breaker show it, both free, and nothing can be spent before it shows. **Layers (2):** the reroute (the switch), then clearing the new road (the breaker, the mend).

## The trap

**The dead junction is pointed at and can't be paid for; the switch is marked but turned away.** As the plan's row. The junction stands 11 m from the smithy, on the road the pulses are already running down, and the wire in hand looks meant for it. Clicking it does nothing: the repair is refused (*needs 2, have 1*) and the wire stays in hand. The player who waits for a second wire waits for ever; the one who looks at where the switch's other line goes has the answer.

The breaker adds a second stop, not a second trap: after the throw the smithy is still dark and no fault shows anywhere on the long way, because the current has stopped at a breaker (1's lesson, on a new road).

There is no dead end in this puzzle: the one wire has one place it can go.

## The numbers (section V)

**None is red**, because nothing binds. At the start `sw` reads +12 (the long way as far as the open breaker, less the home), `br_l` +0, and `j_dead` +2 and can't be paid. After the throw `br_l` reads +2: it counts the unread spark as sound, so it promises the smithy with the house, and gives the house. After the breaker the spark reads +1. The wrong move here is not a load and not a part: it is a click that is refused.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**: it is on the straight road, before the dead junction, and the switch has turned away from it. Fourteen houses round the block are lit in its place.

## Series rules

- Size 2 faults / wire / 1 switch, **1 breaker** (the row's size and Josh's "Add a breaker"). Own buildings: 2. Faults: 2.
- No fuse box, so no fuse blow.
- **Kit: 1 wire.** Puzzle 6's kit is fuse and bulb, puzzle 8's is 1 fuse: no repeat.
- Heavy building: none (puzzle 6 had none; puzzle 8's is the mill).
- **Shrine count: 1 of 5** (puzzle 1; the target here is the smithy).
- District `block:6:11`; puzzle 6 is on `block:0:8`, puzzle 8 on `block:6:3`. The feed's pole is across `z:7` on `block:7:11`; four scenery buildings are across streets on `block:6:9` and `block:5:10`, neither a series district.
- Districts used so far: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`.

## Expected numbers

`npm run analyze puzzles/city/s07-the-long-way.city.json`:

| | |
| --- | --- |
| States | 5, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`sw`, `br_l`, `repair:l_last`) |
| Winning click orders | 2 (the switch and the breaker in either order, then the mend) |
| Winning configurations | **1** (`sw` on the long way, `br_l` closed, the spark mended) |
| Parts used | wire (1 of 1) |
| Feed at the shortest win | 15 of 16 |
| Fuses that blow | none |
| Dead-end states | 0 of 5 (0.0%) |
| First moves that lead only to dead ends | none |
| First moves the simulator takes | `sw`, `br_l` |
| Hidden at the start | 1: the spark on the long way |

Loads, replayed on the conversion: start 1 of 16; `sw` 13 of 16; `sw`, `br_l` 14 of 16; win 15 of 16.

**The obvious wrong first move:** clicking the dead junction with the wire. Read: the prompt says *needs 2, have 1* and nothing changes. Verified by replaying `repair:j_dead` from the start through the conversion: it is refused ("needs 2 wire, have 1") and the state is the start's. Recovered by doing nothing. A check block cannot hold a refused move, so its traps are the two half-solutions: the switch alone (the home dark, no fault showing), and the switch and the breaker (the spark showing), each won from where it stands.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw", "br_l", "repair:l_last"],
  "traps": [
    { "name": "the switch alone",
      "moves": ["sw"],
      "expect": { "lit": [], "readable": [], "complete": false },
      "recover": ["br_l", "repair:l_last"] },
    { "name": "the switch and the breaker",
      "moves": ["sw", "br_l"],
      "expect": { "lit": [], "readable": ["f_cut"], "complete": false },
      "recover": ["repair:l_last"] }
  ]
}
```

## To watch when Josh plays it

- Whether the long way can be traced by eye right round the block, 207 m and 19 spans, from the one fixed camera.
- Fourteen scenery houses light with the job, so the HUD goes 1, 13, 14, 15 of 16. Whether that reads as "the long way" or as noise.
- The breaker and the spark are both within 30 m of the smithy, on the far side of it from the dead junction. Whether the two roads read as two roads there.
- This puzzle has no dead end, as 4 did. Whether the refused click on the junction is lesson enough.

## What it taught us
