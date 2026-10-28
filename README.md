# Rest: Circuits

The power-routing minigame prototype for [*Rest*](https://github.com/joshkeal-daboyz/rest-gdd), a game about a raccoon mechanic relighting a dead city. A top-down map of a town section: the player throws breakers and switches and spends scarce parts to route the failing feed's limited power to what the priests want lit, choosing what stays dark. This repo exists to test that puzzle in 2D before any 3D work, and to produce two things the 3D game takes as-is: the map files and the pure-logic grid simulator.

**Status:** first playable prototype (the shrine circuit). See [docs/prototype-brief.md](docs/prototype-brief.md).

## What is here

| Path | What |
| --- | --- |
| [docs/prototype-brief.md](docs/prototype-brief.md) | What the prototype is, the rules it carries from the GDD, the puzzle set, the folder owners, and "done when" |
| [docs/gdd-review.md](docs/gdd-review.md) | Review of the GDD, 27 Oct 2026; the prototype's questions come from it |
| [docs/pipeline-review.md](docs/pipeline-review.md) | Review of the Forge art pipeline in rest-gdd, and how its shape is reused here for code |
| [puzzles/SCHEMA.md](puzzles/SCHEMA.md) | The grid puzzle format (becomes `levels/*.grid.json` in the 3D game) |
| [puzzles/lamp-row.grid.json](puzzles/lamp-row.grid.json) · [lamp-row.md](puzzles/lamp-row.md) | The GDD's tutorial job as the first puzzle, with its design note |
| [CLAUDE.md](CLAUDE.md) | The rules and the ticket / puzzle loops for the agent crew |
| [.claude/agents/](.claude/agents/) | The crew: lead-architect, grid-simulator, puzzle-designer, renderer, interaction, ui, code-reviewer |
| `tickets/`, `reviews/` | One file per ticket and per review (created by the crew) |

## Running it (once there is code)

Requires Node.js LTS.

```bash
npm install
npm run dev        # the game and the puzzle editor
npm test           # Vitest
npm run analyze puzzles/lamp-row.grid.json
```

## How work happens

Josh asks → the lead-architect cuts a ticket → Josh approves → a builder agent implements on a branch with tests → the code-reviewer reviews independently → Josh plays it and says merge. Puzzles: the puzzle-designer drafts one per element under test → Josh plays it → his verdict goes in the design note → he locks the ones that work. Details in [CLAUDE.md](CLAUDE.md).
