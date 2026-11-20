# Handoff, 20 Nov 2026: the city pipeline (ticket 070) after C2, for the next orchestrator

Read `CLAUDE.md` first (it now has a "pipeline designer" section), then the memory index (especially `project-city-pipeline.md`, `feedback-fable-orchestrates-only.md`, `feedback-pc-load-limits.md`), then `tickets/070-city-pipeline.md`, then `docs/handoff-2026-11-19-pipeline.md` (the loop, authority, and its "Rules that are easy to break"), then this file. Where they differ, this file wins.

You never write feature code. Josh is often on his phone: screenshots with `SendUserFile`, questions in plain text at the end of the message.

## State

- Branch `goal/city-style` at `D:\rest-prototype-goal`, head is this file's commit (after `ac63e15`). Never pushed. `main` untouched.
- **Merged since the 19 Nov handoff:** A2 (a933e54), A3 (117e017, HUD hidden on the plan view; a new section), B (130b96c), C1 (56aaf6c), B2 (77ccde0, a new section), C2 (4f25c0c). Last gate (C2, 6520b44): tsc clean, 132 files, 3046 passed, 20 skipped.
- Stages built: streets, land, mass. All 13 named cities return ok. Default city mass: 966 homes, 72.5 stalls wanted, floor 54.3, 66 laid (5 yard courts, 6 full), R1 0.927.
- Fable added the `pipeline-designer` agent (`.claude/agents/pipeline-designer.md`, opus) and a CLAUDE.md rule (Josh: "Yes, add it"): pre-check before any section that adds or changes a rule or a number; also on a builder's stop and on a builder/reviewer disagreement. Notes go in `docs/design/070-<section>-<topic>.md`.

## Josh's rulings in this stretch (quote them in merge commits)

- A2: asked "May the tilecity purity test's import list gain ../city/streets and ../core?", he answered "Yes, widen it".
- A3: asked "Should the HUD be hidden on ?city=plan as a small follow-up section?", he answered "Yes, hide it".
- C2 parking stop: asked "Do you approve all four rulings as recommended ("Yes, all four"), or do you want to keep 0.15 instead?", he answered "Yes, all four" (PARK_PER_HOME 0.075 on the pipeline, city=tiles keeps 0.15 until L; yard courts; lanes only where court parts stay 8+ long; a court part with no drive gets a walk-through even beside a lane). LOTS_PER_BLOCK_MAX stays 2, Q5 closed. See `docs/070-c2-options.md`.
- C2 round 1: asked "A frontage lot is parking, not a way in, so a court part whose only opening is a frontage lot still gets a walk-through. Agreed: yes or no?", he answered "Yes, agreed".
- The merge waiver still holds: asked "Do the sections merge into goal/city-style under your 19 Nov waiver once each is green?", he answered "Yes".

## Open, waiting on Josh

**D1 pre-check did not hold** (`docs/design/070-D1-precheck.md`). P1 fails on 6x4 seeds 1 and 2 because C2's shop count is about 25% above the old path's. P3 to P6 hold. The designer recommends a first-tile pass (every block gets one kerb tile before the rest are shared), which is Q6's "fix the cause". The question as put to Josh: "On the pipeline, two named 6x4 cities (seeds 1 and 2) leave a block with no kerb parking, because the new shop count is about 25% higher. Should D1 give every block its first kerb tile before the rest are shared out (Yes), or stop as written (No)?" Not answered yet. On Yes: the architect re-cuts D1 criteria 2 and 4 and records Q6 as fixed in D1, and types `CityEdgeLayer` (with `CityGroundCell`) in `src/core/` before the D1 builder starts (it is a stub today). Then the streetscape agent builds D1.

Also open: Q4 (stage 6 owner), Q1 (section L). The 6x6 whole-block case (a 6x6 block from streets that Land leaves alone) stays an honest M5 failure (ticket Q7).

## Carried could-improves (none blocking)

- C2 review: restore C1's "each opening kind appears on the named cities" check with drives and yard courts; tighten the apron check beyond ring 2; `BUILT_RINGS` instead of `DRIVE_CELLS` in `courtInside`; the lane-block fixture could assert part a's walk sits on its lane side.
- A3 review: `renderer.ts` and `planHidesHud` each decide "is the plan view on"; one shared check would stop drift (a later renderer section).
- B2 review: a test for the long-side M4a error text; `cramped` in land/check.ts repeats `courtPartRoomy`'s rule.
- The mass picture's greys (lane, apron, drive, aisle, stalls) are hard to tell apart on a phone; offered to Josh, not asked for.

## Practical notes (things that bit or helped)

- **Plan view address needs `view=3d`:** `?view=3d&city=plan&stage=<streets|land|mass>[&blocks=6x4&seed=3]`.
- **Screenshots:** the session's launch.json is `D:\rest-prototype\.claude\launch.json` (tracked on that checkout's branch). Add a temporary entry `{"name":"goal","runtimeExecutable":"C:\\Program Files\\nodejs\\npm.cmd","runtimeArgs":["--prefix","D:\\rest-prototype-goal","run","dev","--","--port","5199","--strictPort"],"port":5199}` (a `cwd` outside the project is refused), `preview_start {name:"goal"}` (it lands on 5200), resize to mobile, wait 1 to 2 s after navigate before the screenshot (the first one can be blank), then stop the server, reset the size and `git checkout -- .claude/launch.json` in D:\rest-prototype.
- **Gate** (PowerShell, background): `cd D:\rest-prototype-gate; git checkout -q -f --detach <commit>; Remove-Item -ErrorAction SilentlyContinue gate-out.txt; $p = Start-Process -FilePath "cmd.exe" -ArgumentList '/c','(npx tsc --noEmit && npx vitest run --maxWorkers=2) > gate-out.txt 2>&1 & echo exit %errorlevel% >> gate-out.txt' -WorkingDirectory D:\rest-prototype-gate -WindowStyle Hidden -PassThru; $p.PriorityClass = 'BelowNormal'; $p.WaitForExit()`, then `grep -E "Test Files|Tests |error TS|^exit|FAIL" gate-out.txt`. A line-endings-only change to `src/audio/__snapshots__/notSoftened.test.ts.snap` in the gate worktree is harmless.
- **No Python on this machine.** Never script an edit with python; use the Edit tool.
- **Bash `git commit`/`git merge` with no stdin can hang**; append `< /dev/null`. Write merge messages to the scratchpad with Write and pass `-F`.
- **Builders sometimes `git commit -a`**: tell them to `git add` their paths only when another agent shares the worktree.
- **When the goal head moves under a section branch**, merge or rebase the goal head into the branch before its gate so the gate covers what lands.
- **Spawning:** the five city agents and the pipeline-designer may not be loaded by name; spawn `general-purpose` with `model` set from the agent's `.md` (`sonnet` for builders, `opus` for the pipeline-designer) and tell it to read its `.md`. A planner resumed with SendMessage carries its whole context (C2's reached 306K); a fresh one with a good brief is cheaper.
- Round-1 review and playtest files are archived on the branch as `<slug>-round1.md` before round 2 overwrites them.

## Worktrees

Merged and removable (junctions first with `cmd /c rmdir`): `D:\rest-prototype-070a1`, `-070a2`, `-070a3`, `-070b`, `-070b2`, `-070c1`, `-070c2`. Gate: `D:\rest-prototype-gate` (detached).

A fork of the previous orchestrator session exists ("Rest Circuits city pipeline orchestrator (fork)"). Only one orchestrator drives `goal/city-style`; agree with Josh which.

## Token use

All rows are in `tickets/usage.md` up to C2. Not yet recorded: the D1 pre-check (pipeline-designer on opus, 154K).
