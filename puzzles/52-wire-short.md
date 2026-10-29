# 52 · One wire short — design note

The priests want the shrine, the lift and the infirmary. The shrine is right there on the west side, with one sparking break between it and the live ovens, and Enoch has three wires. The east side is behind an open breaker and a blown fuse, and nobody knows what's past them. Spending a wire on the west leaves him one wire short in the east.

**Element under test:** the brief's element 7, **two wires, one job**, scaled up: more breaks than wires, with most of the breaks hidden. What makes it fair is a deduction from the map's shape, not from the faults: `s_1` feeds the west *or* the east, and the lift and infirmary can only be reached from the east. So the whole job runs east, and the west spark doesn't matter. Supporting: faults hide faults (three deep), a capacity shed and a fuse that blows if the shed comes late.

## The map

20 nodes, 21 lines, 7 faults. Feed capacity 5. Enoch brings three wires, two fuses and a bulb.

| Piece | What it is |
| --- | --- |
| `s_1` position 0 (as set) | West: `W` → ovens (2); `W` → `l_x1` (**damaged, visible at start**) → shrine post `pS`. |
| `s_1` position 1 | East: `br_E` (open) → `fb_E` ≤5 (**blown**) → `jE` → `l_E3` (**damaged**) → `jE2` → `l_x2` (**damaged**) → `pS`; `jE2` → `pC` → lift (2) → `l_x3` (**damaged**) → `D` → infirmary (1, **dead lamp**). `jE` also feeds the mill (2) through `br_m`. |
| `s_2` | Position 0: homes (1). Position 1: `N`, a **dead junction** (wire × 2) with a line to `D`. |

Targets: shrine 2 + lift 2 + infirmary 1 = 5 = capacity = `fb_E`'s rating.

## The intended read

1. The map opens with the ovens and homes lit (3 of 5) and one spark, `l_x1`, between the ovens and the shrine. Three wires in hand.
2. Read the shape before the faults. `s_1` sends power west **or** east. The lift and the infirmary have no line to the west. So the job must run east, and once it does the west is dead: `l_x1` will never carry anything. Leave it.
3. Throw `s_1` east (the ovens go dark). Close `br_E`: `fb_E` shows the ✕. Repair it: the mill lights (2/5) and `l_E3` sparks.
4. Repair `l_E3`: the lift lights (4/5 with the mill), and `l_x2` and `l_x3` spark.
5. Open `br_m` before going further: the shrine is 2, and the mill, lift and shrine together are 6 against `fb_E`'s 5. Repair `l_x2` (the shrine lights, 4/5) and `l_x3` (the infirmary flickers red).
6. Throw `s_2` to `N`: the homes go dark; `N` fizzes (dead junction), which is harmless. Bulb on the infirmary: `fb_E` 5/5, load 5 of 5. **Win.** Three wires spent, one fuse left.

## The trap

`l_x1` is the only fault on the map at the start, it sits between a lit lamp and a dark target, and it costs one of three wires. Repair it and the shrine lights at once (load 5 of 5, with the ovens): it looks like progress. But the east needs three wires (`l_E3`, `l_x2`, `l_x3`), revealed one behind another, and now there are two: **one wire short**, a dead end. It is readable (the third spark with *needs wire, have 0*; the shrine's west line was never going to coexist with the east, since `s_1` can't feed both) and Undo recovers it.

What the player must see is that the deduction comes from the switch, not from counting hidden faults: nobody can see the east's breaks at the start, but anyone can see that `s_1` can't feed both sides and that two of the three targets live in the east.

The secondary trap is ordering: repairing `l_x2` with the mill still on blows `fb_E` (6 of 5). The spare fuse covers it once.

## What this map tests

- Whether players reason from topology ("this switch can't feed both") before reacting to the visible fault (GDD review finding 1).
- Whether a partial win (the shrine lit early) is recognised as a trap rather than progress.
- How players budget parts against faults they can't yet see.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 20. Lines: 21. Faults: 7 (`f_x1`, `f_fbE`, `f_E3`, `f_x2`, `f_x3`, `f_N`, `f_inf`). Parts given: 3 wires, 2 fuses, 1 bulb. Parts needed: 3 wires, 1 fuse, 1 bulb (one fuse is a spare). `f_x1` and `f_N` stay unrepaired.
- Faults readable at start: 1 of 7 (`f_x1`). The east reveals itself in layers: `f_fbE` at `br_E`, `f_E3` after the fuse, `f_x2` and `f_x3` after `l_E3`, `f_inf` after `l_x3`. `f_N` shows when `s_2` is thrown or, after `l_x3`, from `D`'s side. Once `l_x2` is repaired, `f_x1` also sparks from the shrine's side.
- Fewest actions to win: **9** (`s_1`, close `br_E`, repair `fb_E`, repair `l_E3`, open `br_m`, repair `l_x2`, repair `l_x3`, `s_2`, bulb on `infirmary`); 324 orderings reach the win in 9.
- Final load: **5 of 5**. `fb_E` 5/5.
- Winning control settings: **1 of 16** (`br_E` closed, `br_m` open, `s_1` east, `s_2` to `N`).
- Reachable states: 732, of which 520 can't win without Undo: a wire spent in the west, or `fb_E` blown twice.
- First moves: repairing `l_x1` is the dead end; every throw is safe.

## What it taught us

