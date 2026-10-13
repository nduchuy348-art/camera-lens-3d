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
  snappedSub1: false,
  snappedSub2: false,
  snappedSub3: false,
  snappedClimax: false,
  mouse: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  },
  lastDetent: -1,
};

// DOM References
const canvas = document.getElementById('webgl-canvas');
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloader-counter');
const preloaderCounterVal = document.getElementById('preloader-counter-val');
const preloaderBar = document.getElementById('preloader-bar');
const watermarkInner = document.getElementById('watermark-inner');
const leaderLine = document.getElementById('leader-line');
const leaderPoint = document.getElementById('leader-point');

const hotspotViewfinder = document.getElementById('hotspot-viewfinder');
const hotspotShutter = document.getElementById('hotspot-shutter');
const hotspotBadge = document.getElementById('hotspot-badge');

const btnReplay = document.getElementById('btn-replay');
const btnToggleFinish = document.getElementById('btn-toggle-finish');

/* ==========================================================================
   SMOOTH SCROLL (LENIS) & GSAP INTEGRATION
   ========================================================================== */
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.35,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
});
lenis.stop(); // Temporarily stopped until model and assets finish loading

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

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
const baseCameraPos = new THREE.Vector3(-0.30, 0.78, 1.50);
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
renderer.toneMappingExposure = 1.18;

// Lighting Suite
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.90);
scene.add(ambientLight);

// Key Light (Specular Highlight Tracker from upper-right front)
const keyLight = new THREE.DirectionalLight(0xFFFBF5, 3.2);
keyLight.position.set(2.4, 3.5, 3.0);
scene.add(keyLight);

// Fill Light (Soft Cool Ambient Left)
const fillLight = new THREE.DirectionalLight(0xF0F4FF, 1.5);
fillLight.position.set(-2.8, 2.2, 2.0);
scene.add(fillLight);

// Rim / Top Bevel Light (Sharp Edge Chamfer Highlights from back-above)
const rimLight = new THREE.DirectionalLight(0xF8FAFC, 2.4);
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
  tex.repeat.set(10, 10);
});
leatheretteDiffuse.colorSpace = THREE.SRGBColorSpace;

const matLeatherette = new THREE.MeshStandardMaterial({
  map: leatheretteDiffuse,
  normalMap: leatheretteNormal,
  normalScale: new THREE.Vector2(1.5, 1.5),
  roughnessMap: leatheretteRoughness,
  roughness: 0.85,
  metalness: 0.05,
  color: new THREE.Color(0x202022),
});

// 2. Precision Diamond Knurled Normal Map for Top Deck Dials
const knurledNormal = textureLoader.load('./assets/knurled_normal.png');
knurledNormal.wrapS = THREE.RepeatWrapping;
knurledNormal.wrapT = THREE.RepeatWrapping;
knurledNormal.repeat.set(16, 2);

// Dials in Stealth Black Finish
const matBlackKnurledDial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x222426),
  metalness: 0.88,
  roughness: 0.28,
  normalMap: knurledNormal,
  normalScale: new THREE.Vector2(1.6, 1.6),
});

// Dials in Classic Silver Chrome Finish
const matSilverKnurledDial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xDEE0E4),
  metalness: 0.96,
  roughness: 0.20,
  normalMap: knurledNormal,
  normalScale: new THREE.Vector2(1.6, 1.6),
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

function updateFinishMaterials() {
  const isSilver = state.finish === 'silver';
  bodyPlates.forEach((mesh) => {
    mesh.material = isSilver ? matSilverChrome : matBlackAnodized;
  });
  dialMeshes.forEach((mesh) => {
    mesh.material = isSilver ? matSilverKnurledDial : matBlackKnurledDial;
  });
  if (leatheretteMesh) {
    leatheretteMesh.material = matLeatherette;
  }
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
  if (name.includes('mesh.052') || (name.includes('middle') && mesh.geometry)) {
    leatheretteMesh = mesh;
    mesh.material = matLeatherette;
  }

  originalMaterials.set(mesh, mesh.material);

  /* ------------------------------------------------------------------------
     4 MACRO MODULE CLASSIFICATION (PURE Z-AXIS ONLY: X=0, Y=0)
     Small parts stay assembled on their parent module during Phase 1.
     ------------------------------------------------------------------------ */

  // Module 1: Front Cap & Bayonet Mount (+Z)
  if (name.includes('lens cap') || name.includes('bayonet') || name.includes('release button') || name.includes('selector') || name.includes('badge')) {
    subAssemblySets.BAYONET.add(mesh);
    // Pure Z-axis macro explosion offset: +1.45m
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 1.45));

    // Micro separation within Module 1 during Chapter 1 inspection
    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('lens cap font') || name.includes('lens cap.002')) {
      micro.set(0, 0, 0.40);
    } else if (name.includes('lens cap')) {
      micro.set(0, 0, 0.30);
    } else if (name.includes('badge')) {
      micro.set(0, 0, 0.12);
    } else if (name.includes('release button') || name.includes('selector')) {
      micro.set(0, 0, -0.08);
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 3: Top Deck & Control Dials (-Z)
  else if (name.includes('body top') || name.includes('dial') || name.includes('thumb wheel') || name.includes('accessory shoe') || name.includes('main switch') || name.includes('function button')) {
    subAssemblySets.DIALS.add(mesh);
    // Pure Z-axis macro explosion offset: -0.65m
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -0.65));

    // Micro separation within Module 3 during Chapter 3 inspection
    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('dial')) {
      micro.set(0, 0.18, 0); // Dials hover vertically above top deck before snap
    } else if (name.includes('switch') || name.includes('function button')) {
      micro.set(0, 0.14, 0);
    } else if (name.includes('accessory shoe')) {
      micro.set(0, 0.12, 0);
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 4: Baseplate & Rear LCD (-Z)
  else if (name.includes('body bottom') || name.includes('battery') || name.includes('lcd') || name.includes('eyepiece')) {
    subAssemblySets.BASEPLATE.add(mesh);
    // Pure Z-axis macro explosion offset: -1.35m
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -1.35));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 2: Central Magnesium Chassis & 60MP Core (Center Z = 0)
  else {
    subAssemblySets.SENSOR.add(mesh);
    // Pure Z-axis macro explosion offset: Center Z = 0 (anchor)
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0.0));

    // Micro separation within Module 2 during Chapter 2 inspection
    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('glass')) {
      micro.set(0, 0, 0.22);
    } else if (name.includes('sensor') || name.includes('plane')) {
      micro.set(0, 0, 0.10);
    }
    microExplodeVectors.set(mesh, micro);
  }
}

function setMeshOpacity(mesh, opacity) {
  if (!mesh.material) return;
  const isGlass = mesh.name.toLowerCase().includes('glass');
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => {
      m.transparent = isGlass || opacity < 0.98;
      m.opacity = isGlass ? Math.min(m.opacity, opacity) : opacity;
    });
  } else {
    mesh.material.transparent = isGlass || opacity < 0.98;
    mesh.material.opacity = isGlass ? Math.min(mesh.material.opacity, opacity) : opacity;
  }
}

// Sub-Assembly Complete Isolation Controller
function setSubAssemblyFocus(key) {
  state.activeSubAssembly = key;
  if (!modelRoot) return;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;

    if (!key) {
      // Full Camera View: All 4 modules visible
      obj.visible = true;
      setMeshOpacity(obj, 1.0);
    } else {
      const activeSet = subAssemblySets[key];
      if (activeSet && activeSet.has(obj)) {
        obj.visible = true;
        setMeshOpacity(obj, 1.0);
      } else {
        // Hide non-relevant modules during chapter macro inspection
        obj.visible = false;
      }
    }
  });

  updateFinishMaterials();
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
    setSubAssemblyFocus(null);
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
      // 1. Remove is-loading so scroll container becomes active
      document.documentElement.classList.remove('is-loading');
      document.body.classList.remove('is-loading');

      // 2. Initialize triggers now that container has full dimensions
      initScrollTriggers();

      // 3. Play shutter sound and start curtain opening animation
      preloader.classList.add('loaded');
      audio.playShutter();

      // 4. Start Lenis smooth scroll
      lenis.start();
      ScrollTrigger.refresh();

      // 5. Completely hide preloader element after curtain transition completes
      setTimeout(() => {
        preloader.classList.add('hidden');
        preloader.style.display = 'none';
        ScrollTrigger.refresh();
      }, 1200);
    }, 350);
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
  }
);

/* ==========================================================================
   GSAP SCROLLTRIGGER ORCHESTRATION & CINEMATIC CAMERA CHOREOGRAPHY
   ========================================================================== */
const anim = {
  explode: 0.0,       // Macro 4-module Pure Z Explosion (0.0 = assembled, 1.0 = exploded)
  subExplode1: 1.0,   // Bayonet micro-separation (1.0 = hovering, 0.0 = snapped)
  subOpacity1: 1.0,
  subExplode2: 1.0,   // Sensor micro-separation
  subOpacity2: 0.0,
  subExplode3: 1.0,   // Dials micro-separation
  subOpacity3: 0.0,
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
  // Master Scroll Timeline spanning the entire experience
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // Smooth inertia scrub
      onUpdate: (self) => {
        const progress = self.progress;
        const currentDetent = Math.floor(progress * 28);
        if (currentDetent !== state.lastDetent) {
          audio.playTick(1.0 + (progress * 0.4));
          state.lastDetent = currentDetent;
        }
      },
    },
  });

  // --- Phase 1: Pure Z 4-Module Explosion (Hero -> Explode Intro) ---
  // Pure coaxial explosion along optical Z-axis only (X=0, Y=0).
  // Module 1 (+Z), Module 2 (0), Module 3 (-Z), Module 4 (-Z)
  tl.to(anim, {
    explode: 1.0,
    camX: -0.42,
    camY: 0.85,
    camZ: 2.10,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.45, // Dramatic angle showcasing the 4 separated module slabs
    modelRotX: 0.0,
    orbitalOpacity: 0.0,
    duration: 2.8,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 1: Bayonet Mount & Coupling (Cinematic flight into Module 1) ---
  .to(anim, {
    subOpacity1: 1.0,  // Bayonet cluster active
    subExplode1: 1.0,  // Cap hovering slightly forward
    camX: -0.22,
    camY: 0.22,
    camZ: 0.52,        // Ultra-close stop (~0.34m)
    lookX: 0.02,
    lookY: -0.02,
    lookZ: 0.12,
    modelRotY: -0.25,  // 45° dynamic oblique tilt
    modelRotX: 0.06,
    duration: 1.0,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Lens cap flies together and SNAPS onto bayonet flange!
  .to(anim, {
    subExplode1: 0.0,
    duration: 1.2,
    ease: 'back.out(1.4)',
  })
  // Inspection Dwell: Dramatic 70° angular sweep across claws and stainless steel flange!
  .to(anim, {
    modelRotY: 0.45, // Dramatic angular sweep across scroll to catch specular highlights!
    modelRotX: 0.10,
    duration: 2.4,
    ease: 'none',
  })
  // Exit & Arc Sweep
  .to(anim, {
    subOpacity1: 0.0,
    camX: -0.75,
    camY: 0.55,
    camZ: 1.20,
    modelRotY: -0.85, // Sweeping arc transition
    duration: 1.4,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 2: 60MP Sensor Core & Magnesium Chassis (Macro Flight to Module 2) ---
  .to(anim, {
    subOpacity2: 1.0,
    subExplode2: 1.0,
    camX: 0.16,
    camY: -0.02,
    camZ: 0.36,        // Ultra-close stop (~0.32m) into sensor cavity
    lookX: 0.0,
    lookY: -0.04,
    lookZ: -0.04,
    modelRotY: -0.28,
    modelRotX: -0.08,
    duration: 1.0,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Sapphire filters slide and SNAP onto sensor silicon!
  .to(anim, {
    subExplode2: 0.0,
    duration: 1.2,
    ease: 'back.out(1.4)',
  })
  // Inspection Dwell: Dramatic rotation & tilt highlighting leatherette grain & sapphire glints!
  .to(anim, {
    modelRotY: 0.35,  // Dramatic sweep across sensor plane
    modelRotX: 0.16,
    duration: 2.4,
    ease: 'none',
  })
  // Climbing Arc Sweep Transition
  .to(anim, {
    subOpacity2: 0.0,
    camX: -0.60,
    camY: 0.95,
    camZ: 0.85,
    modelRotY: -0.70,
    modelRotX: 0.28,
    duration: 1.4,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 3: Tactile Controls & Top Deck Dials (Climbs to 55° Top Oblique) ---
  .to(anim, {
    subOpacity3: 1.0,
    subExplode3: 1.0,
    camX: -0.16,
    camY: 0.62,        // High top-down perspective
    camZ: 0.32,        // Ultra-close stop (~0.32m) over dials
    lookX: -0.08,
    lookY: 0.22,
    lookZ: 0.0,
    modelRotY: -0.22,
    modelRotX: 0.48,   // 55° downward tilt
    duration: 1.0,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Knurled dials drop into CNC sockets and SNAP!
  .to(anim, {
    subExplode3: 0.0,
    duration: 1.2,
    ease: 'back.out(1.4)',
  })
  // Inspection Dwell: Diamond knurling reflections across Shutter Speed & ISO Dials
  .to(anim, {
    modelRotY: 0.32,   // Dramatic angular sweep across diamond knurling!
    duration: 2.2,
    ease: 'none',
  })
  // Exit & Fade Out
  .to(anim, {
    subOpacity3: 0.0,
    duration: 1.0,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 4: Architecture & Rangefinder (Full 4 Modules Exploded along Z) ---
  .to(anim, {
    explode: 1.0,      // Full 4 Macro Modules expanded purely along Z
    camX: 0.0,
    camY: 0.65,
    camZ: 1.75,
    lookX: 0.0,
    lookY: 0.16,
    lookZ: 0.0,
    modelRotY: 0.0,
    modelRotX: 0.06,
    duration: 2.2,
    ease: 'power2.inOut',
  })

  // --- Phase 3: Synthesis Climax Reassembly (Decisive Mechanical Snap 1.0 -> 0.0) ---
  .to(anim, {
    explode: 0.0,      // All 4 modules slam together into seamless camera!
    camX: -0.30,
    camY: 0.70,
    camZ: 1.48,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.28,
    modelRotX: 0.0,
    duration: 2.4,
    ease: 'back.out(1.5)',
  })

  // --- Phase 4: Outro Showcase (Edolus Center Rest) ---
  .to(anim, {
    explode: 0.0,
    camX: 0.0,
    camY: 0.42,
    camZ: 1.55,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.0,
    modelRotX: 0.0,
    orbitalOpacity: 1.0,
    duration: 1.6,
    ease: 'power2.out',
  });

  // Section Pinning & Sub-Assembly Isolation Controllers
  const chapterPins = [
    { id: '#chapter-bayonet', key: 'BAYONET', dwell: '+=160%' },
    { id: '#chapter-sensor', key: 'SENSOR', dwell: '+=160%' },
    { id: '#chapter-dials', key: 'DIALS', dwell: '+=140%' },
  ];

  chapterPins.forEach((ch) => {
    ScrollTrigger.create({
      trigger: ch.id,
      start: 'top top',
      end: ch.dwell, // Pinned dwell for turntable inspection!
      pin: true,
      pinSpacing: true,
      onEnter: () => setSubAssemblyFocus(ch.key),
      onEnterBack: () => setSubAssemblyFocus(ch.key),
    });
  });

  // Hero section reset
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Rangefinder section reset
  ScrollTrigger.create({
    trigger: '#chapter-rangefinder',
    start: 'top 70%',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Chapter 2 Sensor Dark Theme Controller
  ScrollTrigger.create({
    trigger: '#chapter-sensor',
    start: 'top 65%',
    end: 'bottom 35%',
    onEnter: () => document.body.classList.add('theme-dark'),
    onLeave: () => document.body.classList.remove('theme-dark'),
    onEnterBack: () => document.body.classList.add('theme-dark'),
    onLeaveBack: () => document.body.classList.remove('theme-dark'),
  });

  // Dedicated Phase 3 Reassembly & Hotspots Controller
  ScrollTrigger.create({
    trigger: '#section-assembled',
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => {
      setSubAssemblyFocus(null);
      audio.playSnap();
      audio.playShutter();
      state.hotspotsVisible = true;
      toggleHotspots(true);
    },
    onLeave: () => {
      state.hotspotsVisible = false;
      toggleHotspots(false);
      resetMacroZoom();
    },
    onEnterBack: () => {
      setSubAssemblyFocus(null);
      state.hotspotsVisible = true;
      toggleHotspots(true);
    },
    onLeaveBack: () => {
      state.hotspotsVisible = false;
      toggleHotspots(false);
      resetMacroZoom();
    },
  });
}

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
  viewfinder: new THREE.Vector3(0.308, 0.190, 0.080),
  shutter: new THREE.Vector3(-0.157, 0.251, 0.005),
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
   DYNAMIC HAIRLINE LEADER LINE (SVG PROJECTED RETICLE)
   ========================================================================== */
const activeLeaderAnchor = new THREE.Vector3();

function updateLeaderLine() {
  if (!leaderLine || !leaderPoint || !modelRoot) return;

  if (state.activeSubAssembly === 'BAYONET') {
    activeLeaderAnchor.set(0.06, -0.05, 0.11);
  } else if (state.activeSubAssembly === 'SENSOR') {
    activeLeaderAnchor.set(0.0, -0.06, -0.13);
  } else if (state.activeSubAssembly === 'DIALS') {
    activeLeaderAnchor.set(-0.157, 0.251, 0.005);
  } else {
    leaderLine.style.opacity = '0';
    leaderPoint.style.opacity = '0';
    return;
  }

  tempVec.copy(activeLeaderAnchor);
  tempVec.applyMatrix4(modelRoot.matrixWorld);
  tempVec.project(camera);

  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;
  const targetX = (tempVec.x * widthHalf) + widthHalf;
  const targetY = -(tempVec.y * heightHalf) + heightHalf;

  let srcX = window.innerWidth * 0.38;
  if (state.activeSubAssembly === 'SENSOR') {
    srcX = window.innerWidth * 0.62;
  }
  const srcY = window.innerHeight * 0.48;

  leaderLine.setAttribute('x1', `${srcX}`);
  leaderLine.setAttribute('y1', `${srcY}`);
  leaderLine.setAttribute('x2', `${targetX}`);
  leaderLine.setAttribute('y2', `${targetY}`);
  leaderLine.style.opacity = '0.5';

  leaderPoint.setAttribute('cx', `${targetX}`);
  leaderPoint.setAttribute('cy', `${targetY}`);
  leaderPoint.style.opacity = '1.0';
}

/* ==========================================================================
   CONTINUOUS ELASTIC MOUSE ORBIT (±25°) & DYNAMIC KEY LIGHT
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
    lenis.scrollTo(0, { duration: 2.2 });
  });
}

// Real-Time Finish Switcher (Stealth Black <-> Classic Silver Chrome)
if (btnToggleFinish) {
  btnToggleFinish.addEventListener('click', () => {
    audio.playTick(1.2);
    if (state.finish === 'black') {
      state.finish = 'silver';
      btnToggleFinish.innerHTML = '<span>◑ Finish: Classic Silver</span>';
    } else {
      state.finish = 'black';
      btnToggleFinish.innerHTML = '<span>◐ Finish: Stealth Black</span>';
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

    // 5. Camera Positioning & Direction (Unless Macro Zoomed)
    if (!state.isMacroZoomed) {
      camera.position.x = anim.camX + (state.mouse.x * 0.08);
      camera.position.y = anim.camY + (state.mouse.y * 0.08);
      camera.position.z = anim.camZ;

      lookTarget.set(anim.lookX, anim.lookY, anim.lookZ);
    }
    camera.lookAt(lookTarget);

    // 6. Elastic 3D Model Orbit (±25° / 0.44 rad)
    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.35);
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.22);
    modelRoot.rotation.z = anim.modelRotZ;

    // 7. Component Explosion & 4 Macro Modules Pure Z Positioning
    moduleExplodeVectors.forEach((modVec, mesh) => {
      const orig = originalTransforms.get(mesh);
      const micro = microExplodeVectors.get(mesh) || new THREE.Vector3();
      if (!orig) return;

      if (state.activeSubAssembly === 'BAYONET') {
        if (subAssemblySets.BAYONET.has(mesh)) {
          mesh.visible = anim.subOpacity1 > 0.02;
          setMeshOpacity(mesh, anim.subOpacity1);
          // Module 1 is highlighted; micro explosion lets cap slide forward along Z
          mesh.position.x = orig.position.x + (micro.x * anim.subExplode1);
          mesh.position.y = orig.position.y + (micro.y * anim.subExplode1);
          mesh.position.z = orig.position.z + (modVec.z * 0.35) + (micro.z * anim.subExplode1);
        } else {
          mesh.visible = false;
        }
      } else if (state.activeSubAssembly === 'SENSOR') {
        if (subAssemblySets.SENSOR.has(mesh)) {
          mesh.visible = anim.subOpacity2 > 0.02;
          setMeshOpacity(mesh, anim.subOpacity2);
          mesh.position.x = orig.position.x + (micro.x * anim.subExplode2);
          mesh.position.y = orig.position.y + (micro.y * anim.subExplode2);
          mesh.position.z = orig.position.z + (micro.z * anim.subExplode2);
        } else {
          mesh.visible = false;
        }
      } else if (state.activeSubAssembly === 'DIALS') {
        if (subAssemblySets.DIALS.has(mesh)) {
          mesh.visible = anim.subOpacity3 > 0.02;
          setMeshOpacity(mesh, anim.subOpacity3);
          mesh.position.x = orig.position.x + (micro.x * anim.subExplode3);
          mesh.position.y = orig.position.y + (micro.y * anim.subExplode3);
          mesh.position.z = orig.position.z + (modVec.z * 0.35) + (micro.z * anim.subExplode3);
        } else {
          mesh.visible = false;
        }
      } else {
        // Full Camera View (Hero, Intro Explosion, Rangefinder HUD, Climax Snap, Outro):
        // PURE Z-AXIS EXCLUSION ONLY (X=0, Y=0):
        mesh.visible = true;
        setMeshOpacity(mesh, 1.0);
        mesh.position.x = orig.position.x;
        mesh.position.y = orig.position.y;
        mesh.position.z = orig.position.z + (modVec.z * anim.explode);
      }
    });

    // Sound Snap detents for Sub-Assemblies & Synthesis Climax
    if (state.activeSubAssembly === 'BAYONET') {
      if (anim.subExplode1 < 0.08 && !state.snappedSub1) {
        audio.playSnap();
        state.snappedSub1 = true;
      } else if (anim.subExplode1 > 0.15) {
        state.snappedSub1 = false;
      }
    } else if (state.activeSubAssembly === 'SENSOR') {
      if (anim.subExplode2 < 0.08 && !state.snappedSub2) {
        audio.playSnap();
        state.snappedSub2 = true;
      } else if (anim.subExplode2 > 0.15) {
        state.snappedSub2 = false;
      }
    } else if (state.activeSubAssembly === 'DIALS') {
      if (anim.subExplode3 < 0.08 && !state.snappedSub3) {
        audio.playSnap();
        state.snappedSub3 = true;
      } else if (anim.subExplode3 > 0.15) {
        state.snappedSub3 = false;
      }
    } else {
      if (anim.explode < 0.08 && !state.snappedClimax && anim.subOpacity1 < 0.1 && anim.subOpacity2 < 0.1) {
        audio.playSnap();
        audio.playShutter();
        state.snappedClimax = true;
      } else if (anim.explode > 0.25) {
        state.snappedClimax = false;
      }
    }

    // 8. Update Hotspot 2D Screen Projections
    updateHotspotPositions();

    // 9. Update Dynamic Hairline Leader Line
    updateLeaderLine();
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
