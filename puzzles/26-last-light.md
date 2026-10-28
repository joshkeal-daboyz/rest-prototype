# 26 · Last light — design note

Rung 26: fuse management end to end. The main fuse box blew. The priests want the shrine and the home lit tonight, and the feed carries exactly 3, their combined load. The shrine and the home hang off the same switch on the dead box, so the home has to come from the small box round the side, which is switched off and set to the well. Enoch has two fuses.

**Element under test:** fuse management end to end. It combines 21 (move a load to another fuse) and 17 (a blown fuse has a cause) and adds no new rule. The single question is what must be on which fuse before the part goes in.

## The map

16 nodes, 16 lines, 1 fault, 2 fuses. Feed capacity 3.

| Fuse | Rating | Behind it |
| --- | --- | --- |
| `fb_1` (**blown**, `f1`) | 2 | `br_mill` (closed) → `mill` (2); `br_lan` (closed) → `lantern` (1); `sw_1`: position 0 → home post `j_home`, position 1 → `shrine` (2, target) |
| `fb_2` (behind `br_2`, open) | 1 | `sw_2`: position 0 → `well` (1), position 1 → home post `j_home` |

`j_home` → `home` (1, target). Both lines into the post leave a switch, so there is no ring.

## The intended read

1. The map opens **dark**: nothing is lit. Pulses run into `fb_1` (blown, ✕) and up to `br_2` (open).
2. Behind `fb_1`: mill 2 + lantern 1 + home 1 = 4 on a 2. That's why it blew.
3. The shrine is 2: it has to be alone on `fb_1`. `sw_1` gives the shrine or the home, so the home must come from `fb_2`, rated 1. It fits only if the well gives way.
4. Open `br_mill` and `br_lan`, throw `sw_1` to the shrine, repair `fb_1` (shrine, 2 of 2). Throw `sw_2` to the home and close `br_2` (home, `fb_2` 1 of 1). **Win.** Feed 3 of 3, no headroom anywhere.

## The trap

- **Fit the fuse first.** The ✕ is the only thing on screen. Repairing at once blows it again: load 4, rating 2, culprit `mill`. One fuse spent, cause named, the second fuse finishes the job.
- **Shed the mill and stop.** With the mill off, a repair holds (lantern + home = 2 of 2), and it looks solved. But the shrine needs all of `fb_1`, so the lantern goes and the home moves. Switch `sw_1` to the shrine now with the lantern still on and it blows (3 of 2). The bar is full before the throw: readable.
- The well (`fb_2`, rated 1) is the last thing to give up. Closing `br_2` first lights the well; `sw_2` then swaps it for the home. No blow on that side: the small box is a budget to read, not a second trap.

Only two premature repairs leave the map stuck (Undo or Reset clears it).

## What this map tests

- Whether the player can plan a whole fuse layout from a dark map (one blown box, one switched-off box) before spending a part. This is the skill the later fuse maps assume.
- Whether "a switch gives one or the other" (02) is recalled when it blocks the obvious "light both from the big box".
- How long a six-action plan takes cold, against the brief's question 3 (how many actions a good map takes).

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 16, lines 16, faults 1. Parts given: 2 fuses. Parts needed: **1 fuse**; 2 after the first trap.
- Faults readable at start: **1 of 1**.
- Fewest actions to win: **6** (`br_mill`, `br_lan`, `br_2`, `sw_1`, `sw_2`, repair `fb_1`, in any order that sheds before the repair).
- Winning configurations: **1 of 64**.
- Fuses at the win: `fb_1` 2 of 2, `fb_2` 1 of 1. Final feed load: **3 of 3**.
- Dead ends: 32 of 120 reachable states, all after two blown repairs. Every first move leaves the map winnable.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
