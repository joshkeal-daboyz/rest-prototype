ticket: 058-fire-escapes
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Measure the City Pack's three fire-escape pieces and the apartment window sills (A). Then re-place every escape so it has one platform per storey just under that storey's sill, flights that meet the deck above, and a drop ladder that reaches the walk. Pack pieces are y-scaled within 0.8 to 1.2, with a code-drawn fallback. Which blocks get an escape, and every other piece of dressing, must stay as they were. Write a pure `escapeCheck` and guide 16.11 (B).

## Does the branch do it?
Round 2. I reviewed head 7502885 against its base a6605e6. The fix commit touches 4 files: `escapes.ts`, `escapes.test.ts`, `dressing.test.ts` and the guide, all in the ticket's Files list. I ran the four touched suites in a scratch worktree at 7502885 with the real `assets/private` linked in: 126 passed and none skipped, so the real-GLB re-measure test ran against the file. Typecheck and the full gate were green on the main session's run (2349 passed, 9 skipped).

**Round 1 Must fix 1 (the Apartment_03 sills): closed.**
- **The code:** `measureSills` (escapes.ts) now takes every front-facing plane of at least `SILL_MIN_AREA_M2` and cuts it into pieces that don't overlap in x. A piece counts as glass when no deeper piece stands over any of its x extent. A storey's sill is the lowest glass vertex in its 3 m band. This is criterion 2's How ("the lowest point of the window openings"), and it still skips frames, the wall and pilasters, which all stand in front of some glass.
- **My own re-measure.** I wrote my own GLB reader (no builder code) and ran it on D:\rest-prototype-main\assets\private\out\city-pack.glb. I grouped the front-facing triangles by depth. No node carries a transform, and every piece has a single material, so glass can't be told apart by material. That makes the depth rule the right tool.
  - **Apartment_03:** the side slits are at z 2.22 (x ±1.63..2.12, area 1.14, sill 0.854). The central glass is at z 2.34 (x -0.86..0.86, area 2.25, sill **0.517**). The shallower planes all overlap something deeper: the wall at 2.40 (4.09 m²), the central frame at 2.42 and the surround at 2.52/2.60. So the only glass pieces are the slits and the central window, and the lowest of them is 0.517.
  - **The other styles:** Corner_03 reads the same 0.517. Stack_03 reads 0.517 in all three bands. Apartment_01's deepest plane is 0.756 and Apartment_02's is 0.417, and the planes in front (0.634, 0.355) overlap them, so both are unchanged. All of this matches `WINDOW_SILL_M` and `PINNED_SILLS`.
- **The synthetic test** "counts every window of the front as glass, whatever its depth..." builds a wall, two deep side windows at 0.85, a shallower central window at 0.5 and a frame in front of it at 0.4. It expects 0.5. That separates the new rule from round 1's: the old deepest-plane rule gives 0.85, and counting the frame as glass gives 0.4. So it is a real test of the rule.
- **Downstream:** the deck on Apartment_03 is now 0.367 m over the floor and the first piece's base is 0.242 m under its floor. `escapeCheck` still passes on every map ("every escape of the town passes the check"). The attachment test passes with `ESCAPE_LEG_REACH_M` tightened to 0.4, against the largest real hang of 0.342 on Apartment_02.
- **The guide:** 16.11's sill Info line describes the new rule, the table row reads 0.517 / 0.367 / 0.242 m under, and the Open line on Apartment_03 is replaced by a Default giving both windows' numbers.

**The acceptance criteria otherwise stand as in round 1:**
- **1. Measured escape pieces:** met. The escape geometry is unchanged by this commit.
- **2. Measured window sills:** now met.
- **3. Placement:** met.
- **4. The check:** met.
- **5. R7 holds:** met. Eligibility code is untouched, and a sill change moves decks, not which blocks get an escape.
- **6. Drawn:** met.
- **7. Ladder maps:** met. The commit's one dressing.test.ts edit is the leg-reach constant on an escape case.
- **8. Guide:** met. The styleguide drift check is green, and `SILL_MIN_AREA_M2` changed only its comment, not its value.
- **9. Screenshots:** for the main session.
- **10. Process:** met.

**Round 1 could-improves taken up:**
- 1 in part: the reach is now 0.4. The glass overlap exemption is unchanged.
- 2: the real-GLB test is now `it.skipIf`.
- 6: the `CODE_ESCAPE` comment is fixed.
- The cap-weight change is now stated in 16.11 as a change to a 052 default.

## Rule conflicts and risks
- **The cap weight.** On a 4-5 storey block, the escape column draws 7 pieces against `DRESS_PER_BAY_MAX` 6. It is now recorded openly in 16.11 as "Default (058, a change to a 052 default)". This is not a GDD Decided rule, but the main session should still name it to Josh.
- **One edge case in the glass rule.** A large front plane piece with no deeper piece behind it would count as glass and could pull a sill down, for example a wall strip beyond the outermost window. On today's three styles every wall or frame piece overlaps deeper glass, and the real-GLB test pins the result within 0.02 m, so a pack change would be caught.
- **The box InstancedMesh** still hangs under the `_03` mesh and is not counted in `dressCalls` (round 1, unchanged, not a blocker).
- No `src/grid/`, `src/night/`, `src/core/` or dependency change. No files outside the ticket's list.

## Must fix
none

## Could improve
1. **`escapeCheck` gaps** (from round 1, still open). A missing flight (fewer tops than decks - 1) is not counted as a failed joint, and an escape with `ladder === null` passes. Both could fail the check.
2. **The no-overlap exemption** still skips every escape-vs-glass pair. It could skip only the first escape piece against the shop glass, within about 0.1 m in y.
3. **The R7-named test** in escapes.test.ts asserts counts, not R7. Rename it or compute R7 there.
4. **Count the box mesh** in the dressing's draw-call figure (`calls + boxCalls`).
5. **A guard in `measureSills`.** Make it return null when a glass piece's lowest point in a band is at the band's base (y 0 of the storey), which would mean a wall strip was taken for glass. This covers the edge case under Risks.
