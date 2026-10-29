# 53 · Reach it from behind — design note

Two small sections, A and C, each on a fuse rated 2, each behind a relay set to a lamp of 3. Close either section's breaker and its fuse blows before the relay can be thrown. Between them is section B, on a fuse rated 5, with two tie breakers that reach each relay from the other side. B can carry a 3 for a moment, but only if it puts down its own load first.

**Element under test:** **relays** (ticket 008) and **which fuse**: a relay can be fed from any line that isn't one of its outputs, so the fuse that powers it while it's thrown needn't be the fuse that carries its lamp afterwards. The player borrows B's headroom to set A's and C's relays, one at a time, then hands each lamp back to its own fuse. No faults at all: the whole puzzle is routing and order.

## The map

25 nodes, 26 lines, 0 faults. Feed capacity 8. Enoch brings one fuse.

| Section | Path |
| --- | --- |
| A | `br_A` (open) → `fb_A` ≤2 → `jA1` → `jA2` → relay `r_1` [**mill 3** \| shrine 2] |
| B | `fb_B` ≤5 → `jB` → well (2); `jB` → `br_g` (closed) → relay `r_2` [**kiln 2** \| gate 2]; `jB` → `br_t1` (open) → `r_1`; `jB` → `br_t2` (open) → `r_3` |
| C | `br_C` (open) → `fb_C` ≤2 → `jC1` → `jC2` → relay `r_3` [**forge 3** \| chapel 2] |

Targets: shrine 2 + well 2 + gate 2 + chapel 2 = 8 = capacity. At the win: `fb_A` 2/2, `fb_B` 4/5, `fb_C` 2/2.

## The intended read

1. The map opens with the well and kiln lit on `fb_B` (4/5). `r_1` and `r_3` are dark and refuse. Closing `br_A` would put the mill's 3 on `fb_A`'s 2.
2. `r_1` has a second way in: `br_t1` from B. Through B the mill would be well 2 + kiln 2 + mill 3 = 7 of 5. So **open `br_g`** first (the kiln goes dark, B 2/5).
3. Close `br_t1`: the mill lights through B, 5/5. Throw `r_1` to the shrine (4/5). Open `br_t1` (the shrine goes dark) and close `br_A`: the shrine relights on its own fuse, `fb_A` 2/2.
4. The same for C: close `br_t2` (forge through B, 5/5), throw `r_3` to the chapel, open `br_t2`, close `br_C` (`fb_C` 2/2).
5. Close `br_g` (the kiln is back, B 4/5) and throw `r_2` to the gate (live from the start): B 4/5. Load 8 of 8. **Win.**

## The trap

The obvious first click is `br_A`, the breaker on the dark shrine's own section: the mill's 3 meets `fb_A`'s 2 and **`fb_A` blows** (culprit `mill`). Readable before (the relay drawn at the mill, rating 2) and after. Recoverable with the one fuse, but only at the end: leave it blown, do the B dance, and repair `fb_A` once `r_1` points at the shrine. Repairing it at once blows it again and spends the only fuse.

The second trap is the tie itself. Close `br_t1` without opening `br_g` and `fb_B` carries 7 of 5 and blows (culprit `mill`), taking the well with it. Same recovery: the spare, after the cause is fixed.

The third is subtler and is the reason the ties must be reopened. With `br_t1` still closed, closing `br_A` doesn't move the shrine: the tie route is the shorter one, so B keeps carrying it. **`fb_A`'s bar stays at 0 while `fb_B`'s shows the shrine.** Leave it there and `br_g`'s kiln later tips B to 6 of 5. Opening the tie hands the shrine over. The bars say all of this; the player has to look.

## What this map tests

- Whether "feed the relay from another side" is discoverable from the drawing (two lines into one relay).
- Whether players plan a borrow-and-return with fuse headroom, the most abstract move in the ladder so far.
- Whether the fuse bars make a handover visible: which fuse is carrying a lamp that two fuses could reach (12-which-fuse's "quieter detail", now load-bearing).

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 25. Lines: 26. Faults: 0. Parts given: 1 fuse. Parts needed: none (the fuse is a spare for one blow).
- Fewest actions to win: **11**. The analyzer's shortest line hands over without darkness: `br_g`, `br_t1`, `br_A` (the shrine stays on B), `r_1`, `br_t1` (now it moves to A), then the same for C, then `br_g`, `r_2`. 154 orderings reach the win in 11.
- Final load: **8 of 8**. Fuses at the win: `fb_A` 2/2, `fb_B` 4/5, `fb_C` 2/2. Peak on B during each borrow: 5/5.
- Winning control settings: **1 of 256** (`br_A`, `br_g` and `br_C` closed, both ties open, all three relays at position 1).
- Reachable states: 2408, of which 1888 can't win without Undo; every one has a fuse blown with no fuse left.
- First moves: `br_A`, `br_C`, `br_t1` and `br_t2` each blow a fuse (recoverable with the spare); `br_g` and `r_2` are safe; `r_1` and `r_3` refuse.

## What it taught us

