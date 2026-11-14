"""Precompute inner-garment visibility from the actual compressed outer models.

Rays describe coverage around the torso, independent of a poking inner vertex's
radius. Deliberate open fronts, collars, cuffs and short sleeves remain visible.
Only small bitsets are shipped; no runtime raycasting or live cloth solver.
"""
import base64
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
models = json.loads((ROOT / '.cache/garment-build/layer-meshes.json').read_text())
inners = ['tee', 'longsleeve', 'sweatshirt', 'hoodie', 'shirt-short', 'shirt-long']
outers = ['overshirt-short', 'overshirt-long', 'bomber', 'puffer', 'rain-jacket', 'coat']
trees = {}
for family in outers:
    positions = []; triangles = []
    for mesh in models[family]['primitives']:
        offset = len(positions)
        positions.extend(Vector(mesh['positions'][i:i + 3]) for i in range(0, len(mesh['positions']), 3))
        triangles.extend(tuple(offset + j for j in mesh['indices'][i:i + 3]) for i in range(0, len(mesh['indices']), 3))
    trees[family] = BVHTree.FromPolygons(positions, triangles, all_triangles=True)

coverage = {}
for inner in inners:
    coverage[inner] = {}
    for outer in outers:
        masks = []
        for mesh in models[inner]['primitives']:
            coords = mesh['positions']; count = len(coords) // 3
            bits = bytearray((count + 7) // 8)
            for index in range(count):
                x, y, z = coords[index * 3:index * 3 + 3]
                # A collar/hood above the coat and a small shirt cuff may show.
                if y < .855 or (y > 1.425 and abs(x) < .09) or (inner == 'hoodie' and y > 1.49): continue
                arm = abs(x) > .205 and y < 1.30
                if arm:
                    covered = not (outer == 'overshirt-short' and y < 1.245)
                else:
                    direction = Vector((x, 0, z - .02))
                    if direction.length < .001: continue
                    direction.normalize()
                    hit, _, _, _ = trees[outer].ray_cast(Vector((0, y, .02)), direction, .65)
                    covered = hit is not None
                if covered: bits[index // 8] |= 1 << (index % 8)
            masks.append(base64.b64encode(bits).decode('ascii'))
        coverage[inner][outer] = masks
    print(f'LAYER VISIBILITY {inner}: {len(outers)} outer constructions', flush=True)
result = dict(sourceAssets={key: value['sha256'] for key, value in models.items()}, coverage=coverage,
    method='Offline torso-angle coverage of decoded final glTF meshes; collars, cuffs and short sleeves retained')
(ROOT / 'src/data/garment-layer-coverage.json').write_text(json.dumps(result, indent=2) + '\n')
