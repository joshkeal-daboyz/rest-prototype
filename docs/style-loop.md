# The loop for a style run (Generator → Evaluator → Refiner)

Ticket 075, section A. Approved by Josh, 22 Nov 2026, in chat: "Approve, defaults".

A style run scores what a city era looks like against the GDD, and fixes it, with nobody in between rounds. The **generator** is the era's pass agents (`tech-pass`, `holdout-pass`, `ruin-pass`), which build the era. The **evaluator** is a fresh `style-judge` agent each round: it sees only `docs/style-rubric.md` and the screenshots, and gives every rule a score from 0 to 10 with a reason and evidence. The **refiners** are the same pass agents: each gets the judge's must-fix lines for the pieces its pass placed, and changes its own pass. The main session runs the protocol below. It does not judge, and it edits nothing but `judgements/075-run.md`, the shots and revert commits.

## The shots

Seed 1, 6 x 6, one-way as the plan view defaults. Base: `/?view=3d&city=plan&stage=assemble&seed=1`. Four street spots, each with `&cam=street`:

| Id | Spot |
| --- | --- |
| a | `&at=8,23&dir=%2Bx` |
| b | `&at=35,24&dir=-z` |
| c | `&at=83,27&dir=-z` |
| d | `&at=24,3&dir=%2Bz` |

- **Judged, every round:** each spot at `&era=ruin&light=night` and `&era=ruin&light=day`: 8 shots, named `<spot>-ruin-<night|day>.png`.
- **Reference, captured once in round 0 and never re-captured:** each spot at `&era=clean&light=day`: 4 shots, named `<spot>-clean-day.png`. The judge is told these are the clean city, never scored (X-1); they let it say which pieces an era added.
- Saved outside the repo (Synty's licence; the repo is public): `D:\rest-prototype-073shots\075\r<N>\`. The judgement files name these paths.

### Capturing a shot

The Claude browser pane's own screenshot tool draws the WebGL view as untextured grey boxes, so it is never used. Each shot is the page's own canvas at full resolution (recipe from `docs/handoff-2026-11-21.md`):

1. Start a background PowerShell `HttpListener` on `http://localhost:5301/` that saves each POSTed body (a `data:image/png` URL) as `<shots folder>\<name>.png`, and stops on `?name=stop`.
2. Open one URL at a time in the pane (the worktree's own dev server and port). Wait for the console line that starts `plan 3d:`: the models have swapped in.
3. In the page: `requestAnimationFrame(() => fetch('http://localhost:5301/?name=<name>', {method: 'POST', mode: 'no-cors', body: document.querySelector('canvas').toDataURL('image/png')}))`.
4. Check that the file exists and is not tiny before the next URL.

One heavy step at a time: no capture while a gate or test run is going.

## The protocol

0. **Round 0, set-up.** Branch `ticket/075-style-judge` from `goal/city-transformations`, in a worktree. One launch entry on its own port for that worktree. Start the `HttpListener` on 5301. Capture the 4 reference shots and the 8 judged shots into `r0\` (wait for the `plan 3d:` line each time; one URL at a time). Record the rubric's and this ticket's git hashes in `judgements/075-run.md` (main session), so a later edit to either is visible.
1. **Judge.** Spawn a fresh `style-judge` with the rubric path, the 12 shot paths of the round and the era. Nothing else. It writes `judgements/075-seed1-ruin-r<N>.md`.
2. **Stop?** If `below-bar: none`, the run ends: success. If this was round 3, the run ends as it stands.
3. **Route.** For each rule below the bar, the main session sends the judge's must-fix line, the rule's id, score and reason, and the evidence's shot path to the agent the rubric names (by the piece, when several). Each agent gets its own items in one message, with this ticket's section B as its file list. The main session adds nothing of its own to the items.
4. **Refine.** One agent at a time. Each changes only its folder, runs its own tests with `npx vitest run --maxWorkers=2 <its folder and pin test>`, commits on the branch with the round and the rule ids in the message (`075 r<N> S3: ...`), and reports. An agent that finds the fix needs a folder it does not own, or a check loosened, says so and stops on that item; the item is recorded as "not fixable in the pass" and is not retried.
5. **Gate.** The main session runs `npx tsc --noEmit && npx vitest run --maxWorkers=2` on the branch. Red: the round's agent whose commit broke it gets one try to fix it; still red, its commits for that round are reverted (`git revert`) and the run continues with the rest. Never a skipped or loosened test.
6. **Re-capture and re-judge.** Capture the 8 judged shots into `r<N+1>\` (the reference is not re-taken), then step 1 with a **new** judge. If the new overall is lower than the round before, that round's refinement commits are reverted, the shots of the better round are kept as the current ones, and the next round routes the better round's below-bar list again.
7. **After the run.** The main session writes `judgements/075-run.md`'s table (one row per round: the ten scores, the overall, below-bar, the commits), then the normal pipeline step 3 once on the branch: the code-reviewer and the playtester, given only `075-style-judge` and the branch. Then Josh is shown the run. Nothing merges without his word.

No human between rounds: the main session follows the protocol, it does not judge or edit, and Josh is not asked anything until step 7.

## What a refiner may and may not change

**What a refiner may change:** which kit keys its pass picks, how many and where, by the district's story values (X-6), within the rules every 073 section holds. **What it may not:** scale a piece (no piece scaled to fit, as for buildings), tint or re-material a piece (Q3), read the camera, the URL or the shot spots, edit the rubric or the shot list, change any clean stage folder, `src/city/history/`, `src/core/`, `src/render3d/` beyond its pin test, a clean digest, a clean check's threshold, or T-1 and T-2. An era's own layer digest may be re-pinned when its pass's output changes (as F1b2 did), with the old and new values in the commit message. "Fail, never patch": a rule that cannot reach the bar inside these limits stays below it, and the run says so.
