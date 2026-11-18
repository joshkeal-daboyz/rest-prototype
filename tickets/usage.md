# Token usage per ticket

Real numbers for the GDD's budget (its prototype projection: Grid Simulator 150K, Repair Interaction 150K, UI 150K, Lead Architect 200K). Fill a row when a ticket is done, from the session's usage readout.

| Ticket | Agent | Model | Input tokens | Output tokens | Rounds of review | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 036 | lead-architect | opus (agent default) | 104K total (the readout gave one figure, not split) | — | 0 | Cut the ticket; 38 tool uses, 8 min |
| 036 | playtester (as builder) | sonnet | 138K total (one figure in the readout) | — | 1 | Built the harness; 57 tool uses, 22 min |
| 036 | code-reviewer | opus | 54K total (one figure in the readout) | — | 1 | meets, must-fix 0; 13 tool uses, 2.5 min |
| 037 | lead-architect | opus (agent default) | 71K total (one figure in the readout) | — | 0 | Cut the ticket; 11 tool uses, 2.5 min |
| 037 | renderer | sonnet | 167K total (two runs: 49K stopped at the dependency guard, 117K build) | — | 1 | Built src/render3d/; 49 tool uses, 9 min |
| 037 | playtester | sonnet | 19K total (one figure in the readout) | — | 1 | regressions 0, no snapshot change; 4 tool uses, 20 s |
| 037 | code-reviewer | opus | (readout not captured) | — | 1 | meets, must-fix 0 |
| 037 B | lead-architect | opus (agent default) | 76K total (one figure in the readout) | — | 0 | Cut section B (indicators); 34 tool uses, 4 min |
| 037 B | renderer | sonnet | 207K running total across A and B (the readout is cumulative for the resumed agent) | — | 2 | Built indicators, visual fixes, caption texture bug; 43 tool uses, 12 min |
| 037 B | code-reviewer | opus | (readout not captured) | — | 2 | meets, must-fix 0 |
| 037 B | playtester | sonnet | 19K total | — | 2 | regressions 0; 4 tool uses, 17 s |
| 037 C | lead-architect | opus (agent default) | 157K total (one figure in the readout) | — | 0 | Cut section C (wires, break, Relight); 46 tool uses, 10 min |
| 037 C | renderer | sonnet | 186K total (fresh agent) | — | 3 | Wires, break, Relight; 104 tool uses, 12 min |
| 037 C | code-reviewer | opus | (readout not captured) | — | 3 | meets, must-fix 0 |
| 037 C | playtester | sonnet | 15K total | — | 3 | regressions 0; 4 tool uses, 26 s |
| 038 | asset-scout | agent default | 70K total (one figure in the readout) | — | 0 | Synty Store shortlist; 61 tool uses, 5 min |
| 038 | web-fetch | agent default | 50K total (one figure in the readout) | — | 0 | Read Synty subscription licence; 4 tool uses |
| 038 | lead-architect | opus (agent default) | 126K total across 3 cuts (ticket, amendment A, amendment B; one figure each in the readout) | — | 0 | 52 tool uses |
| 038 | grid-simulator | sonnet | 592K total across 4 builds (pipeline, amendment A, amendment B, root-name fix; one figure each in the readout) | — | 1 | 256 tool uses; the real-pack runs and Blender experiments were most of it |
| 038 | code-reviewer | opus | 194K total across 3 reviews (one figure each in the readout) | — | 2 | round 1 meets, must-fix 0; round 2 of the amendments must-fix 1; round 3 meets, must-fix 0 |
| 038 | playtester | sonnet | 46K total across 3 rounds (one figure each in the readout) | — | 3 | regressions 0 each time; ladder run once, later rounds judged unaffected |
| 039+040 | lead-architect | opus (agent default) | 79K total across 2 resumes plus the first cut (one figure each in the readout; the first-cut figure was 76K) | — | 0 | Cut both tickets; 24 tool uses, 4.5 min |
| 040 | grid-simulator | sonnet | 167K total (one figure in the readout) | — | 0 | Built the bake fix, scaleOverrides, selftest cases; 76 tool uses, 10 min; the real SIMPLE Town re-conversion was most of it |
| 040 | code-reviewer | opus | 54K total (one figure in the readout) | — | 1 | meets, must-fix 0; 11 tool uses, 2 min; no playtester (only tools/ changed) |
| 039 | renderer | sonnet | 156K total (one figure in the readout) | — | 0 | Built the GLB loader and MODEL_TABLE; 89 tool uses, 66 min (headless Edge checks and the real-pack conversions) |
| 039 | code-reviewer | opus | 47K total (one figure in the readout) | — | 1 | meets, must-fix 0; 10 tool uses, 2 min; no playtester (only src/render3d/ changed) |
| 041 A | lead-architect | agent default | 139K total across the first cut and one resume (one figure per readout; the first-cut figure was 109K) | — | 0 | Cut the ticket; then amended section A after the build (A-Q1, A-Q2); 31 tool uses |
| 041 A | renderer | sonnet | 318K total across the build and three resumes (one figure in the readout) | — | 0 | Built town.ts and town.test.ts; gate fix for a slow test; rebuild at pitch 12 with pinwheel fill; 113 tool uses |
| 041 A | code-reviewer | agent default | 89K total (one figure in the readout) | — | 0 | meets, must-fix 0; 13 tool uses, 4 min |
| 041 A | playtester | agent default | 18K total (one figure in the readout) | — | 0 | regressions 0; 5 tool uses, under 1 min; the harness does not load src/render3d/ |
| 041 B | renderer | sonnet | 163K for the finishing build (one figure in the readout); the first builder was stopped by Josh midway (PC overload) and its figure was not seen | — | 0 | Drew the town from townLayout at one scale, placeholders, frozen Town; 73 tool uses, 9 min; one short browser pass |
| 041 B | code-reviewer | agent default | 80K total (one figure in the readout) | — | 0 | meets, must-fix 0; 19 tool uses, 2 min; ran no tests (the main session had run the capped full check) |
| 041 B | playtester | agent default | not seen | — | 0 | regressions 0; stopped early: nothing the harness loads changed |
| 041 C | renderer | sonnet | 271K total (one figure in the readout) | — | 0 | Built conductors, hardware, drops and cans, picking, plus the setback fix; 101 tool uses, 15 min; no browser or dev server by design (PC load) |
| 041 C | code-reviewer | agent default | not seen | — | 0 | meets, must-fix 0; ran no tests (the main session had run the capped full check) |
| 041 C | playtester | agent default | 15K total (one figure in the readout) | — | 0 | regressions 0; stopped early: nothing the harness loads changed |
| 042 A | renderer | sonnet | 211K total (one figure in the readout) | — | 0 | Front table, families, corner lots, fronts overlay; 123 tool uses, 13 min; no browser or dev server by design (PC load) |
| 042 A | code-reviewer | agent default | 69K total (one figure in the readout) | — | 0 | meets, must-fix 0; 11 tool uses, 2 min; ran no tests (the main session had run the capped full check) |
| 042 A | playtester | agent default | 17K total (one figure in the readout) | — | 0 | regressions 0; stopped early: nothing the harness loads changed |
| 042 A (settle: fronts) | renderer | sonnet | 33K total (one figure in the readout) | — | 0 | Flipped every front to "-z" but store_small_mesh, per Josh; 20 tool uses, 2 min. A calibration-gallery builder was stopped before it committed (figure not seen) |
| 042 A (settle: corners) | renderer | sonnet | 103K total (one figure in the readout) | — | 0 | Strict corner lots and corner models, per Josh; 42 tool uses, 6 min |
| 042 A round 2 | code-reviewer | agent default | 56K total (one figure in the readout) | — | 0 | meets, must-fix 0; ran no tests (the main session had run the capped full check) |
| 042 A round 2 | playtester | agent default | 15K total (one figure in the readout) | — | 0 | regressions 0; stopped early: nothing the harness loads changed |
| 043 A | renderer | sonnet | 184K total (one figure in the readout) | — | 0 | Style guide (15 chapters), drift test, 17 colour exports; 47 tool uses, 7 min; no browser or dev server by design (PC load) |
| 043 A | code-reviewer | agent default | 84K total (one figure in the readout) | — | 0 | partly, must-fix 1 (an invented "Decided" bullet credited to Josh); 27 tool uses, 4 min; ran one test file |
| 043 A | playtester | agent default | 15K total (one figure in the readout) | — | 0 | regressions 0; stopped early: nothing the harness loads changed |
| 043 A (settle) | renderer | sonnet | 49K total (one figure in the readout) | — | 0 | Fixed the must-fix, citations, DROP_REACH tag, drift guard; 30 tool uses, 2 min |
| 043 A round 2 | code-reviewer | agent default | 40K total (one figure in the readout) | — | 0 | meets, must-fix 0; ran no tests |
| 043 B | renderer | sonnet | 154K total (one figure in the readout) | — | 0 | Building gallery (pure layout, paging, own camera rig, captions); 38 tool uses, 9 min; no browser or dev server by design (PC load) |
| 043 B | code-reviewer | agent default | 76K total (one figure in the readout) | — | 0 | meets, must-fix 0; ran one test file |
| 043 B | playtester | agent default | 15K total (one figure in the readout) | — | 0 | regressions 0; stopped early: nothing the harness loads changed |
| 043 B (settle) | renderer | sonnet | 21K total (one figure in the readout) | — | 0 | Main-session gate caught a describe-level manifest read that would fail on CI; made it lazy; 10 tool uses, 1 min |
| 043 B (rework) | renderer | sonnet | 167K total (one figure in the readout) | — | 0 | Gallery as one line, four copies per model, low camera, own input handler; 34 tool uses, 10 min; no browser or dev server by design (PC load) |
| 043 B round 2 | code-reviewer | agent default | 72K total (one figure in the readout) | — | 0 | meets, must-fix 0; ran one test file |
| 043 cut | lead-architect | agent default | 93K total (one figure in the readout) | — | 0 | Cut ticket 043 (city style guide and gallery); 18 tool uses, 3 min |
| 044 | grid-simulator | agent default | 36K total (one figure in the readout) | — | 0 | Fixed the Windows-only fixture in convert.test.ts (CI red since 038); 19 tool uses, 1 min; no review or playtest (one-line test change; the Linux CI run is the check) |
| 045 cut | lead-architect | agent default | 115K total (one figure in the readout) | — | 0 | Cut ticket 045 (click to calibrate fronts) and the src/core/calibration.ts types; 19 tool uses, 6 min |
| 045 section 0 | lead-architect | agent default | 42K total (one figure in the readout) | — | 0 | Validator, key helpers, patch function, 42 tests (commit 637f5e0 on ticket/045-click-to-calibrate-fronts-0); 12 tool uses, 3 min; not yet reviewed or merged |
| 045 re-cut | lead-architect | agent default | 38K total (one figure in the readout) | — | 0 | Dropped notBuilding and section D from ticket 045 (Josh's trims at approval); 26 tool uses, 1 min |
| 045 section 0 | code-reviewer | agent default | 41K total (one figure in the readout) | — | 0 | meets, must-fix 0; 42 tests run on the one file |
| 045 section 0 | playtester | agent default | 31K total (one figure in the readout) | — | 0 | regressions 0; stopped early (only src/core changed) |
| 046 cut | lead-architect | agent default | 15K total (one figure in the readout) | — | 0 | Cut ticket 046 (streets test wall-clock limit) |
| 046 | renderer | sonnet | 49K total (one figure in the readout) | — | 0 | Dropped the 3000 ms assertion; added the 30 s test timeout after review; timed townLayout and dashLayout (about 1.6 s for all 65 maps) |
| 046 | code-reviewer | agent default | 16K total (one figure in the readout) | — | 0 | meets, must-fix 0; caught the 5 s default test timeout, fixed in a20279b |
| 046 | playtester | agent default | 13K total (one figure in the readout) | — | 0 | regressions 0; stopped early (test file only) |
| 045 section A | renderer | sonnet | 158K total (one figure in the readout) | — | 0 | pack:name keys, dev loader, gallery captions, guide chapters re-keyed (commit 771edcb); 64 tool uses, 9 min; 27 new tests |
| 045 section B | grid-simulator | agent default | 48K total (one figure in the readout) | — | 0 | Dev-only Vite plugin and atomic store (commit c107866); 13 tool uses, 2 min; 26 new tests |
| 045 sections A and B | gate (main session) | — | — | — | 0 | Combined scratch merge: 1651 passed, 1 failed (the old streets timing test, already fixed on main by 046) |
| 045 section A | code-reviewer | agent default | 69K total (one figure in the readout) | — | 0 | meets, must-fix 0 |
| 045 section B | code-reviewer | agent default | 43K total (one figure in the readout) | — | 0 | meets, must-fix 0 |
| 045 sections A and B | playtester | agent default | 18K total (one figure in the readout) | — | 0 | regressions 0; stopped early (harness imports nothing changed) |
| 045 section C | renderer | sonnet | 138K total (one figure in the readout) | — | 0 | Gallery clicks, hit test, in-order dev saver, `not saved` display (commit a8293a6); 50 tool uses, 7 min; 29 new tests |
| 045 section C | gate (main session) | — | — | — | 0 | tsc clean, 88 files, 1681 passed; production build checked: no click, endpoint or help-line code in dist |
| 045 section C | code-reviewer | agent default | 59K total (one figure in the readout) | — | 0 | meets, must-fix 0 |
| 045 section C | playtester | agent default | 16K total (one figure in the readout) | — | 0 | regressions 0; stopped early (harness never imports render3d) |
