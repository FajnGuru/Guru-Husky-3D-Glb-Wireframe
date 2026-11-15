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
      if (rule) {
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
  function begin() { batch = { geo: new Map(), mat: new Map() }; return batch; }
  function end() { const b = batch; batch = null; return b && (b.geo.size || b.mat.size) ? b : null; }
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
    batch.geo.set(mesh, { geometry: g0, pos: g0.attributes.position.array.slice(), nrm: g0.attributes.normal ? g0.attributes.normal.array.slice() : null });
    ownGeometry(mesh);
  }
  function restore(b) {
    if (!b) return;
    for (const [mesh, s] of b.geo) {
      if (mesh.geometry !== s.geometry) { mesh.geometry = s.geometry; mesh.children.forEach((ch) => { if (ch.userData.isOverlay) ch.geometry = s.geometry; }); }
      const g = mesh.geometry;
      g.attributes.position.array.set(s.pos); g.attributes.position.needsUpdate = true;
      if (s.nrm && g.attributes.normal) { g.attributes.normal.array.set(s.nrm); g.attributes.normal.needsUpdate = true; }
      g.computeBoundingSphere(); g.computeBoundingBox();
    }
    for (const [mesh, mat] of b.mat) mesh.material = mat;
  }

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

  function apply(cmd) { const fn = ops[cmd.op]; if (!fn) throw new Error('neznámý příkaz ' + cmd.op); fn(cmd); }

  /** Záložní výběr: koule kolem bodu (v prostoru kořene) → oblast „vyber“. */
  function setSphere(centerRoot, radius) {
    regions.set('vyber', { id: 'vyber', label: 'Výběr (koule kolem bodu)', meshes: [], sphere: { center: centerRoot.clone(), radius } });
  }
  function worldToRoot(pWorld) { model.root.updateMatrixWorld(true); return pWorld.clone().applyMatrix4(new THREE.Matrix4().copy(model.root.matrixWorld).invert()); }

  return { rebuild, list, has, apply, begin, end, restore, setSphere, worldToRoot, regionSphere: (id) => regionSphere(getRegion(id)), get heightRef() { return heightRef; } };
}
