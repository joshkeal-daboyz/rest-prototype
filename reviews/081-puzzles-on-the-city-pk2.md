ticket: 081-puzzles-on-the-city (section PK2)
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`src/render3d/powerkit.ts` stops holding its own copy of the ground-pole mix and the attachment heights. `POWER_MIX` becomes `GROUND_POLE_MIX`, and `POWER_POLES`' `up` values come from `GROUND_POLE_ATTACH_UP_M` in `src/core/powerpoles.ts` (PK1). One pin case holds the two equal, and Josh should see no change.

## Does the branch do it?
I reviewed against `origin/main` (cab9681; local `main` is stale at 3823f0d). PK2's own change is one commit, 78680a1, touching only `src/render3d/powerkit.ts` and `powerkit.test.ts`. The other differences in `git diff origin/main...HEAD` (`src/core/citycircuit.ts` doc comments, the ticket file) come from the goal branch `ticket/081-puzzles-on-the-city` and are not PK2's.

- **AC1, the pin. Met.** `powerkit.test.ts`, the "the kit reads the ground poles from core (081 PK2)" case: `[...POWER_MIX]` equals `[...GROUND_POLE_MIX]`, and for each key `POWER_POLES[key].attach_m.map(a => a.up)` equals `GROUND_POLE_ATTACH_UP_M[key]`. Because `powerkit.ts` now reads the heights by index (`GROUND_POLE_ATTACH_UP_M[GROUND_POLE_MIX[n]][i]`) while the test looks them up by key, the case still catches a re-ordered mix or a re-typed literal. It is not a pure self-comparison. I checked the core values against `powerkit.ts` at a2f819e (lines 85-87, 98-100, 112-114). All nine match, in the documented order (centre, lower `across`, higher `across`).
- **AC2, the same pick. Correctly deferred.** K2d is not in: `src/city/circuit/stage.ts` on `origin/main` writes `poleModels: {}` and there is no pick in `src/city/`. Under the ticket's wording, the case therefore falls to K2d's builder.
- **AC3, existing cases pass. Met in substance.** One existing case was edited: the purity case's expected import list gains `"../core/powerpoles"`. The goal (read from core) makes that edit unavoidable, and the case's other checks (`stableHash` only from `../render/city`, `Vec3` only from `./layout`, no three/DOM) are unchanged. No other existing case was touched.
- **Gate.** `tsc --noEmit` is clean. The branch differs from `origin/main` in `src/core/` (goal-branch content), so the "changed" set reaches the whole suite (184 files, 3794 tests). Under `npm run gate`, 5 cases failed on 5 s timeouts (`townpin.test.ts` "lays out every map…", `tileintegrate.test.ts:339`, and others hidden by output truncation). None of them touches powerkit. I re-ran the same set at 2 workers and all 184 files and 3794 tests passed (336 s). I read the failures as machine load, not the branch.
- **Goal bullet 3** (K3 draws `poleModels`) is K3's work and outside PK2's files. Rightly not done here.

## Rule conflicts and risks
- None against the hard rules. `src/grid/` and `src/night/` are untouched. `src/render3d` importing `src/core` is allowed, there is no new dependency and no GDD rule changes. The files are within PK2's list.
- Test count: 1 new case, 1 existing case edited (2 against the 15 cap). It is a fixture-free constant check and fast.
- The branch is named `ticket/081pk2-powerkit-reads-core`, but the ticket says `ticket/081pk2-powerkit-core`. This is cosmetic.

## Must fix
none

## Could improve
1. `src/render3d/powerkit.test.ts`: the purity case's title still says "imports only ./layout and stableHash from ../render/city". Rename it to include `../core/powerpoles`, and assert that import's `what` is `{ GROUND_POLE_ATTACH_UP_M, GROUND_POLE_MIX }`, so the kit can't quietly pull more from core.
2. `src/render3d/powerkit.ts` header (line 4) still says "the only imports are the pure layout types and `stableHash`". Add core's pole table.
3. `src/render3d/powerkit.ts`: `surface_m` beside each `up` is still a typed literal equal to the old `up` (except Apocalypse's centre, 5.7). If core's heights ever change, `surface_m` will drift silently. A one-line comment saying so would help K2d's builder.
4. Main session: with the goal branch's `src/core/` changes not yet on `main`, every `081*` section's `npm run gate` runs the full suite, and it times out at default workers on this machine. Worth knowing before the next gate.
