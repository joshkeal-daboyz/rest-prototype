# City style: Buildings

standard: yes
Scope: how a lot's building is chosen (the pack chain, variety and exclusions), how variety is kept on a terrace, and what the city falls back to when a pack is missing.
Read by: buildings
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/fronts.md` and `docs/city-style/corner-buildings.md` (chapters 6 and 7), `docs/city-style/colourways.md` (16.9), `docs/city-style/block-stacks.md` (16.3), `docs/city-style/packs.md` (the packs), `docs/city-style/evaluation.md` (the readings)

## Rules

## 5. Choosing a building

- **Default (042)**: a lot's building is chosen by family first, then by variant. A family is one mesh under several names: models of one pack whose bounds agree to 1 cm and whose triangle counts are equal (`meshFamily`). Each family has equal weight, so a mesh with three names is not three times as likely.
- **Default (041)**: neighbours (lots within `NEIGHBOUR_GAP`) never share a family. Along one road side a family does not return within `STREET_REPEAT_GAP` lots. On a map no family takes more than `FAMILY_SHARE_MAX` of its type's lots when the type has four or more families. A pick that breaks a rule takes the next family; if every family breaks one, the cap goes first, then the street rule, then the neighbour rule.
- **Rule [D-042a]**: the variety rules above exist because of the ruling recorded in this row.
- **Default [D-042b]**: `BUILDING_EXCLUDE` drops models outright. It lists `pack:name` keys (for example `simple-town:store_small_mesh`), because names repeat across packs. A named store would go there. In a dev build, models shift-clicked in the gallery are excluded too, from a file on the developer's PC; a fresh checkout and CI use the code's list only.
- **Rule [D-047a]**: the video rental store, `simple-town:store_small_mesh`, is excluded through `BUILDING_EXCLUDE`. Its small lots go to the other small-lot families. It stays in `MODEL_TABLE` and in the gallery, which marks it `excluded`.
- **Default (041)**: when no model fits a lot type (or there is no manifest), the lot keeps its placeholder building.
- **Default [D-048a]**: POLYGON buildings come first, type by type. `MODEL_TABLE` lists the Town Pack's twelve whole houses ahead of SIMPLE Town's rows, which are marked `fallback`. A lot type uses its POLYGON models when, after `BUILDING_EXCLUDE`, they make at least `POLYGON_MIN_FAMILIES` mesh families for that type (4 for `small`, `house` and `large`, 3 for `tall`: the variety rules' own counts). Otherwise it uses its SIMPLE Town models. The two never mix within a type, though different types on one street may differ. A type with no SIMPLE Town model loaded keeps its POLYGON ones however few.
- **Default [D-050a]**: City Pack stacks come first, then the Town Pack, then SIMPLE Town, type by type: a three-step chain per lot type. A type in `STACK_LOT_TYPES` (`large` and `tall`; small and house keep the Town Pack's houses) uses City Pack stacks when the styles that can stand on it, after `BUILDING_EXCLUDE` and the pieces that loaded, make at least `POLYGON_MIN_FAMILIES` for that type (each style is one family, `city-pack:stack:<style>`). Otherwise the type follows the Town Pack rule above (Town Pack whole houses, else SIMPLE Town). The three never mix within a type. The neighbour, street-repeat and share rules above apply to stacks unchanged. A piece whose root did not load, or whose key is excluded, drops the styles that need it; if every style drops, the type falls down the chain.

With no Town Pack in the manifest, or its GLB failed to load, every type is SIMPLE Town. With the fixture sizes, `large` offers six stack styles (the three apartment styles, `office-old-small`, `office-old-large`, `office-octagon`) and `tall` four (the three apartment styles and `office-old-small`); a stack's floors over its base are picked by hash from the range the cap allows (`STACK_FLOORS` is the minimum). How stacks are used on a terrace, and the variety and fallback rules that apply to them, are in chapter 16 (16.3, 16.4 and 16.7).


### 16.4 Variety

- **Default (051)**: neighbours in a run never share a style, and they differ in floor count wherever the cap allows a choice, and from the block before that where it can. Among the choices that close a run, the style least used so far in the run comes first, then a hash of the run id. This is what makes R2 hold on every pair.
- **Default (050)**: stacks on the circuit's own large and tall lots, outside the terraces, follow the neighbour, street-repeat and share rules of chapter 5 unchanged (`NEIGHBOUR_GAP`, `STREET_REPEAT_GAP`, `FAMILY_SHARE_MAX`).
- **Default (052)**: the dressing varies by hash, not by order. One awning key per block (the awnings of a block match), no sign key twice in a block, at most one blade sign, one ATM, one fire-escape column and one big roof prop per block, at most `ATM_PER_RUN` ATMs, one billboard and one novelty sign per run, and no fire escape on two neighbouring blocks of a run.

The street-repeat rule and the share cap of chapter 5 do not bound a terrace (three styles are fewer than the families they apply to). The terrace's own bound is that each apartment style is a fifth to a half of a ladder's terrace blocks (`terracepack.test.ts`). Colour variety comes from the three apartment styles and from the colourway each block is drawn in (16.9): neighbours in a run never share one (R13). The awnings are fixed shapes and colours of one texture atlas, and the roof props are one colour each (16.6).


### 16.7 Fallbacks

- **Default (050)**: with no City Pack in the manifest, or its GLB failed, no stack is offered and the terrace is the abutting placeholder boxes of 051 B, as on a fresh checkout and in CI. The town is then exactly what chapter 5's chain gives.
- **Default (051)**: a run that packs no block keeps its placeholders. A stack piece whose root did not load, or whose key is excluded, drops the styles that need it and nothing else; if every style drops, the type falls down the chain of chapter 5.
- **Default (052)**: a dressing or furniture key missing from the manifest drops only its own placements. With no stack there is no dressing, and with no dressing or no packed run there is no furniture: each is drawn only when the layer under it is.
- **Default (054)**: with no `colourways` field in the City Pack's manifest entry, no colourway image loaded, or a fresh checkout or CI, no texture is fetched and every block keeps the cached materials: the scene is exactly what it was before 054. An image that fails to load drops its own id only (16.9).

The circuit and the play view are not touched by any of this: the 3D play view must read exactly as on `main` (R12).

## Open questions

None here. The Open question of the colourways is in `docs/city-style/colourways.md`.
