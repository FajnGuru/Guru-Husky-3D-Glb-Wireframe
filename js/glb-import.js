// Import vlastního .GLB: nahradí procedurálního Huskyho ve scéně, zarámuje kameru,
// přidá drátěný overlay, namapuje části (1_Head_Muzzle…5_Jeans_Tail podle jmen, jinak obecný seznam meshů).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { model, setModel, PROCEDURAL_LABELS } from './model-state.js';
import { applyRenderMode, renderPartsList } from './ui.js';

const MAX_PARTS = 40;
const CAM_DEFAULT = { pos: new THREE.Vector3(0, 1.55, 4.2), target: new THREE.Vector3(0, 1.25, 0), near: 0.1, far: 100 };

export function setupGlbImport({ scene, camera, controls, procedural, wireframeOverlayMat, updateStats }) {
  const loader = new GLTFLoader();
  let imported = null;

  // ---------- UI ----------
  const exportBtn = document.getElementById('btn-export-glb');
  const box = document.createElement('div');
  box.className = 'control-group';
  box.style.marginBottom = '8px';
  box.innerHTML = `
    <input type="file" id="glb-file" accept=".glb,.gltf,model/gltf-binary" style="display:none" />
    <button id="btn-import-glb">Nahrát model (.GLB)</button>
    <button id="btn-procedural" style="display:none">↩ Zpět na procedurálního Huskyho</button>
    <div id="glb-info" style="font-size:.78rem;color:var(--muted)">Tip: .glb můžeš přetáhnout i přímo do scény.</div>`;
  exportBtn.parentNode.insertBefore(box, exportBtn);
  const exportTitle = [...document.querySelectorAll('#ui-panel .section-title')].find((e) => /Export modelu/i.test(e.textContent));
  if (exportTitle) exportTitle.textContent = 'Model – import / export';
  const fileIn = box.querySelector('#glb-file');
  const info = box.querySelector('#glb-info');
  const backBtn = box.querySelector('#btn-procedural');
  box.querySelector('#btn-import-glb').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => { const f = fileIn.files?.[0]; if (f) loadFile(f); fileIn.value = ''; });
  backBtn.addEventListener('click', () => useProcedural());

  const dropTarget = document.body;
  dropTarget.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some(i => i.kind === 'file')) e.preventDefault(); });
  dropTarget.addEventListener('drop', (e) => {
    const f = [...(e.dataTransfer?.files || [])].find(x => /\.(glb|gltf)$/i.test(x.name));
    if (f) { e.preventDefault(); loadFile(f); }
  });

  // ---------- Logika ----------
  function frame(root) {
    root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root);
    if (b.isEmpty()) return;
    const size = b.getSize(new THREE.Vector3());
    const center = b.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const dist = (maxDim / 2) / Math.tan(fov / 2) * 1.6;
    camera.near = Math.max(dist / 1000, 0.001);
    camera.far = dist * 100;
    camera.position.set(center.x, center.y + size.y * 0.1, center.z + dist);
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
  }

  function mapParts(root) {
    const partGroups = {};
    const labels = {};
    for (const key of Object.keys(PROCEDURAL_LABELS)) {
      const o = root.getObjectByName(key);
      if (o) { partGroups[key] = o; labels[key] = PROCEDURAL_LABELS[key]; }
    }
    if (Object.keys(partGroups).length) return { partGroups, labels, matched: true };
    const used = new Set();
    root.traverse((o) => {
      if (!o.isMesh || o.userData.isOverlay || Object.keys(partGroups).length >= MAX_PARTS) return;
      let key = (o.name || 'Mesh').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 56) || 'Mesh';
      let k = key, n = 2;
      while (used.has(k)) k = `${key}_${n++}`;
      used.add(k);
      partGroups[k] = o;
      labels[k] = o.name || k;
    });
    return { partGroups, labels, matched: false };
  }

  function addOverlays(root) {
    const overlays = [];
    const meshes = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.isOverlay) meshes.push(o); });
    meshes.forEach((m) => {
      const wf = new THREE.Mesh(m.geometry, wireframeOverlayMat);
      wf.name = m.name + '_WireframeOverlay';
      wf.userData.isOverlay = true;
      if (m.isSkinnedMesh) wf.visible = false; // skinned meshe necháme bez overlaye
      m.add(wf);
      overlays.push(wf);
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return overlays;
  }

  function collectMaterials(root) {
    const mats = {};
    root.traverse((o) => {
      if (!o.isMesh || o.userData.isOverlay) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m) mats[m.uuid] = m; });
    });
    return mats;
  }

  function disposeImported() {
    if (!imported) return;
    scene.remove(imported);
    imported.traverse((o) => {
      if (o.userData.isOverlay) return;
      o.geometry?.dispose?.();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose?.());
    });
    imported = null;
  }

  async function loadFile(file) {
    info.textContent = `Načítám ${file.name}…`;
    try {
      const buf = await file.arrayBuffer();
      const gltf = await loader.parseAsync(buf, '');
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error('GLB neobsahuje scénu.');
      useImported(root, file.name);
    } catch (e) {
      console.error('Import GLB selhal:', e);
      info.textContent = 'Import selhal: ' + (e?.message || e);
    }
  }

  function useImported(root, name) {
    disposeImported();
    root.name = root.name || 'Imported_GLB';
    procedural.root.visible = false;
    scene.add(root);
    imported = root;
    const { partGroups, labels, matched } = mapParts(root); // před overlayi, ať nejsou v seznamu částí
    const overlayMeshes = addOverlays(root);
    setModel({ kind: 'glb', name, root, partGroups, labels, overlayMeshes, materials: collectMaterials(root) });
    renderPartsList();
    applyRenderMode();
    updateStats();
    frame(root);
    backBtn.style.display = '';
    info.textContent = `${name}: ${Object.keys(partGroups).length} částí ${matched ? '(podle jmen 1–5)' : '(obecný seznam meshů)'}.`;
  }

  function useProcedural() {
    disposeImported();
    procedural.root.visible = true;
    setModel({ kind: 'procedural', name: 'Guru Husky (procedurální)', ...procedural, labels: { ...PROCEDURAL_LABELS } });
    renderPartsList();
    applyRenderMode();
    updateStats();
    camera.position.copy(CAM_DEFAULT.pos);
    camera.near = CAM_DEFAULT.near; camera.far = CAM_DEFAULT.far; camera.updateProjectionMatrix();
    controls.target.copy(CAM_DEFAULT.target); controls.update();
    backBtn.style.display = 'none';
    info.textContent = 'Procedurální Husky.';
  }

  return { useImported, useProcedural, loadFile };
}
