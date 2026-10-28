# Hand-off for the next session

*Written 28 Oct 2026 by the session that set the pipeline up (Fable). The next orchestrator runs on Sonnet; the agent files keep their own models.*

## Where things stand

- **Playable:** `npm run dev` → six maps in the picker: shrine-circuit, where-it-stops, behind-the-first, not-enough-for-all, battery-run, which-fuse (012 D, if merged). Nothing in `puzzles/locked/` yet; every map note has an empty or partial **What it taught us** for Josh's verdict in his words.
- **Mechanics on `main`:** power routing with breakers and switches; faults hide faults; parts bulb/fuse/wire; capacity brownout; fuse rating with the blow naming its culprit; battery with relay switches; every readable fault signals; the shock-to-culprit-then-pop sequence; load shown by bulb count and brightness; event notices; hover explanations; fuse load bar (012 B).
- **Tests:** ~200 Vitest tests; `npm run gate` = typecheck + tests; CI on push.
- **Tickets:** `tickets/` — 001–011 done; 012 in flight or done (check its `status:`); 006 is the housekeeping backlog (countedLit, dispose, ignored-click log, the per-click log parse behind the relay notice, notice wiring in `main.ts`, junction stub angles, flash wording); 007 is folded into 011.
- **Reviews:** `reviews/`, one per ticket part, round files archived.

## How the loop runs (short form; `CLAUDE.md` is the rule)

1. Josh asks → **lead-architect** cuts a ticket (one owner per part; Josh's words quoted as the spec) → Josh approves (G1, in his words).
2. One builder agent per part, each in its own worktree (`Agent` tool, `isolation: "worktree"`), in parallel when their folders don't overlap. Cross-part interfaces: a ticket can allow a types-only stand-in file; the real file wins at merge (`git checkout --ours`).
3. **Gate before review**: `npm run gate` on the builder's branch in a detached scratchpad worktree. Red → back to the builder, no review tokens.
4. **code-reviewer** gets only the ticket id and branch. Must-fix items go back to the *same* builder (SendMessage keeps its context); then a round-2 review with the *same* reviewer. Two rounds max.
5. Merge to `main` (or an integration branch when later parts need an earlier part), run the gate on `main`, push. Puzzles merge after the designer's own simulator verification; Josh's play is the gate for puzzles, lock is his word.
6. Browser check in the pane (`preview_start` with the `dev` config in `.claude/launch.json`), then hand to Josh with what to look at.

## Things the next session should know

- **The crew loads natively** in a fresh session (`.claude/agents/*.md`). Use the real agent types (`grid-simulator`, `renderer`, `interaction`, `ui`, `puzzle-designer`, `code-reviewer`, `lead-architect`). The hook then lets the reviewer write `reviews/` itself and the architect write `tickets/`; nothing needs copying by hand.
- **Agents can't `git merge`/`rebase`/`push`** (hook). When a builder's worktree is behind, the orchestrator merges `main` into it: `git -C <worktree> merge main`.
- **The main session writes no feature code.** Josh stopped it once; see memory. Architect output (`src/core/` types, `SCHEMA.md`, tickets) is fine.
- **Every reviewer catch so far** came from reading the rule, not the code: a battery-lit win, "new under this fuse", tests reported but not committed, a dead end with no spare part. Keep the reviewer on Opus.
- **Josh's design calls on record** (SCHEMA.md "Rules the simulator derives"): a battery never wins a job; every readable fault signals; a trap must be readable and recoverable; load reads by size and brightness.
- Open design questions for Josh: Reset during the Relight; *Needs: wire × 2* vs *Needs: 2 wires*; whether the whole battery-fed section glows amber; a load bar on the feed; 3× brightness too much?
- The `.claude/worktrees/` folder holds finished agent worktrees; `git worktree prune` and deleting the folders is safe once their branches are merged.
