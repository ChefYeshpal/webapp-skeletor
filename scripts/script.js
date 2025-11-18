// Import from Three.js using import map
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

scene.children = scene.children.filter(child => !(child instanceof THREE.PointLight));

const frontLight = new THREE.PointLight(0xffffff, 1);
frontLight.position.set(0, 0, 10);
scene.add(frontLight);

const backLight = new THREE.PointLight(0xffffff, 1);
backLight.position.set(0, 0, -10);
scene.add(backLight);

const loader = new GLTFLoader();
loader.load('assets/Human-skeleton/human-skeleton.gltf', function(gltf) {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(0.2, 0.2, 0.2);
    scene.add(model);
}, undefined, function(error) {
    console.error('Error loading model:', error);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
