# 10 · Count the dark — design note (series v1, puzzle 10)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 10). It has no schematic and no `from`.

- **New concept:** a bulb is a load event. A dead building draws nothing, live drop or not, until its bulb goes in; then it draws its whole load at once, on the feed and on its box.
- **The reasoning move:** count the dark building before its bulb goes in. The box's bar shows what is burning, not what is about to.
- **Builds on:** 3 (choosing what goes dark), 6 (a fuse box blown at the start; a dead bulb hidden behind it), 8 (the fuse rating; a red number means "not yet"; a blow costs a part; the building past the target comes with it).
- It uses no switch, ring, relay, spring, battery, second feed or nested fuse. The feed never binds (the most the map can draw is 6 of 6, and the box blows before that); the box is the only limit.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:1:7`**, on its south street `x:9`, in the town's west half. The feed stands across `z:5` from the block's south-east corner.
- Capacity **6** and `fb` rating **4**: its own 4 and 3, each raised once by `npm run fit -- --raise` for the scenery its solution lights (2 buildings on the feed, 1 of them behind the box).
- Target: `archive`. Priority: `home`. Parts: **2 fuses, 1 bulb**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, switch or fuse box on a branch pole** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split. One wire is on and the other is off"; on a card, for fuse boxes: "Same rule (Recommended)"). The fuse box and both breakers are each on a bare pole with one wire in, one wire out and no building's drop. The splits are plain junctions at the home's pole and the archive's.

**Re-laid for that ruling, and what it changed.** The first lay had the fuse box on the pole where the feed's wire lands, with the archive up one side and the works down the other. With the box on a run, everything behind it is one wire (a 1-block pole chain does not branch), so the building that has to come off is now past the archive on the same wire, as the mill is in puzzle 8. The district moved from `block:6:9`, whose street has one bare pole, to `block:1:7`, which has the three this needs.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:5:hi:312.50` (crossing, block:5:7, across `z:5`) | 185.75, 312.50 |
| `j0` | junction | pole `pole:z:5:lo:312.50` (end, block:1:7, +x side) | 169.25, 312.50 |
| `fb` | fuse box, rating 4, **blown** | pole `pole:x:9:lo:162.50` (end, +z side, no drop), round the corner | 162.50, 319.25 |
| `j_h` | junction | pole `pole:x:9:lo:142.50` (slot) | 142.50, 319.25 |
| `home` | lamp, load 1 | building `block:1:7/a\|outer\|+z\|27,62`, by its drop from `j_h`'s pole | 142.50, 315.00 |
| `br_t` | breaker, **open** | pole `pole:x:9:lo:132.50` (landing, no drop) | 132.50, 319.25 |
| `j_a` | junction | pole `pole:x:9:lo:122.50` (slot) | 122.50, 319.25 |
| `archive` | lamp, load 2, **target**, **dead** | building `block:1:7/a\|outer\|+z\|23,62`, by its drop from `j_a`'s pole | 122.50, 315.00 |
| `br_w` | breaker, closed | pole `pole:x:9:lo:112.50` (slot, no drop) | 112.50, 319.25 |
| `tannery` | lamp, load 1 | building `block:1:7/a\|outer\|+z\|19,62`, by its drop from `pole:x:9:lo:102.50` | 102.50, 315.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `z:5`) | 16.50 |
| `l_fb` | `j0` → `fb` | 1 span: corner (into `x:9`) | 9.55 |
| `l_row` | `fb` → `j_h` | 2 spans: along `x:9` | 20.00 |
| `l_home` | `j_h` → `home` | drop | — |
| `l_t` | `j_h` → `br_t` | 1 span: along `x:9` | 10.00 |
| `l_a` | `br_t` → `j_a` | 1 span: along `x:9` | 10.00 |
| `l_archive` | `j_a` → `archive` | drop | — |
| `l_w` | `j_a` → `br_w` | 1 span: along `x:9` | 10.00 |
| `l_tan` | `br_w` → `tannery` | 1 span: along `x:9`, + drop | 10.00 |

One wire, west along `x:9` from the corner: the fuse box, the home, the archive's breaker, the archive, the tannery's breaker, the tannery.

Faults (2): `f_fuse`, the blown fuse at `fb`, live and readable from the start; `f_bulb`, a dead bulb in the archive, behind the blown fuse and the open breaker.

Scenery (section S), 2 buildings, each 1: `block:1:7/b|outer|+x|32,61` at `j0`'s pole, before the fuse, lit always; `block:4:8/a|outer|-z|28,68` (across `x:9`) at `j_h`'s pole, behind the box, lit when the fuse is in.

## The intended read from the default camera

The camera opens on `block:1:7` and its four streets. **The archive is on `x:9`, the block's south street, four poles west of the south-east corner** (40 m of wire from the fuse box), carrying the target mark. The feed's pole is across `z:5` from that corner.

1. The view opens almost dark: one house at the corner is lit. The feed's wire crosses `z:5` to the corner pole and turns into `x:9`, to a fuse box with a **✕**; nothing past it is lit. The HUD reads 1 of 6. In hand: two fuses and a bulb. The fuse reads +2.
2. Fit a fuse. The home and the house across the street light. **The box reads 2 of 4.** Past the home, an open breaker, `br_t`, reads **+3, red**: the archive, 2, and on the same wire past it the tannery, 1.
3. Red means "not yet" (8). Take off what shares the box: open `br_w`, past the archive (it was dark; nothing changes). `br_t` reads +2, white.
4. Close `br_t`. The archive's drop goes live, **and nothing else happens**: its windows stay dark, and the box still reads 2 of 4. A dead bulb. It reads +2.
5. Fit the bulb. The archive burns gold, and the box goes from 2 to 4 of 4 in one step. **Win.**

**Hidden at the start (1 fact):** the archive's dead bulb, behind the fuse and its breaker. The breaker shows it, and closing the breaker can cost nothing while the bulb is dead. **Layers (2):** the dark behind the fuse (fuse, breaker), then the load the bulb brings (shed, bulb).

## The trap

**The box reads 3 of 4 with everything on; the target's bulb brings 2 more at once.** As the plan's row ("the box reads 2 of 3 after the fuse; the target's bulb brings 2 more at once"), with one turn added by the city's numbers. After the fuse `br_t` is red, +3. A player who closes it anyway finds that nothing blows: the tannery lights, the archive is dead, a dead building draws nothing, and the box reads 3 of 4. The number read high (it counts a building it has not read as sound). So when the bulb also reads +2 red, it is easy to take that for the same false alarm, with a lit home, a lit tannery and "3 of 4" on the box saying there is room. It is not: the bulb goes in, the archive draws 2, the box is asked for 5 of 4, and the fuse blows.

It is readable (the bolt, the ✕, the whole street dark again, and the archive now sound) and a part recovers it: open `br_w`, fit the second fuse, and the archive lights with the home, 4 of 4. The second fuse is in the kit for this.

**One more way to lose, which is not the trap.** Fitting the second fuse without opening `br_w` blows it too (it reads +5 red first), and none is left. One Undo takes it back.

## The numbers (section V)

**The move that lights the target is red, and the puzzle is what to do first so it turns white.** After the fuse: `br_t` +3 red, `br_w` +0. With `br_w` open: `br_t` +2 white, then the bulb +2 white. With `br_t` closed and the tannery still on: the bulb +2 red. The red on `br_t` is a number that reads high; the red on the bulb is exact. Telling the two apart is the puzzle's lesson: the bulb is where the load arrives.

## The tribe's homes

`home` (priority) is dark at the start, behind the blown fuse, and **lit at the win**. The tannery is dark at the start and dark at the win: it is what the archive costs.

## Series rules

- Size 2 faults / 2 fuses, bulb / 2 breakers, 1 fuse box, as the row. Own buildings: 3. Faults: 2.
- **No "obvious breaker blows a fuse":** the red breaker here blows nothing. The blow in this puzzle comes from a bulb. "Fit it and it blows again" is not the trap (the first fuse blows nothing when fitted).
- **Kit: 2 fuses, 1 bulb.** Puzzle 9's kit is 1 wire: no repeat.
- Heavy building: none besides the target (the archive, load 2); puzzle 9's was the kiln.
- **Shrine count: 2 of 5** (puzzles 1 and 9; the target here is the archive).
- District `block:1:7`; puzzle 9 is on `block:0:4`. Puzzle 11 must not use `block:1:7`. Two of puzzle 9's scenery houses stand on this block's north side, across `x:7`; this puzzle is on its south street and shares no pole, wire or job building with 9.
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
| Feed at the shortest win | 5 of 6; the box 4 of 4 |
| Fuses that blow | none on a shortest win; `fb` on some move |
| Dead-end states | 4 of 20 (20.0%): both fuses spent and the box blown |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the archive's dead bulb |

Loads, replayed on the conversion: start 1 of 6; the fuse 3 of 6, the box 2 of 4; `br_t` closed with the tannery on, 4 of 6, the box 3 of 4; the bulb then, the fuse blows, 1 of 6; `br_w` and the second fuse, 5 of 6, the box 4 of 4, win.

**The obvious wrong first move** (after the fuse, which is the only useful first click): `br_t` on red, then the bulb on red. Read: at `br_t`, the tannery lights and the archive's drop is live on dark windows; at the bulb, the bolt, the ✕ and the street dark. Recovered by a part: `br_w`, then the second fuse, and the job is won. The check block replays both steps.

Salvage, trips and walking: n/a (map scope).

**P1's sweep with the ten series puzzles in** (`npx vitest run --maxWorkers=2 tools/fit.test.ts`, Josh's PC, 26 Nov 2026) is in the branch's commit message and the designer's reply. N1's figure was 22 puzzles in 328 ms.

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

- The red on `br_t` is a false alarm and the red on the bulb is not. Whether that teaches "the bulb is where the load arrives", or teaches him to distrust the numbers.
- Whether "the box still reads 2 of 4" after `br_t` is noticed at all: it is the one place the concept shows before it bites.
- The lay is now puzzle 8's shape (the building to shed is past the target). Whether 10 still reads as a new idea, the bulb, on a known wire.
- The view opens with one scenery house lit and no job building. Whether a dark street with one ✕ reads as a start.

## What it taught us
