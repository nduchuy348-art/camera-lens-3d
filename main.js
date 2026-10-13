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

// Hard Scroll Lock during Asset Preloading
const preventScrollKeys = (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
    if (document.documentElement.classList.contains('is-loading')) {
      e.preventDefault();
    }
  }
};
const preventScrollEvent = (e) => {
  if (document.documentElement.classList.contains('is-loading')) {
    e.preventDefault();
  }
};

window.addEventListener('keydown', preventScrollKeys, { passive: false });
window.addEventListener('wheel', preventScrollEvent, { passive: false });
window.addEventListener('touchmove', preventScrollEvent, { passive: false });

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
lenis.stop(); // Locked until assets finish loading

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

// Initial Camera Positioning: Cinematic Hero Front-High 25° Oblique
// Elevated +Y, standing in front (+Z), looking down at the iconic camera face.
// Completely hides the bottom plate and rear LCD.
const baseCameraPos = new THREE.Vector3(-0.25, 0.65, 1.65);
const baseTargetPos = new THREE.Vector3(0, 0.05, 0);
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
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.85);
scene.add(ambientLight);

// Key Light (Specular Highlight Tracker from upper-right front)
const keyLight = new THREE.DirectionalLight(0xFFFBF5, 2.8);
keyLight.position.set(2.4, 3.5, 3.0);
scene.add(keyLight);

// Fill Light (Soft Cool Ambient Left)
const fillLight = new THREE.DirectionalLight(0xF0F4FF, 1.4);
fillLight.position.set(-2.8, 2.2, 2.0);
scene.add(fillLight);

// Rim / Top Bevel Light (Sharp Edge Chamfer Highlights from back-above)
const rimLight = new THREE.DirectionalLight(0xF8FAFC, 2.2);
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
   MATERIALS & SHADERS
   ========================================================================== */
const matBlackAnodized = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x18181A),
  metalness: 0.78,
  roughness: 0.35,
});

const matSilverChrome = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xE2E4E8),
  metalness: 0.96,
  roughness: 0.20,
});

/* ==========================================================================
   MODEL LOADING & 66-COMPONENT COAXIAL Z-EXPLOSION GEOMETRY
   ========================================================================== */
const originalTransforms = new Map();
const originalMaterials = new Map();
const explodeVectors = new Map();
let modelRoot = null;
const bodyPlates = [];

const subAssemblySets = {
  BAYONET: new Set(),
  SENSOR: new Set(),
  DIALS: new Set(),
};

const localOffsets = new Map();

function assignLocalOffsets(obj) {
  const name = obj.name.toLowerCase();
  const loc = new THREE.Vector3(0, 0, 0);

  // Cluster 1: Bayonet & Front Optics (Local Z-Separation before snap)
  if (name.includes('lens cap font') || name.includes('lens cap.002')) {
    loc.set(0, 0, 0.45);
  } else if (name.includes('lens cap')) {
    loc.set(0, 0, 0.32);
  } else if (name.includes('badge')) {
    loc.set(0, 0, 0.18);
  } else if (name.includes('release button') || name.includes('selector')) {
    loc.set(0, 0, -0.15);
  } else if (name.includes('bayonet')) {
    loc.set(0, 0, 0.0); // Flange is cluster anchor
  }
  // Cluster 2: Sensor & Optics (Sapphire filter plates separated before snap)
  else if (name.includes('glass')) {
    loc.set(0, 0, 0.28);
  } else if (name.includes('sensor')) {
    loc.set(0, 0, 0.15);
  } else if (name.includes('plane')) {
    loc.set(0, 0, 0.0); // Silicon plane is anchor of cluster 2
  }
  // Cluster 3: Top Deck Controls (Dials and switches hovering above top plate before snap)
  else if (name.includes('dial')) {
    loc.set(0, 0.22, 0);
  } else if (name.includes('switch') || name.includes('function button')) {
    loc.set(0, 0.18, 0);
  } else if (name.includes('shoe')) {
    loc.set(0, 0.15, 0);
  } else if (name.includes('thumb')) {
    loc.set(0, 0.12, 0);
  } else if (name.includes('body top')) {
    loc.set(0, 0, 0); // Top plate is anchor of cluster 3
  }

  localOffsets.set(obj, loc);
}

function classifyAndAssignVectors(obj) {
  if (!obj.isMesh) return;

  originalTransforms.set(obj, {
    position: obj.position.clone(),
    rotation: obj.rotation.clone(),
  });
  originalMaterials.set(obj, obj.material);

  assignLocalOffsets(obj);

  const name = obj.name.toLowerCase();

  // Track finish plate parts
  if (name.includes('body top') || name.includes('body bottom') || name.includes('shoe')) {
    bodyPlates.push(obj);
  }

  // Group into Sub-Assemblies for complete isolation
  if (name.includes('lens cap') || name.includes('bayonet') || name.includes('release button') || name.includes('selector') || name.includes('badge')) {
    subAssemblySets.BAYONET.add(obj);
  } else if (name.includes('plane') || name.includes('glass') || name.includes('sensor')) {
    subAssemblySets.SENSOR.add(obj);
  } else if (name.includes('dial') || name.includes('shoe') || name.includes('switch') || name.includes('thumb') || name.includes('function button') || name.includes('body top')) {
    subAssemblySets.DIALS.add(obj);
  }

  // Pure Coaxial Explosion along the Optical Z-Axis ONLY (X=0, Y=0, Strong Z Separation)
  const vec = new THREE.Vector3(0, 0, 0);

  if (name.includes('lens cap font') || name.includes('lens cap.002')) {
    vec.set(0, 0, 2.50); // Cap front label
  } else if (name.includes('lens cap')) {
    vec.set(0, 0, 2.10); // Cap body
  } else if (name.includes('bayonet')) {
    vec.set(0, 0, 1.65); // Flange ring
  } else if (name.includes('release button') || name.includes('selector')) {
    vec.set(0, 0, 1.25); // Front plate levers
  } else if (name.includes('badge')) {
    vec.set(0, 0, 0.95); // Red dot badge
  } else if (name.includes('window') || name.includes('brightness sensor') || name.includes('glass')) {
    vec.set(0, 0, 0.65); // Optical glass & filters
  } else if (name.includes('plane')) {
    vec.set(0, 0, 0.35); // Sensor plane
  } else if (name.includes('middle') || name.includes('mesh.052')) {
    vec.set(0, 0, 0.0);  // Central chassis anchor
  } else if (name.includes('body top')) {
    vec.set(0, 0, -0.45); // Top deck
  } else if (name.includes('dial') || name.includes('switch')) {
    vec.set(0, 0, -0.45); // Top dials
  } else if (name.includes('shoe')) {
    vec.set(0, 0, -0.45); // Accessory shoe
  } else if (name.includes('body bottom') || name.includes('battery')) {
    vec.set(0, 0, -0.75); // Baseplate & battery
  } else if (name.includes('lcd') || name.includes('eyepiece')) {
    vec.set(0, 0, -1.35); // Rear LCD & viewfinder eyepiece
  } else if (name.includes('strap lugs')) {
    vec.set(0, 0, -0.20); // Lugs
  } else {
    vec.set(0, 0, 0.15);
  }

  explodeVectors.set(obj, vec);
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
      // Full Camera View: All 66 meshes are visible!
      obj.visible = true;
      setMeshOpacity(obj, 1.0);
      if (bodyPlates.includes(obj)) {
        obj.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
      } else {
        obj.material = originalMaterials.get(obj);
      }
    } else {
      const activeSet = subAssemblySets[key];
      if (activeSet && activeSet.has(obj)) {
        // Active Sub-Assembly: VISIBLE in rich solid PBR materials!
        obj.visible = true;
        if (bodyPlates.includes(obj)) {
          obj.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
        } else {
          obj.material = originalMaterials.get(obj);
        }
      } else {
        // All non-relevant parts: COMPLETELY HIDDEN!
        obj.visible = false;
      }
    }
  });
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

    // Classify all 66 objects
    modelRoot.traverse(classifyAndAssignVectors);

    scene.add(modelRoot);
    setSubAssemblyFocus(null);
    state.isLoaded = true;

    // Complete Preloader Counter & Curtain Reveal
    if (preloaderCounterVal) {
      preloaderCounterVal.textContent = '100';
    } else {
      preloaderCounter.textContent = '100%';
    }
    preloaderBar.style.transform = 'scaleX(1)';

    setTimeout(() => {
      // 1. Reveal scroll container and initialize triggers
      document.documentElement.classList.remove('is-loading');
      document.body.classList.remove('is-loading');
      initScrollTriggers();

      // 2. Play shutter sound and start curtain opening animation
      preloader.classList.add('loaded');
      audio.playShutter();

      // 3. Unlock scrolling ONLY after curtain reveal has fully finished (1.2s transition)
      setTimeout(() => {
        window.removeEventListener('keydown', preventScrollKeys);
        window.removeEventListener('wheel', preventScrollEvent);
        window.removeEventListener('touchmove', preventScrollEvent);
        lenis.start();
      }, 1200);
    }, 400);
  },
  (xhr) => {
    if (xhr.lengthComputable && xhr.total > 0) {
      const pct = Math.min(99, Math.round((xhr.loaded / xhr.total) * 100));
      if (preloaderCounterVal) {
        preloaderCounterVal.textContent = `${pct}`;
      } else {
        preloaderCounter.textContent = `${pct}%`;
      }
      preloaderBar.style.transform = `scaleX(${pct / 100})`;
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
   GSAP SCROLLTRIGGER ORCHESTRATION (PINNED DWELL & SUB-ASSEMBLY STOPS)
   ========================================================================== */
const anim = {
  explode: 0.0,
  subExplode1: 1.0,
  subOpacity1: 1.0,
  subExplode2: 1.0,
  subOpacity2: 0.0,
  subExplode3: 1.0,
  subOpacity3: 0.0,
  camX: baseCameraPos.x,
  camY: baseCameraPos.y,
  camZ: baseCameraPos.z,
  lookX: baseTargetPos.x,
  lookY: baseTargetPos.y,
  lookZ: baseTargetPos.z,
  modelRotY: 0.15,
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

  // --- Phase 1: Explosion Initiation (Hero -> Explode Intro) ---
  tl.to(anim, {
    explode: 1.0,
    camX: -0.35,
    camY: 0.60,
    camZ: 2.10,
    lookX: 0.0,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotY: 0.35,
    modelRotX: 0.0,
    orbitalOpacity: 0.0,
    duration: 2.8,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 1: Bayonet Mount (Entry & Arrival, parts separated in space) ---
  .to(anim, {
    subOpacity1: 1.0,  // Bayonet cluster active
    subExplode1: 1.0,  // Components spaced along optical Z
    camX: -0.15,
    camY: 0.06,
    camZ: 0.65,
    lookX: 0.06,
    lookY: -0.05,
    lookZ: 0.11,
    modelRotY: -0.28,
    modelRotX: 0.04,
    duration: 1.0,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Parts fly together and SNAP into completed Bayonet assembly!
  .to(anim, {
    subExplode1: 0.0,
    duration: 1.2,
    ease: 'back.out(1.4)',
  })
  // Drone Riotters Inspection Dwell: Scroll rotates Bayonet on its axis!
  .to(anim, {
    modelRotY: 0.32, // Rotates 35° across scroll to inspect locking claws
    modelRotX: 0.08,
    duration: 2.2,
    ease: 'none',
  })
  // Exit & Fade Out during Long Arc Sweep!
  .to(anim, {
    subOpacity1: 0.0, // Fades out during sweep
    camX: -0.85,
    camY: 0.45,
    camZ: 1.25,
    modelRotY: -1.25, // Long arc swing!
    duration: 1.6,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 2: 60MP Sensor Core (Fade In & Arrival with sensor filters separated) ---
  .to(anim, {
    subOpacity2: 1.0, // Fades in!
    subExplode2: 1.0,
    camX: 0.15,
    camY: -0.04,
    camZ: 0.38,
    lookX: 0.0,
    lookY: -0.06,
    lookZ: -0.13,
    modelRotY: -0.22,
    modelRotX: -0.06,
    duration: 1.0,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Sapphire filters slide and SNAP onto sensor silicon!
  .to(anim, {
    subExplode2: 0.0,
    duration: 1.2,
    ease: 'back.out(1.4)',
  })
  // Drone Riotters Inspection Dwell: Scroll tilts and orbits Sensor to catch sapphire glints!
  .to(anim, {
    modelRotY: 0.25,
    modelRotX: 0.14,
    duration: 2.2,
    ease: 'none',
  })
  // Exit & Fade Out during Climbing Long Arc Sweep!
  .to(anim, {
    subOpacity2: 0.0, // Fades out!
    camX: -0.65,
    camY: 0.95,
    camZ: 0.90,
    modelRotY: -0.75,
    modelRotX: 0.30,
    duration: 1.6,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 3: Tactile Controls Dials (Fade In & Arrival, dials hovering above) ---
  .to(anim, {
    subOpacity3: 1.0, // Fades in!
    subExplode3: 1.0,
    camX: -0.12,
    camY: 0.70,
    camZ: 0.45,
    lookX: 0.0,
    lookY: 0.22,
    lookZ: 0.0,
    modelRotY: -0.16,
    modelRotX: 0.45,
    duration: 1.0,
    ease: 'power2.inOut',
  })
  // Scrubbed Magnetic Snap: Dials drop into sockets and SNAP!
  .to(anim, {
    subExplode3: 0.0,
    duration: 1.2,
    ease: 'back.out(1.4)',
  })
  // Inspection Dwell: Knurling & Shutter engravings inspection
  .to(anim, {
    modelRotY: 0.18,
    duration: 2.0,
    ease: 'none',
  })
  // Exit & Fade Out!
  .to(anim, {
    subOpacity3: 0.0,
    duration: 1.0,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 4: Technical Specs & Metric Floor (Top 65% Safe Zone, FULL 66 PARTS EXPLODED) ---
  .to(anim, {
    explode: 1.0,      // Full 66 parts exploded along Z!
    camX: 0.0,
    camY: 0.60,
    camZ: 1.65,
    lookX: 0.0,
    lookY: 0.25,
    lookZ: 0.0,
    modelRotY: 0.0,
    modelRotX: 0.04,
    duration: 2.2,
    ease: 'power2.inOut',
  })

  // --- Phase 3: Synthesis Climax Reassembly (Decisive Mechanical Snap Detent 1.0 -> 0.0) ---
  .to(anim, {
    explode: 0.0,      // All 66 pieces slam together!
    camX: -0.35,
    camY: 0.40,
    camZ: 1.45,
    lookX: 0.0,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotY: 0.36,
    modelRotX: 0.0,
    duration: 2.4,
    ease: 'back.out(1.5)',
  })

  // --- Phase 4: Outro Showcase (Edolus Center Rest) ---
  .to(anim, {
    explode: 0.0,
    camX: 0.0,
    camY: 0.35,
    camZ: 1.55,
    lookX: 0.0,
    lookY: 0.05,
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

  // Chapter 2 Sensor Obsidian Dark Theme Controller
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
    activeLeaderAnchor.set(0.06, -0.05, 0.11); // Center of bayonet mount
  } else if (state.activeSubAssembly === 'SENSOR') {
    activeLeaderAnchor.set(0.0, -0.06, -0.13); // Center of sensor cavity
  } else if (state.activeSubAssembly === 'DIALS') {
    activeLeaderAnchor.set(-0.157, 0.251, 0.005); // Center of shutter dial
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
      bodyPlates.forEach((mesh) => {
        mesh.material = matSilverChrome;
      });
    } else {
      state.finish = 'black';
      btnToggleFinish.innerHTML = '<span>◐ Finish: Stealth Black</span>';
      bodyPlates.forEach((mesh) => {
        mesh.material = matBlackAnodized;
      });
    }
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

    // 3. Dynamic Specular Key Light Tracking (upper-right front)
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

    // 7. Component Explosion & Sub-Assembly Positioning & Opacity
    explodeVectors.forEach((offset, mesh) => {
      const orig = originalTransforms.get(mesh);
      const loc = localOffsets.get(mesh) || new THREE.Vector3();
      if (!orig) return;

      if (state.activeSubAssembly === 'BAYONET') {
        if (subAssemblySets.BAYONET.has(mesh)) {
          mesh.visible = anim.subOpacity1 > 0.02;
          setMeshOpacity(mesh, anim.subOpacity1);
          mesh.position.x = orig.position.x + (loc.x * anim.subExplode1);
          mesh.position.y = orig.position.y + (loc.y * anim.subExplode1);
          mesh.position.z = orig.position.z + (loc.z * anim.subExplode1);
        } else {
          mesh.visible = false;
        }
      } else if (state.activeSubAssembly === 'SENSOR') {
        if (subAssemblySets.SENSOR.has(mesh)) {
          mesh.visible = anim.subOpacity2 > 0.02;
          setMeshOpacity(mesh, anim.subOpacity2);
          mesh.position.x = orig.position.x + (loc.x * anim.subExplode2);
          mesh.position.y = orig.position.y + (loc.y * anim.subExplode2);
          mesh.position.z = orig.position.z + (loc.z * anim.subExplode2);
        } else {
          mesh.visible = false;
        }
      } else if (state.activeSubAssembly === 'DIALS') {
        if (subAssemblySets.DIALS.has(mesh)) {
          mesh.visible = anim.subOpacity3 > 0.02;
          setMeshOpacity(mesh, anim.subOpacity3);
          mesh.position.x = orig.position.x + (loc.x * anim.subExplode3);
          mesh.position.y = orig.position.y + (loc.y * anim.subExplode3);
          mesh.position.z = orig.position.z + (loc.z * anim.subExplode3);
        } else {
          mesh.visible = false;
        }
      } else {
        // Full Camera View (Hero, Rangefinder HUD, Climax Snap, Outro)
        mesh.visible = true;
        setMeshOpacity(mesh, 1.0);
        mesh.position.x = orig.position.x + (offset.x * anim.explode);
        mesh.position.y = orig.position.y + (offset.y * anim.explode);
        mesh.position.z = orig.position.z + (offset.z * anim.explode);
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
});

// Kick off Render Loop
render();
