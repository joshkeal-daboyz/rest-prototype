# 16 · Behind the first — design note

The shrine at the end of the lane is dark and so is everything around it. Enoch has a fuse and two wires, and two faults he can see. There is a third he can't.

**Element under test:** faults hide faults. Fix a fuse, power returns, and a second fault appears past it. Nothing downstream of a blown fuse gives any information until the fuse is fixed.

## The intended read

The map opens with the feed live. Pulses reach `j1` and split:

- Toward `fb_A`: pulses in, none out. A **blown fuse**, one fuse. Everything past it (the gate, `j3`, the stair, the shrine) is dark and unreadable.
- Toward the yard lamp along `l_yard`: pulses stop at a **spark**. Damaged cable, one wire. The yard is a `priority` lamp: the tribe wants it back.

Nothing is lit. Two faults are readable, and the parts on hand (fuse, wire, wire) seem to cover both with a wire to spare.

1. Repair `fb_A`. Power returns past it: the gate lamp lights, pulses run on to `j3` and stop. In, none out, no fuse: a **dead junction**, two wires. The fuse holds (load 1 of 3).
2. Repair `j3` with both wires. The stair and the shrine light. Load 3 of 3 on `fb_A`, 3 of 4 on the feed. **Win.**

The yard stays dark.

## The trap

Two faults are readable at the start and the parts look like they cover both, so the natural move is to fix everything you can see: the fuse and the yard's cable. That spends a wire before the player knows what is behind the fuse, and the dead junction it reveals needs two: the shrine stays dark. The right habit is restraint: open the dark first, read what it hides, and only then spend. The yard being a priority lamp makes the greedy repair feel virtuous, and the win leaves the tribe's yard dark.

## What this map tests

- "Faults hide faults" as deduction on a map seen whole: does a dark, unreadable region make the player hold parts back? (GDD review, finding 1, *ambiguous dark*.)
- Whether the appearance of a new fault after a repair reads as discovery rather than as the game cheating.
- Whether players learn to spend last, which later maps (two wires, one job; the priests' list) rely on.

## Expected numbers (by hand; the analyzer isn't built yet)

- Nodes: 10. Faults: 3 (`f1` blown fuse, `f2` damaged cable on the yard spur, `f3` dead junction behind the fuse).
- Faults readable at start: 2 of 3 (`f1`, `f2`). `f3` hides behind `f1`.
- Parts given: 1 fuse, 2 wire. Parts needed for the winning route: 1 fuse, 2 wire (all of them). Repairing `f2` at any point makes the shrine unreachable.
- Fewest actions to win: 2 (repair `fb_A`, repair `j3`).
- Final load: 3 of 4. Fuse `fb_A` carries 1 after step 1 and 3 (its rating) after step 2; it never blows.
- Winning configurations: 1 (`br_main` closed, `f1` and `f3` repaired, `f2` not).

Checked against the real simulator (`createGrid`): `f3` unreadable (and unrepairable) at start, readable after the fuse, the two-repair win, and that both yard-first and fuse-then-yard leave `j3` at *needs wire × 2, have 1*.

## What it taught us

Josh, 27 Oct 2026: "why do you need two wires to fix the last leg of the circuit rather than 1? … it's not clear." The dead junction's two-wire cost is a rule from the GDD's fault table, but nothing on the map shows it; the junction is a dot and the "× 2" only appears in the prompt. Fix: draw a dead junction with two broken stubs and name the cost on hover (ticket 011, part B1). The trap itself stands.

*(Josh's verdict goes here, in his words.)*
