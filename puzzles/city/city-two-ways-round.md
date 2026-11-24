# City · Two ways round (city form) — design note

The city form of [`puzzles/city-two-ways-round.md`](../city-two-ways-round.md), the first map laid on the pipeline city (ticket 070 K1). The element under test (7, **two wires, one job**), the read on the circuit, **the trap** and the analyzer's numbers are all in that note and are not repeated here. This note says only where the pieces stand on the city and how the job reads in 3D.

This file is the puzzle to play. The game is to be full 3D (Josh, 24 Nov 2026: "I don't want 2D puzzles anymore. I want this game to be full 3D."), so the schematic `puzzles/city-two-ways-round.json` is kept as the job's logic and its check, not as a 2D map to play. Ticket 081 P0 moved this file here unchanged from K2c's test fixture (`src/city/circuit/fixtures/`).

## Where it stands

- `from`: `city-two-ways-round`. City: 6 x 6 seed 1, one-way on.
- District: `block:6:6`, an alley block in the middle of the town (70 m by 80 m), and its four streets.
- Capacity 3, one wire, targets shrine and infirmary, priority homes, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:6:lo:242.50`, across `z:6` | 249.25, 242.50 |
| `sw` | switch, position 0 `l_s`, 1 `l_n`; set 0 | pole `pole:z:6:hi:242.50`, west side | 265.75, 242.50 |
| `j_h` | junction | pole `pole:z:6:hi:264.33`, west side | 265.75, 264.33 |
| `homes` | lamp, load 1 | building `block:6:6/a\|outer\|-x\|54,52` | 270.00, 262.50 |
| `j_sh` | junction | pole `pole:z:7:lo:277.50`, east side | 344.25, 277.50 |
| `shrine` | lamp, load 1 | building `block:6:6/a\|outer\|+x\|67,54` | 340.00, 277.50 |
| `j_inf` | junction | pole `pole:x:9:lo:294.17`, south side | 294.17, 319.25 |
| `infirmary` | lamp, load 1 | building `block:6:6/b\|outer\|+z\|58,62` | 292.50, 315.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw` | 1 span, the crossing over `z:6` | 16.50 |
| `l_s` | `sw` → `j_h` | 2 spans along `z:6` hi, 242.50 → 254.17 → 264.33 | 21.83 |
| `l_homes` | `j_h` → `homes` | drop | 4.63 |
| `l_n` | `sw` → `j_sh` | 13 spans: `z:6` hi north to 237.50, the north-west corner, `x:6` hi 272.50 → 337.50, the north-east corner, `z:7` lo 237.50 → 277.50 | 129.10 |
| `l_shrine` | `j_sh` → `shrine` | drop | 4.25 |
| `l_e2` | `j_sh` → `j_inf` | 8 spans: `z:7` lo 277.50 → 312.50, the south-east corner, `x:9` lo 337.50 → 294.17. **Fault `y` cuts its first span**, `z:7:lo:277.50~289.17`, just south of the shrine | 87.88 |
| `l_inf` | `j_inf` → `infirmary` | drop | 4.57 |
| `l_x` | `j_inf` → `j_h` | 7 spans: `x:9` lo 294.17 → 272.50, the south-west corner, `z:6` hi 312.50 → 264.33. **Fault `x` cuts its last span**, `z:6:hi:264.33~274.50`, just south of the homes | 79.39 |

The ring is 318.2 m round, as the schematic note's table gives.

## Junctions that became carriers

Answer 5 ("Just carriers"): the poles between a line's two pieces only carry the wire. The schematic's eight corner junctions are not pieces of the job here; each is a carrier pole on one line, and the schematic's lines either side of it are one city line.

| Schematic junctions | Pole | City line | Schematic lines folded into it |
| --- | --- | --- | --- |
| `j_nw1`, `j_nw2` | `pole:z:6:hi:237.50`, `pole:x:6:hi:272.50` | `l_n` | `l_n`, `l_nw`, `l_north`, `l_ne`, `l_e1` |
| `j_ne1`, `j_ne2` | `pole:x:6:hi:337.50`, `pole:z:7:lo:237.50` | `l_n` | (as above) |
| `j_se1`, `j_se2` | `pole:z:7:lo:312.50`, `pole:x:9:lo:337.50` | `l_e2` | `l_e2`, `l_se`, `l_s1` |
| `j_sw1`, `j_sw2` | `pole:x:9:lo:272.50`, `pole:z:6:hi:312.50` | `l_x` | `l_s2`, `l_sw`, `l_x` |

So the city form has 8 nodes and 8 lines against the schematic's 16 and 16, and the same two faults. None of the folded junctions is a choice point (each joins two lines and nothing else), so the job's states, its one solution and its one trap are unchanged; K2c's "plays the same" case replays the check block below through the conversion.

## The intended read from the default camera

The default camera (U2, not built yet) frames the block, its four streets and the feed. Each line is drawn as one straight segment from piece to piece (Josh's card: "Straight, piece to piece"), not along its poles, with the break icon at the segment's midpoint. So the ring round the block reads as a loop of four straight lines across the roofs: `sw` to `j_h` short down the west side, `l_n` a long diagonal from the north-west to the shrine on the east side, `l_e2` from the shrine down to the infirmary on the south side, and `l_x` from the infirmary back up to the homes.

1. The view opens fed south. The homes' windows are lit. `l_x`'s line shows a **spark**, its icon about (280, 292) m, in the block's south-west quarter. The shrine and the infirmary are dark.
2. Throw `sw` (its pole on the west side, beside the feed's crossing). The homes go dark, the long `l_n` line goes live, and the **shrine lights**. `l_e2` now shows a spark, its icon about (319, 298) m, in the south-east quarter.
3. Two sparks, one wire, and the infirmary sits on the south side between the two lines that carry them. The shrine can only be reached along `l_n`, so the job runs that way and the wire goes on `l_e2`.
4. Repair `l_e2`. The infirmary lights; `l_x` sparks again from its other end. Shrine and infirmary lit, load 2 of 3. **Win.**

**The trap** is the schematic's: mending the spark that shows first, on `l_x`, lights the infirmary from the south and leaves the shrine behind `l_e2` with no wire. Undo recovers it.

To watch when Josh plays it: the break icon sits at the line's midpoint, but the cut span is at one end of each line (`y` 0 to 12 m from the shrine, `x` 0 to 10 m from the homes). If the poles or the cut wire are drawn on the street, the icon and the visible break will be about 30 m apart.

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw", "repair:l_e2"],
  "traps": [
    { "name": "mend the spark you can see",
      "moves": ["repair:l_x"],
      "expect": { "readable": ["y"], "lit": ["homes", "infirmary"], "complete": false },
      "recover": ["undo", "sw", "repair:l_e2"] }
  ]
}
```

## What it taught us
