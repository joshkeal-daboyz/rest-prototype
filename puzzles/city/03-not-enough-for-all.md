# 03 · Not enough for all (city form) — design note

The city form of [`puzzles/03-not-enough-for-all.md`](../03-not-enough-for-all.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **capacity, small**: which branch to shed. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `03-not-enough-for-all`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:4`. The job is `block:0:4`'s corner by the feed's crossing over `x:4`. `br_A` runs along `x:4`, `br_B` round the corner down `z:0`, and `br_C` stands on a roof across `x:4`.
- Capacity **5**. Target: `shrine`; priority: `home_1`, `home_2`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:4:lo:27.50` (crossing, block:0:2, +z side) | 27.50, 169.25 |
| `j0` | junction | pole `pole:x:4:hi:27.50` (end, block:0:4, -z side) | 27.50, 185.75 |
| `br_A` | breaker, closed | pole `pole:x:4:hi:40.67` (slot, block:0:4, -z side) | 40.67, 185.75 |
| `jA` | junction | pole `pole:x:4:hi:50.83` (slot, block:0:4, -z side) | 50.83, 185.75 |
| `shrine` | lamp, load 2, **target** | building `block:0:2/a\|outer\|+z\|9,32`, by its drop from `pole:x:4:hi:50.83` across `x:4` | 52.50, 165.00 |
| `lantern` | lamp, load 1 | building `block:0:4/b\|outer\|-z\|9,38`, by its drop from `pole:x:4:hi:50.83` | 52.50, 190.00 |
| `br_B` | breaker, closed | pole `pole:z:0:hi:192.50` (end, block:0:4, -x side) | 20.75, 192.50 |
| `jB` | junction | pole `pole:z:0:hi:217.50` (slot, block:0:4, -x side) | 20.75, 217.50 |
| `home_1` | lamp, load 1 | building `block:0:4/a\|outer\|-x\|5,42`, by its drop from `pole:z:0:hi:217.50` | 25.00, 217.50 |
| `home_2` | lamp, load 1 | building `block:0:4/a\|outer\|-x\|5,46`, by its drop from `pole:z:0:hi:242.50` | 25.00, 242.50 |
| `br_C` | breaker, closed | roof structure `roof:10:32` (mid, on `block:0:2/a\|outer\|+z\|9,32`) | 52.50, 164.40 |
| `market` | lamp, load 1 | building `block:0:4/b\|outer\|-z\|12,38`, by its drop from `pole:x:4:hi:62.50` | 62.50, 190.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_a0` | `j0` → `br_A` | 1 span: along | 13.17 |
| `l_a1` | `br_A` → `jA` | 1 span: along | 10.17 |
| `l_shrine` | `jA` → `shrine` | drop | — |
| `l_lantern` | `jA` → `lantern` | drop | — |
| `l_b0` | `j0` → `br_B` | 1 span: corner | 9.55 |
| `l_b1` | `br_B` → `jB` | 2 spans: 2 along | 25.00 |
| `l_home1` | `jB` → `home_1` | drop | — |
| `l_home2` | `jB` → `home_2` | 2 spans: 2 along + drop | 25.00 |
| `l_c0` | `j0` → `br_C` | 1 span: roof (street) | 32.88 |
| `l_c1` | `br_C` → `market` | 2 spans: roof (street), roof (pavement) + drop | 32.89 |

## What changed

- `shrine` (a target) stays a building (re-laid with the district).
- `lantern` stays a building (re-laid with the district).
- `home_1` stays a building (re-laid with the district).
- **`home_2` moved from a lamp post to a building**, fed by its drop.
- **`market` moved from a roof structure to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:0:4` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 4 becomes capacity 5. The job's poles carry 1 scenery building.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens **browned out**: every lit window flickers, 7 of 5. Three breakers leave `j0`, the corner pole across `x:4` from the feed: `br_A` one pole along `x:4`; `br_B` round the corner on `z:0`; `br_C` on the roof of the shrine's building across `x:4`.
2. Count. `br_A` feeds `jA`, the next pole: **the shrine (2) is the building across `x:4` from `jA`**, by a drop over the street, and the lantern (1) is on `jA`'s own side. `br_B` feeds the two homes down `z:0`. `br_C` feeds the market alone, a building on the block's own side past the lantern.
3. Open `br_B`. The homes go dark. 5 of 5: the shrine, the lantern and the market are lit. **Win.**

## The trap

The schematic's two wrong instincts, at the raised numbers. Shed the heaviest branch (`br_A`): the brownout clears at 4 of 5 and the homes and the market light, but the shrine is on that branch. Shed the market to save the tribe's homes (`br_C`): 6 of 5, still a brownout. Only darkening the homes fits. Every state can be undone by throwing a breaker back.

## To watch when Josh plays it

The market's run goes over `x:4` to `br_C` on the shrine's roof and back over `x:4` to the market (the fit gives `j0` a fourth wire by a roof port; no lay on 6 x 6 seed 1 avoids it for 03). Watch whether that run reads, or looks like it belongs to the shrine.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 7 of 5 (brownout); schematic feed 6 of 4 (brownout)
- win (br_B): city feed 5 of 5; schematic feed 4 of 4
- trap "shed the heaviest branch" (br_A): city feed 4 of 5; schematic feed 3 of 4
- trap "shed the market to save the homes" (br_C): city feed 6 of 5 (brownout); schematic feed 5 of 4 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/03-not-enough-for-all.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 8, exhaustive | 8, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 1 (br_B) | 1 (br_B) |
| Winning orders / configurations | 1 / 2 | 1 / 2 |
| Parts used | none | none |
| Feed at that win | feed 4 of 4 | **feed 5 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 8 (0.0%) | 0 of 8 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and traps, made executable (P2a's, unchanged). It replays the same on `puzzles/03-not-enough-for-all.json` and through this file's conversion, and `npm run check puzzles/city/03-not-enough-for-all.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_B"],
  "traps": [
    { "name": "shed the heaviest branch",
      "moves": ["br_A"],
      "expect": { "brownout": false, "lit": ["home_1", "home_2", "market"], "complete": false },
      "recover": ["br_A", "br_B"] },
    { "name": "shed the market to save the homes",
      "moves": ["br_C"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_C", "br_B"] }
  ]
}
```

## What it taught us
