# 05 · Two feeds — design note

Two feeds reach this ward. The North one is tired, and tonight it carries the inn and the bakery and nothing more. The South one has room: it lights the well and the lane. The priests want the shrine lit, along with the inn, the bakery and the well. The shrine stands between the two. A breaker joins it to North, a short run. South's switch can send its current up a longer run to the shrine instead of down the lane. Enoch brought no parts. Nothing is broken.

**Element under test:** several powersources (ticket 015, rule 1, *separate pools*). Each feed has its own Lv limit, and the limits don't add up into one pool. A lamp counts only against the feed that carries it. The map has no faults, no fuses and no ring: one breaker, one switch, two feeds.

## The map

13 nodes, 12 lines, 0 faults. Version 5, top-level `capacity` null. Parts: none.

| Feed | Limit | Carries at start |
| --- | --- | --- |
| `north` "North" | Lv3 | inn 2 + bakery 1 = **3 of 3** |
| `south` "South" | Lv4 | well 1 + lane 1 = **2 of 4** |

Shrine (Lv2, target) on `j_sh`. From North: `north` – `j_n` – `br_n` (open) – `j_sh`, 3 hops. From South: `south` – `j_s` – `sw_s` (output 1, `l_up`) – `j_u` – `j_sh`, 4 hops. `sw_s` starts on output 0, the lane (Lv1, priority).

## The intended read

1. The HUD has two rows: `North · Lv3 Powersource — using 3 of 3` and `South · Lv4 Powersource — using 2 of 4`. North is full. South has 2 to spare, exactly the shrine's Lv2.
2. The shrine needs 2. North has 0 to spare, so the shrine has to come from South, and South's only way to it is the switch. Throwing it costs the lane (a priority lamp): South carries well 1 + shrine 2 = 3 of 4.
3. Throw `sw_s`. The lane goes dark and the shrine lights. Hover the shrine: `Lv2 Lamp · on South`. North 3 of 3, South 3 of 4. **Win.**

## The trap

The breaker is the short, cheap way, and it costs no lamp. Close `br_n` and the shrine lights from North: **North 5 of 3, brownout**. The whole ward flickers, though the total (inn 2 + bakery 1 + shrine 2 + well 1 + lane 1 = 7) fits exactly in the two limits put together (3 + 4 = 7). That is the lesson: South's spare room doesn't help North.

Readable: the HUD's North row reads `using 5 of 3 · Brownout`, the South row stays calm at `using 2 of 4`, the alarm (`! using 5 of 3 !`) shakes over North only, and the notice reads `Brownout: North · Lv3 Powersource using 5 of 3`. Recoverable: open `br_n` again. No state is a dead end.

The second trap, for the player who throws everything: with `br_n` closed **and** `sw_s` thrown, the shrine is still on North. North is nearer (3 hops against 4), so North carries it and browns out at 5 of 3 while South drops to 1 of 4. This is map 15's lesson arriving early; here it only means "open the breaker again".

## What this map tests

- Ticket 015 rule 1: does the player read the per-feed rows, or add the two limits into one budget? GDD review finding 1 (*capacity, small*), now with two pools.
- Rule 3, brownout per feed, whole section: does it feel fair that one over feed darkens the whole ward, including South's healthy lamps? (Open question on 015: local brownout. This map is the cleanest place to judge it.)
- Whether giving up the lane (priority) for the shrine reads as a choice, like map 03's homes.

## Expected numbers

`npm run analyze` can't run here: `tools/analyze.ts` doesn't exist in this worktree. The numbers come from a brute-force search over the real `createGrid` on ticket/015 (by hand, scripted).

- Nodes: 13. Lines: 12. Faults: 0. Parts given: none. Parts needed: none.
- Start: North 3/3, South 2/4, no brownout; lit inn, bakery, well, lane.
- Fewest actions to win: 1 (throw `sw_s`). Shortest sequences: 1.
- Final: North 3/3 (inn, bakery), South 3/4 (shrine, well). Lane dark.
- Winning control settings: 1 of 4 (`br_n` open, `sw_s` on `l_up`).
- Reachable states: 4. Dead ends: 0.
- Obvious wrong first move (close `br_n`): brownout, North 5 of 3 over, South 2 of 4, total 7 of 7. Winnable in 2 more (open `br_n`, throw `sw_s`).
- Both thrown: brownout, North 5/3 over (shrine still on North, 3 hops against 4), South 1/4.
- Tie-break: no lamp is ever at equal hops from both feeds. Verified by swapping the two feeds' order in `nodes`: no node changes carrier in any of the 4 settings. Only the meeting line `l_u_sh` changes, in the both-thrown setting, and it carries no load.
- Faults read from both sides (015's GDD check): none; the map has no faults.

**Difficulty:** gentle, one click. By the ladder's ranking it belongs just after 04 *The tired feed* (it needs only capacity and the switch). It was appended as 55 at first, so nothing was renumbered; ticket 029 moved it here, to 05.

## What it taught us

