# 09 · Two ways round — design note (series v1, puzzle 9)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 9). It has no schematic and no `from`. It keeps the idea of the pilot `city-two-ways-round` (which is on `block:6:6` and is not a stage) on a different block, with its own places, targets and numbers.

- **New concept:** the ring. The wire goes right round the block and the switch chooses which end is fed. A break does not darken "its line": it darkens everything on the far side of it from the end that is feeding.
- **The reasoning move:** ask which side of each break each target is on. One mend joins both targets, but only from one end.
- **Builds on:** 1 (a breaker cuts what is past it), 2 (the switch), 3 (the feed's capacity), 4 (a break shows only when current reaches it), 5 (one wire, two breaks: the wire goes where the target's wire is), 7 (a second road; fed from the other end, a wire lights its buildings in the other order).
- It uses no fuse box, relay, spring, battery or second feed, and reading a break from behind is not the move (the hidden break is found by throwing the switch, from the front).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:0:4`**, on the town's west edge, wired right round its four streets. The feed stands across `x:7` from the block's south-west corner.
- **One block: the ring goes round all four streets**, as N2's lesson allows for 9, so neither (a) nor (b) is taken.
- Capacity **12**: its own 4, raised once by `npm run fit -- --raise` for the 8 scenery buildings its solution lights.
- Targets: `shrine` and `meeting_hall`. Priority: `homes`. Parts: **1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, switch or fuse box on a branch pole** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split"; on puzzle 2: "You don't know which lines are turning off or on"). `br_k` is on a bare pole with one wire in and one wire out. `sw` is on the bare corner pole and holds only its own three wires: one of its lines runs east along the south street and the other north up the west street, so each throw sends the pulses down one street or the other.

**Josh's ruling, 26 Nov 2026, on a card ("stop 081 N2": the row's size gave 2 clicks, under the band's 3): "Add a breaker".** The breaker is `br_k`, on the ring between the meeting hall and the kiln. Its role: once the one mend joins the hall to the fed end, the current runs on round the ring into the kiln and six houses, and the feed can't carry them; `br_k` opens the ring just past the hall. The size is now 2 faults / wire / 1 switch, 1 breaker.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:7:hi:27.50` (crossing, block:0:7, across `x:7`) | 27.50, 265.75 |
| `sw` | switch, position 0 `l_s` (east, along `x:7`), 1 `l_n` (north, up `z:0`); set 0 | pole `pole:x:7:lo:27.50` (end, block:0:4, +z side), the south-west corner | 27.50, 249.25 |
| `j_h` | junction | pole `pole:x:7:lo:50.83` (slot) | 50.83, 249.25 |
| `homes` | lamp, load 1 | building `block:0:4/b\|outer\|+z\|9,48`, by its drop from `j_h`'s pole | 52.50, 245.00 |
| `j_k` | junction | pole `pole:z:3:lo:217.50` (slot, +x side), on the east street | 104.25, 217.50 |
| `kiln` | lamp, load 2 | building `block:0:4/b\|outer\|+x\|19,43`, by its drop from `j_k`'s pole | 100.00, 217.50 |
| `br_k` | breaker, closed | pole `pole:z:3:lo:204.50` (slot, no drop) | 104.25, 204.50 |
| `j_2` | junction | pole `pole:z:3:lo:192.50` (end, +x side), the north-east corner | 104.25, 192.50 |
| `meeting_hall` | lamp, load 1, **target** | building `block:0:4/b\|outer\|+x\|19,38`, by its drop from `j_2`'s pole | 100.00, 192.50 |
| `j_1` | junction | pole `pole:z:0:hi:217.50` (slot, -x side), on the west street | 20.75, 217.50 |
| `shrine` | lamp, load 1, **target** | building `block:0:4/a\|outer\|-x\|5,42`, by its drop from `j_1`'s pole | 25.00, 217.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw` | 1 span: crossing (over `x:7`) | 16.50 |
| `l_s` | `sw` → `j_h` | 2 spans: along `x:7`, east | 23.33 |
| `l_homes` | `j_h` → `homes` | drop | — |
| `l_x` | `j_h` → `j_k` | 7 spans: along `x:7`, the south-east corner, up `z:3`. **Fault `f_x` cuts its first span**, just east of the homes | 81.21 |
| `l_kiln` | `j_k` → `kiln` | drop | — |
| `l_k` | `j_k` → `br_k` | 1 span: along `z:3` | 13.00 |
| `l_2` | `br_k` → `j_2` | 1 span: along `z:3` | 12.00 |
| `l_hall` | `j_2` → `meeting_hall` | drop | — |
| `l_y` | `j_1` → `j_2` | 10 spans: up `z:0`, the north-west corner, east along `x:4`, the north-east corner. **Fault `f_y` cuts its last span**, the corner span beside the meeting hall | 114.09 |
| `l_shrine` | `j_1` → `shrine` | drop | — |
| `l_n` | `sw` → `j_1` | 3 spans: the south-west corner, up `z:0` | 34.55 |

The ring is 278 m round. Going east from the switch: the homes, break `f_x`, the south street, the kiln, the breaker, the meeting hall, break `f_y`, the north street, the shrine, and back to the switch down the west street.

Faults (2): `f_x` on `l_x` (`pole:x:7:lo:50.83` to `pole:x:7:lo:62.50`), live and sparking from the start; `f_y` on `l_y` (`pole:x:4:hi:97.50` to `pole:z:3:lo:192.50`), dark at the start.

Scenery (section S), 15 buildings: 1 at `j_h`'s pole (across `x:7`, lit when fed east), 5 on `l_x` past the cut and 1 at `j_k`'s pole (3 of those 6 across streets, on `block:1:7` and `block:3:4`), 7 on `l_y` (2 across `x:4` on `block:0:2`), 1 on `l_n`. The win lights 8 of them: the 7 on `l_y` and the 1 on `l_n`.

## The intended read from the default camera

The camera opens on `block:0:4` and its four streets. **The shrine is on `z:0`, the west street, three poles up from the south-west corner; the meeting hall is the north-east corner building, on `z:3`.** Both carry the target mark. The feed's pole is across `x:7` from the south-west corner.

1. The view opens fed east. The feed's wire crosses `x:7` to `sw`, the corner pole; pulses run two spans east along the south street to the homes, which are lit, and stop at a **spark** on the next span. The rest of the ring is dark: on along the south street, up the east street past the kiln and a breaker to the meeting hall, back along the north street, down the west street past the shrine to the switch. The HUD reads 2 of 12; one wire is in hand.
2. Throw `sw` to look the other way (it costs nothing: its red +16 counts a ring with no breaks in it). The homes go dark. Pulses run north up the west street: **the shrine lights**. They run on, round the corner and along the whole north street, and stop at a second **spark** at the north-east corner, beside the meeting hall. 9 of 12.
3. Two sparks, one wire, and the meeting hall stands between them. Fed from the north, the shrine is already lit and one mend, at the hall's corner, brings the hall. Fed from the east, one mend, by the homes, brings the hall, and the shrine is past the other spark.
4. The spark at the hall reads **+9, red**: past the hall the ring runs on into the kiln and the south street's houses. Fed from the north, the hall comes before `br_k` and the kiln after. Open `br_k`. The spark reads +1, white.
5. Click the spark. The meeting hall burns gold with the shrine. 10 of 12. **Win.**

**Hidden at the start (1 fact):** the second break, `f_y`. The free throw of the switch shows it, before anything is spent. **Layers (2):** which end feeds and which break to mend; then where the ring is opened so the feed can carry it.

## The trap

**Mending the break by the lit homes lights one target and strands the other behind the second break.** As the plan's row. The spark that shows first is 12 m from the lit homes, the wire fits it, and it works: the south street's houses, the kiln and the meeting hall light, 11 of 12, with the homes still on. Then a second spark shows just past the hall, the shrine is beyond it, and the wire is gone. Throwing the switch now lights the shrine and darkens the hall: each end reaches one target.

It is readable at once (the hall lit, the shrine dark, a new spark, no wire) and one Undo takes it back.

**The second half, which the breaker adds, is free:** mend the right spark with `br_k` closed and the whole ring lights to the back of the first break, 18 of 12, and flickers. Open `br_k` and the job is won.

## The numbers (section V)

**The wrong mend and the right throw are both red at the start, so the numbers do not choose.** At the start the spark `f_x` reads +18 red and `sw` +16 red: both count the unread break as sound and so a whole ring alight. In truth the mend gives 11 of 12 and the throw 9 of 12, both under. With `br_k` opened first, both turn white (+8 each), and the wrong mend then lights the kiln and stops at the breaker, short of the hall. After the throw `f_y` reads +9 red with `br_k` closed and +1 white with it open. The wrong move is a part spent in the wrong place, and no number marks it apart from the right one.

## The tribe's homes

`homes` (priority) is lit at the start and **dark at the win**: the ring is fed from the north and the homes are past `f_x`, which is left broken. The trap keeps them lit, and loses the shrine. The kiln is dark at the start and at the win.

## Series rules

- Size 2 faults / wire / 1 switch, **1 breaker** (the row's size and Josh's "Add a breaker"). Own buildings: 4. Faults: 2.
- No fuse box, so no fuse blow.
- **Kit: 1 wire.** Puzzle 8's kit is 1 fuse, puzzle 10's is 2 fuses and a bulb: no repeat.
- **Heavy building: the kiln** (load 2). Puzzle 8's is the mill; puzzle 10 has none besides its target.
- **Shrine count: 2 of 5** (puzzles 1 and 9).
- District `block:0:4`; puzzle 8 is on `block:6:3`, puzzle 10 on `block:1:7`. The feed's pole and six scenery buildings are across streets on `block:0:7`, `block:0:2`, `block:1:7` and `block:3:4`. Two of them are houses on `block:1:7`'s north side, across `x:7`; puzzle 10 is on that block's south street and shares no pole, wire or job building with this one.
- Districts used so far: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`.

## Expected numbers

`npm run analyze puzzles/city/s09-two-ways-round.city.json`:

| | |
| --- | --- |
| States | 12, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`sw`, `br_k`, `repair:l_y`) |
| Winning click orders | 3 (the breaker first, second, or last through a flicker) |
| Winning configurations | **1** (`sw` north, `br_k` open, `f_y` mended) |
| Parts used | wire (1 of 1) |
| Feed at the shortest win | 10 of 12 |
| Fuses that blow | none |
| Dead-end states | 4 of 12 (33.3%): every state with `f_x` mended |
| First moves that lead only to dead ends | **1**: `repair:l_x` |
| Hidden at the start | 1: the break `f_y` |

Loads, replayed on the conversion: start 2 of 12; `sw` 9 of 12; `sw`, `repair:l_y` 18 of 12, a flicker; with `br_k` open 10 of 12, win. The trap (`repair:l_x`) 11 of 12, then `sw` 9 of 12.

**The obvious wrong first move:** `repair:l_x`, the spark by the lit homes. Read: the kiln and the meeting hall light, the shrine is dark, a second spark shows beside the hall and no wire is left. Recovered by **one Undo**, then `br_k`, `sw`, `repair:l_y`. The check block replays it, and the flicker.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_k", "sw", "repair:l_y"],
  "traps": [
    { "name": "mend the spark by the lit homes",
      "moves": ["repair:l_x"],
      "expect": { "readable": ["f_y"], "lit": ["homes", "kiln", "meeting_hall"], "complete": false },
      "recover": ["undo", "br_k", "sw", "repair:l_y"] },
    { "name": "join the ring with the kiln on it",
      "moves": ["sw", "repair:l_y"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_k"] }
  ]
}
```

## To watch when Josh plays it

- Whether the ring reads as one wire round the block from the fixed camera, with the two targets on opposite sides of it.
- Both first moves are red at the start, the right one and the wrong one, because the numbers count the hidden break as sound. Whether that reads as "look first", or as noise.
- Whether throwing the switch "to look" occurs to a player who has a spark and a wire in front of them. Puzzles 4 and 7 both taught the free throw.
- Whether the breaker reads as a place to open the ring, or as the third thing to click.

## What it taught us
