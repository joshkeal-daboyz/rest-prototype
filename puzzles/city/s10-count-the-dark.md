# 10 · Count the dark — design note (series v1, puzzle 10)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 10). It has no schematic and no `from`.

- **New concept:** a bulb is a load event. A dead building draws nothing, live drop or not, until its bulb goes in; then it draws its whole load at once, on the feed and on its box.
- **The reasoning move:** count the dark building before its bulb goes in. The box's bar shows what is burning, not what is about to.
- **Builds on:** 3 (choosing what goes dark), 6 (a fuse box blown at the start; a dead bulb hidden behind it), 8 (the fuse rating; a red number means "not yet"; a blow costs a part).
- It uses no switch, ring, relay, spring, battery, second feed or nested fuse. The feed never binds (the most the map draws is 4 of 4, in no winning state); the box is the only limit.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:9`**, on its west street `z:6`, south of the town's middle. The feed stands across `z:6`.
- Capacity **4** and `fb` rating **3**: its own numbers. `npm run fit -- --raise` was run once and adds nothing: no scenery building hangs on the job's poles.
- Target: `archive`. Priority: `home`. Parts: **2 fuses, 1 bulb**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker stands on a split** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split. One wire is on and the other is off"). Each of the two breakers has one wire in and one wire out, and the wire out is its own building's drop, as `br_lift` has in puzzle 5, which he called good. The split is at the fuse box, on the pole where the feed's wire lands: both ways from it are behind the fuse, and that is the point of the box here. The street has no bare pole to move a breaker to (its only one is a carrier between the box and the home).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:6:lo:402.50` (crossing, block:5:8, across `z:6`) | 249.25, 402.50 |
| `fb` | fuse box, rating 3, **blown** | pole `pole:z:6:hi:402.50` (landing, block:6:9, -x side) | 265.75, 402.50 |
| `br_t` | breaker, **open** | pole `pole:z:6:hi:397.50` (end) | 265.75, 397.50 |
| `archive` | lamp, load 2, **target**, **dead** | building `block:6:9/a\|outer\|-x\|54,79`, by its drop from `br_t`'s pole | 270.00, 397.50 |
| `j_h` | junction | pole `pole:z:6:hi:424.50` (slot) | 265.75, 424.50 |
| `home` | lamp, load 1 | building `block:6:9/a\|outer\|-x\|54,83`, by its drop from `j_h`'s pole | 270.00, 422.50 |
| `br_w` | breaker, closed | pole `pole:z:6:hi:436.25` (slot) | 265.75, 436.25 |
| `works` | lamp, load 1 | building `block:6:9/a\|outer\|-x\|54,86`, by its drop from `br_w`'s pole | 270.00, 437.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `fb` | 1 span: crossing (over `z:6`) | 16.50 |
| `l_t` | `fb` → `br_t` | 1 span: along `z:6`, north | 5.00 |
| `l_archive` | `br_t` → `archive` | drop | — |
| `l_row` | `fb` → `j_h` | 2 spans: along `z:6`, south | 22.00 |
| `l_home` | `j_h` → `home` | drop | — |
| `l_w` | `j_h` → `br_w` | 1 span: along `z:6` | 11.75 |
| `l_works` | `br_w` → `works` | drop | — |

The fuse box stands on the pole where the feed's wire lands, so everything on the job is behind it. North of it, one short span: the archive's breaker and the archive. South: the home, then the works behind its own breaker.

Faults (2): `f_fuse`, the blown fuse at `fb`, live and readable from the start; `f_bulb`, a dead bulb in the archive, behind the blown fuse and the open breaker.

Scenery (section S): none.

## The intended read from the default camera

The camera opens on `block:6:9` and its four streets. **The archive is on `z:6`, the block's west street, the first building north of where the feed's wire lands** (5 m), carrying the target mark. The feed's pole is across `z:6`.

1. The view opens dark. The feed's wire crosses `z:6` to a fuse box with a **✕**; nothing past it is lit. The HUD reads 0 of 4. In hand: two fuses and a bulb. The fuse reads +2.
2. Fit a fuse. The home and the works light, down the street. **The box reads 2 of 3.** The archive is dark behind its open breaker, `br_t`, which reads **+2, red**.
3. Red means "not yet" (8). The box has room for 1 and the archive draws 2. Something has to come off: the works, 1, on its own breaker. (The home has none.)
4. Open `br_w`. The works go dark; the box reads 1 of 3. `br_t` reads +2, white.
5. Close `br_t`. The archive's drop goes live, **and nothing else happens**: its windows stay dark, and the box still reads 1 of 3. A dead bulb. It reads +2.
6. Fit the bulb. The archive burns gold, and the box goes from 1 to 3 of 3 in one step. **Win.**

**Hidden at the start (1 fact):** the archive's dead bulb, behind the fuse and its breaker. The breaker shows it, and closing the breaker can cost nothing while the bulb is dead. **Layers (2):** the dark behind the fuse (fuse, breaker), then the load the bulb brings (shed, bulb).

## The trap

**The box reads 2 of 3 after the fuse; the target's bulb brings 2 more at once.** As the plan's row, with one turn added by the city's numbers. After the fuse `br_t` is red, +2. A player who closes it anyway finds that nothing blows: the archive is dead, a dead building draws nothing, and the box still reads 2 of 3. The number read high (it counts a building it has not read as sound). So when the bulb also reads +2 red, it is easy to take that for the same false alarm, with a lit home, lit works and "2 of 3" on the box saying there is room. It is not: the bulb goes in, the archive draws 2, the box is asked for 4 of 3, and the fuse blows.

It is readable (the bolt, the ✕, the whole street dark again, and the archive now sound) and a part recovers it: open `br_w`, fit the second fuse, and the archive lights with the home, 3 of 3. The second fuse is in the kit for this.

**One more way to lose, which is not the trap.** Fitting the second fuse without opening `br_w` blows it too (it reads +4 red first), and none is left. One Undo takes it back.

## The numbers (section V)

**The move that lights the target is red, and the puzzle is what to do first so it turns white.** After the fuse: `br_t` +2 red, `br_w` −1. With `br_w` open: `br_t` +2 white, then the bulb +2 white. With `br_t` closed and the works still on: the bulb +2 red. The red on `br_t` is a number that reads high; the red on the bulb is exact. Telling the two apart is the puzzle's lesson: the bulb is where the load arrives.

A second reading the numbers allow: with `br_t` closed before the fuse is fitted, the fuse itself reads +4 red at the start (it counts the unread archive as sound). Fitting it is in fact safe, 2 of 3. The intended path does not meet this.

## The tribe's homes

`home` (priority) is dark at the start, with everything else, and **lit at the win**. The works, the tribe's too but not marked, are lit by the fuse and dark at the win: they are what the archive costs.

## Series rules

- Size 2 faults / 2 fuses, bulb / 2 breakers, 1 fuse box, as the row. Own buildings: 3. Faults: 2.
- **No "obvious breaker blows a fuse":** the red breaker here blows nothing. The blow in this puzzle comes from a bulb. "Fit it and it blows again" is not the trap (the first fuse blows nothing when fitted).
- **Kit: 2 fuses, 1 bulb.** Puzzle 9's kit is 1 wire: no repeat.
- Heavy building: none besides the target (the archive, load 2); puzzle 9 had none.
- **Shrine count: 2 of 5** (puzzles 1 and 9; the target here is the archive).
- District `block:6:9`; puzzle 9 is on `block:0:4`. Puzzle 11 must not use `block:6:9`. (Three of puzzle 7's scenery houses stand on `block:6:9`'s north side, across `x:13`; 7 is not a neighbour.)
- **Districts used by 1 to 10**, none to be a district again: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:6:9`.

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
| Feed at the shortest win | 3 of 4; the box 3 of 3 |
| Fuses that blow | none on a shortest win; `fb` on some move |
| Dead-end states | 4 of 20 (20.0%): both fuses spent and the box blown |
| First moves that lead only to dead ends | none |
| Hidden at the start | 1: the archive's dead bulb |

Loads, replayed on the conversion: start 0 of 4; the fuse, 2 of 3 on the box; `br_t` closed with the works on, still 2 of 3; the bulb then, the fuse blows; `br_w` and the second fuse, 3 of 3, win.

**The obvious wrong first move** (after the fuse, which is the only useful first click): `br_t` on red, then the bulb on red. Read: at `br_t`, nothing changes and the archive's drop is live on dark windows; at the bulb, the bolt, the ✕ and the street dark. Recovered by a part: `br_w`, then the second fuse (the box 3 of 3), and the job is won. The check block replays both steps.

Salvage, trips and walking: n/a (map scope).

**P1's sweep with the ten series puzzles in** (`npx vitest run --maxWorkers=2 tools/fit.test.ts`, Josh's PC, 26 Nov 2026): "city sweep: 27 puzzles in 484 ms"; the file's 15 tests 4.75 s, the run 7.3 s. N1's figure was 22 puzzles in 328 ms.

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:fb", "br_w", "br_t", "repair:archive"],
  "traps": [
    { "name": "the red breaker that brings nothing",
      "moves": ["repair:fb", "br_t"],
      "expect": { "lit": ["home", "works"], "readable": ["f_bulb"], "blown": [], "complete": false },
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
- Whether "the box still reads 1 of 3" after `br_t` is noticed at all: it is the one place the concept shows before it bites.
- The archive's breaker is 5 m from the fuse box. Whether the two icons stand apart at the opening frame.
- The view opens with nothing lit. Whether a dark street with one ✕ reads as a start.

## What it taught us
