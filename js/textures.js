import * as THREE from 'three';

export function createProceduralTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (type === 'fur_normal') {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 110 + Math.random() * 36;
      const g = 100 + Math.random() * 55;
      ctx.strokeStyle = `rgb(${r},${g},255)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y + 6 + Math.random() * 6);
      ctx.stroke();
    }
  } else if (type === 'leather_normal') {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = 115 + Math.random() * 26;
      ctx.fillStyle = `rgb(${v},${v},255)`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (type === 'denim_albedo') {
    ctx.fillStyle = '#111e38';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = -512; i < 512; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 512, 512);
      ctx.stroke();
    }
  } else if (type === 'eye_iris') {
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 240);
    grad.addColorStop(0, '#050505');
    grad.addColorStop(0.32, '#050505');
    grad.addColorStop(0.36, '#4de66e');
    grad.addColorStop(0.75, '#198c36');
    grad.addColorStop(0.92, '#0b3b17');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    // Odlesk v oku
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(195, 190, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createTextures() {
  const furNormal = createProceduralTexture('fur_normal');
  furNormal.repeat.set(4, 4);
  const leatherNormal = createProceduralTexture('leather_normal');
  leatherNormal.repeat.set(3, 3);
  const denimTex = createProceduralTexture('denim_albedo');
  denimTex.repeat.set(3, 3);
  const eyeIrisTex = createProceduralTexture('eye_iris');

  return { furNormal, leatherNormal, denimTex, eyeIrisTex };
}
