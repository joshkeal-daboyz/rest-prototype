# Series v1: 25 puzzles, in order (a plan, nothing built)

Josh, 25 Nov 2026: "I don't want to convert the existing puzzles. Instead I want to use Fable 5.2 to analyze the existing puzzles and come up with a series of 25 puzzles that are progressively more difficult. The current puzzles are too repetitive."

**Status: a plan for Josh to approve.** No puzzle file is written. Every row below is a new map designed on the city (`puzzles/city/<id>.city.json` and its note); "draws on" names the old map whose idea it keeps, never a file to convert.

**What was read.** The 64 numbered schematic maps and `city-two-ways-round` with their notes (the request said 40; `puzzles/` holds 64, ranked in `puzzles/README.md`), the 17 city puzzles, Josh's play notes (`docs/design/081-P2a-josh-play.md`), ticket 081 sections S, V, W and FX4, and the load-number pre-check (`docs/design/081-V0-load-preview.md`). The analyzer was run on 09, 16, 38, 46, 58 and `city-two-ways-round` for reference numbers.

## 1. What's repetitive now

Counted from the 64 maps' files and the trap sections of their notes.

- **One trap, 50 times.** 50 of 64 notes have a fuse blow as a trap (every map from 11 on except 15, 16, 22 and 38). The maps differ in wiring, but the player's move is the same: read a rating against the loads behind it.
- **"The obvious breaker blows the fuse; leave it blown; fit the spare at the end."** 20, 21, 25, 26, 32, 33, 39, 41, 42, 49, 51, 53, 54 and all of 57 to 64: about 21 maps open on this beat.
- **"Fit the fuse and it blows again; shed first."** 13, 14, 17, 18, 19, 27, 28, 31 (22 notes mention a re-blow). This is the pattern Josh called off-track on 12 (28 Oct 2026: "it just blows every time you fix the fuse").
- **"The one spark you can see is the wrong place for the one wire."** 16, 22, 24, 30, 31, 35, 37, 38, 39, 44, 46, 48, 52, 63 and `city-two-ways-round`: 15 maps whose lesson is *look before you spend*. The hinge is usually the same one, a dead junction that costs two wires (12 maps: 08, 09, 10, 16, 22, 32, 37, 38, 46, 48, 50, 52).
- **Pairs that are the same map.** 09 and 10 (reroute round a dead junction, then shed). 03 and 04 (capacity, breakers only). 13, 17 and 19 (one box, shed, then fit). 29 and 47 (both named "The open point"). 57 and 58 (the same wiring, relay swapped for spring). 55 and 56 (the same ring with a main fuse added). 21, 25, 26 (battery, relays, breaker blows `fb_E`).
- **The same nouns.** `shrine` is a target in 59 of 64 maps; `mill` is the heavy culprit in 39; the kit is exactly two fuses in 16 maps and fuse + wire in 8 more.
- **On the city** (Josh's cards, P2a: "too samey"): 12 of the 16 pilots sit on `block:0:0`, and the 16 are the ladder's first 16, so 9 of them are the fuse and capacity beats above.
- **What the 3D game already answers for the player.** The load numbers (section V, on by default) mark the wrong move red before it is made on 10 of the 17 city puzzles (V0's table: 04, 05, 07, 09 to 15). A trap that is one red click deep is no longer a trap, and most of the ladder's fuse traps are one click deep.

## 2. The elements available

All of these are in the schema and the simulator today, have a picked model (`docs/design/081-component-picks.md`) and a place rule in the fit tool. No row of section 3 needs a rule or schema change.

| Element | What it gives a puzzle | Used in (of 64) | In the 25 |
| --- | --- | --- | --- |
| Breaker | cuts everything past it; the shed | 62 | throughout |
| Switch (plain) | one line or the other; can be set while dark | 48 | throughout |
| Feed capacity, brownout | choose what goes dark; costs nothing | all, binding in about 12 | 3, 18, 23 |
| Damaged cable, wire | read only when live | 37 | from 4 |
| Dead junction, wire x 2 | the repair you can't afford | 12 | 5, 7, 13 |
| Blown fuse, fuse | everything past it is unreadable | 15 start blown | 6, 10 |
| Dead lamp, bulb | **under-used**: draws nothing until mended, so a bulb is a load event, and a dead building is a free shed | 18, the point of 2 (17, 45) | 6, 10, 23, 25 |
| Fuse rating | a second limit, local, and a blow costs a part | 54 | 8, 10, 11, 14, 15 |
| Nested fuses | child has room, parent doesn't | 4 (34, 43, 48, 56) | 15, 23 |
| Ring (two ways round) | which end feeds; the open point | about 14 | 9, 11, 13 |
| Reading from behind | **under-used**: a second route lights a hidden fault's far side for free | 2 (38, 46) | 13 |
| Two feeds | separate pools; the nearer feed (fewest hops) carries the building | 5 (05, 15, 59, 63, 64) | 12, 22, 25 |
| Relay | moves only while live; can't be pre-set | 24 | 16, 17, 19 to 22, 25 |
| Spring switch | **under-used**: falls back when it loses power, so a hold must be handed over | 6 (12, 58, 60, 62, 63, 64) | 18, 24, 25 |
| Battery | a timed window of power: sets relays, and lights hidden faults | 18 | 19, 20, 21, 24, 25 |
| Decoy fault | **under-used**: a readable fault that is not on the target's wire | 2 (08, 16) | 5, 6 |
| `priority` (the tribe's homes) | **never a goal**: it is in 44 files, scored nowhere | 0 as a goal | named in each note, not scored |
| Several targets | the priests' list | most have 2 to 5, a real list in 2 (40, 56) | 23 |

**What the 3D view shows (and so what a puzzle may lean on).**
- Targets are buildings with gold windows and an icon (W). Every building on a live pole lights and draws 1 (S), so capacities and ratings are raised when a map is laid; the sizes in section 3 are the puzzle's own buildings.
- Every job wire is tinted, live or dead (V1). Breaks, blown fuses and dead buildings show only when current reaches them.
- Each breaker, switch and readable break shows the load it would add, red if a feed would go over or a fuse would blow (V2, V3). Unread faults are counted as sound, so a number can read high, never low.
- A blow runs a bolt down the wires to the box (FX4). One fixed camera; lines read outward from where they take power; no crossing spans; a pole takes at most 3 wires (W1, B1).
- **Never yet played on the city:** relay, spring and battery. The models are picked and the overlay reads battery state, but no file in `puzzles/city/` uses one. Puzzle 16 is the first relay, 18 the first spring, 19 the first battery.

## 3. The series of 25

**How difficulty is judged**, in this order:
1. **Depth of the read:** how many facts the player must hold before the first move that can't be taken back (a part spent, a fuse blown).
2. **Whether the numbers flag the wrong move.** Early, a red number is the lesson. From 6 on, the wrong move is either not red (a part spent in the wrong place) or everything is red and the puzzle is what to do first so the move turns white.
3. **The analyzer:** fewest clicks, winning configurations (1 from puzzle 5 on), winning click orders (falling toward 1 at the end), share of dead-end states, and that the obvious wrong first move is readable and recoverable.

| Band | Clicks | Hidden facts | Dead ends | Layers |
| --- | --- | --- | --- | --- |
| 1 to 5 | 1 to 3 | 0 | none before 5; one Undo on 5 | 1 |
| 6 to 15 | 3 to 6 | 1 or 2 | readable, a part or one Undo recovers | 2 |
| 16 to 25 | 5 to 10 | 1 to 3 | the first wrong click always recoverable by a part or a wait | 3 to 6 |

**Rules the whole series keeps, so it does not repeat itself.**
- One reasoning move per puzzle, named in the table; no move appears twice.
- **Reuse is free** (Josh, 26 Nov 2026: "There really shouldn't be a limit to the number of puzzles that can leverage a mechanism per series. If the mechanics are to build on top of one another then fuses should be able to be leveraged in any puzzle. Any number of times for any reason after they've been introduced."). Once a puzzle has introduced a mechanic, any later puzzle may use it, any number of times and for any reason, a fuse blown on purpose included (from 16 on). This replaces "'The obvious breaker blows a fuse' opens at most two puzzles (8 and 19)"; 1 to 15 were built under that cap and are not reworked. "Fit it and it blows again" is allowed as a designed trap (Josh, NB-Q2: "Allow it too"): named in the puzzle's note, and readable before the fit. The cap of 2 timed breakers on a map is dropped (Josh, NB-Q3: "Drop the 2-timer cap").
- The target is the shrine at most 5 times; the heavy building is never the same two puzzles running; no kit repeats on neighbouring puzzles.
- No two neighbouring puzzles share a block; districts grow from 1 block (1 to 10) to 2 (11 to 20) to 3 or 4 (21 to 25).
- At most 8 buildings and 4 faults on any map.

Size is faults / parts / controls (br breaker, sw switch, fb fuse box). "New" is the one idea added; from 11 on, the two ideas combined.

| # | Working name | New idea, or the two combined | The reasoning move | The trap, in one line | Size | Draws on |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First light | The breaker | Trace the gold building's wire back to the feed | The breaker nearest the target is on another wire; it lights a house, harmlessly | 0 / 0 / 2 br | 01 |
| 2 | This way or that | The switch | Find which switch has current; one line lit means the other dark | The switch beside the target moves and nothing changes, because no current reaches it yet | 0 / 0 / 2 sw | 02 |
| 3 | Not enough for all | Capacity and brownout | Choose which group goes dark; the numbers do the sum | Shedding the two small unmarked houses still leaves it over; the pair on one breaker, a home among them, has to go | 0 / 0 / 4 br | 03, 04 |
| 4 | The spark | A damaged cable; faults are read by current | Bring power to the dark line first, then mend what shows | Clicking the dark line with the wire in hand does nothing: nothing to read there yet | 1 / wire / 1 sw | 06 |
| 5 | Not that one | Scarce parts; a dead junction costs two wires | Spend only on the wire between the feed and the target | The spark beside the target is on a neighbour's line; mend it and the junction reads *needs 2, have 1* | 2 / 2 wire / 1 br | 08 |
| 6 | Behind the fuse | Faults hide faults | Open the dark before spending a part that might be wanted behind it | A home with a live drop and dark windows asks for the one bulb; the target behind the blown fuse needs it | 3 / fuse, bulb / 1 br | 16, 07 |
| 7 | The long way | Reroute instead of a repair you can't afford | When the fault on the straight road costs more than you hold, look for another road | The dead junction is pointed at and can't be paid for; the switch is marked but turned away | 2 / wire / 1 sw | 10, 09 |
| 8 | The small box | Fuse rating: a local limit, and a blow costs a part | A red breaker means "not yet": find what shares its box and take that off first | The feed reads half empty; shedding the one house that is not behind the box changes nothing | 0 / fuse / 3 br, 1 fb | 11 |
| 9 | Two ways round | The ring: two roads round a block | Ask which side of each break each target is on; one mend joins both from one side | Mending the break by the lit homes lights one target and strands the other behind the second break | 2 / wire / 1 sw | city-two-ways-round |
| 10 | Count the dark | A bulb is a load event | A dead building draws nothing until its bulb goes in; count it before | The box reads 2 of 3 after the fuse; the target's bulb brings 2 more at once | 2 / 2 fuse, bulb / 2 br, 1 fb | 17 |
| 11 | Leave it open | Ring + rating: a break is the open point between two fuse boxes | Before mending a break on a ring, ask which box the dark stretch lands on and what else that box must still carry, the building behind an open breaker included | The spark beside the dark weavers fits the wire and nothing is red; mended, the south box has no room left for the forge | 3 / fuse, wire / 1 br, 2 fb; 2 blocks | 31, 29 |
| 12 | Draw the line | Two feeds (new piece) + scarce parts: two pools; joined is not pooled, the nearer feed takes what it reaches and a breaker draws the line | A full feed with nothing to shed: bring the other feed to the target, and open the breaker that puts the line where the other feed's room ends | The dark homes' spark reads white because East has room; it is the room, and the wire, the pump house needs | 4 / 2 wire, bulb / 3 br, 2 feeds; 2 blocks | 15 |
| 13 | Look from behind | Ring + faults hide faults: a second route reads a hidden fault's far side for free | Use a switch to look, not to route: throw it, read the back of the road, throw it back, then pay for the road you can afford | The cheap spark on the short road hides a dead junction; the far switch would have shown it, and the road it shows costs the chapel | 4 / 2 wire / 1 sw, 1 br; 2 blocks | 46, 38 |
| 14 | Split the dark | Rating + the ring, two boxes (which fuse): a dark stretch joined in one piece goes to one box whole | Start from the building only one box can hold and work back; cut the dark in two with a breaker that has no current, then wake each half from its own side | Both breakers into the dark read red and neither blows; the stretch wakes whole on one box, and the bulb is then 4 more than it holds | 1 / bulb, fuse / 4 br, 2 fb; 2 blocks | 12, 23 |
| 15 | The fuse above | Nested fuses (new piece) + two feeds: two bars for one building | The small box shows room and the move is red: look up the wire, list what hangs under the mother, and take load off it on the other branch (here, hand it to the second feed) | The child, once fused, shows 1 of 4 and the glassworks' road is red anyway; mend it and the mother blows with no fuse left | 2 / fuse, wire / 3 br, 2 fb, 2 feeds; 2 blocks | 43, 34 |
| 16 | Let it blow | The deliberate blow (section NB) + nested fuses: a rated box used as the breaker a heavy building lacks | Red, on purpose: hang a stretch of wire on the child box to overload it; ask which box the red names, what the blow takes with it, and how the stretch comes back | The one breaker under the full mother is the bath house's; shed it, light the infirmary, and the mother blows: the 4 that had to go has no breaker | 1 / bulb, fuse / 3 br, 2 fb; 3 blocks | new (NB1); the mother from 43 |
| 17 | The back door | The relay (new piece) + two boxes on a ring (rows 16 and 17 merged) | A relay can't be set dark; whatever is on its line when it wakes is carried. Wake it from the box with room, throw it, shut that door, and let in the box that is to keep it | The granary's spark is white and asks for a wire; mended, the back box no longer has room to wake the relay | 2 / 2 wire, fuse / 1 relay, 2 br, 2 fb; 2 blocks | 44, 45, 57, 53 |
| 18 | Make before break | The spring switch (new piece) + two feeds | Make before break: the second feed must reach the spring before the first lets go; joined is not pooled, so a breaker then hands it over | Opening the breaker to take the bell tower off North drops the spring; South arrives to find the tannery, and its fuse box blows | 3 / 2 bulb, wire, fuse / 1 spring, 1 relay, 1 br, 1 fb, 2 feeds; 2 blocks | 58 (new shape: two feeds and one rated box) |
| 19 | The cell | The battery | Temporary power: set what the feed can't reach safely, then let the feed in last | The breaker is red and stays red; the cell's wire into the dark side is why it is there | 0 / fuse / battery, 1 relay, 1 br, 1 fb | 21 |
| 20 | By cell light | Battery + faults hide faults | The window is a lantern: release, read both arms, then spend | The cheap spark on the near arm; the cell would have shown the junction behind it | 3 / 2 wire / battery, 1 relay, 1 sw | 32, 35 |
| 21 | Far one first | Battery + order | Plan the throws before releasing: each one moves the cell's own current | The relay nearest the cell and the target cuts the cell off from the far relay; the window holds two clicks | 0 / fuse / battery, 2 relay, 1 sw, 1 br | 26, 51 |
| 22 | Move the meeting | Two feeds + relay + a break | Shorten one feed's road so that feed carries the borrow | The one breaker beside the target; and the short road, once thrown, goes dark at a spark | 1 / wire, fuse / 1 relay, 1 sw, 1 br, 1 fb | 59 |
| 23 | The priests' list | Several targets + a main fuse equal to the feed | Decide what is lit, and when: here a brownout is a blow | Every step fits until the fourth target; the homes had to go dark two steps earlier | 3 / wire, bulb, fuse / 3 sw, 2 br, 3 fb | 40, 56 |
| 24 | Hold the spring | Battery + spring + a hidden break | A hand-over with a clock: the feed must take the spring before the cell runs flat | Bringing the feed in as soon as the spring is set looks safe; the mend that follows joins the heavy building to it | 2 / 2 wire, fuse / battery, 1 spring, 1 sw, 2 br | 60, 62 |
| 25 | The whole chain | Capstone: two feeds, cell, relay, spring, a hidden break, a dead bulb | Each fix changes who carries what; re-plan after every layer (6 layers) | Mending the spark between the feed and the empty cell hands a building to the wrong feed | 2 / wire, fuse, bulb / battery, 1 relay, 1 spring, 1 sw, 1 br, 2 fb | 64 |

**How the curve climbs.**
- **1 to 5, one element each, nothing hidden.** Breaker, switch, capacity, cable, scarce parts. Everything needed is on screen at the start. Puzzle 5 is the first where a part can be wasted.
- **6 to 10, one element each, something hidden or local.** Hidden faults, the reroute, the fuse rating, the ring, the bulb as a load. Each takes one fact the player cannot see on the first frame.
- **11 to 15, two known elements together.** No new piece except the second feed (12) and the mother fuse (15). The numbers are red on the tempting move; the puzzle is the order that makes room.
- **16 to 21, the three pieces the city has not shown yet,** one at a time and each on a plain map first: relay (16, 17), spring (18), battery (19 to 21). 18 drops the fuse on purpose so the spring is the only new thing.
- **22 to 25, layered.** Each fix shows the next problem, as Josh asked of the deep tier (28 Oct 2026). 3 to 4 layers on 22 and 23, 5 on 24, 6 on 25.

**What is left out, on purpose.** The capacity pair 03/04 becomes one puzzle; 09 and 10 one; the one-box family (13, 17, 19, 27, 28) one (10); the 18 battery maps three (19 to 21). "Leave it blown" (55), "Set it in the dark" (36) and "What's left in it" (39) are held back as substitutes (question 1).

**Per puzzle, when built** (the designer's rules, unchanged): a note with the intended read, The trap, a check block with the solution and the obvious wrong first move and its recovery, and the analyzer's numbers. The tribe's `priority` homes are named in each note with what the win costs them.

## 4. Open questions for Josh

Nothing in the series needs a rule or schema change. Four choices, one word each:

1. **Batteries in this series?** (Yes / No.) Five puzzles use the timed cell (19, 20, 21, 24, 25) and none has been played on the city. On "No", 19 to 21 become *Set it in the dark* (36's idea), *Leave it blown* (55's) and a relay-order puzzle, and 24 and 25 lose the cell and keep the spring and two feeds.
2. **May the priests ask for something other than the shrine?** (Yes / No.) The infirmary, the pump house, the granary, the lift. 59 of 64 maps light the shrine. On "No", every target stays a shrine and only the heavy buildings vary.
3. **Do the 25 replace the 17 city pilots in the stage select?** (Replace / Keep.) "Replace" leaves the pilots' files in the repo, unlisted.
4. **Build in three batches with a play between, or all 25 at once?** (Batches / All.) Batches: 1 to 5, 6 to 15, 16 to 25, so what 1 to 5 teach about reading on the city can change the rest.

## What it taught us

Josh, 25 Nov 2026, on cards:

- Plan: "Approve, batches (Recommended)".
- Batteries: "The puzzles should have progressive levels of difficulty and introduce new concepts to the player with each puzzle, one building upon the next."
- Targets: "I don't care. Just make sure that different points on the map are used with each puzzle. You can even use the same nodes over again if it means increasing the complexity of the puzzle to spread across multiple districts."
- Pilots in stage select: "Replace (Recommended)".
- Puzzles 11, 13, 14: "New move counts (Recommended)".
