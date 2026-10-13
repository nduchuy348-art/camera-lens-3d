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
  - *Isolation*: Non-active parts hidden (`visible = false`). ONLY the 4-claw stainless steel flange (`Bayonet.005`) is showcased at `(0, 0, 0)` in the center. Lens cap and frame selector lever are hidden.
  - *Scroll Turntable*: User scrolling rotates the shining flange smoothly along its axis (`modelRotY: -0.22 \rightarrow +0.25`), catching specular reflections.
  - *Exit*: Fades out smoothly into Chapter 2.

* **Sub-Assembly 2: 60MP Full-Frame BSI Sensor Core (Chapter 2)**:
  - *Atmosphere*: High-Key Full White Gallery baseline (`#FDFDFD`, `#F6F7F8`).
  - *Isolation*: Central magnesium chassis skeleton and 60MP BSI sensor core. Text block aligned safely with zero overflow (`word-break: break-word`, `margin-right: 2.5rem`).
  - *Scroll Turntable*: Scrolling tilts and turns the sensor, catching sapphire and 24K gold glints.

* **Sub-Assembly 3: Tactile Mechanical Controls & Hero Shutter Dial (Chapter 3)**:
  - *Isolation*: ONLY the single featured `Shutter Speed Dial` is showcased and centered at `(0, 0, 0)`. All other dials are hidden.
  - *Layout Harmony*: Text block cleanly aligned on the left with safe margins, while the hero dial spins proudly around its own knurled axis at center.

* **Phase 3: Synthesis Climax Reassembly (BEFORE Chapter 4)**:
  - Model snaps completely back together into a 100% assembled solid camera BEFORE Chapter 4.
  - All 66 components slam together in ONE decisive impact snap at `progress >= 0.77` (`back.out(2.0)`), accompanied by 100ms camera micro-shake and authentic shutter release audio.

* **Phase 3, Chapter 4: Technical Specs & Metric Floor (60MP, ±0.02mm, ISO 64)**:
  - Full camera is ALREADY 100% assembled.
  - Model dwells in the center safe zone above the stats cards, gently rotating left and right $\pm 12^\circ$ to showcase the camera.

* **Phase 4: Outro Showcase (180vh)**:
  - Extended 180vh section with slow, majestic turntable rotation in the top 55% viewport, and typography + actions in bottom 45%. Dual finish switcher (Stealth Black / Classic Silver) and replay tour.

---

## 4. Brand Narrative & Typography
* **Headline**: LEICA M11 — THE PURITY OF RANGEFINDER PRECISION.
* **Language**: 100% International English editorial copy.
