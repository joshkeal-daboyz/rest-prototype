ticket: 012-fuse-load-bar (part C)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
When the player hovers a fusebox, it shows its rating and its live load. Rated fuses read "Fuse ≤3 — carrying 2", or "Fuse ≤3 — at the limit" when the load equals the rating. Unrated fuses read "Fuse — carrying 2". It needs tests.

## Does the branch do it?
- **The three strings:** `src/play/prompt.ts` `infoPrompt` builds them exactly as the ticket gives them: `Fuse ≤${rating} — carrying ${n}`, `Fuse ≤${rating} — at the limit` and `Fuse — carrying ${n}`. Each uses the em dash and the ≤ sign. The load comes from part A's `state.fuseLoad`, so it is the same number the blow check uses.
- **"At the limit" at equality:** the check is `carrying >= rating`. The `>` case can't happen in a stable state because the fuse would already have blown, so this is the same as testing for equality. Tests:
  - "a fusebox carrying exactly its rating reads 'at the limit'" uses the real simulator: an inline map at ≤3 carrying 3.
  - "shrine-circuit: fb_A carries 3 of ≤3, so it is at the limit" checks the same thing on a real map.
- **Unrated form:** tested by "an unrated fusebox shows what it is carrying, with no rating". It reads "Fuse — carrying 3" from the real simulator.
- **Blown fuse that the player can't read yet:** it shows "Fuse ≤1 — carrying 0" (the existing test was updated). Part A defines the blown load as 0. A healthy fuse with no power also reads "carrying 0", so the hover can't tell the two apart and doesn't give the fault away. It is also a true reading: a blown fuse really carries nothing. The darkness downstream is the clue, the same as before this change.
- **Fuses the player can read:** a blown fuse they can see is unchanged. It still gets its fault/action prompt, because `infoPrompt` only runs when there is no intent.
- **Tests and count:** the tests are named for rules. I ran `npm test` on 20238e1: 201 pass across 11 files, and play.test.ts has 25. The typecheck fails only on the known part-B error in `src/render/render.test.ts`.
- **Scope:** the diff is limited to `src/play/prompt.ts` and `src/play/play.test.ts`.

## Rule conflicts and risks
None found. `src/play/` only reads `fuseLoad`, so grid/night purity is untouched, and there are no new dependencies.

## Must fix
None.

## Could improve
1. **Unpowered test:** "an unpowered fusebox reads carrying 0" (`src/play/play.test.ts`) builds its state by hand with `fuseLoad: new Map([["fb", 0]])` rather than taking it from a real unpowered grid (for example with the breaker open). It still tests the formatting, but a grid-derived case would prove that a fuse with no power reads 0 end to end.
2. **Missing-entry fallback:** `?? 0` in `infoPrompt` quietly hides a fusebox that has no `fuseLoad` entry. Part A promises every fusebox has an entry, so this is harmless. A missing entry would just show as "carrying 0" rather than failing loudly.

## Main session's response
agree. Merged onto `proto/012`.
