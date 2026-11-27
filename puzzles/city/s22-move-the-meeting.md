# 22 · Move the meeting — design note (series v1, puzzle 22)

A new puzzle designed on the city (ticket 081 section N5; `puzzles/series-v1.md`, row 22). It has no schematic and no `from`. Three blocks, two feeds, and layers that cross them.

Josh, 26 Nov 2026, on what the two-feed puzzles may lean on: "Build on what shows (Recommended)". Which feed carries a building is read here from what the city draws: the red number, which names a feed or a box; the fuse boxes' bars; and which way the lit wires run.

- **New concept: the meeting moves.** Two feeds joined on one wire do not pool: each building goes to the nearer feed, and the two flows meet somewhere along the wire. Where they meet is set by the lengths of the two roads. Change a road's length and the meeting moves.
- **The reasoning move:** two targets on one wire with no breaker between them, and neither feed has room for both. So the meeting has to fall between them. West is nearer to both. Don't cut West off: bring East by a shorter road, so that East is nearer to the one and West still nearer to the other.
- **Builds on:** 12 (two feeds; joined is not pooled; the nearer feed carries), 15 (a mother over a child: the small box shows room and the red names the box above it), 17 (a relay, thrown only live, and what is on its line when it lets go), 9 (two ways round a block), 10 (a bulb is a load event, on whichever feed is carrying its building), 6 (a socket that asks for the bulb another building needs), 13 (a spark seen from behind).
- **Carries from N4's hand-on list:** none. (The lantern would have fitted the spark; here the spark is read from behind by the feeds' own light, at the start.)

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:5:4`, `block:6:3`, `block:6:6`**: `5:4` on the west, `6:3` north-east of it and `6:6` south-east, the three meeting where `z:6` crosses `x:6`. 150 m wide, 160 m deep.
- **West** stands on `block:3:4`'s pole `pole:z:5:lo:192.50`, across `z:5` from `5:4`'s north-west corner. **East** stands on `block:7:5`'s pole `pole:z:7:hi:242.50`, across `z:7` from `6:6`'s east street. One entering span each.
- **West 18, East 23.** `fb_m` (the mother) rated **18**; `fb_c` (the child) rated **16**. Own numbers 15, 16, 15 and 14, raised once by `npm run fit -- --raise` for the 25 scenery buildings.
- Targets: `pump_house` (on `block:6:6`) and `wash_house` (on `block:6:3`). Priority: `homes`. Parts: **wire, 2 bulbs, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed, 18 | pole `pole:z:5:lo:192.50` (end, block:3:4, +x side) | 169.25, 192.50 |
| `east` | feed, 23 | pole `pole:z:7:hi:242.50` (crossing, block:7:5, -x side) | 360.75, 242.50 |
| `fb_m` | fuse box, the mother | pole `pole:z:5:hi:192.50` (crossing, block:5:4, -x side) | 185.75, 192.50 |
| `j_d` | junction | pole `pole:x:4:hi:217.50` (slot, block:5:4, -z side) | 217.50, 185.75 |
| `dye_works` | lamp, load 5 | building `block:5:1/built\|outer\|+z\|42,32`, by its drop from `pole:x:4:hi:217.50` | 217.50, 165.00 |
| `fb_c` | fuse box, the child | pole `pole:x:4:hi:230.00` (slot, block:5:4, -z side) | 230.00, 185.75 |
| `br_w` | breaker, open at the start | pole `pole:x:4:hi:242.50` (end, block:5:4, -z side) | 242.50, 185.75 |
| `j_2` | junction | pole `pole:z:6:hi:192.50` (landing, block:6:3, -x side) | 265.75, 192.50 |
| `wash_house` | lamp, load 3, **target**, dead lamp | building `block:6:3/a\|outer\|-x\|54,36`, by its drop from `pole:z:6:hi:192.50` | 270.00, 192.50 |
| `j_c` | junction | pole `pole:x:6:hi:272.50` (end, block:6:6, -z side) | 272.50, 230.75 |
| `j_1` | junction | pole `pole:x:6:hi:315.83` (slot, block:6:6, -z side) | 315.83, 230.75 |
| `pump_house` | lamp, load 4, **target**, dead lamp | building `block:6:6/a\|outer\|-z\|60,47`, by its drop from `pole:x:6:hi:315.83` | 317.50, 235.00 |
| `r_e` | relay, position 0 `l_long1`, 1 `l_s1`; set 0 | pole `pole:z:7:lo:242.50` (landing, block:6:6, +x side) | 344.25, 242.50 |
| `j_h` | junction | pole `pole:z:7:lo:237.50` (end, block:6:6, +x side) | 344.25, 237.50 |
| `homes` | lamp, load 2, priority, dead lamp | building `block:6:6/a\|outer\|+x\|67,47`, by its drop from `pole:z:7:lo:237.50` | 340.00, 237.50 |
| `j_g` | junction | pole `pole:x:6:hi:326.67` (slot, block:6:6, -z side) | 326.67, 230.75 |
| `ice_house` | lamp, load 8 | building `block:6:6/a\|outer\|-z\|64,47`, by its drop from `pole:x:6:hi:326.67` | 327.50, 235.00 |
| `c_1` to `c_4` | junctions, the long road's four bends | poles `pole:z:7:lo:312.50`, `pole:x:9:lo:337.50`, `pole:x:9:lo:272.50`, `pole:z:6:hi:312.50` (the south-east and south-west corners of block:6:6) | 344.25, 312.50; 337.50, 319.25; 272.50, 319.25; 265.75, 312.50 |
| `br_l` | breaker, **closed at the start** | pole `pole:z:6:hi:254.17` (slot, block:6:6, -x side) | 265.75, 254.17 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `fb_m` | 1 span: 1 cross (over `z:5`) | 16.50 |
| `l_w1` | `fb_m` → `j_d` | 3 spans: 1 corner, 2 along (along `x:4`) | 34.55 |
| `l_dye` | `j_d` → `dye_works` | drop | — |
| `l_w3` | `j_d` → `fb_c` | 1 span: 1 along (along `x:4`) | 12.50 |
| `l_w3b` | `fb_c` → `br_w` | 1 span: 1 along (along `x:4`) | 12.50 |
| `l_w4` | `br_w` → `j_2` | 2 spans: 1 corner, 1 cross (over `z:6`) | 26.05 |
| `l_wash` | `j_2` → `wash_house` | drop | — |
| `l_tie` | `j_2` → `j_c` | 4 spans: 2 along, 1 corner, 1 cross (along `z:6`, over `x:6`) | 41.05 |
| `l_mid` | `j_c` → `j_1` | 4 spans: 4 along (along `x:6`) | 43.33 |
| `l_pump` | `j_1` → `pump_house` | drop | — |
| `l_e0` | `east` → `r_e` | 1 span: 1 cross (over `z:7`) | 16.50 |
| `l_s1` | `r_e` → `j_h` | 1 span: 1 along (along `z:7`) | 5.00 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_s2` | `j_h` → `j_g` | 2 spans: 1 corner, 1 along (along `x:6`) | 20.38 |
| `l_ice` | `j_g` → `ice_house` | drop | — |
| `l_s3` | `j_g` → `j_1` | 1 span: 1 along (along `x:6`) | 10.83 |
| `l_long1` | `r_e` → `c_1` | 6 spans: 6 along (along `z:7`) | 70.00 |
| `l_long2` | `c_1` → `c_2` | 1 span: 1 corner | 9.55 |
| `l_long3` | `c_2` → `c_3` | 6 spans: 6 along (along `x:9`) | 65.00 |
| `l_long4` | `c_3` → `c_4` | 1 span: 1 corner | 9.55 |
| `l_long5` | `c_4` → `br_l` | 5 spans: 5 along (along `z:6`) | 58.33 |
| `l_bl` | `br_l` → `j_c` | 3 spans: 2 along, 1 corner (along `z:6`) | 26.21 |

Faults (4): `f_wash` and `f_pump`, the two targets' dead bulbs, both flickering at the start (East's light reaches them); `f_short`, a break on `l_s3`, one span east of the pump house, sparking at the start (seen from behind); `f_homes`, the homes' dead bulb, dark at the start behind `r_e`'s second position.

**The picture.** One wire joins the two targets. It runs from the wash house (`j_2`, on `6:3`'s west street) south to the corner where the three blocks meet (`j_c`), then east along `6:6`'s north street to the pump house (`j_1`). There is no breaker anywhere on it.

- **West's road** comes along `5:4`'s north street: the **mother**, the **dye works** (across the street), the **child**, the breaker `br_w`, and over `z:6` to the wash house's pole. From West's pole to the wash house is 102 m; to the pump house, 186 m.
- **East's relay** `r_e` is on `6:6`'s east street, one span from East's pole. **At rest it sends East the long way:** south down the east street, west along the south street, north up the west street, through the breaker `br_l`, and into the corner `j_c`. 255 m to the corner, past fifteen houses; 300 m to the pump house.
- **Thrown, it sends East the short way:** round `6:6`'s north-east corner past the tribe's **homes** and the **ice house**, and west along the north street to the pump house. 53 m. One span short of the pump house the wire is broken.

**Nearer is counted in wires**, from fitting to fitting, and the map is laid so that the count follows the metres. West to the wash house: 5 wires; to the corner 6; to the pump house 7. East by the long road: 7 to the corner, 8 to the pump house (the four bends count). East by the short road: 4 to the pump house, 5 to the corner, 6 to the wash house. So with the long road the two flows meet on the long road itself, and West carries both targets. With the short road they meet on the tie, between the corner and the wash house: East has the pump house, West the wash house.

**The street crossings between blocks:** `5:4` to `6:3` over `z:6` (`l_w4`, West's road); `6:3` to `6:6` over `x:6` at the corner (`l_tie`, the targets' wire).

**No breaker, relay or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_m` | `pole:z:5:hi:192.50`, `block:5:4`'s crossing pole | 2 spans, both its own (`l_w0`, the crossing of `z:5` in; `l_w1`, the corner span out); no drop |
| `fb_c` | `pole:x:4:hi:230.00` | 2 spans, both its own (`l_w3` in from `x:4:hi:217.50`, `l_w3b` out to `x:4:hi:242.50`); no drop |
| `br_w` | `pole:x:4:hi:242.50` | 2 spans, both its own (`l_w3b` in, `l_w4`, the corner span out); no drop |
| `r_e` | `pole:z:7:lo:242.50`, a landing | its own three wires and nothing else: the crossing of `z:7` in (`l_e0`), along north (`l_s1`, position 1), along south (`l_long1`, position 0); no drop |
| `br_l` | `pole:z:6:hi:254.17` | 2 spans, both its own (`l_long5` in from `z:6:hi:264.33`, `l_bl` out to `z:6:hi:242.50`); no drop |

Scenery (section S), 25 buildings:
- **On West's road, before the breaker, 1.** Always on West.
- **On the targets' wire, 8:** 2 on the tie (`l_tie`), 1 at the corner (`j_c`), 2 on `l_bl` between the corner and `br_l`, 2 along the north street (`l_mid`), 1 on the pump house's pole. They go to whoever is nearer.
- **On the long road, 15:** 5 down the east street, 1 at each south corner, 4 along the south street, 4 up the west street.
- **On the short road, 1:** on the homes' pole.

## The intended read from the default camera

The camera opens on all three blocks: `5:4` on the left, `6:3` top right, `6:6` bottom right. **The wash house is on `6:3`'s west street, at the middle of it, facing `5:4`. The pump house is on `6:6`'s north street, two thirds of the way east.** Both show a dead socket, flickering.

1. **East's wire is lit all the way round `6:6`:** down the right-hand street, along the bottom, up the middle street, through a closed breaker, into the corner, and from there to both sockets. That is the long road. The HUD reads East 23 of 23, and each socket's bulb reads **red** (+3, +4), naming East. One span east of the pump house a **spark**: the wire goes on east, broken, dark. Its number is red too (+11).
2. On the left, West: a fuse box, the **dye works** burning across the street, a second fuse box, an open breaker. `br_w` reads **+0, white**.
3. **Close `br_w`.** Nothing lights and nothing goes dark, and the lit wire changes direction: West's current now runs the tie, the corner and the north street, and East's stops somewhere up the middle street. West is nearer. The child's bar shows 6 of 16, the mother's 12 of 18. Both bulbs read white.
4. **Fit the wash house's bulb** (+3). It burns, on West. The mother 15 of 18, the child 9 of 16. Now the pump house's bulb is **red, +4, naming the mother**: 19 on 18. The child has room for it. The mother, with the dye works on her, has not.
5. So the pump house has to be East's, and East, joined to it the whole time, is not carrying it: West is nearer. Look at East's end. The relay beside East's pole has a second wire: round the corner, past the ice house, straight at the pump house. It is the wire with the spark on it. By that road East is four wires from the pump house, and West is seven.
6. The relay reads **red, naming the mother**. Thrown now, East lets go of the long road, and the long road is still tied to the corner through `br_l`: its fifteen houses would fall to whoever holds the corner, which is West. **Open `br_l` first** (white).
7. **Throw `r_e`** (−4). The long road goes dark. The short road lights as far as the spark: the **ice house** burns, and at the corner the tribe's homes show a **dead socket**, +2 and white, asking for the last bulb. Leave it.
8. **Mend the spark** (+0: nothing new lights). The two flows now meet on the tie. The child's bar drops from 11 to 5; the pump house's bulb turns **white**.
9. **Fit the pump house's bulb.** It burns, on East. West 11 of 18, East 19 of 23. **Win.**

**Hidden at the start (1 fact):** the homes' dead bulb, on the short road behind the relay's second position, shown when the relay is thrown. Everything else on the short road east of the spark is dark at the start too: the ice house's 8 is not seen until East is on it.

## The trap

**East's relay is one click from the short road, and the long road is still tied to the pump house's corner: thrown with `br_l` closed, the long road's fifteen houses fall to West, and the mother blows.**

It is the breaker beside the targets that does it, and it starts closed. The relay's number says so beforehand: **+11, red, naming `fb_m`**, on a box on the far side of the map from the relay. Thrown, a bolt runs West's road, the mother shows its ✕, and everything West carried is dark.

**It is recovered by a part:** the spare fuse, once `br_l` is open and the spark mended (before that the prompt warns: *would blow again*).

Three more, each readable, each recoverable:

- **The second bulb on West.** With West in, either target's bulb reads white and the other then reads red, naming the mother. Fitted on red, the mother blows. Recovered by the spare fuse, fitted after the meeting has moved.
- **The spark first.** It is in view from the first frame with a wire in hand. Mended before the relay is thrown, it joins the ice house and the homes' wire to the targets' wire **from behind**, and they go to whoever holds the pump house. At the start that is East, the long way round: +11 red, a brownout, which the right moves then clear. After `br_w` it is West: +11 red, naming the mother, and a blow. The wire is not wasted either way; the moment is wrong.
- **The bulb the homes ask for.** The socket shows only once the relay is thrown, beside it, with a bulb still in hand; +2, white. Fitted, the homes burn and the pump house has no bulb. This one is recovered by **one Undo**, and the state says why: the pump house's socket still flickers, and the kit holds no bulb.

**At the start, a bulb on East's red** is a brownout, not a loss: the bulb is in the right socket, and the right moves clear it.

## Why each block

| Block | Why the solve needs it |
| --- | --- |
| `block:5:4` | **West's road:** the mother, the child, `br_w`, and the dye works across its north street. `br_w` is thrown here; the two bars are read here, and the child's bar is where the player sees the meeting move |
| `block:6:3` | **The wash house**, on its west street, and the tie down to the corner. Its bulb is fitted here. It is the target that stays West's |
| `block:6:6` | **The pump house, East's relay and both of East's roads round the block**, `br_l`, the ice house, the homes, the spark. Three clicks and two repairs |

## Layers

| # | Layer | The read | The move or moves | Begins on | Finished, or undone, on | Hands to the next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **East is full, the long way round** | Both bulbs red, naming East; the lit wire round `6:6` | none: bring West | `6:6` and `6:3` (the sockets) | `5:4` (`br_w`) | West nearer, both bulbs white |
| 2 | **West has room for one** | After the first bulb the second is red, naming the mother; the child shows room | `br_w`, the wash house's bulb | `5:4` | `6:3` (the wash house lit), and read back on `5:4` (the mother's bar) | "The pump house is East's, and East must be nearer" |
| 3 | **Let go of the long road** | The relay's red names the mother: the long road hangs from the corner through `br_l` | open `br_l` | `6:6` (the relay, `br_l`) | undone on `5:4` if skipped (the mother blows) | A relay that reads white |
| 4 | **Move the meeting** | East's short road: four wires to the pump house against West's seven; a spark on it | throw `r_e`; mend the spark | `6:6` (its east corner) | the tie on `6:3`'s corner, where the flows now meet; `5:4` (the child's bar drops) | The pump house's bulb, white |
| 5 | **The socket that asks** | The homes' dead socket, shown by the throw | pass it over; fit the pump house's bulb | `6:6` | `6:6` | The win |

Five layers; four cross blocks (1 to 4), and every block is on at least two of them.

## What it builds on, and its depth of read

- **12 is the tool, and its answer is the trap.** 12 taught "open the breaker that puts the line where the other feed's room ends". Here there is no breaker between the targets, and the two breakers there are both do the wrong thing: `br_w` opened hands both targets to East, and `br_l` left closed hands the long road to West.
- **15 is held against the player.** The child shows room for the pump house. The red names the box above it, and 15's answer (take load off the mother's other branch) is not on offer: the dye works has no breaker.
- **17:** the relay is on East's live trunk, so it can be thrown at any time. What matters is what is on its line when it lets go.
- **9:** two ways round a block, and the question of which end feeds.
- **10, 6, 13:** each bulb is a load on whoever is carrying its socket at that moment; a socket asks for a bulb the target needs; the spark is first seen from behind.
- **Depth of read: 9.** Before the first move that can't be taken back (the first bulb) the player must hold: (1) the two targets are on one wire with no breaker between them; (2) East reaches them now, the long way round, and is full: each bulb is red on East; (3) West can reach them through `br_w`, and is nearer to both than East's long road; (4) West's child shows room for both, and the mother above it, with the dye works on her, has room for one; (5) so each feed carries one, and the meeting of the two flows must fall between them; (6) the nearer feed carries, so East must come by a road shorter than West's: the relay's second wire, the one with the spark; (7) on that road East gives up fifteen houses and takes on the ice house, which leaves room for the pump house and not for both; (8) the long road, once East lets go, hangs from the corner through `br_l`, so `br_l` is opened before the relay is thrown; (9) the spark is mended only after the throw: before it, the ice house falls from behind to whoever holds the pump house. Puzzle 21 asks for 9.

## The numbers (section V)

- At the start: `f_wash` **+3 red**, `f_pump` **+4 red** (East 23 of 23); `f_short` **+11 red** (the ice house, the homes counted as sound, a house); `br_w` **+0**; `br_l` −8; `r_e` −12.
- After `br_w`: both bulbs white; `r_e` and `f_short` **+11 red, blows `fb_m`**.
- After the first bulb: the other bulb **+4 red, blows `fb_m`** (or +3, if the pump house went first).
- After `br_l` is opened: `r_e` **−4, white**. After the throw: `f_short` **+0**, `f_homes` **+2**, `br_l` **+15 red, blows `fb_m`**.
- After the mend: `f_pump` **+4, white**; `br_l` **+15 red**, naming East now (the corner is East's).
- **The red changes its name** as the meeting moves: East at the start, the mother once West is in, East again for `br_l` at the end. That, the bars and the direction of the lit wires are how the carrier is read.

## The tribe's homes

`homes` (priority, load 2) is on the short road's corner, beside East's relay. It is dark at the start; its socket is dead, and shows only when the relay is thrown. **It is dark at the win.** East has room for it (21 of 23); the kit has not: two bulbs, two targets. The win costs the tribe the bulb their homes asked for.

## Changed from the plan's row

- **Kept:** two feeds, a relay and a break; "shorten one feed's road so that feed carries the borrow"; the breaker beside the target as the trap; the short road going dark at a spark.
- **Changed:** the row's plain switch is not used. The row's fuse box became a mother over a child on West (the ticket's floor: 15). Two targets instead of one, with no breaker between them, so that "where the meeting falls" is the whole question. The kit is wire, two bulbs and a spare fuse (the row: wire, fuse). The spark is not found by throwing the relay: it is seen from behind at the start, and what the throw shows is the homes' socket and the ice house.
- **The order of 22 to 24** is the plan's.
- **Size:** 4 / wire, 2 bulbs, fuse / 1 relay, 2 breakers, 2 fuse boxes, 2 feeds; 3 blocks.

## Limits passed

None. 6 clicks, 1 hidden fact, 4 faults, 5 own buildings (dye works, wash house, pump house, homes, ice house), 3 blocks.

## Series rules

- **Reuse is free.** A blow is the trap. No designed re-blow: a fuse fitted while the cause stands is warned (*would blow again*) and is off the intended road.
- **Kit: wire, 2 bulbs, 1 fuse.** Puzzle 21's is wire, bulb, 2 fuses. **Puzzle 23's must not be a wire, two bulbs and a fuse.**
- **Heavy building: the ice house** (load 8), with the dye works (5) under the mother. Puzzle 21's is the sawmill. **Puzzle 23's must not be the ice house.**
- **Shrine count: 2 of 5.** No shrine here.
- District `block:5:4`, `block:6:3`, `block:6:6`. `block:5:4` has not been used by the series. `block:6:3` was puzzle 8's district and `block:6:6` half of puzzle 11's; neither is a neighbour of 22. It shares no block with puzzle 21. The dye works is a building of `block:5:1`, across `x:4`, on a drop from `5:4`'s pole. **Puzzle 23 must use none of these three.**
- **Districts used by 1 to 22**, none to be a district again: the 21 listed in `s21-between-two-clocks.md`, and now `block:5:4` + `block:6:3` + `block:6:6`. Blocks no series puzzle has used: `block:5:0`, `block:5:1`, `block:3:2`, `block:8:5`, `block:0:7`, `block:5:7`, `block:7:8`, `block:8:8`, `block:6:9`, `block:7:9`, `block:5:10`.

## Expected numbers

`npm run analyze puzzles/city/s22-move-the-meeting.city.json` (no clock and no battery, so one run; 5 s):

| | |
| --- | --- |
| States | 400, exhaustive |
| Solvable | yes |
| Fewest clicks | **6** |
| One shortest win | `br_w`, `br_l`, `r_e`, `repair:wash_house`, `repair:l_s3`, `repair:pump_house` |
| Winning click orders | 174 |
| Winning configurations | **1** (`br_w` closed, `br_l` open, `r_e` thrown, the wire and both targets' bulbs in) |
| Parts used | wire, bulb, bulb (3 of 4; the fuse is the spare) |
| Feeds at the shortest win | West 11 of 18, East 19 of 23 |
| Fuses that blow on a shortest win | none |
| Fuses that blow on some move | `fb_m` |
| First moves | `br_w`, `r_e`, `br_l`, `repair:wash_house`, `repair:pump_house`, `repair:l_s3` |
| Dead-end states | 238 of 400 (59.5%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the homes' dead bulb |

**No win without the meeting moved.** West alone with both targets is 19 or more on the mother's 18. East alone with both is 24 on 23 by the short road and 30 by the long. With both feeds in and East on the long road, West is nearer to both. The one winning configuration has East on the short road and West in.

Loads, replayed on the conversion: start West 6, East 23; `br_w` 12 and 17; the wash house 15 and 17; `br_l` 17 and 15; `r_e` 17 and 9; the mend 11 and 15; the pump house 11 and 19, win. The trap: 32 on the mother's 18.

**The obvious wrong first move** is a bulb in a flickering target, or the wire in the spark: each is red, each is a brownout and no loss, and the right moves clear it. **The first wrong click that costs something** is the relay on its red (or the second bulb on its red): the mother blows; the spare fuse recovers it. The dead-end states are those with the homes' bulb fitted, or the mother blown twice. The check block replays both bulbs on West, the relay on its red, the homes' bulb, and a bulb on East's red at the start.

**Where it stands against 21:** it reads as deep (9 facts against 9). It has more winning click orders (174 against 2 at a person's pace), because nothing here is on a clock: 21 is harder on that count. Its share of dead-end states is higher (59.5% against 31.6%), it has as many layers (5), and the wrong moves are of four kinds on two feeds, against one fuse. What is new is harder to see than 21's: no piece on the map is the answer, only a length.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_w", "repair:wash_house", "br_l", "r_e", "repair:l_s3", "repair:pump_house"],
  "traps": [
    { "name": "both bulbs on West",
      "moves": ["br_w", "repair:wash_house", "repair:pump_house"],
      "expect": { "blown": ["fb_m"], "readable": ["blown-fb_m"], "complete": false },
      "recover": ["br_l", "r_e", "repair:l_s3", "repair:fb_m"] },
    { "name": "the relay thrown while the breaker beside the pump house is closed",
      "moves": ["br_w", "repair:wash_house", "r_e"],
      "expect": { "blown": ["fb_m"], "readable": ["blown-fb_m"], "complete": false },
      "recover": ["br_l", "repair:l_s3", "repair:fb_m", "repair:pump_house"] },
    { "name": "the bulb the homes ask for",
      "moves": ["br_w", "repair:wash_house", "br_l", "r_e", "repair:homes"],
      "expect": { "lit": ["homes"], "readable": ["f_pump"], "complete": false },
      "recover": ["undo", "repair:l_s3", "repair:pump_house"] },
    { "name": "a bulb on East's red, the long way round",
      "moves": ["repair:pump_house"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_w", "br_l", "r_e", "repair:l_s3", "repair:wash_house"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds all three blocks (150 m by 160 m), both feeds' poles (West off the left edge, East off the right), and both targets.
- The lit long road reads as one wire round three sides of `6:6`, and its four bends read as bends.
- The two fuse boxes on `5:4`'s north street are 46 m apart, with the dye works between them; each bar reads.
- `br_l` (on the middle street, 23 m south of the corner) and the corner pole read as separate.
- East's relay, the homes' pole and East's own pole are within 17 m of each other at the right-hand edge. Check that the relay's icon is not hidden by the feed's.
- After `br_w`, that the lit wires show West's flow on the tie and East's stopping on the middle street; and after the mend, the two meeting on the tie.

## To watch when Josh plays it

- **Only in the HUD:** East's own load against its limit (23 of 23 at the start, 9 after the throw). On the city East's limit shows only as the red on a move that would pass it, with East's name. The solve can be made from the red's name, the two bars and the lit wires; if Josh reaches for the HUD's feed lines to follow who carries what, that is the case for a feed bar (N5-Q1).
- **"Nearer" is counted in wires between fittings, not metres.** The map is laid so the two agree (the long road's bends are fittings). Whether the short road reads as shorter because it looks shorter.
- Whether the meeting is seen: the lit wires run toward each other and stop. Is that enough to say "West has this one", or is it the child's bar that tells him?
- Whether the red on the relay sends him to `br_l`. The number names a box 160 m away, and the cause is a closed breaker he never touched.
- Whether the child's bar misleads as intended (room for the pump house, and the move is red anyway), or is just noise.
- Whether the spark in view from the first frame is mended first, and how its red reads.
- Whether the homes' socket is fitted. The tribe's homes dark at the win, for want of a bulb.

## What it taught us
