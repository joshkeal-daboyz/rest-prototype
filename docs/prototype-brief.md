# Rest: Circuits — the power-routing minigame

*Rest*'s core loop, as the GDD review found, is mostly walking between simple repairs. Josh's call (27 Oct 2026): keep the game **high level**. The minigame is a top-down map of a section of the town. The priests name what must be lit (a shrine, a street, a lift). The player throws breakers and switches, orders repairs with the parts on hand, and routes the failing source's limited power to light the target, choosing what stays dark. No avatar, no walking, no probing. It is a puzzle about **topology, capacity and scarce parts**.

Two things leave this prototype and go into the 3D game:

1. **The map files** (`puzzles/*.json`): each district job in the city is one of these; the GDD's `levels/*.grid.json`.
2. **The grid simulator** (`src/grid/`): pure TypeScript, no rendering, copied unchanged. In the 3D game it drives the same lamps with Enoch walking between the controls.

## What the player sees

A dark town section drawn as a schematic: the feed at one edge with its **capacity** shown, cables as lines, junctions, fuse boxes, breakers and switches marked with the tribe's paint and ribbon, lamps as circles with their **load**. One or more lamps carry a **target** mark: the priests' request. On the side, the parts Enoch has: bulbs, fuses, wire.

Live cables show pulses moving away from the feed, so the player reads the whole map at once: where the current stops is a fault. Dead branches show nothing, so faults past a fault stay unknown until power reaches them. Damaged cables spark when live. A blown fuse shows current in and none out.

The player clicks a breaker or switch to throw it, and clicks a fault to repair it if they hold the part. The map updates at once. If more load is lit than the feed can carry, the whole section **browns out**: every lamp flickers and nothing counts as lit. When every target is lit and the section holds: **the Relight**, power running down the cables and the lamps igniting in order.

## Rules

Carried from the GDD (Decided there, fixed here):

- Power flows from the feed outward. Cables, junctions, fuse boxes, breakers and switches **conduct unless faulted**. Lamps are **leaves**: a dead lamp never blocks anything.
- A breaker cuts everything downstream. A switch sends power down one of two lines.
- Parts: **bulb, fuse, wire**. Fault → part: dead lamp → bulb; blown fuse → fuse; damaged cable → wire; dead junction → wire × 2.
- Signatures: current reaches a dark lamp; current into a fuse box and none out; current up to a sparking break; current into a junction and none out with no fuse to blame.
- Faults hide faults: nothing past an unrepaired blocking fault can be read.
- The Relight can't be interrupted.

New for the minigame (Draft, Josh's to tune):

- **Capacity.** The feed carries at most `capacity` load. If the lit lamps' total load exceeds it, the section browns out: all lamps flicker, none count as lit. The player sheds load with breakers and switches. This is *restraint is the virtue* as a puzzle rule.
- **Fuse rating.** A fuse box carrying more load than its `rating` blows when powered (a new blown-fuse fault). Fuses partition the map into sections the player must balance.
- **Scarce parts.** Each map says what Enoch brought. Repairs are instant on click and consume the part. Often the obvious repair can't be afforded and a reroute is the answer.
- **Targets.** `target` lists the lamps the priests want lit. The job is won when every target is lit and nothing is browned out. Other lamps are optional; the map may name **priorities** later (what the tribe wishes stayed lit) for a score, not a win condition.
- No night clock, shocks or walking in this scope. They return with the street layer.

## Puzzle elements, in the order to build and test

Each map tests one element. The analyzer must pass on each.

| # | Map | Element under test |
| --- | --- | --- |
| 1 | **Shrine circuit** (the GDD's MVP mission) | The obvious repair can't be afforded; reroute with the switch; then shed load to fit capacity. Teaches everything in one small map. |
| 2 | **Where it stops** | A chain with one fault; current shows where. Pure reading. |
| 3 | **Behind the first** | Fix a fuse, power returns, a second fault appears past it. Faults hide faults. |
| 4 | **Not enough for all** | Everything works; capacity covers two of three branches. Choose; the target decides. |
| 5 | **Which fuse** | Three branches on fuses of different ratings; moving a load means a different route. |
| 6 | **Ring main** | A loop fed from two sides with a switch; a fault's effect depends on the switch. |
| 7 | **Two wires, one job** | Two breaks and one wire. Which to fix, and reroute around the other. |
| 8 | **The priests' list** | Several targets with a capacity that can't cover all plus the tribe's homes. What goes dark. |

## What the prototype has that the 3D game will not need

- **A map picker** and a **map editor** in the browser: place nodes, draw lines, set capacity, ratings, loads, switches, faults, parts and targets; export JSON. Josh designs maps in it.
- **An analyzer** (`npm run analyze <map>`): solvable from the given parts; which faults are readable at the start and which hide behind which; the smallest set of actions (throws + repairs) that wins; the final load against capacity; whether any fuse blows along the way; how many distinct winning configurations exist (one = a tight puzzle, many = loose).
- **A session log**: every throw and repair in order, downloadable, so a cold playtest leaves data.
- **Undo**, so the player can explore without fear; the log keeps the full history.

## Questions this prototype answers

1. Is routing power with switches, breakers and scarce parts a puzzle worth building the game around? (GDD review, finding 1)
2. Does capacity produce a real choice, and does brownout read clearly?
3. How many actions does a good map take, and how long does it feel?
4. Does "faults hide faults" work as deduction on a map the player can see whole?
5. What do the grid, interaction and UI agents actually cost in tokens? (finding 9)

## Stack

- TypeScript (strict), Vite, Vitest. Canvas 2D for the map, HTML/CSS for the UI, no game framework.
- Node 24 LTS (installed 27 Oct 2026).
- Hosting: GitHub Pages from `main`.

## Folders and owners

| Folder | Owner | What is in it |
| --- | --- | --- |
| `src/core/` | lead-architect | Types for the schema, events, the loader and validator |
| `src/grid/` | grid-simulator | Power flow, readability, capacity, fuse load, repairs. Pure. |
| `src/night/` | grid-simulator | Deferred: the night clock returns with the street layer |
| `src/render/` | renderer | The map on canvas: pulses, sparks, brownout flicker, the Relight |
| `src/play/` | interaction | Click to throw or repair, parts, undo, the session log |
| `src/editor/` | interaction | The map editor |
| `src/ui/` | ui | Prompts, parts, targets, picker, win screen |
| `tools/` | grid-simulator | The analyzer CLI |
| `puzzles/` | puzzle-designer | Map files and their design notes |
| `puzzles/locked/` | Josh | Maps Josh has approved; never edited by agents |
| `tickets/`, `reviews/` | lead-architect, code-reviewer | One file each per ticket |

## Later: the street

The 3D game adds Enoch walking the same map: the lamp's reach, ribbons, the breaker walk, salvage, the stall, dawn and shocks. `puzzles/lamp-row.grid.json` (`scope: "street"`) is already written for that layer and its note explains the hidden fuse box. Don't build it first.

## Done when

- The eight maps load, pass the analyzer, and can each be played to the Relight.
- Someone new to the game solves maps 1–4 cold, and the session log says how many actions and how long each took.
- `src/grid/` has a test per rule above, and the analyzer runs over every map in CI.
- Josh has written `docs/13-puzzle-design.md` for the GDD from what the maps taught.
