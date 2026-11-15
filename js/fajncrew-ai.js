// FajnCrew AI pro Guru Husky 3D (Mód 10, route glb-command, editor 'husky-wireframe').
// V klientovi NENÍ žádný Gemini klíč ani model. Jen osobní editorový token (FAJNCREW_EDITOR_TOKEN),
// který zadáš v panelu; uloží se jen v tomto prohlížeči (localStorage) a jde smazat tlačítkem „Zapomenout token“.
// Server (Vercel) zavolá Gemini klíči BOT01–06 a vrátí jen povolené příkazy (whitelist), které tu provedeme přes UI.

export const FAJNCREW_PROD_URL = 'https://fajncrew.vercel.app';
export const FAJNCREW_DEFAULT_URL = FAJNCREW_PROD_URL; // FajnCrew PR #42 je na main (b48a63d)
// Dřívější preview adresa – uloženou hodnotu v localStorage převedeme na produkci.
const OLD_PREVIEW_URLS = ['https://fajncrew-git-feat-mod10-glb-command-fajnguru.vercel.app'];
export const GLB_COMMAND_PATH = '/api/ai?route=glb-command';
export const EDITOR_ID = 'husky-wireframe';
const TOKEN_KEY = 'fajncrew_editor_token';
const URL_KEY = 'fajncrew_base_url';
const TIMEOUT_MS = 35_000;
const MAX_UNDO = 30;
const MODES = ['pbr', 'overlay', 'wireframe'];
const HEX_RE = /^#[0-9a-f]{6}$/i;

const store = {
  get(k) { try { return (localStorage.getItem(k) || '').trim(); } catch { return ''; } },
  set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* nedostupné */ } },
};
const mask = (t) => (t ? '••••' + t.slice(-4) : '');

const HTTP_MSG = {
  401: 'FajnCrew odmítl editorový token – zkontroluj ho.', 403: 'FajnCrew nepovolil tuto adresu (origin).',
  413: 'Požadavek je moc velký.', 429: 'Moc příkazů za minutu – chvíli počkej.',
  503: 'FajnCrew teď není nastavený (chybí token nebo Gemini klíč ve Vercel env).',
};

export function initFajnCrewAI({ model, updateStats }) {
  const $ = (s) => document.querySelector(s);
  const partCb = (id) => document.querySelector(`#parts-list input[data-part="${id}"]`);
  const fire = (el) => el && el.dispatchEvent(new Event('change', { bubbles: true }));
  const partColors = {}; // id -> '#rrggbb' (jen změněné části)
  const undo = [];
  const groups = () => model.partGroups;
  window.addEventListener('husky:model-changed', () => { undo.length = 0; for (const k of Object.keys(partColors)) delete partColors[k]; });

  // ---------- Stav ----------
  function partScale(id) { return groups()[id]?.userData.fcScale ?? 1; }
  function getState() {
    const parts = {};
    for (const id of Object.keys(groups())) {
      const badge = document.getElementById(`stat-${id}`);
      const tris = badge ? Number(badge.textContent.replace(/[^\d]/g, '')) : undefined;
      parts[id] = { visible: !!partCb(id)?.checked, scale: partScale(id), ...(partColors[id] ? { color: partColors[id] } : {}), ...(Number.isFinite(tris) ? { triangles: tris } : {}) };
    }
    return { parts, mode: $('#render-mode')?.value, idleAnimation: !!$('#toggle-anim')?.checked, autoRotate: !!$('#toggle-turntable')?.checked };
  }

  // ---------- Operace (přes existující UI, aby zůstalo vše konzistentní) ----------
  function setPartVisible(id, v) { const cb = partCb(id); if (cb && cb.checked !== v) { cb.checked = v; fire(cb); } }
  function setViewMode(m) { const s = $('#render-mode'); if (s && MODES.includes(m) && s.value !== m) { s.value = m; fire(s); } }
  function setToggle(sel, v) { const cb = $(sel); if (cb && cb.checked !== v) { cb.checked = v; fire(cb); } }
  function meshesOf(id) { const out = []; groups()[id]?.traverse((o) => { if (o.isMesh && !o.userData.isOverlay) out.push(o); }); return out; }
  function setPartColor(id, hex) {
    const meshes = meshesOf(id);
    if (!hex) { // zpět na původní sdílené materiály
      meshes.forEach((m) => { if (m.userData.fcOrigMat) m.material = m.userData.fcOrigMat; });
      delete partColors[id]; return;
    }
    const clones = new Map();
    meshes.forEach((m) => {
      if (!m.userData.fcOrigMat) m.userData.fcOrigMat = m.material;
      const orig = m.userData.fcOrigMat;
      if (!m.userData.fcMat) {
        if (!clones.has(orig)) {
          const c = orig.clone(); c.map = null; c.needsUpdate = true;
          model.materials[`fc_${id}_${orig.uuid}`] = c; // ui.js přepíná wireframe přes Object.values(materials)
          clones.set(orig, c);
        }
        m.userData.fcMat = clones.get(orig);
      }
      m.userData.fcMat.wireframe = orig.wireframe;
      m.userData.fcMat.color.set(hex);
      m.material = m.userData.fcMat;
    });
    partColors[id] = hex;
  }
  function setPartScale(id, s) {
    const g = groups()[id]; if (!g) return;
    const meshes = g.isMesh ? [g] : meshesOf(id).filter((m) => m.parent === g);
    if (!g.userData.fcCenter) {
      const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      meshes.forEach((m) => { ['x', 'y', 'z'].forEach((a, i) => { box.min[i] = Math.min(box.min[i], m.position[a]); box.max[i] = Math.max(box.max[i], m.position[a]); }); });
      g.userData.fcCenter = box.min.map((v, i) => (v + box.max[i]) / 2);
      meshes.forEach((m) => { m.userData.fcPos = m.position.clone(); m.userData.fcScl = m.scale.clone(); });
    }
    const c = g.userData.fcCenter;
    meshes.forEach((m) => {
      if (!m.userData.fcPos) return;
      ['x', 'y', 'z'].forEach((a, i) => { m.position[a] = c[i] + (m.userData.fcPos[a] - c[i]) * s; });
      m.scale.copy(m.userData.fcScl).multiplyScalar(s);
    });
    g.userData.fcScale = s;
  }
  function exportGlb() { $('#btn-export-glb')?.click(); }

  function applyCommand(c) {
    switch (c.op) {
      case 'setPartVisible': return setPartVisible(c.part, !!c.visible);
      case 'setViewMode': return setViewMode(c.mode);
      case 'setIdleAnimation': return setToggle('#toggle-anim', !!c.enabled);
      case 'setAutoRotate': return setToggle('#toggle-turntable', !!c.enabled);
      case 'setPartColor': return HEX_RE.test(c.color || '') && setPartColor(c.part, c.color);
      case 'setPartScale': return Number.isFinite(c.scale) && setPartScale(c.part, Math.min(3, Math.max(0.3, c.scale)));
      case 'exportGlb': return exportGlb();
      default: throw new Error('neznámý příkaz ' + c.op);
    }
  }
  function restore(snap) {
    setViewMode(snap.mode);
    setToggle('#toggle-anim', snap.idleAnimation);
    setToggle('#toggle-turntable', snap.autoRotate);
    for (const [id, p] of Object.entries(snap.parts)) {
      setPartVisible(id, p.visible);
      if ((partColors[id] || null) !== (p.color || null)) setPartColor(id, p.color || null);
      if (partScale(id) !== p.scale) setPartScale(id, p.scale);
    }
  }

  // ---------- UI ----------
  const wrap = document.createElement('div');
  wrap.id = 'fajncrew-ai';
  wrap.innerHTML = `
    <div class="section-title">FajnCrew AI (Gemini přes Vercel)</div>
    <div class="control-group">
      <textarea id="fc-prompt" rows="3" placeholder="Např.: skryj ocas, zapni otáčení a hlavu dej o 20 % větší" style="width:100%;resize:vertical;padding:8px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,.35);color:var(--text);font:inherit;font-size:.85rem;user-select:text"></textarea>
      <div style="display:flex;gap:6px">
        <button class="btn-primary" id="fc-send" style="margin-top:0">Poslat</button>
        <button id="fc-undo" title="Vrátit poslední AI změnu" style="width:auto;white-space:nowrap">↶ Zpět</button>
      </div>
      <div id="fc-status" style="font-size:.78rem;color:var(--muted);min-height:1em;white-space:pre-wrap;user-select:text"></div>
      <details style="font-size:.8rem;color:var(--muted)">
        <summary style="cursor:pointer">Nastavení (token, server)</summary>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
          <input id="fc-token" type="password" autocomplete="off" placeholder="FAJNCREW_EDITOR_TOKEN" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,.35);color:var(--text)" />
          <div style="display:flex;gap:6px"><button id="fc-save" style="padding:6px">Uložit token</button><button id="fc-forget" style="padding:6px">Zapomenout token</button></div>
          <input id="fc-url" type="url" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,.35);color:var(--text)" />
          <span id="fc-token-info"></span>
        </div>
      </details>
    </div>`;
  const exportTitle = [...document.querySelectorAll('#ui-panel .section-title')].find((e) => /Export/i.test(e.textContent));
  (exportTitle ? exportTitle.parentNode.insertBefore(wrap, exportTitle) : document.getElementById('ui-panel')?.appendChild(wrap));

  const status = (t, err) => { const s = $('#fc-status'); s.textContent = t; s.style.color = err ? '#ff8a8a' : 'var(--muted)'; };
  const urlIn = $('#fc-url');
  if (OLD_PREVIEW_URLS.includes(store.get(URL_KEY).replace(/\/+$/, ''))) store.set(URL_KEY, '');
  urlIn.value = store.get(URL_KEY) || FAJNCREW_DEFAULT_URL;
  urlIn.addEventListener('change', () => { const v = urlIn.value.trim().replace(/\/+$/, ''); store.set(URL_KEY, /^https:\/\//.test(v) && v !== FAJNCREW_DEFAULT_URL ? v : ''); });
  const showToken = () => { $('#fc-token-info').textContent = store.get(TOKEN_KEY) ? `Token uložen (${mask(store.get(TOKEN_KEY))})` : 'Token není uložen.'; };
  showToken();
  $('#fc-save').addEventListener('click', () => { store.set(TOKEN_KEY, $('#fc-token').value.trim()); $('#fc-token').value = ''; showToken(); });
  $('#fc-forget').addEventListener('click', () => { store.set(TOKEN_KEY, ''); $('#fc-token').value = ''; showToken(); });
  // klávesy v textových polích nesmí ovládat scénu
  wrap.addEventListener('keydown', (e) => e.stopPropagation());

  $('#fc-undo').addEventListener('click', () => {
    const snap = undo.pop();
    if (!snap) return status('Není co vrátit.');
    restore(snap); status(`Vráceno (zbývá ${undo.length}).`);
  });

  let busy = false;
  async function send() {
    const prompt = $('#fc-prompt').value.trim();
    const token = store.get(TOKEN_KEY) || $('#fc-token').value.trim();
    if (!prompt) return status('Napiš, co se má změnit.', true);
    if (!token) { wrap.querySelector('details').open = true; return status('Zadej a ulož FajnCrew editorový token.', true); }
    if (busy) return;
    busy = true; $('#fc-send').disabled = true; status('Posílám na FajnCrew…');
    const base = (urlIn.value.trim() || FAJNCREW_DEFAULT_URL).replace(/\/+$/, '');
    const ac = new AbortController(); const kill = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      let r;
      try {
        r = await fetch(base + GLB_COMMAND_PATH, { method: 'POST', mode: 'cors', credentials: 'omit', signal: ac.signal,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ prompt, editor: EDITOR_ID, mode: 'quick', state: getState() }) });
      } catch (e) { throw new Error(e?.name === 'AbortError' ? 'FajnCrew neodpověděl včas.' : 'FajnCrew není dostupný (síť / CORS).'); }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`${HTTP_MSG[r.status] || 'FajnCrew chyba HTTP ' + r.status}${data.error ? ' (' + String(data.error).slice(0, 200) + ')' : ''}`);
      if (!Array.isArray(data.commands)) throw new Error('FajnCrew vrátil neplatnou odpověď.');
      if (data.commands.length) { undo.push(getState()); if (undo.length > MAX_UNDO) undo.shift(); }
      const done = []; const failed = [];
      for (const c of data.commands) { try { applyCommand(c); done.push(c.op); } catch (e) { failed.push(String(e.message || e)); } }
      const warn = [...(data.warnings || []), ...failed];
      status(`${data.explanation || 'Hotovo.'}\n✓ ${done.length} příkazů${data.model ? ` · ${data.model}` : ''}${data.botId ? ` · ${data.botId}` : ''}${warn.length ? '\n⚠ ' + warn.slice(0, 4).join('; ') : ''}`);
    } catch (e) {
      status(String(e.message || e), true);
    } finally { clearTimeout(kill); busy = false; $('#fc-send').disabled = false; }
  }
  $('#fc-send').addEventListener('click', send);
  $('#fc-prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });

  const api = { getState, applyCommand, restore, undo: () => $('#fc-undo').click() };
  window.fajnCrewAI = api;
  return api;
}
