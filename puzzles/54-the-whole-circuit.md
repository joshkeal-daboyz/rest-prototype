# 54 · The whole circuit — design note

The old battery track's capstone. 51's three-relay ring is back, with the same two feeders and the same heavy lamps on every link. But the cell that sets it is now the big one, it reaches the ring at a different point, and getting it ready takes three steps in order. The small cell sets the relay that lets the big cell fill. The big cell fills only while the market is dark. And its first release shows nothing but a spark at its own mouth, which has to be wired by its own light. After that the window holds the repair and four throws in the only order that works from this side of the ring: **C, A, B, C**. That is not 51's order, and 51's habit fails here.

**Element under test:** the battery as temporary power for relays (ticket 008), everything at once: two cells of different capacity, one that charges only while another section is shed, a cell that sets the relay gating the other cell's charge, a hidden fault visible only by cell light, one wire, and a relay ring where the order of throws is everything.

## Plain switches and relays

| Kind | Pieces | How it moves |
| --- | --- | --- |
| Plain switch | `sw_m`, `sw_S` | Any time, powered or not. |
| Relay | `rI`, `rA`, `rB`, `rC` | Only while current reaches it; holds where it was thrown. |
| Breaker | `br_N` | Any time. |

## The map

26 nodes, 29 lines, 1 fault. Enoch brings one wire and two fuses. Feed capacity 5.

| Piece | What it is |
| --- | --- |
| `j0` → `jw` → `small` (3 s) → `jq` | Always charging. Its far side reaches `jq`, the input of `rI`. |
| `jw` → `sw_m` (plain) | Position 0: the `market` (2, target), lit. Position 1: `fb_q` ≤1 → `jq` → relay `rI` [**smithy 3** \| the input of `big`]. |
| `big` (8 s) → **`l_bL` damaged** → `jL` | The big cell's far side enters the ring at the kiln junction. The break is hidden until `big` is released. |
| North feeder | `br_N` (open) → `fb_N` ≤2 → relay `rA` [**mill 3** \| → `rB`]. |
| South feeder | `sw_S` (plain) [`homes` 1, priority, lit \| `fb_S` ≤1] → relay `rC`. |
| The ring (as 51) | `rB` [→ `jL` (**kiln 3**) → `rC` \| shrine 2]; `rC` [gate 1 \| → `jM` (**forge 3**) → `rA`]. |

Targets: market 2 + shrine 2 + gate 1 = 5 = capacity. The homes go dark.

## The intended read

1. The map opens with the market and homes lit. The ring is dark; its relays refuse. `small` fills (3 s); `big` doesn't, because its input is behind `sw_m`'s other side, `fb_q` and `rI`.
2. Read `rI`: it's set to the smithy (3), behind a ≤1 fuse. Shedding the market now would blow `fb_q`. So **`small` first**: release it (the smithy lights), throw `rI` to `big`.
3. **Shed the market**: `sw_m` to `fb_q`. The market goes dark; `big` fills through `rI` (`fb_q` carries 0). Wait 8 s. **Put the market back** before releasing: `big` keeps its charge, and the market only needs to be dark while it fills.
4. Release `big`. Nothing lights: **`l_bL` sparks** at the cell's mouth. **Wire it**, inside the window. Now the cell's current runs into `jL`: the kiln lights, and through `rC` the gate. `rC` is live; `rA` and `rB` aren't (the cell is on `rB`'s output side).
5. **`rC`** to the forge side: the forge and, through `rA`, the mill light. **`rA`** to `rB`: `rB` is live. **`rB`** to the shrine. **`rC`** back to the gate. The shrine and gate are lit by cell light.
6. Close `br_N`, throw `sw_S` to the fuse. Market 2, shrine 2 on `fb_N` ≤2, gate 1 on `fb_S` ≤1. Load 5 of 5. **Win.**

## The trap

**51's order.** A player fresh from 51 throws C, A, C, B. Here the cell sits at `jL`, not at `rB`, so it reaches `rB` only through `rA`, and `rA` only through `rC`'s crossed position. Throw `rC` back before `rB` and `rB` goes dark and refuses: the shrine relay is left on the kiln. It is readable (`rB` refuses, and the arrows show the cell's way in), and recovering costs three more throws: `rC`, `rB`, `rC`. At 1.5 s a click that doesn't fit, so the big cell has to be refilled, with the market dark again for 8 s. Every fact needed is on the map; the only thing that changed from 51 is where the cell's line meets the ring.

**Shed the market first.** It's the obvious plan: the big cell is plainly the one for the ring, and `sw_m` is plainly its charger. But `rI` is set to the smithy, so the feed meets 3 on ≤1 and **`fb_q` blows** (culprit smithy). The small cell's line to `jq` is the hint: there's no other reason for it to be there. Recovery: leave `fb_q` blown, release `small`, throw `rI`, fit a fuse; it holds. A blind repair before `rI` is set re-blows and costs the first fuse (ticket 013's hover warns of it: *would blow again: 3 load on ≤1*). The second fuse still finishes the job.

**Releasing `big` to look, and losing the window.** The first release shows only the spark. A player who stops to think watches 8 s drain. Stopping early keeps the rest, and the wire, once fitted, stays fitted. Refilling means darkening the market again.

**`br_N` first** blows `fb_N` (mill); leave it, set the ring, fit a fuse.

## What this map tests

- Whether players carry the battery maps' lessons (charge a cell from a shed section, set relays inside a window, wire by cell light, read relay arrows for order) without the map saying which applies.
- Whether a habit from an earlier map (51's order) is caught by reading the arrows, not by trial. If it plays as trial and error, the first thing to give back is window time (`big` capacity 8 → 10).
- The ceiling: the big window holds the repair and four throws with 0.5 s to spare at 1.5 s a click. That is the tightest moment on any battery map and the one to tune.

## Expected numbers (`npm run analyze` isn't built: brute force over the real simulator, `createGrid`/`advance`/`release`, at a click every 1.5 s)

- Nodes 26, lines 29, faults 1 (`f_bL`). Parts given: wire, 2 fuses. Parts needed: 1 wire; the fuses are spares.
- Faults readable at start: 0 of 1. `l_bL` appears only by `big`'s light.
- Fewest clicks to win: **12** (release `small`, `rI`, `sw_m`, wait, `sw_m`, release `big`, wire `l_bL`, `rC`, `rA`, `rB`, `rC`, `sw_S`, `br_N`); `actions` reads 10. The intended run completes at 26 s.
- Waits: `small` 3 s; `big` 8 s with the market dark.
- Windows: `small` 3 s for 1 throw. `big` 8 s for the repair and 4 throws (7.5 s at 1.5 s a click). C, A, B, C is the only order. A wasted pair fails at 1.5 s a click and fits at 1.0 s. Relays hold, so the job can be split across two charges, each one costing the market another 8 s dark.
- Winning control settings: **2 of 128** (`br_N` closed, `sw_m` at the market, `sw_S` to the fuse, `rA` and `rB` at 1, `rC` at 0; `rI` either way).
- Reachable states: 252,603, of which 48.1% can't win without Undo. Almost all are fuse dead ends. A few depend on charge: with `fb_q` blown and no fuse left, the map is winnable only if `big` already holds enough charge for the throws still to make. Its meter shows that.
- First moves: `br_N` blows `fb_N`, `sw_m` blows `fb_q`; both recoverable, even after a blind re-blow. `sw_S` is safe. Dark relays refuse; `big` refuses to release while empty.

## What it taught us
