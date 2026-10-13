import os
import math
from PIL import Image, ImageDraw, ImageFont

# Ensure QA output folder
out_dir = '/workspace/camera-lens-3d/assets/qa_slides'
os.makedirs(out_dir, exist_ok=True)

# Load base 3D beauty renders (transparent cutouts)
black_img_path = '/workspace/camera-lens-3d/assets/leica_cutout_black.png'
silver_img_path = '/workspace/camera-lens-3d/assets/leica_cutout_silver.png'

# Fallback if cutouts not yet generated
if not os.path.exists(black_img_path):
    black_img_path = '/workspace/camera-lens-3d/assets/leica_beauty_preview.png'
if not os.path.exists(silver_img_path):
    silver_img_path = '/workspace/camera-lens-3d/assets/leica_silver_preview.png'

black_render = Image.open(black_img_path).convert('RGBA') if os.path.exists(black_img_path) else None
silver_render = Image.open(silver_img_path).convert('RGBA') if os.path.exists(silver_img_path) else None

# Fonts setup
def get_font(family, size):
    try:
        if family == 'sans-bold':
            return ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', size)
        elif family == 'sans':
            return ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', size)
        elif family == 'mono':
            return ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf', size)
        elif family == 'mono-bold':
            return ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf', size)
    except:
        return ImageFont.load_default()

font_title_lg = get_font('sans-bold', 64)
font_title_med = get_font('sans-bold', 48)
font_title_light = get_font('sans', 48)
font_body = get_font('sans', 20)
font_mono_badge = get_font('mono-bold', 15)
font_mono_sub = get_font('mono', 16)
font_mono_small = get_font('mono', 13)
font_stat_num = get_font('sans', 52)

font_watermark = get_font('sans-bold', 200)

# Colors
C_CANVAS_LIGHT = (253, 253, 253, 255)
C_CANVAS_DARK = (12, 13, 15, 255)
C_INK_PRIMARY = (24, 27, 30, 255)
C_INK_SECONDARY = (24, 27, 30, 160)
C_INK_LIGHT = (243, 244, 246, 255)
C_INK_LIGHT_SEC = (243, 244, 246, 160)
C_HAIRLINE_LIGHT = (24, 27, 30, 28)
C_HAIRLINE_DARK = (243, 244, 246, 28)
C_LEICA_RED = (224, 6, 19, 255)
C_WATERMARK_LIGHT = (24, 27, 30, 14)
C_WATERMARK_DARK = (243, 244, 246, 12)

W, H = 1920, 1080

def draw_grid(draw, dark=False):
    line_col = C_HAIRLINE_DARK if dark else C_HAIRLINE_LIGHT
    # 12 columns
    margin = 80
    col_w = (W - 2 * margin) / 12
    for i in range(13):
        x = int(margin + i * col_w)
        draw.line([(x, 0), (x, H)], fill=line_col, width=1)

def draw_watermark(base_img, dark=False):
    txt_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt_layer)
    text = "LEICA M11"
    bbox = d.textbbox((0, 0), text, font=font_watermark)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    col = (255, 255, 255, 12) if dark else (0, 0, 0, 14)
    d.text(((W - tw) // 2, (H - th) // 2 - 40), text, font=font_watermark, fill=col)
    return Image.alpha_composite(base_img, txt_layer)

# ==============================================================================
# SLIDE 1: Hero Overview (Phase 1)
# ==============================================================================
s1 = Image.new('RGBA', (W, H), C_CANVAS_LIGHT)
d1 = ImageDraw.Draw(s1)
draw_grid(d1, dark=False)
s1 = draw_watermark(s1, dark=False)
d1 = ImageDraw.Draw(s1)

# Paste camera centered (Front-High 25° Oblique view)
if black_render:
    cam_scaled = black_render.resize((1200, 750), Image.Resampling.LANCZOS)
    s1.paste(cam_scaled, (480, 140), cam_scaled)

# Bottom-left typography
# Heading
d1.text((80, H - 340), "Leica M11", font=font_title_light, fill=C_INK_PRIMARY)
d1.text((80, H - 285), "Pure Photography.", font=font_title_lg, fill=C_INK_PRIMARY)

# Origin meta stamp
d1.ellipse([80, H - 205, 90, H - 195], fill=C_LEICA_RED)
d1.text((100, H - 209), "Wetzlar, Germany • Type 2416", font=font_mono_badge, fill=C_INK_SECONDARY)

# Tagline
d1.text((80, H - 165), "The benchmark of iconic rangefinder craft. An uncompromised union", font=font_body, fill=C_INK_SECONDARY)
d1.text((80, H - 135), "of mechanical legacy and 60-megapixel precision.", font=font_body, fill=C_INK_SECONDARY)

# Scroll indicator
d1.text((80, H - 75), "↓ Scroll to Explode (66 Precision Parts)", font=font_mono_small, fill=C_INK_SECONDARY)

s1.save(f"{out_dir}/slide_01_hero.png")
print("[QA] Generated slide 1: Hero Overview")

# ==============================================================================
# SLIDE 2: Chapter 1 — Bayonet Mount (Phase 2, Model Right, Text Left)
# ==============================================================================
s2 = Image.new('RGBA', (W, H), C_CANVAS_LIGHT)
d2 = ImageDraw.Draw(s2)
draw_grid(d2, dark=False)
s2 = draw_watermark(s2, dark=False)
d2 = ImageDraw.Draw(s2)

if black_render:
    # Model on right
    cam_right = black_render.resize((1100, 688), Image.Resampling.LANCZOS)
    s2.paste(cam_right, (780, 200), cam_right)

# Chapter left typography
d2.text((120, 240), "CHAPTER 01 // COUPLING", font=font_mono_badge, fill=C_LEICA_RED)
d2.text((120, 280), "BAYONET", font=font_title_light, fill=C_INK_PRIMARY)
d2.text((120, 340), "MOUNT", font=font_title_lg, fill=C_INK_PRIMARY)

# Subhead line
d2.line([(120, 430), (120, 460)], fill=C_LEICA_RED, width=3)
d2.text((135, 435), "PRECISION MECHANICAL COUPLING", font=font_mono_sub, fill=C_INK_PRIMARY)

# Paragraph
d2.text((120, 490), "Solid stainless steel flange machined with sub-micron tolerances.", font=font_body, fill=C_INK_SECONDARY)
d2.text((120, 520), "Flawlessly secures over seven decades of legendary Leica M-mount", font=font_body, fill=C_INK_SECONDARY)
d2.text((120, 550), "optics with absolute coaxial rigidity.", font=font_body, fill=C_INK_SECONDARY)

# Spec chips
chips2 = ["STAINLESS STEEL FLANGE", "FOUR-CLAW LOCK", "6-BIT OPTICAL SENSOR"]
cx = 120
for c in chips2:
    bbox = d2.textbbox((cx, 620), c, font=font_mono_small)
    pad = 12
    d2.rounded_rectangle([bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, bbox[3]+pad], radius=20, outline=C_HAIRLINE_LIGHT, width=1)
    d2.text((cx, 620), c, font=font_mono_small, fill=C_INK_PRIMARY)
    cx += (bbox[2] - bbox[0]) + 35

s2.save(f"{out_dir}/slide_02_bayonet.png")
print("[QA] Generated slide 2: Bayonet Mount")

# ==============================================================================
# SLIDE 3: Chapter 2 — 60MP Sensor (Phase 2, Full White Gallery Theme, Model Left, Text Right)
# ==============================================================================
s3 = Image.new('RGBA', (W, H), C_CANVAS_LIGHT)
d3 = ImageDraw.Draw(s3)
draw_grid(d3, dark=False)
s3 = draw_watermark(s3, dark=False)
d3 = ImageDraw.Draw(s3)

if black_render:
    # Model on left
    cam_left = black_render.resize((1250, 780), Image.Resampling.LANCZOS)
    s3.paste(cam_left, (-150, 160), cam_left)

# Chapter right typography
rx = 1080
d3.text((rx, 240), "CHAPTER 02 // SENSOR ENGINE", font=font_mono_badge, fill=C_LEICA_RED)
d3.text((rx, 280), "TRIPLE", font=font_title_light, fill=C_INK_PRIMARY)
d3.text((rx, 340), "RESOLUTION", font=font_title_lg, fill=C_INK_PRIMARY)

d3.line([(rx, 430), (rx, 460)], fill=C_LEICA_RED, width=3)
d3.text((rx + 15, 435), "60MP FULL-FRAME BSI CMOS SENSOR", font=font_mono_sub, fill=C_INK_PRIMARY)

d3.text((rx, 490), "Engineered around full-sensor pixel binning, allowing instant", font=font_body, fill=C_INK_SECONDARY)
d3.text((rx, 520), "switching between 60, 36, and 18 Megapixels. Backed by dual-layer", font=font_body, fill=C_INK_SECONDARY)
d3.text((rx, 550), "absorption glass, sapphire optics, and 24K gold electrical pins.", font=font_body, fill=C_INK_SECONDARY)

chips3 = ["BSI CMOS ARCHITECTURE", "MAESTRO III PROCESSOR", "24K GOLD CONTACTS"]
cx3 = rx
for c in chips3:
    bbox = d3.textbbox((cx3, 620), c, font=font_mono_small)
    pad = 12
    d3.rounded_rectangle([bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, bbox[3]+pad], radius=20, outline=C_HAIRLINE_LIGHT, width=1)
    d3.text((cx3, 620), c, font=font_mono_small, fill=C_INK_PRIMARY)
    cx3 += (bbox[2] - bbox[0]) + 35

s3.save(f"{out_dir}/slide_03_sensor_light.png")
print("[QA] Generated slide 3: Sensor Full White Gallery")

# ==============================================================================
# SLIDE 4: Chapter 4 — Technical Arc Gauge (Phase 2, Centered)
# ==============================================================================
s4 = Image.new('RGBA', (W, H), C_CANVAS_LIGHT)
d4 = ImageDraw.Draw(s4)
draw_grid(d4, dark=False)
s4 = draw_watermark(s4, dark=False)
d4 = ImageDraw.Draw(s4)

if black_render:
    # Model placed safely in top 65% (elevated safe zone)
    cam_mid = black_render.resize((920, 575), Image.Resampling.LANCZOS)
    s4.paste(cam_mid, (500, 110), cam_mid)

# Arc gauge
arc_box = [W//2 - 380, 280, W//2 + 380, 1040]
d4.arc(arc_box, start=180, end=0, fill=C_HAIRLINE_LIGHT, width=2)
# Center reticle
d4.ellipse([W//2 - 12, 270, W//2 + 12, 294], outline=C_HAIRLINE_LIGHT, width=1)
d4.ellipse([W//2 - 4, 278, W//2 + 4, 286], fill=C_LEICA_RED)

# Bottom stats table (100% collision free)
y_table = 820
d4.line([(120, y_table), (W - 120, y_table)], fill=C_HAIRLINE_LIGHT, width=1)
d4.line([(120, y_table + 160), (W - 120, y_table + 160)], fill=C_HAIRLINE_LIGHT, width=1)
d4.line([(W//3, y_table), (W//3, y_table + 160)], fill=C_HAIRLINE_LIGHT, width=1)
d4.line([(2*W//3, y_table), (2*W//3, y_table + 160)], fill=C_HAIRLINE_LIGHT, width=1)

# Stat 1
d4.text((W//6 - 70, y_table + 35), "60 MP", font=font_stat_num, fill=C_INK_PRIMARY)
d4.text((W//6 - 95, y_table + 105), "[ MAXIMUM RESOLUTION ]", font=font_mono_small, fill=C_INK_SECONDARY)

# Stat 2
d4.text((W//2 - 100, y_table + 35), "±0.02 mm", font=font_stat_num, fill=C_INK_PRIMARY)
d4.text((W//2 - 90, y_table + 105), "[ FLANGE TOLERANCE ]", font=font_mono_small, fill=C_INK_SECONDARY)

# Stat 3
d4.text((5*W//6 - 85, y_table + 35), "ISO 64", font=font_stat_num, fill=C_INK_PRIMARY)
d4.text((5*W//6 - 85, y_table + 105), "[ BASE SENSITIVITY ]", font=font_mono_small, fill=C_INK_SECONDARY)

s4.save(f"{out_dir}/slide_04_gauge.png")
print("[QA] Generated slide 4: Technical Arc Gauge")

# ==============================================================================
# SLIDE 5: Outro Showcase (Phase 4, Edolus Style)
# ==============================================================================
s5 = Image.new('RGBA', (W, H), C_CANVAS_LIGHT)
d5 = ImageDraw.Draw(s5)
draw_grid(d5, dark=False)
s5 = draw_watermark(s5, dark=False)
d5 = ImageDraw.Draw(s5)

if silver_render:
    cam_outro = silver_render.resize((820, 512), Image.Resampling.LANCZOS)
    s5.paste(cam_outro, (W//2 - 410, 180), cam_outro)

d5 = ImageDraw.Draw(s5)
draw_grid(d5, dark=False)

# Red Dot Badge
badge_cx, badge_cy = W // 2, 724
d5.ellipse([badge_cx - 24, badge_cy - 24, badge_cx + 24, badge_cy + 24], fill=C_LEICA_RED)
bbox_l = d5.textbbox((0, 0), "Leica", font=font_mono_badge)
bw = bbox_l[2] - bbox_l[0]
bh = bbox_l[3] - bbox_l[1]
d5.text((badge_cx - bw // 2, badge_cy - bh // 2 - 2), "Leica", font=font_mono_badge, fill=(255, 255, 255, 255))

# Title & Slogan
d5.text((W//2 - 145, 770), "LEICA M11", font=font_title_lg, fill=C_INK_PRIMARY)
d5.text((W//2 - 180, 845), "\"Das Wesentliche — Pure Photography.\"", font=font_body, fill=C_INK_SECONDARY)

# Action buttons
btn1_box = [W//2 - 230, 910, W//2 - 20, 965]
d5.rounded_rectangle(btn1_box, radius=28, fill=C_INK_PRIMARY)
d5.text((W//2 - 195, 928), "↺ REPLAY JOURNEY", font=font_mono_badge, fill=(255, 255, 255, 255))

btn2_box = [W//2 + 20, 910, W//2 + 250, 965]
d5.rounded_rectangle(btn2_box, radius=28, outline=C_HAIRLINE_LIGHT, width=1, fill=C_CANVAS_LIGHT)
d5.text((W//2 + 45, 928), "◑ FINISH: SILVER", font=font_mono_badge, fill=C_INK_PRIMARY)

s5.save(f"{out_dir}/slide_05_outro.png")
print("[QA] Generated slide 5: Outro Showcase")
