# Test policy

Josh, 23 Nov 2026: "We need to adjust the pipeline. It should not reward this kind of test volume. It's not helpful and it has a major diminishing return. We need to strike a balance between performing tests that are productive and not wasting time on tests that will regularly succeed."

When this was written the suite was 4,709 tests in 224 files, about 17 minutes of CPU on CI (6.5 minutes of real time). 49 files built all 20 named cities, 14 only printed numbers, and the game's rules (`src/grid/`, `src/play/`) took about 1 second of it.

## What a test is for

A test earns its place by catching a mistake someone is likely to make: a rule broken by a later change, an edge case that was got wrong once, a contract between folders. A test that only re-confirms output that hasn't changed in weeks costs time on every run and catches nothing. **More tests is not better work.** Nobody is judged on how many tests they added.

## The rules

0. **10 to 15 tests per pull request, at most.** Josh, 23 Nov 2026: "We should be performing no more than 10 to 15 tests per change" and "when I say change I mean pull request". A pull request into `main` adds or rewrites at most 15 test cases (`it(...)`), aiming for 10, however many sections or tickets it carries. Work that needs more is split into more pull requests, not given a bigger allowance. Removed tests don't count against it.
1. **Fewest tests that would fail.** Each acceptance criterion gets the smallest test that would fail if the criterion broke, and no more. One test may cover several criteria. A criterion that only names a value (a typed table, a constant, a rename) needs no test of its own. The architect marks each criterion **test**, **browser** or **no test**.
2. **Rules on fixtures, not cities.** Prove a rule on a small typed fixture. A whole-city check runs on **one** city (6 x 6 seed 1, one-way on), or on the four pinned cities only when the rule depends on how cities vary, and the ticket says so. The 20 named cities run only on a release Josh calls, not in `npm test`.
3. **No report-only tests.** A test that prints numbers and asserts nothing doesn't go in `npm test`. Numbers for Josh or a pre-check come from a script run on demand (`tools/`, the grid-simulator's folder), or the builder prints them once and puts them in its reply. Existing reports live in `*.report.test.ts` files, which `npm test` skips and `npm run report` runs.
4. **One digest pin per stage, on one city.** A digest breaks on every intended change and gets re-taken, so it is a tripwire, not coverage. Don't add more.
5. **Time budget.** A new test file runs in under 2 s on Josh's PC (`npx vitest run --maxWorkers=2 <file>`) unless the ticket says why it needs more. The whole suite should stay under 3 minutes on CI. A ticket that would push it over removes, merges or slims tests in the same branch.
   **Measured on one pull request in ten.** Josh, 23 Nov 2026: "perform a measurement on 1/10 pull requests." After a PR whose number is a multiple of 10 merges into `main` (#20, #30, ...), the main session starts one manual CI run on `main` with `cities: one` (`gh workflow run CI --ref main -f cities=one`), the whole everyday suite, and adds a row to [ci-times.md](ci-times.md). Over 3 minutes, it tells Josh and proposes a trimming ticket. No other PR gets a whole-suite run for measuring.
6. **Removing is welcome.** A ticket may delete, merge or shrink tests that rule 1 or 2 makes redundant, including other folders' tests if the ticket lists them. The gate no longer checks that the test count grew.
7. **Run only what the change reaches.** Josh, 23 Nov 2026: "I would only like tests to be performed against objects that the changes directly impact." He chose "Tests that use the code" and the whole suite "Only on a release". CI on a PR or a push to `main` runs `vitest run --changed <base>`: only the test files whose imports reach a changed file. It is the only place that set runs on a ticket: there is no local gate (Josh, 23 Nov 2026, on a card: "Drop it entirely"), and the reviewer runs only the test files the branch added or changed ("Only their own folder"). Vitest still runs everything when `package.json` or the vite config changed. The whole suite (`npm run gate:full`, or CI's manual "Run workflow") runs only on a release Josh calls or when he asks. Measured 23 Nov 2026: a change to `src/grid/grid.ts` reaches 25 of 224 test files; a change to a ruin kit file reaches 90, because the 3D view imports it.

## Who does what

- **lead-architect:** keeps each pull request within 15 test cases (says which sections share a PR), marks each criterion test / browser / no test, names the one city or the pinned four when a whole-city check is needed, and lists any tests the ticket may remove.
- **Builders:** follow the rules above; in the reply, give the number of test cases added or rewritten and each new test file's time on Josh's PC.
- **code-reviewer:** a must-fix for more than 15 new or rewritten test cases in the PR, a report-only test in the suite, a 20-city check outside a release, a whole-city test where a fixture would do, a near-duplicate of an existing test, or a new file over budget without the ticket's reason.
- **Main session:** before review, CI's `test` check must pass and the PR must add or rewrite no more than 15 test cases (sent back to the builder otherwise), not that the count grew. It logs every real CI failure in [ci-times.md](ci-times.md).

8. **Tests earn their place.** Josh, 23 Nov 2026, on a card: "Yes, measure (Recommended)", asked whether to measure which tests have actually caught anything. Every real CI failure on a PR or `main` (not a timeout that passes on a re-run) is logged in [ci-times.md](ci-times.md)'s failure log: date, PR, test file and case, cause, and whether a typecheck alone would have caught it. After 10 more PRs (from #28), the main session reports to Josh which test files have never failed in the log and what each costs on CI, for him to judge what to delete.

Existing tests that break these rules are trimmed by a ticket of their own, not as a side job of feature tickets.
