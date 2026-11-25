# Rules coverage

Every rule in the brief's "Rules" section, and where it is tested.

| Rule | Where |
| --- | --- |
| Power flows from the feed outward; conductors conduct unless faulted | src/grid tests |
| Lamps are leaves; a dead lamp never blocks | src/core validator; src/grid tests; 081 S1 (the hidden scenery lamps the conversion adds are leaves: the converted puzzle validates) |
| Breaker cuts downstream; switch picks one of two lines | src/grid tests |
| Parts bulb / fuse / wire; fault → part and count | src/core `FAULT_RULES`; src/grid tests |
| Signatures derivable from state (into a fuse, none out, etc.) | src/grid tests; 081 W2 (approved 25 Nov 2026: current reaches a dark lamp on a building, a live drop into dark windows, criterion 5); 081 S1 (current up to a sparking break: a scenery building past a cut stays dark); 081 FX2 (the city view: sparks fly only at a live cut, criterion 4; a repaired cut stops at once, criterion 4c; the cut's crackle arcs are warm and on the span, never FX3's cold insulator arcs, criterion 4b) |
| Faults hide faults (readable = current reaches it) | src/grid tests; 081 FX2 (the city view: an unreadable cut throws no sparks) |
| Capacity: over it, brownout; nothing counts as lit | src/grid tests; per feed on multi-feed maps: 015 A; at 4 feeds: 027 G; 081 L1 (the city view: a lit building's windows dip in a brownout); 081 S1 (a live scenery building's load counts toward its feed's capacity) |
| Power flows from the feed outward (each feed, on multi-feed maps) | 015 A (one-feed maps unchanged, rule 8) |
| Fuse rating: over it, blows on power | src/grid tests; 081 S1 (scenery hung under a fuse counts toward its rating) |
| Scarce parts: repair consumes the part; refused without it | src/grid tests |
| Win: every target lit, no brownout | src/grid tests; tests/playtest (036: every ladder map replayed to complete); 081 K2c and P1 (a city puzzle converts to a `Puzzle` whose check block replays as its schematic's, on `src/grid/` unchanged); 081 S1 (a hidden scenery lamp is never a target) |
| The Relight can't be interrupted | src/play (input ignored during it); tests/playtest (036: the locked line, every control and undo after the win); the ladder's 3D view (037 C) was deleted by 081 A2c; 081 E2 (the city view: input during the Relight changes nothing); 081 L1 (the lamp buildings' windows ignite in the Relight's order); Josh checks |
