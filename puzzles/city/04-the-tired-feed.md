# 04 · The tired feed (city form) — design note

The city form of [`puzzles/04-the-tired-feed.md`](../04-the-tired-feed.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **capacity, small**: count before you shed. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `04-the-tired-feed`. City: 6 x 6 seed 1, one-way on.
- District: `block:7:1` and `block:8:1`. Two blocks either side of `z:8`: `j0` is the corner pole on `block:7:1`'s `+x` side. The shrine and the market are on `block:8:1` across `z:8`, the home and the well down `z:8` on `block:7:1`, and the lantern across `x:1` on `block:8:0`.
- Capacity **5**. Target: `shrine`; priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:lo:402.50` (crossing, block:7:0, +z side) | 402.50, 69.25 |
| `j0` | junction | pole `pole:z:8:lo:92.50` (end, block:7:1, +x side) | 409.25, 92.50 |
| `br_A` | breaker, open | pole `pole:z:8:hi:92.50` (crossing, block:8:1, -x side) | 420.75, 92.50 |
| `shrine` | lamp, load 2, **target** | building `block:8:1/a\|outer\|-x\|85,19`, by its drop from `pole:z:8:hi:92.50` | 425.00, 97.50 |
| `br_B` | breaker, closed | pole `pole:z:8:lo:105.50` (slot, block:7:1, +x side) | 409.25, 105.50 |
| `jB` | junction | pole `pole:z:8:lo:117.50` (slot, block:7:1, +x side) | 409.25, 117.50 |
| `home` | lamp, load 1 | building `block:7:1/b\|outer\|+x\|80,22`, by its drop from `pole:z:8:lo:117.50` | 405.00, 117.50 |
| `well` | lamp, load 1 | building `block:7:1/b\|outer\|+x\|80,26`, by its drop from `pole:z:8:lo:139.50` | 405.00, 137.50 |
| `br_C` | breaker, closed | roof structure `roof:85:12` (corner, on `block:8:0/a\|outer\|-x\|85,11`) | 425.60, 64.40 |
| `market` | lamp, load 1 | building `block:8:1/a\|outer\|-z\|85,18`, by its drop from `pole:x:1:hi:427.50` | 427.50, 90.00 |
| `br_D` | breaker, closed | roof structure `roof:85:18` (corner, on `block:8:1/a\|outer\|-z\|85,18`) | 425.60, 90.60 |
| `lantern` | lamp, load 1 | building `block:8:0/b\|outer\|+z\|89,12`, by its drop from `pole:x:1:hi:449.50` across `x:1` | 447.50, 65.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 2 spans: crossing, corner | 26.05 |
| `l_a0` | `j0` → `br_A` | 1 span: crossing | 11.50 |
| `l_shrine` | `br_A` → `shrine` | drop | — |
| `l_b0` | `j0` → `br_B` | 1 span: along | 13.00 |
| `l_b1` | `br_B` → `jB` | 1 span: along | 12.00 |
| `l_home` | `jB` → `home` | drop | — |
| `l_well` | `jB` → `well` | 2 spans: 2 along + drop | 22.00 |
| `l_c0` | `j0` → `br_C` | 1 span: roof (junction) | 32.51 |
| `l_market` | `br_C` → `market` | 1 span: roof (street) + drop | 21.43 |
| `l_d0` | `j0` → `br_D` | 1 span: roof (street) | 16.46 |
| `l_lantern` | `br_D` → `lantern` | 2 spans: roof (pavement), along + drop | 24.78 |

## What changed

- **`shrine` (a target) moved from a lamp post to a building**, fed by its drop.
- `home` stays a building (re-laid with the district).
- **`well` moved from a lamp post to a building**, fed by its drop.
- **`market` moved from a roof structure to a building**, fed by its drop.
- **`lantern` moved from a roof structure to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:7:1` and `block:8:1` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 3 becomes capacity 5. The job's poles carry 3 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens in **brownout**, 7 of 5: the home, the well, the market and the lantern flicker. Nothing is broken.
2. **The shrine is the corner building across `z:8` from `j0`, its drop hanging from `br_A`'s pole in front of it.** `br_A` is open. The shrine is 2: with it, only 1 more fits. The home and the well hang off `jB` down `z:8`, behind one breaker (`br_B`), so they go together (2).
3. Open `br_B` (the flicker clears), close `br_A` (brownout again), then open `br_C` (5 of 5) or `br_D` (4 of 5). **Win.**

## The trap

The schematic's: shed the small unmarked lamps first, the market and the lantern on their two roof breakers. Open both and close the shrine: **6 of 5, still a brownout.** The home's branch is the one that has to go, though it is the tribe's priority. The HUD's count says why, and a breaker can always be thrown back.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 7 of 5 (brownout); schematic feed 4 of 3 (brownout)
- win (br_B, br_A, br_C): city feed 5 of 5; schematic feed 3 of 3
- trap "shed the small lamps" (br_C, br_D, br_A): city feed 6 of 5 (brownout); schematic feed 4 of 3 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/04-the-tired-feed.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (br_A, br_B, br_C) | 3 (br_A, br_B, br_C) |
| Winning orders / configurations | 12 / 3 | 12 / 3 |
| Parts used | none | none |
| Feed at that win | feed 3 of 3 | **feed 5 of 5** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/04-the-tired-feed.json` and through this file's conversion, and `npm run check puzzles/city/04-the-tired-feed.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_B", "br_A", "br_C"],
  "traps": [
    { "name": "shed the small lamps",
      "moves": ["br_C", "br_D", "br_A"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_B"] }
  ]
}
```

## What it taught us
