# 08 · The small box — design note (series v1, puzzle 8)

A new puzzle designed on the city (ticket 081 section N2; `puzzles/series-v1.md`, row 8). It has no schematic and no `from`.

- **New concept:** the fuse rating. A fuse box is a second limit, a local one: it carries so much for the buildings past it and no more. Over the feed's limit the windows flicker and nothing is lost; over a box's limit the fuse blows, and a blow costs a part.
- **The reasoning move:** a red breaker means "not yet". Find what shares its box, and take that off first.
- **Builds on:** 1 (a breaker cuts everything past it; a breaker can be thrown while dark), 3 (the feed's capacity, the flicker, choosing what goes dark), 6 (the fuse box, and the fuse that mends it), 7 (what else is on the wire comes with the building you wanted).
- It uses no switch, fault at the start, ring, relay, spring, battery, second feed or nested fuse.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:3`**, north of the town's middle: its east street `z:7`, its north street `x:3` and the first pole of its west street `z:6`. The feed stands across `z:7`.
- Capacity **9** and `fb` rating **6**: its own 3 and 3, each raised once by `npm run fit -- --raise` for the scenery its solution lights (6 buildings on the feed, 3 of them behind the box).
- Target: `cold_store`. Priority: `home`. Parts: **1 fuse** (a spare: no fuse is blown at the start).
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).
- **No breaker, switch or fuse box on a branch pole** (Josh, 26 Nov 2026, on puzzles 1 to 3: "the breaker box rests on a split. One wire is on and the other is off"; on a card, for fuse boxes: "Same rule (Recommended)"). The rule counts every wire the city hangs on the pole, the job's or not: spans along the street, corner spans, crossing spans over the street that no line owns, and drops. The table *What meets each control's pole* lists them. The splits are plain junctions: `j0`, `j_s` at the store's pole and `j_t` at the cold store's.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:7:hi:167.50` (crossing, block:7:1, across `z:7`) | 360.75, 167.50 |
| `j0` | junction | pole `pole:z:7:lo:167.50` (landing, block:6:3, +x side) | 344.25, 167.50 |
| `br_out` | breaker, closed | pole `pole:z:7:lo:187.50` (slot, no drop) | 344.25, 187.50 |
| `home` | lamp, load 1 | building `block:6:3/b\|outer\|+x\|67,38`, by its drop from `pole:z:7:lo:197.50` | 340.00, 197.50 |
| `fb` | fuse box, rating 6 | pole `pole:x:3:hi:324.17` (slot, -z side), the first pole west of the north-east corner | 324.17, 150.75 |
| `j_s` | junction | pole `pole:x:3:hi:315.83` (slot) | 315.83, 150.75 |
| `store` | lamp, load 1 | building `block:6:3/a\|outer\|-z\|61,31`, by its drop from `j_s`'s pole | 317.50, 155.00 |
| `br_t` | breaker, **open** | pole `pole:x:3:hi:305.50` (slot, no drop) | 305.50, 150.75 |
| `j_t` | junction | pole `pole:x:3:hi:283.33` (slot) | 283.33, 150.75 |
| `cold_store` | lamp, load 2, **target** | building `block:6:3/a\|outer\|-z\|56,31`, by its drop from `j_t`'s pole | 282.50, 155.00 |
| `br_mill` | breaker, closed | pole `pole:z:6:hi:157.50` (end, -x side, no drop), round the north-west corner | 265.75, 157.50 |
| `mill` | lamp, load 2 | building `block:6:3/a\|outer\|-x\|54,32`, by its drop from `pole:z:6:hi:170.67` | 270.00, 172.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `z:7`) | 16.50 |
| `l_out` | `j0` → `br_out` | 2 spans: along `z:7`, south | 20.00 |
| `l_home` | `br_out` → `home` | 1 span: along `z:7`, + drop | 10.00 |
| `l_fb` | `j0` → `fb` | 3 spans: along `z:7`, north, the corner (into `x:3`), along `x:3` | 32.88 |
| `l_s` | `fb` → `j_s` | 1 span: along `x:3` | 8.33 |
| `l_store` | `j_s` → `store` | drop | — |
| `l_t` | `j_s` → `br_t` | 1 span: along `x:3` | 10.33 |
| `l_t2` | `br_t` → `j_t` | 2 spans: along `x:3` | 22.17 |
| `l_cold` | `j_t` → `cold_store` | drop | — |
| `l_m` | `j_t` → `br_mill` | 2 spans: along `x:3`, then the corner (into `z:6`) | 20.38 |
| `l_mill` | `br_mill` → `mill` | 1 span: along `z:6`, + drop | 13.17 |

No fault at the start.

**What meets each control's pole** (every span and drop in the city's circuit layer at that pole):

| Control | Pole | Spans | Drops |
| --- | --- | --- | --- |
| `fb` | `pole:x:3:hi:324.17` | 2: along to `x:3:hi:337.50` (`l_fb`), along to `x:3:hi:315.83` (`l_s`) | none |
| `br_out` | `pole:z:7:lo:187.50` | 2: along to `z:7:lo:177.50` (`l_out`), along to `z:7:lo:197.50` (`l_home`) | none |
| `br_t` | `pole:x:3:hi:305.50` | 2: along to `x:3:hi:315.83` (`l_t`), along to `x:3:hi:294.17` (`l_t2`) | none |
| `br_mill` | `pole:z:6:hi:157.50` | 2: corner to `x:3:hi:272.50` (`l_m`), along to `z:6:hi:170.67` (`l_mill`) | none |

The first lay had `fb` on the corner pole `pole:x:3:hi:337.50`, which also carries a crossing span over `x:3` that no line owns (review 081 N2, must-fix 1). That pole is now a carrier of `l_fb`.

Scenery (section S), 6 buildings, each 1:

| Building | Hangs on | Behind the box | Live when |
| --- | --- | --- | --- |
| `block:6:3/b\|outer\|+x\|67,34` | `l_out`'s carrier pole, before `br_out` | no | always |
| `block:6:3/b\|outer\|+x\|67,31` and `block:7:1/b\|outer\|-x\|73,28` (across `z:7`) | `l_fb`'s carrier pole, before the fuse | no | always |
| `block:6:1/b\|outer\|+z\|62,25` (across `x:3`) | `j_s`'s pole | yes | the fuse is sound |
| `block:6:1/a\|outer\|+z\|56,25` (across `x:3`) | `j_t`'s pole | yes | `br_t` closed |
| `block:6:3/a\|outer\|-z\|54,31` | `l_m`'s carrier pole, before `br_mill` | yes | `br_t` closed |

**What is behind the box:** the store and a house (2, always); past `br_t` the cold store (2) and two houses (2); past `br_mill` the mill (2). **What is not:** the home (1), behind `br_out`, and three houses.

**The lay is one wire.** On a 1-block district a pole chain does not branch, so the pieces behind the box stand in a row (N1's lesson). The mill is therefore *past* the cold store, on the same wire: closing the cold store's breaker brings the mill with it, unless the mill's own breaker is opened first.

## The intended read from the default camera

The camera opens on `block:6:3` and its four streets. **The cold store is on `x:3`, the block's north street, 54 m west of the north-east corner**, carrying the target mark. The feed's pole is across `z:7`, the east street.

1. The feed's wire crosses `z:7` to `j0` and splits. South: a lit house, a breaker, and one span on a lit home. North: past two lit houses and round the corner into `x:3`, where the first pole holds a **fuse box**. Past the box, along `x:3`: a lit store, then an **open breaker**, `br_t`; two dark spans on, the cold store; on round the far corner, another breaker, and one span past it the dark mill. The HUD reads 6 of 9; the box reads 2 of 6. One fuse is in hand, and nothing is broken.
2. `br_t` reads **+6, red**. The cold store draws 2. The rest is what comes with it on that wire: two houses, and past the second breaker the mill.
3. Two bars have to hold it. The box has 4 to spare and would be asked for 6. The feed has 3 to spare.
4. Open `br_mill`. Nothing changes on screen (it was dark). `br_t` now reads **+4, still red**: the box would be 6 of 6, and the feed 10 of 9.
5. Open `br_out`. The home goes dark; 5 of 9. `br_t` reads +4, white.
6. Close `br_t`. The cold store burns gold. 9 of 9, the box 6 of 6. **Win.**

**Hidden at the start: nothing is behind a fault.** The one fact that is not a light on the first frame is that the dark mill hangs on the target's wire; it is on screen as a wire, and the +6 says it. **Layers (2):** the box (the mill), then the feed (the home).

## The trap

**The red breaker is the one that lights the target; and shedding the home, which is not behind the box, does nothing for the box.** The player who has learned 3 sees a red number and sheds what is lit: the home. `br_t` is still red, +6. Closed anyway, the fuse blows: a bolt runs to the box, the store goes dark with everything past it, and a ✕ stands on the box. It is the series' first blow, and the one "obvious breaker blows a fuse" opener of 6 to 10.

It is readable (the bolt, the ✕, the store dark) and a part recovers it: open `br_mill`, fit the spare, and the cold store lights. The same from the plain first click on `br_t`, with `br_out` opened as well.

The other half is free: with only `br_mill` opened, `br_t` gives a flicker (10 of 9) and no blow. Opening `br_out` clears it and wins. So the two limits are met side by side, and the difference between them is the lesson: over the feed costs nothing, over the box costs the fuse.

**Changed from the plan's row** ("the feed reads half empty; shedding the one house that is not behind the box changes nothing"), and why. The house that is not behind the box is still the wrong shed for the box, and the check block replays that (`br_out`, `br_t`: it blows). What changed is that the feed is no longer half empty: the home has to go too, for the feed. With the feed slack the fewest clicks would be 2 (`br_mill`, `br_t`), under N2's band of 3; with the feed tight all three of the row's breakers are used, and the player sees a flicker and a blow in one puzzle. The second change is the lay's: the load that shares the box is the dark mill past the target, not a lit building beside it, because on one block the pieces behind a box stand in series.

**One more way to lose, which is not the trap.** After a blow, fitting the spare with the cold store and the mill both still on blows it again, and no fuse is left. The fuse's number is red before that click (+8), the bolt shows it after, and one Undo takes it back. "Fit it and it blows again" is the trap of no puzzle in this series; it is possible here only as a second mistake.

## The numbers (section V)

**The move that lights the target is red, and the puzzle is what to do first so it turns white.** At the start `br_t` reads +6 red, `br_out` −1, `br_mill` +0. With `br_out` open, `br_t` is still +6 red (the trap). With `br_mill` open, +4 red. With both, +4 white. After a blow the fuse reads +8 red with everything on, and white once both sheds are made.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**. No win keeps it: the one winning configuration has `br_out` open. The store stays lit; the mill was dark and stays dark.

## Series rules

- Size 0 faults / fuse / 3 breakers, 1 fuse box, as the row. Own buildings: 4. Faults: 0.
- **The fuse-blow opener of this batch** (the cap's two are 8 and 19). "Fit it and it blows again" is not the trap.
- **Kit: 1 fuse.** Puzzle 7's kit is 1 wire, puzzle 9's is 1 wire: no repeat with either.
- **Heavy building: the mill** (load 2). Puzzle 7 has none; puzzle 9's is the kiln.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the cold store).
- District `block:6:3`; puzzle 7 is on `block:6:11`, puzzle 9 on `block:0:4`. The feed's pole and three scenery buildings are across streets on `block:7:1` and `block:6:1`. `block:6:1` is puzzle 2's district, which is not a neighbour of 8; the two houses are on its south side, across `x:3`, and no pole, wire or job building of puzzle 2's is used.
- Districts used so far: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`.

## Expected numbers

`npm run analyze puzzles/city/s08-the-small-box.city.json`:

| | |
| --- | --- |
| States | 28, exhaustive |
| Solvable | yes |
| Fewest clicks | 3 (`br_mill`, `br_out`, `br_t`) |
| Winning click orders | 3 (the two sheds in either order, then `br_t`; or `br_mill`, `br_t`, `br_out`, through a flicker) |
| Winning configurations | **1** (`br_mill` open, `br_out` open, `br_t` closed) |
| Parts used | none on the shortest win (the spare fuse stays in hand) |
| Feed at the shortest win | 9 of 9; the box 6 of 6 |
| Fuses that blow | none on a shortest win; `fb` on some move |
| Dead-end states | 8 of 28 (28.6%): all with the fuse blown and the spare spent |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing behind a fault |

Loads, replayed on the conversion: start 6 of 9, box 2 of 6. `br_t`: the fuse blows (the box asked for 8 of 6). `br_out`, `br_t`: it blows. `br_mill`, `br_t`: 10 of 9, a flicker, no blow. `br_mill`, `br_out`, `br_t`: 9 of 9, win.

**The obvious wrong first move:** `br_t`, the breaker on the target's wire. Read: the bolt, the ✕ on the box, the store dark; 4 of 9. Recovered by a part: `br_mill`, `br_out`, then the spare fuse, and the cold store lights (9 of 9). The second, `br_out` then `br_t`: the same blow, recovered by `br_mill` and the fuse. The check block replays both, and the flicker.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_mill", "br_out", "br_t"],
  "traps": [
    { "name": "close the red breaker",
      "moves": ["br_t"],
      "expect": { "blown": ["fb"], "readable": ["blown-fb"], "lit": ["home"], "complete": false },
      "recover": ["br_mill", "br_out", "repair:fb"] },
    { "name": "shed the home, which is not behind the box",
      "moves": ["br_out", "br_t"],
      "expect": { "blown": ["fb"], "lit": [], "complete": false },
      "recover": ["br_mill", "repair:fb"] },
    { "name": "make room in the box only",
      "moves": ["br_mill", "br_t"],
      "expect": { "brownout": true, "blown": [], "complete": false },
      "recover": ["br_out"] }
  ]
}
```

## To watch when Josh plays it

- Whether the box's own bar (2 of 6) is seen beside the HUD's, and whether a red +6 says which of the two limits it is about.
- Whether the dark mill past the target, round the far corner, reads as "on the cold store's wire" before the first click. If not, the blow comes with no warning but the number.
- Opening `br_mill` changes nothing on screen but a number. Whether that reads as a move.
- The wire behind the box is 74 m and turns the far corner to the mill. Whether it stays traceable from the fixed camera.
- Two limits bind here, one old and one new. If that is one too many for the first rating puzzle, the feed can be given 1 more and the puzzle becomes 2 clicks.

## What it taught us
