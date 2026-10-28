# 27 · The open point — design note

Rung 27, the ladder's second ring after 13. The square's ring main is dark: a loop of four posts with the shrine, the gate and the well on it, fed from two sides, each through a fuse rated 2. The ring carries 4. Neither fuse can carry the whole ring, so the ring has to be split, and the split point the map gives you is a break you will want to repair.

**Element under test:** the brief's element 6, **ring main**: a loop fed from two sides by two switches, where a fault's effect depends on the switches. Here the lesson is the inverse of "repair what sparks": on a ring, a break can be the open point that keeps each feeder within its fuse. Supporting elements: one scarce wire (element 7) and a hidden dead lamp (element 3).

## The map

19 nodes, 20 lines, 3 faults. Feed capacity 4. Enoch brings a wire, a bulb and a fuse.

| Piece | What it is |
| --- | --- |
| `fb_N` ≤2 → `sw_N` | North feeder. Position 0: the `mill` (2, priority). Position 1: ring post `rN`. |
| `fb_S` ≤2 → `sw_S` | South feeder. Position 0: the `bakery` (2, priority). Position 1: ring post `rS`, along `l_S_ring`, which is **damaged** (`f_feedS`). |
| The ring | `rN` – `r1` (shrine 2) – **break `f_ring`** – `r2` (gate 1) – `rS` – `r3` (well 1, **dead lamp** `f_well`) – `br_ring` (closed) – `rN`. |

Targets: shrine 2 + gate 1 + well 1 = 4 = capacity, so the mill and bakery both go dark.

## The intended read

1. The map opens with the mill and bakery lit (4 of 4; both fuse bars full at 2/2). The ring is dark. Count: the ring holds 4; each feeder carries 2. Each feeder must take half the ring: the north the shrine (2), the south the gate and the well (1 + 1).
2. Find the split. The north half and the south half meet in two places: the break between `r1` and `r2`, and `br_ring` between `r3` and `rN`. **Open `br_ring`.** Nothing visible changes (the ring is dark).
3. Throw `sw_N` to the ring. The mill goes dark, the shrine lights, `fb_N` 2/2. Current runs from `r1` up to the break, which **sparks**. Load 4 of 4 (shrine and bakery).
4. Throw `sw_S` to the ring. The bakery goes dark, and `l_S_ring` **sparks** right outside the switch. Two sparks, one wire.
5. Repair `l_S_ring`. The south now feeds `rS` → `r2` (the gate lights) and `rS` → `r3`, where the well flickers red: dead lamp. `fb_S` 1/2.
6. Bulb on the well. `fb_S` 2/2, load 4 of 4. **Win.** The ring break is still sparking: it is the open point.

## The trap

The spark on the ring is the first fault the player sees, on the target's own loop, and the wire repairs it. Repair it and the north feeds `r1` and `r2` both: shrine 2 + gate 1 = 3 through `fb_N` rated 2, and **`fb_N` blows** (culprit `gate`). The wire is gone, `l_S_ring` still sparks, and nothing feeds the south half: a dead end, readable (the ✕ naming the gate, the second spark with *needs wire, have 0*). Undo recovers it.

It is readable before the click: `fb_N`'s bar is already full with the shrine, and the gate (1) sits just past the break. The question the map asks is "which side of this break should carry the gate?", and the answer is the side whose fuse has room.

A gentler trap comes first for most players: throwing `sw_N` to the ring while `br_ring` is still closed. The north then reaches the whole ring through `br_ring`: shrine 2 + gate 1 = 3 (the well is dead, so it doesn't count yet), and **`fb_N` blows** (culprit `shrine`). The spare fuse recovers it: open `br_ring`, repair `fb_N`, and it holds at 2/2. If the player repairs `fb_N` without opening the ring, it blows again and costs the spare; Undo recovers that. Leaving `br_ring` closed fails whichever feeder goes first. If the south is repaired first, it feeds the shrine round the ring through `br_ring` and `fb_S` blows (3 of 2, culprit `shrine`).

## What this map tests

- Whether "a break can be useful" reads on a ring, or whether players always spend parts on sparks (GDD review finding 1: a reroute as the clever answer, here a *non-repair*).
- Whether players count a ring's load against each feeder's bar before closing it.
- Whether the open point reads as a choice the tribe's breaker gives you (`br_ring`), not a hidden rule.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 19. Lines: 20. Faults: 3 (`f_ring`, `f_feedS`, `f_well`). Parts given: wire, bulb, fuse. Parts needed: wire, bulb (the fuse is a spare).
- Faults readable at start: 0 of 3. `f_ring` shows when the north feeds the ring, `f_feedS` when `sw_S` is thrown, `f_well` once the south reaches `r3`.
- Fewest actions to win: **5** (open `br_ring`, `sw_N`, `sw_S`, repair `l_S_ring`, bulb on `well`). 7 orderings reach the win in 5.
- Final load: **4 of 4**. Fuses at the win: `fb_N` 2/2, `fb_S` 2/2.
- Winning control settings: **1 of 8** (`br_ring` open, both switches to the ring), with the ring break left unrepaired.
- Reachable states: 147, of which 84 can no longer win without Undo; every one has a blown fuse or the wire spent on the ring break, both readable.
- First moves: `sw_N` blows `fb_N` (recoverable with the spare); `sw_S` and `br_ring` are safe.

## What it taught us

