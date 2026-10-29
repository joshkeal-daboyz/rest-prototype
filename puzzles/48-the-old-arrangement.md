# 48 · The old arrangement — design note

Five lamps for the priests across four fuse branches, two of them under a main fuse. The switches are set the way the tribe has always had them, and that arrangement fits every rating. It is blocked by a break that turns out to be a dead junction. There is exactly one other arrangement that fits, and every switch on the map has to move to reach it.

**Element under test:** the brief's element 5, **which fuse**, as a full re-plan: a bin-packing with exactly two answers, one of which the faults rule out, so the player must find the other from scratch. A synthesis rung; the parts trap (a hidden dead junction) is the hinge.

## The map

30 nodes, 34 lines, 4 faults. Feed capacity 10. Enoch brings 1 wire, 1 bulb.

| Branch | Fuse | Hard-wired | Switch: position 0 / 1 |
| --- | --- | --- | --- |
| x | `br_M` (**open**) → `fb_M` ≤5 → `fb_x` ≤2 | `br_cot` → `cottage` 1 | `sw_x`: gate via `cut_xg` (**damaged**) → `j_xg` (**dead junction**) / well |
| y | `fb_M` ≤5 → `fb_y` ≤3 | (`lane` 1 at `j_M`, under the main fuse) | `sw_y`: shrine / hall (start) |
| z | `fb_z` ≤4 | — | `sw_z1`: shrine (start) / gate; `sw_z2`: well (start) / bell |
| q | `fb_q` ≤2 | — | `sw_q`: bell (start) / hall via `cut_qh` (**damaged**) |

Targets: shrine 3, gate 2, well 1, hall 1, bell 2 (**dead bulb**) = 9. Capacity 10.

## The intended read

1. The map opens at 4 of 10: shrine and well on z (4 of 4). The bell is dark with current at it (q): a **dead bulb**. The main fuse is off behind `br_M`.
2. Close `br_M`: lane, cottage and hall light; `cut_xg` sparks on x's line to the gate. This is the old arrangement: x gate, y hall, z shrine + well, q bell. It fits every rating (main 1 + 1 + 2 + 1 = 5, z 4, q 2), and it needs only the spark mended.
3. Before spending the wire: the gate post can also be reached from z1. Throwing `sw_z1` to the gate sends current into `j_xg` from behind: in, none out: a **dead junction**, *needs wire × 2*. The old arrangement costs 3 wires. Throw it back.
4. Re-plan. Each lamp once: x gate/well, y shrine/hall, z1 shrine/gate, z2 well/bell, q bell/hall. If x takes the well, z2 must take the bell, q the hall, y the shrine, z1 the gate: main lane 1 + well 1 + shrine 3 = 5 ✓, z gate 2 + bell 2 = 4 ✓, q hall 1 ✓. The cottage sits under the main fuse too: 6 > 5 (and 11 of 10 at the feed). **Open `br_cot`**.
5. Throw all five switches (`sw_x` well, `sw_y` shrine, `sw_z1` gate, `sw_z2` bell, `sw_q` hall), repair `cut_qh` (revealed when `sw_q` turns) and put the bulb in the bell. Load 10 of 10. **Win.**

## The trap

**The old arrangement.** A spark on a line the tribe's own settings already point at, the right part in hand: the obvious repair. Mending `cut_xg` reveals `dead_xg`, *needs wire × 2, have 0*, and the only other arrangement needs that wire for `cut_qh`. Dead end. Readable after: the dead junction and the empty tray. Readable before, if the player looks from behind with `sw_z1` (step 3). Undo.

On the way, order traps are fuse blows, and with no spare fuse each is a dead end:

- **The cottage.** Moving to the new arrangement with the cottage still on: when `sw_z2` hands the well to x, the main carries lane + cottage + well + shrine = 6 > 5 and **`fb_M` blows** (culprit `well`), darkening x and y together.
- **Bell before shrine.** With the bulb in and q turned to the hall, throwing `sw_z2` to the bell while `sw_z1` still holds the shrine puts 3 + 2 = 5 on z (≤4): **`fb_z` blows** (culprit `bell`). Move the shrine off z first.

Where both ends of a post are live, the lamp counts on the branch the current reaches first (fewer steps from the feed), which here is always z or q before the main's sub-fuses: the bars show it. The analyzer found 1464 reachable states with a blown fuse.

## What this map tests

- Whether a player who finds the plan blocked will re-plan the whole map rather than look for a part they don't have.
- Whether a large map (30 nodes, 5 fuses) still reads at a glance: the bars, the loads, the five posts on the right.
- Whether the analyzer's number of shortest orderings (75 138) means "loose": the configuration is unique but the order of the five throws mostly isn't. Josh's play will say whether that freedom feels like relief or noise.

## Expected numbers

- Nodes 30, lines 34, faults 4 (2 damaged cables, 1 dead junction, 1 dead lamp). Parts given: 1 wire, 1 bulb. Parts needed: both. The old arrangement would need 3 wires.
- Faults readable at start: 1 of 4 (`dark_bell`). `cut_xg` when `br_M` closes; `dead_xg` from behind via `sw_z1`, or by mending `cut_xg`; `cut_qh` when `sw_q` turns.
- Fuse loads at the win: `fb_M` 5/5, `fb_x` 1/2, `fb_y` 3/3, `fb_z` 4/4, `fb_q` 1/2.
- **Fewest actions to win: 9** (close `br_M`, open `br_cot`, five switch throws, repair `cut_qh`, `bell`).
- Final load: 10 of 10 (the five targets and the lane). Cottage dark.
- **Winning configurations: 1** of 128.
- Reachable states 2172; **dead ends 1700**. No first move is a dead end; mending `cut_xg` is a dead end as soon as `br_M` is closed.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). The trap, the read-from-behind and the win were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
