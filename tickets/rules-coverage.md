# Rules coverage

Every rule in the brief's "Rules" section, and the ticket whose acceptance criteria test it.

| Rule | Ticket |
| --- | --- |
| Power flows from the feed outward; conductors conduct unless faulted | 002 |
| Lamps are leaves; a dead bulb never blocks | 001 (validator), 002 |
| Parts bulb / fuse / wire; fault → part and hold time | 001 (`FAULT_RULES`), 006 |
| Signatures: current to a dark bulb; into a fuse and none out; up to a sparking break | 002 |
| Faults hide faults | 002, 004 |
| Breaker cuts the panel | 002 |
| Live repair timing check; a miss is a shock | 006 |
| Two shocks in a night kill; that night's repairs roll back | 003 (count, death), 006 (rollback through the grid) |
| Repairs survive dawn | 003 |
| Letting go early cancels and keeps the part | 006 |
| A repair can't start without the part; the prompt names it | 006 |
| Satchel of four | 001 (validator), 006 |
| The Relight can't be interrupted | 005 (plays to the end), 006 (input ignored during it) |
| Probing needs current; shows nothing on a dead panel | 002 |
| A probe costs time, not parts | 003, 006 |
| Wrong fixes cost time only | 006 |
| Fuse rating vs load; blows again on power | 002 |
| Switches choose a wire; unselected side is dark, not faulty | 002 |
| Night on game time, capped step, pause stops the clock | 003 |
| Pause cancels a live repair with no shock | 003, 006 |
