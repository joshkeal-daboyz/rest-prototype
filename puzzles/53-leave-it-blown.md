# 53 · Leave it blown — design note

A ring with a blown fuse box in it, and Enoch carrying two fuses. The ✕ is the most obvious repair on the map, and the right answer is to leave it alone: the blown box sits exactly where the ring has to be split. On the far side of the ring a relay waits behind a fuse rated 1, and it can only be set from behind, through a tie from the ring, while two of the ring's lamps are still broken.

**Element under test:** **ring main with switches** (the brief's element 6) at expert level: the open point is a *blown fuse* the player holds the part to fix. Supporting: relays only move live (43), the borrow from behind (51), dead lamps as the room for the borrow (43), and a fuse hidden behind a breaker.

## The map

29 nodes, 31 lines, 5 faults. Feed capacity 7. Enoch brings two fuses, a wire and two bulbs.

| Piece | What it is |
| --- | --- |
| North | `fb_N` ≤3 → relay `r_N` [**mill 3** \| ring post `R0`] |
| South | `jS1` → `jS2` → `br_S` (open) → `fb_S` ≤4 (**blown**) → relay `r_S` [ovens 3 \| ring post `R3`] |
| Ring | `R0` (well 1) – `R1` (shrine 2) – **`fb_T` ≤1, blown** – `R2` (gate 1, **dead lamp**) – `l_r23` (**damaged**) – `R3` (bell 2, **dead lamp**) – `br_o` (closed) – `R0` |
| Tie | `R2` → `br_t` (open) → `jt` → lantern (1, priority) and on to relay `r_E` |
| East | `br_E` (open) → `fb_E` ≤1 → relay `r_E` [**forge 3** \| chapel 1] |

Targets: well 1, shrine 2, gate 1, bell 2, chapel 1 = 7 = capacity.

## The intended read

1. The map opens with the mill lit through `r_N` (3/3). Throw `r_N` to the ring: the mill goes dark, the well and shrine light (`fb_N` 3/3). Through `br_o` the current also reaches `R3`: the bell flickers red, `l_r23` sparks, and from `R1` the ✕ on `fb_T` shows.
2. Count before repairing anything. The north fuse is full with the well and shrine (3/3). The rest of the ring, the gate and bell, is 3, which only the south (≤4) can carry. So the ring must be cut in two places: between `R1` and `R2`, which is **`fb_T`, already blown: leave it**; and between `R3` and `R0`, which is **`br_o`: open it.**
3. Close `br_S`: `fb_S` ✕. Repair it with a fuse: the ovens light through `r_S` (3/4). Throw `r_S` to the ring (the ovens go dark, `R3` live), and repair `l_r23` with the wire. Current reaches `R2` and the tie breaker.
4. The east: `fb_E` (≤1) can't carry the forge (3), so `r_E` has to be set from behind. Through the tie the south would carry forge 3 + lantern 1 = 4 of 4, and that only fits because **the gate and bell are still dead**. Close `br_t` (4/4), throw `r_E` to the chapel, open `br_t`, close `br_E` (chapel 1/1).
5. Now the bulbs: gate, then bell. `fb_S` 3/4, load 7 of 7. **Win.** `fb_T` still shows its ✕.

## The trap

The blown `fb_T` is the first ✕ on the map, on the ring of targets, and Enoch has two fuses. Repair it and nothing goes wrong at once: the gate is dead, so `fb_T` carries nothing, and the ring is whole. The cost comes later. With the ring closed through `fb_T`, the north is nearer to `R2` than the south, so the gate, the tie and whatever the tie carries now land on `fb_N`. The borrow blows both feeders (forge through `fb_N` 7 of 3, then `fb_S`), and the spare fuse is already gone. Readable before: `fb_N`'s bar is full and `fb_T`'s rating is 1. Readable after: the blow notices name the forge, and the path runs through `fb_T`. Undo is the recovery.

The deduction that avoids it is pure arithmetic on the map: 3 + 3 against fuses of 3 and 4 means the ring must be cut, and `fb_T` is where.

Other traps, all readable:
- **`br_E` first:** the forge meets `fb_E` (≤1) and blows it (culprit `forge`). Recoverable with the spare after the borrow.
- **`br_o` left closed:** the north is nearer to `R3` than the south, so once `r_S` is on the ring `fb_S`'s bar stays at 0 while `fb_N` carries the south half too. The borrow or the bulbs then blow `fb_N`.
- **Bulbs before the borrow:** with the bell fixed, the borrow puts bell 2 + forge 3 + lantern 1 = 6 on `fb_S` (≤4), and it blows (culprit `forge`).
- **`br_t` left closed at the end:** the lantern stays lit, load 8 of 7, brownout.

## What this map tests

- Whether players can leave a fault they can afford to fix, because they've reasoned it's doing a job (the open point).
- Whether the late lessons combine: ring split (27), look before spending (36), the dead lamp as room (43), the borrow from behind (51).
- How long an expert map feels: 12 actions minimum, with a lot of reading between them.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 29. Lines: 31. Faults: 5 (`f_T`, `f_S`, `f_r23`, `f_gate`, `f_bell`). Parts given: 2 fuses, wire, 2 bulbs. Parts needed: 1 fuse, wire, 2 bulbs (one fuse is a spare). `f_T` stays unrepaired.
- Faults readable at start: 0 of 5. `f_T`, `f_r23` and `f_bell` appear when `r_N` is thrown; `f_S` when `br_S` closes; `f_gate` after `l_r23`.
- Fewest actions to win: **12** (`r_N`, open `br_o`, close `br_S`, repair `fb_S`, `r_S`, repair `l_r23`, close `br_t`, `r_E`, open `br_t`, close `br_E`, bulb on `gate`, bulb on `bell`). The only ordering freedom is in when the breakers are thrown; 6620 orderings reach the win in 12.
- Final load: **7 of 7**. Fuses at the win: `fb_N` 3/3, `fb_S` 3/4, `fb_E` 1/1, `fb_T` blown. Peak on `fb_S` during the borrow: 4/4.
- Winning control settings: **1 of 128** (`br_S` and `br_E` closed, `br_o` and `br_t` open, all three relays at position 1), with `fb_T` blown.
- Reachable states: 8089, of which 6649 can't win without Undo.
- First moves: `br_E` blows `fb_E` (recoverable with the spare); everything else is safe. `r_S` and `r_E` refuse (dark relays).

## What it taught us

