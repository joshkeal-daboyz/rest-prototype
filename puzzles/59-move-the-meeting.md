# 59 · Move the meeting — design note

One street between two feeds, as on 15. Halfway along it a spur leads to a relay set to the forge (3). Whichever feed carries the spur's junction carries the forge the moment the spur's breaker closes. Right now that is East, whose fuse is rated 3 and already carries two lamps. West has the room, but West's short way onto the street is switched off, and when it's switched on it turns out to be broken.

**Element(s) under test:** depth, on two feeds (version 5). Pieces: *nearest feed carries it* (015, rule 2: fewest hops), a long-way switch that moves the meeting point, a fault hidden behind that switch, a relay that has to be thrown live, a fuse on one feed's way in.

## The map

17 nodes, 17 lines, 1 fault. Version 5: West Lv4, East Lv3, top-level `capacity` null. Enoch brings a wire and a fuse.

The street: `west` – `sw_w` [short **`l_ws` damaged** → `A` \| long `d1` – `d2` – `A` (file position)] – `A` (inn 1) – `B` – `C` (well 1) – `D` (gate 1) – `fE` ≤3 – `east`. Off `B`: `br_B` (open) → relay `rB` [**forge 3** \| shrine 2].

Targets: inn, shrine, well, gate.

Hops from each feed (lines):

| `sw_w` | `A` | `B` | `C` | `D` | Carrier of `B` |
| --- | --- | --- | --- | --- | --- |
| long (start) | W4 / E5 | W5 / E4 | W6 / E3 | W7 / E2 | **East** |
| short (mended) | W2 / E5 | W3 / E4 | W4 / E3 | W5 / E2 | **West** |

No junction is ever at a tie.

## The intended read

1. West carries the inn (1 of 4); East the well and the gate (2 of 3, `fE` 2/3). The shrine is dark; `rB` is dark and set to the forge.
2. Who would carry the forge? `B` is 5 hops from West and 4 from East: **East**, on `fE` ≤3 with 2 already on it. West has room for the forge (1 + 3 = 4).
3. Shorten West: throw `sw_w` to the short way. **`l_ws` sparks** at the switch, and with West cut off East carries the whole street (inn, well, gate: 3 of 3).
4. Wire it. West reaches `A` in 2 and `B` in 3, so West now carries `A` and `B`; East keeps `C` and `D`.
5. Close `br_B`: the forge lights on **West** (4 of 4). Throw `rB` to the shrine. West: inn 1 + shrine 2 = 3 of 4. East: 2 of 3. **Win.**

## The layers

1. **The spur would land on East,** and East's fuse can't take the forge. Unlocks: the need to move the meeting point toward East.
2. **Shortening West** is the only control that moves it. Unlocks: the short way, and its break.
3. **The short way is broken,** unseen until the switch points at it. Unlocks: West carrying `B`, once wired.
4. **Borrow West for the relay:** close the spur, throw `rB`. Unlocks: the win.

## The trap

**`br_B` first.** It is the one breaker on the map, beside the dark shrine. East carries `B`: forge 3 + well 1 + gate 1 = 5 on ≤3, **`fE` blows** (culprit `forge`). East goes dark, West takes the whole street through the long way and **browns out** (6 of 4, the notice names West). Readable: the ✕ on `fE`, the forge named, West over. Recoverable: short way, wire, `rB`, then fit the fuse: East takes back `C` and `D` and everything holds (5 clicks to win from there).

**`br_B` straight after `sw_w`,** before the wire: with West cut off at the spark, East carries everything, and `fE` blows at 6 of 3. Same recovery.

**Throwing `sw_w` and stopping** when the street goes dark on West's side is the readable moment: the spark sits at the switch, and the HUD shows West using 0 of 4.

## What this map tests

- Whether players work out who carries a lamp **before** closing a breaker, when the drawing says nothing about it.
- 15's "a longer route gives load away", backwards: shortening a route takes load on, and that is the point.
- Whether a fault hidden behind a long-way switch reads as part of the hop-count plan.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid` (ticket 015's multi-feed simulator), Undo and Reset excluded.

- Nodes 17, lines 17, faults 1 (`f_ws`). Parts given: wire, fuse. Parts needed: wire.
- Faults readable at start: 0 of 1.
- Fewest clicks to win: **4** (`sw_w`, wire `l_ws`, `br_B`, `rB`).
- Winning orders (distinct minimum-length click sequences): **1**.
- Final: West 3 of 4 (inn, shrine), East 2 of 3 (well, gate), `fE` 2/3.
- Winning control settings: 1 of 8.
- Reachable states: 48, of which 16 (**33.3%**) can't win without Undo.
- First moves: `br_B` blows `fE` and browns out West (recoverable, 5 clicks to win from there). `sw_w` is right. `rB` refuses.

## What it taught us
