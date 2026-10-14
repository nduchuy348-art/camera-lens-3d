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
   - Chapter 1 Bayonet Mount: 4-claw stainless steel flange (`Bayonet.005`) and lens cap centered at `(0, 0, 0)`.
   - Chapter 2 Sensor Core: Seamless transition keeping bayonet mount flange firmly seated on chassis (`opBayonet: 1.0`, `opChassis: 1.0`), showcasing dark sensor chamber with zero glass detachment.
   - Chapter 3 Tactile Command: Frosted/matte translucent frame pedestal (`opChassis: 0.48`, `opBaseplate: 0.48`) supporting prominent, razor-sharp knurled mechanical dials (`opDials: 1.0`).

4. **Chapter 4 Technical Specs (60MP, ±0.02mm, ISO 64)**:
   - Camera 100% assembled, elevated to upper half of viewport (`worldPivotY: 0.38`, `camY: 0.72`, `lookY: 0.10`, `modelScale: 0.85`), floating comfortably above bottom-anchored metrics with zero text collision.

5. **Climax Mechanical Snap & Hotspots (Phase 5)**:
   - Single decisive impact snap at `progress >= 0.77` (`back.out(2.0)`), fusing all components into unified camera with authentic shutter audio and interactive 3D hotspot annotations.

6. **Outro Rotational Fade-Out (Phase 6)**:
   - Model smoothly executes ~1.5 revolution rotation (`modelRotY: 0.35 + 1.5 * Math.PI`) while ascending (`worldPivotY: 0.55`) and fading out (`overallOpacity: 1.0 -> 0.0`), leaving typography and action buttons centered on pure white canvas. Default finish: Stealth Black.

---

## 5. Five Universal UI States
* **Normal**: Crisp hairline borders, subtle glow.
* **Loading**: Curtain preloader with real-time numeric progress counter (`0-100%`) and hard scroll lock.
* **Empty / Zero State**: Clean fallback if WebGL or specific assets fail.
* **Error**: Prominent retry banner with zero visual breakage.
* **Pressed / Active**: 80–120ms spring scale depression (`scale(0.96)`) with tactile Web Audio feedback.
