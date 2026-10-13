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
};

// DOM Elements
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloader-counter');
const preloaderBar = document.getElementById('preloader-bar');
const canvas = document.getElementById('webgl-canvas');
const btnReplay = document.getElementById('btn-replay');
const btnToggleFinish = document.getElementById('btn-toggle-finish');

// Hotspots
const hotspotViewfinder = document.getElementById('hotspot-viewfinder');
const hotspotShutter = document.getElementById('hotspot-shutter');
const hotspotBadge = document.getElementById('hotspot-badge');

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

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

/* ==========================================================================
   THREE.JS SCENE, CAMERA & LIGHTING ARCHITECTURE
   ========================================================================== */
const scene = new THREE.Scene();
scene.background = null; // Transparent to allow CSS radial gradient & dark mode transition

const camera = new THREE.PerspectiveCamera(
  36, // Cinematic portrait focal compression
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const cameraRig = new THREE.Group();
scene.add(cameraRig);
cameraRig.add(camera);

// Initial Camera Positioning
const baseCameraPos = new THREE.Vector3(-0.95, -2.40, 0.65);
const baseTargetPos = new THREE.Vector3(0, 0, 0);
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

// Key Light (Soft Warm Studio Front-Right)
const keyLight = new THREE.DirectionalLight(0xFFFBF5, 2.8);
keyLight.position.set(2.4, -2.2, 2.5);
scene.add(keyLight);

// Fill Light (Soft Cool Ambient Left)
const fillLight = new THREE.DirectionalLight(0xF0F4FF, 1.4);
fillLight.position.set(-2.8, -1.8, 1.2);
scene.add(fillLight);

// Rim / Top Bevel Light (Sharp Edge Highlights)
const rimLight = new THREE.DirectionalLight(0xF8FAFC, 2.2);
rimLight.position.set(0.2, 2.5, 2.8);
scene.add(rimLight);

/* ==========================================================================
   MATERIALS FOR REAL-TIME BLACK / SILVER FINISH SWITCHER
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
   MODEL LOADING & 66-COMPONENT EXPLOSION VECTORS
   ========================================================================== */
const originalTransforms = new Map();
const explodeVectors = new Map();
let modelRoot = null;
const bodyPlates = []; // Objects that change finish (Body Top, Body Bottom, Accessory Shoe)

function classifyAndAssignVectors(obj) {
  if (!obj.isMesh) return;

  // Cache base position
  originalTransforms.set(obj, {
    position: obj.position.clone(),
    rotation: obj.rotation.clone(),
  });

  const name = obj.name.toLowerCase();

  // Track finish plate parts
  if (name.includes('body top') || name.includes('body bottom') || name.includes('shoe')) {
    bodyPlates.push(obj);
  }

  // Calculate anatomically accurate exploded displacement vectors
  const vec = new THREE.Vector3(0, 0, 0);

  // 1. Top Plate & Upper Controls (+Z axis)
  if (name.includes('shutter speed dial')) {
    vec.set(0.12, 0.02, 0.46);
  } else if (name.includes('iso dial')) {
    vec.set(-0.18, 0.02, 0.48);
  } else if (name.includes('main switch') || name.includes('function button')) {
    vec.set(0.18, 0.04, 0.40);
  } else if (name.includes('shoe')) {
    vec.set(0, 0, 0.38);
  } else if (name.includes('thumb wheel')) {
    vec.set(0.22, 0.06, 0.35);
  } else if (name.includes('body top')) {
    vec.set(0, 0, 0.24);
  } else if (name.includes('eyepiece')) {
    vec.set(-0.15, 0.18, 0.28);
  }
  // 2. Base Plate, Battery & Levers (-Z axis)
  else if (name.includes('battery release') || name.includes('lever')) {
    vec.set(-0.14, 0, -0.32);
  } else if (name.includes('battery')) {
    vec.set(-0.16, 0, -0.48);
  } else if (name.includes('body bottom')) {
    vec.set(0, 0, -0.28);
  }
  // 3. Front Bayonet, Cap & Optical Windows (-Y axis)
  else if (name.includes('lens cap font')) {
    vec.set(0.04, -0.62, 0);
  } else if (name.includes('lens cap')) {
    vec.set(0.04, -0.52, 0);
  } else if (name.includes('bayonet')) {
    vec.set(0.04, -0.32, 0);
  } else if (name.includes('badge')) {
    vec.set(0.12, -0.24, 0.04);
  } else if (name.includes('release button') || name.includes('selector')) {
    vec.set(0.22, -0.20, 0);
  } else if (name.includes('window') || name.includes('brightness sensor') || name.includes('glass')) {
    vec.set(-0.08, -0.26, 0.02);
  }
  // 4. Rear Touchscreen & Buttons (+Y axis)
  else if (name.includes('lcd') || name.includes('plane')) {
    vec.set(0, 0.32, 0);
  }
  // 5. Strap Lugs (Side displacement ±X axis)
  else if (name.includes('strap lugs.001')) {
    vec.set(0.24, 0, 0);
  } else if (name.includes('strap lugs')) {
    vec.set(-0.24, 0, 0);
  }
  // 6. Body Middle (Anchor)
  else if (name.includes('middle')) {
    vec.set(0, 0, 0);
  } else {
    // Default outward displacement
    vec.set(0, 0, 0.15);
  }

  explodeVectors.set(obj, vec);
}

// Model Loading with Progress Tracking
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
    preloaderCounter.textContent = '100';
    preloaderBar.style.transform = 'scaleX(1)';

    setTimeout(() => {
      preloader.classList.add('loaded');
      audio.playShutter(); // Authentic welcome shutter click!
      initScrollTriggers();
    }, 450);
  },
  (xhr) => {
    if (xhr.total > 0) {
      const pct = Math.floor((xhr.loaded / xhr.total) * 100);
      preloaderCounter.textContent = pct < 10 ? `0${pct}` : `${pct}`;
      preloaderBar.style.transform = `scaleX(${pct / 100})`;
    }
  },
  (err) => {
    console.error('[ERROR] Failed to load Leica GLB model:', err);
    preloaderCounter.textContent = 'ERR';
  }
);

/* ==========================================================================
   GSAP SCROLLTRIGGER ORCHESTRATION (THE 4 PHASES)
   ========================================================================== */
const anim = {
  explode: 0.0,
  camX: baseCameraPos.x,
  camY: baseCameraPos.y,
  camZ: baseCameraPos.z,
  lookX: 0,
  lookY: 0,
  lookZ: 0,
  modelRotY: 0,
  modelRotX: 0,
  modelRotZ: 0,
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
        // Audible mechanical detent tick as user scrolls through chapters
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
    camX: -0.85,
    camY: -2.35,
    camZ: 0.60,
    modelRotY: 0.22,
    ease: 'power2.inOut',
    duration: 2.0,
  })

  // --- Phase 2, Chapter 1: Bayonet & Lens Cap (Model Right, Text Left) ---
  .to(anim, {
    explode: 1.0,
    camX: -0.45,
    camY: -1.75,
    camZ: 0.28,
    lookX: 0.12,
    lookY: -0.22,
    lookZ: 0.05,
    modelRotY: -0.32,
    modelRotX: 0.08,
    ease: 'power2.inOut',
    duration: 2.5,
  })

  // --- Phase 2, Chapter 2: 60MP Sensor & Electronics (Model Left, Text Right, DARK MODE) ---
  .to(anim, {
    explode: 1.15, // Expanded deeper to reveal sensor cavity
    camX: 0.35,
    camY: -1.25,
    camZ: 0.22,
    lookX: -0.05,
    lookY: -0.05,
    lookZ: 0.04,
    modelRotY: 0.18,
    modelRotX: 0.02,
    ease: 'power2.inOut',
    duration: 2.8,
  })

  // --- Phase 2, Chapter 3: Tactile Controls Dials (Model High-Right, LIGHT MODE) ---
  .to(anim, {
    explode: 0.95,
    camX: -0.35,
    camY: -1.45,
    camZ: 0.95, // High camera viewing down onto top dials
    lookX: 0.08,
    lookY: -0.02,
    lookZ: 0.30,
    modelRotY: -0.25,
    modelRotX: 0.35,
    ease: 'power2.inOut',
    duration: 2.5,
  })

  // --- Phase 2, Chapter 4: Rangefinder Heritage & Arc Gauge (Center) ---
  .to(anim, {
    explode: 0.85,
    camX: 0.0,
    camY: -2.10,
    camZ: 0.38,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.15,
    modelRotY: 0.0,
    modelRotX: 0.05,
    ease: 'power2.inOut',
    duration: 2.6,
  })

  // --- Phase 3: Seamless Reassembly & Hotspots (Santalarch Polish) ---
  .to(anim, {
    explode: 0.0, // Snaps 100% back to assembled form!
    camX: -0.75,
    camY: -1.95,
    camZ: 0.48,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.05,
    modelRotY: 0.45, // Elegant 3/4 beauty rotation
    modelRotX: -0.04,
    ease: 'back.out(1.2)', // Tangible mechanical snap
    duration: 2.4,
  })

  // --- Phase 4: Outro Showcase (Edolus Center Lock) ---
  .to(anim, {
    explode: 0.0,
    camX: 0.0,
    camY: -2.65, // Gentle pull back to serene center rest
    camZ: 0.42,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.05,
    modelRotY: 0.0,
    modelRotX: 0.0,
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
    },
    onEnterBack: () => {
      state.hotspotsVisible = true;
      toggleHotspots(true);
    },
    onLeaveBack: () => {
      state.hotspotsVisible = false;
      toggleHotspots(false);
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
   HOTSPOTS 3D-TO-2D SCREEN PROJECTION
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

/* ==========================================================================
   CONTINUOUS MOUSE PARALLAX WITH SPRING INERTIA
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

    // 2. Camera Positioning & Direction
    camera.position.x = anim.camX + (state.mouse.x * 0.14);
    camera.position.y = anim.camY + (state.mouse.y * 0.14);
    camera.position.z = anim.camZ;

    lookTarget.set(anim.lookX, anim.lookY, anim.lookZ);
    camera.lookAt(lookTarget);

    // 3. Model Rotations with Gentle Parallax Tilting
    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.08);
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.08);
    modelRoot.rotation.z = anim.modelRotZ;

    // 4. Component Explosion Displacement
    explodeVectors.forEach((offset, mesh) => {
      const orig = originalTransforms.get(mesh);
      if (orig) {
        mesh.position.x = orig.position.x + (offset.x * anim.explode);
        mesh.position.y = orig.position.y + (offset.y * anim.explode);
        mesh.position.z = orig.position.z + (offset.z * anim.explode);
      }
    });

    // 5. Update Hotspot 2D Projections
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
});

// Kick off Render Loop
render();
