# 62 · Two springs, one window — design note

60 with a second spring behind the first. `S1` sends the current either to the mill or on to `S2`; `S2` sends it to the kiln or to the shrine. Both are springs, so both let go the moment their current goes, and `S2`'s current comes only through `S1`. The feed's way in is a fuse rated 2, which takes neither the mill nor the kiln. Both springs have to be set by cell light and the feed brought in only when the current behind `S1` leads to the shrine and nothing else. The cell's charging line and the line between the springs are both broken, and each break shows only when the step before it is done.

**Element(s) under test:** depth. Pieces: two spring switches in series (a cascade: if `S1` lets go, `S2` loses its current and lets go too), a battery charged by shedding a target, two hidden breaks, a fuse rating, the hand-over inside the window.

## The map

14 nodes, 14 lines, 2 faults. Feed capacity 4. Enoch brings two wires and a fuse. Cell: 7 s, starts empty.

| Piece | What it is |
| --- | --- |
| `j0` | well (1, target) |
| Lantern | plain switch `sw_c` [lantern 1 (target) \| `jc` → **`l_cin` damaged** → `cell`'s input] |
| Cell | `cell` (7 s) → spring `S1`'s far side |
| Front way | `br_H` (open) → `fb_H` ≤2 → spring `S1` [**mill 3** (file) \| **`l_12` damaged** → spring `S2`] |
| `S2` | [**kiln 3** (file) \| shrine 2 (target)] |

Targets: well 1 + lantern 1 + shrine 2 = 4 = capacity.

## The intended read

1. Well and lantern lit. Both springs dark. `br_H` would put the mill on ≤2.
2. Throw `sw_c` to charge: the lantern goes dark and **`l_cin` sparks** halfway to the cell. Wire it; the cell fills (7 s). Put the lantern back.
3. Release. The mill lights by cell light. Throw `S1` on: nothing lights, **`l_12` sparks**. Wire it: the kiln lights.
4. Throw `S2` to the shrine. The shrine is lit by cell light, and the only lamp now behind `S1` is the shrine.
5. Close `br_H` **before the window ends**: shrine 2 on `fb_H` 2/2, and the feed holds both springs. The cell goes flat; nothing moves. Load 4 of 4. **Win.**

## The layers

1. **The front way blows** (mill 3 on ≤2), and springs can't be thrown dark. Unlocks: the cell.
2. **The cell charges only with the lantern shed,** and the shed shows a break on the charging line. Unlocks: a full cell, once wired.
3. **`S1` thrown shows the next break,** between the springs. Unlocks: current at `S2`, once wired (by cell light).
4. **`S2` to the shrine.** Unlocks: a path behind `S1` that the front fuse can carry.
5. **The hand-over,** after `S2` and before the window ends, because `S1` holds `S2` and the feed has to hold `S1`. Unlocks: the win.

## The trap

**`br_H` first:** `fb_H` blows (culprit `mill`). Recoverable with the fuse at the end of the window, in place of `br_H` (the fuse holds once `S2` is on the shrine).

**Bringing the feed in too soon.** After `S1`, with `l_12` still broken, `br_H` looks safe: `fb_H` carries nothing, and the feed now holds `S1`. That is the instinct 60 rewarded. But the wire then joins the kiln: kiln 3 on ≤2, **`fb_H` blows** (culprit `kiln`). Readable (the notice names the kiln, behind `S2`). Recoverable with the fuse: `S1` is still held by the cell, so throw `S2`, then fit the fuse.

**Letting the window end with only `S1` set:** `S1` springs back, and `S2` with it. The two wires stay fitted, so the cost is a recharge.

## What this map tests

- Whether a **cascade** of springs (the second held only through the first) reads from the ribbons and the line between them.
- Whether "bring the feed in last" survives a moment where bringing it in early looks perfectly safe.
- A window of 4 clicks: the most any spring map asks.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid` with time: every click is followed by 1 s, a wait is 0.5 s. Undo and Reset excluded.

- Nodes 14, lines 14, faults 2 (`f_cin`, `f_12`). Parts given: 2 wires, fuse. Parts needed: 2 wires.
- Faults readable at start: 0 of 2. `l_cin` appears with the shed, `l_12` with `S1`.
- Fewest clicks to win: **8** (`sw_c`, wire `l_cin`, wait 7 s, `sw_c`, release, `S1`, wire `l_12`, `S2`, `br_H`).
- Winning orders (distinct minimum-length click sequences, waits not counted): **6**. The chain shed → wire → release → `S1` → wire → `S2` → `br_H` is fixed; the only freedom is when the lantern goes back (six places: before the release, four inside the window's slack, or last).
- Window: 7 s for 4 clicks; the intended run also finishes at 1.5 s a click, with 1 s to spare.
- Winning control settings: 1 of 16.
- Reachable states: 1,210, of which 332 (**27.4%**) can't win without Undo.
- First moves: `br_H` blows `fb_H` (recoverable, 9 clicks to win from there). `sw_c` is right. Both springs refuse; the cell refuses while empty.

## What it taught us
