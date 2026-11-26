# 12 · Draw the line — design note (series v1, puzzle 12)

A new puzzle designed on the city (ticket 081 section N3; `puzzles/series-v1.md`, row 12). It has no schematic and no `from`. **It is the first puzzle with a second feed**, and the second feed is the new thing in it.

- **New concept:** two feeds, two pools. Each building counts against the feed whose wire reaches it; room on one feed is no use to a building on the other. Joined, the two do not pool: every building goes to the nearer feed, and a breaker draws the line between them.
- **The reasoning move:** a full feed with nothing to shed is not a dead end if the other feed can be brought to the target. Decide which buildings should change hands, join the feeds, and open the breaker that puts the line there.
- **Builds on:** 3 (capacity, choose what goes dark), 5 (two wires, three places that ask for one), 6 (open the dark before spending), 8 (red means "not yet": find what shares the limit), 10 (a dead building draws nothing until its bulb goes in), 11 (an open point keeps two loads apart).
- It uses no fuse box, switch, relay, spring, battery, timed breaker or nested fuse.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:7:1` and `block:8:1`**, which touch across `z:8`.
- **West** stands on `block:6:3`'s pole across `z:7` from `block:7:1`'s south-west corner; **East** stands on `block:8:0`'s crossing pole across `x:1` from `block:8:1`'s north-east corner. Each has one entering span.
- West capacity **15**, East capacity **9** (own numbers 6 and 3, raised once by `npm run fit -- --raise` for the 15 scenery buildings the solution lights). The top-level capacity is null, as a two-feed file requires (`version` 5).
- Targets: `smokehouse`, `pump_house`. Priority: `homes`. Parts: **2 wires, 1 bulb**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed "West" | pole `pole:z:7:lo:167.50` (landing, block:6:3, +x side) | 344.25, 167.50 |
| `east` | feed "East" | pole `pole:x:1:lo:482.50` (crossing, block:8:0, +z side) | 482.50, 69.25 |
| `j_c` | junction | pole `pole:x:5:lo:379.17` (slot, block:7:1, +z side) | 379.17, 174.25 |
| `cooper` | lamp, load 1 | building `block:7:1/b\|outer\|+z\|75,33`, by its drop from `pole:x:5:lo:379.17` | 377.50, 170.00 |
| `j_s` | junction | pole `pole:z:8:lo:167.50` (end, block:7:1, +x side) | 409.25, 167.50 |
| `j_y` | junction | pole `pole:z:8:lo:155.00` (slot, block:7:1, +x side) | 409.25, 155.00 |
| `tannery` | lamp, load 1 | building `block:7:1/b\|outer\|+x\|80,30`, by its drop from `pole:z:8:lo:155.00` | 405.00, 152.50 |
| `br_a` | breaker, closed | pole `pole:z:8:lo:130.00` (slot, block:7:1, +x side) | 409.25, 130.00 |
| `j_k` | junction | pole `pole:z:8:lo:117.50` (slot, block:7:1, +x side) | 409.25, 117.50 |
| `smokehouse` | lamp, load 2, **target** | building `block:7:1/b\|outer\|+x\|80,22`, by its drop from `pole:z:8:lo:117.50` | 405.00, 117.50 |
| `br_b` | breaker, closed | pole `pole:z:8:lo:105.50` (slot, block:7:1, +x side) | 409.25, 105.50 |
| `j_n` | junction | pole `pole:z:8:lo:92.50` (end, block:7:1, +x side) | 409.25, 92.50 |
| `br_p` | breaker, open | pole `pole:x:1:hi:390.83` (slot, block:7:1, -z side) | 390.83, 85.75 |
| `pump_house` | lamp, load 3, **target** | building `block:7:1/a\|outer\|-z\|75,18`, by its drop from `pole:x:1:hi:379.17` | 377.50, 90.00 |
| `j_e` | junction | pole `pole:x:1:hi:482.50` (end, block:8:1, -z side) | 482.50, 85.75 |
| `j_h` | junction | pole `pole:z:9:lo:105.00` (slot, block:8:1, +x side) | 489.25, 105.00 |
| `homes` | lamp, load 2 | building `block:8:1/a\|outer\|+x\|96,20`, by its drop from `pole:z:9:lo:105.00` | 485.00, 102.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `j_c` | 3 spans: 1 cross, 1 corner, 1 along (over `z:7`, along `x:5`) | 37.71 |
| `l_coop` | `j_c` → `cooper` | drop | — |
| `l_wc` | `j_c` → `j_s` | 3 spans: 2 along, 1 corner (along `x:5`) | 32.88 |
| `l_wy` | `j_s` → `j_y` | 1 span: 1 along (along `z:8`) | 12.50 |
| `l_tan` | `j_y` → `tannery` | drop | — |
| `l_w1` | `j_y` → `br_a` | 2 spans: 2 along (along `z:8`) | 25.00 |
| `l_w2` | `br_a` → `j_k` | 1 span: 1 along (along `z:8`) | 12.50 |
| `l_smoke` | `j_k` → `smokehouse` | drop | — |
| `l_w3` | `j_k` → `br_b` | 1 span: 1 along (along `z:8`) | 12.00 |
| `l_w4` | `br_b` → `j_n` | 1 span: 1 along (along `z:8`) | 13.00 |
| `l_p0` | `j_n` → `br_p` | 2 spans: 1 corner, 1 along (along `x:1`) | 21.21 |
| `l_pump` | `br_p` → `pump_house` | 1 span: 1 along (along `x:1`) + drop. **Fault `f_p`** on `x:1:hi:379.17~x:1:hi:390.83` | 11.67 |
| `l_e0` | `east` → `j_e` | 1 span: 1 cross (over `x:1`) | 16.50 |
| `l_tie` | `j_e` → `j_n` | 7 spans: 5 along, 1 corner, 1 cross (along `x:1`, over `z:8`). **Fault `f_tie`** on `x:1:hi:427.50~z:8:hi:92.50` | 76.05 |
| `l_e1` | `j_e` → `j_h` | 2 spans: 1 corner, 1 along (along `z:9`). **Fault `f_d`** on `z:9:lo:105.00~z:9:lo:92.50` | 22.05 |
| `l_homes` | `j_h` → `homes` | drop | — |

Faults (4): `f_tie` on `l_tie`, the corner span on `block:8:1` where East's wire turns to cross `z:8`, sparking from the start (live from both sides); `f_d` on `l_e1`, East's short line to the homes, sparking from the start; `f_p` on `l_pump`, the last span to the pump house, dark at the start behind the open `br_p`; `f_bulb`, the pump house's dead bulb, dark behind `f_p`.

West's wire runs along the south street of `block:7:1`, round the corner and north up `z:8` (the street between the two blocks) past the tannery, `br_a`, the smokehouse and `br_b` to the north-east corner `j_n`, where a short line turns west along the north street through `br_p` to the pump house. East's wire runs west along the north street of `block:8:1` and crosses `z:8` to the same corner `j_n`.

**No breaker on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `br_a` | `pole:z:8:lo:130.00` | 2 spans, both its own (`l_w1` in from `z:8:lo:139.50`, `l_w2` out to `z:8:lo:117.50`); no drop |
| `br_b` | `pole:z:8:lo:105.50` | 2 spans, both its own (`l_w3` in from `z:8:lo:117.50`, `l_w4` out to `z:8:lo:92.50`); no drop |
| `br_p` | `pole:x:1:hi:390.83` | 2 spans, both its own (`l_p0` in from `x:1:hi:402.50`, `l_pump` out to `x:1:hi:379.17`); no drop |

It has no switch and no fuse box. The two exceptions Josh allowed are not used.

Scenery (section S), 15 buildings, all lit at the win: 6 on West's south street, 3 on `z:8` south of `br_a`, 2 at the north-east corner (one each side of `j_n`), 4 on East's north street. Three are on blocks outside the district (two on `block:7:5`, one on `block:8:0`); two of `block:8:1`'s houses hang from `block:7:1`'s poles across `z:8`.

## Why each block

| Block | What the player does or learns there | Why it can't be done on another block |
| --- | --- | --- |
| `block:7:1` | Closes `br_p` to look (the pump house's road is broken), opens `br_b` (the line), mends the pump house's road, fits the bulb. Reads West's bar: 15 of 15 | The pump house, its road and both of West's breakers are on its streets |
| `block:8:1` | Mends the tie: its cut is the corner span on `block:8:1`. Reads East's bar: 4 of 9, room for 5. Leaves the homes' spark alone | East's room is the only room there is, and East's wire is the only way to carry it to the corner. The homes that would spend it are here too |

The mend on `block:8:1` changes who carries the corner of `block:7:1`; the breaker on `block:7:1` decides how far East's current comes. Neither block wins alone: West can't carry the pump house, and East can't reach it.

## The intended read from the default camera

The camera opens on both blocks. **The smokehouse is on `z:8`, the street between the blocks, on `block:7:1`'s side, lit. The pump house is on `block:7:1`'s north street, two poles west of the north-east corner, dark, behind a breaker. The tribe's homes are on `block:8:1`'s east street by its north-east corner, dark.**

1. Two feeds. West's wire comes in at the south-west, runs along the south street and up `z:8`: the cooper, the tannery, the smokehouse, all lit. **West reads 15 of 15.** East's wire comes in at the north-east and runs along `block:8:1`'s north street: **East reads 4 of 9.** Two sparks: one where East's wire turns to cross `z:8`, one on East's short line to the dark homes. Two wires and a bulb in hand.
2. The pump house's breaker reads **+3, red**: West has no room. Shedding does not help: West's only breakers, `br_a` and `br_b`, are on the pump house's own road.
3. Close `br_p` anyway to look: nothing lights, nothing flickers, and a **spark** shows one span on. The pump house's road is broken. So the two wires are spoken for: one for that road, one for the tie that brings East's room over. The homes' spark gets none.
4. East has room for 5. The corner is two houses and the pump house: 5. The smokehouse is 2 more. So East must carry the corner and nothing south of it: open `br_b` (−2: the corner's two houses go dark). West 13 of 15.
5. Mend the tie (+2, white). East's current crosses `z:8`, lights the corner and stops at `br_b`. East 6 of 9. The spark on the pump house's road shows again, now on East.
6. Mend it (+3, white). The pump house stays dark with a **flicker at its socket**: a dead bulb. Fit it (+3, white). East 9 of 9, West 13 of 15. **Win.**

**Hidden at the start (2 facts):** the break `f_p` on the pump house's road, behind its open breaker (closing the breaker shows it, and costs nothing while the road is broken); the pump house's dead bulb, behind that break (the mend shows it). **Layers (2):** which feed carries the pump house, and what the wires are for; then where the line between the feeds is drawn.

## The trap

**The spark beside the dark homes reads +2, white, because East has room: it is the room the pump house needs, and the wire the pump house's road needs.**

The homes are the tribe's, they are dark, the spark is 12 m from them, and nothing about the mend is red. It lights them: East 6 of 9. Then one wire is left for two breaks, and East has 3 of room for a corner that needs 5. Whichever break gets the last wire, the pump house stays dark.

It is readable (East's bar at 6 of 9, the tie's spark turning red, one wire in hand and two sparks to come) and one Undo takes it back if the player stops there.

**A second trap that costs nothing:** mend the tie with `br_b` closed and the feeds meet further south than they should. East, the nearer feed, takes the smokehouse as well as the corner (East 8 of 9, West 11 of 15), and the pump house's road turns red on East. Nothing is lost: open `br_b` and the smokehouse goes back to West. This is the lesson of the second feed: joined is not pooled.

## What it builds on, and its depth of read

- **3 and 8 are the trap.** "Over the limit: shed something" has nothing to shed here. West's breakers cut the pump house's own road, and the cooper and the tannery have none. The answer is not on West at all.
- **5 and 6 are held together.** Three places ask for a wire and there are two (5); the third is hidden behind an open breaker and has to be found before the first is spent (6).
- **10 and 11 are used straight.** The bulb goes in last, on the feed with room (10). The breaker `br_b` is an open point chosen on purpose (11).
- **Depth of read: 4.** Before the first wire is spent the player must hold: (1) West is full and can't shed without cutting the pump house off; (2) East has room for 5, which is the corner exactly; (3) the pump house's road is broken, so both wires are spoken for; (4) the homes' spark is on East, so mending it spends East's room as well as a wire. Puzzle 11 asks for 3.

## The numbers (section V) and the hover cue

- At the start: `br_p` +3 **red** (West over), the tie +0, the homes' spark **+2 white**, `br_a` −4, `br_b` −2. The one red number is on the move that looks (and costs nothing); the trap is white.
- After `br_p`: the pump house's road +3 red on West.
- After `br_b` and the tie: the road +3 white, then the bulb +3 white.
- With the feeds joined and `br_b` closed: the road +3 red, then the bulb +3 red, naming East. Opening `br_b` turns them white.
- After the homes' mend the tie turns red with `br_b` closed, and the road stays red however the line is drawn.
- The hover cue on `br_b` lights the span to the corner and the short line to `br_p`: what West lets go of.
- **Which feed carries a building is not drawn on the wire.** The HUD's two bars and the hover line ("on East") say it. The file sets West's road to the smokehouse at five lines and East's at four, so that East is the nearer; the two roads are about the same length in metres (121 m from West, 118 m from East).

## The tribe's homes

`homes` (priority, load 2) is dark at the start and **dark at the win**. Lighting them is the trap: East can't carry them and the pump house. This is the first puzzle of the series where the tribe's homes can be had and must be refused.

## Changed from the plan's row

- **Kept:** two feeds; each building belongs to the nearer feed; the target is drawn at the end of one feed's wire and has to count on the other.
- **Changed:** the plan's row had 2 switches and 2 breakers, no faults and no parts, with "a longer road hands it to the other feed". Built: **3 breakers, no switch, 4 faults, 2 wires and a bulb.** The switches went because on the city "nearer" is counted in the file's lines, which the player can't count from the camera; a breaker that draws the line is something they can see and throw. The faults were added so that the join costs a part and a wrong spend can't be taken back.
- **Size:** 4 / 2 wires, bulb / 3 breakers, 2 feeds (the row: 0 / 0 / 2 switches, 2 breakers, 2 feeds).

## Limits passed

None. 5 clicks, 2 hidden facts, 4 faults, 6 own buildings.

## Series rules

- **No fuse box**, so no fuse blow. Over a feed's limit is a brownout, which costs nothing.
- **Kit: 2 wires, 1 bulb.** Puzzle 11's is a fuse and a wire; puzzle 13's is 2 wires.
- **Heavy building: the pump house** (load 3). Puzzle 11's is the forge; puzzle 13 has none.
- **Shrine count: 2 of 5.** No shrine here.
- District `block:7:1`, `block:8:1`. `block:7:1` has not been used by the series; `block:8:1` was puzzle 3's district (not a neighbour of 12). This puzzle reuses puzzle 3's places there, as Josh allowed (25 Nov 2026: "You can even use the same nodes over again"): East stands on puzzle 3's feed pole, its wire runs along the same north street, and puzzle 3's house at `96,20` is the tribe's homes here. It shares no block with puzzle 11 (`block:6:6`, `block:6:8`) or puzzle 13 (`block:3:0`, `block:0:0`). The feeds' poles are on `block:6:3` and `block:8:0`.
- **Districts used so far:** `block:4:8` (puzzle 1, since its re-lay in NR; ticket 081's N3 list still names `block:2:10`, which no series puzzle now uses), `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, and now `block:7:1` + `block:8:1`.

## Expected numbers

`npm run analyze puzzles/city/s12-draw-the-line.city.json`:

| | |
| --- | --- |
| States | 80, exhaustive |
| Solvable | yes |
| Fewest clicks | 5 (`br_p`, `br_b`, `repair:l_tie`, `repair:l_pump`, `repair:pump_house`) |
| Winning click orders | 15 |
| Winning configurations | **1** (`br_p` closed, `br_b` open, `br_a` closed, the tie, the road and the bulb mended, `f_d` left broken) |
| Parts used | wire, wire, bulb (3 of 3) |
| Feeds at the shortest win | West 13 of 15, East 9 of 9 |
| Fuses that blow | none (there are none) |
| Dead-end states | 32 of 80 (40.0%): every state with `f_d` mended |
| First moves that lead only to dead ends | **1**: `repair:l_e1` |
| Hidden at the start | 2: the break `f_p`, the dead bulb `f_bulb` |

Loads, replayed on the conversion: start West 15 of 15, East 4 of 9; `br_p` no change; `br_b` West 13; the tie East 6; the road no change; the bulb East 9 of 9, win. Joined with `br_b` closed: West 11, East 8, then the bulb East 11 of 9, a brownout; `br_b` wins. The trap (`repair:l_e1`): East 6 of 9.

**The obvious wrong first move:** `repair:l_e1`, the spark beside the dark homes. Read: the homes light, East's bar goes to 6 of 9, the tie's number turns red. Recovered by **one Undo**. The check block replays it, the free trap, the pump house brought up on West (a brownout, recovered by `br_b` and the tie), and the wrong breaker.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_p", "br_b", "repair:l_tie", "repair:l_pump", "repair:pump_house"],
  "traps": [
    { "name": "mend the spark by the dark homes",
      "moves": ["repair:l_e1"],
      "expect": { "lit": ["cooper", "tannery", "smokehouse", "homes"], "complete": false },
      "recover": ["undo", "br_p", "br_b", "repair:l_tie", "repair:l_pump", "repair:pump_house"] },
    { "name": "join the feeds and leave the line where it falls",
      "moves": ["br_p", "repair:l_tie", "repair:l_pump", "repair:pump_house"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_b"] },
    { "name": "bring the pump house up on West",
      "moves": ["br_p", "repair:l_pump", "repair:pump_house"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_b", "repair:l_tie"] },
    { "name": "open the wrong breaker",
      "moves": ["br_p", "br_a", "repair:l_tie", "repair:l_pump", "repair:pump_house"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_a", "br_b"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds both blocks and both feeds' poles, with the two HUD bars named West and East.
- The two feeds' pulses can be told apart at the corner `j_n` after the join (they run outward from each feed).
- The pump house, its breaker and the corner are three poles in a row on the north street; the icons do not overlap.

## To watch when Josh plays it

- Whether "on West" and "on East" read at all without hovering. If not, this puzzle needs the wires tinted by feed, which is a renderer change and not this ticket's.
- Whether the smokehouse changing hands on the join is noticed (West 15 to 11, East 4 to 8, no light changes).
- Whether refusing the tribe's homes reads as the puzzle's point or as a mean trick.

## What it taught us
