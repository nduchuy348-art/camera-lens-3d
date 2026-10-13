import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

/* ==========================================================================
   GLOBAL STATE & ARCHITECTURAL CONFIGURATION
   ========================================================================== */
const state = {
  isLoaded: false,
  finish: 'black', // 'black' (Matte Anodized) or 'silver' (Classic Chrome)
  activeSubAssembly: null, // null, 'BAYONET', 'SENSOR', 'DIALS', 'OUTRO'
  lastDetent: -1,
  snappedClimax: true,
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

/* ==========================================================================
   THREE.JS SCENE, CAMERA & WEBGL RENDERER SETUP
   ========================================================================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFDFDFD); // 100% Full-White Gallery Aesthetic

const camera = new THREE.PerspectiveCamera(
  36, // Editorial focal length (~50mm equivalent)
  window.innerWidth / window.innerHeight,
  0.05,
  100
);

// Default camera setup
const baseCameraPos = new THREE.Vector3(0.0, 0.28, 1.95);
const baseTargetPos = new THREE.Vector3(0.0, 0.0, 0.0);
camera.position.copy(baseCameraPos);
camera.lookAt(baseTargetPos);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
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

// 5. SolidWorks CAD Technical Blueprint Wireframe Material (Final Outro Turntable Only)
const matSolidWorksWireframe = new THREE.MeshBasicMaterial({
  color: 0x181B1E,
  wireframe: true,
  transparent: true,
  opacity: 0.14,
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
   VISIBILITY & MATERIAL TRANSITIONS (Strict Isolation - No Ghost Meshes)
   ========================================================================== */
function updateChapterMaterialsAndVisibility() {
  if (!modelRoot) return;

  const mode = state.activeSubAssembly;

  moduleExplodeVectors.forEach((modVec, mesh) => {
    const origMat = originalMaterials.get(mesh);
    if (!origMat) return;

    if (mode === 'BAYONET') {
      // Phase 2, Chapter 1: ONLY Bayonet.005 flange is visible. All others completely invisible.
      if (subAssemblySets.BAYONET.has(mesh)) {
        mesh.material = matBayonetFlange;
        mesh.visible = true;
        mesh.material.opacity = 1.0;
      } else {
        mesh.visible = false;
      }
    } else if (mode === 'SENSOR') {
      // Phase 2, Chapter 2: ONLY sensor cavity / core meshes are visible. All others completely invisible.
      if (subAssemblySets.SENSOR.has(mesh)) {
        mesh.material = origMat;
        mesh.visible = true;
        if (mesh.material.opacity !== undefined) {
          mesh.material.opacity = 1.0;
        }
      } else {
        mesh.visible = false;
      }
    } else if (mode === 'DIALS') {
      // Phase 2, Chapter 3: ONLY tactile command dials are visible (Shutter Speed Dial centered at 0,0,0).
      // ZERO wireframe chassis. All other meshes completely invisible.
      if (subAssemblySets.DIALS.has(mesh)) {
        mesh.material = (state.finish === 'silver' ? matSilverKnurledDial : matBlackKnurledDial);
        mesh.visible = true;
        if (mesh.material.opacity !== undefined) {
          mesh.material.opacity = 1.0;
        }
      } else {
        mesh.visible = false;
      }
    } else if (mode === 'OUTRO') {
      // Phase 6 Outro: Delicate SolidWorks CAD Wireframe turntable (opacity 0.14)
      mesh.material = matSolidWorksWireframe;
      mesh.visible = true;
    } else {
      // General Mode (Hero, Explode Intro, Reassembled, Drone Specs)
      mesh.material = origMat;
      mesh.visible = true;
      if (mesh.material.opacity !== undefined) {
        mesh.material.opacity = 1.0;
      }
    }
  });
}

function setSubAssemblyFocus(key) {
  if (state.activeSubAssembly === key) return;
  state.activeSubAssembly = key;
  updateChapterMaterialsAndVisibility();
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

  /* 4 MACRO MODULE CLASSIFICATION (PURE Z-AXIS ONLY) */
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
      micro.set(0, 0.12, 0);
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

  /* CHAPTER SUB-ASSEMBLY ISOLATION SETS */
  if (name === 'bayonet.005' || name === 'bayonet') {
    subAssemblySets.BAYONET.add(mesh);
    bayonetFlangeMesh = mesh;
  } else if (name.includes('shutter speed dial') || name === 'shutter speed dial') {
    subAssemblySets.DIALS.add(mesh);
    shutterDialMesh = mesh;
  } else if (
    name.includes('body middle') ||
    name.includes('mesh.052') ||
    name.includes('sensor') ||
    (name.includes('glass') && !name.includes('glass.002'))
  ) {
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
    }
    sensorCenter.set(bayonetCenter.x, bayonetCenter.y, overallModelCenter.z);

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
  subExplode1: 0.0,   // Bayonet micro-separation
  subExplode2: 0.0,   // Sensor micro-separation
  subExplode3: 0.0,   // Dials micro-separation
  modelScale: 1.0,    // Overall model scale
  camX: baseCameraPos.x,
  camY: baseCameraPos.y,
  camZ: baseCameraPos.z,
  lookX: baseTargetPos.x,
  lookY: baseTargetPos.y,
  lookZ: baseTargetPos.z,
  modelRotY: 0.20,
  modelRotX: 0.0,
  modelRotZ: 0.0,
  pivotX: OVERALL_MODEL_CENTER.x,
  pivotY: OVERALL_MODEL_CENTER.y,
  pivotZ: OVERALL_MODEL_CENTER.z,
  worldPivotX: 0.0,
  worldPivotY: 0.0,
  worldPivotZ: 0.0,
  orbitalOpacity: 1.0,
};

let shakeIntensity = 0.0;
function triggerImpactShake() {
  shakeIntensity = 0.024;
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
    end: '+=160%',
    pin: true,
    pinSpacing: true,
    refreshPriority: 10,
    id: 'pin-rangefinder',
  });
  pinTriggers.push(pinRangefinder);

  // Recalculate layout metrics & pin-spacers
  ScrollTrigger.refresh();

  const maxScroll = Math.max(
    1,
    (ScrollTrigger.maxScroll ? ScrollTrigger.maxScroll(window) : 0) ||
      (document.documentElement.scrollHeight - window.innerHeight)
  );

  const s0 = 0;
  const sBayonetPin = Math.max(1, pinBayonet.start);
  const sBayonetEnd = Math.max(sBayonetPin + 1, pinBayonet.end);
  const sSensorPin = Math.max(sBayonetEnd, pinSensor.start);
  const sSensorEnd = Math.max(sSensorPin + 1, pinSensor.end);
  const sDialsPin = Math.max(sSensorEnd, pinDials.start);
  const sDialsEnd = Math.max(sDialsPin + 1, pinDials.end);
  const sRangefinderPin = Math.max(sDialsEnd, pinRangefinder.start);
  const sRangefinderEnd = Math.max(sRangefinderPin + 1, pinRangefinder.end);
  const sOutroEnd = Math.max(sRangefinderEnd + 1, maxScroll);

  const durBayonetPin = sBayonetEnd - sBayonetPin;
  const durSensorTrans = Math.max(1, sSensorPin - sBayonetEnd);
  const durSensorPin = sSensorEnd - sSensorPin;
  const durDialsTrans = Math.max(1, sDialsPin - sSensorEnd);
  const durDialsPin = sDialsEnd - sDialsPin;
  const durReassemble = Math.max(1, sRangefinderPin - sDialsEnd);
  const durRangefinderPin = sRangefinderEnd - sRangefinderPin;
  const durOutro = Math.max(1, sOutroEnd - sRangefinderEnd);

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
        if (scrollY >= sBayonetPin - 60 && scrollY < sBayonetEnd + 40) {
          desiredMode = 'BAYONET';
        } else if (scrollY >= sSensorPin - 60 && scrollY < sSensorEnd + 40) {
          desiredMode = 'SENSOR';
        } else if (scrollY >= sDialsPin - 60 && scrollY < sDialsEnd + 40) {
          desiredMode = 'DIALS';
        } else if (scrollY >= sRangefinderEnd + 20) {
          desiredMode = 'OUTRO';
        } else {
          desiredMode = null;
        }

        if (state.activeSubAssembly !== desiredMode) {
          state.activeSubAssembly = desiredMode;
          updateChapterMaterialsAndVisibility();
        }

        // Decisive Climax Impact Shake at Reassembly Snap
        const reassembleMid = (sDialsEnd + sRangefinderPin) * 0.52;
        if (scrollY >= reassembleMid - 70 && scrollY <= reassembleMid + 70) {
          if (!state.snappedClimax) {
            triggerImpactShake();
            state.snappedClimax = true;
          }
        } else if (scrollY < reassembleMid - 160 || scrollY > reassembleMid + 160) {
          state.snappedClimax = false;
        }
      },
    },
  });

  const tl = masterTimeline;

  // --- Phase 1: Hero to Z-Explosion (0 -> sBayonetPin) ---
  const tExplodeEnd = sBayonetPin * 0.65;
  const tExplodeHold = sBayonetPin * 0.82;
  const tTransBayonet = sBayonetPin - tExplodeHold;

  tl.to(anim, {
    explode: 1.0,
    modelScale: 1.0,
    camX: -0.45,
    camY: 0.82,
    camZ: 2.15,
    lookX: 0.0,
    lookY: 0.05,
    lookZ: 0.0,
    modelRotY: 0.62,
    modelRotX: 0.12,
    orbitalOpacity: 0.0,
    duration: tExplodeEnd,
    ease: 'power1.out',
  })
  .to(anim, {
    modelRotY: 0.70,
    duration: tExplodeHold - tExplodeEnd,
    ease: 'none',
  })
  // Smooth transition into Bayonet flange close-up
  .to(anim, {
    explode: 0.0,
    modelScale: 1.0,
    pivotX: bayonetCenter.x,
    pivotY: bayonetCenter.y,
    pivotZ: bayonetCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.0,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.0,
    camZ: 0.68,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.0,
    modelRotX: 0.04,
    modelRotY: 0.0,
    duration: tTransBayonet,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 1: Bayonet Flange Pinned Dwell (sBayonetPin -> sBayonetEnd) ---
  .to(anim, {
    modelRotY: 0.35,
    duration: durBayonetPin,
    ease: 'none',
  })

  // --- Transition from Bayonet to Sensor (sBayonetEnd -> sSensorPin) ---
  .to(anim, {
    pivotX: sensorCenter.x,
    pivotY: sensorCenter.y,
    pivotZ: sensorCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.0,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.0,
    camZ: 0.64,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.0,
    modelRotX: -0.02,
    modelRotY: -0.16,
    duration: durSensorTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 2: Sensor Core Pinned Dwell (sSensorPin -> sSensorEnd) ---
  .to(anim, {
    modelRotY: 0.20,
    duration: durSensorPin,
    ease: 'none',
  })

  // --- Transition from Sensor to Chapter 3 Dials (sSensorEnd -> sDialsPin) ---
  .to(anim, {
    modelScale: 1.15,
    pivotX: shutterDialCenter.x,
    pivotY: shutterDialCenter.y,
    pivotZ: shutterDialCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.0,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.26,
    camZ: 0.40,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: 0.0,
    modelRotX: 0.38,
    modelRotY: -0.15,
    duration: durDialsTrans,
    ease: 'power2.inOut',
  })

  // --- Phase 2, Chapter 3: Tactile Command Pinned Dwell (sDialsPin -> sDialsEnd) ---
  // Knurled Shutter Speed Dial centered at (0,0,0), spinning cleanly on its axis
  .to(anim, {
    modelRotY: 0.25,
    duration: durDialsPin,
    ease: 'none',
  })

  // --- Phase 3: Seamless Reassembly Snap (sDialsEnd -> sRangefinderPin) ---
  .to(anim, {
    explode: 0.60,
    modelScale: 1.0,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.0,
    worldPivotZ: 0.0,
    camX: -0.25,
    camY: 0.65,
    camZ: 1.55,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.25,
    modelRotX: 0.06,
    duration: durReassemble * 0.35,
    ease: 'power2.inOut',
  })
  .to(anim, {
    explode: 0.0,
    camZ: 1.48,
    modelRotX: 0.0,
    duration: durReassemble * 0.20,
    ease: 'back.out(2.2)',
  })
  .to(anim, {
    duration: durReassemble * 0.15,
    ease: 'none',
  })
  // Smooth elevation into Phase 5 Drone Riotters safe zone
  .to(anim, {
    modelScale: 0.65,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.30,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.10,
    camZ: 1.82,
    lookX: 0.0,
    lookY: 0.18,
    lookZ: 0.0,
    modelRotX: 0.0,
    modelRotZ: 0.0,
    modelRotY: 0.0,
    duration: durReassemble * 0.30,
    ease: 'power2.inOut',
  })

  // --- Phase 5: Drone Riotters Stats Section (sRangefinderPin -> sRangefinderEnd) ---
  // The stats card and dome arc stay completely frozen in place ("đứng hẳn lại luôn").
  // Model hovers high in upper screen, well above stats bar with generous empty space.
  // ONLY the 3D model rotates 360°!
  .to(anim, {
    modelRotY: Math.PI * 2.0,
    duration: durRangefinderPin,
    ease: 'none',
  })

  // --- Phase 6: Outro Showcase (sRangefinderEnd -> sOutroEnd) ---
  .to(anim, {
    modelScale: 0.95,
    pivotX: overallModelCenter.x,
    pivotY: overallModelCenter.y,
    pivotZ: overallModelCenter.z,
    worldPivotX: 0.0,
    worldPivotY: 0.0,
    worldPivotZ: 0.0,
    camX: 0.0,
    camY: 0.0,
    camZ: 1.65,
    lookX: 0.0,
    lookY: -0.10,
    lookZ: 0.0,
    modelRotX: 0.04,
    duration: durOutro * 0.25,
    ease: 'power2.inOut',
  })
  .to(anim, {
    modelRotY: Math.PI * 2.0 + Math.PI * 2.0,
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

// Replay Button (Zero Audio)
if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Finish Switcher (Zero Audio)
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

    // 4. Edolus Orbital Coordinate Ring
    if (orbitalRing) {
      orbitalRing.rotation.z += 0.003;
      orbitalRingMat.opacity = anim.orbitalOpacity * 0.16;
    }

    // 5. Camera Framing & Micro-Shake
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
    // Guarantees active sub-assembly is positioned at world target (worldPivotX, worldPivotY, worldPivotZ)
    // and spins cleanly on its own axis with zero orbital drift
    const localPivot = new THREE.Vector3(anim.pivotX, anim.pivotY, anim.pivotZ);
    const rotatedPivot = localPivot.clone()
      .multiplyScalar(anim.modelScale)
      .applyEuler(modelRoot.rotation);

    const worldTarget = new THREE.Vector3(anim.worldPivotX, anim.worldPivotY, anim.worldPivotZ);
    modelRoot.position.copy(worldTarget).sub(rotatedPivot);
    modelRoot.updateMatrixWorld(true);

    // 7. Component Z-Explosion Geometry
    moduleExplodeVectors.forEach((modVec, mesh) => {
      const orig = originalTransforms.get(mesh);
      const micro = microExplodeVectors.get(mesh);
      if (!orig || !mesh.visible) return;

      const macroZ = modVec.z * anim.explode;
      const targetPos = orig.position.clone();
      targetPos.z += macroZ;

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

      targetPos.x += microX;
      targetPos.y += microY;
      targetPos.z += microZ;

      mesh.position.lerp(targetPos, 0.15);
    });
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
