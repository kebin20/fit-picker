"""Fit Picker v2: CC0 Blender Studio form and refitted MakeHuman-derived clothes.
Offline only; --pilot renders the first outfit, --all exports every construction.
"""
import bpy,bmesh,math,json,hashlib,sys,argparse
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'.cache/tailored-avatar'; OUT=ROOT/'public/models/tailored'
SOURCE=ROOT/'.cache/human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend'
WORK.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def vec(x,h,z):return Vector((x,-z,h))
def xyz(p):return (p.x,p.z,-p.y)
def active(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o

def apply(o,m):active(o);bpy.ops.object.modifier_apply(modifier=m.name)
def material(name,color,rough=.8):
 m=bpy.data.materials.new(name);m.use_nodes=True
 s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=rough
 return m
FABRIC=material('Fabric',(.24,.24,.24),.86)
DETAIL=material('Detail fabric',(.22,.22,.22),.82)
BUTTON=material('Buttons',(.055,.055,.055),.63)
FORM=material('Porcelain display form',(.64,.62,.57),.52)

def mesh(name,points,faces,mat=FABRIC):
 d=bpy.data.meshes.new(name);d.from_pydata([vec(*p) for p in points],[],faces);d.update()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(mat)
 for f in d.polygons:f.use_smooth=True
 return o

def join(parts,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=name;return parts[0]

def uv(o):
 active(o);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.012);bpy.ops.object.mode_set(mode='OBJECT')

def export(o,name):
 active(o);uv(o)
 file=OUT/f'{name}.glb'
 bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_skins=False,export_morph=False,export_yup=True,export_texcoords=True,export_normals=True,export_tangents=True,export_cameras=False,export_lights=False,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_draco_normal_quantization=10,export_draco_texcoord_quantization=12)
 p=[xyz(o.matrix_world@v.co) for v in o.data.vertices]
 return dict(file=f'tailored/{name}.glb',family=name,bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),triangles=sum(len(f.vertices)-2 for f in o.data.polygons),vertices=len(o.data.vertices),bounds=dict(min=[min(v[i] for v in p) for i in range(3)],max=[max(v[i] for v in p) for i in range(3)]))

def body():
 with bpy.data.libraries.load(str(SOURCE),link=False) as (src,dst):dst.objects=['GEO-body_male_realistic']
 o=dst.objects[0];bpy.context.collection.objects.link(o);o.name='Studio display form';o.location=(0,0,0)
 for m in list(o.modifiers):o.modifiers.remove(m)
 # Evaluate the source before authoring the pose. No source modifier stack or
 # shape-key animation is exported into the standing display form.
 bpy.context.view_layer.update()
 o.data=bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()),depsgraph=bpy.context.evaluated_depsgraph_get())
 for v in o.data.vertices:
  x,y,z=v.co;side=1 if x>0 else -1
  arm=smooth(.19,.265,abs(x))*(1-smooth(1.36,1.44,z))*smooth(.55,.72,z)
  angle=.25*arm;dx=abs(x)-.185;dz=z-1.34
  if arm>0:x=side*(.185+math.cos(angle)*dx+math.sin(angle)*dz);z=1.34-math.sin(angle)*dx+math.cos(angle)*dz
  if arm<.05 and z<.90:x-=side*.085*(1-smooth(.65,.90,z))
  v.co=(x*1.065,y*1.065,(z+.006)*1.065)
 # The display form has neutral sculpted features, no skin photo or hair.
 o.data.materials.clear();o.data.materials.append(FORM)
 sub=o.modifiers.new('Sculpted display form','SUBSURF');sub.levels=1;apply(o,sub)
 dec=o.modifiers.new('Mobile retopology','DECIMATE');dec.ratio=.42;apply(o,dec)
 for f in o.data.polygons:f.use_smooth=True
 parts=[o]
 for side in [-1,1]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=vec(side*.032,1.680,.145))
  eye=bpy.context.object;eye.name='Neutral sculpted eye';eye.scale=(.012,.009,.010);active(eye);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);eye.data.materials.append(FORM)
  for f in eye.data.polygons:f.use_smooth=True
  parts.append(eye)
 return join(parts,'Studio display form')

def tube(name,points,radius,mat=DETAIL,n=8):
 pts=[];faces=[];p=[Vector(t) for t in points]
 for i,c in enumerate(p):
  tangent=(p[min(i+1,len(p)-1)]-p[max(0,i-1)]).normalized();right=tangent.cross(Vector((0,0,1)))
  if right.length<.01:right=tangent.cross(Vector((1,0,0)))
  right.normalize();up=right.cross(tangent).normalized()
  for j in range(n):pts.append(c+radius*(math.cos(TAU*j/n)*right+math.sin(TAU*j/n)*up))
  if i:
   for j in range(n):faces.append(((i-1)*n+j,(i-1)*n+(j+1)%n,i*n+(j+1)%n,i*n+j))
 return mesh(name,pts,faces,mat)

def clip(o,functions):
 # Exact half-space intersections preserve continuous sleeve/front edges.
 o.data.calc_loop_triangles();pts=[];faces=[]
 for tri in o.data.loop_triangles:
  poly=[Vector(xyz(o.data.vertices[i].co)) for i in tri.vertices]
  for distance in functions:
   result=[]
   for a,b in zip(poly,poly[1:]+poly[:1]):
    da,db=distance(a),distance(b)
    if da>=-1e-9:result.append(a)
    if da*db<0:result.append(a.lerp(b,da/(da-db)))
   poly=result
   if not poly:break
  for i in range(1,len(poly)-1):
   if (poly[i]-poly[0]).cross(poly[i+1]-poly[0]).length<1e-9:continue
   start=len(pts);pts.extend([poly[0],poly[i],poly[i+1]]);faces.append((start,start+1,start+2))
 d=bpy.data.meshes.new(o.name+' tailored');d.from_pydata([vec(*p) for p in pts],[],faces);d.update();d.materials.append(FABRIC);o.data=d
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00005);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 for f in d.polygons:f.use_smooth=True


def front(o,x,h,lift=.002):
 tree=BVHTree.FromObject(o,bpy.context.evaluated_depsgraph_get());hit,_,_,_=tree.ray_cast(vec(x,h,.5),Vector((0,1,0)),1.)
 return Vector((x,h,-hit.y+lift if hit else .135))

def patch(o,x,h,width,height,name='Chest patch pocket'):
 pts=[];faces=[];n=6
 for r in range(n+1):
  for c in range(n+1):
   u=c/n;v=r/n;p=front(o,x+(u-.5)*width,h+(v-.5)*height,.0015+.0018*math.sin(u*math.pi)*math.sin(v*math.pi));pts.append(p)
   if c and r:
    a=(r-1)*(n+1)+c-1;faces.append((a,a+1,a+n+2,a+n+1))
 return mesh(name,pts,faces,DETAIL)

FAMILIES=('tee', 'longsleeve', 'sweatshirt', 'hoodie', 'shirt-short', 'shirt-long', 'overshirt-short', 'overshirt-long', 'bomber', 'puffer', 'rain-jacket', 'coat')

def fitted_seed(name):
 import importlib.util
 spec=importlib.util.spec_from_file_location('fit_seed',ROOT/'scripts/garments/build_models.py');helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
 trousers_kind=name.startswith('trousers');shoe=name=='sneakers'
 seed='shorts' if name=='trousers-shorts' else 'jeans' if trousers_kind else 'shoes' if shoe else 'trenchcoat' if name=='coat' else 'shirt' if 'shirt' in name else 'tshirt' if name=='tee' else 'hoodie'
 o=helper.import_mesh(f'clothing_{seed}.glb');o.name=name
 weights=helper.arm_weights(seed)
 if len(weights)!=len(o.data.vertices):raise RuntimeError(f'Seed vertex alignment changed: {seed}')
 arm_attr=o.data.attributes.new('fp_arm','FLOAT','POINT')
 for i,weight in enumerate(weights):arm_attr.data[i].value=weight
 helper.weld(o)
 if seed=='hoodie' and name not in ['hoodie','rain-jacket']:helper.largest_component(o)
 arm_attr=o.data.attributes.get('fp_arm')
 for v in o.data.vertices:
  x,h,z=xyz(v.co);side=1 if x>0 else -1
  arm=arm_attr.data[v.index].value if not trousers_kind and not shoe else 0
  x*=1.04;h*=1.04;z*=1.04
  if trousers_kind:
   x-=side*.05*(1-smooth(.70,1.02,h))
   centre=side*.10;amount={'slim':1.05,'regular':1.20,'wide':1.48,'barrel':1.58,'ankle':1.10,'shorts':1.20}[name.split('-')[-1]]
   x=centre+(x-centre)*(1+(amount-1)*(1-smooth(.78,1.01,h)))
   if name.endswith('ankle') and h<.35:h+=.055*(1-smooth(.10,.35,h))
   z+=.009
  elif shoe:x-=side*.073;h=max(.008,h*.75);z+=.005
  else:
   x-=side*.025*arm;h+=.025*arm-.025*smooth(1.40,1.58,h)
   ease=.013 if name.startswith('overshirt') else .021 if name in ['puffer','coat','rain-jacket','bomber'] else .003
   x+=side*ease*(1-arm)*smooth(.05,.16,abs(x));z+=math.copysign(ease+.008*(1-arm),z)
   if name=='coat' and h<1.04 and arm<.5:h=.55+max(0,h-.08)*(.49/.96)
   if name=='puffer':z+=math.copysign(.009*math.sin((h-.95)*math.pi/.105)**2,z)
  v.co=vec(x,h,z)
 o.data.materials.clear();o.data.materials.append(FABRIC)
 for f in o.data.polygons:f.material_index=0
 if name in ['shirt-short','overshirt-short']:
  clip(o,[lambda p:max(.225-abs(p.x),p.y-1.24)])
 if name.startswith('overshirt') or name in ['bomber','puffer','rain-jacket']:
  clip(o,[lambda p:max(abs(p.x)-(.047+.025*max(0,1.30-p.y)),.035-p.z)])
 sub=o.modifiers.new('Fitted cloth surface','SUBSURF');sub.levels=1;apply(o,sub)
 dec=o.modifiers.new('Phone garment budget','DECIMATE');dec.ratio=min(1,8500/max(1,sum(len(f.vertices)-2 for f in o.data.polygons)));apply(o,dec)
 for f in o.data.polygons:f.use_smooth=True
 trims=[o]
 if name in ['shirt-short','shirt-long','overshirt-short','overshirt-long']:
  trims.append(patch(o,.10,1.33,.067,.078))
  for h in [1.445,1.355,1.265,1.175,1.085]:
   p=front(o,.056 if name.startswith('overshirt') else .006,h,.002)
   bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,location=vec(*p));button=bpy.context.object;button.name='Button';button.scale=(.003,.001,.003);active(button);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);button.data.materials.append(BUTTON);trims.append(button)
 if name in ['bomber','puffer']:
  pts=[(.078*math.sin(TAU*i/40),1.535,.014+.077*math.cos(TAU*i/40)) for i in range(41)];trims.append(tube('Rib collar',pts,.009))
 return join(trims,name)

def stage():
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
 scene.render.resolution_x=700;scene.render.resolution_y=1050;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.75,.75,.75,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
 scene.view_settings.view_transform='AgX'
 bpy.ops.object.camera_add(location=(0,-4.8,1.0));cam=bpy.context.object;cam.name='Catalogue camera';cam.rotation_euler=(Vector((0,0,.91))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.99;scene.camera=cam
 for name,pos,power,size in [('Key',(-2,-3,4),350,3),('Fill',(2,-1,2.8),180,2.5),('Rim',(1,2,3),240,2)]:
  bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
 return cam

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--all',action='store_true');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 form=body();objects={'body':form};records=[export(form,'body')]
 families=list(FAMILIES)+['trousers-'+c for c in ['slim','regular','wide','barrel','ankle']]+['trousers-shorts','sneakers'] if args.all else ['shirt-short','overshirt-long','trousers-slim','sneakers']
 for name in families:
  print('BUILD NEW',name,flush=True);o=fitted_seed(name);objects[name]=o;records.append(export(o,name))
 for name,o in objects.items():o.hide_render=name not in ['body','shirt-short','overshirt-long','trousers-slim','sneakers']
 # The body hidden beneath clothes is culled in the same way as the web view.
 # This avoids skin/cloth intersections and preserves only head, neck and hands.
 bm=bmesh.new();bm.from_mesh(form.data)
 hidden=[f for f in bm.faces if all(not(v.co.z>1.56 or (v.co.z>1.505 and abs(v.co.x)<.07) or (abs(v.co.x)>.22 and v.co.z<.94)) for v in f.verts)]
 bmesh.ops.delete(bm,geom=hidden,context='FACES');bm.to_mesh(form.data);bm.free()
 palette={'shirt-short':(.016,.028,.046),'overshirt-long':(.16,.092,.057),'trousers-slim':(.20,.215,.20),'sneakers':(.012,.014,.014)}
 for name,color in palette.items():
  if name not in objects:continue
  o=objects[name]
  for slot in o.material_slots:
   m=slot.material.copy();slot.material=m
   m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
 cam=stage();bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'catalogue.blend'),compress=True)
 for side,location in [('front',(0,-4.8,1.0)),('back',(0,4.8,1.0)),('side',(4.8,0,1.0))]:
  cam.location=location;cam.rotation_euler=(Vector((0,0,.91))-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.render.filepath=str(WORK/f'pilot-{side}.png');bpy.ops.render.render(write_still=True)
 (OUT/'manifest.json').write_text(json.dumps(dict(version=2,source='Blender Studio Human Base Meshes 1.4.1',license='CC0-1.0',assets=records),indent=2)+'\n')
 print('NEW LIBRARY COMPLETE',flush=True)
if __name__=='__main__':main()
