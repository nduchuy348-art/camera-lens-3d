# DESIGN SYSTEM: LEICA M11 3D INTERACTIVE SHOWCASE (FULL WHITE GALLERY CINEMATIC EDITION)

## 1. Aesthetic Identity & Art Direction
* **Aesthetic Standard**: Wetzlar Precision Engineering & Swiss Minimalist High-Key White Gallery.
* **Benchmark References**: Leica Gallery Wetzlar Exhibitions, pure high-key studio lighting, and architectural minimalism.
* **Anti-AI Slop Mandate**: Zero generic cards, zero nested card-in-card layouts, zero emoji icons. Monospaced tabular metrics, tactile micro-interactions (80–120ms feedback), authentic Web Audio synthesizer detents, Lucide SVG vector icons.

---

## 2. Color Architecture (High-Key Full White Gallery)
* **Canvas Baseline**: `#FDFDFD` (Pure high-key gallery white)
* **Canvas Subtle / Cards**: `#F6F7F8` (Calibrated soft off-white with backdrop blur)
* **Ink Primary**: `#181B1E` (High-contrast deep typographic ink)
* **Ink Secondary**: `rgba(24, 27, 30, 0.65)` (Technical secondary copy)
* **Ink Tertiary**: `rgba(24, 27, 30, 0.35)` (Hairlines and timestamps)
* **Leica Signature Red**: `#E00613` (Wetzlar red dot enamel badge & optical reticle)
* **Brushed Silver Chrome**: `#DFE2E6` / `#E8EAEF` (Classic chrome metal finish)
* **Stealth Black Metal**: `#18181A` / `#222426` (Matte anodized aluminum dials & plates)
* **Hairline Borders**: `rgba(24, 27, 30, 0.12)` / `rgba(24, 27, 30, 0.24)`

---

## 3. Typography Hierarchy
* **Brand & Display Headlines**: `Outfit`, sans-serif (Engineered grotesque, `font-weight: 300` - `700`, letter-spacing `-0.04em`)
* **Editorial & Body Text**: `Outfit`, sans-serif (High legibility, `font-weight: 300` - `400`)
* **Telemetry, Metrics & Indicators**: `JetBrains Mono`, monospace (with `font-variant-numeric: tabular-nums`)

---

## 4. 3D Camera Choreography & Interaction Rules
1. **Initial Framing (Hero)**:
   - Front-High 30° Oblique `(-0.30, 0.76, 1.48)` looking down at `(0, 0.06, 0)`.
   - Full camera assembled flush on high-key gallery background.

2. **Explosion Dynamics**:
   - Strictly coaxial along optical Z-axis with monumental kinetic backdrop typography (`300vh` scroll height, high contrast `0.24` opacity).
   - 4 macro module slabs separate gracefully in space and remain suspended with pristine visual clarity.

3. **Sub-Assembly Isolation & Pinned Inspection**:
   - Pinned dwell with smooth turntable sweeps.
   - Outgoing sub-assemblies fade out (`duration: 0.35s`); incoming sub-assemblies fade in centered at `(0, 0, 0)` early (triggered at `top 80%`).
   - Chapter 1 Bayonet Mount: ONLY shining 4-claw stainless steel flange (`Bayonet.005`) centered at `(0, 0, 0)`, lens cap and selector hidden.
   - Chapter 2 Sensor Core: framed at `camZ: 0.70m`, text card aligned safely (`max-width: min(440px, 36vw)`, `margin-right: 2.5rem`, `word-break: break-word`).
   - Chapter 3 Tactile Command: ONLY single hero `Shutter Speed Dial` centered at `(0, 0, 0)` (52° pitch) rotating around its own knurled axis; text card cleanly aligned on the left grid (`margin-left: 0`, `max-width: min(440px, 36vw)`).

4. **Climax Mechanical Snap (BEFORE Chapter 4)**:
   - Single decisive impact snap at `progress >= 0.77` (`back.out(2.0)`), fusing all 66 components into a solid camera, accompanied by 100ms camera micro-shake and authentic shutter release audio.

5. **Chapter 4 Technical Specs (60MP, ±0.02mm, ISO 64)**:
   - Camera is ALREADY 100% assembled. Model dwells in center safe zone above stats cards, gently rotating left and right $\pm 12^\circ$ to showcase the camera.

6. **Vertical Stack Outro (180vh)**:
   - Top 55% viewport dedicated to 3D model slow elegant turntable on Edolus ring, bottom 45% for Leica cursive emblem, title, slogan, finish switcher, and replay action. Zero floating hotspots.

---

## 5. Five Universal UI States
* **Normal**: Crisp hairline borders, subtle glow.
* **Loading**: Curtain preloader with real-time numeric progress counter (`0-100%`) and hard scroll lock.
* **Empty / Zero State**: Clean fallback if WebGL or specific assets fail.
* **Error**: Prominent retry banner with zero visual breakage.
* **Pressed / Active**: 80–120ms spring scale depression (`scale(0.96)`) with tactile Web Audio feedback.
