# 44 · Read it from behind — design note

Two sparks on the opening map: one on the market's line, one on the north road to the chapel. Enoch has three wires and a bulb. The north road looks like one wire. It is three, and the map lets the player find that out for free, by sending current into the hidden fault from its far side before spending anything.

**Element under test:** the brief's element 3, **behind the first** (faults hide faults), and question 4 of the brief: *does "faults hide faults" work as deduction on a map the player can see whole?* A hidden fault can be read from behind if another route reaches its far side.

## The map

18 nodes, 19 lines, 6 faults. Feed capacity 4. Enoch brings 3 wires, 1 bulb.

| Branch | Chain |
| --- | --- |
| North | `fb_N` ≤3 → `j_n` (`br_h` → `houses` 1, priority) → `l_cN` (**damaged**, `cut_N`) → `jK` (**dead junction**, `dead_K`) → chapel post `pT` |
| Market | `fb_M` ≤2 → `sw_M`. Position 0 (start) → `l_cM` (**damaged**, `cut_M`) → `market` 2 (target). Position 1 → `l_probe` → `jK`. |
| South | `br_S` (**open**) → `fb_S` ≤2 → `l_cS` (**damaged**, `cut_S`) → `j_s2` (`br_hall` → `hall` 1, priority) → `l_cS2` (**damaged**, `cut_S2`) → `pT` |

`pT` → `chapel` 2 (target, **dead bulb**, `dark_chapel`).

## The intended read

1. The map opens with the houses lit (1 of 4). Two sparks: `cut_M` before the market, `cut_N` on the north road. The south is dark.
2. Count the obvious plan: one wire for the market, one for the north road, chapel lit. That leaves a wire spare, which is suspicious. And `sw_M` has a second line that runs straight into `jK`, the junction just past `cut_N`.
3. **Probe.** Throw `sw_M` to `l_probe`. It costs nothing (the market's line is broken anyway). Current enters `jK` from behind: in, none out, no fuse: a **dead junction**, *needs wire × 2*. The north road is 3 wires. With the market's 1, that's 4. Throw `sw_M` back.
4. Try the south: close `br_S`; `cut_S` sparks. Repair it: the hall lights (`fb_S` 1 of 2) and `cut_S2` sparks. Market 1 + south 2 = 3 wires. It fits.
5. The chapel is 2 and `fb_S` is ≤2: open `br_hall` before going further.
6. Repair `cut_S2`: current reaches the chapel's post, the chapel is dark: **dead bulb**. Replace it. Chapel 2 of 2 on `fb_S`.
7. Repair `cut_M`: the market lights on `fb_M` 2 of 2. Load 5 of 4 with the houses: open `br_h`. 4 of 4. **Win.**

## The trap

**The north road.** `cut_N` is a lone spark between the houses and the chapel: the short, obvious route. Repairing it reveals `dead_K` (two wires). The player now has two wires and needs three (market, `cut_S`, `cut_S2`): dead end, whether they go on to repair `jK` or not. Readable after: the fizzing junction and the wire count. Recoverable by Undo. Avoidable by the probe, which is on the map from the start and costs nothing.

**The hall.** On the south route, putting the chapel's bulb in with the hall still on puts 3 through `fb_S` (≤2): it blows (culprit `chapel`), and there's no fuse. Dead end. Readable before: the bar at 1 of 2 and the chapel's 2.

## What this map tests

- Whether the player uses a switch to *look* rather than to route: a probe that never appears in the winning configuration.
- Whether a parts count that seems generous (3 wires for "2 sparks") reads as a warning.
- Whether reading a fault from its far side feels like deduction (finding 1, *ambiguous dark sections*).

## Expected numbers

- Nodes 18, lines 19, faults 6 (4 damaged cables, 1 dead junction, 1 dead lamp). Parts given: 3 wires, 1 bulb. Parts needed: 3 wires, 1 bulb. The north road alone would need 3 wires.
- Faults readable at start: 2 of 6 (`cut_N`, `cut_M`). `dead_K` by the probe (or by repairing `cut_N`, or from `pT` once `cut_S2` is repaired); `cut_S` when `br_S` closes; `cut_S2` after `cut_S`; `dark_chapel` after `cut_S2`.
- **Fewest actions to win: 7** (open `br_h`, close `br_S`, open `br_hall`, repair `cut_M`, `cut_S`, `cut_S2`, `chapel`; 168 shortest orderings). The probe adds 2 throws (`sw_M` there and back), so a player who reads first takes 9.
- Final load: 4 of 4 (market, chapel). Houses and hall dark. `fb_M` 2/2, `fb_S` 2/2, `fb_N` 0/3.
- **Winning configurations: 1** of 16.
- Reachable states 432; **dead ends 312**. First move *repair `cut_N`* is a dead end; the probe first move stays winnable.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). The probe (`dead_K` readable from `sw_M`), both traps and the win were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
