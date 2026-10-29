# 37 · Spend the fuse first — design note

Two routes to the chapel. The south route shows one spark; the north route shows nothing until its breaker is closed, and then shows a blown fuse. Enoch brought one fuse and one wire. What lies behind each first fault is hidden.

**Element under test:** the brief's element 3, **behind the first** (faults hide faults), made into a spending decision: with a chain of hidden faults on each route and exactly enough parts for one route, the order you spend in decides whether you can still see enough to choose.

## The map

13 nodes, 13 lines, 4 faults. Feed capacity 3. Enoch brings 1 fuse, 1 wire.

| Route | Chain |
| --- | --- |
| North | `br_N` (**open**) → `fb_N` ≤2 (**blown**, `fuse_n`) → `j_n` → `l_n3` (**damaged**, `cut_n`) → chapel post `j_mid`. At `j_n`, `br_h` → `house` (1, priority). |
| South | `sw_S` (position 1, start) → `j_s1` → `l_s2` (**damaged**, `cut_s`) → `j_s` (**dead junction**, `dead_s`) → `j_mid`. Position 0 → `bell` (1, target). |

`j_mid` → `chapel` (2, target). Targets: chapel 2 + bell 1 = 3, the feed's capacity.

## The intended read

1. The map opens dark. `sw_S` points down the south route and `cut_s` sparks. The bell is dark (`sw_S` is set away from it). The north breaker is open.
2. Close `br_N`: current runs into `fb_N` and none comes out. A **blown fuse**.
3. Think about the parts. The wire could go on either route; the fuse only fits the north. Spending the fuse costs nothing the south could use, and it shows what's behind it. Repair `fb_N`: the house lights (`fb_N` 1 of 2) and `cut_n` sparks.
4. Count before repairing: the chapel is 2, and `fb_N` already carries the house. 1 + 2 = 3 > 2. Open `br_h` (the house goes dark).
5. Repair `cut_n` with the wire. The chapel lights through `fb_N`, 2 of 2.
6. Throw `sw_S` to the bell. Load 3 of 3. **Win.**

## The trap

Two layers.

**The visible spark.** `cut_s` is the only fault on the opening map, and the player holds a wire. Repairing it reveals `dead_s` behind it: a dead junction, *needs wire × 2, have 0*. The north route still needs a wire for `cut_n`, which is now gone. Dead end. Readable after: the fizzing dead junction and the parts tray. Recoverable only by Undo.

**The overload.** On the north route, repairing `cut_n` with the house still on puts 3 through `fb_N` (≤2): it blows again (culprit `chapel`) and the only fuse is already spent. Dead end. Readable before: `fb_N`'s bar at 1 of 2, the chapel marked 2.

The lesson continues from 24: **spend the part that only one route can use first, and read what it uncovers before spending the shared one.**

## What this map tests

- Whether the player thinks about which part is *shared* between options and which is not (finding 1: planning the part economy, not just finding faults).
- Whether "faults hide faults" works as deduction: the player knows each route is probably deeper than its first fault, and spends to read rather than to win.
- Whether a second, separate trap (the house on the fuse) still lands after the first is avoided.

## Expected numbers

- Nodes 13, lines 13, faults 4 (blown fuse, 2 damaged cables, dead junction). Parts given: 1 fuse, 1 wire. Parts needed: 1 fuse, 1 wire. The south route would need 3 wires.
- Faults readable at start: 1 of 4 (`cut_s`). `fuse_n` shows when `br_N` closes; `cut_n` when `fb_N` is repaired; `dead_s` when `cut_s` is repaired, or from the chapel side once the chapel post is live.
- **Fewest actions to win: 5** (close `br_N`, repair `fb_N`, open `br_h`, repair `cut_n`, throw `sw_S`; 15 shortest orderings).
- Final load: 3 of 3 (chapel, bell). `fb_N` 2/2.
- **Winning configurations: 1** of 8 (`br_N` closed, `br_h` open, `sw_S` at the bell).
- Reachable states 46; **dead ends 24**. First move *repair `cut_s`* is a dead end; every other first move stays winnable in 4.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). The trap sequences and the win were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
