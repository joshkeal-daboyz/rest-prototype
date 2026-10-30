# 22 · Look both ways — design note

The shrine at the top of the square is dark. A switch by the hub sends the feed north or south to reach it. The north cable sparks right at the switch. Enoch has one wire.

**Element under test:** scarce parts (three faults, one wire) with faults hiding faults. The visible break hides a dead junction behind it; the other route, behind the switch, needs only one wire. Look down both routes before you spend.

## The map

12 nodes, 12 lines, 3 faults. Feed capacity 3. Parts: wire.

| Route | Path to the shrine post `jm` | Faults |
| --- | --- | --- |
| North (`sw_1` at 0, start) | `l_n` → `jn` → `l_n2` | `l_n` damaged (1 wire), `jn` dead junction (2 wires, hidden) |
| South (`sw_1` at 1) | `l_s` → `js` → `l_s2`; `flood` (2) hangs off `js` | `l_s2` damaged (1 wire) |

`shrine` 1 (target) on `jm`. Homes: `br_hm` (closed) → `home_1`, `home_2` (1 each, priority).

## The intended read

1. The map opens at 2 of 3: the homes. Pulses leave the switch north and stop at a **spark** on `l_n`. One wire, one spark: it looks like the answer.
2. Don't spend yet. Throw `sw_1` south. The floodlight comes in (2): 4 of 3, **brownout**, and a spark on `l_s2` shows the south route's only break.
3. Open `br_hm`. 2 of 3, the flood lit.
4. Repair `l_s2`. The shrine lights. 3 of 3. **Win.**

(Opening `br_hm` before the switch avoids the brownout; same three actions.)

## The trap

The spark on `l_n` is the only fault on screen and Enoch has exactly one wire, so the obvious first move is to repair it. Power runs on to `jn` and stops: in, none out, no fuse to blame, a **dead junction** drawn with two gaps (*needs wire × 2, have 0*). Throwing the switch then shows the south spark, also *needs wire, have 0*. The map is stuck, and it says why: both prompts name the missing wire. Recovery is Undo. This is a harder trap than rung 13's, on purpose: the lesson from *Behind the first* (open the dark before you spend) now costs the job if ignored, and the switch is the dark to open.

## What this map tests

- Whether a switch reads as "another way to look" before it reads as "another way to route".
- Whether the dead junction's two-wire cost (drawn since ticket 011) reads before the player commits to the north route.
- Whether a brownout caused by *looking* (the flood) is understood and shed, not taken as a reason to throw the switch back.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 12. Lines: 12. Faults: 3 (`f1` `l_n`, `f2` `jn` hidden behind `f1`, `f3` `l_s2` hidden behind the switch).
- Faults readable at start: 1 of 3.
- Parts given: 1 wire. Parts needed: 1 wire (the north route would need 3).
- Fewest actions to win: 3 (throw `sw_1`, open `br_hm`, repair `l_s2`, in any order).
- Final load: 3 of 3 (flood, shrine). No fuses.
- Winning control settings: 1 of 4 (`sw_1` south, `br_hm` open).
- Reachable states: 10. Dead-end states: 4, all "wire spent on `l_n`".
- Obvious first move (repair `l_n`): **dead end**, readable (`jn` needs wire × 2, `l_s2` needs wire, have 0); Undo recovers.

## What it taught us

