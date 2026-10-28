# Rest: Circuits — the 2D puzzle prototype

A top-down, schematic, 2D version of Rest's repair loop, built to design and test the **fault-finding puzzles** before any 3D work. Everything the player does in the 3D game (read the lines, mark, cut the power, repair, relight) happens here on a flat map of cables and lamps.

Two things leave this prototype and go straight into the 3D game:

1. **The grid schema and the puzzle files** (`puzzles/*.grid.json`), which become `levels/*.grid.json` in the GDD's contracts table.
2. **The grid and night simulators** (`src/grid/`, `src/night/`): pure TypeScript with no rendering, so they can be copied into the Three.js project unchanged.

The 2D renderer, input and UI are throwaway. Keep them simple.

## What the player sees

A dark street drawn as a schematic: cables as lines, lamps as circles, fuse boxes, breakers and switches as marked boxes (the tribe's paint). Enoch is a dot. Nothing glows until he raises the lamp; then cables within reach show pulses moving away from the feed. Damaged cables spark on their own. Ribbons glow where he has tied them. When the last fault is fixed and the breaker goes on, power runs visibly down the cables and the lamps light in order: the Relight, in 2D.

## Rules carried over from the GDD (Decided there, fixed here)

- Power flows from the feed outward. Fuse boxes, breakers, switches, junctions and lines **conduct unless faulted**. Lamps are **leaves**: a dead lamp does not block the run.
- Faults: dead lamp (bulb, 2 s), blown fuse (fuse, 3 s), damaged cable (wire, 4 s, may need a climb). Dead junction (wire × 2, 5 s) is in the schema for the switch puzzles but is not in the first puzzle set.
- Signatures: pulses reach a dark lamp = dead lamp; pulses into a fuse box and none out = blown fuse; pulses up to a sparking break = damaged cable.
- The lamp shows current within reach (5 m in the 3D game; a radius here). Enoch moves slower with it raised.
- Ribbons mark faults, stay across nights, come off on repair, can be untied.
- A breaker cuts its section. Repairs on a live line take a timing check; a miss is a shock; two shocks in a night kill and roll back that night's repairs; repairs survive dawn.
- Satchel of 4. Salvage spots restock each night. The offering stall trades any part for favor (draw 2, offer 1), never runs out. Enoch starts with 0 favor; the job pays favor.
- Night is 15 minutes of game time at most; pause stops the clock.
- The Relight cannot be interrupted once it starts.

All numbers are the GDD's placeholders and are **tunable per puzzle** in the puzzle file, which is the point.

## What the prototype has that the 3D game will not need

- **Instant mode**: a toggle that removes walking time (Enoch teleports on click), so a puzzle can be tested for its deduction alone, then with movement cost added back.
- **A puzzle editor** in the browser: place nodes, draw lines, set faults and salvage, export JSON. Josh designs puzzles in it; agents never need to.
- **An analyzer** (`npm run analyze <puzzle>`): for a puzzle file, reports whether the job is finishable, which faults are readable from the start and which are hidden behind which, the minimum number of trips given the satchel, the parts the puzzle needs versus what salvage offers per night, and the walking distance of the shortest solution. Puzzle Designer uses it; it also runs as a test on every puzzle in `puzzles/`.
- **A session log**: each playthrough writes what the player did and when (reads, ribbons, breaker throws, repairs, trips, dawn, deaths) to a JSON file that can be saved, so a cold playtest leaves data.

## Questions this prototype answers

From [the GDD review](gdd-review.md):

1. Which puzzle elements produce deduction rather than walking?
2. How many faults, of what mix, make one street feel like a job and not a chore?
3. How long does a night actually take, and does dawn ever arrive on Lamp Row?
4. Do leaves-vs-in-line rules make the grid readable?
5. Is the satchel/favor economy a planning puzzle or friction?
6. What do the grid, repair and UI agents actually cost in tokens?

## Puzzle set to build, in order

Each puzzle tests one element. The analyzer must pass on each.

| # | Puzzle | Element under test |
| --- | --- | --- |
| 1 | **Lamp Row** (the GDD's tutorial, as written) | Baseline. The hidden fuse box. Two trips. |
| 2 | **Shared fuse** | One fuse box, three dark lamps. Fuse or bulbs? |
| 3 | **Ambiguous dark** | Everything past a blown fuse is unreadable. Fix first and come back, or carry bulbs on spec? |
| 4 | **Far breaker** | The breaker is a long walk; live repair is tempting. |
| 5 | **Two breakers** | Which to throw so the relit half stays on. |
| 6 | **Ring with a switch** | A loop fed from two sides; the fault's position depends on the switch. |
| 7 | **Scarce parts** | Salvage is short of what the job needs; the stores are required. |
| 8 | **Tiny capacity** | Five lamps, power for three. Choose. |

Puzzles 6 and 8 need `switch` nodes and a `capacity` field in the schema; both are in the draft schema and both are Draft in the GDD.

## Stack

- TypeScript (strict), Vite, Vitest: the GDD's stack, so the simulator ports unchanged.
- Canvas 2D for the renderer, HTML/CSS for the UI. No game framework.
- Node.js LTS is required and is **not installed on this PC yet** (`winget install OpenJS.NodeJS.LTS`).
- Hosting: GitHub Pages from `main`, like the 3D game will be.

## Folders and owners

| Folder | Owner | What is in it |
| --- | --- | --- |
| `src/core/` | lead-architect | Types for the schema, events, the puzzle loader |
| `src/grid/` | grid-simulator | Power flow, fault visibility, repair effects. Pure. |
| `src/night/` | grid-simulator | The clock, pause, shocks, death rollback. Pure. |
| `src/render/` | renderer | Canvas drawing, lamp reach, pulses, sparks, ribbons, the Relight |
| `src/play/` | interaction | Movement, lamp raise, ribbon, breaker, repair hold and timing check, satchel, salvage, stores |
| `src/ui/` | ui | Prompts, satchel, favor, offering screen, pause, dawn and death screens |
| `src/editor/` | interaction | The puzzle editor |
| `tools/` | grid-simulator | The analyzer CLI |
| `puzzles/` | puzzle-designer | Puzzle files and their design notes |
| `puzzles/locked/` | Josh | Puzzles Josh has approved; never edited, only replaced on his word |
| `tickets/` | lead-architect | One file per ticket, with acceptance criteria |
| `reviews/` | code-reviewer | One review per ticket |

## Done when

- All eight puzzles load, pass the analyzer, and can be played to the Relight in the browser.
- Lamp Row, played cold by someone new, is finished within two nights; the session log says how long each night took.
- The grid and night modules have tests for every rule in "Rules carried over", and the analyzer runs over every puzzle in CI.
- Josh has written `docs/13-puzzle-design.md` for the GDD from what the puzzles taught.
