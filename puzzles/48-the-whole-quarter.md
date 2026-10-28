# 48 · The whole quarter — design note

Rung 48. A ring main in the west of the quarter, fed at its east end through a chain of three relays, under a blown fuse. Four lamps for the priests, five homes, capacity for the list and nothing else. Every lesson from 22, 32, 35, 38, 42, 44, 45 and 46 is on this map once: shed before you feed, read before you spend, set relays in the light, leave the open point broken.

**Element under test:** synthesis. Primary: the brief's element 6, **ring main**, with the east feed gated by relays (ticket 008). The open point is a damaged cable that must stay broken.

## The map

27 nodes, 27 lines, 4 faults. Feed capacity 6. Enoch brings 2 fuses, 2 wires, 1 bulb.

Ring: `br_W` (**open**) → `fb_W` ≤3 → **pA** → **pB** → `l_BC` (**damaged**, `cut_BC`) → **pC** → **pD** → `j_e` (**dead junction**, `dead_e`) → relays.

| Post | Lamps |
| --- | --- |
| pA | `shrine` 2 (target) |
| pB | `well` 1 (target); `br_cot` → `cottage` 1 |
| pC | `bell` 2 (target, **dead bulb**, `dark_bell`) |
| pD | `gate` 1 (target); `br_smith` → `smithy` 1 |

East feed: `fb_E` ≤3 (**blown**, `fuse_E`) → `rl_1` (`bakery` 1 / on) → `rl_2` (`tannery` 1 / on) → `j_23` (`br_mill` → `mill` 3) → `rl_3` (`tower` 1 / on to `j_e`). All relays start on their homes.

Targets: shrine 2 + well 1 + bell 2 + gate 1 = 6 = capacity = the two fuses together.

## The intended read

1. The map opens dark. `fb_E` shows current in and none out: **blown**. Everything else is unknown.
2. Split the ring (as in 45): each fuse carries 3. West: shrine + well = 3. East: bell + gate = 3. The ring must be open between pB and pC, and `cut_BC` is exactly there. **Leave it broken.**
3. West: the cottage would make 4 on ≤3. Open `br_cot`, then close `br_W`. Shrine and well light, 3 of 3. `cut_BC` sparks: don't touch it.
4. East: the mill is 3 on a ≤3 fuse, with the relay homes around it. Open `br_mill` before the relays pass current to it (as in 42). Open `br_smith` too: gate + bell + smithy would be 4.
5. Repair `fb_E` (fuse 1): the bakery lights. Throw `rl_1`, `rl_2`, `rl_3` in turn (the tannery, then the tower, light and drop). Current reaches `j_e` and stops: **dead junction**. Repair it (2 wires).
6. pD lights: the gate. Current runs on to pC: the bell is dark: **dead bulb**. Replace it. East 3 of 3. Load 6 of 6. **Win**, with one fuse left.

## The trap

- **The first click.** `br_W` is the most obvious control on a dark map. Closed with the cottage on: shrine + well + cottage = 4 on ≤3, **`fb_W` blows** (culprit `shrine`). Recoverable: open `br_cot`, repair `fb_W` with the spare fuse. The spare is there for this and only this: 18-battery-run (27 Oct 2026) taught that a blow on the obvious first click must not end the map. A second blow anywhere is a dead end.
- **The open point.** `cut_BC` is the only spark on the west, the player holds two wires, and the bell is dark just past it. Mended, the west joins pC and pD: shrine + well + gate + smithy = 5 on ≤3, **`fb_W` blows** (culprit `gate`), and a wire is gone, so `dead_e` (needs 2) can't be mended. Dead end even with the spare fuse. Readable before: the ring split by the numbers; after: the ✕ and *needs wire × 2, have 1*.
- **The mill.** Throwing `rl_2` with `br_mill` closed: mill 3 + tower 1 = 4 on ≤3, **`fb_E` blows** (culprit `mill`). With the spare fuse: open `br_mill`, repair `fb_E` (the relays hold their positions). Without it: dead end.
- **The smithy.** The bell's bulb with the smithy on: gate + bell + smithy = 4, **`fb_E` blows** (culprit `bell`). Same recovery, same cost.

## What this map tests

- Whether a player who has climbed this far can plan a 10-action job from a dark map, or falls back to clicking.
- Whether one spare fuse is the right mercy for a rung this hard: it forgives the first click but not carelessness.
- How long a synthesis map takes (brief question 3), from the session log.

## Expected numbers

- Nodes 27, lines 27, faults 4 (blown fuse, damaged cable, dead junction, dead lamp). Parts given: 2 fuses, 2 wires, 1 bulb. Parts needed: 1 fuse, 2 wires, 1 bulb (1 fuse spare).
- Faults readable at start: 1 of 4 (`fuse_E`). `cut_BC` when `br_W` closes; `dead_e` when `rl_3` passes current; `dark_bell` when `j_e` is mended.
- Fuse loads at the win: `fb_W` 3/3, `fb_E` 3/3.
- **Fewest actions to win: 10** (open `br_cot`, `br_smith`, `br_mill`; close `br_W`; repair `fb_E`; throw `rl_1`, `rl_2`, `rl_3`; repair `j_e`, `bell`; 945 shortest orderings).
- Final load: 6 of 6. Five homes dark.
- **Winning configurations: 1** of 128.
- Reachable states 1874; **dead ends 924**. First move *close `br_W`* blows `fb_W` but stays winnable (10 more) with the spare fuse; every other first move stays winnable in 9.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). Each blow above (with its load and culprit), the spare-fuse recovery and the win were replayed on `createGrid`. Without the spare fuse the first-click blow was an instant dead end, so the second fuse was added.

## What it taught us

*(Josh's verdict goes here, in his words.)*
