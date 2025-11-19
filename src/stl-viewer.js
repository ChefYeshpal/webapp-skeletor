import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

console.log('STL Viewer Module Script Started');

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
  console.warn('No SRC parameter found in URL');
  const div = document.createElement('div');
  div.textContent = 'No STL source provided.';
  div.style.position = 'fixed';
  div.style.top = '50%';
  div.style.left = '50%';
  div.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(div);
} else {
  console.log('Attempting to load STL from:', src);
  
  fetch(src)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then(buffer => {
      console.log('STL downloaded. Size:', buffer.byteLength, 'bytes');
      
      // Peek at the first few bytes to check for text (LFS pointer or HTML)
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer.slice(0, 200));
      console.log('File header preview:', text);

      if (text.includes('version https://git-lfs.github.com')) {
        throw new Error('File is a Git LFS pointer, not the actual STL binary. GitHub Pages does not serve LFS files directly.');
      }
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('File appears to be HTML (likely a 404 page), not an STL.');
      }
      
      const geometry = loader.parse(buffer);
      console.log('STL parsed successfully');

      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color: 0xb0c4de, metalness: 0.05, roughness: 0.8 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      fitCameraToObject(mesh);
    })
    .catch(err => {
      console.error('Error loading STL:', err);
      const div = document.createElement('div');
      div.textContent = 'Failed to load STL: ' + err.message;
      div.style.position = 'fixed';
      div.style.top = '50%';
      div.style.left = '50%';
      div.style.transform = 'translate(-50%, -50%)';
      div.style.background = 'rgba(0,0,0,0.8)';
      div.style.padding = '20px';
      div.style.border = '1px solid #f00';
      div.style.color = '#f00';
      document.body.appendChild(div);
    });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

frame();
