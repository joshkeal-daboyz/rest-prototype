# 23 · Only the relays — design note

Two branches, a relay and then a plain switch on each, every one of them set wrong. The battery is small: a 4 s window, about two clicks for a first-time player. Two of the four switches need that window, and two can be set any time, so the window is for the relays only.

**Element under test:** relays inside a short window, alongside plain switches: **tell which switches need the battery and spend the window only on those.** New over 19: the window is now tight, and there are two of each kind of switch.

## The map

17 nodes, 17 lines, no faults. Feed capacity 3. Enoch brings 2 fuses.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` → `gate` | Load 1, priority, lit from the start. |
| `j1` → `bat` | Battery, capacity **4 s**, charge 0. |
| `j1` → `br_E` (open) → `fb_E` ≤2 → `j_E` | The feed's way in. `bat` → `j_E` is the battery's. |
| North: `rl_N` | **Relay.** 0 → `mill` (3); 1 → `sw_N`. Starts at 0. |
| North: `sw_N` | **Plain.** 0 → `tannery` (2); 1 → `shrine` (1, target). Starts at 0. |
| South: `rl_S` | **Relay.** 0 → `forge` (3); 1 → `sw_S`. Starts at 0. |
| South: `sw_S` | **Plain.** 0 → `kiln` (2); 1 → `well` (1, target). Starts at 0. |

Winning route: `br_E` → `fb_E` → both relays at 1 → both plain switches at 1. Load 3 of 3; `fb_E` 2 of 2.

## The intended read

1. The gate is lit and the battery is filling (4 s). Four switches in the section, all dark.
2. Click around: `sw_N` and `sw_S` move, `rl_N` and `rl_S` don't. So the plain ones go now. Throw both to the lamps the priests want (shrine, well).
3. Wait for the battery to fill and release it. The mill and forge light, and both relays are live.
4. Throw `rl_N`, then `rl_S` (either order: they're on separate branches). With the plain switches already set, the shrine and well light from the battery. That's about 3 s of a 4 s window.
5. Close `br_E`. Load 3 of 3, `fb_E` 2 of 2. **Win.**

## The trap

**Spending the window on a plain switch.** On release the battery reaches `rl_N`, and once that's thrown, `sw_N` is live and pointing at the tannery. The natural next click is `sw_N`. At a click every 1.5 s, the window closes before `rl_S`: the forge goes dark, `rl_S` won't move, and the battery shows flat and starting to refill. Readable (the battery's bar runs out, `rl_S` is still drawn toward the forge) and recoverable: wait 4 s and release again for `rl_S`. The cost is time, not the map.

The second trap is **forgetting a plain switch.** With both relays set and `sw_S` still on the kiln, closing `br_E` puts kiln 2 + shrine 1 through `fb_E` ≤2 and it blows, naming the kiln. Throw `sw_S` (plain, so dark is fine), then repair `fb_E`. Closing `br_E` before anything is set blows it too (mill and forge). Two fuses cover one premature repair.

## What this map tests

- Whether players sort the switches into "now" and "in the window" before releasing, or whether they release and click everything that's live.
- Whether 4 s is tight enough that the sorting matters but fair enough for two clicks. Josh tunes `capacity`.

## Expected numbers

Analyzer not built: time-aware search over the real `createGrid`, a click every 1.5 s, no Undo (method as in 19).

- Nodes 17, lines 17, faults 0. Parts given: 2 fuses. Parts needed: none.
- Switches: **2 relays** (`rl_N`, `rl_S`), **2 plain** (`sw_N`, `sw_S`).
- **Fewest clicks: 6.** `sw_N`, `sw_S` (dark), release, `rl_N`, `rl_S`, `br_E`. The window carries 2 clicks; 4 s wait to fill.
- Final load 3 of 3. `fb_E` 2 of 2.
- **Winning settings: 1 of 32.**
- Reachable states 2490. **Dead ends 544, all "`fb_E` blown, no fuse left"** (two premature repairs). Every first move is winnable.
- Checked by script: the relays are stuck at the start and the plain switches move; release lights the mill and forge; `rl_N` at 1.5 s and `rl_S` at 3.0 s leave 1 s; the window spent on `sw_N` refuses `rl_S` at 4.5 s, and a second 4 s charge finishes it; a forgotten `sw_S` blows `fb_E` (culprit `kiln`), and throwing it dark then repairing completes; breaker first blows (culprit `mill`).

## What it taught us

