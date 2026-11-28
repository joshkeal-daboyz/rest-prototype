# 03 · Not enough for all — design note (series v1, puzzle 3)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 3). It has no schematic and no `from`. **Re-laid 26 Nov 2026 (section NR)** so that each breaker stands on a single run; see "The re-lay" below.

- **New concept:** capacity and brownout. The feed carries so much and no more; over it, every window flickers and nothing counts as lit. Something has to go dark.
- **The reasoning move:** choose which group goes dark. The numbers by the breakers do the sum; the target decides between the ones that fit.
- **Builds on:** 1 (a breaker cuts everything past it; trace a building's wire to its breaker) and 2 (lighting one thing can cost another).
- It uses no switch, fault, part, fuse box, relay, spring, battery or second feed.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:8:1`** (kept), now at its north-east corner, where `x:1` meets `z:9`. The feed stands across `x:1`.
- Capacity **6**: its own 4 (the infirmary 2, the shed 1, the stall 1), raised once by `npm run fit -- --raise` for the 2 scenery buildings its solution lights.
- Target: `infirmary`. Priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:lo:482.50` (crossing, block:8:0, across `x:1`) | 482.50, 69.25 |
| `j0` | junction | pole `pole:x:1:hi:482.50` (end, block:8:1, -z side) | 482.50, 85.75 |
| `br_inf` | breaker, closed | pole `pole:x:1:hi:460.50` (slot) | 460.50, 85.75 |
| `j_inf` | junction | pole `pole:x:1:hi:449.50` (slot) | 449.50, 85.75 |
| `infirmary` | lamp, load 2, **target** | building `block:8:1/a\|outer\|-z\|88,18`, by its drop from `j_inf`'s pole | 447.50, 90.00 |
| `br_row` | breaker, closed | pole `pole:x:1:hi:438.50` (slot) | 438.50, 85.75 |
| `j_row` | junction | pole `pole:x:1:hi:427.50` (end) | 427.50, 85.75 |
| `home` | lamp, load 1 | building `block:8:1/a\|outer\|-z\|85,18`, by its drop from `j_row`'s pole | 427.50, 90.00 |
| `kiln` | lamp, load 2 | building `block:8:1/a\|outer\|-x\|85,19`, by its drop from `pole:z:8:hi:92.50`, round the corner | 425.00, 97.50 |
| `br_shed` | breaker, closed | pole `pole:z:9:lo:92.50` (end, block:8:1, +x side) | 489.25, 92.50 |
| `j_shed` | junction | pole `pole:z:9:lo:105.00` (slot) | 489.25, 105.00 |
| `shed` | lamp, load 1 | building `block:8:1/a\|outer\|+x\|96,20`, by its drop from `j_shed`'s pole | 485.00, 102.50 |
| `br_stall` | breaker, closed | pole `pole:z:9:lo:130.00` (slot) | 489.25, 130.00 |
| `stall` | lamp, load 1 | building `block:8:1/b\|outer\|+x\|96,25`, by its drop from `pole:z:9:lo:142.50` | 485.00, 142.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `x:1`) | 16.50 |
| `l_inf0` | `j0` → `br_inf` | 2 spans: along `x:1` | 22.00 |
| `l_inf1` | `br_inf` → `j_inf` | 1 span: along `x:1` | 11.00 |
| `l_inf` | `j_inf` → `infirmary` | drop | — |
| `l_row0` | `j_inf` → `br_row` | 1 span: along `x:1` | 11.00 |
| `l_row1` | `br_row` → `j_row` | 1 span: along `x:1` | 11.00 |
| `l_home` | `j_row` → `home` | drop | — |
| `l_kiln` | `j_row` → `kiln` | 1 span: corner (into `z:8`), + drop | 9.55 |
| `l_shed0` | `j0` → `br_shed` | 1 span: corner (into `z:9`) | 9.55 |
| `l_shed1` | `br_shed` → `j_shed` | 1 span: along `z:9` | 12.50 |
| `l_shed` | `j_shed` → `shed` | drop | — |
| `l_stall0` | `j_shed` → `br_stall` | 2 spans: along `z:9` | 25.00 |
| `l_stall` | `br_stall` → `stall` | 1 span: along `z:9`, + drop | 12.50 |

**What each breaker's pole carries** (every span and drop the city has at that pole, a line's or not):

| Control | Pole | Every wire that meets there |
| --- | --- | --- |
| `br_inf` | `pole:x:1:hi:460.50`, a slot pole in mid street | 2 wires. The span from `pole:x:1:hi:471.50` (`l_inf0`, in) and the span to `pole:x:1:hi:449.50` (`l_inf1`, out). No drop, no crossing or corner span, no other node. |
| `br_row` | `pole:x:1:hi:438.50`, a slot pole in mid street | 2 wires. The span from `pole:x:1:hi:449.50` (`l_row0`, in) and the span to `pole:x:1:hi:427.50` (`l_row1`, out). No drop, no crossing or corner span, no other node. |
| `br_shed` | `pole:z:9:lo:92.50`, the first pole of `z:9` | 2 wires. The corner span from `j0`'s pole (`l_shed0`, in) and the span to `pole:z:9:lo:105.00` (`l_shed1`, out). The pole has no third span (this end of `z:9` has no crossing) and no drop; no other node. |
| `br_stall` | `pole:z:9:lo:130.00`, a slot pole in mid street | 2 wires. The span from `pole:z:9:lo:117.50` (`l_stall0`, in) and the span to `pole:z:9:lo:142.50` (`l_stall`, out). No drop, no crossing or corner span, no other node. |

The splits are plain junctions: `j0`, the bare corner pole where the feed's wire lands (its three spans are the feed's crossing, the first span of `x:1` and the corner span into `z:9`), and the poles the infirmary, the home and the shed hang from, each with its building's drop and the wire going on.

Scenery (section S), 2 buildings, each 1:

| Building | Hangs on | Live when |
| --- | --- | --- |
| `block:8:1/a\|outer\|-z\|92,18` | `l_inf0`'s carrier pole `pole:x:1:hi:471.50`, before `br_inf` | always |
| `block:8:0/b\|outer\|+z\|89,12` (across `x:1`) | `j_inf`, the infirmary's pole | `br_inf` closed |

**What each breaker sheds** (own + scenery): `br_stall` 1. `br_shed` 2 (the shed and, past it, the stall). `br_row` 3 (the home 1, the kiln 2). `br_inf` 6 (the infirmary 2, one scenery, and the row past it). 1 is always on.

## The re-lay (section NR, 26 Nov 2026)

**What moved, and why.** The first lay was at the block's south-east corner, along `x:5` and up `z:9`. Three of its four breakers stood on poles with something else on them: `br_inf` with two scenery drops, `br_shed` with one, `br_stall` on the stall's own pole with a crossing span that no line owned. Only `br_row` was on a bare pole. Josh: "Puzzle 3 has the same problem."

`x:5` has no bare pole at all, so the puzzle turned to the same block's north-east corner, where `x:1` has two bare mid-street poles and `z:9` has three. Every breaker is now on a pole with one span in and one span out and nothing else. The streets swapped roles:

- **West along `x:1`:** a lit house, `br_inf`, the infirmary, `br_row`, the home, and round the far corner the kiln.
- **South down `z:9`:** `br_shed`, the shed, two bare poles with `br_stall` on the second, the stall.

The sums are the first lay's: three over at the start, and the breakers shed 1, 2, 3 and 6. Scenery fell from 5 buildings to 2, so the HUD reads 9 of 6 where it read 12 of 9.

**What changed in the read.** The row (the home and the kiln) is now past the infirmary on the infirmary's street, where before it was on a street of its own. So `br_inf` still clears the flicker with the target dark, and now takes the row with it too; and the two small houses have a street to themselves, which makes "shed the small ones" the first thing the eye offers.

## The intended read from the default camera

The camera opens on `block:8:1` and its four streets. **The infirmary is half way along `x:1`, the block's north street**, 33 m of wire from the feed's corner, carrying the target mark. The feed's pole is across `x:1` from the corner with `z:9`.

1. The view opens **browned out**: every lit window flickers, and the HUD reads 9 of 6. Nothing is broken. Three too many.
2. Read the two streets from the corner pole. West along `x:1`: a house, `br_inf`, the infirmary; then `br_row`, a home, and round the far corner the kiln, burning twice as bright. South down `z:9`: `br_shed`, the shed; then `br_stall` and the stall.
3. The numbers by the breakers: `br_stall` −1 and `br_shed` −2, both red (still over); `br_row` −3, white; `br_inf` −6, white. Two moves fit, and one of them is the infirmary's own breaker.
4. Open `br_row`. The home and the kiln go dark, the flicker stops, 6 of 6, and the infirmary burns gold. **Win.**

## Guide (ticket 084 D1)

The file's `guide` walks a first-time player through this puzzle's one idea: the brownout and shedding. It runs until the stage has been won once (084 D2 shows it; until D2 merges the field is checked on load and nothing draws it). Each step points at one thing, says one thing, and waits. No step throws anything for the player, and the last waits for the job to complete, so the player does the job.

Buildings are named by number, as the goal list names them (084 A1): `infirmary` is Building 1 (the target), `home` is Building 2 (priority), `kiln` is Building 3, `shed` is Building 4, `stall` is Building 5. The rest of this note keeps the lamp ids.

| # | Points at | Text | Waits for | Why it is there |
| --- | --- | --- | --- | --- |
| 1 | `feed` | "The feed reads 9 of 6: more load than it can carry. That is a brownout. Every light flickers and none counts as lit." (116) | Next | The view opens flickering, so the guide starts at the feed's label, read as puzzle 1 taught it, and names what the flicker is. |
| 2 | `infirmary` | "The priests want Building 1 lit. It has power, but it will not count until the load is 6 or less." (97) | Next | The goal, and why it is not already won: the target has power from the start, which is the confusing part of a brownout. |
| 3 | `br_stall` | "A closed breaker can be opened to shed what is past it. This one reads −1: opening it takes 1 off. Click it." (108) | the player throws `br_stall` | The try, on the smallest breaker: shedding is opening a closed breaker, and the "−n" is what comes off. It is the first half of the trap on purpose (8 of 6, still flickering), so the player sees a shed that is not enough before choosing one that is. Any breaker can be clicked back, and the win is still one click away. |
| 4 | `feed` | "Building 5 went dark, and 1 was too little. A red number means that breaker alone is not enough. White means it is." (115) | Next | Says what they just saw at the feed's label, and gives the one reading rule for the numbers (red: still over; white: it fits). Its only number is the 1 they just shed, so it does not go stale if they have opened something else as well. |
| 5 | `infirmary` | "Your turn. Open the breaker that makes the load fit and leaves Building 1 lit. Clicking a breaker again closes it." (114) | the job completes | The player finishes. Two numbers are white, `br_row` and `br_inf`, and the step's "leaves Building 1 lit" is the read that decides between them; it does not point at either. The last sentence is the way back from `br_inf`. |

The texts quote what is on screen at that step (the feed's label and the number by the control). If the layout, a load or the capacity changes, the guide's numbers change with it.

## The trap

**Shedding the two small unmarked houses still leaves it over; the pair on one breaker, a home among them, has to go.** As the plan's row. The shed and the stall are the cheap things to lose, they have a street to themselves, and both together are 2: 7 of 6, still flickering. The second wrong instinct is the biggest number: `br_inf` clears the flicker at 3 of 6, with the infirmary dark. Every state is undone by throwing a breaker back.

As in the first lay, the two small houses are on one street, so `br_shed` alone darkens both (`br_stall` alone darkens the stall only). The sum is the same either way.

**What the re-lay changed in the trap:** nothing in the sums. The row is now behind `br_inf` as well as `br_row`, so `br_inf` reads −6 for a different six (the infirmary, a house and the row; before, the infirmary, three houses and the two small ones).

## The numbers (section V)

**The red numbers are the lesson.** At the start `br_stall` reads −1 red and `br_shed` −2 red: neither is enough. `br_row` reads −3 white. `br_inf` reads −6 white, and the numbers do not say it is the target's: that is the player's read. With `br_stall` open, `br_shed` reads −1 red; with both open, `br_row` still reads −3 white.

## The tribe's homes

`home` (priority) is lit at the start, browned out with everything else, and **dark at the win**, with the kiln beside it. No win keeps it: all 4 winning configurations have `br_row` open, since the home and the kiln share it, and with the row lit the most that can be shed without the infirmary is 2, leaving 7 of 6. The shed and the stall stay lit at the shortest win.

## Series rules

- Size 0 faults / 0 parts / 4 breakers, as the row. Own buildings: 5. Faults: 0.
- No fuse box, so no fuse blow.
- Kit: none (the plan's own empty kit for 1 to 3).
- **Heavy building: the kiln** (load 2). Puzzles 2 and 4 have none.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the infirmary).
- District `block:8:1`; puzzle 2 is on `block:6:1`, puzzle 4 on `block:3:0`. The feed's pole and one scenery building are across `x:1` on `block:8:0`, which no series puzzle 1 to 10 is on.
- **No breaker or switch on a branch pole:** held; the table above lists every wire at each breaker's pole.

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
| Feed at the shortest win | 6 of 6 |
| Fuses that blow | none |
| Dead-end states | 0 of 16 (0.0%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing |

Loads, replayed on the conversion: start 9 of 6 (brownout); `br_row` 6 of 6 (win); `br_shed` 7 of 6 (brownout); `br_stall` 8 of 6 (brownout); `br_stall` then `br_shed` 7 of 6 (brownout); `br_inf` 3 of 6 (no brownout, infirmary dark).

**The obvious wrong first move:** `br_stall`, then `br_shed`. Read: the two small houses go dark, every other window still flickers, 7 of 6, and both numbers were red. Recovered by `br_row` with no Undo: the job wins at 4 of 6, with the two small houses left dark (the Relight ends play, so they are not closed again). The other, `br_inf`: read, the flicker stops and the target is dark; recovered by `br_inf` again, then `br_row`. The check block replays both.

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
      "expect": { "brownout": false, "lit": ["shed", "stall"], "complete": false },
      "recover": ["br_inf", "br_row"] }
  ]
}
```

## To watch when Josh plays it

- Whether each breaker now reads as standing on one wire, and what it cuts reads as "everything past it on this street".
- `br_inf` now takes the row with it. Whether that reads as puzzle 1's rule, or as a surprise.
- Two scenery buildings light with the job where five did. Whether "9 of 6" can be read off the street, or only off the HUD and the numbers.
- The kiln is round the corner from the home, one span on. Whether the two read as one pair on `br_row`.
- The fewest clicks is 1, as the plan's band allows; the thought is in which one.

## What it taught us

- Josh, 26 Nov 2026, on the first lay (at the block's south-east corner): "Puzzle 3 has the same problem."
- Josh, 26 Nov 2026, asked how to fix it, on a card: "Both (Recommended)" (the card's option: "Re-lay 1-3 so each breaker/switch sits on a single run, AND add a cue in the game: hovering or throwing one highlights exactly the wires it controls. The cue also helps every later puzzle.").
- What the re-lay changed (section NR): all four breakers moved to bare poles with one wire in and one wire out, at the block's north-east corner; the row is now past the infirmary on its street and the two small houses have the other street. The sums are unchanged. Not yet replayed.
