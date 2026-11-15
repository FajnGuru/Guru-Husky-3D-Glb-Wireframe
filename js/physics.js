import * as CANNON from 'cannon-es';

export function initPhysics() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
  });

  // Ground
  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane()
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  return world;
}

const HALF_H = 0.9;

export function createCharacterPhysics(world, huskyRoot, partGroups) {
  const bodies = [];

  // Jedno dynamické těleso pro celou postavu. Spodní hrana boxu = chodidla (y=0), postava zůstává vzpřímená.
  const shape = new CANNON.Box(new CANNON.Vec3(0.45, HALF_H, 0.35));
  const body = new CANNON.Body({
    mass: 8,
    shape,
    fixedRotation: true,
    position: new CANNON.Vec3(0, HALF_H + 0.3, 0) // spadne z 30 cm na zem
  });
  world.addBody(body);
  // offset = pozice meshe vůči tělesu (kořen postavy má počátek u chodidel)
  bodies.push({ body, mesh: huskyRoot, offset: new CANNON.Vec3(0, -HALF_H, 0) });

  // Pozn.: hlava NEMÁ samostatné dynamické těleso napojené na mesh – dřív padala zvlášť
  // a její světová pozice se zapisovala do lokální pozice skupiny (hlava mimo tělo).
  return bodies;
}

export function stepPhysics(world, bodies, dt = 1 / 60) {
  const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 1 / 60;
  world.step(1 / 60, d, 5);
  bodies.forEach(({ body, mesh, offset }) => {
    if (!mesh) return;
    const p = body.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return; // nikdy nekopírovat NaN
    mesh.position.set(p.x + (offset?.x || 0), p.y + (offset?.y || 0), p.z + (offset?.z || 0));
    // rotaci nekopírujeme (fixedRotation) – otáčení dokola (turntable) tak funguje
  });
}
