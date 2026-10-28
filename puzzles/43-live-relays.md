# 43 · Relays only move live — design note

Two chains of the tribe's relays, two to a chain, every one of them set to a heavy lamp. Relays only move while current reaches them, so 34's answer ("set it in the dark") is gone: each relay has to be thrown live, and the fuse above it has to survive the moment it goes live. You make room by taking a lamp off first. On one chain the only way to take the lamp off is to leave it broken.

**Element under test:** **relay switches** (ticket 008) as an ordering puzzle with fuse ratings: shed, power, throw, restore. The headline is the second chain, where a dead lamp is the only shed available, so its bulb must go in last. Supporting: hidden breaks that each bring a heavy lamp into a chain.

## The map

23 nodes, 22 lines, 3 faults. Feed capacity 5. Enoch brings two wires, a bulb and a fuse.

| Chain | Path |
| --- | --- |
| A, `fb_A` ≤3 | relay `r_A1` [**forge 3** \| `jA`]; `jA` → `br_w` (closed) → well (1); `jA` → `l_A2` (**damaged**) → relay `r_A2` [**mill 3** \| shrine 2] |
| B, `br_B` (open) → `fb_B` ≤2 | relay `r_B1` [**ovens 2** \| `jB`]; `jB` → gate (1, **dead lamp**, no breaker); `jB` → `l_B3` (**damaged**) → relay `r_B2` [**kiln 2** \| chapel 1] |

Targets: well 1 + shrine 2 + gate 1 + chapel 1 = 5 = capacity. At the win both fuses are full: `fb_A` 3/3, `fb_B` 2/2.

## The intended read

1. The map opens with the forge lit through `r_A1` (`fb_A` 3/3). Clicking the dark relays does nothing: they're marked as relays and need current.
2. Throw `r_A1` (it's live): the forge goes dark, the well lights (1/3), `l_A2` sparks. Behind the break is `r_A2`, set to the mill (3). Mill 3 + well 1 = 4 of 3, so the well has to come off before the wire goes in. **Open `br_w`**, then repair `l_A2`: the mill lights, 3/3, and `r_A2` is live. Throw it to the shrine (2/3) and close `br_w` (3/3).
3. Close `br_B`: the ovens light (2/2). Throw `r_B1`: the ovens go dark, current reaches `jB`, the gate flickers red (dead) and `l_B3` sparks. Behind the break `r_B2` is set to the kiln (2), and `fb_B` is rated 2. The gate is dead, so it carries nothing. **Leave it dead.**
4. Repair `l_B3`: the kiln lights, 2/2. Throw `r_B2` to the chapel (1/2). Now the bulb: the gate lights, 2/2. Load 5 of 5. **Win.**

## The trap

On chain B the gate's dead bulb is the visible fault, and Enoch has the bulb. Fix it as soon as it shows and the gate lights (1/2), which looks right. Then the wire on `l_B3` brings `r_B2`'s kiln in: 3 of 2, **`fb_B` blows** (culprit `kiln`). `r_B2` can't be thrown in the dark, the gate has no breaker to shed it, and every repair of `fb_B` blows it again. It is a dead end that only Undo clears.

Is it fair? Before the bulb goes in, the map shows `fb_B` rated 2, `r_B2` drawn at the kiln (2) behind a spark, and a relay marking. Chain A has just taught the same arithmetic with a breaker to shed (`br_w`). Chain B asks the player to notice there's no breaker this time and that the broken bulb is doing the breaker's job. After the blow, the notice names the kiln and the bar shows the gate's 1. This is the hardest-reasoned trap so far in the ladder, and the one to watch in play: it is the same "every new fuse blows again" pattern Josh hit on 11-which-fuse (ticket 013). Ticket 013's *would blow again* hover will name it, but nothing on the map recovers it. If it plays as a dead end rather than a lesson, the fix is a breaker on the gate's spur (which makes this chain the same as chain A), not a rule change.

On chain A the trap is gentler: repairing `l_A2` with the well on blows `fb_A` (4 of 3, culprit `mill`). The spare fuse recovers it: open `br_w`, repair `fb_A` (mill 3/3), throw `r_A2`, close `br_w`.

## What this map tests

- Whether the relay marking reads as "this one only moves live" and changes the plan (18-battery-run's relays, without the battery).
- Whether players treat an unrepaired fault as a resource (a dead lamp as the shed).
- Whether a deadlock (can't throw the relay without power, can't power it without blowing) reads as a consequence rather than a bug. If it reads as a bug, the fix is a hint in the blow notice, not a rule change.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 23. Lines: 22. Faults: 3 (`f_A2`, `f_B3`, `f_gate`). Parts given: 2 wires, bulb, fuse. Parts needed: 2 wires, bulb (the fuse is a spare).
- Faults readable at start: 0 of 3. `f_A2` once `r_A1` is thrown; `f_B3` and `f_gate` once `r_B1` is thrown.
- Fewest actions to win: **10** (`r_A1`, open `br_w`, repair `l_A2`, `r_A2`, close `br_w`, close `br_B`, `r_B1`, repair `l_B3`, `r_B2`, bulb on `gate`); 504 orderings reach the win in 10.
- Final load: **5 of 5**. Fuses at the win: `fb_A` 3/3, `fb_B` 2/2.
- Winning control settings: **1 of 64** (both breakers closed, all four relays at position 1).
- Reachable states: 492, of which 172 can't win without Undo: the gate's bulb spent before `r_B2` was set, or a fuse blown with no spare.
- First moves: all safe. The dark relays refuse, which reads as their rule.

## What it taught us

