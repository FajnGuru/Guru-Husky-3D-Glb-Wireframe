# Guru Husky 3D - Procedural Mesh & GLB Studio

Modulární verze procedurálního 3D Husky modelu s PBR materiály, wireframe overlay, GLB exportem a fyzikální simulací (Cannon-es).

## Struktura (rozděleno podle JS logiky a funkcí)

- `index.html` — HTML + CSS UI + importmap (včetně cannon-es)
- `js/main.js` — Hlavní orchestrace (včetně physics init)
- `js/scene.js` — Inicializace scény, kamery, rendereru, světel a podlahy
- `js/textures.js` — Funkce `createProceduralTexture` a generování textur
- `js/materials.js` — Definice PBR materiálů
- `js/character.js` — Funkce `addMesh` + sestavení všech částí postavy
- `js/physics.js` — `initPhysics()`, `createCharacterPhysics()`, `stepPhysics()` (Cannon-es)
- `js/stats.js` — `updateTriangleStats` pro výpočet trojúhelníků
- `js/ui.js` — Event listeners pro UI (render mode, parts, GLB export)
- `js/animation.js` — Animační smyčka, resize a physics step
- `js/model-state.js` — aktivní model (procedurální Husky / nahraný GLB), ze kterého čtou UI, statistiky, export i AI
- `js/glb-import.js` — „Nahrát model (.GLB)“ (+ drag&drop): zarámování kamery, wireframe overlay, části podle jmen `1_Head_Muzzle…5_Jeans_Tail` (jinak seznam meshů), „Zpět na procedurálního Huskyho“
- `js/fajncrew-ai.js` — FajnCrew AI panel (Mód 10): prompt → Vercel `glb-command` (editor `husky-wireframe`) → povolené příkazy (viditelnost/barva/měřítko části, režim sítě, animace, otáčení, export GLB), ↶ Zpět. Bez API klíčů v klientovi — jen osobní editorový token v localStorage (tlačítko „Zapomenout token“).

## Spuštění

Otevřete `index.html` v prohlížeči podporujícím ES modules a import maps (moderní Chrome/Firefox/Edge).

Three.js + Cannon-es jsou načteny přes CDN.

Postava padá pod gravitací a nárazí na zem.
