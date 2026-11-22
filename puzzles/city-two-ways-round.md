# City · Two ways round — design note

The first map laid on the pipeline city (ticket 070 K1), by the rules in [`docs/design/070-K1-circuit.md`](../docs/design/070-K1-circuit.md). The city is 6 x 6 seed 1, one-way on (the default). The district is one block, `block:6:6` (70 m by 80 m, an alley block in the middle of the town), and the four streets round it.

The power line runs right round the block on its own pavements, and it is fed at one pole on the west side, where a span comes over `z:6` from the next block. Two buildings on the block are dark and the priests want both lit: the **shrine**, a five-storey corner house on the east side, and the **infirmary**, a five-storey house on the south side. The line round the block is broken in two places, and Enoch has one wire.

**Element under test:** the brief's element 7, **two wires, one job**. There are two breaks and one wire: which one to mend, and how to route round the other. Here the reroute is the ring itself. A switch at the feed's pole sends the power round the block one way or the other, and only one of the two breaks sits where mending it lets one way round reach both buildings. Nothing else is in play: the feed's capacity never binds, and there are no fuses or breakers.

## The map

16 nodes, 16 lines, 2 faults. Feed capacity 3. Enoch brings one wire.

| Piece | What it is |
| --- | --- |
| `feed` → `sw` | The feed stands on the pole across `z:6`, and its span lands on the switch's pole. The switch is the tribe's, marked. |
| `sw` position 0 (as set): **south** | Down the west side: `j_h` (the **homes**, priority), then `l_x` (**damaged**, fault `x`), then round the south-west corner, along the south side past the **infirmary** (`j_inf`), round the south-east corner, and up the east side to `j_se1`. |
| `sw` position 1: **north** | Up to the north-west corner, along the north side, round the north-east corner, and down the east side past the **shrine** (`j_sh`). Then `l_e2` (**damaged**, fault `y`), down to `j_se1`. |

Around the ring from the switch, going north, the order is: the shrine, then `y`, then the infirmary, then `x`, then the homes. So the infirmary sits between the two breaks.

Targets: shrine 1 + infirmary 1 = 2, against a capacity of 3.

## The intended read

1. The map opens fed south. The homes are lit. Just past them, `l_x` **sparks** on the west side. Everything else is dark: the infirmary and the shrine, and the whole north and east of the ring.
2. Before spending the wire, look the other way. Throw `sw` north. The homes go dark, current runs right round the north and east sides, and the **shrine lights**. Just past it, `l_e2` **sparks**. Now both breaks are known, and there is one wire.
3. Read the ring. The infirmary sits between the two breaks. From the north it is behind `y`, and from the south it is behind `x`. The shrine can only be lit from the north, because `y` is on its south side. So the job has to run north, and the wire goes on **`y`**.
4. Repair `l_e2`. Current carries on past the shrine, down the east side and round the south-east corner to the **infirmary**, which lights. It stops at `x`, which now sparks from the south. Load 2 of 3. **Win.** `x` stays broken and the homes stay dark.

## The trap

The only fault on the opening map is `x`, a spark right beside the lit homes, on the line that runs on to the infirmary. Enoch holds exactly one wire. If he repairs it, the infirmary lights at once, and just past it `y` sparks from the south (*needs wire, have 0*). The shrine is behind `y` from this side, and from the north it is lit but cut off from the infirmary. The switch can feed one way round or the other, never both, so the job can't be finished: a **dead end**.

It is readable: the shrine stays dark with a spark between it and the power, and the hover shows *have 0*. Undo recovers it (one step). The analyzer confirms that this is the only first move that leads only to dead ends.

The lesson is 24's and 52's, *look before you spend*, asked on a ring the size of a city block. The read is the map's shape: which side of the break each target is on.

## What this map tests

- Whether a ring of power round a city block reads as a loop on the 2D map, so that "the other way round" is something a player thinks of (GDD review finding 1: the *ring circuit with a switch*, and "a moment of reasoning between two possibilities").
- Whether the trap holds at city scale. The breaks are 135 m apart round the ring, and the map gives a choice, not a walk along every pole.
- Whether two buildings are worth lighting as the priests' targets, against the homes the tribe would rather keep lit.

## Expected numbers

From `npm run analyze puzzles/city-two-ways-round.json` (exhaustive, 5 states):

- Solvable: yes. Parts given: 1 wire. Parts needed: 1 wire (on `l_e2`). `l_x` stays broken.
- Faults readable at start: 1 of 2 (`x`). `y` shows when `sw` is thrown north, or from the south once `x` is mended.
- **Min clicks: 2** (`sw`, repair `l_e2`). Winning orders: 1.
- **Winning configurations: 1** (`sw` north, `l_e2` mended).
- Final load: 2 of 3 (shrine, infirmary). No fuse on the map, so none blows.
- Dead-end states: 2 of 5 (40.0%). First moves: `sw` is right; repair `l_x` leads only to dead ends.
- The street layer later (by hand, from the place table): the ring is 318.2 m round. From the switch, `x` is about 27 m south and `y` about 135 m north-about. One trip carries the one wire. There is no salvage at map scope.

## The places

Coordinates are metres on 6 x 6 seed 1, one-way on: x east, z south, and the city's origin at cell (0, 0). `pos` is (metres − the district's least corner) / `CELL_M` (5). The **district's least corner is (245, 210) m**: the west edge of `z:6`'s west pavement (cell column 49) and the north edge of `x:6`'s north pavement (cell row 42). The district is the block and its four streets, kerb to far pavement. Pole ids are CK15's form, `pole:<street>:<pavement>:<along_m>`: `lo` is the pavement at the street's lower `across0` cell, `hi` the one at its upper cell, and along is metres on the street's axis. The rule ids are the rules note's.

| Node | Type | Place (rule) | Probe handle | Metres (x, z) | `pos` |
| --- | --- | --- | --- | --- | --- |
| `feed` | feed | `pole:z:6:lo:242.50`, a crossing pole (CK6, CK12 feed) | `X|block:5:4|+z|+x` | 249.25, 242.50 | 0.85, 6.5 |
| `sw` | switch | `pole:z:6:hi:242.50`, a landing (CK2, CK12 switch: 4 attachments) | `block:6:6|-x|1` | 265.75, 242.50 | 4.15, 6.5 |
| `j_nw1` | junction | `pole:z:6:hi:237.50`, the end slot (CK2, CK13 bend) | `block:6:6|-x|0` | 265.75, 237.50 | 4.15, 5.5 |
| `j_nw2` | junction | `pole:x:6:hi:272.50`, the end slot (CK13 bend) | `block:6:6|-z|0` | 272.50, 230.75 | 5.5, 4.15 |
| `j_ne1` | junction | `pole:x:6:hi:337.50`, the end slot | `block:6:6|-z|6` | 337.50, 230.75 | 18.5, 4.15 |
| `j_ne2` | junction | `pole:z:7:lo:237.50`, the end slot | `block:6:6|+x|0` | 344.25, 237.50 | 19.85, 5.5 |
| `j_sh` | junction | `pole:z:7:lo:277.50`, a slot carrying the shrine's drop (CK13 branch) | `block:6:6|+x|4` | 344.25, 277.50 | 19.85, 13.5 |
| `shrine` | lamp | building `block:6:6/a|outer|+x|67,54`, its drop's wall point on cell (67, 55) (CK9, CK12 lamp) | | 340.00, 277.50 | 19, 13.5 |
| `j_se1` | junction | `pole:z:7:lo:312.50`, the end slot | `block:6:6|+x|7` | 344.25, 312.50 | 19.85, 20.5 |
| `j_se2` | junction | `pole:x:9:lo:337.50`, the end slot | `block:6:6|+z|6` | 337.50, 319.25 | 18.5, 21.85 |
| `j_inf` | junction | `pole:x:9:lo:294.17`, a slot carrying the infirmary's drop | `block:6:6|+z|2` | 294.17, 319.25 | 9.8333, 21.85 |
| `infirmary` | lamp | building `block:6:6/b|outer|+z|58,62`, wall point on cell (58, 62) | | 292.50, 315.00 | 9.5, 21 |
| `j_sw1` | junction | `pole:x:9:lo:272.50`, the end slot | `block:6:6|+z|0` | 272.50, 319.25 | 5.5, 21.85 |
| `j_sw2` | junction | `pole:z:6:hi:312.50`, the end slot | `block:6:6|-x|7` | 265.75, 312.50 | 4.15, 20.5 |
| `j_h` | junction | `pole:z:6:hi:264.33`, a slot carrying the homes' drop | `block:6:6|-x|3` | 265.75, 264.33 | 4.15, 10.8667 |
| `homes` | lamp | building `block:6:6/a|outer|-x|54,52`, wall point on cell (54, 52) | | 270.00, 262.50 | 5, 10.5 |

| Line | Run (CK13) | Spans, m | Length, m |
| --- | --- | --- | --- |
| `l_feed` | one crossing over `z:6`, two-way (CK6) | 16.50 | 16.50 |
| `l_s` | along `z:6` hi, `-x|1` to `-x|3` (CK4) | 11.67, 10.17 | 21.83 |
| `l_n` | along `z:6` hi, `-x|1` to `-x|0` | 5.00 | 5.00 |
| `l_nw` | corner, north-west (CK5) | 9.55 | 9.55 |
| `l_north` | along `x:6` hi, `-z|0` to `-z|6` | 6 x 10.83 | 65.00 |
| `l_ne` | corner, north-east | 9.55 | 9.55 |
| `l_e1` | along `z:7` lo, `+x|0` to `+x|4` | 5.00, 11.67, 10.17, 13.17 | 40.00 |
| `l_shrine` | drop (CK9) | 4.25 | 4.25 |
| `l_e2` | along `z:7` lo, `+x|4` to `+x|7`. **Fault `y` is its first span, `+x|4` to `+x|5`.** | 11.67, 10.17, 13.17 | 35.00 |
| `l_se` | corner, south-east | 9.55 | 9.55 |
| `l_s1` | along `x:9` lo, `+z|6` to `+z|2` | 4 x 10.83 | 43.33 |
| `l_inf` | drop | 4.57 | 4.57 |
| `l_s2` | along `x:9` lo, `+z|2` to `+z|0` | 2 x 10.83 | 21.67 |
| `l_sw` | corner, south-west | 9.55 | 9.55 |
| `l_x` | along `z:6` hi, `-x|7` to `-x|3`. **Fault `x` is its last span, `-x|4` to `-x|3`.** | 13.17, 10.17, 14.67, 10.17 | 48.17 |
| `l_homes` | drop | 4.63 | 4.63 |

**Scenery (CK14):** the file's `decor` draws what the district holds that the job doesn't use, all dead:
- the seven other crossings that leave the block, plus the feed pole's own corner span back to `block:5:4`;
- the twelve other buildings' drops. The `+x|1` landing on `z:7` carries one of the crossings, and `l_e1` passes it without a node (CK13: the landing is scenery to the job).

Off the map, the district's streets hold 8 street lights (CK10) on the far pavements, and none of them is a node.

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
