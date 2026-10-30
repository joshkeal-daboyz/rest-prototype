# Rules coverage

Every rule in the brief's "Rules" section, and where it is tested.

| Rule | Where |
| --- | --- |
| Power flows from the feed outward; conductors conduct unless faulted | src/grid tests |
| Lamps are leaves; a dead lamp never blocks | src/core validator; src/grid tests |
| Breaker cuts downstream; switch picks one of two lines | src/grid tests |
| Parts bulb / fuse / wire; fault → part and count | src/core `FAULT_RULES`; src/grid tests |
| Signatures derivable from state (into a fuse, none out, etc.) | src/grid tests |
| Faults hide faults (readable = current reaches it) | src/grid tests |
| Capacity: over it, brownout; nothing counts as lit | src/grid tests; per feed on multi-feed maps: 015 A; at 4 feeds: 027 G |
| Power flows from the feed outward (each feed, on multi-feed maps) | 015 A (one-feed maps unchanged, rule 8) |
| Fuse rating: over it, blows on power | src/grid tests |
| Scarce parts: repair consumes the part; refused without it | src/grid tests |
| Win: every target lit, no brownout | src/grid tests; tests/playtest (036: every ladder map replayed to complete) |
| The Relight can't be interrupted | src/play (input ignored during it); tests/playtest (036: the locked line, every control and undo after the win); Josh checks |
