# Candidates: Synty Store (POLYGON packs) for the 3D view

Date: 12 Nov 2026. `assets/` held no other files when I looked, so nothing here repeats or contradicts an earlier decision.

## The need

Josh: check the Synty Store (https://syntystore.com/) as a source of packs for the Three.js 3D view (`src/render3d/`, ticket 037, `?view=3d`). A dark town section at night: utility poles with sagging wires, street lamps, small town buildings (houses, shops, a church or chapel feel is a plus), props that read as electrical gear (breaker boxes, switch panels, transformers, fuse boxes, generators, batteries), plus ground, road and fence pieces. Price is secondary to fit. No download, purchase or sign-up was done.

Today `src/render3d/scene.ts` draws all of this as placeholders: cylinder poles with a box arm, instanced box blocks for buildings, box breakers with lever sprites, sagging wires built in code.

## How confident this file is (read first)

- **Licence text**: read on Synty's own licence page (One Time Purchase Licence, "current as of 9 July 2026"), the licences overview page, the Standard Subscription Licence page, and the FAQ.
- **Pack pages**: syntystore.com answered every direct fetch of a product page with HTTP 429 (rate limit), over many attempts. Everything below about pack price, formats and contents comes from search-engine summaries of those same Synty pages (searches limited to syntystore.com), plus the Unity Asset Store page for the Town Pack, which I did open. Treat each such line as "not confirmed on the page by me". Josh should open the page before buying; the links are given.
- The store's cached pages show a "Sold out" label next to prices, including on free packs. It looks like a display quirk of the cached copy, not real stock (these are downloads). Not confirmed.
- The store home page (opened) is run by Synty Studios (the alt text names them as publisher). It is the official store, not a reseller. The Unity Asset Store and Fab also carry Synty packs; those are Synty's own listings but under Unity's/Epic's licences, so buy from syntystore.com for this use (see Licence).

## The blocker questions: format and licence

### Format

- Each pack page lists, per the summaries: a Unity 2022.3 package, an Unreal project, **FBX source files**, and on newer packs a Godot 4.x project. **No glTF/GLB is listed for any pack I saw.** Not confirmed on the page for any pack whether FBX are embedded or separate from the engine projects.
- Three.js loads FBX with `FBXLoader`, but the Three.js forums are full of FBX colour and texture problems (embedded textures washed out, layered textures discarded, atlas materials showing grey). The usual advice is to import in Blender and export GLB. I found no Synty-specific report.
- What converting involves (general knowledge of Synty packs plus the forum threads; not confirmed on any Synty page, so verify on a first small pack):
  - One-time Blender (or `FBX2glTF`) pass per pack to get GLB, then `GLTFLoader`. The lead-architect would ticket a converter script and loader work; I did not touch `src/`.
  - Synty packs normally share one small atlas texture per pack (plus alternate colour atlases) rather than per-prop textures, so converted meshes should share one material and suit `InstancedMesh`. Check on first import.
  - Expect to check unit scale (Unity-authored FBX often arrive 100x or 0.01x), pivots (origin at the base is usual but not guaranteed), and that emissive window and lamp areas of the atlas can be driven by the game's own lights. The scene is lit by its own lamps, so atlas daylight shading should be minimal (flat colour atlas), but not confirmed.
  - Poles, lamps and boxes arrive as whole props, not as parts. Wire sag stays in code (see Gaps).
- Weight: the Town Pack download is 133.5 MB on the Unity Asset Store page (that includes Unity demo content, textures and prefabs, not what ships to the browser). Triangle counts are not stated on any page I read. Synty's POLYGON style is low-poly (tens to low hundreds of triangles per prop) from general knowledge, not confirmed.

### Licence (read on Synty's licence pages)

The store sells under the **One Time Purchase Licence** (five team seats per purchase). Links: [One Time Purchase Licence](https://syntystore.com/pages/one-time-purchase-licence), [licences overview](https://syntystore.com/pages/licences-overview), [FAQ](https://syntystore.com/community/faq).

- Commercial game: allowed. The grant is to "incorporate the Asset into Products produced under your direct control" and to "publish, distribute... the Asset as incorporated into those Products". Perpetual, royalty-free once paid, "worldwide, and is not limited by game engine, OS, platform or device". So Three.js is not excluded by the licence. Synty gives official support only for Unity and Unreal.
- Credit: no credit or attribution requirement on the page.
- Modification and conversion: modifying is allowed for those purposes; the page does not mention format conversion either way.
- **Public repo: this is the problem.** "You must not share the source files of any Assets outside your team." This repo is public. FBX files (and, reasonably read, converted GLB files of the models) must not be committed to it. I would treat any model file in a public repo as a breach risk.
- **Web build: unclear.** The page does not address browser builds. A GitHub Pages site serves the model files to anyone who views it, which is both "distributing the Asset as incorporated into a Product" (allowed) and handing out extractable model files (the thing the source-file rule exists to stop). A buyer on itch.io raised exactly this question and I found no Synty answer. Synty's FAQ says assets can't be shared with other users for projects outside your product. Not confirmed either way.
- Also forbidden: selling the assets as stock art, putting them in generative-AI datasets or using them to generate 3D models, NFT/blockchain/metaverse content, and "content for Game Creation Software". Audits possible with five days' notice.
- The FAQ also says Humble Bundle purchases get one seat, not five. Josh builds alone with agents; whether agents count as "team" collaborators is not addressed. Not confirmed.
- Subscription ([Standard Subscription Licence](https://syntystore.com/pages/standard-subscription-licence)): access ends with the subscription for new IP; whether an already-released product may keep shipping the assets is not stated. Licensing contact named on that page: licensing@syntystudios.com. A one-time purchase avoids the question.
- One forum post claims Synty-licensed assets must be "predominantly Synty". I could not find that in the licence text; treat as unverified rumour.

**What this means for the repo (Josh to decide, lead-architect to ticket):** keep raw FBX and converted GLB out of the public repo (gitignored local folder, or a private assets repo pulled at deploy time), and ask Synty in writing, before buying, whether GLB files served from a browser build are acceptable. Until they answer, Synty is safe for a local build and risky for the public GitHub Pages deploy.

## Recommended

Order is by fit to this need, with price as a tie-break only. I could not confirm pole contents of any Synty pack on a page I opened, so all three are conditional.

### 1. POLYGON - Town Pack

- Link: https://syntystore.com/products/polygon-town-pack (also on the [Unity Asset Store](https://marketplace.unity.com/packages/3d/environments/urban/polygon-town-pack-low-poly-3d-art-by-synty-121115), opened).
- Publisher: Synty Studios. Licence: One Time Purchase Licence (above). Not free for the public repo; see Licence.
- Format: Unity 2022.3 package, Unreal 4.25 project, Godot 4.5.1 project, FBX source files (search summary of the store page). Unity Asset Store page gives no formats. No GLB. Converting needed.
- Price: Unity Asset Store shows $49.99 (opened, today). The Synty page showed $49.99 regular with two different sale prices in two summaries ($34.99 at 30% off, $25.00 at 50% off), so today's store price is not confirmed. The store front page (opened) advertises a Black Friday 2026 sale.
- Covers the need: headline counts of 125 building assets, 412 props, 99 environment pieces; a modular house kit with preset houses; a demo scene (summary). Buildings, fences and street dressing are likely; names not confirmed.
- Missing / not confirmed: whether it has utility poles, power lines, transformers, breaker or switch boxes, generators, batteries. A church or chapel is not confirmed. I could not get the prop list.
- Weight: 133.5 MB download (Unity package). Triangle counts and texture sizes not stated.
- Style: stylised low-poly flat colour atlas, the classic POLYGON look. Daylight dependence not confirmed; flat colour atlas should take the game's own night lighting.
- Why above the next: it is the only listed pack that is a town (houses, shops, streets) at a small-first-buy price; the next ones have power props but are far dearer and off-theme.

### 2. POLYGON - Apocalypse Pack

- Link: https://syntystore.com/products/polygon-apocalypse-pack. Publisher: Synty Studios. Licence: One Time Purchase Licence.
- Format: Godot 4.6.2+, Unreal 5.3, Unity 2022.3, FBX source files (summary). No GLB.
- Price: $349.99 regular, $175.00 at 50% off in the summary; today's price not confirmed.
- Covers the need: the only Synty pack where I found pole prefabs named, via its changelog: `SM_Prop_Powerpole_Preset_01`, `_02`, `_03`, and the props are said to include power poles and lamps (search summary). Ruined-town buildings and a failing-grid mood suit the game's premise.
- Missing / not confirmed: breaker boxes, transformers, generators, batteries by name; shops and a chapel; the full prop list. Ruined or damaged pieces may need picking to avoid a wrecked look where the town should read as merely dark.
- Weight: not stated.
- Style: stylised low-poly, post-collapse; same atlas family as other POLYGON packs, so it should sit with the Town Pack.
- Why above the next: it names power poles; Palm City names power boxes but is a tropical modern resort town.

### 3. POLYGON - Palm City

- Link: https://syntystore.com/products/polygon-palm-city. Publisher: Synty Studios. Licence: One Time Purchase Licence.
- Format: Unreal 5.3 project, Unity 2022.3 package, FBX source files; no Godot (summary). No GLB.
- Price: $299.99 regular, $150 at 50% off in the summary; today's price not confirmed.
- Covers the need: 419 props including powerboxes, powerlines and street lamps, traffic lights, fire hydrants; 309 building pieces; 137 environment pieces; 65 signs (summary). Closest to a full "electrical gear plus street lamps" set.
- Missing / not confirmed: pole types, transformers by name, a church or chapel; whether the "powerlines" are poles or only line meshes (the game builds its own wires).
- Weight: not stated.
- Style: stylised low-poly modern tropical city. Palettes, palms and resort architecture sit badly in a dark small town; Josh to judge from the page screenshots.
- Why last: highest cost for the theme mismatch, but the strongest confirmed electrical props.

## Also looked at

| Pack | Link | One line |
| --- | --- | --- |
| POLYGON - Starter Pack (free) | https://syntystore.com/products/polygon-starter-pack | Free props, characters, environment; Unity, Unreal, Godot 4.6.2 and FBX. Useful to test the FBX to GLB pipeline and the licence flow at no cost; shopping or sign-in requirements not confirmed. |
| POLYGON - City Pack | https://syntystore.com/products/polygon-city-pack | $19.99 regular, $9.99 sale (summary); 331 assets incl. traffic lights, bus stops, vents; no street lights or power gear named. Urban, not small-town. |
| POLYGON - Construction Pack | https://syntystore.com/products/polygon-construction-pack | $49.99; cables, pipes, scaffolding, power tools with removable batteries, 26 house exterior presets; generators and lamps not confirmed. Formats Unity/Unreal in summary. |
| POLYGON - Farm Pack | https://syntystore.com/products/polygon-farm-pack | $49.99; 15 buildings, 165 props incl. fence sets, letter boxes. Rural fences and barns only. |
| POLYGON - Shops Pack | https://syntystore.com/products/polygon-shops-pack | $199.99 regular; mostly interior shop stock (1933 prefabs); little for streets. |
| POLYGON - Police Station | https://syntystore.com/products/polygon-police-station | Summary says power boxes and streetlights; price and formats not seen. |
| POLYGON - Fantasy Village | https://syntystore.com/products/polygon-fantasy-village | Appeared in results; period-fantasy, would need electrical gear from elsewhere. Not checked. |
| POLYGON Mini - City Pack | https://syntystore.com/products/polygon-mini-city-pack | Smaller-scale city set; not checked. |

## Ruled out

| Pack | Reason |
| --- | --- |
| Synty packs sold via Unity Asset Store or Fab | Unity's or Epic's licence applies, not Synty's; those listings are for their engines. Buy from syntystore.com if at all. |
| POLYGON Sci-Fi, Dungeon, Fantasy Kingdom, Military, War, Western | Wrong setting for a modern dark town; not opened. |
| Sidekick characters | No characters needed; its terms add All Access Pass seats. |

Nothing is ruled out on licence alone, but see the public-repo and web-build issues above: they apply to every Synty pack.

## Alternatives if Synty's licence is a blocker (briefly)

| Option | Link | Notes |
| --- | --- | --- |
| Quaternius Downtown City MegaKit | https://quaternius.com/packs/downtowncitymegakit.html | CC0, free for commercial use; FBX, glTF and Blend in the standard download, 315 models, shared texture sets. Page names no poles, lamps or electrical props; unconfirmed. Safe for the public repo. Prices of the paid tiers are shown as images only. |
| Quaternius Medieval Village MegaKit | https://quaternius.com/packs/medievalvillagemegakit.html | CC0, glTF included, 304 models (walls, roofs, doors); period-medieval, no lamps or electrical gear named. |
| Quaternius Modular Street | https://quaternius.itch.io/lowpoly-modular-street | CC0, free; FBX, OBJ, Blend only (no glTF); 3.6 MB; contents not itemised. |
| Kenney City Kit (Roads, Suburban, Industrial, Commercial) | https://kenney.nl/assets/city-kit-roads | CC0, free; Roads (90 files, signs and traffic lights added in 2.1), Suburban and Industrial (40 files; Industrial 2.0 adds "solar/wind energy"). Formats and item lists are not stated on the pages I opened (search snippets say glTF is among them; not confirmed). |
| notsospecialgames Electric Pole PSX | https://notsospecialgames.itch.io/electric-pole | CC0, pay what you want; one 417 kB RAR; "old electric pole with wires", PSX low-res style. Formats inside not stated. A single pole, not a pack, and PSX look differs from POLYGON. |

## Suggested first buy and order (for Josh to choose)

1. **Before spending**: email Synty (licensing@syntystudios.com, per their subscription licence page) asking whether GLB conversions served from a browser game on GitHub Pages are acceptable and whether the source-file rule means the repo must stay private for assets. Keep the answer. Decide where the raw files will live (outside the public repo).
2. **Free test**: the free Starter Pack to prove the FBX to GLB path, scale and atlas on one of Josh's own machines, if the free pack needs no account (not confirmed).
3. **First paid**: POLYGON Town Pack (about $25 to $50 depending on the sale). Open its page first and check the prop list for poles, lamps and electrical boxes.
4. **Only if the Town Pack lacks poles and boxes**: Apocalypse Pack for named pole presets, or Palm City for power boxes; both are $150 to $175 on sale. Synty publishes no sales calendar, and the store front already shows a Black Friday 2026 banner with many packs at 50% off, so waiting for the sale costs little. The FAQ says no individual discounts or bundles outside advertised promotions. Bundles exist as a store category; I did not see a bundle that fits.
5. If the answer from step 1 is no or slow, take the CC0 route (Quaternius Downtown City MegaKit, Kenney) and put the electrical props in code or a single CC0 model.

## Gaps

- **Sagging wires**: not an asset. They are already built in code (`wireLayout` in `src/render3d/layout.ts`, scene wires in `scene.ts`); keep it that way. Synty "powerlines" are usually fixed meshes.
- **Breaker and switch panels, fuse boxes with a lever and a load bar**: the game needs a lever that rotates and a fuse-load bar. Even if a pack has a powerbox, the lever, ribbon and bar stay code-driven, probably as a pack box plus the existing lever geometry. Do not expect a pack prop to animate.
- **Transformers, generators, batteries**: not confirmed in any Synty pack I read. The Construction Pack mentions batteries in tools only.
- **Church or chapel**: not confirmed in any Synty pack opened; Fantasy Village or the Town Pack may have one, not checked.
- **Night readiness**: no pack page states whether it needs baked daylight; all POLYGON packs are believed to be flat-colour atlases, not confirmed.
- **GLB**: no Synty pack lists it. Any use means a converter and a loader, to be ticketed by the lead-architect.

## Josh's decision

