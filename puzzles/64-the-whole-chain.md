# 64 · The whole chain — design note

The tier's capstone, built on the chain Josh asked for: a spring switch needs a cell to hold it, the cell needs a section shed to charge, the shed exposes a hidden fault, and the fix for that fault changes which feed carries a lamp. Then the window has a relay to walk before the spring, the feed has to take the spring before the cell runs flat, and the shrine's bulb turns out to be dead.

**Element(s) under test:** depth, everything at once, on two feeds (version 5). Pieces: a spring held by a cell, a relay in the window, a battery charged by shedding a target, a fault hidden behind the shed, *nearest feed carries it* moving a lamp onto a small fuse when a cable is mended, a one-way tie switch as the open point, a dead lamp, fuse ratings.

## The map

26 nodes, 26 lines, 2 faults. Version 5: North Lv4, South Lv3, top-level `capacity` null. Enoch brings a wire, a fuse and a bulb. Cell: 5 s, starts empty.

| Piece | What it is |
| --- | --- |
| North | `jN` → plain switch `sw_x` [market 2 (target) \| `fb_c` ≤1 → **`l_c2` damaged** → `jX`] |
| Cell | `jX` → `cell` (5 s) → relay `rA` [**mill 3** \| → spring `S`] |
| The tie | `jX` → plain switch `sw_t` [→ `jW` (file position) \| lantern 1] |
| North's front way | `br_S` (open) → `fb_S` ≤2 → spring `S` [**forge 3** (file) \| shrine 2 (target, **dead lamp**)] |
| South | `south` → `jS` (inn 1, target) → five junctions round the ward → `jW` (well 2, target) |

Targets: market 2 + shrine 2 on North (4 of 4), inn 1 + well 2 on South (3 of 3).

The tie is a switch, so current only goes *out* of it: South reaches `jW` but can never come back up the tie to `jX`. North, once `l_c2` is mended, reaches `jW` in 6 hops; South in 7.

## The intended read

1. North lights the market (2 of 4), South the inn and well (3 of 3). The shrine's spring is dark and set to the forge; `br_S` would put the forge on ≤2. The cell is empty; its only way in is the market's other position.
2. Shed the market: throw `sw_x`. The current runs into `fb_c` and stops: **`l_c2` sparks**.
3. Before mending it, count: past `l_c2`, the tie leads to the well's junction, 6 hops from North against 7 from South. Mend it as it stands and the well moves to North, through `fb_c` ≤1. So **throw `sw_t` to the lantern** first.
4. Wire `l_c2`. The cell charges; the lantern lights on North (`fb_c` 1/1). Wait 5 s. Put the market back (`sw_x`): the lantern goes dark, the cell keeps its charge.
5. Release. The mill lights by cell light. Throw `rA` on to `S`: the forge lights. Throw `S` to the shrine: it **flickers red**, a dead lamp.
6. Before the window ends, close `br_S` (the dead shrine is 0 on `fb_S`; the feed now holds `S`). Fit the bulb: shrine 2 on `fb_S` 2/2. North 4 of 4, South 3 of 3. **Win.**

## The layers

1. **The front way blows** (forge 3 on ≤2), and a spring can't be thrown dark. Unlocks: the cell.
2. **The cell charges only with the market shed.** Unlocks: the charging line, and what is on it.
3. **The shed shows a break** that nothing could reach before. Unlocks: the charging line, once mended.
4. **The mend would move the well** from South to North's ≤1 charging fuse (nearest feed). Unlocks: throwing the tie to the lantern before the wire goes in.
5. **Charge, then give the market back.** Unlocks: a full cell with North's targets lit.
6. **The window walks a relay, then the spring.** The cell reaches `S` only through `rA`. Unlocks: `S` on the shrine, and the sight of the dead bulb.
7. **The hand-over** before the window ends, then the bulb. Unlocks: the win.

## The trap

**Mending the spark at once.** It is the obvious move: the break sits between the feed and an empty cell, and Enoch has the wire. With the tie still on the well, North takes the well (6 hops against 7) and **`fb_c` blows** (well 2 on ≤1; culprit `well`). Readable: the notice names the well, which is drawn on South's side, and the path runs through the tie. Recoverable with the fuse: throw `sw_t` to the lantern, then fit it (it holds at 1/1). The wire stays fitted. After that the fuse is gone, so the next blow needs Undo.

**`br_S` first** (the obvious first click): `fb_S` blows (culprit `forge`). Recoverable with the fuse inside the window, in place of `br_S`. One fuse covers one of the two traps, not both.

**`S` before `rA`** isn't possible: `S` is dark until `rA` points at it. **Waiting in the window** lets `S` spring back; the wire and the relay hold, so the cost is a recharge with the market dark again.

## What this map tests

- Whether a seven-step chain where every step is forced by the one before reads as a plan the player builds forward, without the map naming which earlier lesson applies.
- Whether the carrier shift is foreseen by counting hops (the tie switch is the tell), or learned from the blow notice.
- The ceiling of the tier: if it plays as trial and error, the first thing to give back is a second fuse.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid` with time: every click is followed by 1 s, a wait is 0.5 s. Undo and Reset excluded.

- Nodes 26, lines 26, faults 2 (`f_c2`, `f_shrine`). Parts given: wire, fuse, bulb. Parts needed: wire, bulb (the fuse is the spare).
- Faults readable at start: 0 of 2. `l_c2` shows with the shed; the dead shrine in the window, after `S`.
- Fewest clicks to win: **9** (`sw_x`, `sw_t`, wire `l_c2`, wait 5 s, `sw_x`, release, `rA`, `S`, `br_S`, bulb).
- Winning orders (distinct minimum-length click sequences, waits not counted): **16**. The chain shed → mend → charge → release → `rA` → `S` → `br_S` is fixed. The freedom: `sw_t` before or after the shed (it must come before the wire), when the market goes back, and the bulb either side of `br_S`.
- Window: 5 s for 3 clicks; the intended run also finishes at 1.5 s a click, with 0.5 s to spare.
- Winning control settings: 4 of 32.
- Reachable states: 4,748, of which 1,720 (**36.2%**) can't win without Undo.
- First moves: `br_S` blows `fb_S` (recoverable, 10 clicks to win from there). `sw_x` and `sw_t` are both right. `rA` and `S` refuse; the cell refuses while empty.
- Faults: 2. The depth is in the order, not the count; the whole tier stays within the designer's 8-fault limit (no map has more than 2).

## What it taught us
