# 001 · Core schema, events, loader

owner: lead-architect
status: review
branch: main (foundation; cut and built in the main session on 27 Oct 2026 because the project agents load at the next session start)

## Goal
Every other agent codes against one set of types. A puzzle file (panel or street) can be loaded and checked, and the editor can show every problem in a broken file.

## Acceptance criteria
- [x] `src/core/schema.ts` types every field in `puzzles/SCHEMA.md` draft 2, plus `FAULT_RULES` (fault → part, count, hold) and `DEFAULTS`. (typecheck)
- [x] `src/core/events.ts` names every event in SCHEMA.md and the brief, with payload types, and a typed `EventBus`. (typecheck)
- [x] `validatePuzzle` returns every error, not just the first; `loadPuzzle` throws with them all listed. (test)
- [x] Every `.json` in `puzzles/` validates. (test)
- [x] Semantic checks: exactly one feed; line endpoints are nodes; ids unique across nodes and lines; lamps are leaves; a fault's kind matches what it sits on; one fault per spot; switch outputs are lines leaving the switch; starting parts fit the satchel. (test)

## Files
`src/core/`

## Interfaces
Defined here, read by everyone.

## Open questions
none
