// Husky F2 – editace polygonů po oblastech (regions).
// Oblasti = pojmenované skupiny meshů (podle jmen z generátoru → přežijí export GLB; navíc mesh.userData.region),
// u cizího GLB podle jmen meshů, záložně „vyber“ = koule kolem bodu (kliknutí do scény).
// Operace pracují v prostoru kořene modelu, s měkkým přechodem (falloff) do okolí, přepočtem normál a bounds.
import * as THREE from 'three';
import { model } from './model-state.js';

const SIDE_LABEL = { L: ' (levé)', P: ' (pravé)' };
// [regex na jméno meshe, id, popisek, rozlišit stranu]
const RULES = [
  [/^Nose_Tip/, 'nos', 'Nos'],
  [/^(Muzzle_|Lower_Jaw|Mouth_Cavity)/, 'cenich', 'Čenich a čelist'],
  [/^Tongue_/, 'jazyk', 'Jazyk'],
  [/^Eye_(Sclera|Iris)_/, 'oko', 'Oko', true],
  [/^Eyebrow_/, 'oboci', 'Obočí', true],
  [/^Ear_/, 'ucho', 'Ucho', true],
  [/^Cheek_Tuft_/, 'tvar', 'Tvář', true],
  [/^Head_(Skull|FurCap)/, 'lebka', 'Lebka a čepička srsti'],
  [/^(Aviator_Goggles|Goggle_)/, 'bryle', 'Brýle'],
  [/^Headphone_Arch/, 'sluchatka_oblouk', 'Oblouk sluchátek'],
  [/^Headphone_(Cushion|Cup)_/, 'sluchatko', 'Sluchátko', true],
  [/^Neck_Fur/, 'krk', 'Krk'],
  [/^Chest_Fur/, 'hrud', 'Chomáč na hrudi'],
  [/^Torso_White/, 'tricko', 'Tričko'],
  [/^(Jacket_Sleeve_|Sleeve_Fold)/, 'rukav', 'Rukáv', true],
  [/^Jacket_/, 'bunda', 'Bunda'],
  [/^Hand_Palm_/, 'tlapa', 'Tlapa', true],
  [/^Hand_Finger_/, 'prsty', 'Prsty', true],
  [/^Foot_/, 'chodidlo', 'Chodidlo', true],
  [/^Jeans_Pelvis/, 'panev', 'Džíny – pánev'],
  [/^Jeans_(Leg|Cuff)_/, 'nohavice', 'Nohavice', true],
  [/^Tail_/, 'ocas', 'Ocas'],
];
// Generátor pojmenoval stranu +X jako „R“; postava se dívá do +Z, takže +X je její LEVÁ strana (stejně jako 3Dedit).
const sideOf = (name) => { const m = /_(L|R)(?:_|$)/.exec(name); return m ? (m[1] === 'R' ? 'L' : 'P') : null; };
export const LIMITS = { factor: [0.3, 3], move: [-0.5, 0.5], deg: [-180, 180], strength: [-1, 1], iterations: [1, 5], falloff: [0, 1] };
const clamp = (v, [a, b]) => Math.min(b, Math.max(a, Number(v)));
const smooth01 = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const KEY = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;

export function createRegionEngine() {
  let regions = new Map(); // id -> { id, label, meshes:[], sphere? }
  let batch = null;
  let heightRef = 1;

  function meshesOfModel() { const out = []; model.root?.traverse((o) => { if (o.isMesh && !o.userData.isOverlay) out.push(o); }); return out; }

  function rebuild() {
    regions = new Map();
    const meshes = meshesOfModel();
    const add = (id, label, mesh) => { if (!regions.has(id)) regions.set(id, { id, label, meshes: [] }); regions.get(id).meshes.push(mesh); mesh.userData.region = id; };
    const used = new Set();
    for (const m of meshes) {
      const name = m.name || '';
      const rule = RULES.find(([re]) => re.test(name));
      if (m.userData.generated && typeof m.userData.region === 'string') {
        add(m.userData.region, m.userData.regionLabel || m.userData.region, m);
        regions.get(m.userData.region).generated = true;
      } else if (rule) {
        const s = rule[3] ? sideOf(name) : null;
        add(s ? `${rule[1]}_${s}` : rule[1], rule[2] + (s ? SIDE_LABEL[s] : ''), m);
      } else if (typeof m.userData.region === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(m.userData.region)) {
        add(m.userData.region, m.userData.region, m);
      } else if (regions.size < 79) {
        let base = (name || 'mesh').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 56) || 'mesh';
        let k = base, n = 2; while (used.has(k)) k = `${base}_${n++}`; used.add(k);
        add(k, name || k, m);
      }
    }
    if (model.root) {
      model.root.updateMatrixWorld(true);
      const b = boxInRoot(meshes);
      heightRef = b.isEmpty() ? 1 : Math.max(b.max.y - b.min.y, 1e-3);
    }
    return list();
  }

  function list() { return [...regions.values()].map((r) => ({ id: r.id, label: r.label })); }
  function has(id) { return regions.has(id); }

  // ---------- prostor kořene ----------
  function toRoot(mesh) {
    model.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(model.root.matrixWorld).invert();
    return new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
  }
  function boxInRoot(meshes) {
    const b = new THREE.Box3(); const v = new THREE.Vector3();
    for (const m of meshes) {
      const M = toRoot(m); const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(M));
    }
    return b;
  }
  function regionSphere(r) {
    if (r.sphere) return { center: r.sphere.center.clone(), radius: r.sphere.radius };
    const b = boxInRoot(r.meshes); const c = b.getCenter(new THREE.Vector3());
    let R = 0; const v = new THREE.Vector3();
    for (const m of r.meshes) { const M = toRoot(m); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) R = Math.max(R, v.fromBufferAttribute(p, i).applyMatrix4(M).distanceTo(c)); }
    return { center: c, radius: Math.max(R, 1e-4) };
  }

  // ---------- váhy (měkký přechod) ----------
  function affected(r, falloff) {
    const { center, radius: R } = regionSphere(r);
    const own = new Set(r.meshes);
    const outer = R * (1 + falloff);
    const out = [];
    for (const m of meshesOfModel()) {
      if (!m.visible && !own.has(m)) continue;
      const isOwn = own.has(m);
      if (!isOwn && !(r.sphere || falloff > 0)) continue;
      const M = toRoot(m);
      if (!isOwn) { // rychlý test bounding sféry
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        const bs = m.geometry.boundingSphere.clone().applyMatrix4(M);
        if (bs.center.distanceTo(center) > outer + bs.radius) continue;
      }
      const weight = (d) => {
        if (r.sphere) return d <= R ? 1 : falloff > 0 ? 1 - smooth01((d - R) / (R * falloff)) : 0;
        if (isOwn) return 1;
        if (d >= outer) return 0;
        return 0.5 * (d <= R ? 1 : 1 - smooth01((d - R) / (R * falloff)));
      };
      out.push({ mesh: m, M, weight, isOwn });
    }
    return { center, radius: R, items: out };
  }

  // ---------- historie (pro ↶ Zpět) ----------
  function begin() { batch = { geo: new Map(), mat: new Map(), vis: new Map(), added: [], removed: [] }; return batch; }
  function end() { const b = batch; batch = null; return b && (b.geo.size || b.mat.size || b.vis.size || b.added.length || b.removed.length) ? b : null; }
  function ownGeometry(mesh) {
    // sdílená geometrie (instancing v cizím GLB) → vlastní kopie, overlay ji následuje
    const g = mesh.geometry;
    const users = meshesOfModel().filter((m) => m.geometry === g).length;
    if (users > 1) {
      const c = g.clone(); mesh.geometry = c;
      mesh.children.forEach((ch) => { if (ch.userData.isOverlay) ch.geometry = c; });
    }
  }
  function remember(mesh) {
    if (!batch || batch.geo.has(mesh)) { if (!batch) ownGeometry(mesh); return; }
    const g0 = mesh.geometry;
    batch.geo.set(mesh, { geometry: g0, pos: g0.attributes.position.array.slice(), nrm: g0.attributes.normal ? g0.attributes.normal.array.slice() : null, idx: g0.index ? g0.index.array.slice() : null });
    ownGeometry(mesh);
  }
  function restore(b) {
    if (!b) return;
    for (const [mesh, s] of b.geo) {
      if (mesh.geometry !== s.geometry) { mesh.geometry = s.geometry; mesh.children.forEach((ch) => { if (ch.userData.isOverlay) ch.geometry = s.geometry; }); }
      const g = mesh.geometry;
      g.attributes.position.array.set(s.pos); g.attributes.position.needsUpdate = true;
      if (s.nrm && g.attributes.normal) { g.attributes.normal.array.set(s.nrm); g.attributes.normal.needsUpdate = true; }
      if (s.idx && g.index && g.index.array.length !== s.idx.length) g.setIndex(new THREE.BufferAttribute(s.idx.slice(), 1));
      else if (s.idx && g.index) { g.index.array.set(s.idx); g.index.needsUpdate = true; }
      g.computeBoundingSphere(); g.computeBoundingBox();
    }
    for (const [mesh, mat] of b.mat) mesh.material = mat;
    for (const [mesh, vis] of b.vis) mesh.visible = vis;
    // vygenerované meshe: přidané odebrat, nahrazené vrátit (v opačném pořadí)
    for (const { mesh } of [...(b.added || [])].reverse()) detachGenerated(mesh);
    for (const { mesh, parent } of [...(b.removed || [])].reverse()) attachGenerated(mesh, parent);
    if ((b.added || []).length || (b.removed || []).length) { rebuild(); regionsChanged(); }
    changed();
  }
  function changed() { window.dispatchEvent(new CustomEvent('husky:geometry-changed')); }
  /** Je oblast viditelná? (pojmenovaná: všechny meshe viditelné) */
  function isVisible(id) { const r = regions.get(id); if (!r) return false; if (r.sphere) return !r.hidden; return r.meshes.every((m) => m.visible); }

  // ---------- normály (zachová ostré hrany > 60°) ----------
  function recomputeNormals(g) {
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    const groups = new Map();
    for (let i = 0; i < p.count; i++) { const k = KEY(p.getX(i), p.getY(i), p.getZ(i)); (groups.get(k) || groups.set(k, []).get(k)).push(i); }
    const a = new THREE.Vector3(), b = new THREE.Vector3(), s = new THREE.Vector3();
    const res = new Float32Array(n.array.length); res.set(n.array);
    for (const idx of groups.values()) {
      if (idx.length < 2) continue;
      for (const i of idx) {
        a.fromBufferAttribute(n, i); s.set(0, 0, 0);
        for (const j of idx) { b.fromBufferAttribute(n, j); if (a.dot(b) > 0.5) s.add(b); }
        s.normalize(); res[i * 3] = s.x; res[i * 3 + 1] = s.y; res[i * 3 + 2] = s.z;
      }
    }
    n.array.set(res); n.needsUpdate = true;
  }
  function finish(mesh, rigid) {
    const g = mesh.geometry;
    g.attributes.position.needsUpdate = true;
    if (!rigid || !g.attributes.normal) recomputeNormals(g);
    g.computeBoundingSphere(); g.computeBoundingBox();
  }

  // ---------- operace ----------
  function getRegion(id) { const r = regions.get(id); if (!r) throw new Error(`neznámá oblast ${id}`); return r; }
  function deform(id, falloff, targetFn, { rigidOk = true, needNormals = false } = {}) {
    const r = getRegion(id);
    const { center, radius, items } = affected(r, falloff);
    const v = new THREE.Vector3(), t = new THREE.Vector3(), nn = new THREE.Vector3();
    for (const { mesh, M, weight } of items) {
      remember(mesh);
      const g = mesh.geometry; const p = g.attributes.position;
      const Minv = new THREE.Matrix4().copy(M).invert();
      const NM = new THREE.Matrix3().getNormalMatrix(M);
      let avgN = null;
      if (needNormals) { // průměrná normála na unikátní pozici → žádné trhání ve švech
        avgN = new Map(); const n = g.attributes.normal;
        for (let i = 0; i < p.count; i++) { const k = KEY(p.getX(i), p.getY(i), p.getZ(i)); const s = avgN.get(k) || avgN.set(k, new THREE.Vector3()).get(k); if (n) s.add(nn.fromBufferAttribute(n, i)); }
      }
      let all1 = true, any = false;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(M);
        const w = weight(v.distanceTo(center));
        if (w < 1) all1 = false;
        if (w <= 0) continue;
        any = true;
        let normal = null;
        if (avgN) normal = avgN.get(KEY(p.getX(i), p.getY(i), p.getZ(i))).clone().applyMatrix3(NM).normalize();
        targetFn(t.copy(v), center, radius, normal);
        v.lerp(t, w).applyMatrix4(Minv);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      if (any) finish(mesh, rigidOk && all1);
    }
  }

  const ops = {
    scaleRegion({ region, factor, falloff = 0.25 }) {
      const f = clamp(factor, LIMITS.factor);
      deform(region, clamp(falloff, LIMITS.falloff), (t, c) => t.sub(c).multiplyScalar(f).add(c));
    },
    moveRegion({ region, dx = 0, dy = 0, dz = 0, falloff = 0.25 }) {
      const d = new THREE.Vector3(clamp(dx, LIMITS.move), clamp(dy, LIMITS.move), clamp(dz, LIMITS.move)).multiplyScalar(heightRef);
      deform(region, clamp(falloff, LIMITS.falloff), (t) => t.add(d));
    },
    rotateRegion({ region, axis = 'y', deg = 0, falloff = 0.25 }) {
      const ax = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
      const q = new THREE.Quaternion().setFromAxisAngle(ax, THREE.MathUtils.degToRad(clamp(deg, LIMITS.deg)));
      deform(region, clamp(falloff, LIMITS.falloff), (t, c) => t.sub(c).applyQuaternion(q).add(c), { rigidOk: false });
    },
    inflateRegion({ region, strength, falloff = 0.25 }) {
      const s = clamp(strength, LIMITS.strength);
      deform(region, clamp(falloff, LIMITS.falloff), (t, c, R, n) => (n ? t.addScaledVector(n, s * R * 0.5) : t), { rigidOk: false, needNormals: true });
    },
    smoothRegion({ region, iterations, falloff = 0.25 }) {
      const it = Math.round(clamp(iterations, LIMITS.iterations));
      const r = getRegion(region);
      const { center, items } = affected(r, clamp(falloff, LIMITS.falloff));
      const v = new THREE.Vector3();
      for (const { mesh, M, weight } of items) {
        remember(mesh);
        const g = mesh.geometry; const p = g.attributes.position;
        // unikátní vrcholy (sloučené švy) + sousednost z trojúhelníků
        const uid = new Int32Array(p.count); const keys = new Map(); const pts = [];
        for (let i = 0; i < p.count; i++) { const k = KEY(p.getX(i), p.getY(i), p.getZ(i)); let u = keys.get(k); if (u === undefined) { u = pts.length; keys.set(k, u); pts.push([p.getX(i), p.getY(i), p.getZ(i)]); } uid[i] = u; }
        const w = pts.map((q) => weight(v.set(q[0], q[1], q[2]).applyMatrix4(M).distanceTo(center)));
        if (!w.some((x) => x > 0)) continue;
        const nb = pts.map(() => new Set());
        const idx = g.index ? g.index.array : null; const triCount = idx ? idx.length / 3 : p.count / 3;
        for (let f = 0; f < triCount; f++) {
          const a = uid[idx ? idx[f * 3] : f * 3], b = uid[idx ? idx[f * 3 + 1] : f * 3 + 1], c = uid[idx ? idx[f * 3 + 2] : f * 3 + 2];
          nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b);
        }
        for (let k = 0; k < it; k++) {
          const next = pts.map((q, i) => {
            if (w[i] <= 0 || !nb[i].size) return q;
            let sx = 0, sy = 0, sz = 0; for (const j of nb[i]) { sx += pts[j][0]; sy += pts[j][1]; sz += pts[j][2]; }
            const m = nb[i].size, l = 0.5 * w[i];
            return [q[0] + (sx / m - q[0]) * l, q[1] + (sy / m - q[1]) * l, q[2] + (sz / m - q[2]) * l];
          });
          for (let i = 0; i < pts.length; i++) pts[i] = next[i];
        }
        for (let i = 0; i < p.count; i++) { const q = pts[uid[i]]; p.setXYZ(i, q[0], q[1], q[2]); }
        finish(mesh, false);
      }
    },
    setRegionColor({ region, color }) {
      if (!/^#[0-9a-f]{6}$/i.test(color || '')) throw new Error('barva není HEX');
      const r = getRegion(region);
      let meshes = r.meshes;
      if (r.sphere) { const { items } = affected(r, 0); meshes = items.map((x) => x.mesh); }
      for (const m of meshes) {
        if (batch && !batch.mat.has(m)) batch.mat.set(m, m.material);
        const c = m.material.clone(); c.map = null; c.color?.set(color); c.needsUpdate = true;
        model.materials[`rg_${m.uuid}_${c.uuid}`] = c; // přepínání wireframe/PBR
        m.material = c;
      }
    },
  };

  // Skrytí oblasti: pojmenovaná oblast = mesh.visible (nic se nemaže, overlay se skryje s rodičem);
  // koule „vyber“ = z indexu se vyjmou trojúhelníky uvnitř koule (plný index zůstává v userData → jde vrátit).
  ops.setRegionVisible = ({ region, visible }) => {
    const v = visible === true || visible === 'true';
    const r = getRegion(region);
    if (!r.sphere) {
      for (const m of r.meshes) { if (batch && !batch.vis.has(m)) batch.vis.set(m, m.visible); m.visible = v; }
    } else {
      const { center, radius: R, items } = affected(r, 0);
      const t = new THREE.Vector3();
      for (const { mesh, M } of items) {
        const g = mesh.geometry;
        if (!g.index) { // neindexovaná geometrie → celý mesh, pokud je většinou uvnitř
          const p = g.attributes.position; let inside = 0;
          for (let i = 0; i < p.count; i++) if (t.fromBufferAttribute(p, i).applyMatrix4(M).distanceTo(center) <= R) inside++;
          if (inside / p.count > 0.5) { if (batch && !batch.vis.has(mesh)) batch.vis.set(mesh, mesh.visible); mesh.visible = v; }
          continue;
        }
        remember(mesh);
        const g2 = mesh.geometry; const p = g2.attributes.position;
        if (!g2.userData.fcFullIndex) g2.userData.fcFullIndex = g2.index.array.slice();
        const full = g2.userData.fcFullIndex; const cur = new Set();
        const ia = g2.index.array; for (let f = 0; f < ia.length; f += 3) cur.add(`${ia[f]},${ia[f + 1]},${ia[f + 2]}`);
        const inSphere = (i) => t.fromBufferAttribute(p, i).applyMatrix4(M).distanceTo(center) <= R;
        const out = [];
        for (let f = 0; f < full.length; f += 3) {
          const a = full[f], b = full[f + 1], c = full[f + 2];
          const inside = inSphere(a) && inSphere(b) && inSphere(c);
          const present = cur.has(`${a},${b},${c}`);
          if (inside ? v : present) out.push(a, b, c);
        }
        g2.setIndex(out);
      }
      r.hidden = !v;
    }
    changed();
  };

  // ---------- F2c: generování trubkovité oblasti podle zdroje (paže z rukávu …) ----------
  function regionsChanged() { window.dispatchEvent(new CustomEvent('husky:regions-changed')); }
  function attachGenerated(mesh, parent) {
    parent.add(mesh);
    const wf = mesh.children.find((c) => c.userData.isOverlay);
    if (wf && !model.overlayMeshes.includes(wf)) model.overlayMeshes.push(wf);
    if (mesh.material) model.materials[`gen_${mesh.uuid}`] = mesh.material;
  }
  function detachGenerated(mesh) {
    mesh.parent?.remove(mesh);
    const wf = mesh.children.find((c) => c.userData.isOverlay);
    const i = wf ? model.overlayMeshes.indexOf(wf) : -1; if (i >= 0) model.overlayMeshes.splice(i, 1);
    delete model.materials[`gen_${mesh.uuid}`];
  }
  function verticesInRoot(r) {
    const pts = []; const v = new THREE.Vector3();
    for (const m of r.meshes) { const M = toRoot(m); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(M).clone()); }
    return pts;
  }
  /** Hlavní osa (PCA, mocninná metoda) */
  function principalAxis(pts, c) {
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
    let a = new THREE.Vector3(1, 1, 1).normalize();
    for (let k = 0; k < 40; k++) { const n = new THREE.Vector3(C[0][0] * a.x + C[0][1] * a.y + C[0][2] * a.z, C[1][0] * a.x + C[1][1] * a.y + C[1][2] * a.z, C[2][0] * a.x + C[2][1] * a.y + C[2][2] * a.z); if (n.lengthSq() < 1e-12) break; a = n.normalize(); }
    return a;
  }
  ops.generateFromRegion = ({ source, target, attachTo, thickness = 0.85, smooth = 2 }) => {
    if (!/^[a-z][a-z0-9_]{1,21}(_[LP])?$/.test(String(target || ''))) throw new Error('neplatný název nové oblasti');
    const src = getRegion(source);
    if (src.sphere) throw new Error('zdroj musí být pojmenovaná oblast');
    const tgt = attachTo ? getRegion(attachTo) : null;
    const th = clamp(thickness, [0.5, 1.2]);
    const sm = Math.round(clamp(smooth, [0, 5]));
    const old = regions.get(target);
    if (old && !old.generated) throw new Error(`oblast ${target} už existuje a není vygenerovaná`);

    // 1) střední čára: PCA osa → řezy podle průmětu → centroidy + poloměry
    const pts = verticesInRoot(src);
    if (pts.length < 12) throw new Error('zdrojová oblast má málo vrcholů');
    const c0 = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const axis = principalAxis(pts, c0);
    const proj = pts.map((p) => p.clone().sub(c0).dot(axis));
    const lo = Math.min(...proj), hi = Math.max(...proj);
    const BINS = 14; const bins = Array.from({ length: BINS }, () => []);
    proj.forEach((t, i) => bins[Math.min(BINS - 1, Math.floor(((t - lo) / (hi - lo || 1)) * BINS))].push(pts[i]));
    let centers = []; let radii = [];
    for (const b of bins) {
      if (b.length < 3) continue;
      const cc = b.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / b.length);
      centers.push(cc);
      radii.push(b.reduce((a, p) => { const d = p.clone().sub(cc); return a + Math.sqrt(Math.max(d.lengthSq() - d.dot(axis) ** 2, 0)); }, 0) / b.length);
    }
    if (centers.length < 3) throw new Error('zdrojová oblast není trubkovitá');
    // vyhlazení poloměrů (záhyby rukávu nemají dělat boule)
    for (let k = 0; k < 3; k++) radii = radii.map((r, i) => (i === 0 || i === radii.length - 1) ? r : (radii[i - 1] + 2 * r + radii[i + 1]) / 4);
    const rMed = [...radii].sort((x, y) => x - y)[Math.floor(radii.length / 2)];
    radii = radii.map((r) => Math.min(r, rMed * 1.15));
    // vyhlazení středů (klouzavý průměr)
    centers = centers.map((p, i) => (i === 0 || i === centers.length - 1) ? p : p.clone().add(centers[i - 1]).add(centers[i + 1]).multiplyScalar(1 / 3));

    // 2) orientace: konec blíž k cíli (nebo níž) = zápěstí
    const tgtPts = tgt ? verticesInRoot(tgt) : null;
    const tgtC = tgtPts ? tgtPts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / tgtPts.length) : null;
    const flip = tgtC ? centers[0].distanceTo(tgtC) < centers[centers.length - 1].distanceTo(tgtC) : centers[0].y < centers[centers.length - 1].y;
    if (flip) { centers.reverse(); radii.reverse(); }

    // 3) přichycení konce k nejbližšímu okraji cíle (lehce dovnitř), plynulý ohyb posledních ~40 %
    let tgtR = Infinity;
    if (tgtPts) {
      const end = centers[centers.length - 1];
      let best = tgtPts[0]; for (const p of tgtPts) if (p.distanceTo(end) < best.distanceTo(end)) best = p;
      tgtR = tgtPts.reduce((a, p) => Math.max(a, p.distanceTo(tgtC)), 0);
      const snap = best.clone().lerp(tgtC, 0.35);
      const delta = snap.sub(end);
      const n = centers.length;
      centers = centers.map((p, i) => { const t = i / (n - 1); return p.clone().addScaledVector(delta, smooth01((t - 0.6) / 0.4)); });
    }
    const curve = new THREE.CatmullRomCurve3(centers, false, 'centripetal');
    const rAt = (u) => { const f = u * (radii.length - 1); const i = Math.min(Math.floor(f), radii.length - 2); return radii[i] + (radii[i + 1] - radii[i]) * (f - i); };

    // 4) parametry smyček: hustěji u lokte (největší křivost)
    let elbow = 0.5, maxK = -1;
    for (let i = 1; i < 20; i++) { const u = i / 20; const k = curve.getTangentAt(Math.max(u - 0.05, 0)).angleTo(curve.getTangentAt(Math.min(u + 0.05, 1))); if (k > maxK) { maxK = k; elbow = u; } }
    const us = new Set(); for (let i = 0; i <= 24; i++) us.add(+(i / 24).toFixed(4));
    for (let i = -5; i <= 5; i++) { const u = elbow + i * 0.02; if (u > 0 && u < 1) us.add(+u.toFixed(4)); }
    const U = [...us].sort((a, b) => a - b);

    // 5) trubice s rotačně-minimalizujícími rámy
    const RS = 20; const positions = []; const uvs = []; const index = [];
    let N = null; const T = new THREE.Vector3();
    const rings = [];
    U.forEach((u, ri) => {
      const C = curve.getPointAt(u); T.copy(curve.getTangentAt(u)).normalize();
      if (!N) { N = new THREE.Vector3(0, 1, 0); if (Math.abs(N.dot(T)) > 0.9) N.set(1, 0, 0); }
      N = N.clone().addScaledVector(T, -N.dot(T)).normalize();
      const B = new THREE.Vector3().crossVectors(T, N).normalize();
      let r = rAt(u) * th * (1 - 0.25 * smooth01((u - 0.5) / 0.5)); // zúžení k zápěstí
      if (u > 0.85 && Number.isFinite(tgtR)) r = Math.min(r, tgtR * 0.8);
      rings.push({ C, u });
      for (let j = 0; j <= RS; j++) {
        const a = (j / RS) * Math.PI * 2;
        const p = C.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
        positions.push(p.x, p.y, p.z); uvs.push(j / RS, u);
      }
      if (ri > 0) for (let j = 0; j < RS; j++) { const a = (ri - 1) * (RS + 1) + j, b = ri * (RS + 1) + j; index.push(a, b, a + 1, b, b + 1, a + 1); }
    });
    // víčka (rameno i zápěstí jsou schovaná v trupu / tlapě)
    for (const [ri, flipCap] of [[0, true], [U.length - 1, false]]) {
      const ci = positions.length / 3; const C = rings[ri].C; positions.push(C.x, C.y, C.z); uvs.push(0.5, rings[ri].u);
      for (let j = 0; j < RS; j++) { const a = ri * (RS + 1) + j; flipCap ? index.push(ci, a + 1, a) : index.push(ci, a, a + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();

    // 6) rodič = skupina cílové oblasti (statistiky, viditelnost části, export); geometrie do lokálního prostoru rodiče
    const anchor = (tgt?.meshes[0] || src.meshes[0]);
    const parent = anchor.parent && anchor.parent !== model.root.parent ? anchor.parent : model.root;
    geo.applyMatrix4(new THREE.Matrix4().copy(parent === model.root ? new THREE.Matrix4() : toRoot(parent)).invert());

    // 7) svár: Laplace na vrcholech u konců (posledních / prvních ~15 %)
    if (sm > 0) {
      const p = geo.attributes.position; const ringOf = (i) => Math.floor(i / (RS + 1));
      for (let k = 0; k < sm; k++) {
        const next = p.array.slice();
        for (let ri = 0; ri < U.length; ri++) {
          if (!(U[ri] > 0.85 || U[ri] < 0.1) || ri === 0 || ri === U.length - 1) continue;
          for (let j = 0; j <= RS; j++) {
            const i = ri * (RS + 1) + j; const up = (ri - 1) * (RS + 1) + j, dn = (ri + 1) * (RS + 1) + j;
            for (let a = 0; a < 3; a++) next[i * 3 + a] = p.array[i * 3 + a] * 0.5 + (p.array[up * 3 + a] + p.array[dn * 3 + a]) * 0.25;
          }
        }
        p.array.set(next);
      }
      p.needsUpdate = true; geo.computeVertexNormals(); void ringOf;
    }
    geo.computeBoundingSphere(); geo.computeBoundingBox();

    // 8) materiál/barva z cíle (srst), jinak ze zdroje
    const baseMat = (tgt?.meshes[0] || src.meshes[0]).userData.fcOrigMat || (tgt?.meshes[0] || src.meshes[0]).material;
    const mat = (Array.isArray(baseMat) ? baseMat[0] : baseMat).clone();
    mat.wireframe = document.getElementById('render-mode')?.value === 'wireframe';
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = target; mesh.castShadow = true; mesh.receiveShadow = true;
    const side = /_L$/.test(target) ? ' (levé)' : /_P$/.test(target) ? ' (pravé)' : '';
    const base = target.replace(/_(L|P)$/, '');
    mesh.userData = { region: target, regionLabel: (base === 'paze' ? 'Paže' : base) + side, generated: true, generatedFrom: source, attachedTo: attachTo || null };
    const overlayMat = model.overlayMeshes.find((o) => o.material)?.material;
    if (overlayMat) {
      const wf = new THREE.Mesh(geo, overlayMat); wf.name = target + '_WireframeOverlay'; wf.userData.isOverlay = true;
      wf.visible = document.getElementById('render-mode')?.value === 'overlay';
      mesh.add(wf);
    }

    // nahrazení dřívější vygenerované oblasti stejného jména
    if (old) for (const m of old.meshes) { const par = m.parent; detachGenerated(m); batch?.removed.push({ mesh: m, parent: par }); }
    attachGenerated(mesh, parent);
    batch?.added.push({ mesh, parent });
    regions.set(target, { id: target, label: mesh.userData.regionLabel, meshes: [mesh], generated: true });
    regionsChanged(); changed();
  };

  function apply(cmd) { const fn = ops[cmd.op]; if (!fn) throw new Error('neznámý příkaz ' + cmd.op); fn(cmd); }

  /** Záložní výběr: koule kolem bodu (v prostoru kořene) → oblast „vyber“. */
  function setSphere(centerRoot, radius) {
    regions.set('vyber', { id: 'vyber', label: 'Výběr (koule kolem bodu)', meshes: [], sphere: { center: centerRoot.clone(), radius } });
  }
  function worldToRoot(pWorld) { model.root.updateMatrixWorld(true); return pWorld.clone().applyMatrix4(new THREE.Matrix4().copy(model.root.matrixWorld).invert()); }

  return { rebuild, list, has, isVisible, apply, begin, end, restore, setSphere, worldToRoot, regionSphere: (id) => regionSphere(getRegion(id)), get heightRef() { return heightRef; } };
}
