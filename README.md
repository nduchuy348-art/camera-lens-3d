# Leica M11 — 3D Interactive Rangefinder Showcase

[![Three.js](https://img.shields.io/badge/Three.js-r128+-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-990000?style=for-the-badge&logo=webgl&logoColor=white)](https://www.khronos.org/webgl/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio-Procedural%20Synthesis-blue?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Lenis Scroll](https://img.shields.io/badge/Lenis-Kinetic%20Physics-black?style=for-the-badge)](https://github.com/darkroomengineering/lenis)
[![Blender](https://img.shields.io/badge/Blender-4.x%20Pipeline-F5792A?style=for-the-badge&logo=blender&logoColor=white)](https://www.blender.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> A real-time 60fps editorial 3D web experience deconstructing the legendary **Leica M11 Rangefinder Digital Camera** across 66 high-precision CAD components. Inspired by the editorial choreography of Drone Riotters, featuring pure Z-axis coaxial explosion, dynamic turntable sub-assembly inspection, procedural Web Audio tactile haptics, and dual finish toggling.

---

## 📸 Overview

The **Leica M11 3D Showcase** redefines product presentation on the web. Rather than generic rotation viewers or pre-rendered video clips, this project executes an engineered, real-time WebGL deconstruction of 66 precision camera components.

Every component transitions along the optical Z-axis with strict geometric rigor ($X = 0, Y = 0$), preserving structural alignment while exposing the inner optical stack, 60MP Full-Frame BSI CMOS sensor core, die-cast magnesium chassis skeleton, and brass control deck.

---

## 🛠️ Technology Stack & Architecture

### 1. 3D Graphics & Rendering Pipeline
* **Three.js (ES Module Architecture)**: Modular WebGL 2.0 rendering pipeline with zero monolithic framework dependencies.
* **PBR Material System**: Physically Based Rendering with custom metalness, micro-roughness maps, diamond knurling textures, and pebble leatherette displacement.
* **Dynamic Lighting & Shaders**:
  * Multi-point cinematic studio lighting rig.
  * Real-time dynamic specular rim light following orbital camera vectors.
  * `ACESFilmicToneMapping` with exposure balancing to preserve high-key whites (`#FDFDFD`) and deep anodized blacks.
  * `PCFSoftShadowMap` for contact ground shadow grounding.
* **HDR Environment Integration**: High dynamic range optical reflection mapping for realistic chrome reflections on the bayonet flange and optical glass elements.

### 2. Kinetic Scroll & Motion Physics
* **Lenis Smooth Scroll Engine**: Modern kinetic momentum scrolling providing fluid interpolation across desktop trackpads, high-inertia mouse wheels, and mobile touch devices.
* **Lockstep Scrub Physics**: Interpolated camera coordinates tied directly to scroll progress with non-reflow cached projections, eliminating mesh tearing and viewport jitter during high-velocity scrolling.
* **Z-Coaxial Component Choreography**: Strict multi-stage explosion timeline disengaging components along the optical lens normal vector.

### 3. Procedural Web Audio Engine (Zero External Audio Assets)
* **Real-time Synthesis**: 100% code-synthesized acoustic feedback built with the native **Web Audio API**—requiring zero external `.mp3` or `.wav` network requests.
* **Acoustic Models**:
  * **Mechanical Shutter Release**: Dual-pulse click and mechanical shutter curtain slap.
  * **Winding Ratchet & Detents**: Frequency-modulated micro-clicks triggering on dial rotation.
  * **Bayonet Mount Docking**: Synchronized metallic latch clack with spring tension impulse when sub-assemblies seat into place.
* **Interactive Audio Unlock**: Auto-unlocking gesture engine supporting click, scroll, touch, and preloader entry buttons with full browser autoplay policy compliance.

### 4. 3D Asset Optimization & Blender Pipeline
* **Blender Python Automation**: Headless Python automation scripts (`setup_vibrant_leica.py`, `render_beauty.py`, `render_silver.py`, `render_transparent.py`) optimizing material hierarchy and mesh instances.
* **GLTF / GLB Binary Bundling**: Clean binary GLB bundling 66 sub-objects into an efficient 50MB runtime package with Draco-ready vertex structures.

### 5. Frontend & UI Engineering
* **Typography**: Clean Swiss-inspired Grotesk hierarchy using Google Fonts **Outfit** and engineered monospace data readouts using **JetBrains Mono**.
* **Zero Framework Overhead**: Handcrafted Vanilla ES6+ and modern CSS Grid / Flexbox architecture.
* **Responsive HUD**: Dynamic optical vernier calipers, live coordinate telemetry, chapter indicators, and magnetic interactive buttons.

---

## ✨ Key Features

* **Pure Z-Axis Coaxial Explosion**: 66 individual parts separate cleanly along the lens barrel without lateral wobble.
* **3 Isolated Sub-Assemblies**:
  1. *Sub-Assembly 1*: Precision Stainless Steel Bayonet Mount & Protective Flange Cap.
  2. *Sub-Assembly 2*: 60MP Full-Frame BSI Sensor Core with Die-Cast Magnesium Chassis.
  3. *Sub-Assembly 3*: Tactile Mechanical Controls, Diamond Knurled Shutter Speed & ISO Dials.
* **Dual Finish Switcher**: Instant real-time material swapping between **Stealth Matte Black** (anodized aluminum top plate) and **Classic Silver Chrome** (solid brass plate).
* **Interactive 3D Spatial Hotspots**: Camera-tracking annotations pinned in 3D world space marking key innovations (Rangefinder Mechanism, Dual Mechanical Shutter, Leica Red Dot Emblem).
* **Full White Gallery Aesthetics**: High-key architectural museum presentation (`#FDFDFD` canvas) with monumental kinetic backdrop typography.

---

## 📈 Evolution & Commit History (v1 → v30)

The project underwent 30 release iterations across 36 Git commits, advancing from a basic 3D prototype to an Awwwards-caliber digital experience:

| Commit | Date | Tag | Milestone Description |
| :--- | :---: | :---: | :--- |
| `c8ad30c` | 2026-10-18 | `v30` | **feat(v30)**: Eliminate fast-scroll glitches — lockstep scrub physics, zero mesh tearing, non-reflow cached projections, and hardened audio engine |
| `af4807e` | 2026-10-18 | `v29` | **feat(v29)**: Awwwards Masterpiece Edition — integrate Lenis kinetic momentum, dynamic specular rim light, harmonic ambient breathing, optical vernier HUD and magnetic buttons |
| `2bca9e4` | 2026-10-18 | `v28` | **feat(v28)**: Streamline enter button and audio pill to ultra-minimal single-row design |
| `9ea732f` | 2026-10-18 | `v27` | **feat(v27)**: Implement interactive preloader enter gateway and resilient audio unlock engine for internet HTTPS |
| `cd34874` | 2026-10-17 | `v26` | **feat(v26)**: Restore instant welcome shutter click on preloader reveal and expand audio unlock gestures |
| `d5f7140` | 2026-10-17 | `v25` | **feat(v25)**: Synchronize bayonet mount docking audio with visual latch threshold and tactile micro-shake |
| `ce6bb28` | 2026-10-17 | `v24` | **fix(v24)**: Eliminate secondary vertical scrollbar by removing body overflow container |
| `f5d7a9c` | 2026-10-17 | `v23` | **fix(v23)**: Expand defensive CSS suppression rule to cover all version dock variations |
| `c86dafe` | 2026-10-17 | - | **feat(v23)**: 4-layer bulletproof version dock removal and anti-cache enforcement |
| `c2c4aa4` | 2026-10-17 | `v22` | **feat(v22)**: Remove version switcher dock and default to latest build |
| `b6925b5` | 2026-10-16 | `v21` | **fix(v21)**: Fix `syncScrollState` scoping, eliminate audio clash, and ensure high-contrast dial markings |
| `0c3c975` | 2026-10-16 | - | **feat(v21)**: Crisp white dial markings, synchronized mechanical audio engine, and clean HUD interface |
| `9359dd2` | 2026-10-14 | `v20` | **fix(v20)**: `masterGain` mute control, `unlockAudio` gesture resilience, velocity pitch scaling, and mobile touch targets |
| `a84b414` | 2026-10-14 | - | **feat(v20)**: Default to Stealth Black finish edition and add rich mechanical Web Audio engine |
| `29494cb` | 2026-10-14 | `v19` | **fix(v19)**: Add cache-busters, sync active sub-assembly on init, and accelerate Chapter 3 assembly settling |
| `ca65d87` | 2026-10-14 | - | **feat(v19)**: 100% complete fully assembled camera in Chapter 3 with zero floating parts and full solid opacity |
| `d6edcb9` | 2026-10-14 | `v18` | **feat(v18)**: Solid camera body frame (1.0 opacity) with clean hover-to-snap shutter dial in Chapter 3 |
| `a6ff490` | 2026-10-14 | `v17` | **feat(v17)**: Cohesive matte frame pedestal (0.48 opacity) with solid tactile dials in Chapter 3 |
| `9fa51fc` | 2026-10-14 | `v16` | **fix(v16)**: Solidly mount optical window glass to bezels and interpolate pedestal opacity continuously |
| `86ceec8` | 2026-10-14 | - | **feat(v16)**: Default stealth black, seamless bayonet transition, eliminate glass detachment, tactile silhouette pedestal, anchored 60MP specs, and outro revolution fade |
| `f88ca72` | 2026-10-14 | `v15` | **fix(v15)**: Isolate mesh materials to prevent opacity cross-talk, add Web Audio node garbage cleanup, and guard against load-time false detent ticks |
| `454a56c` | 2026-10-14 | - | **feat(v15)**: Mechanical audio haptics, seamless chapter transitions, elevated 60MP specs, and sacrificial outro |
| `42f7d96` | 2026-10-13 | - | **fix(fusion)**: Resolve opaque canvas layering bug, preloader curtain freeze, floating sensor windows, and chapter flashing |
| `1b02711` | 2026-10-13 | `v13` | **feat(v13)**: Pinned Drone Riotters HUD & true hero dial isolation |
| `e3439e5` | 2026-10-13 | `v12` | **feat(v12)**: Mechanical ambient soundscape & CAD wireframe body |
| `9df02fa` | 2026-10-13 | `v11` | **feat(v11)**: Mathematical geometric centering with bounding boxes |
| `1e80efa` | 2026-10-13 | `v10` | **feat(v10)**: Snap reassembly before specs & hotspot cleanse |
| `a8061e7` | 2026-10-13 | `v9` | **feat(v9)**: Full white gallery theme & monumental kinetic backdrop |
| `9f6bbb7` | 2026-10-13 | `v8` | **feat(v8)**: Hero dwell & dynamic 3D turntable explosion flight |
| `0326d5a` | 2026-10-13 | `v7` | **feat(v7)**: Native ScrollTrigger architecture & scroll-freeze fix |
| `7a19d66` | 2026-10-13 | `v6` | **feat(v6)**: 4 macro modules & PBR leatherette / knurling textures |
| `511e5a7` | 2026-10-13 | `v5` | **feat(v5)**: Coaxial pure-Z explosion architecture & audio clicks |
| `391fec1` | 2026-10-13 | `v4` | **feat(v4)**: Technical blueprint hero 25deg & SVG leader lines |
| `a3e7571` | 2026-10-13 | `v3` | **feat(v3)**: Preloader percent counter & curtain wipe reveal |
| `e2a712b` | 2026-10-13 | `v2` | **feat(v2)**: Anti-AI-slop review, Outfit typography & optical rings |
| `310025a` | 2026-10-13 | `v1` | **feat(v1)**: Initial Swiss minimalist prototype & 3D hotspots |

---

## 📂 Project Structure

```text
camera-lens-3d/
├── assets/
│   └── leica_m11_master.glb       # Optimized 66-part master 3D CAD model (~50MB)
├── vendor/
│   ├── three.module.js            # Three.js core engine
│   ├── OrbitControls.js           # Orbital camera interaction
│   ├── GLTFLoader.js              # Binary GLTF/GLB parser
│   └── RGBELoader.js              # HDR environment map loader
├── index.html                     # Entrypoint & preloader curtain wipe markup
├── main.js                        # Three.js scene orchestration & scroll timeline
├── audio.js                       # Procedural Web Audio API sound synthesis engine
├── styles.css                     # Modern layout, typography & HUD styling
├── setup_vibrant_leica.py         # Blender automation script for material tuning
├── PRODUCT.md                     # Technical product specification & component index
├── DESIGN.md                      # UI/UX, typography, and motion guidelines
└── README.md                      # Project documentation and changelog
```

---

## 🚀 Getting Started & Local Development

### Prerequisites
A modern browser supporting **WebGL 2.0** and **Web Audio API** (Chrome 90+, Safari 15+, Firefox 90+, Edge).

### Run Locally
Because this project utilizes ES modules and loads binary GLB assets, it must be served over an HTTP/HTTPS local server:

```bash
# Clone the repository
git clone https://github.com/nduchuy348-art/camera-lens-3d.git
cd camera-lens-3d

# Option 1: Python 3 built-in HTTP server
python3 -m http.server 8000

# Option 2: Node.js npx serve
npx serve .

# Option 3: VS Code Live Server extension
# Right-click index.html -> "Open with Live Server"
```

Then open your browser at `http://localhost:8000`.

---

## 🎯 Controls & Interaction Guide

* **Scroll / Trackpad**: Drives real-time coaxial component explosion, chapter transitions, and camera orbits.
* **Preloader Curtain**: Click **ENTER** or scroll to lift the technical curtain and initialize Web Audio haptics.
* **Audio Pill Toggle** (Bottom Left): Enable/disable procedural mechanical camera audio.
* **Finish Switcher** (Bottom Right): Toggle between **Stealth Matte Black** and **Classic Silver Chrome**.
* **Hotspots**: Click circular indicators in Chapter 5 to focus optical inspections and view technical annotations.

---

## 📄 License & Intellectual Property

* **Code & Shaders**: Released under the [MIT License](LICENSE).
* **Product Design**: The Leica M11 camera body, typography, and trademarks are the intellectual property of [Leica Camera AG](https://leica-camera.com/). This showcase is an educational and portfolio engineering project.
