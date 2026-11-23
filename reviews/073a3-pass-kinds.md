ticket: 073a3-pass-kinds
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A3 of ticket 073: in `src/core/cityera.ts` only, narrow `CityTechPieceKind` to D1's seven slot kinds, type `CityHoldoutPieceKind` for E2, and type the hold-out's three steps (`CITY_HOLDOUT_STEPS`, `CITY_HOLDOUT_STEP_OF`, `CityHoldoutStepCount`, `CityHoldoutLayer.steps?`, `CityHoldoutStepPart`), so D1 and E2 can code against named kinds. When C1 lands beside it, a one-line planner fix keeps `tsc` green.

## Does the branch do it?
I judged against `goal/city-transformations` (the branch's base). Against `main` the diff is the whole goal. The code diff touches two files: `src/core/cityera.ts` and `src/city/pipeline/resolve.ts`.

- **Criterion 1 (the types in `cityera.ts`, `cityplan.ts` not edited):** met. `CityTechPieceKind` is exactly `"bolt-on" | "camera" | "tall" | "overhang" | "sign" | "shopfront" | "pavement"`, with `CITY_TECH_PIECE_KINDS`. `CityHoldoutPieceKind` is exactly the nine kinds, with `CITY_HOLDOUT_PIECE_KINDS` and "container" documented as the only stores kind. `CITY_HOLDOUT_STEPS` is `["power", "settle", "barricade"] as const`, and `CityHoldoutStep` is derived from it. `CITY_HOLDOUT_STEP_OF` is a `Record<CityHoldoutPieceKind, CityHoldoutStep>`, every kind "settle" except "barricade", so `tsc` enforces that it covers every kind. `CityHoldoutStepCount` has `step`, `adds` and `changes`. `CityHoldoutLayer` is now an interface extending `CityEraLayer<"holdout", CityEraPiece<CityHoldoutPieceKind>>` with an optional `steps`, and its doc says why it is optional. `CityHoldoutStepPart` has `stage`, `step`, `adds` and `changes`. `CityTechLayer` narrows through its kind, and `CityRuinPieceKind` stays `string`. `cityplan.ts` and `index.ts` are untouched.
- **Criterion 2 (`tsc` passes; `src/city/pipeline/` tests pass unchanged):** met. `npx tsc --noEmit` exits 0 on the branch. `npx vitest run --maxWorkers=1 src/city/pipeline/ src/city/history/`: 11 files, 140 tests, all pass. The diff edits no test file. I ran only those two folders, as the load note asked; the main session's gate covered the rest.
- **Criterion 3 (C1 beside A3 type-checks):** met in effect, though by a different route than the ticket named. C1 merged with `erafixtures.ts` `add()` already returning `kind: "thing" as never` (line 48), so the fixture line the ticket expected is already in place. What still broke was the resolver. Its `addsOut` was typed `{ tech?: readonly CityEraPiece[]; ... }` with string kinds, which no longer fits `CityResolvedPlan["adds"]` once the kinds are narrowed. Commit c91b148 types `addsOut` as a mutable mapping of `CityResolvedPlan["adds"]` and casts at the one per-stage write. Nothing changes at runtime, and `resolve.test.ts` (44 tests) passes unchanged. The checkbox in the ticket is still unticked, and the text still names `erafixtures.ts` (see Could improve 1).

## Rule conflicts and risks
- **Files:** `src/city/pipeline/resolve.ts` is outside A3's listed files (`cityera.ts` and the ticket). Criterion 3 explicitly gives a planner's follow-up fix to the C1 code, and this two-line typing fix is that follow-up, placed in a different file of C1's folder. It changes no behaviour, so I do not count it as a hard-rule break. It is a mismatch between the ticket text and what was done.
- **Purity:** neither `src/grid/` nor `src/night/` is touched. The `cityera.ts` additions are types and frozen-shape constants only: no DOM, no timers, no imports. Other `src/core/` files already export constants (`calibration.ts`, `cityplan.ts` and others).
- **GDD Decided rules:** none touched. This is pipeline typing only.
- **Dependencies:** none added.
- **Type looseness in the resolver:** the cast `(addsOut as Record<CityPassStage, readonly CityEraPiece[]>)[stage] = ...` stops `tsc` from checking that the tech slot receives tech-kind pieces. That holds today only because `kept` comes from that stage's own layer. The ticket's stated reason for narrowing ("the check that a pass writes only its own kinds") is enforced at the pass's layer type, not inside the resolver, so this is acceptable.
- **The 3D game:** `src/grid/` and `src/night/` are unaffected.

## Must fix
none

## Could improve
1. `tickets/073-city-transformations.md`, A3 criterion 3 and "Questions for Josh", A3's point: record that the fixture already carried `as never` when C1 merged, and that the fix that actually landed is the two-line `addsOut` typing in `src/city/pipeline/resolve.ts` (c91b148). Then tick the criterion, so D1, E2 and later readers don't go looking for an `erafixtures.ts` change. (This is the architect's file, not the builder's.)
2. `src/core/cityera.ts`: `CITY_TECH_PIECE_KINDS` and `CITY_HOLDOUT_PIECE_KINDS` are typed `readonly Kind[]`. That catches a stray string but not a missing kind. Declare each as `[...] as const satisfies readonly Kind[]` and derive the union from it, as `CITY_HOLDOUT_STEPS` does. The list and the union then cannot drift when D2 widens the tech kinds. Alternatively, have E2's or D1's layer test assert that the list covers the union.
3. `src/city/pipeline/resolve.ts`: the per-slot cast could be replaced by a small typed setter, e.g. `function setAdds<S extends CityPassStage>(o, s: S, v: CityResolvedPlan["adds"][S])`. The cast would then be confined to one place and not widen the whole object. This is optional, since the behaviour is the same.
4. `CityHoldoutStepPart` and `steps` have no shared helper that cuts a part out of a layer by its counts. E2 will write one. Consider a small pure `holdoutStepParts(layer)` in `src/city/pipeline/` in a later ticket, so E1 and E2 cut parts the same way. This is not A3's scope; noted for the architect.
