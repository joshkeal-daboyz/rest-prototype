ticket: 011-readable-failures (part C)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 2; round 1 is in `011-part-c-play.round1.md`.*

## What the ticket asked for, as I understood it
Hover prompts that explain things:
- A fusebox shows *Fuse ≤N* (no "carrying" figure, since there is no `fuseLoad`).
- A blown fuse shows *Blown fuse — Repair (fuse)* or *Blown fuse — Needs: fuse*.
- A lamp shows *Lamp, load N*.
- A dead junction shows *needs 2 wires* or *Repair (2 wires)*.
- Tests cover the prompt strings.

## Does the branch do it?
Round 2, at commit 4703fad. `src/play/prompt.ts` hasn't changed since round 1, so everything round 1 found correct in it still holds.

- **Round-1 must-fix (tests for the prompt strings) is done in bc05ba3.** All seven tests below pass in `src/play/play.test.ts` (verbose run). Each is named for a rule:
  - "a healthy fusebox shows its rating": `Fuse ≤5` and plain `Fuse` on an inline map, and `Fuse ≤3` on shrine.
  - "a lamp shows its load": `Lamp, load 3` and `Lamp, load 1`.
  - "a readable blown fuse with a fuse on hand offers Repair (fuse)".
  - "a readable blown fuse without one shows Needs: fuse".
  - "a readable dead lamp offers Repair (bulb) or shows Needs: bulb".
  - "a dead junction shows Needs: 2 wires, then Repair (2 wires) once two are on hand": this covers the plural form.
  - "an unreadable fault shows the healthy element's prompt, not the fault": an unreadable junction gives null, an unreadable dead lamp gives `Lamp, load 3`, and an unreadable blown fuse gives `Fuse ≤1`.
- **The unused `promptFor` import from round 1** is now used by these tests.
- **Test counts:** the full suite is 156/156 (up from 149), and `src/play` is 24/24.
- **Rename is done.** The test is now "hides an unreadable cable fault, shows a plain lamp by its load, and gives null for non-targets", which matches what it asserts.
- **BOM is removed.** The file's first bytes are `69 6D 70` ("imp").
- **4703fad** adds no-op `setInsets()` and `notify()` stubs to `fakeRenderer()`. They are test-only. `npm run typecheck` shows no errors in `src/play/`; the only error is the known one in `src/grid/grid.ts:157` (part D).

## Rule conflicts and risks
- The diff is still confined to `src/play/prompt.ts` and `src/play/play.test.ts`.
- No new dependency and no game rule added.
- The `setInsets`/`notify` stubs track the renderer branch's interface. If this branch merges before that one, they are harmless extra members on a fake, and typecheck is clean for `src/play/` here. Merge order is for the lead-architect to note.

## Must fix
none

## Could improve
1. The dead-junction "Repair (2 wires)" case and the unreadable-fault cases build a fake `GridState` by spreading the state and overriding `parts` or `readableFaults`, instead of reaching that state through grid actions. This is acceptable for a pure prompt function, but a real two-wire satchel on an inline map would test more.
2. The round-1 point about the flash still stands: the flash says "Needs: wire × 2" while the hover says "Needs: 2 wires". Josh should decide whether to unify them.

## Main session's response
agree. Merged into `main`. Could-improve 2 is Josh's call (the hover wording "Needs: 2 wires" reads better; unify on it unless he says otherwise).
