import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/workspace/camera-lens-3d/assets/leica_m11_master.glb')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.render.resolution_x = 1440
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100

# Studio Dark Neutral Background
world = bpy.data.worlds.new("StudioWorld")
world.use_nodes = True
scene.world = world
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.04, 0.042, 0.048, 1.0)
bg.inputs['Strength'].default_value = 0.5

center = mathutils.Vector((-0.0109, -0.0095, 0.2770))

# Target
target = bpy.data.objects.new("Target", None)
bpy.context.collection.objects.link(target)
target.location = center

# Camera - Luxury 3/4 Studio angle showing full camera with elegant margins
cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 65
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
cam.location = (-0.95, -2.40, 0.65)

c = cam.constraints.new('TRACK_TO')
c.target = target
c.track_axis = 'TRACK_NEGATIVE_Z'
c.up_axis = 'UP_Y'

# Studio Softbox Lighting
# 1. Main Key Softbox (Top-Right Front)
l1 = bpy.data.lights.new("KeySoftbox", 'AREA')
l1.energy = 160.0
l1.size = 1.6
l1.color = (1.0, 0.99, 0.98)
ol1 = bpy.data.objects.new("KeySoftbox", l1)
bpy.context.collection.objects.link(ol1)
ol1.location = (1.5, -1.8, 1.8)
c1 = ol1.constraints.new('TRACK_TO')
c1.target = target
c1.track_axis = 'TRACK_NEGATIVE_Z'
c1.up_axis = 'UP_Y'

# 2. Left Fill Softbox (Subtle contour definition)
l2 = bpy.data.lights.new("FillSoftbox", 'AREA')
l2.energy = 70.0
l2.size = 2.0
l2.color = (0.95, 0.97, 1.0)
ol2 = bpy.data.objects.new("FillSoftbox", l2)
bpy.context.collection.objects.link(ol2)
ol2.location = (-2.0, -1.5, 0.9)
c2 = ol2.constraints.new('TRACK_TO')
c2.target = target
c2.track_axis = 'TRACK_NEGATIVE_Z'
c2.up_axis = 'UP_Y'

# 3. Top Rim / Bevel Accent (Crisp edge specular on top dials and body)
l3 = bpy.data.lights.new("TopRim", 'AREA')
l3.energy = 110.0
l3.size = 1.2
l3.color = (0.98, 0.99, 1.0)
ol3 = bpy.data.objects.new("TopRim", l3)
bpy.context.collection.objects.link(ol3)
ol3.location = (-0.2, 1.4, 2.0)
c3 = ol3.constraints.new('TRACK_TO')
c3.target = target
c3.track_axis = 'TRACK_NEGATIVE_Z'
c3.up_axis = 'UP_Y'

out_path = '/workspace/camera-lens-3d/assets/leica_beauty_preview.png'
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print('[DONE] Rendered beauty shot to:', out_path)
