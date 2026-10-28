# Review of the agent pipeline in rest-gdd

*Reviewed 27 October 2026: `CLAUDE.md`, `.claude/agents/forge-asset-generator.md`, `.claude/agents/forge-prompt-reviewer.md`, `.claude/hooks/forge_guard.py`, `.claude/settings.json`, `art/tools/forge_jobs.py` (structure and gates), and the job records in `art/jobs/`.*

## Verdict

The Forge art pipeline is more disciplined than most production content pipelines. Its shape is right and worth copying for code: a **generator** that cannot judge its own work, an **independent reviewer** that sees only the brief, a **main session** that settles the review and talks to Josh, and **Josh's own words** recorded at every decision (approve, verdict, lock). The script enforces the order with hashes and markers, and the hook stops the shortcuts the agents would otherwise take. The job history shows it working: 18 jobs, each with a brief, a review, a verdict in Josh's words, and lessons written back into the character's rules file.

Two things need attention: the written rules have drifted from practice (hand edits), and the loop lives in `CLAUDE.md`, where every session pays for it.

## What works

- **Role separation with teeth.** The generator's file says "you don't review, approve or judge"; the hook makes it true (`agent_type` check on `approve`, `verdict`, `respond`, `status`, `lock`, and on writing `prompt-review*.md`).
- **The brief as the reviewer's only input.** `brief` writes everything the reviewer may read, including measured numbers from earlier jobs, so the reviewer does not open old images to "explore". That controls both independence and token cost.
- **Must fix / Could improve** with a 3-round cap and "a review that keeps finding new things never settles". The `female-raccoon-001-teal-colour-wording` job has five review rounds, which is presumably why the cap and the "don't undo an earlier round" rule were added (commit `105eda4`). Good: the pipeline learned from its own history.
- **`job_hash` over the job and every input file**, so a change after approval invalidates the approval. Simple and complete.
- **Small jobs first**, and a large job only after an on-track small one on the same track. This is the single rule most likely to have saved tokens and GPU time.
- **`set` through a JSON parser** instead of hand edits to `job.json`, with `fields` as the schema. The hook blocks the hand edit and tells you the right command.
- **Busy markers with a 90-minute stale rule** for two sessions in one folder.
- **Lessons flow back.** Each verdict adds to "What his/her jobs have taught us" in the rules file, and `explain` warns about known failure causes. The pipeline gets better per job without anyone re-reading old reviews.

## Findings

### 1. The written rule and the practice disagree on pixel edits (medium)

`CLAUDE.md` says "No pixel edits by script or by hand" with no exception. `art/asset-status.json` records a Photoshop edit by Josh that was locked (`job: null`, "Change lock so it can lock my Photoshop edits"), and a rejected "pixel-edit exception result". The practice is sensible: the creative director may hand-edit, agents may not. Write it down: *Josh may edit pixels in Photoshop; agents never do. A hand edit is locked with `lock --chat` like any other image and its provenance (source job and seed) is recorded.* Otherwise an agent reading the rule will refuse to help with a hand-edit workflow, or worse, decide the rule is negotiable.

### 2. The loop lives in `CLAUDE.md`, so every session pays for it (medium)

`CLAUDE.md` is ~5 KB of Forge procedure, loaded into every session in the repo, including ones that only edit the GDD. Move the eight-step loop into a skill (`.claude/skills/forge-job/SKILL.md`) or a command, and leave `CLAUDE.md` with the hard rules and a pointer. The agents already hold their own instructions, so the main session only needs the orchestration steps when it is orchestrating.

### 3. The hook is a guardrail, not a wall; say so (low)

`forge_guard.py` catches the obvious routes: named scripts in `art/tools/`, Forge's generate endpoints, inline PIL/cv2 with a save call, writes to `state.json`. It does not catch a script written elsewhere that imports PIL, `py -c` with the save split across statements, or a copy of an old tool under a new name. That is fine for cooperative agents, and `CLAUDE.md` already says "if it blocks you, follow its message". Add one line to the hook's docstring: it stops mistakes, not adversaries, and the rules in `CLAUDE.md` are the real boundary.

Also worth a note: the reviewer-only write check keys on `agent_type` in the hook input. It works today (reviews exist, written by the reviewer). If a Claude Code update renames or drops that field, the check fails *closed* for the reviewer (`agent != REVIEWER` when `agent` is `None`), so the symptom would be the reviewer being unable to write its review. Easy to recognise; just know it.

### 4. The code crew in the GDD does not exist yet (medium)

`docs/11-ai-architecture.md` names ten prototype agents. The repo holds two, both for art. The prototype repo is where the code crew is established, and the Forge pipeline's shape should carry over:

| Forge pipeline | Code pipeline (this repo) |
| --- | --- |
| `forge-asset-generator` drafts a small job | a builder agent implements one ticket on a branch |
| `brief` writes the reviewer's only input | the ticket plus the diff is the reviewer's only input |
| `forge-prompt-reviewer` writes `prompt-review.md` | `code-reviewer` writes `reviews/<ticket>.md` in the same must-fix / could-improve form |
| main session `respond agree|disagree` | main session settles must-fix items, 2 rounds max |
| Josh `approve --chat "his words"` | Josh says "merge" in chat; the main session merges and records his words in the merge commit |
| `lock` an image | copy a puzzle into `puzzles/locked/` on Josh's word |

The crew files in [`.claude/agents/`](../.claude/agents/) do this. See [`CLAUDE.md`](../CLAUDE.md) for the loop.

### 5. Model tiers are right (no change)

Generator on Sonnet (mechanical: compose a job, run the script, read outputs), reviewer on Opus (judgement). The same split is used here: builders on Sonnet, reviewer and architect on Opus, UI on Haiku.

### 6. Small things

- `settings.json` matches `Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit`. Good coverage. If the main session ever uses `Agent`-spawned shells with other tool names, add them.
- `.gitignore` keeps `out/` images local and commits every record. Right call; the repo is already 9 MB from three locked PNGs.
- The generator reads up to two outputs from each of the last two jobs, plus the reference sheet: roughly five images per draft. That is the main token cost. The written notes in `state.json` are already doing the work for older jobs; consider dropping to one output per earlier job.
- `forge_jobs.py` is 65 KB in one file. It works and it is well documented at the top; split it only if someone other than the main session has to edit it.
