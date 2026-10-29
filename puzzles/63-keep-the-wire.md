# 63 · Keep the wire — design note

Two feeds. North's shrine sits behind a spring set to the forge, on a fuse rated 2. The cell that can set it reaches the spring only through a relay set to the mill. The cell is empty, and there are two ways to charge it. North's charging line runs from the market's switch and shows a spark the moment the market is shed: one wire, the only wire, and the obvious thing to spend it on. South's breaker reaches the same cell for free. The window then shows a second break, on the cell's own line, and only a player who kept the wire can mend it.

**Element(s) under test:** depth, on two feeds (version 5). Pieces: a scarce part and **look before you spend**, a battery that two feeds can charge (015, rule 5), a fault visible only by cell light, a relay then a spring in one window, the hand-over to the feed.

## The map

20 nodes, 20 lines, 2 faults. Version 5: North Lv4, South Lv3, top-level `capacity` null. Enoch brings one wire and one fuse. Cell: 7 s, starts empty.

| Piece | What it is |
| --- | --- |
| North | `jN` → plain switch `sw_x` [market 2 (target) \| `jc` → **`l_c2` damaged** → `jX`] |
| Cell | `jX` → `cell` (7 s) → **`l_cA` damaged** → relay `rA` [**mill 3** \| → spring `S`] |
| North's front way | `br_S` (open) → `fb_S` ≤2 → spring `S` [**forge 3** (file) \| shrine 2 (target)] |
| South | `south` → well 2, and `jS` → inn 1 (target); `jS` → `br_o` (open) → `jo` → `jX` |

Targets: market 2 + shrine 2 on North (4 of 4), inn on South. The well (2) is a priority home on South (2 + 1 = 3 of 3).

## The intended read

1. North lights the market (2 of 4), South the well and inn (3 of 3). The shrine's spring is dark and set to the forge; `br_S` would put the forge on ≤2. The cell is empty.
2. Two lines reach the cell's junction `jX`: North's, behind the market's switch, and South's, behind `br_o`. Close **`br_o`**: the cell charges from South (a battery draws no load, so South stays at 3 of 3). From this side `l_c2` sparks too. Leave it.
3. Wait 7 s. Release. Nothing new lights: **`l_cA` sparks** at the cell's mouth. Wire it (the wire you kept): the mill lights by cell light.
4. Throw `rA` on to `S`: the forge lights. Throw `S` to the shrine.
5. Before the window ends, close `br_S`: shrine 2 on `fb_S` 2/2, the feed holds `S`. North 4 of 4, South 3 of 3. **Win.**

## The layers

1. **The front way blows** (forge 3 on ≤2), and a spring can't be thrown dark. Unlocks: the cell, which reaches `S` only through `rA`.
2. **The cell is empty.** Two ways to charge it; one costs the market and the wire, one costs nothing. Unlocks: a full cell with the wire still in hand.
3. **The cell's own line is broken,** visible only once it is released. Unlocks: current at `rA`, if the wire was kept.
4. **The relay, then the spring:** `rA` before `S`, because the cell reaches `S` only through `rA`. Unlocks: the shrine by cell light.
5. **The hand-over** before the window ends. Unlocks: the win.

## The trap

**Spending the wire on the first spark.** Shedding the market to charge from North is the move 60 and 62 taught, and it shows `l_c2` sparking: a break between the feed and an empty cell. Wire it and the cell does charge, but the map is already lost: the window will show `l_cA`, and there is no wire left. Readable when it bites (the spark on the cell's line, *needs wire ×1, have 0*), and the earlier spending is on the log. Recovery is Undo. The deduction that avoids it is on the map from the start: `br_o` is a second, free line to the same junction, and a scarce part shouldn't be spent while a free route exists and the far side of the cell is still unseen.

**`br_S` first:** `fb_S` blows (culprit `forge`). Recoverable with the fuse at the end of the window, in place of `br_S`.

**Waiting in the window** after `S`: the spring lets go when the cell runs flat. `br_o` is still closed, so the cell refills by itself; relays hold, the wire stays fitted, and `S` and `br_S` are all that's left.

## What this map tests

- Whether players read **both** ways to a battery before choosing one, two maps after being taught to shed for charge.
- Whether a dead end that only shows later is fair when the deciding fact (a free route) was on the map from the start. If it plays as a cheat, the first thing to give back is a second wire.
- 015 rule 5 (a battery charges from any feed) as a puzzle fact, not a footnote.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid` with time: every click is followed by 1 s, a wait is 0.5 s. Undo and Reset excluded.

- Nodes 20, lines 20, faults 2 (`f_c2`, `f_cA`). Parts given: wire, fuse. Parts needed: wire (on `l_cA`). `l_c2` stays broken.
- Faults readable at start: 0 of 2. `l_c2` shows when the market is shed or `br_o` closes; `l_cA` only by cell light.
- Fewest clicks to win: **6** (`br_o`, wait 7 s, release, wire `l_cA`, `rA`, `S`, `br_S`).
- Winning orders (distinct minimum-length click sequences, waits not counted): **1**.
- Window: 7 s for 4 clicks; the intended run also finishes at 1.5 s a click, with 1 s to spare.
- Winning control settings: 4 of 32.
- Reachable states: 3,032, of which 1,268 (**41.8%**) can't win without Undo. Every state after the wire goes into `l_c2` is one of them.
- First moves: `br_S` blows `fb_S` (recoverable, 7 clicks to win from there). `br_o` is right. `sw_x` is safe on its own (8 clicks to win from there); the dead end is the wire after it. `rA` and `S` refuse; the cell refuses while empty.

## What it taught us
