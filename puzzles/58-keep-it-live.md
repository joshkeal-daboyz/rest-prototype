# 58 · Keep it live — design note

57's back door, but the switch behind it is a **spring**. A spring switch only stays thrown while current reaches it, so the back door can't simply be shut once the switch is set: shut it and the switch snaps back to the forge. The front way has to be holding the spring before the back door lets go, and the front way still blows if it goes in too early. Behind the spring, a break that nothing could reach until the spring was thrown.

**Element(s) under test:** depth. Pieces: a spring switch (only thrown live; returns to its file position when no current reaches it), a fuse rating, a fault hidden past a switch, the order of a hand-over.

## The map

11 nodes, 11 lines, 1 fault. Feed capacity 5. Enoch brings a wire and a fuse.

| Piece | What it is |
| --- | --- |
| `j0` | well (1, target) |
| Front way | `br_A` (open) → `fb_A` ≤2 → **spring** `S` [**forge 3** (file) \| shrine 2 (target), **`l_shrine` damaged**] |
| Mill | plain switch `sw_m` [mill 2 (target) \| tie → `jt` → `S`'s far side] |

Targets: well 1 + mill 2 + shrine 2 = 5 = capacity.

## The intended read

1. Well and mill lit (3 of 5). `S` is dark, coiled ribbon, set to the forge. `br_A` would put the forge on ≤2.
2. Back door: throw `sw_m`. The mill goes dark; `S` is live through the tie and the forge lights (4 of 5).
3. Throw `S` to the shrine. Nothing lights: **`l_shrine` sparks**. Wire it; the shrine lights through the tie.
4. Now the front way is safe: close `br_A`. `S` is live from both sides; whichever carries the shrine, `fb_A` never sees more than 2.
5. Throw `sw_m` back to the mill. `S` stays thrown, because `br_A` keeps it live; the shrine is on `fb_A` 2/2. Load 5 of 5. **Win.**

## The layers

1. **The front way blows** (forge 3 on ≤2). Unlocks: the back door, the only safe way to make `S` live.
2. **The spring can only be thrown live,** and the back door is what makes it live. Unlocks: the shrine side of `S`, and the break behind it.
3. **A break behind the spring,** unreadable until `S` points at it. Unlocks: the shrine, once wired.
4. **The hand-over.** The mill is a target, so the back door has to close, and a spring lets go when its current goes. `br_A` must be closed while the tie is still holding `S`. Unlocks: the win.

## The trap

**Shutting the back door first.** 57 taught "set the relay, shut the back door". Here, throw `sw_m` back before `br_A` is closed and **`S` springs back to the forge** (the coiled ribbon snaps, the shrine goes dark, the mill lights). Readable, and recoverable with no part spent: `sw_m` again, `S` again, then `br_A` first. The fix costs 2 clicks.

**`br_A` first** (the obvious click): `fb_A` blows (culprit `forge`). Recoverable with the fuse, but this is where the hand-over bites twice. The fuse has to go in **while the tie is still holding `S`** on the shrine. Fit it after letting go and `S` has already sprung back to the forge: it re-blows, and the only fuse is gone (dead end, Undo). The hover warns *would blow again* in that state.

## What this map tests

- Whether "a spring lets go when its current goes" turns into planning a hand-over, not just a surprise.
- Whether a habit from 57 (shut the back door once the switch is set) is caught by the spring ribbon.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid`, Undo and Reset excluded.

- Nodes 11, lines 11, faults 1 (`f_sh`). Parts given: wire, fuse. Parts needed: wire.
- Faults readable at start: 0 of 1.
- Fewest clicks to win: **5** (`sw_m`, `S`, wire `l_shrine`, `br_A`, `sw_m`).
- Winning orders (distinct minimum-length click sequences): **3**. `sw_m` → `S` → `br_A` → `sw_m` is fixed; the wire can go in at any point after `S`.
- Winning control settings: 1 of 8.
- Reachable states: 44, of which 12 (**27.3%**) can't win without Undo.
- First moves: `br_A` blows `fb_A` (recoverable, 6 clicks to win from there). `sw_m` is right. `S` refuses (dark spring).
- The spring trap (`sw_m`, `S`, `sw_m`): `S` springs back, still winnable in 5 more.

## What it taught us
