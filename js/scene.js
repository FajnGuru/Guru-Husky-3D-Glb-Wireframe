import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function initScene() {
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x161a24);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.55, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.25, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;

  // Lighting
  const ambientLight = new THREE.HemisphereLight(0xddeeff, 0x222634, 1.1);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff7e8, 2.4);
  keyLight.position.set(3.5, 5.5, 4.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x5599ff, 1.6);
  rimLight.position.set(-4, 3.5, -3.5);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-3, 1.5, 3);
  scene.add(fillLight);

  // Floor
  const floorGeo = new THREE.CircleGeometry(3.5, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e2433,
    roughness: 0.85,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { scene, camera, renderer, controls };
}
