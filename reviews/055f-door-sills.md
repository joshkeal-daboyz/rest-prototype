ticket: 055f-door-sills
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Measure each ground-floor model's door sill from its converted GLB and put the values in a pinned table (`sills.ts`). When drawing, sink any building whose sill is over 0.15 m so its door meets the walk; a stack sinks as one by its largest ground-piece sill and takes its dressing with it, and a house gets the Town Pack steps only where sinking would bury its windows. The plans, the layout and the playtest must not change, and guide 16.10 records the rule with Josh's words.

## Does the branch do it?
Reviewed `d4f10f7` against `e875f0b` (goal/city-style). It touches six files: `sills.ts`, `sills.test.ts`, `models3d.ts`, `styleguide.test.ts`, `dressdraw.test.ts` and `docs/city-style-guide.md`. Gate green: tsc clean, 2425 passed, 10 skipped. I also ran the real-GLB test from a cwd that has the converted assets (`D:\rest-prototype-main`, `--root` the gate worktree, one worker). It ran and passed.

- **33, the measured table: met.** `DOOR_SILLS` has 41 entries. `sills.test.ts` "has an entry, or a reason it has none" lists every ground key: 13 City Pack stack pieces, 12 Town Pack buildings and 38 SIMPLE Town buildings. Each key has exactly one of an entry or an `UNSETTLED` reason (22 keys), and the reasons are repeated in 16.10.
  - **The method follows the criterion.** `measureDoor` reads upward-facing triangles (normal y over 0.9) that are level, under `SILL_CEIL_M` (1.5) and start within `SILL_DEPTH_M` (1) of the front face. It clusters them by level and along the front, drops clusters under 0.2 m2, and takes the highest cluster within 0.45 m of the door's centre. The front face is the furthest vertex along `BUILDING_FRONTS`' axis. The area filter and the clusters are the builder's way of reading "the surface under the door opening", and they are sound.
  - **The pinned fixture is CI-safe.** `PINNED` is typed in and compared exactly ("pins every entry's three values").
  - **The real-GLB re-measure is skipped where the GLBs are absent.** It sits inside one `it.skipIf(!have)`, re-measures every key within 0.02 m and also requires every `UNSETTLED` key to measure null.
  - **My own re-measure matches.** I wrote an independent script in the scratchpad that reads the GLB nodes and bins the upward faces:
    - `Shop_05`: a 4.26 m2 floor at 0.36 (table 0.361);
    - `Shop_01`: 5.05 m2 at 0.10 (0.106);
    - `Preset_01`: a 0.31 m2 threshold at about 1.15 within 0.4 m of its -x front (1.151);
    - `Preset_10`: nothing within 1 m, and its 1.05 threshold starts 2.57 m back, as the reason says;
    - `Garage_01`: its only threshold is 8.17 m back, also as the reason says.
  - **`door_x_m` deviates slightly.** It comes from "the nearest floor cluster when none covers the front's centre", not from a door mesh or material name as the criterion says. No steps are drawn on the real table, so it has no effect today (Could improve 4).
- **34, the plan: met.** The constants are exported with the ticket's values. `houseSill`, `stackSill` and `planHouse` are pure. Each fixture case has a named test: 0.1 means no change; 0.6 with no window sinks 0.6; 0.6 under a window at 0.6 sinks 0.3 with steps at 0.6; 0.6 under 0.35 sinks 0.05 and leaves 0.55 at scale 1.1; a stack with sills 0.2 and 0.45 sinks 0.45; a missing key means no change.
  - The "after the rule" test runs a grid of sills and windows.
  - The left-over list comes from the real table. "Says which keys are over SILL_MAX_M" asserts that no key takes steps and none leaves a gap.
  - One addition goes slightly past the ticket: a rise under the steps' smallest scale is made by sinking less. It serves the 0.05 m fit rule and is documented in 16.10.
- **35, drawn: met.** In `applyModels`:
  - whole models are lowered by `houseSill` times their placement scale;
  - lone and terrace stacks are lowered by `stackSill` times `WORLD_PER_METRE`;
  - dressing sites get `frame.y` (`dressMatrix` now composes it);
  - the steps are one `InstancedMesh`, either through `dressGroup` with the pack root or as a `YARD` box mesh when the root is absent.

  Tests: "every stack group is lowered by stackSill, and each block's dressing frame by the same" (three protocol maps), "lowers the dressing instances by the sink", the house sink, steps and box tests, and the empty-table tests on the three maps and the default tile city.
- **36, the ladder changes only here: met as far as Vitest can show.** `sills.ts` imports nothing from three or the DOM, and a test asserts that none of the plan modules (`stacks`, `dressing`, `town`, `furniture`, `tilecity`, `tilecity3d`, `models`) imports it. So `townLayout`, `packTown`, `dressTown`, `furnitureLayout` and `evaluateCity` cannot see the sink.
  - The empty-versus-full tests compare the packed stacks, the dressing pieces, the furniture and the building x/z/yaw.
  - Pick and Relight are not tested directly. Every model and step mesh has `raycast = () => {}`, so picking cannot change.
  - The playtest snapshot is the playtester's to confirm.
  - 16.6 and the Town Pack row record the steps key and `DeckSteps_01` as broken.
  - The tile page passes `stepKeys: []`, and its `table: []` already keeps the Town Pack out. Puzzle pages already load `town-pack.glb` for houses (`planModels` covers the whole table), so the steps add no new GLB fetch.
- **37, guide: met.**
  - 16.10 opens with the Decided line and Josh's words, exactly: "That's going to have to be a variable that we measure for each individual building." `styleguide.test.ts` checks that text.
  - It states the method, gives the table, and lists three Open items: the 22 unsettled keys, the SIMPLE Town stoops, and mixed-sill stacks.
  - Numbers has 14 rows for `sills.ts`, and the new drift check fails on an export with no row.
  - The existing checks are unedited. Only the `MODULES` map gains a `sills.ts` entry.
- **38: main session's** (screenshots). See the risks below.

## Rule conflicts and risks
- **Two edits are outside F's Files list (criterion 22).**
  - `dressdraw.test.ts` changes one assertion to add `frame.y`. The default table now sinks the blocks that test draws, so it would fail without the change, and no edit that stays inside the Files list could avoid that. The ticket's list was incomplete. The new assertion is no weaker: `frame.y` is checked against `stackSill` in `sills.test.ts`.
  - The guide's "Decided, not yet built" bullet for 055 F becomes "built, now 16.10". That is the same housekeeping 058 did, and the new drift check requires it.

  Neither touches a Must-not-touch file. The main session should name both to Josh instead of sending them back.
- **Mixed-sill stacks put doors below the walk. This is the ticket's rule, and it works against criterion 38's own words ("no door sunk into the slab").** Every apartment style mixes `SHOPS`, `DOORS` and `SHOP_CORNERS`. So most blocks that hold a `Shop_05` (0.361), `Corner_02` (0.376) or `Door_02` (0.206) sink by that amount. Their `Shop_03` (0.043) and `Door_01` (0.029) doors then end up to about 0.35 m under the walk. That is the opposite of Josh's complaint, and probably on most terrace blocks, not a few. It is written down as Open in 16.10, and the builder followed the ticket's rule as written, so it is not a defect of the branch. It needs Josh's eye at criterion 38. Options for a later ticket: sink by the residents' door piece, by the median, or by the lowest ground sill.
- **Josh's complaint is only partly fixed on the ladder.** `Preset_10` and `Garage_01` are on all three protocol maps and have no entry, so they keep their roughly 1.05 m plinths. Next to houses that now sink about 1.05 to 1.17 m, the garage will stand a metre higher than its neighbours.
  - Is this a must-fix? No. Criterion 33 says "a key the geometry cannot settle gets no entry". Settling these keys needs a deeper or per-key search, which changes the method the ticket fixed at 1 m, and that is a re-cut. 16.10 records it as Open and waiting for Josh.
  - My re-measure shows the fix would be small. With a 3 m depth, `Preset_10` reads 1.05 m at u from -3.18 to -2.15. `Garage_01` has no front floor at all, so it would need a value typed in by hand, or the rule "sink like its house".
- **Single-material models sink by the whole sill with no window check.** SIMPLE Town and the City Pack have no glass material, so `window_m` is null. For example, `Building_House_01` to `_04` and `_012` to `_015` sink 1.035 to 1.053 m. The rule allows this (null means sink the whole sill), but nothing measured that their ground-floor windows stay 0.3 m clear. My re-measure of `Building_House_01` shows a 0.6 m porch step in front of its 1.04 m floor, and that step ends up below ground. 16.10's method bullet notes these "sink by the whole sill", but there is no Open about windows. Check this at criterion 38.
- **Purity: none found.** `src/grid/` and `src/night/` are untouched. No new dependency. Nothing is written under `assets/`.

## Must fix
none

## Could improve
1. `docs/city-style-guide.md` 16.10: add an Open saying that window clearance is not measured for single-material models (SIMPLE Town houses sink up to 1.053 m with `window_m` none). Then criterion 38's "no ground-floor window is buried" has a recorded place to fail.
2. Ticket 055 / a follow-up: put two questions to Josh together. First, a per-key sill override or deeper search for `Preset_10`/`_11`/`_04` and `Garage_01`, so the plinths on the protocol maps sink too. Second, which sill a mixed-sill stack sinks by. Both are the complaint the section exists for.
3. `sills.test.ts`: add one direct equality for criterion 36's `evaluateCity` (and the pick targets) between `sills: {}` and the default table on one protocol map. Today the coverage rests on the import check alone.
4. `sills.ts` `measureDoor`: the criterion's door rule is "the door mesh or material if one is named so". Either try a name match first, or note the cluster method as a deviation in 16.10. It matters once a house takes steps.
5. `reviews`/main session: record in the merge note that `dressdraw.test.ts` and the "Decided, not yet built" bullet were edited outside F's Files list, and why.
