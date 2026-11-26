# 02 · This way or that — design note (series v1, puzzle 2)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 2). It has no schematic and no `from`.

- **New concept:** the switch. It sends power down one of its two lines, so lighting one line darkens the other; and only a switch that current reaches changes anything on screen.
- **The reasoning move:** find which switch has current. Trace the target's wire back through both switches to the feed.
- **Builds on:** 1 (trace the gold building's wire back to the feed).
- It uses no breaker, fault, part, fuse box, relay, spring, battery or second feed, and the feed has room for every state of the map (the most it can draw is 3 of 4).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:1`**, at the corner where `x:1` meets `z:7`. The feed stands across `x:1`.
- Capacity **4**: its own 2, raised once by `npm run fit -- --raise` for the 2 scenery buildings its solution lights.
- Target: `pump_house`. Priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:lo:337.50` (crossing, block:6:0, across `x:1`) | 337.50, 69.25 |
| `sw_corner` | switch, on `l_home` | pole `pole:x:1:hi:337.50` (end, block:6:1, -z side) | 337.50, 85.75 |
| `home` | lamp, load 1 | building `block:6:1/b\|outer\|+x\|67,18`, by its drop from `pole:z:7:lo:92.50` | 340.00, 92.50 |
| `sw_pump` | switch, on `l_store` | pole `pole:x:1:hi:326.67` (slot, block:6:1, -z side) | 326.67, 85.75 |
| `store` | lamp, load 1 | building `block:6:1/b\|outer\|-z\|65,18`, by its drop from `sw_pump`'s pole | 327.50, 90.00 |
| `pump_house` | lamp, load 1, **target** | building `block:6:1/b\|outer\|-z\|63,18`, by its drop from `pole:x:1:hi:315.83` | 317.50, 90.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw_corner` | 1 span: crossing (over `x:1`) | 16.50 |
| `l_home` | `sw_corner` → `home` | 1 span: corner, + drop | 9.55 |
| `l_mid` | `sw_corner` → `sw_pump` | 1 span: along `x:1` | 10.83 |
| `l_store` | `sw_pump` → `store` | drop | — |
| `l_pump` | `sw_pump` → `pump_house` | 1 span: along `x:1`, + drop | 10.83 |

Scenery (section S): 2 buildings across `x:1` on `block:6:0`. `block:6:0/b|outer|+z|64,12` hangs on `l_mid` at `sw_pump`'s end (lit whenever `sw_corner` sends power along `x:1`); `block:6:0/b|outer|+z|62,12` hangs on `l_pump` (lit with the pump house).

## The intended read from the default camera

The camera opens on `block:6:1` and its four streets. **The pump house is on `x:1`, two poles along from the corner with `z:7`** (20 m from the corner pole), next door to the store, carrying the target mark. The feed's pole is across `x:1` from the corner.

1. The feed's wire crosses `x:1` to `sw_corner`, the corner pole. Pulses leave it round the corner into `z:7`, and the home there is lit. The other line, along `x:1`, is dark. The HUD reads 1 of 4.
2. Trace the pump house's wire back: its drop hangs from the second pole along `x:1`; one span back is `sw_pump`, set to the store's drop; one more span back is `sw_corner`, set to the home. Two switches are turned away, and only `sw_corner` has current.
3. Throw `sw_corner`. The home goes dark; pulses run along `x:1` to `sw_pump` and down the store's drop; the store lights. 2 of 4.
4. Throw `sw_pump`. The store goes dark and the pump house lights gold. 3 of 4. **Win.**

## The trap

**The switch beside the target moves and nothing changes, because no current reaches it yet.** As the plan's row. `sw_pump` stands 10 m from the pump house, on the store's own pole; `sw_corner` is 20 m away at the corner. Thrown first, `sw_pump` turns and every window on screen stays as it was. It is not wasted (a plain switch can be set dark, and it has to be thrown anyway); the lesson is why nothing happened.

## The numbers (section V)

**None is red**, because nothing binds. The lesson is a zero: at the start `sw_pump` reads **+0** and `sw_corner` reads +1. After `sw_corner`, `sw_pump` reads +1.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**: `sw_corner` can feed `z:7` or `x:1`, never both. This is the first puzzle where lighting the target takes light from a home.

## Series rules

- Size 0 faults / 0 parts / 2 switches, as the row. Own buildings: 3. Faults: 0.
- No fuse box, so no fuse blow.
- Kit: none (the plan's own empty kit for 1 to 3).
- Heavy building: none.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the pump house).
- District `block:6:1`; puzzle 1 is on `block:2:10`, puzzle 3 on `block:8:1`.

## Expected numbers

`npm run analyze puzzles/city/s02-this-way-or-that.city.json`:

| | |
| --- | --- |
| States | 4, exhaustive |
| Solvable | yes |
| Fewest clicks | 2 (`sw_corner`, `sw_pump`) |
| Winning click orders | 2 |
| Winning configurations | 1 |
| Parts used | none |
| Feed at the shortest win | 3 of 4 |
| Fuses that blow | none |
| Dead-end states | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing |

**The obvious wrong first move:** `sw_pump`. Read: the switch turns, the home stays lit, the pump house stays dark, the HUD stays at 1 of 4, and its number read +0. Recovered by `sw_corner` with no Undo (win). The check block replays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw_corner", "sw_pump"],
  "traps": [
    { "name": "the switch beside the pump house, first",
      "moves": ["sw_pump"],
      "expect": { "lit": ["home"], "brownout": false, "complete": false },
      "recover": ["sw_corner"] }
  ]
}
```

## To watch when Josh plays it

- Whether a dark switch that has turned reads as turned (its icon, and which of its two lines is picked out).
- The store and the pump house are neighbours 10 m apart; whether the gold mark keeps them apart.

## What it taught us
