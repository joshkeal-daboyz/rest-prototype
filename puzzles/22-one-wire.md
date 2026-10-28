# 22 · One wire, two breaks — design note

Rung 22. Two sparking breaks, one wire. The shrine and the well are dark. One break sits right beside the shrine and is the only thing sparking when the map opens; the other is hidden behind the mill's switch. Only one of them reaches both targets.

**Element under test:** the brief's element 7, **two wires, one job**: two breaks and one wire; which to fix, and reroute around the other. This rung adds a layer: the right break isn't readable until the player looks for it.

## The map

17 nodes, 17 lines, 2 faults. Feed capacity 4. Enoch brings one wire.

| Piece | What it is |
| --- | --- |
| `br_lane` → `lane` (1) | A home straight off the hub, on its own breaker. Priority. |
| `fb_N` ≤2 → `j_n` | North. `br_houses` → `houses` (1, priority); `l_x` (**damaged**, `x`) → shrine post `j_sh` → `shrine` (2, target). |
| `fb_S` ≤3 → `sw_S` | South. Position 0 (start) → `mill` (2). Position 1 → `j_s2` → `l_y` (**damaged**, `y`) → `j_r`. |
| `j_r` | → `well` (1, target), and → `br_ring` (**open**) → `j_sh`: the ring back to the shrine. |

## The intended read

1. The map opens at 4 of 4: lane, houses and mill lit. `x` sparks between `j_n` and the shrine. Nothing else shows. `fb_N` reads 1 of 2.
2. The well is dark and its only line runs to `j_r`, which is dark. The only way to `j_r` is the south, past `sw_S`. Throw `sw_S`: the mill goes dark, and `y` sparks. Two breaks, one wire.
3. Count. `x` reaches the shrine only, and through `fb_N`, which already carries the houses: 1 + 2 = 3, over ≤2. `y` reaches the well and, through `br_ring`, the shrine too, under `fb_S`: 1 + 2 = 3 of 3. Spend the wire on `y`.
4. Repair `y` (the well lights), close `br_ring` (the shrine lights). Load 5 of 4 (lane, houses, shrine, well): **brownout**.
5. Shed a home: open `br_lane` or `br_houses`. 4 of 4. **Win.**

## The trap

The only spark on the opening map is `x`, beside the shrine, and the player holds a wire. Repairing it sends the shrine's 2 through `fb_N` on top of the houses: 3 of 2, **`fb_N` blows** (culprit `shrine`), and the wire is gone. The well can now only be reached through `y`, with nothing to repair it. Dead end.

Readable before: `fb_N`'s bar at 1 of 2, the shrine marked 2, and the well with no line to the north. Readable after: the blown-fuse ✕ on `fb_N`, and once `sw_S` is thrown, `y` sparking with *needs wire × 1, have 0*. Recoverable only by Undo (two steps) or Reset. Shedding the houses first and then repairing `x` doesn't blow, but still spends the wire on a break that can't reach the well: the same dead end, more quietly.

The lesson: **look before you spend.** A spark you can see isn't the only one there is.

## What this map tests

- Whether a player who has only seen one fault thinks to look for a second before spending the only part (GDD review, finding 1: a moment of reasoning between two possibilities).
- Whether "the well has only one way in" reads from the map's shape.
- Whether the ring through `br_ring` reads as a reroute that serves two targets with one repair.
- Whether a dead end that is readable (✕ + "have 0") and undoable feels fair at this point in the ladder.

## Expected numbers

From the analyzer (see the note at the end):

- Nodes 17, lines 17, faults 2 (both `damaged-cable`). Parts given: 1 wire. Parts needed: 1 wire.
- Faults readable at start: 1 of 2 (`x`). `y` appears when `sw_S` is thrown.
- Start: load 4 of 4; `fb_N` 1/2, `fb_S` 2/3.
- **Fewest actions to win: 4** (throw `sw_S`, repair `y`, close `br_ring`, open `br_lane` or `br_houses`; 24 shortest orderings).
- Final load: 4 of 4 with one home kept (3 of 4 if both are shed). `fb_N` 1/2 (or 0), `fb_S` 3/3.
- **Winning configurations: 3** of 16 control settings (`sw_S` to `j_s2`, `br_ring` closed; lane off, houses off, or both off).
- Reachable states 52; **dead ends 20** (no win without Undo). First move *repair `x`* is a dead end; every other first move stays winnable in 3.

Numbers from a throwaway breadth-first search over the real simulator (`createGrid`), because `tools/analyze.ts` isn't built yet (`npm run analyze` has no script to run). Each scripted claim above (the blow, its culprit, the refused repair, both wins) was replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
