"""
Convert one pack of FBX files into one GLB, and report what it made (ticket 038).

Run it headless, once per pack (tools/assets/convert.ts does this):

  blender --background --factory-startup --python tools/blender/convert_fbx.py -- \
      --in <packDir> --out <glbPath> --report <json> [--atlas <png>] [--scale <n>]

  ... -- --selftest --in <dir> --out <glbPath> --report <json>
      builds two boxes in code, exports them to FBX in <dir> (Unity-style: centimetres), then converts
      that folder through the normal path. No purchased asset is needed.

Every FBX under --in (recursive, sorted by path) becomes one root object named after the file's stem,
with its meshes under it, its pivot at the base centre (lowest point, x/y centred, Blender's Z up).
One material (the atlas) is shared by every mesh. The GLB is exported Y up, in metres.

The report is JSON in the shape of src/core/assets.ts (AssetEntry, AssetFailure) plus "blenderVersion".
Bounds in it are glTF space (Y up). Exit code is 1 if nothing could be converted or the script failed.

Nothing here may be committed with data from a purchased pack: assets/private/ is gitignored.
"""

import argparse
import json
import os
import sys
import traceback

# Keep these two in step with ASSET_SANE_SIZE_MIN / ASSET_SANE_SIZE_MAX in src/core/assets.ts
# (a test in tools/assets/ checks that they match).
ASSET_SANE_SIZE_MIN = 0.05
ASSET_SANE_SIZE_MAX = 60

SELFTEST_POLE = "SelfTest_Pole"
SELFTEST_NO_UV = "SelfTest_NoUV"


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


def warnings_for(bmin, bmax, has_atlas, all_meshes_have_uv):
    out = []
    if scale_suspect(bmin, bmax):
        out.append("scale-suspect")
    if not all_meshes_have_uv:
        out.append("no-uv")
    if not has_atlas:
        out.append("no-atlas")
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
    p.add_argument("--selftest", dest="selftest", action="store_true")
    return p.parse_args(argv)


def find_fbx(indir):
    """Every .fbx under indir, recursive, sorted by relative path (forward slashes)."""
    found = []
    for folder, _dirs, files in os.walk(indir):
        for name in files:
            if name.lower().endswith(".fbx"):
                rel = os.path.relpath(os.path.join(folder, name), indir).replace(os.sep, "/")
                found.append(rel)
    found.sort()
    return found


# ---------------------------------------------------------------------------------------------
# Blender
# ---------------------------------------------------------------------------------------------

def empty_scene():
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_atlas_material(atlas_path):
    """One Principled BSDF material: base colour = the atlas, roughness 1, metallic 0, no emission."""
    import bpy
    image = bpy.data.images.load(atlas_path)
    image.colorspace_settings.name = "sRGB"
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


def import_one(path, rel, stem, scale, material):
    """
    Import one FBX and fold it into one root object named `stem` with its meshes below it, transforms
    applied, pivot at the base centre. Returns the entry dict for the report. Raises on failure (the
    caller leaves the objects out of the GLB).
    """
    import bpy
    from mathutils import Matrix, Vector

    before = {o.name for o in bpy.data.objects}
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
    root = bpy.data.objects.new(stem, None)
    bpy.context.scene.collection.objects.link(root)
    triangles = 0
    all_uv = True
    for o in meshes:
        o.parent = root
        me = o.data
        me.calc_loop_triangles()
        triangles += len(me.loop_triangles)
        if len(me.uv_layers) == 0:
            all_uv = False
        if material is not None:
            me.materials.clear()
            me.materials.append(material)
            for poly in me.polygons:
                poly.material_index = 0

    return {
        "name": stem,
        "source": rel,
        "bounds": to_gltf_bounds(bmin, bmax),
        "triangles": triangles,
        "warnings": warnings_for(bmin, bmax, material is not None, all_uv),
    }


def convert(indir, out, report_path, atlas, scale):
    import bpy

    empty_scene()
    material = make_atlas_material(atlas) if atlas else None

    assets, failures, names = [], [], set()
    for rel in find_fbx(indir):
        stem = os.path.splitext(os.path.basename(rel))[0]
        if stem in names:
            failures.append({"source": rel, "error": "another file in this pack has the same name (%s)" % stem})
            continue
        try:
            entry = import_one(os.path.join(indir, rel), rel, stem, scale, material)
        except Exception as e:  # one bad FBX must not stop the pack
            failures.append({"source": rel, "error": str(e) or e.__class__.__name__})
            continue
        names.add(stem)
        assets.append(entry)

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
# Self-test: two boxes built in code, exported to Unity-style FBX, then converted the normal way.
# ---------------------------------------------------------------------------------------------

def _box_object(name, size, z_offset, with_uv):
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
    bpy.ops.export_scene.fbx(
        filepath=path,
        use_selection=True,
        object_types={"MESH"},
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_NONE",
        bake_anim=False,
        path_mode="STRIP",
    )


def build_selftest(indir):
    """Write the two FBX files and a small atlas into indir; return the atlas path."""
    import bpy
    os.makedirs(indir, exist_ok=True)
    empty_scene()
    # The fake Unity pole: 40 x 300 x 40 cm, pivot 50 cm above its base.
    pole = _box_object(SELFTEST_POLE, (0.4, 0.4, 3.0), 0.5, True)
    _export_fbx(pole, os.path.join(indir, SELFTEST_POLE + ".fbx"))
    # A box with no UV map at all.
    no_uv = _box_object(SELFTEST_NO_UV, (0.5, 0.5, 0.5), 0.0, False)
    _export_fbx(no_uv, os.path.join(indir, SELFTEST_NO_UV + ".fbx"))

    atlas_path = os.path.join(indir, "selftest_atlas.png")
    image = bpy.data.images.new("selftest_atlas", width=4, height=4, alpha=False)
    image.pixels = [0.8, 0.45, 0.2, 1.0] * (4 * 4)
    image.filepath_raw = atlas_path
    image.file_format = "PNG"
    image.save()
    return atlas_path


def main():
    args = parse_args(sys.argv)
    atlas = args.atlas
    if args.selftest:
        made = build_selftest(args.indir)
        atlas = atlas or made
    return convert(args.indir, args.out, args.report, atlas, args.scale)


if __name__ == "__main__":
    try:
        code = main()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        code = 1
    sys.exit(code)
