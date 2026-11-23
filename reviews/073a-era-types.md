ticket: 073a-era-types
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A of ticket 073 asks for types only: eras, era stages, the history layer, piece references, states and changes, the era layers and plan, and the resolver's contract. They go in a new `src/core/cityera.ts`, exported from `src/core/index.ts`, with `cityplan.ts` left alone and no circuit type named. A2 (the circuit references) is to be written into the ticket.

## Does the branch do it?
Diffed against `goal/city-transformations`, the branch's base under the re-cut. It touches three files: `src/core/cityera.ts` (new, 254 lines), `src/core/index.ts` (one line, `export * from "./cityera"`) and the ticket.

1. **The types, in `cityera.ts`, exported; `cityplan.ts` not edited.** Met. `git diff goal/city-transformations...HEAD -- src/core/cityplan.ts` is empty, so `CITY_STAGES` and `CityLayers` are as they were. Every name the ticket lists is present:
   - `CITY_ERAS`, `CityEra`, `CITY_ERA_STAGES`, `CityEraStage`, `CityPassStage`, `CityLayerStage`, `CITY_ERA_LAST` (clean maps to `traffic`, each other era to its own stage).
   - `CityDistrict` (the id is the first block in `streets.blocks` order, as the re-cut says), `CityHistoryLayer`.
   - `CITY_PIECE_LISTS` with the ten lists the ticket names, `CityPieceList`, `CITY_KEYLESS_PIECE_LISTS` (the two edge lists, checked with `satisfies`), `CityPieceListItem`, and `CityPieceRef` in its three forms (by id; by list, index and key; by column, index and key for `buildings.pieces`).
   - `CityPieceState`, `CITY_PIECE_STATES`, and `CityChange` (remove, swap, state).
   - `CityEraPiece<K>`, `CityEraLayer<S, P>`, the three pass layers with their kind as `string` for now, `CityEraLayers`, `CityEraPlan`, `CityEraStageFailure`, `CityEraRun`, `CityEraPicture`.
   - `CityResolve`, `CityResolvedPlan`, `CityResolvedState`, `CityResolveFailure`, `CityResolveFailureKind`.

   The contract is in the doc comments (lines 203 to 214), item for item with the ticket: purity, `clean` resolving to the plan itself, remove, swap and state semantics, references read as their stages wrote them, no cascade, the five failure kinds, and later eras changing earlier adds by id. I checked `cityplan.ts`: every list item type the file imports carries `placement: CityPlacement` with `key`, except `CityGroundCell` and `CityBuildoutTree`. Those two are exactly the keyless lists, so the key guard matches the data.
2. **`npx tsc --noEmit` passes, and the pipeline and planview tests pass unchanged.** Met. `npm run typecheck` is clean. `npx vitest run --maxWorkers=2 src/city/pipeline/ src/render3d/planview.test.ts`: 6 files, 66 tests passed. No test file is touched, so no literal moved. The full suite (`npx vitest run --maxWorkers=2`) gives 4391 passed and 1 failed: `src/render3d/powerkit.test.ts` > fitLine > "every ladder span, at LADDER_LINE_SCALE, is one piece stretched 0.29x to 0.88x and never chains" (expected 0.2481 to be >= 0.25, line 375). The same test fails in the same way on the branch's base, 45baf20 (run in the detached worktree `D:/rest-prototype-073gate`). This branch changes no runtime code, and the test is outside its files and its criteria, so I do not hold it against A (see the risks).
3. **No circuit type referenced; A2 written into the ticket.** Met. The only imports are from `./calibration` and `./cityplan`, and none of them is a circuit type. Where the circuit comes up, the file only says in comments that it is A2's. The ticket has a full A2 section with its waits, contents and criteria, and the plant place moved to A2 is reflected in the Q6 and K1 section and in E1g.

No tests were promised or added. That is right for a types-only section: the resolver's behaviour is C1's to test.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. There is no DOM, no timer and no new dependency.
- Files stay inside the ticket's list (`cityera.ts`, `index.ts`, the ticket). `src/core/` is the architect's.
- No GDD Decided rule is changed. The ticket edits are re-cut notes, each marked "taken under the goal; Josh may reverse". X-11 quotes Josh's words as relayed by the Fable session and says the wording is the re-cut's. That is honest about where it came from.
- **The base is not green.** The fitLine ladder-span test in `src/render3d/powerkit.test.ts` fails on 45baf20 as well as on this branch (0.2481 against a floor of 0.25). If the main session's gate reported this branch green, it ran on something else. The test belongs to the renderer and needs its own fix on `goal/city-transformations`. Otherwise every later 073 section's gate will fail on it.
- `export *` from `index.ts` could clash with names in other core files. `tsc` passing shows there is no clash today.
- The ticket's own must-not-touch list for sections includes `src/core/` and `tickets/`. That list is for the builder sections, not for A, whose owner is the architect and whose Files line names these files. Not a conflict.

## Must fix
none

## Could improve
1. `src/core/cityera.ts`, `CityPieceRef`: the list-and-index form allows `key: CalibrationKey | null` on any list. Splitting it, so that `null` goes only with the two keyless lists and a key is required on the rest, would let the compiler catch a wrong guard instead of leaving it to C1's `key` failure at run time.
2. `src/core/cityera.ts`, `CityResolvedPlan.plan`: above `clean`, the clean layers have removes and swaps applied, but `plan.digests` would still be the clean digests. One line in the doc comment saying what `digests` means in a resolved plan above `clean` (kept as the clean ones, or not to be read) would stop C1 and C2 guessing.
3. `src/core/cityera.ts`, `CityResolvedState.target`: it reuses `CityPieceRef`, but its index means the place after removals, while a change's ref means the place before them. It works as documented. A separate alias such as `CityResolvedRef` would keep a drawing from passing one where the other is expected.
4. `CITY_PIECE_STATES` is typed `readonly CityPieceState[]`, not derived `as const` like the other lists. The type and the array could drift apart. A `satisfies` check, or deriving the type from the array, would keep them in step.
