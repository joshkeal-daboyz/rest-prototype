# 26 · The far one first — design note

Three switches in a row between the fuse and the shrine: relay, plain, relay. The battery sits at the shrine end and reaches the row backwards, through each switch's old setting: `rl_3` → forge → `sw_2` → kiln → `rl_1` → mill. Throw the one nearest the battery and it cuts the battery off from the rest. 25 taught "set the plain switch first", and here that's the second trap: `sw_2` is on the battery's road.

**Element under test:** order of throws inside a short window (4 s, two clicks). **Plan before releasing:** the relay farthest from the battery goes first, and the plain switch on the battery's road waits until after. New over 25: the switches are on one road, so each throw can cut off the next.

## The map

17 nodes, 19 lines, no faults. Feed capacity 2. Enoch brings 2 fuses.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` → `gate` | Load 1, priority, lit. |
| `j1` → `br_E` (open) → `fb_E` ≤1 → `rl_1` | The feed's way in. |
| `rl_1` | **Relay.** 0 → `mill` (3); 1 → `sw_2`. Inputs: from `fb_E`, and from `j_k`. |
| `sw_2` | **Plain.** 0 → `j_k` (the `kiln`, 2, and a line back to `rl_1`); 1 → `rl_3`. Inputs: from `rl_1`, and from `j_f`. |
| `rl_3` | **Relay.** 0 → `j_f` (the `forge`, 2, and a line back to `sw_2`); 1 → `shrine` (1, target). Inputs: from `sw_2`, and from `bat`. |
| `j1` → `j_b1` → `j_b2` → `bat` | The battery's charging line, around the bottom. Capacity **4 s**, charge 0. Its far side goes straight to `rl_3`. |

Winning route: `fb_E` → `rl_1` (1) → `sw_2` (1) → `rl_3` (1) → `shrine`. Load 2 of 2; `fb_E` 1 of 1.

## The intended read

1. The battery fills (4 s). `rl_1` and `rl_3` won't move; `sw_2` will.
2. Read the battery's road on the drawn positions: `bat` → `rl_3` → forge → `sw_2` → kiln → `rl_1` → mill. Throwing `rl_3` sends the battery to the shrine and nowhere else. Throwing `sw_2` sends it past the kiln, so `rl_1` goes dark. So the order is `rl_1` first, then `rl_3`, and `sw_2` last (plain, any time after `rl_1`).
3. Release. Forge, kiln and mill light: all three switches are live.
4. Throw `rl_1` (1.5 s), then `rl_3` (3.0 s). The shrine lights from the battery.
5. After the window, in the dark, throw `sw_2`. Close `br_E`. **Win.**

## The trap

- **The near relay first.** `rl_3` is next to the battery and next to the shrine: the obvious click. Thrown first, the battery's whole road collapses onto the shrine, and forge, kiln and mill go dark together. `rl_1` is now stuck. Readable: three lamps went out at once. Recovery is `rl_3` back, `rl_1`, `rl_3` again, which is three clicks, and the window holds two. The battery runs flat at 4.5 s. Recoverable: it refills (4 s), and the next window finishes. It costs a recharge.
- **Plain switch first** (25's habit). Set `sw_2` to `rl_3` before releasing, and the release lights only the forge: the kiln and mill stay dark, and `rl_1` won't move. Readable (which lamps lit) and recoverable at once: `sw_2` is plain, throw it back.
- **Forgetting `sw_2`.** With both relays set and `sw_2` still on the kiln, closing `br_E` puts kiln 2 through `fb_E` ≤1: blows, naming the kiln. Throw `sw_2`, repair `fb_E`. Closing `br_E` with any switch wrong blows it, so the feed can't set any of them. Two fuses cover one premature repair.

## What this map tests

- Whether players trace the battery's road before releasing, now that the window punishes trial and error with a recharge.
- Whether "a plain switch can wait" is learned as well as "a plain switch can go first". It depends on where it sits.
- Whether three lamps going dark at once reads as "I cut the road", not "the battery died".

## Expected numbers

Analyzer not built: time-aware search over the real `createGrid`, a click every 1.5 s, no Undo (method as in 21).

- Nodes 17, lines 19, faults 0. Parts given: 2 fuses. Parts needed: none.
- Switches: **2 relays** (`rl_1`, `rl_3`), **1 plain** (`sw_2`).
- **Fewest clicks: 5.** Release, `rl_1`, `rl_3`, `sw_2`, `br_E`, after a 4 s fill (10.5 s in all at the modelled pace).
- Final load 2 of 2. `fb_E` 1 of 1.
- **Winning settings: 1 of 16.**
- Reachable states 994. **Dead ends 272, all "`fb_E` blown, no fuse left"**. Every first move is winnable.
- Checked by script: release lights forge, kiln and mill, and all three switches are live; `rl_1` at 1.5 s and `rl_3` at 3.0 s, with `sw_2` thrown dark afterwards, complete with no blow; `rl_3` first cuts `rl_1`, the recovery's third click at 4.5 s is refused, and the next window finishes; preset `sw_2` leaves `rl_1` stuck and throwing it back restores the road; the feed after only `rl_1` (culprit kiln) or after `rl_1` + `sw_2` (culprit forge) blows.

## What it taught us

