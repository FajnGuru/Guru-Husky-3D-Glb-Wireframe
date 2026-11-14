import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export function setupUI(materials, overlayMeshes, partGroups, huskyRoot, updateStats) {
  const renderModeSelect = document.getElementById('render-mode');
  renderModeSelect.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'pbr') {
      overlayMeshes.forEach(m => (m.visible = false));
      Object.values(materials).forEach(mat => (mat.wireframe = false));
    } else if (mode === 'overlay') {
      overlayMeshes.forEach(m => (m.visible = true));
      Object.values(materials).forEach(mat => (mat.wireframe = false));
    } else if (mode === 'wireframe') {
      overlayMeshes.forEach(m => (m.visible = false));
      Object.values(materials).forEach(mat => (mat.wireframe = true));
    }
  });

  document.querySelectorAll('#parts-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const partKey = e.target.getAttribute('data-part');
      if (partGroups[partKey]) {
        partGroups[partKey].visible = e.target.checked;
        updateStats();
      }
    });
  });

  document.getElementById('btn-export-glb').addEventListener('click', () => {
    const btn = document.getElementById('btn-export-glb');
    btn.textContent = 'Generuji GLB...';

    const prevOverlayStates = overlayMeshes.map(m => m.visible);
    overlayMeshes.forEach(m => (m.visible = false));
    Object.values(materials).forEach(mat => (mat.wireframe = false));

    const exporter = new GLTFExporter();
    exporter.parse(
      huskyRoot,
      (result) => {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'guru-husky-3d.glb';
        link.click();
        URL.revokeObjectURL(url);

        overlayMeshes.forEach((m, idx) => (m.visible = prevOverlayStates[idx]));
        renderModeSelect.dispatchEvent(new Event('change'));
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
