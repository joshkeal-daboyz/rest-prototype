# Which fuse — design note

Three fuse boxes hang off the square's hub, each rated differently: ≤1, ≤2, ≤3. The priests want the shrine, the well and the gate lit tonight. The shrine is the heaviest thing they ask for, and the fuse box nearest it is the smallest. Enoch has two fuses.

Josh's words: "There should also be a 'health bar' for the load on the fuse. It will be useful for puzzles that require managing fuses properly. In fact, create a fuse management puzzle."

**Element under test:** the brief's element 5, **which fuse**. Three branches on fuses of different ratings; moving a load means a different route. Each fuse box feeds a switch that picks one of two lamps, and two lamps (the shrine and the gate) can be reached from two fuses each. Making room for the shrine on a fuse that can hold it pushes a lamp down the line, and the last lamp in that chain, the mill, has to go dark. Designed for a player who can see each fuse's load bar (ticket 012 B).

## The map

15 nodes, 16 lines, no faults. Feed capacity 4. Enoch brings two fuses.

| Branch | Fuse | Switch | Position 0 (start) | Position 1 |
| --- | --- | --- | --- | --- |
| Top | `fb_1` ≤1 | `sw_1` | `well` (1, target) | shrine post `j_shrine` |
| Middle | `fb_2` ≤2 | `sw_2` | gate post `j_gate` | shrine post `j_shrine` |
| Bottom | `br_3` (open) → `fb_3` ≤3 | `sw_3` | `mill` (3) | gate post `j_gate` |

`j_shrine` → `shrine` (2, target). `j_gate` → `gate` (1, target). The shrine and gate sit on posts (junctions) because a lamp is a leaf with one line; the post is where two fuses' routes meet.

Targets: shrine 2 + well 1 + gate 1 = 4, exactly the feed's capacity, so the mill (3) can never be lit in a win. `fb_3` could carry it (3 of 3); only the feed can't.

## The intended read

1. The map opens with the top and middle branches live: the well on `fb_1` (bar full, 1 of 1), the gate on `fb_2` (1 of 2). The bottom breaker is open, so `fb_3` and the mill are dark. Load 2 of 4. The shrine is dark, and `sw_1`'s second line runs straight to it.
2. Count. The shrine is 2. `fb_1` is ≤1, so it can't carry it. `fb_2` is ≤2: it can, but its switch then drops the gate. The gate's other route is `fb_3`, behind the open breaker, whose switch is set to the mill.
3. Throw `sw_2` to the shrine. The shrine lights, the gate goes dark. `fb_2` carries 2 of 2 (bar full). Load 3 of 4.
4. Throw `sw_3` to the gate post (nothing changes yet: the breaker is open).
5. Close `br_3`. The gate lights through `fb_3` (1 of 3). Load 4 of 4, every fuse holds. **Win.**

If the player closes `br_3` before throwing `sw_3`, the mill comes in: load 6 of 4 (5 of 4 if the shrine isn't on yet), **brownout**, but `fb_3` holds at 3 of 3. That is the capacity telling them the mill is the branch that stays dark; throwing `sw_3` to the gate clears it and wins.

## The trap

The shrine is dark and the nearest switch, `sw_1`, has a line running straight to it, so the obvious first move is to throw `sw_1`. That puts the shrine's 2 through `fb_1`, rated 1: over by exactly one, and **`fb_1` blows** (`fuse:blown`: load 2, rating 1, culprit `shrine`), taking the well dark with it.

It is readable before and after. Before: `fb_1`'s bar is already full with the well's 1, and the shrine is marked 2. After: the blown-fuse ✕ on `fb_1`, the shock running to the shrine, the notice. It is recoverable: throw `sw_1` back to the well, then repair `fb_1` with one fuse; the well relights and the fuse holds. Then the intended route (steps 3–5) wins with one fuse left. If the player repairs `fb_1` while `sw_1` still points at the shrine, it blows again at once (same culprit) and costs the first fuse; the second fuse still recovers it the same way. Leaving the blown fuse and setting the rest first doesn't win (the well is a target and sits only behind `fb_1`), but it isn't stuck either: throw `sw_1` back and repair. Undo also restores the fuse. Only two premature repairs in a row leave the map stuck, and Undo or Reset clear that.

A quieter detail: if both switches that reach a post point at it (`sw_1` and `sw_2` at the shrine, or `sw_2` and `sw_3` at the gate), the lamp counts under the upper branch's fuse, since the current reaches the post from there first. The load bar shows which fuse is carrying it. For the shrine that means `fb_1` blows even with `sw_2` also set to it; that's the trap again, with the same recovery.

## What this map tests

- Whether the load bar turns fuse ratings into a plan: does the player read `fb_1`'s full bar and the shrine's 2 and go to `fb_2` first, or click the nearest switch and learn from the blow?
- Whether "make room" reads: moving the shrine onto `fb_2` drops the gate, which must move down to `fb_3`, which drops the mill. A chain of two moves, not one.
- Whether the brownout from letting the mill in reads as *capacity*, distinct from a fuse blow (GDD review, finding 1, *capacity, small*). The two limits appear side by side here: `fb_3` holds the mill fine; the feed doesn't.
- Whether a blow you can recover from with a part on hand feels like a lesson, not a punishment (battery-run's "What it taught us").

## Expected numbers (by hand; the analyzer isn't built yet)

- Nodes: 15. Lines: 16. Faults: 0. Parts given: 2 fuses. Parts needed: none on the intended route; 1 fuse after the trap (2 if the player also repairs once too early).
- Faults readable at start: 0 of 0. A blown `fb_1` appears only if the shrine is sent to it.
- Fuse loads at start: `fb_1` 1/1, `fb_2` 1/2, `fb_3` 0/3 (breaker open). At the win: `fb_1` 1/1, `fb_2` 2/2, `fb_3` 1/3.
- Fewest actions to win: 3 (throw `sw_2`, throw `sw_3`, close `br_3`). After the trap: 6 (trap, throw `sw_1` back, repair `fb_1`, then the three).
- Final load: 4 of 4 (shrine, well, gate). The mill dark.
- Winning configurations: 1 of the 16 settings of `sw_1`, `sw_2`, `sw_3` and `br_3` (`sw_1` at the well, `sw_2` and `sw_3` at 1, breaker closed). Every setting with `sw_1` at the shrine blows `fb_1` (8 of 16).

Checked against the real simulator (`createGrid`) with a throwaway script: start lights the well and gate at 2 of 4; `sw_2`, `sw_3`, `br_3` wins at 4 of 4 with no blow; closing `br_3` before `sw_3` browns out at 6 of 4 (5 of 4 from the start) without blowing `fb_3`, and `sw_3` then wins; throwing `sw_1` first blows `fb_1` with load 2, rating 1, culprit `shrine`, path `l_1b → l_1s → l_shrine`, and the blown fuse is readable; `sw_1` back + repair relights the well and the route then wins with one fuse left; a premature repair re-blows (culprit `shrine`) and the second fuse still recovers and wins; setting the route with `fb_1` left blown doesn't win until `sw_1` is thrown back and `fb_1` repaired; Undo after the blow restores the fuse; a brute force over all 16 switch and breaker settings finds exactly the one winner. (`fuseLoad` from ticket 012 A wasn't on this branch yet, so the fuse loads above are by hand.)

## What it taught us

*(Josh's verdict goes here, in his words.)*

## What it taught us

Josh, 28 Oct 2026: "You cannot fix the fuse, it just blows every time you fix the fuse. Some switches should switch back when the power is not on." Off-track as a map: the recovery (throw `sw_1` back before repairing) was in this note but not in the game, so every repair re-blew and cost a fuse. Fix: spring switches and a "would blow again" warning on the repair (ticket 013).
