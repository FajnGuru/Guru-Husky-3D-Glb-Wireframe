import * as THREE from 'three';
import { initScene } from './scene.js';
import { createTextures } from './textures.js';
import { createMaterials } from './materials.js';
import { createCharacter } from './character.js';
import { updateTriangleStats } from './stats.js';
import { setupUI, renderPartsList, applyRenderMode } from './ui.js';
import { startAnimation } from './animation.js';
import { initPhysics, createCharacterPhysics, stepPhysics } from './physics.js';
import { initFajnCrewAI } from './fajncrew-ai.js';
import { model, setModel, PROCEDURAL_LABELS } from './model-state.js';
import { setupGlbImport } from './glb-import.js';
import { createRegionEngine } from './regions.js';
import { setupRegionsUI } from './regions-ui.js';

const { scene, camera, renderer, controls } = initScene();

const textures = createTextures();
const { materials, wireframeOverlayMat } = createMaterials(textures);

const { huskyRoot, partGroups, overlayMeshes, gHead, gGear, gTorso } = createCharacter(scene, materials, wireframeOverlayMat);

// Aktivní model = procedurální Husky (import GLB ho umí vyměnit)
const procedural = { root: huskyRoot, partGroups, overlayMeshes, materials };
setModel({ kind: 'procedural', name: 'Guru Husky (procedurální)', ...procedural, labels: { ...PROCEDURAL_LABELS } });

function updateStats() {
  updateTriangleStats(model.partGroups);
}

renderPartsList();
setupUI(updateStats);
applyRenderMode();
updateStats();

// Import vlastního GLB (tlačítko + drag&drop)
setupGlbImport({ scene, camera, controls, procedural, wireframeOverlayMat, updateStats });

// Husky F2: oblasti pro editaci polygonů (procedurální i importovaný GLB)
const regions = createRegionEngine();
regions.rebuild();

// FajnCrew AI (Mód 10): prompt → Vercel glb-command → povolené UI příkazy. Bez API klíčů v klientovi.
const ai = initFajnCrewAI({ model, updateStats, regions });
setupRegionsUI({ regions, scene, camera, renderer, ai });
window.huskyRegions = regions;

// Physics
const world = initPhysics();
const physicsBodies = createCharacterPhysics(world, huskyRoot, partGroups);

const clock = new THREE.Clock();
startAnimation(clock, controls, renderer, camera, scene, gHead, gGear, gTorso, huskyRoot, world, physicsBodies, stepPhysics);
