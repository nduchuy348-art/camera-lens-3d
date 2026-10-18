import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { audio } from './audio.js';

/* ==========================================================================
   GLOBAL STATE & ARCHITECTURAL CONFIGURATION
   ========================================================================== */
const state = {
  isLoaded: false,
  finish: 'black', // 'black' (Matte Anodized) or 'silver' (Classic Chrome) - Defaults to Leica M11 Stealth Black
  activeSubAssembly: null, // null, 'BAYONET', 'SENSOR', 'DIALS', 'OUTRO'
  hotspotsVisible: false,
  lastDetent: Math.floor((typeof window !== 'undefined' ? (window.pageYOffset || 0) : 0) / 45),
  snappedClimax: false,
  mountLocked: false,
  welcomed: false,
  mouse: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  },
};

// DOM Elements
const canvas = document.getElementById('webgl-canvas');
const watermarkInner = document.getElementById('watermark-inner');
const watermarkSub = document.getElementById('watermark-sub');
const btnReplay = document.getElementById('btn-replay');
const btnToggleFinish = document.getElementById('btn-toggle-finish');
const btnFinishLabel = document.getElementById('btn-finish-label');
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloader-counter-val');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderBarWrap = document.getElementById('preloader-bar-wrap');
const preloaderSub = document.getElementById('preloader-sub');
const preloaderCta = document.getElementById('preloader-cta');
const preloaderEnterBtn = document.getElementById('preloader-enter-btn');
const audioBannerPill = document.getElementById('audio-banner-pill');
const audioPillLabel = document.getElementById('audio-pill-label');

// Optical Vernier HUD Callouts
const hudBayonet = document.getElementById('hud-bayonet');
const hudSensor = document.getElementById('hud-sensor');
const hudDial = document.getElementById('hud-dial');

// Dynamic SVG Hairline Leader Line
const leaderLine = document.getElementById('leader-line');
const leaderPoint = document.getElementById('leader-point');

// Interactive 3D Hotspots
const hotspotViewfinder = document.getElementById('hotspot-viewfinder');
const hotspotShutter = document.getElementById('hotspot-shutter');
const hotspotBadge = document.getElementById('hotspot-badge');

// Editorial Cards
const cardBayonet = document.getElementById('card-bayonet');
const cardSensor = document.getElementById('card-sensor');
const cardDials = document.getElementById('card-dials');

/* ==========================================================================
   LENIS SMOOTH SCROLL ENGINE (Claude Motion Physical Momentum)
   ========================================================================== */
let lenis = null;
if (typeof window !== 'undefined' && typeof window.Lenis !== 'undefined') {
  lenis = new window.Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.8,
    infinite: false,
  });

  lenis.on('scroll', (e) => {
    ScrollTrigger.update();
    syncScrollState(e.scroll, e.velocity);
  });

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/* ==========================================================================
   WEB AUDIO ACTIVATION & LIFECYCLE MANAGEMENT
   ========================================================================== */
let preloaderDismissed = false;

function dismissAudioPill() {
  if (!audioBannerPill) return;
  if (audioPillLabel) audioPillLabel.textContent = 'SOUND: ON';
  audioBannerPill.classList.add('active-dismiss');
  setTimeout(() => {
    audioBannerPill.style.display = 'none';
  }, 450);
}

function showAudioPill() {
  if (!audioBannerPill || audio.isUnlocked || !preloaderDismissed) return;
  audioBannerPill.style.display = 'inline-flex';
}

function triggerAudioUnlock(welcomeShutter = true) {
  audio.unlock(() => {
    if (welcomeShutter && !state.welcomed) {
      state.welcomed = true;
      audio.playShutter();
    }
  }).then(() => {
    if (audio.isUnlocked) {
      if (!state.welcomed) {
        state.welcomed = true;
        if (welcomeShutter) audio.playShutter();
      }
      dismissAudioPill();
    }
  }).catch(() => {});
}

function dismissPreloader(isUserGesture = true) {
  if (preloaderDismissed) return;
  preloaderDismissed = true;

  if (isUserGesture) {
    triggerAudioUnlock(true);
  }

  if (preloader) {
    preloader.classList.add('loaded');
    setTimeout(() => {
      preloader.classList.add('hidden');
      preloader.style.display = 'none';
      if (preloader.parentNode) {
        preloader.parentNode.removeChild(preloader);
      }
    }, 950);
  }

  // If audio is still locked (e.g. dismissed via safety timeout), display floating helper
  setTimeout(() => {
    if (!audio.isUnlocked) {
      showAudioPill();
    }
  }, 1200);
}

/* ==========================================================================
   THREE.JS SCENE, CAMERA & WEBGL RENDERER SETUP
   ========================================================================== */
const scene = new THREE.Scene();
scene.background = null; // Transparent to allow CSS #FDFDFD gallery background & layered typography (Swiss grid, watermark, 60MP Freestyle row)

const camera = new THREE.PerspectiveCamera(
  36, // Editorial focal length (~50mm equivalent)
  window.innerWidth / window.innerHeight,
  0.05,
  100
);

// Default camera setup (Elevated, pitch down looking comfortably at front and top)
const baseCameraPos = new THREE.Vector3(0.0, 0.65, 1.75);
const baseTargetPos = new THREE.Vector3(0.0, 0.05, 0.0);
camera.position.copy(baseCameraPos);
camera.lookAt(baseTargetPos);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ==========================================================================
   STUDIO LIGHTING SETUP (High-Key Gallery Atmosphere)
   ========================================================================== */
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.85);
scene.add(ambientLight);

// Key Light (Follows mouse slightly to sweep highlights across metal)
const keyLight = new THREE.DirectionalLight(0xFFFFFF, 2.8);
keyLight.position.set(2.4, 3.5, 3.0);
scene.add(keyLight);

// Fill Light (Soft cool shadow fill)
const fillLight = new THREE.DirectionalLight(0xEFF6FF, 1.4);
fillLight.position.set(-2.8, 1.5, 2.0);
scene.add(fillLight);

// Rim Light (Bevel chamfer glints from back-above)
const rimLight = new THREE.DirectionalLight(0xF8FAFC, 2.6);
rimLight.position.set(0.2, 3.5, -2.5);
scene.add(rimLight);

// Orbital Ring (Subtle cosmetic ground ring)
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

// 1. Pebbled Leatherette Textures
const leatheretteDiffuse = textureLoader.load('./assets/leatherette_diffuse.png');
const leatheretteNormal = textureLoader.load('./assets/leatherette_normal.png');
const leatheretteRoughness = textureLoader.load('./assets/leatherette_roughness.png');

[leatheretteDiffuse, leatheretteNormal, leatheretteRoughness].forEach((tex) => {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 17);
});
leatheretteDiffuse.colorSpace = THREE.SRGBColorSpace;

const matLeatherette = new THREE.MeshStandardMaterial({
  map: leatheretteDiffuse,
  normalMap: leatheretteNormal,
  normalScale: new THREE.Vector2(2.2, 2.2),
  roughnessMap: leatheretteRoughness,
  roughness: 0.95,
  metalness: 0.04,
  color: new THREE.Color(0xFFFFFF),
});

// 2. Diamond Knurled Normal Map for Dials
const knurledNormal = textureLoader.load('./assets/knurled_normal.png');
knurledNormal.wrapS = THREE.RepeatWrapping;
knurledNormal.wrapT = THREE.RepeatWrapping;
knurledNormal.repeat.set(18, 3);

// Stealth Black Knurled Dial
const matBlackKnurledDial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x222426),
  metalness: 0.92,
  roughness: 0.18,
  normalMap: knurledNormal,
  normalScale: new THREE.Vector2(2.0, 2.0),
});

// Classic Silver Chrome Knurled Dial
const matSilverKnurledDial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xDFE2E6),
  metalness: 0.98,
  roughness: 0.14,
  normalMap: knurledNormal,
  normalScale: new THREE.Vector2(2.0, 2.0),
});

// Crisp Luminous White Engraved Numbers for Leica Dials & Top Plate
const matDialTextWhite = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xFFFFFF),
  emissive: new THREE.Color(0xFFFFFF),
  emissiveIntensity: 0.45, // Crisp luminous white matching authentic Leica engraved enamel inlay
  roughness: 0.12,
  metalness: 0.05,
  polygonOffset: true,
  polygonOffsetFactor: -1.0,
  polygonOffsetUnits: -2.0,
});

// Vibrant Leica Red 'A' Mark on Dials
const matDialTextRed = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xE00613),
  emissive: new THREE.Color(0xE00613),
  emissiveIntensity: 0.35,
  roughness: 0.15,
  metalness: 0.08,
  polygonOffset: true,
  polygonOffsetFactor: -1.0,
  polygonOffsetUnits: -2.0,
});

// Deep Jet Black Engraved Markings for Classic Silver Finish
const matDialTextBlack = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x111111),
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 0.0,
  roughness: 0.22,
  metalness: 0.10,
  polygonOffset: true,
  polygonOffsetFactor: -1.0,
  polygonOffsetUnits: -2.0,
});

// Body Top & Bottom Plates in Stealth Black Finish
const matBlackAnodized = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x18181A),
  metalness: 0.82,
  roughness: 0.28,
});

// Body Top & Bottom Plates in Classic Silver Chrome Finish
const matSilverChrome = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xE2E4E8),
  metalness: 0.98,
  roughness: 0.14,
});

// 3. Luxury Optical Glass Material (High transmission + clearcoat glints)
const matOpticalGlass = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0xFAFCFF),
  transmission: 0.96,
  ior: 1.54,
  roughness: 0.02,
  reflectivity: 0.98,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  transparent: true,
  opacity: 0.90,
});

// 4. Stainless Steel Bayonet Mount Flange
const matBayonetFlange = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0xF0F3F7),
  metalness: 0.98,
  roughness: 0.12,
});

/* ==========================================================================
   MODEL DATA, 4 MACRO MODULES & COAXIAL Z-EXPLOSION GEOMETRY
   ========================================================================== */
const originalTransforms = new Map();
const originalMaterials = new Map();
const moduleExplodeVectors = new Map();
const microExplodeVectors = new Map();
const meshGeoCenters = new Map();

// Precision Local Geometry Centers (Determined from GLTF CAD mesh vertices)
const OVERALL_MODEL_CENTER = new THREE.Vector3(-0.0109, 0.2770, 0.0095);
const BAYONET_CENTER = new THREE.Vector3(0.0518, 0.2304, 0.1162);
const SHUTTER_DIAL_CENTER = new THREE.Vector3(-0.1685, 0.5279, 0.0139);
const SENSOR_CENTER = new THREE.Vector3(0.0518, 0.2304, 0.0095);

let overallModelCenter = OVERALL_MODEL_CENTER.clone();
let bayonetCenter = BAYONET_CENTER.clone();
let shutterDialCenter = SHUTTER_DIAL_CENTER.clone();
let sensorCenter = SENSOR_CENTER.clone();

// 3D Hotspot local anchor positions
const hotspotPositions = {
  viewfinder: new THREE.Vector3(0.12, 0.48, 0.06),
  shutter: SHUTTER_DIAL_CENTER.clone(),
  badge: new THREE.Vector3(0.15, 0.38, 0.12),
};

let modelRoot = null;
const bodyPlates = [];
const dialMeshes = [];
const hardwareMeshes = [];
const whiteMarkingsMeshes = [];
let leatheretteMesh = null;
let bayonetFlangeMesh = null;
let shutterDialMesh = null;

// Macro Sub-Assemblies & Chapter Isolation Sets
const subAssemblySets = {
  BAYONET: new Set(),
  FRONT_MISC: new Set(),
  SENSOR: new Set(),
  DIALS: new Set(),
  BASEPLATE: new Set(),
  CHASSIS: new Set(),
};

/* ==========================================================================
   VISIBILITY & MATERIAL ASSIGNMENT
   ========================================================================== */
function updateChapterMaterialsAndVisibility() {
  if (!modelRoot) return;

  moduleExplodeVectors.forEach((modVec, mesh) => {
    const origMat = originalMaterials.get(mesh);
    if (!origMat) return;
    mesh.material = origMat;
  });
}

function updateFinishMaterials() {
  const isSilver = state.finish === 'silver';
  bodyPlates.forEach((mesh) => {
    mesh.material = (isSilver ? matSilverChrome : matBlackAnodized).clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
    originalMaterials.set(mesh, mesh.material);
  });
  hardwareMeshes.forEach((mesh) => {
    mesh.material = (isSilver ? matSilverChrome : matBlackAnodized).clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
    originalMaterials.set(mesh, mesh.material);
  });
  dialMeshes.forEach((mesh) => {
    mesh.material = (isSilver ? matSilverKnurledDial : matBlackKnurledDial).clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
    originalMaterials.set(mesh, mesh.material);
  });
  whiteMarkingsMeshes.forEach((mesh) => {
    mesh.material = (isSilver ? matDialTextBlack : matDialTextWhite).clone();
    mesh.material.transparent = true;
    mesh.material.depthWrite = true;
    originalMaterials.set(mesh, mesh.material);
  });
  if (leatheretteMesh) {
    leatheretteMesh.material = matLeatherette.clone();
    leatheretteMesh.material.transparent = true;
    leatheretteMesh.material.depthWrite = true;
    originalMaterials.set(leatheretteMesh, leatheretteMesh.material);
  }
  updateChapterMaterialsAndVisibility();
}

function toggleHotspots(visible) {
  state.hotspotsVisible = visible;
  const display = visible ? 'block' : 'none';
  if (hotspotViewfinder) hotspotViewfinder.style.display = display;
  if (hotspotShutter) hotspotShutter.style.display = display;
  if (hotspotBadge) hotspotBadge.style.display = display;
}

/* ==========================================================================
   MODEL CLASSIFICATION & GLTF INGESTION
   ========================================================================== */
function classifyAndAssignVectors(mesh) {
  const name = (mesh.name || '').toLowerCase();

  mesh.geometry.computeVertexNormals();

  originalTransforms.set(mesh, {
    position: mesh.position.clone(),
    rotation: mesh.rotation.clone(),
    scale: mesh.scale.clone(),
  });

  // Assign specialized materials
  if (name.includes('white')) {
    whiteMarkingsMeshes.push(mesh);
    mesh.material = (state.finish === 'silver' ? matDialTextBlack : matDialTextWhite).clone();
  } else if (name.includes('red') && !name.includes('badge')) {
    mesh.material = matDialTextRed.clone();
  } else if (name.includes('body top') || name.includes('body bottom')) {
    bodyPlates.push(mesh);
    mesh.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
  } else if (name.includes('dial') || name.includes('thumb wheel')) {
    dialMeshes.push(mesh);
    mesh.material = state.finish === 'silver' ? matSilverKnurledDial : matBlackKnurledDial;
  } else if (
    name.includes('accessory shoe') ||
    name.includes('main switch') ||
    name.includes('function button') ||
    name.includes('battery release lever') ||
    name.includes('lens release button') ||
    name.includes('image field selector') ||
    name.includes('strap lugs')
  ) {
    hardwareMeshes.push(mesh);
    mesh.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
  } else if (name.includes('mesh.052') || name.includes('body middle')) {
    leatheretteMesh = mesh;
    mesh.material = matLeatherette;
  } else if (name.includes('glass') || name.includes('eyepiece') || name.includes('sensor') || name.includes('viewfinder') || name.includes('finder') || name.includes('window')) {
    mesh.material = matOpticalGlass.clone();
  } else if (name === 'bayonet.005' || name === 'bayonet') {
    mesh.material = matBayonetFlange.clone();
    bayonetFlangeMesh = mesh;
  }

  mesh.material = mesh.material.clone();
  mesh.material.transparent = true;
  mesh.material.opacity = 1.0;
  mesh.material.depthWrite = true;
  originalMaterials.set(mesh, mesh.material);

  /* 4 MACRO MODULE CLASSIFICATION (PURE COAXIAL Z-AXIS ONLY) */
  // Chapter 1: Precision Stainless Steel Bayonet Mount & Sliding Lens Cap (Clean Showcase: No Badge/Selector)
  if (name.includes('bayonet') || name.includes('lens cap')) {
    subAssemblySets.BAYONET.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 1.45));
    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('lens cap font') || name.includes('lens cap.002')) {
      micro.set(0, 0, 0.32);
    } else if (name.includes('lens cap')) {
      micro.set(0, 0, 0.25);
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Front accessories & optical windows (explodes with Module 1 in Phase 1, but NEVER shown in Chapter 1)
  else if (
    name.includes('release button') ||
    name.includes('selector') ||
    name.includes('badge') ||
    name.includes('finder window') ||
    name.includes('brightness sensor') ||
    name === 'glass' ||
    name === 'glass.001' ||
    name === 'glass.005' ||
    name === 'glass.006'
  ) {
    subAssemblySets.FRONT_MISC.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 1.45));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 3: Top Deck & Controls (-Z: -0.70m macro explosion)
  else if (
    name.includes('body top') ||
    name.includes('dial') ||
    name.includes('thumb wheel') ||
    name.includes('accessory shoe') ||
    name.includes('main switch') ||
    name.includes('function button')
  ) {
    subAssemblySets.DIALS.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -0.70));
    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('dial') || name.includes('thumb wheel')) {
      micro.set(0, 0.08, 0); // Dials hover vertically above top deck before snap
    }
    microExplodeVectors.set(mesh, micro);
  }
  // Module 4: Baseplate & Rear Deck (-Z: -1.40m macro explosion)
  else if (
    name.includes('body bottom') ||
    name.includes('battery') ||
    name.includes('lcd') ||
    name.includes('eyepiece') ||
    name === 'glass.002' ||
    name === 'glass.003' ||
    name === 'glass.004'
  ) {
    subAssemblySets.BASEPLATE.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -1.40));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 2: Central Magnesium Chassis & Leatherette (Anchor Z = 0.0m)
  else if (name.includes('body middle') || name.includes('mesh.052') || name.includes('strap lugs')) {
    subAssemblySets.CHASSIS.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0.0));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 2: 60MP Sensor Core & Optical Cavity (Anchor Z = 0.0m)
  else {
    subAssemblySets.SENSOR.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0.0));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }

  if (name === 'shutter speed dial') {
    shutterDialMesh = mesh;
  }
}

// Model Loading with Real-Time Percentage Tracking
const loader = new GLTFLoader();
const modelUrl = './assets/leica_m11_master.glb';

loader.load(
  modelUrl,
  (gltf) => {
    modelRoot = gltf.scene;

    // Record individual mesh geometric centers
    modelRoot.traverse((child) => {
      if (child.isMesh) {
        child.geometry.computeBoundingBox();
        const geoBox = child.geometry.boundingBox;
        const geoCenter = geoBox.getCenter(new THREE.Vector3());
        meshGeoCenters.set(child, geoCenter);
      }
    });

    modelRoot.traverse((child) => {
      if (child.isMesh) {
        classifyAndAssignVectors(child);
      }
    });

    if (bayonetFlangeMesh && meshGeoCenters.has(bayonetFlangeMesh)) {
      bayonetCenter.copy(meshGeoCenters.get(bayonetFlangeMesh));
    }
    if (shutterDialMesh && meshGeoCenters.has(shutterDialMesh)) {
      shutterDialCenter.copy(meshGeoCenters.get(shutterDialMesh));
      hotspotPositions.shutter.copy(shutterDialCenter);
    }
    sensorCenter.set(bayonetCenter.x, bayonetCenter.y, overallModelCenter.z);

    const badgeMesh = modelRoot.getObjectByName('Badge');
    if (badgeMesh && meshGeoCenters.has(badgeMesh)) {
      hotspotPositions.badge.copy(meshGeoCenters.get(badgeMesh));
    }
    const vfMesh = modelRoot.getObjectByName('View Finder Window') || modelRoot.getObjectByName('Range Finder Window');
    if (vfMesh && meshGeoCenters.has(vfMesh)) {
      hotspotPositions.viewfinder.copy(meshGeoCenters.get(vfMesh));
    }

    scene.add(modelRoot);
    state.isLoaded = true;

    updateFinishMaterials();
    setupTimelineAndTriggers();

    // Transition preloader to interactive Ready state with Enter Experience trigger
    if (preloaderCounter) preloaderCounter.textContent = '100';
    if (preloaderBar) preloaderBar.style.transform = 'scaleX(1)';

    if (preloader) {
      preloader.classList.add('ready');
      if (preloaderSub) preloaderSub.style.display = 'none';
      if (preloaderBarWrap) preloaderBarWrap.style.display = 'none';
      if (preloaderCta) preloaderCta.style.display = 'flex';

      // Tap or click anywhere on the preloader screen to enter with mechanical shutter sound
      preloader.addEventListener('click', () => dismissPreloader(true));
      if (preloaderEnterBtn) {
        preloaderEnterBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dismissPreloader(true);
        });
      }

      // Allow Spacebar or Enter key to trigger entry with sound
      const preloaderKeyHandler = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          window.removeEventListener('keydown', preloaderKeyHandler);
          dismissPreloader(true);
        }
      };
      window.addEventListener('keydown', preloaderKeyHandler);

      // Auto-advance safety timeout after 4.5s so user is never permanently blocked
      setTimeout(() => {
        if (!preloaderDismissed) {
          dismissPreloader(false);
        }
      }, 4500);
    }
  },
  (xhr) => {
    if (xhr.lengthComputable && xhr.total > 0) {
      const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
      if (preloaderCounter) preloaderCounter.textContent = pct;
      if (preloaderBar) preloaderBar.style.transform = `scaleX(${pct / 100})`;
    }
  },
  (err) => {
    console.error('CRITICAL GLTF LOAD ERROR:', err);
    if (preloader) preloader.classList.add('loaded');
  }
);

/* ==========================================================================
   CAMERA & MODEL ANIMATION STATE
   ========================================================================== */
const anim = {
  explode: 0.0,       // Macro 4-module Pure Z Explosion (0.0 = assembled, 1.0 = exploded)
  subExplode1: 0.0,   // Bayonet lens cap micro-separation (+Z)
  subExplode2: 0.0,   // Sensor micro-separation (+Z)
  subExplode3: 0.0,   // Dials micro-separation (+Y)
  modelScale: 1.0,    // Overall model scale
  camX: baseCameraPos.x,
  camY: baseCameraPos.y,
  camZ: baseCameraPos.z,
  lookX: baseTargetPos.x,
  lookY: baseTargetPos.y,
  lookZ: baseTargetPos.z,
  modelRotY: 0.28,
  modelRotX: 0.08,
  modelRotZ: 0.0,
  pivotX: OVERALL_MODEL_CENTER.x,
  pivotY: OVERALL_MODEL_CENTER.y,
  pivotZ: OVERALL_MODEL_CENTER.z,
  worldPivotX: 0.0,
  worldPivotY: 0.05,
  worldPivotZ: 0.0,
  orbitalOpacity: 1.0,
  // Independent module opacities for cinematic seamless transitions
  opBayonet: 1.0,     // Chapter 1: Bayonet mount & lens cap
  opFrontMisc: 1.0,   // Badge, selector, finder windows (fades at end of Phase 1, never in Ch 1)
  opChassis: 1.0,     // Body Middle chassis (fades at end of Phase 1, fades back in Ch 2 & Ch 3)
  opSensor: 1.0,      // Sensor core & cavity
  opDials: 1.0,       // Top Deck & controls
  opBaseplate: 1.0,   // Bottom plate & LCD
  overallOpacity: 1.0,// Master opacity (sacrificed to 0.0 in Outro)
};

let shakeIntensity = 0.0;
function triggerImpactShake(amt = 0.024) {
  shakeIntensity = amt;
}

/* ==========================================================================
   DYNAMIC HAIRLINE LEADER LINE (SVG PROJECTED RETICLE)
   ========================================================================== */
const activeLeaderAnchor = new THREE.Vector3();
const tempVec = new THREE.Vector3();

function updateLeaderLine() {
  if (!leaderLine || !leaderPoint || !modelRoot) return;

  if (window.innerWidth < 768) {
    leaderLine.style.opacity = '0';
    leaderPoint.style.opacity = '0';
    return;
  }

  const mode = state.activeSubAssembly;
  if (mode === 'BAYONET') {
    activeLeaderAnchor.copy(bayonetCenter);
    if (bayonetFlangeMesh) activeLeaderAnchor.add(bayonetFlangeMesh.position);
  } else if (mode === 'SENSOR') {
    activeLeaderAnchor.copy(sensorCenter);
  } else if (mode === 'DIALS') {
    activeLeaderAnchor.copy(shutterDialCenter);
    if (shutterDialMesh) activeLeaderAnchor.add(shutterDialMesh.position);
  } else {
    leaderLine.style.opacity = '0';
    leaderPoint.style.opacity = '0';
    return;
  }

  tempVec.copy(activeLeaderAnchor);
  tempVec.applyMatrix4(modelRoot.matrixWorld);
  tempVec.project(camera);

  // If target is behind camera near-plane
  if (tempVec.z > 1.0) {
    leaderLine.style.opacity = '0';
    leaderPoint.style.opacity = '0';
    return;
  }

  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;
  const targetX = (tempVec.x * widthHalf) + widthHalf;
  const targetY = -(tempVec.y * heightHalf) + heightHalf;

  let activeCard = null;
  if (mode === 'BAYONET') activeCard = cardBayonet;
  else if (mode === 'SENSOR') activeCard = cardSensor;
  else if (mode === 'DIALS') activeCard = cardDials;

  let srcX = window.innerWidth * 0.38;
  let srcY = window.innerHeight * 0.48;

  if (activeCard) {
    const rect = activeCard.getBoundingClientRect();
    if (mode === 'SENSOR') {
      srcX = rect.left - 6;
      srcY = rect.top + rect.height * 0.38;
    } else {
      srcX = rect.right + 6;
      srcY = rect.top + rect.height * 0.38;
    }
  }

  leaderLine.setAttribute('x1', `${srcX}`);
  leaderLine.setAttribute('y1', `${srcY}`);
  leaderLine.setAttribute('x2', `${targetX}`);
  leaderLine.setAttribute('y2', `${targetY}`);
  leaderLine.style.opacity = '0.45';

  leaderPoint.setAttribute('cx', `${targetX}`);
  leaderPoint.setAttribute('cy', `${targetY}`);
  leaderPoint.style.opacity = '1.0';
}

/* ==========================================================================
   HOTSPOTS 3D-TO-2D SCREEN PROJECTION
   ========================================================================== */
function updateHotspotPositions() {
  if (!state.hotspotsVisible || !modelRoot) return;

  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;

  // 1. Viewfinder Hotspot
  if (hotspotViewfinder) {
    tempVec.copy(hotspotPositions.viewfinder);
    tempVec.applyMatrix4(modelRoot.matrixWorld);
    tempVec.project(camera);
    if (tempVec.z <= 1.0) {
      hotspotViewfinder.style.left = `${(tempVec.x * widthHalf) + widthHalf}px`;
      hotspotViewfinder.style.top = `${-(tempVec.y * heightHalf) + heightHalf}px`;
    }
  }

  // 2. Shutter Dial Hotspot
  if (hotspotShutter) {
    tempVec.copy(hotspotPositions.shutter);
    tempVec.applyMatrix4(modelRoot.matrixWorld);
    tempVec.project(camera);
    if (tempVec.z <= 1.0) {
      hotspotShutter.style.left = `${(tempVec.x * widthHalf) + widthHalf}px`;
      hotspotShutter.style.top = `${-(tempVec.y * heightHalf) + heightHalf}px`;
    }
  }

  // 3. Leica Red Dot Badge Hotspot
  if (hotspotBadge) {
    tempVec.copy(hotspotPositions.badge);
    tempVec.applyMatrix4(modelRoot.matrixWorld);
    tempVec.project(camera);
    if (tempVec.z <= 1.0) {
      hotspotBadge.style.left = `${(tempVec.x * widthHalf) + widthHalf}px`;
      hotspotBadge.style.top = `${-(tempVec.y * heightHalf) + heightHalf}px`;
    }
  }
}

/* ==========================================================================
   OPTICAL VERNIER HUD 3D-TO-2D SCREEN PROJECTION (Awwwards Technical Reticle)
   ========================================================================== */
const hudProjPos = new THREE.Vector3();
function updateVernierHUD() {
  if (!modelRoot) return;

  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;
  const mode = state.activeSubAssembly;

  // 1. Bayonet Flange Callout
  if (hudBayonet) {
    if (mode === 'BAYONET') {
      hudProjPos.copy(bayonetCenter);
      hudProjPos.applyMatrix4(modelRoot.matrixWorld);
      hudProjPos.project(camera);

      if (hudProjPos.z < 1.0) {
        const x = (hudProjPos.x * widthHalf) + widthHalf;
        const y = -(hudProjPos.y * heightHalf) + heightHalf;
        hudBayonet.style.left = `${Math.round(x + 24)}px`;
        hudBayonet.style.top = `${Math.round(y - 20)}px`;
        hudBayonet.classList.add('active');
      } else {
        hudBayonet.classList.remove('active');
      }
    } else {
      hudBayonet.classList.remove('active');
    }
  }

  // 2. Sensor Core Callout
  if (hudSensor) {
    if (mode === 'SENSOR') {
      hudProjPos.copy(sensorCenter);
      hudProjPos.applyMatrix4(modelRoot.matrixWorld);
      hudProjPos.project(camera);

      if (hudProjPos.z < 1.0) {
        const x = (hudProjPos.x * widthHalf) + widthHalf;
        const y = -(hudProjPos.y * heightHalf) + heightHalf;
        hudSensor.style.left = `${Math.round(x + 24)}px`;
        hudSensor.style.top = `${Math.round(y - 20)}px`;
        hudSensor.classList.add('active');
      } else {
        hudSensor.classList.remove('active');
      }
    } else {
      hudSensor.classList.remove('active');
    }
  }

  // 3. Shutter Speed Dial Callout
  if (hudDial) {
    if (mode === 'DIALS') {
      hudProjPos.copy(shutterDialCenter);
      hudProjPos.applyMatrix4(modelRoot.matrixWorld);
      hudProjPos.project(camera);

      if (hudProjPos.z < 1.0) {
        const x = (hudProjPos.x * widthHalf) + widthHalf;
        const y = -(hudProjPos.y * heightHalf) + heightHalf;
        hudDial.style.left = `${Math.round(x + 24)}px`;
        hudDial.style.top = `${Math.round(y - 20)}px`;
        hudDial.classList.add('active');
      } else {
        hudDial.classList.remove('active');
      }
    } else {
      hudDial.classList.remove('active');
    }
  }
}

/* ==========================================================================
   GSAP & SCROLLTRIGGER SYNCHRONIZED CHOREOGRAPHY & HAPTIC DETENTS
   ========================================================================== */
let masterTimeline = null;
let pinTriggers = [];

// Shared layout and scroll metrics accessible across direct listeners and timeline
const scrollMetrics = {
  sBayonetPin: 0,
  sBayonetEnd: 0,
  sSensorPin: 0,
  sSensorEnd: 0,
  sDialsPin: 0,
  sDialsEnd: 0,
  sRangefinderPin: 0,
  sRangefinderEnd: 0,
  sAssembledPin: 0,
  sAssembledEnd: 0,
  sOutroEnd: 0,
  durBayonetPin: 1,
  durSensorTrans: 1,
  durSensorPin: 1,
  durDialsTrans: 1,
  durDialsPin: 1,
  durRangefinderTrans: 1,
  durRangefinderPin: 1,
  durAssembledTrans: 1,
  durAssembledPin: 1,
  durOutro: 1,
};

let lastScrollY = typeof window !== 'undefined' ? (window.pageYOffset || document.documentElement.scrollTop || 0) : 0;
let lastScrollTime = performance.now();
let smoothedVelocity = 0;

// High-precision zero-latency state synchronization & mechanical audio detents
function syncScrollState(scrollY, velocity) {
  if (!state.isLoaded) return;

  const now = performance.now();
  const dt = now - lastScrollTime;

  // Recalculate velocity only when at least 4ms have elapsed to prevent zero-velocity collapse
  if (dt >= 4) {
    const instantVelocity = (velocity !== undefined && velocity !== null && !isNaN(velocity))
      ? Math.abs(velocity)
      : (Math.abs(scrollY - lastScrollY) / dt) * 1000;
    smoothedVelocity = smoothedVelocity * 0.65 + instantVelocity * 0.35;
    lastScrollY = scrollY;
    lastScrollTime = now;
  }

  // Speed multiplier 0.95 to 1.35 based on smoothed scroll velocity
  const speedMultiplier = Math.min(1.35, Math.max(0.95, 0.95 + (smoothedVelocity / 3500) * 0.40));

  // 1. Mechanical Dial Detent Audio Click & Chapter 3 Winding Ratchet on Scroll
  const currentDetent = Math.floor(scrollY / 45);
  if (currentDetent !== state.lastDetent) {
    if (state.lastDetent !== null) {
      if (audio.isUnlocked) {
        const inChapter3 = (state.activeSubAssembly === 'DIALS') ||
          (scrollY >= scrollMetrics.sDialsPin - 30 && scrollY <= scrollMetrics.sDialsEnd + 30);

        if (inChapter3) {
          // Chapter 3 Tactile Command: delicate mechanical winding gear ratchet clicks!
          const toothPitch = speedMultiplier * (1.0 + ((Math.abs(currentDetent) % 3) * 0.03));
          audio.playRatchet(toothPitch);
        } else {
          const detentVariation = 1.0 + ((Math.abs(currentDetent) % 5) * 0.04);
          const finalPitch = speedMultiplier * detentVariation;
          audio.playTick(finalPitch);
        }
      } else {
        // Audio is still suspended pending user interaction (common on public Internet HTTPS)
        showAudioPill();
      }
    }
    state.lastDetent = currentDetent;
  }

  // 2. Spring-Loaded Bayonet Rotation Twist & Heavy Steel Latch Click as Bayonet Docks into Chassis
  const mountDockThreshold = scrollMetrics.sBayonetEnd + scrollMetrics.durSensorTrans * 0.86;
  if (scrollY >= mountDockThreshold && scrollY <= scrollMetrics.sSensorPin + 80) {
    if (!state.mountLocked) {
      triggerImpactShake(0.008);
      audio.playMountLock();
      state.mountLocked = true;
    }
  } else if (scrollY < mountDockThreshold - 80) {
    state.mountLocked = false;
  }

  // 3. Synchronize Chapter Isolation HUD & Reticle Lines
  let desiredMode = null;
  if (scrollY < scrollMetrics.sBayonetPin - 80) {
    desiredMode = null;
  } else if (scrollY < (scrollMetrics.sBayonetEnd + scrollMetrics.sSensorPin) / 2) {
    desiredMode = 'BAYONET';
  } else if (scrollY < (scrollMetrics.sSensorEnd + scrollMetrics.sDialsPin) / 2) {
    desiredMode = 'SENSOR';
  } else if (scrollY < scrollMetrics.sDialsEnd + 60) {
    desiredMode = 'DIALS';
  } else if (scrollY < scrollMetrics.sAssembledEnd + 40) {
    desiredMode = null;
  } else {
    desiredMode = 'OUTRO';
  }

  if (state.activeSubAssembly !== desiredMode) {
    state.activeSubAssembly = desiredMode;
    updateChapterMaterialsAndVisibility();
  }

  // 4. Hotspots toggle during Assembled section
  const shouldShowHotspots = (scrollY >= scrollMetrics.sAssembledPin - 30 && scrollY <= scrollMetrics.sAssembledEnd + 20);
  if (shouldShowHotspots !== state.hotspotsVisible) {
    toggleHotspots(shouldShowHotspots);
  }

  // 5. Reassembly Snap Climax Trigger
  if (scrollY >= scrollMetrics.sAssembledPin - 20 && scrollY <= scrollMetrics.sAssembledEnd + 20) {
    if (!state.snappedClimax) {
      triggerImpactShake(0.024);
      audio.playSnap();
      state.snappedClimax = true;
    }
  } else if (scrollY < scrollMetrics.sAssembledPin - 100 || scrollY > scrollMetrics.sAssembledEnd + 120) {
    state.snappedClimax = false;
  }

  // 6. Cinematic Drift & Cross-Fade for Editorial Cards
  if (cardBayonet && scrollMetrics.durBayonetPin > 0) {
    const p = (scrollY - scrollMetrics.sBayonetPin) / scrollMetrics.durBayonetPin;
    const op = p < 0 ? Math.max(0, 1 + p * 3) : p > 1 ? Math.max(0, 1 - (p - 1) * 3) : 1;
    const drift = (p - 0.5) * -30;
    cardBayonet.style.opacity = `${op}`;
    cardBayonet.style.transform = `translateY(${drift}px)`;
  }
  if (cardSensor && scrollMetrics.durSensorPin > 0) {
    const p = (scrollY - scrollMetrics.sSensorPin) / scrollMetrics.durSensorPin;
    const op = p < 0 ? Math.max(0, 1 + p * 3) : p > 1 ? Math.max(0, 1 - (p - 1) * 3) : 1;
    const drift = (p - 0.5) * -30;
    cardSensor.style.opacity = `${op}`;
    cardSensor.style.transform = `translateY(${drift}px)`;
  }
  if (cardDials && scrollMetrics.durDialsPin > 0) {
    const p = (scrollY - scrollMetrics.sDialsPin) / scrollMetrics.durDialsPin;
    const op = p < 0 ? Math.max(0, 1 + p * 3) : p > 1 ? Math.max(0, 1 - (p - 1) * 3) : 1;
    const drift = (p - 0.5) * -30;
    cardDials.style.opacity = `${op}`;
    cardDials.style.transform = `translateY(${drift}px)`;
  }

  // 7. Cinematic Drift & Fade for Free-style 60MP row
  const freestyleContainer = document.querySelector('.freestyle-metrics-container');
  if (freestyleContainer && scrollMetrics.durRangefinderPin > 0) {
    const p = (scrollY - scrollMetrics.sRangefinderPin) / scrollMetrics.durRangefinderPin;
    const op = p < 0 ? Math.max(0, 1 + p * 3.5) : p > 1 ? Math.max(0, 1 - (p - 1) * 3.5) : 1;
    const drift = (p - 0.5) * -25;
    freestyleContainer.style.opacity = `${op}`;
    freestyleContainer.style.transform = `translateY(${drift}px)`;
  }

  // 8. Cinematic Drift & Fade for Phase 5 Reassembly text
  const assembledText = document.querySelector('.assembled-sticky-text');
  if (assembledText && scrollMetrics.durAssembledPin > 0) {
    const p = (scrollY - scrollMetrics.sAssembledPin) / scrollMetrics.durAssembledPin;
    const op = p < 0 ? Math.max(0, 1 + p * 3.5) : p > 1 ? Math.max(0, 1 - (p - 1) * 3.5) : 1;
    const drift = (p - 0.5) * -20;
    assembledText.style.opacity = `${op}`;
    assembledText.style.transform = `translateY(${drift}px)`;
  }

  // 9. Outro Typography Drift & Fade
  const outroContent = document.querySelector('.outro-center-content');
  if (outroContent && scrollMetrics.durOutro > 0) {
    const p = (scrollY - scrollMetrics.sAssembledEnd) / scrollMetrics.durOutro;
    const op = Math.min(1, Math.max(0, p * 2.2));
    const drift = Math.max(0, (1 - p * 1.8) * 35);
    outroContent.style.opacity = `${op}`;
    outroContent.style.transform = `translateY(${drift}px)`;
  }
}

function setupTimelineAndTriggers() {
  if (masterTimeline) {
    masterTimeline.kill();
    masterTimeline = null;
  }
  pinTriggers.forEach((pt) => pt.kill());
  pinTriggers = [];

  // 1. Create pinned chapter triggers with explicit pixel pinSpacing
  const pinBayonet = ScrollTrigger.create({
    trigger: '#chapter-bayonet',
    start: 'top top',
    end: '+=120%',
    pin: true,
    pinSpacing: true,
    refreshPriority: 10,
    id: 'pin-bayonet',
  });
  pinTriggers.push(pinBayonet);

  const pinSensor = ScrollTrigger.create({
    trigger: '#chapter-sensor',
    start: 'top top',
    end: '+=120%',
    pin: true,
    pinSpacing: true,
    refreshPriority: 10,
    id: 'pin-sensor',
  });
  pinTriggers.push(pinSensor);

  const pinDials = ScrollTrigger.create({
    trigger: '#chapter-dials',
    start: 'top top',
    end: '+=120%',
    pin: true,
    pinSpacing: true,
    refreshPriority: 10,
    id: 'pin-dials',
  });
  pinTriggers.push(pinDials);

  const pinRangefinder = ScrollTrigger.create({
    trigger: '#chapter-rangefinder',
    start: 'top top',
    end: '+=140%',
    pin: true,
    pinSpacing: true,
    refreshPriority: 10,
    id: 'pin-rangefinder',
  });
  pinTriggers.push(pinRangefinder);

  const pinAssembled = ScrollTrigger.create({
    trigger: '#section-assembled',
    start: 'top top',
    end: '+=140%',
    pin: true,
    pinSpacing: true,
    refreshPriority: 10,
    id: 'pin-assembled',
  });
  pinTriggers.push(pinAssembled);

  // Recalculate layout metrics & pin-spacers
  ScrollTrigger.refresh();

  const maxScroll = Math.max(
    1,
    (ScrollTrigger.maxScroll ? ScrollTrigger.maxScroll(window) : 0) ||
      (document.documentElement.scrollHeight - window.innerHeight)
  );

  scrollMetrics.sBayonetPin = Math.max(1, pinBayonet.start);
  scrollMetrics.sBayonetEnd = Math.max(scrollMetrics.sBayonetPin + 1, pinBayonet.end);
  scrollMetrics.sSensorPin = Math.max(scrollMetrics.sBayonetEnd, pinSensor.start);
  scrollMetrics.sSensorEnd = Math.max(scrollMetrics.sSensorPin + 1, pinSensor.end);
  scrollMetrics.sDialsPin = Math.max(scrollMetrics.sSensorEnd, pinDials.start);
  scrollMetrics.sDialsEnd = Math.max(scrollMetrics.sDialsPin + 1, pinDials.end);
  scrollMetrics.sRangefinderPin = Math.max(scrollMetrics.sDialsEnd, pinRangefinder.start);
  scrollMetrics.sRangefinderEnd = Math.max(scrollMetrics.sRangefinderPin + 1, pinRangefinder.end);
  scrollMetrics.sAssembledPin = Math.max(scrollMetrics.sRangefinderEnd, pinAssembled.start);
  scrollMetrics.sAssembledEnd = Math.max(scrollMetrics.sAssembledPin + 1, pinAssembled.end);
  scrollMetrics.sOutroEnd = Math.max(scrollMetrics.sAssembledEnd + 1, maxScroll);

  scrollMetrics.durBayonetPin = scrollMetrics.sBayonetEnd - scrollMetrics.sBayonetPin;
  scrollMetrics.durSensorTrans = Math.max(1, scrollMetrics.sSensorPin - scrollMetrics.sBayonetEnd);
  scrollMetrics.durSensorPin = scrollMetrics.sSensorEnd - scrollMetrics.sSensorPin;
  scrollMetrics.durDialsTrans = Math.max(1, scrollMetrics.sDialsPin - scrollMetrics.sSensorEnd);
  scrollMetrics.durDialsPin = scrollMetrics.sDialsEnd - scrollMetrics.sDialsPin;
  scrollMetrics.durRangefinderTrans = Math.max(1, scrollMetrics.sRangefinderPin - scrollMetrics.sDialsEnd);
  scrollMetrics.durRangefinderPin = scrollMetrics.sRangefinderEnd - scrollMetrics.sRangefinderPin;
  scrollMetrics.durAssembledTrans = Math.max(1, scrollMetrics.sAssembledPin - scrollMetrics.sRangefinderEnd);
  scrollMetrics.durAssembledPin = scrollMetrics.sAssembledEnd - scrollMetrics.sAssembledPin;
  scrollMetrics.durOutro = Math.max(1, scrollMetrics.sOutroEnd - scrollMetrics.sAssembledEnd);

  const {
    sBayonetPin, sBayonetEnd, sSensorPin, sSensorEnd, sDialsPin, sDialsEnd,
    sRangefinderPin, sRangefinderEnd, sAssembledPin, sAssembledEnd, sOutroEnd,
    durBayonetPin, durSensorTrans, durSensorPin, durDialsTrans, durDialsPin,
    durRangefinderTrans, durRangefinderPin, durAssembledTrans, durAssembledPin, durOutro
  } = scrollMetrics;

  // 2. Master timeline calibrated 1:1 with real scroll pixels
  masterTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0,
      refreshPriority: 0,
      onUpdate: (self) => {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const velocity = self && typeof self.getVelocity === 'function' ? self.getVelocity() : null;
        syncScrollState(scrollY, velocity);
      },
    },
  });

  const tl = masterTimeline;

  // --- Phase 1: Hero to Coaxial Pure-Z Explosion (0 -> sBayonetPin) ---
  const tExplodeEnd = sBayonetPin * 0.60;
  const tExplodeHold = sBayonetPin * 0.82;
  const tTransBayonet = sBayonetPin - tExplodeHold;

  // Continuous multi-angle rotation during explosion (30° oblique -> 60° side sweep)
  tl.to(anim, {
    explode: 1.0,
    modelScale: 1.0,
    camX: -0.45,
    camY: 0.85, // Elevated camera angle looking down
    camZ: 2.15,
    lookX: 0.0,
    lookY: 0.08,
    lookZ: 0.0,
    modelRotY: 0.65, // 37° oblique angle
    modelRotX: 0.12,
    orbitalOpacity: 0.0,
    opBayonet: 1.0,
    opFrontMisc: 1.0,
    opChassis: 1.0,
    opSensor: 1.0,
    opDials: 1.0,
    opBaseplate: 1.0,
    overallOpacity: 1.0,
    duration: tExplodeEnd,
    ease: 'power1.out',
  })
  .to(anim, {
    modelRotY: 1.05, // 60° side sweep catching specular highlights
    camY: 0.82,
    duration: tExplodeHold - tExplodeEnd,
    ease: 'none',
  })
  // Seamless transition into Chapter 1 (NO PREMATURE SNAP):
  // Modules 2, 3, 4 & non-bayonet parts fade out smoothly to 0.0; camera glides to bayonet center!
  // Explode remains 1.0 so parts NEVER snap together prematurely!
  .to(anim, {
    opFrontMisc: 0.0,
    opChassis: 0.0,
    opSensor: 0.0,
    opDials: 0.0,
    opBaseplate: 0.0,
    opBayonet: 1.0,
    modelScale: 1.0,
    pivotX: bayonetCenter.x,
    pivotY: bayonetCenter.y,
    pivotZ: bayonetCenter.z + 1.45, // Flange is at +1.45m in exploded state
    worldPivotX: 0.12, // Offset right for left text
    worldPivotY: 0.05,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.45, // Elevated camera
    camZ: 0.75,
    lookX: 0.12,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotX: 0.14,
    modelRotY: 0.35,
    duration: tTransBayonet,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 1: Bayonet Pinned Dwell (sBayonetPin -> sBayonetEnd) ---
  // Only Bayonet.005 and lens cap sliding along Z are showcased
  .to(anim, {
    subExplode1: 1.0, // Lens cap slides forward +Z, exposing stainless steel flange
    modelRotY: -0.30, // Multi-angle sweep
    duration: durBayonetPin,
    ease: 'none',
  })

  // --- Transition from Bayonet to Chapter 2 Sensor (sBayonetEnd -> sSensorPin) ---
  // Smoothly fade in central body chassis while keeping bayonet mount assembly directly visible
  .to(anim, {
    subExplode1: 0.0,
    explode: 0.0, // Settle explode while other modules are invisible (zero jump)
    opBayonet: 1.0, // Keep neat bayonet mount assembly visible together with chassis
    opChassis: 1.0, // Central body chassis smoothly fades in from transparent to solid
    opSensor: 1.0,  // 60MP sensor inside fades in
    pivotX: sensorCenter.x,
    pivotY: sensorCenter.y,
    pivotZ: sensorCenter.z,
    worldPivotX: -0.12, // Offset left for right text
    worldPivotY: 0.05,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.45, // Elevated camera
    camZ: 0.72,
    lookX: -0.12,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotX: 0.14,
    modelRotY: -0.30,
    duration: durSensorTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 2: Sensor Core Pinned Dwell (sSensorPin -> sSensorEnd) ---
  // Central magnesium chassis & 60MP sensor core solidly mounted with zero optical glass detachment
  .to(anim, {
    explode: 0.0,
    subExplode2: 0.0, // Solidly mounted, zero detachment along Z
    modelRotY: 0.35, // Multi-angle sweep catching sensor optics
    duration: durSensorPin,
    ease: 'none',
  })

  // --- Transition from Sensor to Chapter 3 Dials (sSensorEnd -> sDialsPin) ---
  // Camera is 100% fully assembled and complete: all 66 components solid (1.0) and in place (explode: 0.0)
  .to(anim, {
    explode: 0.0,
    subExplode1: 0.0,
    subExplode2: 0.0,
    subExplode3: 0.0,
    modelScale: 1.0,
    opBayonet: 1.0,
    opFrontMisc: 1.0, // Front finder windows, badge & selector 100% solid
    opChassis: 1.0,   // Central body chassis & leatherette wrap 100% solid
    opSensor: 1.0,    // 60MP sensor core 100% solid, fully assembled, zero hollow cavity
    opDials: 1.0,     // Top plate and knurled dials 100% sharp & solid
    opBaseplate: 1.0, // Bottom plate 100% solid
    overallOpacity: 1.0,
    pivotX: shutterDialCenter.x,
    pivotY: shutterDialCenter.y,
    pivotZ: shutterDialCenter.z,
    worldPivotX: 0.12, // Offset right for left text
    worldPivotY: 0.05,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.65, // Camera angled at 48° from above looking down at top deck and dials
    camZ: 0.62,
    lookX: 0.12,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotX: 0.22, // Camera pitch down ~48° onto top deck
    modelRotY: -0.20,
    duration: durDialsTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 3: Tactile Controls Pinned Dwell (sDialsPin -> sDialsEnd) ---
  // 100% fully assembled and complete Leica M11 body (zero floating parts, zero hollow cavities, zero tàng hình)
  .to(anim, {
    explode: 0.0,
    subExplode1: 0.0,
    subExplode2: 0.0,
    subExplode3: 0.0,
    opBayonet: 1.0,
    opFrontMisc: 1.0,
    opChassis: 1.0,
    opSensor: 1.0,
    opDials: 1.0,
    opBaseplate: 1.0,
    overallOpacity: 1.0,
    modelRotY: 0.22, // Elegant specular sweep across solid dials and top deck
    duration: durDialsPin,
    ease: 'none',
  })

  // --- Transition to Phase 4: Free-Style Metric Row (sDialsEnd -> sRangefinderPin) ---
  // Elevate camera target and world pivot so 3D camera sits comfortably in upper 50-55% of viewport
  .to(anim, {
    explode: 0.0,
    subExplode1: 0.0,
    subExplode2: 0.0,
    subExplode3: 0.0,
    modelScale: 0.85,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.38, // Elevated so model sits comfortably in upper half of viewport (top 50-55%)
    worldPivotZ: 0.0,
    camX: -0.22,
    camY: 0.72,        // Elevated view
    camZ: 1.65,
    lookX: 0.0,
    lookY: 0.10,       // Angled down slightly to leave bottom 45% clear for metrics
    lookZ: 0.0,
    modelRotX: 0.12,
    modelRotY: -0.25,
    opBayonet: 1.0,
    opFrontMisc: 1.0,
    opChassis: 1.0,
    opSensor: 1.0,
    opDials: 1.0,
    opBaseplate: 1.0,
    overallOpacity: 1.0,
    duration: durRangefinderTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 4: Free-Style Kinetic Metric Row Dwell (sRangefinderPin -> sRangefinderEnd) ---
  // 3D camera glides across upper half while 3 massive metrics sit anchored in lower screen
  .to(anim, {
    camX: 0.22,
    modelRotY: 0.30,
    duration: durRangefinderPin,
    ease: 'none',
  })

  // --- Transition to Phase 5: Reassembly Synthesis & Hotspots (sRangefinderEnd -> sAssembledPin) ---
  .to(anim, {
    modelScale: 0.95,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.05,
    worldPivotZ: 0.0,
    camX: -0.25,
    camY: 0.58, // Elevated view
    camZ: 1.60,
    lookX: 0.0,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotX: 0.08,
    modelRotY: 0.18,
    duration: durAssembledTrans,
    ease: 'power2.inOut',
  })
  .call(() => {
    // Exact visual moment of mechanical camera docking
    if (!state.snappedClimax) {
      triggerImpactShake();
      audio.playSnap();
      state.snappedClimax = true;
    }
  })

  // --- Phase 5: Reassembly Synthesis Pinned Dwell (sAssembledPin -> sAssembledEnd) ---
  // Hotspot annotations active
  .to(anim, {
    modelRotY: 0.35,
    duration: durAssembledPin,
    ease: 'none',
  })

  // --- Phase 6: Outro Showcase (sAssembledEnd -> sOutroEnd) ---
  // Fully sacrifice model: rotational revolution (~1.5 turn) + upward glide + smooth fade out into pure white canvas
  .to(anim, {
    overallOpacity: 0.0,
    modelRotY: 0.35 + (1.5 * Math.PI), // Majestic ~1.5 revolution turn as it ascends
    worldPivotY: 0.55,                 // Smooth upward glide into empty air
    camY: 0.45,
    duration: durOutro * 0.55,
    ease: 'power2.out',
  })
  .to(anim, {
    duration: durOutro * 0.45,
    ease: 'none',
  });

  // Immediately synchronize active chapter and card visibility for initial load / refresh
  syncScrollState(window.pageYOffset || document.documentElement.scrollTop);
}

setupTimelineAndTriggers();

// Auto-resume / initialize audio on first valid user gesture
const unlockAudioOnGesture = () => {
  triggerAudioUnlock(true);
};
['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, unlockAudioOnGesture, { passive: true });
});

// Explicit audio activation button in floating header pill
if (audioBannerPill) {
  audioBannerPill.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerAudioUnlock(true);
  });
}

// Zero-latency direct window scroll listener for synchronized dial detent audio
window.addEventListener('scroll', () => {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  syncScrollState(scrollY);
}, { passive: true });

window.addEventListener('pointermove', (e) => {
  state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Replay Button (Trigger Leica focal-plane shutter release and smooth scroll to top via Lenis)
if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    audio.playShutter();
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.6 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Magnetic Button Cursor Hover Interaction (Claude Motion Micro-interaction)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.preloader-enter-btn, .action-btn, .audio-banner-pill').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// Finish Switcher (Stealth Black default <-> Classic Silver Chrome toggle with aperture ring detent click)
if (btnToggleFinish) {
  btnToggleFinish.addEventListener('click', () => {
    audio.playApertureClick();
    if (state.finish === 'black') {
      state.finish = 'silver';
      if (btnFinishLabel) btnFinishLabel.textContent = 'Finish: Classic Silver';
      btnToggleFinish.setAttribute('data-finish', 'silver');
    } else {
      state.finish = 'black';
      if (btnFinishLabel) btnFinishLabel.textContent = 'Finish: Stealth Black';
      btnToggleFinish.setAttribute('data-finish', 'black');
    }
    updateFinishMaterials();
  });
}

// Interactive 3D Hotspots (Ratchet & Detents)
if (hotspotShutter) {
  hotspotShutter.style.cursor = 'pointer';
  hotspotShutter.addEventListener('click', () => {
    audio.playRatchet();
  });
}
if (hotspotViewfinder) {
  hotspotViewfinder.style.cursor = 'pointer';
  hotspotViewfinder.addEventListener('click', () => {
    audio.playApertureClick();
  });
}
if (hotspotBadge) {
  hotspotBadge.style.cursor = 'pointer';
  hotspotBadge.addEventListener('click', () => {
    audio.playApertureClick();
  });
}

// Chapter 3 Spec Chips Interactive Dials Simulation
document.querySelectorAll('.interactive-chip[data-action="ratchet"]').forEach((chip) => {
  chip.addEventListener('click', () => {
    const pitch = parseFloat(chip.getAttribute('data-pitch')) || 1.0;
    audio.playRatchet(pitch);
  });
});

/* ==========================================================================
   MAIN RENDER LOOP (60 FPS OPTIMIZED)
   ========================================================================== */
const lookTarget = new THREE.Vector3();
const tempTargetPos = new THREE.Vector3();

function render() {
  requestAnimationFrame(render);

  if (state.isLoaded && modelRoot) {
    // 1. Mouse Parallax Spring Damping
    state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.05;
    state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.05;

    // 2. Parallax Watermark Backdrop Drift (Counter-Parallax Depth)
    if (watermarkInner) {
      watermarkInner.style.transform = `translate(${-state.mouse.x * 24}px, ${-state.mouse.y * 14}px)`;
    }
    if (watermarkSub) {
      watermarkSub.style.transform = `translate(${-state.mouse.x * 38}px, ${-state.mouse.y * 20}px)`;
    }

    // 3. Dynamic Specular Key & Rim Light Tracking (Chamfer Sheen)
    keyLight.position.set(
      2.4 + state.mouse.x * 1.5,
      3.5 + state.mouse.y * 1.2,
      3.0
    );
    rimLight.position.set(
      -2.5 * Math.sin(anim.modelRotY + 0.8),
      3.2 + Math.cos(anim.modelRotY * 0.5) * 0.5,
      -2.0 * Math.cos(anim.modelRotY + 0.8)
    );

    // 4. Orbital Coordinate Ring
    if (orbitalRing) {
      orbitalRing.rotation.z += 0.003;
      orbitalRingMat.opacity = anim.orbitalOpacity * 0.16;
    }

    // 5. Harmonic Ambient Breathing & Camera Framing ("Nothing is dead-still")
    const elapsed = performance.now() * 0.001;
    const isDwell = smoothedVelocity < 40;
    const breathingAmp = isDwell ? 0.0022 : 0.0004;
    const breathY = Math.sin(elapsed * 1.1) * breathingAmp;
    const breathRotY = Math.cos(elapsed * 0.85) * (breathingAmp * 0.7);

    const zoomFactor = Math.min(1.0, Math.max(0.25, anim.camZ / 2.0));

    camera.position.x = anim.camX + (state.mouse.x * 0.035 * zoomFactor);
    camera.position.y = anim.camY + breathY + (state.mouse.y * 0.035 * zoomFactor);
    camera.position.z = anim.camZ;

    lookTarget.set(anim.lookX, anim.lookY, anim.lookZ);

    if (shakeIntensity > 0.0002) {
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.86;
    }

    camera.lookAt(lookTarget);

    // 6. Model Rotation, Scaling & Dynamic Pivot Placement
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.10 * zoomFactor);
    modelRoot.rotation.y = anim.modelRotY + breathRotY + (state.mouse.x * 0.15 * zoomFactor);
    modelRoot.rotation.z = anim.modelRotZ;

    modelRoot.scale.set(anim.modelScale, anim.modelScale, anim.modelScale);

    // Exact Pivot Transformation:
    // Centers active sub-assembly at world target with zero orbital drift
    const localPivot = new THREE.Vector3(anim.pivotX, anim.pivotY, anim.pivotZ);
    const rotatedPivot = localPivot.clone()
      .multiplyScalar(anim.modelScale)
      .applyEuler(modelRoot.rotation);

    const worldTarget = new THREE.Vector3(anim.worldPivotX, anim.worldPivotY, anim.worldPivotZ);
    modelRoot.position.copy(worldTarget).sub(rotatedPivot);
    modelRoot.updateMatrixWorld(true);

    // 7. Component Visibility, Dynamic Opacity & Coaxial Pure-Z Explosion Geometry
    const masterOp = anim.overallOpacity;
    if (masterOp <= 0.001) {
      modelRoot.visible = false;
    } else {
      modelRoot.visible = true;
      const isChapter3 = (state.activeSubAssembly === 'DIALS');

      moduleExplodeVectors.forEach((modVec, mesh) => {
        const orig = originalTransforms.get(mesh);
        const micro = microExplodeVectors.get(mesh);
        if (!orig) return;

        let baseOp = 1.0;
        if (isChapter3) {
          // Chapter 3: Tactile Command - 100% fully assembled & complete Leica M11 body (all 66 meshes solid)
          baseOp = 1.0;
        } else if (subAssemblySets.BAYONET.has(mesh)) {
          baseOp = anim.opBayonet;
        } else if (subAssemblySets.FRONT_MISC.has(mesh)) {
          baseOp = anim.opFrontMisc;
        } else if (subAssemblySets.CHASSIS.has(mesh)) {
          baseOp = anim.opChassis;
        } else if (subAssemblySets.SENSOR.has(mesh)) {
          baseOp = anim.opSensor;
        } else if (subAssemblySets.DIALS.has(mesh)) {
          baseOp = anim.opDials;
        } else if (subAssemblySets.BASEPLATE.has(mesh)) {
          baseOp = anim.opBaseplate;
        }

        const finalOp = isChapter3 ? 1.0 : Math.max(0, Math.min(1, baseOp * masterOp));
        if (finalOp <= 0.005) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
          if (mesh.material && mesh.material.opacity !== undefined) {
            mesh.material.opacity = finalOp;
            mesh.material.depthWrite = isChapter3 ? true : (finalOp > 0.95);
          }
        }

        // Macro explosion displacement (strictly 0 when explode == 0 or in Chapter 3)
        const effectiveExplode = (isChapter3 || Math.abs(anim.explode) < 0.0001) ? 0.0 : anim.explode;
        const macroZ = modVec.z * effectiveExplode;
        tempTargetPos.copy(orig.position);
        tempTargetPos.z += macroZ;

        let microX = 0, microY = 0, microZ = 0;
        if (micro && !isChapter3) {
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

        tempTargetPos.x += microX;
        tempTargetPos.y += microY;
        tempTargetPos.z += microZ;

        mesh.position.lerp(tempTargetPos, isChapter3 ? 0.35 : 0.20);
      });
    }

    // 8. Update Projections
    updateLeaderLine();
    updateHotspotPositions();
    updateVernierHUD();
  }

  renderer.render(scene, camera);
}

// Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  setupTimelineAndTriggers();
});

render();
