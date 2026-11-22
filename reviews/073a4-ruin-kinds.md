ticket: 073a4-ruin-kinds
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A4 of ticket 073 is a change to types only, in `src/core/cityera.ts`. It narrows `CityRuinPieceKind` to F1's seven growth kinds and adds `CITY_RUIN_PIECE_KINDS`. It types the ruin's two steps ("growth", then "remnants") with `CITY_RUIN_STEP_OF`, `CityRuinStepCount`, an optional `CityRuinLayer.steps` and `CityRuinStepPart`, in the same shape as the hold-out's steps. It also rewords the comment on `CityEraPiece.cell` to the host-cell reading. `cityplan.ts` and `index.ts` stay as they are.

## Does the branch do it?
I reviewed the branch's one commit, 0cc097c, against its parent (the merge of the 073 re-cut on `goal/city-transformations`). `main...` takes in the whole goal branch, so it is the wrong base for this section.

- **Criterion 1 (types and comment in `cityera.ts`; `cityplan.ts` not edited): met.**
  - The seven kinds match the ticket's list exactly: patch, clump, sapling, park-tree, roof, vine, tree-vine. They are in `CITY_RUIN_PIECE_KINDS`, `as const`, and `CityRuinPieceKind` is derived from that array.
  - `CITY_RUIN_STEPS = ["growth", "remnants"] as const` and `CityRuinStep` are there.
  - `CITY_RUIN_STEP_OF` is a `Record<CityRuinPieceKind, CityRuinStep>` with every kind set to "growth". Because it is a `Record`, the compiler forces it to list every kind, so F2's widening will fail to compile until F2's kinds are entered.
  - `CityRuinStepCount` has `step`, `adds` and `changes`.
  - `CityRuinLayer` is now an interface that extends `CityEraLayer<"ruin", CityEraPiece<CityRuinPieceKind>>` with an optional `steps`.
  - `CityRuinStepPart` has `stage: "ruin"`, `step`, `adds` and `changes`.
  - The `cell` comment matches the ticket's wording (ground or roof: the cell the pivot stands in; on a wall: the host, the built cell whose face it is on). The file's head comment is updated.
  - `git diff HEAD~1 -- src/core/cityplan.ts src/core/index.ts` is empty.
- **Criterion 2 (`tsc --noEmit` passes; `src/city/pipeline/` passes unchanged): met.**
  - I ran `npx tsc --noEmit` on the branch: exit 0.
  - I ran `npx vitest run --maxWorkers=1 src/city/pipeline/`: 9 files, 122 tests pass.
  - The existing users of a ruin layer (`eras.test.ts`, `resolve.test.ts`) build it with `adds: []` only, so the narrowed kind breaks none of them.
- **Tests.** This section adds types and no logic, and the ticket asks for no new tests. The completeness of `CITY_RUIN_STEP_OF` is checked at compile time, so there is no unit test whose absence would be a gap.

## Rule conflicts and risks
- None found.
  - `src/grid/` and `src/night/` are not touched.
  - The only files changed are `src/core/cityera.ts` and the ticket, which are this section's listed files.
  - No dependency is added, and no GDD Decided rule is changed.
  - The new types import nothing new and nothing from the DOM.
- A risk to note, not a blocker: when F2 widens the kinds, `CITY_RUIN_STEP_OF` must gain F2's kinds in the same commit. The `Record` type enforces this, so it is safe.

## Must fix
none

## Could improve
1. The kinds list is declared in a different style from its siblings. `CITY_RUIN_PIECE_KINDS` is an `as const` array with the type derived from it. `CITY_TECH_PIECE_KINDS` and `CITY_HOLDOUT_PIECE_KINDS` are a union type plus a `readonly X[]` array, which the compiler does not check for completeness. The ruin's style is the safer of the two, because the list and the type cannot drift apart. One style across the three would read better; aligning the other two would be a later architect change, not this branch's.
