# 35 · By cell light — design note

A ring of two arms runs from the west switch round to the shrine, and each arm has relays set to heavy lamps. At the start there is one spark, on the north arm, and Enoch has one wire. Wiring it is the obvious move and it is wrong. Released, the cell lights up both arms from inside and shows three breaks: two on the north and one on the south, on the cell's own line to the south relays. The wire goes south, fitted by cell light inside the window, and then the window still has to cover two relay throws.

**Element under test:** the battery as temporary power for relays (ticket 008), with **hidden faults and a scarce part**. The cell is the lantern that shows what the feed can't, and the relays it sets are behind a break only it can show. Supporting: a ring (element 6), one wire (element 7), and a plain switch that must be thrown last.

## Plain switches and relays

| Kind | Pieces | How it moves |
| --- | --- | --- |
| Plain switch | `sw_W` | Any time, powered or not. |
| Relay | `rN`, `rS2`, `rS1` | Only while current reaches it; holds where it was thrown. |

## The map

17 nodes, 20 lines, 3 faults. Enoch brings one wire and two fuses. Feed capacity 2.

| Piece | What it is |
| --- | --- |
| `j0` | The live hub. The `yard` (1, priority) is lit. `j0` → `cell` (5 s), always charging. |
| `j0` → `fb_W` ≤2 → `sw_W` (plain) | Position 0: the north arm (where it starts). Position 1: the south arm. |
| North arm | `jN` → **`l_n2` damaged** → `jN2` → **`l_n3` damaged** → relay `rN` [**mill 3** \| `jE`]. |
| South arm | relay `rS2` [**kiln 3** \| → `rS1`]; relay `rS1` [→ `jK` (**bakery 3**, and on to `rS2`) \| `jE`]. |
| The cell's far side | `cell` → `jN2` (between the two north breaks) and `cell` → **`l_cS` damaged** → `rS1`. |
| `jE` → `shrine` | Load 1, the target. Both arms end here: the ring. |

## The intended read

1. The map opens with the yard lit and `sw_W` on the north arm. Current runs to `jN`, and **`l_n2` sparks**. One spark, one wire.
2. Don't spend it yet. The cell is filling (5 s), and its lines run into both arms. Release it to look, then click it again to stop it (it keeps most of its charge). By cell light, **`l_n3` sparks** past `jN2` and **`l_cS` sparks** on the cell's line south. That makes three breaks: the north needs two wires, the south one.
3. Let the cell refill. Release it, and inside the window: **wire `l_cS`** (a repair needs the break readable, so it has to be done by cell light). The kiln and bakery light: `rS1` and `rS2` are live. Throw **`rS2`**, then **`rS1`**, far end first. The shrine lights by cell light.
4. Throw `sw_W` to the south. The feed runs `rS2` → `rS1` → `jE` → shrine. `fb_W` 1 of 2, load 2 of 2. **Win.**

## The trap

**Wiring the spark you can see.** `l_n2` is the only fault on screen, and the wire fits it. Fit it and the feed runs on to `jN2`, where `l_n3` sparks at once, and the wire is gone. The south break needs the same wire. This is a dead end, but not a silent one: the second spark appears the moment the first is mended, and the parts show no wire. Undo recovers it. It is fair because the cell is on the map from the start, its lines run visibly into both dark arms, and releasing it costs nothing but a few seconds of charge.

Two more, both recoverable:

- **The plain switch first.** `sw_W` is a plain switch, so it can be thrown any time. But the south arm's relays are set to the kiln, so throwing it before the relays are set blows `fb_W` (3 on ≤2). Leave the fuse blown, set the relays by cell light (the cell doesn't need `fb_W`), then fit a fuse: it holds. Two fuses cover the instinctive repair-at-once re-blow.
- **Near end first.** `rS1` is the relay at the end of the cell's line and the one that lights the shrine. Throwing it first cuts the cell off from `rS2`. The 5 s window holds the wire and two throws (4.5 s at 1.5 s a click), not the two extra throws to undo it.

## What this map tests

- Whether players use a cell to *look* before they spend a part, and whether "stop early, it keeps its charge" is discovered.
- Whether "a repair needs the break readable" reads as "fix it by cell light, inside the window".
- Whether a plain switch that is free to throw but has to be thrown *last* is read from the relays behind it.

## Expected numbers (`npm run analyze` isn't built: brute force over the real simulator, `createGrid`/`advance`/`release`, at a click every 1.5 s)

- Nodes 17, lines 20, faults 3 (`f_n2`, `f_n3`, `f_cS`). Parts given: wire, 2 fuses. Parts needed: 1 wire (`l_cS`). `l_n2` and `l_n3` stay broken.
- Faults readable at start: 1 of 3 (`l_n2`). By cell light: 3 of 3.
- Fewest clicks to win: **5** (release, wire `l_cS`, `rS2`, `rS1`, `sw_W`); `actions` reads 4. Wait: 5 s to fill. The intended run completes at 11 s.
- Window: 5 s for one repair and two throws (4.5 s at 1.5 s a click). Wrong order fails at both 1.5 s and 1.0 s a click.
- Winning control settings: **1 of 16** (`sw_W` south, `rS2` and `rS1` at 1, `rN` at 0, where it never moves: it is never live).
- Reachable states: 1,341, of which 49.7% can't win without Undo. All are part dead ends: the wire spent on `l_n2` or `l_n3`, or both fuses spent.
- First moves: **wiring `l_n2` is a dead end** (the trap; readable at once). `sw_W` blows `fb_W` (recoverable).

## What it taught us
