# Asset pipeline: Synty FBX packs to GLB (ticket 038)

Turns purchased FBX packs into one GLB per pack, plus a manifest, with headless Blender.
This only makes the files. The 3D view doesn't load them yet.

**Nothing in `assets/private/` may ever be committed.** The repo is public and the Synty licence forbids sharing
the source files. `assets/private/` is in `.gitignore`; `git status` must show nothing under it.

## Install Blender (once)

Blender 4.2 or newer (free): https://www.blender.org/download/ or `winget install BlenderFoundation.Blender`.
The script finds it in this order: the `BLENDER_PATH` environment variable (a path to `blender.exe`), then
`blender` on `PATH`, then (Windows) the newest `C:\Program Files\Blender Foundation\Blender <version>\`.

    setx BLENDER_PATH "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"

Without Blender the command says so and exits 2. Nothing else in the repo needs it.

## Lay a pack out

    assets/private/in/<pack>/**/*.fbx       the pack's FBX files (any subfolders)
    assets/private/in/<pack>/Textures/..    its image(s): one atlas (POLYGON-style) or one per model (SIMPLE-style)
    assets/private/in/<pack>/pack.json      optional

`pack.json` (every key optional):

    { "atlas": "Textures/PolygonTown_Texture_01_A.png", "scale": 1 }
    { "scale": 100, "textures": "Src/Textures", "textureOverrides": { "town_hall_mesh": "Src/Textures/Town_Hall_b.png" },
      "textureAliases": { "MasterTexture02.psd": "Src/Textures/SimpleTown.png", "material:Lambert1": "Src/Textures/Road.png" },
      "scaleOverrides": { "Building_PetrolStation": 0.01, "road_crossing_center_mesh": 0.1 } }

- `atlas`: path from the pack folder. **Atlas mode**: every mesh in the pack gets one material using it.
- `scale`: multiplied on import. Use `0.01` or `100` if the manifest shows `scale-suspect` (SIMPLE Town needs `100`).
- `scaleOverrides`: `{ "<model stem>": <factor> }` for the odd model in a pack whose size is wrong when the rest are right. The
  model is converted at the pack `scale` times its factor (`100` with `0.01` gives `1`); the other models are untouched. The factor is a
  finite number above 0. A key is a model stem (the FBX file name without `.fbx`) with no `/`, `\` or `=`, and the pack must hold an FBX of that
  stem (anywhere under it): a typo is an error, so a model never stays 100x too big in silence. Find the factor by comparing the model's
  size in the manifest with a comparable model in the pack.
- `textures`: the folder searched for images, relative to the pack. Default: the whole pack folder.
- `textureOverrides`: `{ "<model stem>": "<image, relative to the pack>" }` pins every material of one model to an image. A missing file is an error.
- `textureAliases`: `{ "<key>": "<image, relative to the pack>" }` says which image a name stands for. A key is either
  - a **file name** (no `/`, `\` or `=`): matched against the file name a material points at, ignoring case and extension, so
    `MasterTexture02.psd`, `mastertexture02.PNG` and `MasterTexture02` are one key and all match `C:/art/MasterTexture02.psd`; or
  - `material:<name>`: matched against a material's name (a Blender `.001` suffix dropped, case ignored). It matches **every**
    material of that name in the pack, with or without an image reference.
  - The value must be an image (`.png .jpg .jpeg .tga .tif .tiff .bmp`) that exists inside the pack. Two keys that mean the same
    thing (`A.psd` and `a.png`) are refused. After a run the log says `texture alias <key> matched no material` for a typo.
- Every path stays inside the pack folder, or the pack is refused.

With no `atlas` the pack runs in **per-model mode** (the default): each model keeps its own materials, and each
material's image is looked up in the pack, the first rule that finds a file wins:

1. the model's override;
2. the image the FBX points at, if that file exists inside the pack;
3. the referenced file name in the pack (exact, then any case, then any image extension: `props.png` finds `Textures/Props.png`);
4. an alias: a file-name alias for the referenced name, then a `material:` alias for the material's name;
5. the material's name against the image file names (generic names such as `lambert1` are skipped);
6. the model's name (`town_hall_mesh` finds `Town_Hall_a.png`). This is a guess, and the model gets `texture-guessed`.

An alias is your statement of fact, so a model that gets its image from an alias carries **no** warning. Watch the generic
names: `material:lambert1` would also take `town_hall_mesh`'s `lambert1` away from rule 6. For one model, use `textureOverrides`.

Each image file is loaded once and embedded once in the GLB, however many models use it.

You choose what is converted by which FBX files you copy in.

## Run

    npm run assets:convert              every pack in assets/private/in/, in name order
    npm run assets:convert polygon-town only the named packs (other packs keep their manifest entries)
    npm run assets:selftest             generated boxes (a pole, the pole under a rotated 0.01-scaled empty, a box with a scale override, a no-UV box, one per texture rule) through the normal path; prints "selftest ok"

Output (all gitignored):

    assets/private/out/<pack>.glb
    assets/private/out/manifest.json            name, bounds (metres, glTF Y up, base centre at the origin), scale, triangles, warnings
    assets/private/out/reports/<pack>.json      what the Blender script reported
    assets/private/selftest/                    the self-test's scratch files

Exit codes: 0 all packs converted; 1 a pack failed (the other packs still make it into the manifest) or a bad
argument; 2 Blender missing or older than 4.2.

Each asset in the manifest lists `textures` (the images embedded for it) and `missingTextures`, and its `scale`: the factor it was
imported with, the pack's `scale` times its `scaleOverrides` entry (the pack's own `scale` is on the pack; `bounds` already include it).
Warnings: `scale-suspect` (largest dimension outside 0.05 m to 60 m); `no-uv` (a mesh that should carry an image has no UV
map); `missing-texture` (a material's image was not found; `missingTextures` names it, and an alias or a `textureOverrides` entry fixes it);
`texture-guessed` (rule 6; check it, or pin it with an override).

An FBX that fails to import goes in the pack's `failures` and the run carries on. A file older than FBX 7100 (Blender
refuses these) says so, and names the pack's OBJ copy if there is one: a `.obj` with the same name, or the same name followed
by digits (`road_crossing_mesh.fbx` finds `road_crossing_mesh1.obj`). OBJ files are not converted.

## Game pack (ticket 082)

    npm run assets:game     cut assets/private/out/game/ from the FBX (Blender; minutes)

The game pack is what the city view loads instead of the full packs: one GLB per source pack that has a model the game uses, holding only
those models (same root names, bounds, scale and textures as the full pack), its own `manifest.json` (with `game: { keys, from }`) and the
used colourway images under `game/<pack>/colourways/`. The list of models is `gameModelKeys()` in `src/render3d/gamemodels.ts`.

Run it after any conversion (`npm run assets:convert`), and whenever the page says the game pack lacks models ("run npm run assets:game"). It
re-converts each used pack from its FBX with that pack's own `pack.json` and an include file (`--include-file` in `convert_fbx.py`: one FBX
path per line), then checks each model against the full manifest (name, scale, textures, bounds within 1 mm). If any key is missing from the
full manifest, is `scale-suspect`, or differs after the cut, the run exits 1 and the earlier game pack is left as it was. It never writes the
full GLBs or the full manifest.

It also copies the four particle textures the city view uses (`FX_TEXTURES`, `src/core/fx.ts`) from `assets/private/in/particle-fx-pack/Source Files/Textures/` to `game/fx/`, lists them in the manifest's `fx`, and cuts the two particle meshes (`FX_MESHES`: a spark streak and a shard chip) into `game/particle-fx-pack.glb` once `npm run assets:convert particle-fx-pack` has converted that pack. A missing texture or mesh is named in one line and skipped (exit 0). The pack is git-ignored under `assets/private/`, never committed, bundled or copied into `dist/` or `public/` (081 FX1).

The game pack is gitignored (`assets/private/`) and is never committed, bundled or copied into `dist/` or `public/`: the Synty licence
allows the packs "as long as the assets aren't available to the end user and I place the site behind a password" (Josh, 16 Nov 2026).

## What the script does (`convert_fbx.py`)

Per FBX: import with the file's own units, drop animations, cameras, lights and armatures, bake transforms,
move the pivot to the base centre, put the meshes under one root named after the file, then assign the shared atlas
material (atlas mode) or find each material's image (per-model mode). Then one GLB export (Y up, textures embedded, no animations), written to `<pack>.tmp.glb` beside the real file and moved over `<pack>.glb`
only once every manifest name is a root node in it; if that check fails the temp file is removed and the earlier GLB stays. Every mesh's world
transform is read before any empty, bone or other non-mesh object is deleted, so a model nested under a rotated or scaled parent keeps its pose
and size. Run by hand if you need to:

    blender --background --factory-startup --python tools/blender/convert_fbx.py -- --in <packDir> --out <glb> --report <json> [--atlas <png>] [--scale <n>] [--textures <dir>] [--texture-override <stem>=<image> ...] [--texture-alias <key>=<image> ...] [--scale-override <stem>=<factor> ...] [--exclude <path> ...]

(`--exclude` skips every FBX at or under a folder or file and leaves the texture and OBJ search alone. `--texture-alias` takes the normalised key: the lowercased file stem, or `material:` and the lowercased name. The wrapper does this for you.)

## Worked example: SIMPLE Town (aliases found from evidence)

SIMPLE Town has no shared atlas, and 99 of its 173 convertible models reference Photoshop files that aren't in the pack
(`MasterTexture02.psd`, `plants2.psd`, one `.psd` per vehicle, ...) or a bare `lambert` material. The images they stand for
are in `Textures/` under other names. This is the `pack.json` that takes the missing-texture count from 99 to 0
(`assets/private/in/simple-town/pack.json`, gitignored; the paths are relative to the pack, which holds
`SIMPLE_Town_SourceFiles/SourceFiles/{Fbx,Obj,Textures}`; `T` below stands for `SIMPLE_Town_SourceFiles/SourceFiles/Textures`):

    {
      "scale": 100,
      "scaleOverrides": {
        "Building_PetrolStation": 0.01,
        "Building_PoliceStation": 0.01,
        "road_crossing_center_mesh": 0.1
      },
      "textureOverrides": {
        "Env_Road_Ramp_Straight": "T/SimpleTown.png",
        "road_cornerLines_mesh": "T/Road.png"
      },
      "textureAliases": {
        "MasterTexture02.psd": "T/SimpleTown.png",
        "Andrew_MasterTexture.psd": "T/SimpleTown.png",
        "SimpleAirport_Mike.psd": "T/SimpleTown.png",
        "plants2.psd": "T/Nature_Trees.png",
        "ambulance.psd": "T/Vehice_Ambulance.png",
        "bus.psd": "T/Vehicle_Bus_b.png",
        "family.psd": "T/Vehicle_Car01_c.png",
        "Police.psd": "T/Vehicle_Police.png",
        "firetruck.psd": "T/Vehicle_Fire_Truck.png",
        "RubishTruck.psd": "T/Vehicle_Rubbish_Truck.png",
        "Taxi.psd": "T/Vehicle_Taxi.png",
        "ute.psd": "T/Vehicle_Ute_a.png",
        "vantex.psd": "T/Vehicle_Van_a.png"
      }
    }

(Write each `T/` out in full in the real file.) What settled each line, in the order the evidence was tried:

**No MTL files.** The `Obj/` folder holds only `.obj` files, with no `.mtl` (one OBJ, `town_hall_mesh.obj`, even names
`town_hall_mesh.mtl`, which isn't shipped), so the primary evidence was not available. The pack's Maya scenes were next.

**How the `.ma` scenes were read.** `Simple_Town_StaticMeshes.ma` has a shading network per model (`file` node `.ftn`
into a `lambert` into a `shadingEngine` that holds the mesh). It confirms which models share a `.psd` (the families
above), and shows that the same Maya scene already points `Env_Road_Corner1` and `Env_Road_Ramp` (`MasterTexture` nodes
`_2`, `_3`) at `Textures/SimpleTown.png`. `Simple_Town_Demo.ma` (the Unity demo town) puts 87 building, environment and
prop names on one material, `M_SimpleTown_Material`, whose only file is `SimpleTown_Texture.png`. There is no ICON image in the pack.

**How the images were compared.** A throwaway Blender script (not committed) imported each FBX and sampled each candidate
image at every face's UV centre. Where two images give the same colour at every face of a model, either renders it
identically; where they differ, a render of the model with each candidate (headless Blender, flat shading) shows which is
right: a wrong atlas shows signage fragments and stripes. Final previews were rendered from the converted GLB.

- `MasterTexture02.psd` -> `SimpleTown.png` (63 models: `Building_*`, `Env_*`, `Prop_*`). The FBX of two siblings in the same
  family (`Env_Road_Corner`, `Env_Road_Ramp`) names `SimpleTown.png`; the demo scene puts the whole family on one shared
  atlas; `SimpleTown.png` and `SimpleTown_Texture_Update.png` give the **same** colour at every face of all 63 (0 faces
  differ), so the one the pack's FBX names was used. Renders of `Building_House_01`, `Building_Shop_03`, `Env_Canal_Straight`,
  `Env_Car_Bridge`, `Vehicle_Boat_01` and `Prop_Umbrella_01` show clean palette colours.
- `Andrew_MasterTexture.psd` -> `SimpleTown.png` (13 models). Twelve of them give identical colours from both atlases.
  `Building_StripClub` is the one that tells them apart: its billboard UVs sit at x = 706, 788/791, 874 px, which is the
  `SimpleTown.png` layout (panels at 705/790/875), not `SimpleTown_Texture_Update.png` (712/795/880). (The demo scene's
  StripClub mesh has the Update layout; the FBX does not.) Renders of the cinema, mall, coffee shop, tyre pile and roundabout look right.
- `SimpleAirport_Mike.psd` -> `SimpleTown.png` (`Env_Road_Ramp_Pillar`). The weakest line: sibling evidence only. It is one of the
  `Env_Road_Ramp*` pieces (the other three use `SimpleTown.png`), its UVs lie in the same palette block as the houses, both atlases
  give the same colours, and it renders as a grey concrete pillar.
- `plants2.psd` -> `Nature_Trees.png` (bushes, hedge, grass, trees). With `SimpleTown.png` or the Update atlas the trees and
  bushes come out as pink and green signage fragments; with `Nature_Trees.png` (a 256 px palette of greens and browns) they render as
  green foliage on brown trunks, in the palette's layout.
- Vehicles. Each `*_seperate_mesh` is the same vehicle as an assembled sibling, and its UVs give an identical render when the
  sibling's image is applied (checked for the bus and the car; the Update atlas renders both as garbage). So:
  `ambulance.psd` -> `Vehice_Ambulance.png` (the pack's spelling), `bus.psd` -> `Vehicle_Bus_b.png` (what `bus_mesh` uses),
  `family.psd` -> `Vehicle_Car01_c.png` (`car_mesh`), `ute.psd` -> `Vehicle_Ute_a.png` (`ute_mesh`), `vantex.psd` -> `Vehicle_Van_a.png`
  (`van_mesh`). The a/b/c variants share one layout and differ only in colour, so the sibling's variant was used; change it if you
  want another colour. `Police.psd` -> `Vehicle_Police.png`, `firetruck.psd` -> `Vehicle_Fire_Truck.png`, `RubishTruck.psd` ->
  `Vehicle_Rubbish_Truck.png`, `Taxi.psd` -> `Vehicle_Taxi.png`: the only image of that vehicle in the pack, and the renders look right.
- Override `road_cornerLines_mesh` -> `Road.png` (material `lambert1`, no reference). A top-down render with `Road.png` gives kerbs, tarmac
  and lane dashes exactly like `road_corner_mesh`; with either atlas it renders as signage. An override, because `lambert1` is also
  `town_hall_mesh`'s material: a `material:lambert1` alias would have given the town hall this road image and lost its `Town_Hall_a.png`.
- Override `Env_Road_Ramp_Straight` -> `SimpleTown.png` (material `lambert2`, no reference). It renders as kerbs and lane dashes next to
  `Env_Road_Ramp`, which names `SimpleTown.png`. An override rather than `material:lambert2`, for the same one-model reason.

**Scale overrides (ticket 040).** Three models were the wrong size with the pack's `scale: 100` while the other 170 were right. The sizes
below are metres from the manifest, glTF axes (x by y by z, y up). First the transform bake was checked as the
cause (every mesh's world matrix read before the empties are deleted, ticket 040): no model's bounds changed by more than 1%, so the
size is in the FBX files themselves, not in the bake. The three stay 100x, 100x and 10x too big:

| model | at `scale: 100` | factor | converted | compared with |
| --- | --- | --- | --- | --- |
| `Building_PetrolStation` | 2247.4 x 941.0 x 2775.0 | 0.01 | 22.5 x 9.4 x 27.7 | `Building_Cinema` 31.3 x 15.5 x 26.8, `Building_AutoRepair` 21.5 x 10.7 x 10.8 |
| `Building_PoliceStation` | 2431.1 x 985.5 x 1499.6 | 0.01 | 24.3 x 9.9 x 15.0 | `Building_House_05` 19.6 x 16.0 x 25.7, `Building_Cinema` |
| `road_crossing_center_mesh` | 50 x 0 x 70 | 0.1 | 5 x 0 x 7 | `roadLane_straight_Centered_mesh` 5 x 0 x 7 (same flat lane tile) |

With the factors, none of the three carries `scale-suspect` (the pack went from 3 such models to 0), their `scale` in the manifest is
`1`, `1` and `10` (the pack's 100 times 0.01, 0.01 and 0.1), and the other 170 models are exactly as before.

Result: 173 models, 0 `missing-texture`; `town_hall_mesh` is still the only `texture-guessed` model (`Town_Hall_a.png`; `Town_Hall_b.png` is the other colour).
