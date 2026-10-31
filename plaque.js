// 3D patent plaque for the right-hand panel: a brushed-metal plate set inside a clear acrylic block.
import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/three/RoundedBoxGeometry.js';

const panel = document.querySelector('.plaque');
const canvas = panel.querySelector('canvas');

// Plate proportions come from the face texture (1217 x 1598 design pixels).
const PLATE_W = 1.217, PLATE_H = 1.598, PLATE_T = 0.008;
const BORDER = 0.075, BLOCK_T = 0.11;
const BLOCK_W = PLATE_W + 2 * BORDER, BLOCK_H = PLATE_H + 2 * BORDER;
// Empty space left around the plaque when it is fitted to the panel.
const FIT_PADDING = 1.1;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(getComputedStyle(panel).backgroundColor);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(-2, 3, 4);
scene.add(key);

const loader = new THREE.TextureLoader();
const anisotropy = renderer.capabilities.getMaxAnisotropy();
const faceMap = loader.load('assets/plaque-face.jpg');
faceMap.colorSpace = THREE.SRGBColorSpace;
faceMap.anisotropy = anisotropy;
// G = roughness, B = metalness: bare metal and the gold seal reflect, printed ink does not.
const rmMap = loader.load('assets/plaque-rm.jpg');
rmMap.anisotropy = anisotropy;

const plateEdge = new THREE.MeshStandardMaterial({ color: 0xd6d8db, metalness: 1, roughness: 0.35 });
const plateFace = new THREE.MeshStandardMaterial({
  map: faceMap, roughnessMap: rmMap, metalnessMap: rmMap, roughness: 1, metalness: 1,
});
// BoxGeometry material order: +x, -x, +y, -y, +z (front), -z
const plate = new THREE.Mesh(
  new THREE.BoxGeometry(PLATE_W, PLATE_H, PLATE_T),
  [plateEdge, plateEdge, plateEdge, plateEdge, plateFace, plateEdge],
);
// mounted just in front of the block's back face, seen through the acrylic
plate.position.z = -BLOCK_T / 2 + PLATE_T / 2 + 0.006;

const acrylic = new THREE.Mesh(
  new RoundedBoxGeometry(BLOCK_W, BLOCK_H, BLOCK_T, 6, 0.018),
  // Plain transparency rather than transmission: transmission re-samples the plate at a
  // blurred, lower resolution and the fine print becomes unreadable.
  new THREE.MeshPhysicalMaterial({
    color: 0xe4f4ef, // faint green-blue tint of real acrylic
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  }),
);
acrylic.renderOrder = 1;
// Fresnel: faces seen edge-on (the block's sides and bevels) turn bright like real acrylic.
acrylic.material.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `float edgeOn = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
    diffuseColor.a = mix(diffuseColor.a, 0.7, edgeOn);
    #include <opaque_fragment>`,
  );
};

const plaque = new THREE.Group();
plaque.add(plate, acrylic);
scene.add(plaque);

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.8;

// Start slightly turned so the acrylic depth reads as 3D.
const startDir = new THREE.Vector3(0.24, 0.05, 1).normalize();

function fit() {
  const w = panel.clientWidth, h = panel.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  const dist = FIT_PADDING * Math.max(BLOCK_H / 2 / tanV, BLOCK_W / 2 / tanH) + BLOCK_T / 2;
  camera.position.copy(startDir).multiplyScalar(dist);
  camera.updateProjectionMatrix();
  controls.minDistance = dist * 0.35;
  controls.maxDistance = dist * 2;
  controls.update();
}

new ResizeObserver(fit).observe(panel);
fit();

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
