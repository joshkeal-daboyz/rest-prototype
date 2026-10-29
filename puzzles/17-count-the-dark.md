# 17 · Count the dark — design note

The shrine branch was switched off after its fuse blew. The priests want the shrine and the lane. A switch on the south side feeds either the market or the two homes, and it's set to the homes. Enoch has two fuses and a bulb.

**Element under test:** the shared fuse with a hidden fault, where the hidden fault changes the arithmetic. A dead lamp draws nothing, so the fuse bar doesn't count it. Fix the bulb and its load arrives all at once.

## The map

14 nodes, 13 lines, 2 faults. Feed capacity 4. Parts: fuse, fuse, bulb.

| Branch | Controls | Lamps (load) |
| --- | --- | --- |
| North | `br_A` (**open**) → `fb_A` ≤3 (**blown**) | `shrine` 2 (target, **dead bulb**), `lane` 1 (target), `stall` 1 behind `br_st` (closed) |
| South | `sw_T`: 0 → `market` 1, 1 → `home_1` + `home_2` (1 each, priority); starts at 1 | |

## The intended read

1. The map opens at 2 of 4: the homes. The north branch is dark behind an open breaker. Close `br_A`: `fb_A` buzzes, a **blown fuse**.
2. Count before mending. Behind `fb_A`: shrine 2, lane 1, stall 1 = 4 against a rating of 3. Open `br_st`.
3. Repair `fb_A`. The lane lights; pulses reach the shrine and it stays dark, red at the socket: a **dead bulb**. `fb_A` reads 1 of 3; the shrine's 2 isn't on the bar yet.
4. Repair `shrine`. `fb_A` 3 of 3. Feed: 3 + homes 2 = 5 of 4, **brownout**.
5. Throw `sw_T` to the market. 4 of 4. **Win.** The homes go dark.

## The trap

Done in the natural order (close `br_A`, repair `fb_A`), the bar reads 2 of 3 with lane and stall lit: room to spare. Then the bulb repair brings the shrine's 2 onto the box at once: 4 against 3, and **`fb_A` blows** (culprit `shrine`). The bar was honest: a dead lamp draws nothing. The player had to count the dark lamp's load before fixing it. Readable: the ✕, the shock to the shrine, the shrine's label 2. Recoverable with the spare: open `br_st`, repair `fb_A`; the shrine's bulb is already fixed, so it lights straight away (3 of 3), and the brownout that follows points at the switch.

Two premature fuse repairs (re-repairing with the stall still on) leave no fuse; Undo clears it.

**Ticket 013.** A repair that blows again at once is the pattern Josh called off-track on *Which fuse* (28 Oct 2026). Here the reason is on the map (a closed spur, lamp loads against the rating), but this trap reads best once ticket 013 C shows *would blow again: N load on ≤R* on the blown fuse's hover. Play it after 013, or expect the re-blow to need explaining.

## What this map tests

- Whether players learn that the fuse bar shows *live* load and that a dead lamp's load is pending: "count the dark".
- Whether a blow caused by a correct repair (the bulb) is traced to the stall that should have been shed, not to the bulb.
- A switch used for shedding, not routing: market or homes, one of two, and capacity picks.

## Expected numbers (by hand: `npm run analyze` isn't built yet; numbers from a throwaway brute force over the real simulator, `createGrid`)

- Nodes: 14. Lines: 13. Faults: 2 (`f1` blown `fb_A`, behind the open `br_A`; `f2` dead `shrine`, behind `f1`). Readable at start: 0 of 2.
- Parts given: 2 fuses, 1 bulb. Parts needed: 1 fuse, 1 bulb (2 fuses after the trap).
- Fewest actions to win: 5 (close `br_A`, open `br_st`, throw `sw_T`, repair `fb_A`, repair `shrine`).
- Final load: 4 of 4 (shrine, lane, market). `fb_A` 3 of 3.
- Winning control settings: 1 of 8 (`br_A` closed, `br_st` open, `sw_T` market).
- Reachable states: 44. Dead-end states: 8 (both fuses blown).
- No first move blows anything; the trap is the third action. Traced: close `br_A`, repair `fb_A` (2/3 on the box), repair `shrine` blows `fb_A` (load 4 > 3, culprit `shrine`); open `br_st`, repair `fb_A` gives 5/4 brownout; `sw_T` completes at 4/4.

## What it taught us

