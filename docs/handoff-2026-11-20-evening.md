# Handoff, 20 Nov 2026 evening: ticket 070 after F2, for the next orchestrator

Read first: `CLAUDE.md` (the pipeline-designer section), the memory index (especially `project-city-pipeline.md`, `feedback-fable-orchestrates-only.md`, `feedback-pc-load-limits.md`), `tickets/070-city-pipeline.md`, then `docs/handoff-2026-11-20-pipeline.md` (practical notes still hold), then this file. Where they differ, this file wins.

## State

- Branch `goal/city-style` at `D:\rest-prototype-goal`, head is this file's commit (after `7680305`). Never pushed. `main` untouched.
- Merged today: D1 (7b9d743), the T-junction design note, the group A4 + A4b + A4c + B3 + C3 + A4d + A2b + D1b (41d6cbc), D2 (86e9e5c), E (0ddfd42), F1 (f6adc4b), F2 (fac37be). Last full gate (F2, 05643a6): tsc clean, 148 files, 3707 passed, 22 skipped.
- **Named test cities are 6x6 seeds 1 to 10, one-way off and on (20 runs).** Default city 6x6 seed 1. Pin cities 6x6 seeds 1, 2, 3, 8 (one-way on). 3x3 and 6x4 are outside cities (reported, never pinned). Josh: "No, we need to stop basing these tests on a 3x3. Start basing them on 6x6 or greater."
- Streets are the split plan (T junctions, T floor 30%), with one-way streets (one lane + optional parking tile, pavements each side). See `docs/design/070-streets-t-junctions.md`, `070-streets-one-way.md`.
- 3D plan view: `?view=3d&city=plan&stage=assemble` (street camera: `&cam=street[&at=i,j&dir=+x]`). Flat stage pictures: `?view=3d&city=plan&stage=<streets|land|mass|edge|buildings>[&blocks=6x6&seed=3]`.

## Next: section G (buildings drawn in 3D, renderer)

Josh, 20 Nov 2026: "Let me see the 3D buildings first" (before making BACK_SAME_SHARE 0.5 Decided) and, on starting G, "lets do that in a new session". G likely needs a re-cut against F1/F2's layer (columns, pieces, roofs, the L bend; ground storey is H1's) — check G's text; it draws only and skips the pre-check unless it adds a rule.

## Open with Josh (ask in plain text)

1. **BACK_SAME_SHARE 0.5** (inner buildings matching their partner): Decided after he sees G's 3D buildings.
2. **F2 pre-check questions** (`docs/design/070-F2-precheck.md`), recommendations all "yes": (1) a hidden back building taller than the one in front may show its windows above the lower roof; (2) style-1 roofs may overhang by what the piece carries (up to 0.79 m, past the 0.6 m trim limit); (3) the 8-11 cm corner roof-base step is judged on G's screenshots rather than a rule now.
3. **D2 optional**: a build-out may start right beside a T's dropped kerb, as at block corners (recommended yes; built that way).
4. E's review noted the court stall-cell filter hides a small mass mismatch on ~6 of 10 seeds (cosmetic; worth a later look).
5. A stray file `D:\rp_msg.txt` (a playtester's commit message) — Josh asked to remove it himself; the safety check blocks agents.

## Practical notes learned today

- **Spawn the architect as `subagent_type: lead-architect`** (the guard blocks ticket writes from general-purpose); reviewer `code-reviewer`, playtester `playtester`. Builders and the pipeline-designer: general-purpose with `model` set and told to read their `.md`.
- **The pipeline-designer's .md says it doesn't commit**: the main session commits its notes.
- **Worktrees** need `node_modules` junctioned to `D:\rest-prototype-main\node_modules`, and for GLB-reading tests or the dev server `assets/private/out` (and `calibration`) junctioned to `D:\rest-prototype-main\assets\private\`.
- **Gate**: guard the `cd` (`if (-not (Test-Path D:\rest-prototype-gate\.git)) { throw }; Set-Location ... -ErrorAction Stop`) before `git checkout -f`; once a failed cd ran the checkout in `D:\rest-prototype`.
- **Browser checks catch what tests miss** (E's overhead view was blank sky: the plan page kept the HUD insets). Always look before merging a renderer section; wait 6-8 s after navigate for the GLB.
- Commit messages via `-F <file> < /dev/null`; a heredoc plus `< /dev/null` gives an empty message.

## Worktrees merged and removable

`D:\rest-prototype-070d1`, `-070a4`, `-070a4b`, `-070a4c`, `-070a4d`, `-070b3`, `-070c3`, `-070d1b`, `-070a2b`, `-070d2`, `-070e`, `-070f1`, `-070f2`, `D:\rest-prototype-tjunction`, `D:\rest-prototype-oneway` (junctions first with `cmd /c rmdir`). Gate: `D:\rest-prototype-gate` (detached).

## Token use

All rows to F2 are in `tickets/usage.md`.
