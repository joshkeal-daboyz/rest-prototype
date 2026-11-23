# Handoff, 19 Nov 2026 night: the city pipeline (ticket 070), for an Opus orchestrator

You are the main (orchestrator) session for **Rest: Circuits**. Read `CLAUDE.md` first (hard rules and the ticket loop are law), then the memory index (`C:\Users\Josh\.claude\projects\D--rest-prototype\memory\MEMORY.md`, especially `project-city-pipeline.md`, `feedback-fable-orchestrates-only.md`, `feedback-pc-load-limits.md`, `feedback-ci-safe-tests-and-phone.md`), then `tickets/070-city-pipeline.md`, then this file. `docs/handoff-2026-11-19.md` has the older loop notes; where it and this file differ, this file wins.

You never write feature code. Josh judges by eye, is often on his phone, and wants screenshots (`SendUserFile`). He does not answer `AskUserQuestion` boxes reliably: ask in plain text and end the message with the question.

## Why this handoff exists

Josh asked for the tile city to be rebuilt as a staged pipeline with an owner agent per group of stages: "currently the city designer is doing too much work and it's creating output that is illogical as a result. We need to break the city into smaller components and give different agents responsibility over each item." The design and ticket 070 were done by a Fable session. The rest is the same loop 16 more times, so he asked for it to move to Opus: "Yes, right after A1 merges".

## Authority (Josh's words, 19 Nov 2026, in chat)

- Ticket 070 and the five agents: asked "Do you approve ticket 070 and creating the five new agents?", he answered "Yes".
- Merging: asked "Do the sections merge into goal/city-style under your 19 Nov waiver once each is green?", he answered "Yes". So a section merges into `goal/city-style` without asking once its gate is green, its review says must-fix 0 and its playtest says regressions 0. Quote these words in each merge commit.
- The grey-box 3D massing view (section E): "Yes".
- Scale: "I think the cities should be much larger in size eventually but I want to make sure a city plan on the scale that we have functions properly before we design anything large." Nothing is designed, built or tuned for a larger city.
- Models: "Make sure you assign llm models to each of the agents used to build the different types of portions in the city, because otherwise it's just going to execute his Fable and that's incredibly inefficient".
- 069: "69 is dropped."

**Still needs his word:** section L (switching `city=tiles` to the pipeline and deleting the old tile code), merging `goal/city-style` into `main`, any push, loosening or narrowing any check, pinning any city as an exception, changing a Decided rule, `LOTS_PER_BLOCK_MAX` 2 to 3 (ticket Q5), and Q6 below.

## State

- Branch `goal/city-style` at `D:\rest-prototype-goal`, head `6eb4d26` plus this file's commit. Never pushed. `main` untouched.
- **Merged:** 063 B (2edac93, by another session), ticket 070 with its plan types (`src/core/cityplan.ts`), the five agent files, and **070 A1** (6eb4d26): `src/city/pipeline/` (runner, freeze, sub-seeds, hash, digest, pictures) and `src/city/streets/` (stage 1, moved from `tileCity`, deep-equal to it on 16 cities). Gate on df53211: tsc clean, 126 files, 2732 passed, 20 skipped. The merge added only ticket files to that tree, so it was not re-gated.
- Nothing on screen has changed yet. `tilecity.ts` is untouched and nothing outside `src/city/` imports it.
- Tickets 064 to 068 are superseded by 070. 059 becomes 070's stage 6 (section K, not cut). 069 is dropped and never built; `tickets/069-parking-first-tile-matching.md` is an untracked leftover of another session in this worktree: leave it.
- Worktrees: `D:\rest-prototype-070a1` (A1, merged; can be removed, junctions first with `cmd /c rmdir`). `D:\rest-prototype-gate` is the gate worktree (detached; `gate-out.txt` is untracked and yours).
- Another orchestrator session ("Rest Circuits orchestrator session") did 063 B. It is idle. Do not run two orchestrators on one branch: if Josh uses it again, agree with him who holds what.

## Next: section A2, then the order in the ticket

Order: A1 (done) → A2 → B → C1 → C2 → D1 → D2 → E → F1 → F2 → G → H1 → H2 → H3 → I → J → L (L only on Josh's word). H and I may run side by side after F2. At most one builder at a time unless their files cannot overlap, and never two heavy test runs at once.

**A2** (renderer): `tilecity.ts` imports stage 1 from `src/city/streets/` and deletes its own copy, so `city=tiles` draws exactly as before; and the flat viewer `?city=plan&stage=<name>` (`src/render3d/planview.ts`). This is the first thing Josh can look at: after it merges, send him a screenshot of the flat street picture and of `city=tiles` unchanged.

Carry these from A1's review into A2's brief (could-improves, none blocking):
1. `STREETS_LEGEND` has an unused "none" entry at index 0; the ticket names seven entries. Drop it or the viewer lists "none". It is in `src/city/streets/`, the planner's folder, so it is a planner fix before or alongside A2, not the renderer's.
2. Section K says the empty `circuit` stage stub "is A1's", but no A1 criterion asked for it and it was not built. Ask the architect which section owns it before a stage after 5 needs it.
3. `pipeline/run.ts` and `streets/` import each other. No cycle today; one appears if a later stage imports the `pipeline` index. Move the stage list out when B adds the second stage.
4. A V1 or V2 failure records only the first block's corner as its cells.
5. `deepFreeze` does not walk into an already-frozen object and would throw on a non-empty typed array.

## The loop for one section

1. **Worktree** from the goal head (PowerShell):
   ```
   cd D:\rest-prototype-goal; $d="D:\rest-prototype-070XX"; git worktree add -b ticket/070XX-slug $d goal/city-style
   cmd /c mklink /J "$d\node_modules" D:\rest-prototype-main\node_modules
   New-Item -ItemType Directory -Force "$d\assets\private" | Out-Null
   cmd /c mklink /J "$d\assets\private\out" D:\rest-prototype-main\assets\private\out
   cmd /c mklink /J "$d\assets\private\calibration" D:\rest-prototype-main\assets\private\calibration
   ```
   Branch names are in each section's heading in the ticket.
2. **Types first.** Layers 4 to 8 are stubs in `src/core/cityplan.ts`. Before D1, F1, H1 and I start, the `lead-architect` types that layer (the ticket's "Interfaces" says which). Builders never edit `src/core/`.
3. **Builder.** The five city agents (`planner`, `streetscape`, `buildings`, `facades`, `landscape`) are in `.claude/agents/` on this branch only. If your session cannot spawn them by name (it was started on another branch), spawn a general-purpose subagent with **`model: sonnet` set explicitly** and tell it to read the agent's `.md` in its worktree as its instructions. A subagent with no model inherits yours. Give it: the section, the worktree and branch, Josh's words, "run only your folder's tests with `--maxWorkers=2` and one `npx tsc --noEmit`, no whole suite, no browser, commit on the branch, do not merge or push, report in the final plain-text message".
4. **Gate** (you), in `D:\rest-prototype-gate`:
   ```
   cd /d/rest-prototype-gate && git checkout -q -f --detach <commit> && rm -f gate-out.txt
   (npx tsc --noEmit && npx vitest run --maxWorkers=2) > gate-out.txt 2>&1; echo "exit $?" >> gate-out.txt
   ```
   Run the second line in the background and read `tail gate-out.txt` when it ends (about 140 s). Red, or a test count that did not grow, goes straight back to the builder. Also check `git ls-files assets/private` is empty and the diff is only in the section's Files.
5. **Review and playtest together**, only after a green gate: `code-reviewer` (opus) and `playtester` (sonnet), each given the ticket section, branch, commit and the gate worktree. Tell both to write into `D:\rest-prototype-gate\reviews\` and `\playtests\`, and the playtester to compare against the branch's base on `goal/city-style`, not `main`, and to stop early when nothing outside `src/city/` imports the change.
6. **Settle.** Only must-fix items and regressions you agree with go back to the builder; two rounds at most, then to Josh as it stands.
7. **Merge.** Copy the review and playtest files into the section's worktree and commit them on the branch. Then in the goal worktree: `git merge --no-ff ticket/070XX-slug -F <message file>` with Josh's words (no PowerShell here-strings in `-m`). If the merge brings anything but ticket files on top of the gated tree, gate the merged head.
8. **Usage.** Add rows to `tickets/usage.md` from each task notification's `subagent_tokens`.
9. **Show Josh** in a few lines with a screenshot whenever a section changes what can be seen (A2, E, G, J especially). Eye checks are yours, in the browser pane, from a dev server in the goal worktree on port 5199 (`preview_start`; never have a builder open a browser).

## Rules that are easy to break

- **Fail, never patch.** A stage that cannot do its job throws `CityStageError`. No check is loosened, no threshold changed, no city pinned. If a section cannot pass on the named cities (the default, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3), stop and take the numbers to Josh.
- **`src/city/**` is pure**: imports only `src/core/` and `src/city/`. Measured sizes are typed-in tables pinned against the GLB by `it.skipIf` tests in `src/render3d/`.
- **The old path gets no new features.** Only A2 and L edit `tilecity.ts`.
- **The ladder holds**: `packpin.test.ts`, `townpin.test.ts`, `town.ts`, `terrace.ts` untouched.
- **PC load**: `--maxWorkers=2`, one heavy step at a time. A vitest "Timeout calling onTaskUpdate" with all tests passing means two runs overlapped; re-run alone.
- Only the `lead-architect` writes tickets; you commit them. The hook blocks agents from merging.

## Open questions for Josh

- **Q6 (new, not blocking until D1 reports).** Parking check P1 falls one block short on some cities outside the named list (3 x 3 seeds 12, 15, 17, 18, 19; 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18), which he accepted on the old path when 063 B merged. Should the pipeline inherit that, or fix the cause in the Edge stage (every block gets a first tile of bays)? Recommended: inherit in D1, decide from D1's report. He has been asked once and has not answered. The old path's `P1_ONE_SHORT` pin is not copied into `src/city/`.
- **Q4.** Who owns stage 6 (the circuit)? Decide when 059 is re-cut.
- **Q5.** Only if C2's stop rule fires: may `LOTS_PER_BLOCK_MAX` be 3 on blocks of at least 10 cells each way?
- **Q1.** When the pipeline replaces `city=tiles` (section L): only on his word, after he has played `?city=plan` through section J.
- Not asked yet: whether to try the `lead-architect` and `code-reviewer` on Sonnet to save tokens. He was told the figures (architect passes of 173K, 51K and 58K; the A1 review 92K) and that the recommendation is to keep them on Opus.

## Token use so far on 070

Architect: 173K (the cut), 51K (approval pass), 58K (069 correction). A1: planner 159K on Sonnet, code-reviewer 92K, playtester 15K. The rows are in `tickets/usage.md`.
