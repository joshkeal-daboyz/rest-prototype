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
