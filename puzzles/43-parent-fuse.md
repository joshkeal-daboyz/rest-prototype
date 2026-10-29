# 43 · The fuse above the fuse — design note

Two fuse boxes hang under a bigger one. The small one nearest the dark shrine has room for it, exactly 2 of 2, and its breaker is a click away. The fuse box *above* it doesn't have room.

**Element under test:** **nested fuses** (the brief's element 5, *which fuse*, with a second level). A child fuse's bar can show room while its parent is full; moving a load between two children of the same parent doesn't relieve the parent. The solution is a chain of forced moves, worked back from the one target that has only one route. Supporting: "set it in the dark" (36) on the second parent, a hidden break and a hidden dead lamp.

## The map

27 nodes, 28 lines, 2 faults. Feed capacity 8. Enoch brings a wire, a bulb and a fuse.

| Parent | Child | Switch: position 0 / position 1 |
| --- | --- | --- |
| `fb_P` ≤4 | `fb_1` ≤3 → `j1` → well (1), then `s_1` | forge (2, priority) / shrine post `pX` along `l_1X` (**damaged**) |
| | `br_2` (open) → `fb_2` ≤2 → `s_2` | gate post `pY` / **shrine post `pX`** (as set) |
| `br_Q` (open) → `fb_Q` ≤4 | `fb_3` ≤2 → `s_3` | **gate post `pY`** (as set) / bell (2, **dead lamp**) |
| | `fb_4` ≤4 → `j4` → lift (2), and `br_k` (closed) → kiln (2) | (no switch) |

Targets: well 1, shrine 2, gate 1, bell 2, lift 2 = 8 = capacity = `fb_P` 4 + `fb_Q` 4.

## The intended read

1. The map opens with the well and forge lit on `fb_1` (3/3); `fb_P` 3/4. The south is dark behind `br_Q`.
2. Work back from the target with one route: the **bell** can only come from `fb_3` through `s_3`. So `s_3` goes to the bell, so the **gate** must come from `fb_2` (`s_2` to `pY`), so the **shrine** must come from `fb_1` (`s_1` to `pX`), so the forge goes dark. North: well 1 + shrine 2 + gate 1 = 4 of 4. South: bell 2 + lift 2 = 4 of 4, so the kiln goes dark.
3. Throw `s_1` to the shrine. The forge goes dark and `l_1X` sparks. Repair it: the shrine lights, `fb_1` 3/3.
4. Throw `s_2` to the gate post (in the dark), then close `br_2`: the gate lights, `fb_2` 1/2, `fb_P` 4/4.
5. Open `br_k` and throw `s_3` to the bell, both before the south has power. Close `br_Q`: the lift lights (`fb_4` 2/4), the bell flickers red. Bulb on the bell: `fb_3` 2/2, `fb_Q` 4/4. Load 8 of 8. **Win.**

## The trap

The shrine is dark and `s_2` already points at it. Close `br_2` and the shrine lands on `fb_2`, 2 of 2, which holds. But `fb_P` now carries well 1 + forge 2 + shrine 2 = 5 of 4, and **the parent blows** (culprit `shrine`): the whole north goes dark, the well with it. Readable before (`fb_P`'s bar at 3/4, the shrine marked 2) and after (the ✕ on the big box, not the small one). Recoverable with the one fuse: throw `s_2` to the gate post, then repair `fb_P`.

The south repeats 36's lesson: close `br_Q` as set and `fb_Q` carries lift 2 + kiln 2 + gate 1 (through `s_3`) = 5 of 4 and blows (culprit `lift`). Set `br_k` and `s_3` first. Both traps together cost more than the one fuse; then it's Undo.

## What this map tests

- Whether players read two bars at once: a child with room under a full parent (ticket 012's load bar, one level up).
- Whether "work back from the target with no choice" emerges as the way in (GDD review finding 1, deduction).
- Whether a blown parent (a whole branch dark) reads as one cause, not many.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 27. Lines: 28. Faults: 2 (`f_1X`, `f_bell`). Parts given: wire, bulb, fuse. Parts needed: wire, bulb (the fuse is a spare).
- Faults readable at start: 0 of 2. `f_1X` shows when `s_1` turns to the shrine; `f_bell` once the south is live with `s_3` on the bell.
- Fewest actions to win: **8** (`s_1`, repair `l_1X`, `s_2`, close `br_2`, open `br_k`, `s_3`, close `br_Q`, bulb on `bell`). The order is loose apart from the two "set before powering" pairs: 2590 orderings reach the win in 8.
- Final load: **8 of 8**. Fuses at the win: `fb_P` 4/4, `fb_1` 3/3, `fb_2` 1/2, `fb_Q` 4/4, `fb_3` 2/2, `fb_4` 2/4.
- Winning control settings: **1 of 64** (`br_2` and `br_Q` closed, `br_k` open, `s_1` at the shrine, `s_2` thrown from the shrine to the gate, `s_3` at the bell).
- Reachable states: 1756, of which 944 can't win without Undo; every one has a parent or child fuse blown with no fuse left.
- First moves: `br_2` blows `fb_P` and `br_Q` blows `fb_Q` (each recoverable with the spare); the others are safe.

## What it taught us

