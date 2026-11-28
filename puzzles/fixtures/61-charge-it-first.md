# 61 · Charge it first — design note

The shrine is at the end of two relays, both set to heavy lamps, and only a cell can reach the first one. The cell is empty, and the relay that would let it charge is itself set to the smithy behind a fuse rated 2. So the order runs backwards from the shrine: borrow the bakery's line to set the charging relay, charge, put the bakery back, release, walk the two relays, then let the feed in. And the shrine's bulb turns out to be dead.

**Element(s) under test:** depth. Pieces: relays (only move live; hold), a battery whose charging is gated by a relay, a borrow through a plain switch, fuse ratings, a relay chain walked in a window, a dead lamp.

## The map

17 nodes, 18 lines, 1 fault. Feed capacity 4. Enoch brings a bulb and a fuse. Cell: 4 s, starts empty.

| Piece | What it is |
| --- | --- |
| Bakery | plain switch `sw_b` [bakery 2 (target) \| tie → `jt` → relay `rC`'s far side] |
| Charging | `br_C` (open) → `fb_C` ≤2 → relay `rC` [**smithy 3** \| `cell`'s input] |
| Cell | `cell` (4 s) → relay `rA` [**mill 3** \| → `rB`] |
| Shrine | `br_R` (open) → `fb_R` ≤2 → relay `rB` [**kiln 3** \| shrine 2 (target, **dead lamp**)] |

Targets: bakery 2 + shrine 2 = 4 = capacity.

## The intended read

1. The bakery is lit (2 of 4). Every relay is dark and set to a heavy lamp behind a fuse rated 2. The cell is empty; its input is `rC`'s other position.
2. `br_C` would blow `fb_C` (smithy). Borrow instead: throw `sw_b` to the tie. The bakery goes dark; `rC` is live (smithy 3 of 4, no fuse on the tie).
3. Throw `rC` to the cell. The smithy goes dark and the cell fills through the tie. Wait 4 s.
4. Put the bakery back (`sw_b`). `rC` holds; the cell keeps its charge.
5. Release. The mill lights by cell light. Throw `rA`: the kiln lights. Throw `rB`: the shrine flickers red, **a dead lamp**. The window ends; the relays hold.
6. Close `br_R` (the shrine is dead, so `fb_R` carries 0) and fit the bulb: shrine 2 on `fb_R` 2/2. Load 4 of 4. **Win.**

## The layers

1. **The shrine's own way blows** (kiln 3 on ≤2), so `rB` needs the cell's current. Unlocks: the cell.
2. **The cell can't charge** while `rC` points at the smithy, and `rC`'s own way blows (smithy 3 on ≤2). Unlocks: the bakery's tie, the only safe way to make `rC` live.
3. **Charge and hand back:** set `rC`, fill the cell, return the bakery. Unlocks: a full cell with the bakery lit.
4. **The window walks the chain:** `rA` before `rB` (the cell reaches `rB` only through `rA`). Unlocks: `rB` on the shrine, and the sight of its dead bulb.
5. **Let the feed in, then the bulb.** Unlocks: the win.

## The trap

**`br_R` first** (the breaker on the shrine's own line): the kiln meets `fb_R` ≤2, **`fb_R` blows** (culprit `kiln`). Recoverable with the fuse once `rB` is set.

**`br_C` first:** the smithy blows `fb_C`. Recoverable without spending anything: the tie doesn't run through `fb_C`, so the borrow still works, and `fb_C` is never needed again. Fitting the fuse here, though, re-blows it (the hover warns) and leaves no spare if `fb_R` blows later.

**`br_R` between `rA` and `rB`:** `rB` is still on the kiln, so `fb_R` blows. The order inside the window is the lesson: the feed comes in after the last relay.

## What this map tests

- Working a chain **backwards** from the target: what does `rB` need, what does that need, and so on to the bakery's switch.
- Whether a borrow that sets a *charging* relay (rather than the target's own relay) reads as the same idea as 57.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid` with time: every click is followed by 1 s, a wait is 0.5 s. Undo and Reset excluded.

- Nodes 17, lines 18, faults 1 (`f_shrine`). Parts given: bulb, fuse. Parts needed: bulb (the fuse is the spare).
- Faults readable at start: 0 of 1. The dead shrine shows in the window, after `rB`.
- Fewest clicks to win: **8** (`sw_b`, `rC`, wait 4 s, `sw_b`, release, `rA`, `rB`, `br_R`, bulb).
- Winning orders (distinct minimum-length click sequences, waits not counted): **9**. The chain `sw_b` → `rC` → (charge) → release → `rA` → `rB` is fixed. The freedom: when the bakery goes back (before the release, inside the window, or at the end), and the bulb either side of `br_R`.
- Window: 4 s for 2 throws; the intended run also finishes at 1.5 s a click.
- Winning control settings: 8 of 64 (`rA`, `rC` and `br_C` don't matter once the shrine is fed).
- Reachable states: 12,544, of which 3,600 (**28.7%**) can't win without Undo.
- First moves: `br_C` blows `fb_C` and `br_R` blows `fb_R` (each recoverable, 9 clicks to win from there). `sw_b` is right. All relays refuse; the cell refuses while empty.

## What it taught us
