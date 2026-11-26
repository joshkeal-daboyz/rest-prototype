# 04 · The spark — design note (series v1, puzzle 4)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 4). It has no schematic and no `from`.

- **New concept:** a damaged cable, and that faults are read by current. A break sparks only while its line is live; a dark line shows nothing, broken or not. A wire mends it.
- **The reasoning move:** bring power to the dark line first, then mend what shows.
- **Builds on:** 1 (trace the target's wire back), 2 (the switch: one line lit means the other dark), 3 (the load numbers).
- It uses no breaker, fuse box, relay, spring, battery or second feed; one fault, one part, and the feed has room for every state (the most it can draw is 2 of 3).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:3:0`**, at the corner where `z:5` meets `x:0`. The feed stands across `z:5`.
- Capacity **3**: its own 2, raised once by `npm run fit -- --raise` for the 1 scenery building its solution lights.
- Target: `granary`. Priority: `home`. Parts: **1 wire**.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:5:hi:27.50` (crossing, block:5:0, across `z:5`) | 185.75, 27.50 |
| `sw_1` | switch, on `l_home` | pole `pole:z:5:lo:27.50` (end, block:3:0, +x side) | 169.25, 27.50 |
| `home` | lamp, load 1 | building `block:3:0/a\|outer\|+x\|32,6`, by its drop from `pole:z:5:lo:38.33` | 165.00, 37.50 |
| `granary` | lamp, load 1, **target** | building `block:3:0/a\|outer\|-z\|26,5`, by its drop from `pole:x:0:hi:139.17` | 137.50, 25.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw_1` | 1 span: crossing (over `z:5`) | 16.50 |
| `l_home` | `sw_1` → `home` | 1 span: along `z:5`, + drop | 10.83 |
| `l_gran` | `sw_1` → `granary` | 3 spans: corner (into `x:0`), along, along, + drop | 32.88 |

Fault: `f_cut`, a damaged cable on `l_gran`, on its **second** span (`pole:x:0:hi:162.50` to `pole:x:0:hi:150.83`), 10 to 21 m along the line.

Scenery (section S): 1 building, `block:3:0/a|outer|-z|30,5`, on `l_gran`'s first carrier pole, before the cut. It lights when the switch sends power down `x:0`, so the player sees current arrive, light a house, and stop at the spark one span on.

## The intended read from the default camera

The camera opens on `block:3:0` and its four streets. **The granary is on `x:0`, three poles round the corner from `z:5`** (33 m of wire from the corner pole), carrying the target mark. The feed's pole is across `z:5` from that corner.

1. The feed's wire crosses `z:5` to `sw_1`, the corner pole. Pulses run from it down `z:5` to the home, which is lit. The line round the corner along `x:0` to the granary is dark from end to end. The HUD reads 1 of 3; one wire is in hand.
2. Nothing on screen is marked broken. The granary's line is not live, and that is all that can be said of it.
3. Throw `sw_1`. The home goes dark. Pulses run round the corner into `x:0`; the first house lights; one span on, the pulses stop at a spark. The granary is still dark. 1 of 3. The break's number reads +1.
4. Click the spark. The wire is spent, the pulses run on, and the granary lights gold. 2 of 3. **Win.**

## The trap

**Clicking the dark line with the wire in hand does nothing: nothing to read there yet.** As the plan's row. At the start the granary is dark and a wire is in hand, so the line looks like the place to spend it. There is no break icon on it and no repair is taken (the simulator refuses a repair on a fault no current reaches, and the state does not change). Nothing is lost: the wire is still in hand after any number of tries.

## The numbers (section V)

**None is red**, because nothing binds. At the start `sw_1` reads +1: it counts the unread break as sound, so it promises the granary (the plan: "a number can read high, never low"). After the throw the HUD has not gone up, the switch reads +0, and the break has a number of its own, +1: the load was promised, and the break is what holds it back.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**: the switch feeds `z:5` or `x:0`. A scenery house on `x:0` is lit in its place.

## Series rules

- Size 1 fault / wire / 1 switch, as the row. Own buildings: 2. Faults: 1.
- No fuse box, so no fuse blow.
- **Kit: 1 wire.** Puzzle 3's kit is empty and puzzle 5's is 2 wires: no repeat.
- Heavy building: none (puzzle 3's was the kiln).
- **Shrine count: 1 of 5** (puzzle 1; the target here is the granary).
- District `block:3:0`; puzzle 3 is on `block:8:1`, puzzle 5 on `block:8:7`.

## Expected numbers

`npm run analyze puzzles/city/s04-the-spark.city.json`:

| | |
| --- | --- |
| States | 3, exhaustive |
| Solvable | yes |
| Fewest clicks | 2 (`sw_1`, `repair:l_gran`) |
| Winning click orders | 1 |
| Winning configurations | 1 |
| Parts used | wire (1 of 1) |
| Feed at the shortest win | 2 of 3 |
| Fuses that blow | none |
| Dead-end states | 0 of 3 (0.0%) |
| First moves that lead only to dead ends | none |
| First moves the simulator takes | `sw_1` only |
| Hidden at the start | the break itself, on a line that is plainly dark; one free throw shows it, and nothing can be spent before it shows |

**The obvious wrong first move:** clicking the dark line to mend it. Read: nothing happens and the wire count does not move. Verified by replaying `repair:l_gran` from the start through the conversion: it is refused ("the fault at l_gran is not readable (no current reaches it)") and the state is the start's. Recovered by doing nothing. A check block cannot hold a refused move, so its trap is the half-solution instead: the switch alone darkens the home and shows the spark, and the mend wins from there.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw_1", "repair:l_gran"],
  "traps": [
    { "name": "the switch alone",
      "moves": ["sw_1"],
      "expect": { "readable": ["f_cut"], "lit": [], "complete": false },
      "recover": ["repair:l_gran"] }
  ]
}
```

## To watch when Josh plays it

- This puzzle has one order and no choice: it is the lesson for 5, where a spark is the wrong place for the wire. Whether it is worth a stage of its own.
- Whether the dark line says "not live" or "broken" to him before the throw.
- N1's band says "nothing hidden at the start". The break here is unread until the throw, which is the row's own concept ("faults are read by current"); no decision rests on it.

## What it taught us
