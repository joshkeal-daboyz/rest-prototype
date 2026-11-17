"""
Convert one pack of FBX files into one GLB, and report what it made (ticket 038).

Run it headless, once per pack (tools/assets/convert.ts does this):

  blender --background --factory-startup --python tools/blender/convert_fbx.py -- \
      --in <packDir> --out <glbPath> --report <json> [--atlas <png>] [--scale <n>] \
      [--textures <dir>] [--texture-override <stem>=<image> ...] [--texture-alias <key>=<image> ...]

  ... -- --selftest --in <dir> --out <glbPath> --report <json>
      builds boxes in code, exports them to FBX in <dir>/Fbx (Unity-style: centimetres) with images in
      <dir>/Textures, then converts that folder through the normal path. No purchased asset is needed.

Every FBX under --in (recursive, sorted by path) becomes one root object named after the file's stem,
with its meshes under it, its pivot at the base centre (lowest point, x/y centred, Blender's Z up).
The GLB is exported Y up, in metres.

Two texture modes (amendment A of ticket 038):
  atlas mode (--atlas given): one material, the atlas, shared by every mesh (the POLYGON-style packs).
  per-model mode (the default): each model keeps its own materials, and each material's image is found in
  the pack (see find_texture_for_material for the six rules), loaded once per file, wired to Base Color,
  and embedded once in the GLB. An alias (amendment B) maps a source file that isn't in the pack (a .psd the
  artist worked from) or a material name to an image that is.

The report is JSON in the shape of src/core/assets.ts (AssetEntry, AssetFailure) plus "blenderVersion".
Bounds in it are glTF space (Y up). Exit code is 1 if nothing could be converted or the script failed.

Nothing here may be committed with data from a purchased pack: assets/private/ is gitignored.
"""

import argparse
import json
import os
import re
import struct
import sys
import traceback

# Keep these two in step with ASSET_SANE_SIZE_MIN / ASSET_SANE_SIZE_MAX in src/core/assets.ts
# (a test in tools/assets/ checks that they match).
ASSET_SANE_SIZE_MIN = 0.05
ASSET_SANE_SIZE_MAX = 60

SELFTEST_POLE = "SelfTest_Pole"
SELFTEST_NO_UV = "SelfTest_NoUV"
SELFTEST_REF_CASE = "ref_case"
SELFTEST_MAT_NAME = "mat_name"
SELFTEST_GUESS = "guess_mesh"
SELFTEST_LOST_REF = "lost_ref"
SELFTEST_ALIAS_REF = "alias_ref"
SELFTEST_ALIAS_MAT = "alias_mat"
SELFTEST_ALIAS_ORDER = "alias_order"

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".tga", ".tif", ".tiff", ".bmp")
# Blender's importer takes FBX 7100 (2011) and newer; older files fail to import.
MIN_FBX_VERSION = 7100
MATERIAL_ALIAS_PREFIX = "material:"
# Material names that say nothing about the texture (rule 5 skips them).
GENERIC_MATERIAL = re.compile(r"^(lambert\d*|phong\d*|blinn\d*|material|defaultmaterial|initialshadinggroup|none)$")


# ---------------------------------------------------------------------------------------------
# Pure helpers (no bpy), so they can be reasoned about and checked on their own.
# ---------------------------------------------------------------------------------------------

def to_gltf_bounds(bmin, bmax):
    """Blender (x, y, z up) min/max corners to glTF (x, y up, z) corners: (x, y, z) -> (x, z, -y)."""
    return {
        "min": [round(bmin[0], 6), round(bmin[2], 6), round(-bmax[1], 6)],
        "max": [round(bmax[0], 6), round(bmax[2], 6), round(-bmin[1], 6)],
    }


def scale_suspect(bmin, bmax):
    """True when the largest dimension is outside the sane range: a 100x or 0.01x unit slip."""
    largest = max(bmax[0] - bmin[0], bmax[1] - bmin[1], bmax[2] - bmin[2])
    return largest < ASSET_SANE_SIZE_MIN or largest > ASSET_SANE_SIZE_MAX


def warnings_for(bmin, bmax, no_uv, missing_texture, texture_guessed):
    out = []
    if scale_suspect(bmin, bmax):
        out.append("scale-suspect")
    if no_uv:
        out.append("no-uv")
    if missing_texture:
        out.append("missing-texture")
    if texture_guessed:
        out.append("texture-guessed")
    return out


def parse_overrides(items):
    """['stem=/abs/path.png', ...] -> {stem: path}. Split at the first '='."""
    out = {}
    for item in items or []:
        stem, sep, path = item.partition("=")
        if not sep or not stem or not path:
            raise SystemExit("convert_fbx: --texture-override needs <stem>=<image>, got %r" % item)
        out[stem] = os.path.normpath(path)
    return out


def parse_aliases(items):
    """['<normalised key>=/abs/path.png', ...] -> {key: path}. Split at the first '='. The wrapper normalises the keys."""
    out = {}
    for item in items or []:
        key, sep, path = item.partition("=")
        if not sep or not key or not path:
            raise SystemExit("convert_fbx: --texture-alias needs <key>=<image>, got %r" % item)
        out[key] = os.path.normpath(path)
    return out


def parse_args(argv):
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    p = argparse.ArgumentParser(prog="convert_fbx.py")
    p.add_argument("--in", dest="indir", required=True)
    p.add_argument("--out", dest="out", required=True)
    p.add_argument("--report", dest="report", required=True)
    p.add_argument("--atlas", dest="atlas", default=None)
    p.add_argument("--scale", dest="scale", type=float, default=1.0)
    p.add_argument("--textures", dest="textures", default=None)
    p.add_argument("--texture-override", dest="overrides", action="append", default=[])
    p.add_argument("--texture-alias", dest="aliases", action="append", default=[])
    p.add_argument("--selftest", dest="selftest", action="store_true")
    return p.parse_args(argv)


def find_files(indir, extensions):
    """Every file under indir with one of the extensions (case-insensitive), recursive, sorted by relative path (forward slashes)."""
    found = []
    for folder, _dirs, files in os.walk(indir):
        for name in files:
            if name.lower().endswith(extensions):
                rel = os.path.relpath(os.path.join(folder, name), indir).replace(os.sep, "/")
                found.append(rel)
    found.sort()
    return found


def find_fbx(indir):
    """Every .fbx under indir, recursive, sorted by relative path (forward slashes)."""
    return find_files(indir, (".fbx",))


def inside(parent, child):
    """Is `child` a path inside folder `parent` (not the folder itself)?"""
    p = os.path.normcase(os.path.realpath(parent))
    c = os.path.normcase(os.path.realpath(child))
    rel = os.path.relpath(c, p)
    return rel != "." and not rel.startswith("..") and not os.path.isabs(rel)


def rel_to(base, path):
    return os.path.relpath(path, base).replace(os.sep, "/")


def split_basename(path):
    """The last part of a path, split on both / and \\ (a Windows path may be read on any system)."""
    return re.split(r"[\\/]", path)[-1]


def drop_blender_suffix(name):
    """'lambert1.001' -> 'lambert1' (Blender's duplicate-name suffix)."""
    return re.sub(r"\.\d+$", "", name)


def normalise(name):
    """Lowercase letters and digits only."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def stem_of(file_name):
    return os.path.splitext(file_name)[0]


def is_generic_material(material_name):
    n = normalise(drop_blender_suffix(material_name))
    return n == "" or GENERIC_MATERIAL.match(n) is not None


def build_texture_index(texdir):
    """[(relative path inside texdir, absolute path)] for every image, sorted by relative path."""
    return [(rel, os.path.normpath(os.path.join(texdir, rel))) for rel in find_files(texdir, IMAGE_EXTENSIONS)]


def lookup_referenced_name(index, referenced):
    """Rule 3: the referenced file name, in the index: exact, then case-insensitive, then case-insensitive stem with any image extension."""
    base = split_basename(referenced)
    if base == "":
        return None
    for _rel, path in index:
        if os.path.basename(path) == base:
            return path
    low = base.lower()
    for _rel, path in index:
        if os.path.basename(path).lower() == low:
            return path
    low_stem = stem_of(base).lower()
    for _rel, path in index:
        if stem_of(os.path.basename(path)).lower() == low_stem:
            return path
    return None


def file_alias_key(name):
    """A file name reduced to its lowercased stem (everything before the last '.', or all of it): the key of a file alias."""
    i = name.rfind(".")
    return (name if i < 0 else name[:i]).lower()


def material_alias_key(material_name):
    """'Painted_Metal.001' -> 'material:painted_metal' (suffix dropped, lowercased): the key of a material alias."""
    return MATERIAL_ALIAS_PREFIX + drop_blender_suffix(material_name).lower()


def lookup_alias(aliases, referenced, material_name):
    """
    Rule 4: a file-name alias matching the referenced basename (only for a material that references something),
    then a material alias matching the material's name. Returns (path, key) or (None, None).
    """
    if referenced is not None:
        base = split_basename(referenced)
        key = file_alias_key(base)
        if base != "" and key != "" and key in aliases:
            return aliases[key], key
    key = material_alias_key(material_name)
    if key in aliases:
        return aliases[key], key
    return None, None


def lookup_material_name(index, material_name):
    """Rule 5: the normalised material name equals a file's normalised stem. Generic names are skipped."""
    if is_generic_material(material_name):
        return None
    want = normalise(drop_blender_suffix(material_name))
    for _rel, path in index:
        if normalise(stem_of(os.path.basename(path))) == want:
            return path
    return None


def model_guess_key(model_stem):
    """'SM_Town_Hall_mesh' -> 'townhall'; '' when nothing is left."""
    s = model_stem
    if s.lower().startswith("sm_"):
        s = s[3:]
    low = s.lower()
    if low.endswith("_mesh"):
        s = s[:-5]
    elif low.endswith("mesh"):
        s = s[:-4]
    return normalise(s)


def lookup_model_name(index, model_stem):
    """Rule 6 (a guess): the first file whose normalised stem equals or starts with the model's normalised name."""
    key = model_guess_key(model_stem)
    if key == "":
        return None
    for _rel, path in index:
        n = normalise(stem_of(os.path.basename(path)))
        if n == key or n.startswith(key):
            return path
    return None


def fbx_version(path):
    """The FBX file's version as written in its header (7400 for 7.4); None when it can't be read."""
    try:
        with open(path, "rb") as f:
            head = f.read(2048)
    except OSError:
        return None
    if head.startswith(b"Kaydara FBX Binary"):
        if len(head) >= 27:
            return struct.unpack("<I", head[23:27])[0]
        return None
    m = re.search(rb"FBX\s+(\d+)\.(\d+)\.(\d+)", head)
    if m:
        return int(m.group(1)) * 1000 + int(m.group(2)) * 100 + int(m.group(3)) * 10
    return None


def import_failure_message(path, stem, obj_copies, exc_text):
    """Why an FBX failed. An old FBX version is named, with the same-stem OBJ copy if the pack has one."""
    version = fbx_version(path)
    if version is not None and version < MIN_FBX_VERSION:
        msg = "FBX version %d is older than Blender's importer accepts (%d+)" % (version, MIN_FBX_VERSION)
        obj = obj_copy_for(stem, obj_copies)
        if obj:
            msg += "; an OBJ copy exists: %s (not converted)" % obj
        return msg
    return exc_text


def find_obj_copies(indir):
    """Every .obj under indir, relative paths with forward slashes, sorted."""
    return find_files(indir, (".obj",))


def obj_copy_for(stem, obj_rels):
    """
    The OBJ copy of an FBX: a .obj with the same stem (case-insensitive); failing that, one whose stem is the FBX's
    stem followed by digits ('road_crossing_mesh' -> 'road_crossing_mesh1.obj'). The first in sorted order of each kind.
    """
    want = stem.lower()
    for rel in obj_rels:
        if stem_of(os.path.basename(rel)).lower() == want:
            return rel
    pattern = re.compile(r"^" + re.escape(want) + r"[0-9]+$")
    for rel in obj_rels:
        if pattern.match(stem_of(os.path.basename(rel)).lower()):
            return rel
    return None


def check_helpers():
    """The lookup rules on plain data. Run by --selftest before Blender is involved; raises AssertionError."""
    index = [
        ("Guess_a.png", "/t/Guess_a.png"),
        ("Guess_b.png", "/t/Guess_b.png"),
        ("Props.png", "/t/Props.png"),
        ("Sign_Board.png", "/t/Sign_Board.png"),
        ("Town_Hall_a.png", "/t/Town_Hall_a.png"),
        ("Town_Hall_b.png", "/t/Town_Hall_b.png"),
    ]
    # rule 3: exact, then case-insensitive, then stem with any extension; both separators
    assert lookup_referenced_name(index, "C:/Users/synty/Dropbox/props.png") == "/t/Props.png"
    assert lookup_referenced_name(index, "C:\\Users\\synty\\PROPS.PNG") == "/t/Props.png"
    assert lookup_referenced_name(index, "props.tga") == "/t/Props.png"
    assert lookup_referenced_name(index, "nowhere.png") is None
    # rule 4 (amendment B): file-name aliases (case and extension ignored), then material aliases (suffix dropped)
    aliases = {"mastertexture02": "/t/Atlas.png", "material:lambert1": "/t/Road.png", "plants2": "/t/Trees.png"}
    assert file_alias_key("MasterTexture02.psd") == "mastertexture02"
    assert file_alias_key("mastertexture02.PNG") == "mastertexture02"
    assert file_alias_key("MasterTexture02") == "mastertexture02"
    assert file_alias_key("a.b.psd") == "a.b"
    assert material_alias_key("Lambert1.001") == "material:lambert1"
    assert lookup_alias(aliases, "C:/art/MasterTexture02.psd", "Mat") == ("/t/Atlas.png", "mastertexture02")
    assert lookup_alias(aliases, "C:\art\PLANTS2.PSD", "lambert1") == ("/t/Trees.png", "plants2")  # the file key first
    assert lookup_alias(aliases, "C:/art/other.psd", "Lambert1.002") == ("/t/Road.png", "material:lambert1")
    assert lookup_alias(aliases, None, "lambert1") == ("/t/Road.png", "material:lambert1")  # no reference: material aliases only
    assert lookup_alias(aliases, None, "mastertexture02") == (None, None)  # a file key never matches a material name
    assert lookup_alias(aliases, "C:/art/other.psd", "Mat") == (None, None)
    assert parse_aliases(["mastertexture02=/t/Atlas.png", "material:a=b=c"]) == {
        "mastertexture02": os.path.normpath("/t/Atlas.png"),
        "material:a": os.path.normpath("b=c"),
    }
    # fix (a): an OBJ copy of an old FBX; an exact stem beats a stem plus digits; the first in sorted order of each kind
    objs = ["Obj/a/Road_crossing_mesh1.obj", "Obj/b/road_crossing_mesh2.obj", "Obj/fire_truck_mesh.obj", "Obj/road_crossing_mesh.obj"]
    assert obj_copy_for("road_crossing_mesh", objs) == "Obj/road_crossing_mesh.obj"
    assert obj_copy_for("road_crossing_mesh", objs[:2]) == "Obj/a/Road_crossing_mesh1.obj"
    assert obj_copy_for("fire_truck_mesh", objs) == "Obj/fire_truck_mesh.obj"
    assert obj_copy_for("road_crossing", objs) is None  # "_mesh1" is not digits
    assert obj_copy_for("road_crossing_mesh", ["Obj/road_crossing_mesh_b.obj"]) is None
    # rule 5: normalised name; suffix dropped; generic names skipped
    assert lookup_material_name(index, "Sign_Board") == "/t/Sign_Board.png"
    assert lookup_material_name(index, "sign board.003") == "/t/Sign_Board.png"
    assert lookup_material_name(index, "lambert1") is None
    assert lookup_material_name(index, "Material.001") is None
    assert lookup_material_name(index, "---") is None
    for generic in ("phong2", "blinn1", "defaultMaterial", "initialShadingGroup", "None", "material"):
        assert is_generic_material(generic), generic
    assert not is_generic_material("lambert_roof")
    # rule 6: model name guess; first in sorted order
    assert model_guess_key("town_hall_mesh") == "townhall"
    assert model_guess_key("SM_Prop_Crate") == "propcrate"
    assert model_guess_key("Guess_mesh") == "guess"
    assert lookup_model_name(index, "town_hall_mesh") == "/t/Town_Hall_a.png"
    assert lookup_model_name(index, "guess_mesh") == "/t/Guess_a.png"
    assert lookup_model_name(index, "bin_mesh") is None
    assert lookup_model_name(index, "_mesh") is None
    assert drop_blender_suffix("lambert1.001") == "lambert1"
    assert split_basename("C:\a\b/c.png") == "c.png"


# ---------------------------------------------------------------------------------------------
# Blender
# ---------------------------------------------------------------------------------------------

def empty_scene():
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)


_IMAGES = {}  # normalised file path -> its one image datablock


def load_image_once(path):
    """
    The image datablock for this file: loaded once however many materials ask (sRGB), so the GLB
    embeds the file once. The FBX importer makes an image per texture node, several for one file, so
    Blender's own check_existing would hand back one of those; this cache is keyed by the file instead.
    """
    import bpy
    key = os.path.normcase(os.path.normpath(path))
    image = _IMAGES.get(key)
    if image is None:
        image = bpy.data.images.load(path, check_existing=False)
        image.colorspace_settings.name = "sRGB"
        _IMAGES[key] = image
    return image


def make_atlas_material(atlas_path):
    """One Principled BSDF material: base colour = the atlas, roughness 1, metallic 0, no emission."""
    import bpy
    image = load_image_once(atlas_path)
    mat = bpy.data.materials.new("PackAtlas")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Closest"  # atlases are flat colour blocks; no bleeding between them
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = 0.0
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    return mat


def material_image_node(mat):
    """(the image node feeding Base Color, else the first image node with a file image, else None)."""
    tree = getattr(mat, "node_tree", None)
    if tree is None:
        return None
    def usable(node):
        if node.type != "TEX_IMAGE":
            return False
        img = node.image
        return img is not None and img.source == "FILE" and img.filepath != ""
    for node in tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            sock = node.inputs.get("Base Color")
            if sock is not None:
                for link in sock.links:
                    if usable(link.from_node):
                        return link.from_node
    for node in tree.nodes:
        if usable(node):
            return node
    return None


def referenced_path(node):
    """The file path an image node points at, as the FBX wrote it (absolute and normalised if it can be)."""
    import bpy
    return os.path.normpath(bpy.path.abspath(node.image.filepath))


def find_texture_for_material(mat, model_stem, override, index, packdir, aliases):
    """
    The image for one material in per-model mode. Returns (path or None, referenced name or None, guessed).
    The first rule that gives a file wins:
      1. the model's override;  2. the reference as it stands (exists, inside the pack);
      3. the referenced file name in the index;
      4. an alias (a file-name alias for the referenced name, then a material alias for the material's name);
      5. the material name;
      6. the model's name (a guess; only for a material with no reference).
    An alias is Josh's statement of fact, so it carries no warning.
    """
    if override is not None:
        return override, None, False
    node = material_image_node(mat)
    ref = referenced_path(node) if node is not None else None
    if ref is not None and os.path.isfile(ref) and inside(packdir, ref):
        return ref, None, False
    if ref is not None:
        found = lookup_referenced_name(index, ref)
        if found:
            return found, None, False
    found, _key = lookup_alias(aliases, ref, mat.name)
    if found:
        return found, None, False
    found = lookup_material_name(index, mat.name)
    if found:
        return found, None, False
    if ref is not None:
        return None, split_basename(ref), False
    found = lookup_model_name(index, model_stem)
    if found:
        return found, None, True
    return None, None, False


def wire_image(mat, image_path):
    """Base Color of the material's Principled BSDF = this image. Reuses the existing image node, or adds one."""
    tree = mat.node_tree
    bsdf = next((n for n in tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = tree.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in tree.nodes if n.type == "OUTPUT_MATERIAL"), None)
        if out is not None:
            tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    node = material_image_node(mat)
    if node is None:
        node = tree.nodes.new("ShaderNodeTexImage")
    image = load_image_once(image_path)
    node.image = image
    tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    # The FBX importer can add a second image node on the same texture (it feeds Alpha). Point every image
    # node at the one image, or the exporter embeds the importer's own copy next to it.
    for other in tree.nodes:
        if other.type == "TEX_IMAGE" and other is not node and other.image is not None:
            other.image = image


def note_alias_keys(mat, seen):
    """Record the alias keys this material could match (whichever rule ends up deciding), to report aliases that match nothing."""
    node = material_image_node(mat)
    if node is not None:
        base = split_basename(referenced_path(node))
        if base != "":
            seen.add(file_alias_key(base))
    seen.add(material_alias_key(mat.name))


def texture_materials(meshes, stem, ctx):
    """
    Per-model mode: find and wire an image for every material on the model's meshes.
    Returns (embedded image paths, missing names, guessed?, the set of meshes that carry an image).
    """
    override = ctx["overrides"].get(stem)
    outcome = {}  # material -> (path, referenced name, guessed)
    for o in meshes:
        for mat in o.data.materials:
            if mat is not None and mat.name not in outcome:
                note_alias_keys(mat, ctx["alias_seen"])
                outcome[mat.name] = find_texture_for_material(mat, stem, override, ctx["index"], ctx["packdir"], ctx["aliases"])
    images, missing, plain, guessed, wired = set(), set(), set(), False, set()
    for o in meshes:
        for mat in o.data.materials:
            if mat is None:
                continue
            path, ref_name, was_guess = outcome[mat.name]
            if path is not None:
                if mat.name not in wired:
                    wire_image(mat, path)
                    wired.add(mat.name)
                images.add(path)
                guessed = guessed or was_guess
            elif ref_name is not None:
                missing.add(ref_name)
            else:
                plain.add(drop_blender_suffix(mat.name))
    if not images:
        missing.update("material:" + n for n in plain)
    with_image = set()
    for o in meshes:
        if any(m is not None and outcome[m.name][0] is not None for m in o.data.materials):
            with_image.add(o.name)
    return images, missing, guessed, with_image


def import_one(path, rel, stem, scale, ctx):
    """
    Import one FBX and fold it into one root object named `stem` with its meshes below it, transforms
    applied, pivot at the base centre. Returns the entry dict for the report. Raises on failure (the
    objects it made are removed, so they stay out of the GLB).
    """
    import bpy
    from mathutils import Matrix, Vector

    before = {o.name for o in bpy.data.objects}
    try:
        bpy.ops.import_scene.fbx(
            filepath=path,
            use_manual_orientation=False,   # trust the file's own units and axes
            global_scale=scale,
            use_anim=False,
            use_custom_normals=True,
        )
        new = [o for o in bpy.data.objects if o.name not in before]
        bpy.context.view_layer.update()

        meshes = [o for o in new if o.type == "MESH"]
        # Animations, cameras, lights, armatures and anything else that isn't a mesh are dropped.
        for o in new:
            if o.type != "MESH":
                bpy.data.objects.remove(o, do_unlink=True)
        if not meshes:
            raise RuntimeError("the file contains no meshes")

        # Bake each mesh's world transform into its own (single-user) mesh data, then drop the hierarchy.
        for o in meshes:
            world = o.matrix_world.copy()
            o.parent = None
            o.matrix_basis = Matrix.Identity(4)
            o.animation_data_clear()
            for mod in [m for m in o.modifiers if m.type == "ARMATURE"]:
                o.modifiers.remove(mod)
            o.data = o.data.copy()
            o.data.transform(world)

        # Bounds in Blender space (Z up), over every vertex of every mesh.
        xs, ys, zs = [], [], []
        for o in meshes:
            for v in o.data.vertices:
                xs.append(v.co.x)
                ys.append(v.co.y)
                zs.append(v.co.z)
        if not xs:
            raise RuntimeError("the meshes have no vertices")
        base = Vector(((min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0, min(zs)))
        shift = Matrix.Translation(-base)
        for o in meshes:
            o.data.transform(shift)
        bmin = (min(xs) - base.x, min(ys) - base.y, min(zs) - base.z)
        bmax = (max(xs) - base.x, max(ys) - base.y, max(zs) - base.z)

        # One root at the origin, named after the file. A mesh that already has the stem as its name gives it up.
        for o in meshes:
            if o.name == stem:
                o.name = stem + "_mesh"
        atlas_material = ctx["atlas_material"]
        if atlas_material is None:
            images, missing, guessed, with_image = texture_materials(meshes, stem, ctx)
        else:
            images, missing, guessed, with_image = {ctx["atlas"]}, set(), False, {o.name for o in meshes}
        root = bpy.data.objects.new(stem, None)
        bpy.context.scene.collection.objects.link(root)
        triangles = 0
        no_uv = False
        for o in meshes:
            o.parent = root
            me = o.data
            me.calc_loop_triangles()
            triangles += len(me.loop_triangles)
            # No UV map matters where the mesh is meant to carry an image: any mesh in atlas mode,
            # a mesh with a material that has an image in per-model mode.
            if len(me.uv_layers) == 0 and o.name in with_image:
                no_uv = True
            if atlas_material is not None:
                me.materials.clear()
                me.materials.append(atlas_material)
                for poly in me.polygons:
                    poly.material_index = 0
    except Exception:
        for o in [o for o in bpy.data.objects if o.name not in before]:
            bpy.data.objects.remove(o, do_unlink=True)
        raise

    return {
        "name": stem,
        "source": rel,
        "bounds": to_gltf_bounds(bmin, bmax),
        "triangles": triangles,
        "textures": sorted({rel_to(ctx["indir"], p) for p in images}),
        "missingTextures": sorted(missing),
        "warnings": warnings_for(bmin, bmax, no_uv, len(missing) > 0, guessed),
    }


def convert(indir, out, report_path, atlas, scale, textures_dir, overrides, aliases):
    import bpy

    empty_scene()
    _IMAGES.clear()
    indir = os.path.normpath(indir)
    texdir = os.path.normpath(textures_dir) if textures_dir else indir
    ctx = {
        "indir": indir,
        "packdir": indir,
        "atlas": atlas,
        "atlas_material": make_atlas_material(atlas) if atlas else None,
        "index": [] if atlas else build_texture_index(texdir),
        "overrides": overrides,
        "aliases": aliases,
        "alias_seen": set(),
    }
    obj_copies = find_obj_copies(indir)

    assets, failures, names = [], [], set()
    for rel in find_fbx(indir):
        stem = os.path.splitext(os.path.basename(rel))[0]
        if stem in names:
            failures.append({"source": rel, "error": "another file in this pack has the same name (%s)" % stem})
            continue
        path = os.path.join(indir, rel)
        try:
            entry = import_one(path, rel, stem, scale, ctx)
        except Exception as e:  # one bad FBX must not stop the pack
            failures.append({"source": rel, "error": import_failure_message(path, stem, obj_copies, str(e) or e.__class__.__name__)})
            continue
        names.add(stem)
        assets.append(entry)

    if not atlas:
        for key in sorted(aliases):
            if key not in ctx["alias_seen"]:
                print("texture alias %s matched no material" % key)

    report = {"blenderVersion": bpy.app.version_string, "assets": assets, "failures": failures}
    os.makedirs(os.path.dirname(os.path.abspath(report_path)), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")

    if not assets:
        print("convert_fbx: nothing could be converted from %s" % indir, file=sys.stderr)
        for fail in failures:
            print("  %s: %s" % (fail["source"], fail["error"]), file=sys.stderr)
        return 1

    # Drop what the imports left behind (the importer's own images, the meshes before their transforms were baked).
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_image_format="AUTO",
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        use_selection=False,
    )
    print("convert_fbx: %d model(s), %d failure(s) -> %s" % (len(assets), len(failures), out))
    return 0


# ---------------------------------------------------------------------------------------------
# Self-test: boxes built in code, exported to Unity-style FBX, then converted the normal way.
# ---------------------------------------------------------------------------------------------

def _box_object(name, size, z_offset, with_uv, material=None):
    """A box of `size` metres (x, y, z) whose lowest point is at -z_offset, i.e. the pivot is z_offset above the base."""
    import bpy
    import bmesh
    bm = bmesh.new()
    if with_uv:
        bm.loops.layers.uv.new("UVMap")
    bmesh.ops.create_cube(bm, size=1.0, calc_uvs=with_uv)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z = v.co.z * size[2] + size[2] / 2.0 - z_offset
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if material is not None:
        me.materials.append(material)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _export_fbx(obj, path):
    import bpy
    for o in bpy.data.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    # Blender's FBX exporter writes centimetres (UnitScaleFactor 1), as Unity's does:
    # a 3 m pole becomes 300 in the file, and the importer scales it back by 0.01.
    # ABSOLUTE keeps each image's path as it is (so a reference to a file that isn't there stays in the FBX).
    bpy.ops.export_scene.fbx(
        filepath=path,
        use_selection=True,
        object_types={"MESH"},
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_NONE",
        bake_anim=False,
        path_mode="ABSOLUTE",
    )


def _write_png(path, rgb):
    """A 4x4 solid-colour PNG, written by Blender."""
    import bpy
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image = bpy.data.images.new(os.path.basename(path), width=4, height=4, alpha=False)
    image.pixels = [rgb[0], rgb[1], rgb[2], 1.0] * (4 * 4)
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def _referencing_material(name, image_path):
    """A material whose Base Color is an image at image_path, which need not exist."""
    import bpy
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    try:
        image = bpy.data.images.load(image_path, check_existing=False)
    except RuntimeError:
        image = bpy.data.images.new(os.path.basename(image_path), 4, 4)
        image.filepath = image_path
        image.source = "FILE"
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def _plain_material(name):
    import bpy
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def build_selftest(indir):
    """
    Write the self-test pack into indir: FBX files in Fbx/, images in Textures/ (so the FBX and the images
    sit in sibling folders, as in a real pack). The pack has no atlas: it runs in per-model mode.
    """
    empty_scene()
    fbx = os.path.join(indir, "Fbx")
    tex = os.path.join(indir, "Textures")
    os.makedirs(fbx, exist_ok=True)
    for name, rgb in (
        ("tex_crate.png", (0.8, 0.45, 0.2)),
        ("Sign_Board.png", (0.2, 0.6, 0.8)),
        ("Guess_a.png", (0.9, 0.1, 0.1)),
        ("Guess_b.png", (0.1, 0.9, 0.1)),
        ("nouv_tex.png", (0.5, 0.5, 0.5)),
        ("alias_atlas.png", (0.3, 0.3, 0.9)),
        ("metal_sheet.png", (0.7, 0.7, 0.75)),
    ):
        _write_png(os.path.join(tex, name), rgb)
    missing_dir = os.path.join(indir, "nowhere-on-disk")  # never created: references into it dangle

    # The fake Unity pole: 40 x 300 x 40 cm, pivot 50 cm above its base. No material, so no texture and no warning.
    pole = _box_object(SELFTEST_POLE, (0.4, 0.4, 3.0), 0.5, True)
    _export_fbx(pole, os.path.join(fbx, SELFTEST_POLE + ".fbx"))
    # A box with no UV map at all, whose material has a present image (rule 2), so it still carries no-uv.
    no_uv = _box_object(SELFTEST_NO_UV, (0.5, 0.5, 0.5), 0.0, False, _referencing_material("NoUvMat", os.path.join(tex, "nouv_tex.png")))
    _export_fbx(no_uv, os.path.join(fbx, SELFTEST_NO_UV + ".fbx"))
    # Rule 3: the reference is a path that isn't here, in another case; the file is Textures/tex_crate.png.
    ref_case = _box_object(SELFTEST_REF_CASE, (0.5, 0.5, 0.5), 0.0, True, _referencing_material("RefMat", "C:/nowhere/TEX_Crate.PNG"))
    _export_fbx(ref_case, os.path.join(fbx, SELFTEST_REF_CASE + ".fbx"))
    # Rule 5: no reference; the material is called Sign_Board and the file is Textures/Sign_Board.png.
    mat_name = _box_object(SELFTEST_MAT_NAME, (0.5, 0.5, 0.5), 0.0, True, _plain_material("Sign_Board"))
    _export_fbx(mat_name, os.path.join(fbx, SELFTEST_MAT_NAME + ".fbx"))
    # Rule 6: a generic material with no reference; Guess_a.png and Guess_b.png both start with the model's name.
    guess = _box_object(SELFTEST_GUESS, (0.5, 0.5, 0.5), 0.0, True, _plain_material("lambert1"))
    _export_fbx(guess, os.path.join(fbx, SELFTEST_GUESS + ".fbx"))
    # Amendment B, rule 4: a file-name alias (Master_Src.PNG -> Textures/alias_atlas.png); no Master_Src.* file exists.
    alias_ref = _box_object(SELFTEST_ALIAS_REF, (0.5, 0.5, 0.5), 0.0, True, _referencing_material("AliasRefMat", "C:/art/Master_Src.psd"))
    _export_fbx(alias_ref, os.path.join(fbx, SELFTEST_ALIAS_REF + ".fbx"))
    # A material alias (material:Painted_Metal -> Textures/metal_sheet.png), suffix dropped; no reference, no file named like the material.
    alias_mat = _box_object(SELFTEST_ALIAS_MAT, (0.5, 0.5, 0.5), 0.0, True, _plain_material("Painted_Metal.001"))
    _export_fbx(alias_mat, os.path.join(fbx, SELFTEST_ALIAS_MAT + ".fbx"))
    # Rule 3 beats an alias: tex_crate.psd is aliased to alias_atlas.png, but Textures/tex_crate.png exists.
    alias_order = _box_object(SELFTEST_ALIAS_ORDER, (0.5, 0.5, 0.5), 0.0, True, _referencing_material("AliasOrderMat", "C:/nowhere/tex_crate.psd"))
    _export_fbx(alias_order, os.path.join(fbx, SELFTEST_ALIAS_ORDER + ".fbx"))
    # A reference no rule can find.
    lost = _box_object(SELFTEST_LOST_REF, (0.5, 0.5, 0.5), 0.0, True, _referencing_material("LostMat", os.path.join(missing_dir, "nowhere.png")))
    _export_fbx(lost, os.path.join(fbx, SELFTEST_LOST_REF + ".fbx"))


def main():
    args = parse_args(sys.argv)
    if args.selftest:
        check_helpers()
        build_selftest(args.indir)
    return convert(args.indir, args.out, args.report, args.atlas, args.scale, args.textures, parse_overrides(args.overrides), parse_aliases(args.aliases))


if __name__ == "__main__":
    try:
        code = main()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        code = 1
    sys.exit(code)
