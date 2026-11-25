# 01 · First light (city form) — design note

The city form of [`puzzles/01-first-light.md`](../01-first-light.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the breaker**. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `01-first-light`. City: 6 x 6 seed 1, one-way on.
- District: `block:7:0`. The job is three poles of `z:8`, on the `+x` side of `block:7:0`; the feed's run comes round the corner from `x:1`. Both lamps are buildings across `z:8`, on `block:8:0`, each fed by a drop over the street from its own pole.
- Capacity **3**. Target: `shrine`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:hi:402.50` (end, block:7:1, -z side) | 402.50, 85.75 |
| `j0` | junction | pole `pole:z:8:lo:62.50` (end, block:7:0, +x side) | 409.25, 62.50 |
| `home` | lamp, load 1 | building `block:8:0/a\|outer\|-x\|85,11`, by its drop from `pole:z:8:lo:62.50` across `z:8` | 425.00, 62.50 |
| `br_1` | breaker, open | pole `pole:z:8:lo:50.83` (slot, block:7:0, +x side) | 409.25, 50.83 |
| `shrine` | lamp, load 1, **target** | building `block:8:0/a\|outer\|-x\|85,8`, by its drop from `pole:z:8:lo:50.83` across `z:8` | 425.00, 52.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 2 spans: crossing, corner | 26.05 |
| `l_home` | `j0` → `home` | drop | — |
| `l_br` | `j0` → `br_1` | 1 span: along | 11.67 |
| `l_shrine` | `br_1` → `shrine` | drop | — |

## What changed

- `home` stays a building (re-laid with the district).
- **`shrine` (a target) moved from a lamp post to a building**, fed by its drop.
- **District:** P2a laid it on `block:0:0`; now `block:7:0` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers:** unchanged (capacity 3): no scenery building on the job's poles lights in the win.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The feed's wire comes round the corner from `x:1` to `j0`, and the home's drop runs from `j0`'s pole over `z:8` into the home, whose windows are lit. The HUD reads 1 of 3.
2. `br_1` is the next pole along `z:8`, 11.7 m on. The wire to it is live and stops there: an open breaker, nothing broken. **The shrine is the next building along, across the street, and its drop hangs from `br_1`'s own pole.** It is dark and carries the target mark. Reading the street from the feed, it comes after its breaker, and its drop is the only dead wire on screen.
3. Close `br_1`. Pulses run down the shrine's drop and its windows light. 2 of 3. **Win.**

## The trap

None, as in the schematic. The only wrong read is to look for a fault, and there is none: the lesson is the live wire stopping at the breaker's icon.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 1 of 3; schematic feed 1 of 3
- win (br_1): city feed 2 of 3; schematic feed 2 of 3

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/01-first-light.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 2, exhaustive | 2, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 1 (br_1) | 1 (br_1) |
| Winning orders / configurations | 1 / 1 | 1 / 1 |
| Parts used | none | none |
| Feed at that win | feed 2 of 3 | **feed 2 of 3** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 2 (0.0%) | 0 of 2 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/01-first-light.json` and through this file's conversion, and `npm run check puzzles/city/01-first-light.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_1"]
}
```

## What it taught us
