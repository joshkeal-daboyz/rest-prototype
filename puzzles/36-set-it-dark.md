# 36 · Set it in the dark — design note

Two branches, each a fuse box feeding a switch that feeds a junction feeding a second switch. Every second switch is set to the heavy lamp. Power a branch before its far switch is set and the heavy lamp lands on the fuse along with everything else.

**Element under test:** **order of throws** (the brief's element 5, *which fuse*, taken one step further): a switch can be thrown while dark, and a dark switch is the safe one to throw. The player must set what's downstream before letting current in. Supporting: a hidden dead lamp whose bulb is the last straw if the far switch is wrong.

## The map

20 nodes, 19 lines, 2 faults. Feed capacity 5. Enoch brings a fuse, a bulb and a wire.

| Branch | Path | Far switch, as set → other position |
| --- | --- | --- |
| A | `fb_A` ≤3 → `s_A` [ovens 2 \| `jA`]; `jA` → well (1) and `s_A2` | `s_A2`: **forge (3)** → shrine (2) |
| B | `br_B` (open) via `l_B0b` (**damaged**, visible) → `fb_B` ≤2 → `s_B` [mill 2 \| `jB`]; `jB` → chapel (1, **dead lamp**) and `s_B2` | `s_B2`: **kiln (2)** → gate (1) |

Targets: well 1 + shrine 2 + chapel 1 + gate 1 = 5 = capacity. At the win `fb_A` is 3/3 and `fb_B` 2/2: both full.

## The intended read

1. The map opens with the ovens lit on `fb_A` (2/3) and a spark on `l_B0b`, outside the open `br_B`. Everything else is dark, but every switch's position is drawn.
2. Read branch A: `s_A` would bring in the well (1) and whatever `s_A2` points at, the forge (3): 4 through a fuse rated 3. Throw **`s_A2` to the shrine first**, in the dark. Then throw `s_A`: the well and the shrine light, `fb_A` 3/3, the ovens go dark.
3. Repair `l_B0b` with the wire.
4. Read branch B the same way: `s_B2` points at the kiln (2) and `fb_B` is rated 2. Throw `s_B2` to the gate and `s_B` to `jB` (both in the dark), then close `br_B`. The gate lights (1/2), and the chapel flickers red: dead lamp.
5. Bulb on the chapel: `fb_B` 2/2. Load 5 of 5. **Win.**

## The trap

The shrine is dark and `s_A` is the switch nearest the feed on its branch, so the obvious move is to throw `s_A`. The forge comes in with the well: 4 through `fb_A` rated 3, and **`fb_A` blows** (culprit `forge`). Readable before (the forge's 3 next to `fb_A`'s rating, and `s_A2` drawn pointing at it) and after (✕, the notice naming the forge). Recoverable with the one fuse: throw `s_A2` to the shrine (it's dark now anyway), repair `fb_A`, and it holds at 3/3.

Branch B repeats the lesson with a twist: with `s_B2` still on the kiln, `jB` carries kiln 2 + chapel 0 (dead) = 2, which holds. The bulb is what tips it: repair the chapel and `fb_B` carries 3 of 2 and blows (culprit `chapel`). That one only costs the fuse if the fuse is still there; after the first trap it's a dead end that Undo clears.

## What this map tests

- Whether players learn that a dark switch is free to throw and plan the whole branch before powering it.
- Whether a full fuse bar plus a drawn switch position is enough to predict a blow (ticket 012's load bar).
- Whether "the bulb was the last straw" reads as fair: the fault the player fixes is a load, not just a repair.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 20. Lines: 19. Faults: 2 (`f_feedB`, `f_chapel`). Parts given: fuse, bulb, wire. Parts needed: wire, bulb (the fuse is a spare).
- Faults readable at start: 1 of 2 (`f_feedB`). `f_chapel` shows once current reaches `jB`.
- Fewest actions to win: **7** (`s_A2`, `s_A`, repair `l_B0b`, `s_B2`, `s_B`, close `br_B`, bulb on `chapel`). The order is loose apart from "far switch before near switch" and "`s_B2` before the bulb": 504 orderings reach the win in 7.
- Final load: **5 of 5**. Fuses at the win: `fb_A` 3/3, `fb_B` 2/2.
- Winning control settings: **1 of 32** (`br_B` closed, all four switches at position 1).
- Reachable states: 434, of which 180 can't win without Undo; every one has a fuse blown with no fuse left to fix it.
- First moves: `s_A` blows `fb_A` (recoverable with the spare); everything else is safe.

## What it taught us

