# 07 · The long way — design note (series v1, puzzle 7)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 7). It has no schematic and no `from`.

- **New concept:** reroute instead of a repair you can't afford. A target can have two roads to it; when the fault on the straight one costs more than you hold, the other road is the answer. And a wire fed from its other end lights its buildings in the other order.
- **The reasoning move:** when the repair is out of reach, look for another road to the same building, and send the power that way.
- **Builds on:** 1 (a breaker cuts what is past it), 2 (the switch: one line or the other), 3 (the feed's capacity; shed what does not fit), 4 (bring power to a dark line, then mend what shows), 5 (a dead junction costs two wires).
- It uses no fuse box, relay, spring, battery or second feed. The second road is the switch's other line; there is no choice of which end feeds what and no choice of where to mend (that is 9's).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:11`**, a long block on the town's south edge, wired right round its four streets. The feed stands across `z:7` from its south-east corner.
- **One block, with neither (a) nor (b) of N2's lesson.** The two roads have to end side by side at the target. `block:6:11` is one of four blocks on this city whose poles join all the way round (`block:0:0`, `block:0:4`, `block:6:6`, `block:6:11`), so the second road goes round the block and comes to the target's pole from the other side.
- Capacity **15**: its own 2, raised once by `npm run fit -- --raise` for the 13 scenery buildings its solution lights.
- Target: `smithy`. Priority: `home`. Parts: **1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, switch or fuse box on a branch pole** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split"; on puzzle 2: "You don't know which lines are turning off or on"). `br_w` is on a bare pole with one wire in and one wire out. `sw` is on the bare corner pole and holds only its own three wires: one of its lines turns west into the south street and the other runs north up the east street, so each throw sends the pulses down one street or the other.

**Josh's ruling, 26 Nov 2026, on a card ("stop 081 N2": the row's size gave 2 clicks, under the band's 3): "Add a breaker".** The breaker is `br_w`, between the works and the smithy. Its role: coming the long way, the smithy is reached first and the works past it; together they are over the feed, and `br_w` sheds the works. The size is now 2 faults / wire / 1 switch, 1 breaker.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:7:hi:507.50` (crossing, block:7:11, across `z:7`) | 360.75, 507.50 |
| `sw` | switch, on `l_short` | pole `pole:z:7:lo:507.50` (end, block:6:11, +x side) | 344.25, 507.50 |
| `j_h` | junction | pole `pole:x:14:lo:337.50` (end, block:6:11, +z side) | 337.50, 514.25 |
| `home` | lamp, load 1 | building `block:6:11/b\|outer\|+z\|64,101`, by its drop from `j_h`'s pole | 337.50, 510.00 |
| `j_dead` | junction, **dead** | pole `pole:x:14:lo:326.67` (slot) | 326.67, 514.25 |
| `j_w` | junction | pole `pole:x:14:lo:315.83` (slot) | 315.83, 514.25 |
| `works` | lamp, load 2 | building `block:6:11/b\|outer\|+z\|61,101`, by its drop from `j_w`'s pole | 317.50, 510.00 |
| `br_w` | breaker, closed | pole `pole:x:14:lo:305.00` (slot, no drop) | 305.00, 514.25 |
| `j_t` | junction | pole `pole:x:14:lo:294.17` (slot) | 294.17, 514.25 |
| `smithy` | lamp, load 1, **target** | building `block:6:11/b\|outer\|+z\|58,101`, by its drop from `j_t`'s pole | 292.50, 510.00 |
| `j_far` | junction | pole `pole:x:13:hi:272.50` (end, block:6:11, -z side), the far corner | 272.50, 465.75 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw` | 1 span: crossing (over `z:7`) | 16.50 |
| `l_short` | `sw` → `j_h` | 1 span: corner (into `x:14`) | 9.55 |
| `l_home` | `j_h` → `home` | drop | — |
| `l_a` | `j_h` → `j_dead` | 1 span: along `x:14` | 10.83 |
| `l_b` | `j_dead` → `j_w` | 1 span: along `x:14` | 10.83 |
| `l_works` | `j_w` → `works` | drop | — |
| `l_c` | `j_w` → `br_w` | 1 span: along `x:14` | 10.83 |
| `l_d` | `br_w` → `j_t` | 1 span: along `x:14` | 10.83 |
| `l_smithy` | `j_t` → `smithy` | drop | — |
| `l_long` | `sw` → `j_far` | 10 spans: up `z:7`, the north-east corner, west along `x:13` | 109.55 |
| `l_far` | `j_far` → `j_t` | 7 spans: the north-west corner, down `z:6`, the south-west corner, east along `x:14` | 75.76 |

The straight road is 53 m along the south street: home, dead junction, works, breaker, smithy. The long way is 185 m and comes to the smithy's pole from the west. `j_far` is a plain junction at the far corner. It is there for W1's reads-outward rule: one line right round the block comes back toward the switch, and two lines, each read from its own first pole, do not.

Faults (2): `f_j`, a dead junction at `j_dead` (2 wires), live and readable from the start; `f_cut`, a damaged cable on `l_far`, on its fourth span (`pole:z:6:hi:495.83` to `pole:z:6:hi:507.50`, at the south-west corner), dark at the start.

Scenery (section S), 13 buildings, all on the long way: 9 on `l_long` (6 on `block:6:11`, 3 across `x:13` on `block:6:9`), 3 on `l_far` before the cut (2 on the block, 1 across `z:6` on `block:5:10`), 1 on `l_far` past the cut. None hangs on the straight road.

## The intended read from the default camera

The camera opens on `block:6:11` and its four streets. **The smithy is on `x:14`, the block's south street, five poles west of the south-east corner** (53 m of wire from the switch), carrying the target mark. The feed's pole is across `z:7` from that corner.

1. The feed's wire crosses `z:7` to `sw`, the corner pole. Pulses run round the corner into `x:14` to a lit home, and one span on to a junction that **fizzes across two gaps**. Past it, dark: the works, a breaker, the smithy. The HUD reads 1 of 15; one wire is in hand.
2. Two gaps, one wire (5's rule). The junction's prompt reads *needs 2, have 1*. The straight road can't be paid for.
3. The switch has a second line, dark, going the other way: up `z:7`. Follow it: along the north street, down the west street, and back along `x:14` to the smithy's own pole from the far side. `sw` reads **+15, red**: that road would bring the smithy and, through the breaker past it, the works, and the feed can't carry both.
4. Coming that way the smithy is first and the works are past `br_w`. Open `br_w` (nothing changes on screen; it was dark). `sw` reads +13, white.
5. Throw `sw`. The home goes dark. Pulses run up `z:7` and round the block, twelve houses light along the way, and the pulses stop at a **spark** at the south-west corner. 12 of 15. The spark reads +2.
6. Click the spark. The wire is spent, one more house lights, and the smithy burns gold. 14 of 15. **Win.** The works stay dark behind `br_w`.

**Hidden at the start (1 fact):** the spark on the long way. One free throw of the switch shows it, and nothing can be spent before it shows. **Layers (2):** the reroute (switch, mend), and what the new road brings with it (the works, shed).

## The trap

**The dead junction is pointed at and can't be paid for; the switch is marked but turned away.** As the plan's row. The junction stands on the road the pulses are already running down, and the wire in hand looks meant for it. Clicking it does nothing: the repair is refused (*needs 2, have 1*) and the wire stays in hand.

**The second half, which the breaker adds:** throw the switch and mend the spark without a thought for what else is on that wire, and the smithy and the works light together, 16 of 15: every window flickers and nothing counts. It is readable (the flicker, the works lit past the smithy) and free: open `br_w` and the job is won. From the straight road `br_w` would have cut the smithy; from the long way it cuts the works. That is what coming from the other end changes.

There is no dead end in this puzzle: the one wire has one place it can go.

## The numbers (section V)

**The move that starts the reroute is red, and the puzzle is what to do first so it turns white.** At the start `sw` reads +15 red and `j_dead` +16 red (and can't be paid); `br_w` reads +0. Both numbers count the unread spark as sound, so they read high: the throw itself is safe, and it is the mend that would flicker. With `br_w` open, `sw` reads +13 white and, after the throw, the spark +2 white. With `br_w` closed, after the throw the spark reads +4 red.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**: it is on the straight road, before the dead junction, and the switch has turned away from it. The works are dark at the start and dark at the win.

## Series rules

- Size 2 faults / wire / 1 switch, **1 breaker** (the row's size and Josh's "Add a breaker"). Own buildings: 3. Faults: 2.
- No fuse box, so no fuse blow.
- **Kit: 1 wire.** Puzzle 6's kit is fuse and bulb, puzzle 8's is 1 fuse: no repeat.
- **Heavy building: the works** (load 2). Puzzle 6 had none; puzzle 8's is the mill.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the smithy).
- District `block:6:11`; puzzle 6 is on `block:0:8`, puzzle 8 on `block:6:3`. The feed's pole is across `z:7` on `block:7:11`; four scenery buildings are across streets on `block:6:9` and `block:5:10`, neither a series district.
- Districts used so far: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`.

## Expected numbers

`npm run analyze puzzles/city/s07-the-long-way.city.json`:

| | |
| --- | --- |
| States | 8, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`br_w`, `sw`, `repair:l_far`) |
| Winning click orders | 3 (the breaker first, second, or last through a flicker) |
| Winning configurations | **1** (`sw` on the long way, `br_w` open, the spark mended) |
| Parts used | wire (1 of 1) |
| Feed at the shortest win | 14 of 15 |
| Fuses that blow | none |
| Dead-end states | 0 of 8 (0.0%) |
| First moves that lead only to dead ends | none |
| First moves the simulator takes | `sw`, `br_w` |
| Hidden at the start | 1: the spark on the long way |

Loads, replayed on the conversion: start 1 of 15; `sw` 12 of 15; `sw`, `repair:l_far` 16 of 15, a flicker; then `br_w` 14 of 15, win.

**The obvious wrong first move:** clicking the dead junction with the wire. Read: the prompt says *needs 2, have 1* and nothing changes. Verified by replaying `repair:j_dead` from the start through the conversion: it is refused ("needs 2 wire, have 1") and the state is the start's. Recovered by doing nothing. A check block cannot hold a refused move, so its traps are the switch alone (the home dark, the spark showing) and the reroute with the works still on (the flicker), each won from where it stands.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_w", "sw", "repair:l_far"],
  "traps": [
    { "name": "the switch alone",
      "moves": ["sw"],
      "expect": { "lit": [], "readable": ["f_cut"], "complete": false },
      "recover": ["br_w", "repair:l_far"] },
    { "name": "the long way with the works still on",
      "moves": ["sw", "repair:l_far"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_w"] }
  ]
}
```

## To watch when Josh plays it

- Whether the long way can be traced by eye right round the block, 185 m and 17 spans, from the one fixed camera.
- Thirteen scenery houses light with the job, so the HUD goes 1, 12, 14 of 15. Whether that reads as "the long way" or as noise.
- `sw` is red at the start though the throw alone is safe. Whether he opens the breaker first, or throws and meets the flicker; both win.
- Whether "from this end the breaker cuts the works, from the other it would cut the smithy" is seen, or the breaker is just the third thing to click.

## What it taught us
