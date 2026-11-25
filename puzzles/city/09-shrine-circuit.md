# 09 · The shrine circuit (city form) — design note

The city form of [`puzzles/09-shrine-circuit.md`](../09-shrine-circuit.md), the model map, laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the reroute** instead of the obvious repair, and shedding the street for the shrine), the read, the two traps and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights. `fb_A`'s rating is unchanged.

## Where it stands

- `from`: `09-shrine-circuit`. City: 6 x 6 seed 1, one-way on.
- District: `block:3:0`, on the city's north edge, about 40 m by 75 m. The feed comes across `x:2` at the block's south-east corner. The street branch runs west along `x:2` to the south-west corner (`fb_A` on its corner roof, the three street lamps round it); the shrine branch goes up onto the south-east corner roof (`sw_1`) and over `z:5`, the street on the block's east side.
- Capacity **7** (the schematic's 4, raised by 3), `fb_A` rating **3** (unchanged), 1 wire, target the shrine, priority the street lamps, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:162.50` (crossing, block:3:2, -z side) | 162.50, 115.75 |
| `br_main` | breaker, closed | pole `pole:x:2:lo:162.50` (end, block:3:0, +z side) | 162.50, 109.25 |
| `j1` | junction | pole `pole:x:2:lo:150.83` (slot, block:3:0, +z side) | 150.83, 109.25 |
| `br_street` | breaker, closed | pole `pole:x:2:lo:139.17` (slot, block:3:0, +z side) | 139.17, 109.25 |
| `fb_A` | fuse box, rating 3 | roof structure `roof:25:20` (corner, on `block:3:0/b\|outer\|-x\|25,17`) | 125.60, 104.40 |
| `j2` | junction | pole `pole:x:2:lo:127.50` (end, block:3:0, +z side) | 127.50, 109.25 |
| `street_1` | lamp, load 1 | building `block:3:2\|outer\|-z\|25,24`, its drop across `x:2` | 127.50, 120.00 |
| `street_2` | lamp, load 1 | lamp post under `span:pole:x:2:lo:127.50~pole:x:2:lo:139.17` | 133.33, 109.25 |
| `street_3` | lamp, load 1 | building `block:3:0/b\|outer\|-x\|25,17` | 125.00, 102.50 |
| `sw_1` | switch, 0 `l_a`, 1 `l_b`; set 0 | roof structure `roof:32:20` (corner, on `block:3:0/b\|outer\|+z\|30,20`) | 164.40, 104.40 |
| `j_dead` | junction | pole `pole:z:5:lo:102.50` (end, block:3:0, +x side) | 169.25, 102.50 |
| `j4` | junction | roof structure `roof:38:20` (mid, on `block:5:1/built\|outer\|-x\|38,20`) | 190.60, 102.50 |
| `flood` | lamp, load 2 | roof structure `roof:32:18` (mid, on `block:3:0/b\|outer\|+x\|32,16`) | 164.40, 92.50 |
| `j5` | junction | pole `pole:z:5:lo:92.50` (landing, block:3:0, +x side) | 169.25, 92.50 |
| `shrine` | lamp, load 1 | building `block:3:0/b\|outer\|+x\|32,16` | 165.00, 92.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 6.50 |
| `l_main` | `br_main` → `j1` | 1 span: along | 11.67 |
| `l_s0` | `j1` → `br_street` | 1 span: along | 11.67 |
| `l_s1` | `br_street` → `fb_A` | 1 span: roof (pavement) | 14.41 |
| `l_s2` | `fb_A` → `j2` | 1 span: roof (pavement) | 5.21 |
| `l_st1` | `j2` → `street_1` | drop | — |
| `l_st2` | `j2` → `street_2` | lead | — |
| `l_st3` | `j2` → `street_3` | 1 span: corner + drop | 9.55 |
| `l_sw` | `j1` → `sw_1` | 1 span: roof (pavement) | 14.41 |
| `l_a` | `sw_1` → `j_dead` | 1 span: roof (pavement) | 5.21 |
| `l_a2` | `j_dead` → `j5` | 1 span: along | 10.00 |
| `l_b` | `sw_1` → `j4` | 1 span: roof (street). **Fault `f2` cuts span 1 of 1, `span:roof:32:20~roof:38:20`** | 26.27 |
| `l_b2` | `j4` → `j5` | 1 span: roof (street) | 23.58 |
| `l_flood` | `j4` → `flood` | 1 span: roof (street) | 28.04 |
| `l_shrine` | `j5` → `shrine` | drop | — |

`j4` stands on a roof structure of `block:5:1`, across `z:5` from the district: a job may use roofs one street beyond its district (CK14, B1-Q5 "Neighbouring blocks too"). The three roof spans `l_b`, `l_b2` and `l_flood` cross `z:5` between the two blocks. **The cut** (`f2`) is on `l_b`'s one span, the 26.3 m roof span from `sw_1`'s roof over `z:5` to `j4`'s; the file names it.

**09 needed fix (a), and the fit found it.** The pre-check (`docs/design/081-all-connected-powered.md`, section 2) found 09's first fit blowing `fb_A` at once at "Whole": its start lit more scenery under `fb_A` than its win. Ticket 081 P2a's fix (a) is a re-lay that keeps `fb_A`'s branch off poles with scenery drops. P1's fit passes over embeddings that don't play the same raised; on 6 x 6 seed 1 it passed over the first district it tried and laid 09 on the second, `block:3:0`, where `fb_A` stands on a roof structure (no drops, CK17e) and every pole past it carries only job lamps. So `fb_A` carries exactly the street lamps, 3 of 3 at the start and 0 at the win, as the schematic, and fix (b) (raising the rating) was not needed. The fuse's role is unchanged: as in the schematic, it never blows on this map.

## What changed from the schematic, and why

One thing changed: **the capacity, 4 to 7.** `fb_A`'s rating stays 3.

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights three scenery buildings, so 4 + 3 = 7.
- **The four scenery buildings.** Three are upstream of every choice (on `br_main`'s, `j1`'s and `br_street`'s poles; a breaker's building hangs on the feed's side of it), so they add 3 to every load. The fourth is on `j_dead`'s pole, across `z:5`, and stays dark: the dead junction is never mended.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j1~s` | node pole: `j1` | 1 | 0 / 1 | yes | yes |
| `j_dead~s` | node pole: `j_dead` | 1 | 0 / 1 | no | no |
| `l_feed~h2~s` | node pole: `br_main` | 1 | 1 / 0 | yes | yes |
| `l_s0~h2~s` | node pole: `br_street` | 1 | 1 / 0 | yes | yes |
| | | **4** | **2 / 2** | | |

Buildings: `l_s0~h2~s`: `block:3:0/b|outer|+z|26,20`; `l_feed~h2~s`: `block:3:0/b|outer|+z|30,20`; `j_dead~s`: `block:5:1/built|outer|-x|38,20`; `j1~s`: `block:3:2|outer|-z|28,24`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 6 of 7; `fb_A` 3; schematic feed 3 of 4; `fb_A` 3
- win (br_street, sw_1, repair:l_b): city feed 6 of 7; `fb_A` 0; schematic feed 3 of 4; `fb_A` 0
- trap "the reroute browns it out" (sw_1, repair:l_b): city feed 9 of 7; `fb_A` 3 (brownout); schematic feed 6 of 4; `fb_A` 3 (brownout)

## The intended read from the default camera

1. The view opens at 6 of 7. The three street lamps are lit round the block's south-west corner (a building across `x:2`, a lamp post on `x:2`, a building round the corner on `z:3`), through `fb_A` on the corner roof (its bar 3 of 3). The shrine's building, on the block's east side on `z:5`, is dark.
2. `sw_1`, on the south-east corner roof, sends the current down to `j_dead`, a pole on `z:5`: the wire runs in and nothing comes out, no fuse to blame. A **dead junction**, *needs wire × 2*. Enoch has one.
3. Throw `sw_1`. The current runs over `z:5` on the roof span towards `j4` and stops at a **break icon** with sparks, over the street. One wire.
4. Repair it. `j4`'s roof is live: the flood (on the roof of the shrine's building) and, back across `z:5` through `j5`, the shrine light. 9 of 7: **brownout**.
5. Throw `br_street`, two poles west of the corner on `x:2`. The street goes dark. 6 of 7. **Win**, and the Relight.

## The trap

The schematic's two. The dead junction is the obvious target and the one thing the player can't fix; the switch on the roof above it is the way round. Then the reroute brings the flood with it, and the only way to afford the shrine is to darken the street the tribe lives on (the priority lamps). Both are readable (the dead junction's prompt, the brownout and the HUD's 9 of 7) and free to back out of.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/09-shrine-circuit.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (br_street, sw_1, repair:l_b) | 3 (br_street, sw_1, repair:l_b) |
| Winning orders / configurations | 3 / 1 | 3 / 1 |
| Parts used | wire | wire |
| Feed at the win | feed 3 of 4 | **feed 6 of 7** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: 1 wire (fixing `j_dead` would need 2), as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and its second trap (the reroute's brownout), made executable; the first trap (trying the dead junction) costs nothing and is refused by its prompt, so it has no state to check. It replays the same on the schematic (`puzzles/09-shrine-circuit.json`) and through this file's conversion, and `npm run check puzzles/city/09-shrine-circuit.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_street", "sw_1", "repair:l_b"],
  "traps": [
    { "name": "the reroute browns it out",
      "moves": ["sw_1", "repair:l_b"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_street"] }
  ]
}
```

## What it taught us
