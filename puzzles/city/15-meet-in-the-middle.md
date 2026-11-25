# 15 · Meet in the middle (city form, reworked) — design note

The city form of [`puzzles/15-meet-in-the-middle.md`](../15-meet-in-the-middle.md), **reworked** under ticket 081 answer 4 ("Change the puzzle instead") because the schematic does not fit the city as it stands, then laid by `npm run fit` (P1) and raised with `npm run fit -- --raise`. The element under test is the schematic's and is kept: **who carries what on a ring between two feeds** (ticket 015 rule 2, *nearest feed carries it*): each junction is carried by the feed with the fewest hops to it, and a long-way switch moves the meeting point away from its own feed. The read, the traps and the hop tables are in the schematic note; this note says what changed and why, where the pieces stand, and what to watch.

## What changed from the schematic, and why

Item by item, so Josh can judge it when he plays it.

1. **Two junctions added, `j_w` and `j_e`, one beside each feed.** *Why:* CK14 gives a city feed one line over one entering span (the feed stands on a pole just outside the district), and the schematic's feeds have two lines each: West feeds the inn and `sw_w` directly, East the mill and `sw_e`. `npm run fit` says so: "no fit: feed west, has 2 lines; a city feed has one line over one entering span (CK14)". Now `west` → `j_w` (new line `l_w0`) → the inn and `sw_w`; `east` → `j_e` (new line `l_e0`) → the mill and `sw_e`. `l_inn`, `l_w`, `l_mill` and `l_e` keep their ids and start at the new junctions.
   *What it costs:* nothing in play. Every hop count from a feed grows by exactly 1 on that feed's side, so every difference of hops that decides a carrier is the schematic's, and the street end to end is still odd (9 hops, 27 after S1's line split), so no junction is ever at a tie and the invisible tie-break never decides a lamp. Hops with both switches short (West / East): `jA` 3 / 6, `jB` 4 / 5, `jC` 5 / 4, `jD` 6 / 3; the long way adds 2 on its own side, as in the schematic. The designer replayed all 16 switch and breaker settings on the schematic, on the rework and on the city file: in all 16 the same feed is over (or none), each feed has the same room to spare, and the same lamps are lit.
2. **The capacities raised: West 3 to 6, East 4 to 8** (section S; Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; on cards "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", "Raise (Recommended)"). The win lights 7 scenery buildings, 3 carried by West and 4 by East. On this lay **each building stays with the same feed in every setting** (none hangs where the meeting point moves), so each feed's load is the schematic's plus a constant (West +3, East +4) and each feed's spare room is the schematic's in every state. That is why this lay, the fit's first, was kept. The designer also tried every other district where the rework fits (5 of one block, 22 of two). About half keep each feed's spare room in all 16 settings; of those, only one (`block:8:5` with `block:8:7`) stands the shrine nearer South, and only slightly (by wire it is still nearer North). `block:7:5` draws the shrine right by the mill, as the schematic does, but there scenery changes feed with `sw_w` and `sw_e`: it opens with North full and South with room for the shrine, which breaks step 1 of the read, and throwing `sw_e` alone browns North out.
3. **The feeds' names, "West" and "East" to "North" and "South".** On the city, `west` stands across `x:1` at the district's north-east corner and `east` across `x:5` at its south-east corner. The ids stay `west` and `east` (the check block and the schematic's tables use them); only the HUD's labels follow the map.

**Where the element cannot be kept as it was: the drawing's bait.** The schematic draws the shrine at the east end, near the mill, so the player expects East to carry it and closes `br_sh` into West's brownout. On the city the shrine's building is at the district's north-west corner, at the end of North's (`west`'s) pole line: 61 m of wire from North to its junction and 235 m from South. The bait is gone: a player who reads the wires will expect North to carry the shrine, and North does. What remains is the second half of the lesson, which the city makes starker: to hand the shrine to South, lengthen **North's** route (`sw_w`). After that, North's wire to the shrine is 118 m and South's still 235 m, and South carries it, by hops. If counting hops against visibly longer wire feels arbitrary in play, that is the evidence the schematic note asks for ("Rule 2 is Draft and Josh's to tune").

## Where it stands

- `from`: `15-meet-in-the-middle`. City: 6 x 6 seed 1, one-way on.
- District: `block:8:1`, on the city's east side, about 55 m by 90 m, with roof structures and buildings across its streets on `block:8:0`, `block:7:1` and `block:8:5` (CK14, B1-Q5 "Neighbouring blocks too"). The street runs like a U: from North's corner west along `x:1` (`j_w`, `sw_w`, `jA`, `jB`, `br_sh` and the shrine at the north-west corner), down the block's west side over the roofs (`jC` to `jD`), and east along `x:5` to South's corner (`jD`, `br_g` and the gate at the south-west corner, `j_e` and the mill near the south-east). The long ways are short loops over the roofs at each end.
- Capacities North (`west`) **6**, South (`east`) **8**; no top-level capacity; no parts; target the forge, the shrine, the well, the inn and the mill; priority the gate.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed, capacity 6 | pole `pole:x:1:lo:482.50` (crossing, block:8:0, +z side) | 482.50, 69.25 |
| `east` | feed, capacity 8 | pole `pole:x:5:hi:482.50` (crossing, block:8:5, -z side) | 482.50, 190.75 |
| `j_w` | junction | pole `pole:x:1:hi:482.50` (end, block:8:1, -z side) | 482.50, 85.75 |
| `inn` | lamp, load 1 | lamp post under `span:pole:x:1:hi:471.50~pole:x:1:hi:482.50` | 477.00, 85.75 |
| `sw_w` | switch, 0 `l_w_short`, 1 `l_w_long`; set 0 | pole `pole:x:1:hi:471.50` (slot, block:8:1, -z side) | 471.50, 85.75 |
| `d1` | junction | roof structure `roof:93:18` (mid, on `block:8:1/a\|outer\|-z\|92,18`) | 467.50, 90.60 |
| `d2` | junction | roof structure `roof:90:12` (mid, on `block:8:0/b\|outer\|+z\|89,12`) | 452.50, 64.40 |
| `jA` | junction | pole `pole:x:1:hi:460.50` (slot, block:8:1, -z side) | 460.50, 85.75 |
| `forge` | lamp, load 1 | lamp post under `span:pole:x:1:hi:449.50~pole:x:1:hi:460.50` | 455.00, 85.75 |
| `jB` | junction | pole `pole:x:1:hi:438.50` (slot, block:8:1, -z side) | 438.50, 85.75 |
| `br_sh` | breaker, open | pole `pole:x:1:hi:427.50` (end, block:8:1, -z side) | 427.50, 85.75 |
| `shrine` | lamp, load 2 | building `block:8:1/a\|outer\|-z\|85,18` | 427.50, 90.00 |
| `jC` | junction | roof structure `roof:85:18` (corner, on `block:8:1/a\|outer\|-z\|85,18`) | 425.60, 90.60 |
| `well` | lamp, load 1 | roof structure `roof:80:18` (corner, on `block:7:1/a\|outer\|-z\|79,18`) | 404.40, 90.60 |
| `jD` | junction | roof structure `roof:85:33` (corner, on `block:8:1/b\|outer\|+z\|85,33`) | 425.60, 169.40 |
| `br_g` | breaker, closed | pole `pole:x:5:lo:427.50` (end, block:8:1, +z side) | 427.50, 174.25 |
| `gate` | lamp, load 1 | building `block:8:1/b\|outer\|+z\|85,33` | 427.50, 170.00 |
| `j_e` | junction | roof structure `roof:94:33` (mid, on `block:8:1/b\|outer\|+z\|93,33`) | 472.50, 169.40 |
| `sw_e` | switch, 0 `l_e_short`, 1 `l_e_long`; set 0 | roof structure `roof:90:39` (mid, on `block:8:5\|outer\|-z\|90,39`) | 452.50, 195.60 |
| `k1` | junction | roof structure `roof:91:33` (mid, on `block:8:1/b\|outer\|+z\|89,33`) | 457.50, 169.40 |
| `k2` | junction | pole `pole:x:5:lo:438.50` (slot, block:8:1, +z side) | 438.50, 174.25 |
| `mill` | lamp, load 1 | building `block:8:1/b\|outer\|+z\|93,33` | 472.50, 170.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `j_w` | 1 span: crossing | 16.50 |
| `l_inn` | `j_w` → `inn` | lead | — |
| `l_w` | `j_w` → `sw_w` | 1 span: along | 11.00 |
| `l_w_short` | `sw_w` → `jA` | 1 span: along | 11.00 |
| `l_w_long` | `sw_w` → `d1` | 1 span: roof (pavement) | 6.29 |
| `l_d` | `d1` → `d2` | 1 span: roof (street) | 30.19 |
| `l_d_a` | `d2` → `jA` | 2 spans: roof (street), roof (pavement) | 32.38 |
| `l_forge` | `jA` → `forge` | lead | — |
| `l_ab` | `jA` → `jB` | 2 spans: 2 along | 22.00 |
| `l_b_br` | `jB` → `br_sh` | 1 span: along | 11.00 |
| `l_shrine` | `br_sh` → `shrine` | drop | — |
| `l_bc` | `jB` → `jC` | 1 span: roof (pavement) | 13.78 |
| `l_well` | `jC` → `well` | 1 span: roof (street) | 21.20 |
| `l_cd` | `jC` → `jD` | 4 spans: 4 roof (street) | 122.66 |
| `l_d_br` | `jD` → `br_g` | 1 span: roof (pavement) | 5.21 |
| `l_gate` | `br_g` → `gate` | drop | — |
| `l_e0` | `east` → `j_e` | 2 spans: crossing, roof (pavement) | 27.61 |
| `l_mill` | `j_e` → `mill` | 1 span: roof (pavement) + drop | 4.95 |
| `l_e` | `j_e` → `sw_e` | 1 span: roof (street) | 32.96 |
| `l_e_short` | `sw_e` → `jD` | 1 span: roof (street) | 37.55 |
| `l_e_long` | `sw_e` → `k1` | 1 span: roof (street) | 26.67 |
| `l_k` | `k1` → `k2` | 2 spans: roof (pavement), along | 20.36 |
| `l_k_d` | `k2` → `jD` | 1 span: roof (pavement) | 13.78 |

The well is a lamp on a roof structure across the street from `jC` (on `block:7:1`), as B1-Q1 ("Anything") allows. `l_cd` crosses the block's west street four times over the roofs between `jC` and `jD`.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `k2~s` | node pole: `k2` | 1 | 0 / 1 | yes | yes |
| `l_ab~h1~s` | carrier of `l_ab` | 2 | 1 / 1 | yes | yes |
| `l_e0~h1~s` | carrier of `l_e0` | 1 | 1 / 0 | yes | yes |
| `l_k~h1~s` | carrier of `l_k` | 1 | 1 / 0 | yes | yes |
| `l_mill~h1~s` | carrier of `l_mill` | 1 | 0 / 1 | yes | yes |
| `l_w~h2~s` | node pole: `sw_w` | 1 | 1 / 0 | yes | yes |
| | | **7** | **4 / 3** | | |

Buildings: `l_ab~h1~s`: `block:8:0/b|outer|+z|89,12`, `block:8:1/a|outer|-z|88,18`; `l_w~h2~s`: `block:8:1/a|outer|-z|92,18`; `l_k~h1~s`: `block:8:1/b|outer|+z|89,33`; `l_e0~h1~s`: `block:8:1/b|outer|+z|95,33`; `k2~s`: `block:8:5|outer|-z|86,39`; `l_mill~h1~s`: `block:8:5|outer|-z|93,39`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city west 5 of 6, east 7 of 8; schematic west 2 of 3, east 3 of 4
- win (br_g, sw_w, br_sh): city west 5 of 6, east 8 of 8; schematic west 2 of 3, east 4 of 4
- trap "the shrine is drawn by the mill" (br_g, br_sh): city west 7 of 6, east 6 of 8 (brownout); schematic west 4 of 3, east 2 of 4 (brownout)
- trap "throw the switch on the side with room" (br_g, sw_e, br_sh): city west 8 of 6, east 5 of 8 (brownout); schematic west 5 of 3, east 1 of 4 (brownout)
- trap "throw both" (br_g, sw_w, sw_e, br_sh): city west 7 of 6, east 6 of 8 (brownout); schematic west 4 of 3, east 2 of 4 (brownout)

## The intended read from the default camera

1. HUD: North using 5 of 6, South using 7 of 8. The shrine (Lv2) is dark behind `br_sh`, at the north-west corner. Each feed has 1 to spare; neither has room for 2.
2. Make room on South: the gate (the priority home, at the south-west corner) is the only lamp not wanted. Open `br_g`: South 6 of 8.
3. Count hops to `jB`, the shrine's junction: North reaches it in 4, South in 5, so North carries it. Lengthen North's route: throw `sw_w` (the next pole along `x:1` from North's corner). `jB` is now 6 from North against 5 from South. Nothing visible changes.
4. Close `br_sh`. The shrine lights, on South. North 5 of 6, South 8 of 8. **Win.** The three clicks go in any order.

## The trap

The schematic's three wrong moves all still brown out, on the feed its note says:
- `br_g` then `br_sh`: the shrine goes to North, **North 7 of 6**, South 6 of 8 with 2 unused.
- Throwing the switch on the side with room (`sw_e`, to "connect the shrine to South") moves the meeting point toward South: the well jumps to North (North full, 6 of 6), and with the shrine on, North is 8 of 6.
- Throwing both: the meeting point doesn't move, North 7 of 6.

Every state can still win; throw `sw_w` (and back `sw_e`) and the brownout clears. With the gate still lit, the right switch browns out South instead (9 of 8).

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/15-meet-in-the-middle.json` (the schematic as it stands; the reworked schematic, with `j_w` and `j_e`, gives the same numbers). **New, for a rework, and equal to the schematic's but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (sw_w, br_sh, br_g) | 3 (sw_w, br_sh, br_g) |
| Winning orders / configurations | 6 / 1 | 6 / 1 |
| Parts used | none | none |
| Feed at the win | west 2 of 3, east 4 of 4 | **west 5 of 6, east 8 of 8** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts: none. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block, so this rework has its own: the intended read and the three wrong moves, made executable. It replays on the schematic and through this file's conversion with the same outcomes, and `npm run check puzzles/city/15-meet-in-the-middle.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_g", "sw_w", "br_sh"],
  "traps": [
    { "name": "the shrine on North",
      "moves": ["br_g", "br_sh"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["sw_w"] },
    { "name": "throw the switch on the side with room",
      "moves": ["br_g", "sw_e", "br_sh"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["sw_e", "sw_w"] },
    { "name": "throw both",
      "moves": ["br_g", "sw_w", "sw_e", "br_sh"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["sw_e"] }
  ]
}
```

## What it taught us
