ticket: 070l2b-edge-oracles
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
`src/city/edge/constants.test.ts` stops importing `src/render3d/tilecity.ts`. Each old constant becomes a typed number, with its value and its source line at b42b65f, and every assertion stays as it was (LR: no check loosens). A new `src/city/edge/oldpath.test.ts` greps the folder so that no file imports an old-path module.

## Does the branch do it?
- **Criterion 1 (`constants.test.ts`).** The import block from `../../render3d/tilecity` is replaced by 19 typed `const OLD_*` values. The diff touches only the header, so every `expect` is unchanged: same constants, same `toBe` and `toEqual`, and P1's exception still asserts `{ lo: 0.69, hi: 1.5 }` on the pipeline against `OLD_BAND.lo === 0.75`. I checked each value and line number against `git show b42b65f:src/render3d/tilecity.ts`. Lines 112, 114, 116, 118, 164, 171, 173, 174, 176, 177, 182, 184, 241, 242 and 249 to 252 all hold the named constant with the typed value. `OLD_SHARE` and `OLD_BAND` drop `as const`, but the assertions are `toEqual` and `.hi`/`.lo` reads, so nothing gets weaker. One gap: `OLD_TILE_M`'s source comment is wrong (Must fix 1). It says "src/core/cityplan.ts line 7". At b42b65f that line is ` *`, a comment line, and `cityplan.ts` has no `TILE_M`. `tilecity.ts` imported `TILE_M` at line 66 inside the `import { ... } from "../city/streets"` block (lines 50 to 73), and the constant is defined at `src/city/streets/constants.ts` line 7 (`export const TILE_M = 5;`). The value 5 is right and the "imported at its line 66" part is right. Only the source file is wrong.
- **Criterion 2 (grep).** `src/city/edge/oldpath.test.ts` handles `from`, `export * from`, bare `import "..."` and dynamic `import()`. It flags only specifiers containing `render3d/` whose basename is an old-path module, so edge's own `./kerbline` is correctly ignored. Its first `it` proves the grep catches a fixture import of each module, a re-export and a dynamic import, and ignores `./kerbline`. Its second `it` reads every `.ts` in the folder. Edge has no subfolders, so the non-recursive `readdirSync` covers it all. The list also names `tileintegrate`, `tileinterior` and `alleys`, which is stricter than the ticket's six and harmless. `grep -rn render3d src/city/edge` now finds only doc comments and the grep test itself, which builds its fixture path at run time.
- **Criterion 3.** `npx vitest run --maxWorkers=2 src/city/edge/`: 5 files, 487 passed. `npx tsc --noEmit`: clean. No digest pin is touched, since the diff is limited to these two test files.

## Rule conflicts and risks
- Files: only `src/city/edge/constants.test.ts` and the new `src/city/edge/oldpath.test.ts`, both inside the ticket's list. No non-test file, no new dependency, no Decided rule or number moved.
- The grep test uses `node:fs` and `node:url`. It is a test file, not shipped edge code, and it reads relative to `import.meta.url`, so it works on Linux CI with no Windows path.
- A barrel import (`../../render3d`) would get past the grep. `src/render3d/index.ts` re-exports none of the old-path modules today, so this is not a live hole.

## Must fix
1. `src/city/edge/constants.test.ts`, the `OLD_TILE_M` line: correct the source comment. For example: `// src/city/streets/constants.ts line 7 at b42b65f; tilecity.ts imported it from ../city/streets at its line 66`. After that, every typed number cites a true source line at b42b65f, as criterion 1 and LR require.

## Could improve
1. `oldpath.test.ts`: also flag a bare `render3d` barrel specifier (`/render3d["']?$/` or `/render3d$/`), so a later re-export from `src/render3d/index.ts` couldn't get round the grep.
2. `oldpath.test.ts` exports `importSpecs` and `oldPathImports` from a test file. If L2a writes the same helpers in `src/city/pipeline/oldpath.test.ts`, that is two copies. Leave it unless a later section wants a shared test helper (it would need a ticket, since the two folders have different owners).
