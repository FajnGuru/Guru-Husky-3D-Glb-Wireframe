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

## Spuštění

Otevřete `index.html` v prohlížeči podporujícím ES modules a import maps (moderní Chrome/Firefox/Edge).

Three.js + Cannon-es jsou načteny přes CDN.

Postava padá pod gravitací a nárazí na zem.
