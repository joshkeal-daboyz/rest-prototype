# 10 · Count the dark — design note (series v1, puzzle 10)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 10). It has no schematic and no `from`.

- **New concept:** a bulb is a load event. A dead building draws nothing, live drop or not, until its bulb goes in; then it draws its whole load at once, on the feed and on its box.
- **The reasoning move:** count the dark building before its bulb goes in. The box's bar shows what is burning, not what is about to.
- **Builds on:** 3 (choosing what goes dark), 6 (a fuse box blown at the start; a dead bulb hidden behind it), 8 (the fuse rating; a red number means "not yet"; a blow costs a part; the building past the target comes with it).
- It uses no switch, ring, relay, spring, battery, second feed or nested fuse. The feed never binds (the most the map can draw is 9 of 9, and the box blows before that); the box is the only limit.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:1:7`**, in the town's west half: its south street `x:9` from end to end and the first poles of its east street `z:5`. The feed stands across `z:1` from the block's south-west corner.
- Capacity **9** and `fb` rating **5**: its own 4 and 3, each raised once by `npm run fit -- --raise` for the scenery its solution lights (5 buildings on the feed, 2 of them behind the box).
- Target: `archive`. Priority: `home`. Parts: **2 fuses, 1 bulb**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, switch or fuse box on a branch pole** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split. One wire is on and the other is off"; on a card, for fuse boxes: "Same rule (Recommended)"). The rule counts every wire the city hangs on the pole, the job's or not: spans along the street, corner spans, crossing spans over the street that no line owns, and drops. The table *What meets each control's pole* lists them.

**Re-laid twice for that rule, and what it changed.** The first lay (on `block:6:9`) had the fuse box on the pole where the feed's wire lands, with the archive up one side and the works down the other. With the box on a run, everything behind it is one wire (a 1-block pole chain does not branch), so the building that has to come off is now past the archive on the same wire, as the mill is in puzzle 8; and the district moved to `block:1:7`, which has the bare poles this needs. The second lay there had the box and `br_t` on poles that each carry a crossing span over `x:9` that no line owns (review 081 N2, must-fix 2). `block:1:7` has three poles in a row along one chain that carry two spans and nothing else, `pole:x:9:lo:112.50`, `pole:x:9:lo:149.50` and `pole:z:5:lo:302.50`, and the three controls now stand on them, with the feed brought in from the west end.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:1:lo:312.50` (end, block:0:7, across `z:1`) | 69.25, 312.50 |
| `j0` | junction | pole `pole:z:1:hi:312.50` (crossing, block:1:7, -x side) | 85.75, 312.50 |
| `fb` | fuse box, rating 5, **blown** | pole `pole:x:9:lo:112.50` (slot, +z side) | 112.50, 319.25 |
| `j_h` | junction | pole `pole:x:9:lo:122.50` (slot) | 122.50, 319.25 |
| `home` | lamp, load 1 | building `block:1:7/a\|outer\|+z\|23,62`, by its drop from `j_h`'s pole | 122.50, 315.00 |
| `br_t` | breaker, **open** | pole `pole:x:9:lo:149.50` (slot) | 149.50, 319.25 |
| `j_a` | junction | pole `pole:z:5:lo:312.50` (end, +x side), round the south-east corner | 169.25, 312.50 |
| `archive` | lamp, load 2, **target**, **dead** | building `block:1:7/b\|outer\|+x\|32,61`, by its drop from `j_a`'s pole | 165.00, 312.50 |
| `br_w` | breaker, closed | pole `pole:z:5:lo:302.50` (slot) | 169.25, 302.50 |
| `tannery` | lamp, load 1 | building `block:1:7/b\|outer\|+x\|32,58`, by its drop from `pole:z:5:lo:292.50` | 165.00, 292.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `z:1`) | 16.50 |
| `l_fb` | `j0` → `fb` | 3 spans: corner (into `x:9`), along `x:9` | 29.55 |
| `l_row` | `fb` → `j_h` | 1 span: along `x:9` | 10.00 |
| `l_home` | `j_h` → `home` | drop | — |
| `l_t` | `j_h` → `br_t` | 3 spans: along `x:9` | 27.00 |
| `l_a` | `br_t` → `j_a` | 2 spans: along `x:9`, then the corner (into `z:5`) | 22.55 |
| `l_archive` | `j_a` → `archive` | drop | — |
| `l_w` | `j_a` → `br_w` | 1 span: along `z:5` | 10.00 |
| `l_tan` | `br_w` → `tannery` | 1 span: along `z:5`, + drop | 10.00 |

One wire, east along `x:9` from the south-west corner and round into `z:5`: two lit houses, the fuse box, the home, two houses, the archive's breaker, the archive at the corner, the tannery's breaker, the tannery.

**What meets each control's pole** (every span and drop in the city's circuit layer at that pole):

| Control | Pole | Spans | Drops |
| --- | --- | --- | --- |
| `fb` | `pole:x:9:lo:112.50` | 2: along to `x:9:lo:102.50` (`l_fb`), along to `x:9:lo:122.50` (`l_row`) | none |
| `br_t` | `pole:x:9:lo:149.50` | 2: along to `x:9:lo:142.50` (`l_t`), along to `x:9:lo:162.50` (`l_a`) | none |
| `br_w` | `pole:z:5:lo:302.50` | 2: along to `z:5:lo:312.50` (`l_w`), along to `z:5:lo:292.50` (`l_tan`) | none |

The poles with a third wire are carriers or plain junctions: `pole:x:9:lo:132.50` and `pole:x:9:lo:162.50` (each a crossing span over `x:9`) are carriers of `l_t` and `l_a`; `j_a`'s pole also carries the crossing span over `z:5`.

Faults (2): `f_fuse`, the blown fuse at `fb`, live and readable from the start; `f_bulb`, a dead bulb in the archive, behind the blown fuse and the open breaker.

Scenery (section S), 5 buildings, each 1: `block:1:7/a|outer|-x|18,60` at `j0`'s pole, and `block:1:7/a|outer|+z|19,62` and `block:0:8/b|outer|-z|17,68` (across `x:9`) on `l_fb`'s carriers, all before the fuse and lit always; `block:1:7/a|outer|+z|27,62` and `block:4:8/a|outer|-z|28,68` (across `x:9`) on `l_t`'s carrier, behind the box and before `br_t`, lit when the fuse is in.

## The intended read from the default camera

The camera opens on `block:1:7` and its four streets. **The archive is the block's south-east corner building, on `z:5`** (60 m of wire from the fuse box), carrying the target mark. The feed's pole is across `z:1`, at the other end of the south street.

1. The view opens with three houses lit at the west end of `x:9`, where the feed's wire comes in, and then a fuse box with a **✕**; nothing past it is lit. The HUD reads 3 of 9. In hand: two fuses and a bulb. The fuse reads +3.
2. Fit a fuse. The home and two houses past it light. **The box reads 3 of 5.** Further along, an open breaker, `br_t`, reads **+3, red**: the archive, 2, and on the same wire past it the tannery, 1. (The preview marks this click as a blow. It is not one; see the numbers.)
3. Red means "not yet" (8). Take off what shares the box: open `br_w`, past the archive (it was dark; nothing changes). `br_t` reads +2, white.
4. Close `br_t`. The archive's drop goes live, **and nothing else happens**: its windows stay dark, and the box still reads 3 of 5. A dead bulb. It reads +2.
5. Fit the bulb. The archive burns gold, and the box goes from 3 to 5 of 5 in one step. **Win.**

**Hidden at the start (1 fact):** the archive's dead bulb, behind the fuse and its breaker. The breaker shows it, and closing the breaker can cost nothing while the bulb is dead. **Layers (2):** the dark behind the fuse (fuse, breaker), then the load the bulb brings (shed, bulb).

## The trap

**The box reads 4 of 5 with everything on; the target's bulb brings 2 more at once.** As the plan's row ("the box reads 2 of 3 after the fuse; the target's bulb brings 2 more at once"), with one turn added by the city's numbers. After the fuse `br_t` is red, +3, and marked as a blow. A player who closes it anyway finds that nothing blows: the tannery lights, the archive is dead, a dead building draws nothing, and the box reads 4 of 5. The number read high (it counts a building it has not read as sound). So when the bulb also reads +2 red, it is easy to take that for the same false alarm, with a lit home, a lit tannery and "4 of 5" on the box saying there is room. It is not: the bulb goes in, the archive draws 2, the box is asked for 6 of 5, and the fuse blows.

It is readable (the bolt, the ✕, the whole street past the box dark again, and the archive now sound) and a part recovers it: open `br_w`, fit the second fuse, and the archive lights with the home, 5 of 5. The second fuse is in the kit for this.

**One more way to lose, which is not the trap.** Fitting the second fuse without opening `br_w` blows it too (it reads +6 red first), and none is left. One Undo takes it back.

## The numbers (section V)

**The move that lights the target is red, and the puzzle is what to do first so it turns white.** After the fuse: `br_t` +3 red, `br_w` +0. With `br_w` open: `br_t` +2 white, then the bulb +2 white. With `br_t` closed and the tannery still on: the bulb +2 red.

**The preview predicts a blow on `br_t` that does not come.** After the fuse, with the tannery's breaker closed, the load preview flags `br_t` not only red but as a move that blows the fuse (it counts the archive, whose dead bulb it has not read, as a sound building drawing 2: 3 + 2 + 1 = 6 of 5). Closing `br_t` blows nothing: the box goes to 4 of 5. That is what Josh will see on screen, a blow warning on a click that is safe. The red on the bulb, one click later, is exact, and that click does blow. Telling the two apart is the puzzle's lesson: the bulb is where the load arrives.

## The tribe's homes

`home` (priority) is dark at the start, behind the blown fuse, and **lit at the win**. The tannery is dark at the start and dark at the win: it is what the archive costs.

## Series rules

- Size 2 faults / 2 fuses, bulb / 2 breakers, 1 fuse box, as the row. Own buildings: 3. Faults: 2.
- **No "obvious breaker blows a fuse":** the red breaker here blows nothing. The blow in this puzzle comes from a bulb. "Fit it and it blows again" is not the trap (the first fuse blows nothing when fitted).
- **Kit: 2 fuses, 1 bulb.** Puzzle 9's kit is 1 wire: no repeat.
- Heavy building: none besides the target (the archive, load 2); puzzle 9's was the kiln.
- **Shrine count: 2 of 5** (puzzles 1 and 9; the target here is the archive).
- District `block:1:7`; puzzle 9 is on `block:0:4`. Puzzle 11 must not use `block:1:7`. Puzzle 9's trap lights two houses on this block's north side, across `x:7`; this puzzle is on its south and east streets and shares no pole, wire or job building with 9. The feed's pole is across `z:1` on `block:0:7`; one scenery house is across `x:9` on `block:0:8` (puzzle 6's district, not a neighbour of 10, and no place of 6's is used) and one on `block:4:8`.
- **Districts used by 1 to 10**, none to be a district again: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`.

## Expected numbers

`npm run analyze puzzles/city/s10-count-the-dark.city.json`:

| | |
| --- | --- |
| States | 20, exhaustive |
| Solvable | yes |
| Fewest clicks | 4 (`repair:fb`, `br_w`, `br_t`, `repair:archive`) |
| Winning click orders | 6 (the bulb last; the fuse before the bulb; the two breakers anywhere before it) |
| Winning configurations | **1** (`br_w` open, `br_t` closed, the fuse and the bulb in) |
| Parts used | fuse, bulb (the second fuse stays in hand) |
| Feed at the shortest win | 8 of 9; the box 5 of 5 |
| Fuses that blow | none on a shortest win; `fb` on some move |
| Dead-end states | 4 of 20 (20.0%): both fuses spent and the box blown |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the archive's dead bulb |

Loads, replayed on the conversion: start 3 of 9; the fuse 6 of 9, the box 3 of 5; `br_t` closed with the tannery on, 7 of 9, the box 4 of 5; the bulb then, the fuse blows, 3 of 9; `br_w` and the second fuse, 8 of 9, the box 5 of 5, win.

**The obvious wrong first move** (after the fuse, which is the only useful first click): `br_t` on red, then the bulb on red. Read: at `br_t`, the tannery lights and the archive's drop is live on dark windows; at the bulb, the bolt, the ✕ and the street dark. Recovered by a part: `br_w`, then the second fuse, and the job is won. The check block replays both steps.

Salvage, trips and walking: n/a (map scope).

**P1's sweep with the ten series puzzles in** (`npx vitest run --maxWorkers=2 tools/fit.test.ts`, Josh's PC, 26 Nov 2026) is in the branch's commit messages and the designer's replies. N1's figure was 22 puzzles in 328 ms.

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb", "br_w", "br_t", "repair:archive"],
  "traps": [
    { "name": "the red breaker that blows nothing",
      "moves": ["repair:fb", "br_t"],
      "expect": { "lit": ["home", "tannery"], "readable": ["f_bulb"], "blown": [], "complete": false },
      "recover": ["br_w", "repair:archive"] },
    { "name": "the bulb on a red number",
      "moves": ["repair:fb", "br_t", "repair:archive"],
      "expect": { "blown": ["fb"], "lit": [], "complete": false },
      "recover": ["br_w", "repair:fb"] }
  ]
}
```

## To watch when Josh plays it

- The preview warns of a blow on `br_t` and none comes; it warns on the bulb and one does. Whether that teaches "the bulb is where the load arrives", or teaches him to distrust the numbers.
- Whether "the box still reads 3 of 5" after `br_t` is noticed at all: it is the one place the concept shows before it bites.
- The lay is puzzle 8's shape (the building to shed is past the target). Whether 10 still reads as a new idea, the bulb, on a known wire.
- The wire is 109 m, the length of the south street and round the corner, with the feed at the far end from the target. Whether it reads from the fixed camera.

## What it taught us
