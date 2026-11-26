# 15 · The fuse above — design note (series v1, puzzle 15)

A new puzzle designed on the city (ticket 081 section N3; `puzzles/series-v1.md`, row 15). It has no schematic and no `from`. **It is the first puzzle with one fuse box behind another** (a mother fuse over a child), and that is the new thing in it. It is laid on the corner puzzle 1 was laid on, with the next block east: the first corner the player ever lit comes back as the batch's last.

- **New concept:** nested fuses. A building behind two fuse boxes has two bars over it, and both must have room. Room in the small box nearest the building says nothing about the box above it.
- **The reasoning move:** when the small box shows room and the move is red anyway, look up the wire for the next box, list everything that hangs under it on every branch, and take load off it on a branch that is not the target's.
- **Builds on:** 6 (open the dark before spending: the blown box first), 8 (red means "not yet": find what shares the box), 11 (a box's room is for everything it will carry, not only what is lit), 12 (a second feed; joined is not pooled; a breaker draws the line), 14 (the numbers count what you haven't read as sound).
- It uses no switch, relay, spring, battery or timed breaker.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:4:8` and `block:5:8`**, which touch across `z:5`. West's wire comes along `block:4:8`'s south street through the mother fuse to the corner, where it splits: north up `block:4:8`'s east street to the homes and the long house, and east across `z:5` through the child fuse to `block:5:8`'s south street and the glassworks.
- **West** stands on `block:0:8`'s crossing pole, across `z:4` from `block:4:8`'s south-west corner. **North** stands on `block:1:7`'s corner pole, across `x:9` from `block:4:8`'s north-east corner, and its wire comes down the east street to an open breaker just north of the long house. Each has one entering span.
- West capacity **8**, North capacity **4**; `fb_m` (the mother) rated **6**, `fb_1` (the child) rated **4**. Own numbers 5, 3, 4 and 2, raised once by `npm run fit -- --raise` for the 4 scenery buildings the solution lights. The top-level capacity is null (`version` 5).
- Targets: `long_house`, `glassworks`. Priority: `homes`. Parts: **1 fuse, 1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed "West" | pole `pole:z:4:lo:402.50` (crossing, block:0:8, +x side) | 109.25, 402.50 |
| `north` | feed "North" | pole `pole:x:9:lo:162.50` (end, block:1:7, +z side) | 162.50, 319.25 |
| `j_s` | junction | pole `pole:x:11:lo:132.50` (end, block:4:8, +z side) | 132.50, 409.25 |
| `shrine` | lamp, load 1 | building `block:4:8/b\|outer\|+z\|26,80`, by its drop from `pole:x:11:lo:132.50` | 132.50, 405.00 |
| `fb_m` | fuse box | pole `pole:x:11:lo:142.50` (slot, block:4:8, +z side) | 142.50, 409.25 |
| `j_w` | junction | pole `pole:x:11:lo:152.50` (slot, block:4:8, +z side) | 152.50, 409.25 |
| `well_house` | lamp, load 1 | building `block:4:8/b\|outer\|+z\|29,80`, by its drop from `pole:x:11:lo:152.50` | 152.50, 405.00 |
| `j_m` | junction | pole `pole:z:5:lo:402.50` (end, block:4:8, +x side) | 169.25, 402.50 |
| `j_h` | junction | pole `pole:z:5:lo:390.50` (slot, block:4:8, +x side) | 169.25, 390.50 |
| `homes` | lamp, load 1 | building `block:4:8/b\|outer\|+x\|32,77`, by its drop from `pole:z:5:lo:390.50` | 165.00, 392.50 |
| `br_k` | breaker, closed | pole `pole:z:5:lo:374.50` (slot, block:4:8, +x side) | 169.25, 374.50 |
| `j_k` | junction | pole `pole:z:5:lo:366.50` (slot, block:4:8, +x side) | 169.25, 366.50 |
| `long_house` | lamp, load 3, **target** | building `block:4:8/b\|outer\|+x\|32,72`, by its drop from `pole:z:5:lo:366.50` | 165.00, 367.50 |
| `br_n` | breaker, open | pole `pole:z:5:lo:355.50` (slot, block:4:8, +x side) | 169.25, 355.50 |
| `fb_1` | fuse box | pole `pole:z:5:hi:402.50` (crossing, block:5:8, -x side) | 185.75, 402.50 |
| `br_g` | breaker, open | pole `pole:x:11:lo:205.00` (slot, block:5:8, +z side) | 205.00, 409.25 |
| `glassworks` | lamp, load 2, **target** | building `block:5:8/built\|outer\|+z\|43,80`, by its drop from `pole:x:11:lo:217.50` | 217.50, 405.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `j_s` | 2 spans: 1 cross, 1 corner (over `z:4`) | 26.05 |
| `l_shrine` | `j_s` → `shrine` | drop | — |
| `l_w1` | `j_s` → `fb_m` | 1 span: 1 along (along `x:11`) | 10.00 |
| `l_m0` | `fb_m` → `j_w` | 1 span: 1 along (along `x:11`) | 10.00 |
| `l_well` | `j_w` → `well_house` | drop | — |
| `l_m1` | `j_w` → `j_m` | 2 spans: 1 along, 1 corner (along `x:11`) | 19.55 |
| `l_k0` | `j_m` → `j_h` | 1 span: 1 along (along `z:5`) | 12.00 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_k1` | `j_h` → `br_k` | 1 span: 1 along (along `z:5`) | 16.00 |
| `l_k2` | `br_k` → `j_k` | 1 span: 1 along (along `z:5`) | 8.00 |
| `l_long` | `j_k` → `long_house` | drop | — |
| `l_k3` | `j_k` → `br_n` | 1 span: 1 along (along `z:5`) | 11.00 |
| `l_n0` | `north` → `br_n` | 3 spans: 1 cross, 1 corner, 1 along (over `x:9`, along `z:5`) | 39.05 |
| `l_c0` | `j_m` → `fb_1` | 1 span: 1 cross (over `z:5`) | 16.50 |
| `l_c1` | `fb_1` → `br_g` | 2 spans: 1 corner, 1 along (along `x:11`) | 22.05 |
| `l_glass` | `br_g` → `glassworks` | 1 span: 1 along (along `x:11`) + drop. **Fault `f_g`** on `x:11:lo:205.00~x:11:lo:217.50` | 12.50 |

Faults (2): `f_blown`, the child box `fb_1`, blown at the start and buzzing; `f_g` on `l_glass`, the last span to the glassworks, dark at the start behind the blown box and the open `br_g`.

**No breaker or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_m` | `pole:x:11:lo:142.50` | 2 spans, both its own (`l_w1` in from `x:11:lo:132.50`, `l_m0` out to `x:11:lo:152.50`); no drop |
| `fb_1` | `pole:z:5:hi:402.50`, `block:5:8`'s crossing pole | 2 spans, both its own (`l_c0`, the crossing of `z:5` from the corner; `l_c1`, the corner span to `x:11:lo:192.50`); no drop |
| `br_k` | `pole:z:5:lo:374.50` | 2 spans, both its own (`l_k1` in from `z:5:lo:390.50`, `l_k2` out to `z:5:lo:366.50`); no drop |
| `br_n` | `pole:z:5:lo:355.50` | 2 spans, both its own (`l_k3` from `z:5:lo:366.50`, `l_n0` from `z:5:lo:342.50`); no drop |
| `br_g` | `pole:x:11:lo:205.00` | 2 spans, both its own (`l_c1` in from `x:11:lo:192.50`, `l_glass` out to `x:11:lo:217.50`); no drop |

It has no switch. The two exceptions Josh allowed are not used.

Scenery (section S), 4 buildings, all lit at the win: a house across `x:11` at West's first pole (before the mother); a house at the top of the east street on North's wire; a house across `x:11` on the child's wire; a house across `x:11` at the glassworks' pole. Three of the four are on blocks outside the district (`block:2:10`, `block:5:10` twice). This is the series' quietest map: every number on screen is small.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:5:8` | Fits the fuse in the child box on its crossing pole; closes `br_g` to look (the glassworks' road is broken); mends it. Reads the child's bar: 1 of 4 | The glassworks, its road and the child box are here |
| `block:4:8` | Reads the mother's bar on the south street: 6 of 6. Opens `br_k` and closes `br_n` on the east street: the long house leaves West and the mother for North | The mother, and everything under it that is not the glassworks' own branch, is here. So is the only wire North has |

The red on `block:5:8` (the glassworks' road) is caused on `block:4:8` (the mother, full) and cured on `block:4:8` (the long house handed to North). Nothing the player can do on `block:5:8` turns it white.

## The intended read from the default camera

The camera opens on both blocks, `block:4:8` on the left. **The glassworks is on `block:5:8`'s south street (`x:11`), two poles east of the crossing pole, dark, behind a breaker. The long house is on `block:4:8`'s east street (`z:5`), mid-block, lit, with a breaker either side of it.** The shrine from puzzle 1 is the lit corner building at the far left, on West's wire before the mother; it is not asked for tonight.

1. West's wire comes in at the left, past the shrine, through a fuse box (**5 of 6**), past the well house to the corner. North up the east street: the homes, a breaker, the long house, and an **open breaker** with North's wire waiting on its far side. East across `z:5`: a second fuse box on the crossing pole, **buzzing**: blown. Past it the street to the glassworks is dark. West 7 of 8. North 1 of 4. A fuse and a wire in hand.
2. Fit the fuse in the small box (+1, white). One house lights past it. The small box reads **1 of 4**. The box up the wire now reads **6 of 6**.
3. The glassworks' breaker reads **+3, red**. The small box has room for 3. The red names the other box: the mother.
4. Close the breaker anyway to look (puzzle 10 and puzzle 12 taught that a red breaker on a dark road may have nothing to blow): a **spark**, one span on. The glassworks' road is broken, and its mend reads **+3, red**, naming the mother. The wire is for this, and not yet.
5. What hangs under the mother: the well house, the homes, the long house, and this street. Nothing on this street can come off. The well house and the homes have no breaker. The long house is 3, it has a breaker either side, and beyond the far one is North, with room for 3.
6. Open `br_k` (−3). The long house goes dark. The mother reads 3 of 6. Then close `br_n` (+3, white): the long house lights from North. North 4 of 4. (The other order is the free trap below.)
7. Mend the glassworks' road (+3, white). The small box 4 of 4, the mother 6 of 6, West 8 of 8, North 4 of 4. **Win.**

**Hidden at the start (1 fact):** the break `f_g` on the glassworks' road, behind the blown child and its open breaker. The fuse and the breaker show it; the fuse can go nowhere else, and the breaker costs nothing while the road is broken. **Layers (3):** the child (the fuse, and a bar that shows room); the mother (what hangs under it, and where the long house can go); the road (the look, the mend).

## The trap

**The small box, once fused, shows 1 of 4, and the glassworks' road reads red anyway: the room has to be made under the fuse above, on the other street.**

A player who reads only the box nearest the target sees room, takes the red for the number reading high (it did in puzzle 14), and mends the road. The mother blows: a bolt down both streets to the box by the shrine, the well house, the homes and the long house all dark, and the only fuse is already in the child. It is readable before (the red names `fb_m`, and its bar is full) and after (the blown mother). **One Undo** takes it back.

**The free trap:** close `br_n` before opening `br_k`. The two feeds meet, and North, the nearer feed, takes the homes as well as the long house: North 5 of 4, a brownout. Open `br_k` and North is left with the long house alone. Puzzle 12 taught this: joined is not pooled, and a breaker draws the line.

**The half-answer:** open `br_k` and stop. The mother has room, the road mends white, the glassworks lights, and the long house is dark. It is a target. Close `br_n`.

## What it builds on, and its depth of read

- **8 is the trap.** 8 taught "red: find what shares its box and take that off". The box the player looks at is the child, and nothing shares it. The lesson holds one box further up.
- **14 is the second trap.** 14 taught that a red number can read high. Here it reads true.
- **6, 11 and 12 are held together.** The one fuse goes into the dark box first (6), which means there is no spare for the mother. The mother's room has to cover a building that is not lit yet (11). And the only load that can leave the mother leaves by a second feed, with the line drawn by a breaker before the join (12).
- **Depth of read: 6.** Before the wire is spent the player must hold: (1) the glassworks is behind two boxes; (2) the child has room and the mother has none; (3) the one fuse is in the child, so the mother must not blow; (4) under the mother, only the long house is big enough to matter and has a way out; (5) North has room for 3, the long house exactly, and joined without the line it takes the homes too; (6) the glassworks' road is broken, and the wire is for it. Puzzle 14 asks for 5.

## The numbers (section V) and the hover cue

- At the start: the fuse +1 white; `br_g` +0 (its road is dead); `br_k` −3; `br_n` +0 **red** (North would be at 5 of 4).
- After the fuse: `br_g` +3 **red**, blows `fb_m`. After `br_g`: the road's mend +3 **red**, blows `fb_m`. **The red names the mother, not the child.** Whether the fuse label's red (section Y2) makes that readable from the camera is the thing to watch.
- After `br_k`: everything is white (`br_n` +3, the mend +3).
- After `br_n` first: a brownout, and `br_k` reads +0 white (it gives the homes back to West).
- The hover cue on `br_k` lights the span to the long house; on `br_n`, the span from North.

## The tribe's homes

`homes` (priority) is on `block:4:8`'s east street, under the mother: lit at the start and **lit at the win**. The right solve costs the tribe nothing. The mother's blow darkens them; the free trap makes them flicker.

## Changed from the plan's row

- **Kept:** nested fuses; two bars for one building; "the small box shows room, the throw is red anyway"; the room has to be made on the mother's other branch.
- **Changed:** the plan's row had 2 switches, 2 breakers and 3 fuse boxes (a mother and two sisters), 1 fault, a fuse and a wire. Built: **3 breakers, 2 fuse boxes (a mother and one child), 2 feeds, 2 faults, a fuse and a wire.** The second child went: the long house hangs straight under the mother, so the sentence "moving a load between sisters does not relieve the mother" is not played. What is played is its other half: the load must leave the mother altogether. The way out is the second feed from puzzle 12 instead of a switch, because on the simulator a switch sends current one way only and can't hand a lit building to another road.
- **For N5:** row 23 ("a main fuse over its children") can lean on the mother here. It can't lean on two sisters under one mother; that has not been shown.
- **Size:** 2 / fuse, wire / 3 breakers, 2 fuse boxes, 2 feeds (the row: 1 / fuse, wire / 2 switches, 2 breakers, 3 fuse boxes).

## Limits passed

None. 5 clicks, 1 hidden fact, 2 faults, 5 own buildings.

## Series rules

- **No "obvious breaker blows a fuse" opener.** The first move that can blow anything is the mend of the glassworks' road, a repair, red when it would blow, after the fuse and the look. `br_g` itself blows nothing: its road is broken. "Fit it and it blows again" is not the trap: the fuse fitted in the child holds.
- **Kit: 1 fuse, 1 wire.** Puzzle 14's is a bulb and a fuse. (Puzzle 11's kit is the same as this one; they are not neighbours.)
- **Heavy building: the long house** (load 3). Puzzle 14's is the cannery.
- **Shrine count: 2 of 5.** The shrine stands lit on this map and is not a target.
- District `block:4:8`, `block:5:8`. `block:5:8` has not been used by the series. **`block:4:8` is puzzle 1's district** (since its re-lay in NR; not a neighbour of 15), and this puzzle reuses puzzle 1's places there, as Josh allowed (25 Nov 2026: "You can even use the same nodes over again"): puzzle 1's shrine is the lit building before the mother; its shrine breaker's pole holds the mother; its home is the long house and its home breaker's pole is `br_k`; its feed's pole, across `z:5`, holds the child. It shares no block with puzzle 14 (`block:0:4`, `block:0:2`). **Puzzle 16 must not use `block:4:8` or `block:5:8`.** The feeds' poles are on `block:0:8` and `block:1:7`.
- **Districts used by 1 to 15**, none to be a district again: `block:4:8`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, `block:0:4` + `block:0:2`, `block:4:8` + `block:5:8`. (Ticket 081's N3 list names `block:2:10` for puzzle 1; it has been on `block:4:8` since NR, and no series puzzle uses `block:2:10`.)

## Expected numbers

`npm run analyze puzzles/city/s15-the-fuse-above.city.json`:

| | |
| --- | --- |
| States | 31, exhaustive |
| Solvable | yes |
| Fewest clicks | 5 (`repair:fb_1`, `br_k`, `br_n`, `br_g`, `repair:l_glass`) |
| Winning click orders | 36 |
| Winning configurations | **1** (the fuse in `fb_1`, `br_k` open, `br_n` closed, `br_g` closed, `f_g` mended) |
| Parts used | fuse, wire (2 of 2) |
| Feeds at the shortest win | West 8 of 8, North 4 of 4 |
| Fuses that blow on a shortest win | none |
| Fuses that blow on some move | `fb_m` |
| Dead-end states | 8 of 31 (25.8%): every state with the mother blown |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the break `f_g` |

Loads, replayed on the conversion: start West 7 of 8, North 1 of 4, `fb_m` 5 of 6; the fuse West 8, `fb_m` 6 of 6, `fb_1` 1 of 4; `br_k` West 5, `fb_m` 3; `br_n` North 4 of 4; `br_g` no change; the mend West 8 of 8, `fb_m` 6 of 6, `fb_1` 4 of 4, win.

**The obvious wrong first move** is not the first click: the fuse is right, and the look is free. It is the third: `repair:l_glass` with the long house still under the mother. Read: the red on the mend names the mother; then the bolt, and both streets dark. Recovered by **one Undo**. The check block replays it, the free trap and the half-answer.

**Where it is easier than 14, and why it follows it:** fewer dead-end states (25.8% against 48.3%), because the only blow is one red repair. It has fewer winning click orders (36 against 40), it reads deeper (6 facts against 5), and its blow is the first in the series with no part to recover it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb_1", "br_k", "br_n", "br_g", "repair:l_glass"],
  "traps": [
    { "name": "mend the glassworks road with the long house still under the mother",
      "moves": ["repair:fb_1", "br_g", "repair:l_glass"],
      "expect": { "blown": ["fb_m"], "complete": false },
      "recover": ["undo", "br_k", "br_n", "repair:l_glass"] },
    { "name": "join North before West lets go",
      "moves": ["br_n"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_k", "repair:fb_1", "br_g", "repair:l_glass"] },
    { "name": "shed the long house and stop there",
      "moves": ["br_k", "repair:fb_1", "br_g", "repair:l_glass"],
      "expect": { "lit": ["shrine", "well_house", "homes", "glassworks"], "complete": false },
      "recover": ["br_n"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks and both feeds' poles; North's pole is at the top, a street away from everything else.
- The two fuse boxes read as two, a corner and a street apart (the mother on the south street, the child on the crossing pole over `z:5`), and their bars can be told apart.
- The shrine, lit and not a target, does not carry a target icon.

## To watch when Josh plays it

- Whether the mother reads as "above" the child at all from the fixed camera: it is 46 m back along the wire, round a corner.
- Whether the red on the glassworks' road is read as the mother's. If the player can't tell which box a red names, this puzzle is unfair, and that is a renderer finding.
- Whether meeting puzzle 1's corner again is noticed.

## What it taught us
