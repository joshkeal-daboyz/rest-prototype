# 24 · Hold the spring — design note (series v1, puzzle 24)

A new puzzle designed on the city (ticket 081 section N5; `puzzles/series-v1.md`, row 24). It has no schematic and no `from`. Four blocks, two feeds, and a cell between them.

- **New concept: a cell's light holds a spring, and a feed must take it over before the cell runs flat.** The spring stays thrown only while something lights it. The cell can throw it, and can hold it for sixteen seconds. The feed can hold it for good, but cannot throw it.
- **The reasoning move:** a hand-over against a clock. Everything the feed must not meet is set, or shed, by the cell's light first, and the feed is let in last, while the cell is still holding. Let it in early and the next mend puts a heavy building on it; let it in with the homes' wire still on the road and the box blows; let it in late and the spring has fallen.
- **Builds on:** 18 (a spring is thrown only live and falls back in the dark; make before break), 19 (a cell's light sets what the feed can't reach safely, trips no fuse and wins nothing; time is not undoable), 21 (a cell filled from one side and spent on the other; things set in one cell's window, in order), 17 (a relay keeps its place in the dark), 8 and 16 (a rated box; the red names it), 3 (choose what goes dark).
- **Carries from N4's hand-on list:** a spring held by a battery; and the lantern, as a layer: the cell's light shows a hidden break, and then shows what is behind the mend.

**Reworked after review round 1** (`reviews/081n5-series-batch-5.md`, must-fix 1): the first build had four layers with a move. The homes' wire on `block:3:2` is now sound and has a breaker; it is the fifth. What changed is under **Changed from the plan's row**.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:3:0`, `block:5:0`, `block:5:1`, `block:3:2`**: `3:0` north-west, `5:0` north-east and `5:1` south-east of it across `z:5`, `3:2` south of it across `x:2`. 120 m wide, 140 m deep.
- **West** stands on `block:0:0`'s pole `pole:z:3:lo:27.50`, across `z:3` from `3:0`'s north-west corner. **East** stands on `block:6:0`'s pole `pole:z:6:hi:27.50`, across `z:6` from `5:0`'s north-east corner. One entering span each.
- **West 18, East 1.** `fb` rated **17**. Own numbers 3, 1 and 3, raised once by `npm run fit -- --raise` for the 16 scenery buildings. East carries nothing: all it does is fill the cell.
- **The cell**: capacity 16 s, full at the start. Its input is East's wire.
- Target: `signal_house` (a building of `block:5:0`, on the street between `5:0` and `5:1`). Priority: `homes`. Parts: **wire, fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed, 18 | pole `pole:z:3:lo:27.50` (end, block:0:0, +x side) | 104.25, 27.50 |
| `east` | feed, 1 | pole `pole:z:6:hi:27.50` (end, block:6:0, -x side) | 265.75, 27.50 |
| `fb` | fuse box | pole `pole:x:0:hi:127.50` (end, block:3:0, -z side) | 127.50, 20.75 |
| `br_f` | breaker, open at the start (the door) | pole `pole:x:0:hi:150.83` (slot, block:3:0, -z side) | 150.83, 20.75 |
| `cell` | battery, 16 s, full; input `l_in` | pole `pole:x:0:hi:230.00` (slot, block:5:0, -z side) | 230.00, 20.75 |
| `j_m` | junction | pole `pole:z:5:lo:27.50` (end, block:3:0, +x side) | 169.25, 27.50 |
| `sp` | spring switch, position 0 `l_brick`, 1 `l_road`; set 0 | pole `pole:z:5:lo:38.33` (slot, block:3:0, +x side) | 169.25, 38.33 |
| `brickworks` | lamp, load 14 | building `block:3:0/a\|outer\|+x\|32,6`, by its drop from `pole:z:5:lo:38.33` | 165.00, 37.50 |
| `j_t` | junction | pole `pole:z:5:lo:92.50` (landing, block:3:0, +x side) | 169.25, 92.50 |
| `r_2` | relay, position 0 `l_soap`, 1 `l_sig`; set 0 | pole `pole:x:1:hi:205.00` (slot, block:5:1, -z side) | 205.00, 85.75 |
| `soap_works` | lamp, load 7 | building `block:5:1/built\|outer\|-z\|39,18`, by its drop from `pole:x:1:hi:205.00` | 202.50, 90.00 |
| `signal_house` | lamp, load 3, **target** | building `block:5:0\|outer\|+z\|45,12`, by its drop from `pole:x:1:hi:230.00` | 227.50, 65.00 |
| `br_h` | breaker, **closed at the start** | pole `pole:x:2:hi:162.50` (crossing, block:3:2, -z side) | 162.50, 115.75 |
| `homes` | lamp, load 2, priority | building `block:3:2\|outer\|+x\|32,26`, by its drop from `pole:z:5:lo:132.50` | 165.00, 132.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `fb` | 2 spans: 1 cross, 1 corner (over `z:3`) | 26.05 |
| `l_w1` | `fb` → `br_f` | 2 spans: 2 along (along `x:0`) | 23.33 |
| `l_w2` | `br_f` → `j_m` | 2 spans: 1 along, 1 corner (along `x:0`) | 21.21 |
| `l_in` | `east` → `cell` | 3 spans: 1 cross, 1 corner, 1 along (over `z:6`, along `x:0`) | 38.55 |
| `l_c` | `cell` → `j_m` | 5 spans: 3 along, 1 corner, 1 cross (along `x:0`, over `z:5`) | 63.55 |
| `l_sp` | `j_m` → `sp` | 1 span: 1 along (along `z:5`) | 10.83 |
| `l_brick` | `sp` → `brickworks` | drop | — |
| `l_road` | `sp` → `j_t` | 5 spans: 5 along (along `z:5`) | 54.17 |
| `l_east` | `j_t` → `r_2` | 3 spans: 1 cross, 1 corner, 1 along (over `z:5`, along `x:1`) | 38.55 |
| `l_soap` | `r_2` → `soap_works` | drop | — |
| `l_sig` | `r_2` → `signal_house` | 2 spans: 2 along (along `x:1`) + drop | 25.00 |
| `l_south` | `j_t` → `br_h` | 3 spans: 1 along, 1 corner, 1 cross (along `z:5`, over `x:2`) | 26.05 |
| `l_south2` | `br_h` → `homes` | 2 spans: 1 corner, 1 along (along `z:5`) + drop | 19.55 |

Faults (1): `f_east`, a break on the first span of `l_east`, where the target's wire crosses `z:5`. It is dark at the start behind the spring's second position.

**The picture.** Along the top, two wires come in from opposite sides and meet at `3:0`'s north-east corner (`j_m`).

- **From the west, West's:** the **fuse box**, then the **breaker `br_f`**, open. This is the door.
- **From the east, East's:** it runs twenty metres and ends in **the cell**. From the cell a wire runs on west along `5:0`'s north street, over `z:5`, to the same corner. East's current never passes the cell.

From the corner one wire goes south, one pole, to **the spring**, which rests on the **brickworks**, on its own pole. Thrown, the spring sends whatever reaches it down `3:0`'s east street to a pole two thirds of the way down (`j_t`). Two wires leave that pole:

- **east, over `z:5`,** broken on that span; then along the street between `5:0` and `5:1`: the **relay `r_2`**, which rests on the **soap works**, on its own pole; thrown, two poles on, the **signal house**;
- **south,** sound: round `3:0`'s corner and over `x:2` to a **breaker `br_h`** on `3:2`'s corner pole, closed, and past it the tribe's **homes**.

**The street crossings between blocks:** `5:0` to `3:0` over `z:5` at the north end (`l_c`, the cell's wire); `3:0` to `5:1` over `z:5` at `j_t` (`l_east`, the target's wire, and its break is on this span); `3:0` to `3:2` over `x:2` (`l_south`, the homes' wire, into `br_h`).

**No breaker, spring, relay, battery or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb` | `pole:x:0:hi:127.50` | 2 spans, both its own (`l_w0`, the corner span in; `l_w1` out to `x:0:hi:139.17`); no drop |
| `br_f` | `pole:x:0:hi:150.83` | 2 spans, both its own (`l_w1` in, `l_w2` out to `x:0:hi:162.50`); no drop |
| `cell` | `pole:x:0:hi:230.00` | 2 spans: its input (`l_in`, in from `x:0:hi:242.50`) and its one far-side line (`l_c`, out to `x:0:hi:220.50`); no drop |
| `sp` | `pole:z:5:lo:38.33` | its own three wires and nothing else: along from the north (`l_sp`), the brickworks' drop (`l_brick`, position 0), along south (`l_road`, position 1). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `r_2` | `pole:x:1:hi:205.00` | its own three wires and nothing else: along from the west (`l_east`), the soap works' drop (`l_soap`, position 0), along east (`l_sig`, position 1) |
| `br_h` | `pole:x:2:hi:162.50`, `3:2`'s crossing pole | 2 spans, both its own (`l_south`, the crossing of `x:2` in; `l_south2`, the corner span out); no drop |

Scenery (section S), 16 buildings: 1 on West's wire before the box (always on West); 1 between the box and the door (always under the box); 1 between the door and the corner; 3 on the cell's wire along `5:0`'s north street; 2 on the spring's road and 1 at `j_t`; 2 on the target's wire past its break; 2 between the relay and the signal house; 2 on the homes' wire before `br_h` and 1 past it.

## The window, and what is done in it

There is one clock on this map: the cell's sixteen seconds, from the release.

| When | What lights what | What only this time allows |
| --- | --- | --- |
| **Before the release** | West: three houses, as far as the door. East: nothing but the cell's input | `br_h` can be opened now (a breaker moves in the dark). Nothing else: the door is red; the spring and the relay are dead |
| **The cell's 16 s** | The cell lights the corner, the spring and whatever the spring points at. None of it is a load on anything | **Throw the spring** (it is live only now). **Read the break; mend it.** **Throw `r_2`** (live only through the mend, and safely only now). **Close the door** while the spring is still held |
| **After it** | West holds the spring, the road and the signal house | Nothing more is needed |

If the sixteen seconds run out first, the spring falls back to the brickworks. The mend, the relay and `br_h` stay as they were. The cell fills again from East in sixteen seconds, and the second window needs only the release, the spring and the door.

## The intended read from the default camera

The camera opens on all four blocks. **The signal house is right of centre, on the street between `5:0` and `5:1`, dark.** West's pole is off the top-left corner, East's off the top-right.

1. Three houses are lit at the top left, as far as an open breaker. Everything else is dark. **`br_f` reads +18, red, naming the fuse box**: 19 on a box rated 17. Follow the wire: round the corner the first thing on it is a switch with a coiled ribbon, resting on the **brickworks**. In hand: a wire and a fuse.
2. A spring, and dead: it can be thrown only while something lights it, and the only thing West can light it with brings the brickworks. But a second wire reaches that corner, from the right: **the cell's**, full, 16 s.
3. A cell's light is not a win. So the cell throws the spring, and then West has to take it, by the door, before the cell lets go. Sixteen seconds, and whatever West meets when the door closes, the box has to carry.
4. **Release the cell.** The top of `5:0` lights, the corner, and the brickworks, on the cell. **Throw the spring.** The brickworks goes dark; `3:0`'s east street lights to a pole where the wire forks. South, the light runs on round the corner and over the street: three houses and the tribe's **homes** glow. East, a **spark**. `br_f` reads **+12, white**.
5. **Mend the spark.** The cell's light crosses the street and stops at a relay, and beside it the **soap works** burns. `br_f` is **red: +21**.
6. That is what the cell's light is for. **Throw `r_2`**, now, while it costs nothing: the soap works goes dark and the signal house glows, on the cell. But `br_f` is **still red: +19**, 20 on 17. The road is carrying something the box has no room for.
7. It is the other wire off the fork: the homes and a house, 3, past a breaker on `3:2`'s corner. The box has room for the signal house or for them. **Open `br_h`.** The homes go dark. `br_f` reads **+16, white**.
8. **Close `br_f`**, with a second left on the cell. West's current comes round the corner to a spring already thrown, and holds it. The signal house burns on West. The box 17 of 17, West 18 of 18. **Win.**

At a click every three seconds that road closes the door at 15 s of 16. A player who has read the fork before releasing opens `br_h` first, in the dark, and closes the door at 12 s.

**Hidden at the start (2 facts):** the break on the target's wire, shown by the cell's light when the spring is thrown; and that the door is red for a second reason. At the start `br_f`'s red is the brickworks; the homes' wire is dark and is not in that number. It shows only once the spring is thrown and the relay set, as a red that should have turned white.

## The trap

**The spring is thrown and the door reads white: let West in now, and the mend that follows puts the soap works on it.**

It looks like the careful move: take the spring while the cell is fresh. West then holds the spring, the road and the homes' wire, 14 of 18. But now the spark reads **+9, red, naming the box**: past it the relay rests on the soap works, and whatever the wire joins, West carries. Mended on that red, the box blows; a bolt runs from the soap works back up the street; West's side is dark.

**It is readable** before the mend (the spark's number turned from +0 white to +9 red when the door closed) and after it (the ✕, and the soap works burning on the cell if the cell is still held).

**It is recovered by a part, or by a switch.** By a part: the cell is usually still holding the spring, so throw `r_2` under its light, open `br_h`, and fit the spare fuse. By a switch, before the blow: with the cell released again, open the door, mend and throw under the cell, open `br_h`, and close the door.

Three more, each readable, each recoverable:

- **The door first.** +18, red. The box blows on the brickworks. Recovered by the spare fuse, fitted at the end instead of closing the door: the fuse is then the hand-over. **Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"): fitted at once, on the prompt's warning (*would blow again: 19 load on ≤17*), it blows the same way; one Undo returns it.
- **The relay set, and the door closed on its red.** The road is right and the homes' wire is still on it: +19, red, 20 on 17. The box blows with the signal house glowing on the cell. Recovered by a switch and a part: open `br_h`, and fit the spare fuse while the cell still holds the spring.
- **The cell run flat.** Dawdle, and the spring falls back as the cell goes out. Nothing is lost that was set. Recovered by **a wait**: sixteen seconds, and a second release.

## Why each block

| Block | Why the solve needs it |
| --- | --- |
| `block:3:0` | **The door** (the box and `br_f`) on its north street, **the spring and the brickworks** on its east street, and the pole where the road forks. Three of the six clicks are here |
| `block:5:0` | **The cell**, on its north street, and East's wire into it. The release is here, and the cell's seconds are read here: they are the clock every other move is made against. The signal house is one of its buildings |
| `block:5:1` | **The relay and the soap works**, across the street from the fork. One click, and the fact the hand-over turns on: what West would meet |
| `block:3:2` | **`br_h` and the tribe's homes.** One click, made here and nowhere else: the breaker that takes the homes' wire off the road. What it sheds is read here too: the homes and a house glow on the cell past it |

## Layers

**Read first, and not a layer** (it has no move): the door is red. `br_f` +18, the spring rests on the brickworks, and a spring cannot be thrown dead. West cannot do this alone.

| # | Layer | The read | The move or moves | Begins on | Finished, or undone, on | Hands to the next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **The cell throws it and holds it** | The cell's wire reaches the corner; 16 s | release; throw the spring | `5:0` (the cell) | `3:0` (the spring) | A lit road, and a clock |
| 2 | **The lantern** | The cell's light stops at a break on the wire east | mend it | `3:0` (the fork) | `5:1` (the light crosses) | The cell's light on the relay |
| 3 | **What West would meet** | Past the mend the soap works burns on the cell; `br_f` reads +21 red | throw `r_2`, under the cell's light | `5:1` | `3:0` (the door's number falls) | A road with the target on it |
| 4 | **The homes' wire** | `br_f` is still red, +19, with the relay set; the homes glow on the cell at the end of the other wire | open `br_h` | `3:2` (the breaker, the homes) | `3:0` (the door reads white) | A road the box can carry |
| 5 | **The hand-over** | The cell's seconds; the spring thrown; the door white | close `br_f` before the cell runs flat | `5:0` (the cell's seconds) | `3:0` (the door, the spring) | The win |

Five layers, each with its own read and its own move; all five cross blocks, and every block is on at least one. Layer 5 is undone on `5:0` by time (the cell goes out and the spring falls); layer 3 is undone on `5:1` by the mend made under West (the trap); layer 4, skipped, undoes layer 5 on `3:0` (the box blows).

## What it builds on, and its depth of read

- **18's rule with the roles changed.** There a second feed had to reach the spring before the first let go. Here the first holder is a cell, which lets go by itself, and the second cannot arrive early without meeting what the first has not yet set.
- **19's lesson, with a deadline.** "Let the feed in last" was free in 19: the relay kept its place. A spring does not, so "last" has to come before the cell is flat.
- **21:** the charge comes from one side of the map and is spent for the other; and things are set in one cell's window, each reached through the one before it.
- **17:** the relay keeps its place, which is why a flat cell costs only a wait.
- **3:** the box has room for the priests' building or for the tribe's, and the player chooses, under a clock.
- **8, 16:** one number, on the door, is the dial: red, white, red, red, white.
- **Depth of read: 12.** Before the first move that can't be taken back (the release: the charge is not undoable) the player must hold: (1) the signal house's wire is dark behind a spring; (2) the spring rests on the brickworks, 14; (3) West's box cannot carry that: the door is red; (4) a spring is thrown only while live, and falls back in the dark; (5) the cell's wire reaches the spring without passing the box, and its light trips nothing; (6) the cell's light wins nothing and lasts 16 s, so West must take the spring while the cell still holds it; (7) whatever is on the spring's road when the door closes, the box must carry; (8) the road is dark past the spring, so what is on it has to be found by the cell's light before the door closes, not after; (9) so the door is the last click, and everything else goes before it; (10) what can be mended or thrown under the cell's light costs nothing, and the same move under West costs its load; (11) the road forks, and the box has room for one wire's buildings, not both: the homes' breaker opens before the door; (12) a flat cell drops the spring but not what was set. Puzzle 23 asks for 10.

## The numbers (section V) and the cell's cue

- **`br_f` is the dial.** At the start **+18 red** (blows `fb`: three houses on the cell's wire, a house, the brickworks). Spring thrown: **+12 white**. Spark mended: **+21 red** (the soap works). `r_2` thrown: **+19 red** (the homes' wire: 20 on 17). `br_h` open: **+16 white**.
- **Under the cell's light every other number reads +0:** the spring, the spark, the relay, `br_h`. Nothing is flagged, because nothing is a load. With West in early, the spark reads **+9 red, blows `fb`**, and `br_h` reads −3.
- **BC's battery cue:** the cell's seconds on the cell, and on hover the wires its release would light: the corner, the spring and the brickworks' drop.
- West's limit never shows on its own: the box (17) is one under the feed (18), and the box's bar is on the city.

## The tribe's homes

`homes` (priority, load 2) is on `3:2`, at the end of the south wire, past `br_h`. It is dark at the start. It glows on the cell when the spring is thrown. **It is dark at the win, and the player puts it out:** the box has room for the signal house, 3, or for the homes and the house beside them, 3, and the priests asked for the signal house.

## Changed from the plan's row

- **Kept:** battery, spring and a hidden break; the hand-over with a clock; the row's trap, word for word: "bringing the feed in as soon as the spring is set looks safe; the mend that follows joins the heavy building to it"; two breakers.
- **Changed:** two feeds, not one: the district has no ring of poles, so the cell cannot sit beside the feed's own road; East fills the cell and does nothing else. A relay replaces the row's plain switch (it must be set by the cell, and keep its place). The kit is a wire and a spare fuse (the row: 2 wires, fuse).
- **Changed in the rework** (review round 1): the homes' wire was broken, a second spark to pass over, and nothing was clicked on `3:2`. It is now sound, with a breaker `br_h` on `3:2`'s corner, and must be shed before the hand-over. That is a fifth layer with its own read and move. To keep the door red at the start with the larger box, the brickworks went from 12 to 14; the cell from 14 s to 16 s, so that the road as it is discovered (six clicks, the breaker fifth) still fits at a click every three seconds.
- **Dropped in the rework, for Josh:** the lantern's "passed over" half (two sparks, one wire). The lantern is still a layer here, spent on; 25 has it too.
- **Size:** 1 / wire, fuse / battery, 1 spring, 1 relay, 2 breakers, 1 fuse box, 2 feeds; 4 blocks.

## Limits passed

None. 6 clicks, 2 hidden facts, 1 fault, 4 own buildings (brickworks, soap works, signal house, homes), 4 blocks.

## Series rules

- **Reuse is free.** A blow is the trap, and "fit it and it blows again" is a designed trap, named above and readable before the fit.
- **Wins at `--click-seconds 3` in the same fewest clicks:** yes, 6 (below).
- **Kit: wire, fuse.** Puzzle 23's is wire, 3 bulbs, fuse. **Puzzle 25's must not be a wire and a fuse.**
- **Heavy building: the brickworks** (load 14), with the soap works (7). Puzzle 23's is the cooperage. **Puzzle 25's must not be the brickworks.**
- **Shrine count: 3 of 5.** No shrine here.
- District `block:3:0`, `block:5:0`, `block:5:1`, `block:3:2`. `block:5:0`, `block:5:1` and `block:3:2` have not been used by the series; `block:3:0` was puzzle 4's district and half of puzzle 13's. It shares no block with puzzle 23. West's pole is on `block:0:0`'s pavement and East's on `block:6:0`'s, both outside the district. **Puzzle 25 must use none of these four.**
- **Districts used by 1 to 24**, none to be a district again: the 23 listed in `s23-the-priests-list.md`, and now `block:3:0` + `block:5:0` + `block:5:1` + `block:3:2`. Blocks no series puzzle has used: `block:8:5`, `block:0:7`, `block:5:7`, `block:8:8`, `block:5:10`.

## Expected numbers

`npm run analyze puzzles/city/s24-hold-the-spring.city.json`, at 1 s a click (the default) and at `--click-seconds 3`; `--wait` and `--cap` unchanged:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 3,584, exhaustive | 3,120, exhaustive |
| Time on Josh's PC | 19 s | 15 s |
| Solvable | yes | yes |
| Fewest clicks | **6** | **6** |
| Waits on the shortest win | 0 | 0 |
| One shortest win | `cell`, `sp`, `br_h`, `repair:l_east`, `r_2`, `br_f` | the same |
| Winning click orders | 5 | 5 |
| Winning configurations | **1** (the spring and `r_2` thrown, `br_f` closed, `br_h` open, the break mended) | **1** |
| Parts used | wire (1 of 2; the fuse is the spare) | wire |
| Feeds at the shortest win | West 18 of 18, East 0 of 1 | the same |
| Fuses that blow on a shortest win | none | none |
| Fuses that blow on some move | `fb` | `fb` |
| First moves | `cell`, `br_f`, `br_h` | the same |
| Dead-end states | 1,092 of 3,584 (30.5%) | 948 of 3,120 (30.4%) |
| First moves that lead only to dead ends | none | none |
| Hidden at the start | 2: the break, and the door's second red | |

The five winning orders are one road with `br_h` in each of its five places before the door: a breaker moves in the dark, so it can be opened before the release or at any point under the cell. The other five clicks are in one order. At 3 s a click, with `br_h` fifth: the release at 0 s, the spring at 3 s, the mend at 6 s, the relay at 9 s, `br_h` at 12 s and the door at 15 s, with 1 s on the cell.

**No win without the hold.** The spring is dead until something lights it. West cannot (the door blows the box on the brickworks), so the cell throws it; the cell's light is no win, so West must come in; and West coming in to a fallen spring is the door on its red again. Every win closes the door, or fits the fuse, while the cell is holding the spring. **No win with the homes' wire on:** 20 on the box's 17.

Loads, replayed on the conversion: start West 2 of 18 (`fb` 1 of 17); under the cell nothing changes on West; the door 18 of 18, `fb` 17 of 17, win. The traps: 19 on the box's 17 (the door first); 22 on 17 (the mend under West); 20 on 17 (the door with the homes' wire on).

**The obvious wrong first move** is the door: read by its red +18 and the box it names, and recovered by the spare fuse. **Undo does not recover a spent cell** (time is not undoable); a wait of sixteen seconds does. The dead-end states are those with the box blown twice. The check block replays the door first, the fuse fitted at once, the door before the mend, the door with the homes' wire on, and the cell run flat.

**Where it stands against 23:** it reads deeper (12 facts against 10) and has far fewer winning click orders (5 against 228). Its share of dead-end states is lower (30.5% against 37.7%): the one part that can be wasted is the fuse. It takes a click fewer (6 against 7); five of the six are in one order, and four of them are against a clock.

Time on the intended road: 12 to 15 s from the release. A player who lets the cell run out wins in the second window, at about 40 s.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["cell", "sp", "repair:l_east", "r_2", "br_h", "br_f"],
  "traps": [
    { "name": "the door first, on its red",
      "moves": ["br_f"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["br_h", "cell", "sp", "repair:l_east", "r_2", "repair:fb"] },
    { "name": "fit it and it blows again",
      "moves": ["br_f", "repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["undo", "br_h", "cell", "sp", "repair:l_east", "r_2", "repair:fb"] },
    { "name": "the feed let in as soon as the spring is set, and then the mend",
      "moves": ["cell", "sp", "br_f", "repair:l_east"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "lit": ["soap_works"], "complete": false },
      "recover": ["r_2", "br_h", "repair:fb"] },
    { "name": "the relay set, the door closed, and the homes still on the wire",
      "moves": ["cell", "sp", "repair:l_east", "r_2", "br_f"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "lit": ["homes", "signal_house"], "complete": false },
      "recover": ["br_h", "repair:fb"] },
    { "name": "the cell runs flat before the hand-over",
      "moves": ["cell", "sp", "repair:l_east", "r_2", "wait:14"],
      "expect": { "complete": false },
      "recover": ["wait:16", "br_h", "cell", "sp", "br_f"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds all four blocks (120 m by 140 m), both feeds' poles off the top corners, and the signal house.
- The cell (top right) shows full, and its seconds while released. Its hover cue lights `5:0`'s north street, the corner and the brickworks' drop.
- The spring's coiled ribbon reads, one pole south of the corner, with the brickworks on its pole. The corner pole (`j_m`) and the spring's pole are 11 m apart.
- **The fork** (`j_t`): the spark on the span east over the street, and the sound wire south. With the spring thrown on the cell, the south wire is seen lit to the homes.
- **`br_h`** on `3:2`'s corner pole, across `x:2` from `3:0`'s south-east corner: it reads as a breaker on the homes' wire, and its icon is clear of the corner pole 6.5 m north of it.
- The box and the door are 23 m apart on `3:0`'s north street; the box's bar and the door's number both read.
- The signal house is a building of `5:0` fed from `5:1`'s pole across the street: check that its drop and its gold icon read as one.

## To watch when Josh plays it

- **Only in the HUD:** nothing the solve needs. West's 18 is the box's 17 and a house; East's 1 is never used. Both are HUD lines that say nothing; if "East 0 of 1" reads as a fault, East wants a different fiction (a charging post).
- Whether the hold is felt as a hold. Does he see the spring fall when a cell runs out, or does he close the door early because the number is white?
- Whether the door's number is watched as the dial (+18, +12, +21, +19, +16), or only its colour.
- Whether the second red sends him to `3:2`. The door is red with the relay set, and nothing is flagged on the homes' wire: `br_h` reads +0 under the cell. He has to ask what else the road is carrying.
- Whether sixteen seconds is right. The road as discovered is six clicks at his pace with a second over. If he is rushed, 18; if he never feels the clock, 14.
- Whether he reads before releasing. The release is the only move that cannot be taken back, and it is the first click.
- Whether putting out the tribe's homes by his own hand, to light the priests' signal house, is noticed.
- Whether a cell fed by a feed that carries nothing reads as sensible.

## What it taught us
