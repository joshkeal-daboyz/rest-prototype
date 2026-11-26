ticket: 081-NR-series-relay
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Re-lay series puzzles 1 to 3 so that every breaker and switch stands on a pole that carries only its own lines (no split, no scenery span or drop, no other node), keeping each puzzle's concept, size, solvability and band, the same id and district if possible. Also record Josh's play verdicts under **What it taught us** in s01 to s05. No tests (count 0), no tool or `src/` change.

## Does the branch do it?
I read `git diff main...ticket/081nr-series-relay`: 8 files, all in the ticket's list (`s01`/`s02`/`s03` city files and notes, and two lines each in `s04-the-spark.md` and `s05-not-that-one.md`). There are no test files, so I ran none. CI's sweep (`tools/fit.test.ts`, unedited) is criterion 3's test.

**1. No breaker or switch on a branch pole.** I checked every control's pole against the city's circuit layer (6x6 seed 1, one-way, built by `cityPlanFor`, then `convertCityPuzzle`). For each control I listed every `spans` entry and `drops` entry at its pole, which line owns it, and which scenery drop poles the conversion used:
- s01 `br_shrine` `pole:x:11:lo:142.50`: 2 spans, `l_south` in and `l_shrine` out. No drop. `br_home` `pole:z:5:lo:374.50`: 2 spans, `l_east` and `l_home`. No drop. The scenery drops are at `x:11:lo:152.50`, `z:5:lo:390.50` and `x:11:lo:132.50`, none of them a breaker's pole.
- s02 `sw_corner` `pole:x:1:hi:272.50`: 3 spans, all its own (`l_feed` cross, `l_home` along, `l_mid` corner). No drop. `sw_pump` `pole:z:6:hi:104.17`: 2 spans (`l_mid` in, `l_pump` out) and one drop, the store's (`l_store`). The scenery drops are at `z:6:hi:92.50` and `z:6:hi:115.83`, not its pole. So one of `sw_pump`'s two outs is a drop and not a span. Josh's ruling of 26 Nov 2026, "Allow it (Recommended)", covers exactly this case. Nothing else meets at the pole.
- s03 `br_inf` `x:1:hi:460.50`, `br_row` `x:1:hi:438.50`, `br_shed` `z:9:lo:92.50` and `br_stall` `z:9:lo:130.00`: each has exactly 2 spans, both its own lines', and no drop. The scenery drops are at `x:1:hi:449.50` (`j_inf`, a junction) and `x:1:hi:471.50`.
- Every span at every control's pole belongs to one of the puzzle's lines; none is unowned scenery. The only other thing listed at these poles is roof span *places* (`roofSpans`), which are offers and are drawn only when a job uses one, so they are not wires.
- Each note has the place table the criterion asks for ("What each breaker's/switch's pole carries"), and it agrees with what I read from the layer.
- Josh's third ruling (no control on any pole with a third wire, scenery included) holds for all eight controls. The only extra wire is `sw_pump`'s own drop, which the first ruling allows.

**2. The concept kept.** s01 has 2 breakers, s02 has 2 switches, s03 has 4 breakers. None has a fault or a part. s01 and s02 never bind (most draw 5 of 5 and 3 of 4). s03 opens browned out at 9 of 6. Each trap is kept in kind and each note says what changed and why:
- s01: the nearer breaker is still the shrine's own.
- s02: `sw_pump` first still changes nothing and reads +0.
- s03: shedding the two small houses still leaves 7 of 6, and `br_inf` still clears the brownout with the target dark.

**3. Still checked and solvable.** `npm run check puzzles/city/` passes every city puzzle, s01 to s05 included, and every trap holds and recovers. `npm run analyze` agrees with each note's table line for line:
- s01: 4 states, 1 click (`br_shrine`), 1 order, 2 configurations, 4 of 5, 0 dead ends.
- s02: 4 states, 2 clicks, 2 orders, 1 configuration, 3 of 4, 0 dead ends.
- s03: 16 states, 1 click (`br_row`), 1 order, 4 configurations, 6 of 6, 0 dead ends.

All three are inside the 1-to-5 band. Capacities were raised for scenery: s01 3 to 5 (2 own + 3 scenery), s02 4 (2 + 2), s03 6 (4 + 2), which matches the conversion's scenery counts of 3, 2 and 2. The red-number read and the shrine count are brought up to date.

**4. Same id, same place if it can.** Ids, names and file names are unchanged. s02 keeps `block:6:1` and s03 keeps `block:8:1`. s01 moved from `block:2:10` to `block:4:8`, and the note gives the reason. I checked the layer: on `block:2:10` the only poles with two spans and no drop are `pole:x:14:lo:130.00` and `pole:x:14:lo:151.67`, both on `x:14`. So two breakers there would sit one behind the other on one wire, as the note says. `block:4:8` is not used by s02 to s05 on this branch, nor by s06 to s10 on `ticket/081n2-series-batch-2` (I read their districts: `0:8`, `6:11`, `6:3`, `0:4`, `1:7`). It does not touch s02's `block:6:1`.

**5. Josh's words recorded.**
- s01, s02 and s03 each have under **What it taught us**: his line on that puzzle, quoted as at the top of section N; the card's "Both (Recommended)" with its option text; and a line on what the re-lay changed.
- s04 and s05 have "Puzzle 4 is good." / "Puzzle 5 is good." dated 26 Nov 2026. Nothing else in either file changed (the diff is +2 lines each). s05's breaker is untouched, as Josh's "Leave it (Recommended)" says.

**6. Josh replays.** This is browser-only and Josh's to do.

## Rule conflicts and risks
- None found against the hard rules: no `src/`, `tools/` or `puzzles/locked/` change, no test, no dependency.
- The series rule in the ticket still reads "A switch's two outs leave its pole by different spans". s02's `sw_pump` relies on Josh's ruling "Allow it (Recommended)", which is not yet written into the ticket's series rule or the s02 note. Until it is, a later reader of the ticket alone would see s02 as breaking the rule.

## Must fix
none

## Could improve
1. In `puzzles/city/s02-this-way-or-that.md`, "The open reading on `sw_pump` ("stop 081 NR", for this switch only)", the "Series rules" bullet and the last **What it taught us** line still call the reading open. Replace them with Josh's ruling in his words (26 Nov 2026: "Allow it (Recommended)": a switch's own building's drop may be one of its two outs). The lead-architect should add the same exception to the series rule in section N of the ticket.
2. In `puzzles/city/s01-first-light.md`, "Why it left `block:2:10`" says the block "has four such poles". I find two poles on that block with two spans and no drop (`x:14:lo:130.00`, `x:14:lo:151.67`). The conclusion is the same, but the count should match the layer or say which four it means.
