# City style: Block grammar

standard: yes
Scope: how a City Pack city is generated from a map (the grammar and the pipeline), and how block sizes vary.
Read by: planner
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/block-stacks.md` (16.3), `docs/city-style/streets-and-blocks.md` (the streets), `docs/city-style/frontage-and-interiors.md` (19.4 and 19.6), `docs/city-style/evaluation.md` (16.8, 19.7 and the readings of 19.3 and 19.5)

## Rules

## 16. Procedural city

- **Rule [D-053c]**: chapter 16 is a grammar. Read from the top, it says how a City Pack city is generated from a map, which rule makes each part, and how to check the result against the reference.

The reference is a city street with these parts: continuous terraces of 3 to 5 storey blocks; shopfront ground floors with glass, awnings and signs; apartment floors in varied colours; fire escapes on street faces; props on every roof; a corner plaza; a parking lot; alleys between blocks; street furniture along the pavement. People, animals and vehicles are left out.

The pipeline, in order. Everything up to the last step is pure (no three, no DOM, no assets in the tests), and every choice is a hash of a key, so one map gives one city every time.

1. `townLayout` (`town.ts`): streets, outer blocks, terrace runs, open lots.
2. `packTown` (`terrace.ts`): each run becomes exact blocks, with `assembleStack` (`stacks.ts`) building each from the pack's pieces.
3. `dressTown` (`dressing.ts`): the dressing of each block.
4. `furnitureLayout` (`furniture.ts`): the pavements, the open lots and the alleys.
5. `applyModels` (`models3d.ts`): draws all of it, and only when the City Pack GLB is there.
6. `citymetrics.ts` measures steps 1 to 4 against the checklist of 16.8.


### 16.1 Grammar

| Level | What it is | Made by | Chosen by |
| --- | --- | --- | --- |
| Town window | the ring road and one ring of outer blocks (`OUTER_RINGS`) | `townLayout` | the circuit's bounds (chapter 3) |
| Outer block | the ground inside four streets, four rows pinwheel-fashion | `townLayout` | the grid (`BLOCK_PITCH`) |
| Row | one side of an outer block, a band `TERRACE_DEPTH_M` deep | `townLayout` | the pinwheel (chapter 4) |
| Run | a stretch of abutting lots in a row, `TerraceRun`, with a start (a corner or not) and an end (a corner, a plaza, a parking lot, or "end") | `townLayout` | where the lots clear their height cap |
| Open lot | a parking lot or a plaza in a row, in `Town.openLots` | `townLayout` | `stableHash` of the run and the block, `PARKING_ONE_IN`, `PLAZA_ONE_IN` |
| Block | one stack standing on a run: a style, columns, floors | `packTerrace` and `assembleStack` | the least-used style, the neighbour rule, the far-gap rule |
| Column (a bay) | one floor piece's width along the street | `assembleStack` | the style's floor piece |
| Storey | the base (the ground row), the floors, the roof | `assembleStack` | `STACK_FLOORS`, the cap, a hash of the block key |
| Slot | a place on a piece where dressing may stand, per role | `DRESS_SLOTS` | the piece's role (`dressRoleOf`) |
| Prop | a pack piece standing in a slot, or an item of furniture on a pavement line | `dressBlock`, `furnitureLayout` | a hash of the lot key (dressing) or the run id (furniture), under the caps of 16.5 |
| Alley | the gap of `ALLEY_MIN_M` to `ALLEY_MAX_M` at a run's far end | `packTerrace` | the far-gap rule |


### 19.3 Thinner blocks: considered, not the default

- **Default (057)**: keep blocks of the sizes of 19.5 and fill their interiors (19.4).


### 19.5 Block variety: 90 degrees, not a grid of squares

- **Rule [D-057r]**: streets are at 90 degrees, but the city is not a grid of equal squares: blocks vary in width, and alleys and parks (19.6) break them up.
- **Default (057)**: a wider range, from `BLOCK_TILES` (a block side is 6 to 16 cells, 30 to 80 m).
  - Neighbouring lines on one axis differ by at least `BLOCK_STEP_MIN_CELLS` cells, by hash, and no size is repeated on an axis while a free one exists (with 11 sizes and at most 6 blocks, one does), so every column and every row is its own width.
  - Every street keeps its profile along its whole length (055 design item 3), because the lines stay straight and continuous: a block's size changes the spacing between lines, never a street's cross-section. Streets that end at a T-junction are not built; a later ticket could let an interior line stop and merge two blocks into one long one.
  - Alleys and parks (19.6) split or replace parts of blocks, so blocks in one column no longer look alike.
- **Default (057)**: block types by size (`TileBlock.type`, from `blockType`):

| Type | Both or one side | Constants |
| --- | --- | --- |
| small | both sides at most `BLOCK_SMALL_MAX_M` | 40 m |
| long | one side at least `BLOCK_LONG_MIN_M` and the other at most `BLOCK_LONG_SHORT_MAX_M` | 60 m and 45 m |
| large | both sides at least `BLOCK_LARGE_MIN_M` | 55 m |
| medium | the rest | |

The block draw has three rules beyond the ranges above. They narrow the effective spread of the 6 to 16 cell range.

- A block whose longer side is under 7 cells (35 m) is rejected, because the kerbside bays (18.3) cannot be laid on a 6 x 6 block on streets.
- The mean block size on each axis is at least `BLOCK_MEAN_MIN_CELLS` (10 cells, 50 m).
- A draw that misses the variety rules (V1 and V2 of 19.7) or cannot be laid is redrawn by hash, at most `BLOCK_DRAWS_MAX` times; if every draw misses, a known-good layout is used (`BLOCK_FALLBACK_WIDTHS` and `BLOCK_FALLBACK_DEPTHS`, cut to the city's size). `alleys.test.ts` forces the miss.

## Open questions

- **Open**: thinner blocks, with one axis of 15 m rowhouse blocks, as an alternative to the sizes of 19.5. Waits for: a later ticket.
