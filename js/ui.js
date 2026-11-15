import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { model } from './model-state.js';

export function applyRenderMode(mode = document.getElementById('render-mode').value) {
  const mats = Object.values(model.materials);
  if (mode === 'pbr') {
    model.overlayMeshes.forEach(m => (m.visible = false));
    mats.forEach(mat => (mat.wireframe = false));
  } else if (mode === 'overlay') {
    model.overlayMeshes.forEach(m => (m.visible = true));
    mats.forEach(mat => (mat.wireframe = false));
  } else if (mode === 'wireframe') {
    model.overlayMeshes.forEach(m => (m.visible = false));
    mats.forEach(mat => (mat.wireframe = true));
  }
}

/** Seznam částí podle aktivního modelu (procedurální: 5 částí, GLB: shoda jmen nebo obecný seznam). */
export function renderPartsList() {
  const list = document.getElementById('parts-list');
  list.textContent = '';
  for (const [key, grp] of Object.entries(model.partGroups)) {
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.part = key;
    cb.checked = grp.visible !== false;
    label.append(cb, ' ' + (model.labels[key] || key));
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.id = `stat-${key}`;
    badge.textContent = '0 △';
    row.append(label, badge);
    list.appendChild(row);
  }
}

export function setupUI(updateStats) {
  const renderModeSelect = document.getElementById('render-mode');
  renderModeSelect.addEventListener('change', (e) => applyRenderMode(e.target.value));

  // delegace – funguje i po přestavění seznamu částí (import GLB)
  document.getElementById('parts-list').addEventListener('change', (e) => {
    const partKey = e.target.getAttribute('data-part');
    if (partKey && model.partGroups[partKey]) {
      model.partGroups[partKey].visible = e.target.checked;
      updateStats();
    }
  });

  document.getElementById('btn-export-glb').addEventListener('click', () => {
    const btn = document.getElementById('btn-export-glb');
    btn.textContent = 'Generuji GLB...';

    const prevOverlayStates = model.overlayMeshes.map(m => m.visible);
    model.overlayMeshes.forEach(m => (m.visible = false));
    Object.values(model.materials).forEach(mat => (mat.wireframe = false));

    const exporter = new GLTFExporter();
    exporter.parse(
      model.root,
      (result) => {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = model.kind === 'glb' ? model.name.replace(/\.glb$/i, '') + '-upraveno.glb' : 'guru-husky-3d.glb';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        model.overlayMeshes.forEach((m, idx) => (m.visible = prevOverlayStates[idx]));
        applyRenderMode();
        btn.textContent = 'Stáhnout model (.GLB)';
      },
      (error) => {
        console.error('Chyba při GLB exportu:', error);
        btn.textContent = 'Chyba exportu';
      },
      { binary: true, onlyVisible: true }
    );
  });
}
