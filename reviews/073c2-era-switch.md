ticket: 073c2-era-switch
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C2 of ticket 073 asks for an `era` value in the 3D plan view's address (`clean`, `tech`, `holdout`, `ruin`; anything unknown means `clean`). Above `clean`, the view draws `resolvePlan(plan, era)` instead of the raw layers. A switch on the page steps through the four eras without moving the camera, `clean` draws exactly what it drew before, and no draw-call cap goes up.

## Does the branch do it?
- **Criterion 1 (era read, unknown means clean, clean unchanged): met.**
  - `planview.ts` `eraRequested` matches a `CITY_ERAS` name in any case and otherwise gives "clean". `planViewRequested` and `planAssembleRequested` (and so `tilesPlanRequested`) both carry `era`.
  - Tested in `eraview.test.ts` "the era in the address": absent, mixed case, `stone`, `3`, `history` and empty all give "clean". `nextEra` cycles round.
  - Clean draws the same as before. `planAtEra(clean, "clean", null)` returns the clean plan object itself, and the renderer test shows a clean request never calls the era runner (X-7).
  - The existing tests are not quite "untouched". Three `toEqual` shape checks gained `era: "clean"` (`plan3d.test.ts` lines 168 and 1936, `planview.test.ts` line 15). That is unavoidable once the request type carries the field. No pin, digest or draw assertion changed.
  - I ran `plan3d.test.ts` once at one worker: 79/79 pass.
- **Criterion 2 (the draw reads the resolved plan): met.**
  - `planAtEra` reads `resolvePlan(eraRun.plan, era).plan` for any era above clean. The renderer draws only what `atEra` returns.
  - Tests:
    - "with no pass built, every era above clean draws the clean city" (deep-equal on tech, holdout and ruin).
    - "a change in a pass's layer shows only through the resolver" (a hand-made `tech` remove drops one piece from the drawn list).
    - A failed era run and a missing reference each give no plan and a reason.
  - These are real rule tests, not output echoes.
- **Criterion 3 (the switch steps four eras, camera still): code present; checking it in the browser is the main session's job.**
  - The button (`data-era-switch`) calls `setEra`. That rewrites `era` in the URL with `replaceState`, swaps `plan` and rebuilds with the last loaded models.
  - The rig, the street camera and the light are built once and never touched by `setEra`, so the camera should not move.
  - No Vitest checks the camera after a switch (see Could improve).
- **Criterion 4 (no draw-call cap rises): met.** The diff touches no cap constant. The stage 9 shared-cap test in `plan3d.test.ts` passes.
- **Tests I ran on the branch:** `eraview.test.ts` and `planview.test.ts` (45/45) and `plan3d.test.ts` (79/79), all at `--maxWorkers=1`. I did not run the whole suite or the typecheck again (the main session's gate ran both; the one `powerkit` failure is also on the base).

## Rule conflicts and risks
- No pure folder is touched. Every change is in `src/render3d/`, inside the files the ticket lists, plus the new test file `eraview.test.ts` (a test of those files). No new dependency. No Decided rule changed.
- **Extra scope:** `stage=history` in `planview.ts` (`historyShown`), labelled "B criterion 7, moved to C2". C2's criteria don't ask for it. It is within C2's files, it is what C2's "Waits for ... B (so `history` has a picture)" points at, and B's own files could not have held it. It is harmless, but the ticket does not record the move.
- If the era first asked for fails, the frame and ground are never set up (they are gated on `stopText === null`). A later switch to `clean` would then draw without them, on a camera framed to the 1 x 1 default. No pass is built yet, so no era can fail today.
- If a switch to an era that fails comes after a successful draw, the previous era's pieces stay in the scene under the failure note.

## Must fix
none

## Could improve
1. `plan3d.ts`, the default `eraRun`: `runCityEra(...)` runs every clean stage again for each era. It could run only the era stages on top of `cleanPlan` (`runEraStages`, if exported), so the first tap on the switch is cheaper and is sure to sit on the same clean plan that is drawn.
2. `plan3d.ts`, `setEra`: on a failed era, remove the drawn group (or say on the note that the pieces shown are from the last era). On a later success, set up the frame and ground if the first era failed.
3. `eraview.test.ts`: add a renderer test that clicks the switch (or calls through a test hook) and checks that the camera's position and quaternion are unchanged and the era label moves on. That would make criterion 3's camera half a Vitest check, not only a screenshot.
4. Record in ticket 073 (the architect's file) that B's criterion 7 view was built in C2, so the `stage=history` code is not read as unasked scope later.
