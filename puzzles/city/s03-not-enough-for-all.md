# 03 · Not enough for all — design note (series v1, puzzle 3)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 3). It has no schematic and no `from`.

- **New concept:** capacity and brownout. The feed carries so much and no more; over it, every window flickers and nothing counts as lit. Something has to go dark.
- **The reasoning move:** choose which group goes dark. The numbers by the breakers do the sum; the target decides between the ones that fit.
- **Builds on:** 1 (a breaker cuts everything past it; trace a building's wire to its breaker) and 2 (lighting one thing can cost another).
- It uses no switch, fault, part, fuse box, relay, spring, battery or second feed.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:8:1`**, at the corner where `x:5` meets `z:9`. The feed stands across `x:5`.
- Capacity **9**: its own 4 (the infirmary 2, the shed 1, the stall 1), raised once by `npm run fit -- --raise` for the 5 scenery buildings its solution lights.
- Target: `infirmary`. Priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:5:hi:482.50` (crossing, block:8:5, across `x:5`) | 482.50, 190.75 |
| `j0` | junction | pole `pole:x:5:lo:482.50` (end, block:8:1, +z side) | 482.50, 174.25 |
| `br_inf` | breaker, closed | pole `pole:x:5:lo:471.50` (slot) | 471.50, 174.25 |
| `j_inf` | junction | pole `pole:x:5:lo:449.50` (slot) | 449.50, 174.25 |
| `infirmary` | lamp, load 2, **target** | building `block:8:1/b\|outer\|+z\|89,33`, by its drop from `j_inf`'s pole | 447.50, 170.00 |
| `br_shed` | breaker, closed | pole `pole:x:5:lo:438.50` (slot) | 438.50, 174.25 |
| `j_shed` | junction | pole `pole:x:5:lo:427.50` (end) | 427.50, 174.25 |
| `shed` | lamp, load 1 | building `block:8:1/b\|outer\|+z\|85,33`, by its drop from `j_shed`'s pole | 427.50, 170.00 |
| `br_stall` | breaker, closed | pole `pole:z:8:hi:167.50` (crossing, block:8:1, -x side) | 420.75, 167.50 |
| `stall` | lamp, load 1 | building `block:8:1/b\|outer\|-x\|85,31`, by its drop from `br_stall`'s pole | 425.00, 162.50 |
| `br_row` | breaker, closed | pole `pole:z:9:lo:167.50` (end, block:8:1, +x side) | 489.25, 167.50 |
| `j_row` | junction | pole `pole:z:9:lo:155.00` (slot) | 489.25, 155.00 |
| `home` | lamp, load 1 | building `block:8:1/b\|outer\|+x\|96,31`, by its drop from `j_row`'s pole | 485.00, 157.50 |
| `kiln` | lamp, load 2 | building `block:8:1/b\|outer\|+x\|96,29`, by its drop from `j_row`'s pole | 485.00, 152.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `x:5`) | 16.50 |
| `l_inf0` | `j0` → `br_inf` | 1 span: along `x:5` | 11.00 |
| `l_inf1` | `br_inf` → `j_inf` | 2 spans: along `x:5` | 22.00 |
| `l_inf` | `j_inf` → `infirmary` | drop | — |
| `l_shed0` | `j_inf` → `br_shed` | 1 span: along `x:5` | 11.00 |
| `l_shed1` | `br_shed` → `j_shed` | 1 span: along `x:5` | 11.00 |
| `l_shed` | `j_shed` → `shed` | drop | — |
| `l_stall0` | `j_shed` → `br_stall` | 1 span: corner (into `z:8`) | 9.55 |
| `l_stall` | `br_stall` → `stall` | drop | — |
| `l_row0` | `j0` → `br_row` | 1 span: corner (into `z:9`) | 9.55 |
| `l_row1` | `br_row` → `j_row` | 1 span: along `z:9` | 12.50 |
| `l_home` | `j_row` → `home` | drop | — |
| `l_kiln` | `j_row` → `kiln` | drop | — |

Scenery (section S), 5 buildings, each 1:

| Building | Hangs on | Live when |
| --- | --- | --- |
| `block:8:1/b\|outer\|+z\|95,33` | `j0` | always |
| `block:8:1/b\|outer\|+z\|93,33` and `block:8:5\|outer\|-z\|93,39` (across `x:5`) | `l_inf0`, at `br_inf`'s pole | always (before the breaker) |
| `block:8:5\|outer\|-z\|90,39` (across `x:5`) | `l_inf1`, its carrier pole | `br_inf` closed |
| `block:8:5\|outer\|-z\|86,39` (across `x:5`) | `l_shed0`, at `br_shed`'s pole | `br_inf` closed (before `br_shed`) |

**What each breaker sheds** (own + scenery): `br_row` 3 (home 1, kiln 2). `br_stall` 1. `br_shed` 2 (the shed and, past it, the stall). `br_inf` 6 (the infirmary 2, two scenery, and everything past). 3 are always on.

**The lay is two streets, not four spokes.** On a 1-block district the feed's corner pole splits a wire two ways and no more, so the four breakers stand in two rows. Along `x:5`: the infirmary's breaker, the infirmary, the shed's breaker, the shed, and round the far corner the stall's breaker and the stall. Up `z:9`: the row's breaker, then the home and the kiln on one pole. A breaker cuts what is past it (puzzle 1's rule), so `br_shed` takes the stall with it. The infirmary is never past a small house's breaker.

## The intended read from the default camera

The camera opens on `block:8:1` and its four streets. **The infirmary is half way along `x:5`**, 35 m from the feed's corner, carrying the target mark. The feed's pole is across `x:5` from the corner with `z:9`.

1. The view opens **browned out**: every lit window flickers, and the HUD reads 12 of 9. Nothing is broken. Three too many.
2. Read the two streets from the corner pole. Along `x:5`: `br_inf`, two spans, the infirmary; then `br_shed`, the shed, and round the far corner `br_stall` and the stall. Up `z:9`: `br_row`, one span, and a pole with two drops: a home, and the kiln, burning twice as bright.
3. The numbers by the breakers: `br_stall` −1 and `br_shed` −2, both red (still over); `br_row` −3, white; `br_inf` −6, white. Two moves fit, and one of them is the infirmary's own breaker.
4. Open `br_row`. The home and the kiln go dark, the flicker stops, 9 of 9, and the infirmary burns gold. **Win.**

## The trap

**Shedding the two small unmarked houses still leaves it over; the pair on one breaker, a home among them, has to go.** As the plan's row. The shed and the stall are the cheap things to lose, and both together are 2: 10 of 9, still flickering. The second wrong instinct is the biggest number: `br_inf` clears the flicker at 6 of 9, with the infirmary dark. Every state is undone by throwing a breaker back.

One detail differs from a four-spoke drawing: the two small houses are on one street, so `br_shed` alone darkens both (`br_stall` alone darkens the stall only). The sum is the same either way.

## The numbers (section V)

**The red numbers are the lesson.** At the start `br_stall` reads −1 red and `br_shed` −2 red: neither is enough. `br_row` reads −3 white. `br_inf` reads −6 white, and the numbers do not say it is the target's: that is the player's read. With `br_stall` open, `br_shed` reads −1 red; with both open, `br_row` still reads −3 white.

## The tribe's homes

`home` (priority) is lit at the start, browned out with everything else, and **dark at the win**, with the kiln beside it. No win keeps it: all 4 winning configurations have `br_row` open, since the home and the kiln share it, and with the row lit the most that can be shed without the infirmary is 2, leaving 10 of 9. The shed and the stall stay lit at the shortest win.

## Series rules

- Size 0 faults / 0 parts / 4 breakers, as the row. Own buildings: 5. Faults: 0.
- No fuse box, so no fuse blow.
- Kit: none (the plan's own empty kit for 1 to 3).
- **Heavy building: the kiln** (load 2). Puzzles 2 and 4 have none.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the infirmary).
- District `block:8:1`; puzzle 2 is on `block:6:1`, puzzle 4 on `block:3:0`. Three of its scenery buildings and the feed's pole are across `x:5` on `block:8:5`, which no neighbouring puzzle uses.

## Expected numbers

`npm run analyze puzzles/city/s03-not-enough-for-all.city.json`:

| | |
| --- | --- |
| States | 16, exhaustive |
| Solvable | yes |
| Fewest clicks | 1 (`br_row`) |
| Winning click orders | 1 |
| Winning configurations | 4 (`br_row` open, `br_inf` closed; `br_shed` and `br_stall` either way) |
| Parts used | none |
| Feed at the shortest win | 9 of 9 |
| Fuses that blow | none |
| Dead-end states | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing |

Loads, replayed on the conversion: start 12 of 9 (brownout); `br_row` 9 of 9 (win); `br_shed` 10 of 9 (brownout); `br_stall` 11 of 9 (brownout); `br_stall` then `br_shed` 10 of 9 (brownout); `br_inf` 6 of 9 (no brownout, infirmary dark).

**The obvious wrong first move:** `br_stall`, then `br_shed`. Read: the two small houses go dark, every other window still flickers, 10 of 9, and both numbers were red. Recovered by `br_row` with no Undo: the job wins at 7 of 9, with the two small houses left dark (the Relight ends play, so they are not closed again). The other, `br_inf`: read, the flicker stops and the target is dark; recovered by `br_inf` again, then `br_row`. The check block replays both.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_row"],
  "traps": [
    { "name": "shed the two small houses",
      "moves": ["br_stall", "br_shed"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["br_row"] },
    { "name": "shed the longest street",
      "moves": ["br_inf"],
      "expect": { "brownout": false, "lit": ["home", "kiln"], "complete": false },
      "recover": ["br_inf", "br_row"] }
  ]
}
```

## To watch when Josh plays it

- Five scenery buildings light with the job, three of them across `x:5`. Whether "12 of 9" can be read off the street, or only off the HUD and the numbers.
- Whether `br_shed` taking the stall with it reads as puzzle 1's rule, or as a surprise.
- The line along `x:5` is 64 m with five pieces on it; whether the icons stay apart at the opening frame.
- The fewest clicks is 1, as the plan's band allows; the thought is in which one.

## What it taught us
