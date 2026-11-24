ticket: 081-K3b-drops-attached
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Every drop on the 3D city should start on a real insulator of its own pole and end at Josh's City bracket (`SM_Prop_Sign_Attachment_02`), at the tip of its upper arm, standing on the wall. Drops stay hung with `POWER_LINE`, the building lamp stands under the bracket, the Scenery picks table goes into code and is checked against the note, and the bracket goes on its own `"fittings"` key list.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081k3b-drops-attached`. The builder's own commit is 4c7cf1a. The other files in that diff (the D4 note, the K2e pre-check, the picks note, the E3 review and the ticket) come from ticket-branch commits made by the main session and the architect, not from this section's builder. I ran `circuitdraw.test.ts` and `componentmodels.test.ts`: 8 passed, 8.8 s. Most of that time is the existing seed 1 case (4.3 s), which this branch does not touch.

1. **The pole end on a real insulator: met.** `insulatorEnd` in `circuitdraw.ts` places each pole once, keeps its `PoleTransform`, and picks the attachment of the drawn model (`poleFor`, which covers the feed pick) that has `ownInsulator` and is nearest the drop's wall point in plan, using `poleAttachModel` and `poleToWorld` (read only). It is clamped to no lower than `lowestAttach`. Spans and roof spans still use `endOf`, as before. The rewritten test "draws every pole on its poleModels model ..." checks that the drop starts on exactly one own-insulator seat, at or above the span end, and no longer ends at the bare wall point. It does not check that the seat is the *nearest* one. That is acceptable, but see Could improve 2.
2. **The wall fitting: partly met.**
   - **Bracket placement: met.** `SCENERY_MODELS` is in `componentmodels.ts`. Each drop gets one `role: "fitting"` piece, unscaled, with its back on the wall, facing out. Its base is `WALL_FITTING.up_m` (0.533) under 5.5 m, and the drop ends at the arm tip, `out_m` (0.342) from the wall. Both offsets are within 2 cm of D4's 0.53 and 0.34. The way it faces is `wallFacing`: the direction toward the pole, snapped to an axis. I checked whether that is always the building's front side. On 6 x 6 seed 1 (a direct `runCity` build, 250 drops), I compared it with the side in each drop id (`|-x|` etc.): all 250 agree.
   - **Fallbacks: met.** A null `wallFitting` key pushes no piece, and the drop ends at the wall point. A picked model that did not load becomes a placeholder through the generic path in `circuitGroup`. A wire key that did not load falls back to the polyline, per key.
   - **Drop wire key: met.** `CircuitWire.key` is new. Drops take `dropWire` when it is set; Josh's pick is null, so they stay on `POWER_LINE`.
   - **The building lamp: not met (Must fix 1).** The criterion says the lamp stands "`ON_POLE_GAP_M` below" the fitting. The code sets `base = d.y_m - ON_POLE_GAP_M - h`, so the lamp's top is 0.6 m under the *drop height* (4.90 m). The bracket's foot is at 4.967 m, so the gap is 0.067 m, not 0.6 m. The D4 shortlist Josh picked from says "0.6 m under the fitting's foot" and gives C's lamp as **3.65 to 4.37 m**. The branch draws it at 4.18 to 4.90 m. The new test asserts `lamp top = 5.5 - ON_POLE_GAP_M`, which is the implementation's own reading, not the criterion's.
3. **The tables equal the note: met.** The "equals docs/design/081-component-picks.md row for row" case now also parses the Scenery table. It checks the piece order against `CIRCUIT_SCENERY`, each key (`POWER_LINE` read as null) and Josh's words.
4. **Keys: met.** `circuitKeyUses()` adds `{ list: "fittings", key: city-pack:SM_Prop_Sign_Attachment_02 }`, and `"drops"` stays `POWER_LINE` only. The new case asserts both. The R12 case in `plan3d.test.ts` was not touched, and CI is green, so it did not need to change.
5. **Reported, not tuned: can't tell from the branch.** These figures belong in the builder's report: fittings meeting stage 7 escapes or face signs, the fitting's top against storey 2, and the roof span places within 1 m of a drop drawn insulator-to-bracket. Nothing in the branch carries them. The main session should check that the report has them, and that the roof-span list goes to P2a.
6. **Browser:** Josh's.

**The window frame the main session saw** at `drop:block:6:6/a|outer|-x|54,52`. The ticket says nothing about windows. Criterion 5 asks only for a count against stage 7 escapes and face signs, and for the fitting's top against storey 2. The height is Josh's: K2e's "Same height (Recommended)" puts every drop at 5.5 m, and the bracket's 4.97 to 5.64 m falls inside storey 2 (3.2 to 6.4 m), where windows are. So a bracket over a window frame follows from the ticket as written and is not a finding against this branch. I did not count how often it happens; it may be common, not checked. Whether brackets should keep clear of windows is a question for Josh, and fixing it would be a new rule (Could improve 1).

**Count.** The PR adds or rewrites 4 cases against main: 1 added and 1 rewritten in `circuitdraw.test.ts`; in `componentmodels.test.ts`, the row-for-row case rewritten plus the manifest case's loop extended to `SCENERY_MODELS`. The ticket expected 3. That is well under 15, and the fourth is a one-line extension that does real work, so it is not a test-policy break.

**Files.** Only `circuitdraw.ts`, `componentmodels.ts` and their tests, as listed. `cityview.ts`, `powerkit.ts`, `src/city/`, `src/core/` and `src/ui/` are untouched. No new dependency. Purity is not at stake, since `src/grid/` and `src/night/` are untouched.

## Rule conflicts and risks
- The lamp height does not match the criterion, or the D4 numbers Josh chose from (Must fix 1).
- The bracket at 5.5 m lands in storey 2's window band. The ticket does not cover this, and it follows from Josh's "Same height". It is flagged for Josh, not blocking.
- `wallFacing` takes the front side from the pole's direction, not from the drop's own side, which the layer has only inside the id. It holds for all 250 drops on seed 1. Once K2e's drops across the street land, they still point straight across, so this should keep holding, but nothing pins it.

## Must fix
1. **`src/render3d/circuitdraw.ts`, the `building` branch of component placement (`const base = fitKey === null ? ...`):** with a fitting, stand the building lamp with its top `ON_POLE_GAP_M` under the fitting's foot, i.e. `d.y_m - WALL_FITTING.up_m - ON_POLE_GAP_M - h` (lamp 3.65 to 4.37 m, as D4's row C). With no fitting, keep today's placement. In `circuitdraw.test.ts`, the new case's lamp assertion becomes `5.5 - WALL_FITTING.up_m - ON_POLE_GAP_M`. This rewrites a case the branch already adds, so the count does not change. Effect: the lamp sits a clear 0.6 m under the bracket, as criterion 2 and Josh's D4 sheet show, rather than 7 cm under its foot.

## Could improve
1. Put the bracket-over-window case to Josh, with a count on seed 1 if the main session wants one: how many fittings overlap a storey 2 window opening. If he wants brackets kept clear, that is a new rule, to be cut as its own section.
2. The criterion 1 test could also assert that the chosen seat is the nearest own insulator in plan, not just one of them. That is the clause that makes the drop leave the side of the pole facing the building.
3. Pin `wallFacing` to the drop's front side (for example, a fixture drop whose pole is offset more along the wall than out from it). Otherwise, note in the code that a far-offset pole would turn the bracket sideways.
