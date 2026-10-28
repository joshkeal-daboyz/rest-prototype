# 018 · Tests follow the puzzle renames

owner: lead-architect (0), grid-simulator (A), interaction (B), renderer (C), ui (D)
status: in progress (G1: Josh, "Approve 018")
branch: `ticket/018-puzzle-reorg` (one branch for all parts; the puzzle reorg is already committed on it)

## Josh's words
"Approve 018"

## Goal
The 54 maps were renamed to one ladder, `puzzles/NN-<slug>.json` with ids `NN-<slug>` (table: `puzzles/README.md`, "Old id → new id"). Tests still load the old files and expect the old ids, so `npm run gate` fails: one tsc error (`src/ui/maps.test.ts`) and 62 failing tests, plus three test files that fail before any test runs. When this is done, every test loads the renamed file and expects the renamed id, asserts exactly what it asserted before, and `npm run gate` is green on the branch. Nothing the player sees changes; no production code and no puzzle file changes.

## What changes (verified by grep on `561fd14`)
Only three old files are read by tests. Contents are unchanged by the reorg, so only paths and ids move:

| Old file / id | New file / id |
| --- | --- |
| `shrine-circuit.json` / `shrine-circuit` | `08-shrine-circuit.json` / `08-shrine-circuit` |
| `which-fuse.json` / `which-fuse` | `11-which-fuse.json` / `11-which-fuse` |
| `battery-run.json` / `battery-run` | `18-battery-run.json` / `18-battery-run` |

| Part | Owner | File | Lines (today) | What |
| --- | --- | --- | --- | --- |
| 0 | lead-architect | `src/core/load.test.ts` | 20 | `read("shrine-circuit.json")` |
| A | grid-simulator | `src/grid/grid.test.ts` | 9, 428 | fixture path; `puzzleId: "shrine-circuit"` in the `job:completed` payload |
| A | | `src/grid/fuseload.test.ts` | 77, 84, 85, 96, 97, 112, 113 | fixture paths (battery-run, shrine-circuit); test titles naming the map |
| A | | `src/grid/culprit.test.ts` | 24, 74, 83 | path (battery-run); titles |
| A | | `src/grid/spring.test.ts` | 225, 226, 249, 250 | path (which-fuse); titles |
| A | | `src/grid/battery.test.ts` | 362 | path (shrine-circuit) |
| A | | `src/grid/blownlamps.test.ts` | 7 | comment only: `puzzles/ladder-08-why-it-blew.json` is now `puzzles/17-why-it-blew.json`. The inline puzzle (its `id` included) stays as is: the test never reads the file. |
| B | interaction | `src/play/play.test.ts` | 11, 124, 344 | path; title; `expect(log.puzzle).toBe("shrine-circuit")` |
| C | renderer | `src/render/render.test.ts` | 11 | path |
| C | | `src/render/readable-failures.test.ts` | 25, 120 | paths (shrine-circuit, battery-run) |
| D | ui | `src/ui/maps.test.ts` | 2, 9, 13, 24, 25, 31, 32, 35, 43, 56 | JSON import path (the tsc error); the fake `../puzzles/...` keys; expected keys `shrine-circuit` / `locked/shrine-circuit` and the duplicate-key message become `08-shrine-circuit` / `locked/08-shrine-circuit` |

No other old id (of all 54 in the README table) appears in `src/`. There is no `tools/` folder on this branch.

Test titles that name the map by its old id (`"shrine-circuit: …"`, `"battery-run: …"`, `"which-fuse …"`) take the new id; the rest of the title is unchanged. Titles that name a map in plain words (`"shrine circuit is won in exactly three actions"`) stay.

## Acceptance criteria
- [ ] (Vitest, each part) Every changed test keeps asserting the same thing: same `expect`s, same values, same element ids (`fb_A`, `sw_1`, `fb_east`, …). Only a puzzle file path, a puzzle id, or a title's map name changes. The diff of each test file shows nothing else.
- [ ] (Vitest, each part) No test is added, removed, skipped or loosened (`.skip`, `.todo`, `it.fails`, wider matchers).
- [ ] (gate, main session) `npm run gate` is green on `ticket/018-puzzle-reorg`: `tsc --noEmit` clean and every test passes.
- [ ] (gate, main session) Test count matches `main` (`dc1e734`, 276 tests) file for file, except `src/core/load.test.ts`, which has one validation test per JSON file in `puzzles/` and so goes from 25 to 66 (55 files + 11). Expected total: **317**. Per file: core/load 66, grid/battery 23, grid/blownlamps 5, grid/culprit 7, grid/fuseload 7, grid/grid 47, grid/spring 16, play/battery 3, play/play 30, ui/logic 29, ui/maps 5, render/fusebar 4, render/labels 2, render/readable-failures 14, render/render 29, render/shock-lamps 25, render/spring 5.
- [ ] (grep, main session) `grep -rE "shrine-circuit\.json|battery-run\.json|which-fuse\.json|\"(shrine-circuit|battery-run|which-fuse)\"" src/` finds only `0N-`/`1N-` prefixed forms.
- [ ] (diff, main session) `git diff --stat` touches only the test files listed above. No file outside `*.test.ts`, nothing in `puzzles/`.

## Files
Test files only, each part in its own folder:
- 0 (lead-architect): `src/core/load.test.ts`
- A (grid-simulator): `src/grid/grid.test.ts`, `src/grid/fuseload.test.ts`, `src/grid/culprit.test.ts`, `src/grid/spring.test.ts`, `src/grid/battery.test.ts`, `src/grid/blownlamps.test.ts`
- B (interaction): `src/play/play.test.ts`
- C (renderer): `src/render/render.test.ts`, `src/render/readable-failures.test.ts`
- D (ui): `src/ui/maps.test.ts`

Out of scope for every part: production code, `puzzles/` (any file), docs, tickets, `.claude/`.

## How the parts run
All five parts are independent (disjoint files) and run **in parallel in the one working tree** on `ticket/018-puzzle-reorg` (`D:\rest-prototype`), not in separate worktrees or branches.
- No agent runs `git add`, `commit`, `stash`, `checkout`, `reset`, `restore` or `switch`. Another part's edits are in the same tree at the same time.
- Each agent checks only its own folder: `npx vitest run src/<folder>`. The ui part also runs `npx tsc --noEmit` (its import is the only tsc error). No part runs `npm run gate` or the whole suite as its pass/fail signal; other parts may be half-done.
- Each agent reports the files it changed and its folder's test count (must equal the per-file numbers above).
- When all five have reported, the main session runs `npm run gate` once, checks the count and the diff, and makes one commit with Josh's words.

## Interfaces
None. No `src/core/` types change. No new dependencies.

## Open questions
None for this ticket.

## Follow-up (not in this ticket; listed, not fixed)
Old ids still named outside `src/`. Each needs its own owner; `.claude/agents/*.md` is config, so the main session or Josh edits it, not an agent.
- **`.claude/agents/puzzle-designer.md` names `puzzles/shrine-circuit.json` (and `shrine-circuit.md`) as its model map** (lines 8, 12), and `battery-run` on line 20. The model map is now `puzzles/08-shrine-circuit.json` / `.md`. Its file-name rule (`puzzles/<id>.json`) also predates the `NN-<slug>` ladder naming; a designer following it will write an unnumbered file.
- `.claude/agents/grid-simulator.md` line 20: `shrine-circuit`.
- `puzzles/SCHEMA.md` line 9: `shrine-circuit`.
- `docs/handoff.md` line 7: `battery-run`, `behind-the-first`, `not-enough-for-all`, `shrine-circuit`, `where-it-stops`, `which-fuse`.
- Tickets (history; probably leave as written, since they record what was true then): 002, 003 (`shrine-circuit`); 006, 008, 010, 011, 012, 013 (`battery-run`); 011 (`behind-the-first`, `where-it-stops`); 012, 013, 014 (`which-fuse`); 014 (`ladder-36-whole-ward`); 017 (`ladder-08-why-it-blew`). Ticket 017 is still open: its builders should read `ladder-08` as `17-why-it-blew`.
