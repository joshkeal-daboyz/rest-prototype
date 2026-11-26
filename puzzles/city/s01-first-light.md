# 01 · First light — design note (series v1, puzzle 1)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 1). It has no schematic and no `from`.

- **New concept:** the breaker. A wire that is whole and still dark stops at an open breaker; closing it lets the current on.
- **The reasoning move:** trace the gold building's wire back to the feed, and close the breaker that wire passes through.
- **Builds on:** nothing. It uses no switch, fault, part, fuse box, relay, spring, battery or second feed, and the feed has room for every building on the map at once.

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:2:10`**, at the corner where `x:14` meets `z:5`. The feed stands across `z:5`.
- Capacity **3**: its own two buildings (2), raised once by `npm run fit -- --raise` for the 1 scenery building its solution lights. Nothing binds: the most the map can draw, with both breakers closed, is 3 of 3.
- Target: `shrine`. Priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (reads outward, `FEED_CLEAR_M`, no crossing spans; it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:z:5:hi:507.50` (crossing, block:5:10, across `z:5`) | 185.75, 507.50 |
| `j0` | junction | pole `pole:z:5:lo:507.50` (end, block:2:10, +x side) | 169.25, 507.50 |
| `br_front` | breaker, open | pole `pole:x:14:lo:162.50` (end, block:2:10, +z side) | 162.50, 514.25 |
| `shrine` | lamp, load 1, **target** | building `block:2:10/b\|outer\|+z\|29,101`, by its drop from `br_front`'s pole | 162.50, 510.00 |
| `br_side` | breaker, open | pole `pole:z:5:lo:494.50` (slot, block:2:10, +x side) | 169.25, 494.50 |
| `home` | lamp, load 1 | building `block:2:10/a\|outer\|+x\|32,95`, by its drop from `pole:z:5:lo:482.50` | 165.00, 482.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing (over `z:5`) | 16.50 |
| `l_front` | `j0` → `br_front` | 1 span: corner | 9.55 |
| `l_shrine` | `br_front` → `shrine` | drop | — |
| `l_side` | `j0` → `br_side` | 1 span: along `z:5` | 13.00 |
| `l_home` | `br_side` → `home` | 1 span: along `z:5`, + drop | 12.00 |

Scenery (section S): 1 building, `block:5:10/b|outer|-x|38,97`, across `z:5` from `br_side`'s pole. It hangs on `l_side` at the breaker's end, so it is lit from the start.

## The intended read from the default camera

The camera opens on `block:2:10` and its four streets (E3). **The shrine is the corner building where `x:14` meets `z:5`**, 20 m wide along `x:14`, carrying the target mark while dark. The feed's pole is across `z:5` from that corner.

1. One wire crosses `z:5` from the feed to `j0`, the corner pole, and splits. Both halves are live and both stop one pole on, at a breaker icon: `br_front` round the corner on `x:14`, in front of the shrine, and `br_side` 13 m up `z:5`. Nothing is broken; one building across `z:5` is lit. The HUD reads 1 of 3.
2. Trace the shrine's wire back. Its drop hangs from the pole in front of it, and that pole holds `br_front`. From `br_front` one span goes to `j0`, and from `j0` to the feed. The wire past `br_side` goes on up `z:5` to a house.
3. Close `br_front`. Pulses run down the drop and the shrine's windows light gold. 2 of 3. **Win.**

## The trap

**Two breakers stand at the shrine's corner, one on each street; the one up the side street is on the home's wire, and closing it lights a home, harmlessly.**

**Changed from the plan's row** ("the breaker nearest the target is on another wire"), and why. On a 1-block district the feed's wire comes in at a corner pole and its lines leave along the block's two streets. A building's own breaker therefore stands between it and the corner, and the other street's breaker is always the farther of the two. The only way to bring a second line back beside the target is a roof hop, and on this city a roof structure stands within about 16 m of both poles it joins, so the hop lands on top of the target line's own pieces: the fit's draft for this puzzle (on `block:8:10`) set the wrong breaker on the shrine's roof with the right breaker, the shrine's drop pole and the corner all within 5 m of it. I judged that unreadable for a first puzzle, against Josh's P2a notes ("wires untraceable", "hard to read" first to fix). Here `br_front` is 4 m from the shrine's wall and `br_side` 17 m, so the right breaker is the nearer one. The move is unchanged: the wire decides. A player who clicks the nearest breaker wins without tracing, which makes this a weaker trap than the row's.

## The numbers (section V)

**None is red**, because nothing binds. At the start `br_front` reads +1 and `br_side` reads +1 (white): the numbers say both are safe, and do not say which is the shrine's. After `br_side`, `br_front` still reads +1.

## The tribe's homes

`home` (priority) starts dark. The win costs it nothing. A player who closes `br_side` first lights it, and still wins with it lit (3 of 3).

## Series rules

- Size 0 faults / 0 parts / 2 breakers, as the row. Own buildings: 2 (cap 8). Faults: 0 (cap 4).
- No fuse box, so no fuse blow.
- Kit: none (the plan's own empty kit for 1 to 3).
- Heavy building: none.
- **Shrine count: 1 of 5** (this puzzle).
- District `block:2:10`; puzzle 2 is on `block:6:1`.

## Expected numbers

`npm run analyze puzzles/city/s01-first-light.city.json` (on the conversion, scenery counted in the feed's load):

| | |
| --- | --- |
| States | 4, exhaustive |
| Solvable | yes |
| Fewest clicks | 1 (`br_front`) |
| Winning click orders | 1 |
| Winning configurations | 2 (`br_side` open or closed) |
| Parts used | none |
| Feed at the shortest win | 2 of 3 |
| Fuses that blow | none |
| Dead-end states | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing |

**The obvious wrong first move:** `br_side`. Read: a house up `z:5` lights and the shrine stays dark, 2 of 3. Recovered by `br_front` with no Undo (3 of 3, win). The check block replays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["br_front"],
  "traps": [
    { "name": "the breaker up the side street",
      "moves": ["br_side"],
      "expect": { "lit": ["home"], "brownout": false, "complete": false },
      "recover": ["br_front"] }
  ]
}
```

## To watch when Josh plays it

- Whether the shrine's drop, 4 m from `br_front`'s pole to its wall, reads as the shrine's wire.
- Whether the lit scenery building across `z:5` reads as part of the job.
- Whether the weaker trap is enough for a first puzzle, or the roof lay should be tried.

## What it taught us
