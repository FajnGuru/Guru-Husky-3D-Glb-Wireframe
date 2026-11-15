import { model } from './model-state.js';

export function startAnimation(clock, controls, renderer, camera, scene, gHead, gGear, gTorso, huskyRoot, world, physicsBodies, stepPhysics) {
  const toggleAnim = document.getElementById('toggle-anim');
  const toggleTurntable = document.getElementById('toggle-turntable');
  let last = clock.getElapsedTime();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    // Pozn.: getElapsedTime() interně volá getDelta(), takže clock.getDelta() by tu vracel ~0
    // (dřív to v cannon-es dávalo NaN pozice → model zmizel). Delta počítáme sami.
    const dt = Math.min(Math.max(t - last, 0), 0.1);
    last = t;

    const procedural = model.kind === 'procedural';
    if (procedural && toggleAnim.checked) {
      const breath = Math.sin(t * 2.6) * 0.015;
      gHead.position.y = 1.88 + breath * 1.2;
      gHead.rotation.z = -0.07 + Math.sin(t * 1.5) * 0.025;
      gGear.position.copy(gHead.position);
      gGear.rotation.copy(gHead.rotation);
      gTorso.position.y = breath * 0.6;
    }

    if (toggleTurntable.checked && model.root) {
      model.root.rotation.y += 0.008;
    }

    // Physics step (jen procedurální Husky)
    if (procedural && world && physicsBodies && stepPhysics && dt > 0) {
      stepPhysics(world, physicsBodies, dt);
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
