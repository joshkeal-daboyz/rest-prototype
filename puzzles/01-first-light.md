# 01 · First light — design note

The first rung of the ladder (the whole order is in `puzzles/README.md`). The shrine is dark because the tribe's breaker on its line is open. Close it.

**Element under test:** the breaker. A marked control that cuts everything downstream; closing it lets the current through. Nothing is scarce, nothing is broken, nothing can go wrong.

## The map

5 nodes, 4 lines, no faults, no parts. Feed capacity 3. `feed` → `j0`, which feeds the `home` (load 1, lit) directly and the `shrine` (load 1, target) through `br_1` (open).

## The intended read

1. The map opens with pulses running from the feed to `j0`. The home is lit: this is what a lit lamp looks like. Load 1 of 3.
2. Pulses also run up to `br_1` and stop: it's open. The shrine past it is dark and carries the target mark.
3. Click `br_1`. The shrine lights. Load 2 of 3. **Win.**

## The trap

None, on purpose. This map exists so the first thing the player does works. The only "wrong" read is to look for a fault; there isn't one, and the pulses stopping at a breaker (not a spark, not a ✕) are the first lesson: an open breaker stops current without anything being broken.

## What this map tests

- Whether the player finds the clickable control without text: is the tribe's mark on `br_1` read as "you can throw this"?
- Whether "pulses stop here" reads as the place to look (GDD review, finding 1: the reading is the core skill).
- Whether the target mark and the win are clear.

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

`tools/analyze.ts` doesn't exist on this branch, so these come from a throwaway breadth-first search over every throw and repair on the real simulator (`createGrid`).

- Nodes 5, lines 4, faults 0. Parts given: none. Parts needed: none.
- Faults readable at start: 0 of 0.
- Fewest actions to win: **1** (close `br_1`).
- Winning configurations: **1 of 2** (the breaker's two settings).
- Final load: 2 of 3 (home, shrine). Capacity never binds.
- Dead ends: none. Reachable states: 2.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
