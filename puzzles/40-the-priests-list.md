# 40 · The priests' list — design note

Four lamps for the priests (shrine 3, gate 2, well 1, bell 1) and four homes on the same fuses (lane, mill, cottage, houses). Capacity 8: the list plus one home. Which home stays lit isn't the player's choice; the fuse ratings decide it, and only one routing of the list fits.

**Element under test:** the brief's element 8, **the priests' list**: several targets, a capacity that can't cover all of them plus the tribe's homes. What goes dark. In this version, homes go dark as a *consequence* of routing, not by a breaker of their own, so the choice is a plan rather than a shed.

## The map

27 nodes, 29 lines, 4 faults. Feed capacity 8. Enoch brings 2 wires, 1 bulb.

| Branch | Fuse | Hard-wired | Switches (position 0 / 1) |
| --- | --- | --- | --- |
| A | `fb_A` ≤4 | `lane` 1 | `sw_A`: shrine / gate (line **damaged**, `cut_Ag`) |
| B | `fb_B` ≤4 | — | `sw_B1`: shrine / `mill` 2; `sw_B2`: well / bell |
| C | `br_C` (**open**) → `fb_C` ≤2 | `cottage` 1 | none: straight to the gate (line **damaged**, `cut_Cg`) |
| D | `br_D` (**open**) → `fb_D` ≤2 | — | `sw_D`: well (line **damaged**, `cut_Dw`) / `houses` 2 |

`bell` has a **dead bulb** (`dark_bell`). Start: `sw_A` shrine, `sw_B1` mill, `sw_B2` well, `sw_D` houses.

## The intended read

1. The map opens at 7 of 8: lane, shrine (on A, `fb_A` **4 of 4**), mill and well (on B, 3 of 4). Gate and bell dark. No fault is readable yet.
2. Where can the gate go? From A (line broken) or from C. C carries the cottage, so gate 2 + cottage 1 = 3 > ≤2: never C. **The gate goes on A**, which pushes the shrine off A.
3. The shrine's other route is B, ≤4: shrine 3 leaves room for 1, so `sw_B1` drops the mill and `sw_B2` carries one of well or bell. The bell has no other route, so **B takes the bell**, and the well must come from D, whose other position is the houses. C stays off: its cottage would make 9 of 8.
4. Throw `sw_A` to the gate: the shrine drops and `cut_Ag` sparks. Repair it. Throw `sw_B1` to the shrine. Throw `sw_B2` to the bell: the well drops, the bell is dark with current at it: **dead bulb**. Replace it.
5. Throw `sw_D` to the well, close `br_D`: `cut_Dw` sparks. Repair it. Load 8 of 8: the list and the lane. Mill, cottage and houses dark. **Win.**

## The trap

- **The gate's nearest feed.** Close `br_C` (the dark branch beside the gate): the cottage lights and `cut_Cg` sparks on a straight line to the gate. Repairing it puts gate + cottage through ≤2: **`fb_C` blows** (culprit `gate`) and a wire is gone. The plan needs both wires (`cut_Ag`, `cut_Dw`): dead end, Undo. Readable before: C's rating 2 and the cottage hard-wired at `j_C`.
- **The houses.** Closing `br_D` before `sw_D` is thrown brings the houses in: 9 of 8, **brownout**, readable and recoverable by throwing `sw_D`.
- **The cottage.** Closing `br_C` at any point lights the cottage, which has no breaker of its own: in the final configuration that's 9 of 8, brownout. C is bait from end to end; the win has it off.

## What this map tests

- Whether "which home stays lit" reads as a consequence of the routing (the lane survives because it shares A with the gate) rather than a free choice.
- Whether players reason from the most constrained lamp (the gate: one usable route) outward.
- Whether brownout and fuse blow read as two distinct "no"s on the same map (finding 1, *capacity*).

## Expected numbers

- Nodes 27, lines 29, faults 4 (3 damaged cables, 1 dead lamp). Parts given: 2 wires, 1 bulb. Parts needed: all three.
- Faults readable at start: 0 of 4. Each appears when its switch or breaker sends current to it.
- Fuse loads at start: `fb_A` 4/4, `fb_B` 3/4, `fb_C` 0/2, `fb_D` 0/2. At the win: 3/4, 4/4, 0/2, 1/2.
- **Fewest actions to win: 8** (throw `sw_A`, `sw_B1`, `sw_B2`, `sw_D`; close `br_D`; repair `cut_Ag`, `cut_Dw`, `bell`; 3360 shortest orderings).
- Final load: 8 of 8 (shrine, gate, well, bell, lane).
- **Winning configurations: 1** of 64.
- Reachable states 992; **dead ends 480**. No first move is a dead end; the dead ends come from the C branch and from blows later.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). The C-branch blow (3/2, culprit `gate`), the houses brownout (9/8) and the win were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
