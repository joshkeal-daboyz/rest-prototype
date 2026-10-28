# 42 · Set in the light — design note

The shrine sits at the far end of a chain of four relays. Relays can only be thrown while current reaches them, so the chain has to be walked in order, each one passed on to wake the next. Halfway along, the mill sits on the chain, and it's too heavy for the chain's fuse. And right beside the shrine there's a short cable from a small fuse box, sparking, begging to be mended. It has to stay broken.

**Element under test:** relay switches (ticket 008; used before in 18-battery-run): **you can't pre-set a relay in the dark.** Whatever sits on the line the moment it goes live is carried, so loads must be shed before the relay that reaches them is thrown, not after.

## The map

22 nodes, 24 lines, 3 faults. Feed capacity 3. Enoch brings 1 wire, 1 bulb. No fuse.

| Piece | What it is |
| --- | --- |
| `fb_R` ≤2 → `rl_1` | Relay chain. `rl_1`: on to `rl_2` / **well** post `p_a` (start). |
| `rl_2` | on to `rl_3` (line **damaged**, `cut_23`) / **bakery** post `p_b` (start). |
| `rl_3` | on to `j_34` / `tannery` 1 (start). |
| `j_34` | `br_mill` (closed) → `mill` 3; and on to `rl_4`. |
| `rl_4` | `tower` 1 (start) / shrine post `p_c`. |
| `fb_T` ≤1 → `l_short` | A short cable from the hub to `p_c`, **damaged** (`cut_short`), sparking from the start. |
| `br_S` (**open**) → `fb_S` ≤2 → `sw_S` | well post `p_a` / bakery post `p_b` (start). |

`shrine` 2 (target, **dead bulb**, `dark_shrine`); `well` 1 (target); bakery, tannery, tower 1 each, priority.

## The intended read

1. The map opens with the well lit through `rl_1` (`fb_R` 1 of 2). `cut_short` sparks beside the shrine's post. The relays past `rl_1` are dead and won't move.
2. Read the chain: `rl_1` → `rl_2` → `rl_3` → `j_34` (the mill, 3) → `rl_4` → shrine. Everything under `fb_R` ≤2. The mill alone is 3.
3. Read the short cable: `fb_T` is ≤1 and the shrine is 2. Mend it and the shrine sits on a 1-rated fuse. Leave it.
4. Open `br_mill` now, while you can see it is needed: once `rl_3` passes current, the mill is live.
5. Throw `rl_1` (the bakery lights, the well drops), `rl_2` (`cut_23` sparks). Repair it with the wire: the tannery lights.
6. Throw `rl_3` (the tower lights), then `rl_4`: current reaches the shrine, dark: **dead bulb**. Replace it. Shrine 2 of 2.
7. The well: close `br_S` and throw `sw_S` to the well. Load 3 of 3. **Win.**

## The trap

- **The short cable.** The only spark on the opening map, one wire, right next to the shrine. Repairing it lights nothing, but shows the shrine's dead bulb; put the bulb in and the shrine's 2 goes through `fb_T` ≤1: **blows** (culprit `shrine`). Either way the wire is spent and `cut_23` can't be mended: dead end. Even without the bulb, a mended short cable is fatal later: whenever the shrine is lit, the hub's short path reaches it first and it counts on `fb_T`. Readable before: `fb_T`'s rating 1 and the shrine's 2. Readable after: the ✕, and `cut_23` *needs wire, have 0*. Undo.
- **The mill.** Walking the chain without opening `br_mill`: `rl_3` passes current to `j_34`, and mill 3 + tower 1 go through ≤2: **`fb_R` blows** (culprit `mill`). No fuse: dead end, and every relay past the blown fuse is now stuck dark. Readable before: the mill's 3 and the chain's ≤2.
- `rl_4` refuses to move until current reaches it: that's the relay rule (readable from 18-battery-run), not a fault.

## What this map tests

- Whether "relays only move in the light" makes the player plan sheds *ahead* of the current, rather than react.
- Whether leaving a fault unrepaired, on purpose, reads as a choice (restraint) when the spark is right there.
- Whether a chain of four relays feels like a sequence the player understands or a chore. If it's a chore, cut a relay.

## Expected numbers

- Nodes 22, lines 24, faults 3 (2 damaged cables, 1 dead lamp). Parts given: 1 wire, 1 bulb. Parts needed: both, with `cut_short` left broken.
- Faults readable at start: 1 of 3 (`cut_short`). `cut_23` shows when `rl_2` passes current; `dark_shrine` when `rl_4` reaches it.
- **Fewest actions to win: 9** (open `br_mill`; throw `rl_1`, `rl_2`; repair `cut_23`; throw `rl_3`, `rl_4`; repair `shrine`; close `br_S`; throw `sw_S`; 288 shortest orderings).
- Final load: 3 of 3 (shrine, well). `fb_R` 2/2, `fb_S` 1/2, `fb_T` 0/1.
- **Winning configurations: 1** of 128.
- Reachable states 368; **dead ends 96**. First move *repair `cut_short`* is a dead end; every other first move stays winnable in 8.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet; the relay rule is honoured because the search calls the real `throwSwitch`). Both traps and the win were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
