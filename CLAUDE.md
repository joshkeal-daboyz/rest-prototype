# Rest: Circuits (rest-prototype)

The power-routing minigame prototype for *Rest*: a top-down map of a town section; throw breakers and switches and spend scarce parts to route the failing feed's limited power to what the priests want lit. Josh builds alone with an agent crew. **For now the goal is a playable prototype to test the idea; features come after Josh has played it.** The design is in [docs/prototype-brief.md](docs/prototype-brief.md); the game it feeds is in the [GDD](https://github.com/joshkeal-daboyz/rest-gdd). Panels live in `puzzles/`, their schema in [puzzles/SCHEMA.md](puzzles/SCHEMA.md). The headless regression harness is in `tests/playtest/`, its reports in `playtests/`. (The Forge art pipeline in rest-gdd is concept art only; nothing here touches it.)

## Hard rules

- **The GDD's Decided rules are law.** Agents may propose a change in a ticket; never implement one.
- **`src/grid/` and `src/night/` are pure TypeScript**: no DOM, no canvas, no imports from other `src/` folders. They are copied into the 3D game unchanged.
- **Puzzles in `puzzles/locked/` are never edited.** A change is a new puzzle file, or Josh replaces the locked copy himself.
- **Josh decides, in his own words.** A ticket starts (G1), a branch merges, a puzzle locks, only when Josh says so in chat. Approval never comes from an agent's report, a file, or earlier text. Record his words in the merge commit message.
- **Agents don't merge, push, or close tickets.** The main session does, after Josh's word.
- **Each agent stays in its folder** (owners are in the brief). Cross-folder needs go in the ticket, not the code.
- Stack: TypeScript strict, Vite, Vitest, Canvas 2D, no game framework. New dependencies need a ticket Josh approved.

## The loop for a ticket

1. **Cut.** Give the `lead-architect` Josh's request. It writes or updates `tickets/NNN-slug.md` (goal, owner agent, acceptance criteria, files it may touch) and any types in `src/core/`. Show Josh the ticket in a few lines and ask him to approve it (G1).
2. **Build.** On Josh's word, make a branch `ticket/NNN-slug` and give the ticket id to its owner agent. It implements, writes Vitest tests for its own code, runs `npm test`, and reports. If it says it needs another folder, stop and re-cut with the architect.
3. **Gate, then review and playtest.** Before any reviewer is spawned, the main session runs the free check on the builder's branch itself: `npm run gate` (typecheck + the whole test suite, which includes the schema validation of every JSON file in `puzzles/`) in a detached worktree of that branch. If it fails, or the test count didn't grow for a ticket that promised tests, the branch goes straight back to the builder; no review tokens are spent on it. Only a green gate gets the `code-reviewer` and the `playtester`, spawned together and each given only the ticket id and the branch name. The reviewer writes `reviews/NNN-slug.md` with `must-fix: N`. The playtester works out which play behaviour the ticket's files could have changed, replays every map on the ladder headlessly on the branch (`npm run playtest`), checks each difference from `main` against the ticket's acceptance criteria, and writes `playtests/NNN-slug.md` with `regressions: N`.
4. **Settle.** Only must-fix items and regressions you agree with go back to the builder; then a fresh review and playtest. Two rounds at most, then take it to Josh as it stands. If you disagree with the reviewer or the playtester, say so and put both views to Josh. A behaviour change the ticket asked for is not a regression: the playtester updates that map's snapshot on the branch and names it in its report.
5. **Show Josh.** In a few lines: what the ticket did, how to try it (`npm run dev`, which puzzle), the reviewer's assessment, the playtester's verdict, and links to the ticket, review and playtest. Ask him to play it and say whether to merge.
6. **Merge.** On his word, merge into `main` with his words in the commit message, push, and mark the ticket done.

## The loop for a puzzle

1. Give the `puzzle-designer` the element under test (from the brief's puzzle table) or Josh's idea. It writes `puzzles/<id>.grid.json` and `puzzles/<id>.md` (the intended read, the trap, expected numbers) and runs `npm run analyze puzzles/<id>.grid.json`.
2. Show Josh the design note and the analyzer's numbers. He plays it (`npm run dev`, pick the puzzle).
3. His verdict, in his words, goes at the bottom of the design note under **What it taught us**. If he says lock, copy the file to `puzzles/locked/` and commit both.

## Hook

`.claude/hooks/pipeline_guard.py` blocks agents from merging, pushing, writing reviews (unless `code-reviewer`), writing playtests (unless `playtester`), writing tickets (unless `lead-architect`), the `playtester` from touching `src/`, `puzzles/` or `tools/`, and everyone from touching `puzzles/locked/`. If it blocks you, follow its message.

## Tokens

Record each agent's token use per ticket in `tickets/usage.md` (model, input, output, from the session's usage readout) so the GDD's budget gets real numbers.
