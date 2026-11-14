import * as THREE from 'three';

export function createCharacter(scene, materials, wireframeOverlayMat) {
  const huskyRoot = new THREE.Group();
  huskyRoot.name = 'Guru_Husky_Character';
  scene.add(huskyRoot);

  const partGroups = {
    '1_Head_Muzzle': new THREE.Group(),
    '2_Headgear': new THREE.Group(),
    '3_Torso_Jacket': new THREE.Group(),
    '4_Paws_Fingers': new THREE.Group(),
    '5_Jeans_Tail': new THREE.Group()
  };

  Object.entries(partGroups).forEach(([key, grp]) => {
    grp.name = key;
    huskyRoot.add(grp);
  });

  const overlayMeshes = [];
  const allMainMeshes = [];

  function addMesh(geometry, material, parentGroup, name, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const wfMesh = new THREE.Mesh(geometry, wireframeOverlayMat);
    wfMesh.name = name + '_WireframeOverlay';
    wfMesh.userData.isOverlay = true;
    mesh.add(wfMesh);

    overlayMeshes.push(wfMesh);
    allMainMeshes.push(mesh);
    parentGroup.add(mesh);
    return mesh;
  }

  // ČÁST 1: HLAVA, ČENICH, JAZYK A UŠI
  const gHead = partGroups['1_Head_Muzzle'];
  gHead.position.set(0, 1.88, 0);
  gHead.rotation.z = -0.07;

  addMesh(new THREE.SphereGeometry(0.56, 64, 48), materials.whiteFur, gHead, 'Head_Skull_White', [0, 0, 0], [0, 0, 0], [1.08, 0.98, 0.96]);
  addMesh(new THREE.SphereGeometry(0.565, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.58), materials.greyFur, gHead, 'Head_FurCap_Grey', [0, 0.03, -0.03], [-0.22, 0, 0], [1.09, 0.99, 0.97]);

  [-1, 1].forEach(side => {
    addMesh(new THREE.SphereGeometry(0.28, 40, 32), materials.whiteFur, gHead, `Cheek_Tuft_${side > 0 ? 'R' : 'L'}`, [side * 0.36, -0.14, 0.14], [0, 0, side * -0.25], [1.15, 0.82, 0.9]);
  });

  addMesh(new THREE.SphereGeometry(0.24, 48, 40), materials.whiteFur, gHead, 'Muzzle_Bridge', [0, -0.12, 0.46], [0.15, 0, 0], [1.15, 0.85, 1.15]);
  [-1, 1].forEach(side => {
    addMesh(new THREE.SphereGeometry(0.16, 40, 32), materials.whiteFur, gHead, `Muzzle_Jowl_${side > 0 ? 'R' : 'L'}`, [side * 0.13, -0.18, 0.50], [0, 0, 0], [1.1, 0.88, 1.0]);
  });

  addMesh(new THREE.SphereGeometry(0.11, 48, 36), materials.wetNose, gHead, 'Nose_Tip', [0, -0.07, 0.69], [0.2, 0, 0], [1.28, 0.88, 0.92]);

  addMesh(new THREE.SphereGeometry(0.19, 36, 28), materials.whiteFur, gHead, 'Lower_Jaw', [0, -0.30, 0.39], [0.35, 0, 0], [1.0, 0.65, 1.05]);
  addMesh(new THREE.SphereGeometry(0.14, 32, 24), materials.wetNose, gHead, 'Mouth_Cavity', [0, -0.22, 0.44], [0.2, 0, 0], [0.95, 0.75, 0.7]);

  const tongueCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.21, 0.45),
    new THREE.Vector3(0.01, -0.28, 0.56),
    new THREE.Vector3(0.03, -0.43, 0.59),
    new THREE.Vector3(0.04, -0.55, 0.55)
  ]);
  const tongueGeo = new THREE.TubeGeometry(tongueCurve, 48, 0.085, 32, false);
  tongueGeo.scale(1.25, 1.0, 0.48);
  addMesh(tongueGeo, materials.tonguePink, gHead, 'Tongue_Base');
  addMesh(new THREE.SphereGeometry(0.085, 36, 28), materials.tonguePink, gHead, 'Tongue_Tip', [0.04, -0.55, 0.55], [0.2, 0, 0], [1.22, 0.95, 0.48]);

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    addMesh(new THREE.SphereGeometry(0.125, 48, 40), materials.eyeWhite, gHead, `Eye_Sclera_${sideName}`, [side * 0.175, 0.07, 0.44], [0, side * 0.18, 0], [0.92, 1.12, 0.65]);
    addMesh(new THREE.SphereGeometry(0.095, 48, 40), materials.eyeIris, gHead, `Eye_Iris_${sideName}`, [side * 0.165, 0.07, 0.49], [0, Math.PI * 0.5 + side * 0.12, 0], [0.9, 1.08, 0.35]);
    addMesh(new THREE.CapsuleGeometry(0.024, 0.13, 16, 24), materials.greyFur, gHead, `Eyebrow_${sideName}`, [side * 0.18, 0.24, 0.47], [0, side * -0.2, Math.PI * 0.5 + side * -0.22]);
  });

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    addMesh(new THREE.ConeGeometry(0.18, 0.48, 40, 16), materials.greyFur, gHead, `Ear_Outer_${sideName}`, [side * 0.29, 0.58, -0.02], [-0.1, 0, side * -0.24], [0.9, 1.0, 0.55]);
    addMesh(new THREE.ConeGeometry(0.12, 0.36, 32, 12), materials.pinkInnerEar, gHead, `Ear_Inner_${sideName}`, [side * 0.285, 0.56, 0.03], [-0.1, 0, side * -0.24], [0.85, 1.0, 0.45]);
  });

  // ČÁST 2: BRÝLE A SLUCHÁTKA
  const gGear = partGroups['2_Headgear'];
  gGear.position.copy(gHead.position);
  gGear.rotation.copy(gHead.rotation);

  addMesh(new THREE.TorusGeometry(0.53, 0.045, 24, 48, Math.PI * 1.15), materials.goggleLeather, gGear, 'Aviator_Goggles_Strap', [0, 0.27, -0.02], [Math.PI * 0.42, 0, -Math.PI * 0.07], [1.06, 1.0, 1.0]);

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    const gX = side * 0.19;
    const gY = 0.36;
    const gZ = 0.38;
    addMesh(new THREE.TorusGeometry(0.135, 0.038, 24, 40), materials.goggleLeather, gGear, `Goggle_Pad_${sideName}`, [gX, gY, gZ], [-0.45, side * 0.28, side * -0.12], [1.18, 0.88, 1.0]);
    addMesh(new THREE.TorusGeometry(0.13, 0.022, 24, 40), materials.goggleSilver, gGear, `Goggle_Rim_${sideName}`, [gX, gY + 0.01, gZ + 0.03], [-0.45, side * 0.28, side * -0.12], [1.18, 0.88, 1.0]);
    addMesh(new THREE.SphereGeometry(0.128, 36, 28), materials.goggleGlass, gGear, `Goggle_Lens_${sideName}`, [gX, gY + 0.01, gZ + 0.02], [-0.45, side * 0.28, side * -0.12], [1.15, 0.85, 0.35]);
  });

  addMesh(new THREE.TorusGeometry(0.58, 0.032, 20, 48, Math.PI * 1.05), materials.wetNose, gGear, 'Headphone_Arch', [0, 0.02, -0.06], [-0.25, 0, -0.02], [1.04, 0.98, 1.0]);

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    const hX = side * 0.56;
    const hY = -0.02;
    const hZ = 0.02;
    addMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 36), materials.wetNose, gGear, `Headphone_Cushion_${sideName}`, [hX, hY, hZ], [0, 0, Math.PI * 0.5 + side * -0.18], [1.15, 1.0, 0.9]);
    addMesh(new THREE.CylinderGeometry(0.17, 0.14, 0.09, 40), materials.headphoneBlue, gGear, `Headphone_Cup_${sideName}`, [hX + side * 0.045, hY + 0.01, hZ], [0, 0, Math.PI * 0.5 + side * -0.18], [1.15, 1.0, 0.9]);
  });

  // ČÁST 3: TRUP, TRIČKO A BUNDA
  const gTorso = partGroups['3_Torso_Jacket'];

  addMesh(new THREE.CylinderGeometry(0.22, 0.26, 0.28, 28), materials.whiteFur, gTorso, 'Neck_Fur', [0, 1.42, 0]);
  addMesh(new THREE.ConeGeometry(0.22, 0.38, 28), materials.whiteFur, gTorso, 'Chest_Fur_Tuft', [0, 1.18, 0.24], [Math.PI, 0, 0], [1.1, 1.0, 0.55]);

  addMesh(new THREE.CylinderGeometry(0.35, 0.33, 0.72, 32, 12), materials.whiteShirt, gTorso, 'Torso_White_Undershirt', [0, 1.02, 0], [0, 0, 0], [1.12, 1.0, 0.85]);

  addMesh(new THREE.CylinderGeometry(0.39, 0.37, 0.68, 32, 12, false, -Math.PI * 0.78, Math.PI * 1.56), materials.leatherJacket, gTorso, 'Jacket_Body_Shell', [0, 1.06, -0.01], [0, Math.PI, 0], [1.14, 1.0, 0.90]);

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    addMesh(new THREE.BoxGeometry(0.16, 0.64, 0.12, 8, 16, 6), materials.leatherJacket, gTorso, `Jacket_FrontPanel_${sideName}`, [side * 0.23, 1.06, 0.24], [0, side * 0.28, 0]);
    addMesh(new THREE.BoxGeometry(0.15, 0.22, 0.05, 6, 8, 4), materials.leatherJacket, gTorso, `Jacket_Lapel_${sideName}`, [side * 0.22, 1.32, 0.29], [0.25, side * 0.3, side * -0.35]);
    addMesh(new THREE.BoxGeometry(0.11, 0.11, 0.04, 6, 6, 4), materials.leatherJacket, gTorso, `Jacket_ChestPocket_${sideName}`, [side * 0.25, 1.14, 0.30], [0, side * 0.3, 0]);
    addMesh(new THREE.BoxGeometry(0.12, 0.13, 0.04, 6, 6, 4), materials.leatherJacket, gTorso, `Jacket_LowPocket_${sideName}`, [side * 0.26, 0.88, 0.29], [0, side * 0.3, 0]);
  });

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    const sleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.38, 1.30, 0.0),
      new THREE.Vector3(side * 0.58, 1.10, -0.03),
      new THREE.Vector3(side * 0.42, 0.84, 0.10)
    ]);
    const sleeveGeo = new THREE.TubeGeometry(sleeveCurve, 28, 0.125, 24, false);
    addMesh(sleeveGeo, materials.leatherJacket, gTorso, `Jacket_Sleeve_${sideName}`);

    addMesh(new THREE.TorusGeometry(0.122, 0.022, 12, 24), materials.leatherJacket, gTorso, `Sleeve_Fold1_${sideName}`, [side * 0.54, 1.08, -0.02], [0.5, side * 0.4, 0]);
    addMesh(new THREE.TorusGeometry(0.115, 0.020, 12, 24), materials.leatherJacket, gTorso, `Sleeve_Fold2_${sideName}`, [side * 0.48, 0.96, 0.04], [0.6, side * 0.3, 0]);
  });

  // ČÁST 4: TLAPKY A PRSTY
  const gPaws = partGroups['4_Paws_Fingers'];

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    const hX = side * 0.37;
    const hY = 0.77;
    const hZ = 0.14;
    addMesh(new THREE.SphereGeometry(0.11, 24, 20), materials.whiteFur, gPaws, `Hand_Palm_${sideName}`, [hX, hY, hZ], [0, 0, side * 0.3], [1.0, 0.85, 0.9]);
    for (let f = 0; f < 4; f++) {
      const offsetZ = 0.19 - f * 0.035;
      const offsetY = 0.75 - f * 0.015;
      addMesh(new THREE.CapsuleGeometry(0.028, 0.05, 12, 16), materials.whiteFur, gPaws, `Hand_Finger_${sideName}_${f + 1}`, [side * 0.33, offsetY, offsetZ], [0.2, 0, Math.PI * 0.45]);
    }
  });

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    const fX = side * 0.30;
    addMesh(new THREE.SphereGeometry(0.14, 24, 20), materials.whiteFur, gPaws, `Foot_Base_${sideName}`, [fX, 0.07, 0.06], [0, side * -0.18, 0], [1.05, 0.55, 1.35]);
    for (let t = -1.5; t <= 1.5; t += 1) {
      const toeAngle = side * -0.18;
      const localX = t * 0.048;
      const worldX = fX + localX * Math.cos(toeAngle) + 0.16 * Math.sin(toeAngle);
      const worldZ = 0.06 - localX * Math.sin(toeAngle) + 0.16 * Math.cos(toeAngle);
      addMesh(new THREE.SphereGeometry(0.038, 20, 16), materials.whiteFur, gPaws, `Foot_Toe_${sideName}_${t + 2.5}`, [worldX, 0.048, worldZ], [0, toeAngle, 0], [0.85, 0.78, 1.3]);
    }
  });

  // ČÁST 5: DŽÍNY A OCAS
  const gJeans = partGroups['5_Jeans_Tail'];

  addMesh(new THREE.CylinderGeometry(0.34, 0.33, 0.24, 24, 6), materials.denimJeans, gJeans, 'Jeans_Pelvis', [0, 0.64, 0], [0, 0, 0], [1.1, 1.0, 0.85]);

  [-1, 1].forEach(side => {
    const sideName = side > 0 ? 'R' : 'L';
    addMesh(new THREE.CylinderGeometry(0.155, 0.135, 0.56, 20, 8), materials.denimJeans, gJeans, `Jeans_Leg_${sideName}`, [side * 0.23, 0.36, 0.01], [0, 0, side * 0.16]);
    addMesh(new THREE.TorusGeometry(0.138, 0.026, 12, 20), materials.denimCuff, gJeans, `Jeans_Cuff_${sideName}`, [side * 0.275, 0.12, 0.01], [Math.PI * 0.5, side * -0.16, 0]);
  });

  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.62, -0.22),
    new THREE.Vector3(0.05, 0.44, -0.38),
    new THREE.Vector3(0.08, 0.25, -0.32)
  ]);
  addMesh(new THREE.TubeGeometry(tailCurve, 20, 0.14, 18, false), materials.whiteFur, gJeans, 'Tail_Bushy_Base');
  addMesh(new THREE.SphereGeometry(0.15, 20, 16), materials.greyFur, gJeans, 'Tail_Tip_Fluff', [0.08, 0.23, -0.31], [0.2, 0, 0], [0.95, 1.25, 0.95]);

  return { huskyRoot, partGroups, overlayMeshes, allMainMeshes, gHead, gGear, gTorso };
}
