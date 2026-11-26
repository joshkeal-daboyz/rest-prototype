# 05 · Not that one — design note (series v1, puzzle 5)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 5). It has no schematic and no `from`.

- **New concept:** scarce parts. A dead junction costs two wires, and the two in hand are all there is; a wire spent on the wrong fault is gone.
- **The reasoning move:** spend only on the wire between the feed and the target. Trace the target's wire back, and mend what is on it and nothing else.
- **Builds on:** 1 (trace the wire back; the open breaker), 2 and 3 (not everything can be lit), 4 (a spark is a break a wire mends).
- It uses no switch, fuse box, relay, spring, battery or second feed, and the feed has room for every state (the most it can draw is 2 of 3).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:8:7`**, at the corner where `x:9` meets `z:9`. The feed stands across `x:9`.
- Capacity **3**: its own 3; `npm run fit -- --raise` adds nothing (no scenery building hangs on the job's poles).
- Target: `lift`. Priority: `home`. Parts: **2 wires**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:9:hi:482.50` (crossing, block:8:8, across `x:9`) | 482.50, 335.75 |
| `j0` | junction | pole `pole:x:9:lo:482.50` (end, block:8:7, +z side) | 482.50, 319.25 |
| `j_dead` | junction, **dead** | pole `pole:x:9:lo:469.50` (slot) | 469.50, 319.25 |
| `br_lift` | breaker, open | pole `pole:x:9:lo:460.50` (slot) | 460.50, 319.25 |
| `lift` | lamp, load 1, **target** | building `block:8:7/a\|outer\|+z\|90,62`, by its drop from `br_lift`'s pole | 462.50, 315.00 |
| `j_n` | junction | pole `pole:z:9:lo:312.50` (end, block:8:7, +x side) | 489.25, 312.50 |
| `home` | lamp, load 1 | building `block:8:7/b\|outer\|+x\|96,61`, by its drop from `j_n`'s pole | 485.00, 312.50 |
| `neighbour` | lamp, load 1 | building `block:8:7/b\|outer\|+x\|96,58`, by its drop from `pole:z:9:lo:292.50` | 485.00, 292.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `x:9`) | 16.50 |
| `l_j` | `j0` → `j_dead` | 1 span: along `x:9` | 13.00 |
| `l_br` | `j_dead` → `br_lift` | 1 span: along `x:9` | 9.00 |
| `l_lift` | `br_lift` → `lift` | drop | — |
| `l_n0` | `j0` → `j_n` | 1 span: corner (into `z:9`) | 9.55 |
| `l_home` | `j_n` → `home` | drop | — |
| `l_n` | `j_n` → `neighbour` | 2 spans: along `z:9`, + drop | 20.00 |

Faults (2): `f_j`, a dead junction at `j_dead` (2 wires); `f_n`, a damaged cable on `l_n`, on its first span (`pole:z:9:lo:312.50` to `pole:z:9:lo:302.50`) (1 wire). Both are live from the start, so both are readable from the start.

Scenery (section S): none.

## The intended read from the default camera

The camera opens on `block:8:7` and its four streets. **The lift is on `x:9`, two poles along from the corner with `z:9`** (22 m of wire from the corner pole), carrying the target mark. The feed's pole is across `x:9` from that corner.

1. The feed's wire crosses `x:9` to `j0`, the corner pole, and splits. Round the corner into `z:9`: a lit home at the first pole, then a **spark** on the next span, and a dark house past it. Along `x:9`: one live span to a junction that **fizzes across two gaps**, a dead span, an open breaker, and the lift's drop from the breaker's pole. The HUD reads 1 of 3; two wires are in hand.
2. Trace the lift's wire back: drop, `br_lift` (open), one span, `j_dead` (dead, two gaps), one span, `j0`, the feed. The spark is not on it: it is on the wire to the house up `z:9`.
3. Two gaps, two wires. Click `j_dead`: both wires are spent and the span to `br_lift` goes live.
4. Close `br_lift`. The lift lights gold. 2 of 3, the home still lit. **Win.** The spark is still sparking, and the house past it stays dark.

## The trap

**The spark is the loud fault and one wire mends it, but it is on a neighbour's line; mend it and the junction reads *needs 2, have 1*.** The house past the spark lights, which looks like progress, and the job can no longer be won: this is the series' first dead end. It is readable (the lift is still dark, the part count reads 1, the junction still shows two gaps and its prompt says what it needs) and one Undo takes it back.

**Changed from the plan's row** ("the spark beside the target"), and why. The spark is 28 m from the lift, round the corner on `z:9`, and the fault beside the lift is the dead junction (8 m). On a 1-block district the feed's wire comes in at a corner pole and its two lines leave along the block's two streets and do not come back together, so a neighbour's street span cannot lie beside a target on the other line. The only way round is a roof hop, and a roof structure here stands within about 16 m of both poles it joins, so the hop lands among the target line's own poles; I found no lay of it on `block:8:7` and judged the idea unreadable against Josh's P2a notes ("wires untraceable"). What draws the wrong click here is that the spark is the loudest thing on screen (FX2), the cheapest, and the only fault whose number promises light (below).

## The numbers (section V)

**None is red**, and that is the point of 5: the numbers are about load, and this mistake is not a load. At the start the spark reads **+1**, `j_dead` reads **+0** (the lift is behind an open breaker) and `br_lift` reads +0. The numbers lean toward the wrong fault; the read that corrects them is the trace. With `br_lift` closed first, `j_dead` reads +1. After the spark is mended, `j_dead` and `br_lift` both still read +0.

## The tribe's homes

`home` (priority) is lit at the start and stays lit at the win: the win costs it nothing. The neighbour's house is dark at the start and dark at the win. Lighting it is the kind move, and it costs the lift.

## Series rules

- Size 2 faults / 2 wire / 1 breaker, as the row. Own buildings: 3. Faults: 2.
- No fuse box, so no fuse blow.
- **Kit: 2 wires.** Puzzle 4's kit is 1 wire: no repeat.
- Heavy building: none.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the lift).
- District `block:8:7`; puzzle 4 is on `block:3:0`. Puzzle 6 must not use `block:8:7`.
- Districts used so far, none to be a district again: `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`.

## Expected numbers

`npm run analyze puzzles/city/s05-not-that-one.city.json`:

| | |
| --- | --- |
| States | 6, exhaustive |
| Solvable | yes |
| Fewest clicks | 2 (`repair:j_dead`, `br_lift`) |
| Winning click orders | 2 (either first) |
| Winning configurations | **1** |
| Parts used | wire, wire (2 of 2) |
| Feed at the shortest win | 2 of 3 |
| Fuses that blow | none |
| Dead-end states | 2 of 6 (33.3%): the spark mended, with `br_lift` open or closed |
| First moves that lead only to dead ends | **1**: `repair:l_n` |
| Hidden at the start | nothing: both faults are live and readable |

**The obvious wrong first move:** `repair:l_n`, the spark. Read: the neighbour's house lights (2 of 3), the lift stays dark, one wire is left, and `j_dead` still fizzes across two gaps. Recovered by **one Undo** (the wire comes back), then `repair:j_dead`, `br_lift`. The check block replays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["repair:j_dead", "br_lift"],
  "traps": [
    { "name": "mend the spark first",
      "moves": ["repair:l_n"],
      "expect": { "lit": ["home", "neighbour"], "readable": ["f_j"], "complete": false },
      "recover": ["undo", "repair:j_dead", "br_lift"] }
  ]
}
```

## To watch when Josh plays it

- Whether the dead junction's two gaps and its prompt say "two wires" before the first click, not only after the wrong one.
- Whether a dead end after one click, with Undo on screen, reads as fair at puzzle 5.
- Whether the spark pulls the first click from 28 m away, or the trap needs the spark nearer the lift.

## What it taught us

- Josh, 26 Nov 2026, after playing it: "Puzzle 5 is good."
