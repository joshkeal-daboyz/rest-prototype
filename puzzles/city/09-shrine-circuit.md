# 09 · The shrine circuit (city form) — design note

The city form of [`puzzles/09-shrine-circuit.md`](../09-shrine-circuit.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **the reroute** instead of the obvious repair, and shedding the street for the shrine. The read on the circuit, the trap and the numbers are in the schematic's note; this note says where the pieces stand, how the job reads from the default camera, and what changed. **Raised, not reworked**: the schematic's nodes, lines, faults, parts, loads and targets, with only capacities and ratings raised by the scenery the win lights (section S), and the analyzer's numbers equal (below).

## Where it stands

- `from`: `09-shrine-circuit`. City: 6 x 6 seed 1, one-way on.
- District: `block:0:8` and `block:4:8`. Two blocks either side of `z:4`. The feed crosses `x:11` to `block:4:8`'s corner; the street lamps are on `block:0:8` along `x:11`, past `fb_A`; the shrine is on `block:0:8`'s `+x` side, across `z:4` from `j5`.
- Capacity **9**; `fb_A` rated **3**. Target: `shrine`; priority: `street_1`, `street_2`, `street_3`. Parts: wire.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:11:hi:162.50` (crossing, block:2:10, -z side) | 162.50, 425.75 |
| `br_main` | breaker, closed | pole `pole:x:11:lo:162.50` (end, block:4:8, +z side) | 162.50, 409.25 |
| `j1` | junction | pole `pole:x:11:lo:142.50` (slot, block:4:8, +z side) | 142.50, 409.25 |
| `br_street` | breaker, closed | pole `pole:x:11:lo:132.50` (end, block:4:8, +z side) | 132.50, 409.25 |
| `fb_A` | fusebox, rating 3 | pole `pole:z:4:hi:402.50` (end, block:4:8, -x side) | 125.75, 402.50 |
| `j2` | junction | pole `pole:x:11:lo:97.50` (landing, block:0:8, +z side) | 97.50, 409.25 |
| `street_1` | lamp, load 1 | building `block:0:8/b\|outer\|+z\|19,80`, by its drop from `pole:x:11:lo:97.50` | 97.50, 405.00 |
| `street_2` | lamp, load 1 | building `block:2:10/a\|outer\|-z\|22,86`, by its drop from `pole:x:11:lo:102.50` across `x:11` | 112.50, 430.00 |
| `street_3` | lamp, load 1 | building `block:0:8/b\|outer\|+z\|17,80`, by its drop from `pole:x:11:lo:85.83` | 87.50, 405.00 |
| `sw_1` | switch, 0 `l_a`, 1 `l_b`; set 0 | roof structure `roof:26:80` (corner, on `block:4:8/b\|outer\|+z\|26,80`) | 130.60, 404.40 |
| `j_dead` | junction | roof structure `roof:20:76` (mid, on `block:0:8/b\|outer\|+x\|20,74`) | 104.40, 382.50 |
| `j4` | junction | pole `pole:z:4:hi:390.50` (slot, block:4:8, -x side) | 125.75, 390.50 |
| `flood` | lamp, load 2 | building `block:4:8/b\|outer\|-x\|26,77`, by its drop from `pole:z:4:hi:390.50` | 130.00, 392.50 |
| `j5` | junction | roof structure `roof:26:74` (mid, on `block:4:8/b\|outer\|-x\|26,73`) | 130.60, 372.50 |
| `shrine` | lamp, load 1, **target** | building `block:0:8/b\|outer\|+x\|20,72`, by its drop from `pole:z:4:hi:366.50` across `z:4` | 105.00, 367.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `br_main` | 1 span: crossing | 16.50 |
| `l_main` | `br_main` → `j1` | 2 spans: 2 along | 20.00 |
| `l_s0` | `j1` → `br_street` | 1 span: along | 10.00 |
| `l_s1` | `br_street` → `fb_A` | 1 span: corner | 9.55 |
| `l_s2` | `fb_A` → `j2` | 2 spans: roof (street), roof (pavement) | 29.87 |
| `l_st1` | `j2` → `street_1` | drop | — |
| `l_st2` | `j2` → `street_2` | 1 span: along + drop | 5.00 |
| `l_st3` | `j2` → `street_3` | 1 span: along + drop | 11.67 |
| `l_sw` | `j1` → `sw_1` | 1 span: roof (pavement) | 12.85 |
| `l_a` | `sw_1` → `j_dead` | 1 span: roof (street) | 34.15 |
| `l_a2` | `j_dead` → `j5` | 1 span: roof (street) | 28.04 |
| `l_b` | `sw_1` → `j4` | 1 span: roof (pavement) | 14.72 |
| `l_b2` | `j4` → `j5` | 2 spans: along, roof (pavement) | 19.72 |
| `l_flood` | `j4` → `flood` | drop | — |
| `l_shrine` | `j5` → `shrine` | 1 span: roof (pavement) + drop | 7.72 |

## What changed

- `street_1` stays a building (re-laid with the district).
- **`street_2` moved from a lamp post to a building**, fed by its drop.
- `street_3` stays a building (re-laid with the district).
- **`flood` moved from a roof structure to a building**, fed by its drop.
- `shrine` (a target) stays a building (re-laid with the district).
- **District:** P2a laid it on `block:3:0`; now `block:0:8` and `block:4:8` (Josh: "too samey"; at most 2 pilots share a block now, with `--avoid`).
- **Numbers raised by section S** (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; "Raise (Recommended)"): capacity 4, fb_A rating 3 becomes capacity 9, fb_A rating 3. The job's poles carry 5 scenery buildings.
- **Raised, not reworked:** the moves of the lamps are places only, and the analyzer's numbers are equal (below).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens at 6 of 9. The three street lamps are lit round `j2` on `x:11` (two on `block:0:8`, one across the street), through `fb_A` on `z:4` (its bar 3 of 3). **The shrine, on `block:0:8` across `z:4`, is dark**, at the end of the run down `z:4`.
2. `sw_1`, on the corner roof by `j1`, sends the current over `z:4` to `j_dead` on a roof of `block:0:8`: the wire runs in and nothing comes out, no fuse to blame. A **dead junction**, *needs wire × 2*. Enoch has one.
3. Throw `sw_1`. The current runs down the roof span towards `j4` on `z:4` and stops at a **break icon** with sparks. One wire.
4. Repair it. `j4` is live: the flood (on `j4`'s pole) lights, and the current runs on to `j5` and down the shrine's drop over `z:4`. 11 of 9: **brownout**.
5. Open `br_street`, the pole before the corner on `x:11`. The street goes dark. 8 of 9. **Win**, and the Relight.

## The trap

The schematic's two. The dead junction is the obvious target and the one thing the player can't fix; the switch on the roof above it is the way round. Then the reroute brings the flood with it, and the only way to afford the shrine is to darken the street the tribe lives on (the priority lamps). Both are readable (the dead junction's prompt, the brownout and the HUD's 11 of 9) and free to back out of.

## To watch when Josh plays it

The dead way (`l_a`, `l_a2`) crosses `z:4` twice, to `j_dead` on `block:0:8`'s roof and back to `j5`. It is the way that does not work, so a second crossing may read as "that way is wrong"; watch whether it confuses instead.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the schematic:

- start: city feed 6 of 9; `fb_A` 3 of 3; schematic feed 3 of 4; `fb_A` 3 of 3
- win (br_street, sw_1, repair:l_b): city feed 8 of 9; `fb_A` 0 of 3; schematic feed 3 of 4; `fb_A` 0 of 3
- trap "the reroute browns it out" (sw_1, repair:l_b): city feed 11 of 9; `fb_A` 3 of 3 (brownout); schematic feed 6 of 4; `fb_A` 3 of 3 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/09-shrine-circuit.json`. **Equal, but for the feeds' loads.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 16, exhaustive | 16, exhaustive |
| Solvable | yes | yes |
| Min clicks (one shortest win) | 3 (br_street, sw_1, repair:l_b) | 3 (br_street, sw_1, repair:l_b) |
| Winning orders / configurations | 3 / 1 | 3 / 1 |
| Parts used | wire | wire |
| Feed at that win | feed 3 of 4 | **feed 8 of 9** |
| Fuses that blow (shortest win / any move) | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none | none |

Parts on hand: wire. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this one is its intended read and trap, made executable (P2a's, unchanged). It replays the same on `puzzles/09-shrine-circuit.json` and through this file's conversion, and `npm run check puzzles/city/09-shrine-circuit.city.json` passes.

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
