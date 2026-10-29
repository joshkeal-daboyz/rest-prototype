# 06 · The spark — design note

Rung 06. Enoch has one wire. The lane to the shrine is broken somewhere, but the section is dark and nothing can be read until power is on it.

**Element under test:** a single visible fault and a repair with a part. A damaged cable sparks only while it's live; the player brings power to it, reads it, and spends the wire. The first part spent in the ladder.

## The map

5 nodes, 4 lines, 1 fault, 1 wire. Feed capacity 3. `feed` → `br_main` (open) → `sw_1`. `sw_1` position 0 → `home` (1); position 1 → `l_lane` → `shrine` (1, target). `l_lane` has a **damaged cable** (`f1`, wire × 1).

## The intended read

1. The map opens dark: `br_main` is open, so pulses stop at it. No fault can be seen yet.
2. Close `br_main`. Pulses reach `sw_1` and light the home. Still no fault in sight: the switch points away from the lane.
3. Throw `sw_1`. The home goes dark; pulses run down the lane and stop at a **spark**. Damaged cable: wire.
4. Click the spark: the wire is spent and the shrine lights. **Win.** Load 1 of 3.

## The trap

The player holds a wire and can see where the shrine is, so the first instinct is to click the dark lane and "fix" it. That does nothing: *unreadable*. A fault on a dead line can't be seen or repaired. The map teaches **faults are read by current**: bring power to the spark first. It costs nothing (no part is spent on an unreadable click) and the prompt says why.

## What this map tests

- Whether "current runs up to a spark and stops" reads as *broken line, needs wire* without text (brief: signatures).
- Whether *unreadable* lands as a rule ("I have to power it to see it") rather than a refusal, setting up "faults hide faults" later.
- Whether the player connects the part on the side panel to the fault on the map.

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 5, lines 4, faults 1. Parts given: 1 wire. Parts needed: **1 wire**.
- Faults readable at start: **0 of 1** (`f1` appears when `br_main` is closed and `sw_1` is thrown).
- Fewest actions to win: **3** (close `br_main`, throw `sw_1`, repair `l_lane`).
- Winning configurations: **1 of 8** (2 breaker settings × 2 switch settings × fault repaired or not).
- Final load: 1 of 3. Capacity never binds.
- Dead ends: none (the wire can only be spent on `f1`). Reachable states: 5.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
