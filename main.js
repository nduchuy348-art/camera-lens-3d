import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

/* ==========================================================================
   GLOBAL STATE & ARCHITECTURAL CONFIGURATION
   ========================================================================== */
const state = {
  isLoaded: false,
  finish: 'black', // 'black' (Matte Anodized) or 'silver' (Classic Chrome)
  activeSubAssembly: null, // null, 'BAYONET', 'SENSOR', 'DIALS', 'OUTRO'
  hotspotsVisible: false,
  lastDetent: -1,
  snappedClimax: false,
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
const btnReplay = document.getElementById('btn-replay');
const btnToggleFinish = document.getElementById('btn-toggle-finish');
const btnFinishLabel = document.getElementById('btn-finish-label');
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloader-counter-val');
const preloaderBar = document.getElementById('preloader-bar');

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

// 5. SolidWorks CAD Technical Blueprint Wireframe Material (Outro Showcase Backdrop: Opacity 0.12)
const matSolidWorksWireframe = new THREE.MeshBasicMaterial({
  color: 0x181B1E,
  wireframe: true,
  transparent: true,
  opacity: 0.12,
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
let leatheretteMesh = null;
let bayonetFlangeMesh = null;
let shutterDialMesh = null;

// Macro Sub-Assemblies & Chapter Isolation Sets
const subAssemblySets = {
  BAYONET: new Set(),
  SENSOR: new Set(),
  DIALS: new Set(),
  BASEPLATE: new Set(),
};

/* ==========================================================================
   VISIBILITY & MATERIAL TRANSITIONS (Strict Isolation & Structural Integrity)
   ========================================================================== */
function updateChapterMaterialsAndVisibility() {
  if (!modelRoot) return;

  const mode = state.activeSubAssembly;

  moduleExplodeVectors.forEach((modVec, mesh) => {
    const origMat = originalMaterials.get(mesh);
    if (!origMat) return;

    const name = mesh.name.toLowerCase();

    if (mode === 'BAYONET') {
      // Chapter 1: Full Front Module (Bayonet.005, release button, image field selector, lens cap sliding out along +Z)
      if (
        name.includes('bayonet') ||
        name.includes('lens cap') ||
        name.includes('release button') ||
        name.includes('selector') ||
        name.includes('badge')
      ) {
        mesh.visible = true;
        mesh.material = (mesh === bayonetFlangeMesh ? matBayonetFlange : origMat);
        if (mesh.material.opacity !== undefined) mesh.material.opacity = 1.0;
      } else {
        mesh.visible = false;
      }
    } else if (mode === 'SENSOR') {
      // Chapter 2: Central chassis (Body Middle with pebbled leatherette) & 60MP BSI CMOS sensor core
      if (
        name.includes('body middle') ||
        name.includes('mesh.052') ||
        (name.includes('sensor') && !name.includes('brightness')) ||
        (name.includes('glass') && !name.includes('glass.002'))
      ) {
        mesh.visible = true;
        mesh.material = origMat;
        if (mesh.material.opacity !== undefined) mesh.material.opacity = 1.0;
      } else {
        mesh.visible = false;
      }
    } else if (mode === 'DIALS') {
      // Chapter 3: Body Top seamlessly mounted with Shutter Speed Dial, ISO Dial, Thumb Wheel, Main Switch, Function Button
      if (
        name.includes('body top') ||
        name.includes('dial') ||
        name.includes('thumb wheel') ||
        name.includes('main switch') ||
        name.includes('function button') ||
        name.includes('accessory shoe')
      ) {
        mesh.visible = true;
        if (name.includes('dial') || name.includes('thumb wheel')) {
          mesh.material = (state.finish === 'silver' ? matSilverKnurledDial : matBlackKnurledDial);
        } else if (name.includes('body top')) {
          mesh.material = (state.finish === 'silver' ? matSilverChrome : matBlackAnodized);
        } else {
          mesh.material = origMat;
        }
        if (mesh.material.opacity !== undefined) mesh.material.opacity = 1.0;
      } else {
        mesh.visible = false;
      }
    } else if (mode === 'OUTRO') {
      // Phase 6 Outro: SolidWorks CAD Wireframe backdrop rotating 360° (opacity 0.12)
      mesh.visible = true;
      mesh.material = matSolidWorksWireframe;
    } else {
      // Outside chapters (Hero, Explode Intro, Free-Style Rangefinder, Reassembly Synthesis): All 66 components visible
      mesh.visible = true;
      mesh.material = origMat;
      if (mesh.material.opacity !== undefined) mesh.material.opacity = 1.0;
    }
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
  dialMeshes.forEach((mesh) => {
    mesh.material = (isSilver ? matSilverKnurledDial : matBlackKnurledDial).clone();
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
  if (name.includes('body top') || name.includes('body bottom')) {
    bodyPlates.push(mesh);
    mesh.material = state.finish === 'silver' ? matSilverChrome : matBlackAnodized;
  } else if (name.includes('dial') || name.includes('thumb wheel')) {
    dialMeshes.push(mesh);
    mesh.material = state.finish === 'silver' ? matSilverKnurledDial : matBlackKnurledDial;
  } else if (name.includes('mesh.052') || name.includes('body middle')) {
    leatheretteMesh = mesh;
    mesh.material = matLeatherette;
  } else if (name.includes('glass') || name.includes('eyepiece') || name.includes('sensor') || name.includes('viewfinder')) {
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
  // Module 1: Front Optics & Flange (+Z: 1.45m macro explosion)
  if (
    name.includes('lens cap') ||
    name.includes('bayonet') ||
    name.includes('release button') ||
    name.includes('selector') ||
    name.includes('badge') ||
    name.includes('finder window') ||
    name.includes('brightness sensor')
  ) {
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
    name.includes('eyepiece')
  ) {
    subAssemblySets.BASEPLATE.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, -1.40));
    microExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0));
  }
  // Module 2: Central Magnesium Chassis & Sensor Core (Center Z = 0.0m anchor)
  else {
    subAssemblySets.SENSOR.add(mesh);
    moduleExplodeVectors.set(mesh, new THREE.Vector3(0, 0, 0.0));
    const micro = new THREE.Vector3(0, 0, 0);
    if (name.includes('glass')) {
      micro.set(0, 0, 0.16);
    }
    microExplodeVectors.set(mesh, micro);
  }

  if (name.includes('shutter speed dial') || name === 'shutter speed dial') {
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

    updateChapterMaterialsAndVisibility();
    setupTimelineAndTriggers();

    // Smooth curtain reveal wipe
    if (preloader) {
      preloader.classList.add('loaded');
      setTimeout(() => {
        preloader.classList.add('hidden');
        preloader.style.display = 'none';
      }, 950);
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
};

let shakeIntensity = 0.0;
function triggerImpactShake() {
  shakeIntensity = 0.024;
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
   GSAP & SCROLLTRIGGER SYNCHRONIZED CHOREOGRAPHY
   ========================================================================== */
let masterTimeline = null;
let pinTriggers = [];

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

  const sBayonetPin = Math.max(1, pinBayonet.start);
  const sBayonetEnd = Math.max(sBayonetPin + 1, pinBayonet.end);
  const sSensorPin = Math.max(sBayonetEnd, pinSensor.start);
  const sSensorEnd = Math.max(sSensorPin + 1, pinSensor.end);
  const sDialsPin = Math.max(sSensorEnd, pinDials.start);
  const sDialsEnd = Math.max(sDialsPin + 1, pinDials.end);
  const sRangefinderPin = Math.max(sDialsEnd, pinRangefinder.start);
  const sRangefinderEnd = Math.max(sRangefinderPin + 1, pinRangefinder.end);
  const sAssembledPin = Math.max(sRangefinderEnd, pinAssembled.start);
  const sAssembledEnd = Math.max(sAssembledPin + 1, pinAssembled.end);
  const sOutroEnd = Math.max(sAssembledEnd + 1, maxScroll);

  const durBayonetPin = sBayonetEnd - sBayonetPin;
  const durSensorTrans = Math.max(1, sSensorPin - sBayonetEnd);
  const durSensorPin = sSensorEnd - sSensorPin;
  const durDialsTrans = Math.max(1, sDialsPin - sSensorEnd);
  const durDialsPin = sDialsEnd - sDialsPin;
  const durRangefinderTrans = Math.max(1, sRangefinderPin - sDialsEnd);
  const durRangefinderPin = sRangefinderEnd - sRangefinderPin;
  const durAssembledTrans = Math.max(1, sAssembledPin - sRangefinderEnd);
  const durAssembledPin = sAssembledEnd - sAssembledPin;
  const durOutro = Math.max(1, sOutroEnd - sAssembledEnd);

  // 2. Master timeline calibrated 1:1 with real scroll pixels
  masterTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0,
      refreshPriority: 0,
      onUpdate: () => {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Synchronize Chapter Isolation Materials & Visibility
        let desiredMode = null;
        if (scrollY < sBayonetPin - 80) {
          desiredMode = null; // Hero / Explode Intro: all 66 visible
        } else if (scrollY < (sBayonetEnd + sSensorPin) / 2) {
          desiredMode = 'BAYONET'; // Chapter 1
        } else if (scrollY < (sSensorEnd + sDialsPin) / 2) {
          desiredMode = 'SENSOR'; // Chapter 2
        } else if (scrollY < sDialsEnd + 60) {
          desiredMode = 'DIALS'; // Chapter 3
        } else if (scrollY < sAssembledEnd + 40) {
          desiredMode = null; // Assembled (Phase 4 Free-Style 60MP & Phase 5 Reassembly): all 66 visible
        } else {
          desiredMode = 'OUTRO'; // Phase 6 Outro: CAD wireframe backdrop
        }

        if (state.activeSubAssembly !== desiredMode) {
          state.activeSubAssembly = desiredMode;
          updateChapterMaterialsAndVisibility();
        }

        // Hotspots toggle during Assembled section
        const shouldShowHotspots = (scrollY >= sAssembledPin - 30 && scrollY <= sAssembledEnd + 20);
        if (shouldShowHotspots !== state.hotspotsVisible) {
          toggleHotspots(shouldShowHotspots);
        }

        // Decisive Climax Impact Shake at Reassembly Snap
        if (scrollY >= sRangefinderTrans * 0.5 + sDialsEnd - 60 && scrollY <= sRangefinderTrans * 0.5 + sDialsEnd + 60) {
          if (!state.snappedClimax) {
            triggerImpactShake();
            state.snappedClimax = true;
          }
        } else if (scrollY < sDialsEnd || scrollY > sRangefinderPin + 100) {
          state.snappedClimax = false;
        }

        // Cinematic Drift & Cross-Fade for Editorial Cards
        if (cardBayonet) {
          const p = (scrollY - sBayonetPin) / durBayonetPin;
          const op = p < 0 ? Math.max(0, 1 + p * 3) : p > 1 ? Math.max(0, 1 - (p - 1) * 3) : 1;
          const drift = (p - 0.5) * -30;
          cardBayonet.style.opacity = `${op}`;
          cardBayonet.style.transform = `translateY(${drift}px)`;
        }
        if (cardSensor) {
          const p = (scrollY - sSensorPin) / durSensorPin;
          const op = p < 0 ? Math.max(0, 1 + p * 3) : p > 1 ? Math.max(0, 1 - (p - 1) * 3) : 1;
          const drift = (p - 0.5) * -30;
          cardSensor.style.opacity = `${op}`;
          cardSensor.style.transform = `translateY(${drift}px)`;
        }
        if (cardDials) {
          const p = (scrollY - sDialsPin) / durDialsPin;
          const op = p < 0 ? Math.max(0, 1 + p * 3) : p > 1 ? Math.max(0, 1 - (p - 1) * 3) : 1;
          const drift = (p - 0.5) * -30;
          cardDials.style.opacity = `${op}`;
          cardDials.style.transform = `translateY(${drift}px)`;
        }

        // Cinematic Drift & Fade for Free-style 60MP row
        const freestyleContainer = document.querySelector('.freestyle-metrics-container');
        if (freestyleContainer) {
          const p = (scrollY - sRangefinderPin) / durRangefinderPin;
          const op = p < 0 ? Math.max(0, 1 + p * 3.5) : p > 1 ? Math.max(0, 1 - (p - 1) * 3.5) : 1;
          const drift = (p - 0.5) * -25;
          freestyleContainer.style.opacity = `${op}`;
          freestyleContainer.style.transform = `translateY(${drift}px)`;
        }

        // Cinematic Drift & Fade for Phase 5 Reassembly text
        const assembledText = document.querySelector('.assembled-sticky-text');
        if (assembledText) {
          const p = (scrollY - sAssembledPin) / durAssembledPin;
          const op = p < 0 ? Math.max(0, 1 + p * 3.5) : p > 1 ? Math.max(0, 1 - (p - 1) * 3.5) : 1;
          const drift = (p - 0.5) * -20;
          assembledText.style.opacity = `${op}`;
          assembledText.style.transform = `translateY(${drift}px)`;
        }

        // Outro Typography Drift & Fade
        const outroContent = document.querySelector('.outro-center-content');
        if (outroContent) {
          const p = (scrollY - sAssembledEnd) / durOutro;
          const op = Math.min(1, Math.max(0, p * 2.5));
          const drift = Math.max(0, (1 - p * 2.0) * 30);
          outroContent.style.opacity = `${op}`;
          outroContent.style.transform = `translateY(${drift}px)`;
        }
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
    duration: tExplodeEnd,
    ease: 'power1.out',
  })
  .to(anim, {
    modelRotY: 1.05, // 60° side sweep catching specular highlights
    camY: 0.82,
    duration: tExplodeHold - tExplodeEnd,
    ease: 'none',
  })
  // Smooth transition into Chapter 1 (Bayonet)
  .to(anim, {
    explode: 0.0,
    modelScale: 1.0,
    pivotX: bayonetCenter.x,
    pivotY: bayonetCenter.y,
    pivotZ: bayonetCenter.z,
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
  // Lens cap slides out along +Z, dynamic angle sweeps
  .to(anim, {
    subExplode1: 1.0, // Lens cap slides forward +Z, exposing stainless steel flange
    modelRotY: -0.30, // Multi-angle sweep
    duration: durBayonetPin,
    ease: 'none',
  })

  // --- Transition from Bayonet to Chapter 2 Sensor (sBayonetEnd -> sSensorPin) ---
  .to(anim, {
    subExplode1: 0.0,
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
  // 100% Full White Gallery, sensor glass hovers slightly
  .to(anim, {
    subExplode2: 1.0,
    modelRotY: 0.35, // Multi-angle sweep catching sensor optics
    duration: durSensorPin,
    ease: 'none',
  })

  // --- Transition from Sensor to Chapter 3 Dials (sSensorEnd -> sDialsPin) ---
  .to(anim, {
    subExplode2: 0.0,
    modelScale: 1.0,
    pivotX: shutterDialCenter.x,
    pivotY: shutterDialCenter.y,
    pivotZ: shutterDialCenter.z,
    worldPivotX: 0.10, // Offset right for left text
    worldPivotY: 0.05,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.65, // Camera angled at 48° from above
    camZ: 0.58,
    lookX: 0.10,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotX: 0.18, // Camera pitch down ~48° onto top deck
    modelRotY: -0.20,
    duration: durDialsTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 3: Tactile Controls Pinned Dwell (sDialsPin -> sDialsEnd) ---
  // Solid Body Top mounted, knurled dials prominent, zero hollow underside visible
  .to(anim, {
    subExplode3: 0.60,
    modelRotY: 0.20,
    duration: durDialsPin * 0.6,
    ease: 'none',
  })
  .to(anim, {
    subExplode3: 0.0, // Dials snap flush
    modelRotY: 0.25,
    duration: durDialsPin * 0.4,
    ease: 'power2.out',
  })

  // --- Transition to Phase 4: Free-Style Metric Row (sDialsEnd -> sRangefinderPin) ---
  .to(anim, {
    explode: 0.0,
    modelScale: 0.88,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.08,
    worldPivotZ: 0.0,
    camX: -0.22,
    camY: 0.55, // Elevated view
    camZ: 1.65,
    lookX: 0.0,
    lookY: 0.08,
    lookZ: 0.0,
    modelRotX: 0.12,
    modelRotY: -0.25,
    duration: durRangefinderTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 4: Free-Style Kinetic Metric Row Dwell (sRangefinderPin -> sRangefinderEnd) ---
  // 3D camera glides across/over the 3 massive metrics (60 MP / ±0.02 mm / ISO 64) in foreground
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

  // --- Phase 5: Reassembly Synthesis Pinned Dwell (sAssembledPin -> sAssembledEnd) ---
  // Hotspot annotations active
  .to(anim, {
    modelRotY: 0.35,
    duration: durAssembledPin,
    ease: 'none',
  })

  // --- Phase 6: Outro Showcase (sAssembledEnd -> sOutroEnd) ---
  // Model transitions into CAD Wireframe backdrop (opacity 0.12) rotating 360° behind bold typography
  .to(anim, {
    modelScale: 0.95,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.10,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.50,
    camZ: 1.70,
    lookX: 0.0,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotX: 0.06,
    duration: durOutro * 0.25,
    ease: 'power2.inOut',
  })
  .to(anim, {
    modelRotY: 0.35 + Math.PI * 2.0, // 360° turntable rotation
    orbitalOpacity: 1.0,
    duration: durOutro * 0.75,
    ease: 'none',
  });
}

setupTimelineAndTriggers();

/* ==========================================================================
   INTERACTIVE EVENTS & BUTTON ACTIONS
   ========================================================================== */
window.addEventListener('pointermove', (e) => {
  state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Replay Button
if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Finish Switcher
if (btnToggleFinish) {
  btnToggleFinish.addEventListener('click', () => {
    if (state.finish === 'black') {
      state.finish = 'silver';
      if (btnFinishLabel) btnFinishLabel.textContent = 'Finish: Classic Silver';
    } else {
      state.finish = 'black';
      if (btnFinishLabel) btnFinishLabel.textContent = 'Finish: Stealth Black';
    }
    updateFinishMaterials();
  });
}

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

    // 4. Orbital Coordinate Ring
    if (orbitalRing) {
      orbitalRing.rotation.z += 0.003;
      orbitalRingMat.opacity = anim.orbitalOpacity * 0.16;
    }

    // 5. Camera Framing & Micro-Shake (Elevated View Never Looking From Underneath)
    const zoomFactor = Math.min(1.0, Math.max(0.25, anim.camZ / 2.0));

    camera.position.x = anim.camX + (state.mouse.x * 0.035 * zoomFactor);
    camera.position.y = anim.camY + (state.mouse.y * 0.035 * zoomFactor);
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
    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.15 * zoomFactor);
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

    // 7. Component Coaxial Pure-Z Explosion Geometry (Always synced, zero GC churn)
    moduleExplodeVectors.forEach((modVec, mesh) => {
      const orig = originalTransforms.get(mesh);
      const micro = microExplodeVectors.get(mesh);
      if (!orig) return;

      const macroZ = modVec.z * anim.explode;
      tempTargetPos.copy(orig.position);
      tempTargetPos.z += macroZ;

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

      tempTargetPos.x += microX;
      tempTargetPos.y += microY;
      tempTargetPos.z += microZ;

      mesh.position.lerp(tempTargetPos, 0.15);
    });

    // 8. Update Projections
    updateLeaderLine();
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
  setupTimelineAndTriggers();
});

render();
