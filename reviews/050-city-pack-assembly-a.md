ticket: 050-city-pack-assembly-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A only. City Pack stack recipes as data, plus pure maths in `src/render3d/stacks.ts` (design items 1 to 4): floor ranges per lot type, assembly of base, floors and roof into columns in the lot frame, and corner columns on exactly the lot's `cornerSides`. All of it is tested with typed-in fixture sizes. The town, the gallery and the guide are not touched.

## Does the branch do it?
The diff against `goal/city-style` is two new files, `src/render3d/stacks.ts` and `src/render3d/stacks.test.ts`, and nothing else. `git ls-files assets/private` is empty. I did not re-run the suite, as instructed; the main session's gate is green.

1. **The recipes: met.** "every key is city-pack:<name>, is in the fixture, and none is dressing or a whole building" checks the `city-pack:SM_Bld_(Apartment|Shop|OfficeOld|OfficeOctagon)` prefix, membership in `SIZES`, a dressing regex, and that office keys are `_Base_/_Floor_/_Roof_` (which excludes the whole towers). "every style has base, floor and roof pieces, and corner pieces in every role or in none" covers the second half. Square and Round offices are left out, which matches the default answer to Q3.
2. **Floors and fit: met, with one documented change to the table.**
   - `stackRange` is compared with `toEqual` against a table copied from finding 3, for every style and lot type. I checked the office rows by hand: Old Small house 1..1 and tall 3..5; Old Large large only; Octagon large 1..2. The apartment rows also check out: small 2 bays, 1..2; house 3, 1..3; large 4, 2..4; tall 2, 5..8. All match the cap arithmetic.
   - The one deviation (builder decision 1): `apartment-01` on large gives 4 bays, not the ticket's "5 of `_01`". Five 5.00 m floors fill 25.0 m exactly, but `Roof_01` is 5.31 m wide, so the end roofs would overhang the lot by 0.155 m. That breaks the same criterion's "footprint inside the lot" clause. Keeping the lot rule over the table's note is the right call. The test comment records it, and Josh should hear it in the B summary.
   - Footprint and cap: "every assembled stack's turned footprint lies inside the lot, and its top is under the cap" runs over `ALL_COMBOS` (more than 1000 stacks): every style x type x side set {none, +x, -x, both}, with plain and mixed fronts and with the open sides flipped. It recomputes the turned size from the fixture rather than trusting `p.w`/`p.d`.
   - Determinism and variety: "every floor count in each style's range is reached, and the picked count is deterministic per lot key" and "floors vary from block to block on tall".
3. **No gaps: met.**
   - Storeys are checked against `pitch_m` within 1e-6, a `_Stack_` piece counts as three storeys, the column's storey total equals `floors`, and there is exactly one roof per column, sitting on the last storey.
   - Columns touch along x and are as wide as their floor piece.
   - Pieces share the column axis (a double-bay `Shop_03` sits on its two columns' middle) and the back faces share one line. A separate nudge test covers `nudge_m`, and a ground-row coverage test catches double-booked bays.
4. **Faces the street: met.**
   - Each non-corner piece's declared front (`frontAxis`, turned by the test's own `rot`) lies within 0.5 degrees of +z across the sweep.
   - `MIXED` gives -z, +x and -x pieces. The test asserts the yaw and the exact `[w,h,d]` swap on quarter turns, and that all four fronts appeared.
   - The test maths is written independently of `stacks.ts`, so it is real coverage.
5. **Corners: met.**
   - Corner columns sit on exactly the requested sides, at the right ends, and contain only corner keys. Offices never get one.
   - A mid-row stack has no `Corner` key.
   - The door is never in a corner column, and there is exactly one door when a mid column exists.
   - "a corner piece shows the road a face and the corner side the other, at both ends" checks both faces geometrically. "the second face is on the lot's corner side at its own end, and a quarter turn at the other end" pins the yaws.
   - I checked builder decision 5 by hand. For open "+x" at the -x end, yaw = -pi/2 takes the front (0,1) to (-1,0) and the open side (1,0) to (0,1). That is correct with the three.js yaw convention used by `frontYaw`.

The builder's other flagged decisions:
- (2) `min_floors` per style is needed to reach the ticket's own Q2 numbers ("3 to 5 office floors" on tall while `STACK_FLOORS.tall` is 5). Fine.
- (3) The front face is on z = 0 and the back faces sit on one line `depth_m` behind it. This is one fair reading of design item 3, which does not pin where the line sits.
- (6) Using the tallest real roof as the roof reserve is a safe guard.
- (7) The worst-case bay fit followed by a real re-check is sound: `build` re-checks depth, cap and frontage and steps down `n`.
- (8) The guide is untouched, which is correct for A.

**Extensibility.** `StackPropSlot` (`anchor: street-face | roof | ground`, `keys`) and `StackStyle.props` exist, every recipe sets `props: []`, and `stackKeys` already gathers prop keys for loading. A new style or piece kind is one entry in `STACK_STYLES`.

**CI-safety.** The only file read is inside one `it` and is skipped when the manifest is absent, has the wrong version, or has no `city-pack`. The path is built with `join(process.cwd(), ...)`, so there is no Windows path. There are no timers. Nothing in `stacks.ts` touches fs, DOM or three.

**3D portability.** Not affected. `src/grid/` and `src/night/` are untouched. `stacks.ts` imports `stableHash` from `../render/city`, which is the existing pattern in `models.ts` and `models3d.ts`.

## Rule conflicts and risks
- No hard rule is broken: no file outside A's list, no `src/core/` change, no new dependency, no GDD rule touched, nothing from `assets/private/` committed.
- **`open` precedence (decision 4) is a trap for B and C.** `open` is read in the lot frame *after* the front is turned (see the `store_corner_mesh` note on `BUILDING_FRONTS`). If Josh corrects a corner piece's front from "+z" to "-z" in B, the recipe's "+x" guess then points at the opposite physical end. Because the recipe wins over the fronts table, a corrected `open` that criterion 13 promotes into `BUILDING_FRONTS` would be silently ignored. This doesn't block A, because the ticket puts `open` in the recipe. B or C should settle it.
- **The back-face line is an assumption that matters most for offices and roofs.** x is centred but z is back-aligned. As a result, the office floor (10.0 m deep) sits about 0.47 m off the base's (10.94 m) centre in z, and `Apartment_Roof_01` (5.92 m deep) juts about 0.72 m past the 5.20 m floors on the street side only. The ticket names this risk and the B gallery is the check, but Josh should be told to look for it.

## Must fix
none

## Could improve
1. Give the fronts table's `open` precedence over the recipe's guess (table > recipe > "+x"), or store the recipe's `open` in the model's own frame so a front correction cannot flip it. Then update "a recipe's open side wins over the fronts table's" to match. This is best done in B, before Josh's check, so his corrections take effect.
2. For `depth: "footprint"` (offices), consider centring the pieces in z, as they already are in x. Or raise it explicitly in the B gallery captions so Josh judges it.
3. `stacks.test.ts`, the fixture check uses `toBeCloseTo(w, 1)`, which allows 0.05 m, while its name says "within 1 cm". Use `toBeCloseTo(w, 2)` or fix the name.
4. `stacks.test.ts`, the `sweep` doc says "x 40 lot keys" but the default is 8. Fix the comment.
5. The recipe test's dressing regex runs over `stackKeys`, which includes `props` keys. The future dressing ticket will have to edit this test when it fills a slot. Consider excluding prop keys from that check now.
