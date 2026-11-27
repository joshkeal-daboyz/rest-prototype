# 24 · Hold the spring — design note (series v1, puzzle 24)

A new puzzle designed on the city (ticket 081 section N5; `puzzles/series-v1.md`, row 24). It has no schematic and no `from`. Four blocks, two feeds, and a cell between them.

- **New concept: a cell's light holds a spring, and a feed must take it over before the cell runs flat.** The spring stays thrown only while something lights it. The cell can throw it, and can hold it for fourteen seconds. The feed can hold it for good, but cannot throw it.
- **The reasoning move:** a hand-over against a clock. Everything the feed must not meet is set by the cell's light first, in the order the light reaches it, and the feed is let in last, while the cell is still holding. Let it in early and the next mend puts a heavy building on it; let it in late and the spring has fallen.
- **Builds on:** 18 (a spring is thrown only live and falls back in the dark; make before break), 19 (a cell's light sets what the feed can't reach safely, trips no fuse and wins nothing; time is not undoable), 21 (a cell filled from one side and spent on the other; things set in one cell's window, in order), 17 (a relay keeps its place in the dark), 8 and 16 (a rated box; the red names it), 5 (one wire, two sparks).
- **Carries from N4's hand-on list:** a spring held by a battery; and the lantern, as a layer: the cell's light shows two hidden breaks, one to spend the wire on and one to pass over, and then shows what is behind the one it mended.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:3:0`, `block:5:0`, `block:5:1`, `block:3:2`**: `3:0` north-west, `5:0` north-east and `5:1` south-east of it across `z:5`, `3:2` south of it across `x:2`. 120 m wide, 140 m deep.
- **West** stands on `block:0:0`'s pole `pole:z:3:lo:27.50`, across `z:3` from `3:0`'s north-west corner. **East** stands on `block:6:0`'s pole `pole:z:6:hi:27.50`, across `z:6` from `5:0`'s north-east corner. One entering span each.
- **West 16, East 1.** `fb` rated **15**. Own numbers 3, 1 and 3, raised once by `npm run fit -- --raise` for the 16 scenery buildings. East carries nothing: all it does is fill the cell.
- **The cell**: capacity 14 s, full at the start. Its input is East's wire.
- Target: `signal_house` (a building of `block:5:0`, on the street between `5:0` and `5:1`). Priority: `homes`. Parts: **wire, fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed, 16 | pole `pole:z:3:lo:27.50` (end, block:0:0, +x side) | 104.25, 27.50 |
| `east` | feed, 1 | pole `pole:z:6:hi:27.50` (end, block:6:0, -x side) | 265.75, 27.50 |
| `fb` | fuse box | pole `pole:x:0:hi:127.50` (end, block:3:0, -z side) | 127.50, 20.75 |
| `br_f` | breaker, open at the start | pole `pole:x:0:hi:150.83` (slot, block:3:0, -z side) | 150.83, 20.75 |
| `cell` | battery, 14 s, full; input `l_in` | pole `pole:x:0:hi:230.00` (slot, block:5:0, -z side) | 230.00, 20.75 |
| `j_m` | junction | pole `pole:z:5:lo:27.50` (end, block:3:0, +x side) | 169.25, 27.50 |
| `sp` | spring switch, position 0 `l_brick`, 1 `l_road`; set 0 | pole `pole:z:5:lo:38.33` (slot, block:3:0, +x side) | 169.25, 38.33 |
| `brickworks` | lamp, load 12 | building `block:3:0/a\|outer\|+x\|32,6`, by its drop from `pole:z:5:lo:38.33` | 165.00, 37.50 |
| `j_t` | junction | pole `pole:z:5:lo:92.50` (landing, block:3:0, +x side) | 169.25, 92.50 |
| `r_2` | relay, position 0 `l_soap`, 1 `l_sig`; set 0 | pole `pole:x:1:hi:205.00` (slot, block:5:1, -z side) | 205.00, 85.75 |
| `soap_works` | lamp, load 7 | building `block:5:1/built\|outer\|-z\|39,18`, by its drop from `pole:x:1:hi:205.00` | 202.50, 90.00 |
| `signal_house` | lamp, load 3, **target** | building `block:5:0\|outer\|+z\|45,12`, by its drop from `pole:x:1:hi:230.00` | 227.50, 65.00 |
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
| `l_south` | `j_t` → `homes` | 5 spans: 2 along, 2 corner, 1 cross (along `z:5`, over `x:2`) + drop | 45.59 |

Faults (2): `f_east`, a break on the first span of `l_east`, where the target's wire crosses `z:5`; `f_south`, a break on the first span of `l_south`, the homes' wire. Both leave the same pole (`j_t`), and both are dark at the start behind the spring's second position.

**The picture.** Along the top, two wires come in from opposite sides and meet at `3:0`'s north-east corner (`j_m`).

- **From the west, West's:** the **fuse box**, then the **breaker `br_f`**, open. This is the door.
- **From the east, East's:** it runs twenty metres and ends in **the cell**. From the cell a wire runs on west along `5:0`'s north street, over `z:5`, to the same corner. East's current never passes the cell.

From the corner one wire goes south, one pole, to **the spring**, which rests on the **brickworks**, on its own pole. Thrown, the spring sends whatever reaches it down `3:0`'s east street to a pole two thirds of the way down (`j_t`). Two wires leave that pole, and both are broken at it:

- **east, over `z:5`,** then along the street between `5:0` and `5:1`: the **relay `r_2`**, which rests on the **soap works**, on its own pole; thrown, two poles on, the **signal house**;
- **south,** round `3:0`'s corner and over `x:2` to the tribe's **homes** on `3:2`.

**The street crossings between blocks:** `5:0` to `3:0` over `z:5` at the north end (`l_c`, the cell's wire); `3:0` to `5:1` over `z:5` at `j_t` (`l_east`, the target's wire, and its break is on this span); `3:0` to `3:2` over `x:2` (`l_south`, the homes' wire).

**No breaker, spring, relay, battery or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb` | `pole:x:0:hi:127.50` | 2 spans, both its own (`l_w0`, the corner span in; `l_w1` out to `x:0:hi:139.17`); no drop |
| `br_f` | `pole:x:0:hi:150.83` | 2 spans, both its own (`l_w1` in, `l_w2` out to `x:0:hi:162.50`); no drop |
| `cell` | `pole:x:0:hi:230.00` | 2 spans: its input (`l_in`, in from `x:0:hi:242.50`) and its one far-side line (`l_c`, out to `x:0:hi:220.50`); no drop |
| `sp` | `pole:z:5:lo:38.33` | its own three wires and nothing else: along from the north (`l_sp`), the brickworks' drop (`l_brick`, position 0), along south (`l_road`, position 1). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `r_2` | `pole:x:1:hi:205.00` | its own three wires and nothing else: along from the west (`l_east`), the soap works' drop (`l_soap`, position 0), along east (`l_sig`, position 1) |

Scenery (section S), 16 buildings: 1 on West's wire before the box (always on West); 1 between the box and the door (always under the box); 1 between the door and the corner; 3 on the cell's wire along `5:0`'s north street; 2 on the spring's road and 1 at `j_t`; 2 on the target's wire past its break; 2 between the relay and the signal house; 3 on the homes' wire past its break (never lit on a win).

## The window, and what is done in it

There is one clock on this map: the cell's fourteen seconds, from the release.

| When | What lights what | What only this time allows |
| --- | --- | --- |
| **Before the release** | West: three houses, as far as the door. East: nothing but the cell's input | Nothing. The door is red; the spring and the relay are dead |
| **The cell's 14 s** | The cell lights the corner, the spring and whatever the spring points at. None of it is a load on anything | **Throw the spring** (it is live only now). **Read the two breaks; mend the target's.** **Throw `r_2`** (live only through the mend, and safely only now). **Close the door** while the spring is still held |
| **After it** | West holds the spring, the road and the signal house | Nothing more is needed |

If the fourteen seconds run out first, the spring falls back to the brickworks. The mend and the relay stay as they were. The cell fills again from East in fourteen seconds, and the second window needs only the release, the spring and the door.

## The intended read from the default camera

The camera opens on all four blocks. **The signal house is right of centre, on the street between `5:0` and `5:1`, dark.** West's pole is off the top-left corner, East's off the top-right.

1. Three houses are lit at the top left, as far as an open breaker. Everything else is dark. **`br_f` reads +16, red, naming the fuse box**: 17 on a box rated 15. Follow the wire: round the corner the first thing on it is a switch with a coiled ribbon, resting on the **brickworks**. In hand: a wire and a fuse.
2. A spring, and dead: it can be thrown only while something lights it, and the only thing West can light it with brings the brickworks. But a second wire reaches that corner, from the right: **the cell's**, full, 14 s.
3. A cell's light is not a win. So the cell throws the spring, and then West has to take it, by the door, before the cell lets go. Fourteen seconds, and whatever West meets when the door closes, the box has to carry.
4. **Release the cell.** The top of `5:0` lights, the corner, and the brickworks, on the cell. **Throw the spring.** The brickworks goes dark; `3:0`'s east street lights to a pole with **two sparks** on it, one on the wire east and one on the wire south. `br_f` reads **+7, white**.
5. One wire. The signal house is east. **Mend the east spark.** The cell's light crosses the street and stops at a relay, and beside it the **soap works** burns. `br_f` is **red again: +16**.
6. That is what the cell's light is for. **Throw `r_2`**, now, while it costs nothing: the soap works goes dark and the signal house glows, on the cell. `br_f` reads **+14, white**.
7. **Close `br_f`**, with seconds left on the cell. West's current comes round the corner to a spring already thrown, and holds it. The signal house burns on West. The box 15 of 15, West 16 of 16. **Win.**

A player who reads all of it before the release wins with a couple of seconds on the cell: at a click every three seconds the door closes at 12 s of 14.

**Hidden at the start (2 facts):** the two breaks at `j_t`, both shown by the cell's light when the spring is thrown. Besides them, the relay and what it rests on are dark until the east break is mended: the soap works is not a fault, and the cell's light is how it is first seen lit.

## The trap

**The spring is thrown and the door reads white: let West in now, and the mend that follows puts the soap works on it.**

It looks like the careful move: take the spring while the cell is fresh. West then holds the spring and the road as far as the two sparks, 9 of 16. But now the east spark reads **+9, red, naming the box**: past it the relay rests on the soap works, and whatever the wire joins, West carries. Mended on that red, the box blows; a bolt runs from the soap works back up the street; West's side is dark.

**It is readable** before the mend (the spark's number turned from +0 white to +9 red when the door closed) and after it (the ✕, and the soap works burning on the cell if the cell is still held).

**It is recovered by a part, or by a switch.** By a part: the cell is usually still holding the spring, so throw `r_2` under its light and fit the spare fuse. By a switch, before the blow: with the cell released again, open the door, mend and throw under the cell, and close the door.

Three more, each readable, each recoverable:

- **The door first.** +16, red. The box blows on the brickworks. Recovered by the spare fuse, fitted at the end instead of closing the door: the fuse is then the hand-over. **Fit it and it blows again** (a designed trap, NB-Q2: "Allow it too"): fitted at once, on the prompt's warning (*would blow again: 17 load on ≤15*), it blows the same way; one Undo returns it.
- **The wire in the homes' spark.** Under the cell's light both sparks read +0, white. The homes are the tribe's, and dark. Mended, their wire lights on the cell, three houses and the homes, and the target's wire is still broken with no wire in hand. Recovered by **one Undo**; the state says why (the east spark still sparking, the kit empty of wire).
- **The cell run flat.** Dawdle, or leave the door for last by more than a couple of seconds, and the spring falls back as the cell goes out. Nothing is lost that was set. Recovered by **a wait**: fourteen seconds, and a second release.

## Why each block

| Block | Why the solve needs it |
| --- | --- |
| `block:3:0` | **The door** (the box and `br_f`) on its north street, **the spring and the brickworks** on its east street, and the pole with the two sparks. Three of the five clicks are here |
| `block:5:0` | **The cell**, on its north street, and East's wire into it. The release is here, and the cell's seconds are read here: they are the clock every other move is made against. The signal house is one of its buildings |
| `block:5:1` | **The relay and the soap works**, across the street from the sparks. The fourth click, and the fact the hand-over turns on: what West would meet |
| `block:3:2` | **The tribe's homes**, at the end of the other broken wire. Nothing is clicked here: it is the spark to pass over |

## Layers

| # | Layer | The read | The move or moves | Begins on | Finished, or undone, on | Hands to the next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **The door is red** | `br_f` +16 red; the spring rests on the brickworks; a spring can't be thrown dead | none: West cannot do this alone | `3:0` | `3:0` | "Something else must light the spring" |
| 2 | **The cell throws it and holds it** | The cell's wire reaches the corner; 14 s | release; throw the spring | `5:0` (the cell) | `3:0` (the spring) | A lit road, and a clock |
| 3 | **The lantern: two sparks, one wire** | The cell's light stops at two breaks on one pole: east to the signal house, south to the homes | mend the east one; pass over the south one | `3:0` (the pole) | `5:1` (the light crosses), and `3:2` (the homes stay dark) | The cell's light on the relay |
| 4 | **What West would meet** | Past the mend the soap works burns on the cell; `br_f` is red again | throw `r_2`, under the cell's light | `5:1` | `3:0` (the door reads white) | A road the box can carry |
| 5 | **The hand-over** | The cell's seconds; the spring thrown; the door white | close `br_f` before the cell runs flat | `5:0` (the cell's seconds) | `3:0` (the door, the spring) | The win |

Five layers; four cross blocks (2 to 5), and every block is on at least one of those. Layer 5 is undone on `5:0` by time (the cell goes out and the spring falls); layer 4 is undone on `5:1` by the mend made under West (the trap).

## What it builds on, and its depth of read

- **18's rule with the roles changed.** There a second feed had to reach the spring before the first let go. Here the first holder is a cell, which lets go by itself, and the second cannot arrive early without meeting what the first has not yet set.
- **19's lesson, with a deadline.** "Let the feed in last" was free in 19: the relay kept its place. A spring does not, so "last" has to come before the cell is flat.
- **21:** the charge comes from one side of the map and is spent for the other; and three things are set in one cell's window, each reached through the one before it.
- **17:** the relay keeps its place, which is why a flat cell costs only a wait.
- **8, 16:** one number, on the door, is the dial: red, white, red, white.
- **Depth of read: 11.** Before the first move that can't be taken back (the release: the charge is not undoable) the player must hold: (1) the signal house's wire is dark behind a spring; (2) the spring rests on the brickworks, 12; (3) West's box cannot carry that: the door is red; (4) a spring is thrown only while live, and falls back in the dark; (5) the cell's wire reaches the spring without passing the box, and its light trips nothing; (6) the cell's light wins nothing and lasts 14 s, so West must take the spring while the cell still holds it; (7) whatever is on the spring's road when the door closes, the box must carry; (8) the road is dark past the spring, so what is on it has to be found by the cell's light before the door closes, not after; (9) so the door is the last click, and everything else goes between the release and it; (10) what can be mended or thrown under the cell's light costs nothing, and the same move under West costs its load; (11) a flat cell drops the spring but not what was set. Puzzle 23 asks for 10.

## The numbers (section V) and the cell's cue

- **`br_f` is the dial.** At the start **+16 red** (blows `fb`: three houses on the cell's wire, a house, the brickworks). Spring thrown: **+7 white**. East spark mended: **+16 red** (the soap works). `r_2` thrown: **+14 white**.
- **Under the cell's light every other number reads +0:** the spring, both sparks, the relay. Nothing is flagged, because nothing is a load. With West in early, the east spark reads **+9 red, blows `fb`**, and the homes' spark **+5, white**.
- **BC's battery cue:** the cell's seconds on the cell, and on hover the wires its release would light: the corner, the spring and the brickworks' drop.
- West's limit never shows on its own: the box (15) is one under the feed (16), and the box's bar is on the city.

## The tribe's homes

`homes` (priority, load 2) is on `3:2`, at the end of the south wire, behind the second spark. It is dark at the start. **It is dark at the win.** There is one wire, and the priests' building is behind the other break. A player who mends the homes' wire sees them glow on the cell for a few seconds, and cannot then finish the job.

## Changed from the plan's row

- **Kept:** battery, spring and a hidden break; the hand-over with a clock; the row's trap, word for word: "bringing the feed in as soon as the spring is set looks safe; the mend that follows joins the heavy building to it".
- **Changed:** two feeds, not one: the district has no ring of poles, so the cell cannot sit beside the feed's own road; East fills the cell and does nothing else. A relay replaces the row's plain switch (it must be set by the cell, and keep its place). One breaker, not two. The kit is a wire and a spare fuse (the row: 2 wires, fuse), and the second spark is where a second wire would have gone. The lantern (N4's hand-on) is the third layer.
- **Size:** 2 / wire, fuse / battery, 1 spring, 1 relay, 1 breaker, 1 fuse box, 2 feeds; 4 blocks.

## Limits passed

None. 5 clicks (the floor), 2 hidden facts, 2 faults, 4 own buildings (brickworks, soap works, signal house, homes), 4 blocks.

## Series rules

- **Reuse is free.** A blow is the trap, and "fit it and it blows again" is a designed trap, named above and readable before the fit.
- **Wins at `--click-seconds 3` in the same fewest clicks:** yes, 5 (below).
- **Kit: wire, fuse.** Puzzle 23's is wire, 3 bulbs, fuse. **Puzzle 25's must not be a wire and a fuse.**
- **Heavy building: the brickworks** (load 12), with the soap works (7). Puzzle 23's is the cooperage. **Puzzle 25's must not be the brickworks.**
- **Shrine count: 3 of 5.** No shrine here.
- District `block:3:0`, `block:5:0`, `block:5:1`, `block:3:2`. `block:5:0`, `block:5:1` and `block:3:2` have not been used by the series; `block:3:0` was puzzle 4's district and half of puzzle 13's. It shares no block with puzzle 23. West's pole is on `block:0:0`'s pavement and East's on `block:6:0`'s, both outside the district. **Puzzle 25 must use none of these four.**
- **Districts used by 1 to 24**, none to be a district again: the 23 listed in `s23-the-priests-list.md`, and now `block:3:0` + `block:5:0` + `block:5:1` + `block:3:2`. Blocks no series puzzle has used: `block:8:5`, `block:0:7`, `block:5:7`, `block:8:8`, `block:5:10`.

## Expected numbers

`npm run analyze puzzles/city/s24-hold-the-spring.city.json`, at 1 s a click (the default) and at `--click-seconds 3`; `--wait` and `--cap` unchanged:

| | 1 s a click | 3 s a click |
| --- | --- | --- |
| States | 2,164, exhaustive | 1,844, exhaustive |
| Time on Josh's PC | 11 s | 9 s |
| Solvable | yes | yes |
| Fewest clicks | **5** | **5** |
| Waits on the shortest win | 0 | 0 |
| One shortest win | `cell`, `sp`, `repair:l_east`, `r_2`, `br_f` | the same |
| Winning click orders | **1** | **1** |
| Winning configurations | **1** (the spring and `r_2` thrown, `br_f` closed, the east break mended) | **1** |
| Parts used | wire (1 of 2; the fuse is the spare) | wire |
| Feeds at the shortest win | West 16 of 16, East 0 of 1 | the same |
| Fuses that blow on a shortest win | none | none |
| Fuses that blow on some move | `fb` | `fb` |
| First moves | `cell`, `br_f` | `cell`, `br_f` |
| Dead-end states | 1,058 of 2,164 (48.9%) | 906 of 1,844 (49.1%) |
| First moves that lead only to dead ends | none | none |
| Hidden at the start | 2: the two breaks at `j_t` | |

At 3 s a click the release is at 0 s, the spring at 3 s, the mend at 6 s, the relay at 9 s and the door at 12 s, with 2 s on the cell. One winning order at either pace: nothing can be moved.

**No win without the hold.** The spring is dead until something lights it. West cannot (the door blows the box on the brickworks), so the cell throws it; the cell's light is no win, so West must come in; and West coming in to a fallen spring is the door on its red again. Every win closes the door, or fits the fuse, while the cell is holding the spring.

Loads, replayed on the conversion: start West 2 of 16 (`fb` 1 of 15); under the cell nothing changes on West; the door 16 of 16, `fb` 15 of 15, win. The traps: 17 on the box's 15 (the door first, and the mend under West).

**The obvious wrong first move** is the door: read by its red +16 and the box it names, and recovered by the spare fuse. **Undo does not recover a spent cell** (time is not undoable); a wait of fourteen seconds does. The dead-end states are those with the wire in the homes' spark, or the box blown twice. The check block replays the door first, the fuse fitted at once, the door before the mend, the homes' spark, and the cell run flat.

**Where it stands against 23:** it reads deeper (11 facts against 10), has one winning click order against 228, and a larger share of dead-end states (48.9% against 37.7%). It takes fewer clicks (5 against 7): all five are in one order, and four of them are against a clock.

Time on the intended road: 12 s from the release. A player who lets the cell run out wins in the second window, at about 35 s.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["cell", "sp", "repair:l_east", "r_2", "br_f"],
  "traps": [
    { "name": "the door first, on its red",
      "moves": ["br_f"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["cell", "sp", "repair:l_east", "r_2", "repair:fb"] },
    { "name": "fit it and it blows again",
      "moves": ["br_f", "repair:fb"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "complete": false },
      "recover": ["undo", "cell", "sp", "repair:l_east", "r_2", "repair:fb"] },
    { "name": "the feed let in as soon as the spring is set, and then the mend",
      "moves": ["cell", "sp", "br_f", "repair:l_east"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "lit": ["soap_works"], "complete": false },
      "recover": ["r_2", "repair:fb"] },
    { "name": "the wire in the homes' spark",
      "moves": ["cell", "sp", "repair:l_south"],
      "expect": { "lit": ["homes"], "readable": ["f_east"], "complete": false },
      "recover": ["undo", "repair:l_east", "r_2", "br_f"] },
    { "name": "the cell runs flat before the hand-over",
      "moves": ["cell", "sp", "repair:l_east", "r_2", "wait:12"],
      "expect": { "complete": false },
      "recover": ["wait:14", "cell", "sp", "br_f"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds all four blocks (120 m by 140 m), both feeds' poles off the top corners, and the signal house.
- The cell (top right) shows full, and its seconds while released. Its hover cue lights `5:0`'s north street, the corner and the brickworks' drop.
- The spring's coiled ribbon reads, one pole south of the corner, with the brickworks on its pole. The corner pole (`j_m`) and the spring's pole are 11 m apart.
- **The pole with the two sparks** (`j_t`): one spark on the span east over the street, one on the span south. Each reads as its own.
- The box and the door are 23 m apart on `3:0`'s north street; the box's bar and the door's number both read.
- The signal house is a building of `5:0` fed from `5:1`'s pole across the street: check that its drop and its gold icon read as one.

## To watch when Josh plays it

- **Only in the HUD:** nothing the solve needs. West's 16 is the box's 15 and a house; East's 1 is never used. Both are HUD lines that say nothing; if "East 0 of 1" reads as a fault, East wants a different fiction (a charging post).
- Whether the hold is felt as a hold. Does he see the spring fall when a cell runs out, or does he close the door early because the number is white?
- Whether the door's number is watched as the dial (+16, +7, +16, +14), or only its colour.
- Whether fourteen seconds is right. The road is five clicks at his pace with two seconds over. If he is rushed, 16; if he never feels the clock, 12.
- Whether he reads before releasing. The release is the only move that cannot be taken back, and it is the first click.
- Whether the homes' spark takes the wire. Both sparks read +0 under the cell.
- Whether a cell fed by a feed that carries nothing reads as sensible.

## What it taught us
