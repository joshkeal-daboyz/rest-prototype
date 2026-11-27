# 21 · Between two clocks — design note (series v1, puzzle 21)

A new puzzle designed on the city (ticket 081 section N5; `puzzles/series-v1.md`, row 21). It has no schematic and no `from`. It is the first of the last batch: four blocks, and layers of solving that cross them.

Josh, 26 Nov 2026: "Puzzles 21 through 25. Should not only span multiple districts but should also include multiple layers of puzzle solving that span multiple districts." How a timer puzzle's two windows are forced, on a card: "Fuse + battery twist (Recommended)": the battery twist is this puzzle's.

- **New concept: the battery twist.** The cell fills only while one clock feeds its input, and its light is useful only while the other clock holds a door shut. Fill it in this window, spend it in that one.
- **The reasoning move:** the fuse is red, and stays red until two relays are set and a door is open. Only the cell can set the relays, and its light reaches the far one only through the near one and through the door. So: fill on A, spend on B, far one first, and fit the fuse when the door has opened again.
- **Builds on:** 8 and 16 (a rated box; red names it), 10 (a dead bulb), 17 (a relay moves only under current and keeps its place), 19 (a cell's light sets what the feed can't reach safely; it trips no fuse; time is not undoable), 20 (two clocks; set, in one window, what the other window's current will meet).
- **Carries from N4's hand-on list:** the battery twist; two things set in one battery window, in order; relay order with a second relay; and the lantern, as a small layer (the cell's light shows the weigh house's dead socket).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:7:0`, `block:8:0`, `block:7:1`, `block:8:1`**, a square of four: 120 m wide, 145 m deep. `7:0` and `8:0` are the north pair, touching across `z:8`; `7:1` and `8:1` the south pair; north and south touch across `x:1`.
- The feed stands on `block:6:0`'s pole `pole:z:7:lo:27.50`, across `z:7` from the district's north-west corner. One entering span; its wire then runs `block:7:0`'s north street to the meeting of the four blocks' north ends (`j_0`).
- **A's clock** `tb_a`: closed 8 s, open 8 s, offset 0. **B's clock** `tb_b`: closed 8 s, open 8 s, offset 8. Exactly one is closed at any time. The view opens on A's window, and the clock starts at the first move.
- **The cell**: capacity 8 s, empty at the start.
- Capacity **18**; `fb` rated **13**. Own numbers 3 and 3, raised once by `npm run fit -- --raise` (the timed raise, TB2) for the 29 scenery buildings.
- Target: `weigh_house` (on `block:8:1`). Priority: `homes`. Parts: **wire, bulb, 2 fuses**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:7:lo:27.50` (end, block:6:0, +x side) | 344.25, 27.50 |
| `j_0` | junction | pole `pole:z:8:lo:27.50` (end, block:7:0, +x side) | 409.25, 27.50 |
| `fb` | fuse box, **blown at the start** | pole `pole:z:8:lo:39.17` (slot, block:7:0, +x side) | 409.25, 39.17 |
| `j_far` | junction | pole `pole:z:8:lo:92.50` (end, block:7:1, +x side) | 409.25, 92.50 |
| `r_a` | relay, position 0 `l_saw`, 1 `l_ab`; set 0 | pole `pole:z:8:hi:92.50` (crossing, block:8:1, -x side) | 420.75, 92.50 |
| `sawmill` | lamp, load 12 | building `block:8:1/a\|outer\|-x\|85,19`, by its drop from `pole:z:8:hi:92.50` | 425.00, 97.50 |
| `j_n` | junction | pole `pole:x:1:hi:482.50` (end, block:8:1, -z side) | 482.50, 85.75 |
| `r_n` | relay, position 0 `l_k`, 1 `l_t`; set 0 | pole `pole:z:9:lo:105.00` (slot, block:8:1, +x side) | 489.25, 105.00 |
| `weigh_house` | lamp, load 3, **target**, dead lamp | building `block:8:1/a\|outer\|+x\|96,20`, by its drop from `pole:z:9:lo:105.00` | 485.00, 102.50 |
| `j_k` | junction | pole `pole:z:9:lo:142.50` (slot, block:8:1, +x side) | 489.25, 142.50 |
| `homes` | lamp, load 2, priority | building `block:8:1/b\|outer\|+x\|96,25`, by its drop from `pole:z:9:lo:142.50` | 485.00, 142.50 |
| `j_s` | junction | pole `pole:z:8:lo:167.50` (end, block:7:1, +x side) | 409.25, 167.50 |
| `j_kiln` | junction | pole `pole:z:8:lo:117.50` (slot, block:7:1, +x side) | 409.25, 117.50 |
| `kiln` | lamp, load 6 | building `block:7:1/b\|outer\|+x\|80,22`, by its drop from `pole:z:8:lo:117.50` | 405.00, 117.50 |
| `tb_b` | timed breaker, open at the start | pole `pole:z:8:lo:105.50` (slot, block:7:1, +x side) | 409.25, 105.50 |
| `tb_a` | timed breaker, closed at the start | pole `pole:x:0:hi:427.50` (end, block:8:0, -z side) | 427.50, 20.75 |
| `cell` | battery, 8 s, empty; input `l_in` | pole `pole:z:9:lo:27.50` (end, block:8:0, +x side) | 489.25, 27.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 6 spans: 1 cross, 2 corner, 3 along (over `z:7`, along `x:0`) | 70.59 |
| `l_t0` | `j_0` → `fb` | 1 span: 1 along (along `z:8`) | 11.67 |
| `l_t1` | `fb` → `j_far` | 5 spans: 2 along, 2 corner, 1 cross (along `z:8`, over `x:1`) | 58.93 |
| `l_ra` | `j_far` → `r_a` | 1 span: 1 cross (over `z:8`) | 11.50 |
| `l_saw` | `r_a` → `sawmill` | drop | — |
| `l_ab` | `r_a` → `j_n` | 6 spans: 1 corner, 5 along (along `x:1`) | 64.55 |
| `l_n` | `j_n` → `r_n` | 2 spans: 1 corner, 1 along (along `z:9`) | 22.05 |
| `l_t` | `r_n` → `weigh_house` | drop | — |
| `l_k` | `r_n` → `j_k` | 3 spans: 3 along (along `z:9`) | 37.50 |
| `l_homes` | `j_k` → `homes` | drop | — |
| `l_back1` | `j_k` → `j_s` | 10 spans: 7 along, 2 corner, 1 cross (along `z:9`, along `x:5`, over `z:8`) | 110.59 |
| `l_bk2` | `j_s` → `j_kiln` | 4 spans: 4 along (along `z:8`) | 50.00 |
| `l_kiln` | `j_kiln` → `kiln` | drop | — |
| `l_bk1` | `j_kiln` → `tb_b` | 1 span: 1 along (along `z:8`) | 12.00 |
| `l_bk0` | `tb_b` → `j_far` | 1 span: 1 along (along `z:8`) | 13.00 |
| `l_a0` | `j_0` → `tb_a` | 2 spans: 1 cross, 1 corner (over `z:8`) | 21.05 |
| `l_in` | `tb_a` → `cell` | 6 spans: 5 along, 1 corner (along `x:0`) | 64.55 |
| `l_c` | `cell` → `j_n` | 5 spans: 3 along, 1 corner, 1 cross (along `z:9`, over `x:1`) | 61.05 |

Faults (3): `f_blown`, the blown fuse in `fb`, readable at the start; `f_in`, a break on the last span of `l_in`, at the cell's corner, sparking at the start (A's window); `f_bulb`, the weigh house's dead bulb, dark at the start behind `r_n`'s second position.

**The picture.** The feed's wire comes in along the north street to `j_0`, where the north pair of blocks meet. From there two wires leave.

- **The trunk** goes south down the middle street (`z:8`): the **fuse box**, blown; over `x:1`; and to `j_far` at the head of the south pair. One span east of `j_far`, across the street, is **the relay `r_a`** with the **sawmill** on its pole (where it rests). Thrown, `r_a` sends the trunk east along `block:8:1`'s north street to `j_n` at the far corner, and one pole south of that is **the relay `r_n`** with the **weigh house** on its pole (its second position).
- **A's wire** crosses to `block:8:0`: **A's clock** at its north-west corner, the north street with its spark, and **the cell** at the north-east corner. The cell's own wire runs south down the east street and over `x:1` to `j_n`.
- **The back road.** At rest `r_n` sends whatever reaches it on south: the tribe's homes, round `block:8:1`'s south-east corner, west along the south street, over `z:8`, and north up `block:7:1`'s east street past **the kiln** to **B's clock**, one pole short of `j_far`. It is the long way from `r_n` back to `r_a`'s input, and B's clock is its door.

A switch passes current from its input to the one output it points at, and never back in through an output. So the cell's light, arriving at `j_n`, can reach `r_a` only by going through `r_n` at rest and all the way round the back road, and only while B's clock is closed.

**The street crossings between blocks:** `7:0` to `8:0` over `z:8` at the north end (`l_a0`); `7:0` to `7:1` over `x:1` (`l_t1`); `7:1` to `8:1` over `z:8` twice, at the north end (`l_ra`, one span) and the south end (`l_back1`); `8:0` to `8:1` over `x:1` at the east end (`l_c`).

**No breaker, relay, battery or fuse box on a branch pole** (a timed breaker counts as a breaker). Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb` | `pole:z:8:lo:39.17` | 2 spans, both its own (`l_t0` in from `z:8:lo:27.50`, `l_t1` out to `z:8:lo:50.83`); no drop |
| `r_a` | `pole:z:8:hi:92.50`, `block:8:1`'s crossing pole | its own three wires and nothing else: the crossing of `z:8` in (`l_ra`), the sawmill's drop (`l_saw`, position 0), the corner span out (`l_ab`, position 1). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `r_n` | `pole:z:9:lo:105.00` | its own three wires and nothing else: along from the north (`l_n`), the weigh house's drop (`l_t`, position 1), along south (`l_k`, position 0) |
| `tb_a` | `pole:x:0:hi:427.50` | 2 spans, both its own (`l_a0`, the corner span in; `l_in` out to `x:0:hi:440.50`); no drop |
| `cell` | `pole:z:9:lo:27.50` | 2 spans: its input (`l_in`, the corner span in) and its one far-side line (`l_c`, out to `z:9:lo:39.17`); no drop |
| `tb_b` | `pole:z:8:lo:105.50` | 2 spans, both its own (`l_bk1` in from `z:8:lo:117.50`, `l_bk0` out to `z:8:lo:92.50`); no drop |

Scenery (section S), 29 buildings:
- **Always lit, 1:** on `l_a0`, at `block:8:0`'s north-west corner.
- **On A's wire (`l_in`), 4:** `block:8:0`'s north street. Lit in A's windows.
- **On the cell's wire (`l_c`), 3:** `block:8:0`'s east street and south-east corner.
- **On the trunk past the fuse (`l_t1`), 3;** **on `r_a`'s second wire (`l_ab`), 4.** These 7, with the weigh house, are what the fuse is rated for.
- **On the back road, 14:** 10 on `l_back1` (the east and south streets of `block:8:1`), 4 on `l_bk2` (the east street of `block:7:1`, two of them `block:8:1`'s across `z:8`). With the homes and the kiln the back road is 22.

## The windows, and what is done in each

| Window | What the clocks do | What only this window allows |
| --- | --- | --- |
| **A's** (0 to 8 s, 16 to 24 s, ...) | `tb_a` closed: the feed reaches the cell's input. `tb_b` open: the back road is cut from `j_far` | **Mend the spark** (it sparks only now). **The cell fills**, only now. **The fuse goes in**, only now: with the door open the trunk carries the seven houses and the weigh house and nothing else |
| **B's** (8 to 16 s, 24 to 32 s, ...) | `tb_a` open: the cell fills no more. `tb_b` closed: the back road is joined to `j_far` | **Release the cell, throw `r_a`, then `r_n`.** Only now does the cell's light get round to `r_a`. A fuse fitted now meets the kiln and the back road, and blows |

The cell's charge: 0 at the start. It fills from the mend to the end of A's first window (8 s at most). Released in B's window, it lasts out the three clicks, and is flat by the turn. Nothing of it is needed in A's second window: the feed does that.

## The intended read from the default camera

The camera opens on all four blocks. **The weigh house is on `block:8:1`'s east street, at the right-hand edge of the view, one pole south of the block's north-east corner, dark.** The feed's pole is off the top-left corner.

1. **The view opens on A's window, with the clock stopped.** Five houses are lit along the top: one at the corner, four along `block:8:0`'s north street, up to a **spark** at the top-right corner, beside a cell that shows empty. In the middle of the top, the **fuse box** shows its ✕ and its number: **+15, red**. Everything south of it is dark. In hand: a wire, a bulb, two fuses. Both timed breakers read "starts on your first move".
2. The fuse's red says what is behind it: the trunk's three houses and 12 more. Follow the trunk down the middle street and across: the relay at the head of `block:8:1` rests on the **sawmill**. A relay; and with the fuse out, no current will ever reach it from the feed.
3. So something else has to turn it. The cell's wire runs down the right-hand street to the corner above the weigh house. From there, the only way on to the sawmill's relay is through the relay on the weigh house's pole, down the east street, round the bottom and up the middle street, **through the other clock**. That door is open now, in A's window, and shut in B's.
4. **Mend the spark** (the wire). The cell begins to fill. **The clock starts.** Wait for the turn.
5. At 8 s the clocks turn. The north street goes dark; B's door closes. **Release the cell.** Its light runs the whole back road: the homes, the kiln, fourteen houses, and at the end of it the sawmill, lit by the cell. Nothing is red: a cell trips no fuse.
6. **Throw `r_a`** first. The sawmill goes dark and the north street of `block:8:1` lights: the trunk's road to the weigh house's corner is set.
7. **Then `r_n`.** The back road goes dark, and the weigh house's socket **flickers**: a dead bulb, shown by the cell's light. **Fit the bulb.** The weigh house burns, on the cell. That is not a win: the feed has to carry it.
8. The fuse's number has fallen from +37 to **+35**, and it is still red: B's door is closed, and the trunk would run straight through it to the kiln. Wait.
9. At 16 s the clocks turn again. The door opens; the fuse's number reads **+13, white**. **Fit the fuse.** The feed runs the trunk, `r_a`, the north street, `r_n`: the weigh house burns. The box 13 of 13, 18 of 18. **Win.**

A player who reads all of it in the opening view wins at the second turn of the clocks, at about 16 s.

**Hidden at the start (1 fact):** the weigh house's dead bulb, behind `r_n`'s second position, shown by the cell's light (or, later, by the feed's). Besides it, everything south of the fuse is dark until the cell is released, and with it where `r_a` and `r_n` point.

## The trap

**The relays are set and the weigh house is glowing on the cell: fit the fuse now, while B's door is still closed, and the trunk runs through the door to the kiln; the fuse blows.**

The same door that let the cell's light round to `r_a` lets the feed's current round to the kiln. The fuse's number says so beforehand (**+35, red**, naming the box) and the prompt warns (*would blow again: 35 load on ≤13*). Blown, a bolt runs down the middle street to the kiln's wire and the box shows its ✕ again.

**It is recovered by a part and a wait:** the second fuse, in A's window. That is why the kit holds two.

Three more, each readable, each recoverable:

- **The fuse first** (the obvious first click: the only ✕ on the map, and a fuse in hand). It reads **+15, red**, and the prompt warns (*would blow again: 15 load on ≤13*): the sawmill. Fitted, it blows at once. Recovered by the spare; the win is still there. **Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"): the spare, fitted at once, blows the same way, on the same warning. That one is recovered by one Undo, and nothing else on the map recovers it.
- **The near relay first.** `r_n` is beside the target, and the cell's light is on it. Thrown first, the cell's light goes to the weigh house and nowhere else: the back road is dark, and `r_a` with it. The lit wire shows it: it stops at the weigh house. Recovered by throwing `r_n` back, then `r_a`, then `r_n`: three clicks instead of two, which at a person's pace runs the cell flat. Then the recovery is a wait: the cell fills again on A's next turn.
- **The cell spent in A's window.** Released while the door is open, its light goes down the east street and round, and stops at B's clock, two poles short. The homes and the kiln glow; `r_a` is dead. Nothing is lost but the charge, and a turn of the clocks to fill it again.

**The flip that blows a fuse, with no click to blame.** Fit the fuse in A's window with the relays set but the bulb forgotten: there is no win, the clock runs on, and at the turn B's door closes on a whole fuse. `tb_b`'s own number reads **+18, red, blows `fb`** for the whole of that window. Recovered by the spare, in A's next window.

## Why each block

| Block | Why the solve needs it |
| --- | --- |
| `block:7:0` | The **fuse box** is on its east street: the first read (the ✕, +15 red) and the last move. The feed's wire enters along its north street |
| `block:8:0` | **A's clock, the spark and the cell.** The mend and the release are both here, and A's window is read here: the north street lit, or dark |
| `block:8:1` | **Both relays, the sawmill and the weigh house.** The two throws, in order, and the bulb |
| `block:7:1` | **B's clock and the kiln**, on its east street. Nothing is clicked here. It is where the player reads which window the cell must be spent in (the door is on the cell's only road to `r_a`) and which window the fuse must go in (the kiln is behind the door) |

## Layers

| # | Layer | The read | The move or moves | Begins on | Finished, or undone, on | Hands to the next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **The fuse that blows again** | The ✕ and +15 red on `fb`; the sawmill on `r_a`'s pole; a relay, dead while the fuse is out | none yet: the fuse is the last click | `7:0` (the box) | `7:0`, by way of `8:1` (`r_a` must be thrown first) | "Something else must reach `r_a`" |
| 2 | **Fill the cell** | The spark on A's wire, the empty cell; A's clock on its input | mend `l_in`, in A's window; wait | `8:0` | `8:1` and `7:1` (where the charge is spent) | 8 s of light that trips no fuse |
| 3 | **Through the door, far one first** | The cell's road to `r_a`: `j_n`, `r_n` at rest, the back road, B's clock. Thrown, `r_n` takes the light off that road | in B's window: release, `r_a`, then `r_n` | `8:0` (the release) | `8:1` (the two throws), by way of `7:1` (the door) | Both relays set; the trunk's road to the weigh house |
| 4 | **The lantern** | The weigh house's socket flickers under the cell's light | the bulb | `8:0` (whose light it is) | `8:1` | A target that will burn when the feed arrives |
| 5 | **The door and the kiln** | B's door, closed, joins the back road to the trunk: the fuse reads +35 red in B's window, +13 white in A's | wait for A's window; fit the fuse | `7:1` (the door, the kiln) | `7:0` (the box) | The win |

By the ticket's definition a read with no move is a hidden fact, not a layer, so row 1 (which has no move) is not counted. Four layers with a move (2 to 5); all four cross blocks, and every block is on at least one of them. Layer 3 is undone by `r_n` thrown early (the near relay first); layer 5 is undone on `7:1` by a turn of the clock (the flip that blows).

## What it builds on, and its depth of read

- **20 is turned inside out.** There, the other clock's window was the lantern and a spring was its door. Here the two clocks do not feed the target at all: one feeds the cell, the other holds the door, and what crosses from one window to the other is the charge.
- **19 is the tool, and its lesson is the trap.** 19 taught "let the feed in last, when the cell has set what it can't reach safely". Here "last" is not enough: the feed must be let in in the right window, and the cell's own door is the reason.
- **17 is held twice over.** Two relays; each keeps its place in the dark; and each must be set by the cell, because the feed would wake either one onto something the box cannot carry (the sawmill behind `r_a`, the back road and its kiln behind `r_n`).
- **8 and 16:** the red is on the fuse from the first frame to the last click. The puzzle is what makes it white, and two of the three things are on other blocks.
- **Depth of read: 9.** Before the first move that can't be taken back (the release: the charge is not undoable) the player must hold: (1) the fuse is out, and a new one blows on the sawmill; (2) the sawmill's switch is a relay, and with the fuse out the feed can never reach it; (3) the cell can, but it is empty, and it fills only on A's clock, past a spark; (4) the cell's light reaches `r_a` by one road only, through `r_n` at rest and round the back; (5) B's clock is on that road, so the light gets through only in B's window: fill on A, spend on B; (6) `r_n`, thrown, takes the light off the back road, so `r_a` goes first; (7) `r_n` cannot be left for the feed: at rest it would send the trunk down the back road to the homes and the kiln; (8) B's door, closed, joins the kiln to the trunk whatever the relays say, so the fuse goes in on A's turn; (9) the cell's light is not a win, and whatever it shows at the weigh house is still to be mended. Puzzle 20 asks for 8.

## The numbers (section V), the cell's cue and the next-flip cue

- **The blown fuse's number is the puzzle's dial.** At the start **+15 red** (the trunk's three houses and the sawmill). In B's window, relays unset, **+37 red** (the back road joined). `r_a` thrown: **+32 red**. Both thrown, bulb in: **+35 red** (the back road, through the door). In A's window with both thrown: **+10 white** before the bulb, **+13 white** with it.
- **The relays' numbers read +0 under the cell's light:** a cell's light is no load. What says where each throw sends the light is the NC2 cue (hover: the wires it would make live and dead) and the lit wire itself. That `r_n` takes the light off the back road shows as the whole back road named dead on hover.
- **BC's battery cue:** the cell's seconds, and on hover the wires its release would light. In A's window the cue stops at B's clock; in B's it runs on to the sawmill. That difference is the read of layer 3.
- **The timed breakers' next-flip numbers** (TB1b): ±4 (A's wire's houses) on the intended road, white. `tb_b` reads **red, blows `fb`** only when a whole fuse is about to meet the door.
- **The timer's ring** shows each clock's share and which is closed.

## The tribe's homes

`homes` (priority, load 2) is on the back road, between `r_n` and the kiln. It is dark at the start. It glows for a few seconds on the cell, when the cell is released. **It is dark at the win:** the back road is the price of the weigh house, because the homes share a wire with the kiln and the box cannot carry the kiln. Nothing in the kit or on the map lights the homes and wins.

## Changed from the plan's row

- **Row 21 ("Far one first", battery + order) is kept as layer 3,** and its trap as one of the three lesser traps: the relay nearest the cell and the target cuts the cell off from the far relay.
- **Added, by Josh's ruling ("Fuse + battery twist"):** the pair of clocks and the rated fuse. The row had no clock. The cell fills on one and is spent on the other, and the fuse is why both the relays and the window matter.
- **Changed:** the row's kit was a fuse; here wire, bulb, two fuses. The row had 0 faults; here 3 (the blown fuse, the spark that keeps the cell empty, the dead bulb). The row's breaker and plain switch are not used.
- **From the earlier draft of this file** (left by a stopped run): its layout is kept. Changed: B's clock moved from the cell's own wire to the back road, and a kiln added behind it. In the draft the second relay could be thrown by the feed after the fuse went in, so the order was not forced, and the fuse could go in in either window. A spare fuse was added so that the blow is a lesson.
- **Size:** 3 / wire, bulb, 2 fuses / 2 timed breakers, 1 battery, 2 relays, 1 fuse box; 4 blocks.

## Limits passed

None. 6 clicks, 1 hidden fact, 3 faults, 4 own buildings (sawmill, weigh house, homes, kiln), 4 blocks, 2 timed breakers.

## Series rules

- **Reuse is free.** A blow is the trap, and "fit it and it blows again" is a designed trap, named above and readable before the fit (the red number and the prompt).
- **Wins at `--click-seconds 3` in the same fewest clicks:** yes, 6 (below).
- **Kit: wire, bulb, 2 fuses.** Puzzle 20's is 2 bulbs and a fuse. **Puzzle 22's must not be a wire, a bulb and two fuses.**
- **Heavy building: the sawmill** (load 12), with the kiln (6) behind the door. Puzzle 20's is the smelter. **Puzzle 22's must not be the sawmill.**
- **Shrine count: 2 of 5.** No shrine here.
- District `block:7:0`, `block:8:0`, `block:7:1`, `block:8:1`. `block:7:0` and `block:8:0` have not been used by the series. `block:8:1` was puzzle 3's district and `block:7:1` + `block:8:1` puzzle 12's; neither is a neighbour of 21. It shares no block with puzzle 20 (`block:6:0`, `block:6:1`); the feed's pole is on `block:6:0`'s pavement, outside the district, as 20's was on `block:7:0`'s. **Puzzle 22 must use none of these four.**
- **Districts used by 1 to 21**, none to be a district again: `block:4:8`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, `block:0:4` + `block:0:2`, `block:4:8` + `block:5:8`, `block:6:11` + `block:7:11` + `block:8:10`, `block:0:4` + `block:3:4`, `block:7:5` + `block:7:7`, `block:0:10` + `block:2:10`, `block:6:0` + `block:6:1`, and now `block:7:0` + `block:8:0` + `block:7:1` + `block:8:1`. Blocks no series puzzle has used: `block:5:0`, `block:5:1`, `block:3:2`, `block:5:4`, `block:8:5`, `block:0:7`, `block:5:7`, `block:7:8`, `block:8:8`, `block:6:9`, `block:7:9`, `block:5:10`.

## Expected numbers

`npm run analyze puzzles/city/s21-between-two-clocks.city.json`, at 1 s a click (the default) and at `--click-seconds 3`; `--wait` and `--cap` unchanged:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 25,661, exhaustive | 21,941, exhaustive |
| Time on Josh's PC | 2 min 22 s | 1 min 56 s |
| Solvable | yes | yes |
| Fewest clicks | **6** | **6** |
| Waits on the shortest win | 22 (11 s) | 8 (4 s) |
| One shortest win | `repair:l_in`, wait 11 s, `cell`, `r_a`, `r_n`, `repair:weigh_house`, `repair:fb` | `repair:l_in`, wait 4 s, `cell`, `r_a`, `r_n`, `repair:fb`, `repair:weigh_house` |
| Winning click orders | 860 | 2 |
| Winning configurations | **1** (`r_a` at the north street, `r_n` at the weigh house, the wire, the bulb and one fuse in) | **1** |
| Parts used | wire, bulb, fuse (3 of 4; the second fuse is the spare) | wire, bulb, fuse |
| Feed at the shortest win | 18 of 18 | 18 of 18 |
| Fuses that blow on a shortest win | none | none |
| Fuses that blow on some move | `fb` | `fb` |
| First moves | `repair:fb`, `repair:l_in` | `repair:fb`, `repair:l_in` |
| Dead-end states | 7,968 of 25,661 (31.1%) | 6,944 of 21,941 (31.6%) |
| First moves that lead only to dead ends | none | none |
| Hidden at the start | 1: the dead bulb | |

At 1 s a click the analyzer's shortest win waits 11 s and does all of B's work in the last four seconds of B's window; the note's solution releases at the turn. At 3 s a click the release lands at 7 s (one second before the turn, with 7 s in the cell), `r_a` at 10 s, `r_n` at 13 s with a second of charge left, the fuse at 16 s and the bulb at 19 s. There are 2 winning orders: nothing is spare.

**No win without the twist.** The one winning configuration has both relays thrown and a whole fuse. Neither relay can be thrown by the feed without a blow (`r_a` wakes onto the sawmill; `r_n`, at rest, onto the back road), so both are thrown by the cell. The cell fills only through `tb_a`, and its light reaches `r_a` only through `tb_b`: charged in A's window, spent in B's, on every win.

Loads, replayed on the conversion: start 5 of 18 (A's wire); B's window 1; the cell released, the back road and the sawmill lit by the cell and none of it on the feed; the fuse in A's second window 18 of 18, `fb` 13 of 13, win. The traps: 15 on `fb`'s 13 (the fuse first); 35 on 13 (the fuse through the door).

**The obvious wrong first move** is the fuse: read by its red +15 and the prompt, and recovered by the spare fuse (a part). **Undo does not recover a spent cell or a lost window** (time is not undoable); the next turn of the clocks does. The dead-end states are the ones with both fuses blown. The check block replays the fuse first, the fuse twice, the near relay first, the cell spent on A's turn, the fuse through the door, and the flip that blows.

**Where it stands against 20:** it reads deeper (9 facts against 8). At the pace a person clicks (3 s) it has 2 winning orders against 2. Its share of dead-end states is higher (31.6% against 20.2%). It has 5 layers against 4, on 4 blocks against 2.

Time on the intended road: the mend at 0 s; the release, both throws and the bulb between 8 s and 16 s; the fuse at 16 s. A player who meets the main trap first wins in A's third window, at about 32 s.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:l_in", "wait:7", "cell", "r_a", "r_n", "repair:weigh_house", "wait:4", "repair:fb"],
  "traps": [
    { "name": "fit the fuse first, on its warning",
      "moves": ["repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb", "f_in"], "complete": false },
      "recover": ["repair:l_in", "wait:6", "cell", "r_a", "r_n", "repair:weigh_house", "wait:4", "repair:fb"] },
    { "name": "fit it and it blows again",
      "moves": ["repair:fb", "repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["undo", "repair:l_in", "wait:5", "cell", "r_a", "r_n", "repair:weigh_house", "wait:4", "repair:fb"] },
    { "name": "the near relay first",
      "moves": ["repair:l_in", "wait:7", "cell", "r_n"],
      "expect": { "readable": ["f_bulb"], "complete": false },
      "recover": ["r_n", "r_a", "r_n", "repair:weigh_house", "wait:2", "repair:fb"] },
    { "name": "release while the back road's door is open",
      "moves": ["repair:l_in", "wait:4", "cell"],
      "expect": { "lit": ["homes", "kiln"], "complete": false },
      "recover": ["wait:18", "cell", "r_a", "r_n", "repair:weigh_house", "wait:4", "repair:fb"] },
    { "name": "relays set, fuse in at once, through the door",
      "moves": ["repair:l_in", "wait:7", "cell", "r_a", "r_n", "repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb", "f_bulb"], "complete": false },
      "recover": ["wait:5", "repair:fb", "repair:weigh_house"] },
    { "name": "fuse in on A's turn, the bulb forgotten, and the clocks turn",
      "moves": ["repair:l_in", "wait:7", "cell", "r_a", "r_n", "wait:5", "repair:fb", "wait:8"],
      "expect": { "blown": ["fb"], "complete": false },
      "recover": ["wait:8", "repair:fb", "repair:weigh_house"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds all four blocks (120 m by 145 m, the widest district yet), the feed's pole at the top left and the weigh house at the right-hand edge.
- Both timer rings read: `tb_a` at the top, at `block:8:0`'s north-west corner; `tb_b` on the middle street, one pole below the head of the south pair. They are about 85 m apart.
- The cell (top right) shows empty, and its seconds once the spark is mended. Its hover cue stops at B's clock in A's window and runs on to the sawmill in B's.
- The fuse box's ✕ and its number read at the top of the middle street, and the number changes at each turn of the clocks.
- The sawmill's relay and `j_far` are one street apart (11.5 m); `tb_b` is 13 m south of `j_far`; the kiln 12 m south of that. Each reads as its own piece.
- When the cell is released in B's window the lit wire goes all the way round: down the east street, along the bottom, up the middle street, through the clock, to the sawmill.

## To watch when Josh plays it

- **Only in the HUD:** nothing the solve needs. The feed's 18 is never the limit that matters (the box's 13 is, and it shows as the fuse's own number). The cell's seconds show on the cell.
- Whether the door reads as a door. `tb_b` is on a wire that is dark for most of the puzzle. Does he see that the cell's road to the sawmill's relay passes it, or find out by releasing in A's window?
- Whether "the fuse's number is the dial" is felt: does he watch +37 fall to +35 and then turn white at the turn, or fit on red?
- Whether the far relay first is reasoned or stumbled on. The near relay is beside the target.
- Whether 8 s is right. B's window holds a release and two throws at a person's pace with a second or two to spare, and the bulb only if he is quick.
- Whether the weigh house glowing on the cell reads as "not yet" (puzzle 19's lesson) or as a win that didn't count.
- Whether the homes, the tribe's, dark at the win are noticed.
- Whether four blocks fit the frame and still read; 29 of the 33 buildings are scenery.

## What it taught us
