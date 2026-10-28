# Where it stops — design note

The well at the top of the yard has gone dark. The priests want water drawn by light. Enoch has two wires and a map where something sparks.

**Element under test:** reading. Current shows where it stops, and the stop is the fault. No switch, no capacity pressure, no hidden faults: the whole answer is on the screen at the start.

## The intended read

The map opens with the feed live and `br_main` closed. Pulses run `feed → j1`, and the gate lamp is lit. They go on along `l_run` to `j2`, where they split:

- Down `l_porch`, toward the porch lamp drawn right beside the well: pulses run halfway and stop at a **spark**. Damaged cable, one wire. Loud, animated, and it points straight at the dark corner where the well is.
- Up `l_up` to `j3`: pulses go in and none come out, with no fuse to blame. A **dead junction**, two wires. Quiet. The steps lamp and the well both hang off it.

1. Follow the current to the well, not the eye. The well's line leaves `j3`, not the sparking cable.
2. Repair `j3` with both wires. The steps and the well light. **Win.**

The porch stays dark; it was never asked for.

## The trap

The spark is the only thing moving on the map, and it sits right next to the dark target, so a player who fixes "the fault near the well" spends a wire on the porch. Then `j3` needs two wires and Enoch has one: the well stays dark (undo is the only way back). The brief asks for a chain with one fault; this map has one fault on the target's chain and one decoy off it, because with a single fault there is nothing to misread and no part to waste.

## What this map tests

- Whether players read the path of the current or go to the loudest signal (GDD review, finding 1: is fault-finding a deduction or a walk?).
- Whether the dead-junction signature (in, none out, no fuse) reads without text when a spark is competing for attention.
- Whether a single-action map feels like a puzzle at all once read correctly.

## Expected numbers (by hand; the analyzer isn't built yet)

- Nodes: 9. Faults: 2 (`f1` dead junction on the chain, `f2` damaged cable on the porch spur).
- Faults readable at start: 2 of 2. Nothing is hidden; this map is about reading, not discovery.
- Parts given: 2 wire. Parts needed for the winning route: 2 wire. (Fixing `f2` first leaves 1, and `f1` needs 2: unsolvable without undo.)
- Fewest actions to win: 1 (repair `j3`).
- Final load: 3 of 4 (gate, steps, well). No fuses. Capacity never binds.
- Winning configurations: 1 (`br_main` closed, `f1` repaired, `f2` not).

Checked against the real simulator (`createGrid`): readable faults at start, the one-action win, and that fixing the porch first leaves `j3` at *needs wire × 2, have 1*.

## What it taught us

*(Josh's verdict goes here, in his words.)*
