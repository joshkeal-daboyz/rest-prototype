ticket: 081-L1-lit-windows
assessment: meets
must-fix: 0

Round 1 found 3 must-fixes, listed below. Round 2, at the end of this file, finds them fixed: must-fix 0.

## What the ticket asked for, as I understood it
In `city-two-ways-round`, a `{ building }` (or `{ roof }`) lamp's building stays dark until current reaches it. Then its windows glow through one shared emissive mask on per-building material clones made at build time, and its shop glass glows in one extra instanced layer. The windows follow E2's Relight order, flare and brownout. The wall lamp pick is removed but its place is kept, and a dev-only `perf=1` log shows the budget (no new program, at most 1 more draw call).

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081l1-lit-windows`. The builder's commit is 90b7f72. The core `removed?` field and the component-picks Removed list came with the cut and the main session's pre-build step.

1. **The window mask: met.** `windows.ts` has `WINDOW_UV` (x 512..852, y 910..1024, splits 626 / 738, which matches the cut's figures), `PANE_COLOURS` and a cached `windowMask()` (1024 square, `flipY` false). Test: "the mask is each pane's colour inside the glass rectangle and black just outside it". I also checked the rectangle against the GLB. Every glass face of the pieces on P0's three lamp buildings falls inside it: `Apartment_01` 12 faces, `Stack_01` 36, `Corner_01` 24, `Apartment_03` 14, `Stack_03` 42, `Door_01` 8, and the three `Shop_*_Glass` keys. The 01_C, 02_C and 03_C colourway atlases have the same glass swatches (5380a5 / 6496bf / 487194) at the same place.
2. **A building's window level: met.** `buildingGlow` is built on `lampState`, `lampFlicker` and `FLARE_SECONDS`, and takes the brighter lamp. Tests: (a) "on P0's file each lamp building is dark before its lamp's arrival and lit after it, in the order the Relight lights the lamps" (5.3 s, the P0 view, as the ticket allows); (b) "a brownout dips a lit building below 1, a dark one stays 0, and with two lamps the brighter one counts". Both test real rules.
3. **The swap: met.** `litBuilding` clones each `map`-bearing material once per building at level 0 and writes `emissiveIntensity` on those clones only. `standWindows` runs inside `build()`, so the clones exist before play. Test: "the swap gives the lit building's pieces clones ... leaves the other building's shared material untouched".
4. **The shopfront glass: partly.** `litGlass` is a second `dressGroup` over the lamp buildings' `SM_Bld_Shop_*_Glass` draws, with an additive material and per-instance colour. The dark instancer is not edited. But `dressGroup` makes one InstancedMesh per key, so the layer is not "one more instanced mesh" (Must fix 2). No test covers it, and the ticket asked the builder to fold it into criterion 3's case or say why not (Could improve 3).
5. **E2's glow and pool go for building lamps: met.** The `LampGlow` loop in `cityview.ts` now skips everything but `lampPost`, and the head height is a constant 5 m. E2's cases are not in this branch's files; CI ran them.
6. **The wall lamp goes: met.**
   - `COMPONENT_MODELS.lampBuilding.removed` is set.
   - `circuitDraws` puts a removed pick in `removed`, not `pieces`.
   - `circuitKeyUses()` skips it.
   - `nodePiece` is built from `pieces` plus `removed`, so the pick proxy, `lampPlaces` / `centreOn` and the overlay keep the place.
   - Tests rewritten: K3b's bracket case and D3's table case. K3's "stands one model per node" case also had to change, because P0's lamps are all building lamps now.
7. **The game pack: met.** `gameModelKeys()` skips removed picks, and `gamemodels.test.ts` gained one assert.
8. **The frame measure: not met as built** (Must fix 1). The log can't give the numbers the criterion asks for.
9. **Josh plays it: not met.** Josh, 24 Nov 2026: "Both sides of the buildings windows should be lit." The lamp buildings light only on their leading half (Must fix 3). His other point, "There is no light being cast into the street", is L2's light pool, not yet built, and is not judged here.

**Count.** 4 new cases in `windows.test.ts`, plus 4 rewritten: the circuitdraw bracket and node-standing cases, the componentmodels table case and the gamemodels case. That is 8 against the ticket's 6. The two extra rewrites are forced: each would fail without them once the pick is removed and the wall lamp leaves the game pack, which criterion 7 requires. 8 is well under 15, and none of them is a duplicate or a report-only test. My run, on the branch's own files only (`windows`, `circuitdraw`, `componentmodels`, `gamemodels`, 2 workers): 4 files, 13 tests passed, 10.4 s. The only slow cases are the two P0 views (about 5.3 s each), which is the ticket's stated exception.

**Josh's finding (24 Nov 2026, in the browser): "Both sides of the buildings windows should be lit."** His screenshot shows a lamp building under one roofline whose left part (dark brick) is lit and whose right part (teal) is dark. **The cause: the lamp lights one plan building, but what reads as one building is two.** Grammar rule 4 (Decided, `CityBuilding.partner` / `back`, `src/core/cityplan.ts`) backs every leading building of an outer row onto a following building of the same height. That follower is a separate building id with its own `building:<id>` group. It is either "through" (its partner's style and colourway) or "another" (its own style and a different colourway). `lampBuildings` maps a `{ building }` lamp to `place.building` alone. So only the leader's group gets `litBuilding` clones, and only the leader's dress draws get `litGlass`.

This holds for all three lamp buildings on P0. I ran the plan on 6 x 6 seed 1 with P0 (buildings layer, `partner` field):

| Lamp | Leader (lit) | Follower (dark) |
| --- | --- | --- |
| `homes` | `block:6:6/a|outer|-x|54,52`, colourway 02_C, roof 9 m, cells 54,52..54 | `block:6:6/a|inner|+x|55,52`, back "another", 04_C, roof 9 m, cells 55,52..54 |
| `shrine` | `block:6:6/a|outer|+x|67,54`, 01_C, roof 15 m | `block:6:6/a|inner|-x|66,54`, back "through", 01_C, roof 15 m |
| `infirmary` | `block:6:6/b|outer|+z|58,62`, 03_C, roof 15 m | `block:6:6/b|outer|-z|58,61`, back "another", 04_C, `apartment-02`, roof 15 m |

The homes row matches the screenshot: the 02_C front is lit and the 04_C back stays dark under the same 9 m roof. For the infirmary, the face the main session called its "facing panes" may well be the follower's `-z` face, which is never lit. I did not check that against the opening camera. If so, this, not the Relight timing below, is why the shrine and infirmary looked dark.

**The other things I checked are not at fault.** Building ids resolve. The UV mask covers every piece family on these buildings, the follower's `apartment-02` pieces and every colourway included, because the glass swatches sit at the same place in 01_C..04_C (sampled 01_C, 02_C, 03_C). Every mesh of a lit group is cloned, and the level is applied every frame. This is Must fix 3.

**A second, smaller effect: the Relight timing.** It can delay the shrine and infirmary but not keep them dark. I computed the arrivals on P0: shrine at relightT 1.37 s, infirmary at 2.05 s, duration 2.65 s. `play.ts` advances relightT by the frame's dt, capped at 0.1 s, and the win banner shows on `state.complete`, at relightT 0. So at a low frame rate (the missing `perf=1` line means under 7.5 fps on average) the two lamps light some real seconds after the banner.

Two smaller things Josh will see on the lit buildings, both from the data, not the code:
- The infirmary's two party-wall `SM_Prop_Window_01` props are shared dressing instances. Their 4 glass faces stay dark (planDressDraws on seed 1; GLB UVs).
- The shrine's `SM_Bld_Shop_06` has no `_Glass` key in `SHOP_GLASS`, so its shopfront never glows.

## Rule conflicts and risks
- **Purity: untouched.** No change in `src/grid/` or `src/night/`, which the 3D game takes as they are. `windows.ts` imports only types from `../grid` and `../core`, and `FLARE_SECONDS` from `../render/relight`, as `cityview.ts` and `relight3d.ts` already do.
- **Files outside the ticket's list:** `gamemodels.ts` and `gamemodels.test.ts`. Criterion 7 ("`SM_Prop_Light_Wall_01` leaves `gameModelKeys()`") can't be met without them, so the ticket's Files list is what missed them. I accept them. `src/core/citycircuit.ts`, `docs/design/081-component-picks.md` and `tickets/rules-coverage.md` are in the branch's diff but came with the cut and the main session's pre-build step, not the builder.
- **Import cycle `windows.ts` ↔ `cityview.ts`.** `windows.ts` imports `lampState` from `cityview.ts`, and `cityview.ts` imports `windows.ts`. Neither uses the other's exports at module top level, so it loads in both orders and is not a runtime fault today. It is a risk:
  - `windows.test.ts` pulls in all of `cityview.ts`'s module graph;
  - L2 and L3 will add more to `windows.ts`;
  - a future top-level use on either side would read an undefined binding.

  Could improve 1.
- No GDD Decided rule is changed: a dark lamp's building reads dark, and the Relight order is E2's own plan. No new dependency.

## Must fix
1. **`perf=1` can't give criterion 8's numbers** (`src/render3d/cityview.ts`, the `perf` block in `draw`). It counts from the first frame with `city` set, which is the grey-box city from `build(null)`, before any model loads. It then logs once, at frame 300. So the line can come out before the models load, and there is never a line "after the Relight". That leaves no way to show "no new program between the first frame after the models load and the end of the Relight" or the draw calls after power, and the main session saw no line at all in 40 s. Expected effect:
   - start the 300-frame count on the first frame after `build(set)` has drawn the loaded city, and log draw calls, triangles, programs and the median frame time;
   - log once more, about 300 frames after the Relight ends (`plan_` going from non-null back to null with `state.complete`), with the same fields.

   The two lines then give the before-power and after-Relight figures, and their program counts show criterion 3's "no new program".
2. **The lit shop glass is up to 3 draw calls, not 1** (`src/render3d/windows.ts`, `litGlass`). `dressGroup` makes one InstancedMesh per glass key. On P0 (planDressDraws on 6 x 6 seed 1) the lamp buildings carry `SM_Bld_Shop_04_Glass` and `SM_Bld_Shop_Corner_01_Glass` (homes) and `SM_Bld_Shop_03_Glass` (infirmary), so the layer is 3 calls. Those calls are drawn even while every level is 0. Criterion 4 says "one more instanced mesh ... for all the job's buildings" and criterion 8 "at most 1 more draw call". Expected effect: one draw call for the whole lit-glass layer. One way is to merge the lit placements' glass geometries into one `BufferGeometry` with a per-vertex colour written each frame. `mergeGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js` ships with three, so it is not a new dependency. The alternative is for Josh to accept 3 calls in his own words, recorded in the ticket. The reviewer can't waive the number.

3. **A lamp lights the whole building Josh sees: the leader and the buildings backed onto it** (`src/render3d/windows.ts` `lampBuildings`; `cityview.ts`'s `standWindows` passes it the buildings layer). Josh, 24 Nov 2026: "Both sides of the buildings windows should be lit." Expected effect:
   - a `{ building }` (or `{ roof }`) lamp's building set is the building itself plus every building whose `partner` is it;
   - when the lamp's building is itself a follower, the set is its partner and the partner's other followers;
   - every floor piece, ground piece and `SM_Bld_Shop_*_Glass` draw of that set takes the building's level, on every face, whether the follower's `back` is "through" or "another".

   On P0 that adds `inner|+x|55,52`, `inner|-x|66,54` and `outer|-z|58,61` (table above). Test: fold the rule into criterion 2(a)'s P0 case (no new case). Assert that each lamp's set holds its leader and its follower from the buildings layer. A name that states the rule, such as "a lamp lights its building and the building backed onto it", makes it coverage. The architect should also record Josh's words against criterion 9 and the section L reading ("lights that building's windows"), since "building" now means the leader-and-follower pair, not one plan id. Neighbours along the row (for example `outer|-x|54,48`, roof 12 m beside the homes) are separate buildings and stay dark.

## Could improve
1. Break the import cycle within the ticket's files. `windows.ts` can call `lampIgnition` from `relight3d.ts` when there is a plan, and read `state.lit` otherwise: the three lines `lampState` is. Then `windows.ts` no longer imports `cityview.ts`.
2. Hide the lit-glass meshes (`visible = false`) while every lamp building's level is 0. The dark city then costs no extra call at all before power.
3. Criterion 4 has no test. It can be built from a fixture: a root `Group` with one mesh under a `SHOP_GLASS` key, and two dress draws on two buildings. One more `expect` block in criterion 3's case would hold "only the lit building's glass takes its level" without adding a case. Otherwise the builder should say why it is browser-only, as the ticket asked.
4. Tell Josh before he plays that the infirmary's party-wall window props stay dark and the shrine's shopfront (`Shop_06`) has no glass to light. Both are expected from the pack's data, not faults in L1.
5. The ticket's Files list for L1 should have named `gamemodels.ts` and its test (criterion 7). That is a note for the architect on L2 and L3.

## Round 2

ticket: 081-L1-lit-windows
assessment: meets
must-fix: 0

I reviewed commit d79576b on `ticket/081l1-lit-windows`. It changes only `src/render3d/windows.ts`, `windows.test.ts` and `cityview.ts`, all on the ticket's list. My run, on the branch's own test files only (`windows`, `circuitdraw`, `componentmodels`, `gamemodels`, 2 workers, in the foreground): 4 files, 13 tests passed, 7.7 s. The case count is still 8: the P0 case was rewritten in place, and no case was added.

**Must fix 1, the `perf=1` log: fixed.**
- The count now waits for `modelsLoaded`, which `build()` sets only when it ran with a model set. The grey-box city is no longer measured.
- The first line is labelled "before power".
- When `plan_` goes from non-null back to null, the count restarts and logs a second line, "after the Relight", with the same fields: draw calls, triangles, programs and median frame time.
- The two program counts give criterion 3's "no new program".
- One edge: if the Relight starts before the first 300 loaded frames (about 5 s at 60 fps), the "before power" line is dropped and only the second one prints. That is Could improve 3, not a blocker.

**Must fix 2, the glass draw calls: fixed.**
- `litGlass` now flattens and places each lit placement's glass parts with the same `dressMatrix` x part-local transform `dressGroup` uses. It merges them with three's `mergeGeometries`, which ships with three, so it is not a new dependency.
- The result is one `Mesh` with a per-vertex colour written each frame: one draw call whatever the count, or no mesh at all when there is no glass.
- `commit()` hides the mesh while every level is 0, so the dark city costs no extra call before power. That also takes round 1's Could improve 2.
- I checked the GLBs (`out/city-pack.glb` and `out/game/city-pack.glb`). All seven `SM_Bld_Shop_*_Glass` meshes are indexed, so `toNonIndexed()` copies their positions and `applyMatrix4` never touches the cached model's geometry. See Could improve 2 for the non-indexed case.

**Must fix 3, followers dark: fixed.**
- `lampBuildings` now takes the buildings layer.
- It maps each lamp's base building to its leader (`partner ?? base`; a leader's `partner` is null, so it maps to itself).
- It lights the base, the leader and every building whose `partner` is the leader. This holds whether the follower is "through" or "another", and whichever of the pair the lamp names.
- `cityview.ts` passes `plan.layers.buildings?.buildings`. Both `standWindows` (the per-building clones) and `litGlass` (the shop glass) key off `lampsOf.keys()`, so the followers' floors, ground pieces and glass take the level.
- The P0 case's new name states the rule. Its asserts cover all three followers from round 1's table (`inner|+x|55,52`, `inner|-x|66,54`, `outer|-z|58,61`) and the neighbour `outer|-x|54,48`, which stays dark. A loop checks that every lit building's leader is lit too. The case fails if the rule breaks.
- Josh played the fix, 24 Nov 2026: "It looks like all windows related to the same building are now fixed." That meets criterion 9 for the windows.

**The import cycle (round 1 Could improve 1): removed.**
- `windows.ts` no longer imports `cityview.ts`. `buildingGlow` calls `lampIgnition` from `relight3d.ts` when there is a plan, and otherwise reads `state.lit`, which is exactly what `lampState` does.
- `relight3d.ts` imports nothing from `cityview.ts`.
- `windows.ts`'s new imports, `dressMatrix` and `meshParts` from `models3d.ts`, are in its own folder.

**Nothing new broken.**
- `src/grid/` and `src/night/` are untouched, and there is no new dependency.
- The lamp-post glow loop is unchanged.
- `freeWindows` removes and disposes the merged mesh, its geometry and its material, and no cached model geometry.

### Must fix
none

### Could improve
1. **The front door glows oddly (known, Josh's note).** Josh, 24 Nov 2026: "the front door has an odd glow to it. I think this might go away when 3d lighting is enabled. I don't want to spend too much time on it." The likely cause is that the `Door_01` glass faces sit inside `WINDOW_UV` (8 faces, round 1), so the door's panes take the window mask. Look at it again after L2's real lights. It is not a must-fix.
2. In `litGlass`, a glass part without an index goes through `flat === g`, which shares `src`'s position attribute, and `applyMatrix4` would then move the cached model's own geometry. Every shop glass mesh in the pack today is indexed, so this does not happen now. Using `g.index ? g.toNonIndexed() : g.clone()` would close the gap.
3. The `perf=1` "before power" line is lost when the Relight starts before 300 loaded frames. Logging the partial count when `plan_` first goes non-null would keep the line.
4. Criterion 4 (only the lit building's glass takes its level) still has no test. Round 1's Could improve 3 stands: one `expect` block on a fixture, with no new case.
5. Round 1's Could improve 4 and 5 still stand. Tell Josh about the infirmary's party-wall props and the `Shop_06` with no glass. The architect should name `gamemodels.ts` in the Files lists for L2 and L3, and record that "building" in section L now means the leader with its followers.
