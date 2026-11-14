"""Bake body coverage against the final compressed meshes, with pose validation.

Imported CC0 body vertex ordering is checked against its actual glTF accessors.
Legacy anatomical zones exclude hands/face; ray tests refine cuffs and hems to
match each new garment. The app only reads compact bitsets, never ray casts.
"""
import base64
import hashlib
import importlib.util
import json
import struct
from pathlib import Path

import bpy
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('garment_builder', ROOT / 'scripts/garments/build_models.py')
builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)

raw = (ROOT / 'public/models/base_body.glb').read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + length]); binary = raw[28 + length:]
primitive = doc['meshes'][0]['primitives'][0]
def accessor(name):
    record = doc['accessors'][primitive['attributes'][name]]
    view = doc['bufferViews'][record['bufferView']]
    fmt, size = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}[record['componentType']]
    count = {'SCALAR': 1, 'VEC3': 3}[record['type']]
    stride = view.get('byteStride', count * size)
    start = view.get('byteOffset', 0) + record.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * count, binary, start + i * stride) for i in range(record['count'])]
positions = accessor('POSITION')
zone_name = next(name for name in primitive['attributes'] if name.lstrip('_').lower() == 'cczone')
zones = [z[0] for z in accessor(zone_name)]
position_hash = hashlib.sha256(b''.join(struct.pack('<3f', *p) for p in positions)).hexdigest()

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
body = builder.import_mesh('base_body.glb', 'Body')
if len(body.data.vertices) != len(positions): raise RuntimeError('Body vertex ordering changed')
error = max((builder.gltf(body.matrix_world @ v.co) - builder.Vector(expected)).length for v, expected in zip(body.data.vertices, positions))
if error > 1e-6: raise RuntimeError(f'Body coordinates do not match the app: {error}')
samples = [(body.matrix_world @ v.co, (body.matrix_world.to_3x3() @ v.normal).normalized()) for v in body.data.vertices]
bpy.data.objects.remove(body, do_unlink=True)

catalogue_file = ROOT / 'public/models/garments/catalogue.json'
catalogue = json.loads(catalogue_file.read_text())
for asset in catalogue['assets']:
    family = asset['family']
    allowed = (2 | 4) if family.startswith('trousers') else (256 | 4) if family == 'shorts' else 16 if family == 'coat' else 4096 if family in ['bomber', 'puffer'] else 1024 if family in ['hoodie', 'rain-jacket'] else 8 if family in ['tee', 'shirt-short', 'overshirt-short'] else 512
    obj = builder.import_mesh(asset['file'])
    tree = BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())
    covered = bytearray((len(samples) + 7) // 8)
    for i, ((point, normal), zone) in enumerate(zip(samples, zones)):
        if not int(zone) & allowed or point.z < asset['bounds']['min'][1] - .008: continue
        hit, _, _, _ = tree.ray_cast(point - normal * .001, normal, .16)
        if hit is not None and (hit - point).dot(normal) >= -.002: covered[i // 8] |= 1 << (i % 8)
    asset['bodyCoverage'] = base64.b64encode(covered).decode('ascii')
    asset['bodyVertexCount'] = len(samples)
    asset['coveredBodyVertices'] = sum(byte.bit_count() for byte in covered)
    bpy.data.objects.remove(obj, do_unlink=True)
    print(f'COVERAGE {family}: {asset["coveredBodyVertices"]}/{len(samples)} body vertices', flush=True)
catalogue['bodyPositionSha256'] = position_hash
catalogue['bodyPositionErrorMetres'] = error
catalogue_file.write_text(json.dumps(catalogue, indent=2) + '\n')
(ROOT / 'src/data/garment-model-manifest.json').write_text(json.dumps(catalogue, indent=2) + '\n')
print('Body coordinates and vertex order match the app; anatomical boundaries preserved.', flush=True)
