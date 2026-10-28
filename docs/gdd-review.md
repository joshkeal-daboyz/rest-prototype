# Review of the Rest GDD

*Reviewed 27 October 2026 against [joshkeal-daboyz/rest-gdd](https://github.com/joshkeal-daboyz/rest-gdd) at commit `f6e5ea3`.*

## Verdict

This is a strong GDD, well above the assignment's bar. It is specific to one game, written from the player's seat, honest about what is Decided and what is Draft, and it already contains the three things most first drafts lack: a cut list in order, acceptance criteria that can be measured, and event contracts between agents. The two-tier structure (README as the short GDD, `docs/` as the long one) is exactly what the course asked for, and the compliance checklist maps every rubric line to a section.

The main weakness is the one the GDD itself names in its design-risks table: **the core loop may not be fun on its own**, because the fault-finding puzzle is not yet a puzzle. That is the right thing to attack with a 2D prototype, and this review is organised around it.

## What works

- **Player-facing writing.** §2 of the README opens on a dark street and stays there. Every agent sentence ends with what the player sees. This is the rubric's hardest criterion and the GDD meets it throughout.
- **Decided / Draft tags** on every claim. Agents can trust the Decided ones and are told not to touch them.
- **The event contract** (`grid:changed`, `repair:completed`, `breaker:thrown`, `job:completed`, `player:shocked`) and the rule that the Lighting Director only listens to events, never reads grid code. This is the right architecture and it is explained in terms of the game (the Relight can be reworked at G4 without touching the simulation).
- **The cut list** with "never cut" core, and the note that a cut also cuts its acceptance criterion and its onboarding beat.
- **The night clock on game time**, with the pause rules and the capped step. Small, correct, and most first drafts get it wrong.
- **The cold playtest** as the measurement of "without help", with one question at the end. Good instrument.
- **Favor as "faith on the surface and a ledger underneath"**: the economy carries the theme without a line of dialogue.

## Findings, in priority order

### 1. The puzzle is a walk, not a deduction (design, high)

The GDD says the puzzle "is in finding faults and planning the part economy, not in the repair itself." But as written, finding a fault on Lamp Row is: raise the lamp, follow the pulses until they stop, read the signature. Each of the three signatures maps 1:1 to a part. There is no moment where the player has to reason about two possibilities. The things that would make it a puzzle are mostly deferred:

- switches and rerouting (MVP),
- capacity and choosing what stays dark (Chapter One),
- ambiguous dark sections (not designed anywhere yet).

What *is* in the prototype that works as a puzzle: the hidden fuse box (a repaired bulb that stays dark tells you to look upstream), the two-trip satchel (what to carry), breaker distance (walk or risk a live repair), and the one-fuse-box-feeds-many-lamps question. These are good seeds. The prototype should find out which of them produce real thought, and the 2D game is the cheapest place to do that.

**Suggestions for puzzle ideas to test** (all fit the existing fiction and fault types):

- *Shared fuse.* One fuse box feeds three dark lamps. Is it the fuse, or three bulbs? Reading the pulses into and out of the box answers it, and a player who guesses carries the wrong parts.
- *Ambiguous dark.* Everything past a blown fuse is dark and unreadable. The player must decide: fix the fuse first and come back, or bring bulbs on spec. Make the right call differ between puzzles.
- *Ring circuit with a switch.* A loop fed from two sides, with a switch choosing the side. A fault's position is only clear after flipping the switch and reading again.
- *Breaker partitioning.* Several breakers; which one to throw so you can work safely while the lamps you have already relit stay on (matters once Drafts fear light).
- *Decoy wiring.* Decorative wire the GDD says looks "clearly different"; test whether players can tell.
- *Capacity, small.* Five lamps, power for three. Even in the prototype, a tiny version shows whether choosing is interesting.

Recommend adding a `docs/13-puzzle-design.md` once the prototype has results: the vocabulary of puzzle elements, how each teaches, and a difficulty ladder.

### 2. Lamp Row's numbers lean toward busywork (design, high)

Eight faults, five of which are dead lamps needing a bulb and a 2-second hold. The street is a one-minute walk end to end. Jobs are meant to take two nights, enforced by a 4-part satchel against 8 parts. Put together: night two is mostly walking back to the same street to do five identical repairs. Consider fewer, more varied faults (for example 3 bulbs, 2 fuses, 1 cable, 1 that is not what it looks like), or make the second night reveal something the first could not (the hidden fuse box is a start).

Also check the salvage arithmetic: six spots give 6 parts a night, into a 4-slot satchel, so even salvaging forces a drop-or-offer round trip to the stall. That may be intended (it teaches the stores), but say so.

### 3. Dawn may never happen on Lamp Row (design, medium)

A 15-minute night on a street that takes a minute to cross means most players finish, or run out of parts, long before dawn. The acceptance criterion "a player who loses to dawn understands why" cannot then be tested in the prototype. Options: a shorter first night (6–8 minutes), or a scripted first dawn (the mentor's "look first, come back ready" becomes literal). The prototype can measure how long players actually take.

### 4. Series or parallel: decide what blocks power (design and simulation, medium)

The GDD says "a fault anywhere upstream darkens everything downstream" and "faults hide faults", but also that one fuse box is "hidden until a dead lamp beyond it is fixed". These only agree if lamps are leaves (a dead lamp does not block the run) and in-line nodes (fuse boxes, breakers, switches, cable) do block. Make that explicit in the grid schema: `lamp` is an endpoint; `fusebox`, `breaker`, `switch`, `junction` and lines conduct unless faulted. Otherwise a run of lamps in series reveals one fault per breaker cycle, and the player walks to the main breaker six times.

### 5. The Grid Simulator owns two jobs (architecture, medium)

"One agent, one job" is a stated principle, but the Grid Simulator owns power flow *and* the night: the dawn timer, pause, the shock count, and death rollback. Repair Interaction emits `player:shocked` while the Grid Simulator counts shocks. Keep both as pure, tested logic, but as two modules (`grid/` and `night/`) with their own tests, even if one agent owns both in the prototype. The 2D prototype can build them that way so the 3D game inherits the split.

### 6. The grid schema is the most reusable thing in the project and it does not exist yet (architecture, medium)

`levels/*.grid.json` is read by three agents and written by the Level Builder, "approved by the Creative Director". But the grid is puzzle design, not level dressing, and nobody on the crew owns puzzle design. Recommend a **Puzzle Designer** role that owns `*.grid.json`, with the Level Builder owning only `*.layout.json` (where the pieces go). The 2D prototype should define the schema and ship puzzles in it, so the 3D game loads the same files. (A draft schema is in this repo at [puzzles/SCHEMA.md](../puzzles/SCHEMA.md).)

Small fix: the contracts table in `docs/11-ai-architecture.md` is missing the "Read by" cell on the `*.grid.json` row.

### 7. The art pipeline in the GDD is out of date (consistency, medium)

The GDD still says Enoch is "drawn by hand" and "photographed for Tripo" (README §4, `docs/08`, `docs/12`). The repo now makes his reference sheets in Stable Diffusion Forge through a reviewed job pipeline, and his locked sheet is a Forge image plus a Photoshop edit. Update the three places, and say what Tripo will actually receive (the locked front/side/back sheet). The style guide and `art/` are a real asset; the GDD should point at them.

### 8. Input inconsistency (consistency, low)

README §2 says the player "clicks and holds" to repair; the controls table says **E** is interact/repair and **left click** is the live-repair timing check. Switching from a held key to a mouse click mid-repair is awkward. Pick one: hold E, and press E again for the timing mark.

### 9. Token budget is optimistic (feasibility, low)

2.6M tokens for a 3D prototype on a stack the developer has not used is probably 2–3× low; Player Controller at 500K (Tripo rig, Mixamo retarget, custom climb, camera in tight streets) is the line most likely to blow. The GDD says the estimate will be wrong and that usage will be recorded, which is the right posture. The 2D prototype gives a real measurement for the Grid Simulator, Repair Interaction and UI lines before any 3D token is spent.

### 10. Technical risks that are named correctly

Tripo's auto-rig plus Mixamo animations on a non-human body (tail, digitigrade feet) is the single biggest technical risk, and the GDD timeboxes it to one evening with a fallback. The 8-light rule, half-res bloom, Draco, the 1050 test machine: all sensible. No change needed; just hold the timebox.

### 11. Housekeeping (low)

- `course/compliance-checklist.md` still has the submission items unchecked and the 20 October date; mark it submitted or move the checklist to a "submitted" note.
- README §1 says "the horror is in what you slowly understand"; §2 of `docs/02` says the same. Fine, but the README is at its 5-page limit, so cut repeats first if anything must be added.
- `docs/05` lists Insulators, Panels and Components in the parts table for Chapter One; mark them "Chapter One" inline so an agent building the prototype does not implement six part types.

## What the 2D prototype should answer

1. Which puzzle elements produce deduction rather than walking? (Finding 1)
2. How many faults, of what mix, make one street feel like a job and not a chore? (Finding 2)
3. How long does a night actually take, and does dawn ever arrive? (Finding 3)
4. Do leaves-vs-in-line rules make the grid readable? (Finding 4)
5. Is the satchel/favor economy a planning puzzle or friction? (Finding 2)
6. A real token count for the grid, repair and UI agents. (Finding 9)

Each of these is a line in [the prototype brief](prototype-brief.md).
