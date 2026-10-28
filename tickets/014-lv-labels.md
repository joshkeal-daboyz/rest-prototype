# 014 · Lv labels: "Lv3 Fuse", "Lv2 Lamp", "Lv4 Powersource"

owner: renderer (A), interaction (B), ui (C)
status: done (merged; Josh: "merge")
branch: ticket/014-lv-labels (one branch per part: `ticket/014-lv-labels-a`, `-b`, `-c`)

## Josh's words
"fuse boxes, instead of 'Load <X' just say 'LvX Fuse' it's easier for less technical users to understand. 'LvX Lamp' and 'LvX Powersource'."

## Goal
Every number the player sees for a fuse's rating, a lamp's load or the feed's capacity is shown as a **level** on a named thing: *Lv3 Fuse*, *Lv2 Lamp*, *Lv4 Powersource*. A player who doesn't think in "load ≤3" reads the map as "a Lv2 lamp won't fit through a Lv1 fuse". Words on screen only: no numbers, rules, schema fields or file contents change (`load`, `rating`, `capacity` stay the names in JSON, code and SCHEMA.md).

## The vocabulary (all parts use exactly these strings)
- A fixed number on a thing is a **level**, written `Lv<N> <Thing>` with no space between `Lv` and the number: `Lv2 Lamp`, `Lv3 Fuse`, `Lv4 Powersource`.
- A **live** total (what is flowing now) is a plain number against the level: `using 3 of 4` (powersource), `carrying 2 of 3` (fuse). Never "load".
- No level when there is no limit: an unrated fusebox is just `Fuse`; `capacity: null` is just `Powersource`, with `(no limit)` where a total is shown.
- Non-integer numbers print as the simulator gives them (no rounding change).

| Where | Now | After |
| --- | --- | --- |
| Map, lamp caption (A) | `load 2` | `Lv2 Lamp` |
| Map, fusebox caption (A) | `load ≤3` | `Lv3 Fuse` (unrated: no caption, as now) |
| Map, feed readout (A) | `load 3 / 4`; alarm `! load 5 / 4 !` | `Lv4 Powersource` and `using 3 of 4`; alarm `! using 5 of 4 !` (null: `Powersource` and `using 3`) |
| Hover, healthy lamp (B) | `Lamp, load 2` | `Lv2 Lamp` |
| Hover, healthy fusebox (B) | `Fuse ≤3 — carrying 2` / `Fuse ≤3 — at the limit` / `Fuse — carrying 2` | `Lv3 Fuse — carrying 2 of 3` / `Lv3 Fuse — at the limit` / `Fuse — carrying 2` |
| Hover, re-blow warning from 013 C (B) | `Blown fuse — Repair (fuse) · would blow again: 2 load on ≤1` (or `Needs: fuse · …`) | `Blown fuse — Repair (fuse) · would blow again: 2 on a Lv1 Fuse` (or `Needs: fuse · …`) |
| HUD readout (C) | `Load 3 / 4` · `Brownout`; `Load 3 (no limit)` | `Lv4 Powersource — using 3 of 4` · `Brownout`; `Powersource — using 3 (no limit)` |
| Notice, fuse blew (C) | `Fuse blew: 2 load through a ≤1 fuse` | `Lv1 Fuse blew: carrying 2` |
| Notice, brownout (C) | `Brownout: load 5 over capacity 4` | `Brownout: Lv4 Powersource using 5 of 4` |

## Acceptance criteria
- [ ] **A (renderer):** the three map captions in the table, built once per map (feed's live line rebuilt only when `load`/`capacity` change, as now; no per-frame string allocation). The fuse caption still sits clear of the load bar from 012 (`src/render/fusebar.ts`'s offset comment updated). Test: a pure label helper (e.g. `lampCaption(load)`, `fuseCaption(rating)`, `feedCaption(load, capacity)` in `src/render/`) returns each string in the table, including unrated and null. Josh checks in the browser that captions don't overlap on `which-fuse` and `ladder-36-whole-ward`.
- [ ] **B (interaction):** `src/play/prompt.ts` returns each hover string in the table, including the 013 C would-blow-again text. Tests in `src/play/` for every row (lamp; fusebox carrying, at limit, unrated; blown fuse would blow again, with and without a fuse in hand). Existing prompt tests updated to the new strings, not deleted.
- [ ] **C (ui):** `capacityReadout` and `noticeFor` in `src/ui/logic.ts` return the HUD and notice strings in the table (brownout still added as text, never colour alone). Tests in `src/ui/logic.test.ts` for each, including null capacity and brownout cleared (no notice).
- [ ] All parts: no change to any number, rule, event payload, or file in `puzzles/`. `npm run gate` green; test count grows.

## Files
- A: `src/render/` only.
- B: `src/play/` only.
- C: `src/ui/` only.

## Sequencing (013 is building now on `ticket/013-spring-switches`)
- **C can start at once**, branched from `main`: 013 doesn't touch `src/ui/`.
- **B starts after 013 C merges**: 013 C is writing the would-blow-again prompt in `src/play/prompt.ts` right now. Branch B from `main` after that merge and reword the merged text; don't edit 013's branch.
- **A starts after 013 B merges**: 013 B is editing `src/render/map-renderer.ts` (the spring ribbon). Branch A from `main` after that merge.
- Ticket 015's display parts use this vocabulary, so 015 B–D come after the matching 014 part.

## Interfaces
None new. No `src/core/` change, no new dependencies. When this merges the lead-architect adds a "Player-facing words" line to `puzzles/SCHEMA.md` (`load` → *LvN Lamp*, `rating` → *LvN Fuse*, `capacity` → *LvN Powersource*) so design notes and the analyzer can say both.

## Open questions
- The live totals: is `using 3 of 4` / `carrying 2 of 3` clear enough, or does Josh want them as levels too (`Lv3 of Lv4`)? Cut as plain numbers so "Lv" always means a fixed thing.
- Should fault hovers name the level too (`Blown Lv1 Fuse — Repair (fuse)`, `Dead Lv2 Lamp — Repair (bulb)`)? Not cut; cheap to add in B if Josh wants it.
- Josh wrote "Powersource" as one word; cut that way. Say if it should be "Power source".
