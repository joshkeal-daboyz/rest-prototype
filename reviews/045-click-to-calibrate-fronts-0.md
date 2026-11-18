ticket: 045-click-to-calibrate-fronts-0
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section 0 only: in `src/core/calibration.ts`, add `calibrationKey`, `parseCalibrationKey`, `validateCalibration`, `applyCalibrationPatch` and `emptyCalibration` beside the types already there, with Vitest tests in `src/core/calibration.test.ts`. This is the file-format contract that B writes and A and C read. The approval amendments drop the `notBuilding` mark.

## Does the branch do it?
Diff (`main...637f5e0`): `src/core/calibration.ts` and the new `src/core/calibration.test.ts`, nothing else. The `src/core/index.ts` export was already on main. I ran the 42 tests in `calibration.test.ts` on their own and they pass. `npm run typecheck` is clean. I did not re-run the full suite: the gate already ran it, and that keeps the load on this PC down.

- **AC 1, keys.** The test "builds pack:name and round-trips it" checks `calibrationKey("city-pack","SM_Bld_Shop_01")` gives `"city-pack:SM_Bld_Shop_01"` and that `parseCalibrationKey` round-trips it. The `it.each` "refuses %j" covers all six required refusals (`"SM_Bld_Shop_01"`, `":x"`, `"City:x"`, `"a:"`, `"a:b/c"`, `"a:b\\c"`), plus newline, NUL and DEL. The split at the first colon matches the design ("the rest after the first colon") and has its own test. **Met.**
- **AC 2, validator.** "accepts a valid file and an empty one" uses the ticket's example file plus an exclude-only entry. Each refusal has its own test, named after the rule:
  - another version (`/version 2/`);
  - a bad key, named in the error;
  - an empty entry (`a:b: ... neither front nor exclude`);
  - a front outside the four (5 bad values);
  - a bad `at` (6 values, including an impossible date and a bare date) and a bad `savedAt`;
  - unknown fields on the file and on an entry;
  - a non-object (null, number, string, array, undefined).

  Entry errors start with the key (`a:b: ...`). File-level errors (version, savedAt, unknown file field) name the field, since there is no key to name. That is the reasonable reading of "naming the key". The `notBuilding` field from before the amendment is refused as unknown, with its own test, which matches the approval trims. **Met.**
- **AC 3, apply.** One test per clause:
  - set on a null start, stamping `at` and `savedAt`: "sets a key on an empty start";
  - replace, keep the others, delete on null, `savedAt` = now: "replaces a key, keeps the others, and deletes on null";
  - keys sorted, checked again after a JSON round trip, so serialised order is covered: "writes keys sorted";
  - no mutation, of the file or the patch, through set and delete: "never mutates its inputs", using `structuredClone`;
  - always valid: "always returns a file validateCalibration accepts", over every valid patch shape.

  `applyCalibrationPatch` validates the patch first and throws on a bad patch or an invalid `now`, so it can't return an invalid file from a valid input. **Met.**
- **Purity.** `src/core/calibration.ts` has no imports at all: no DOM, no Node, no timers. `now` is passed in, not read from a clock. It would copy across unchanged.
- **Nothing else moves.** No file outside section 0's list changed. No dependency was added. `src/grid/` and `src/night/` are untouched. A grep of `src/`, `tools/` and `vite.config.ts` finds no reader of the removed `notBuilding` field.

## Rule conflicts and risks
- None found against the hard rules or GDD Decided rules. This is data for a dev tool and touches no game rule.
- Small extra scope beyond "no logic beyond these":
  - `validateCalibrationPatch` and `CalibrationPatchResult`, used by `applyCalibrationPatch` and meant for B's 400 response;
  - `CALIBRATION_FRONTS`.

  All three sit in the section's own file, are tested, and are what B will need. I am not counting them against the branch.
- `applyCalibrationPatch` validates the patch, not the incoming `file`. If it is given a file that is already invalid, it returns an invalid file. B's design validates after patching, so this is covered downstream, but it is worth knowing.

## Must fix
none

## Could improve
1. `src/core/calibration.ts`: the ticket's Interfaces section lists exactly five functions. Add a line to the ticket (the architect's job, at the next re-cut) recording `validateCalibrationPatch` and `CALIBRATION_FRONTS` as part of the contract. B and C would then rely on a named interface, not an unlisted export.
2. `src/core/calibration.test.ts`: the "always valid" guarantee is only tested from valid starting files. A one-line test showing what happens with an invalid `file` input would make that edge explicit: either it throws, or it is documented as the caller's job.
