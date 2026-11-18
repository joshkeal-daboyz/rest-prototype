ticket: 045-click-to-calibrate-fronts-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B: a Node store (`tools/calibration/store.ts`) that reads and atomically patches `assets/private/calibration/fronts.json`, and a dev-only Vite plugin (`apply: "serve"`, `configureServer` only) serving GET/POST on `CALIBRATION_ENDPOINT` from loopback only, with 64 KB / content-type limits. `vite.config.ts` gains only the plugin line, its import and the watch ignore. Reviewed: commit `c107866` against its parent.

## Does the branch do it?
- **Store.** `store.test.ts` uses `mkdtempSync(join(tmpdir(), "rest-cal-"))`, with paths built by `join` and no drive letters or backslashes. "the first patch creates the missing folder and the file" checks the folder is absent first. "a second patch keeps the first key". "a null patch deletes a key and leaves the others". Each test calls `validOnDisk()` (`validateCalibration`) and `leftovers()` (no `.tmp`). Met.
- **Atomic.**
  - "a failing rename leaves the old file untouched..." fakes `renameSync` with `EIO`. It checks the old file is byte-identical and still valid, and that the temp file is removed.
  - "fails once with EPERM succeeds on the retry" counts 2 calls.
  - A third test checks that EBUSY gives up after `RENAME_ATTEMPTS`.
  - "Returned, not thrown past the handler": the store throws, and `handleCalibrationRequest` catches it in a try around the whole body and returns 500. The plugin test "a store failure becomes a 500 with errors, not a throw" covers this.
  - The write is temp file in the same folder, then `renameSync`, as designed. Met.
- **Handler** (`plugin.test.ts`, pure calls of `handleCalibrationRequest`):
  - GET with no file gives `emptyCalibration`; GET with a file gives the file.
  - POST of a valid patch gives 200 and equals the file on disk.
  - Five malformed bodies (bad JSON, bad key, bad front, missing entry, array) give 400 with errors, and the file is byte-identical afterwards.
  - Over 64 KB gives 413; a wrong or missing content type gives 415; PUT, DELETE, PATCH and undefined give 405.
  - Non-loopback addresses (including `::ffff:192.168.1.20`, empty and undefined) give 403 for GET and POST alike. `127.0.0.1`, `::1` and `::ffff:127.0.0.1` give 200.
  - The loopback check is the first thing the handler does, so a LAN caller never reaches the file. Met.
  - The middleware tests also run the real `configureServer` hook over a fake server with a `Readable` request: the path match (`?x=1` hits, `/extra` passes on), a 413 via the streaming body cap, and 403 from `socket.remoteAddress`. Good coverage of the glue.
- **Dev only.** "applies only when serving..." asserts `apply === "serve"`, a `configureServer` function, and no `configurePreviewServer`, `transform`, `load` or five other bundle hooks. `plugin.ts` matches: one object with `name`, `apply`, `configureServer`. Met.
- **Config (checked by diff, as asked).** `git diff main -- vite.config.ts` has exactly three changes:
  - the `import { calibrationPlugin } from "./tools/calibration/plugin";` line;
  - `plugins: [calibrationPlugin()]`;
  - `server: { watch: { ignored: ["**/assets/private/**"] } }`.

  There are two comment lines and nothing else: `base`, `test` and every other field are untouched. Met.
- **Path safety.** `calibrationFilePath(root)` is the only path builder: `CALIBRATION_FILE` under the plugin's root. The request body is only parsed as a patch, validated by section 0's `validateCalibrationPatch`. A test pins the path. Met.
- **Files touched.** Only the five listed: `tools/calibration/{store,plugin}.ts`, their tests, and `vite.config.ts`. Nothing in `src/` is touched; section 0 already provided `validateCalibrationPatch`. There is no new dependency (`node:fs`, `node:path`, `node:http`/`node:stream` types, and Vite's `Plugin` type).
- **CI-safe.** Every file operation is in a per-test temp dir, removed in `afterEach`. There are no timers: the retry `sleep` is injected as a no-op in tests, and no test reads `assets/private/`.
- **Josh checks (curl).** This is for the main session or Josh. I did not run a server.

## Rule conflicts and risks
- No hard-rule break: `src/grid/` and `src/night/` are untouched, and no locked puzzle or GDD rule is affected.
- The builder's flag on a corrupt `fronts.json`: `readCalibration` throws `CalibrationFileError`, and GET and POST both answer 500 and leave the file alone (tested: "an unusable saved file is a 500 and is left alone"). The ticket is silent here. Refusing to overwrite Josh's marks is the right call. The extra 500 status is the natural "server error" case, not extra scope. Section C's failure path (`not saved: <reason>`) already treats any non-2xx as a failure, so it shows this reason.
- `defaultSleep` uses `Atomics.wait`, which blocks the dev server's event loop for up to 4 × 25 ms on a held file. That is acceptable for a dev tool. Tests inject a no-op.
- When a body is over the limit, `readBody` stops collecting and the reply is sent without draining the rest of the request. Node handles this by closing the connection or discarding the remainder. Harmless for a dev tool.
- Only the exact strings `127.0.0.1`, `::1` and `::ffff:127.0.0.1` count as loopback, so other `127.x` addresses get 403. That is conservative and matches the ticket.

## Must fix
none

## Could improve
1. `tools/calibration/plugin.ts`, `readBody`: after `finish()` on an oversize body, call `req.resume()`. That discards the rest of the stream explicitly instead of relying on Node's default. Optional.
2. `tools/calibration/plugin.ts`, the content-type check is done before the size check. A huge `text/plain` body gets 415, not 413. That is fine either way; a one-line comment would stop a later reader wondering.
