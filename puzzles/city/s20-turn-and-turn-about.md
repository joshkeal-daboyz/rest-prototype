# 20 · Turn and turn about — design note (series v1, puzzle 20)

A new puzzle designed on the city (ticket 081 section N4; `puzzles/series-v1.md`, row 20). It has no schematic and no `from`. **It is the first series puzzle with a timed breaker**: two of them, out of phase, each feeding its own wire round the block in turn.

Josh, 26 Nov 2026: "I want to add another puzzle piece. I want to add a timed breaker I think it would add an interesting twist to a puzzle if a timer powered different sections at different times and you had to work between them." How the two windows are forced, on a card: "Fuse + battery twist (Recommended)": a rated fuse forces them here; the battery twist is the second timer puzzle's, in N5, and is not in this one.

- **New concept:** the timed breaker. A clock throws it, never the player. One wire is live for 8 seconds, then the other, and so on. What is dark cannot be read, thrown or mended until its turn comes.
- **The reasoning move:** before a window opens, set what its current will meet, in the window that can reach it.
- **Builds on:** 8 and 16 (a rated box; a blow cuts everything past it), 10 (a bulb is a load event), 17 (a relay moves only under current, and keeps its place), 18 (a spring is thrown only while live, and falls back when dark), 19 (another source's short window sets what the feed that must carry it cannot reach safely; time is not undoable).
- It uses no battery.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:0` and `block:6:1`**, the first north of the second, touching across `x:1`. The two wires leave `block:6:0`'s north-east corner in opposite directions and go round the block to meet at `block:6:1`'s north-west corner, diagonally opposite.
- The feed stands on `block:7:0`'s crossing pole, across `z:7` from `block:6:0`'s north-east corner. One entering span.
- **A's clock** `tb_a`: closed 8 s, open 8 s, offset 0. **B's clock** `tb_b`: closed 8 s, open 8 s, offset 8. Exactly one is closed at any time. The view opens on A's window, and the clock starts at the first move.
- Capacity **24**; `fb` (B's fuse box, on the north street) rated **19**. Own numbers 6 and 3, raised once by `npm run fit -- --raise` (the timed raise, TB2) for the 18 scenery buildings.
- Targets: `clock_house` (on `block:6:1`) and `cistern` (on `block:6:0`). Priority: `bakery`. Parts: **2 bulbs, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:7:hi:27.50` (crossing, block:7:0, -x side) | 360.75, 27.50 |
| `j_0` | junction | pole `pole:z:7:lo:27.50` (end, block:6:0, +x side) | 344.25, 27.50 |
| `tb_a` | timed breaker, closed at the start | pole `pole:z:7:lo:62.50` (end, block:6:0, +x side) | 344.25, 62.50 |
| `sp_a` | spring switch, position 0 `l_bake`, 1 `l_tie`; set 0 | pole `pole:x:1:lo:337.50` (crossing, block:6:0, +z side) | 337.50, 69.25 |
| `bakery` | lamp, load 2, priority | building `block:6:0/b\|outer\|+z\|66,12`, by its drop from `pole:x:1:lo:337.50` | 337.50, 65.00 |
| `tb_b` | timed breaker, open at the start | pole `pole:x:0:hi:337.50` (end, block:6:0, -z side) | 337.50, 20.75 |
| `j_b` | junction | pole `pole:x:0:hi:326.67` (slot, block:6:0, -z side) | 326.67, 20.75 |
| `cistern` | lamp, load 3, **target**, dead lamp | building `block:6:0/b\|outer\|-z\|63,5`, by its drop from `pole:x:0:hi:326.67` | 327.50, 25.00 |
| `fb` | fuse box | pole `pole:x:0:hi:315.83` (slot, block:6:0, -z side) | 315.83, 20.75 |
| `r_b` | relay, position 0 `l_yard`, 1 `l_link`; set 0 | pole `pole:x:0:hi:294.17` (slot, block:6:0, -z side) | 294.17, 20.75 |
| `yard` | lamp, load 1 | building `block:6:0/a\|outer\|-z\|57,5`, by its drop from `pole:x:0:hi:294.17` | 292.50, 25.00 |
| `j_d` | junction | pole `pole:x:1:hi:272.50` (end, block:6:1, -z side) | 272.50, 85.75 |
| `r_1` | relay, position 0 `l_smelt`, 1 `l_clock`; set 0 | pole `pole:z:6:hi:104.17` (slot, block:6:1, -x side) | 265.75, 104.17 |
| `smelter` | lamp, load 5 | building `block:6:1/a\|outer\|-x\|54,20`, by its drop from `pole:z:6:hi:104.17` | 270.00, 102.50 |
| `clock_house` | lamp, load 3, **target**, dead lamp | building `block:6:1/a\|outer\|-x\|54,22`, by its drop from `pole:z:6:hi:115.83` | 270.00, 117.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j_0` | 1 span: 1 cross (over `z:7`) | 16.50 |
| `l_a0` | `j_0` → `tb_a` | 3 spans: 3 along (along `z:7`) | 35.00 |
| `l_a1` | `tb_a` → `sp_a` | 1 span: 1 corner | 9.55 |
| `l_bake` | `sp_a` → `bakery` | drop | — |
| `l_tie` | `sp_a` → `j_d` | 7 spans: 1 cross, 6 along (over `x:1`, along `x:1`) | 81.50 |
| `l_b0` | `j_0` → `tb_b` | 1 span: 1 corner | 9.55 |
| `l_b1` | `tb_b` → `j_b` | 1 span: 1 along (along `x:0`) | 10.83 |
| `l_cist` | `j_b` → `cistern` | drop | — |
| `l_b2` | `j_b` → `fb` | 1 span: 1 along (along `x:0`) | 10.83 |
| `l_b3` | `fb` → `r_b` | 2 spans: 2 along (along `x:0`) | 21.67 |
| `l_yard` | `r_b` → `yard` | drop | — |
| `l_link` | `r_b` → `j_d` | 8 spans: 5 along, 2 corner, 1 cross (along `x:0`, along `z:6`, over `x:1`) | 92.26 |
| `l_r` | `j_d` → `r_1` | 2 spans: 1 corner, 1 along (along `z:6`) | 21.21 |
| `l_smelt` | `r_1` → `smelter` | drop | — |
| `l_clock` | `r_1` → `clock_house` | 1 span: 1 along (along `z:6`) + drop | 11.67 |

Faults (2): `f_clock`, the clock house's dead bulb, dark at the start behind `r_1`'s second position; `f_cist`, the cistern's dead bulb, dark at the start on B's wire.

**The picture.** Both clocks are at `block:6:0`'s north-east corner, beside the feed. **A's wire** goes south down the east street, through `tb_a` to **the spring** at the south-east corner, with the bakery on its pole (where it rests). Thrown, the spring sends A's current across `x:1` and west along `block:6:1`'s north street: **the tie**, eight houses. **B's wire** goes west along the north street: `tb_b`, the cistern, **the fuse box**, and the relay `r_b` with the yard on its pole. Thrown, `r_b` sends B's current on round the north-west corner and down the west street: **the link**, seven houses. The tie and the link meet at `block:6:1`'s north-west corner (`j_d`). From there a short wire runs south to **the relay `r_1`**, with the smelter on its pole and the clock house one span on.

**The street crossings between blocks:** the tie, over `x:1` at the east end (the spring's second wire); the link, over `x:1` at the west end, onto `j_d`'s pole.

**No breaker, relay, spring or fuse box on a branch pole** (a timed breaker counts as a breaker). Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `tb_a` | `pole:z:7:lo:62.50` | 2 spans, both its own (`l_a0` in from `z:7:lo:50.83`, `l_a1`, the corner span out); no drop |
| `sp_a` | `pole:x:1:lo:337.50`, `block:6:0`'s crossing pole | its own three wires and nothing else: the corner span in (`l_a1`), the bakery's drop (`l_bake`, position 0), the crossing of `x:1` (`l_tie`, position 1). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `tb_b` | `pole:x:0:hi:337.50` | 2 spans, both its own (`l_b0`, the corner span in; `l_b1` out to `x:0:hi:326.67`); no drop |
| `fb` | `pole:x:0:hi:315.83` | 2 spans, both its own (`l_b2` in from `x:0:hi:326.67`, `l_b3` out to `x:0:hi:304.50`); no drop |
| `r_b` | `pole:x:0:hi:294.17` | its own three wires and nothing else: along from the east (`l_b3`), the yard's drop (`l_yard`, position 0), along west (`l_link`, position 1) |
| `r_1` | `pole:z:6:hi:104.17` | its own three wires and nothing else: along from the north (`l_r`), the smelter's drop (`l_smelt`, position 0), along south (`l_clock`, position 1) |

Scenery (section S), 18 buildings:
- **Always lit, 2:** on the east street before A's clock.
- **On the tie, 8:** along `x:1` (4 of `block:6:0`'s south-facing houses, 4 of `block:6:1`'s north-facing).
- **On the link, 7:** 1 on the north street, 5 on the west street (2 of them `block:5:0`'s, across `z:6`), 1 at the crossing of `x:1`.
- **On `r_1`'s wire, 1:** the house at `block:6:1`'s north-west corner.

The tie, the link and `r_1`'s wire are one piece of wire with no breaker in it: whichever clock reaches the corner lights all 16.

## The windows, and what is done in each

| Window | Fed | What only this window allows |
| --- | --- | --- |
| **A's** (0 to 8 s, 16 to 24 s, ...) | The east street, the spring and what it points at: the bakery, or, thrown, the tie, the corner, the link's houses, `r_1` and what it points at | **Throw the spring, and then `r_1`, in the same window.** Nothing else can bring current to `r_1` without a blow, and the spring lets go when the window shuts. (The clock house's bulb can go in here too.) |
| **B's** (8 to 16 s, 24 to 32 s, ...) | The north street, the cistern, the fuse box, `r_b` and what it points at: the yard, or, thrown, the link, the corner, the tie's houses, `r_1` and what it points at | **Fit the cistern's bulb**: it can be read and mended only now. **Throw `r_b`**: it is live only now. Fit a fuse in `fb` if it has blown |

A's window has no fuse on it. B's has one, rated for the sixteen houses and the clock house, and not for the smelter. That is the whole reason for A's.

## The intended read from the default camera

The camera opens on both blocks, `block:6:0` above. **The cistern is on `block:6:0`'s north street, one pole west of the north-east corner, dark. The clock house is on `block:6:1`'s west street, two poles south of its north-west corner, dark.** They are at opposite corners of the view.

1. **The view opens on A's window, with the clock stopped.** Two houses and the bakery are lit down the east street. Everything else is dark. The HUD reads 4 of 24. Two bulbs and a fuse in hand. One thing can be clicked: the spring. Both timed breakers read "starts on your first move".
2. **Throw the spring** (+19). The bakery goes dark; the tie lights along `x:1`, round the far corner and back up the west street; and at the bottom left the **smelter** burns. 23 of 24. **The clock starts.**
3. Follow it. The clock house is behind the relay on the smelter's pole. The cistern is on the other clock's wire, behind nothing. They will never burn together on A: A's current cannot pass `r_b`. So B has to carry both, through `r_b` and the link.
4. And B has a fuse box. The link ends at this relay, and this relay points at the smelter. **Throw `r_1` now**, while A is on it (−2): the smelter goes dark, and the clock house's socket **flickers**. Fit a bulb (+3, white). The clock house burns, on A. 21 of 24.
5. At 8 s the clocks turn. A's side goes dark, and the spring falls back to the bakery. B's north street lights: the yard, and the cistern's socket **flickers**. Fit the other bulb (+3).
6. `r_b` reads **+18, white**: the sixteen houses and the clock house, less the yard, on a box rated 19. **Throw it.** B's current runs the link to the corner and down to `r_1`, which is where A left it. The clock house burns with the cistern. The box 19 of 19, 24 of 24. **Win.**

A player who reads all of it in the opening view wins in the first B window, at about 10 s.

**Hidden at the start (2 facts):** the clock house's dead bulb, behind `r_1`'s second position, shown by throwing `r_1` under A's light; the cistern's dead bulb, on B's wire, shown when B's window opens. Besides these, all of B's side is dark until its turn, and with it the red or white on `r_b`. **Layers (4):** one clock must carry both targets, and only B's can; B's box cannot meet the smelter, so `r_1` must be turned first; only A can turn it, through a spring that holds for one window; each bulb goes in under the clock that shows its socket.

## The trap

**In B's window `r_b` is live and one throw from the far corner: thrown while `r_1` still points at the smelter, B's current meets the smelter and the fuse box blows.**

This is what a player does who used A's first window to look: threw the spring, watched the smelter light, and let the clocks turn. In B's window `r_b` reads **+20, red**, and names the box. Thrown, a bolt runs the link to the smelter, the box shows its ✕, and B's wire is dark past it. The cistern, before the box, still shows.

**It is readable:** the red beforehand, the bolt, the ✕, and the blown fuse's own number, +21 red, for as long as `r_1` points at the smelter.

**It is recovered by a part and a wait, in both windows.** `r_1` is dead now in both: B's current stops at the box, and A's reaches it only through the spring. Wait for A's window; throw the spring, then `r_1`. Wait for B's; fit the spare fuse. `r_b` kept its place, so the current crosses at once.

**Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"). Fitted at once, the prompt warns (*would blow again: 21 load on ≤19*), and it blows. Undo returns the fuse; it does not return the seconds.

**The spring and the shut window.** Throw the spring late in A's window and the window shuts before `r_1` is thrown: the spring is back on the bakery, `r_1` is where it was, and nothing is lost but eight seconds. This is puzzle 18's piece met on a clock: nobody opened a breaker.

**The flip that blows a fuse, with no click to blame.** After the hand-over is set (`r_b` at the link) but before the win, throw `r_1` back to the smelter in an A window. Nothing happens until the clocks turn; then B's current meets the smelter. The timed breakers' own numbers read red for the turn that is coming. It is off the intended road, and the spare fuse recovers it.

## What it builds on, and its depth of read

- **19 is the shape.** There, a cell's few seconds set a relay that the feed could not wake without a blow. Here the "cell" is the other clock's window: A has no fuse on its wire, and eight seconds.
- **18 is held against it.** A's door to the far corner is a spring: both of A's throws must land in one window, and the door shuts itself.
- **17 is what carries the setting across the turn.** The relay keeps its place in the dark; the spring beside it does not.
- **8 and 16:** the red on `r_b` names a box, and the cause is on the other block, behind the other clock. A blow costs the window as well as the fuse.
- **10:** each bulb is 3 on whichever clock is carrying its building, and B's box has room for the clock house exactly.
- **Depth of read: 8.** Before the first part is spent the player must hold: (1) the two targets hang on different clocks, so one clock has to carry both at one moment; (2) A cannot reach the cistern, because `r_b` lets nothing in; B can reach the clock house, by `r_b` and the link; (3) the link ends at `r_1`, which points at the smelter, and B's box is rated for the houses and the clock house only; (4) `r_1` is live only when a clock's current reaches the far corner, and B's cannot get there without the blow; (5) A's can, through the spring, with no fuse on the way; (6) the spring holds only while A's window is open, so both throws go in one window; (7) `r_1` keeps its place when the clocks turn, and the spring does not, which is as it should be; (8) the clock house's socket is dead, and so, when B's turn comes, is the cistern's: one bulb under each clock. Puzzle 19 asks for 8.

## The numbers (section V), and the next-flip cue

- The spring, at the start: **+19** (the tie's and link's sixteen houses, the smelter's 5, less the bakery's 2). White: 23 of 24.
- `r_1` in A's window, with the spring thrown: **−2** (the smelter off, the clock house counted as sound until its socket is read); then the bulb **+3**.
- `r_b` in B's window: **+20 red**, blows `fb`, with `r_1` at the smelter; **+18 white** with `r_1` at the clock house and its bulb in. The number chooses, and what it turns on is a relay at the far corner of the other block that B cannot touch.
- The cistern's bulb: +3 white, in B's window only (it has no entry in A's).
- **The timed breakers' own next-flip numbers** (TB1b): on the intended road they are white before every turn. They read red, naming `fb`, only before the flip that would blow it (the last trap).
- **The timer's ring** shows each clock's share and which is closed. The cue on hovering a timed breaker is its next flip's.

## The tribe's bakery

`bakery` (priority, load 2) is where the spring rests: lit in A's windows at the start, dark whenever the spring is thrown, and **dark at the win**, which lands in B's window. It comes back by itself on the next turn of the clock, if the clock still ran: the spring has fallen back to it. The win stops the clock.

## Changed from the plan's row

- **Replaces** the plan's row 20 ("By cell light", battery + faults hide faults), which gave way to the timer (N4, **The order**). Its lantern move is offered to N5 (see `s19-the-cell.md`).
- **From `tb-two-clocks`:** kept: an alternating pair; one clock must carry both targets; a rated box on that clock's wire, and a relay set ahead in the other window, so both windows hold work; a spare fuse so the blow is a lesson. **Changed:** a different district and layout (its set is puzzle 11's); the relay that must be set ahead is not on A's own wire but at the far corner, on wire neither clock owns, and is reached from A only through a **spring** that lets go with the window; both targets are dead, one under each clock, so each window also has a mend that only it can show; A's side has no target of its own.
- **Not in it** (N4, fixed point 3): no battery, so no charge carried from one window into the other.
- **Size:** 2 / 2 bulbs, fuse / 2 timed breakers, 1 spring, 2 relays, 1 fuse box; 2 blocks.

## Limits passed

None. 5 clicks, 2 hidden facts, 2 faults, 5 own buildings, exactly 2 blocks, 2 timed breakers.

## Series rules

- **Reuse is free.** A blow is the trap, and "fit it and it blows again" is a designed trap, named above and readable before the fit. Any number of timers is allowed (NB-Q3); there are 2.
- **Wins at `--click-seconds 3` in the same fewest clicks:** yes, 5 (below).
- **Kit: 2 bulbs, 1 fuse.** Puzzle 19's is a fuse and a wire. **Puzzle 21's must not be two bulbs and a fuse.**
- **Heavy building: the smelter** (load 5). Puzzle 19's is the brewery. **Puzzle 21's must not be the smelter.**
- **Shrine count: 2 of 5.** No shrine here.
- District `block:6:0`, `block:6:1`. `block:6:0` has not been used by the series; `block:6:1` was puzzle 2's district (not a neighbour of 20), and this puzzle uses its north and west streets' poles. The set is not puzzle 11's (`tb-two-clocks`' set). It shares no block with puzzle 19 (`block:0:10`, `block:2:10`). **Puzzle 21 must not use `block:6:0` or `block:6:1`.** The feed's pole is on `block:7:0`.
- **Districts used by 1 to 20**, none to be a district again: `block:4:8`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, `block:0:4` + `block:0:2`, `block:4:8` + `block:5:8`, `block:6:11` + `block:7:11` + `block:8:10`, `block:0:4` + `block:3:4`, `block:7:5` + `block:7:7`, `block:0:10` + `block:2:10`, and now `block:6:0` + `block:6:1`. Blocks no series puzzle has used: `block:5:0`, `block:7:0`, `block:8:0`, `block:5:1`, `block:3:2`, `block:5:4`, `block:8:5`, `block:0:7`, `block:5:7`, `block:7:8`, `block:8:8`, `block:6:9`, `block:7:9`, `block:5:10`.

## Expected numbers

`npm run analyze puzzles/city/s20-turn-and-turn-about.city.json`, at 1 s a click (the default) and at `--click-seconds 3`; `--wait` and `--cap` unchanged:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 1993, exhaustive | 1661, exhaustive |
| Solvable | yes | yes |
| Fewest clicks | **5** | **5** |
| Waits on the shortest win | 10 (5 s) | 0 |
| One shortest win | `sp_a`, wait 5 s, `r_1`, `repair:clock_house`, `r_b`, `repair:cistern` | `sp_a`, `r_1`, `repair:clock_house`, `r_b`, `repair:cistern` |
| Winning click orders | 132 | 2 |
| Winning configurations | **1** (`r_1` at the clock house, `r_b` at the link, both bulbs in, the fuse whole, the spring at rest) | **1** |
| Parts used | bulb, bulb (2 of 3; the fuse is the spare) | bulb, bulb |
| Feed at the shortest win | 24 of 24 | 24 of 24 |
| Fuses that blow on a shortest win | none | none |
| Fuses that blow on some move | `fb` | `fb` |
| First moves | `sp_a` | `sp_a` |
| Dead-end states | 376 of 1993 (18.9%) | 336 of 1661 (20.2%) |
| First moves that lead only to dead ends | none | none |
| Hidden at the start | 2: both dead bulbs | |

At 3 s a click the two throws fill A's window (0 s and 3 s), the clock house's bulb goes in at 6 s, and B's two clicks land at 9 s and 12 s. There are 2 winning orders: nothing is spare.

**No win without the timer's flips, the spring or `r_1`:** the cistern is live only in B's windows and `r_1` can be thrown safely only in A's, so every win crosses at least one flip; the one winning configuration has `r_1` thrown, and only the spring brings it current without a blow.

Loads, replayed on the conversion: start 4 of 24; the spring 23; `r_1` 18; the clock house's bulb 21; B's window 3 (`fb` 1 of 19); the cistern's bulb 6; `r_b` 24 of 24, `fb` 19 of 19, win. The trap: 21 on `fb`'s 19.

**The obvious first move** is the only one: the spring. It is right, and it starts the clock. **The obvious wrong move** comes in B's first window: `r_b` on its red. Read and recovery are under **The trap**: a part and a wait. **Undo does not recover a lost window** (time is not undoable); the next turn of the clock does. The dead-end states are the ones with the box blown and no fuse in hand. The check block replays the red hand-over, the spare fitted at once, and the spring left to fall.

**Where it stands against 19:** it reads as deep (8 facts against 8). At the pace a person clicks (3 s) it has 2 winning orders against 6. Its share of dead-end states is lower (18.9% against 36.4%), because its blow has a spare fuse and 19's had none. It is the first puzzle whose state changes with nobody clicking.

Time on the intended road: the spring at 0 s, `r_1` and a bulb before 8 s, the other bulb and `r_b` after 8 s. A player who meets the trap first wins in the second B window, at about 25 s.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sp_a", "r_1", "repair:clock_house", "wait:5", "r_b", "repair:cistern"],
  "traps": [
    { "name": "hand over while r_1 points at the smelter",
      "moves": ["sp_a", "wait:7", "r_b"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["wait:7", "sp_a", "r_1", "repair:clock_house", "wait:5", "repair:fb", "repair:cistern"] },
    { "name": "fit the spare fuse at once and it blows again",
      "moves": ["sp_a", "wait:7", "r_b", "repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["undo", "wait:6", "sp_a", "r_1", "repair:clock_house", "wait:5", "repair:fb", "repair:cistern"] },
    { "name": "throw the spring and let the window shut",
      "moves": ["sp_a", "wait:8"],
      "expect": { "lit": ["yard"], "readable": ["f_cist"], "complete": false },
      "recover": ["wait:7", "sp_a", "r_1", "repair:clock_house", "wait:5", "r_b", "repair:cistern"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks, the feed's pole at the top right, and the clock house at the bottom left. The district is about 80 m wide and 100 m deep.
- Both timer rings read, a street corner apart at the top right, and each shows whose turn it is.
- The spring (bottom right of `block:6:0`) and the two relays read as what they are.
- When the spring is thrown the lit wire is seen to go all the way round: along `x:1`, the far corner, back up the west street, and down to the smelter.
- The smelter's pole and the clock house's are 12 m apart on the west street of `block:6:1`; both drops show.

## To watch when Josh plays it

- Whether "work between them" is felt: does he throw `r_1` in A's window because of what B will meet, or only after B's box has blown once.
- Whether 8 s is right. A's window holds the spring, `r_1` and, hurried, a bulb. If he is rushed, 10 s; if the wait for the other clock drags, 6 s.
- Whether the spring falling back when A's window shuts reads as the spring (puzzle 18) or as the clock undoing his work.
- Whether the red +20 on `r_b` sends him across the map to `r_1`. The cause is as far from the number as this map allows.
- Whether the lit wire going round three sides of the block when the spring is thrown reads as one wire, and whether the houses on it are noise: 16 of the 24 are scenery.
- Whether having exactly one thing to click at the start feels like a tutorial step or a relief.
- Whether the bakery, the tribe's, dark at the win is noticed.

## What it taught us
