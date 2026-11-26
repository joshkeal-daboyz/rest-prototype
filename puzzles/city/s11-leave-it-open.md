# 11 · Leave it open — design note (series v1, puzzle 11)

A new puzzle designed on the city (ticket 081 section N3; `puzzles/series-v1.md`, row 11). It has no schematic and no `from`. It is the first puzzle of the series that spans two blocks.

- **New concept:** a break can be doing a job. On a ring between two fuse boxes, the break is the open point: it keeps one box's load off the other. A mend that fits tonight can spend the room another target needs.
- **The reasoning move:** before mending a break on a ring, ask which box the dark stretch would land on, and what else that box still has to carry, including the building that is not drawing yet.
- **Builds on:** 4 (a break shows only under current), 5 (one wire: spend it on the target's road), 6 (open the dark before spending), 8 (a red breaker means "not yet"; a box has its own limit), 9 (which side of each break each target is on).
- It uses no switch, relay, spring, battery, timed breaker, second feed or nested fuse.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:6` and `block:6:8`**, which touch across `x:9`. The ring goes round `block:6:6`'s four streets; the forge is across `x:9` on `block:6:8`.
- The feed stands on `block:7:7`'s crossing pole, across `z:7` from `block:6:6`'s south-east corner. Its one entering span crosses `z:7`.
- Capacity **30**; `fb_s` rated **9**, `fb_n` rated **9**. Own numbers 8, 8 and 6, raised once by `npm run fit -- --raise` for the 22 scenery buildings the solution lights.
- Targets: `dairy`, `weavers`, `forge`. Priority: `homes`. Parts: **1 fuse, 1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:7:hi:312.50` (crossing, block:7:7, -x side) | 360.75, 312.50 |
| `j_0` | junction | pole `pole:z:7:lo:312.50` (end, block:6:6, +x side) | 344.25, 312.50 |
| `fb_s` | fuse box | pole `pole:x:9:lo:305.00` (slot, block:6:6, +z side) | 305.00, 319.25 |
| `j_d` | junction | pole `pole:x:9:lo:294.17` (slot, block:6:6, +z side) | 294.17, 319.25 |
| `dairy` | lamp, load 2, **target** | building `block:6:6/b\|outer\|+z\|58,62`, by its drop from `pole:x:9:lo:294.17` | 292.50, 315.00 |
| `j_t` | junction | pole `pole:x:9:lo:272.50` (end, block:6:6, +z side) | 272.50, 319.25 |
| `weavers` | lamp, load 2, **target** | building `block:6:6/b\|outer\|+z\|54,62`, by its drop from `pole:x:9:lo:272.50` | 272.50, 315.00 |
| `br_f` | breaker, open | pole `pole:x:9:hi:272.50` (crossing, block:6:8, -z side) | 272.50, 335.75 |
| `forge` | lamp, load 3, **target** | building `block:6:8/a\|outer\|-x\|54,68`, by its drop from `pole:z:6:hi:342.50` | 270.00, 342.50 |
| `j_ne` | junction | pole `pole:x:6:hi:337.50` (end, block:6:6, -z side) | 337.50, 230.75 |
| `j_nw` | junction | pole `pole:x:6:hi:272.50` (end, block:6:6, -z side) | 272.50, 230.75 |
| `fb_n` | fuse box | pole `pole:z:6:hi:254.17` (slot, block:6:6, -x side) | 265.75, 254.17 |
| `j_h` | junction | pole `pole:z:6:hi:264.33` (slot, block:6:6, -x side) | 265.75, 264.33 |
| `homes` | lamp, load 1 | building `block:6:6/a\|outer\|-x\|54,52`, by its drop from `pole:z:6:hi:264.33` | 270.00, 262.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 1 span: 1 cross (over `z:7`) | 16.50 |
| `l_s0` | `j_0` → `fb_s` | 4 spans: 1 corner, 3 along (along `x:9`) | 42.05 |
| `l_s1` | `fb_s` → `j_d` | 1 span: 1 along (along `x:9`) | 10.83 |
| `l_dairy` | `j_d` → `dairy` | drop | — |
| `l_s2` | `j_d` → `j_t` | 2 spans: 2 along (along `x:9`). **Fault `f_s`** on `x:9:lo:272.50~x:9:lo:283.33` | 21.67 |
| `l_weavers` | `j_t` → `weavers` | drop | — |
| `l_f0` | `j_t` → `br_f` | 1 span: 1 cross (over `x:9`) | 16.50 |
| `l_forge` | `br_f` → `forge` | 1 span: 1 corner + drop | 9.55 |
| `l_n0` | `j_0` → `j_ne` | 8 spans: 7 along, 1 corner (along `z:7`) | 84.55 |
| `l_n1` | `j_ne` → `j_nw` | 6 spans: 6 along (along `x:6`) | 65.00 |
| `l_n2` | `j_nw` → `fb_n` | 3 spans: 1 corner, 2 along (along `z:6`) | 26.21 |
| `l_n3` | `fb_n` → `j_h` | 1 span: 1 along (along `z:6`) | 10.17 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_n4` | `j_h` → `j_t` | 5 spans: 4 along, 1 corner (along `z:6`). **Fault `f_n`** on `z:6:hi:274.50~z:6:hi:289.17` | 57.71 |

Faults (3): `f_blown`, the north box `fb_n`, blown at the start and buzzing; `f_s` on `l_s2`, the last span of the south street before the weavers' corner, sparking from the start; `f_n` on `l_n4`, on the west street between the north box and the weavers, dark at the start.

**No breaker or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_s` | `pole:x:9:lo:305.00` | 2 spans, both its own (`l_s0` in from `x:9:lo:315.83`, `l_s1` out to `x:9:lo:294.17`); no drop |
| `fb_n` | `pole:z:6:hi:254.17` | 2 spans, both its own (`l_n2` in from `z:6:hi:242.50`, `l_n3` out to `z:6:hi:264.33`); no drop |
| `br_f` | `pole:x:9:hi:272.50` | 2 spans, both its own (`l_f0`, the crossing of `x:9` from the weavers' corner; `l_forge`, the corner span to the forge's pole); no drop |

It has no switch. The two exceptions Josh allowed are not used.

Scenery (section S), 22 buildings, all lit at the win: 7 on the east street and 8 on the north street and the top of the west street (15, on the long way round before the north box, lit from the start); 3 on the south street before the south box (lit from the start); 1 at the dairy's pole (behind the south box); 1 behind the north box and 2 at the pole next to the weavers' corner. Ten of them are across streets, on `block:6:3`, `block:7:5`, `block:7:7`, `block:5:4`, `block:5:7` and `block:6:8`.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:6:6` | Fits the fuse in the north box (west street), reads the two sparks and the two boxes' bars, mends the west street's spark | Both boxes, both breaks and the weavers are on its ring |
| `block:6:8` | Closes the forge's breaker, on the crossing pole over `x:9`; reads the forge's load (3) | The forge is the only thing that makes the south box's room matter. It is across the street, behind an open breaker, and draws nothing until the wire is already spent |

The move on `block:6:6` (which spark gets the wire) decides whether the move on `block:6:8` (the forge's breaker) can ever be made. Take `block:6:8` away and either spark is right.

## The intended read from the default camera

The camera opens on `block:6:6` and the top of `block:6:8`. **The dairy is on the south street (`x:9`), mid-block, lit. The weavers is the south-west corner building of `block:6:6`, dark. The forge is across `x:9` from it, the north-west corner building of `block:6:8`, dark, behind a breaker on the crossing pole.**

1. The feed's wire crosses `z:7` to the south-east corner and splits. One way runs west along the south street through a fuse box (3 of 9) to the lit dairy and stops at a **spark**, one span short of the weavers' corner. The other way runs north up the east street, west along the north street and down the west street to a second fuse box, which **buzzes**: blown. Past it the west street is dark down to the weavers. 21 of 30. A fuse and a wire are in hand.
2. Fit the fuse in the north box (it reads +6, white: the number counts the dark street as whole). The tribe's homes and a house across the street light, and the current stops at a **second spark**, two spans further down. 23 of 30. The north box reads 2 of 9.
3. Two sparks, one wire, and the dark weavers stands between them with two houses. Either mend lights it: both read **+4, white**. From the south it lands on the south box (3 + 4 = 7 of 9). From the north it lands on the north box (2 + 4 = 6 of 9).
4. Count the forge before choosing. It is 3, it hangs off the weavers' corner, and its breaker is open, so no number shows it yet. Wherever the weavers lands, the forge lands too. South: 7 + 3 = 10 on a box of 9. North: 6 + 3 = 9 on a box of 9.
5. Mend the west street's spark. The weavers lights from the north. 27 of 30.
6. Close the forge's breaker (+3, white). 30 of 30, the north box full at 9 of 9, the south box still 3 of 9 with its spark still showing. **Win.** The south street's break is left open.

**Hidden at the start (1 fact):** the west street's break `f_n`, behind the blown box. Fitting the fuse shows it, and the fuse can go nowhere else. **Layers (2):** open the dark (the fuse, the second spark); then which box takes the weavers, counted with the forge.

## The trap

**The spark you can see is beside the dark weavers and the wire fits it: mended, the south box is at 7 of 9 and the forge's 3 has nowhere to go.**

It works: the weavers lights, nothing blows, nothing is red. Then the forge's breaker reads **+3, red** (10 on a box of 9). Fitting the fuse in the north box now shows the second spark, and the wire is gone: the weavers can't be moved to the box that has room.

It is readable (the weavers lit, the south box's bar at 7 of 9, the forge's breaker red, a second spark and no wire) and one Undo takes it back if the player stops there; two or three if they went on. Closing the red breaker blows the south box (the dairy and the weavers go dark, a bolt runs to the box): Undo recovers that too. The spare fuse, if still in hand, refits the south box but does not make room.

## What it builds on, and its depth of read

- **4, 5 and 9 are the trap.** Those puzzles trained "a spark on the target's road, a wire in hand: mend it" and "ask which side of the break the target is on". Here the target is on the right side of both breaks; the question 9 did not ask is whose box that side is.
- **6 and 8 are held together.** The fuse opens the dark before the wire is spent (6); the forge's breaker turns red after the wrong mend (8), and there is nothing to shed: every lit building on the south box is a target or a house with no breaker.
- **Depth of read: 3.** Before the wire is spent the player must hold: (1) the weavers has two roads, one from each box, and the second is behind the blown fuse; (2) the south box has room for 6, the weavers' stretch is 4 and the forge is 3; (3) the forge is not drawing yet, so no number on screen counts it. Puzzles 9 and 10, the deepest it builds on, ask for 2 (one hidden fact and one count each, from their notes).

## The numbers (section V) and the hover cue

- At the start nothing is red: the fuse +6, the south spark +6 (both count the hidden break as sound), the forge's breaker +0.
- After the fuse both sparks read +4, white. **The wrong mend is never red.** The numbers do not choose; the forge's open breaker hides the one load that would.
- After the wrong mend the forge's breaker reads +3 red and names the south box. After the right mend it reads +3 white.
- A player who closes the forge's breaker first, while its corner is dead, gets the answer from the numbers: the south spark then reads +7 red and the north one +7 white. That is a fair way to ask, and puzzle 2 taught that a dead throw changes nothing.
- The hover cue on `br_f` lights the crossing span and the corner span to the forge, nothing else.

## The tribe's homes

`homes` (priority) is on the west street behind the north box: dark at the start, **lit at the win**. The win costs the tribe nothing. The trap leaves the homes dark unless the fuse is fitted as well.

## Changed from the plan's row

- **Kept:** ring and rating; a break doing a job; "mended, one box carries all three" (the dairy, the weavers and the forge on the south box).
- **Changed:** the plan's row had 2 breakers, 1 switch and 2 fuse boxes, with two lit targets either side of the spark. Built: **1 breaker, no switch, 2 fuse boxes, 3 faults** (a blown fuse and two breaks). The switch went because the ring is fed from both ends at once, which is what makes the break an open point between two boxes; with a switch only one box is ever live. The second break and the blown fuse were added so that the weavers has a second road and the player has to open the dark to find it. The forge was moved across `x:9` so the second block decides the first block's move.
- **Size:** 3 / fuse, wire / 1 breaker, 2 fuse boxes (the row: 2 / wire, fuse / 2 breakers, 1 switch, 2 fuse boxes).

## Limits passed

None. 3 clicks, 1 hidden fact, 3 faults, 4 own buildings.

## Series rules

- **No "obvious breaker blows a fuse" opener.** No move is red at the start and no first move blows anything. The only blow is `br_f` after the wrong mend, red when it happens. "Fit it and it blows again" is not the trap: the fuse fitted in `fb_n` holds.
- **Kit: 1 fuse, 1 wire.** Puzzle 10's is 2 fuses and a bulb; puzzle 12's is 2 wires and a bulb.
- **Heavy building: the forge** (load 3). Puzzle 10 had none besides its target; puzzle 12's is the pump house.
- **Shrine count: 2 of 5** (puzzles 1 and 9). No shrine here.
- District `block:6:6`, `block:6:8`: neither has been a series district (the trial `tb-two-clocks`, not a stage, is laid on the same two blocks). It shares no block with puzzle 10 (`block:1:7`) or puzzle 12 (`block:7:1`, `block:8:1`). The feed's pole is on `block:7:7`.
- **Districts used so far:** `block:4:8` (puzzle 1, since its re-lay in NR; ticket 081's N3 list still names `block:2:10`, which no series puzzle now uses), `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, and now `block:6:6` + `block:6:8`.

## Expected numbers

`npm run analyze puzzles/city/s11-leave-it-open.city.json`:

| | |
| --- | --- |
| States | 15, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`repair:fb_n`, `repair:l_n4`, `br_f`) |
| Winning click orders | 3 (the forge's breaker first, second or last) |
| Winning configurations | **1** (the fuse in `fb_n`, `f_n` mended, `br_f` closed, `f_s` left broken) |
| Parts used | fuse, wire (2 of 2) |
| Feed at the shortest win | 30 of 30 |
| Fuses that blow on a shortest win | none |
| Fuses that blow on some move | `fb_s` |
| Dead-end states | 9 of 15 (60.0%): every state with `f_s` mended |
| First moves that lead only to dead ends | **1**: `repair:l_s2` |
| Hidden at the start | 1: the break `f_n` |

Loads, replayed on the conversion: start 21 of 30 (`fb_s` 3 of 9, `fb_n` blown); the fuse 23 of 30 (`fb_n` 2 of 9); `repair:l_n4` 27 of 30 (`fb_n` 6 of 9); `br_f` 30 of 30 (`fb_n` 9 of 9), win. The trap (`repair:l_s2`) 25 of 30 with `fb_s` 7 of 9; then `br_f` blows `fb_s`.

**The obvious wrong first move:** `repair:l_s2`, the spark beside the dark weavers. Read: the weavers lights, the south box's bar goes to 7 of 9, the forge's breaker turns red. Recovered by **one Undo**, then the fuse, `repair:l_n4`, `br_f`. The check block replays it, and the blow that follows it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb_n", "repair:l_n4", "br_f"],
  "traps": [
    { "name": "mend the spark beside the dark weavers",
      "moves": ["repair:l_s2"],
      "expect": { "lit": ["dairy", "weavers"], "readable": ["f_blown", "f_n"], "complete": false },
      "recover": ["undo", "repair:fb_n", "repair:l_n4", "br_f"] },
    { "name": "then close the forge breaker on the full box",
      "moves": ["repair:l_s2", "br_f"],
      "expect": { "blown": ["fb_s"], "complete": false },
      "recover": ["undo", "undo", "repair:fb_n", "repair:l_n4", "br_f"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks: the whole ring round `block:6:6`, the breaker on the crossing pole over `x:9`, and the forge on `block:6:8`'s corner.
- The two fuse boxes' bars and the two sparks can be told apart from the fixed camera; the north box is on the far (west) street.
- The buzz at the blown box reads at the start, with the long way round lit up to it.

## To watch when Josh plays it

- Whether the forge reads as part of the question before the wire is spent, or only after its breaker turns red.
- Whether "which box" is readable from the bars, with 15 houses lit on the long way round that are on neither box.
- Whether leaving a spark showing at the win reads as finished.

## What it taught us
