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
let skinnedMesh = null;
let skeletonHelper = null;
let skeleton = null;

loader.load('assets/Human-skeleton/human-skeleton.gltf', function(gltf) {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(0.2, 0.2, 0.2);
    scene.add(model);

    // Find the skinned mesh in the model
    model.traverse((child) => {
        if (child.isSkinnedMesh) {
            skinnedMesh = child;
            skeleton = skinnedMesh.skeleton;

            // Add skeleton helper for visualization
            skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
            skeletonHelper.visible = false; // Hide initially
            scene.add(skeletonHelper);
        }
    });
}, undefined, function(error) {
    console.error('Error loading model:', error);
});

// Raycaster and mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let highlightedBoneIndex = null;

// Function to clear previous bone highlight
function clearBoneHighlight() {
    if (highlightedBoneIndex !== null && skeletonHelper) {
        skeletonHelper.bones[highlightedBoneIndex].material && (skeletonHelper.bones[highlightedBoneIndex].material.color.set(0xffffff));
        skeletonHelper.visible = false;
        highlightedBoneIndex = null;
    }
}

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(skinnedMesh, true);

    if (intersects.length > 0 && skinnedMesh) {
        const intersect = intersects[0];
        const geometry = skinnedMesh.geometry;

        if (!geometry.attributes.skinIndex || !geometry.attributes.skinWeight) return;

        // Get vertex indices of intersected face
        const ia = intersect.face.a;
        const ib = intersect.face.b;
        const ic = intersect.face.c;

        // Skin indices and weights attributes (Vector4 for each vertex)
        const skinIndex = geometry.attributes.skinIndex;
        const skinWeight = geometry.attributes.skinWeight;

        const getSkinData = (vi) => ({
            indices: new THREE.Vector4().fromBufferAttribute(skinIndex, vi),
            weights: new THREE.Vector4().fromBufferAttribute(skinWeight, vi),
        });

        const skinA = getSkinData(ia);
        const skinB = getSkinData(ib);
        const skinC = getSkinData(ic);

        // Barycentric coordinates for interpolation
        const uv = intersect.uv || { x: 1/3, y: 1/3 }; // fallback if uv is undefined

        const w0 = 1 - uv.x - uv.y;
        const w1 = uv.x;
        const w2 = uv.y;

        // Interpolated weights
        const interpolatedWeights = new THREE.Vector4(
            skinA.weights.x * w0 + skinB.weights.x * w1 + skinC.weights.x * w2,
            skinA.weights.y * w0 + skinB.weights.y * w1 + skinC.weights.y * w2,
            skinA.weights.z * w0 + skinB.weights.z * w1 + skinC.weights.z * w2,
            skinA.weights.w * w0 + skinB.weights.w * w1 + skinC.weights.w * w2
        );

        // Interpolated indices
        const interpolatedIndices = new THREE.Vector4(
            skinA.indices.x * w0 + skinB.indices.x * w1 + skinC.indices.x * w2,
            skinA.indices.y * w0 + skinB.indices.y * w1 + skinC.indices.y * w2,
            skinA.indices.z * w0 + skinB.indices.z * w1 + skinC.indices.z * w2,
            skinA.indices.w * w0 + skinB.indices.w * w1 + skinC.indices.w * w2
        );

        // Find the bone with max weight
        let maxWeight = 0;
        let boneIndex = -1;
        for (let i = 0; i < 4; i++) {
            if (interpolatedWeights.getComponent(i) > maxWeight) {
                maxWeight = interpolatedWeights.getComponent(i);
                boneIndex = Math.round(interpolatedIndices.getComponent(i));
            }
        }

        if (boneIndex !== -1 && boneIndex !== highlightedBoneIndex && skeleton) {
            clearBoneHighlight();

            highlightedBoneIndex = boneIndex;
            const bone = skeleton.bones[boneIndex];
            console.log('Selected bone:', bone.name);

            // Show skeleton helper and highlight the selected bone visually
            skeletonHelper.visible = true;

            // Change selected bone color in helper - the helper uses LineBasicMaterial, no per-bone material, so hack by drawing helper separately or customize
            // Simple approach: set helper color to yellow and keep visible for a moment (could be improved)
            skeletonHelper.material.color.set(0xffff00);
        }
    } else {
        clearBoneHighlight();
    }
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
