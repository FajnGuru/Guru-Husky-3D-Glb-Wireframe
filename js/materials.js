import * as THREE from 'three';

export function createMaterials(textures) {
  const { furNormal, leatherNormal, denimTex, eyeIrisTex } = textures;

  const materials = {
    whiteFur: new THREE.MeshStandardMaterial({
      name: 'Mat_WhiteFur',
      color: 0xf4f5f8,
      roughness: 0.78,
      normalMap: furNormal,
      normalScale: new THREE.Vector2(0.35, 0.35)
    }),
    greyFur: new THREE.MeshStandardMaterial({
      name: 'Mat_GreyFur',
      color: 0x454348,
      roughness: 0.8,
      normalMap: furNormal,
      normalScale: new THREE.Vector2(0.45, 0.45)
    }),
    pinkInnerEar: new THREE.MeshStandardMaterial({
      name: 'Mat_PinkEar',
      color: 0xdba0a8,
      roughness: 0.65
    }),
    tonguePink: new THREE.MeshPhysicalMaterial({
      name: 'Mat_Tongue',
      color: 0xf24e56,
      roughness: 0.32,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25
    }),
    wetNose: new THREE.MeshPhysicalMaterial({
      name: 'Mat_WetNose',
      color: 0x111215,
      roughness: 0.18,
      clearcoat: 0.9
    }),
    eyeWhite: new THREE.MeshPhysicalMaterial({
      name: 'Mat_EyeCornea',
      color: 0xffffff,
      roughness: 0.08,
      clearcoat: 1.0
    }),
    eyeIris: new THREE.MeshPhysicalMaterial({
      name: 'Mat_EyeIris',
      map: eyeIrisTex,
      roughness: 0.05,
      clearcoat: 1.0
    }),
    leatherJacket: new THREE.MeshPhysicalMaterial({
      name: 'Mat_LeatherJacket',
      color: 0x291a14,
      roughness: 0.38,
      metalness: 0.08,
      clearcoat: 0.35,
      normalMap: leatherNormal,
      normalScale: new THREE.Vector2(0.5, 0.5)
    }),
    goggleLeather: new THREE.MeshStandardMaterial({
      name: 'Mat_GoggleStrap',
      color: 0x3b2316,
      roughness: 0.45,
      normalMap: leatherNormal
    }),
    goggleSilver: new THREE.MeshStandardMaterial({
      name: 'Mat_SilverRim',
      color: 0xc8d0dc,
      roughness: 0.22,
      metalness: 0.88
    }),
    goggleGlass: new THREE.MeshPhysicalMaterial({
      name: 'Mat_GoggleLens',
      color: 0x101622,
      roughness: 0.08,
      metalness: 0.3,
      clearcoat: 1.0
    }),
    headphoneBlue: new THREE.MeshPhysicalMaterial({
      name: 'Mat_BlueMetallic',
      color: 0x1464d6,
      roughness: 0.22,
      metalness: 0.82,
      clearcoat: 0.6
    }),
    whiteShirt: new THREE.MeshStandardMaterial({
      name: 'Mat_WhiteCotton',
      color: 0xedeef2,
      roughness: 0.85
    }),
    denimJeans: new THREE.MeshStandardMaterial({
      name: 'Mat_DenimJeans',
      map: denimTex,
      roughness: 0.82,
      normalMap: leatherNormal,
      normalScale: new THREE.Vector2(0.25, 0.25)
    }),
    denimCuff: new THREE.MeshStandardMaterial({
      name: 'Mat_DenimCuff',
      color: 0x1c2b4b,
      roughness: 0.85
    })
  };

  const wireframeOverlayMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.28,
    depthTest: true
  });

  return { materials, wireframeOverlayMat };
}
