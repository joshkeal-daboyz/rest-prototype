# 49 · Thrown twice — design note

Three relays make a ring between a north feeder and a south feeder, and every link in the ring runs past a heavy lamp. The ring's open points are the relays themselves: the shrine relay `rB` must open the ring on the north side, and the gate relay `rC` on the south. The cell enters the ring at `rB`, and the only way its current reaches `rA` is round through `rC`'s crossed position. So `rC`, which is already right at the start (it lights the gate), has to be thrown away and back, inside one window, in the only order that works: **C, A, C, B**.

**Element under test:** the battery as temporary power for relays (ticket 008), as an **order puzzle**: each throw re-routes the cell's own current, so the order of throws is everything. Supporting: a ring whose open points are set by relays (element 6), and a tight window.

## Plain switches and relays

| Kind | Pieces | How it moves |
| --- | --- | --- |
| Plain switch | `sw_S` | Any time, powered or not. |
| Relay | `rA`, `rB`, `rC` | Only while current reaches it; holds where it was thrown. |
| Breaker | `br_N` | Any time. |

## The map

18 nodes, 20 lines, no faults. Enoch brings two fuses. Feed capacity 3.

| Piece | What it is |
| --- | --- |
| `j0` → `cell` (7 s) → `rB` | Always charging. The cell's far side meets the ring at `rB`. |
| North feeder | `br_N` (open) → `fb_N` ≤2 → relay `rA` [**mill 3** \| → `rB`]. |
| South feeder | `sw_S` (plain) [`homes` 1, priority, lit \| `fb_S` ≤1] → relay `rC`. |
| The ring | `rB` [→ `jL` (**kiln 3**) → `rC` \| shrine 2]; `rC` [gate 1 \| → `jM` (**forge 3**) → `rA`]. |

Targets: shrine 2 (north) + gate 1 (south) = 3 = capacity. The homes go dark.

At the start the cell's current runs `rB` → `jL` → kiln, and `jL` → `rC` → gate. Every relay still in the wrong place feeds a heavy lamp: the north blows on the mill or the kiln, and the south on the forge.

## The intended read

1. The map opens with the homes lit. The relays refuse (dark). The cell fills: 7 s.
2. Release it: the kiln and the gate light. `rB` and `rC` are live; `rA` isn't (its inputs come from `fb_N` and from `jM`, and `rC` is pointing at the gate, not `jM`).
3. **`rC` to the forge side.** The gate goes dark; the forge and, through `rA`, the mill light. `rA` is live.
4. **`rA` to `rB`.** The mill goes dark.
5. **`rC` back to the gate.** The forge goes dark, the gate relights. `rA` is dead again, and it holds.
6. **`rB` to the shrine** last, because it cuts the cell off from everything else. The shrine lights by cell light.
7. Close `br_N` (shrine 2 on `fb_N` ≤2), throw `sw_S` to the fuse (gate 1 on `fb_S` ≤1). Load 3 of 3. **Win.**

## The trap

**The relay that's already right.** At the start `rC` points at the gate, a target, and looks finished. The player who leaves it alone can't reach `rA` at all. The one who reads the arrows sees that the cell's only way to `rA` is through `rC`'s other position, and that it has to come back afterwards.

**Far end first, done blindly.** 47 and 33 taught "far end first", and here that gives C, A, B: `rC` is left crossed. When the south comes on, it runs `rC` → `jM` → forge: 3 on ≤1, and **`fb_S` blows** (culprit forge). It is readable (the forge was lit by cell light all through the window, and the notice names it) and recoverable: open `br_N`, recharge, release, throw `rB` back (the cell reaches `rC` again through the kiln junction), `rC`, `rB`, close `br_N`, fit a fuse.

**`rB` first.** It's the relay the cell reaches and the one next to the shrine. Throw it and the cell lights the shrine and nothing else, and every other relay goes dark. Throw it back; at 1.5 s a click the window no longer holds the four throws, so the cell is refilled.

**`br_N` first** blows `fb_N` (mill). Leave it, set the ring, then fit a fuse. Two fuses cover a repair-at-once re-blow.

A shortcut that costs a fuse: with `sw_S` on, the feed reaches `rC` and can throw it itself. That blows `fb_S` at once (forge), but `rC` stays thrown, and the cell's window is then one throw shorter. The search finds it as the fastest line. It is legitimate, readable, and paid for with a part.

## What this map tests

- Whether players read relay arrows well enough to see that a relay must be thrown away and back.
- Whether a ring's open points being set by relays (not a breaker, as in 27-open-point) reads as the same idea.
- Whether a 7 s window for four throws is tight but fair.

## Expected numbers (`npm run analyze` isn't built: brute force over the real simulator, `createGrid`/`advance`/`release`, at a click every 1.5 s)

- Nodes 18, lines 20, faults 0. Parts given: 2 fuses. Parts needed: none.
- Fewest clicks to win: **7** (release, `rC`, `rA`, `rC`, `rB`, `br_N`, `sw_S`); `actions` reads 6. Wait: 7 s to fill. The intended run completes at 16 s. The only four-throw order inside the window is C, A, C, B.
- Fastest: about 15 s, by the fuse-spending shortcut above.
- Window: 7 s for 4 throws (6 s at 1.5 s a click). A wasted pair (8 s with the release) fails at 1.5 s a click and fits at 1.0 s. Relays hold, so a player can also split the job across two charges.
- Winning control settings: **1 of 32** (`br_N` closed, `sw_S` to the fuse, `rA`, `rB` at 1, `rC` at 0).
- Reachable states: 7,089, of which 39.6% can't win without Undo. All are fuse dead ends; none comes from a relay or a flat cell.
- First moves: `br_N` blows `fb_N` (recoverable); `sw_S` is safe; dark relays refuse.

## What it taught us
