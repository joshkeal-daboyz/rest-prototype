# 47 · The open point — design note

A ring main: five posts in a loop, fed from the west fuse at one end and the east fuse at the other, both rated 3. Breakers between posts decide where the ring is **open**, and so which fuse carries which post. One spark on the ring, one dead bulb behind it. The spark is the right repair, at the wrong time.

**Element under test:** the brief's element 6, **ring main**: a loop fed from two sides; a fault's effect depends on how the loop is set. Here the setting is the ring's open point, which real ring mains have.

## The map

20 nodes, 20 lines, 2 faults. Feed capacity 6. Enoch brings 1 wire, 1 bulb. No fuse.

Ring, west to east: `fb_W` ≤3 → **pA** → `l_AB` (**damaged**, `cut_AB`) → **pB** → `br_BC` (closed) → **pC** → `br_CD` (**open**) → **pD** → **pE** → `fb_E` ≤3 → `br_E` (**open**) → feed.

| Post | Lamps |
| --- | --- |
| pA | `shrine` 2 (target); `br_cot` → `cottage` 1 (priority) |
| pB | `well` 1 (target, **dead bulb**, `dark_well`) |
| pC | `bell` 1 (target); `br_smith` → `smithy` 1 (priority) |
| pD | `gate` 2 (target) |

Targets: 2 + 1 + 1 + 2 = 6 = capacity = the two fuses together.

## The intended read

1. The map opens with the west live: shrine and cottage lit, `fb_W` **3 of 3**. `cut_AB` sparks just past pA. The east is dark (`br_E` open).
2. Split the ring. Each fuse carries 3, so the targets must split shrine + well (3) | bell + gate (3). The open point has to be between pB and pC: `br_BC`, which is closed. `br_CD`, the one that's open, is in the wrong place.
3. Open `br_cot` (the cottage can't fit on a full west) and open `br_BC`.
4. Repair `cut_AB`: current reaches pB, the well is dark with current at its post: a **dead lamp**. Replace the bulb. West: 3 of 3.
5. Close `br_E`: the gate lights, east 2 of 3. Open `br_smith`, then close `br_CD`: the bell lights, east 3 of 3. Load 6 of 6. **Win.**

## The trap

The spark is the only fault on the map and it *is* on the winning route, so it is the natural first click. Repaired too early, with the ring still closed at `br_BC`, it joins the west to pC: shrine 2 + cottage 1 + bell 1 + smithy 1 = 5 through ≤3, and **`fb_W` blows** (culprit `bell`). There's no fuse in the satchel: dead end. Same if the well's bulb goes in before the cottage is shed (shrine + cottage + well = 4).

The east has the mirror image: close `br_E` and then `br_CD` with the smithy on, and the east carries gate + bell + smithy = 4 and **`fb_E` blows**. Also a dead end.

All readable before: the west bar is already full at the start, and every lamp shows its load. All readable after: the ✕, the shock to the culprit. Undo recovers.

Unlike 24 and 37, the trap isn't *which* fault to repair; it's *when*. **Set the open point before you close the ring.**

## What this map tests

- Whether a ring reads as two radial feeds meeting at an open point, and whether moving the open point reads as moving load between fuses.
- Whether a breaker that is closed can be the problem (players open breakers to shed, rarely to split).
- Whether a correct repair that blows a fuse because of timing reads as "not yet" rather than "wrong".

## Expected numbers

- Nodes 20, lines 20, faults 2 (damaged cable, dead lamp). Parts given: 1 wire, 1 bulb. Parts needed: both.
- Faults readable at start: 1 of 2. `dark_well` shows when `cut_AB` is repaired.
- Fuse loads at start: `fb_W` 3/3, `fb_E` 0/3. At the win: 3/3 and 3/3.
- **Fewest actions to win: 7** (open `br_cot`, `br_BC`, `br_smith`; close `br_E`, `br_CD`; repair `cut_AB`, `well`; 472 shortest orderings).
- Final load: 6 of 6 (shrine, well, bell, gate). Cottage and smithy dark.
- **Winning configurations: 1** of 32.
- Reachable states 258; **dead ends 206** (every state with a blown fuse). First move *repair `cut_AB`* is a dead end; every other first move stays winnable in 6.

Numbers from a throwaway breadth-first search over `createGrid` (`tools/analyze.ts` isn't built yet). The two blows (west culprit `bell` at 5/3, east culprit `bell` at 4/3) and the win were replayed on `createGrid`.

## What it taught us

*(Josh's verdict goes here, in his words.)*
