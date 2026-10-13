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
const btnAudioToggle = document.getElementById('btn-audio-toggle');
const audioBtnLabel = document.getElementById('audio-btn-label');
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

// 5. SolidWorks CAD Technical Blueprint Wireframe Material
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
let overallModelCenter = new THREE.Vector3();

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

// Target world coordinates relative to centered model
const TARGET_BAYONET = new THREE.Vector3(0.0627, -0.0466, 0.1067);
const TARGET_SHUTTER_DIAL = new THREE.Vector3(-0.1576, 0.2509, 0.0044);
const TARGET_SENSOR = new THREE.Vector3(0.0627, -0.0466, 0.0100);

/* ==========================================================================
   VISIBILITY & MATERIAL TRANSITIONS (No Abrupt Disappearances!)
   ========================================================================== */
function updateChapterMaterialsAndVisibility() {
  if (!modelRoot) return;

  const mode = state.activeSubAssembly;

  moduleExplodeVectors.forEach((modVec, mesh) => {
    const origMat = originalMaterials.get(mesh);
    if (!origMat) return;

    if (mode === 'DIALS') {
      // Phase 4: SolidWorks CAD Wireframe Mode
      // The Shutter Speed Dial stays solid glistening knurled metal
      if (subAssemblySets.DIALS.has(mesh)) {
        mesh.material = (state.finish === 'silver' ? matSilverKnurledDial : matBlackKnurledDial);
        mesh.visible = true;
      } else {
        // The rest of the camera body transforms into a transparent CAD blueprint wireframe
        mesh.material = matSolidWorksWireframe;
        mesh.visible = true;
      }
    } else if (mode === 'BAYONET') {
      // Phase 2: Bayonet Focus Mode
      const name = (mesh.name || '').toLowerCase();
      if (name.includes('lens cap') || name.includes('selector') || name.includes('lever')) {
        mesh.visible = false; // Hide cap and front lever to cleanly reveal flange
      } else if (subAssemblySets.BAYONET.has(mesh)) {
        mesh.material = matBayonetFlange;
        mesh.visible = true;
        mesh.material.opacity = 1.0;
      } else {
        // Rest of camera body remains visible as soft context (opacity: 0.22)
        mesh.material = origMat;
        mesh.visible = true;
        if (mesh.material.opacity !== undefined) {
          mesh.material.opacity = 0.22;
        }
      }
    } else if (mode === 'SENSOR') {
      // Phase 3: Sensor Engine Mode
      const name = (mesh.name || '').toLowerCase();
      if (name.includes('lens cap')) {
        mesh.visible = false;
      } else if (subAssemblySets.SENSOR.has(mesh)) {
        mesh.material = origMat;
        mesh.visible = true;
        mesh.material.opacity = 1.0;
      } else {
        // Rest of camera body remains visible as soft background context
        mesh.material = origMat;
        mesh.visible = true;
        if (mesh.material.opacity !== undefined) {
          mesh.material.opacity = 0.25;
        }
      }
    } else {
      // General Mode (Hero, Explode Intro, Reassembled, Drone Specs, Outro)
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

  /* CHAPTER SETS */
  if (name === 'bayonet.005' || name === 'bayonet') {
    subAssemblySets.BAYONET.add(mesh);
  } else if (name.includes('shutter speed dial')) {
    subAssemblySets.DIALS.add(mesh);
    shutterDialMesh = mesh;
  } else if (name.includes('body middle') || name.includes('mesh.052') || name.includes('glass') || name.includes('sensor')) {
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
    overallModelCenter = box.getCenter(new THREE.Vector3());
    modelRoot.position.copy(overallModelCenter).negate();
    modelRoot.updateMatrixWorld(true);

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

    scene.add(modelRoot);
    state.isLoaded = true;

    // Smooth curtain reveal wipe
    if (preloader) {
      preloader.classList.add('loaded');
      setTimeout(() => {
        preloader.classList.add('hidden');
        preloader.style.display = 'none';

        // Auto-play ambient mechanical soundscape once loaded
        audio.startAmbient();
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
  modelScale: 1.0,    // Overall model scale (scaled down to 0.65 in Phase 5 Drone Riotters)
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

let shakeIntensity = 0.0;
function triggerImpactShake() {
  shakeIntensity = 0.024;
}

/* ==========================================================================
   GSAP & SCROLLTRIGGER MASTER CHOREOGRAPHY
   ========================================================================== */
function initScrollTriggers() {
  // Chapter Pinning & Sub-Assembly Focus Controllers
  const chapterPins = [
    { id: '#chapter-bayonet', key: 'BAYONET', dwell: '+=120%' },
    { id: '#chapter-sensor', key: 'SENSOR', dwell: '+=120%' },
    { id: '#chapter-dials', key: 'DIALS', dwell: '+=120%' },
  ];

  chapterPins.forEach((ch) => {
    ScrollTrigger.create({
      trigger: ch.id,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => setSubAssemblyFocus(ch.key),
      onEnterBack: () => setSubAssemblyFocus(ch.key),
    });

    ScrollTrigger.create({
      trigger: ch.id,
      start: 'top top',
      end: ch.dwell,
      pin: true,
      pinSpacing: true,
      refreshPriority: 1,
    });
  });

  // Explode Intro returns to general view when scrolling up
  ScrollTrigger.create({
    trigger: '#explode-intro',
    start: 'top 80%',
    end: 'bottom 20%',
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Seamless Reassembly Snap returns to general view
  ScrollTrigger.create({
    trigger: '#section-assembled',
    start: 'top 75%',
    end: 'bottom 25%',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Chapter 4 Drone Specs: general view with solid camera
  ScrollTrigger.create({
    trigger: '#chapter-rangefinder',
    start: 'top 75%',
    end: 'bottom 25%',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Outro Turntable Showcase
  ScrollTrigger.create({
    trigger: '#section-outro',
    start: 'top 75%',
    end: 'bottom bottom',
    onEnter: () => setSubAssemblyFocus(null),
    onEnterBack: () => setSubAssemblyFocus(null),
  });

  // Master Scroll Timeline
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0,
      refreshPriority: 0,
      onUpdate: (self) => {
        const progress = self.progress;
        const currentDetent = Math.floor(progress * 36);
        if (currentDetent !== state.lastDetent) {
          audio.playTick(1.0 + (progress * 0.4));
          state.lastDetent = currentDetent;
        }

        // Single decisive impact snap at progress >= 0.76 (Reassembly transition)
        if (progress >= 0.76) {
          if (!state.snappedClimax) {
            triggerImpactShake();
            audio.playSnap();
            audio.playShutter();
            state.snappedClimax = true;
          }
        } else if (progress < 0.71) {
          state.snappedClimax = false;
        }
      },
    },
  });

  // --- Phase 1: Immediate Z-Explosion (Rời Hero tách ra ngay trục Z) ---
  // Starts separating immediately when scrolling leaves Hero
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
    duration: 5.5,
    ease: 'power1.out',
  })
  // Suspended in space dwell to admire separated components:
  .to(anim, {
    modelRotY: 0.70,
    duration: 2.0,
    ease: 'none',
  })

  // --- Phase 2, Chapter 1: Bayonet Mount (Whip-Spin Conceal -> Ngàm thép 4 chấu) ---
  // Dynamic whip-spin transition into Bayonet flange centered at TARGET_BAYONET
  .to(anim, {
    explode: 0.15,
    modelScale: 1.0,
    camX: TARGET_BAYONET.x,
    camY: TARGET_BAYONET.y + 0.02,
    camZ: TARGET_BAYONET.z + 0.68,
    lookX: TARGET_BAYONET.x,
    lookY: TARGET_BAYONET.y,
    lookZ: TARGET_BAYONET.z,
    modelRotY: 0.0,
    modelRotX: 0.04,
    duration: 3.0,
    ease: 'power2.inOut',
  })
  // Gentle turntable inspection sweep catching stainless steel gleams:
  .to(anim, {
    modelRotY: 0.18,
    duration: 3.5,
    ease: 'none',
  })

  // --- Phase 2, Chapter 2: 60MP Sensor Core (Optical Anchor Glide-In) ---
  // Glides into sensor cavity, revealing silicon reflections & 24K contacts
  .to(anim, {
    explode: 0.05,
    camX: TARGET_SENSOR.x,
    camY: TARGET_SENSOR.y,
    camZ: TARGET_SENSOR.z + 0.64,
    lookX: TARGET_SENSOR.x,
    lookY: TARGET_SENSOR.y,
    lookZ: TARGET_SENSOR.z,
    modelRotY: -0.16,
    modelRotX: -0.02,
    duration: 2.8,
    ease: 'power2.inOut',
  })
  // Gentle sweep catching sapphire glass reflections:
  .to(anim, {
    modelRotY: 0.20,
    duration: 3.5,
    ease: 'none',
  })

  // --- Phase 2, Chapter 3: Tactile Command (SolidWorks CAD Blueprint + Knurled Dial) ---
  // Camera elevates to 45° angle directly above Shutter Speed Dial
  .to(anim, {
    explode: 0.0,
    camX: TARGET_SHUTTER_DIAL.x,
    camY: TARGET_SHUTTER_DIAL.y + 0.36,
    camZ: TARGET_SHUTTER_DIAL.z + 0.44,
    lookX: TARGET_SHUTTER_DIAL.x,
    lookY: TARGET_SHUTTER_DIAL.y,
    lookZ: TARGET_SHUTTER_DIAL.z,
    modelRotY: -0.15,
    modelRotX: 0.48,
    duration: 2.8,
    ease: 'power2.inOut',
  })
  // Dial inspection sweep catching knurling reflections:
  .to(anim, {
    modelRotY: 0.22,
    duration: 3.5,
    ease: 'none',
  })

  // --- Phase 3: Seamless Reassembly Snap (Synthesis) ---
  .to(anim, {
    explode: 0.60,
    modelScale: 1.0,
    camX: -0.25,
    camY: 0.65,
    camZ: 1.55,
    lookX: 0.0,
    lookY: 0.06,
    lookZ: 0.0,
    modelRotY: 0.25,
    modelRotX: 0.06,
    duration: 2.4,
    ease: 'power2.inOut',
  })
  // SINGLE DECISIVE IMPACT: Components snap flush into 100% solid camera!
  .to(anim, {
    explode: 0.0,
    camZ: 1.48,
    modelRotX: 0.0,
    duration: 1.0,
    ease: 'back.out(2.2)',
  })
  .to(anim, {
    duration: 1.2,
    ease: 'none',
  })

  // --- Phase 3, Chapter 4: Drone Riotters Style Metric Floor (60MP, ±0.02mm, ISO 64) ---
  // Model scales down (0.65x), upright along Z-axis above the SVG dome arc, gentle turn
  .to(anim, {
    explode: 0.0,
    modelScale: 0.65,
    camX: 0.0,
    camY: 0.38,
    camZ: 1.70,
    lookX: 0.0,
    lookY: 0.08,
    lookZ: 0.0,
    modelRotY: 0.0,
    modelRotX: 0.0,
    modelRotZ: 0.0,
    duration: 2.2,
    ease: 'power2.inOut',
  })
  // Gentle turn to the left:
  .to(anim, {
    modelRotY: -0.14,
    duration: 1.5,
    ease: 'power1.inOut',
  })
  // Gentle turn to the right:
  .to(anim, {
    modelRotY: 0.14,
    duration: 1.5,
    ease: 'power1.inOut',
  })
  // Return to center:
  .to(anim, {
    modelRotY: 0.0,
    duration: 0.6,
    ease: 'power1.out',
  })

  // --- Phase 4: Outro Showcase (Shortened Scroll, Smooth 360° Turntable) ---
  .to(anim, {
    explode: 0.0,
    modelScale: 1.0,
    camX: 0.0,
    camY: 0.08,
    camZ: 1.62,
    lookX: 0.0,
    lookY: -0.18,
    lookZ: 0.0,
    modelRotX: 0.0,
    orbitalOpacity: 1.0,
    duration: 0.8,
    ease: 'power2.inOut',
  })
  // Smooth 360° turntable completes in fewer wheel rolls:
  .to(anim, {
    modelRotY: Math.PI * 2.0,
    duration: 1.6,
    ease: 'none',
  });
}

initScrollTriggers();

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
    audio.playShutter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Finish Switcher
if (btnToggleFinish) {
  btnToggleFinish.addEventListener('click', () => {
    audio.playTick(1.2);
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

// Audio Toggle Button
if (btnAudioToggle) {
  btnAudioToggle.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    if (audioBtnLabel) {
      audioBtnLabel.textContent = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
    }
    btnAudioToggle.classList.toggle('muted', isMuted);
  });
}

// Auto-resume audio on first user gesture (ensures autoplay policy satisfaction)
const resumeAudioOnce = () => {
  if (state.isLoaded) {
    audio.init();
    audio.startAmbient();
  }
  window.removeEventListener('wheel', resumeAudioOnce);
  window.removeEventListener('pointerdown', resumeAudioOnce);
  window.removeEventListener('keydown', resumeAudioOnce);
};
window.addEventListener('wheel', resumeAudioOnce, { passive: true });
window.addEventListener('pointerdown', resumeAudioOnce, { passive: true });
window.addEventListener('keydown', resumeAudioOnce, { passive: true });

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

    // 6. Model Rotation & Scaling
    modelRoot.rotation.y = anim.modelRotY + (state.mouse.x * 0.15 * zoomFactor);
    modelRoot.rotation.x = anim.modelRotX - (state.mouse.y * 0.10 * zoomFactor);
    modelRoot.rotation.z = anim.modelRotZ;

    // Smooth scaling (e.g. 0.65x for Drone Riotters specs section)
    modelRoot.scale.set(anim.modelScale, anim.modelScale, anim.modelScale);

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

      mesh.position.lerp(targetPos, 0.12);
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
  ScrollTrigger.refresh();
});

render();
