import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { audio } from './audio.js';

/* ==========================================================================
   GLOBAL APP STATE & INITIALIZATION
   ========================================================================== */
const state = {
  isLoaded: false,
  finish: 'black', // 'black' or 'silver'
  explodeFactor: 0.0,
  currentChapter: 0,
  mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
  hotspotsVisible: false,
  isMacroZoomed: false,
  lastDetent: 0,
  activeSubAssembly: null,
};

// DOM Elements
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloader-counter');
const preloaderCounterVal = document.getElementById('preloader-counter-val');
const preloaderBar = document.getElementById('preloader-bar');
const canvas = document.getElementById('webgl-canvas');
const btnReplay = document.getElementById('btn-replay');
const btnToggleFinish = document.getElementById('btn-toggle-finish');
const watermarkInner = document.getElementById('watermark-inner');
const leaderLine = document.getElementById('leader-line');
const leaderPoint = document.getElementById('leader-point');

// Hotspots
const hotspotViewfinder = document.getElementById('hotspot-viewfinder');
const hotspotShutter = document.getElementById('hotspot-shutter');
const hotspotBadge = document.getElementById('hotspot-badge');

/* ==========================================================================
   STRICT SCROLL LOCK DURING PRELOADER
   ========================================================================== */
document.documentElement.classList.add('is-loading');
document.body.classList.add('is-loading');
window.scrollTo(0, 0);

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
scene.background = null; // Transparent for CSS radial backdrop & dark mode transitions

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
// Elevated 25°, yaw 15° facing the iconic camera face, completely hiding the rear screen
const baseCameraPos = new THREE.Vector3(-0.62, -2.25, 1.02);
const baseTargetPos = new THREE.Vector3(0, -0.05, 0.12);
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

// Key Light (Specular Highlight Tracker)
const keyLight = new THREE.DirectionalLight(0xFFFBF5, 2.8);
keyLight.position.set(2.4, -2.2, 2.5);
scene.add(keyLight);

// Fill Light (Soft Cool Ambient Left)
const fillLight = new THREE.DirectionalLight(0xF0F4FF, 1.4);
fillLight.position.set(-2.8, -1.8, 1.2);
scene.add(fillLight);

// Rim / Top Bevel Light (Sharp Edge Chamfer Highlights)
const rimLight = new THREE.DirectionalLight(0xF8FAFC, 2.2);
rimLight.position.set(0.2, 2.5, 2.8);
scene.add(rimLight);

// Edolus 3D Orbital Coordinate Ring
const orbitalRingGeom = new THREE.RingGeometry(0.85, 0.853, 64);
const orbitalRingMat = new THREE.MeshBasicMaterial({
  color: 0x181B1E,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.16,
});
const orbitalRing = new THREE.Mesh(orbitalRingGeom, orbitalRingMat);
orbitalRing.rotation.x = Math.PI / 2.3;
scene.add(orbitalRing);

/* ==========================================================================
   MATERIALS & SOLIDWORKS ASSEMBLY ISOLATION SHADERS
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

// SolidWorks Ghost Material (translucent glass with subtle hairline silhouette)
const matSolidWorksGhost = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x94A3B8),
  roughness: 0.85,
  metalness: 0.1,
  transparent: true,
  opacity: 0.08,
  depthWrite: false,
});

/* ==========================================================================
   MODEL LOADING & 66-COMPONENT T-EXPLOSION GEOMETRY
   ========================================================================== */
const originalTransforms = new Map();
const originalMaterials = new Map();
const explodeVectors = new Map();
let modelRoot = null;
const bodyPlates = []; // Objects that change finish (Body Top, Body Bottom, Accessory Shoe)

const subAssemblySets = {
  BAYONET: new Set(),
  SENSOR: new Set(),
  DIALS: new Set(),
};

function classifyAndAssignVectors(obj) {
  if (!obj.isMesh) return;

  // Cache base transforms and material
  originalTransforms.set(obj, {
    position: obj.position.clone(),
    rotation: obj.rotation.clone(),
  });
  originalMaterials.set(obj, obj.material);

  const name = obj.name.toLowerCase();

  // Track finish plate parts
  if (name.includes('body top') || name.includes('body bottom') || name.includes('shoe')) {
    bodyPlates.push(obj);
  }

  // Group into Sub-Assemblies
  if (name.includes('lens cap') || name.includes('bayonet') || name.includes('release button') || name.includes('selector')) {
    subAssemblySets.BAYONET.add(obj);
  } else if (name.includes('brightness sensor') || name.includes('sensor')) {
    subAssemblySets.SENSOR.add(obj);
  } else if (name.includes('dial') || name.includes('shoe') || name.includes('switch') || name.includes('thumb') || name.includes('body top')) {
    subAssemblySets.DIALS.add(obj);
  }

  // Orthographic T-Explosion Displacement Vectors (2.5x Scale)
  const vec = new THREE.Vector3(0, 0, 0);

  // 1. Front Optical Barrel (-Y axis disengagement)
  if (name.includes('lens cap font')) {
    vec.set(0.04, -1.65, 0);
  } else if (name.includes('lens cap')) {
    vec.set(0.04, -1.35, 0);
  } else if (name.includes('bayonet')) {
    vec.set(0.04, -0.95, 0);
  } else if (name.includes('badge')) {
    vec.set(0.12, -0.65, 0.04);
  } else if (name.includes('release button') || name.includes('selector')) {
    vec.set(0.24, -0.55, 0);
  } else if (name.includes('window') || name.includes('brightness sensor') || name.includes('glass')) {
    vec.set(-0.08, -0.65, 0.02);
  }
  // 2. Vertical Auxiliary Deck (+Z skyward controls)
  else if (name.includes('shutter speed dial')) {
    vec.set(0.12, 0.02, 1.15);
  } else if (name.includes('iso dial')) {
    vec.set(-0.18, 0.02, 1.25);
  } else if (name.includes('main switch') || name.includes('function button')) {
    vec.set(0.18, 0.04, 1.05);
  } else if (name.includes('shoe')) {
    vec.set(0, 0, 0.85);
  } else if (name.includes('thumb wheel')) {
    vec.set(0.22, 0.06, 0.75);
  } else if (name.includes('body top')) {
    vec.set(0, 0, 0.65);
  } else if (name.includes('eyepiece')) {
    vec.set(-0.15, 0.18, 0.70);
  }
  // 3. Vertical Auxiliary Deck (-Z downward base & power)
  else if (name.includes('battery release') || name.includes('lever')) {
    vec.set(-0.14, 0, -0.95);
  } else if (name.includes('battery')) {
    vec.set(-0.16, 0, -1.25);
  } else if (name.includes('body bottom')) {
    vec.set(0, 0, -0.75);
  }
  // 4. Rear Touchscreen & Electronics (+Y backward)
  else if (name.includes('lcd') || name.includes('plane')) {
    vec.set(0, 1.15, 0);
  }
  // 5. Lateral Wings (±X outward)
  else if (name.includes('strap lugs.001')) {
    vec.set(0.48, 0, 0);
  } else if (name.includes('strap lugs')) {
    vec.set(-0.48, 0, 0);
  }
  // 6. Die-cast Chassis (Rigid Anchor at 0, 0, 0)
  else if (name.includes('middle')) {
    vec.set(0, 0, 0);
  } else {
    vec.set(0, 0, 0.35);
  }

  explodeVectors.set(obj, vec);
}

// SolidWorks Assembly Ghost Mode Controller
function setSubAssemblyFocus(key) {
  state.activeSubAssembly = key;
  if (!modelRoot) return;

  modelRoot.traverse((obj) => {
    if (!obj.isMesh) return;

    if (!key) {
      // Restore all original materials
      const origMat = originalMaterials.get(obj);
      if (bodyPlates.includes(obj)) {
        obj.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
      } else {
        obj.material = origMat;
      }
    } else {
      const activeSet = subAssemblySets[key];
      if (activeSet && activeSet.has(obj)) {
        // Active Sub-Assembly: Keep rich solid PBR materials
        if (bodyPlates.includes(obj)) {
          obj.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
        } else {
          obj.material = originalMaterials.get(obj);
        }
      } else {
        // Inactive components: Render as SolidWorks Ghost
        obj.material = matSolidWorksGhost;
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

    // Center model at origin
    const box = new THREE.Box3().setFromObject(modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    modelRoot.position.sub(center);

    // Classify all 66 objects
    modelRoot.traverse(classifyAndAssignVectors);

    scene.add(modelRoot);
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
        ScrollTrigger.refresh();
      }, 1200);
    }, 450);
  },
  (xhr) => {
    if (xhr.total > 0) {
      const pct = Math.min(100, Math.floor((xhr.loaded / xhr.total) * 100));
      if (preloaderCounterVal) {
        preloaderCounterVal.textContent = pct;
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
   GSAP SCROLLTRIGGER ORCHESTRATION (PINNED DWELL & FLUID SCRUB)
   ========================================================================== */
const anim = {
  explode: 0.0,
  camX: baseCameraPos.x,
  camY: baseCameraPos.y,
  camZ: baseCameraPos.z,
  lookX: baseTargetPos.x,
  lookY: baseTargetPos.y,
  lookZ: baseTargetPos.z,
  modelRotY: 0,
  modelRotX: 0,
  modelRotZ: 0,
  heroExtractX: 0,
  heroExtractY: 0,
  heroExtractZ: 0,
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
        // Audible mechanical detent tick as user scrolls
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
    camX: -0.58,
    camY: -2.15,
    camZ: 0.75,
    modelRotY: 0.15,
    orbitalOpacity: 0.0,
    ease: 'power2.inOut',
    duration: 2.0,
    onStart: () => setSubAssemblyFocus(null),
  })

  // --- Phase 2, Chapter 1: Bayonet Mount (Hero Extraction Forward, Model Right, Text Left) ---
  .to(anim, {
    explode: 1.0,
    heroExtractY: -0.45, // Bayonet cluster floats forward in Hero Extraction!
    camX: -0.55,
    camY: -1.65,
    camZ: 0.35,
    lookX: 0.18,
    lookY: -0.35,
    lookZ: 0.05,
    modelRotY: -0.28,
    modelRotX: 0.06,
    ease: 'power2.inOut',
    duration: 2.8,
    onStart: () => setSubAssemblyFocus('BAYONET'),
  })

  // --- Phase 2, Chapter 2: 60MP Sensor Core (Straight Frontal Penetration, Obsidian Dark Mode) ---
  .to(anim, {
    explode: 1.25,
    heroExtractY: -0.35,
    camX: 0.45,
    camY: -1.25,
    camZ: 0.22,
    lookX: -0.18,
    lookY: -0.05,
    lookZ: 0.05,
    modelRotY: 0.12,
    modelRotX: 0.02,
    ease: 'power2.inOut',
    duration: 3.0,
    onStart: () => setSubAssemblyFocus('SENSOR'),
  })

  // --- Phase 2, Chapter 3: Tactile Controls Dials (High Angle 60° Down, Top Deck Lifted) ---
  .to(anim, {
    explode: 1.0,
    heroExtractY: 0,
    heroExtractZ: 0.40, // Top deck lifts higher in Hero Extraction!
    camX: -0.35,
    camY: -1.35,
    camZ: 1.35,
    lookX: 0.12,
    lookY: 0.0,
    lookZ: 0.35,
    modelRotY: -0.22,
    modelRotX: 0.42,
    ease: 'power2.inOut',
    duration: 2.8,
    onStart: () => setSubAssemblyFocus('DIALS'),
  })

  // --- Phase 2, Chapter 4: Technical Arc Gauge & Metric Floor (Top 65% Safe Zone) ---
  .to(anim, {
    explode: 0.85,
    heroExtractZ: 0,
    camX: 0.0,
    camY: -2.15,
    camZ: 0.65, // Elevated above bottom 35% table to prevent overlap
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.22,
    modelRotY: 0.0,
    modelRotX: 0.05,
    ease: 'power2.inOut',
    duration: 2.6,
    onStart: () => setSubAssemblyFocus(null),
  })

  // --- Phase 3: Synthesis Climax Reassembly (Decisive Mechanical Snap Detent) ---
  .to(anim, {
    explode: 0.0, // Snaps 100% back to assembled form!
    heroExtractX: 0,
    heroExtractY: 0,
    heroExtractZ: 0,
    camX: -0.85,
    camY: -1.95,
    camZ: 0.45,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.05,
    modelRotY: 0.42, // Elegant 3/4 beauty rotation
    modelRotX: -0.04,
    ease: 'back.out(1.5)', // Decisive mechanical detent snap
    duration: 2.4,
    onStart: () => setSubAssemblyFocus(null),
  })

  // --- Phase 4: Outro Showcase (Edolus Center Calm Rest) ---
  .to(anim, {
    explode: 0.0,
    camX: 0.0,
    camY: -2.45,
    camZ: 0.40,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.05,
    modelRotY: 0.0,
    modelRotX: 0.0,
    orbitalOpacity: 1.0,
    ease: 'power2.out',
    duration: 1.8,
  });

  // Dedicated Chapter 2 Sensor Obsidian Dark Theme Controller
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
  viewfinder: new THREE.Vector3(-0.18, -0.06, 0.20),
  shutter: new THREE.Vector3(0.24, 0.02, 0.26),
  badge: new THREE.Vector3(0.08, -0.12, 0.16),
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
    x: worldPos.x * 0.7,
    y: worldPos.y - 0.75,
    z: worldPos.z + 0.25,
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
    activeLeaderAnchor.set(0.04, -0.65, 0); // Center of bayonet mount
  } else if (state.activeSubAssembly === 'SENSOR') {
    activeLeaderAnchor.set(0, 0.15, 0.05); // Sensor cavity
  } else if (state.activeSubAssembly === 'DIALS') {
    activeLeaderAnchor.set(0.12, 0.02, 0.85); // Shutter dial
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

  // Source coordinate from the corresponding editorial block edge
  let srcX = window.innerWidth * 0.42;
  if (state.activeSubAssembly === 'SENSOR') {
    srcX = window.innerWidth * 0.58;
  }
  const srcY = window.innerHeight * 0.48;

  leaderLine.setAttribute('x1', `${srcX}`);
  leaderLine.setAttribute('y1', `${srcY}`);
  leaderLine.setAttribute('x2', `${targetX}`);
  leaderLine.setAttribute('y2', `${targetY}`);
  leaderLine.style.opacity = '0.45';

  leaderPoint.setAttribute('cx', `${targetX}`);
  leaderPoint.setAttribute('cy', `${targetY}`);
  leaderPoint.style.opacity = '0.9';
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

    // 3. Dynamic Specular Key Light Tracking
    keyLight.position.set(
      2.4 + state.mouse.x * 1.5,
      -2.2,
      2.5 + state.mouse.y * 1.2
    );

    // 4. Edolus Orbital Coordinate Ring Rotation & Opacity
    if (orbitalRing) {
      orbitalRing.rotation.z += 0.003;
      orbitalRingMat.opacity = anim.orbitalOpacity * 0.16;
    }

    // 5. Camera Positioning & Direction (Unless Macro Zoomed)
    if (!state.isMacroZoomed) {
      camera.position.x = anim.camX + (state.mouse.x * 0.16);
      camera.position.y = anim.camY + (state.mouse.y * 0.16);
      camera.position.z = anim.camZ;

      lookTarget.set(anim.lookX, anim.lookY, anim.lookZ);
    }
    camera.lookAt(lookTarget);

    // 6. Elastic 3D Model Orbit (±25° / 0.44 rad)
    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.44);
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.28);
    modelRoot.rotation.z = anim.modelRotZ;

    // 7. Component Explosion & Hero Extraction Displacement
    explodeVectors.forEach((offset, mesh) => {
      const orig = originalTransforms.get(mesh);
      if (orig) {
        let extractX = 0;
        let extractY = 0;
        let extractZ = 0;

        // Apply Hero Extraction delta if mesh is in active sub-assembly
        if (state.activeSubAssembly && subAssemblySets[state.activeSubAssembly]?.has(mesh)) {
          extractX = anim.heroExtractX;
          extractY = anim.heroExtractY;
          extractZ = anim.heroExtractZ;
        }

        mesh.position.x = orig.position.x + (offset.x * anim.explode) + extractX;
        mesh.position.y = orig.position.y + (offset.y * anim.explode) + extractY;
        mesh.position.z = orig.position.z + (offset.z * anim.explode) + extractZ;
      }
    });

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
