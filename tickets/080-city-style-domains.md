# 080 · Split the city style guide into an index and domain files, under a document standard

owner: renderer (the guide is the renderer's, 043 Q2); the main session edits `.claude/agents/*.md` (Q1)
status: done; approved (G1, Josh, 23 Nov 2026: "Approve 080"); section A merged (Josh, 23 Nov 2026: "Merge 080 A"); section B1 merged (Josh, 23 Nov 2026: "Merge 080 B1"); section B2 merged in three batches (Josh, 23 Nov 2026: "Merge 080 B2a", "Merge 080 B2b", "Merge 080 B2c"). Done.
branch: `ticket/080-city-style-domains` (this file). One branch per pull request: `ticket/080a-split`, `ticket/080b1-standard`, then `ticket/080b2-...` per review batch

## Josh's words (23 Nov 2026, in chat)
> "Review the file: docs/city-style-guide.md. I want this document to be organized for more efficient token usage. I'm thinking a city_style_index and series of domains so that the individual agents only have to references what they need to build out their respective portion of the city."

> "I think we should also implement a document standard for the city styling and maintain it so that it doesn't just turn into a log containing a series of my decisions."

Shown the layout and standard below, he said: "Cut the ticket". That is the request, not G1.

## What the architect found (main, blob 1b1a64b)
211 KB, 1,369 lines, about 50k tokens. 49 lines say Decided; many Default lines also quote Josh. About 28 KB is measurement history (16.8, 16.9, 18.8, 19.7), about 30 KB is code walkthrough (16.10, 16.11). Chapters 17, 20 and 21 are cited, never written. Six agent reading lists cite it (buildings, facades, landscape, planner, streetscape, tech-pass); landscape cites a "street furniture chapter (R10)" that does not exist. Ruin-pass, holdout-pass, pipeline-designer and style-judge do not cite it. Three tests read it as text: `src/render3d/styleguide.test.ts` (87 cases), `stacktown.test.ts` (two cases near lines 696 and 712), `terracepack.test.ts` (one, near line 644).

**`vitest --changed` does not reach these tests on a docs-only change**: they read the guide with `readFileSync`, not an import. See Q4.

## Goal
Each pipeline agent reads only the domain files its stage needs, a few KB each instead of 50k tokens. Every domain states what the city is in the present tense, one rule in one place, with a short id pointing at a decisions log that keeps Josh's words, dates and tickets. A drift test holds every file to the standard, so the guide stays a rulebook and does not turn back into a log.

## The layout: `docs/city-style/`
| File | Old sections (verbatim in A) | Read by |
| --- | --- | --- |
| `index.md` | 1 | everyone who needs a map of the files |
| `STANDARD.md` | new | the renderer, the code-reviewer |
| `scale-and-lots.md` | 2, 4, 16.2 | buildings, planner |
| `streets-and-blocks.md` | 3, 10, 16 intro, 16.1, 16.3, 19.3, 19.5 | planner |
| `buildings.md` | 5, 6, 7, 16.4, 16.7, the colourway rule of 16.9 | buildings |
| `facades.md` | 16.5, 16.10, 16.11 | facades, landscape (street furniture, the R10 citation) |
| `frontage-and-interiors.md` | 19 intro, 19.1, 19.2, 19.4, 19.6, 19.8 | streetscape, planner, landscape |
| `parking.md` | 18 intro, 18.1 to 18.7 | streetscape, planner |
| `exclusions.md` | 16.6 | facades, landscape, tech-pass |
| `light-and-accessibility.md` | 8, 9, 11, 12, 16.12 | renderer |
| `packs.md` | 13, 14, 15 | asset-scout, renderer |
| `evaluation.md` | 16.8, the measurements of 16.9, 18.8, 19.7 | checkers only (pipeline-designer, style-judge on request) |
| `numbers.md` | Numbers | no reading list; the drift test |
| `decisions.md` | "Decided, not yet built", plus the log B builds | no reading list; Josh and the reviewer |

The renderer may move a section to a better-fitting file if reading it shows the table is wrong, and says so in its reply.

## The standard (`STANDARD.md`, written in B1)
1. A domain states what the city is, present tense. One rule lives in one place; others link to it.
2. Provenance is a short id, `[D-053a]`, resolving to one entry of `decisions.md`. Quotes, dates and question numbers live only there.
3. A new ruling rewrites the rule in place and appends a log entry; the log keeps history.
4. Three statuses: **Rule** (Josh decided), **Default**, **Open**.
5. No measurements, run results or code walkthroughs in a domain: it names the file and the constant, and stops.
6. Fixed shape: a header (Scope, Read by, Depends on), then Rules, then Open questions.
7. Budget: 8 KB per domain, 2 KB for the index (Q3). `numbers.md`, `decisions.md` and `evaluation.md` have none.
8. A ticket that changes a rule edits the domain and appends to the log; the code-reviewer checks both.
9. Each domain's header says `standard: yes` once condensed; the checks below apply only to those.

## Sections and pull requests
| PR | Branch | Section | New or rewritten tests |
| --- | --- | --- | --- |
| 1 | `ticket/080a-split` | A | at most 6 |
| 2 | `ticket/080b1-standard` | B1, plus the first batch of domains | at most 8 |
| 3+ | `ticket/080b2-...` | B2, two or three domains each | 0 |

### A · Mechanical split (renderer, PR 1)
- [ ] (**test**) Every `##` and `###` heading of the old guide appears, word for word, in exactly one file under `docs/city-style/`, and `index.md`'s old-to-new map names that file. One case; the old headings are a fixture list in the test.
- [ ] (**no test**) The text moves verbatim: the renderer's reply gives `git diff --stat` and a word count of old against new, equal less headers added.
- [ ] (**no test**) `docs/city-style-guide.md` becomes a stub of under 15 lines pointing at `index.md` (Q2).
- [ ] (**test**) Every `docs/city-style/...` path in `.claude/agents/*.md` exists, and no reading list still cites `docs/city-style-guide.md`. One case.
- [ ] (**no test**) The main session updates the six reading lists per the table (Q1), on this branch, before review.
- [ ] (**no test**) Live citations repointed: `docs/city-grammar.md`, the `citymetrics.ts` and `citymetrics.test.ts` headers. Handoffs, city-state notes and old tickets are history and are not edited.
- [ ] (**test**, rewritten) `styleguide.test.ts` reads the files by path through one helper; the chapter-order cases (`has the sixteen chapters ...`, `has its nine parts`, and the two `has its eight parts`) are deleted, not rewritten. The `stacktown.test.ts` and `terracepack.test.ts` cases read the new file that holds their text (3 rewrites).
- [ ] (**no test**) `npx vitest run src/render3d/styleguide.test.ts src/render3d/stacktown.test.ts src/render3d/terracepack.test.ts` is green; the reply gives the count and time (Q4).

### B1 · The standard and its checks (renderer, PR 2)
- [ ] (**no test**) `STANDARD.md` holds the nine points above, under 3 KB.
- [ ] (**no test**) `decisions.md` holds a mapping table: id | old section | the old line, verbatim | new home (file and rule). One row for every Decided line of the old guide, and for every Default or Info line that quotes Josh. The reply gives the row count; Josh's review of each domain checks the meaning.
- [ ] (**test**) In each `standard: yes` domain: within budget; has the header and the three parts in order; no quotation marks around Josh's words, no dates, no `Q<n>` (one case per check, 3 cases).
- [ ] (**test**) Every `[D-...]` in any domain resolves to one `decisions.md` row, and every row's new home cites its id (1 case).
- [ ] (**test**) No `decisions.md` row has an empty new home once every domain is `standard: yes`; until then rows of unconverted domains say `verbatim` (1 case).
- [ ] (**test**, removed) The wording pins the standard replaces are deleted: the "quotes Josh ... verbatim", "keeps Josh's words as the Decided lines", "records ...", "no longer holds ... among the decisions not yet built", "drops the retired lines", "points chapter ... at" and "L1 leftovers" cases of `styleguide.test.ts` (about 25). Kept: the Numbers drift, files and constants exist, the pack table, the fronts and corner lists, the never-used list, the colourway ids, R1 to R13 names, the view URLs.
- [ ] (**no test**) The first batch is `exclusions.md` and `packs.md` (small, mostly tables), so Josh sees the standard applied before the big domains.

### B2 · Condense the remaining domains (renderer, PR 3 onward)
- [ ] (**no test**) Each domain is condensed to the standard and marked `standard: yes`; quotes move to `decisions.md`. No rule changes meaning; anything that would is an Open question in the domain, not an edit.
- [ ] (**no test**) **How Josh reviews a domain:** the main session shows him, per domain, the domain's new Rules list and, for each changed Decided line, the old line beside the new rule and its id (from the mapping table), in chat, a screen per domain. His word per domain goes in that PR's merge commit. A domain he rejects goes back unchanged.
- [ ] (**no test**) Measurement and walkthrough text left in a domain after A moves to `evaluation.md` or is deleted where the code says the same, named in the reply.

## Files
`docs/city-style/`, `docs/city-style-guide.md`, `docs/city-grammar.md` (citations only), `src/render3d/styleguide.test.ts`, `stacktown.test.ts`, `terracepack.test.ts`, the headers of `citymetrics.ts` and `citymetrics.test.ts`. The main session only: `.claude/agents/*.md` reading lists.

## Interfaces
No `src/core/` change, no new dependency.

## Dependencies
- **079** (in flight) changes no file here: its render3d section touches only `plan3d.test.ts`. No ordering is needed; if 079c lands first, A rebases. 080 starts after 079 merges only if Josh wants one test-suite change at a time.
- A merges before B1; B2 PRs follow B1, one at a time.
- No GDD Decided rule changes. This is a reorganisation.

## Open questions
- **Q1. Who edits the agent reading lists?** Default: the main session, on the A branch, since `.claude/agents/` is pipeline configuration and no agent owns it.
- **Q2. Keep `docs/city-style-guide.md`?** Default: a short stub pointing at `index.md`, so links in old tickets and handoffs still land somewhere. Alternative: delete it.
- **Q3. Budgets.** Default: 8 KB per domain, 2 KB for the index. `facades.md` may not fit even condensed (sills and escapes are about 30 KB now); if so the renderer splits it into `facades.md` and `fire-escapes-and-sills.md` rather than raise the budget.
- **Q4. Gate reach on docs-only PRs.** `vitest --changed` skips these tests when only `docs/` changes. Default: the main session and the reviewer run `src/render3d/styleguide.test.ts` by name on any PR touching `docs/city-style/`; no config change. Alternative: a separate ticket adds the file to the gate script.
- **Q5. Owner.** Default: the renderer, per 043 Q2. Alternative: each domain file belongs to the agent that reads it most (buildings, facades, planner, streetscape), with the renderer keeping the index, the standard and `numbers.md`.
