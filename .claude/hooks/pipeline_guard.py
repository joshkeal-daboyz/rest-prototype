"""PreToolUse guard for the rest-prototype pipeline (see CLAUDE.md).

Stops mistakes, not adversaries: the rules in CLAUDE.md are the real boundary.

Blocks, for every session and agent:
  * writing anything under puzzles/locked/ (Josh replaces locked puzzles himself)
Blocks, for any agent (main session excepted):
  * git merge / push / rebase onto main, gh pr merge, gh issue close: the main session does these on Josh's word
  * writing reviews/ unless the agent is code-reviewer
  * writing tickets/ unless the agent is lead-architect
  * adding dependencies (npm install <pkg>, npm add): needs a ticket Josh approved

Reads the hook input as JSON on stdin; prints a deny decision as JSON, or nothing to allow.
"""
import json, re, sys

REVIEWER = "code-reviewer"
ARCHITECT = "lead-architect"


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
    if re.search(r"\bgit\s+(merge|push|rebase)\b", c) or re.search(r"\bgh\s+pr\s+merge\b", c) \
            or re.search(r"\bgh\s+issue\s+close\b", c):
        deny("agents don't merge, push or close tickets. Report back; the main session does it on Josh's word.")
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
