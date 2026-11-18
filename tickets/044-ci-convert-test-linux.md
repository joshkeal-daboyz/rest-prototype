# 044 · CI is red on every push: a Windows-only fixture in the converter's manifest test

owner: grid-simulator (tools/)
status: done (merged 17 Nov 2026; Josh: "merge 044"). Was: approved (G1, Josh, 17 Nov 2026: "ok", answering "Should I have the tools builder fix it now, on its own branch?"). Small bug fix on merged ticket 038; no design change.
branch: `ticket/044-ci-convert-test-linux`

## Josh's words (17 Nov 2026)
> "fyi CI checks failed in github for the last pull request" (there are no PRs; CI runs on every push to `main`)
> "ok"

## Finding (read from the GitHub Actions log of run 44212384639, 17 Nov 2026)
- Every push to `main` since ticket 038 fails CI. Typecheck passes; `npm test` fails with 1 failed, 1509 passed, 1 skipped.
- The one failure: `tools/assets/convert.test.ts` > "Manifest, as the CLI writes it" > "lists the packs in name order, with the glb relative to the manifest, and the atlas from pack.json", at line 658: `convert([], deps)` returns 1, expected 0.
- Cause (probable, to be confirmed by the builder): the fixture writes `pack.json` with `atlas: "Textures\\Atlas.png"` (a Windows path). On Linux the backslash is part of a file name, the atlas file is not found, the pack fails, and the exit code is 1. On Windows it passes, which is why local gates were green.
- Not affected: the game, the 3D view, or real converter runs on Josh's PC.

## Goal
`npm test` is green on GitHub's Linux runner and still green on Windows, with the test still proving what it was written to prove.

## Acceptance criteria
- [ ] The builder confirms the cause (reads the converter's atlas handling in `tools/assets/convert.ts`) and says which of two fixes it chose and why:
  - (a) the fixture uses `"Textures/Atlas.png"` (the expected manifest value is already `Textures/Atlas.png`), or
  - (b) if the converter is meant to accept a Windows-style path in `pack.json` on any platform, it normalises `\` to `/` before using the path, with a test for it.
  Default: (a) unless the converter's own docs or tests promise backslash support.
- [ ] No other test changes meaning; no other test is edited.
- [ ] Locally (Windows): `npx vitest run --maxWorkers=2 tools/assets/convert.test.ts` passes, then the main session's capped full run passes.
- [ ] After the main session pushes: the GitHub Actions run for that push is green. If any other Linux-only failure appears, it goes back to the builder (and Josh hears of it).

## Files
- **May touch:** `tools/assets/convert.test.ts`; `tools/assets/convert.ts` only for option (b).
- **Must not touch:** everything else.

## Within approved scope?
Yes. A bug fix to a merged ticket's test; no Decided rule, dependency or schema is touched.
