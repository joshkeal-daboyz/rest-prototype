# City style: the document standard

A domain file states what the city is. It is a rulebook, not a log of decisions. `src/render3d/styleguide.test.ts` holds every file marked `standard: yes` to points 1 to 7 and 9.

1. **Present tense, one place.** A domain states what the city is. One rule lives in one place; other files link to it.
2. **Provenance is an id.** A Rule carries `[D-053a]`, which resolves to one row of the mapping table in `decisions.md`. That row keeps Josh's words, the dates and the question numbers. Quotes, dates and question numbers appear in no domain. A Default names its ticket in brackets, as `Default (052)`.
3. **A new ruling rewrites in place.** The domain's rule is rewritten and a row is appended to `decisions.md`; the log keeps the history.
4. **Three statuses.** **Rule** (Josh decided, which includes a default he explicitly approved [D-080a]), **Default** (an open-question default he did not comment on) and **Open** (not answered, with what it waits for). Facts about the code or the packs are plain sentences or tables, with no status. Pending work is an Open question.
5. **No measurements, run results or code walkthroughs.** A domain names the file and the constant and stops. Readings go to `evaluation.md`; numbers go to `numbers.md`.
6. **Fixed shape.** Line 1 is `# City style: <name>`. Then the header lines `standard: yes`, `Scope:`, `Read by:` and `Depends on:`. Then `## Rules`, then `## Open questions`, last. Old numbered section headings stay under Rules, because other files cite them by number.
7. **Budget.** 8 KB per domain, 2 KB for the index, 3 KB for this file. `numbers.md`, `decisions.md` and `evaluation.md` have none. A domain over budget is split, not given more.
8. **A ticket that changes a rule edits the domain and appends to the log.** The code-reviewer checks both.
9. **Marking.** A domain says `standard: yes` once it is condensed. Until then it is verbatim from the old guide, its rows in the mapping table say `verbatim`, and the checks skip it.
