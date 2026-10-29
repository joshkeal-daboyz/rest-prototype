# 57 · The back door — design note

The deep tier's first map, and its gentlest: three layers. The shrine is behind a relay set to the forge, and the relay's own way in is a fuse rated 2. Close that breaker and the fuse blows before the relay can move. The relay has a back door: the homes' switch can send their current down a long tie into the relay's far side. The tie is broken where nobody could see it, and the homes are a target, so the back door has to be shut again once the relay is set.

**Element(s) under test:** depth (the tier's subject): each fix opens the next problem. Pieces: a relay (only moves live, holds), a fuse rating, a fault hidden behind a plain switch, capacity.

## The map

11 nodes, 11 lines, 1 fault. Feed capacity 5. Enoch brings a wire and a fuse.

| Piece | What it is |
| --- | --- |
| `j0` | well (1, target), always lit |
| Front way | `br_T` (open) → `fb_T` ≤2 → relay `rT` [**forge 3** \| shrine 2 (target)] |
| Homes | plain switch `sw_h` [homes 2 (target) \| tie `l_t1` → `jt` → **`l_t2` damaged** → `rT`'s far side] |

Targets: well 1 + homes 2 + shrine 2 = 5 = capacity.

## The intended read

1. The well and the homes are lit (3 of 5). The shrine is dark; `rT` is dark and refuses; it points at the forge (3), and its fuse is rated 2.
2. Feeding `rT` from the front means the forge on ≤2. So look for another way in: the homes' switch has a second line that runs to `rT`'s far side. Throw `sw_h`: the homes go dark, and **`l_t2` sparks** next to the relay.
3. Wire it. `rT` is live through the tie (no fuse on it); the forge lights (well 1 + forge 3 = 4 of 5).
4. Throw `rT` to the shrine. The shrine lights by the tie.
5. Hand it back: close `br_T` (shrine 2 on ≤2 holds) and throw `sw_h` back to the homes. The relay holds. Load 5 of 5. **Win.**

## The layers

1. **The front way blows.** `rT` can only move live, and the front way puts the forge on ≤2. Unlocks: looking for another way to make `rT` live.
2. **The back door is broken.** The tie's break is invisible until `sw_h` sends current down it. Unlocks: a live relay, once the wire goes in.
3. **The back door must close.** The homes are a target and the tie costs them, so the shrine has to go back to its own fuse: set `rT`, close `br_T`, return `sw_h`. Unlocks: the win.

## The trap

**`br_T` first.** It is the breaker on the shrine's own line, and it's the obvious click on a dark map. The forge meets `fb_T` (≤2): **`fb_T` blows** (culprit `forge`). Readable: the ✕ on the box, the notice names the forge, and `rT` is still dark. Recoverable: leave it blown, go through the back door, set `rT`, then fit the fuse; it holds at 2/2. The win from there is 6 clicks.

Fitting the fuse at once, with `rT` still on the forge, re-blows it (the hover warns *would blow again: 3 load on ≤2*) and the only fuse is gone: a dead end, Undo.

The quieter mistake is the last one: leaving `sw_h` on the tie. The shrine is lit but the homes are dark; the priests' list shows it.

## What this map tests

- Whether a three-step chain (blow → back door → hand back) reads as one plan or as trial and error.
- Whether a fault hidden behind a plain switch is found by asking "what else reaches this relay?"

## Expected numbers

`npm run analyze` can't run: `tools/analyze.ts` doesn't exist in this worktree. Numbers are from a brute-force search over the real `createGrid` (every reachable state, Undo and Reset excluded).

- Nodes 11, lines 11, faults 1 (`f_t2`). Parts given: wire, fuse. Parts needed: wire (the fuse is the spare for the trap).
- Faults readable at start: 0 of 1.
- Fewest clicks to win: **5** (`sw_h`, wire `l_t2`, `rT`, `br_T`, `sw_h`).
- Winning orders (distinct click sequences of the minimum length): **2**. The first three clicks have one order; the last two (`br_T`, `sw_h`) can swap.
- Winning control settings: 1 of 8.
- Reachable states: 38, of which 12 (**31.6%**) can't win without Undo.
- First moves: `br_T` blows `fb_T` (recoverable, 6 clicks to win from there). `sw_h` is the right one. `rT` refuses.

## What it taught us
