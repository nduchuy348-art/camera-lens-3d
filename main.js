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
  hotspotsVisible: false,
  isMacroZoomed: false,
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

const hotspotViewfinder = document.getElementById('hotspot-viewfinder');
const hotspotShutter = document.getElementById('hotspot-shutter');
const hotspotBadge = document.getElementById('hotspot-badge');

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

let modelRoot = null;
const bodyPlates = [];
const dialMeshes = [];
let leatheretteMesh = null;

// Macro Sub-Assemblies
const subAssemblySets = {
  BAYONET: new Set(),   // Module 1: Front Cap & Bayonet Mount (+Z)
  SENSOR: new Set(),    // Module 2: Central Magnesium Chassis & 60MP Core (Z = 0)
  DIALS: new Set(),     // Module 3: Top Deck & Control Dials (-Z)
  BASEPLATE: new Set(), // Module 4: Baseplate & Rear LCD (-Z)
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
    if (subAssemblySets.BAYONET.has(mesh)) {
      op = subOpacities.BAYONET;
    } else if (subAssemblySets.SENSOR.has(mesh)) {
      op = subOpacities.SENSOR;
    } else if (subAssemblySets.DIALS.has(mesh)) {
      op = subOpacities.DIALS;
    } else if (subAssemblySets.BASEPLATE.has(mesh)) {
      op = subOpacities.BASEPLATE;
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
    BASEPLATE: (key === null) ? 1.0 : 0.0,
  };

  if (subOpacityTween) subOpacityTween.kill();
  subOpacityTween = gsap.to(subOpacities, {
    BAYONET: targets.BAYONET,
    SENSOR: targets.SENSOR,
    DIALS: targets.DIALS,
    BASEPLATE: targets.BASEPLATE,
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

  // Module 1: Front Cap & Bayonet Mount (+Z)
  if (name.includes('lens cap') || name.includes('bayonet') || name.includes('release button') || name.includes('selector') || name.includes('badge')) {
    subAssemblySets.BAYONET.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 1.45));

    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('lens cap font') || name.includes('lens cap.002')) {
      micro.set(0, 0, 0.30);
    } else if (name.includes('lens cap')) {
      micro.set(0, 0, 0.22);
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 3: Top Deck & Control Dials (-Z)
  else if (name.includes('body top') || name.includes('dial') || name.includes('thumb wheel') || name.includes('accessory shoe') || name.includes('main switch') || name.includes('function button')) {
    subAssemblySets.DIALS.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -0.70));

    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('dial') || name.includes('thumb wheel')) {
      micro.set(0, 0.12, 0); // Dials hover vertically above top deck before snap
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 4: Baseplate & Rear LCD (-Z)
  else if (name.includes('body bottom') || name.includes('battery') || name.includes('lcd') || name.includes('eyepiece')) {
    subAssemblySets.BASEPLATE.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -1.40));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 2: Central Magnesium Chassis & 60MP Core (Center Z = 0)
  else {
    subAssemblySets.SENSOR.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0.0));

    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('glass')) {
      micro.set(0, 0, 0.16);
    }
    microExplodeVectors.set(mesh, micro);
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

    // Classify all 66 components into 4 Macro Modules
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

  // Chapter 4 Rangefinder Heritage return to general view (all 66 components)
  ScrollTrigger.create({
    trigger: '#chapter-rangefinder',
    start: 'top 85%',
    end: 'bottom top',
    onEnter: () => setSubAssemblyFocus(null),
    onLeaveBack: () => setSubAssemblyFocus('DIALS'),
  });

  // Dedicated Phase 3 Reassembly & Hotspots Controller
  ScrollTrigger.create({
    trigger: '#section-assembled',
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => {
      setSubAssemblyFocus(null);
    },
    onLeave: () => {
      state.hotspotsVisible = false;
      toggleHotspots(false);
      resetMacroZoom();
    },
    onEnterBack: () => {
      setSubAssemblyFocus(null);
    },
    onLeaveBack: () => {
      state.hotspotsVisible = false;
      toggleHotspots(false);
      resetMacroZoom();
    },
  });

  // Master Scroll Timeline spanning the entire experience (calibrated for snap at progress >= 0.78)
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // Smooth inertia scrub
      refreshPriority: 0,
      onUpdate: (self) => {
        const progress = self.progress;
        const currentDetent = Math.floor(progress * 28);
        if (currentDetent !== state.lastDetent) {
          audio.playTick(1.0 + (progress * 0.4));
          state.lastDetent = currentDetent;
        }

        // Single decisive impact snap at progress >= 0.78
        if (progress >= 0.78) {
          if (!state.snappedClimax) {
            triggerImpactShake();
            audio.playSnap();
            audio.playShutter();
            state.snappedClimax = true;
          }
          if (!state.hotspotsVisible) {
            state.hotspotsVisible = true;
            toggleHotspots(true);
          }
        } else {
          if (progress < 0.74) {
            state.snappedClimax = false;
          }
          if (state.hotspotsVisible) {
            state.hotspotsVisible = false;
            toggleHotspots(false);
          }
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

  // --- Phase 1, Step 2: Extended Slow Z-Explosion (220vh Section) ---
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
    duration: 2.5,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 1: Bayonet Mount & Coupling (Safe Macro Framing camZ: 0.70m) ---
  // Flight in to safe macro framing (0.70m distance, no cap clipping):
  .to(anim, {
    subExplode1: 1.0,
    camX: -0.18,
    camY: 0.12,
    camZ: 0.70,
    lookX: 0.063,
    lookY: -0.046,
    lookZ: 0.0,
    modelRotY: -0.28,
    modelRotX: 0.06,
    duration: 0.6,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Cap slides and snaps onto bayonet flange
  .to(anim, {
    subExplode1: 0.0,
    duration: 0.6,
    ease: 'back.out(1.5)',
  })
  // Inspection Dwell: Smooth 35° rotation sweep, no clipping
  .to(anim, {
    modelRotY: 0.35,
    modelRotX: 0.10,
    duration: 1.0,
    ease: 'none',
  })
  // Arc transition toward central chassis:
  .to(anim, {
    camX: -0.05,
    camY: 0.08,
    camZ: 0.75,
    duration: 0.4,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 2: 60MP Sensor Core & Magnesium Chassis (camZ: 0.65m) ---
  // Flight in to safe macro framing:
  .to(anim, {
    subExplode2: 1.0,
    camX: 0.12,
    camY: 0.0,
    camZ: 0.65,
    lookX: 0.0,
    lookY: -0.04,
    lookZ: 0.0,
    modelRotY: -0.25,
    modelRotX: -0.06,
    duration: 0.6,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Sapphire glass slides and snaps into sensor cavity
  .to(anim, {
    subExplode2: 0.0,
    duration: 0.6,
    ease: 'back.out(1.5)',
  })
  // Inspection Dwell: 30° rotation sweep catching pebbled leatherette & sapphire glints
  .to(anim, {
    modelRotY: 0.28,
    modelRotX: 0.14,
    duration: 1.0,
    ease: 'none',
  })
  // Climbing arc transition toward top deck:
  .to(anim, {
    camX: -0.08,
    camY: 0.55,
    camZ: 0.70,
    duration: 0.4,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 3: Tactile Controls & Top Deck Dials (camY: 0.85m, camZ: 0.65m, pitch 52°) ---
  // Flight in: Climbs to 52° elevated top-down view over dials prominently centered:
  .to(anim, {
    subExplode3: 1.0,
    camX: -0.10,
    camY: 0.85,
    camZ: 0.65,
    lookX: 0.0,
    lookY: 0.22,
    lookZ: 0.0,
    modelRotY: -0.20,
    modelRotX: 0.48,
    duration: 0.6,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Knurled dials drop into CNC wells and snap
  .to(anim, {
    subExplode3: 0.0,
    duration: 0.6,
    ease: 'back.out(1.5)',
  })
  // Inspection Dwell: Diamond knurling reflections sweep across dials
  .to(anim, {
    modelRotY: 0.25,
    modelRotX: 0.46,
    duration: 0.8,
    ease: 'none',
  })
  // Transition toward front badge:
  .to(anim, {
    camX: 0.0,
    camY: 0.45,
    camZ: 0.85,
    duration: 0.4,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 4: Rangefinder Heritage & Red Dot Centering ---
  // Model fully assembled and closed, camera lookTarget centers exactly on the red dot badge (0.062, 0.195, 0.101)
  // Camera orbits ±10° around the red dot badge:
  .to(anim, {
    explode: 0.0,
    camX: -0.086,
    camY: 0.195,
    camZ: 0.938,
    lookX: 0.062,
    lookY: 0.195,
    lookZ: 0.101,
    modelRotY: 0.0,
    modelRotX: 0.0,
    duration: 0.6,
    ease: 'power2.inOut',
  })
  // Dwell & gently orbits ±10° around the red dot:
  .to(anim, {
    camX: 0.210,
    camY: 0.195,
    camZ: 0.938,
    lookX: 0.062,
    lookY: 0.195,
    lookZ: 0.101,
    duration: 0.8,
    ease: 'none',
  })

  // --- Phase 3: Synthesis Climax Reassembly ---
  // Hover apart before decisive impact:
  .to(anim, {
    explode: 0.65,
    camX: -0.30,
    camY: 0.70,
    camZ: 1.55,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.28,
    modelRotX: 0.05,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // SINGLE DECISIVE IMPACT (At progress >= 0.78): All 66 components snap flush!
  .to(anim, {
    explode: 0.0,
    camZ: 1.48,
    modelRotX: 0.0,
    duration: 0.4,
    ease: 'back.out(2.0)',
  })
  .to(anim, {
    duration: 0.6,
    ease: 'none',
  })

  // --- Phase 4: Outro Showcase (Vertical Stack Layout: Top 55% Viewport) ---
  .to(anim, {
    explode: 0.0,
    camX: 0.0,
    camY: 0.08,
    camZ: 1.65,
    lookX: 0.0,
    lookY: -0.22,
    lookZ: 0.0,
    modelRotY: 0.0,
    modelRotX: 0.0,
    orbitalOpacity: 1.0,
    duration: 2.8,
    ease: 'power2.out',
  });
}

// Initialize scroll triggers immediately so native scroll and animations are active from start
initScrollTriggers();

function toggleHotspots(visible) {
  const display = visible ? 'block' : 'none';
  if (hotspotViewfinder) hotspotViewfinder.style.display = display;
  if (hotspotShutter) hotspotShutter.style.display = display;
  if (hotspotBadge) hotspotBadge.style.display = display;
}

/* ==========================================================================
   HOTSPOTS 3D-TO-2D SCREEN PROJECTION & MACRO INSPECT ZOOM
   ========================================================================== */
const hotspotPositions = {
  viewfinder: new THREE.Vector3(0.308, 0.190, 0.098),
  shutter: new THREE.Vector3(-0.157, 0.256, 0.003),
  badge: new THREE.Vector3(0.062, 0.195, 0.101),
};

const tempVec = new THREE.Vector3();

function updateHotspotPositions() {
  if (!state.hotspotsVisible || !modelRoot) return;

  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;

  // Viewfinder
  tempVec.copy(hotspotPositions.viewfinder);
  tempVec.applyMatrix4(modelRoot.matrixWorld);
  tempVec.project(camera);
  if (hotspotViewfinder) {
    hotspotViewfinder.style.left = `${(tempVec.x * widthHalf) + widthHalf}px`;
    hotspotViewfinder.style.top = `${-(tempVec.y * heightHalf) + heightHalf}px`;
  }

  // Shutter Dial
  tempVec.copy(hotspotPositions.shutter);
  tempVec.applyMatrix4(modelRoot.matrixWorld);
  tempVec.project(camera);
  if (hotspotShutter) {
    hotspotShutter.style.left = `${(tempVec.x * widthHalf) + widthHalf}px`;
    hotspotShutter.style.top = `${-(tempVec.y * heightHalf) + heightHalf}px`;
  }

  // Red Badge
  tempVec.copy(hotspotPositions.badge);
  tempVec.applyMatrix4(modelRoot.matrixWorld);
  tempVec.project(camera);
  if (hotspotBadge) {
    hotspotBadge.style.left = `${(tempVec.x * widthHalf) + widthHalf}px`;
    hotspotBadge.style.top = `${-(tempVec.y * heightHalf) + heightHalf}px`;
  }
}

// Macro Inspect Zoom on Hotspot Click
function zoomToHotspot(targetKey) {
  if (!hotspotPositions[targetKey] || !modelRoot) return;

  state.isMacroZoomed = true;
  audio.playShutter();

  const worldPos = hotspotPositions[targetKey].clone().applyMatrix4(modelRoot.matrixWorld);

  gsap.to(camera.position, {
    x: worldPos.x + 0.15,
    y: worldPos.y + 0.15,
    z: worldPos.z + 0.55,
    duration: 1.2,
    ease: 'power3.inOut',
  });

  gsap.to(lookTarget, {
    x: worldPos.x,
    y: worldPos.y,
    z: worldPos.z,
    duration: 1.2,
    ease: 'power3.inOut',
  });
}

function resetMacroZoom() {
  if (!state.isMacroZoomed) return;
  state.isMacroZoomed = false;
  audio.playTick(0.9);

  gsap.to(camera.position, {
    x: anim.camX,
    y: anim.camY,
    z: anim.camZ,
    duration: 1.0,
    ease: 'power2.out',
  });

  gsap.to(lookTarget, {
    x: anim.lookX,
    y: anim.lookY,
    z: anim.lookZ,
    duration: 1.0,
    ease: 'power2.out',
  });
}

// Click Hotspot Listeners
[hotspotViewfinder, hotspotShutter, hotspotBadge].forEach((el) => {
  if (el) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = el.getAttribute('data-target');
      if (target) zoomToHotspot(target);
    });
  }
});

// Click outside or press ESC to reset macro zoom
window.addEventListener('click', () => {
  if (state.isMacroZoomed) resetMacroZoom();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.isMacroZoomed) resetMacroZoom();
});

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

    if (!state.isMacroZoomed) {
      camera.position.x = anim.camX + (state.mouse.x * 0.035 * zoomFactor);
      camera.position.y = anim.camY + (state.mouse.y * 0.035 * zoomFactor);
      camera.position.z = anim.camZ;

      lookTarget.set(anim.lookX, anim.lookY, anim.lookZ);
    }

    // Camera Micro-Shake on Single Decisive Impact (100ms)
    if (shakeIntensity > 0.0002) {
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.86;
    }

    camera.lookAt(lookTarget);

    // 6. Elastic 3D Model Orbit (Restrained scaling by zoomFactor)
    // During Chapter 4 (Rangefinder / Red Dot Centering), keep model steady so badge stays pinned in reticle!
    const isRedDotCentering = (anim.lookX === 0.062 && anim.lookY === 0.195 && anim.lookZ === 0.101);
    const modelOrbitScale = isRedDotCentering ? 0.0 : 1.0;

    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.15 * zoomFactor * modelOrbitScale);
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.10 * zoomFactor * modelOrbitScale);
    modelRoot.rotation.z = anim.modelRotZ;

    // 7. Component Explosion & Sub-Assembly Isolation Geometry
    moduleExplodeVectors.forEach((modVec, mesh) => {
      const orig = originalTransforms.get(mesh);
      const micro = microExplodeVectors.get(mesh);
      if (!orig || !mesh.visible) return;

      // When fully assembled (Hero or reassembly), lock strictly to original CAD transform
      if (anim.explode === 0.0 && anim.subExplode1 === 0.0 && anim.subExplode2 === 0.0 && anim.subExplode3 === 0.0) {
        mesh.position.copy(orig.position);
        mesh.rotation.copy(orig.rotation);
        mesh.currentMacroZ = 0.0;
        return;
      }

      // Smooth Z-centering: when isolated, glide smoothly to 0.0; when general, glide to modVec.z * anim.explode
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

      mesh.position.x = orig.position.x + microX;
      mesh.position.y = orig.position.y + microY;
      mesh.position.z = orig.position.z + mesh.currentMacroZ + microZ;
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

    // 8. Update Hotspot 2D Screen Projections
    updateHotspotPositions();
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
