import * as THREE from 'three';
import { initScene } from './scene.js';
import { createTextures } from './textures.js';
import { createMaterials } from './materials.js';
import { createCharacter } from './character.js';
import { updateTriangleStats } from './stats.js';
import { setupUI } from './ui.js';
import { startAnimation } from './animation.js';
import { initPhysics, createCharacterPhysics, stepPhysics } from './physics.js';

const { scene, camera, renderer, controls } = initScene();

const textures = createTextures();
const { materials, wireframeOverlayMat } = createMaterials(textures);

const { huskyRoot, partGroups, overlayMeshes, gHead, gGear, gTorso } = createCharacter(scene, materials, wireframeOverlayMat);

function updateStats() {
  updateTriangleStats(partGroups);
}
updateStats();

setupUI(materials, overlayMeshes, partGroups, huskyRoot, updateStats);

// Physics
const world = initPhysics();
const physicsBodies = createCharacterPhysics(world, huskyRoot, partGroups);

const clock = new THREE.Clock();
startAnimation(clock, controls, renderer, camera, scene, gHead, gGear, gTorso, huskyRoot, world, physicsBodies, stepPhysics);
