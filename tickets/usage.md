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
