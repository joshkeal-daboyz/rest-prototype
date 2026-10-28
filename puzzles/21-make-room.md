# 21 · Make room — design note

Rung 21. Two fuse boxes. The shrine can only be fed from the first, which is rated 3 and already carries the market (2) and the home (1). The priests want the shrine, the home and the lantern lit. The home's post can also be fed from the second fuse box, which is switched off and set to the mill. Enoch has two fuses.

**Element under test:** moving a load to another fuse (brief element 5, *which fuse*, as a single move rather than 11-which-fuse's chain). Room is made on one fuse by moving a lamp onto another one that has room, and the second fuse has its own limit too.

## The map

17 nodes, 17 lines, no faults, 2 fuses. Feed capacity 5.

| Fuse | Rating | Behind it |
| --- | --- | --- |
| `fb_1` | 3 | `br_m` (closed) → `market` (2); `sw_1`: position 0 → home post `j_home`, position 1 → `shrine` (2, target) |
| `fb_2` (behind `br_2`, open) | 2 | `sw_2`: position 0 → `mill` (2), position 1 → home post `j_home`; `br_lan` (open) → `lantern` (1, target) |

`j_home` → `home` (1, target). Both lines into the post leave a switch, so neither fuse can backfeed the other through it.

## The intended read

1. The map opens with the market and home lit on `fb_1`: bar **3 of 3, full**. Feed 3 of 5. `fb_2` is dark.
2. The shrine is 2 and only reachable from `fb_1`. `sw_1` gives the shrine *or* the home, never both, so the home has to come from `fb_2`. And 2 + 2 (the market) is over 3, so the market goes.
3. On `fb_2`: rated 2. The mill (2) and the lantern (1) together would be 3. Set `sw_2` to the home *before* letting `fb_2` carry the lantern.
4. Open `br_m`, throw `sw_1` (shrine, `fb_1` 2 of 3), throw `sw_2` (home post), close `br_2` (home relights through `fb_2`), close `br_lan` (`fb_2` 2 of 2). **Win.** Feed 4 of 5.

## The trap

Two, both blows, both readable, each recoverable with one fuse.

- **The nearest switch.** `sw_1` sits beside the shrine; throwing it first puts shrine 2 + market 2 through `fb_1`: **blows** at 4 of 3, culprit `shrine`. Recovery: open `br_m`, repair `fb_1` (shrine 2 of 3), then carry on. Throwing `sw_1` back instead of shedding the market just returns to the start with one fuse spent.
- **Closing the lantern before moving the mill.** Close `br_2` and `br_lan` with `sw_2` still at the mill: `fb_2` carries 2 + 1 and **blows** at 3 of 2, culprit `lantern`. Recovery: throw `sw_2` to the home, repair `fb_2`.

Either blow alone leaves a spare fuse. The map is only stuck after a premature repair on top of the blows (both fuses gone, or one fuse left and two boxes out). Undo or Reset clears it.

## What this map tests

- Whether "make room" reads as moving a lamp, not just shedding one: the home doesn't go dark, it changes fuse.
- Whether the player reads both bars as separate budgets and orders the moves (switch before breaker) to stay inside them.
- Whether two possible blows in one map feel like two lessons or like a minefield (watch the session log for the second blow).

## Expected numbers (simulator BFS; `npm run analyze` isn't built yet)

- Nodes 17, lines 17, faults 0. Parts given: 2 fuses. Parts needed: **none** on the intended route; 1 per blow.
- Fewest actions to win: **5** (`br_m`, `sw_1`, `sw_2`, `br_2`, `br_lan`). After the `sw_1` trap: 6 (trap + `br_m`, repair, `sw_2`, `br_2`, `br_lan`).
- Winning configurations: **1 of 32**.
- Fuses at start: `fb_1` 3 of 3, `fb_2` 0 of 2 (breaker open). At the win: `fb_1` 2 of 3, `fb_2` 2 of 2.
- Final load: 4 of 5 (shrine, home, lantern). Market and mill dark.
- Dead ends: 116 of 315 reachable states, all after at least one premature repair. Every first move leaves the map winnable.
- Salvage, trips, walking: n/a (map scope).

## What it taught us
