# 23 · The priests' list — design note (series v1, puzzle 23)

A new puzzle designed on the city (ticket 081 section N5; `puzzles/series-v1.md`, row 23). It has no schematic and no `from`. Four blocks, one feed, three fuse boxes, and a list of four buildings.

- **New concept: two sisters under one mother, and the mother is the feed.** The mother's fuse is rated exactly as the feed, so there is no brownout on this map: one load too many and the mother blows, and everything goes dark. Under her are two sister boxes. A sister's blow takes only her own branch.
- **The reasoning move:** decide what is lit, and when. The list does not fit while one sister's branch burns, and that branch has no breaker. Her fuse is the breaker: overload her, on purpose, at a moment when the mother has room to carry the overload. Every building lit before that moment takes some of that room.
- **Builds on:** 3 (choose what goes dark; the numbers do the sum), 10 (a bulb is a load event; here it is a tool), 15 (two bars for one building; the red names the box above), 16 (a fuse blown on purpose: a rated box as the breaker a heavy building lacks), 2 (a plain switch: one building or the other), 6 (a spark that shows only when current reaches it).
- **Carries from N4's hand-on list:** none (it has no battery, relay or spring).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:8`, `block:6:9`, `block:7:8`, `block:7:9`**, a square of four round the crossing of `z:7` and `x:10`: `6:8` north-west, `7:8` north-east, `6:9` south-west, `7:9` south-east. 135 m wide, 110 m deep.
- The feed stands on `block:6:6`'s pole `pole:x:9:lo:337.50`, across `x:9` from `6:8`'s north-east corner. One entering span.
- Capacity **23**; `fb_m` (the mother) rated **23**; `fb_e` (the east sister) rated **9**; `fb_s` (the south sister) rated **11**. Own numbers 14, 14, 9 and 6, raised once by `npm run fit -- --raise` for the 10 scenery buildings (none of them under the east sister).
- Targets: `shrine`, `infirmary`, `granary`, `bath_house`. Priority: `homes`. Parts: **wire, 3 bulbs, 1 fuse**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:9:lo:337.50` (end, block:6:6, +z side) | 337.50, 319.25 |
| `fb_m` | fuse box, the mother | pole `pole:x:9:hi:337.50` (crossing, block:6:8, -z side) | 337.50, 335.75 |
| `j_hub` | junction | pole `pole:z:7:lo:367.50` (end, block:6:8, +x side) | 344.25, 367.50 |
| `fb_e` | fuse box, the east sister | pole `pole:z:7:hi:367.50` (crossing, block:7:8, -x side) | 360.75, 367.50 |
| `j_h` | junction | pole `pole:x:10:lo:367.50` (end, block:7:8, +z side) | 367.50, 374.25 |
| `homes` | lamp, load 2, priority | building `block:7:9\|outer\|-z\|73,79`, by its drop from `pole:x:10:lo:367.50` | 367.50, 395.00 |
| `j_k` | junction | pole `pole:x:10:hi:402.50` (crossing, block:7:9, -z side) | 402.50, 390.75 |
| `cooperage` | lamp, load 5 | building `block:7:9\|outer\|-z\|77,79`, by its drop from `pole:x:10:hi:402.50` | 402.50, 395.00 |
| `j_st` | junction | pole `pole:z:8:lo:402.50` (landing, block:7:9, +x side) | 409.25, 402.50 |
| `store` | lamp, load 3, dead lamp | building `block:7:9\|outer\|+x\|80,80`, by its drop from `pole:z:8:lo:402.50` | 405.00, 402.50 |
| `j_s` | junction | pole `pole:x:10:lo:337.50` (end, block:6:8, +z side) | 337.50, 374.25 |
| `fb_s` | fuse box, the south sister | pole `pole:z:7:lo:397.50` (end, block:6:9, +x side) | 344.25, 397.50 |
| `j_shr` | junction | pole `pole:z:7:lo:410.00` (slot, block:6:9, +x side) | 344.25, 410.00 |
| `shrine` | lamp, load 3, **target**, dead lamp | building `block:6:9/b\|outer\|+x\|67,80`, by its drop from `pole:z:7:lo:410.00` | 340.00, 407.50 |
| `sw_1` | switch, position 0 `l_yard`, 1 `l_inf`; set 0 | pole `pole:z:7:lo:447.50` (end, block:6:9, +x side) | 344.25, 447.50 |
| `infirmary` | lamp, load 3, **target** | building `block:6:9/b\|outer\|+x\|67,87`, by its drop from `pole:z:7:lo:447.50` | 340.00, 447.50 |
| `j_y` | junction (the yard: one scenery house) | pole `pole:x:13:lo:337.50` (crossing, block:6:9, +z side) | 337.50, 454.25 |
| `j_g` | junction | pole `pole:x:10:lo:315.83` (slot, block:6:8, +z side) | 315.83, 374.25 |
| `granary` | lamp, load 3, **target**, dead lamp | building `block:6:8/b\|outer\|+z\|62,73`, by its drop from `pole:x:10:lo:315.83` | 317.50, 370.00 |
| `sw_k` | switch, position 0 `l_tile`, 1 `l_w2`; set 0 | pole `pole:x:10:lo:294.17` (slot, block:6:8, +z side) | 294.17, 374.25 |
| `tile_works` | lamp, load 4 | building `block:6:8/b\|outer\|+z\|58,73`, by its drop from `pole:x:10:lo:294.17` | 292.50, 370.00 |
| `br_4` | breaker, open at the start | pole `pole:x:10:lo:285.83` (slot, block:6:8, +z side) | 285.83, 374.25 |
| `bath_house` | lamp, load 4, **target** | building `block:6:9/a\|outer\|-z\|55,79`, by its drop from `pole:x:10:hi:272.50` | 277.50, 395.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `fb_m` | 1 span: 1 cross (over `x:9`) | 16.50 |
| `l_m` | `fb_m` → `j_hub` | 3 spans: 1 corner, 2 along (along `z:7`) | 34.55 |
| `l_e0` | `j_hub` → `fb_e` | 1 span: 1 cross (over `z:7`) | 16.50 |
| `l_e1` | `fb_e` → `j_h` | 1 span: 1 corner | 9.55 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_e2` | `j_h` → `j_k` | 4 spans: 3 along, 1 cross (along `x:10`, over `x:10`) | 51.50 |
| `l_coop` | `j_k` → `cooperage` | drop | — |
| `l_e3` | `j_k` → `j_st` | 2 spans: 1 corner, 1 along (along `z:8`) | 14.55 |
| `l_store` | `j_st` → `store` | drop | — |
| `l_s0` | `j_hub` → `j_s` | 1 span: 1 corner | 9.55 |
| `l_s1` | `j_s` → `fb_s` | 2 spans: 1 cross, 1 corner (over `x:10`) | 26.05 |
| `l_s2` | `fb_s` → `j_shr` | 1 span: 1 along (along `z:7`) | 12.50 |
| `l_shrine` | `j_shr` → `shrine` | drop | — |
| `l_s3` | `j_shr` → `sw_1` | 3 spans: 3 along (along `z:7`) | 37.50 |
| `l_inf` | `sw_1` → `infirmary` | drop | — |
| `l_yard` | `sw_1` → `j_y` | 1 span: 1 corner | 9.55 |
| `l_w0` | `j_s` → `j_g` | 2 spans: 2 along (along `x:10`) | 21.67 |
| `l_gran` | `j_g` → `granary` | drop | — |
| `l_w1` | `j_g` → `sw_k` | 2 spans: 2 along (along `x:10`) | 21.67 |
| `l_tile` | `sw_k` → `tile_works` | drop | — |
| `l_w2` | `sw_k` → `br_4` | 1 span: 1 along (along `x:10`) | 8.33 |
| `l_w3` | `br_4` → `bath_house` | 2 spans: 1 along, 1 cross (along `x:10`, over `x:10`) + drop | 29.83 |

Faults (4): `f_shrine`, `f_gran` and `f_store`, three dead bulbs, all flickering at the start (each socket is live); `f_bath`, a break on the last span of `l_w3`, where the bath house's wire crosses `x:10`, dark at the start behind `sw_k`'s second position and `br_4`.

**The picture.** The feed comes in at the top, through **the mother**, and down `6:8`'s east street to a pole at the middle of the map (`j_hub`), where the four blocks meet. Three wires leave it.

- **East, over `z:7`: the east sister**, on `7:8`'s corner pole, and behind her one wire with no breaker and no switch on it: the tribe's **homes**, east along the street, the **cooperage**, and round the corner the **store**, its socket dead.
- **South, over `x:10`: the south sister**, at the head of `6:9`'s east street, and behind her the **shrine** (a dead socket), four houses, and at the foot of the street a **switch**: the yard round the corner, or the **infirmary**.
- **West, along `6:8`'s south street,** under the mother alone: the **granary** (a dead socket), then a **switch** on the **tile works**' pole (the tile works, or the wire on west), then a **breaker**, and the **bath house** across the street on `6:9`'s corner.

**The street crossings between blocks:** `6:8` to `7:8` over `z:7` (`l_e0`, into the east sister); `7:8` to `7:9` over `x:10` (`l_e2`, her branch); `6:8` to `6:9` over `x:10` twice (`l_s1`, into the south sister; `l_w3`, to the bath house).

**No breaker, switch or fuse box on a branch pole.** Read from the conversion and the circuit layer, scenery included:

| Control | Pole | What meets there |
| --- | --- | --- |
| `fb_m` | `pole:x:9:hi:337.50`, `6:8`'s crossing pole | 2 spans, both its own (`l_feed`, the crossing of `x:9` in; `l_m`, the corner span out); no drop |
| `fb_e` | `pole:z:7:hi:367.50`, `7:8`'s crossing pole | 2 spans, both its own (`l_e0`, the crossing of `z:7` in; `l_e1`, the corner span out); no drop |
| `fb_s` | `pole:z:7:lo:397.50` | 2 spans, both its own (`l_s1`, the corner span in; `l_s2` out to `z:7:lo:410.00`); no drop |
| `sw_1` | `pole:z:7:lo:447.50` | its own three wires and nothing else: along from the north (`l_s3`), the infirmary's drop (`l_inf`, position 1), the corner span (`l_yard`, position 0). One out goes straight into a building's drop ("Allow it (Recommended)") |
| `sw_k` | `pole:x:10:lo:294.17` | its own three wires and nothing else: along from the east (`l_w1`), the tile works' drop (`l_tile`, position 0), along west (`l_w2`, position 1) |
| `br_4` | `pole:x:10:lo:285.83` | 2 spans, both its own (`l_w2` in, `l_w3` out to `x:10:lo:272.50`); no drop |

Scenery (section S), 10 buildings: 1 on the mother's wire (`l_m`), 1 at `j_s`, 1 on `l_w0`, 1 on `l_s1` (these 4 under the mother alone); under the south sister 6: 1 on the shrine's pole, 4 on `l_s3` (two of `6:9`'s, two of `7:9`'s across `z:7`), 1 at the yard (`j_y`, lit only while `sw_1` rests). **None under the east sister:** what she carries is the homes, the cooperage and, with a bulb, the store.

## The intended read from the default camera

The camera opens on all four blocks. **The shrine is on `6:9`'s east street, at its head, in the middle of the view; the infirmary at the foot of the same street; the granary on `6:8`'s south street, left of the middle; the bath house on `6:9`'s north-west corner, at the left.** The shrine's and the granary's sockets flicker. So does a third socket, far right: the store's.

1. **The mother's bar reads 21 of 23.** Lit: the tile works on the left, the homes and the cooperage on the right, ten houses. The east sister's bar reads 7 of 9, the south sister's 6 of 11. In hand: a wire, three bulbs, a fuse.
2. **Every bulb reads +3, red, naming the mother.** The list is 13, and there is room for 2.
3. Count what has to go: at the win the list and nine houses are 22 of 23. The tile works, the homes and the cooperage must all be dark. The tile works has a switch. The homes and the cooperage have nothing: one wire, straight from the east sister's box.
4. Her box is the breaker (puzzle 16). She is at 7 of 9, and the one thing that can be added under her is the store: a bulb, +3, 10 on 9. But that bulb reads red on **the mother**: 24 on 23. The mother would go first, and take everything.
5. **Throw `sw_k`** (−4): the tile works goes dark. The mother 17 of 23. Now the two targets' bulbs read white, and the store's bulb reads **+3, red, naming the east sister** and nobody else.
6. **Fit the store's bulb**, on its red. A bolt runs east; the east sister shows her ✕; the homes and the cooperage go dark, and the store never lights. The mother 10 of 23.
7. Now the list, in any order. **The shrine's bulb** (+3), **the granary's bulb** (+3), **`sw_1`** (+2: the yard for the infirmary), **`br_4`** (+4 on its number, and what it shows is a **spark** where the bath house's wire crosses the street), **the wire** (+4).
8. The mother 22 of 23, the south sister 11 of 11. **Win.**

**Hidden at the start (1 fact):** the break on the bath house's wire, behind `sw_k`'s second position and `br_4`; it sparks when both have been thrown.

## The trap

**With the tile works off, both targets' bulbs read white and the store's reads red. Fit the two white ones and the red one names the mother: the homes had to go dark a step earlier.**

After `sw_k` the mother is at 17. One target's bulb makes 20, and the store's bulb still fits under her (23 of 23, naming the sister). A second target's bulb makes 23, and now the overload has nowhere to stand: the store's bulb reads **red, blows `fb_m`**. So does everything else. A bulb cannot be taken out, and nothing lit has a switch that gives back 3.

**It is readable:** the store's red changes the box it names, from the sister to the mother, at that click; and the next target (`sw_1`, +2) is red too. Every step fitted until the third target.

**It is recovered by one Undo** (the second bulb comes back). Pushed on, on a red, the mother blows; the spare fuse mends her (after a shed: the prompt warns *would blow again*), and the Undo is still owed.

Two more, each readable, each recoverable:

- **A target's bulb as the first click** (the obvious one: two sockets on the list are flickering). Red, naming the mother: 24 on 23. Fitted, the mother blows and the whole map is dark. Recovered by a part: throw `sw_k` (a plain switch moves in the dark), then the spare fuse.
- **The store's bulb as the first click** (puzzle 16's move, made too soon). Red, naming the mother, not the sister. The mother blows. Recovered the same way: `sw_k`, then the spare fuse; and as the mother comes back the east sister, now at 10 on 9, blows as she should.

**Fit it and it blows again** is on offer on the east sister after her blow (her ✕ reads +10 red): it is warned, it is not on the intended road, and it is not a designed trap.

## Why each block

| Block | Why the solve needs it |
| --- | --- |
| `block:6:8` | **The mother** (her bar is the sum), the hub, the **granary**, the **tile works' switch** (the room for the blow is made here) and `br_4` |
| `block:7:8` | **The east sister's box.** It holds no building. Her bar (7 of 9), her red and her ✕ are read here, and nowhere else |
| `block:7:9` | **The homes, the cooperage and the store.** The bulb that blows her is fitted here |
| `block:6:9` | **The south sister, the shrine, the infirmary's switch, the bath house.** Three of the list's four are here, and it is what is lit here that decides whether the blow on `7:8` can still be made |

## Layers

| # | Layer | The read | The move or moves | Begins on | Finished, or undone, on | Hands to the next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **The sum** | The mother 21 of 23; the list is 13; every bulb red, naming her | none yet | `6:8` (the mother's bar) | `6:9`, `6:8` (the list's sockets) | "11 must go dark: the tile works, and all of the east branch" |
| 2 | **Room for a blow** | The store's bulb is red on the mother, not on the sister | `sw_k`: the tile works off | `6:8` | `7:8` (the store's red now names the sister alone) | A red that is safe to take |
| 3 | **The sister is the breaker** | The east branch has no breaker; she is at 7 of 9; the store is +3 | the store's bulb, on its red | `7:9` (the store) | `7:8` (her ✕), and `6:8` (the mother's bar falls to 10) | 13 of room under the mother |
| 4 | **When** | Each target lit takes the room the overload needs: one bulb leaves it, two do not | the blow before the second bulb | `6:9` and `6:8` (the targets) | undone on `7:8` (the store's red names the mother) | — |
| 5 | **The list** | Four buildings; the bath house's spark shows last | two bulbs, `sw_1`, `br_4`, the wire | `6:9`, `6:8` | `6:9`, `6:8` | The win |

Five layers; four cross blocks (1 to 4), and every block is on at least two of them.

## What it builds on, and its depth of read

- **16 is the tool, and its timing is the trap.** 16 taught that a red can be taken on purpose. Here the same red is safe or fatal by the box it names, and which box it names depends on what else is lit, on other blocks.
- **3 with the floor taken away.** In 3 a wrong sum was a brownout, and cost nothing. Here the mother is the feed: a wrong sum is a blow.
- **10 as a tool.** The bulb is a load event, and one of the three is fitted so that its 3 will be the last straw. It lights nothing.
- **15:** two bars over every building on a sister's branch, and a third bar that is neither's. The read is which of them a number names.
- **Depth of read: 10.** Before the first move that can't be taken back (the first bulb) the player must hold: (1) the list is four buildings, 13; (2) the mother is rated as the feed, so there is no brownout: one over and she blows; (3) she stands at 21 of 23; (4) at the win the list and its houses are 22, so the tile works, the homes and the cooperage must all be dark; (5) the tile works has a switch, and the east branch has nothing; (6) a sister's fuse is a breaker for her whole branch, and hers alone; (7) the one load that can be added under the east sister is the store's bulb: 10 on 9; (8) the mother must carry that overload for the instant, and at 21 she cannot: the tile works goes off first; (9) every target lit before the blow takes the same room: one bulb leaves it, two do not, and a bulb cannot be taken out; (10) three bulbs, three sockets, and one of them is spent on a building that will be dark. Puzzle 22 asks for 9.

## The numbers (section V)

- At the start: `f_shrine`, `f_gran`, `f_store` each **+3 red, blows `fb_m`**; `sw_k` **−4**; `sw_1` **+2**; `br_4` +0.
- After `sw_k`: `f_shrine`, `f_gran` **+3 white**; `f_store` **+3 red, blows `fb_e`**; `br_4` +4 (the bath house counted as sound).
- After `sw_k` and one target's bulb: `f_store` still **red, blows `fb_e`**. After two: `f_store` **red, blows `fb_m`**; `sw_1` **+2 red, blows `fb_m`**.
- After the blow: the east sister's ✕ reads **+10 red** (blows her again); every step of the list is white.
- **The box a red names is the whole read.** The overlay names it on the number; the three bars (21 of 23, 7 of 9, 6 of 11) say why.

## The tribe's homes

`homes` (priority, load 2) hangs under the east sister with the cooperage, on a wire with no breaker. It is lit at the start. **It is dark at the win**, and it is the player who puts it out, on purpose, with a bulb. Nothing on the map lights the four and keeps the homes: the mother has room for 1.

## Changed from the plan's row

- **Kept:** several targets, a main fuse equal to the feed, "here a brownout is a blow", and the trap's shape: every step fits until a late target, and the homes had to go dark earlier. The deliberate blow on one sister is the shed the list needs (N5's starting point).
- **Changed:** the row had three fuse boxes in a line of unstated shape; here they are one mother and two sisters (N5's new shape). "Until the fourth target, two steps earlier" is here "until the third, one step earlier": the mother has 1 to spare at the win, not 3. Two switches and one breaker, not three and two. The kit is wire, three bulbs and a spare fuse (the row: wire, bulb, fuse): two bulbs are the list's, and one is the tool.
- **Size:** 4 / wire, 3 bulbs, fuse / 2 switches, 1 breaker, 3 fuse boxes; 4 blocks.

## Limits passed

None. 7 clicks, 1 hidden fact, 4 faults (at the cap), 8 own buildings (at the cap: homes, cooperage, store, shrine, infirmary, granary, tile works, bath house), 4 blocks.

## Series rules

- **Reuse is free.** A fuse is blown on purpose on the shortest win (`fb_e`), and a blow on the mother is the trap.
- **Kit: wire, 3 bulbs, 1 fuse.** Puzzle 22's is wire, 2 bulbs, 1 fuse. **Puzzle 24's must not be a wire, three bulbs and a fuse.**
- **Heavy building: the cooperage** (load 5), with the tile works (4). Puzzle 22's is the ice house. **Puzzle 24's must not be the cooperage.**
- **Shrine count: 3 of 5.** The shrine is on the list.
- District `block:6:8`, `block:6:9`, `block:7:8`, `block:7:9`. `block:6:9`, `block:7:8` and `block:7:9` have not been used by the series; `block:6:8` was half of puzzle 11's district. It shares no block with puzzle 22 (`block:5:4`, `block:6:3`, `block:6:6`); the feed's pole is on `block:6:6`'s pavement, outside the district. **Puzzle 24 must use none of these four.**
- **Districts used by 1 to 23**, none to be a district again: the 22 listed in `s22-move-the-meeting.md`, and now `block:6:8` + `block:6:9` + `block:7:8` + `block:7:9`. Blocks no series puzzle has used: `block:5:0`, `block:5:1`, `block:3:2`, `block:8:5`, `block:0:7`, `block:5:7`, `block:8:8`, `block:5:10`.

## Expected numbers

`npm run analyze puzzles/city/s23-the-priests-list.city.json` (no clock and no battery, so one run; 5 s):

| | |
| --- | --- |
| States | 398, exhaustive |
| Solvable | yes |
| Fewest clicks | **7** |
| One shortest win | `sw_1`, `sw_k`, `br_4`, `repair:store`, `repair:shrine`, `repair:granary`, `repair:l_w3` |
| Winning click orders | 228 |
| Winning configurations | **1** (`sw_k` and `sw_1` thrown, `br_4` closed, all three bulbs and the wire in, the east sister blown) |
| Parts used | wire, bulb, bulb, bulb (4 of 5; the fuse is the spare) |
| Feed at the shortest win | 22 of 23 |
| Fuses that blow on a shortest win | **`fb_e`** (the deliberate blow) |
| Fuses that blow on some move | `fb_e`, `fb_m` |
| First moves | `sw_1`, `sw_k`, `br_4`, `repair:store`, `repair:shrine`, `repair:granary` |
| Dead-end states | 150 of 398 (37.7%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the break on the bath house's wire |

**No win without a sister blown under a whole mother.** The list and its houses are 22 of 23; the east branch is 7 more, and has no breaker or switch. The one winning configuration has `fb_e` blown and `fb_m` whole, and the analyzer's every shortest win blows `fb_e`.

Loads, replayed on the conversion: start 21 of 23 (`fb_e` 7 of 9, `fb_s` 6 of 11); `sw_k` 17; the store's bulb 20 for an instant, `fb_e` 10 on 9, then 10; the shrine 13; the granary 16; `sw_1` 18; the wire 22 of 23, `fb_s` 11 of 11, win. The trap: 26 on the mother's 23.

**The obvious wrong first move** is a target's bulb (or the store's) on its red: the mother blows. Read: the red +3 naming the mother, then the bolt and a dark map. Recovered by **a part**: `sw_k`, then the spare fuse. **The trap proper** (two targets' bulbs before the blow) is recovered by one Undo. The dead-end states are those with two targets' bulbs in and the east sister whole, or the mother blown twice. The check block replays the list first, the store's bulb a step late, the store's bulb at once, and one bulb before the blow.

**Where it stands against 22:** it reads deeper (10 facts against 9) and takes a click more (7 against 6). It has more winning click orders (228 against 174): once the blow is made the list can be lit in any order, and that freedom is most of the count. Its share of dead-end states is lower (37.7% against 59.5%), because a mother blown once is mended by the spare. It is the first puzzle since 16 whose shortest win blows a fuse, and the first where the same red is right or fatal by the box it names.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw_k", "repair:store", "repair:shrine", "repair:granary", "sw_1", "br_4", "repair:l_w3"],
  "traps": [
    { "name": "the list first: every step fits until the third target",
      "moves": ["sw_k", "repair:shrine", "repair:granary", "sw_1"],
      "expect": { "blown": ["fb_m"], "readable": ["blown-fb_m"], "complete": false },
      "recover": ["undo", "undo", "repair:store", "repair:granary", "sw_1", "br_4", "repair:l_w3"] },
    { "name": "the store's bulb a step late: the red names the mother",
      "moves": ["sw_k", "repair:shrine", "repair:granary", "repair:store"],
      "expect": { "blown": ["fb_m"], "readable": ["blown-fb_m"], "complete": false },
      "recover": ["undo", "undo", "repair:store", "repair:granary", "sw_1", "br_4", "repair:l_w3"] },
    { "name": "the store's bulb at once, with the tile works still lit",
      "moves": ["repair:store"],
      "expect": { "blown": ["fb_m"], "readable": ["blown-fb_m"], "complete": false },
      "recover": ["sw_k", "repair:fb_m", "repair:shrine", "repair:granary", "sw_1", "br_4", "repair:l_w3"] },
    { "name": "one target's bulb before the blow: there is still room",
      "moves": ["sw_k", "repair:shrine"],
      "expect": { "lit": ["shrine", "homes", "cooperage"], "complete": false },
      "recover": ["repair:store", "repair:granary", "sw_1", "br_4", "repair:l_w3"] }
  ]
}
```

## To check in the pane (the main session)

- The opening frame holds all four blocks (135 m by 110 m), the feed's pole at the top and the store at the right-hand edge.
- **Three fuse boxes within 60 m of each other round the middle of the map:** the mother at the top of `6:8`'s east street, the east sister across `z:7` from the hub (16.5 m), the south sister 30 m south. Each bar reads, and each reads as its own box.
- The east sister's branch reads as one wire with nothing on it but three buildings.
- The two switches read as switches, each with a building on its own pole.
- The bolt on the deliberate blow runs east from the hub, and the mother's bar drops as it lands.

## To watch when Josh plays it

- **Only in the HUD:** nothing the solve needs. The feed's 23 is the mother's 23, and her bar is on the city.
- Whether the box a red names is read at all. The whole puzzle is `fb_m` against `fb_e` on one number; if the name is easy to miss, the store's bulb is a coin toss.
- Whether he takes the red on purpose (puzzle 16), and whether he throws `sw_k` first because of what the store's red says, or after the mother has blown once.
- Whether "one bulb leaves room, two do not" is reasoned, or found by the store's red changing its name.
- Whether spending a bulb on a building that never lights feels like a trick or like the answer.
- Whether the east sister's ✕, left on the map at the win with a spare fuse in hand, nags to be mended.
- Whether the homes, put out by his own hand, are noticed. This is the first win that costs the tribe something the player did.

## What it taught us
