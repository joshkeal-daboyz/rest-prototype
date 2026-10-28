ticket: 011-readable-failures (part C)
assessment: partly
must-fix: 1

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 1.*

## What the ticket asked for, as I understood it
Hover prompts that explain things. A healthy fusebox shows *Fuse ≤N* (plus "carrying X" only if `fuseLoad` exists, and it doesn't here). A blown fuse shows *Blown fuse — Repair (fuse)* or *Blown fuse — Needs: fuse*. A lamp shows *Lamp, load N*. Part B1 adds *Dead junction — needs 2 wires* / *Repair (2 wires)*. Tests must cover the prompt strings.

## Does the branch do it?
- **The strings are right in code** (`src/play/prompt.ts`):
  - `promptFor` now puts `FAULT_LABEL[kind] — ` in front of each fault prompt, so you get "Blown fuse — Repair (fuse)", "Blown fuse — Needs: fuse", "Dead junction — Needs: 2 wires" and "Dead junction — Repair (2 wires)".
  - B1 asks for a lowercase "needs 2 wires". The code uses "Needs:" so it matches the fuse pattern. That is a reasonable reading.
  - A new `infoPrompt` gives "Lamp, load N" (falling back to `DEFAULTS.lampLoad`) and "Fuse ≤N". A fusebox with no rating shows plain "Fuse", which fits "absent = never blows".
  - The "carrying X" form is correctly left out, because `fuseLoad` is not in `GridState`.
- **Plurals:** `count > 1 ? "${count} ${part}s" : part` gives "fuse", "wire" and "2 wires". It's naive but right for every part in use.
- **Unreadable fault:** `intentFor` returns null for an unreadable fault, so the hover falls through to `infoPrompt`.
  - An unreadable dead lamp reads "Lamp, load N" and an unreadable blown fuse reads "Fuse ≤N", the same as a healthy element.
  - An unreadable cable or junction reads null.
  - Nothing reveals the fault, so this is a sound reading of the ticket. No test pins it, though.
- **The flash string is separate:** `play.ts:81` still uses `needsText`, which is unchanged and gives "Needs: wire × 2". The hover prompt is suppressed while the flash shows and after the job completes (`play.ts:131`, `prompt.ts:34`).
- **Tests:** these are the gap.
  - Only three existing assertions changed (dead junction, damaged cable, and "shrine" becoming "Lamp, load 1").
  - Nothing tests "Fuse ≤N", either blown-fuse prompt, a load above 1 ("Lamp, load 3"), the unreadable-lamp or unreadable-fuse fallback, or the singular "Repair (fuse)".
  - A `promptFor` import was added to `play.test.ts` but nothing uses it, which suggests the intended direct tests were dropped.
  - The test named "gives no repair prompt … and null for anything else" now asserts a non-null lamp prompt, so its name no longer matches what it checks.
- `npm test`: 149/149 pass. `npm run typecheck` shows no errors in `src/play/`; the only error is the known one in `src/grid/grid.ts:157` (part D).

## Rule conflicts and risks
- The diff touches only `src/play/prompt.ts` and `src/play/play.test.ts`, inside the ticket's folders.
- No new dependency and no game rule added. It only reads `FAULT_RULES`, `DEFAULTS` and the node fields.
- Commit dd67ba0 ("Fix test string encoding") added a UTF-8 BOM to the top of `play.test.ts`. It's harmless to vitest but noisy.

## Must fix
1. In `src/play/play.test.ts`, add `promptFor` tests named for the rules, using an inline puzzle or `battery-run`:
   - "a healthy fusebox shows its rating" → `Fuse ≤1`
   - "a readable blown fuse with a fuse on hand offers Repair (fuse)" and "… without one shows Needs: fuse"
   - "a lamp shows its load" with load 3 → `Lamp, load 3`
   - "an unreadable fault shows the healthy element's prompt, not the fault" (dead lamp or blown fuse)

   This meets the "Tests for the prompt strings" criterion and uses the import that is currently unused.

## Could improve
1. Rename the test "gives no repair prompt for an unreadable fault, and null for anything else" so it matches what it now asserts.
2. Remove the BOM that dd67ba0 added to `play.test.ts`.
3. The hover says "Needs: 2 wires" but the flash says "Needs: wire × 2". Consider bringing `needsText` into line with the hover wording; that's a UI call for Josh.

## Main session's response
agree. The builder reported five tests that are not in the branch; sent back with the must-fix plus could-improve 1 and 2 (the rename and the BOM, since the file is being rewritten anyway). Could-improve 3 is Josh's call.
