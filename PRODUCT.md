# PRODUCT DEFINITION: LEICA M11 3D INTERACTIVE SHOWCASE (V3 CINEMA DRONE EDITION)

## 1. Project Overview
* **Project Name**: `camera-lens-3d`
* **Product**: Leica M11 Rangefinder Digital Camera (66 CAD Components).
* **Target Experience**: 60fps real-time 3D web experience inspired by `https://drone.riotters.com/`, featuring pure Z-axis explosion, dynamic sub-assembly magnetic snapping, scroll-driven turntable rotation inspection, large-angle orbital sweeps, authentic mechanical audio detents, and dual finish switching (Stealth Matte Black & Classic Silver Chrome).

---

## 2. Component Deconstruction & Pure Z-Coaxial Explosion
All 66 components disengage strictly along the optical Z-axis (the axis containing the lens) with zero lateral drift ($X = 0, Y = 0$):

1. **Front Optical Stack ($+2.50\text{m} \rightarrow +0.65\text{m}$)**:
   - `Lens Cap Script`: $+2.50\text{m}$ (Foremost front)
   - `Lens Cap Body`: $+2.10\text{m}$
   - `Bayonet Flange Ring`: $+1.65\text{m}$
   - `Lens Release Button & Frame Selector`: $+1.25\text{m}$
   - `Leica Red Dot Emblem`: $+0.95\text{m}$
   - `Optical Windows & Rangefinder Glass`: $+0.65\text{m}$

2. **Core Imaging & Chassis Anchor ($+0.35\text{m} \rightarrow 0.00\text{m}$)**:
   - `60MP BSI CMOS Sensor Plane`: $+0.35\text{m}$
   - `Die-Cast Magnesium Chassis Skeleton`: $0.00\text{m}$ (Anchor point)

3. **Top Deck Controls & Baseplate ($-0.45\text{m} \rightarrow -0.75\text{m}$)**:
   - `Brass Top Plate & Dials`: $-0.45\text{m}$
   - `Shutter Speed & ISO Dials`: $-0.45\text{m}$
   - `Baseplate & BP-SCL7 Battery`: $-0.75\text{m}$

4. **Rear Interface ($-1.35\text{m}$)**:
   - `2.3M Dot Sapphire Touchscreen & Viewfinder Eyepiece`: $-1.35\text{m}$

---

## 3. Sub-Assemblies & Drone Riotters Inspection Choreography
Instead of flying through chaotic pieces, components form 3 isolated sub-assemblies that assemble dynamically on scroll and can be inspected via turntable rotation:

* **Sub-Assembly 1: Precision Stainless Steel Bayonet Mount (Chapter 1)**:
  - *Isolation*: Stainless steel bayonet flange (`Bayonet.005`) and protective cap showcased. Cap slides forward along Z to expose the precision flange.
  - *Exit*: Flange remains solidly seated (`opBayonet: 1.0`), seamlessly transitioning together with the chassis into Chapter 2 without popping or disappearance.

* **Sub-Assembly 2: 60MP Full-Frame BSI Sensor Core (Chapter 2)**:
  - *Atmosphere*: High-Key Full White Gallery baseline (`#FDFDFD`, `#F6F7F8`).
  - *Seamless Unity*: Bayonet mount flange and magnesium chassis bọc da pebble appear directly together as a unified assembly (`opBayonet: 1.0`, `opChassis: 1.0`), showcasing the dark sensor chamber through the throat of the mount with zero detached optical glass.
  - *Zero Glass Detachment*: Optical window elements are solidly locked into their bezels with zero Z-axis micro-explosion (`micro = 0, 0, 0` and `subExplode2: 0.0`).

* **Sub-Assembly 3: Tactile Mechanical Controls & Silhouette Pedestal (Chapter 3)**:
  - *Silhouette Pedestal*: Camera body and top deck subtly visible as a soft translucent foundation (`opChassis: 0.22`, `depthWrite: false`).
  - *Hero Dials*: Knurled dials (`Shutter Speed Dial`, `ISO Dial`) and top switches 100% solid, sharp, and specular in front (`opDials: 1.0`), hovering slightly before snapping flush.

* **Phase 4: Technical Specs & Anchored Metric Floor (60MP, ±0.02mm, ISO 64)**:
  - Full camera 100% assembled, elevated to the upper half of the viewport (`worldPivotY: 0.38`, `camY: 0.72`, `lookY: 0.10`, `modelScale: 0.85`).
  - Massive metrics anchored firmly in the bottom 12% of the screen (`justify-content: flex-end`, `padding-bottom: 8vh`) with zero text collision.

* **Phase 5: Synthesis Climax Reassembly & Hotspots**:
  - Model snaps completely into unified camera with interactive 3D hotspot annotations (Rangefinder optics, dual mechanical shutter, Leica red dot).

* **Phase 6: Outro Showcase (180vh)**:
  - Fully sacrificed model: smooth ~1.5 revolution rotation (`modelRotY: 0.35 + 1.5 * Math.PI`) as the camera ascends (`worldPivotY: 0.55`) and fades out (`overallOpacity: 1.0 -> 0.0`), leaving typography and action buttons centered on pure white canvas. Default finish: Stealth Matte Black with Classic Silver Chrome toggle.

---

## 4. Brand Narrative & Typography
* **Headline**: LEICA M11 — THE PURITY OF RANGEFINDER PRECISION.
* **Language**: 100% International English editorial copy.
