# 25 · The whole chain — design note (series v1, puzzle 25)

A new puzzle designed on the city (ticket 081 section N5; `puzzles/series-v1.md`, row 25). It has no schematic and no `from`. It is the last of the series: three blocks in a strip 215 m long, two feeds, and six layers, each of which changes who carries what.

Josh, 26 Nov 2026: "I'm using Fable because I want it to build better puzzles, more complex puzzles that challenge the user based upon what they know and what they've learned from prior puzzles."

- **New concept: the whole chain.** No new piece. Every fix hands something to somebody: the mend fills a cell; the cell's light takes the spring; the door hands the spring, and the cell's own wire, to West; a breaker hands part of that wire back to the dark; a bulb blows East's box and hands the wash house to West. The plan made before a fix is wrong after it.
- **The reasoning move:** after every layer ask again who carries what, and what the next move will put on them. The last click is a red, on purpose, and it is safe only because of the click before it.
- **Builds on, each on the win:** 16 (a fuse blown on purpose: the box is the breaker a wire lacks), 17 (a relay, set only under current, that keeps its place), 18 (the spring), 19 (the cell), 24 (a cell holds a spring until a feed takes it). Also 12 (two feeds; the nearer feed carries), 23 (one red, two boxes: which one it names is the read), 10 (a bulb is a load event), 21 (a cell filled from one side and spent for the other).
- **Carries from N4's hand-on list:** a spring held by a battery; a cell that must be filled by an action; the lantern (the cell's light shows the hidden break and then the lime kiln behind it).
- **Not in it:** a timed breaker (20, 21's clocks), a moved meeting (22), sisters under a mother (23's shape). See **Changed from the plan's row**.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:5:10`, `block:6:11`, `block:7:11`**, west to east along the city's south edge. 215 m wide, 80 m deep.
- **West** stands on `block:2:10`'s pole `pole:z:5:lo:507.50`, across `z:5` from `5:10`'s south-west corner. **East** stands on `block:8:10`'s pole `pole:z:8:hi:507.50`, across `z:8` from `7:11`'s south-east corner. One entering span each.
- **West 19, East 1.** `fb_w` (West's box) rated **19**; `fb_a` (East's box, on its tie) rated **2**. Own numbers 5, 1, 5 and 2, raised once by `npm run fit -- --raise` for the 17 scenery buildings.
- **The cell**: capacity 14 s, **empty at the start**. Its input is East's wire, which is broken.
- Target: `wash_house` (on `block:6:11`'s south-east corner). Priority: `homes`. Parts: **2 wires, bulb, fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed, 19 | pole `pole:z:5:lo:507.50` (end, block:2:10, +x side) | 169.25, 507.50 |
| `east` | feed, 1 | pole `pole:z:8:hi:507.50` (crossing, block:8:10, -x side) | 420.75, 507.50 |
| `fb_w` | fuse box, West's | pole `pole:z:5:hi:507.50` (crossing, block:5:10, -x side) | 185.75, 507.50 |
| `br_w` | breaker, open at the start (the door) | pole `pole:x:14:lo:192.50` (end, block:5:10, +z side) | 192.50, 514.25 |
| `j_h` | junction | pole `pole:x:14:lo:217.50` (slot, block:5:10, +z side) | 217.50, 514.25 |
| `homes` | lamp, load 2, priority | building `block:5:10/b\|outer\|+z\|42,101`, by its drop from `pole:x:14:lo:217.50` | 217.50, 510.00 |
| `j_m` | junction | pole `pole:z:6:hi:507.50` (end, block:6:11, -x side) | 265.75, 507.50 |
| `sp` | spring switch, position 0 `l_smoke`, 1 `l_road`; set 0 | pole `pole:x:14:lo:294.17` (slot, block:6:11, +z side) | 294.17, 514.25 |
| `smokehouse` | lamp, load 8 | building `block:6:11/b\|outer\|+z\|58,101`, by its drop from `pole:x:14:lo:294.17` | 292.50, 510.00 |
| `r_2` | relay, position 0 `l_lime`, 1 `l_wash`; set 0 | pole `pole:x:14:lo:315.83` (slot, block:6:11, +z side) | 315.83, 514.25 |
| `lime_kiln` | lamp, load 7 | building `block:6:11/b\|outer\|+z\|61,101`, by its drop from `pole:x:14:lo:315.83` | 317.50, 510.00 |
| `br_c` | breaker, closed at the start | pole `pole:x:14:lo:326.67` (slot, block:6:11, +z side) | 326.67, 514.25 |
| `j_t` | junction | pole `pole:x:14:lo:337.50` (end, block:6:11, +z side) | 337.50, 514.25 |
| `wash_house` | lamp, load 3, **target**, dead lamp | building `block:6:11/b\|outer\|+z\|64,101`, by its drop from `pole:x:14:lo:337.50` | 337.50, 510.00 |
| `j_e` | junction | pole `pole:z:8:lo:507.50` (end, block:7:11, +x side) | 409.25, 507.50 |
| `fb_a` | fuse box, East's, on the tie | pole `pole:x:14:lo:402.50` (end, block:7:11, +z side) | 402.50, 514.25 |
| `cell` | battery, 14 s, empty; input `l_in` | pole `pole:z:8:lo:484.17` (slot, block:7:11, +x side) | 409.25, 484.17 |
| `br_n` | breaker, closed at the start | pole `pole:z:7:hi:472.50` (crossing, block:7:11, -x side) | 360.75, 472.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `fb_w` | 1 span: 1 cross (over `z:5`) | 16.50 |
| `l_w1` | `fb_w` → `br_w` | 1 span: 1 corner | 9.55 |
| `l_w2` | `br_w` → `j_h` | 2 spans: 2 along (along `x:14`) | 25.00 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_w3` | `j_h` → `j_m` | 4 spans: 2 along, 1 corner, 1 cross (along `x:14`, over `z:6`) | 51.05 |
| `l_sp` | `j_m` → `sp` | 3 spans: 1 corner, 2 along (along `x:14`) | 31.21 |
| `l_smoke` | `sp` → `smokehouse` | drop | — |
| `l_road` | `sp` → `r_2` | 2 spans: 2 along (along `x:14`) | 21.67 |
| `l_lime` | `r_2` → `lime_kiln` | drop | — |
| `l_wash` | `r_2` → `br_c` | 1 span: 1 along (along `x:14`) | 10.83 |
| `l_wash2` | `br_c` → `j_t` | 1 span: 1 along (along `x:14`) | 10.83 |
| `l_t` | `j_t` → `wash_house` | drop | — |
| `l_e0` | `east` → `j_e` | 1 span: 1 cross (over `z:8`) | 11.50 |
| `l_tie0` | `j_e` → `fb_a` | 1 span: 1 corner | 9.55 |
| `l_tie` | `fb_a` → `j_t` | 6 spans: 3 along, 2 corner, 1 cross (along `x:14`, over `z:7`) | 70.59 |
| `l_in` | `j_e` → `cell` | 2 spans: 2 along (along `z:8`) | 23.33 |
| `l_c1` | `cell` → `br_n` | 6 spans: 4 along, 2 corner (along `z:8`, along `x:13`) | 65.76 |
| `l_c2` | `br_n` → `j_m` | 12 spans: 1 cross, 2 corner, 9 along (over `z:7`, along `x:13`, along `z:6`) | 135.59 |

Faults (3): `f_in`, a break on the first span of `l_in`, between East's corner and the cell, sparking at the start; `f_wash`, the wash house's dead bulb, flickering at the start (East's light reaches it); `f_road`, a break on the first span of `l_road`, just past the spring, dark at the start behind the spring's second position.

**The picture.** The south street runs the whole width of the map, and everything that is clicked but one breaker is on it.

- **At the west end, West:** its **fuse box**, the **door** `br_w` (open), the tribe's **homes**, and over `z:6` to `6:11`'s south-west corner (`j_m`).
- **Along `6:11`'s south street, from that corner:** **the spring**, resting on the **smokehouse**; a break; **the relay**, resting on the **lime kiln**; a breaker `br_c` (closed); and at the south-east corner the **wash house**.
- **At the east end, East:** from its corner (`j_e`) one wire runs west along `7:11`'s empty south street, through **East's box** `fb_a`, over `z:7`, into the wash house's pole. That is the tie. It has no breaker. East is three wires from the wash house and West is eight, so the wash house's socket is East's.
- **From East's corner the other wire** runs north: a break, then **the cell**. From the cell a wire runs on north, west along `7:11`'s north street, through a breaker `br_n` (closed) at its north-west corner, over `z:7`, west along the whole of `6:11`'s north street, down its west street, and into `j_m`. 200 m and thirteen houses: the long way round from the cell to the spring.

**The street crossings between blocks:** `5:10` to `6:11` over `z:6` (`l_w3`, West's road); `6:11` to `7:11` over `z:7` twice: at the south (`l_tie`, East's tie) and at the north (`l_c2`, the cell's wire).

**No breaker, spring, relay, battery or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_w` | `pole:z:5:hi:507.50`, `5:10`'s crossing pole | 2 spans, both its own (`l_w0`, the crossing of `z:5` in; `l_w1`, the corner span out); no drop |
| `br_w` | `pole:x:14:lo:192.50` | 2 spans, both its own (`l_w1` in, `l_w2` out to `x:14:lo:205.00`); no drop |
| `sp` | `pole:x:14:lo:294.17` | its own three wires and nothing else: along from the west (`l_sp`), the smokehouse's drop (`l_smoke`, position 0), along east (`l_road`, position 1) |
| `r_2` | `pole:x:14:lo:315.83` | its own three wires and nothing else: along from the west (`l_road`), the lime kiln's drop (`l_lime`, position 0), along east (`l_wash`, position 1) |
| `br_c` | `pole:x:14:lo:326.67` | 2 spans, both its own (`l_wash` in, `l_wash2` out to `x:14:lo:337.50`); no drop |
| `fb_a` | `pole:x:14:lo:402.50` | 2 spans, both its own (`l_tie0`, the corner span in; `l_tie` out to `x:14:lo:390.83`); no drop |
| `cell` | `pole:z:8:lo:484.17` | 2 spans: its input (`l_in`, in from `z:8:lo:495.83`) and its one far-side line (`l_c1`, out to `z:8:lo:472.50`); no drop |
| `br_n` | `pole:z:7:hi:472.50`, `7:11`'s crossing pole | 2 spans, both its own (`l_c1`, the corner span in; `l_c2`, the crossing of `z:7` out); no drop |

Each switch has one out straight into a building's drop ("Allow it (Recommended)").

Scenery (section S), 17 buildings: 3 on West's road past the door (two on `l_w3`, one on `l_w2`); 1 at `j_m`; **13 on the cell's wire**: 3 between the cell and `br_n` (two of `block:8:10`'s across `z:8`, one of `block:7:9`'s across `x:13`), and 10 between `br_n` and `j_m` (six on `6:11`'s north street, one at its north-east corner, three on its west street). None on East's tie.

## The windows, and what is done in each

Two clocks, both the cell's.

| When | What lights what | What only this time allows |
| --- | --- | --- |
| **Before the mend** | East reaches the wash house's socket by the tie, and the break. West reaches nothing | The mend. (The bulb can be fitted now; see the traps) |
| **The fill: 14 s from the mend** | East fills the cell | Nothing can hurry it. Released early, the cell holds for as long as it filled |
| **The cell's 14 s, from the release** | The cell lights its own wire all the way round, `j_m`, the homes' wire back to the door, the spring and what the spring points at. None of it is a load | **Throw the spring. Mend the road. Throw `r_2`. Close the door.** The spring and the relay are live only now; the door is safe only when they are set and still held |
| **After the hand-over** | West holds everything the cell lit | **Open `br_n`, then fit the bulb.** Neither is safe before it |

At a click every three seconds the release must wait until the cell holds 12.5 s or more: the door closes 12 s after the release.

## The intended read from the default camera

The camera opens on the strip. **The wash house is right of centre, on `6:11`'s south-east corner, its socket flickering.** West's pole is off the left edge; East's off the right.

1. **Nothing is lit but a socket.** East's light reaches the wash house along the bottom-right street and the socket is dead. Its bulb reads **+3, red, naming East's box**: 3 on a box rated 2. In hand: two wires, a bulb, a fuse. At the far right, one pole north of East's corner, a **spark**, and beyond it a cell, empty.
2. On the left, West: a box, an open breaker. **`br_w` reads +27, red, naming West's box.** Follow its road: past the homes, over the street, the first thing on it is a **spring**, resting on the **smokehouse**.
3. The wash house can be lit by neither. East's box cannot hold it, and East's tie has no breaker to take East off it. West's road to it starts at a spring that West cannot throw.
4. The cell can throw it: its wire runs out of the top of `7:11`, all along the top of `6:11`, down the left side, and into the corner in front of the spring. But the cell is empty. **Mend the spark.** It begins to fill. Wait.
5. **Release the cell** when it is full. The whole north side lights on it, thirteen houses, the tribe's homes, and the smokehouse. **Throw the spring.** The smokehouse goes dark, and one pole on a **spark** shows. `br_w` reads **+19, white**.
6. **Mend it.** The **lime kiln** burns on the cell, on the next pole. `br_w` is **red again, +26**. **Throw `r_2`.** The lime kiln goes dark. `br_w`: **+19, white**.
7. **Close `br_w`**, while the cell still holds. West comes round to a spring already thrown. It now carries everything the cell lit: the homes, the north side, the corner. **West's box 19 of 19.** The cell goes out.
8. The wash house's socket is still East's, and its bulb now reads **+3, red, naming both boxes**. East's box will blow, as it must: that is the only way East lets go. But then the wash house falls to West, and West is full.
9. West does not need the cell's wire any more. **Open `br_n`** (−3): the three houses at the far end of it go dark. West 16 of 19. The bulb reads **red, naming East's box alone**.
10. **Fit the bulb**, on its red. East's box blows; its tie goes dead; the wash house is West's, and burns. West's box 19 of 19. **Win.**

**Hidden at the start (1 fact):** the break past the spring, shown by the cell's light when the spring is thrown. Besides it, the lime kiln at the relay's rest is dark until that break is mended, and is first seen burning on the cell.

## The trap

**Everything is set, West holds the spring, and the socket has flickered since the first frame: fit the bulb now, and the wash house falls from East's blown box onto a West still carrying the cell's wire. West's box blows too.**

The bulb's number says so: **+3, red, naming `fb_a` and `fb_w`**. A player who has learned (16, 23) that a red can be taken reads half of it. Fitted, East's box blows, the wash house lands on West at 22 on 19, and West's box goes with it: a bolt down the whole south street, and everything dark.

**It is recovered by a part and a switch:** open `br_c` (the wash house off West's road), fit the spare fuse while the cell still holds the spring (or after a refill and a second release), open `br_n`, close `br_c`.

Four more, each readable, each recoverable:

- **The bulb first** (the obvious first click: the one thing on the map that is lit is a socket asking for it). Red, naming East's box. East's box blows and the tie is dead. Nothing is lost yet, but the plan has changed: the wash house, bulb in, will now arrive on West with the hand-over, 22 on 19, and the door will read red when everything else is right. Recovered by a switch: open `br_c` before the hand-over, and close it after `br_n` is open. **Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"): the spare fuse in East's box puts East back on a lit wash house; it blows on the prompt's warning. One Undo returns it.
- **The door first.** +27, red: the smokehouse. West's box blows. Recovered by the spare fuse, fitted in place of closing the door, when the cell is holding the spring.
- **West let in as soon as the spring is set** (24's trap, kept): the door reads white, and the mend that follows puts the lime kiln on West. Recovered by the spare fuse, with `r_2` thrown under the cell.
- **`br_n` opened before the hand-over.** It is the cell's own wire: the light goes out west of it and the spring falls. Recovered by closing it and throwing the spring again, if the cell has the seconds; otherwise by a wait.

## Why each block

| Block | Why the solve needs it |
| --- | --- |
| `block:5:10` | **West's box and the door.** The hand-over is made here, and West's bar (19 of 19) is read here: it is why the last bulb is red twice |
| `block:6:11` | **The spring, the relay, the hidden break, the wash house.** Four of the eight clicks. The cell's wire runs three sides of it |
| `block:7:11` | **East: the spark, the cell, the tie and its box, and `br_n`.** The first click and the release are here, and the breaker that makes the last click safe |

## Layers

| # | Layer | The read | The move or moves | Begins on | Finished, or undone, on | Hands to the next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Neither feed can** | The bulb red on East's box; the door red on West's; no breaker on the tie; a spring West can't throw | none | `6:11` (the socket) | `7:11` and `5:10` (the two boxes) | "The cell" |
| 2 | **Fill the cell** | The spark beside it; empty | mend; wait | `7:11` | `6:11` (where it is spent) | 14 s of light |
| 3 | **The long way round** | The cell's wire: `7:11`'s north, `6:11`'s north and west, the corner | release; throw the spring | `7:11` | `6:11` | A lit road, and a clock |
| 4 | **The lantern** | A break past the spring; mended, the lime kiln on the relay | mend; throw `r_2` | `6:11` | `5:10` (the door reads white) | A road West's box can carry |
| 5 | **The hand-over** | The cell's seconds; the door white | close `br_w` before the cell is flat | `7:11` (the cell's seconds) | `5:10` (the door), `6:11` (the spring) | West holding the spring, and the cell's wire |
| 6 | **Let go of the wire** | West 19 of 19; the bulb red on both boxes; the cell is done | open `br_n` | `5:10` (West's bar) | `7:11` (`br_n`) | Room for the wash house |
| 7 | **The red that is left** | The bulb red on East's box alone; the tie has no breaker | fit the bulb: East's box blows | `7:11` (East's box) | `6:11` (the wash house), `5:10` (West's bar, 19 of 19) | The win |

By the ticket's definition a read with no move is a hidden fact, not a layer, so row 1 (which has no move) is not counted. Six layers with a move (2 to 7); all six cross blocks, and every block is on four or more. Layer 5 is undone on `7:11` by time; layer 6 is undone if made early (the spring falls); layer 7 made before layer 6 undoes layer 5 (West's box blows).

## What it builds on, and its depth of read

- **24, and then what 24 left out.** The hand-over is 24's. But there the cell's wire was a few houses long and nobody counted it. Here it is the long way round, and the feed that takes the spring takes the wire with it.
- **16 and 23, on the last click.** The red is taken on purpose, and whether that is right depends on which boxes it names. It names two until `br_n` is open.
- **19 and 21:** the cell has to be filled first, from the feed that will not use it, and the fill is fourteen seconds nothing can hurry.
- **17:** the relay keeps its place, so a cell run flat costs a wait and not the mend.
- **12:** the wash house's socket is East's because East is nearer. Nobody chooses that, and nothing but East's box can change it.
- **Depth of read: 15.** Before the first move that can't be taken back (the mend) the player must hold: (1) the wash house's socket is East's, by nearness, and East's box cannot hold it; (2) East's tie has no breaker, so East's box is the only thing that takes East off it; (3) West's road to it begins at a spring resting on the smokehouse, which West's box cannot carry; (4) a spring is thrown only live, and falls back in the dark; (5) the cell could throw it, and is empty behind a break; (6) the cell's wire reaches the spring the long way round; (7) its light wins nothing and lasts 14 s, so West must take the spring while the cell holds it; (8) what is past the spring is dark, and must be found and set by the cell's light before the door closes; (9) so the door comes after everything on the road; (10) West, taking the spring, takes the cell's wire and its thirteen houses, and is then full; (11) so the wash house has no room on West until some of that wire is let go; (12) the wire cannot be let go before the hand-over: it is the cell's; (13) East's box blows on the wash house's bulb, and only then is the wash house West's; (14) if it blows before West has room, West's box goes too; (15) so the bulb is the last click, after the breaker. Puzzle 24 asks for 12.

## The numbers (section V) and the cell's cue

- **The door `br_w`:** **+27 red** at the start (blows `fb_w`); **+19 white** with the spring thrown; **+26 red** with the road mended; **+19 white** with `r_2` thrown.
- **The wash house's bulb is the second dial, and it names boxes:** **+3 red, `fb_a`** from the first frame to the hand-over; **+3 red, `fb_a` and `fb_w`** once West holds the spring; **+3 red, `fb_a`** again once `br_n` is open. That third reading is the one to take.
- `br_n`: +0 until West holds the cell's wire; then **−3**. Under the cell's light every other number is +0.
- **BC's battery cue:** the cell's seconds as it fills and as it drains; on hover, the wires its release would light: the whole of the long way round.
- The carrier is read from the red's name, the two boxes' bars and the lit wires: when the door closes, the pulses on the cell's wire turn round and run from West.

## The tribe's homes

`homes` (priority, load 2) is on `5:10`'s south street, just inside West's door. It is dark at the start. It glows on the cell when the cell is released, and **it is lit at the win**, on West. The win costs the tribe nothing: their homes are behind the same door as the priests' wash house.

## Changed from the plan's row

- **Kept:** two feeds, a cell, a relay, a spring, a hidden break, a dead bulb, two fuse boxes; "each fix changes who carries what; re-plan after every layer"; the empty cell behind a spark.
- **Changed:** the two boxes are not nested: each feed has one. The row's plain switch is not used; two breakers are (`br_n`, on the cell's wire, and `br_c`, which the intended road never touches and two of the recoveries need). The row's trap ("mending the spark between the feed and the empty cell hands a building to the wrong feed") became the hand-over: closing the door hands the cell's wire to West, and the bulb then hands the wash house to a feed with no room. Six layers with a move, as the row asked, after a first read that has none. The kit has a second wire.
- **Dropped, for Josh (N5, fixed point 5):** a timed breaker in the capstone (the analyzer's time on a clock-and-battery map with eight controls was not tried); a moved meeting (22); sisters under a mother (23's shape: this district has no pole where a mother's wire splits into two branches that each begin at a bare pole).
- **Size:** 3 / 2 wires, bulb, fuse / battery, 1 spring, 1 relay, 3 breakers, 2 fuse boxes, 2 feeds; 3 blocks.

## Limits passed

None. 8 clicks, 1 hidden fact, 3 faults, 4 own buildings (smokehouse, lime kiln, wash house, homes), 3 blocks. The district is 215 m wide, the widest in the series: the opening frame is the thing to check.

## Series rules

- **Reuse is free.** A fuse is blown on purpose on the shortest win (`fb_a`); a blow is the trap; "fit it and it blows again" is a designed trap on `fb_a`, named above and readable before the fit.
- **Wins at `--click-seconds 3` in the same fewest clicks:** yes, 8 (below).
- **Kit: 2 wires, bulb, fuse.** Puzzle 24's is wire, fuse.
- **Heavy building: the smokehouse** (load 8), with the lime kiln (7). Puzzle 24's is the brickworks.
- **Shrine count: 3 of 5** at the end of the series. No shrine here.
- District `block:5:10`, `block:6:11`, `block:7:11`. `block:5:10` has not been used by the series. `block:6:11` was puzzle 7's district; `block:6:11` + `block:7:11` + `block:8:10` was puzzle 16's (this set is not that one: `8:10` holds only East's pole). It shares no block with puzzle 24.
- **Districts used by 1 to 25:** the 24 listed in `s24-hold-the-spring.md`, and `block:5:10` + `block:6:11` + `block:7:11`. Blocks no series puzzle has used: `block:8:5`, `block:0:7`, `block:5:7`, `block:8:8`.

## Expected numbers

`npm run analyze puzzles/city/s25-the-whole-chain.city.json`, at 1 s a click (the default) and at `--click-seconds 3`; `--wait` and `--cap` unchanged:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 11,342, exhaustive | 10,062, exhaustive |
| Time on Josh's PC | 1 min 11 s | 59 s |
| Solvable | yes | yes |
| Fewest clicks | **8** | **8** |
| Waits on the shortest win | 7 (3.5 s) | 19 (9.5 s) |
| One shortest win | `repair:l_in`, wait 3.5 s, `cell`, `sp`, `repair:l_road`, `r_2`, `br_w`, `br_n`, `repair:wash_house` | the same, with a wait of 9.5 s |
| Winning click orders | **1** | **1** |
| Winning configurations | **1** (the spring and `r_2` thrown, `br_w` and `br_c` closed, `br_n` open, both wires and the bulb in, `fb_a` blown) | **1** |
| Parts used | wire, wire, bulb (3 of 4; the fuse is the spare) | the same |
| Feeds at the shortest win | West 19 of 19, East 0 of 1 | the same |
| Fuses that blow on a shortest win | **`fb_a`** (on purpose) | **`fb_a`** |
| Fuses that blow on some move | `fb_a`, `fb_w` | `fb_a`, `fb_w` |
| First moves | `br_w`, `br_c`, `br_n`, `repair:l_in`, `repair:wash_house` | the same |
| Dead-end states | 3,232 of 11,342 (28.5%) | 2,848 of 10,062 (28.3%) |
| First moves that lead only to dead ends | none | none |
| Hidden at the start | 1: the break past the spring | |

At 3 s a click: the mend at 0 s, the release at 12.5 s, the spring at 15.5 s, the road at 18.5 s, the relay at 21.5 s, the door at 24.5 s with half a second on the cell, the breaker at 27.5 s, the bulb at 30.5 s. One winning order at either pace.

**No win without each of the five.** The cell: nothing else can light the spring without the smokehouse. The spring held and handed over: every win closes the door (or fits West's fuse) while the cell holds it. The relay: it is live only past the mend, and safe only on the cell. The blow: East is nearer to the wash house, its box cannot hold it, and its tie has no breaker; the one winning configuration has `fb_a` blown, and every shortest win blows it.

Loads, replayed on the conversion: West 0 until the door; the door 19 of 19; `br_n` 16; the bulb 19 of 19, win. East carries nothing at any time. The traps: 27 on West's 19 (the door first); 26 on 19 (the mend under West); 22 on 19 (the bulb before `br_n`); 3 on East's 2 (the blow that is meant).

**The obvious wrong first move** is the bulb: read by its red and the box it names; East's box blows, and the recovery is a switch (`br_c`, opened for the hand-over). **Undo does not recover a spent cell** (time is not undoable); a wait of fourteen seconds does. The dead-end states are those with both fuses spent and a box still to mend. The check block replays the door first, the bulb before `br_n`, the bulb first, the spare fuse in East's box, the door before the mend, and `br_n` before the hand-over.

**Where it stands against 24:** it reads deeper (15 facts against 12), takes more clicks (8 against 6), has fewer winning click orders (1 against 5), and has more layers (6 against 5). Its share of dead-end states is a little lower (28.5% against 30.5%): two of its five traps are recovered by a switch alone, by design; it is long, and a long puzzle that could only be undone would be a chore. It is the only puzzle of the 25 whose last click is a red.

Time on the intended road: about 30 s, 14 of them the fill.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:l_in", "wait:13", "cell", "sp", "repair:l_road", "r_2", "br_w", "br_n", "repair:wash_house"],
  "traps": [
    { "name": "the door first, on its red",
      "moves": ["br_w"],
      "expect": { "blown": ["fb_w"], "readable": ["blown-fb_w"], "complete": false },
      "recover": ["repair:l_in", "wait:13", "cell", "sp", "repair:l_road", "r_2", "repair:fb_w", "br_n", "repair:wash_house"] },
    { "name": "the wash house's bulb before West has let go of the cell's wire",
      "moves": ["repair:l_in", "wait:13", "cell", "sp", "repair:l_road", "r_2", "br_w", "repair:wash_house"],
      "expect": { "blown": ["fb_a", "fb_w"], "complete": false },
      "recover": ["br_c", "repair:fb_w", "br_n", "br_c"] },
    { "name": "the wash house's bulb first: East's box blows, and West must take the wash house later",
      "moves": ["repair:wash_house"],
      "expect": { "blown": ["fb_a"], "readable": ["blown-fb_a", "f_in"], "complete": false },
      "recover": ["repair:l_in", "wait:13", "br_c", "cell", "sp", "repair:l_road", "r_2", "br_w", "br_n", "br_c"] },
    { "name": "the spare fuse in East's box: fit it and it blows again",
      "moves": ["repair:wash_house", "repair:fb_a"],
      "expect": { "blown": ["fb_a"], "readable": ["blown-fb_a"], "complete": false },
      "recover": ["undo", "repair:l_in", "wait:12", "br_c", "cell", "sp", "repair:l_road", "r_2", "br_w", "br_n", "br_c"] },
    { "name": "West let in as soon as the spring is set, and then the mend",
      "moves": ["repair:l_in", "wait:13", "cell", "sp", "br_w", "repair:l_road"],
      "expect": { "blown": ["fb_w"], "readable": ["blown-fb_w"], "lit": ["lime_kiln"], "complete": false },
      "recover": ["r_2", "repair:fb_w", "br_n", "repair:wash_house"] },
    { "name": "the cell's wire let go before West has the spring",
      "moves": ["repair:l_in", "wait:13", "cell", "sp", "repair:l_road", "r_2", "br_n"],
      "expect": { "complete": false },
      "recover": ["br_n", "sp", "br_w", "br_n", "repair:wash_house"] }
  ]
}
```

## To check in the pane (the main session)

- **The opening frame.** The district is 215 m by 80 m, wider and flatter than any before. Check that the frame holds both ends (West's box at the left, East's corner and the cell at the right) and that the icons along the south street still read at that distance.
- **Six controls on one street within 150 m:** the door, the spring, the relay, `br_c`, and at the east end East's box. The spring, the relay and `br_c` are 11 to 22 m apart: each must read as its own, with its building on its pole.
- The cell (right edge, one pole north of the spark) shows empty, then its seconds as it fills.
- Released, the cell's light is seen to go the long way: up, along the whole top, down the left side, and along the bottom to the spring.
- `br_n`, alone at the top of the street between `6:11` and `7:11`, reads as a breaker on the cell's wire.
- The last bulb: that both boxes are named on its red after the hand-over, and one after `br_n`.

## To watch when Josh plays it

- **Only in the HUD:** nothing the solve needs. West's 19 is its box's 19, and the box's bar is on the city. East's "0 of 1" says nothing; if it reads as a fault, East wants a different fiction (as in 24).
- Whether the last red is read. The whole end of the puzzle is the difference between "names two boxes" and "names one". If the names are hard to see, the last click is a coin toss with the spare fuse as the stake.
- Whether he sees, at the hand-over, that West has taken the cell's wire: the bar jumps from 0 to 19 of 19 and thirteen houses change hands.
- Whether `br_n` is found. It is the one control not on the south street, and nothing points at it but the wire it is on.
- Whether the fourteen seconds of fill feel like a wait or like time to read. If a wait, the cell could start half full.
- Whether East's box, rated 2 with nothing under it, reads as a box or as a trick.
- Whether the chain reads as one puzzle. Six layers after the first read; does each fix visibly make the next problem, or does it feel like 24 with two more steps bolted on?
- Whether a series that ends on a deliberate blow, with the tribe's homes lit, is the ending wanted.

## What it taught us
