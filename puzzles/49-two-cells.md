# 49 · Two cells — design note

The old battery track's three capstones (49, 51, 54) start here. Two relay sections are set the wrong way and guarded by small fuses, and there are two cells to set them with: a small one that fills from the feed all the time, and a big one that fills only while the market is dark. The east needs one relay throw; the north needs three, far end first. The small cell does the east, and the big one does the north, but only after the player has shed the market, waited, and put it back.

**Element under test:** the battery as temporary power for relays (ticket 008): charge, release, throw the relays inside the window, then let the feed take over. Here with **two cells of different capacity**, one of which charges only while another section is shed. Supporting: plain switches alongside relays, and 20-battery-run's far-end-first order, extended to three relays.

## Plain switches and relays

| Kind | Pieces | How it moves |
| --- | --- | --- |
| Plain switch | `sw_m`, `sw_p` | Any time, powered or not. |
| Relay | `rE`, `r3`, `r2`, `r1` | Only while current reaches it (feed or a released cell); holds where it was thrown. |
| Breaker | `br_E`, `br_N` | Any time. |

## The map

25 nodes, 28 lines, no faults. Enoch brings two fuses. Feed capacity 4.

| Piece | What it is |
| --- | --- |
| `j0` → `sw_m` (plain) | Position 0: the `market` (2, target), lit at the start. Position 1: the input of `big`. So **`big` charges only while the market is dark.** |
| `big` (cell, 6 s) → `sw_p` (plain) | Position 0: the `lantern`, a dead end. Position 1: `r1`, the near end of the north chain. |
| `j0` → `small` (cell, 2 s) → `jE` | Always charging. Its far side meets the east section at `jE`. |
| East | `br_E` (open) → `fb_E` ≤1 → `jE` → relay `rE` [**forge 3** \| shrine 1]. |
| North | `br_N` (open) → `fb_N` ≤2 → relay `r3` [**mill 3** \| → `r2`] → relay `r2` [→ `jy` (**ovens 3**, and on to `r3`) \| → `r1`] → relay `r1` [→ `jx` (**kiln 3**, and on to `r2`) \| well 1]. |

Targets: market 2 + shrine 1 + well 1 = 4 = capacity.

The feed enters the north chain at `r3`, its far end; the big cell enters at `r1`, its near end. With the relays as they stand, the cell's current runs `r1` → `jx` → `r2` → `jy` → `r3` → mill, lighting the kiln, the ovens and the mill: three heavy lamps as a clock. Any relay still at 0 sends the feed into a load-3 lamp behind a ≤2 fuse, so the feed can't set any of them.

## The intended read

1. The map opens with the market lit. Both sections are dark; the relays refuse clicks (no current). `small` is filling; `big` is not (its input is the market switch's other side).
2. Throw `sw_p` to `r1` now. It's a plain switch and costs no window time.
3. `small` is full (2 s). Release it: the forge lights through `rE`. Throw `rE` to the shrine. The shrine lights by the cell's light, which doesn't complete the job.
4. Throw `sw_m` to `big`: the market goes dark and `big` starts filling. Wait 6 s. Throw `sw_m` back: the market relights and `big` keeps its charge.
5. Release `big`: the mill, ovens and kiln light. Throw **`r3`, then `r2`, then `r1`**, from the far end. Each throw darkens one heavy lamp; the last lights the well.
6. Close `br_N` and `br_E`. The feed runs through the set relays: well 1 on `fb_N`, shrine 1 on `fb_E`, market 2. Load 4 of 4. **Win.**

## The trap

**Near end first.** `r1` is the relay the big cell reaches first, and the one next to the well. Throw it first and the cell's current goes straight to the well; `r2` and `r3` go dark and refuse. The player has to throw `r1` back and start again from the far end: two wasted throws. At a click every 1.5 s that doesn't fit in 6 s, so the big cell runs flat and has to be refilled, which means darkening the market again for 6 s. It is readable (the heavy lamps go dark the moment `r1` moves) and recoverable (relays hold, and the cell refills).

Two quieter ones:

- **Releasing `big` with `sw_p` still at the lantern.** The lantern lights and nothing else does. Click the cell again to stop it early (it keeps what it has left), throw `sw_p`, release again. The lesson is to set the plain switches before the window, not in it.
- **Closing a breaker first.** `br_N` or `br_E` before the relays are set: the fuse blows (mill 3 on ≤2, forge 3 on ≤1). Leave it blown; the cells' paths don't run through the fuses. Repair it after the relays are set, and it holds. Two fuses cover one blow plus the instinctive repair-at-once re-blow (20-battery-run's lesson).

Why two cells and not one big one: the small cell is always ready, but 2 s is one throw. The big cell is the only one with room for three throws, and it only fills while the market is dark. The player has to see that `sw_m` is the big cell's charger, not just the market's switch.

## What this map tests

- Whether a cell that fills only while another section is dark reads as a cost (the market dark for 6 s), not a bug.
- Whether players tell plain switches from relays and set the plain ones outside the window.
- Whether 20-battery-run's far-end-first order carries over to a chain of three.

## Expected numbers (`npm run analyze` isn't built: brute force over the real simulator, `createGrid`/`advance`/`release`, at a click every 1.5 s)

- Nodes 25, lines 28, faults 0. Parts given: 2 fuses. Parts needed: none (one fuse per premature breaker).
- Fewest clicks to win: **11** (`sw_m`, `sw_p`, release `small`, `rE`, release `big`, `r3`, `r2`, `r1`, `sw_m`, `br_N`, `br_E`); the simulator's `actions` count reads 9, because releases are not actions. Fastest: about 16.5 s, with the cells filling during the clicks.
- Waits: `small` 2 s; `big` 6 s with the market dark. The intended run above completes at 20 s.
- Windows: `big` 6 s for 3 throws (4.5 s at 1.5 s a click); near-end-first needs 7.5 s and fails. At 1.0 s a click it fits. `small` 2 s for 1 throw.
- Winning control settings: **2 of 256** (both breakers closed, `sw_m` at the market, all four relays at 1; `sw_p` either way).
- Reachable states: 70,998, of which 40.8% can't win without Undo. Every one is a fuse dead end (both boxes blown with one fuse left, or one blown with none). None comes from a relay or a flat cell.
- First moves: all recoverable. `br_E` and `br_N` blow their fuses; dark relays refuse.

## What it taught us
