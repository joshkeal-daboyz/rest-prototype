# 34 · The main fuse — design note

Four lamps for the priests: shrine 3, gate 2, well 1, hall 1. Three switch branches carry them, and two of those branches sit under a **main fuse** rated 4, which already carries the lane. Every lamp can be reached from two branches. Exactly one assignment fits every rating.

**Element under test:** the brief's element 5, **which fuse**, scaled up: nested fuse boxes (a main fuse over two sub-fuses) and four switches, so moving one load forces a chain of moves. No faults; the only parts are a spare fuse.

## The map

24 nodes, 27 lines, 0 faults. Feed capacity 7. Enoch brings 1 fuse.

| Branch | Fuse | Switch: position 0 / 1 |
| --- | --- | --- |
| x (under main) | `fb_main` ≤4 → `fb_x` ≤2 | `sw_x`: gate / well |
| y (under main) | `fb_main` ≤4 → `fb_y` ≤3, with `br_lane` → `lane` (1) at `j_y` | `sw_y`: hall / shrine |
| z | `br_z` (**open**) → `fb_z` ≤3 → `j_z` | `sw_z1`: shrine / gate; `sw_z2`: well / hall |

Start: `sw_x` gate, `sw_y` hall, `sw_z1` shrine, `sw_z2` well, all 0. Targets total 7 = capacity.

## The intended read

1. The map opens at 4 of 7: lane, gate and hall lit. `fb_main` reads **4 of 4** (gate 2, hall 1, lane 1). The z branch is dark behind `br_z`, set to the shrine and the well.
2. Count z as set: shrine 3 + well 1 = 4 > ≤3. Closing `br_z` now blows it.
3. Count the assignment. x can take the gate or the well, y the hall or the shrine, z1 the shrine or the gate, z2 the well or the hall. Each lamp once:
   - x gate, y hall → z must take shrine + well = 4 > 3. ✗
   - x well, y shrine → z takes gate + hall = 3 ✓, and the main carries well 1 + shrine 3 + lane 1 = 5 > 4. So **the lane goes dark**: 4 of 4. ✓
   - the other two pairings leave a lamp with no branch.
4. Open `br_lane`. Throw `sw_x` to the well (the gate drops), then `sw_y` to the shrine (main 4 of 4).
5. Throw `sw_z1` to the gate and `sw_z2` to the hall (the breaker is still open, so nothing changes).
6. Close `br_z`. z carries 3 of 3. Load 7 of 7. **Win.**

## The trap

Two tempting moves, both readable fuse blows, each recoverable once with the spare fuse.

- **Close `br_z` first** (the dark branch is the obvious place to find power): shrine + well through ≤3, **`fb_z` blows** (load 4, culprit `shrine`). Recovery: set z's switches, then repair `fb_z`.
- **Throw `sw_y` to the shrine first** (the biggest target, the switch that reaches it): the main fuse takes gate 2 + lane 1 + shrine 3 = 6 > 4 and **`fb_main` blows** (culprit `shrine`), darkening x and y together. The same happens on the intended route if the lane is forgotten: well 1 + lane 1 + shrine 3 = 5 > 4.

Two blows exhaust the one fuse: dead end, Undo or Reset.

## What this map tests

- Whether a nested fuse reads: a sub-fuse with room (`fb_y` 2/3) under a main fuse with none (`fb_main` 4/4).
- Whether the player solves the assignment on paper before throwing, or learns it from blows.
- Whether shedding the lane reads as forced by the *main* fuse and not by capacity: the feed has room for it in no winning configuration, but the bar that says so is `fb_main`'s.

## Expected numbers

- Nodes 24, lines 27, faults 0. Parts given: 1 fuse. Parts needed: none on the intended route; 1 fuse after either trap.
- Fuse loads at start: `fb_main` 4/4, `fb_x` 2/2, `fb_y` 2/3, `fb_z` 0/3. At the win: `fb_main` 4/4, `fb_x` 1/2, `fb_y` 3/3, `fb_z` 3/3.
- **Fewest actions to win: 6** (open `br_lane`, throw `sw_x`, `sw_y`, `sw_z1`, `sw_z2`, close `br_z`; 135 shortest orderings).
- Final load: 7 of 7 (shrine, gate, well, hall). Lane dark.
- **Winning configurations: 1** of 64.
- Reachable states 372; **dead ends 216**. Both trap first moves stay winnable (6 more) because of the spare fuse.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). Both blows, their culprits and the recovery were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
