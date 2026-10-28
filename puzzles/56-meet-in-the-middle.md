# 56 · Meet in the middle — design note

One street runs from the West feed to the East feed, with a lamp at each junction on the way: forge, shrine, well, gate. Each feed also has a lamp right beside it, the inn by West and the mill by East. Each end has a switch that can send its current the long way round, through two extra junctions. The shrine is dark behind its breaker. It is drawn at the east end of the street, near the mill. The priests want the forge, shrine, well, inn and mill. The gate is a home (priority). No parts, nothing broken.

**Element under test:** who carries what on a ring between two feeds (ticket 015, rule 2, *nearest feed carries it*). Each junction is carried by the feed with the fewest hops to it, not the nearest on the drawing. A long-way switch moves the meeting point **away** from its own feed, which hands lamps to the **other** feed.

## The map

20 nodes, 21 lines, 0 faults. Version 5, top-level `capacity` null. Parts: none.

| Feed | Limit | Beside it |
| --- | --- | --- |
| `west` "West" | Lv3 | inn 1 |
| `east` "East" | Lv4 | mill 1 |

The street: `west` – `sw_w` – `jA` (forge 1) – `jB` (shrine 2, behind `br_sh`, open) – `jC` (well 1) – `jD` (gate 1, behind `br_g`, closed) – `sw_e` – `east`. `sw_w`'s long output runs `d1` – `d2` – `jA`; `sw_e`'s runs `k1` – `k2` – `jD`. Each long way adds 2 hops.

Hops with both switches short (West / East): `jA` 2 / 5, `jB` 3 / 4, `jC` 4 / 3, `jD` 5 / 2. Who carries the street's junctions:

| `sw_w` | `sw_e` | West carries | East carries |
| --- | --- | --- | --- |
| short | short | jA, jB | jC, jD |
| **long** | short | jA | **jB**, jC, jD |
| short | long | jA, jB, **jC** | jD |
| long | long | jA, jB | jC, jD (same as short/short) |

## The intended read

1. HUD: `West · Lv3 Powersource — using 2 of 3`, `East · Lv4 Powersource — using 3 of 4`. The shrine (Lv2) is dark. West has 1 to spare and East has 1. The total fits (7 of 7 with everything lit), but neither feed has room for 2.
2. Make room on East: the gate is the only lamp that isn't wanted. Open `br_g`: East 2 of 4.
3. Count hops to the shrine's junction `jB`. West reaches it in 3 and East in 4, so West carries it, though it is drawn by the mill. Lengthen **West's** route: with `sw_w` long, `jB` is 5 hops from West against 4 from East. Throw `sw_w`. Nothing visible changes (the forge stays on West, the well on East).
4. Close `br_sh`. The shrine lights. Hover: `Lv2 Lamp · on East`. West 2 of 3 (inn, forge), East 4 of 4 (shrine, well, mill). **Win.** The three clicks go in any order. The winning setting is the only one of the 16.

## The trap

The trap is the attribution. The shrine is drawn at the east end, East is the feed with more room, and once the gate is off East has exactly 2 to spare. So the player opens `br_g` and closes `br_sh`, and the ward **browns out on West**, 4 of 3. The shrine went to West, because its junction is one hop nearer West. Readable: the HUD's West row reads `using 4 of 3 · Brownout`, East shows `using 2 of 4` with 2 unused, the shrine's hover says `Lv2 Lamp · on West`, and the notice names West. Recoverable: every state can still win; throw `sw_w` and the brownout clears.

Two more wrong instincts, both readable on the HUD:
- **Throw the switch on the side with room** (`sw_e`, to "connect the shrine to East"). That lengthens East's route, so the meeting point moves *toward* East. The well jumps to West (West 3 of 3, hover `on West`), and the shrine stays on West. With the shrine on, West reaches 5 of 3.
- **Throw both switches.** Both routes grow by 2, so the meeting point doesn't move and the split is the same as at the start (shrine on West, 4 of 3).

If the gate is still lit, the right switch browns out on **East** instead (5 of 4). The over row moves from West to East, and the brownout notice changes with it. The gate, the priority home, is the price.

**The tie-break is invisible.** On a tie in hops the feed listed first in the file (`west`) carries the junction, and nothing on the map says so. This map is built so that no lamp is ever at a tie. In every switch setting the street has an odd number of hops end to end, so the meeting point always falls on a line, not a junction. Verified by swapping the feeds' order in `nodes`: no node changes carrier in any of the 16 settings. Only the meeting line (`l_ab`, `l_bc` or `l_cd`) changes, and it is live from both ends and carries no load.

## What this map tests

- Ticket 015 rule 2: can the player predict a lamp's carrier by counting hops, against what the drawing suggests? Does the `on West` hover make a wrong guess readable?
- Whether "a longer route gives load **away**" lands. The `sw_e` trap is the backward version.
- Whether the meeting line (pulses from both feeds that meet and stop) reads as "this is where the two feeds' shares split".
- Rule 2 is Draft and Josh's to tune: if counting hops feels arbitrary in play, that is evidence against it as cut.

## Expected numbers

`npm run analyze` can't run here: `tools/analyze.ts` doesn't exist in this worktree. The numbers come from a brute-force search over the real `createGrid` on ticket/015 (by hand, scripted).

- Nodes: 20. Lines: 21. Faults: 0. Parts given: none. Parts needed: none.
- Start: West 2/3 (inn, forge), East 3/4 (well, gate, mill), no brownout. Shrine dark.
- Fewest actions to win: 3 (open `br_g`, throw `sw_w`, close `br_sh`, in any order: 6 shortest sequences).
- Final: West 2/3, East 4/4. Gate dark.
- Winning control settings: 1 of 16 (`br_sh` closed, `br_g` open, `sw_w` long, `sw_e` short).
- Reachable states: 16. Dead ends: 0. Brownout settings: 7 of 16 (every setting with the shrine lit except the win).
- Obvious wrong moves: close `br_sh` first → West 4/3 over (winnable in 2 more). Open `br_g`, then close `br_sh` → West 4/3 over. Throw `sw_e` first → the well goes to West, West 3/3 (winnable in 4 more, starting with throwing it back). `br_sh` + `sw_w` with the gate on → East 5/4 over.
- Faults read from both sides (015's GDD check): none; the map has no faults.

**Difficulty:** three clicks with a one-in-sixteen win, comparable to 13 *Ring from the east* (3 clicks, 1 of 4) and well below the late ladder (54 takes 13 clicks). By the ladder's ranking it belongs just after 13 (the first ring), and after 55, which must come first. It's appended as 56 so nothing is renumbered.

## What it taught us

