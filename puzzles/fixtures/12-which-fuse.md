# 12 · Which fuse — design note

Three fuse boxes hang off the square's hub, each rated differently: ≤1, ≤2, ≤3. The priests want the shrine, the well and the gate lit tonight. The shrine is the heaviest thing they ask for, and the fuse box nearest it is the smallest. Enoch has two fuses.

Josh's words: "There should also be a 'health bar' for the load on the fuse. It will be useful for puzzles that require managing fuses properly. In fact, create a fuse management puzzle."

**Element under test:** the brief's element 5, **which fuse**. Three branches on fuses of different ratings; moving a load means a different route. Each fuse box feeds a switch that picks one of two lamps, and two lamps (the shrine and the gate) can be reached from two fuses each. Making room for the shrine on a fuse that can hold it pushes a lamp down the line, and the last lamp in that chain, the mill, has to go dark. Designed for a player who can see each fuse's load bar (ticket 012 B).

## The map

15 nodes, 16 lines, no faults. Feed capacity 4. Enoch brings two fuses.

| Branch | Fuse | Switch | Position 0 (start) | Position 1 |
| --- | --- | --- | --- | --- |
| Top | `fb_1` ≤1 | `sw_1` (spring) | `well` (1, target) | shrine post `j_shrine` |
| Middle | `fb_2` ≤2 | `sw_2` (spring) | gate post `j_gate` | shrine post `j_shrine` |
| Bottom | `br_3` (open) → `fb_3` ≤3 | `sw_3` | `mill` (3) | gate post `j_gate` |

`j_shrine` → `shrine` (2, target). `j_gate` → `gate` (1, target). The shrine and gate sit on posts (junctions) because a lamp is a leaf with one line; the post is where two fuses' routes meet.

Targets: shrine 2 + well 1 + gate 1 = 4, exactly the feed's capacity, so the mill (3) can never be lit in a win. `fb_3` could carry it (3 of 3); only the feed can't.

**Spring switches (ticket 013).** `sw_1` and `sw_2` carry the coiled ribbon: each returns to its file position (the well, the gate post) whenever no current reaches it, and can't be thrown while dead. `sw_1` is the one that matters: it is what turns the trap into a one-fuse lesson. `sw_2` can't lose power on this map (`fb_2` never carries more than 2 and has no breaker above it), so its spring never fires; it is marked so the two shrine switches read alike. `sw_3` is deliberately *not* spring: step 4 sets it while the breaker is open, which a spring switch would refuse.

## The intended read

1. The map opens with the top and middle branches live: the well on `fb_1` (bar full, 1 of 1), the gate on `fb_2` (1 of 2). The bottom breaker is open, so `fb_3` and the mill are dark. Load 2 of 4. The shrine is dark, and `sw_1`'s second line runs straight to it.
2. Count. The shrine is 2. `fb_1` is ≤1, so it can't carry it. `fb_2` is ≤2: it can, but its switch then drops the gate. The gate's other route is `fb_3`, behind the open breaker, whose switch is set to the mill.
3. Throw `sw_2` to the shrine. The shrine lights, the gate goes dark. `fb_2` carries 2 of 2 (bar full). Load 3 of 4.
4. Throw `sw_3` to the gate post (nothing changes yet: the breaker is open).
5. Close `br_3`. The gate lights through `fb_3` (1 of 3). Load 4 of 4, every fuse holds. **Win.**

If the player closes `br_3` before throwing `sw_3`, the mill comes in: load 6 of 4 (5 of 4 if the shrine isn't on yet), **brownout**, but `fb_3` holds at 3 of 3. That is the capacity telling them the mill is the branch that stays dark; throwing `sw_3` to the gate clears it and wins.

## The trap

The shrine is dark and the nearest switch, `sw_1`, has a line running straight to it, so the obvious first move is to throw `sw_1`. That puts the shrine's 2 through `fb_1`, rated 1: over by exactly one, and **`fb_1` blows** (`fuse:blown`: load 2, rating 1, culprit `shrine`), taking the well dark with it.

It is readable before and after. Before: `fb_1`'s bar is already full with the well's 1, and the shrine is marked 2. After: the blown-fuse ✕ on `fb_1`, the shock running to the shrine, the notice, and `sw_1` snapping back to the well with a twang (`switch:thrown` with `spring: true`). The blow costs the well its power, so the spring switch returns on its own: the player can't leave it pointing at the shrine.

**The recovery is one click:** repair `fb_1` with a fuse. Because `sw_1` has already sprung back, the repair holds (`wouldBlow` 0: the hover reads a plain *Repair (fuse)*, no "would blow again"), the well relights, and the intended route (steps 3–5) wins with one fuse left. The trap now costs exactly one fuse and resets; it can no longer re-blow on repair (before ticket 013 it did, every time, which is what Josh hit). While `fb_1` is blown, `sw_1` can't be thrown at all (no current reaches it). A player who falls in a second time (repair, throw `sw_1` again) spends the second fuse and can still win with none left. Only a third time leaves the map unwinnable: `fb_1` ✕ with no fuse on hand, both shown; Undo restores the fuse. Leaving the blown fuse and setting the rest first doesn't win (the well is a target and sits only behind `fb_1`), but it isn't stuck: repair whenever.

A quieter detail: if both switches that reach a post point at it (`sw_1` and `sw_2` at the shrine, or `sw_2` and `sw_3` at the gate), the lamp counts under the nearer feeder's fuse (fewest hops from the feed; for the shrine the two routes tie at four hops and line order gives it to `fb_1`; for the gate `fb_2` is nearer). The load bar shows which fuse is carrying it. For the shrine that means throwing `sw_1` after `sw_2` still blows `fb_1` (load 2, culprit `shrine`); `sw_1` springs back, the shrine stays lit through `fb_2`, and one repair restores the well. Same trap, same recovery.

## What this map tests

- Whether the load bar turns fuse ratings into a plan: does the player read `fb_1`'s full bar and the shrine's 2 and go to `fb_2` first, or click the nearest switch and learn from the blow?
- Whether "make room" reads: moving the shrine onto `fb_2` drops the gate, which must move down to `fb_3`, which drops the mill. A chain of two moves, not one.
- Whether the brownout from letting the mill in reads as *capacity*, distinct from a fuse blow (GDD review, finding 1, *capacity, small*). The two limits appear side by side here: `fb_3` holds the mill fine; the feed doesn't.
- Whether a blow you can recover from with a part on hand feels like a lesson, not a punishment (20-battery-run's "What it taught us").
- Whether a spring switch reads: does the player see `sw_1` snap back and understand why the repair now holds (ticket 013)?

## Expected numbers (the analyzer, `tools/analyze.ts`, isn't built yet; these come from a brute-force script over `createGrid`)

- Nodes: 15. Lines: 16. Faults: 0. Parts given: 2 fuses. Parts needed: none on the intended route; 1 fuse per time the player falls into the trap (2 falls still win, with 0 left).
- Faults readable at start: 0 of 0. A blown `fb_1` appears only if the shrine is sent to it.
- Fuse loads at start (`fuseLoad`): `fb_1` 1/1, `fb_2` 1/2, `fb_3` 0/3 (breaker open). At the win: `fb_1` 1/1, `fb_2` 2/2, `fb_3` 1/3.
- Fewest actions to win: 3 (throw `sw_2`, throw `sw_3`, close `br_3`; or close `br_3` before `sw_3` through a brownout). After the trap: 5 (trap, repair `fb_1`, then the three); 1 fuse left. After two traps: 7, 0 fuses left.
- Final load: 4 of 4 (shrine, well, gate). The mill dark.
- Winning configurations: 1 of the 16 settings of `sw_1`, `sw_2`, `sw_3` and `br_3` (`sw_1` at the well, `sw_2` and `sw_3` at 1, breaker closed). Every setting with `sw_1` at the shrine blows `fb_1` (8 of 16).
- Reachable play states (switches, breaker, faults, parts on hand): 48; 3 win (with 2, 1 or 0 fuses left). States where a repair would re-blow at once: **0** (was the whole failure before). Dead ends (no win without Undo/Reset): 8, all after falling into the trap a third time with no fuse left, `fb_1` ✕ on screen.

Checked against the real simulator (`createGrid`, ticket 013 branch) with a throwaway script, 28 Oct 2026: start lights the well and gate at 2 of 4; `sw_2`, `sw_3`, `br_3` wins at 4 of 4 with no blow; closing `br_3` first browns out at 5 of 4 (6 of 4 with the shrine on) without blowing `fb_3`, and `sw_3` then wins; **the obvious wrong first move**, throwing `sw_1`, blows `fb_1` once (`fuse:blown` load 2, rating 1, culprit `shrine`, path `l_1b → l_1s → l_shrine`), then `sw_1` springs back to the well (`switch:thrown` `{selected: 0, spring: true}`), `fb_1` readable with `wouldBlow` 0; throwing `sw_1` again while blown is refused; repair holds, the well relights, and the route wins with one fuse left; `sw_2` then `sw_1` blows `fb_1` the same way and springs back with the shrine still lit on `fb_2`; two traps then the route wins with 0 fuses; Undo after the blow restores the fuse and the switch; brute force over all 16 static settings finds exactly the one winner; a breadth-first search over every reachable play state finds the numbers above.

## What it taught us

Josh, 28 Oct 2026: "You cannot fix the fuse, it just blows every time you fix the fuse. Some switches should switch back when the power is not on." Off-track as a map: the recovery (throw `sw_1` back before repairing) was in this note but not in the game, so every repair re-blew and cost a fuse. Fix: spring switches and a "would blow again" warning on the repair (ticket 013); `sw_1` and `sw_2` are now spring switches.
