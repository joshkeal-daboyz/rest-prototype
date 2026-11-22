ticket: 070tr1-traffic
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A new pure stage 9, `traffic` (`src/city/traffic/`). It works out each junction's control by Josh's rules (DS, IN, SJ, AS, T, C). It places dark signal assemblies (mast, arm, walk heads, button, one box) at the two-way inner crossroads, and stop signs at all-way stops and at the ending arm of each T, all kept clear of stages 5 to 8 (CL). It comes with a pinned kit, a checks module with failing fixtures, a flat picture, R-1 to R-7 tests, a numbers report, and single-line edits in the other folders.

## Does the branch do it?
- **0 (architect).** Commit 6956157 adds "traffic" to `CITY_STAGES` between ground and assemble, and `traffic: CityTrafficLayer` to `CityLayers`. Those are the only `src/core/` edits, and they are the architect's.
- **1 Kit.** `kit.ts` has the six keys, their bounds, `MAST` (axis, foot, collars, button, hook, clamp face) and `ARM` (clamp axis and height, heads, reach, lens). `TRAFFIC_ALLOWED` is exactly Q33's five keys. `facadebounds.ts` is the copy. `src/render3d/trafficpin.test.ts` covers:
  - Without the GLB: typed fixtures for the bounds and fix points; `isNeverUsed` matched against `TRAFFIC_ALLOWED` both ways; facadebounds equal to ground's key by key; the four Q43 numbers, plus the copied ones equal to ground's.
  - With the GLB (`it.skipIf(!HAVE_GLB)`, read lazily): the bounds within 0.005 m, the heads and clamp, the mast's foot and collars.
  - I ran this file alone with the GLB present: 9 of 9 pass.
  - One deviation from the criterion's literal numbers, under risks.
- **2 Control.** `control.ts` `buildControl` implements the rules. `control.test.ts` works the expected control out independently on all 20 runs:
  - order, arms order, IN, then SJ, AS, T and C;
  - every control kind appears, as does an outbound one-way arm (221 signal junctions, matching the pre-check);
  - the three hand-worked fixtures (T two-way, T leaving one-way, a one-way by two-way crossroads), plus a two-way by two-way case.
- **3 Signals.** `signals.ts`:
  - the mast is on the far-left corner, `MAST_INSET_M` in, with the clamp face toward the arm;
  - the arm is clamped to the upper collar, runs to the driver's right, and its lenses face the oncoming traffic;
  - there is a walk head per crossing landing and a button per mast;
  - there is one box per junction by `rand("traffic","box",id)`.
  
  `signals.test.ts` derives each of these on all 20 runs (884 groups, 1,768 walk heads, 221 boxes) with its own geometry. It also covers head height ≥ 4.6 m (4.819 m), the free end within the carriageway, no signal piece elsewhere, and the hand-worked mast and arm at `junction:50:14|-z`.
- **4 Stop signs.** `signs.ts` `stopPlace` follows ST, with the fallback onto the corner cell when the arm cell is not plain pavement. `signs.test.ts` covers:
  - on the 20 runs, one sign per stop approach on the near-right arm cell, facing its traffic (1,054 signs, all on `pavement`);
  - the 0.5 m and 1.0 m distances, derived independently;
  - none on an outbound arm and none at a signal junction;
  - the kerbCut fallback fixture, plus a dip fixture;
  - the four sides hand-worked.
- **5 Checks.** `trafficcheck.ts` `trafficFailures(layer, input)`: the stage runs it before returning (`stage.ts` `run`), and each failure names its check and cells. `fixtures.test.ts` has:
  - the positive control;
  - every listed fixture for TC1 to TC5 and keys, each asserting exactly its own check;
  - an extra build-out tree fixture.
- **6 Picture.** `stage.ts` `picture` and `TRAFFIC_LEGEND` match the ticket's eight entries. The R-5 test in `stage.test.ts` checks the lattice size, the legend, each junction's cells against `junctions`, and one point per grounded piece.
- **7 R-1 to R-7.**
  - `stages.ts` adds one entry to `BUILT_STAGES`.
  - `stage.test.ts` covers frozen layers, the ground-writer failing and naming traffic, and same-twice and other-seed digests.
  - It pins the four traffic digests, plus the unchanged facades and ground pins.
  - It has the test double built by replacing "traffic", with streets to ground digests equal.
  - A Proxy shows the stage reads only streets, mass, edge, facades and ground.
  - The grep tests cover imports (core, pipeline and its own files only), no DOM, clock, random or three, and no `bi`, `bj` or `line`.
  - Edits outside the folder:
    - the two `BUILT_STAGES` assertions;
    - `ground/testcities.ts` `stagesOf` filtering out traffic;
    - `planview.test.ts` "9" to "10";
    - the `facades/stage.test.ts` `afterEach` yield and its import, exactly as re-cut.
- **8 Numbers.** `report.test.ts` logs, per run: control by kind, pieces by kind, heads over or not over the inbound lane, the closest stage 7 and stage 8 clearances with their run, and the time. It also logs the outside cities (3 x 3 and 6 x 4), asserting only that it ran.
- **9** is the main session's. **10:** the gate is green (as stated).

## Rule conflicts and risks
- **Criterion 1's head distances.** The ticket says the heads lie "4.26 m and 6.0 m from its clamp's pole axis within 0.05 m". The kit types 4.318 and 6.009, and the GLB test asserts those (passing on this machine). Against the ticket's figure, 4.318 is 0.058 m off, which is outside 0.05. So the literal criterion would fail against the real GLB: the pre-check's 4.26 was a misreading, and the test asserts the GLB, not the stage's output.
  - I am not making this a must-fix. The ticket says "the builder's numbers are the record", and the builder cannot truthfully meet 4.26.
  - The builder's one note on it is in the test's header comment. The main session should name it to Josh, or have the architect amend criterion 1 to 4.32 and 6.01.
- **"Enter no stage 5 building"** is judged against `mass.built` cells (stage 3's footprint), not the buildings layer. That is right if every built cell is a building's, which I take to be so, but it is a reading.
- **"Clear of the build-out trees"** is the builder's reading: `TREE_CLEAR_M` = `FURN_KEEP_M` (1.5 m), stated in `constants.ts`.
- **The box** is grounded, standing on the walk with its back to the mast. The ticket asked the builder to say from the GLB whether `Box_01` is pole-mounted. No pin test checks the box's back for a clamp face, and the commit message does not say. The decision is only in a code comment.
- **The box's corner** is picked in approach (arms) order, not "CityJunction order". It is deterministic and equivalent in effect, but not the ticket's wording.
- **`planview.test.ts`** changes two `"9"` literals, not one: the same example appears in two tests, and both had to move. This is within the spirit of the allowance.
- No hard-rule break found:
  - `src/grid/` and `src/night/` are untouched;
  - `src/city/traffic/` imports only core, pipeline and its own files;
  - no new dependency;
  - `docs/` is untouched.

## Must fix
none

## Could improve
1. Main session: get criterion 1's "4.26 m and 6.0 m" re-cut to the GLB's 4.32 and 6.01 (or tell Josh), so that the merged ticket and the test agree.
2. `src/render3d/trafficpin.test.ts`: add a GLB-gated check of `Box_01`'s back, or state the finding in the builder's report, so the "grounded, not pole-mounted" decision is recorded as the ticket asked.
3. `src/city/traffic/trafficcheck.ts` TC3 checks the sign's cell and yaw, but not its 0.5 m and 1.0 m distances. A sign slid inside its cell would pass. The distances are covered by `signs.test.ts` on the named runs, but not by the stage's own check.
4. Small dead code: `unitOf` in `hash.ts` is unused, and `void kinds` in `report.test.ts` is a leftover.
