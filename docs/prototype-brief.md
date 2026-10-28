# Rest: Circuits — the circuit-fixing minigame

*Rest*'s repairs are a click-and-hold, and the GDD review found the loop around them is mostly walking. Josh's call (27 Oct 2026): **the repair itself becomes a puzzle.** When Enoch opens a fuse box or junction, the player works inside it: probe with the tester lamp to find where the current stops, cut the power, splice wire or swap a fuse or bulb with the parts carried, and throw it back on. This repo builds that minigame first, standalone and 2D, so the puzzles can be designed and tested before any 3D work.

Two things leave this prototype and go into the 3D game:

1. **The panel files** (`puzzles/*.json`): each fuse box and junction in the city is one of these.
2. **The circuit simulator** (`src/grid/`) and the night rules (`src/night/`): pure TypeScript, no rendering, copied unchanged.

The street layer (walking between panels, salvage, the stall, dawn) is the **outer loop** and comes after the minigame proves itself. The grid schema already covers it; see "Later: the street".

## What the player sees

A panel: the inside of a tribe-marked fuse box, drawn as a schematic. Terminals as dots, wires as lines between them, fuse holders, bulb sockets, a breaker on the panel, and the feed coming in. On the right, the **loads**: the street lamps this panel feeds, dark. Enoch's satchel at the bottom with its four parts.

Nothing in the panel shows current until the player **probes** it: click a terminal or a wire with the tester lamp, and that spot shows live (pulses moving away from the feed) or dead. Probed spots stay shown. Damaged wire sparks on its own. A blown fuse looks exactly like a good one until probed on both sides.

When the player has found a fault, they cut the panel's breaker (or risk it live), drag the part onto the fault, hold while a ring fills, and throw the breaker back on. Loads that now have power light up. When every load is lit: **the Relight**, power running visibly through the panel and out to the lamps.

## Rules

Carried from the GDD (Decided there, fixed here):

- Power flows from the feed outward. Wires, terminals, fuses, breakers and switches **conduct unless faulted**. Loads (bulbs) are **leaves**: a dead bulb never blocks anything else.
- Parts: **bulb, fuse, wire.** Fault → part: dead bulb → bulb (2 s), blown fuse → fuse (3 s), damaged wire → wire (4 s).
- Signatures: current reaches a dark bulb; current into a fuse and none out; current up to a sparking break.
- Faults hide faults: nothing past an unrepaired blocking fault can be read.
- The breaker cuts the panel. Repairs on a live panel take a timing check; a miss is a shock; two shocks in a night kill and roll back that night's repairs; repairs survive dawn.
- Letting go early cancels the repair and keeps the part. A repair can't start without the part, and the prompt names it.
- Satchel of four. The Relight can't be interrupted.

New for the minigame (Draft, Josh's to tune):

- **Probing needs current.** The tester shows nothing on a dead panel, so the player reads with the breaker on and fixes with it off. That is the GDD's tension, now inside one box.
- **A probe costs time**, not parts: a few seconds of the night clock. Diagnosis by elimination is cheaper than probing everything.
- **Wrong fixes cost time only.** Replacing a good fuse hands the old one back; splicing an intact wire does nothing. The part is consumed only when it fixes a fault. (If this makes guessing too cheap, the first tuning knob is "a wrong part is lost".)
- **Fuses have a rating** and bulbs a load. A fuse carrying more load than its rating blows again when power returns. The player may have to move a load to another fuse, by splicing, to make the panel hold. This is the GDD's *restraint is the virtue*, in a fuse box.
- **Switches** choose which of two wires carries on. A load on the unselected side is dark but not faulty.

## Puzzle elements, in the order to build and test

Each panel tests one element. The analyzer must pass on each.

| # | Panel | Element under test |
| --- | --- | --- |
| 1 | **First box** | One chain, one damaged wire. Teaches probe → breaker → splice → breaker. |
| 2 | **Where does it stop** | A long chain with one blown fuse among several. Binary search with the probe. |
| 3 | **Which branch** | The feed splits three ways; one branch is dead. Probe the split, not the ends. |
| 4 | **Fuse or bulbs** | One fuse feeds three dark bulbs. Probe the fuse's output before carrying three bulbs. |
| 5 | **Behind the first** | Fix a fuse, power returns, and a bulb past it is still dark. Faults hide faults. |
| 6 | **Not broken, switched** | A dark load that only needs the switch thrown. The decoy. |
| 7 | **Too many on one fuse** | Every part is good; the fuse blows on load. Move a bulb to another fuse by splicing. |
| 8 | **Short of parts** | The panel needs two wires; the satchel has one. The player must leave and come back (street layer later; for now, a "fetch" button that costs night time). |
| 9 | **Live or walk** | The breaker is on the far side of a long panel (or, later, down the street). Live splice is tempting. |

## What the prototype has that the 3D game will not need

- **A panel picker** and a **panel editor** in the browser: place terminals, draw wires, set fuses (rating), bulbs (load), switches, faults; export JSON. Josh designs panels in it.
- **An analyzer** (`npm run analyze <panel>`): finishable from the given satchel; which faults are readable at the start and which hide behind which; the fewest probes that locate every fault (the puzzle's information depth); parts needed; whether any fuse is overloaded once everything is fixed.
- **A session log**: every probe, throw, repair and shock with a game-time stamp, downloadable, so a cold playtest leaves data.
- **Night time without a street**: the clock runs while the panel is open; a "fetch parts" button stands in for the walk back to the stall until the street layer exists.

## Questions this prototype answers

1. Is diagnosing a panel with a probe a puzzle, or a chore with extra clicks? (GDD review, finding 1)
2. How many probes does a good panel take, and how long does it feel? (finding 3)
3. Does "probe live, fix dead" produce the breaker tension the GDD wants, without the walk?
4. Does the fuse rating rule make a real choice, and does it read?
5. What do the grid, interaction and UI agents actually cost in tokens? (finding 9)

## Stack

- TypeScript (strict), Vite, Vitest. Canvas 2D for the panel, HTML/CSS for the UI, no game framework.
- Node 24 LTS (installed 27 Oct 2026).
- Hosting: GitHub Pages from `main`.

## Folders and owners

| Folder | Owner | What is in it |
| --- | --- | --- |
| `src/core/` | lead-architect | Types for the schema, events, the loader and validator |
| `src/grid/` | grid-simulator | Power flow, readability, fuse load, repair effects. Pure. |
| `src/night/` | grid-simulator | The clock, pause, shocks, death rollback. Pure. |
| `src/render/` | renderer | The panel on canvas: probes, pulses, sparks, the Relight |
| `src/play/` | interaction | Probe, breaker, switch, drag-a-part, the repair hold and timing check, satchel, fetch, the session log |
| `src/editor/` | interaction | The panel editor |
| `src/ui/` | ui | Prompts, satchel, picker, pause, dawn and death screens |
| `tools/` | grid-simulator | The analyzer CLI |
| `puzzles/` | puzzle-designer | Panel files and their design notes |
| `puzzles/locked/` | Josh | Panels Josh has approved; never edited by agents |
| `tickets/`, `reviews/` | lead-architect, code-reviewer | One file each per ticket |

## Later: the street

The outer loop (walking Lamp Row between panels, the lamp's 5 m reach, ribbons, salvage spots, the offering stall, dawn) uses the same schema at street scale: `puzzles/lamp-row.grid.json` is already written that way, and its design note explains the hidden fuse box. Once two or three panels are fun, the street becomes the thing that connects them, and each fuse box on it opens a panel. Don't build it first.

## Done when

- The nine panels load, pass the analyzer, and can each be played to the Relight.
- Someone new to the game finishes panels 1–4 cold, and the session log says how many probes and how long each took.
- `src/grid/` and `src/night/` have a test per rule above, and the analyzer runs over every panel in CI.
- Josh has written `docs/13-puzzle-design.md` for the GDD from what the panels taught.
