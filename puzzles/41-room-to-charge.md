# 41 · Room to charge — design note

The battery sits on a spur behind the north fuse box, with the lamphouse lamp on the same spur. The fuse box is already full with the hall on it, so there is no room to charge: the hall has to go dark while the battery fills. Then the battery gives the east relay its few seconds of power, the feed takes over, and the hall comes back on once the charging spur is unplugged.

**Element under test:** the battery as the relay's temporary power, **behind a fuse box**: charging the battery puts its spur's load on a fuse that has no room, so you shed load to charge. Supporting: one relay, one plain switch.

**Switches on this map.** `rl` is a **relay** (powered: it only moves while current reaches it, and holds where it was thrown). `sw_P` is a **plain switch** (powerless: it moves any time, live or dark). Breakers: `br_hall`, `br_chg`, `br_E`.

## The map

17 nodes, 17 lines, no faults. Enoch brings two fuses. Feed capacity 3. Battery: capacity 3 s, starts empty.

| Piece | What it is |
| --- | --- |
| `feed` → `j1` | The live hub. |
| `j1` → `fb_N` (≤2) → `j2` | The north fuse box. `j2` → `br_hall` (closed) → **hall** (load 2, target): lit at the start, `fb_N` 2/2. |
| `j2` → `br_chg` (open) → `j3` | The charging spur. `j3` → **lamphouse** (load 1) and → `bat` (input `l_bin`). |
| `bat` → `rl` | The battery's far side reaches the relay. |
| `j1` → `br_E` (open) → `fb_E` (≤1) → `rl` | The feed's own way east. |
| `rl` (relay) | 0 (start) → **kiln** (load 3). 1 → `sw_P`. |
| `sw_P` (plain) | 0 → **shrine** (load 1, target). 1 (start) → tannery (load 1). |

Win: hall + shrine lit by the feed, 3 of 3; `fb_N` 2/2, `fb_E` 1/1. `br_chg` must be open at the end (hall 2 + lamphouse 1 is 3 on ≤2).

## The intended read

1. The hall is lit, `fb_N`'s bar is full (2/2). The battery is empty and not charging: `br_chg` is open. `rl` refuses a click (no current). `sw_P` moves (plain).
2. The spur behind `br_chg` carries the lamphouse (1). 2 + 1 on ≤2 is a blow. **Open `br_hall`** (the hall goes dark), then **close `br_chg`**: the lamphouse lights, `fb_N` 1/2, the battery charges.
3. Set `sw_P` to the shrine now, in the dark: it's plain, it doesn't need the window.
4. When the battery is full (3 s), **open `br_chg`** and **close `br_hall`**: the hall is back, 2/2. (The battery keeps its charge off the feed.)
5. **Release.** The battery's current reaches `rl` and lights the kiln for the window (the kiln is the clock; it's free of the fuse check). **Throw `rl`** to 1: the shrine lights from the battery. Not the job yet.
6. **Close `br_E`.** The feed runs `fb_E` → `rl` → `sw_P` → shrine, 1/1. **Win**, 3 of 3.

## The trap

The battery is empty and its breaker is open, so the first click is `br_chg`. With the hall on, that puts 3 on a fuse rated 2 and **`fb_N` blows** (culprit: lamphouse): the hall goes dark, the battery doesn't charge, and `fb_N` shows the ✕ with *Repair (fuse)*. The read is that the fuse is full before you start: the hall has to come off for the charge. Recovery is on hand: open `br_hall`, repair `fb_N` with one fuse (it holds at 1/2), charge. Repairing straight away with the hall still on blows it again and costs that fuse; the second still recovers it.

The quieter mistake is at the end: closing `br_hall` with `br_chg` still closed is the same blow, so the spur has to come off before the hall goes back.

The relay part is the gentle bit (one relay, a 3 s window). Closing `br_E` first blows `fb_E` (kiln 3 on ≤1), as on 20-battery-run: the battery's path to `rl` doesn't run through `fb_E`, so the run goes on, and `fb_E` is repaired at the end (it holds at 1/1). Throwing `sw_P` inside the window works but spends window time on a switch that never needed it.

## What this map tests

- Whether "charging takes room on the fuse" reads from the bar (2/2) and the lamphouse's load before the first click, or only after the blow.
- Whether players put the hall back afterwards without being told (it's a target), and remember to unplug the spur first.
- Whether the plain/relay difference reads: `sw_P` moves in the dark, `rl` doesn't.

## Expected numbers

The analyzer (`npm run analyze`) isn't built yet (`tools/analyze.ts` doesn't exist). Numbers come from a brute-force search over the real simulator (`createGrid`, `advance`, `release`) in a scratch script: every click (throw, repair, release) is followed by *p* seconds, and "wait" is *p* seconds on its own. *p* = 1 s unless stated.

- Nodes: 17. Lines: 17. Faults: 0. Parts given: 2 fuses. Parts needed: none on the intended route; 1 per blow (`fb_N` if the charge breaker goes first, `fb_E` if `br_E` goes first).
- Faults readable at the start: 0 of 0.
- Wait to fill: 3 s with the spur on. At *p* = 1 the battery fills during the clicks, so there's no idle wait.
- Fewest actions to win: **8**: open `br_hall`, close `br_chg`, `sw_P`, open `br_chg`, close `br_hall`, release, `rl`, close `br_E` (the release isn't an undoable action, so the simulator's `actions` reads 7). 8 s at *p* = 1, 12 s at *p* = 1.5, 4 s at *p* = 0.5.
- Final load: 3 of 3. `fb_N` 2/2, `fb_E` 1/1.
- Winning control settings: **1 of 32** (`br_hall` closed, `br_chg` open, `br_E` closed, `rl` 1, `sw_P` 0).
- Reachable states (*p* = 1): 1,761, of which 672 can't win without Undo. **All 672 are fuse-short:** a fuse was spent on a repair that blew again at once, leaving fewer fuses than blown boxes. No dead end comes from anything else.
- Obvious first moves, all recoverable without Undo: `br_chg` (blows `fb_N`), `br_E` (blows `fb_E`), `br_hall`, `sw_P`. `rl` is refused (dark).
- Checked: `br_chg` first → `fb_N` blows, `rl` refused, then open `br_hall` → repair `fb_N` (1 fuse) → charge → `sw_P` → open `br_chg` → release → `rl` → close `br_hall` → close `br_E` completes with one fuse left. A battery released at 1 s goes flat before `rl` can be thrown. `br_E` first blows `fb_E` and the battery is still the way in.

## What it taught us

