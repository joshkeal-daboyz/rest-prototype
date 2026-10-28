# 17 · Why it blew — design note

Rung 17. The fuse box for the square blew last night. Enoch has two fuses, the ✕ is right there, and the obvious move is to fit one. But a fuse doesn't blow for nothing: everything behind it is still switched on.

**Element under test:** a blown fuse has a cause. The player reads the load behind a dead box (lamp loads are drawn even when dark) against its rating, and sheds before fitting the fuse. Still the fuse-rating element, but read backwards: from a blow that already happened.

## The map

15 nodes, 14 lines, 1 fault, 2 fuses. Feed capacity 4.

- `j0` → `br_gate` (closed) → `gate` (1, target), lit from the start.
- `j0` → `fb_1` (rating **2**, **blown**: `f1`) → `j1`, which feeds:
  - `br_mill` (closed) → `mill` (2)
  - `br_home` (closed) → `home` (1, priority)
  - `br_market` (closed) → `market` (1)
  - `sw_1`: position 0 → `lantern` (1), position 1 → `shrine` (2, target)

Behind the box at the start: 2 + 1 + 1 + 1 = **5**, against a rating of 2. That's why it blew.

## The intended read

1. The map opens with the gate lit (1 of 4). Pulses run into `fb_1` and none come out: **blown fuse**. Everything past it is dark.
2. Count what's past it: mill 2, home 1, market 1, lantern 1. That's 5 on a 2. The shrine is 2, so it has to be alone.
3. Open `br_mill`, `br_home` and `br_market`, throw `sw_1` to the shrine, *then* repair `fb_1`. The shrine lights at 2 of 2. **Win.** Feed 3 of 4.

## The trap

The obvious first move is to repair the ✕ with a fuse in hand. It **blows again at once**: load 5, rating 2, culprit `mill`. One fuse is gone, and the notice now says exactly why. With the second fuse, shed and switch, then repair: the job still wins (5 actions after the trap).

The second wrong read is to stop shedding too early: with only the mill and market off and the shrine switched in, the box sees home 1 + shrine 2 = 3 and blows again (culprit `shrine`). The home is the tribe's priority, and it has to go dark: the shrine fills the box.

Readable: the dark box shows no load bar to help, but every lamp's load is drawn and the rating is on the box; after a blow, the notice gives load, rating and culprit. Recoverable: two fuses, and the first blow tells you the cause. Two premature repairs leave the map stuck (Undo or Reset clears it).

## What this map tests

- Whether the player reasons about load behind a box they *can't read* (faults hide faults, finding 1's *ambiguous dark*), or fits the part because they hold it.
- Whether the re-blow notice (ticket 011: shock to the culprit, flare, words) teaches the cause in one go.
- Whether darkening the priority home to fit the shrine reads as the cost of the priests' request.

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 15, lines 14, faults 1. Parts given: 2 fuses. Parts needed: **1 fuse**; 2 after the trap.
- Faults readable at start: **1 of 1** (the blown box).
- Fewest actions to win: **5** (`br_mill`, `br_home`, `br_market`, `sw_1`, repair `fb_1`). After the trap: 6.
- Winning configurations: **1 of 64** (5 controls × the fault; `br_gate` must stay closed).
- Fuse at the win: `fb_1` 2 of 2. Final feed load: 3 of 4 (gate, shrine).
- Dead ends: 32 of 112 reachable states, all after two blown repairs. Every first move leaves the map winnable.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
