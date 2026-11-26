# 14 · Split the dark — design note (series v1, puzzle 14)

A new puzzle designed on the city (ticket 081 section N3; `puzzles/series-v1.md`, row 14). It has no schematic and no `from`. It is the plan's "which fuse" in the form the city's poles allow: two boxes on a ring, and breakers that say which box carries which building.

- **New concept:** a dark stretch joined in one piece goes to one box, whole. If its buildings fit different boxes, cut it in two while it is still dark, then wake each half from the side that can hold it.
- **The reasoning move:** start from the building only one box can hold, give it that box, and work back: what is left must go to the other box, and what that pushes over the feed's limit must go dark.
- **Builds on:** 2 (a throw with no current changes nothing you can see), 3 (capacity: choose what goes dark), 8 (a box has its own limit; red means "not yet"), 10 (count the dark: a dead building draws nothing until its bulb goes in), 11 (which box a dark stretch lands on; an open point that keeps two boxes apart).
- It uses no switch, relay, spring, battery, timed breaker, second feed or nested fuse.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:0:4` and `block:0:2`**, which touch across `x:4`. The ring goes round `block:0:4`'s four streets from its south-west corner; the tribe's homes are across `x:4` on `block:0:2`'s west street, behind their own breaker.
- The feed stands on `block:0:7`'s crossing pole, across `x:7` from `block:0:4`'s south-west corner. Its one entering span crosses `x:7`.
- Capacity **25**; `fb_a` (the north box, on the west street) rated **19**, `fb_b` (the south box, on the south street) rated **10**. Own numbers 8, 9 and 4, raised once by `npm run fit -- --raise` for the 17 scenery buildings the solution lights.
- Targets: `school`, `kiln`, `cannery`. Priority: `homes`. Parts: **1 bulb, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:7:hi:27.50` (crossing, block:0:7, -z side) | 27.50, 265.75 |
| `j_0` | junction | pole `pole:x:7:lo:27.50` (end, block:0:4, +z side) | 27.50, 249.25 |
| `fb_a` | fuse box | pole `pole:z:0:hi:230.00` (slot, block:0:4, -x side) | 20.75, 230.00 |
| `j_nw` | junction | pole `pole:x:4:hi:27.50` (end, block:0:4, -z side) | 27.50, 185.75 |
| `br_h` | breaker, closed | pole `pole:z:0:hi:162.50` (end, block:0:2, -x side) | 20.75, 162.50 |
| `homes` | lamp, load 2 | building `block:0:2/a\|outer\|-x\|5,29`, by its drop from `pole:z:0:hi:152.50` | 25.00, 152.50 |
| `j_s` | junction | pole `pole:x:4:hi:62.50` (slot, block:0:4, -z side) | 62.50, 185.75 |
| `school` | lamp, load 2, **target** | building `block:0:4/b\|outer\|-z\|12,38`, by its drop from `pole:x:4:hi:62.50` | 62.50, 190.00 |
| `j_ne` | junction | pole `pole:x:4:hi:97.50` (end, block:0:4, -z side) | 97.50, 185.75 |
| `br_1` | breaker, open | pole `pole:z:3:lo:204.50` (slot, block:0:4, +x side) | 104.25, 204.50 |
| `j_x` | junction | pole `pole:z:3:lo:217.50` (slot, block:0:4, +x side) | 104.25, 217.50 |
| `kiln` | lamp, load 2, **target** | building `block:0:4/b\|outer\|+x\|19,43`, by its drop from `pole:z:3:lo:217.50` | 100.00, 217.50 |
| `br_2` | breaker, closed | pole `pole:z:3:lo:230.00` (slot, block:0:4, +x side) | 104.25, 230.00 |
| `j_t` | junction | pole `pole:z:3:lo:242.50` (end, block:0:4, +x side) | 104.25, 242.50 |
| `cannery` | lamp, load 4, **target** | building `block:0:4/b\|outer\|+x\|19,45`, by its drop from `pole:z:3:lo:242.50` | 100.00, 242.50 |
| `br_3` | breaker, open | pole `pole:x:7:lo:74.17` (slot, block:0:4, +z side) | 74.17, 249.25 |
| `fb_b` | fuse box | pole `pole:x:7:lo:40.67` (slot, block:0:4, +z side) | 40.67, 249.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 1 span: 1 cross (over `x:7`) | 16.50 |
| `l_b0` | `j_0` → `fb_b` | 1 span: 1 along (along `x:7`) | 13.17 |
| `l_b1` | `fb_b` → `br_3` | 3 spans: 3 along (along `x:7`) | 33.50 |
| `l_a0` | `j_0` → `fb_a` | 2 spans: 1 corner, 1 along (along `z:0`) | 22.05 |
| `l_a1` | `fb_a` → `j_nw` | 4 spans: 3 along, 1 corner (along `z:0`) | 47.05 |
| `l_h0` | `j_nw` → `br_h` | 2 spans: 1 cross, 1 corner (over `x:4`) | 26.05 |
| `l_homes` | `br_h` → `homes` | 1 span: 1 along (along `z:0`) + drop | 10.00 |
| `l_a2` | `j_nw` → `j_s` | 3 spans: 3 along (along `x:4`) | 35.00 |
| `l_school` | `j_s` → `school` | drop | — |
| `l_a3` | `j_s` → `j_ne` | 3 spans: 3 along (along `x:4`) | 35.00 |
| `l_a4` | `j_ne` → `br_1` | 2 spans: 1 corner, 1 along (along `z:3`) | 21.55 |
| `l_x0` | `br_1` → `j_x` | 1 span: 1 along (along `z:3`) | 13.00 |
| `l_kiln` | `j_x` → `kiln` | drop | — |
| `l_x1` | `j_x` → `br_2` | 1 span: 1 along (along `z:3`) | 12.50 |
| `l_t0` | `br_2` → `j_t` | 1 span: 1 along (along `z:3`) | 12.50 |
| `l_cannery` | `j_t` → `cannery` | drop | — |
| `l_t1` | `j_t` → `br_3` | 3 spans: 1 corner, 2 along (along `x:7`) | 32.88 |

Faults (1): `f_bulb`, the cannery's dead bulb, dark at the start inside the dark stretch.

Round the ring from the feed's corner: north up the west street through `fb_a`; the north-west corner, where a line crosses `x:4` to the homes' breaker on `block:0:2`; east along the north street past the school; the north-east corner; south down the east street to **`br_1` (open)**; the kiln and a house; **`br_2` (closed)**; the cannery at the south-east corner and three houses along the south street; **`br_3` (open)**; three more houses; `fb_b`; and back to the feed's corner. The stretch between `br_1` and `br_3` is dark.

**No breaker or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_a` | `pole:z:0:hi:230.00` | 2 spans, both its own (`l_a0` in from `z:0:hi:242.50`, `l_a1` out to `z:0:hi:217.50`); no drop |
| `fb_b` | `pole:x:7:lo:40.67` | 2 spans, both its own (`l_b0` in from the corner `x:7:lo:27.50`, `l_b1` out to `x:7:lo:50.83`); no drop |
| `br_h` | `pole:z:0:hi:162.50`, on `block:0:2` | 2 spans, both its own (`l_h0`, the corner span from the crossing pole `x:4:lo:27.50`; `l_homes` to `z:0:hi:152.50`); no drop |
| `br_1` | `pole:z:3:lo:204.50` | 2 spans, both its own (`l_a4` from `z:3:lo:192.50`, `l_x0` to `z:3:lo:217.50`); no drop |
| `br_2` | `pole:z:3:lo:230.00` | 2 spans, both its own (`l_x1` from `z:3:lo:217.50`, `l_t0` to `z:3:lo:242.50`); no drop |
| `br_3` | `pole:x:7:lo:74.17` | 2 spans, both its own (`l_t1` from `x:7:lo:84.33`, `l_b1` from `x:7:lo:62.50`); no drop |

It has no switch. The two exceptions Josh allowed are not used.

Scenery (section S), 17 buildings, all lit at the win: 1 before the north box; 9 behind it (2 on the west street, 1 at the crossing pole on the way to the homes, 5 on the north street, 1 at the east street's top); 3 behind the south box; 1 beside the kiln; 3 with the cannery. Four are on blocks outside the district (one on `block:0:7`, two on `block:1:7`, one on `block:3:4`); two of `block:0:2`'s houses hang from `block:0:4`'s north street poles across `x:4`.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:0:4` | Opens `br_2` in the dark, closes `br_3` and `br_1`, fits the cannery's bulb. Reads both boxes' bars and the feed's | The ring, both boxes and the dark stretch are on its streets |
| `block:0:2` | Opens `br_h`: the tribe's homes go dark, across `x:4` | The two halves together are 10 and the feed has 8 spare. The homes are the only 2 on the map that are not a target and have a breaker of their own |

The breaker on `block:0:2` is what lets the last breaker on `block:0:4` close without a brownout. Leave `block:0:2` out and the job stops one building short at 27 of 25.

## The intended read from the default camera

The camera opens on `block:0:4` with the bottom of `block:0:2` above it. **The school is on the north street (`x:4`), mid-block, lit. The kiln is on the east street (`z:3`), mid-block, dark. The cannery is the south-east corner building, dark. The tribe's homes are on `block:0:2`'s west street, just across `x:4`, lit.**

1. The feed's wire splits at the south-west corner. North: a fuse box (13 of 19), the west street, the homes across the way, the north street and the school, down the east street to an **open breaker**. East: a fuse box (3 of 10), three houses, an **open breaker**. Between the two open breakers the wire is dark: the kiln and a house, a **closed breaker**, the cannery and three houses. 17 of 25. A bulb and a fuse in hand, and nothing on screen that asks for either.
2. Both breakers into the dark read **+10, red**, each naming its own box. The stretch as the numbers count it: the kiln's half is 3, the cannery's half is 3 houses and the cannery's 4.
3. Count the boxes. The south box has room for 7. The north box has room for 6. The whole stretch, lit, is 10: neither. The cannery's half is 7: the south box, and only the south box. So the kiln's half, 3, goes north.
4. **Open `br_2`, the breaker in the middle of the dark.** Nothing changes on screen. Both numbers turn white: +3 from the north, +7 from the south.
5. Close `br_3`. Three houses light along the south street; the cannery stays dark with a **flicker at its socket**. That is what the bulb is for. Fit it (+4, white): the south box 10 of 10. 24 of 25.
6. `br_1` now reads **+3, red**: the feed, not the box (27 of 25). The kiln, the school and the cannery are wanted. Open the homes' breaker across `x:4` (−2). 22 of 25.
7. Close `br_1`. The kiln lights from the north: the north box 14 of 19, the feed 25 of 25. **Win.**

**Hidden at the start (1 fact):** the cannery's dead bulb, in the dark stretch. Waking its half shows it, and waking costs nothing while the bulb is dead. **Layers (3):** cut the dark in two; give each half its box; make room on the feed.

## The trap

**Both breakers into the dark read red and neither blows: the stretch wakes whole on one box, the kiln lights, and then the bulb is 4 more than that box can hold.**

The numbers count the dead cannery as sound, so they read high. Close `br_3` anyway and the whole stretch comes up on the south box at 9 of 10 with the kiln lit; close `br_1` instead and it comes up on the north box at 19 of 19. Either looks like progress: one target lit, a socket flickering, a bulb in hand. The bulb then reads **+4, red**. Fit it and the box blows (a bolt to the box, everything behind it dark).

It is readable before (the red bulb, the bar one or none short of full) and after (the blown box). It is recovered **by a part**: open `br_2`, fit the spare fuse, and carry on; the check block replays both sides. A second blow has no fuse left and is an Undo.

**The free trap:** light both halves on their right boxes with the homes still on and the feed is at 27 of 25. Everything flickers; open the homes' breaker.

## What it builds on, and its depth of read

- **8 is the trap, turned round.** 8 taught that a red breaker means "not yet: take something off its box". Here there is nothing to take off either box, and the red is half true: the breaker will not blow anything, the bulb will.
- **2 is the answer, turned round.** 2 taught that a throw with no current changes nothing. The move that solves this puzzle is a throw with no current, and it changes which box carries what.
- **10 and 11 are held together.** The dead building has to be counted before its bulb goes in (10), on the box its half will land on (11), for two boxes at once.
- **3** is the last layer: the feed's limit, and the tribe's homes as the only load that can go.
- **Depth of read: 5.** Before the bulb is spent the player must hold: (1) the dark stretch is two halves, 3 and 7, with a breaker between them; (2) the cannery is dead, so today its half reads as 3; (3) the south box has room for 7; (4) the north box has room for 6, enough for the kiln's half and not for the cannery's; (5) the two halves are 10 and the feed has 8. Puzzle 13 asks for 4.

## The numbers (section V) and the hover cue

- At the start: `br_1` +10 **red** (names `fb_a`), `br_3` +10 **red** (names `fb_b`), `br_2` +0, `br_h` −2. **Everything that leads to a target is red; the two white moves are the ones that light nothing.** This is the plan's row 14 beat ("only the far one is white").
- The reds read high: with the cannery dead, either breaker adds 6 and blows nothing.
- After `br_2`: `br_1` +3 white, `br_3` +7 white.
- With the whole stretch on one box: the bulb +4 red, naming that box. `br_2` then reads −3 on the south side (it sheds the kiln's half), and the bulb turns white.
- After both halves but one: `br_1` +3 red for the feed; after `br_h`, white.
- The hover cue on `br_2`, at the start, lights nothing (both sides are dead). After one side is woken it lights the other half: that is the moment the breaker reads as a cut.

## The tribe's homes

`homes` (priority, load 2) is on `block:0:2`, lit at the start and **dark at the win**. The feed carries 25; the three targets and the houses on their wires come to 25 without the homes. There is no win that keeps them.

## Changed from the plan's row

- **Kept:** fuse ratings as a plan; which box carries which building; start from the building with only one place to go and work back; every move toward the target reads red at the start and the far one is white.
- **Changed:** the plan's row had 3 switches, 1 breaker, 3 fuse boxes, no faults and a fuse. Built: **4 breakers, 2 fuse boxes, 1 fault, a bulb and a fuse.** On the simulator a switch sends current one way only, so a building is handed between boxes by two switches and a shared post, and on the city each of those switches needs a pole that takes three wires and nothing else. A ring between two boxes with breakers on it says the same thing (the open point decides which fuse) on poles the city has. The third box went with the switches; the dead bulb was added so that the first wrong move blows nothing and the cost comes one move later.
- **The move is kept, not dropped:** "which fuse" is here as "which box takes which half". What later rows may miss is a switch per box: row 17 ("Relay + which fuse") was written against the three-switch form.
- **Size:** 1 / bulb, fuse / 4 breakers, 2 fuse boxes (the row: 0 / fuse / 3 switches, 1 breaker, 3 fuse boxes).

## Limits passed

None. 5 clicks, 1 hidden fact, 1 fault, 4 own buildings.

## Series rules

- **No "obvious breaker blows a fuse" opener.** Both breakers into the dark read red at the start, and neither blows anything when thrown: the stretch's live load is 6 and each box has that much room. The only blows are from the bulb (a repair, red when it would blow), one move later. "Fit it and it blows again" is not the trap: the spare fuse holds once `br_2` is open.
- **Kit: 1 bulb, 1 fuse.** Puzzle 13's is 2 wires; puzzle 15's is a fuse and a wire.
- **Heavy building: the cannery** (load 4). Puzzle 13 has none; puzzle 15's is the long house.
- **Shrine count: 2 of 5.** No shrine here.
- District `block:0:4`, `block:0:2`. `block:0:2` has not been used by the series; `block:0:4` was puzzle 9's district (not a neighbour of 14). This puzzle reuses puzzle 9's places there, as Josh allowed (25 Nov 2026: "You can even use the same nodes over again"): the same feed pole and corner, the same ring; puzzle 9's kiln is the kiln here (now a target, the same load 2), its breaker's pole is `br_1`, and its shrine and meeting hall are houses on the ring. It shares no block with puzzle 13 (`block:3:0`, `block:0:0`) or puzzle 15 (`block:4:8`, `block:5:8`). The feed's pole is on `block:0:7`.
- **Districts used so far:** `block:4:8` (puzzle 1, since its re-lay in NR; ticket 081's N3 list still names `block:2:10`, which no series puzzle now uses), `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, and now `block:0:4` + `block:0:2`.

## Expected numbers

`npm run analyze puzzles/city/s14-split-the-dark.city.json`:

| | |
| --- | --- |
| States | 116, exhaustive |
| Solvable | yes |
| Fewest clicks | 5 (`br_2`, `br_3`, `repair:cannery`, `br_h`, `br_1`) |
| Winning click orders | 40 |
| Winning configurations | **1** (`br_1` closed, `br_2` open, `br_3` closed, `br_h` open, the bulb in) |
| Parts used | bulb (1 of 2; the fuse is a spare) |
| Feed at the shortest win | 25 of 25 |
| Fuses that blow on a shortest win | none |
| Fuses that blow on some move | `fb_a`, `fb_b` |
| Dead-end states | 56 of 116 (48.3%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the cannery's dead bulb |

Loads, replayed on the conversion: start 17 of 25 (`fb_a` 13 of 19, `fb_b` 3 of 10); `br_2` no change; `br_3` 20 (`fb_b` 6); the bulb 24 (`fb_b` 10 of 10); `br_h` 22 (`fb_a` 11); `br_1` 25 (`fb_a` 14), win. The trap from the south: `br_3` 23 with `fb_b` 9 of 10, the bulb blows `fb_b`. From the north: `br_1` 23 with `fb_a` 19 of 19, the bulb blows `fb_a`.

**The obvious wrong first move:** `br_3` (or `br_1`), a breaker into the dark with `br_2` still closed. Read: the kiln lights, the cannery's socket flickers, the box's bar is at or one short of full, the bulb reads red. It is not a dead end: open `br_2` and go on (5 clicks in all, from either side). The move after it, the bulb, blows the box: recovered by **the spare fuse** once `br_2` is open. The check block replays both blows and their recoveries, and the brownout.

**Where it is easier than 13, and why it follows it:** more winning click orders (40 against 1) and fewer dead-end states (48.3% against 57.1%). It reads deeper (5 facts against 4), and it is the first puzzle where the numbers on screen are wrong in the player's favour and have to be corrected by counting.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_2", "br_3", "repair:cannery", "br_h", "br_1"],
  "traps": [
    { "name": "wake the dark stretch whole from the south and fit the bulb",
      "moves": ["br_3", "repair:cannery"],
      "expect": { "blown": ["fb_b"], "complete": false },
      "recover": ["br_2", "repair:fb_b", "br_h", "br_1"] },
    { "name": "wake it whole from the north and fit the bulb",
      "moves": ["br_1", "repair:cannery"],
      "expect": { "blown": ["fb_a"], "complete": false },
      "recover": ["br_1", "repair:fb_a", "br_2", "br_3", "br_h", "br_1"] },
    { "name": "light both with the homes still on",
      "moves": ["br_2", "br_1", "br_3", "repair:cannery"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_h"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds `block:0:4`'s whole ring and, above it, the homes and their breaker on `block:0:2`.
- The three breakers of the dark stretch read as three: `br_1` and `br_2` are 25 m apart on the east street with the kiln between them.
- The closed `br_2` reads as closed while dead (it is the one control whose state matters before any current reaches it).

## To watch when Josh plays it

- Whether opening a dead breaker occurs to a player at all. Puzzle 2 taught that a dead throw does nothing.
- Whether red numbers that do not blow read as "the number is counting something that isn't there" or as the game being wrong.
- Whether the homes' breaker, a street away on the other block, is found when the last +3 turns red.

## What it taught us
