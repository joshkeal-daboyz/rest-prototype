ticket: 081-cityframe-timeout
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
There is no ticket section. Josh chose this on a card on 26 Nov 2026: "15 s timeout (Recommended)". The E3 opening-frame case in `src/render3d/cityframe.test.ts` timed out at Vitest's 5 s default on CI twice, and gets a 15 s timeout. As in the earlier fixes (#78 `ef65593`, overlay.test.ts; #87 `a574a0d`, named.test.ts), no assertion changes and nothing else is touched.

## Does the branch do it?
- **The timeout.** `git diff main...ticket/081-cityframe-timeout` is one line in `src/render3d/cityframe.test.ts`: the closing `});` of "the opening frame (081 E3) > holds the job's places, run ends and the district's streets, ..." becomes `}, 15_000);`. This is the same form and the same 15 s as #78 and #87.
- **No assertion changes, nothing else touched.** The diff against main covers only that file and that line. The merge of `origin/main` (7ae4ca1) adds nothing of its own to the diff. There are 0 test cases added or rewritten, since a timeout argument is neither.
- **Runs.** `npx vitest run --maxWorkers=2 src/render3d/cityframe.test.ts`: 2 passed. The E3 case took 3079 ms locally, so 15 s leaves CI headroom about 3 times the 5 s failures.

## Rule conflicts and risks
- none found. No `src/grid/` or `src/night/` change, no new dependency, no Decided rule touched. Test policy: no new case and no new file, so the 2 s rule for new files does not apply. The case was already in the suite.

## Must fix
none

## Could improve
1. The case loads a whole city and takes about 3 s even locally. If it times out again at 15 s, the better fix would be a smaller fixture for the frame rule (test policy: a fixture where a whole city isn't needed), not a longer timeout. Out of scope here.
