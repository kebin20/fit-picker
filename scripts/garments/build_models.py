"""Build static, garment-specific glTF clothes with Blender 4.5 LTS.

Run with Blender --background --factory-startup --python scripts/garments/build_models.py --
    --only overshirt-long --frames 32

Uses the project's already posed CC0 DATA; no upstream GPL build code is used.
The simulation, tailoring, trims, UVs and normal bake happen here, never in the app.
Editable intermediate scenes live in ignored .cache/garment-build/.
"""
import argparse
import base64
import hashlib
import json
import math
import struct
import sys
import time
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/garments'
WORK = ROOT / '.cache/garment-build'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)

# Different constructions, not a recoloured field jacket. Thin tops and outer
# layers have different ease/collision envelopes so selected pieces can layer.
SPECS = {
    'tee': dict(seed='tshirt', mass=.18, bend=.12, ease=.014, frames=32),
    'longsleeve': dict(seed='hoodie', mass=.20, bend=.18, ease=.015, crew=True),
    'sweatshirt': dict(seed='hoodie', mass=.32, bend=.5, ease=.023, crew=True, rib=True),
    'hoodie': dict(seed='hoodie', mass=.34, bend=.55, ease=.026, hood=True, rib=True, kangaroo=True),
    'shirt-short': dict(seed='shirt', mass=.20, bend=.35, ease=.018, short=True, buttons=True, pockets=1),
    'shirt-long': dict(seed='shirt', mass=.23, bend=.45, ease=.020, buttons=True, pockets=1),
    'overshirt-short': dict(seed='shirt', mass=.24, bend=.55, ease=.022, short=True, open=True, outer=True, buttons=True, pockets=1),
    'overshirt-long': dict(seed='shirt', mass=.30, bend=.8, ease=.025, open=True, outer=True, buttons=True, pockets=1),
    'bomber': dict(seed='hoodie', mass=.35, bend=1.2, ease=.033, open=True, outer=True, rib=True, bomber=True, zipper=True, welt=True),
    'puffer': dict(seed='hoodie', mass=.45, bend=2.2, ease=.046, open=True, outer=True, puffer=True, zipper=True, welt=True),
    'rain-jacket': dict(seed='hoodie', mass=.16, bend=.3, ease=.037, open=True, outer=True, hood=True, rain=True, zipper=True, welt=True),
    'coat': dict(seed='shirt', mass=.55, bend=3.0, ease=.030, open=True, outer=True, coat=True, welt=True, buttons=True),
    'shorts': dict(seed='shorts', mass=.22, bend=.5, ease=.006, trousers='shorts'),
    'trousers-slim': dict(seed='jeans', mass=.28, bend=.7, ease=.007, trousers='slim'),
    'trousers-regular': dict(seed='jeans', mass=.28, bend=.7, ease=.009, trousers='regular'),
    'trousers-wide': dict(seed='jeans', mass=.30, bend=.9, ease=.012, trousers='wide'),
    'trousers-barrel': dict(seed='jeans', mass=.33, bend=1., ease=.012, trousers='barrel'),
    'trousers-ankle': dict(seed='jeans', mass=.27, bend=.7, ease=.008, trousers='ankle'),
}

def smooth(a, b, value):
    t = max(0., min(1., (value - a) / (b - a)))
    return t * t * (3 - 2 * t)


def gltf(co):
    return Vector((co.x, co.z, -co.y))


def native(co):
    return Vector((co[0], -co[2], co[1]))


def select(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply(obj, modifier):
    select(obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def import_mesh(file, name=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/models' / file))
    objects = set(bpy.data.objects) - before
    meshes = [o for o in objects if o.type == 'MESH']
    obj = next((o for o in meshes if o.name == name or o.name.startswith(name + '.')), None) if name else meshes[0]
    if obj is None:
        raise RuntimeError(f'No mesh {name} in {file}')
    for other in objects:
        if other != obj:
            bpy.data.objects.remove(other, do_unlink=True)
    select(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def arm_weights(seed):
    """Read arm weights from DATA only, aligned with the static bake vertices."""
    file = ROOT / '.cache/avatar-source' / f'clothing_{seed}.glb'
    raw = file.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    binary = raw[28 + length:]
    primitive = doc['meshes'][0]['primitives'][0]
    types = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
    def read(key):
        accessor = doc['accessors'][primitive['attributes'][key]]
        view = doc['bufferViews'][accessor['bufferView']]
        fmt, size = types[accessor['componentType']]
        count = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[accessor['type']]
        stride = view.get('byteStride', count * size)
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        return [struct.unpack_from('<' + fmt * count, binary, start + i * stride) for i in range(accessor['count'])]
    names = [doc['nodes'][i]['name'] for i in doc['skins'][0]['joints']]
    return [sum(w for j, w in zip(js, ws) if 'arm_' in names[j] or 'hand_' in names[j])
            for js, ws in zip(read('JOINTS_0'), read('WEIGHTS_0'))]


def outward(bm):
    # Open garment panels do not enclose a volume, so generic normal
    # recalculation can choose the inward orientation. Use the torso surface,
    # not the cuffs/collar, to establish the outward side before any easing.
    faces = [f for f in bm.faces if 1.05 < f.calc_center_median().z < 1.34 and abs(f.calc_center_median().x) < .18]
    if not faces: faces = list(bm.faces)
    score = sum((f.normal.x * f.calc_center_median().x + f.normal.y * (f.calc_center_median().y + .02)) * f.calc_area() for f in faces)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
        bm.normal_update()


def weld(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    outward(bm)
    bm.to_mesh(obj.data); bm.free(); obj.data.update()


def largest_component(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    pending = set(bm.verts); groups = []
    while pending:
        seed = pending.pop(); group = {seed}; stack = [seed]
        while stack:
            v = stack.pop()
            for e in v.link_edges:
                other = e.other_vert(v)
                if other in pending:
                    pending.remove(other); group.add(other); stack.append(other)
        groups.append(group)
    main = max(groups, key=len)
    bmesh.ops.delete(bm, geom=[v for group in groups if group is not main for v in group], context='VERTS')
    bm.to_mesh(obj.data); bm.free(); obj.data.update()


def clip_mesh(obj, regions):
    """Exact polygon intersections; interpolate UVs and arm classification."""
    mesh = obj.data; mesh.calc_loop_triangles()
    attr = mesh.attributes.get('fp_arm')
    def vertex(loop):
        p = gltf(mesh.vertices[loop.vertex_index].co)
        uv = mesh.uv_layers.active.data[loop.index].uv
        return [*p, uv.x, uv.y, attr.data[loop.vertex_index].value if attr else 0.]
    def clip(poly, distance):
        result = []
        for a, b in zip(poly, poly[1:] + poly[:1]):
            da, db = distance(a), distance(b)
            if da >= -1e-10: result.append(a)
            if da * db < -1e-20:
                t = da / (da - db)
                result.append([x + (y - x) * t for x, y in zip(a, b)])
        return result
    coords = []; uvs = []; arms = []; faces = []
    for tri in mesh.loop_triangles:
        poly = [vertex(mesh.loops[i]) for i in tri.loops]
        for region in regions(poly, clip):
            for i in range(1, len(region) - 1):
                triangle = [region[0], region[i], region[i + 1]]
                if (Vector(triangle[1][:3]) - Vector(triangle[0][:3])).cross(Vector(triangle[2][:3]) - Vector(triangle[0][:3])).length < 1e-10: continue
                face = []
                for v in triangle:
                    face.append(len(coords)); coords.append(native(v)); uvs.append(v[3:5]); arms.append(v[5])
                faces.append(face)
    result = bpy.data.meshes.new('Tailored panels')
    result.from_pydata(coords, [], faces); result.update()
    uv = result.uv_layers.new(name='UVMap')
    for loop in result.loops: uv.data[loop.index].uv = uvs[loop.vertex_index]
    arm = result.attributes.new('fp_arm', 'FLOAT', 'POINT')
    for i, weight in enumerate(arms): arm.data[i].value = weight
    obj.data = result
    bpy.data.meshes.remove(mesh)
    weld(obj)


def open_front(obj, spec):
    def gap(v):
        # Collar/zipper openings are different from the wide coat lapel break.
        base = .032 if spec.get('bomber') or spec.get('puffer') else .037
        return base + max(0., 1.30 - v[1]) * (.11 if spec.get('coat') else .025)
    def regions(poly, clip):
        rest = clip(poly, lambda v: gap(v) - v[0])
        return [clip(poly, lambda v: v[0] - gap(v)),
                clip(rest, lambda v: -v[0] - gap(v)),
                clip(clip(rest, lambda v: v[0] + gap(v)), lambda v: .035 - v[2])]
    clip_mesh(obj, regions)


def short_sleeves(obj):
    def regions(poly, clip):
        return [clip(poly, lambda v: .45 - v[5]),
                clip(clip(poly, lambda v: v[5] - .45), lambda v: v[1] - 1.245)]
    clip_mesh(obj, regions)


def extend_coat(obj):
    # Keep the authored shoulders, armholes and sleeves. Replace only the torso
    # below the waist with a connected, flared knee-length skirt.
    def regions(poly, clip):
        return [clip(poly, lambda v: v[5] - .42),
                clip(clip(poly, lambda v: .42 - v[5]), lambda v: v[1] - 1.055)]
    clip_mesh(obj, regions)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    hem = [e for e in bm.edges if e.is_boundary and all(abs(v.co.z - 1.055) < .0001 for v in e.verts)]
    if not hem: raise RuntimeError('Coat waist boundary not found')
    chain = list({v for e in hem for v in e.verts})
    originals = {v: v.co.copy() for v in chain}
    previous = {v: v for v in chain}
    for row in range(1, 19):
        u = row / 18
        current = {}
        for first in chain:
            p = gltf(originals[first]); angle = math.atan2(p.x, p.z)
            p.x += math.sin(angle) * .055 * u
            p.z += math.cos(angle) * .025 * u
            # A modest front opening keeps the inner outfit visible.
            if p.z > .065 and abs(p.x) < .1: p.x += math.copysign(.045 * u, p.x)
            p.y = 1.055 - .565 * u
            current[first] = bm.verts.new(native(p))
        for edge in hem:
            a, b = edge.verts
            bm.faces.new((previous[a], previous[b], current[b], current[a]))
        previous = current
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    outward(bm)
    bm.to_mesh(obj.data); bm.free(); obj.data.update()


def trouser_shape(obj, cut):
    # Expand around each leg rather than scaling the whole stance apart.
    bands = [[float('inf'), -float('inf'), float('inf'), -float('inf')] for _ in range(20)]
    for v in obj.data.vertices:
        x, y, z = gltf(v.co); b = bands[max(0, min(19, round(y / .055)))]
        if abs(x) < .008: continue
        b[0] = min(b[0], abs(x)); b[1] = max(b[1], abs(x)); b[2] = min(b[2], z); b[3] = max(b[3], z)
    for v in obj.data.vertices:
        x, y, z = gltf(v.co); b = bands[max(0, min(19, round(y / .055)))]
        if not math.isfinite(b[0]): continue
        centre = (b[0] + b[1]) / 2; depth = (b[2] + b[3]) / 2
        ease = 1 - smooth(.7, .94, y)
        amount = {'slim': .35, 'ankle': .35, 'regular': .6, 'shorts': .22, 'wide': .92, 'barrel': .85 + .25 * math.sin(math.pi * min(1., y / .85))}[cut]
        width = max(.012, centre + (abs(x) - centre) * (1 + amount * ease)) if abs(x) > .008 else abs(x)
        if cut == 'ankle': y += .045 * (1 - smooth(.065, .3, y))
        v.co = native((math.copysign(width, x), y, depth + (z - depth) * (1 + .16 * ease)))


def prepare(spec):
    obj = import_mesh(f"clothing_{spec['seed']}.glb")
    obj.name = 'Garment shell'
    weights = arm_weights(spec['seed'])
    if len(weights) != len(obj.data.vertices): raise RuntimeError('Seed vertex alignment changed')
    arm = obj.data.attributes.new('fp_arm', 'FLOAT', 'POINT')
    for i, value in enumerate(weights): arm.data[i].value = value
    weld(obj)
    if spec['seed'] == 'hoodie' and not spec.get('hood'): largest_component(obj)
    if spec.get('trousers'): trouser_shape(obj, spec['trousers'])
    if spec.get('short'): short_sleeves(obj)
    if spec.get('coat'): extend_coat(obj)
    if spec.get('open'): open_front(obj, spec)
    obj.data.update()
    # Drape starts with genuine ease; cuffs and a close neckline stay fitted.
    normals = [v.normal.copy() for v in obj.data.vertices]
    for v, n in zip(obj.data.vertices, normals):
        p = gltf(v.co)
        neck = smooth(1.38, 1.49, p.y) * (1 - smooth(.08, .16, abs(p.x)))
        arm = obj.data.attributes.get('fp_arm')
        arm_weight = arm.data[v.index].value if arm else 0.
        wrist = (1 - smooth(.84, 1.02, p.y)) * smooth(.3, .8, arm_weight) if not spec.get('short') else 0.
        shoulder = smooth(1.30, 1.48, p.y)
        room = (1 - neck * .9) * (1 - wrist * .8) * (1 - shoulder * .35)
        v.co += n * spec['ease'] * room
        if spec.get('bomber'):
            # Elastic hem gathers a fuller torso into a narrower waistband.
            hem = 1 - smooth(.89, 1.03, p.y)
            if abs(p.x) < .23: v.co.x *= 1 - hem * .07
    select(obj)
    # Welded subdivisions before the solve give the cloth room to buckle.
    sub = obj.modifiers.new('Simulation resolution', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 1
    apply(obj, sub)
    for face in obj.data.polygons: face.use_smooth = True
    return obj


def collider(spec):
    body = import_mesh('base_body.glb', 'Body')
    body.name = 'Offline collision envelope'
    body_samples = [(body.matrix_world @ v.co, (body.matrix_world.to_3x3() @ v.normal).normalized()) for v in body.data.vertices]
    # Body only, capped at a few thousand triangles for an economical bake.
    dec = body.modifiers.new('Collision proxy', 'DECIMATE'); dec.ratio = .24; apply(body, dec)
    body.data.update()
    amount = .013 if spec.get('outer') else .003
    if spec.get('trousers'): amount = .004
    normals = [v.normal.copy() for v in body.data.vertices]
    for v, normal in zip(body.data.vertices, normals):
        p = gltf(v.co)
        wrist = (1 - smooth(.8, 1.0, p.y)) * smooth(.20, .25, abs(p.x))
        v.co += normal * amount * (1 - wrist * .85)
    mod = body.modifiers.new('Cloth collision', 'COLLISION')
    body.collision.thickness_outer = .004
    body.collision.thickness_inner = .001
    body.collision.cloth_friction = 5
    body.hide_render = True
    return body, body_samples


def simulate(obj, spec, frames):
    group = obj.vertex_groups.new(name='Tailoring anchors')
    for v in obj.data.vertices:
        p = gltf(v.co)
        if spec.get('trousers'):
            weight = smooth(.91, .975, p.y)
        else:
            # Support the garment at the neckline/shoulders, leaving elbows,
            # chest, placket and hem free to settle under gravity.
            weight = max(.22, smooth(1.30, 1.43, p.y))
            arm = obj.data.attributes.get('fp_arm')
            if arm and not spec.get('short'):
                wrist = (1 - smooth(.85, .95, p.y)) * smooth(.5, .9, arm.data[v.index].value)
                weight = max(weight, wrist)
        if weight > 0: group.add([v.index], weight, 'REPLACE')
    cloth = obj.modifiers.new('Offline cloth drape', 'CLOTH')
    settings = cloth.settings
    settings.quality = 6
    settings.mass = spec['mass']
    settings.tension_stiffness = 120
    settings.compression_stiffness = 100
    settings.shear_stiffness = 45
    settings.bending_stiffness = spec['bend']
    settings.air_damping = 4
    settings.vertex_group_mass = group.name
    settings.pin_stiffness = 1
    settings.tension_damping = 8; settings.compression_damping = 8; settings.shear_damping = 8
    cloth.collision_settings.use_collision = True
    cloth.collision_settings.distance_min = .004
    cloth.collision_settings.collision_quality = 3
    cloth.collision_settings.use_self_collision = False
    cloth.collision_settings.self_distance_min = .003
    cloth.collision_settings.self_friction = 5
    cloth.point_cache.frame_start = 1; cloth.point_cache.frame_end = frames
    before = [v.co.copy() for v in obj.data.vertices]
    scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = frames
    for frame in range(1, frames + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        # Force evaluation rather than merely advancing a lazy depsgraph.
        obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
        if frame % 8 == 0: print(f'  simulated frame {frame}/{frames}', flush=True)
    apply(obj, cloth)
    distances = [(v.co - initial).length for v, initial in zip(obj.data.vertices, before)]
    obj['drapeRmsMetres'] = math.sqrt(sum(d*d for d in distances) / len(distances))
    obj['drapeMaxMetres'] = max(distances)
    print(f'  drape RMS {obj["drapeRmsMetres"]:.5f} m; max {obj["drapeMaxMetres"]:.5f} m', flush=True)
    # The outgoing mesh is static. No point cache, rig or simulation is exported.
    for group in list(obj.vertex_groups): obj.vertex_groups.remove(group)


def shape_detail(obj, spec):
    sub = obj.modifiers.new('Smooth cloth', 'SUBSURF'); sub.levels = 1; apply(obj, sub)
    obj.data.update()
    for v in obj.data.vertices:
        p = gltf(v.co)
        if spec.get('puffer'):
            torso = 1 - smooth(.17, .23, abs(p.x))
            # Horizontal torso baffles and bands along each sleeve have actual
            # silhouette volume, not painted stripes or field-jacket pockets.
            sleeve_distance = (1.43 - p.y) * .97 + max(0., abs(p.x) - .20) * .23
            phase = (p.y - .92) / .105 if torso > .5 else sleeve_distance / .095
            loft = .023 * math.sin(math.pi * phase) ** 2
            v.co += v.normal * loft
        else:
            # Millimetre-scale seam compression survives the high/low normal
            # bake; the dominant resting folds come from the cloth solve.
            envelope = math.exp(-((p.y - 1.19) / .11) ** 2)
            amp = .0025 if not spec.get('trousers') else .003
            ripple = amp * math.sin(p.y * 68 + abs(p.x) * 27) * envelope
            v.co += v.normal * ripple
    obj.data.update()


def material(name, color, roughness=.8, metalness=0):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metalness
    return mat


def smart_uv(obj):
    select(obj)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.018)
    bpy.ops.object.mode_set(mode='OBJECT')


def bake_normal(high, low, size, name):
    mat = material('Fabric', (.5, .5, .5))
    low.data.materials.clear(); low.data.materials.append(mat)
    image = bpy.data.images.new(name + ' baked cloth normals', size, size, alpha=False)
    image.colorspace_settings.name = 'Non-Color'
    nodes = mat.node_tree.nodes
    target = nodes.new('ShaderNodeTexImage'); target.image = image; nodes.active = target
    scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 8
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = .012
    scene.render.bake.max_ray_distance = .028
    scene.render.bake.margin = 8
    bpy.ops.object.select_all(action='DESELECT'); high.select_set(True); low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', use_clear=True)
    image.filepath_raw = str(WORK / f'{name}-normal.png'); image.file_format = 'PNG'; image.save(); image.pack()
    normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = 1
    mat.node_tree.links.new(target.outputs['Color'], normal.inputs['Color'])
    mat.node_tree.links.new(normal.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])
    return mat


def trim_mesh(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name); mesh.from_pydata([native(v) for v in vertices], [], faces); mesh.update()
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for face in obj.data.polygons: face.use_smooth = True
    return obj


def tube(name, points, radius, mat, sides=6):
    vertices = []; faces = []
    for i, p in enumerate(points):
        p = Vector(p)
        direction = Vector(points[min(len(points) - 1, i + 1)]) - Vector(points[max(0, i - 1)])
        direction.normalize()
        right = direction.cross(Vector((0, 0, 1)))
        if right.length < .1: right = direction.cross(Vector((1, 0, 0)))
        right.normalize(); up = right.cross(direction).normalized()
        for a in range(sides):
            vertices.append(p + radius * (math.cos(a * math.tau / sides) * right + math.sin(a * math.tau / sides) * up))
        if i:
            for a in range(sides): faces.append(((i - 1) * sides + a, (i - 1) * sides + (a + 1) % sides, i * sides + (a + 1) % sides, i * sides + a))
    return trim_mesh(name, vertices, faces, mat)


def front_bvh(obj):
    return BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())


def front_point(tree, x, y, lift=.002):
    hit, normal, _, _ = tree.ray_cast(Vector((x, -.7, y)), Vector((0, 1, 0)), 1.)
    if hit is None: return Vector((x, y, .15 + lift))
    p = gltf(hit); p.z += lift
    return p


def patch(tree, name, x, y, width, height, mat, rounded=True):
    vertices = []; faces = []; rows = 8; columns = 8
    for row in range(rows + 1):
        v = row / rows
        for col in range(columns + 1):
            u = col / columns
            # Subtle curved top/body makes the pocket sit on the solved cloth.
            px = x + (u - .5) * width
            py = y + (v - .5) * height
            lift = .002 + .003 * math.sin(math.pi * u) * math.sin(math.pi * v)
            vertices.append(front_point(tree, px, py, lift))
            if row and col:
                a = (row - 1) * (columns + 1) + col - 1
                faces.append((a, a + 1, a + columns + 2, a + columns + 1))
    obj = trim_mesh(name, vertices, faces, mat)
    # One small real thickness; the pocket is not a floating box.
    solid = obj.modifiers.new('Pocket edge', 'SOLIDIFY'); solid.thickness = .001; apply(obj, solid)
    return obj


def button(tree, x, y, mat):
    p = front_point(tree, x, y, .004)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, location=native(p))
    obj = bpy.context.object; obj.name = 'Button'; obj.scale = (.0045, .0014, .0045)
    select(obj); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for face in obj.data.polygons: face.use_smooth = True
    return obj


def add_trims(obj, spec):
    detail = material('Detail fabric', (.43, .43, .43), .9)
    rib = material('Rib knit', (.36, .36, .36), .95)
    metal = material('Zipper metal', (.18, .18, .18), .45, .65)
    buttons = material('Buttons', (.2, .2, .2), .6)
    tree = front_bvh(obj); parts = [obj]
    if spec.get('pockets'):
        sides = [1] if spec['pockets'] == 1 else [-1, 1]
        for side in sides:
            parts.append(patch(tree, 'Chest pocket', side * .122, 1.265, .071, .08, detail))
            # Stitched top edge; no flannel check or stripe pattern is added.
            points = [front_point(tree, side * .122 + t * .066, 1.302, .0035) for t in [-.5, -.25, 0, .25, .5]]
            parts.append(tube('Pocket seam', points, .0006, detail))
    if spec.get('kangaroo'):
        parts.append(patch(tree, 'Kangaroo pocket', 0, 1.055, .22, .105, detail))
        for side in [-1, 1]:
            points = [front_point(tree, side * (.038 + t * .008), 1.405 - t * .12, .006) for t in [0, .25, .5, .75, 1]]
            parts.append(tube('Hood drawcord', points, .0015, detail))
    if spec.get('welt'):
        for side in [-1, 1]:
            points = [front_point(tree, side * (.14 + t * .022), (.89 if spec.get('coat') else 1.04) + t * .065, .003) for t in [-.5, -.25, 0, .25, .5]]
            parts.append(tube('Welt pocket', points, .003, detail))
    if spec.get('buttons'):
        rows = [1.2, 1.02, .84] if spec.get('coat') else [1.38, 1.285, 1.19, 1.095, 1.0]
        for y in rows:
            x = .052 + max(0., 1.3 - y) * .11 if spec.get('coat') else (.052 if spec.get('open') else .008)
            parts.append(button(tree, x, y, buttons))
    if spec.get('zipper'):
        for side in [-1, 1]:
            points = [front_point(tree, side * (.039 + max(0., 1.3 - y) * .025), y, .003) for y in [1.02 + i * .025 for i in range(16)]]
            parts.append(tube('Zipper tape', points, .0018, metal))
    if spec.get('bomber') or spec.get('puffer'):
        # A low bomber rib collar / taller insulated puffer stand collar.
        height = .045 if spec.get('bomber') else .075
        vertices = []; faces = []; steps = 36
        for row in range(5):
            v = row / 4
            for col in range(steps + 1):
                angle = .34 + (math.tau - .68) * col / steps
                r = .082 + .008 * math.sin(math.pi * v)
                vertices.append((r * math.sin(angle), 1.43 + height * v, .028 + .076 * math.cos(angle)))
                if row and col:
                    a = (row - 1) * (steps + 1) + col - 1
                    faces.append((a, a + 1, a + steps + 2, a + steps + 1))
        collar = trim_mesh('Stand collar', vertices, faces, rib if spec.get('bomber') else detail)
        solid = collar.modifiers.new('Collar thickness', 'SOLIDIFY'); solid.thickness = .004; apply(collar, solid); parts.append(collar)
    if spec.get('coat'):
        for side in [-1, 1]:
            outline = [(side * .06, 1.445), (side * .15, 1.38), (side * .12, 1.31), (side * .16, 1.275), (side * .073, 1.19)]
            vertices = [front_point(tree, x, y, .006) for x, y in outline]
            lapel = trim_mesh('Notched lapel', vertices, [(0, 1, 2), (0, 2, 4), (2, 3, 4)], detail)
            solid = lapel.modifiers.new('Lapel thickness', 'SOLIDIFY'); solid.thickness = .003; apply(lapel, solid); parts.append(lapel)
    if spec.get('rib'):
        # Garment boundaries provide accurate, conforming rib bands. Each band
        # is a separate strip, rather than the field jacket's square cuffs.
        bm = bmesh.new(); bm.from_mesh(obj.data)
        boundaries = [e for e in bm.edges if e.is_boundary]
        for edge in boundaries:
            a, b = [gltf(v.co) for v in edge.verts]
            midpoint = (a + b) * .5
            if midpoint.y > 1.42 and spec.get('hood'): continue
            if midpoint.y > 1.43 and not spec.get('crew'): continue
            if abs(midpoint.x) < .06 and midpoint.z > .06: continue
            if midpoint.y > 1.13 and not spec.get('crew'): continue
            neck = midpoint.y > 1.38
            width = .012 if neck else .025 if abs(midpoint.x) > .24 else .035
            direction = Vector((0, -1 if neck else 1, 0))
            points = [a, b, b + direction * width, a + direction * width]
            points = [p + Vector((0, 0, .0015 if p.z > 0 else -.0015)) for p in points]
            parts.append(trim_mesh('Rib band', points, [(0, 1, 2, 3)], rib))
        bm.free()
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts: part.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    # Strip authoring-only classification. Names/material roles stay readable.
    for attr in list(obj.data.attributes):
        if attr.name.startswith('fp_'): obj.data.attributes.remove(attr)
    return obj


def build(name, args):
    spec = SPECS[name]; start = time.time(); print(f'BUILD {name}', flush=True)
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bpy.context.scene.frame_set(1)
    obj = prepare(spec); body, body_samples = collider(spec)
    frames = args.frames or spec.get('frames', 32)
    if frames: simulate(obj, spec, frames)
    shape_detail(obj, spec)
    if spec.get('open'):
        # Drape can curl vertices back across the opening. Re-tailor the seam
        # against its finished silhouette before decimation, so the inner shirt
        # is seen through a continuous opening rather than torn-looking teeth.
        open_front(obj, spec)
    high = obj
    low = high.copy(); low.data = high.data.copy(); bpy.context.collection.objects.link(low); low.name = name
    select(low)
    dec = low.modifiers.new('Phone mesh budget', 'DECIMATE')
    target_triangles = 7200 if name in ['puffer', 'coat'] else 4800
    dec.ratio = min(1., target_triangles / max(1, sum(len(p.vertices) - 2 for p in low.data.polygons)))
    apply(low, dec)
    for face in low.data.polygons: face.use_smooth = True
    smart_uv(low)
    size = 512 if name in ['puffer', 'coat'] else 256
    if args.draft:
        low.data.materials.clear(); low.data.materials.append(material('Fabric', (.5, .5, .5)))
    else:
        bake_normal(high, low, size, name)
    bpy.data.objects.remove(high, do_unlink=True)
    bpy.data.objects.remove(body, do_unlink=True)
    add_trims(low, spec)
    tree = front_bvh(low)
    covered = bytearray((len(body_samples) + 7) // 8)
    for i, (point, normal) in enumerate(body_samples):
        hit, _, _, distance = tree.ray_cast(point - normal * .001, normal, .16)
        if hit is not None and (hit - point).dot(normal) >= -.002:
            covered[i // 8] |= 1 << (i % 8)
    body_coverage = base64.b64encode(covered).decode('ascii')
    select(low)
    low['garmentFamily'] = name
    low['offlineClothFrames'] = frames
    low['fittingPreview'] = 'Illustrative garment-specific construction, not measured personal sizing'
    for face in low.data.polygons: face.use_smooth = True
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / f'{name}.blend'), compress=True)
    target = OUT / f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
        export_apply=True, export_animations=False, export_skins=False, export_morph=False,
        export_yup=True, export_texcoords=True, export_normals=True, export_tangents=True,
        export_attributes=False, export_extras=True, export_cameras=False, export_lights=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12)
    points = [gltf(low.matrix_world @ v.co) for v in low.data.vertices]
    record = dict(file=f'garments/{name}.glb', family=name, bytes=target.stat().st_size,
        sha256=hashlib.sha256(target.read_bytes()).hexdigest(), vertices=len(low.data.vertices),
        triangles=sum(len(p.vertices) - 2 for p in low.data.polygons), drapeRmsMetres=low.get('drapeRmsMetres', 0), drapeMaxMetres=low.get('drapeMaxMetres', 0), normalMapSize=size if not args.draft else 0,
        clothFrames=frames, bodyVertexCount=len(body_samples), bodyCoverage=body_coverage, source=f'clothing_{spec["seed"]}.glb', license='CC0-1.0',
        bounds=dict(min=[min(p[i] for p in points) for i in range(3)], max=[max(p[i] for p in points) for i in range(3)]),
        construction=[key for key, value in spec.items() if value is True or key in ['pockets', 'trousers']])
    (WORK / f'{name}.json').write_text(json.dumps(record, indent=2) + '\n')
    print(f'FINISHED {name}: {record["bytes"]} bytes; {record["triangles"]} triangles; {round(time.time() - start, 1)} seconds', flush=True)
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='+', choices=list(SPECS))
    parser.add_argument('--frames', type=int)
    parser.add_argument('--draft', action='store_true', help='Skip normal bake for geometry review only')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    manifest_file = OUT / 'catalogue.json'
    records = {a['family']: a for a in json.loads(manifest_file.read_text()).get('assets', [])} if manifest_file.exists() else {}
    for name in args.only or SPECS:
        records[name] = build(name, args)
        manifest = dict(generator='Blender 4.5 LTS / Fit Picker authored tailoring and cloth bake',
            sourceCommit='852e48f316b90a0937234886630e4fb4cdfd1f78', license='CC0-1.0',
            runtimeSimulation=False, assets=[records[k] for k in SPECS if k in records])
        manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')
        (ROOT / 'src/data/garment-model-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__': main()
