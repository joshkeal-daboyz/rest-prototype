ticket: 071b-power-kit
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B of 071, as re-cut on Josh's ruling of 21 Nov 2026 ("The scifi power poles are intended to be atop buildings and other objects they are not intended to come out of the ground"). It asks for a pure `src/render3d/powerkit.ts` with these parts:
- the measured tables for the three ground poles and `Cables_03`;
- `fitLine` for any span, chained when long, with the ladder's radius;
- `placePole`, which seats the pole on the wires, with Palm's across stretch on the ladder;
- the `poleAt` / `lineOf` mix rule;
- named failures.

It also asks for Vitest coverage in `powerkit.test.ts`, and for nothing else to change. I read the ticket from `goal/city-style` (94cc701), not from the branch.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=2 src/render3d/powerkit.test.ts`: 40 passed. The four GLB re-measure cases ran here, not skipped. `npx tsc --noEmit` is clean. The diff from 954a035 touches only the two named files.

**B's change (the re-cut).** Done:
- `POWER_MIX` and `POWER_POLES` are the three ground poles, in Josh's order.
- No Sci-Fi City entry, comment or test remains.
- The tables test expects the three keys.
- The share test compares with `1 / POWER_MIX.length`.
- The `have` list is `apocalypse-power`, `palm-city-pack`, `city-pack`.
- `LADDER_LINE_SCALE` is still 0.254.

**1. Measured tables.** Met.
- Fields asked for: `POWER_POLES` has height, arm axis (z for Apocalypse, x for both Palms), an along offset and three attachments, centre first. Each attachment has across, up and `ownInsulator`; Apocalypse's centre is `false` and Palm's are all `true`. `POWER_LINES` has length, conductor count, ends, sag, radius and residual. Both match A's note (sections 2 and 3).
- `foot_m` and `surface_m` are added. That is fair. `foot_m` is needed to put the attachments in the model frame. `surface_m` lets the re-measure check the arm top under Apocalypse's code-insulator centre (5.7 m), where `up` is 5.862.
- Palm `_02`'s `along_m` of 0.011 differs from A's 0.05. The comment gives the reason: measured from the leaning post's foot. The re-measure then finds insulator surface at that point within 0.02 m.
- Re-measure: it sits inside `it.skipIf(!have)` and reads lazily (`glbMesh` reads only the JSON chunk and the needed buffer views, which matters for the 103 MB Palm pack). It checks the top, the foot, each attachment's surface height, the wire's length, end, radius (within 0.005 m), sag and ring profile.
- Two departures from the ticket's Interfaces sketch, both allowed by "the builder may rename":
  - `along` is one number per pole, not one per attachment.
  - `spacing_m` is dropped; a one-strand piece has no spacing.

**2. A span is fitted.** Met. `expectFitted` checks the ends within 0.01 and the mid against `sagSpan(a, b)[4]` within residual + 0.01, for:
- level spans of 0.25x, 1x and 1.25x;
- one end 1, 2, 2.7 and 3.5 m higher (both ways round);
- spans along x, along z, two diagonals, and a vertical edge case.

Radius:
- Given: the ladder test checks 0.0286 within 0.0005, both the reported value and the matrix's width column.
- Not given: it is true radius x scale (the city test).

The ladder sweep covers every `puzzles/*.json` (more than 1,000 spans). It shows one piece each, stretched 0.28 to 0.9, and that `LADDER_LINE_SCALE` is 0.254.
- The builder's reading of the cross-section is a flat ribbon from the sag shear. It is forced by the ticket's own design: one affine instance transform, "scaled vertically so that its lowest point meets `sagSpan`'s". One matrix cannot scale the sag and keep a round section. The width is what the criterion pins, and it is right. See risks for what this means on the ladder.

**3. Long spans.** Met. The 40.1 m test checks four things:
- the fewest pieces (`ceil(len / 1.25L)`, and one fewer would not fit);
- every piece at or under 1.25x;
- the ends and joins within 0.01;
- each join and each piece's low point on the whole span's parabola.

There is also the boundary pair (0.999x is one piece, 1.01x is two) and the short span (0.1x is one piece, compressed, with its ends and low point right). `chain` is correct: each sub-chord's mid drop on a parabola is `ratio * len * dt^2`.

**4. The pole meets the wire.** Met, on a reading I agree with.
- Covered: the anchor at the spot and at `attachY` within 0.01, the centre attachment at `attachY`, the arm at 90° within 0.5°, over six run directions. The Palm stretch is `ladderAcross` = 1.37 for both Palms and 1 for Apocalypse; the city case is across 1 at true scale. `_02`'s 0.06 u crooked-arm step is taken from the table.
- Two departures from the literal text, both forced by the ticket's own numbers:
  - **The anchor is the outer pair's midpoint, not the centre attachment.** For Palm, B4's "centre on the run's line" and "each outer at ±PHASE_OFFSET" cannot both hold. A's own ladder table already shows Palm's centre off the run's line: 0.037 u for `_01` and 0.077 u for `_02`. The outer pair is the one Josh ruled on (Q17), so it is the right one to hold.
  - **Apocalypse's outers are checked within 0.015 u, not 0.01.** The ticket gives 0.015 itself, in its Q16 line ("Apocalypse is within 0.015 u of the wires") and in A's table (+0.015). Its "no wire-spacing change" rules out any other fix. The real gap is 0.0140 u.

**5. The mix.** Met.
- `poleAt` is pure through `stableHash`, and 1/3 shares hold within 0.05 over 1,000 plain ids and 1,000 run ids.
- Ladder neighbours differ: the builder's count is 108 pairs, and the test asserts more than 100. The ticket gives no count, so that floor is fine. Neighbours also differ for list lengths 2 to 9.
- A one-pole list returns that pole everywhere, and `lineOf` gives one piece per line.

**6. Failing fixtures.** Met.
- Each of these throws a `PowerKitError` with its code: a piece fitted backwards, a length mismatch, a span of length 0, a pole with no arm axis, a run with no direction, an empty list for both functions, and an unknown key.
- The "attachment off by 0.1 m" case fails the outer-wire check (above 0.015 u) where the good table passes. This is weaker than the others; see Could improve 3.

**7. Pure.** Met. The only imports are `type { Vec3 }` from `./layout` and `{ stableHash }` from `../render/city`, and a source-scan test pins that. It does not import `sagSpan`; it uses the same `4t(1-t)` on the 3D chord, which the tests compare against `sagSpan`. There is no three, no DOM and no timer.

## Rule conflicts and risks
- No hard-rule break. Only the two named files in `src/render3d/` change. Nothing in `src/grid/` or `src/night/` is touched, there is no new dependency, and no GDD Decided rule changes. Decided 041's "wooden" holds, with three wooden poles. The tests are CI-safe: an `existsSync` gate, lazy GLB reads, relative POSIX-joined paths.
- **The flat ribbon on the ladder (for C and Josh's eye).** The vertical half-thickness is `radius_m x vs`, with `vs` about 0.073 x span length.
  - Ladder spans run about 1 to 3 u, so the strand is 0.0023 to 0.007 u tall against its 0.0286 width: 4:1 to 12:1 flat.
  - From above it reads at the Q18 width. From a low or side angle it is much thinner than the code tube it replaces, which is what Q18 was meant to fix.
  - In the city at true size it is close to round (about 1.1:1).
  - This is inherent to one matrix per instance. If Josh finds it thin, the fix belongs in C's material or geometry, not in B.
- **Palm's centre wire misses Palm's own centre insulator.** It is off by about 0.05 u for `_01` and about 0.10 u for `_02` with the 1.37 stretch. The ticket has C hide the code insulator at all three Palm attachments, so the centre conductor will hang beside the model's insulator, not on it. C (or the architect) should decide whether to keep a code insulator at Palm's centre or accept the gap. The ticket does not decide it.
- **The neighbour guarantee is an id contract.** It holds only for spot ids of the form `<run>#<index>`. C and 070 K3 must build their ids that way, or neighbours can repeat. Nothing exports the format.
- **A three-pole run is strictly periodic.** With n = 3 and a fixed step per run, a run reads A, B, C, A, B, C. That may look arranged rather than makeshift. It meets the criterion as written; whether it reads well is for Josh to judge in C.

## Must fix
none

## Could improve
1. `src/render3d/powerkit.ts`: export a `spotId(runId, index)` helper, and have the ladder neighbour test use it. That way C and K3 cannot drift from the `<run>#<index>` form that `poleAt`'s neighbour rule depends on.
2. `src/render3d/powerkit.test.ts`: pin each pole's centre offset from the run's line on the ladder, and the fitted strand's vertical half-thickness on a typical ladder span. Then C and Josh see both numbers (the Palm centre gap, the ribbon ratio) as asserted facts, not as something found in the browser.
3. `src/render3d/powerkit.test.ts`, the "attachment off by 0.1 m" fixture: its last two lines assert that the bad table's order is still fine, under a comment saying it "fails its own order". Make the comment match what is asserted, or drop those lines. A kit-side check (a `checkPole` that throws when an outer wire misses `PHASE_OFFSET` at the ladder scale) would make this fixture match its siblings, which throw named errors.
4. The GLB re-measure checks each attachment's height under its (x, z), but not its across position directly. An across position off by under the insulator's footprint would still pass. Comparing the insulator part's centroid with `across` within 0.02 m would close that.
