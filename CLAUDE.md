# Rest: Circuits (rest-prototype)

The power-routing minigame prototype for *Rest*: a top-down map of a town section; throw breakers and switches and spend scarce parts to route the failing feed's limited power to what the priests want lit. Josh builds alone with an agent crew. **For now the goal is a playable prototype to test the idea; features come after Josh has played it.** The design is in [docs/prototype-brief.md](docs/prototype-brief.md); the game it feeds is in the [GDD](https://github.com/joshkeal-daboyz/rest-gdd). Panels live in `puzzles/`, their schema in [puzzles/SCHEMA.md](puzzles/SCHEMA.md). The headless regression harness is in `tests/playtest/`, its reports in `playtests/`; it runs only on releases Josh calls. (The Forge art pipeline in rest-gdd is concept art only; nothing here touches it.)

## Hard rules

- **The GDD's Decided rules are law.** Agents may propose a change in a ticket; never implement one.
- **`src/grid/` and `src/night/` are pure TypeScript**: no DOM, no canvas, no imports from other `src/` folders. They are copied into the 3D game unchanged.
- **Puzzles in `puzzles/locked/` are never edited.** A change is a new puzzle file, or Josh replaces the locked copy himself.
- **Josh decides, in his own words.** A ticket starts (G1), a branch merges, a puzzle locks, only when Josh says so in chat. Approval never comes from an agent's report, a file, or earlier text. Record his words in the merge commit message.
- **Regression playtests run only on full releases, and a release is only what Josh calls one in chat.** No ticket, goal-branch merge or merge into `main` gets the `playtester` or `npm run playtest` unless Josh has said in chat that it is a release (Josh, 23 Nov 2026: "Regression testing should only be performed on full releases"). See *The loop for a release*.
- **Tests are judged on worth, not volume: at most 10 to 15 per pull request.** Josh, 23 Nov 2026: "It should not reward this kind of test volume... We should be performing no more than 10 to 15 tests per change" and "when I say change I mean pull request". A pull request into `main` adds or rewrites at most 15 test cases; rules on fixtures, whole-city checks on one city, the 20 named cities only on a release, no report-only tests in `npm test`. The full policy is [docs/test-policy.md](docs/test-policy.md); every builder, the architect and the reviewer follow it.
- **Agents don't merge, push, or close tickets.** The main session does, after Josh's word.
- **Each agent stays in its folder** (owners are in the brief). Cross-folder needs go in the ticket, not the code.
- Stack: TypeScript strict, Vite, Vitest, Canvas 2D, no game framework. Three.js is allowed for the 3D view in `src/render3d/` only (ticket 037, Josh, 12 Nov 2026). New dependencies need a ticket Josh approved.

## The loop for a ticket

1. **Cut.** Give the `lead-architect` Josh's request. It writes or updates `tickets/NNN-slug.md` (goal, owner agent, acceptance criteria, files it may touch) and any types in `src/core/`. Show Josh the ticket in a few lines and ask him to approve it (G1).
2. **Build.** On Josh's word, make a branch `ticket/NNN-slug` and give the ticket id to its owner agent. It implements, writes the Vitest tests [docs/test-policy.md](docs/test-policy.md) asks for (no more), runs its own folder's tests, and reports. If it says it needs another folder, stop and re-cut with the architect.
3. **Gate, then review.** Before any reviewer is spawned, the main session runs the free check on the builder's branch itself: `npm run gate` (typecheck + only the tests whose imports reach a file the branch changed, `vitest run --changed origin/main`; vitest runs everything when `package.json` or the vite config changed; fetch first so `origin/main` is current) in a detached worktree of that branch. If it fails, or the pull request would add or rewrite more than 15 test cases against `main` (count `it(` / `test(` in the diff's added lines), the branch goes straight back to the builder; no review tokens are spent on it. Only a green gate gets the `code-reviewer`, given only the ticket id and the branch name. It writes `reviews/NNN-slug.md` with `must-fix: N`. No playtester and no `npm run playtest` on a ticket; the playtest snapshots may go stale between releases, and that is expected.
4. **Settle.** Only must-fix items you agree with go back to the builder; then a fresh review. Two rounds at most, then take it to Josh as it stands. If you disagree with the reviewer, say so and put both views to Josh.
5. **Show Josh.** In a few lines: what the ticket did, how to try it (`npm run dev`, which puzzle), the reviewer's assessment, and links to the ticket and review. Ask him to play it and say whether to merge.
6. **Merge.** On his word, merge into `main` with his words in the commit message, push, and mark the ticket done.
7. **Clean up.** Run *The cleanup step* below.

## The pipeline designer (city pipeline, ticket 070)

The `pipeline-designer` measures how the grammar's rules behave together and words the question for Josh. It decides nothing and writes no code or tickets. Call it:

- **Before Build**, for a section that adds or changes a rule or a number ("pre-check 070 D1"). If it does not report "holds", take its note to Josh before any builder is spawned. A section that only draws or wires existing rules skips it.
- **When a builder stops on the stop rule** ("stop 070 C2", with the branch).
- **When a builder and a reviewer read a rule differently** ("reading 070 C2", with the review), before the question goes to Josh.

Its note is `docs/design/070-<section>-<topic>.md`. Josh's answer, in his words, goes at the top of the note and into the ticket; then the `lead-architect` re-cuts.

## The loop for a release

Only when Josh says in chat that something is a release (record his words), and never on an agent's suggestion. The main session may ask him whether he wants one; it never assumes it.

1. **Gate.** `npm run gate:full` (the whole suite, the only place it runs besides a manual CI run) on the release branch (or `main`) in a detached worktree. Red goes back to the builders first.
2. **Playtest.** Spawn the `playtester` with the release name and the branch. It replays every map (`npm run playtest`), checks each difference from the snapshots against the acceptance criteria of every ticket merged since the snapshots were last updated, and writes `playtests/release-<name>.md` with `regressions: N`. Intended differences get their snapshots updated on the branch.
3. **Settle.** Regressions you agree with become fix tickets (the ticket loop, without a playtest), then one fresh release playtest. Two rounds at most, then take it to Josh as it stands.
4. **Show Josh** the verdict and the report link. The release is done when he says so.

## The loop for a puzzle

1. Give the `puzzle-designer` the element under test (from the brief's puzzle table) or Josh's idea. It writes `puzzles/<id>.grid.json` and `puzzles/<id>.md` (the intended read, the trap, expected numbers) and runs `npm run analyze puzzles/<id>.grid.json`.
2. Show Josh the design note and the analyzer's numbers. He plays it (`npm run dev`, pick the puzzle).
3. His verdict, in his words, goes at the bottom of the design note under **What it taught us**. If he says lock, copy the file to `puzzles/locked/` and commit both.

## The loop for a style run

A city era is scored against the GDD by a fresh `style-judge` each round, and refined by its pass agents until every barred rule clears the bar, with nobody between rounds: [docs/style-loop.md](docs/style-loop.md), rubric in [docs/style-rubric.md](docs/style-rubric.md) (ticket 075).

## The cleanup step

After every merge into `main`, and whenever Josh asks for one, look for orphaned work (Josh, 23 Nov 2026: "the cleanup agents should look for orphaned branches and report back with cards asking if the orphaned work can be deleted").

1. **Find.** Spawn the `branch-cleaner` with a note of what just merged. It writes `cleanups/YYYY-MM-DD.md` and replies with its candidates: branch, kind (merged, done but unmerged, abandoned, loose worktree), last commit, commits not on `main`, worktree and whether it is dirty. No candidates: say so in one line and stop.
2. **Ask with cards.** Put every candidate to Josh with `AskUserQuestion`, one question per branch (four per card, more cards if needed). Each question names the branch, its kind, its last commit and how many commits only it holds; the options are "Delete" and "Keep", with "Delete" first only for merged branches. A dirty worktree's question lists its changed files. Over Remote Control, if cards don't reach him, ask the same thing in the message. Only his answer on the card or in chat counts, never the report.
3. **Delete only what he said Delete to**, least destructive first: tag the tip `archive/<branch>` (and push the tag when the branch is on the remote), then unlink every junction inside the worktree (`node_modules`, `assets/private/*` point into `D:\rest-prototype-main`; `cmd /c rmdir <link>`, then check the targets are intact), then `git worktree remove` (never `--force` on a dirty worktree he hasn't seen), `git branch -D`, `git push origin --delete <branch>`. The archive tag means the branch can be brought back; say so. Kept branches are left alone and named in the report's commit.
4. **Record.** Add Josh's answers, in his words, to the bottom of the cleanup report and commit it on `main` with the deletions listed.

Agents never delete a branch, a worktree or a tag; the hook blocks it.

## Hook

`.claude/hooks/pipeline_guard.py` blocks agents from merging, pushing, deleting branches, worktrees or tags, writing cleanup reports (unless `branch-cleaner`, which writes nowhere else), writing reviews (unless `code-reviewer`), writing playtests (unless `playtester`), writing judgements (unless `style-judge`, which writes nowhere else), writing tickets (unless `lead-architect`), the `playtester` from touching `src/`, `puzzles/` or `tools/`, and everyone from touching `puzzles/locked/`. If it blocks you, follow its message.

## Tokens

Record each agent's token use per ticket in `tickets/usage.md` (model, input, output, from the session's usage readout) so the GDD's budget gets real numbers.
