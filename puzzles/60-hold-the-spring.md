# 60 · Hold the spring — design note

58's spring again, set to the mill behind a fuse rated 2, but no back door from the feed: the only other line into it comes from a cell. The cell is empty, and the only way to charge it is the lantern's switch, so the lantern (a target) goes dark while it fills. Released, the cell shows a break on its own line. And when the window ends the spring lets go, unless the feed has taken it over first.

**Element(s) under test:** depth. Pieces: a battery (charge, release, window), a spring switch held by the window, a fault visible only by cell light, a fuse rating, and the hand-over from cell to feed inside the window.

## The map

11 nodes, 11 lines, 1 fault. Feed capacity 4. Enoch brings a wire and a fuse. Cell: 5 s, starts empty.

| Piece | What it is |
| --- | --- |
| `j0` | well (1, target) |
| Lantern | plain switch `sw_c` [lantern 1 (target) \| `cell`'s input] |
| Cell | `cell` (5 s) → **`l_cS` damaged** → spring `S`'s far side |
| Front way | `br_S` (open) → `fb_S` ≤2 → spring `S` [**mill 3** (file) \| shrine 2 (target)] |

Targets: well 1 + lantern 1 + shrine 2 = 4 = capacity.

## The intended read

1. Well and lantern lit. `S` is dark (spring ribbon), set to the mill; `br_S` would put the mill on ≤2. The cell's line runs to `S`, and the cell is empty.
2. Charge: throw `sw_c` to the cell (the lantern goes dark). Wait 5 s. Put the lantern back; the cell keeps its charge.
3. Release. Nothing new lights: **`l_cS` sparks** at the cell's mouth. Wire it inside the window; the mill lights by cell light.
4. Throw `S` to the shrine (by cell light).
5. **Before the cell runs flat**, close `br_S`: the shrine is on `fb_S` 2/2 and the feed now holds `S`. The cell goes flat; `S` stays. Load 4 of 4. **Win.**

## The layers

1. **The front way blows** (mill 3 on ≤2), and a spring can't be thrown dark. Unlocks: the cell as the only safe current for `S`.
2. **The cell is empty,** and its only charging line is the lantern's. Unlocks: a charged cell, with the lantern dark for 5 s.
3. **The cell's line is broken,** visible only once it is released. Unlocks: current at `S`, once wired by cell light.
4. **The spring, thrown in the window.** Unlocks: the shrine, but only while the cell lasts.
5. **The hand-over.** The feed must reach `S` before the window ends, through the fuse that only now holds. Unlocks: the win.

## The trap

**`br_S` first:** `fb_S` blows (culprit `mill`). Recoverable with the fuse, inside the window: release, wire, `S`, then fit the fuse. It holds because `S` is on the shrine, and the feed takes `S` over at the same moment.

**Waiting in the window.** A player who throws `S` and stops to admire the shrine watches the cell run flat: **`S` springs back to the mill** (the ribbon snaps, the shrine goes dark). Readable, and recoverable: the wire stays fitted, so it costs a recharge (lantern dark again), a release, `S` and `br_S`.

**Releasing early.** Released at 2 s, the window holds the wire and nothing else. The cell's meter shows why; it refills.

## What this map tests

- Whether "a spring is only held while current reaches it" combines with the cell's window into a hand-over the player plans before releasing.
- Whether reading the window's spark, fixing it and setting the spring all fit one window at a reading pace.

## Expected numbers

`npm run analyze` can't run here (no `tools/analyze.ts`). Numbers are from a brute-force search over the real `createGrid` with time: every click is followed by 1 s, a wait is 0.5 s (the ladder's convention). Undo and Reset excluded.

- Nodes 11, lines 11, faults 1 (`f_cS`). Parts given: wire, fuse. Parts needed: wire.
- Faults readable at start: 0 of 1 (`l_cS` shows only by cell light).
- Fewest clicks to win: **6** (`sw_c`, wait 5 s, `sw_c`, release, wire `l_cS`, `S`, `br_S`); a release counts as a click.
- Winning orders (distinct minimum-length click sequences, waits not counted): **5**. Charge → release → wire → `S` → `br_S` is fixed; the only freedom is when the lantern goes back (before the release, inside the window, or last).
- Window: 5 s for 3 clicks. The intended run also finishes at 1.5 s a click, with 0.5 s to spare.
- Winning control settings: 1 of 8.
- Reachable states: 562, of which 176 (**31.3%**) can't win without Undo.
- First moves: `br_S` blows `fb_S` (recoverable, 7 clicks to win from there). `sw_c` is right. `S` refuses (dark spring); the cell refuses to release while empty.

## What it taught us
