# 17 · The back door — design note (series v1, puzzle 17)

A new puzzle designed on the city (ticket 081 section N4; `puzzles/series-v1.md`, row 17). It has no schematic and no `from`. **It is the first series puzzle with a relay**, and the relay is the new thing in it. It is laid on puzzle 14's ring, with the block east of it: the two fuse boxes stand where 14's stood.

- **New concept:** the relay. It can be thrown only while current reaches it, and it keeps its place when the power goes. So it cannot be set in the dark, and whatever hangs on its line when it wakes is carried by whoever wakes it.
- **The reasoning move:** find the side that can carry what the relay wakes with, wake it from there, throw it, then take that power away and bring in the side that is to keep it.
- **Builds on:** 2 (a switch with no current does nothing: here it will not even move), 11 (a box's room is for everything it will carry, the building that is not drawing yet included), 14 (two boxes on a ring; a dark stretch goes whole to the box that wakes it; set it up before it wakes), 16 (a blow, as the price of the front door).
- It uses no spring, battery, timed breaker or second feed.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:0:4` and `block:3:4`**, which touch across `z:3`. The ring goes round `block:0:4` from its south-west corner; the relay stands across `z:3` at `block:3:4`'s south-west corner, with the mill on its pole and the chapel one span on.
- The feed stands on `block:0:7`'s crossing pole, across `x:7` from `block:0:4`'s south-west corner (puzzle 14's feed pole). One entering span.
- Capacity **27**; `fb_k` (the back box, on the west street) rated **19**; `fb_f` (the front box, on the south street) rated **11**. Own numbers 11, 9 and 6, raised once by `npm run fit -- --raise` for the 16 scenery buildings the solution lights.
- Targets: `chapel`, `granary`. Priority: `homes`. Parts: **2 wires, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:7:hi:27.50` (crossing, block:0:7, -z side) | 27.50, 265.75 |
| `j_0` | junction | pole `pole:x:7:lo:27.50` (end, block:0:4, +z side) | 27.50, 249.25 |
| `fb_k` | fuse box | pole `pole:z:0:hi:230.00` (slot, block:0:4, -x side) | 20.75, 230.00 |
| `j_b` | junction | pole `pole:x:4:hi:62.50` (slot, block:0:4, -z side) | 62.50, 185.75 |
| `granary` | lamp, load 5, **target** | building `block:0:4/b\|outer\|-z\|12,38`, by its drop from `pole:x:4:hi:62.50` | 62.50, 190.00 |
| `br_k` | breaker, open | pole `pole:z:3:lo:230.00` (slot, block:0:4, +x side) | 104.25, 230.00 |
| `fb_f` | fuse box | pole `pole:x:7:lo:40.67` (slot, block:0:4, +z side) | 40.67, 249.25 |
| `j_h` | junction | pole `pole:x:7:lo:62.50` (landing, block:0:4, +z side) | 62.50, 249.25 |
| `homes` | lamp, load 1, priority | building `block:0:4/b\|outer\|+z\|12,48`, by its drop from `pole:x:7:lo:62.50` | 62.50, 245.00 |
| `br_f` | breaker, open | pole `pole:x:7:lo:74.17` (slot, block:0:4, +z side) | 74.17, 249.25 |
| `j_w` | junction | pole `pole:x:7:lo:84.33` (slot, block:0:4, +z side) | 84.33, 249.25 |
| `well_house` | lamp, load 1 | building `block:0:4/b\|outer\|+z\|16,48`, by its drop from `pole:x:7:lo:84.33` | 82.50, 245.00 |
| `j_r` | junction | pole `pole:z:3:lo:242.50` (end, block:0:4, +x side) | 104.25, 242.50 |
| `r_1` | relay, position 0 `l_mill`, 1 `l_chapel`; set 0 | pole `pole:z:3:hi:242.50` (crossing, block:3:4, -x side) | 120.75, 242.50 |
| `mill` | lamp, load 5 | building `block:3:4\|outer\|-x\|25,45`, by its drop from `pole:z:3:hi:242.50` | 125.00, 242.50 |
| `chapel` | lamp, load 4, **target** | building `block:1:7/a\|outer\|-z\|23,54`, by its drop from `pole:x:7:lo:127.50` | 127.50, 270.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 1 span: 1 cross (over `x:7`) | 16.50 |
| `l_k0` | `j_0` → `fb_k` | 2 spans: 1 corner, 1 along (along `z:0`) | 22.05 |
| `l_k1` | `fb_k` → `j_b` | 7 spans: 6 along, 1 corner (along `z:0`, along `x:4`) | 82.05 |
| `l_gran` | `j_b` → `granary` | drop. **Fault `f_g`** on the drop | — |
| `l_k2` | `j_b` → `br_k` | 7 spans: 6 along, 1 corner (along `x:4`, along `z:3`) | 82.05 |
| `l_k3` | `br_k` → `j_r` | 1 span: 1 along (along `z:3`) | 12.50 |
| `l_f0` | `j_0` → `fb_f` | 1 span: 1 along (along `x:7`) | 13.17 |
| `l_f1` | `fb_f` → `j_h` | 2 spans: 2 along (along `x:7`) | 21.83 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_f2` | `j_h` → `br_f` | 1 span: 1 along (along `x:7`) | 11.67 |
| `l_f3` | `br_f` → `j_w` | 1 span: 1 along (along `x:7`) | 10.17 |
| `l_well` | `j_w` → `well_house` | drop | — |
| `l_f4` | `j_w` → `j_r` | 2 spans: 1 along, 1 corner (along `x:7`) | 22.71 |
| `l_r` | `j_r` → `r_1` | 1 span: 1 cross (over `z:3`) | 16.50 |
| `l_mill` | `r_1` → `mill` | drop | — |
| `l_chapel` | `r_1` → `chapel` | 1 span: 1 corner + drop. **Fault `f_c`** on `x:7:lo:127.50~z:3:hi:242.50` | 9.55 |

Faults (2): `f_g`, a break on the granary's drop, **sparking at the start** (the back box's wire reaches it); `f_c`, a break on the chapel's one span past the relay, dark at the start.

**The picture.** The feed's wire splits at `block:0:4`'s south-west corner. **The front way** is the south street: the front box, the tribe's homes, **`br_f` (open)**, then the well house and the south-east corner. **The back way** is the long way round: north up the west street through the back box, east along the north street past the granary, south down the east street to **`br_k` (open)**, one pole from the same corner. At the south-east corner (`j_r`) one span crosses `z:3` to the relay on `block:3:4`. The relay's own pole carries the mill's drop; its other wire goes one span round the corner to the chapel's pole. The chapel stands on the far side of `x:7`.

**The street crossing between blocks:** `l_r`, over `z:3`, from `block:0:4`'s south-east corner pole to `block:3:4`'s crossing pole, where the relay is.

**No breaker, relay or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_k` | `pole:z:0:hi:230.00` | 2 spans, both its own (`l_k0` in from `z:0:hi:242.50`, `l_k1` out to `z:0:hi:217.50`); no drop |
| `fb_f` | `pole:x:7:lo:40.67` | 2 spans, both its own (`l_f0` in from the corner `x:7:lo:27.50`, `l_f1` out to `x:7:lo:50.83`); no drop |
| `br_k` | `pole:z:3:lo:230.00` | 2 spans, both its own (`l_k2` in from `z:3:lo:217.50`, `l_k3` out to `z:3:lo:242.50`); no drop |
| `br_f` | `pole:x:7:lo:74.17` | 2 spans, both its own (`l_f2` in from `x:7:lo:62.50`, `l_f3` out to `x:7:lo:84.33`); no drop |
| `r_1` | `pole:z:3:hi:242.50`, `block:3:4`'s crossing pole | its own three wires and nothing else: the crossing of `z:3` in (`l_r`), the mill's drop (`l_mill`, position 0), the corner span to the chapel's pole (`l_chapel`, position 1). One out goes straight into a building's drop, which Josh allowed ("Allow it (Recommended)") |

Scenery (section S), 16 buildings, all lit at the win: 1 before the back box (the west street's first house); 10 behind the back box and before `br_k` (2 on the west street, 5 on the north street, 3 on the east street, one of them `block:3:4`'s, across `z:3`); 2 behind the front box and before `br_f`; 3 in the dark stretch (2 at the south-east corner on the front way's last line, 1 on the corner pole itself). With the well house the dark stretch has 4 houses that wake with the relay.

**Places from puzzle 14** (Josh, 25 Nov 2026: "You can even use the same nodes over again"): the feed's pole and corner; the two fuse boxes' poles; `br_k` on 14's `br_2` pole and `br_f` on 14's `br_3` pole; 14's school is the granary. 14's cannery, on the corner pole, and its kiln are houses here.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:3:4` | Throws the relay, in the one stretch of time it is live from the back; reads the spark past it and mends the chapel's span. Reads what the relay points at: the mill, on its own pole | The relay, the mill and the chapel's wire are here. Nothing on `block:0:4` shows which way the relay points or what is behind it |
| `block:0:4` | Reads both boxes' bars. Closes `br_k`, opens it again, closes `br_f`. Leaves the granary's spark alone until the end, then mends it | Both ways to the relay, both boxes, and the building that would spend the back box's room are on its streets |

What `block:0:4` wakes, `block:3:4` must carry: the breaker thrown on the ring decides which box meets the mill across the street. And the throw on `block:3:4` is what turns the front breaker on `block:0:4` white.

## The intended read from the default camera

The camera opens on `block:0:4` with `block:3:4` to its right. **The chapel is the dark building at the bottom right, below `block:3:4`'s south-west corner, across `x:7`. The granary is on `block:0:4`'s north street, mid-block, dark, with a spark at its drop.** The mill is the dark building at `block:3:4`'s south-west corner, on the relay's pole.

1. Two fuse boxes at the bottom-left corner: the back box on the west street (**10 of 19**) and the front box on the south street (**3 of 11**). Each wire runs to an **open breaker**; past the two breakers the south-east corner is dark, and so is the relay across `z:3` and the mill on its pole. A spark at the granary's drop on the north street. Two wires and a fuse in hand.
2. The chapel is behind the relay, and the relay points at the mill. Click the relay: it does not move. No current reaches it. (Puzzle 14's answer was a breaker thrown in the dark. This cannot be.)
3. So the relay wakes with the mill on its line: the mill, 5, and the four houses of the dark corner. **9.**
4. The front breaker reads **+9, red**, and names the front box: it has room for 8. The back breaker reads **+9, white**: the back box has room for exactly 9.
5. The spark at the granary reads **+5, white**. It hangs on the back box. Mend it now and the back box has room for 4. **Leave it.**
6. **Close `br_k`.** The corner lights and the mill turns: the back box 19 of 19. **Throw the relay** (−1): the mill stops, and a **spark** shows one span past the relay. The chapel's wire is broken. Mend it (+4, white): the chapel is lit, on the back box, 18 of 19.
7. The granary's spark now reads **+5, red**. The chapel has to leave the back box. The front box has room for 8: the corner's 4 and the chapel's 4.
8. **Open `br_k`.** The corner and the chapel go dark. The relay stays where it was thrown. **Close `br_f`** (+8, white): the chapel is lit from the front, the front box 11 of 11.
9. Mend the granary (+5, white). The back box 15 of 19, the feed 27 of 27. **Win.**

**Hidden at the start (1 fact):** the break `f_c` on the chapel's span, past the relay's dark second position. It shows only when the relay is thrown under current. **Layers (4):** the relay cannot be set dark, so it wakes with the mill; which box can carry that (the back, and only while the granary is dark); the throw and the mend behind it; the hand-back to the front box before the granary is lit.

## The trap

**The granary's spark is the only thing on screen that asks for a wire, and its number is white: mend it, and the back box no longer has room to wake the relay.**

Puzzles 4 and 5 taught that a spark on a target's wire is where the wire goes. This one is on a target's wire, there are two wires in hand, and nothing is red about it. Mended, the granary lights, the back box reads 15 of 19, and the back breaker turns from white to **red** (+9 on room for 4). The front breaker was red already. There is no breaker on the granary, so it cannot be taken off again. It is readable (both breakers into the dark are now red, each naming its box, and the back box's bar shows why) and it is recovered by **one Undo**. This is puzzle 11's lesson held against the player: the room was needed for something that was not drawing yet, here for a few clicks only.

**The front door.** `br_f` on its red +9: the mill and the corner come up on the front box, 12 on 11. A bolt to the front box; the tribe's homes go dark with it. Recovered **by a part**: open `br_f` again and fit the spare fuse (+3, white). While `br_f` stays closed the back breaker reads +12 red: the back way would carry the front street too, from behind. **Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"): fitted at once, with `br_f` closed and the relay still at the mill, the fuse's number reads +12 red, the prompt warns (*would blow again: 12 load on ≤11*), and the fuse is lost. One Undo returns it.

**The chapel left on the back box.** After the mend at step 6, mend the granary too: 23 on 19, a bolt to the back box. One Undo. The same happens if `br_f` is closed and `br_k` is left closed: joined at both ends, the relay's line stays with the back box (it is the nearer one), and nothing moves to the front until `br_k` opens.

## What it builds on, and its depth of read

- **14 is the first trap.** 14's solving move was a throw in the dark that cost nothing and decided which box carried what. The relay refuses it, with a prompt. What 14 let the player arrange beforehand, 17 makes them carry.
- **11 is the second.** The mend that fits tonight spends room another building needs. In 11 the building was a target that would light later. Here it is the mill, which must be carried once and never again.
- **2** is the reason: a switch does something only with current. **16** is the price of the front door, and the spare fuse that follows a blow is no longer a plain fix.
- **Depth of read: 8.** Before the first wire is spent the player must hold: (1) the chapel is behind the relay, and the relay points at the mill; (2) the relay cannot be thrown without current; (3) so it wakes with the mill and the corner's four houses, 9 in all; (4) the front box has room for 8; (5) the back box has room for 9, exactly; (6) the granary would take 5 of that, so its spark waits; (7) once thrown, the chapel and the corner are 8, which is the front box's room, and the back box cannot hold them beside the granary; (8) the relay keeps its place through the dark between opening `br_k` and closing `br_f`. Puzzle 16 asks for 7.

## The numbers (section V) and the hover cue

- At the start: `br_k` **+9 white**; `br_f` **+9 red**, blows `fb_f`; the granary's spark **+5 white**; the relay +0 (it is dead).
- After the granary first: `br_k` +9 **red**, blows `fb_k`; `br_f` +9 red. Nothing white leads to the chapel.
- After `br_k`: the relay **−1** (the mill's 5 off, the chapel's 4 on: the number counts the unread span as sound); the granary's spark +5 **red**, blows `fb_k`.
- After the relay: the chapel's span +4 white; the granary +5 white (14 and 5 are 19). After the chapel's mend: the granary +5 **red**.
- After `br_k` is opened: `br_f` **+8 white**. This is the number the relay changed, from across the street.
- Joined at both ends with the chapel lit: the granary's spark +5 red, blows `fb_k` **and** `fb_f` (the back box goes, the whole corner lands on the front box, and it goes too).
- The hover cue on `br_k` and on `br_f` lights the corner, the crossing of `z:3` and the mill's drop: the wire that matters is the one past the relay, on the other block.

## The tribe's homes

`homes` (priority) is on the south street behind the front box and before its breaker: lit at the start and **lit at the win**. The right solve costs the tribe nothing. The front door darkens them with everything behind the front box. The mill, lit for two clicks in the middle of the solve, is dark at the end.

## Changed from the plan's row

- **Merges** the plan's rows 16 ("Only moves live") and 17 ("The back door"), as N4 cut it.
- **Kept from row 16:** a relay cannot be set dark; whatever is on its line when it wakes is carried. **Kept from row 17:** the front breaker is red for good until the relay turns; the relay is powered through another box's spare room, set, and the door shut.
- **Changed:** row 17 was written on three switches and a tie line that "looks like scenery and hides a break". Puzzle 14 built "which fuse" as two boxes on a ring, so the back door here is the other way round the block. The hidden break moved from the tie to the chapel's own span, behind the relay, where only a throw under current can show it. Row 16's "shed, wake, throw, restore" is not played: nothing on the relay's line has a breaker, so the load cannot be shed, only carried by the box with room. Row 16's second relay is dropped.
- **Dropped moves, for N5:** two relays set in an order (row 16 had 2 relays; row 21, "Far one first", leans on relay order). A tie line that reads as scenery (row 17). Neither has been shown.
- **Size:** 2 / 2 wires, fuse / 1 relay, 2 breakers, 2 fuse boxes; 2 blocks (row 17: 1 / wire, fuse / 1 relay, 1 switch, 1 breaker, 2 fuse boxes).

## Limits passed

None. 6 clicks, 1 hidden fact, 2 faults, 5 own buildings, 2 blocks.

## Series rules

- **Reuse is free.** A blow is the front door's price, and "fit it and it blows again" is a designed trap, named above and readable before the fit.
- **Kit: 2 wires, 1 fuse.** Puzzle 16's is a bulb and a fuse; puzzle 18's is two bulbs, a wire and a fuse.
- **Heavy building: the mill** (load 5; the granary is 5 too, and is a target). Puzzle 16's is the foundry; puzzle 18's is the tannery.
- **Shrine count: 2 of 5.** No shrine here; the chapel is not a shrine.
- District `block:0:4`, `block:3:4`. `block:3:4` has not been used by the series. `block:0:4` was puzzle 9's district and one of puzzle 14's two (neither a neighbour of 17). It shares no block with puzzle 16 (`block:6:11`, `block:7:11`, `block:8:10`) or puzzle 18 (`block:7:5`, `block:7:7`). The chapel stands on `block:1:7`, across `x:7`; its drop hangs from `block:3:4`'s pole. The feed's pole is on `block:0:7`.
- **Districts used by 1 to 17:** the list in `s16-let-it-blow.md`, and now `block:0:4` + `block:3:4`.

## Expected numbers

`npm run analyze puzzles/city/s17-the-back-door.city.json`:

| | |
| --- | --- |
| States | 168, exhaustive |
| Solvable | yes |
| Fewest clicks | 6 (`br_k`, `br_f`, `r_1`, `br_k`, `repair:l_gran`, `repair:l_chapel`; the note's order mends the chapel before the hand-back, also 6) |
| Winning click orders | 16 |
| Winning configurations | **1** (`br_k` open, `br_f` closed, the relay at the chapel, both breaks mended, no box blown) |
| Parts used | wire, wire (2 of 3; the fuse is a spare) |
| Feed at the shortest win | 27 of 27 |
| Fuses that blow on a shortest win | none |
| Fuses that blow on some move | `fb_f`, `fb_k` |
| First moves | `br_k`, `br_f`, `repair:l_gran` |
| Dead-end states | 107 of 168 (63.7%) |
| First moves that lead only to dead ends | `repair:l_gran` |
| Hidden at the start | 1: the break `f_c` past the relay |

**No win without the relay thrown:** the chapel hangs only on its second position, and the one winning configuration has it there.

Loads, replayed on the conversion: start 14 of 27 (`fb_k` 10 of 19, `fb_f` 3 of 11); `br_k` 23 (`fb_k` 19 of 19); the relay 18 (`fb_k` 14); the chapel's mend 22 (`fb_k` 18); `br_k` open 14; `br_f` 22 (`fb_f` 11 of 11); the granary's mend 27 of 27 (`fb_k` 15), win.

**The obvious wrong first move:** `repair:l_gran`, the white mend of the one spark on screen. Read: the granary lights, the back box's bar goes to 15 of 19, and the back breaker's number turns red. It leads only to dead ends, and is recovered by **one Undo**. The other wrong first move, `br_f`, is red beforehand and recovered by the spare fuse. The check block replays both, the fuse fitted at once, and the chapel left on the back box.

**Where it stands against 16:** it reads deeper (8 facts against 7), has fewer winning click orders (16 against 34) and three times the share of dead-end states (63.7% against 20.8%). It is the first puzzle since 13 whose obvious first move is white and leads only to dead ends.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_k", "r_1", "repair:l_chapel", "br_k", "br_f", "repair:l_gran"],
  "traps": [
    { "name": "mend the granary's spark first",
      "moves": ["repair:l_gran"],
      "expect": { "lit": ["granary", "homes"], "complete": false },
      "recover": ["undo", "br_k", "r_1", "repair:l_chapel", "br_k", "br_f", "repair:l_gran"] },
    { "name": "wake the relay from the front",
      "moves": ["br_f"],
      "expect": { "blown": ["fb_f"], "readable": ["blown-fb_f"], "complete": false },
      "recover": ["br_f", "repair:fb_f", "br_k", "r_1", "repair:l_chapel", "br_k", "br_f", "repair:l_gran"] },
    { "name": "fit the front fuse at once and it blows again",
      "moves": ["br_f", "repair:fb_f"],
      "expect": { "blown": ["fb_f"], "readable": ["blown-fb_f"], "complete": false },
      "recover": ["undo", "br_f", "repair:fb_f", "br_k", "r_1", "repair:l_chapel", "br_k", "br_f", "repair:l_gran"] },
    { "name": "leave the chapel on the back box and mend the granary",
      "moves": ["br_k", "r_1", "repair:l_chapel", "repair:l_gran"],
      "expect": { "blown": ["fb_k"], "readable": ["blown-fb_k"], "complete": false },
      "recover": ["undo", "br_k", "br_f", "repair:l_gran"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds `block:0:4`'s whole ring and, to its right, the relay's pole, the mill and the chapel's pole on `block:3:4`. The chapel itself is below the frame's south street line, across `x:7`.
- The relay reads as a relay, on its own pole across `z:3`, with the mill's drop and the chapel's span as its two outs.
- A click on the dead relay is refused with a prompt that says why.
- The spark on the granary's drop shows at the start (a break on a drop, not on a span).
- The two fuse boxes at the south-west corner, 20 m apart round the corner, read as two, and their bars can be told apart.

## To watch when Josh plays it

- Whether the refused click on the dead relay teaches "it needs current" or reads as a bug. This is the series' first relay.
- Whether he mends the granary's spark first. If he does, whether the back breaker turning red sends him to the back box's bar or just to Undo.
- Whether "the relay stays where it was thrown" is trusted across the dark between `br_k` and `br_f`, or tested first.
- Whether the −1 on the live relay reads as "the mill off, the chapel on".
- The numbers are large for what they say: 16 houses hang on the ring. Whether "room for 9, exactly" can be read from 10 of 19, or is found by the white number alone.
- Whether the chapel, across `x:7` from the pole it hangs on, reads as on the relay's wire.

## What it taught us
