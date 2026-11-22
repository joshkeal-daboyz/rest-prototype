# Handoff, 21 Nov 2026 late: the transformations goal (ticket 073), to run overnight

For the session that orchestrates ticket 073 while Josh sleeps. Read this, then `CLAUDE.md`, then `tickets/073-city-transformations.md`. For the loop's commands and Josh's standing rules, `docs/handoff-2026-11-21.md` ("How the loop runs") and `docs/handoff-2026-11-21-night.md` are still right, except where this note differs.

## The goal

Josh, 21 Nov 2026, in chat: "I would like to goto bed tho. Can we turn this into a goal and let this run over night?" and, on the ticket, "Approved". He then asked for the goal to be handed to a session that is not Fable.

Ticket 073 puts three eras on top of the clean pipeline city: technology (Sci-Fi City pack), the hold-out (Sci-Fi Frontier), the ruin (Nature plus Apocalypse ruin pieces), driven by a `history` stage that gives each district a story. The plan is `docs/design/073-transformations.md`; Josh's answers are quoted at its top and in the ticket. The ticket has no open questions.

## The terms (told to Josh in chat; he did not object, and may reverse any of them)

- **Branch.** Everything lands on `goal/city-transformations`, in the worktree `D:\rest-prototype-073design`. Never touch `goal/city-style`, `main`, `D:\rest-prototype-goal`, `D:\rest-prototype` or `D:\rest-prototype-gate`: another session is working there (070 TR1d, then K). Nothing is pushed.
- **Merging.** A section merges into `goal/city-transformations` without asking once its gate is green, its review says must-fix 0 and its playtest says regressions 0. Quote Josh's goal words in each merge commit.
- **Questions.** Where a pre-check or a builder raises a question, take the recommended answer and have the lead-architect log it in the ticket as "taken under the goal (21 Nov 2026 night); Josh may reverse". Never write it as Josh's ruling.
- **Held for Josh, always.** Any rule break beyond B1 to B10; loosening, re-pinning or skipping any clean-city check; anything touching a GDD Decided rule; a new dependency; any push or merge outside the goal branch. If a section can only go on by one of these, stop that section, log it, and move to the next one.
- **You never write feature code.** Builders do, each in its own worktree. Two rounds of review at most, then leave the section unmerged with both views written down.

## Where things stand

- `goal/city-transformations` holds the plan, the ticket and this note. No code yet.
- **Two pre-checks were started by the Fable session and may have finished without anyone reading them.** Look for `docs/design/073-B-precheck.md` (history; T-1 and T-2 on the clean city) and `docs/design/073-D1-precheck.md` (tech walls and pavements) in the worktree, uncommitted.
  - If a note is there and complete, read it, commit it, and act on it.
  - If it is missing or stops mid-way, run that pre-check again (the ticket's "The B pre-check" and "D1 pre-check" sections say what to measure).
- The three pass agents (`tech-pass`, `holdout-pass`, `ruin-pass`) do not exist yet. The ticket's "Agents" section says what each file must say. Write them under `.claude/agents/` on the goal branch before the first pass section is built (Josh, card 8: "Yes, three agents (Recommended)").

## Order of work

1. **Read the two pre-checks.** Log their questions with the recommended answers taken. If the B pre-check finds T-1 fails on today's clean city, that is Josh's: log it, carry on with what does not depend on it.
2. **F0, the Apocalypse ruin pieces** (grid-simulator). One Blender run, with nothing else heavy running. It must run where `assets/private/in` resolves to `D:\rest-prototype-main\assets\private\in`; without that the converter drops every pack from the manifest. Back the manifest up first, as 072 did.
3. **Section A, the types** (lead-architect). The ticket says A waits for K's `CityCircuitLayer` to merge. Under the goal, ask the architect to split it: type now everything that does not need the circuit (the history layer, the era option, adds and changes, piece references, the resolver's contract), preferably in a new file under `src/core/` so it cannot conflict with K's typing in `cityplan.ts`; leave the circuit references for when K merges. The architect re-cuts the ticket to say so.
4. **B** (`history`, planner), then **C1** (resolver, era runner, T-1 and T-2; planner), then **C2** (the era switch; renderer).
5. **D1** (`tech` walls and pavement; `tech-pass`), then draw it. The ticket's D3 waits for D2, which waits for K2; ask the architect to cut a small drawn section for D1 alone so Josh has something to look at.
6. **Pre-checks that need no circuit:** E2 (camps, farms, markets, barricades), then F1 (growth) once F0 is in. Build E2 if its pre-check holds and time allows. Do not draw the hold-out before instancing (J2), which comes after the tech pass is drawn.
7. **Stop** when every remaining section waits on K2 (D2, E1, E1g, F2, F2g) or on Josh. Do not start K work: it belongs to the other session.

## How to run it

- **Agents.** Spawn `lead-architect`, `code-reviewer` and `playtester` by type. Spawn every city builder and the pipeline-designer as `general-purpose` with an explicit model (sonnet for builders, opus for the pipeline-designer), told to read its `.claude/agents/<name>.md` in its worktree. Give reviewer and playtester only the ticket id and the branch name.
- **Named runs.** 6 x 6 seeds 1 to 10, one-way off and on. 3 x 3 and 6 x 4 are best effort, report only.
- **Worktrees.** Cut each section's branch from `goal/city-transformations`, with the junctions listed in `docs/handoff-2026-11-21.md` (`node_modules`, `assets/private/out`, `assets/private/calibration`).
- **Your own gate folder.** Make `D:\rest-prototype-073gate` (detached worktree, same junctions) and gate there with that handoff's command, the path changed. Never use `D:\rest-prototype-gate`.
- **Load.** Josh: "leave one core Available or the computer moght seize". At most 7 of 8 cores in total, and the other session is using some: one heavy step of yours at a time (a gate, a Blender run, a builder's tests), `--maxWorkers=2`, no builder browsers, no whole suite in builders. Pre-check probes are light; one at a time each.
- **Browser.** Check every drawn section in the browser before merging it, with a uniquely named entry in `D:\rest-prototype\.claude\launch.json` on its own port, removed afterwards; leave the other entries alone. Take full-resolution screenshots the way that handoff describes and keep them for the morning.
- **Records.** After each section, add its agents' token use to `tickets/usage.md` (edit with sed; no BOM). Reviewers sometimes write into `D:\rest-prototype`; check there after each review and move the file.
- No Python on this machine.

## The morning note

When you stop, write `docs/handoff-2026-11-22-transformations.md` on the goal branch: what merged (with commits), what is left and what each part waits for, every question answered under the goal with the answer taken, anything held for Josh, and the URLs to look at each era. Send Josh the note and the screenshots with SendUserFile. Do not ask him anything overnight.
