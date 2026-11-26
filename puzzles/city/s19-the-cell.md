# 19 · The cell — design note (series v1, puzzle 19)

A new puzzle designed on the city (ticket 081 section N4; `puzzles/series-v1.md`, row 19). It has no schematic and no `from`. **It is the first puzzle with a battery**, and the battery is the new thing in it. Its note is written against section BC's contract for the battery's number and hover cue (merged before this puzzle was built: PRs for BC1 to BC3).

- **New concept:** the battery. It fills, a second a second, while a feed's current reaches its input. Released, it lights its far side for as many seconds as it holds, and then it is flat. Its light trips no fuse and counts against no feed; it also wins nothing. And its seconds are spent for good: Undo does not give them back.
- **The reasoning move:** use the cell's few seconds to set what the feed cannot reach safely, then let the feed in last.
- **Builds on:** 6 (open the dark before anything else: the blown box first), 8 (a red breaker means "not yet"), 12 (two feeds, two pools), 15 (the one fuse is spent, so a blow has no spare), 17 (a relay moves only under current, wakes with what is on its line, and keeps its place in the dark).
- It uses no spring and no timed breaker.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:0:10` and `block:2:10`**, the city's south-west corner, which touch across `z:2`. West's wire comes down `block:0:10`'s west street and along its south street to the cell on the corner pole. The cell's far wire crosses `z:2` to `block:2:10`'s south-west corner. East's wire comes the other way along `block:2:10`'s south street to the same corner. One pole north of the corner is the relay.
- **West** stands on `block:0:8`'s corner pole, across `x:11` from `block:0:10`'s north-west corner. **East** stands on `block:5:10`'s crossing pole, across `z:5` from `block:2:10`'s south-east corner. Each has one entering span.
- West capacity **9**, East capacity **10**; `fb_e` (East's fuse box) rated **9**. Own numbers 1, 3 and 3, raised once by `npm run fit -- --raise` for the 15 scenery buildings the solution lights (8 on West, 7 on East, 6 of them behind the box). The top-level capacity is null (`version` 5).
- **The cell** holds **10 s** and starts with **4 s**. Its input is West's wire.
- Target: `signal_house`. Priority: `homes`. Parts: **1 fuse, 1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed "West" | pole `pole:x:11:lo:27.50` (end, block:0:8, +z side) | 27.50, 409.25 |
| `east` | feed "East" | pole `pole:z:5:hi:507.50` (crossing, block:5:10, -x side) | 185.75, 507.50 |
| `j_h` | junction | pole `pole:x:14:lo:57.50` (slot, block:0:10, +z side) | 57.50, 514.25 |
| `homes` | lamp, load 1, priority | building `block:0:10/b\|outer\|+z\|10,101`, by its drop from `pole:x:14:lo:57.50` | 57.50, 510.00 |
| `cell` | battery, 10 s, starts at 4 s, input `l_in` | pole `pole:x:14:lo:67.50` (end, block:0:10, +z side) | 67.50, 514.25 |
| `j_d` | junction | pole `pole:z:2:hi:507.50` (end, block:2:10, -x side) | 90.75, 507.50 |
| `r_1` | relay, position 0 `l_brew`, 1 `l_sig`; set 0 | pole `pole:z:2:hi:494.50` (slot, block:2:10, -x side) | 90.75, 494.50 |
| `brewery` | lamp, load 6 | building `block:0:10/b\|outer\|+x\|13,98`, by its drop from `pole:z:2:hi:494.50` | 70.00, 492.50 |
| `signal_house` | lamp, load 3, **target** | building `block:2:10/a\|outer\|-x\|19,95`, by its drop from `pole:z:2:hi:482.50` | 95.00, 482.50 |
| `fb_e` | fuse box | pole `pole:x:14:lo:151.67` (slot, block:2:10, +z side) | 151.67, 514.25 |
| `br_x` | breaker, open | pole `pole:x:14:lo:130.00` (slot, block:2:10, +z side) | 130.00, 514.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `j_h` | 12 spans: 1 cross, 2 corner, 9 along (over `x:11`, along `z:0`, along `x:14`) | 140.59 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_in` | `j_h` → `cell` | 1 span: 1 along (along `x:14`) | 10.00 |
| `l_far` | `cell` → `j_d` | 2 spans: 1 corner, 1 cross (over `z:2`) | 26.05 |
| `l_r` | `j_d` → `r_1` | 1 span: 1 along (along `z:2`) | 13.00 |
| `l_brew` | `r_1` → `brewery` | drop | — |
| `l_sig` | `r_1` → `signal_house` | 1 span: 1 along (along `z:2`) + drop. **Fault `f_s`** on `z:2:hi:482.50~z:2:hi:494.50` | 12.00 |
| `l_e0` | `east` → `fb_e` | 3 spans: 1 cross, 1 corner, 1 along (over `z:5`, along `x:14`) | 36.88 |
| `l_e1` | `fb_e` → `br_x` | 2 spans: 2 along (along `x:14`) | 21.67 |
| `l_x` | `br_x` → `j_d` | 4 spans: 3 along, 1 corner (along `x:14`) | 42.05 |

Faults (2): `f_blown`, East's fuse box, blown at the start and **buzzing** (East's current reaches it); `f_s`, a break on the signal house's one span past the relay, dark at the start.

**The picture.** Three wires meet at `block:2:10`'s south-west corner (`j_d`). From the west, across `z:2`: the cell's far wire. From the east, along the south street: East's wire, through its fuse box and **`br_x` (open)**. To the north, one pole up `z:2`: **the relay**, with the brewery's drop on its pole (the brewery stands across `z:2`), and one span on, the signal house. West's wire does not reach the corner: it ends in the cell.

**The street crossing between blocks:** `l_far`, the cell's far wire, over `z:2`, from `block:0:10`'s crossing pole to `block:2:10`'s corner pole.

**No breaker, relay, battery or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `cell` | `pole:x:14:lo:67.50`, `block:0:10`'s south-east end pole | 2 spans, both its own: its input (`l_in`, along from `x:14:lo:57.50`) and its one far-side line (`l_far`, the corner span to the crossing pole); no drop |
| `r_1` | `pole:z:2:hi:494.50` | its own three wires and nothing else: along from the corner (`l_r`), the brewery's drop (`l_brew`, position 0), along north (`l_sig`, position 1). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `fb_e` | `pole:x:14:lo:151.67` | 2 spans, both its own (`l_e0` in from `x:14:lo:162.50`, `l_e1` out to `x:14:lo:140.83`); no drop |
| `br_x` | `pole:x:14:lo:130.00` | 2 spans, both its own (`l_e1` in from `x:14:lo:140.83`, `l_x` out to `x:14:lo:119.17`); no drop |

Scenery (section S), 15 buildings, all lit at the win: 8 on West's wire down `block:0:10`'s west and south streets; 1 before East's box; 1 behind the box and before `br_x`; 3 on the south street between `br_x` and the corner; 1 on the cell's far wire (its crossing pole); 1 on the signal house's pole, past the break. The last five are dark at the start. The cell lights them for nothing; East carries them once it is let in.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:0:10` | Releases the cell, and reads its seconds (4 s, of 10). Reads that West's wire ends there | The cell and the only wire that fills it are here. The brewery, which is what East must not meet, stands here too |
| `block:2:10` | Fits the fuse in East's box; throws the relay while the cell's light is on it; closes `br_x`; mends the signal house's span. Reads the box's bar and the red on `br_x` | East's road, the relay and the target are here |

The release on `block:0:10` is the only thing that makes the relay on `block:2:10` throwable without a blow, and it lasts four seconds. The throw on `block:2:10` is what turns `br_x` white.

## The windows

| Window | Fed | What only this window allows |
| --- | --- | --- |
| **The cell's charge** (4 s at the start; 10 s full; it fills at 1 s a second while West reaches it and it is not released) | The cell's far wire, the corner, the south street back to `br_x`, the relay and what it points at | Throwing the relay with the brewery on its line. East cannot: the brewery blows its box. Nothing else can reach the relay |
| **Any time** (East's own current) | East's street to `br_x`; past it once `br_x` is closed | The fuse; `br_x`; the mend, once the relay is thrown (East's light shows the break as well as the cell's does) |

## The intended read from the default camera

The camera opens on both blocks, `block:0:10` on the left. **The signal house is on `block:2:10`'s west street (`z:2`), two poles north of the south-west corner, dark.** The brewery is the dark building across `z:2` from the relay's pole. The cell is on the corner pole at the bottom, left of `z:2`.

1. West's wire is lit down the left edge and along the bottom to the cell: **West 9 of 9**. Past the cell everything is dark: the corner, the relay, the brewery, the signal house, and the bottom street as far as an **open breaker**. At the bottom right East's fuse box **buzzes**: blown. East 1 of 10. The cell reads **4 s**. A fuse and a wire in hand.
2. Fit the fuse (+1, white). One house lights past the box. The box reads 1 of 9.
3. `br_x` reads **+10, red**, and names the box it has just been fused. East's current would run to the corner and up to the relay, and the relay points at the brewery: 6, with the four houses on the way. There is no other fuse.
4. The relay cannot be thrown: it is dead (puzzle 17). There is no second box to wake it from. West is full, and its wire stops at the cell.
5. **Hover the cell.** Its far wire lights: across `z:2` to the corner, along the bottom street to `br_x`, up to the relay and into the brewery. It reads **4 s**, and no red. The cell's current trips no fuse.
6. Four seconds. Enough for one unhurried click. **Release the cell**, and **throw the relay** while the brewery burns. The brewery goes dark, and a **spark** shows one span past the relay. A moment later the cell is flat and the corner is dark again. The relay stays where it was thrown.
7. `br_x` now reads **+4, white**. **Close it.** East's light comes to the corner and up to the spark. Mend it (+4, white): the signal house is lit, by East. The box 9 of 9, East 10 of 10. **Win.**

A player who waits for the cell to fill (six seconds more) has time to mend the span by the cell's light as well: the signal house then burns, and the job is not done. The cell's light is for setting and reading. `br_x` finishes it.

**Hidden at the start (1 fact):** the break `f_s` past the relay's second position. It shows when the relay is thrown under any light. **Layers (4):** the dark side opened (the fuse); the red that stays red, and why no box can cure it; the cell's window (how long, and what goes in it first); the feed in last.

## The trap

**The breaker into the dark is red, and nothing on East's side will ever turn it white: closed, the brewery wakes on the box that holds the only fuse.**

After puzzles 8 to 17 a red breaker means "make room first". Here there is no room to make: nothing behind East's box has a breaker, and the load is the relay's own. Thrown on its red, `br_x` blows the box (a bolt along the bottom street), and the kit is empty. It is readable before (+10 red, the box at 1 of 9) and after (the blown box; its own number, +11 red). It is recovered by **one Undo**, which returns the fuse; the cell's seconds are untouched, because it was not running.

**The window run out.** Release the cell and watch the brewery burn: four seconds later it is flat, and nothing is thrown. Undo does not refill it. It is recovered by **a wait**: West fills it again at a second a second, and the number by it counts up. This is the first puzzle where a mistake costs time and nothing else.

**Lit is not done.** With the cell full, release, throw, and mend: the signal house burns by the cell's light for a few seconds and the job does not complete. Close `br_x`.

**Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"). Close `br_x` first, while the box is still blown, and then fit the fuse: the prompt warns (*would blow again: 11 load on ≤9*), the fuse's number is red, and fitted it blows at once. One Undo.

## What it builds on, and its depth of read

- **8 is the trap.** Red has meant "not yet, take something off". Here it means "not from this side, ever, until the relay turns".
- **17 is held against it.** 17's answer was the other box's spare room. There is one box here, and the other feed is full and does not reach. The relay's two properties are both needed: it must be live to be thrown (so something has to light it), and it keeps its place when the cell goes flat (so four seconds are enough).
- **6 and 15** open it: the dark side first, with the only fuse, so that every blow after it is final.
- **12** is why the cell is on West's wire: two pools, and West's is spent. All West can give is seconds.
- **Depth of read: 8.** Before the first move that cannot be taken back (the release: Undo does not rewind it) the player must hold: (1) the signal house is behind the relay, and the relay points at the brewery; (2) East's road wakes it with the brewery, 11 on a box of 9; (3) the one fuse is in that box; (4) nothing behind the box can be shed, and no other box or feed reaches the relay; (5) the cell's far wire does, and its light trips no fuse; (6) it holds 4 s, and one click fits in that; (7) the relay keeps its place when the cell is flat, so East can come in afterwards; (8) the cell's light does not win: East has to carry the signal house, and can, once the brewery is off its line. Puzzle 18 asks for 8.

## The numbers (section V), the cell's seconds and the hover cue (section BC)

- **The cell** (BC3): by its icon, its whole seconds, **"4 s"** at the start, counting up to "10 s" while West fills it and down while it runs. Its entry's load is +0 and never red, so no load number is drawn beside the seconds (BC-Q1: "Seconds it would light (Recommended)"). Flat, it has no number and its click is refused.
- **The cell's hover cue** (BC1, BC3): the lines its release would light: `l_far`, `l_x`, `l_r` and `l_brew` (the corner, the bottom street back to `br_x`, the relay and the brewery). After the throw, with the cell running, its cue is its stop's: those lines, with `l_sig` in place of `l_brew`, going dark. **This is how the cell's reach is read**: the cue runs to the relay, which nothing else on screen reaches without a red.
- While the cell runs, the relay's entry is a live relay's (BC1): its cue shows `l_brew` going dark and `l_sig` lighting, and its number is +0 (the cell's light counts against no feed).
- `br_x`: +0 while the box is blown; **+10 red**, blows `fb_e`, once it is fused; **+4 white** after the throw. The mend: +0 by the cell's light, +4 by East's.
- The blown box at the start: +1 white. With `br_x` closed and the relay at the brewery: +11 red.

## The tribe's homes

`homes` (priority) is on West's wire, one pole before the cell: lit at the start and **lit at the win**. The win costs the tribe nothing. The brewery, dark at the start, burns for the cell's few seconds and stays dark. The five houses of the dark corner are lit at the win.

## Changed from the plan's row

- **Kept from row 19** ("The cell"): the battery; "the breaker is red and stays red; the cell's wire into the dark side is why it is there"; set what the feed can't reach safely, then let the feed in last; the cell wakes a relay.
- **Changed:** the row had one feed. Built with two: on the city a cell that is filled from the same feed that later comes in needs a loop of wire, and the free blocks have none. So the cell hangs on a second, full feed, which also says in the fiction why it is there: West has no room, only seconds. A hidden break past the relay was added (N4's starting point: "reading a hidden fault by battery light may be a layer"), and the box starts blown, so the one fuse is spent before the red is met.
- **From row 20** ("By cell light", given way to the timer): its "the window is a lantern" move is here only as an option: the break can be read and mended by the cell's light, and need not be. **It is still not shown as a puzzle's point**, and stays offered to N5.
- **Dropped moves, for N5:** a cell that must be charged by an action (it fills by itself here); a window too short for the job unless waited for (4 s is enough for the one click that needs it); two things set in one window in an order (row 21, "Far one first").
- **Size:** 2 / fuse, wire / battery, 1 relay, 1 breaker, 1 fuse box, 2 feeds; 2 blocks (the row: 0 / fuse / battery, 1 relay, 1 breaker, 1 fuse box).

## Limits passed

None. 5 clicks, 1 hidden fact, 2 faults, 3 own buildings, 2 blocks.

## Series rules

- **Reuse is free.** A blow is the trap's cost, and "fit it and it blows again" is a designed trap, named above and readable before the fit.
- **Kit: 1 fuse, 1 wire.** Puzzle 18's is two bulbs, a wire and a fuse; puzzle 20's is two bulbs and a fuse. (Puzzles 11 and 15 have this kit; neither is a neighbour.)
- **Heavy building: the brewery** (load 6). Puzzle 18's is the tannery; puzzle 20's is the smelter.
- **Shrine count: 2 of 5.** No shrine here.
- District `block:0:10`, `block:2:10`. Neither has been used by the series. It shares no block with puzzle 18 (`block:7:5`, `block:7:7`) or puzzle 20 (`block:6:0`, `block:6:1`). The feeds' poles are on `block:0:8` and `block:5:10`.
- **Districts used by 1 to 19:** the list in `s18-make-before-break.md`, and now `block:0:10` + `block:2:10`.

## Expected numbers

`npm run analyze puzzles/city/s19-the-cell.city.json`, at 1 s a click (the default) and at `--click-seconds 3`:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 856, exhaustive | 764, exhaustive |
| Solvable | yes | yes |
| Fewest clicks | **5** | **5** |
| Waits on the shortest win | 0 | 0 |
| One shortest win | `cell`, `r_1`, `br_x`, `repair:fb_e`, `repair:l_sig` | the same |
| Winning click orders | 14 | 6 |
| Winning configurations | **1** (the fuse in, the relay at the signal house, `br_x` closed, the span mended) | **1** |
| Parts used | fuse, wire (2 of 2) | fuse, wire |
| Feeds at the shortest win | West 9 of 9, East 10 of 10 | the same |
| Fuses that blow on a shortest win | none | none |
| Fuses that blow on some move | `fb_e` | `fb_e` |
| First moves | `cell`, `br_x`, `repair:fb_e`, a wait | the same |
| Dead-end states | 312 of 856 (36.4%) | 280 of 764 (36.6%) |
| First moves that lead only to dead ends | none | none |
| Hidden at the start | 1: the break `f_s` | |

At 3 s a click the release and the throw still fit: the cell has 1 s left when the relay is thrown.

**No win without the release:** the relay is thrown in the one winning configuration, and it can be live only by the cell's light or by East's, and East's blows the box (11 on 9) before anything can be clicked.

Loads, replayed on the conversion: start West 9 of 9, East 1 of 10 (`fb_e` blown); the fuse East 2, `fb_e` 1 of 9; the release and the throw change no load; `br_x` East 6, `fb_e` 5; the mend East 10 of 10, `fb_e` 9 of 9, win. The trap: 11 on `fb_e`'s 9.

**The obvious wrong first move** is the second click: `br_x` on its red, after the fuse. Read: the red +10 naming the box, then the bolt and the empty kit. Recovered by **one Undo** (the fuse comes back; no time is lost that matters, because the cell was not running). **A wasted release is recovered by a wait**, not by Undo: 4 s of filling gives back what was spent. The dead-end states are the ones with the box blown and no fuse in hand. The check block replays the red breaker, the window run out, the signal house lit by the cell alone, and the fuse fitted onto a closed road.

**Where it stands against 18:** it reads as deep (8 facts against 8), has far fewer winning click orders (14 against 108) and three times the share of dead-end states (36.4% against 12.5%). It is the first puzzle with a move Undo cannot take back.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb_e", "cell", "r_1", "br_x", "repair:l_sig"],
  "traps": [
    { "name": "let East in while the relay points at the brewery",
      "moves": ["repair:fb_e", "br_x"],
      "expect": { "blown": ["fb_e"], "readable": ["blown-fb_e"], "complete": false },
      "recover": ["undo", "cell", "r_1", "br_x", "repair:l_sig"] },
    { "name": "release the cell and let it run out",
      "moves": ["repair:fb_e", "cell", "wait:5"],
      "expect": { "lit": ["homes"], "complete": false },
      "recover": ["wait:4", "cell", "r_1", "br_x", "repair:l_sig"] },
    { "name": "the signal house lit by the cell alone",
      "moves": ["repair:fb_e", "wait:6", "cell", "r_1", "repair:l_sig"],
      "expect": { "lit": ["signal_house"], "complete": false },
      "recover": ["br_x"] },
    { "name": "fit the fuse onto a closed road and it blows again",
      "moves": ["br_x", "repair:fb_e"],
      "expect": { "blown": ["fb_e"], "readable": ["blown-fb_e"], "complete": false },
      "recover": ["undo", "br_x", "repair:fb_e", "cell", "r_1", "br_x", "repair:l_sig"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks, West's pole at the top left and East's at the bottom right. West's wire is 140 m long, down the whole left edge.
- The cell reads as a battery, with its charge glyph and "4 s" by it; hovering it lights its far side as far as `br_x` and the brewery.
- The relay is one pole north of the corner; the brewery's drop crosses `z:2` (20 m) from its pole.
- The buzz on East's box shows at the start.
- A click on the flat cell, and on the dead relay, is refused with a prompt.

## To watch when Josh plays it

- Whether the cell reads as "a few seconds of free light" from its number and cue, before he releases it. This is the series' first battery, and BC's cue is new.
- Whether he closes `br_x` on its red after fitting the fuse, and whether an empty kit after the blow reads as fair.
- Whether 4 s is right. It holds one click. If he releases and loses it reading the screen, the wait to fill again is 4 s; whether that is a lesson or a nuisance.
- Whether the signal house burning by the cell's light, with no win, is understood or reads as a bug.
- Whether West, full and going nowhere but the cell, reads as part of the puzzle or as clutter: its wire is most of the left half of the view.
- Whether Undo not refilling the cell is noticed.

## What it taught us
