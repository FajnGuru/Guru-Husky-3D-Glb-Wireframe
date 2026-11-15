// Panel „Oblasti“ – ruční editace polygonů po oblastech (posuvníky) + výběr kliknutím (koule kolem bodu).
import * as THREE from 'three';
import { model } from './model-state.js';

const ROW = 'display:flex;align-items:center;gap:6px;font-size:.8rem';
const INP = 'flex:1;min-width:0';

export function setupRegionsUI({ regions, scene, camera, renderer, ai }) {
  const wrap = document.createElement('div');
  wrap.id = 'regions-panel';
  wrap.innerHTML = `
    <div class="section-title">Oblasti (editace polygonů)</div>
    <div class="control-group" style="gap:6px">
      <select id="rg-region"></select>
      <div style="${ROW}"><span style="width:84px">Měřítko</span><input id="rg-scale" type="range" min="0.3" max="3" step="0.05" value="1" style="${INP}"><b id="rg-scale-v">1</b></div>
      <div style="${ROW}"><span style="width:84px">Posun X</span><input id="rg-dx" type="range" min="-0.2" max="0.2" step="0.005" value="0" style="${INP}"><b id="rg-dx-v">0</b></div>
      <div style="${ROW}"><span style="width:84px">Posun Y</span><input id="rg-dy" type="range" min="-0.2" max="0.2" step="0.005" value="0" style="${INP}"><b id="rg-dy-v">0</b></div>
      <div style="${ROW}"><span style="width:84px">Posun Z</span><input id="rg-dz" type="range" min="-0.2" max="0.2" step="0.005" value="0" style="${INP}"><b id="rg-dz-v">0</b></div>
      <div style="${ROW}"><span style="width:84px">Otočit</span><select id="rg-axis" style="width:52px;padding:4px"><option>x</option><option selected>y</option><option>z</option></select><input id="rg-deg" type="range" min="-90" max="90" step="1" value="0" style="${INP}"><b id="rg-deg-v">0</b></div>
      <div style="${ROW}"><span style="width:84px">Nafouknout</span><input id="rg-inflate" type="range" min="-1" max="1" step="0.05" value="0" style="${INP}"><b id="rg-inflate-v">0</b></div>
      <div style="${ROW}"><span style="width:84px">Vyhladit</span><input id="rg-smooth" type="range" min="0" max="5" step="1" value="0" style="${INP}"><b id="rg-smooth-v">0</b></div>
      <div style="${ROW}"><span style="width:84px">Přechod</span><input id="rg-falloff" type="range" min="0" max="1" step="0.05" value="0.25" style="${INP}"><b id="rg-falloff-v">0.25</b></div>
      <div style="${ROW}"><label style="width:84px;display:flex;gap:4px;align-items:center"><input id="rg-color-on" type="checkbox"> Barva</label><input id="rg-color" type="color" value="#c68b59" style="${INP};height:26px;padding:0;border:none;background:none"></div>
      <button class="btn-primary" id="rg-apply" style="margin-top:2px">Použít na oblast</button>
      <div style="${ROW}"><button id="rg-pick" style="padding:6px;width:auto;white-space:nowrap">Výběr kliknutím (koule)</button><input id="rg-radius" type="range" min="0.02" max="0.4" step="0.01" value="0.08" title="poloměr (× výška modelu)" style="${INP}"></div>
      <div id="rg-status" style="font-size:.75rem;color:var(--muted);min-height:1em"></div>
    </div>`;
  const anchor = document.getElementById('fajncrew-ai') || [...document.querySelectorAll('#ui-panel .section-title')].find((e) => /export/i.test(e.textContent));
  anchor.parentNode.insertBefore(wrap, anchor);
  wrap.addEventListener('keydown', (e) => e.stopPropagation());

  const $ = (id) => wrap.querySelector('#' + id);
  const sliders = ['scale', 'dx', 'dy', 'dz', 'deg', 'inflate', 'smooth', 'falloff'];
  sliders.forEach((k) => $('rg-' + k).addEventListener('input', () => { $(`rg-${k}-v`).textContent = $('rg-' + k).value; }));
  const status = (t) => { $('rg-status').textContent = t; };

  function fillList(keep) {
    const sel = $('rg-region'); const prev = keep ?? sel.value;
    sel.textContent = '';
    for (const r of regions.list()) { const o = document.createElement('option'); o.value = r.id; o.textContent = `${r.label} (${r.id})`; sel.appendChild(o); }
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }
  function resetSliders() {
    const def = { scale: 1, dx: 0, dy: 0, dz: 0, deg: 0, inflate: 0, smooth: 0 };
    for (const [k, v] of Object.entries(def)) { $('rg-' + k).value = v; $(`rg-${k}-v`).textContent = v; }
    $('rg-color-on').checked = false;
  }

  // ---------- výběr kliknutím ----------
  let picking = false; let helper = null; let down = null;
  const ray = new THREE.Raycaster();
  function showHelper(worldPoint, r) {
    if (helper) scene.remove(helper);
    helper = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffcc33, wireframe: true, transparent: true, opacity: 0.6 }));
    helper.position.copy(worldPoint); scene.add(helper);
  }
  $('rg-pick').addEventListener('click', () => { picking = !picking; $('rg-pick').style.background = picking ? 'var(--accent)' : ''; status(picking ? 'Klikni na model – vytvoří se oblast „vyber“.' : ''); });
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!picking || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const meshes = []; model.root.traverse((o) => { if (o.isMesh && !o.userData.isOverlay && o.visible) meshes.push(o); });
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return status('Nic nezasaženo.');
    const r = Number($('rg-radius').value) * regions.heightRef;
    regions.setSphere(regions.worldToRoot(hit.point), r);
    showHelper(hit.point, r);
    fillList('vyber'); status(`Oblast „vyber“: koule r=${r.toFixed(3)} kolem bodu.`);
    picking = false; $('rg-pick').style.background = '';
  });

  // ---------- použít ----------
  $('rg-apply').addEventListener('click', () => {
    const region = $('rg-region').value; if (!region) return status('Vyber oblast.');
    const falloff = Number($('rg-falloff').value);
    const v = (k) => Number($('rg-' + k).value);
    const cmds = [];
    if (v('scale') !== 1) cmds.push({ op: 'scaleRegion', region, factor: v('scale'), falloff });
    if (v('dx') || v('dy') || v('dz')) cmds.push({ op: 'moveRegion', region, dx: v('dx'), dy: v('dy'), dz: v('dz'), falloff });
    if (v('deg')) cmds.push({ op: 'rotateRegion', region, axis: $('rg-axis').value, deg: v('deg'), falloff });
    if (v('inflate')) cmds.push({ op: 'inflateRegion', region, strength: v('inflate'), falloff });
    if (v('smooth')) cmds.push({ op: 'smoothRegion', region, iterations: v('smooth'), falloff });
    if ($('rg-color-on').checked) cmds.push({ op: 'setRegionColor', region, color: $('rg-color').value });
    if (!cmds.length) return status('Nic se nemění – pohni posuvníkem.');
    const state = ai?.getState();
    regions.begin();
    try { cmds.forEach((c) => regions.apply(c)); } catch (e) { status(String(e.message || e)); }
    const batch = regions.end();
    if (batch && ai) ai.pushUndo({ state, batch });
    resetSliders();
    status(`✓ ${cmds.map((c) => c.op).join(', ')} → ${region} (↶ Zpět v sekci FajnCrew AI)`);
  });

  window.addEventListener('husky:model-changed', () => { regions.rebuild(); if (helper) { scene.remove(helper); helper = null; } fillList(); });
  fillList();
  return { fillList };
}
