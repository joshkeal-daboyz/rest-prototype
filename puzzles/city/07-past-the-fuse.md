# 07 · Past the fuse (city form) — design note

The city form of [`puzzles/07-past-the-fuse.md`](../07-past-the-fuse.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the blown fuse and the dead bulb**, a hidden fault found by a repair, then a brownout from the last correct repair. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `07-past-the-fuse`. City: 6 x 6 seed 1, one-way on.
- District: `block:8:1`. `block:8:1`'s corner by the feed's crossing over `x:1`. `fb_A` runs along `x:1`; `br_mk` goes round the corner down `z:9`; `br_hm` stands on a roof across `x:1` and its run comes back over `x:1` to the homes at the block's far corner.
- Capacity **5**; `fb_A` rated **4**. Target: `shrine`; priority: `home_1`, `home_2`. Parts: fuse, bulb.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:lo:482.50` (crossing, block:8:0, +z side) | 482.50, 69.25 |
| `j0` | junction | pole `pole:x:1:hi:482.50` (end, block:8:1, -z side) | 482.50, 85.75 |
| `fb_A` | fusebox, rating 4 | pole `pole:x:1:hi:471.50` (slot, block:8:1, -z side) | 471.50, 85.75 |
| `j1` | junction | pole `pole:x:1:hi:449.50` (slot, block:8:1, -z side) | 449.50, 85.75 |
| `lane` | lamp, load 1 | building `block:8:0/b\|outer\|+z\|89,12`, by its drop from `pole:x:1:hi:449.50` across `x:1` | 447.50, 65.00 |
| `shrine` | lamp, load 1, **target** | building `block:8:1/a\|outer\|-z\|88,18`, by its drop from `pole:x:1:hi:449.50` | 447.50, 90.00 |
| `br_mk` | breaker, closed | pole `pole:z:9:lo:92.50` (end, block:8:1, +x side) | 489.25, 92.50 |
| `market` | lamp, load 1 | building `block:8:1/a\|outer\|+x\|96,20`, by its drop from `pole:z:9:lo:105.00` | 485.00, 102.50 |
| `br_hm` | breaker, closed | roof structure `roof:91:12` (mid, on `block:8:0/b\|outer\|+z\|89,12`) | 457.50, 64.40 |
| `j2` | junction | pole `pole:x:1:hi:427.50` (end, block:8:1, -z side) | 427.50, 85.75 |
| `home_1` | lamp, load 1 | building `block:8:1/a\|outer\|-z\|85,18`, by its drop from `pole:x:1:hi:427.50` | 427.50, 90.00 |
| `home_2` | lamp, load 1 | building `block:8:1/a\|outer\|-x\|85,19`, by its drop from `pole:z:8:hi:92.50` | 425.00, 97.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_a` | `j0` → `fb_A` | 1 span: along | 11.00 |
| `l_a2` | `fb_A` → `j1` | 2 spans: 2 along | 22.00 |
| `l_lane` | `j1` → `lane` | drop | — |
| `l_shrine` | `j1` → `shrine` | drop | — |
| `l_mk` | `j0` → `br_mk` | 1 span: corner | 9.55 |
| `l_mk2` | `br_mk` → `market` | 1 span: along + drop | 12.50 |
| `l_hm` | `j0` → `br_hm` | 1 span: roof (street) | 32.88 |
| `l_hm2` | `br_hm` → `j2` | 1 span: roof (street) | 36.82 |
| `l_h1` | `j2` → `home_1` | drop | — |
| `l_h2` | `j2` → `home_2` | 1 span: corner + drop | 9.55 |

## What changed

- `lane` stays a building (re-laid with the district).
- `shrine` (a target) stays a building (re-laid with the district).
- **`market` moved from a lamp post to a building**, fed by its drop.
- `home_1` stays a building (re-laid with the district).
- **`home_2` moved from a lamp post to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:8:1` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 4, fb_A rating 3 becomes capacity 5, fb_A rating 4. The job's poles carry 1 scenery building.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens at 3 of 5: the market (round the corner on `z:9`) and the two homes (at the far end of `x:1`) are lit. `fb_A`, one pole along `x:1`, shows the blown-fuse ✕: the wire runs in and nothing comes out. Nothing past it can be read.
2. Repair `fb_A`. The lane, across `x:1` from `j1`, lights. **The shrine, on `j1`'s own side, stays dark with the dead-bulb mark.** 5 of 5.
3. Repair the shrine. 6 of 5: **brownout**, everything flickers.
4. Shed 1: throw `br_mk`, on the corner of `z:9` (the market, 1). 5 of 5. **Win.** The homes stay lit.

## The trap

The schematic's: the brownout arrives on the bulb repair, so it reads as "the bulb broke something", and the instinct is to undo it. The bulb was right; the feed is full. Then the choice of what to shed: the homes (2, behind the roof breaker) clear it with room to spare but darken the priority; the market alone is enough. Shedding the homes still wins. Nothing on this map dead-ends.

## To watch when Josh plays it

`br_hm`'s run crosses `x:1` twice, out to a roof on `block:8:0` and back to `j2`, the homes' corner pole (`j0` has four wires; every lay on seed 1 gives one of them to a roof across the street). Watch whether the homes' run reads as theirs.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 3 of 5; `fb_A` 0 of 4; blown `fb_A`; schematic feed 3 of 4; `fb_A` 0 of 3; blown `fb_A`
- win (br_mk, repair:fb_A, repair:shrine): city feed 5 of 5; `fb_A` 3 of 4; schematic feed 4 of 4; `fb_A` 2 of 3
- trap "the bulb browns it out" (repair:fb_A, repair:shrine): city feed 6 of 5; `fb_A` 3 of 4 (brownout); schematic feed 5 of 4; `fb_A` 2 of 3 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/07-past-the-fuse.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 12, exhaustive | 12, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (br_mk, repair:fb_A, repair:shrine) | 3 (br_mk, repair:fb_A, repair:shrine) |
| Winning orders / configurations | 6 / 3 | 6 / 3 |
| Parts used | fuse, bulb | fuse, bulb |
| Feed at that win | feed 4 of 4 | **feed 5 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 12 (0.0%) | 0 of 12 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: fuse, bulb. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/07-past-the-fuse.json` and through this file's conversion, and `npm run check puzzles/city/07-past-the-fuse.city.json` passes.

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
