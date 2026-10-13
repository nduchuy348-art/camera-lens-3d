import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import * as audio from './audio.js';

/* ==========================================================================
   GLOBAL STATE & ARCHITECTURAL CONFIGURATION
   ========================================================================== */
const state = {
  isLoaded: false,
  finish: 'black', // 'black' (Matte Anodized) or 'silver' (Classic Chrome)
  activeSubAssembly: null, // null, 'BAYONET', 'SENSOR', 'DIALS'
  snappedSub1: true,
  snappedSub2: true,
  snappedSub3: true,
  snappedClimax: true,
  mouse: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  },
  lastDetent: -1,
};

// Camera micro-shake state for decisive mechanical impact
let shakeIntensity = 0;
function triggerImpactShake() {
  shakeIntensity = 0.012; // Damped high-frequency vibration
}

// DOM References
const canvas = document.getElementById('webgl-canvas');
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloader-counter');
const preloaderCounterVal = document.getElementById('preloader-counter-val');
const preloaderBar = document.getElementById('preloader-bar');
const watermarkInner = document.getElementById('watermark-inner');

const btnReplay = document.getElementById('btn-replay');
const btnToggleFinish = document.getElementById('btn-toggle-finish');
const btnFinishLabel = document.getElementById('btn-finish-label');

/* ==========================================================================
   GSAP SCROLLTRIGGER ARCHITECTURE (NATIVE 60-120HZ SCROLL ENGINE)
   ========================================================================== */
gsap.registerPlugin(ScrollTrigger);

// Ensure ScrollTrigger updates reliably on native window scroll
ScrollTrigger.config({
  autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize',
});

/* ==========================================================================
   THREE.JS SCENE, CAMERA & LIGHTING ARCHITECTURE
   ========================================================================== */
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  36, // Cinematic portrait focal compression
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const cameraRig = new THREE.Group();
scene.add(cameraRig);
cameraRig.add(camera);

// Hero starting angle: Elevated front-top 30°-35° oblique looking at both top deck and front face
const baseCameraPos = new THREE.Vector3(-0.30, 0.76, 1.48);
const baseTargetPos = new THREE.Vector3(0.0, 0.06, 0.0);
camera.position.copy(baseCameraPos);
camera.lookAt(baseTargetPos);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.20;

// Lighting Suite (Optimized for Pure White High-Key Gallery)
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.98);
scene.add(ambientLight);

// Key Light (Specular Highlight Tracker from upper-right front)
const keyLight = new THREE.DirectionalLight(0xFFFBF5, 3.4);
keyLight.position.set(2.4, 3.5, 3.0);
scene.add(keyLight);

// Fill Light (Soft Cool Ambient Left)
const fillLight = new THREE.DirectionalLight(0xF0F4FF, 1.6);
fillLight.position.set(-2.8, 2.2, 2.0);
scene.add(fillLight);

// Rim / Top Bevel Light (Sharp Edge Chamfer Highlights from back-above)
const rimLight = new THREE.DirectionalLight(0xF8FAFC, 2.6);
rimLight.position.set(0.2, 3.5, -2.5);
scene.add(rimLight);

// Edolus 3D Orbital Coordinate Ring (Flat on ground plane around camera base)
const orbitalRingGeom = new THREE.RingGeometry(0.75, 0.753, 64);
const orbitalRingMat = new THREE.MeshBasicMaterial({
  color: 0x181B1E,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.16,
});
const orbitalRing = new THREE.Mesh(orbitalRingGeom, orbitalRingMat);
orbitalRing.position.y = -0.28;
orbitalRing.rotation.x = Math.PI / 2;
scene.add(orbitalRing);

/* ==========================================================================
   TEXTURES & REALISTIC PBR SHADERS
   ========================================================================== */
const textureLoader = new THREE.TextureLoader();

// 1. Seamless Pebbled Leatherette Textures (Wrap for Mesh.052 / Body Middle)
const leatheretteDiffuse = textureLoader.load('./assets/leatherette_diffuse.png');
const leatheretteNormal = textureLoader.load('./assets/leatherette_normal.png');
const leatheretteRoughness = textureLoader.load('./assets/leatherette_roughness.png');

[leatheretteDiffuse, leatheretteNormal, leatheretteRoughness].forEach((tex) => {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 17); // Isotropic 1:1 square tactile pebble scale
});
leatheretteDiffuse.colorSpace = THREE.SRGBColorSpace;

const matLeatherette = new THREE.MeshStandardMaterial({
  map: leatheretteDiffuse,
  normalMap: leatheretteNormal,
  normalScale: new THREE.Vector2(2.2, 2.2),
  roughnessMap: leatheretteRoughness,
  roughness: 0.95,
  metalness: 0.04,
  color: new THREE.Color(0xFFFFFF), // Rich calibrated charcoal tones
});

// 2. Precision Diamond Knurled Normal Map for Top Deck Dials
const knurledNormal = textureLoader.load('./assets/knurled_normal.png');
knurledNormal.wrapS = THREE.RepeatWrapping;
knurledNormal.wrapT = THREE.RepeatWrapping;
knurledNormal.repeat.set(18, 3);

// Dials in Stealth Black Finish
const matBlackKnurledDial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x222426),
  metalness: 0.88,
  roughness: 0.25,
  normalMap: knurledNormal,
  normalScale: new THREE.Vector2(2.0, 2.0),
});

// Dials in Classic Silver Chrome Finish
const matSilverKnurledDial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xDFE2E6),
  metalness: 0.96,
  roughness: 0.18,
  normalMap: knurledNormal,
  normalScale: new THREE.Vector2(2.0, 2.0),
});

// Body Top & Bottom Plates in Stealth Black Finish
const matBlackAnodized = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x18181A),
  metalness: 0.80,
  roughness: 0.32,
});

// Body Top & Bottom Plates in Classic Silver Chrome Finish
const matSilverChrome = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xE2E4E8),
  metalness: 0.98,
  roughness: 0.16,
});

/* ==========================================================================
   MODEL DATA, 4 MACRO MODULES & COAXIAL Z-EXPLOSION GEOMETRY
   ========================================================================== */
const originalTransforms = new Map();
const originalMaterials = new Map();
const moduleExplodeVectors = new Map();
const microExplodeVectors = new Map();
const meshCenters = new Map();

let modelRoot = null;
const bodyPlates = [];
const dialMeshes = [];
let leatheretteMesh = null;

// Macro Sub-Assemblies & Chapter Isolation Sets
const subAssemblySets = {
  BAYONET: new Set(),   // Chapter 1: ONLY Bayonet.005 (the 4-claw stainless steel flange)
  SENSOR: new Set(),    // Chapter 2: Central Magnesium Chassis & 60MP Core
  DIALS: new Set(),     // Chapter 3: ONLY Shutter Speed Dial
  BASEPLATE: new Set(), // Module 4: Baseplate & Rear LCD
};

const subOpacities = {
  BAYONET: 1.0,
  SENSOR: 1.0,
  DIALS: 1.0,
  BASEPLATE: 1.0,
};

function applyOpacities() {
  if (!modelRoot) return;
  moduleExplodeVectors.forEach((modVec, mesh) => {
    let op = 1.0;
    if (state.activeSubAssembly === null) {
      op = 1.0;
    } else if (state.activeSubAssembly === 'BAYONET') {
      op = subAssemblySets.BAYONET.has(mesh) ? subOpacities.BAYONET : 0.0;
    } else if (state.activeSubAssembly === 'SENSOR') {
      op = subAssemblySets.SENSOR.has(mesh) ? subOpacities.SENSOR : 0.0;
    } else if (state.activeSubAssembly === 'DIALS') {
      op = subAssemblySets.DIALS.has(mesh) ? subOpacities.DIALS : 0.0;
    } else {
      op = 0.0;
    }

    if (op <= 0.01) {
      mesh.visible = false;
    } else {
      mesh.visible = true;
      if (mesh.material) {
        mesh.material.opacity = op;
        mesh.material.depthWrite = (op > 0.95);
      }
    }
  });
}

function updateFinishMaterials() {
  const isSilver = state.finish === 'silver';
  bodyPlates.forEach((mesh) => {
    mesh.material = (isSilver ? matSilverChrome : matBlackAnodized).clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
  });
  dialMeshes.forEach((mesh) => {
    mesh.material = (isSilver ? matSilverKnurledDial : matBlackKnurledDial).clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
  });
  if (leatheretteMesh) {
    leatheretteMesh.material = matLeatherette.clone();
    leatheretteMesh.material.transparent = true;
    leatheretteMesh.material.depthWrite = true;
  }
  applyOpacities();
}

let subOpacityTween = null;
function setSubAssemblyFocus(key) {
  state.activeSubAssembly = key;
  if (!modelRoot) return;

  const targets = {
    BAYONET: (key === 'BAYONET' || key === null) ? 1.0 : 0.0,
    SENSOR: (key === 'SENSOR' || key === null) ? 1.0 : 0.0,
    DIALS: (key === 'DIALS' || key === null) ? 1.0 : 0.0,
  };

  if (subOpacityTween) subOpacityTween.kill();
  subOpacityTween = gsap.to(subOpacities, {
    BAYONET: targets.BAYONET,
    SENSOR: targets.SENSOR,
    DIALS: targets.DIALS,
    duration: 0.35,
    ease: 'power2.out',
    onUpdate: applyOpacities,
  });
}

function classifyAndAssignVectors(mesh) {
  if (!mesh.isMesh) return;
  const name = mesh.name.toLowerCase();

  originalTransforms.set(mesh, {
    position: mesh.position.clone(),
    rotation: mesh.rotation.clone(),
  });

  // Track body finish plates (top, bottom, shoe)
  if (name.includes('body top') || name.includes('body bottom') || name.includes('accessory shoe')) {
    bodyPlates.push(mesh);
  }

  // Track dials for knurling and finish toggling
  if (name.includes('shutter speed dial') || name.includes('iso dial') || name.includes('thumb wheel')) {
    dialMeshes.push(mesh);
    mesh.material = state.finish === 'silver' ? matSilverKnurledDial : matBlackKnurledDial;
  }

  // Apply leatherette texture to body wrap (Mesh.052 / Body Middle)
  if (name.includes('mesh.052') || name.includes('body middle')) {
    leatheretteMesh = mesh;
    mesh.material = matLeatherette;
  }

  mesh.material = mesh.material.clone();
  mesh.material.transparent = true;
  mesh.material.opacity = 1.0;
  mesh.material.depthWrite = true;
  originalMaterials.set(mesh, mesh.material);

  /* ------------------------------------------------------------------------
     4 MACRO MODULE CLASSIFICATION (PURE Z-AXIS ONLY: X=0, Y=0)
     ------------------------------------------------------------------------ */

  // Module 1: Front Optics & Flange (+Z: 1.45)
  if (name.includes('lens cap') || name.includes('bayonet') || name.includes('release button')) {
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 1.45));

    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('lens cap font') || name.includes('lens cap.002')) {
      micro.set(0, 0, 0.30);
    } else if (name.includes('lens cap')) {
      micro.set(0, 0, 0.22);
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 3: Top Deck & Controls (-Z: -0.70)
  else if (name.includes('body top') || name.includes('dial') || name.includes('thumb wheel') || name.includes('accessory shoe') || name.includes('main switch') || name.includes('function button')) {
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -0.70));

    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('dial') || name.includes('thumb wheel')) {
      micro.set(0, 0.12, 0); // Dials hover vertically above top deck before snap
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 4: Baseplate & Rear Deck (-Z: -1.40)
  else if (name.includes('body bottom') || name.includes('battery') || name.includes('lcd') || name.includes('eyepiece')) {
    subAssemblySets.BASEPLATE.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -1.40));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 2: Central Magnesium Chassis & Sensor Core (Center Z = 0)
  else {
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0.0));

    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('glass')) {
      micro.set(0, 0, 0.16);
    }
    microExplodeVectors.set(mesh, micro);
  }

  /* ------------------------------------------------------------------------
     CHAPTER ISOLATION SETS (EXCLUSIVE HERO FOCUS)
     ------------------------------------------------------------------------ */
  // Chapter 1: Bayonet Mount ONLY contains Bayonet.005 (the 4-claw stainless steel flange)
  if (name === 'bayonet.005' || name === 'bayonet') {
    subAssemblySets.BAYONET.add(mesh);
  }
  // Chapter 3: Tactile Command ONLY contains Shutter Speed Dial
  else if (name.includes('shutter speed dial')) {
    subAssemblySets.DIALS.add(mesh);
  }
  // Chapter 2: Sensor Engine (Central Chassis, sensor glass, core)
  else if (name.includes('body middle') || name.includes('mesh.052') || name.includes('glass') || name.includes('sensor')) {
    subAssemblySets.SENSOR.add(mesh);
  }
}

// Model Loading with Real-Time Percentage Tracking
const loader = new GLTFLoader();
const modelUrl = './assets/leica_m11_master.glb';

loader.load(
  modelUrl,
  (gltf) => {
    modelRoot = gltf.scene;

    // Center model at origin (0, 0, 0)
    const box = new THREE.Box3().setFromObject(modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    modelRoot.position.sub(center);
    modelRoot.updateMatrixWorld(true);

    // Record individual mesh centers in modelRoot coordinate space for exact centering when isolated
    modelRoot.traverse((child) => {
      if (child.isMesh) {
        const childBox = new THREE.Box3().setFromObject(child);
        meshCenters.set(child, childBox.getCenter(new THREE.Vector3()));
      }
    });

    // Classify all 66 components into 4 Macro Modules & Chapter sets
    modelRoot.traverse(classifyAndAssignVectors);

    scene.add(modelRoot);
    updateFinishMaterials();
    state.isLoaded = true;

    // Complete Preloader Counter & Curtain Reveal
    if (preloaderCounterVal) {
      preloaderCounterVal.textContent = '100';
    } else if (preloaderCounter) {
      preloaderCounter.textContent = '100%';
    }
    if (preloaderBar) {
      preloaderBar.style.transform = 'scaleX(1)';
    }

    setTimeout(() => {
      document.documentElement.classList.remove('is-loading');
      document.body.classList.remove('is-loading');

      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);

      preloader.classList.add('loaded');
      audio.playShutter();

      ScrollTrigger.refresh();

      setTimeout(() => {
        preloader.classList.add('hidden');
        preloader.style.display = 'none';
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();
      }, 1000);
    }, 250);
  },
  (xhr) => {
    if (xhr.lengthComputable && xhr.total > 0) {
      const pct = Math.min(99, Math.round((xhr.loaded / xhr.total) * 100));
      if (preloaderCounterVal) {
        preloaderCounterVal.textContent = `${pct}`;
      } else if (preloaderCounter) {
        preloaderCounter.textContent = `${pct}%`;
      }
      if (preloaderBar) {
        preloaderBar.style.transform = `scaleX(${pct / 100})`;
      }
    }
  },
  (err) => {
    console.error('[ERROR] Failed to load Leica GLB model:', err);
    if (preloaderCounterVal) {
      preloaderCounterVal.textContent = 'ERR';
    }
    document.documentElement.classList.remove('is-loading');
    document.body.classList.remove('is-loading');
    preloader.classList.add('loaded');
    preloader.style.display = 'none';
    ScrollTrigger.refresh();
  }
);

// Safety fallback: ensure scroll is unlocked after 8s even if network stalls
setTimeout(() => {
  if (!state.isLoaded) {
    document.documentElement.classList.remove('is-loading');
    document.body.classList.remove('is-loading');
    preloader.classList.add('loaded');
    preloader.style.display = 'none';
    ScrollTrigger.refresh();
  }
}, 8000);

/* ==========================================================================
   GSAP SCROLLTRIGGER ORCHESTRATION & CINEMATIC CAMERA CHOREOGRAPHY
   ========================================================================== */
const anim = {
  explode: 0.0,       // Macro 4-module Pure Z Explosion (0.0 = assembled, 1.0 = exploded)
  subExplode1: 0.0,   // Bayonet micro-separation (0.0 = flush / assembled, 1.0 = hovering)
  subExplode2: 0.0,   // Sensor micro-separation (0.0 = flush / assembled, 1.0 = hovering)
  subExplode3: 0.0,   // Dials micro-separation (0.0 = flush / assembled, 1.0 = hovering)
  camX: baseCameraPos.x,
  camY: baseCameraPos.y,
  camZ: baseCameraPos.z,
  lookX: baseTargetPos.x,
  lookY: baseTargetPos.y,
  lookZ: baseTargetPos.z,
  modelRotY: 0.20,
  modelRotX: 0.0,
  modelRotZ: 0.0,
  orbitalOpacity: 1.0,
};

function initScrollTriggers() {
  // Section Pinning & Sub-Assembly Isolation Controllers
  const chapterPins = [
    { id: '#chapter-bayonet', key: 'BAYONET', prevKey: null, dwell: '+=160%' },
    { id: '#chapter-sensor', key: 'SENSOR', prevKey: 'BAYONET', dwell: '+=160%' },
    { id: '#chapter-dials', key: 'DIALS', prevKey: 'SENSOR', dwell: '+=140%' },
  ];

  chapterPins.forEach((ch) => {
    // Early Phase Switch Trigger (top 85%) for clean fade & snap-in transition
    ScrollTrigger.create({
      trigger: ch.id,
      start: 'top 85%',
      end: 'bottom 15%',
      onEnter: () => setSubAssemblyFocus(ch.key),
      onLeaveBack: () => setSubAssemblyFocus(ch.prevKey),
    });

    // Pinned inspection dwell for smooth turntable sweep
    ScrollTrigger.create({
      trigger: ch.id,
      start: 'top top',
      end: ch.dwell,
      pin: true,
      pinSpacing: true,
      refreshPriority: 1,
    });
  });

  // Explode Intro return to general view (all 66 components) when scrolling back up
  ScrollTrigger.create({
    trigger: '#explode-intro',
    start: 'top 85%',
    end: 'bottom 50%',
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Phase 3 Reassembly Snap Controller (Model returns to general view)
  ScrollTrigger.create({
    trigger: '#section-assembled',
    start: 'top 70%',
    end: 'bottom 30%',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Chapter 4 Technical Specs (60MP, ±0.02mm, ISO 64) - model stays fully assembled in center safe zone
  ScrollTrigger.create({
    trigger: '#chapter-rangefinder',
    start: 'top 80%',
    end: 'bottom 20%',
    onEnter: () => setSubAssemblyFocus(null),
    onLeaveBack: () => setSubAssemblyFocus(null),
  });

  // Outro Turntable Showcase
  ScrollTrigger.create({
    trigger: '#section-outro',
    start: 'top 80%',
    end: 'bottom bottom',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Master Scroll Timeline spanning the entire experience
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // Smooth inertia scrub
      refreshPriority: 0,
      onUpdate: (self) => {
        const progress = self.progress;
        const currentDetent = Math.floor(progress * 32);
        if (currentDetent !== state.lastDetent) {
          audio.playTick(1.0 + (progress * 0.4));
          state.lastDetent = currentDetent;
        }

        // Single decisive impact snap at progress >= 0.65 (Reassembly transition)
        if (progress >= 0.65) {
          if (!state.snappedClimax) {
            triggerImpactShake();
            audio.playSnap();
            audio.playShutter();
            state.snappedClimax = true;
          }
        } else if (progress < 0.60) {
          state.snappedClimax = false;
        }
      },
    },
  });

  // --- Phase 1, Step 1: Hero Overview Dwell (Model strictly 100% assembled and flush) ---
  tl.to(anim, {
    explode: 0.0,
    subExplode1: 0.0,
    subExplode2: 0.0,
    subExplode3: 0.0,
    camX: baseCameraPos.x,
    camY: baseCameraPos.y,
    camZ: baseCameraPos.z,
    lookX: baseTargetPos.x,
    lookY: baseTargetPos.y,
    lookZ: baseTargetPos.z,
    modelRotY: 0.20,
    modelRotX: 0.02,
    orbitalOpacity: 1.0,
    duration: 1.5,
    ease: 'none',
  })

  // --- Phase 1, Step 2: Extended Slow Z-Explosion (300vh Section) ---
  // Gracefully separates the 4 modules along the optical Z-axis with dramatic perspective
  .to(anim, {
    explode: 1.0,
    subExplode1: 0.0,
    subExplode2: 0.0,
    subExplode3: 0.0,
    camX: -0.55,
    camY: 0.88,
    camZ: 2.22,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.65, // Dramatic 37.2° angle clearly showing separated module slabs
    modelRotX: 0.14, // Elevated pitch exposing gaps between top deck and chassis
    orbitalOpacity: 0.0,
    duration: 3.5, // Extended for slow majestic travel across 300vh
    ease: 'power2.inOut',
  })
  // Suspended in space dwell:
  .to(anim, {
    modelRotY: 0.72,
    duration: 1.2,
    ease: 'none',
  })

  // --- Phase 2, Chapter 1: Bayonet Mount (Safe Centered Macro Framing camZ: 0.75m) ---
  // Only Bayonet.005 flange is centered at (0, 0, 0), no lens cap, no right lever
  .to(anim, {
    camX: 0.0,
    camY: 0.06,
    camZ: 0.75,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.0,
    modelRotY: -0.22,
    modelRotX: 0.08,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // Turntable inspection sweep catching stainless steel reflections:
  .to(anim, {
    modelRotY: 0.25,
    modelRotX: 0.12,
    duration: 1.4,
    ease: 'none',
  })

  // --- Phase 2, Chapter 2: 60MP Sensor Core & Magnesium Chassis (camZ: 0.70m) ---
  .to(anim, {
    camX: 0.0,
    camY: 0.0,
    camZ: 0.70,
    lookX: 0.0,
    lookY: -0.02,
    lookZ: 0.0,
    modelRotY: -0.25,
    modelRotX: -0.04,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // Turntable inspection sweep catching sapphire glass and contacts:
  .to(anim, {
    modelRotY: 0.28,
    modelRotX: 0.12,
    duration: 1.4,
    ease: 'none',
  })

  // --- Phase 2, Chapter 3: Tactile Command (ONLY Shutter Speed Dial Centered at Origin) ---
  // Single hero dial centered at (0, 0, 0), elevated top-down view over knurling & numbers:
  .to(anim, {
    camX: 0.0,
    camY: 0.52,
    camZ: 0.65,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.0,
    modelRotY: -0.22,
    modelRotX: 0.52,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // Turntable inspection sweep catching diamond knurling reflections:
  .to(anim, {
    modelRotY: 0.26,
    modelRotX: 0.50,
    duration: 1.4,
    ease: 'none',
  })

  // --- Phase 3: Seamless Reassembly Snap (BEFORE Chapter 4 Technical Specs) ---
  // Components pull back into exploded hover before snap:
  .to(anim, {
    explode: 0.65,
    camX: -0.30,
    camY: 0.70,
    camZ: 1.55,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.28,
    modelRotX: 0.06,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // SINGLE DECISIVE IMPACT: All 66 components snap completely flush into solid camera!
  .to(anim, {
    explode: 0.0,
    camZ: 1.48,
    modelRotX: 0.0,
    duration: 0.4,
    ease: 'back.out(2.0)',
  })
  .to(anim, {
    duration: 0.4,
    ease: 'none',
  })

  // --- Phase 3: Chapter 4 — Technical Specs (60MP, ±0.02mm, ISO 64) ---
  // Model is ALREADY 100% assembled. Dwells in center safe zone above stats cards, rotates gently ±12°:
  .to(anim, {
    camX: 0.0,
    camY: 0.44,
    camZ: 1.48,
    lookX: 0.0,
    lookY: 0.14,
    lookZ: 0.0,
    modelRotY: 0.0,
    modelRotX: 0.02,
    duration: 0.6,
    ease: 'power2.inOut',
  })
  // Gentle showcase turn to the left (-12° = -0.21 rad):
  .to(anim, {
    modelRotY: -0.21,
    duration: 0.9,
    ease: 'power1.inOut',
  })
  // Gentle showcase turn to the right (+12° = +0.21 rad):
  .to(anim, {
    modelRotY: 0.21,
    duration: 0.9,
    ease: 'power1.inOut',
  })
  // Return to front center:
  .to(anim, {
    modelRotY: 0.0,
    duration: 0.4,
    ease: 'power1.out',
  })

  // --- Phase 4: Outro Showcase (180vh Section, Slow Elegant Turntable Rotation) ---
  // Top 55% reserved for 3D model, bottom 45% for typography & buttons:
  .to(anim, {
    explode: 0.0,
    camX: 0.0,
    camY: 0.06,
    camZ: 1.62,
    lookX: 0.0,
    lookY: -0.20,
    lookZ: 0.0,
    modelRotX: 0.0,
    orbitalOpacity: 1.0,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // Majestic continuous slow turntable rotation:
  .to(anim, {
    modelRotY: Math.PI * 2.0, // Full 360° elegant revolution
    duration: 4.0, // Slow graceful turntable
    ease: 'none',
  });
}

// Initialize scroll triggers immediately so native scroll and animations are active from start
initScrollTriggers();

/* ==========================================================================
   CONTINUOUS ELASTIC MOUSE ORBIT & DYNAMIC KEY LIGHT
   ========================================================================== */
window.addEventListener('pointermove', (e) => {
  state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* ==========================================================================
   INTERACTIVE BUTTON ACTIONS
   ========================================================================== */
// Replay Button (Smooth scroll back to top)
if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    audio.playShutter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Real-Time Finish Switcher (Stealth Black <-> Classic Silver Chrome)
if (btnToggleFinish) {
  btnToggleFinish.addEventListener('click', () => {
    audio.playTick(1.2);
    if (state.finish === 'black') {
      state.finish = 'silver';
      if (btnFinishLabel) {
        btnFinishLabel.textContent = 'Finish: Classic Silver';
      }
    } else {
      state.finish = 'black';
      if (btnFinishLabel) {
        btnFinishLabel.textContent = 'Finish: Stealth Black';
      }
    }
    updateFinishMaterials();
  });
}

/* ==========================================================================
   MAIN RENDER LOOP (60 FPS ON-DEMAND OPTIMIZED)
   ========================================================================== */
const lookTarget = new THREE.Vector3();

function render() {
  requestAnimationFrame(render);

  if (state.isLoaded && modelRoot) {
    // 1. Mouse Parallax Spring Damping
    state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.05;
    state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.05;

    // 2. Parallax Watermark Backdrop Drift
    if (watermarkInner) {
      watermarkInner.style.transform = `translate(${-state.mouse.x * 25}px, ${-state.mouse.y * 15}px)`;
    }

    // 3. Dynamic Specular Key Light Tracking
    keyLight.position.set(
      2.4 + state.mouse.x * 1.5,
      3.5 + state.mouse.y * 1.2,
      3.0
    );

    // 4. Edolus Orbital Coordinate Ring Rotation & Opacity
    if (orbitalRing) {
      orbitalRing.rotation.z += 0.003;
      orbitalRingMat.opacity = anim.orbitalOpacity * 0.16;
    }

    // 5. Adaptive Mouse Parallax (Gentle scaling by camera zoomFactor)
    const zoomFactor = Math.min(1.0, Math.max(0.25, anim.camZ / 2.0));

    camera.position.x = anim.camX + (state.mouse.x * 0.035 * zoomFactor);
    camera.position.y = anim.camY + (state.mouse.y * 0.035 * zoomFactor);
    camera.position.z = anim.camZ;

    lookTarget.set(anim.lookX, anim.lookY, anim.lookZ);

    // Camera Micro-Shake on Single Decisive Impact (100ms)
    if (shakeIntensity > 0.0002) {
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.86;
    }

    camera.lookAt(lookTarget);

    // 6. Elastic 3D Model Orbit (Restrained scaling by zoomFactor)
    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.15 * zoomFactor);
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.10 * zoomFactor);
    modelRoot.rotation.z = anim.modelRotZ;

    // 7. Component Explosion & Sub-Assembly Isolation Geometry
    moduleExplodeVectors.forEach((modVec, mesh) => {
      const orig = originalTransforms.get(mesh);
      const micro = microExplodeVectors.get(mesh);
      if (!orig || !mesh.visible) return;

      // When fully assembled and no chapter is active, lock strictly to original CAD transform
      if (anim.explode === 0.0 && state.activeSubAssembly === null) {
        mesh.position.copy(orig.position);
        mesh.rotation.copy(orig.rotation);
        mesh.currentMacroZ = 0.0;
        mesh.currentOffsetX = 0.0;
        mesh.currentOffsetY = 0.0;
        mesh.currentOffsetZ = 0.0;
        return;
      }

      // Exact centering for single featured components when chapter is isolated:
      let targetOffsetX = 0;
      let targetOffsetY = 0;
      let targetOffsetZ = 0;

      if (state.activeSubAssembly === 'BAYONET' && subAssemblySets.BAYONET.has(mesh)) {
        const c = meshCenters.get(mesh);
        if (c) {
          targetOffsetX = -c.x;
          targetOffsetY = -c.y;
          targetOffsetZ = -c.z;
        }
      } else if (state.activeSubAssembly === 'DIALS' && subAssemblySets.DIALS.has(mesh)) {
        const c = meshCenters.get(mesh);
        if (c) {
          targetOffsetX = -c.x;
          targetOffsetY = -c.y;
          targetOffsetZ = -c.z;
        }
      }

      if (mesh.currentOffsetX === undefined) {
        mesh.currentOffsetX = targetOffsetX;
        mesh.currentOffsetY = targetOffsetY;
        mesh.currentOffsetZ = targetOffsetZ;
      } else {
        mesh.currentOffsetX += (targetOffsetX - mesh.currentOffsetX) * 0.14;
        mesh.currentOffsetY += (targetOffsetY - mesh.currentOffsetY) * 0.14;
        mesh.currentOffsetZ += (targetOffsetZ - mesh.currentOffsetZ) * 0.14;
      }

      const isIsolated = state.activeSubAssembly !== null;
      const targetMacroZ = isIsolated ? 0.0 : modVec.z * anim.explode;

      if (mesh.currentMacroZ === undefined) {
        mesh.currentMacroZ = targetMacroZ;
      } else {
        mesh.currentMacroZ += (targetMacroZ - mesh.currentMacroZ) * 0.14;
      }

      // Micro component movement during chapter inspections
      let microX = 0, microY = 0, microZ = 0;
      if (micro) {
        if (subAssemblySets.BAYONET.has(mesh)) {
          microX = micro.x * anim.subExplode1;
          microY = micro.y * anim.subExplode1;
          microZ = micro.z * anim.subExplode1;
        } else if (subAssemblySets.SENSOR.has(mesh)) {
          microX = micro.x * anim.subExplode2;
          microY = micro.y * anim.subExplode2;
          microZ = micro.z * anim.subExplode2;
        } else if (subAssemblySets.DIALS.has(mesh)) {
          microX = micro.x * anim.subExplode3;
          microY = micro.y * anim.subExplode3;
          microZ = micro.z * anim.subExplode3;
        }
      }

      mesh.position.x = orig.position.x + mesh.currentOffsetX + microX;
      mesh.position.y = orig.position.y + mesh.currentOffsetY + microY;
      mesh.position.z = orig.position.z + (isIsolated ? mesh.currentOffsetZ : mesh.currentMacroZ) + microZ;
    });

    // Sound Snap detents for Sub-Assemblies
    if (anim.subExplode1 < 0.08 && !state.snappedSub1) {
      audio.playSnap();
      state.snappedSub1 = true;
    } else if (anim.subExplode1 > 0.20) {
      state.snappedSub1 = false;
    }

    if (anim.subExplode2 < 0.08 && !state.snappedSub2) {
      audio.playSnap();
      state.snappedSub2 = true;
    } else if (anim.subExplode2 > 0.20) {
      state.snappedSub2 = false;
    }

    if (anim.subExplode3 < 0.08 && !state.snappedSub3) {
      audio.playSnap();
      state.snappedSub3 = true;
    } else if (anim.subExplode3 > 0.20) {
      state.snappedSub3 = false;
    }
  }

  renderer.render(scene, camera);
}

// Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ScrollTrigger.refresh();
});

// Kick off Render Loop
render();
