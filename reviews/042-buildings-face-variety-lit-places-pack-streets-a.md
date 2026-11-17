ticket: 042-buildings-face-variety-lit-places-pack-streets-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A only. Add an explicit per-model front table (`BUILDING_FRONTS`, `frontYaw`) and a `fronts=1` debug overlay, and keep corner shops to corner lots (`Lot.corner`, the only change to `town.ts`). Group same-mesh names into families (`meshFamily`) and pick by family so no shop front dominates: no neighbour or street repeat, a 0.25 cap per family, `BUILDING_EXCLUDE`. All of it stays in `src/render3d/` and 041's tests stay unedited.

## Does the branch do it?
- **Every building has a front: met.** `models.ts` adds `ModelFront`, `frontYaw` (0, pi, -pi/2, +pi/2), `frontAxis` and `BUILDING_FRONTS`, with every name at "+z" and `store_corner_mesh` marked `corner: true`. The rows' `front` field is gone. Two tests in `facing.test.ts` cover it:
  - "has a BUILDING_FRONTS entry for every name in a building row of MODEL_TABLE, and for ticket 042 B's default place models" checks the whole table and B's defaults.
  - "maps +z, -z, +x and -x ..." checks each value. It also turns each axis by its yaw with Three's `applyAxisAngle` and checks that it lands on +z. That is a real check of the convention, not a copy of the switch.
- **Every placed building faces its road: met, and the test really is independent of `lot.yaw`.**
  - In `facing.test.ts`, each fake root gets a `front-marker` child at `frontAxis(front)` in model space, and the real `applyModels` places the clones.
  - The direction under test is `marker.getWorldPosition - clone.getWorldPosition`, read from the scene's world matrices. `lot.yaw` never enters that calculation.
  - It is compared with lot centre to the nearest point of `town.roads.get(lot.street)`, with a limit of 0.5 degrees, over every `puzzles/*.json` plus `lamp-row.grid.json` and more than 5000 clones.
  - It runs twice: once on the shipped table, and once on a scrambled table that uses all four fronts (the test asserts that all four occur). So it can't pass just because every model happens to be "+z". This is the strongest test on the branch.
- **Corner models: met.**
  - `town.ts` marks the first and last lot of each `fillRow` call. It then marks any lot whose side edge is within `CORNER_GAP` (0.5) of another road's pavement.
  - "every map has a corner lot ..." checks that every map has one, that each row's first and last lot is one, and that corners are between 5% and 100% of all lots.
  - "puts a corner model only on a corner lot ..." checks the real set and that the corner shop is used at least once.
  - A hand-built three-lot case checks that an ordinary lot never gets a corner model.
- **Families: met.** `meshFamily` groups names whose bounds agree within 1 cm and whose triangle counts are equal, and names the family after its smallest name.
  - The fixture in `facing.test.ts` is copied from the manifest. The "meshFamily" tests check that Shop_03/04/05 form one family and _01/02 another, with Gym in neither. They also check the 1 cm edge (0.009 joins a family, 0.011 does not) and that the triangle count must match.
- **Variety: met, on the real-shaped set.** In "variety (every map)":
  - A strict neighbour test (every pair, more than 1000 pairs) runs on every map, and every type has three or more families, so it applies to all of them.
  - The street-repeat test checks types with four or more families, over more than 1000 checks.
  - The share-cap test, the exclude test and determinism are all covered.
- **Weighting: met.** Over all maps, the most-used `small` family is at most 1.5 times the least-used, and all seven families appear, the corner shop included. A further test shows Shop_03..05 together now count as one family's share against Gym. I can't see the per-family counts for 09 and 56 that the builder was asked to report; that belongs to the builder's report, not the code.
- **Town unchanged apart from `corner`: met.**
  - `git diff main...HEAD` shows no change to `town.test.ts`, `live.test.ts`, `relight3d.test.ts`, `layout.test.ts`, `scene.test.ts` or `pick.test.ts`.
  - The `town.ts` diff adds `CORNER_GAP`, the `corner` field (`false` at push), the row-end marking and the pavement pass. No lot's position, size, yaw or type is touched. Defining a constant for the computation is within "the corner field and its computation".
- **Overlay: met.**
  - `debug3d.ts` draws an `ArrowHelper` and a caption per clone. The captions use the existing caption code (`createCaptionSprite`, `scaleForPx`).
  - Nothing in the overlay can be raycast. `location.search` is read only in `renderer.ts`, and `debug3d.test.ts` asserts that by scanning the sources. `main.ts` is untouched.
- **Josh checks:** his to do.

### The builder's declared deviations
1. **Pick = hash among the least-used allowed families, not "the next family in the list". Acceptable.**
   - "Next family in the list" is design text, not a criterion. The criteria are equal weighting and the 1.5 ratio, and least-used balancing meets both more reliably.
   - The cost: on a map the hash only breaks ties, so the choice is close to round-robin in lot order. The neighbour and street rules stop that from showing as a visible pattern.
2. **Share cap = max(floor(0.25·N), ceil(N/ordinary families)). Acceptable.**
   - The strict 0.25 is impossible whenever 0.25·N is less than N divided by the families that can fill ordinary lots. Examples: 4 families with N not a multiple of 4, or N < 4 where floor gives 0.
   - For the large N of the `small` type, the cap is exactly floor(0.25·N). The test uses the same formula, so it is no weaker than the arithmetic allows.
3. **The `models.test.ts` neighbour test was rewritten weaker. Acceptable, with a note.**
   - `models.test.ts` is not on the ticket's "pass unchanged" list.
   - The rewritten test states the greedy picker's real guarantee on a fake set with exactly three models per type. The ticket's criterion, strict, on a set shaped like the real one, is in `facing.test.ts` and passes.
   - It is still a loss: a type with exactly three families can now show a shared family beside itself. The real `tall` type has three families and passes today, but an entry in `BUILDING_EXCLUDE` could change that (could-improve 1).
4. **A lot of a type with only corner models gets no clone. Acceptable.** It can't happen with the shipped table, where every type has ordinary families. If it ever did, that lot would show neither a clone nor a placeholder, because `applyModels` hides a type's placeholders as soon as one lot of that type is covered (could-improve 2).
5. **An `open` field on corner entries. Acceptable.** The ticket asked for the shop's open corner on the row's outer end, "mirrored by yaw, not scale". A yaw can't mirror without turning the door away from the road, so placing the shop only where its declared open side is the open end is the faithful reading. It is a small addition to the ticket's `{ front; corner? }` shape. The default "+x" is a guess, though, and the overlay doesn't show it (could-improve 3).

## Rule conflicts and risks
- No hard-rule break found:
  - every changed file is in `src/render3d/`, with no change to `src/grid/`, `src/night/`, `src/core/`, `tests/`, `puzzles/` or `package.json`;
  - there is no new dependency;
  - `debug3d.ts` imports only from `src/render3d/` and Three;
  - no GDD Decided rule is touched (the change is visual only).
- `pickBuildings`'s docstring says that when every family breaks a rule, "the cap goes, then the street rule, then the neighbour rule". The code's `rules` array drops the street rule first (rule 2 keeps the cap), then the cap. The tests pass either way on real maps, but the comment misdescribes the order.
- The facing test measures toward the nearest point of a clamped segment. For a lot past a road's end, that point would be the endpoint, not the perpendicular foot. It passes under 0.5 degrees on all maps, so no lot hits this today.

## Must fix
none

## Could improve
1. `src/render3d/models.ts` `pickBuildings`: for a type with exactly three families, the greedy picker can't promise distinct neighbours. If Josh adds to `BUILDING_EXCLUDE` and a type drops to three families, the strict neighbour test in `facing.test.ts` could start failing. Either relax the street rule further for such types, or make the test's threshold match what the picker can actually guarantee.
2. `src/render3d/models3d.ts` `applyModels`: hide only the placeholders of lots that actually got a clone, not every placeholder of a covered type. Then a lot left without a clone (deviation 4) keeps its placeholder.
3. `src/render3d/debug3d.ts`: for a corner model, show the declared `open` side (a second, smaller arrow, or "open +x" in the caption). Josh can then calibrate it in the same pass as the fronts. As things stand, a wrong `open` guess only shows up as a side wall at a street end, with no hint why.
4. `src/render3d/models.ts`: correct the `pickBuildings` docstring so the fallback order matches the `rules` array (street before cap), or swap the array to match the docstring.
