ticket: 081d3-component-picks
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section D3: a new `src/render3d/componentmodels.ts` exporting `COMPONENT_MODELS: Record<CircuitComponent, CircuitComponentPick>`, copied from Josh's picks in `docs/design/081-component-picks.md`. It needs two tests: one pins the table to the note row for row, and one checks every non-null key against the converted manifest. The manifest is read only when the case runs, the case skips when the manifest is absent, and a pack that has not been converted is skipped and named.

## Does the branch do it?
Against origin/main, the diff touches only `src/render3d/componentmodels.ts` and `src/render3d/componentmodels.test.ts`. Those are exactly the files the ticket lists.

- **Criterion 1, the table equals the note row for row (1 case).** The test `equals docs/design/081-component-picks.md row for row` parses the note's table rows. It checks that the component order equals `CIRCUIT_COMPONENTS` and that the table's keys come in the same order. Then it compares component, key and words for every row. I also checked all twelve rows by hand against the note, and they match, including the shared `SM_Prop_WallAttach_Electronics_03` for spring and junction. This test would fail if a key or a word drifted, or if a row went missing. Met.
- **Criterion 2, every non-null key is in the converted manifest, read lazily, skipped when absent (1 case).** The case uses `it.skipIf(!existsSync(PATH))` and reads the manifest inside its body. It skips null keys. A pack missing from the manifest goes into `skipped` and is named in a `console.info` line, as the ticket's Load note asks. A name missing from a pack that is converted fails the case. Locally all three packs (palm-city-pack, sci-fi-city-pack, sci-fi-frontier-pack) are in `assets/private/out/manifest.json`, so the case really ran and passed. On Linux CI there are no assets and it skips. Met.

Test run: `npx vitest run --maxWorkers=2 src/render3d/componentmodels.test.ts` gave 2 passed in 27 ms.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, and no GDD rule touched.
- Test policy: 2 new cases, which matches the ticket's count. Neither is report-only: the `console.info` sits next to a real assertion. Both are fast and use no city.
- The 3D game can take `src/grid/` and `src/night/` as they are, because neither is touched. The new file imports only types from `src/core/`.

## Must fix
none

## Could improve
1. `componentmodels.test.ts`: the row-for-row case compares component, key and words but not `date`. The note gives the date only in its prose ("23 Nov 2026"), so the hard-coded `DATE = "2026-11-23"` is not pinned. If the note ever grows a date column, add it to the comparison.
2. `componentmodels.test.ts`: the row regex needs a backticked key, so a future unpicked row (null key, written as a dash or similar) would not match. The case would then fail on the component list rather than on a null key. This is fine while all twelve are picked. Worth handling if a pick is ever withdrawn.
3. The extra `spring.key === junction.key` assertion repeats what the row comparison already proves. It is harmless and could go.
