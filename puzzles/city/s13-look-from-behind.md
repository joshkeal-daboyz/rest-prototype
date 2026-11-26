# 13 · Look from behind — design note (series v1, puzzle 13)

A new puzzle designed on the city (ticket 081 section N3; `puzzles/series-v1.md`, row 13). It has no schematic and no `from`.

- **New concept:** a fault hidden behind another can be read from its far side. A second route that reaches the back of it shows what it is, for nothing, before a part is spent in front of it.
- **The reasoning move:** before paying for the first fault on a road, ask what else can send current to the far end of that road. Use a switch to look, not to route: the look is thrown and thrown back, and is no part of the answer.
- **Builds on:** 2 (only a switch with current changes anything), 4 (faults are read by current), 5 (a dead junction costs two wires), 6 (faults hide faults), 7 (reroute instead of a repair you can't afford), 9 (a ring: which side of each break each target is on, and a switch that looks the other way).
- It uses no fuse box, relay, spring, battery, timed breaker, second feed or nested fuse.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:3:0` and `block:0:0`**, which touch across `z:3`. Two roads lead from the feed's corner on `block:3:0` to the bell house on `block:0:0`: the short one along `block:3:0`'s south street and across `z:3`; the long one up `block:3:0`'s east street, along its north street, across `z:3` and round three streets of `block:0:0`.
- The feed stands on `block:3:2`'s crossing pole, across `x:2` from `block:3:0`'s south-east corner. Its one entering span crosses `x:2`.
- Capacity **38** (own number 13, raised once by `npm run fit -- --raise` for the 25 scenery buildings the solution lights). **The capacity is not this puzzle's limit and is set clear of every number on screen**: the load numbers count unread faults as sound, and with a tight feed the first breaker and both sparks would read red for a reason that isn't there.
- Targets: `chapel`, `bell_house`. Priority: `homes`. Parts: **2 wires**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:162.50` (crossing, block:3:2, -z side) | 162.50, 115.75 |
| `j_0` | junction | pole `pole:x:2:lo:162.50` (end, block:3:0, +z side) | 162.50, 109.25 |
| `j_h` | junction | pole `pole:x:2:lo:139.17` (slot, block:3:0, +z side) | 139.17, 109.25 |
| `homes` | lamp, load 1 | building `block:3:0/b\|outer\|+z\|26,20`, by its drop from `pole:x:2:lo:139.17` | 137.50, 105.00 |
| `j_k` | junction | pole `pole:z:3:lo:102.50` (end, block:0:0, +x side) | 104.25, 102.50 |
| `j_t` | junction | pole `pole:x:2:lo:97.50` (end, block:0:0, +z side) | 97.50, 109.25 |
| `bell_house` | lamp, load 2, **target** | building `block:0:0/b\|outer\|+z\|18,20`, by its drop from `pole:x:2:lo:97.50` | 97.50, 105.00 |
| `br_l` | breaker, open | pole `pole:z:5:lo:81.67` (slot, block:3:0, +x side) | 169.25, 81.67 |
| `j_a` | junction | pole `pole:z:5:lo:27.50` (end, block:3:0, +x side) | 169.25, 27.50 |
| `sw_p` | switch, 0 `l_n0`, 1 `l_e`; set 0 | pole `pole:z:3:lo:27.50` (end, block:0:0, +x side) | 104.25, 27.50 |
| `j_c` | junction | pole `pole:x:0:hi:97.50` (end, block:0:0, -z side) | 97.50, 20.75 |
| `chapel` | lamp, load 1, **target** | building `block:0:0/a\|outer\|-z\|18,5`, by its drop from `pole:x:0:hi:97.50` | 97.50, 25.00 |
| `j_nw` | junction | pole `pole:z:0:hi:27.50` (end, block:0:0, -x side) | 20.75, 27.50 |
| `j_sw` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 1 span: 1 cross (over `x:2`) | 6.50 |
| `l_s0` | `j_0` → `j_h` | 2 spans: 2 along (along `x:2`). **Fault `f_1`** on `x:2:lo:139.17~x:2:lo:150.83` | 23.33 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_s1` | `j_h` → `j_k` | 3 spans: 1 along, 1 corner, 1 cross (along `x:2`, over `z:3`) | 37.71 |
| `l_kt` | `j_k` → `j_t` | 1 span: 1 corner | 9.55 |
| `l_bell` | `j_t` → `bell_house` | drop | — |
| `l_l0` | `j_0` → `br_l` | 3 spans: 1 corner, 2 along (along `z:5`) | 30.38 |
| `l_l1` | `br_l` → `j_a` | 5 spans: 5 along (along `z:5`) | 54.17 |
| `l_l2` | `j_a` → `sw_p` | 6 spans: 2 corner, 3 along, 1 cross (along `x:0`, over `z:3`) | 70.59 |
| `l_n0` | `sw_p` → `j_c` | 1 span: 1 corner | 9.55 |
| `l_chapel` | `j_c` → `chapel` | drop | — |
| `l_n1` | `j_c` → `j_nw` | 7 spans: 6 along, 1 corner (along `x:0`). **Fault `f_3`** on `x:0:hi:85.83~x:0:hi:97.50` | 79.55 |
| `l_w` | `j_nw` → `j_sw` | 7 spans: 6 along, 1 corner (along `z:0`). **Fault `f_4`** on `z:0:hi:65.50~z:0:hi:77.50` | 84.55 |
| `l_so` | `j_sw` → `j_t` | 6 spans: 6 along (along `x:2`) | 70.00 |
| `l_e` | `sw_p` → `j_k` | 6 spans: 6 along (along `z:3`) | 75.00 |

Faults (4): `f_1` on `l_s0`, a damaged cable on the short road's second span, sparking from the start; `f_k`, the dead junction `j_k` on `block:0:0`'s south-east corner pole, where the short road lands, dark at the start; `f_3` on `l_n1`, the first span of `block:0:0`'s north street past the chapel, dark behind the open `br_l`; `f_4` on `l_w`, on `block:0:0`'s west street, dark behind `f_3`.

**No breaker or switch on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `br_l` | `pole:z:5:lo:81.67` | 2 spans, both its own (`l_l0` in from `z:5:lo:92.50`, `l_l1` out to `z:5:lo:70.83`); no drop |
| `sw_p` | `pole:z:3:lo:27.50`, `block:0:0`'s north-east corner | 3 spans, all its own: the crossing of `z:3` from `z:3:hi:27.50` (`l_l2`, in); the corner span to `x:0:hi:97.50` (`l_n0`, position 0, west along the north street); the along span to `z:3:lo:40.00` (`l_e`, position 1, south down the east street). No drop |

Its two outs leave by different wires down different streets. The two exceptions Josh allowed are not used.

Scenery (section S), 34 buildings. The win lights 25: 4 at and beside the feed's corner, 6 on the long road round `block:3:0`, 4 on `block:0:0`'s north street, 5 on its west street and corner, 6 on its south street. Dark at the win: 7 on `block:0:0`'s east street (lit only while the switch looks that way) and 2 on the short road past the spark. Seven are across streets (`block:3:2`, `block:5:0`, `block:5:1`, `block:0:2`).

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:3:0` | Closes `br_l`, on its east street: the long road lights round the block and wakes the far switch. Sees the short road's spark and leaves it | The feed's corner, the breaker and the first span of both roads are here. The spark that tempts is on its south street |
| `block:0:0` | Throws the far switch at its north-east corner to look: the east street lights and the dead junction fizzes from behind. Throws it back. Mends the north street's spark and the west street's | The dead junction, the switch that reaches its back, both mends and both targets are on this block |

The breaker on `block:3:0` is what gives the switch on `block:0:0` current; the look on `block:0:0` is what tells the player the spark on `block:3:0` is worth nothing.

## The intended read from the default camera

The camera opens on both blocks, `block:3:0` on the right. **The bell house is `block:0:0`'s south-east corner building, on its south street (`x:2`), one span from the corner pole where the short road lands. The chapel is `block:0:0`'s north-east corner building, on its north street (`x:0`), beside the switch.** Both are dark.

1. The feed's wire crosses to `block:3:0`'s south-east corner and splits. West along the south street it runs one span and stops at a **spark**; past the spark the wire goes on by the tribe's homes, crosses `z:3` and lands on the corner pole beside the bell house. North up the east street it stops at an **open breaker**. 4 of 38. Two wires in hand.
2. Close the breaker (it costs nothing). The long road lights: up the east street, along the north street, across `z:3` to the switch on `block:0:0`'s corner, and one span on to the **chapel**, which lights. Past the chapel a second **spark**. 11 of 38.
3. Two sparks, two wires, and the bell house at the far end of both roads. The short road is 60 m and shows one spark. The long road is three more streets and shows one spark.
4. **Look.** The switch at the corner has a second line: south down `block:0:0`'s east street, to the same corner pole the short road lands on. Throw it. The chapel goes dark, seven houses light down the east street, and at the corner pole the current goes in and nothing comes out: **a dead junction, needs wire x 2**. The bell house, one span past it, stays dark.
5. So the short road is three wires: its spark and the junction. The east street reaches the bell house for two wires (the junction alone), and leaves the chapel dark for as long as it does. Throw the switch back. The chapel lights.
6. The long road has to be the one, and it has to cost two. Mend the north street's spark: four houses light along it and two round the corner, and the current stops at a **third spark** on the west street. Mend it: the west street, the south street, the bell house. 28 of 38. **Win.**

**Hidden at the start (3 facts):** the long road's spark `f_3`, behind the open breaker (the breaker shows it, free); the dead junction `f_k`, behind the short road's spark (the far switch shows it from behind, free); the west street's spark `f_4`, behind `f_3` (only the mend shows it, and by then the other two roads are ruled out). **Layers (2):** read the roads (the breaker, the look); then pay for the one that can be afforded.

## The trap

**The cheap spark on the short road: the bell house is one junction past it, and the junction is dead.**

The spark is the first thing on screen, it is on the straight road to the target, and a wire fits it. The homes light, the current crosses `z:3` and stops at the corner pole: *needs wire x 2, have 1*. The long road needs two as well. One Undo takes it back, and the state shows why (the fizz at the corner, the count).

**The second trap is the look itself, taken as a road.** With the switch thrown south the dead junction can be paid for from behind with both wires, and the bell house lights. The chapel is dark, and stays dark until the switch goes back, which darkens the bell house: each throw lights one target, as in puzzle 9. One Undo.

## What it builds on, and its depth of read

- **4, 5 and 7 are the trap.** 4 and 5 trained "a spark on the target's road: mend it". 7 trained "when the fault costs more than you hold, take the other road": here the fault that costs too much is not on screen, so the player does not know there is a reason to take the other road.
- **6 and 9 are held together.** A fault hides a fault on both roads (6). The ring gives a second way in to the hidden one (9), and the switch that 9 used to feed the other end is used here only to see.
- **2** is why the first move is the breaker: the far switch does nothing until the long road is live.
- **Depth of read: 4.** Before the first wire is spent the player must hold: (1) two wires, two visible sparks, one on each road; (2) the short road's spark has a dead junction behind it, read from behind: three wires; (3) the road that showed it reaches the bell house for two, and costs the chapel; (4) so the long road must cost exactly two, the spark on screen and one thing behind it. Puzzle 12 asks for 4.
- **Where it is harder than 12 at the same depth:** 1 winning click order (12 has 15) and 57.1% dead-end states (12 has 40.0%).

## The numbers (section V) and the hover cue

- **Nothing is red in this puzzle.** The feed has room for everything, and there is no fuse box. The numbers are large because each counts every fault the player hasn't read as sound: at the start the breaker reads +34 and the short road's spark +28.
- **The look changes a number.** Before it, the short road's spark reads +27 (a road to the bell house and on round the ring). After it, +3 (the homes and two houses, and then a dead junction). The dead junction itself reads +20 from behind. A player who watches the numbers sees the short road's worth collapse when the junction fizzes.
- The hover cue on `sw_p` lights the east street amber and the north street cool white: what the look turns on and off.

## The tribe's homes

`homes` (priority) is on the short road past its spark: dark at the start and **dark at the win**. The trap lights them. The win leaves `f_1` and the dead junction as they were.

## Changed from the plan's row

- **Kept:** ring and faults hide faults; "the cheap spark on the short road hides a dead junction; the far switch would have shown it".
- **Changed:** the plan's row had 3 faults, 1 wire and 2 switches. Built: **4 faults, 2 wires, 1 switch and 1 breaker.** With one wire the long road could hide nothing, and the look would only confirm what a refused repair says anyway; with two wires the dead junction can be paid for, so the look opens a road that has to be weighed and turned down (the chapel). The second switch became an open breaker on the long road: on the city the feed's corner pole takes three wires, so it is a junction, and the long road needed its own first move on `block:3:0`.
- **Size:** 4 / 2 wires / 1 switch, 1 breaker (the row: 3 / wire / 2 switches).

## Limits passed

- **Hidden facts: 3, past the band's ceiling of 2.** The puzzle's subject is what is hidden, and it needs one hidden fault on each road and one that only paying shows. Two of the three are read for nothing before any part is spent; the third is forced by elimination. With two, either the long road hides nothing (and the look decides nothing) or the short road does (and there is no trap).
- Nothing else: 3 clicks at the fewest (5 with the look), 4 faults, 3 own buildings.

## Series rules

- **No fuse box**, so no fuse blow.
- **Kit: 2 wires.** Puzzle 12's is 2 wires and a bulb; puzzle 14's is a bulb and a fuse.
- **Heavy building: none** (the bell house is load 2). Puzzle 12's is the pump house; puzzle 14's is the cannery.
- **Shrine count: 2 of 5.** The chapel is not a shrine.
- District `block:3:0`, `block:0:0`. `block:0:0` has not been used by the series; `block:3:0` was puzzle 4's district (not a neighbour of 13). Puzzle 4's corner pole `z:5:lo:27.50` is a junction on the long road here, and its two buildings are scenery. It shares no block with puzzle 12 (`block:7:1`, `block:8:1`) or puzzle 14 (`block:0:4`, `block:0:2`). The feed's pole is on `block:3:2`.
- **Districts used so far:** `block:4:8` (puzzle 1, since its re-lay in NR; ticket 081's N3 list still names `block:2:10`, which no series puzzle now uses), `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, and now `block:3:0` + `block:0:0`.

## Expected numbers

`npm run analyze puzzles/city/s13-look-from-behind.city.json`:

| | |
| --- | --- |
| States | 21, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`br_l`, `repair:l_n1`, `repair:l_w`); 5 with the look (`sw_p` there and back), which is the check block's solution |
| Winning click orders | **1** |
| Winning configurations | **1** (`br_l` closed, `sw_p` north, `f_3` and `f_4` mended, `f_1` and the junction left) |
| Parts used | wire, wire (2 of 2) |
| Feed at the shortest win | 28 of 38 |
| Fuses that blow | none (there are none) |
| Dead-end states | 12 of 21 (57.1%) |
| First moves that lead only to dead ends | **1**: `repair:l_s0` |
| Hidden at the start | 3: `f_3`, the dead junction `f_k`, `f_4` |

Loads, replayed on the conversion: start 4 of 38; `br_l` 11; `sw_p` 17 (the look); `sw_p` 11; `repair:l_n1` 17; `repair:l_w` 28, win. The trap (`repair:l_s0`) 7 of 38. The junction paid for from behind: 31 of 38 with the bell house lit and the chapel dark.

**The obvious wrong first move:** `repair:l_s0`, the spark on the short road. Read: the homes light, the corner pole fizzes, *needs wire x 2, have 1*. Recovered by **one Undo**. The check block replays it and the second trap.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_l", "sw_p", "sw_p", "repair:l_n1", "repair:l_w"],
  "traps": [
    { "name": "mend the spark on the short road",
      "moves": ["repair:l_s0"],
      "expect": { "readable": ["f_k"], "lit": ["homes"], "complete": false },
      "recover": ["undo", "br_l", "repair:l_n1", "repair:l_w"] },
    { "name": "pay for the dead junction from behind",
      "moves": ["br_l", "sw_p", "repair:j_k"],
      "expect": { "lit": ["homes", "bell_house"], "complete": false },
      "recover": ["undo", "sw_p", "repair:l_n1", "repair:l_w"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks, the feed's pole at the bottom right and the bell house's corner.
- The dead junction's fizz at `block:0:0`'s south-east corner pole reads from the fixed camera when the east street is lit, and the bell house beside it reads as still dark.
- The switch's icon at the north-east corner is clear of the chapel's target icon.

## To watch when Josh plays it

- Whether a player with a spark and a wire in front of them thinks to look first. Puzzles 4, 7 and 9 each taught a free throw; this is the first where the throw is not on the way to the answer.
- Whether the switch reads as a way to look at all: its second line runs a whole street away from the spark it tells about.
- Whether the third spark, which no look shows, reads as fair. The note's claim is that it is forced; Josh's play decides.
- Whether numbers like +34 read as noise on a puzzle with no limit.

## What it taught us
