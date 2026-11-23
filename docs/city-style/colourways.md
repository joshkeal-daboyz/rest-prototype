# City style: Colourways

standard: yes
Scope: the colourway atlases a City Pack block is drawn in, the pool of ids, the neighbour rule (R13) and how they are loaded and painted.
Read by: buildings
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/buildings.md` (16.4 and 16.7), `docs/city-style/facades.md` (16.5, the dressing), `docs/city-style/evaluation.md` (16.8, and the readings of the colourways)

## Rules

#### From 16.9 (the colourway rule)

**Colourways (ticket 054).** Every City Pack block is drawn in one of the pack's colourway atlases, so neighbours differ in wall colour as they do in the reference. A colourway is an alternate texture of the same 1024 x 1024 layout: only cell colours change, so a block keeps its shape and its walls change. `colourway.ts` holds the rules (pure, no three); `models3d.ts` does the drawing.

- **Default (054)**: the pool is `COLOURWAY_POOL`, in the order of the table below, and only these ids are ever fetched. `base` is the atlas the GLB embeds (today's look: it needs no file and no clone). The B tones (about 8% darker, and a night scene is already dark) and 01_A (the same as the base) are left out.

| Id | Series | Tone | Brick wall |
| --- | --- | --- | --- |
| base | 01 | as the GLB embeds it | red, #956257 |
| 01_C | 01 | C, brighter and more saturated | warmer orange-red, #a16458 |
| 02_A | 02 | A, as drawn | dark green, #475343 |
| 02_C | 02 | C | a brighter green |
| 03_A | 03 | A | cream-tan, #ac8f79 |
| 03_C | 03 | C | a brighter tan |
| 04_A | 04 | A | teal, #497d7e |
| 04_C | 04 | C | a brighter teal |

- **Default (054)**: the neighbour rule (R13). A block's start index is a hash of its lot key (`assignColourways`, through a murmur-style finaliser because FNV's low bits are weak on short keys) modulo the number of ids available; if that is the id of the block before it in the same run, it steps to the next. So two neighbours in a run never share a colourway while two or more are available. A stack on a lone lot (no run) takes its hash's id. The available ids are `base` plus the pool ids that loaded, in pool order; with `base` alone every block is `base`.
- **Default (054)**: neighbours across a corner (the last block of one run and the corner block of the next) are not forced to differ; a match is one in eight. R13 counts within a run only.
- **Default (054)**: only a stack's pieces are painted, and only a material whose map is the base atlas (the texture or image is named for the base, or for the base followed by a colourway id). Glass, the replaced glass and any material with no map keep the very same objects. Each painted material is a clone, cached per source material and id, so no cached model is ever touched; the new map copies the old one's flip, colour space and wrap, uses the nearest filter and has no mipmaps. An emissive map is never set from a colourway.
- **Default (054)**: dressing and furniture keep the base atlas. Each dressing key is one `InstancedMesh` shared by every block (16.5), and matching the block would split every key into up to eight meshes and break the draw-call cap `DRESS_DRAW_CALLS_MAX`. The reference's awnings and escapes also contrast with their walls: they do not match them.
- **Default (054)**: loading is lazy and optional (16.7). The City Pack entry's `colourways` field is read only when stack keys were asked for; the pool's ids load in parallel; one that fails is dropped with one console line and the rest are used. The export that makes the files and the field is `tools/assets/colourways.ts` (a table of file names only; the images are Synty content, gitignored and fetched by URL at dev time, never bundled).

The colour judgement is made with `light=day`: the hue difference is subtle in the night scene. `citymetrics.test.ts` measures R13 on the three maps of the protocol with a fixed fake set of 8 ids, not the real files (CI has none). The eye half is in 16.8.

## Open questions

- **Open**: not every wall changes. The colourways recolour only some gradient columns (the brick, the warm browns, one tan); the grey-walled styles and the shopfront ground floors are the same in every colourway, so the variety is mostly the brick upper floors. The follow-up, if wanted, is a per-column hue remap of the base made by the converter, not more of this pool. Waits for: a generated-recolour ticket, if the eye check finds too few colours.
