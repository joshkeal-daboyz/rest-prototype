# 07 · Past the fuse (city form) — design note

The city form of [`puzzles/07-past-the-fuse.md`](../07-past-the-fuse.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**the blown fuse and the dead bulb**, a hidden fault found by a repair, then a brownout from the last correct repair), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity raised by the scenery the win lights. `fb_A`'s rating is unchanged: no scenery hangs under it.

## Where it stands

- `from`: `07-past-the-fuse`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:0`, the city's corner block, at its south-west corner. The hub `j0` is the corner pole. Three ways leave it: east along `x:2` through `fb_A` to `j1` (the lane and the shrine), round the corner on `z:0` to `br_mk` (the market), and up onto the corner roof to `br_hm`, which sends a roof span down to `j2` on `z:0` (the homes).
- Capacity **5** (the schematic's 4, raised by 1), `fb_A` rating **3** (unchanged); a fuse and a bulb; target the shrine, priority the homes, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:2:hi:27.50` (crossing, block:0:2, -z side) | 27.50, 115.75 |
| `j0` | junction | pole `pole:x:2:lo:27.50` (end, block:0:0, +z side) | 27.50, 109.25 |
| `fb_A` | fuse box, rating 3 | pole `pole:x:2:lo:39.17` (slot, block:0:0, +z side) | 39.17, 109.25 |
| `j1` | junction | pole `pole:x:2:lo:50.83` (slot, block:0:0, +z side) | 50.83, 109.25 |
| `lane` | lamp, load 1 | building `block:0:0/b\|outer\|+z\|9,20` | 52.50, 105.00 |
| `shrine` | lamp, load 1 | building `block:0:2/a\|outer\|-z\|8,24`, its drop across `x:2` | 52.50, 120.00 |
| `br_mk` | breaker, closed | pole `pole:z:0:hi:102.50` (end, block:0:0, -x side) | 20.75, 102.50 |
| `market` | lamp, load 1 | lamp post under `span:pole:z:0:hi:102.50~pole:z:0:hi:90.00` | 20.75, 96.25 |
| `br_hm` | breaker, closed | roof structure `roof:5:20` (corner, on `block:0:0/b\|outer\|+z\|5,20`) | 25.60, 104.40 |
| `j2` | junction | pole `pole:z:0:hi:90.00` (slot, block:0:0, -x side) | 20.75, 90.00 |
| `home_1` | lamp, load 1 | building `block:0:0/b\|outer\|-x\|5,17` | 25.00, 87.50 |
| `home_2` | lamp, load 1 | lamp post under `span:pole:z:0:hi:77.50~pole:z:0:hi:90.00` | 20.75, 83.75 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 6.50 |
| `l_a` | `j0` → `fb_A` | 1 span: along | 11.67 |
| `l_a2` | `fb_A` → `j1` | 1 span: along | 11.67 |
| `l_lane` | `j1` → `lane` | drop | — |
| `l_shrine` | `j1` → `shrine` | drop | — |
| `l_mk` | `j0` → `br_mk` | 1 span: corner | 9.55 |
| `l_mk2` | `br_mk` → `market` | lead | — |
| `l_hm` | `j0` → `br_hm` | 1 span: roof (pavement) | 5.21 |
| `l_hm2` | `br_hm` → `j2` | 1 span: roof (pavement) | 15.19 |
| `l_h1` | `j2` → `home_1` | drop | — |
| `l_h2` | `j2` → `home_2` | lead | — |

The fit's places are kept. The shrine (the dead bulb) is the building across `x:2` from `j1`, on `block:0:2`; the lane is the building on the district's side of the same pole.

## What changed from the schematic, and why

One thing changed: **the capacity, 4 to 5.** `fb_A`'s rating stays 3.

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)". The win lights one scenery building, so 4 + 1 = 5.
- **The one scenery building** is on `j0`'s pole, upstream of the fuse and both breakers: lit in every state, it adds exactly 1 to every load, and nothing to `fb_A`'s. `j1`'s pole carries only the lane and the shrine (job lamps), so `fb_A` peaks at 2 of 3, as the schematic.

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `j0~s` | node pole: `j0` | 1 | 1 / 0 | yes | yes |
| | | **1** | **1 / 0** | | |

Building: `j0~s`: `block:0:0/b|outer|+z|5,20`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 4 of 5; `fb_A` 0; schematic feed 3 of 4; `fb_A` 0
- win (br_mk, repair:fb_A, repair:shrine): city feed 5 of 5; `fb_A` 2; schematic feed 4 of 4; `fb_A` 2
- trap "the bulb browns it out" (repair:fb_A, repair:shrine): city feed 6 of 5; `fb_A` 2 (brownout); schematic feed 5 of 4; `fb_A` 2 (brownout)

## The intended read from the default camera

1. The view opens at 4 of 5: the market's lamp post on `z:0` and the two homes are lit. `fb_A`, one pole east of the corner on `x:2`, shows the blown-fuse ✕: the wire runs in and nothing comes out. Nothing past it can be read.
2. Repair `fb_A`. The lane's windows light; the shrine's building across `x:2` stays dark with the dead-bulb mark. 5 of 5.
3. Repair the shrine. 6 of 5: **brownout**, everything flickers.
4. Shed 1. Throw `br_mk`, on the corner of `z:0` (the market, 1): 5 of 5. **Win.** The homes stay lit.

## The trap

The schematic's: the brownout arrives on the bulb repair, so it reads as "the bulb broke something", and the instinct is to undo it. The bulb was right; the feed is full. Then the choice of what to shed: the homes (2, behind the roof breaker) clear it with room to spare but darken the priority; the market alone is enough. Shedding the homes still wins. Nothing on this map dead-ends.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/07-past-the-fuse.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 12, exhaustive | 12, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (br_mk, repair:fb_A, repair:shrine) | 3 (br_mk, repair:fb_A, repair:shrine) |
| Winning orders / configurations | 6 / 3 | 6 / 3 |
| Parts used | fuse, bulb | fuse, bulb |
| Feed at the win | feed 4 of 4 | **feed 5 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 12 (0.0%) | 0 of 12 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts needed: a fuse and a bulb, as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read and trap, made executable. It replays the same on the schematic (`puzzles/07-past-the-fuse.json`) and through this file's conversion, and `npm run check puzzles/city/07-past-the-fuse.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_mk", "repair:fb_A", "repair:shrine"],
  "traps": [
    { "name": "the bulb browns it out",
      "moves": ["repair:fb_A", "repair:shrine"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_mk"] }
  ]
}
```

## What it taught us
