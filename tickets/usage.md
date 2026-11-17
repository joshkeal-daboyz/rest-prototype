# Token usage per ticket

Real numbers for the GDD's budget (its prototype projection: Grid Simulator 150K, Repair Interaction 150K, UI 150K, Lead Architect 200K). Fill a row when a ticket is done, from the session's usage readout.

| Ticket | Agent | Model | Input tokens | Output tokens | Rounds of review | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 036 | lead-architect | opus (agent default) | 104K total (the readout gave one figure, not split) | — | 0 | Cut the ticket; 38 tool uses, 8 min |
| 036 | playtester (as builder) | sonnet | 138K total (one figure in the readout) | — | 1 | Built the harness; 57 tool uses, 22 min |
| 036 | code-reviewer | opus | 54K total (one figure in the readout) | — | 1 | meets, must-fix 0; 13 tool uses, 2.5 min |
| 038 | asset-scout | agent default | 70K total (one figure in the readout) | — | 0 | Synty Store shortlist; 61 tool uses, 5 min |
| 038 | web-fetch | agent default | 50K total (one figure in the readout) | — | 0 | Read Synty subscription licence; 4 tool uses |
| 038 | lead-architect | opus (agent default) | 126K total across 3 cuts (ticket, amendment A, amendment B; one figure each in the readout) | — | 0 | 52 tool uses |
| 038 | grid-simulator | sonnet | 592K total across 4 builds (pipeline, amendment A, amendment B, root-name fix; one figure each in the readout) | — | 1 | 256 tool uses; the real-pack runs and Blender experiments were most of it |
| 038 | code-reviewer | opus | 194K total across 3 reviews (one figure each in the readout) | — | 2 | round 1 meets, must-fix 0; round 2 of the amendments must-fix 1; round 3 meets, must-fix 0 |
| 038 | playtester | sonnet | 46K total across 3 rounds (one figure each in the readout) | — | 3 | regressions 0 each time; ladder run once, later rounds judged unaffected |
