import bpy
import mathutils
import math
import os

def create_pbr(mat_name, color, metallic=0.0, roughness=0.5, transmission=0.0, ior=1.45, clearcoat=0.0):
    mat = bpy.data.materials.get(mat_name)
    if not mat:
        mat = bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = transmission
    elif 'Transmission' in bsdf.inputs:
        bsdf.inputs['Transmission'].default_value = transmission
    if 'IOR' in bsdf.inputs:
        bsdf.inputs['IOR'].default_value = ior
    return mat

def separate_object_by_material(obj_name, name_map):
    obj = bpy.data.objects.get(obj_name)
    if not obj:
        print(f"[WARN] Object {obj_name} not found for separation")
        return
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='MATERIAL')
    bpy.ops.object.mode_set(mode='OBJECT')
    
    for o in list(bpy.data.objects):
        if obj_name in o.name:
            mat_name = o.data.materials[0].name if o.data.materials else ''
            if mat_name in name_map:
                new_name = name_map[mat_name]
                print(f"[SEP] Renamed {o.name} ({mat_name}) -> {new_name}")
                o.name = new_name

def apply_vibrant_setup():
    print("[1/3] Loading Leica M11 CAD base...")
    bpy.ops.wm.open_mainfile(filepath='/workspace/camera-lens-3d/LeicaM11_004.blend')
    
    # 0. Strip ALL CAD ID vertex colors (the cause of false blue/orange tint!)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            while o.data.color_attributes:
                o.data.color_attributes.remove(o.data.color_attributes[0])
    print("[SUCCESS] Cleared all CAD ID vertex colors from all meshes.")

    # 0b. Separate multi-material meshes into independent cleanly-addressable objects
    separate_object_by_material('Shutter Speed Dial', {
        'Dials': 'Shutter Speed Dial',
        'White': 'Shutter Speed Dial White',
        'Red': 'Shutter Speed Dial Red'
    })
    separate_object_by_material('ISO Dial', {
        'Dials': 'ISO Dial',
        'White': 'ISO Dial White',
        'Red': 'ISO Dial Red'
    })
    separate_object_by_material('Body Top', {
        'Top': 'Body Top',
        'White': 'Body Top Markings White'
    })
    separate_object_by_material('Main Switch', {
        'White': 'Main Switch White',
        'Shoe': 'Main Switch'
    })
    
    # --- PBR MATERIAL SUITE ---
    # 1. Iconic Leica Red Badge
    mat_badge_red = create_pbr("Vibrant_Leica_Red", (0.88, 0.005, 0.010, 1.0), metallic=0.05, roughness=0.18, clearcoat=0.9)
    mat_badge_script = create_pbr("Vibrant_Leica_White_Script", (0.98, 0.98, 0.98, 1.0), metallic=0.1, roughness=0.12)
    
    # 2. Sleek Anodized Black Aluminum (Body Top & Bottom) - Fine German satin matte black
    mat_anodized = create_pbr("Vibrant_Anodized_Black", (0.055, 0.055, 0.058, 1.0), metallic=0.75, roughness=0.34)
    
    # 3. Rich Textured Leatherette (Body Middle) - Deep jet black
    mat_leather = create_pbr("Vibrant_Leatherette", (0.015, 0.015, 0.016, 1.0), metallic=0.02, roughness=0.65)
    
    # 4. Mirror Stainless Steel / Chrome Bayonet & Screws
    mat_chrome = create_pbr("Vibrant_Chrome", (0.96, 0.97, 0.99, 1.0), metallic=0.99, roughness=0.05)
    
    # 5. Knurled Mechanical Dials & Wheels (Gunmetal alloy)
    mat_dials = create_pbr("Vibrant_Dial_Metal", (0.050, 0.052, 0.055, 1.0), metallic=0.88, roughness=0.25)
    
    # 5b. Crisp Engraved White Numbers & Markings (Luminous Enamel Inlay)
    mat_dial_white = create_pbr("Vibrant_Dial_White", (1.0, 1.0, 1.0, 1.0), metallic=0.05, roughness=0.12)
    
    # 5c. Crisp Red 'A' Alignment Mark on Dials
    mat_dial_red = create_pbr("Vibrant_Dial_Red", (0.88, 0.005, 0.010, 1.0), metallic=0.08, roughness=0.18)
    
    # 6. Deep Optical Sapphire Viewfinder & Rangefinder (Anti-reflective cyan-blue sheen)
    mat_glass = create_pbr("Vibrant_ViewFinder_Glass", (0.02, 0.12, 0.28, 0.25), metallic=0.08, roughness=0.02, transmission=0.95, ior=1.54)
    mat_glass.blend_method = 'BLEND'
    
    # 7. Lens Cap Script (Embossed gleaming silver script)
    mat_lens_font = create_pbr("Vibrant_Lens_Font", (0.96, 0.97, 0.98, 1.0), metallic=0.98, roughness=0.08)
    
    # 8. Ultra-Glossy LCD Display
    mat_lcd = create_pbr("Vibrant_LCD_Glass", (0.008, 0.010, 0.012, 1.0), metallic=0.15, roughness=0.03, clearcoat=1.0)
    
    # 9. Gold Battery Contacts
    mat_gold = create_pbr("Vibrant_Gold", (1.0, 0.82, 0.18, 1.0), metallic=1.0, roughness=0.15)
    
    # Assign materials across all components
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        n = o.name.lower()
        
        if o.name == "Badge":
            o.data.materials.clear()
            o.data.materials.append(mat_badge_red)    # slot 0
            o.data.materials.append(mat_badge_script) # slot 1
            for p in o.data.polygons:
                if p.center.y < -0.1145:
                    p.material_index = 1
                else:
                    p.material_index = 0
            continue
            
        if o.name == "Lens Cap Font":
            o.data.materials.clear()
            o.data.materials.append(mat_lens_font)
            continue
            
        if o.name == "Lens Cap":
            o.data.materials.clear()
            o.data.materials.append(mat_anodized) # slot 0: cap body
            o.data.materials.append(mat_chrome)   # slot 1: knurled rim
            cx, cz = 0.0519, 0.2308
            for p in o.data.polygons:
                r = math.hypot(p.center.x - cx, p.center.z - cz)
                if r > 0.168:
                    p.material_index = 1
                else:
                    p.material_index = 0
            continue

        o.data.materials.clear()
        
        # Engraved dial text and white markings
        if "white" in n:
            o.data.materials.append(mat_dial_white)
        elif "red" in n and "badge" not in n:
            o.data.materials.append(mat_dial_red)
        elif "body top" in n or "body bottom" in n:
            o.data.materials.append(mat_anodized)
        elif "middle" in n:
            o.data.materials.append(mat_leather)
        elif "bayonet" in n or "strap" in n or "lever" in n:
            o.data.materials.append(mat_chrome)
        elif "release button" in n or "main switch.001" in n:
            o.data.materials.append(mat_chrome)
        elif "dial" in n or "switch" in n or "wheel" in n or "button" in n:
            o.data.materials.append(mat_dials)
        elif "glass" in n or "finder" in n or "sensor" in n:
            o.data.materials.append(mat_glass)
        elif "lcd" in n or "screen" in n:
            o.data.materials.append(mat_lcd)
        elif "shoe" in n:
            o.data.materials.append(mat_chrome)
        elif "battery" in n:
            o.data.materials.append(mat_anodized)
        else:
            o.data.materials.append(mat_anodized)

    print("[2/3] Exporting leica_m11_master.glb with crisp dial markings...")
    glb_out = '/workspace/camera-lens-3d/assets/leica_m11_master.glb'
    bpy.ops.export_scene.gltf(
        filepath=glb_out,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_materials='EXPORT',
        export_colors=False
    )
    print(f"[SUCCESS] Exported GLB to: {glb_out}")

if __name__ == '__main__':
    apply_vibrant_setup()
