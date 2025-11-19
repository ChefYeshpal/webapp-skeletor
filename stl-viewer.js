import * as THREE from 'https://unpkg.com/three@0.160.0?module';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js?module';
import { STLLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/STLLoader.js?module';

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

const src = getParam('src');
const canvas = document.getElementById('viewer');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111, 1);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(1, 1, 1);
scene.add(dir);

// Back light to illuminate it's behind :|
const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
backLight.position.set(-1, -0.5, -1);
scene.add(backLight);

const loader = new STLLoader();

function frame() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function fitCameraToObject(obj, offset = 1.25) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= offset;

  camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.5, center.z + cameraZ);
  camera.lookAt(center);
  controls.target.copy(center);
}

if (!src) {
  const div = document.createElement('div');
  div.textContent = 'No STL source provided.';
  div.style.position = 'fixed';
  div.style.top = '50%';
  div.style.left = '50%';
  div.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(div);
} else {
  loader.load(src, (geometry) => {
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0xb0c4de, metalness: 0.05, roughness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    fitCameraToObject(mesh);
  }, undefined, (err) => {
    const div = document.createElement('div');
    div.textContent = 'Failed to load STL.';
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(div);
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

frame();
