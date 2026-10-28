# 017 · One place for the Lv words

owner: lead-architect (0), renderer (A), interaction (B), ui (C)
status: done (merged; Josh: "Merge both, push")
branch: one per part; part 0 is `ticket/017-words`, then `-a`, `-b`, `-c`

## Josh's words
On the 014 review's could-improve item 3: "fix these as well: ... The 'Lv' wording is written separately in three folders. A later ticket could keep it in one place so the parts can't drift apart."

## Goal
The level vocabulary from ticket 014 (`Lv2 Lamp`, `Lv3 Fuse`, `Lv4 Powersource`, `using 3 of 4`, `carrying 2 of 3`) is built in exactly one pure module, `src/core/words.ts`, and the map captions, the hover text and the HUD/notices all ask it for those words instead of writing them. Nothing the player sees changes except the one string Josh asked for (see **Josh's answers**): every other string reads exactly as on `main` today. Changing a word later (or adding 015's "which powersource" words) is one edit in one file, pinned by one test file.

## What moves (from `main` as of `2a9ef2a`)
Only the **level names** and the **live-total formats** move. The framing around them (the ` — ` dash, `! … !`, `Brownout: `, ` blew: `, ` · would blow again: `, `at the limit`, ` · Brownout`) is used in one place each and stays where it is.

| File | Function | String today | Built from, after |
| --- | --- | --- | --- |
| `src/render/labels.ts` | `lampCaption(load)` | `Lv${load} Lamp` | `lampLabel(load)` |
| | `fuseCaption(rating)` | `Lv${rating} Fuse`; `""` when unrated | `fuseLabel(rating)`; the `""` for unrated stays in `fuseCaption` (no caption is a map decision, not a word) |
| | `feedName(capacity)` | `Lv${c} Powersource` / `Powersource` | `powersourceLabel(capacity)` |
| | `feedUsing(load, capacity)` | `using ${load} of ${c}` / `using ${load}` | `usingText(load, capacity)`; **no-limit form becomes `using 3 (no limit)`** (Josh's answer 2) |
| | `feedAlarm` | `! ${feedUsing(…)} !` | unchanged code (already goes through `feedUsing`); no-limit form becomes `! using 5 (no limit) !` |
| `src/play/prompt.ts` | `infoPrompt`, lamp | `Lv${load} Lamp` | `lampLabel(load)` |
| | `infoPrompt`, unrated fusebox | `Fuse — carrying ${c}` | `${fuseLabel(undefined)} — ${carryingText(c, undefined)}` |
| | `infoPrompt`, rated fusebox | `Lv${r} Fuse — at the limit` / `Lv${r} Fuse — carrying ${c} of ${r}` | `fuseLabel(r)` + ` — at the limit` / `carryingText(c, r)` |
| | `TEXT.wouldBlowAgain(load, rating)` | ` · would blow again: ${load} on a Lv${rating} Fuse` | ` · would blow again: ${load} on a ${fuseLabel(rating)}` |
| `src/ui/logic.ts` | `capacityReadout` | `Lv${c} Powersource — using ${load} of ${c}` | `${powersourceLabel(c)} — ${usingText(load, c)}` |
| | `capacityReadout`, null | `Powersource — using ${load} (no limit)` | `${powersourceLabel(null)} — ${usingText(load, null)}` (the `(no limit)` is now inside `usingText`; do **not** append `NO_LIMIT` again) |
| | `noticeFor`, `fuse:blown` | `Lv${rating} Fuse blew: carrying ${load}` | `${fuseLabel(rating)} blew: ${carryingText(load, undefined)}` |
| | `noticeFor`, `grid:brownout` | `Brownout: Lv${c} Powersource using ${load} of ${c}` | `Brownout: ${powersourceLabel(c)} ${usingText(load, c)}` |

Not moving (not level words): fault labels (`Blown fuse`, `Dead lamp`, …), `Needs:`/`Repair (…)`, switch/relay/battery prompts, `On hand: …`, `Battery: N s`, target rows, the win banner.

## Interfaces
Written by the lead-architect in part 0, on the part-0 branch, after G1 (not before: this is the core part of the ticket). No new dependencies.

```ts
// src/core/words.ts — pure: no DOM, no imports at all. Re-exported from src/core/index.ts.

/** The things that carry a level, and their screen names. 015 adds no new thing; a later thing is one entry here. */
export const THING_NAMES = { lamp: "Lamp", fuse: "Fuse", powersource: "Powersource" } as const;
export type LevelThing = keyof typeof THING_NAMES;

/** `Lv3 Fuse`; just `Fuse` when there is no level (null or undefined). `Lv` + number, no space; numbers print as given. */
export function levelLabel(thing: LevelThing, level: number | null | undefined): string;
export function lampLabel(load: number): string;                          // `Lv2 Lamp`
export function fuseLabel(rating: number | undefined): string;            // `Lv3 Fuse` / `Fuse`
export function powersourceLabel(capacity: number | null): string;        // `Lv4 Powersource` / `Powersource`

/** Live totals, plain numbers against the level: `using 3 of 4` / `using 3 (no limit)`; `carrying 2 of 3` / `carrying 2`. */
export function usingText(load: number, capacity: number | null): string;
export function carryingText(load: number, rating: number | null | undefined): string;

/** The no-limit marker, used inside `usingText` (map and HUD alike): `(no limit)`. Exported for tests and future callers; callers of `usingText` must not append it. */
export const NO_LIMIT = "(no limit)";
```
(As built in part 0 on `ticket/017-words`; the cut had `usingText(3, null)` → `using 3`, changed by Josh's answer 2.)

**Room for 015.** 015's "which powersource" wording (`North · Lv4 Powersource — using 3 of 4`, `Lv2 Lamp · on North`, `Brownout: North · Lv4 Powersource using 5 of 4` per Josh's answer 1) goes into this module as new functions (e.g. `feedTitle(name)`, `onFeed(name)`), added by the lead-architect in 015 part 0, with tests in `words.test.ts`. 015's B, C and D parts then call them rather than writing the name formats. No existing function here changes signature for 015: a feed's name is a separate word, not a parameter of `powersourceLabel`.

## Acceptance criteria
- [ ] **0 (lead-architect), Vitest in `src/core/words.test.ts`:** one assertion per string: `levelLabel` for each of the three things with a level and with null/undefined; `lampLabel(2)` → `Lv2 Lamp`; `fuseLabel(3)` → `Lv3 Fuse`, `fuseLabel(undefined)` → `Fuse`; `powersourceLabel(4)` → `Lv4 Powersource`, `powersourceLabel(null)` → `Powersource`; `usingText(3, 4)` → `using 3 of 4`, `usingText(3, null)` → `using 3 (no limit)`; `carryingText(2, 3)` → `carrying 2 of 3`, `carryingText(2, undefined)` → `carrying 2`; a non-integer (`lampLabel(2.5)` → `Lv2.5 Lamp`, `usingText(2.5, 4)` → `using 2.5 of 4`); `NO_LIMIT` → `(no limit)`. A test that `words.ts`'s source has no `import` line (pure, extractable). `src/core/index.ts` re-exports it. `npm run gate` green; test count grows.
- [ ] **A (renderer), after 0 merges:** `src/render/labels.ts` builds its strings from `src/core` (`lampLabel`, `fuseLabel`, `powersourceLabel`, `usingText`); its exported function names and signatures are unchanged, so `map-renderer.ts` needs no edit. `src/render/labels.test.ts` passes with **exactly two lines edited**, the no-limit expectations (Josh's answer 2): `feedUsing(3, null)` → `"using 3 (no limit)"` and `feedAlarm(5, null)` → `"! using 5 (no limit) !"`; every other line of its diff is empty. This is the one allowed exception to "test files are read-only" in this ticket, and A's Files gains `src/render/labels.test.ts` for those two lines only. The doc comments on `feedName`/`feedUsing` that say `using 3` with no limit are updated to match, and the reviewer's grep of `labels.ts` for `` `Lv``, `"Lv`, `using ${`, ` Lamp`, ` Fuse`, ` Powersource` string literals finds none. No new tests promised.
- [ ] **B (interaction), after 0 merges:** `src/play/prompt.ts` builds the lamp, fusebox and would-blow-again words from `src/core` as in the table; `TEXT.wouldBlowAgain` keeps its name and signature. `src/play/play.test.ts` (and every other test in `src/play/`) passes **without edits**; the same grep of `prompt.ts` finds no `Lv`, `carrying ${` or level-name literals. No new tests promised.
- [ ] **C (ui), after 0 merges:** `capacityReadout` and `noticeFor` in `src/ui/logic.ts` build their words from `src/core` as in the table. `src/ui/logic.test.ts` passes **without edits**; the same grep of `logic.ts` finds no `Lv`, `using ${`, `carrying ${`, `(no limit)` or level-name literals. No new tests promised.
- [ ] **All parts:** no player-facing string changes other than the map's no-limit `using 3 (no limit)` (the unchanged test files prove it); no number, rule, event payload or file in `puzzles/` changes. `npm run gate` green.
- [ ] **Josh, in the browser after C (optional):** `ladder-08-why-it-blew` reads as before: `Lv2 Fuse` caption, hover on the fuse, the HUD row, the blow notice.

## Files
- 0: `src/core/words.ts`, `src/core/words.test.ts`, `src/core/index.ts` (one export line).
- A: `src/render/labels.ts`, plus the two no-limit lines of `src/render/labels.test.ts` (Josh's answer 2).
- B: `src/play/prompt.ts` only.
- C: `src/ui/logic.ts` only.
Test files in A–C are read-only for this ticket (except A's two lines above): if one needs any other edit, a string changed, and that is a bug, not a re-cut.

## Order
0 first, branched from `main`. A, B and C in parallel after 0 merges, each branched from `main`.
**With 015:** 015 B, C and D edit these same three files. Run 017 A–C **before** 015 B–D so 015 builds on the module, and fold 015's name words into `words.ts` in 015 part 0 (see Interfaces). 015 part 0 and 017 part 0 both add a line to `src/core/index.ts`; whichever goes second rebases (one-line conflict).

## Rules coverage
Wording only; no rule from the brief's "Rules carried over" is tested or changed here. `tickets/rules-coverage.md` is unchanged.

## Josh's answers (with G1)
1. **015's multi-powersource brownout notice uses the dot separator**, like the HUD and hover: `Brownout: North · Lv4 Powersource using 5 of 4`. 015 part 0 adds the feed-name word to `words.ts` so notice, HUD and hover share one format.
2. **A feed with no limit reads `using 3 (no limit)` in both the map and the HUD.** The module's no-limit format is the HUD's: `usingText(load, null)` includes `(no limit)`, so it is the single source. This changes the map's current `using 3` (and the alarm's `! using 5 !` → `! using 5 (no limit) !`); `src/render/labels.ts` and two lines of `src/render/labels.test.ts` change in part A, the one allowed exception to "tests pass unedited".

## Open questions
None.
