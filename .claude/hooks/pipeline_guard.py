"""PreToolUse guard for the rest-prototype pipeline (see CLAUDE.md).

Stops mistakes, not adversaries: the rules in CLAUDE.md are the real boundary.

Blocks, for every session and agent:
  * writing anything under puzzles/locked/ (Josh replaces locked puzzles himself)
Blocks, for any agent (main session excepted):
  * git merge / push / rebase onto main, gh pr merge, gh issue close: the main session does these on Josh's word
  * git branch -d/-D, git worktree remove/prune, git tag -d, git update-ref -d: only the main session deletes, on Josh's word
  * writing cleanups/ unless the agent is branch-cleaner, and the branch-cleaner writing anywhere else
  * writing reviews/ unless the agent is code-reviewer
  * writing playtests/ unless the agent is playtester
  * writing judgements/ unless the agent is style-judge, and the style-judge writing anywhere else (ticket 075)
  * the playtester writing src/, puzzles/ or tools/: it reports regressions, builders fix them
  * writing tickets/ unless the agent is lead-architect
  * adding dependencies (npm install <pkg>, npm add): needs a ticket Josh approved

Reads the hook input as JSON on stdin; prints a deny decision as JSON, or nothing to allow.
"""
import json, re, sys

REVIEWER = "code-reviewer"
ARCHITECT = "lead-architect"
PLAYTESTER = "playtester"
JUDGE = "style-judge"
CLEANER = "branch-cleaner"


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                             "permissionDecisionReason": f"Pipeline guard: {reason}"}}))
    sys.exit(0)


def check_shell(cmd, agent):
    c = cmd.replace("\\", "/")
    if re.search(r"(>>?|Set-Content|Out-File|cp|mv|copy|move|Copy-Item|Move-Item)\s[^|;&]*puzzles/locked/", c):
        deny("puzzles/locked/ is never written by agents or scripts. Josh replaces a locked puzzle himself.")
    if not agent:
        return
    if re.search(r"\bgit\s+(merge|push|rebase)(?![\w-])", c) or re.search(r"\bgh\s+pr\s+merge\b", c) \
            or re.search(r"\bgh\s+issue\s+close\b", c):
        deny("agents don't merge, push or close tickets. Report back; the main session does it on Josh's word.")
    if re.search(r"\bgit\s+branch\b[^|;&\n]*\s(-d|-D|--delete)\b", c) or re.search(r"\bgit\s+worktree\s+(remove|prune)\b", c) \
            or re.search(r"\bgit\s+tag\b[^|;&\n]*\s(-d|--delete)\b", c) or re.search(r"\bgit\s+update-ref\s+-d\b", c):
        deny("agents never delete branches, worktrees or tags. List it in the cleanup report; Josh decides.")
    # `npm install` / `npm ci` alone are fine; `npm install <package>` adds a dependency.
    m = re.search(r"\bnpm\s+(install|i|add)\b([^|;&\n]*)", c)
    if m and any(re.match(r"^[@A-Za-z]", a) for a in m.group(2).split()):
        deny("a new dependency needs a ticket Josh approved. Say what you'd add and why.")


def check_write(path, agent):
    p = path.replace("\\", "/").lower()
    if "/puzzles/locked/" in p or p.startswith("puzzles/locked/"):
        deny("puzzles/locked/ is never written by agents. A change is a new puzzle file.")
    if not agent:
        return
    if re.search(r"(^|/)reviews/[^/]+\.md$", p) and agent != REVIEWER:
        deny("only the code-reviewer agent writes reviews, so every review stays independent.")
    if re.search(r"(^|/)judgements/[^/]+\.md$", p) and agent != JUDGE:
        deny("only the style-judge agent writes judgements, so every score stays independent.")
    if agent == JUDGE and not re.search(r"(^|/)judgements/[^/]+\.md$", p):
        deny("the style-judge writes only its judgement file under judgements/. It never edits the game.")
    if re.search(r"(^|/)cleanups/[^/]+\.md$", p) and agent != CLEANER:
        deny("only the branch-cleaner agent writes cleanup reports.")
    if agent == CLEANER and not re.search(r"(^|/)cleanups/[^/]+\.md$", p):
        deny("the branch-cleaner writes only its report under cleanups/. It never edits or deletes anything.")
    if re.search(r"(^|/)playtests/[^/]+\.md$", p) and agent != PLAYTESTER:
        deny("only the playtester agent writes playtests, so every playtest stays independent.")
    if agent == PLAYTESTER and re.search(r"(^|/)(src|puzzles|tools)/", p):
        deny("the playtester never edits the game. Report the regression; the builder fixes it.")
    if re.search(r"(^|/)tickets/[^/]+\.md$", p) and agent != ARCHITECT and not p.endswith("tickets/usage.md"):
        deny("only the lead-architect agent writes tickets. Ask for a re-cut instead.")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    tool, inp = data.get("tool_name", ""), data.get("tool_input", {}) or {}
    agent = data.get("agent_type") or None
    if tool in ("Bash", "PowerShell"):
        check_shell(inp.get("command", ""), agent)
    elif tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        check_write(inp.get("file_path") or inp.get("notebook_path") or "", agent)


if __name__ == "__main__":
    main()
