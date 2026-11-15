// Aktivní model ve scéně (procedurální Husky nebo nahraný GLB). Všechny moduly čtou odsud,
// takže zobrazení sítě, části, statistiky, export i FajnCrew AI fungují na tom, co je právě vidět.
export const PROCEDURAL_LABELS = {
  '1_Head_Muzzle': '1. Hlava, čenich a jazyk',
  '2_Headgear': '2. Brýle a sluchátka',
  '3_Torso_Jacket': '3. Trup, tričko a bunda',
  '4_Paws_Fingers': '4. Tlapky a prsty (v bok)',
  '5_Jeans_Tail': '5. Džíny a huňatý ocas',
};

export const model = {
  kind: 'procedural', // 'procedural' | 'glb'
  name: 'Guru Husky (procedurální)',
  root: null,
  partGroups: {},
  labels: {},
  overlayMeshes: [],
  materials: {},
};

export function setModel(next) {
  Object.assign(model, next);
  window.dispatchEvent(new CustomEvent('husky:model-changed', { detail: { kind: model.kind, name: model.name } }));
}
