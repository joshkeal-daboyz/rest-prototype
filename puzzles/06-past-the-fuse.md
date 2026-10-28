# 06 · Past the fuse — design note

Rung 06: the first blown fuse and the first dead bulb in the ladder. The shrine on the north lane is dark behind a blown fuse box. The market and two homes are lit on their own breakers. Enoch has one fuse and one bulb.

**Element under test:** faults hide faults, then capacity. A blown fuse hides a dead bulb; fixing both pushes the feed over its capacity, and the player sheds one branch. A gentle rung: two ideas in sequence, no dead ends, more than one way to win.

## The map

12 nodes, 11 lines, 2 faults. Feed capacity 4. Parts: fuse, bulb.

| Branch | Control | Lamps (load) |
| --- | --- | --- |
| North | `fb_A` ≤3 (**blown**) | `shrine` 1 (target, **dead bulb**), `lane` 1 |
| Market | `br_mk` (closed) | `market` 1 |
| Homes | `br_hm` (closed) | `home_1` 1, `home_2` 1 (priority) |

## The intended read

1. The map opens at 3 of 4: market and homes lit. Pulses run into `fb_A` and none come out: a **blown fuse**. Nothing past it can be read.
2. Repair `fb_A`. The lane lights; pulses reach the shrine's post and the shrine stays dark, flickering red at the socket: a **dead bulb**. Load 4 of 4; `fb_A` carries 1 of 3.
3. Repair the shrine. Load 5 of 4: **brownout**, everything flickers.
4. Count: shed 1 or more. Throw `br_mk` (market, 1): 4 of 4. **Win.** The homes stay lit.

## The trap

The brownout arrives on the bulb repair, so it reads as "the bulb broke something", and the instinct is to Undo the repair. The bulb was right; the feed is full. Then comes the choice of what to shed: the homes branch is the heavier one (2) and clears the brownout with room to spare, but it darkens the tribe's priority lamps. The market alone is enough. Shedding the homes still wins, so this rung forgives the wrong choice; it only costs the priority lamps.

Readable and recoverable: the brownout flicker and the load readout say what happened, either breaker clears it, and nothing on this map can dead-end.

## What this map tests

- Whether a hidden fault discovered by a repair reads as discovery (from *Behind the first*), here without a part-spending trap.
- Whether a brownout caused by your *last correct* repair reads as capacity, not as a mistake (GDD review, finding 1, *capacity, small*).
- Whether players shed the smallest sufficient branch and protect priority lamps unprompted.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 12. Lines: 11. Faults: 2 (`f1` blown `fb_A`; `f2` dead `shrine`, hidden behind `f1`).
- Faults readable at start: 1 of 2.
- Parts given: fuse, bulb. Parts needed: both.
- Fewest actions to win: 3 (repair `fb_A`, repair `shrine`, throw `br_mk`; the throw can come first).
- Final load: 4 of 4 (lane, shrine, two homes). `fb_A` peaks at 2 of 3; it never blows.
- Winning control settings: 3 of 4 breaker settings (market off 4/4; homes off 3/4; both off 2/4). Loose on purpose: it brings in two new kinds of fault, so it has no way to lose.
- Reachable states: 12. Dead-end states: 0. No action on this map blows a fuse.

Checked against the simulator: start 3/4 with `f1` readable; repair `fb_A` gives 4/4 with `f2` readable; repair `shrine` gives 5/4 brownout; `br_mk` completes at 4/4.

## What it taught us

