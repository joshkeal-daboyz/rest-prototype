# 09 · Two ways round — design note (series v1, puzzle 9)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 9). It has no schematic and no `from`. It keeps the idea of the pilot `city-two-ways-round` (which is on `block:6:6` and is not a stage) on a different block, with its own places, targets and numbers.

- **New concept:** the ring. The wire goes right round the block and the switch chooses which end is fed. A break does not darken "its line": it darkens everything on the far side of it from the end that is feeding.
- **The reasoning move:** ask which side of each break each target is on. One mend joins both targets, but only from one end.
- **Builds on:** 2 (the switch), 4 (a break shows only when current reaches it), 5 (one wire, two breaks: the wire goes where the target's wire is), 7 (a second road to the same place).
- It uses no breaker, fuse box, relay, spring, battery or second feed, and reading a break from behind is not the move (the hidden break is found by throwing the switch, from the front). Nothing binds: 19 is every building on the job's poles at once.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:0:4`**, on the town's west edge, wired right round its four streets. The feed stands across `x:7` from the block's south-west corner.
- **One block: the ring goes round all four streets**, as N2's lesson allows for 9, so neither (a) nor (b) is taken.
- Capacity **19**: its own 4, raised once by `npm run fit -- --raise` for the 15 scenery buildings its solution lights. 19 is also the 3 job buildings and all 16 scenery buildings together, so no state of the map is over.
- Targets: `shrine` and `meeting_hall`. Priority: `homes`. Parts: **1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **The switch's two ways are two streets** (Josh, 26 Nov 2026, on puzzle 2: "You don't know which lines are turning off or on"). `sw` is on the corner pole, which holds no building's drop: one of its lines runs east along the south street and the other north up the west street, so each throw sends the pulses down one street or the other.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:7:hi:27.50` (crossing, block:0:7, across `x:7`) | 27.50, 265.75 |
| `sw` | switch, position 0 `l_s` (east, along `x:7`), 1 `l_n` (north, up `z:0`); set 0 | pole `pole:x:7:lo:27.50` (end, block:0:4, +z side), the south-west corner | 27.50, 249.25 |
| `j_h` | junction | pole `pole:x:7:lo:50.83` (slot) | 50.83, 249.25 |
| `homes` | lamp, load 1 | building `block:0:4/b\|outer\|+z\|9,48`, by its drop from `j_h`'s pole | 52.50, 245.00 |
| `j_2` | junction | pole `pole:z:3:lo:192.50` (end, +x side), the north-east corner | 104.25, 192.50 |
| `meeting_hall` | lamp, load 1, **target** | building `block:0:4/b\|outer\|+x\|19,38`, by its drop from `j_2`'s pole | 100.00, 192.50 |
| `j_1` | junction | pole `pole:z:0:hi:217.50` (slot, -x side), on the west street | 20.75, 217.50 |
| `shrine` | lamp, load 1, **target** | building `block:0:4/a\|outer\|-x\|5,42`, by its drop from `j_1`'s pole | 25.00, 217.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw` | 1 span: crossing (over `x:7`) | 16.50 |
| `l_s` | `sw` → `j_h` | 2 spans: along `x:7`, east | 23.33 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_x` | `j_h` → `j_2` | 9 spans: along `x:7`, the south-east corner, up `z:3`. **Fault `f_x` cuts its first span**, just east of the homes | 106.21 |
| `l_hall` | `j_2` → `meeting_hall` | drop | — |
| `l_y` | `j_1` → `j_2` | 10 spans: up `z:0`, the north-west corner, east along `x:4`, the north-east corner. **Fault `f_y` cuts its last span**, the corner span beside the meeting hall | 114.09 |
| `l_shrine` | `j_1` → `shrine` | drop | — |
| `l_n` | `sw` → `j_1` | 3 spans: the south-west corner, up `z:0` | 34.55 |

The ring is 278 m round. Going east from the switch: the homes, break `f_x`, the south and east streets, the meeting hall, break `f_y`, the north street, the shrine, and back to the switch down the west street.

Faults (2): `f_x` on `l_x` (`pole:x:7:lo:50.83` to `pole:x:7:lo:62.50`), live and sparking from the start; `f_y` on `l_y` (`pole:x:4:hi:97.50` to `pole:z:3:lo:192.50`), dark at the start.

Scenery (section S), 16 buildings: 1 at `j_h`'s pole (across `x:7`, lit when fed east), 7 on `l_x` past the cut (3 across streets, on `block:1:7` and `block:3:4`), 7 on `l_y` before its cut as seen from the shrine (2 across `x:4` on `block:0:2`), 1 on `l_n`. The win lights 15 of them: all but the one by the homes.

## The intended read from the default camera

The camera opens on `block:0:4` and its four streets. **The shrine is on `z:0`, the west street, three poles up from the south-west corner; the meeting hall is the north-east corner building, on `z:3`.** Both carry the target mark. The feed's pole is across `x:7` from the south-west corner.

1. The view opens fed east. The feed's wire crosses `x:7` to `sw`, the corner pole; pulses run two spans east along the south street to the homes, which are lit, and stop at a **spark** on the next span. The rest of the ring is dark: on along the south street, up the east street to the meeting hall, back along the north street, down the west street past the shrine to the switch. The HUD reads 2 of 19; one wire is in hand.
2. Throw `sw` to look the other way (it costs nothing). The homes go dark. Pulses run north up the west street: **the shrine lights**. They run on, round the corner and along the whole north street, and stop at a second **spark** at the north-east corner, beside the meeting hall. 9 of 19.
3. Two sparks, one wire, and the meeting hall stands between them. Fed from the north, the shrine is already lit and one mend, at the hall's corner, brings the hall. Fed from the east, one mend, by the homes, brings the hall, and the shrine is past the other spark.
4. Stay north. Click the spark at the corner. The meeting hall burns gold with the shrine. 17 of 19. **Win.** The first spark now sparks from its other side.

**Hidden at the start (1 fact):** the second break, `f_y`. The free throw of the switch shows it, before anything is spent. **Layers (2):** which end feeds, then which break to mend.

## The trap

**Mending the break by the lit homes lights one target and strands the other behind the second break.** As the plan's row. The spark that shows first is 12 m from the lit homes, the wire fits it, and it works: seven houses and the meeting hall light, 10 of 19, with the homes still on. Then a second spark shows just past the hall, the shrine is beyond it, and the wire is gone. Throwing the switch now lights the shrine and darkens the hall: each end reaches one target.

It is readable at once (the hall lit, the shrine dark, a new spark, no wire) and one Undo takes it back.

## The numbers (section V)

**None is red**, and the wrong move is a part spent in the wrong place. At the start the spark `f_x` reads **+17** and `sw` +15: both count the unread break as sound, so both promise more than they give. After the throw `f_y` reads +8 (the hall and the seven houses past it). After the wrong mend `f_y` reads +9 and there is no wire for it.

## The tribe's homes

`homes` (priority) is lit at the start and **dark at the win**: the ring is fed from the north and the homes are past `f_x`, which is left broken. The trap keeps them lit, and loses the shrine.

## Series rules

- Size 2 faults / wire / 1 switch, as the row. Own buildings: 3. Faults: 2.
- No fuse box, so no fuse blow.
- **Kit: 1 wire.** Puzzle 8's kit is 1 fuse, puzzle 10's is 2 fuses and a bulb: no repeat.
- Heavy building: none (puzzle 8's was the mill).
- **Shrine count: 2 of 5** (puzzles 1 and 9).
- District `block:0:4`; puzzle 8 is on `block:6:3`, puzzle 10 on `block:6:9`. The feed's pole and six scenery buildings are across streets on `block:0:7`, `block:0:2`, `block:1:7` and `block:3:4`, none of which is a series district.
- Districts used so far: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`.

## Expected numbers

`npm run analyze puzzles/city/s09-two-ways-round.city.json`:

| | |
| --- | --- |
| States | 5, exhaustive |
| Solvable | yes |
| Fewest clicks | **2** (`sw`, `repair:l_y`) |
| Winning click orders | 1 |
| Winning configurations | **1** |
| Parts used | wire (1 of 1) |
| Feed at the shortest win | 17 of 19 |
| Fuses that blow | none |
| Dead-end states | 2 of 5 (40.0%): `f_x` mended, with the switch either way |
| First moves that lead only to dead ends | **1**: `repair:l_x` |
| Hidden at the start | 1: the break `f_y` |

Loads, replayed on the conversion: start 2 of 19; `sw` 9 of 19; win 17 of 19; the trap (`repair:l_x`) 10 of 19, then `sw` 9 of 19.

**Short of N2's band by one click, and why (for the architect; "stop 081 N2" on this one number).** The band for 6 to 15 asks for 3 to 6 clicks; this is 2, as the pilot it draws on is. The row's size (2 breaks, 1 wire, 1 switch) cannot give a third: one wire mends one break, and the switch is thrown at most once. A third click needs a third control, which the row's size does not have. The size is kept and the count is reported; nothing was changed to pass.

**The obvious wrong first move:** `repair:l_x`, the spark by the lit homes. Read: the meeting hall lights, the shrine is dark, a second spark shows beside the hall and no wire is left. Recovered by **one Undo**, then `sw`, `repair:l_y`. The check block replays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw", "repair:l_y"],
  "traps": [
    { "name": "mend the spark by the lit homes",
      "moves": ["repair:l_x"],
      "expect": { "readable": ["f_y"], "lit": ["homes", "meeting_hall"], "complete": false },
      "recover": ["undo", "sw", "repair:l_y"] }
  ]
}
```

## To watch when Josh plays it

- Whether the ring reads as one wire round the block from the fixed camera, with the two targets on opposite corners of it.
- Sixteen scenery houses hang on the ring, so the HUD goes 2, 9, 17 of 19. Whether the two gold buildings stand out among them.
- Whether throwing the switch "to look" occurs to a player who has a spark and a wire in front of them. Puzzles 4 and 7 both taught the free throw.
- Whether the switch on the bare corner pole, with a street to each side, answers his note on puzzle 2.

## What it taught us
