# 54 · The whole ward — design note

The ladder's capstone. The whole ward hangs off one main fuse box rated 7, and the priests' five lamps add up to exactly 7. Nothing here browns out harmlessly any more: one lamp too many anywhere on the map at any moment blows the main fuse, and the ward goes dark. The ring has two breaks and Enoch has one wire. The chapel's relay can only be set from behind, through the ring, and the ward has room for that borrow only at one point in the job: after the homes are shed and before the last two bulbs go in.

**Element under test:** **capacity and the order targets are lit**, the brief's elements 4 and 8 made irreversible. A main fuse whose rating equals the capacity turns every brownout into a blow, so the player must decide what is lit, and when, across the whole map. Everything else is an earlier lesson used again: the ring split (27), which break gets the one wire (50), relays only move live (43), the borrow from behind (51, 53), dead lamps as room (43, 53).

## The map

31 nodes, 33 lines, 5 faults. Feed capacity 7, and `fb_M` ≤7 between the feed and everything. Enoch brings one wire, two fuses and two bulbs.

| Piece | What it is |
| --- | --- |
| Main | `feed` → `fb_M` ≤7 → `j0`; `j0` → `br_h` (closed) → homes (2, priority) |
| North | `fb_N` ≤3 → relay `r_N` [mill 2 \| ring post `R0`] |
| South | `jS1` → `jS2` → `br_S` (open) → `fb_S` ≤4 (**blown**) → relay `r_S` [ovens 2 \| ring post `R3`] |
| Ring | `R0` (well 1) – `R1` (shrine 2) – **`l_r12` damaged** – `R2` (gate 1, **dead lamp**) – **`l_r23` damaged** – `R3` (bell 2, **dead lamp**) – `br_o` (closed) – `R0` |
| Tie | `R2` → `br_t` (open) → `jt` → lantern (1, priority) and on to relay `r_E` |
| East | `br_E` (open) → `fb_E` ≤1 → relay `r_E` [**forge 3** \| chapel 1] |

Targets: well 1, shrine 2, gate 1, bell 2, chapel 1 = 7 = capacity = `fb_M`.

## The intended read

1. The map opens with the homes and the mill lit (`fb_M` 4/7). Throw `r_N` to the ring: the mill goes dark, the well and shrine light (`fb_N` 3/3). Through `br_o` current reaches `R3` too: the bell flickers red, and **both ring breaks spark**, `l_r12` from `R1` and `l_r23` from `R3`. One wire.
2. Which break? The gate (1) sits between them at `R2`. Wire `l_r12` and the gate joins the north, which is already full (3/3). Wire `l_r23` and it joins the south (≤4). So the wire goes to **`l_r23`**, and `l_r12` stays broken as the ring's first open point. The second has to be **`br_o`**: open it, or the north (nearer to `R3` than the south) keeps the bell's half too.
3. Count the main fuse for the borrow ahead. The forge (3) can't go through `fb_E` (≤1), so `r_E` must be set from behind, through the tie, on the south: forge 3 + lantern 1 = 4 on `fb_S` (≤4), with the gate and bell still dead. On `fb_M` that is the north's 3 + the south's 4 = 7 of 7, which only fits with **the homes, mill and ovens all dark**. So **open `br_h`** before the borrow.
4. Close `br_S`: `fb_S` ✕. Repair it (a fuse): the ovens light through `r_S` (`fb_M` 5/7). Throw `r_S` to the ring (the ovens go dark), then repair `l_r23`: `R2` is live and the gate flickers red.
5. The borrow: close `br_t` (forge and lantern on `fb_S` 4/4, `fb_M` **7/7**), throw `r_E` to the chapel, open `br_t`, close `br_E` (chapel 1/1).
6. The bulbs last: gate, then bell. `fb_S` 3/4, `fb_M` 7/7, load 7 of 7. **Win.**

## The trap

There are several, each a version of "too much lit at the wrong moment", and each one blows the main fuse or a feeder rather than browning out:

- **The homes left on for the borrow.** Every step looks fine until `br_t` closes: then `fb_M` carries 9 of 7 and **the main fuse blows** (culprit `forge`), and the ward goes dark. The second fuse recovers it once: open `br_t`, open `br_h`, repair `fb_M`. This is the trap the map is built around, the capacity decision made irreversible. It is readable before (`fb_M`'s bar at 5/7, the forge marked 3 and the lantern 1 on the tie) and after (the notice names the forge, and the path runs through the tie).
- **The wrong wire.** `l_r12` is the first spark on the north's side and the nearer one to the shrine. Wiring it puts the gate on `fb_N`: when the gate's bulb goes in, `fb_N` carries 4 of 3 and blows (culprit `gate`). The wire is gone, so `l_r23` can't be repaired and the borrow can never reach `r_E`. A dead end; Undo.
- **A bulb too early.** Fix the bell before the borrow and closing `br_t` asks for 9 of 7: the main fuse blows (culprit `forge`).
- **`br_E` first.** The forge meets `fb_E` (≤1), which blows (culprit `forge`). Recoverable with the spare after the borrow.
- **`br_o` left closed.** Once `r_S` is on the ring, `fb_S`'s bar stays at 0 and `fb_N` holds the bell's half; any further load there blows `fb_N`.
- **`br_t` left closed at the end.** The lantern stays lit, and the last bulb tips `fb_M` to 8 of 7 (culprit `bell`).

The map gives one spare fuse, so one of these can be recovered with a part and the second needs Undo. Every needed fact is on the map (ratings, loads, switch positions, relay marks), and the order follows from three counts: the north is full, the south has room for one borrow, and the main fuse has room only if every priority lamp is dark.

## What this map tests

- Whether a capacity that blows rather than browns out makes "what is lit, and when" a real plan, not a fix-up at the end (GDD review finding 1: *capacity, small*; brief question 2).
- Whether players can carry several late-ladder lessons at once without the map telling them which applies.
- The ceiling: how long the hardest map takes cold, and whether it still feels fair. If Josh finds it unfair, the first thing to give back is a second spare fuse.

## Expected numbers (analyzer not built yet: brute force over the real simulator, `createGrid`)

- Nodes: 31. Lines: 33. Faults: 5 (`f_x`, `f_y`, `f_S`, `f_gate`, `f_bell`). Parts given: wire, 2 fuses, 2 bulbs. Parts needed: wire, 1 fuse, 2 bulbs (one fuse is a spare). `f_x` (`l_r12`) stays unrepaired.
- Faults readable at start: 0 of 5. `f_x`, `f_y` and `f_bell` appear when `r_N` is thrown; `f_S` when `br_S` closes; `f_gate` after `l_r23`.
- Fewest actions to win: **13** (`r_N`, open `br_o`, open `br_h`, close `br_S`, repair `fb_S`, `r_S`, repair `l_r23`, close `br_t`, `r_E`, open `br_t`, close `br_E`, bulb on `gate`, bulb on `bell`). The ordering freedom is only in when the free breakers are thrown; 35272 orderings reach the win in 13.
- Final load: **7 of 7**, and `fb_M` 7/7. Fuses at the win: `fb_N` 3/3, `fb_S` 3/4, `fb_E` 1/1. During the borrow `fb_M` and `fb_S` are both exactly full (7/7, 4/4): the tightest moment in the ladder.
- Winning control settings: **1 of 256** (`br_S` and `br_E` closed, `br_h`, `br_o` and `br_t` open, all three relays at position 1), with `l_r12` left broken.
- Reachable states: 21010, of which 18150 (86%) can't win without Undo, the highest share in the ladder.
- First moves: `br_E` blows `fb_E` (recoverable with the spare); everything else is safe. `r_S` and `r_E` refuse (dark relays).

## What it taught us

