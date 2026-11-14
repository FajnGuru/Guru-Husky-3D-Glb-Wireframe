import * as THREE from 'three';

export function startAnimation(clock, controls, renderer, camera, scene, gHead, gGear, gTorso, huskyRoot) {
  const toggleAnim = document.getElementById('toggle-anim');
  const toggleTurntable = document.getElementById('toggle-turntable');

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (toggleAnim.checked) {
      const breath = Math.sin(t * 2.6) * 0.015;
      gHead.position.y = 1.88 + breath * 1.2;
      gHead.rotation.z = -0.07 + Math.sin(t * 1.5) * 0.025;
      gGear.position.copy(gHead.position);
      gGear.rotation.copy(gHead.rotation);
      gTorso.position.y = breath * 0.6;
    }

    if (toggleTurntable.checked) {
      huskyRoot.rotation.y += 0.008;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}
