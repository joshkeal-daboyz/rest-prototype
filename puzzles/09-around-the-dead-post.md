# 09 · Around the dead post — design note

Rung 09, after 08 (the shrine circuit). The shrine's line runs through a junction that has died. Enoch brought one wire; a dead junction takes two. There is an older line round the back, shut off by the tribe and broken in one place.

**Element under test:** the reroute instead of the unaffordable repair (brief element 1, in its gentlest form). The fault that's pointed at can't be paid for; the switch is the answer. When the long way comes alive it brings the mill with it, and the feed can't carry both, so the player sheds the mill.

## The map

11 nodes, 11 lines, 2 faults, 1 wire. Feed capacity 3.

- `j0` → `home` (1), always lit.
- `j0` → `sw_1`:
  - position 0 (start), the short way: `l_short` → `j_dead` (**dead junction** `f1`, wire × 2) → `l_post` → `j_post`
  - position 1, the long way: `l_long` → `br_long` (open) → `l_long2` (**damaged cable** `f2`, wire × 1) → `j_mid` → `l_long3` → `j_post`
- `j_mid` → `br_mill` (closed) → `mill` (2)
- `j_post` → `shrine` (1, target)

## The intended read

1. The map opens with the home lit (1 of 3). Pulses run down the short way into `j_dead`; none come out, with no fuse to blame: a **dead junction**, drawn with two broken stubs, *Needs: wire × 2*. Enoch has one.
2. Throw `sw_1`. Pulses run down the long way and stop at `br_long`: open, not broken.
3. Close `br_long`. Pulses run to a **spark** on `l_long2`: one wire. The mill and the shrine past it are still dark.
4. Repair `l_long2`. The mill (2) and the shrine (1) come alive: home 1 + mill 2 + shrine 1 = **4 of 3, brownout**.
5. Open `br_mill`. Load 2 of 3. **Win.** (`br_mill` can be opened at any point; the BFS's shortest order does it early.)

## The trap

The dead junction is the first fault the player can read, and it sits on the straight line to the shrine. Clicking it says *Needs: wire × 2* and spends nothing. The switch beside it is marked but pointed away. Then the reroute ends in a brownout, which looks as if the repair broke something. It didn't: the long way carries the mill, and the counter says 4 of 3. Both are readable and free to back out of. The one wire can only be spent on `f2`, so there's no way to waste it.

A detail Josh may notice: once the long way is live, pulses also run back from `j_post` along `l_post` and stop at `j_dead` from the far side. That's the simulator's normal flow (lines carry current both ways; only a switch can't be entered through its outputs). It's harmless and arguably helpful (the dead post is lit from both sides), but if it reads as confusing, it's a renderer or rule question, not a map one.

## What this map tests

- Whether the reroute reads as the clever answer, not a workaround (GDD review, finding 1, the shrine circuit's first trap at early-ladder strength).
- Whether the dead junction's two-wire cost is clear on the map (14-behind-the-first's lesson, ticket 011 B1).
- Whether an open breaker and a fault read differently as places the pulses stop.
- Whether a repair causing a brownout is read as capacity, not as a failed repair.

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 11, lines 11, faults 2. Parts given: 1 wire. Parts needed: **1 wire** (fixing `f1` instead would need 2).
- Faults readable at start: **1 of 2** (`f1`). `f2` appears when `sw_1` is thrown and `br_long` closed.
- Fewest actions to win: **4** (`sw_1`, `br_long`, repair `l_long2`, open `br_mill`).
- Winning configurations: **1 of 32** (3 controls × 2 faults).
- Final load: 2 of 3 (home, shrine). With the mill left on: 4 of 3.
- Dead ends: none. Reachable states: 16.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
