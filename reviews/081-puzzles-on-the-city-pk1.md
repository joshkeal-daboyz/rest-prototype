ticket: 081-puzzles-on-the-city (section PK1)
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move the ground poles' mix (`GROUND_POLE_MIX`, three keys in `POWER_MIX`'s order) and their attachment heights (`GROUND_POLE_ATTACH_UP_M`) into a new `src/core/powerpoles.ts` as typed data with no logic, values unchanged from `src/render3d/powerkit.ts`, and add `poleModels: Readonly<Record<string, string>>` to `CityCircuitLayer`. No test (PK2 holds the pin).

## Does the branch do it?
I reviewed commit b126f0e, the only PK1 commit. The commits below it on the branch are the 081 cut and its re-cuts (tickets, `src/core/citycircuit.ts`, `.claude/agents/grid-simulator.md`). They are not on `main` yet and are not PK1's work.

- **The table is typed.** `src/core/powerpoles.ts` has `GROUND_POLE_MIX` (`as const`), `GroundPoleKey`, and `GROUND_POLE_ATTACH_UP_M: Readonly<Record<GroundPoleKey, readonly [number, number, number]>>`. I checked every value against `src/render3d/powerkit.ts` on the branch:
  - The mix order matches lines 136 to 140.
  - Apocalypse is 5.862 x3 (lines 85 to 87).
  - Palm `_01` is 8.53, 8.548, 8.548 (lines 98 to 100).
  - Palm `_02` is 8.47, 8.407, 8.731 (lines 112 to 114).
  
  The line numbers the file cites are correct. There is no logic in the file, only constants and a type.
- **The layer field is typed.** `src/core/cityplan.ts` `CityCircuitLayer.poleModels` has the type the ticket names. Nothing builds a `CityCircuitLayer` yet (grep finds no other use), so the new required field breaks nothing, and `tsc --noEmit` passes.
- **Exported.** `src/core/index.ts` re-exports `./powerpoles`.
- **No test.** The criterion asks for none, and the branch adds none (0 `it(`/`test(` in the diff).

Gate: `tsc --noEmit` passes. `vitest run --changed origin/main` passed 184 files and 3793 tests in 427 s. The run is wide because `src/core/index.ts` is imported nearly everywhere; that is expected and not the branch's fault.

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are untouched. No dependency is added. The PK1 commit touches only the three files the ticket lists. No GDD Decided rule changes.
- 3D game: `powerpoles.ts` is pure data in core, imports nothing, and can be copied over as it is.
- `origin/main` has moved on since this branch's base (ticket 080 B2c: docs and two `src/render3d` tests). `git merge-tree` merges it cleanly with this branch.
- The ticket names the branch `ticket/081pk1-pole-table`, but the branch is `ticket/081pk1-pole-mix-core`. This is cosmetic.

## Must fix
none

## Could improve
1. `src/core/powerpoles.ts`'s comments cite `powerkit.ts` "at 609e573", while the ticket says "at a2f819e". `powerkit.ts` is the same file at both commits on this branch, so the values hold. Naming one commit in both places would save PK2's builder a moment.
2. `poleModels` is typed `Record<string, string>` as the ticket says. The doc comment allows a key outside the mix for a pole a component replaces, which is why it isn't `GroundPoleKey`. That is fine. K2d could add a check that every value is in the mix or is a named component pick.
