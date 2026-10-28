# 04 · The tired feed — design note

Rung 04, the second capacity map after 03. The feed carries 3, and the section already asks for 4: the map opens browned out, every lamp flickering. The priests want the shrine (2) lit on top of that.

**Element under test:** capacity, and choosing what stays dark. Nothing is broken; the only tools are four breakers. It's the GDD review's *capacity, small*: four branches, power for some of them.

## The map

12 nodes, 11 lines, no faults, no parts. Feed capacity 3. Four branches leave the hub `j0`, each behind a breaker:

| Branch | Breaker (start) | Lamps | Load |
| --- | --- | --- | --- |
| A | `br_A` (open) | `shrine` (target) | 2 |
| B | `br_B` (closed) | `home` (priority) + `well`, on one post `jB` | 2 |
| C | `br_C` (closed) | `market` | 1 |
| D | `br_D` (closed) | `lantern` | 1 |

## The intended read

1. The map opens in **brownout**: B + C + D = 4 of 3. Everything flickers; nothing counts as lit. Brownout appears before the player has touched anything, so they see what it looks like before causing one.
2. The shrine is 2. With it, only 1 more fits. B carries two lamps (2), so B can't stay; only C or D can.
3. Open `br_B` (load 2 of 3, the flicker clears), close `br_A` (4 of 3: brownout again), open `br_C` or `br_D` (3 of 3). **Win.** Either single lamp may stay; the home is dark either way.

## The trap

The obvious way to make room is to shed the small, unimportant lamps: the market and the lantern, 1 each, nothing the tribe marked. Open both, close the shrine: load 2 + 2 = **4 of 3, still brownout.** The home and well share one breaker, and that pair is the branch that has to go, even though the home is the tribe's priority. It's readable (the load counter says 4 of 3; the B branch's two lamps are drawn on one post) and free to undo (breakers only). The right read is to count before throwing: shrine 2 + anything ≤ 1, and B is 2.

## What this map tests

- Whether brownout reads as *too much*, not *broken* (GDD review, finding 1, *capacity, small*; brief question 2).
- Whether the player counts loads before shedding, or sheds by "what matters least" and has to recount.
- Whether darkening a priority lamp lands as restraint (the priests win; the tribe's home pays), as in the shrine circuit.

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 12, lines 11, faults 0. Parts needed: none.
- Fewest actions to win: **3** (open `br_B`, close `br_A`, open `br_C` or `br_D`).
- Winning configurations: **3 of 16** (A closed, B open, at most one of C and D).
- Load at start: 4 of 3 (brownout). Final load: 3 of 3, **no headroom**.
- Dead ends: none. Reachable states: 16.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
