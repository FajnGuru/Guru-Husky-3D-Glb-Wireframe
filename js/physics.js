import * as THREE from 'three';
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

export function createCharacterPhysics(world, huskyRoot, partGroups) {
  const bodies = [];

  // Simple compound-like: one dynamic body for the whole character (center of mass roughly at torso)
  const shape = new CANNON.Box(new CANNON.Vec3(0.45, 0.9, 0.35));
  const body = new CANNON.Body({
    mass: 8,
    shape,
    position: new CANNON.Vec3(0, 1.2, 0)
  });
  world.addBody(body);
  bodies.push({ body, mesh: huskyRoot });

  // Optional: individual bodies for head and paws for more interesting simulation
  // Head
  const headShape = new CANNON.Sphere(0.4);
  const headBody = new CANNON.Body({
    mass: 1.2,
    shape: headShape,
    position: new CANNON.Vec3(0, 1.9, 0)
  });
  world.addBody(headBody);
  bodies.push({ body: headBody, mesh: partGroups['1_Head_Muzzle'] });

  return bodies;
}

export function stepPhysics(world, bodies, dt = 1 / 60) {
  world.step(dt);
  bodies.forEach(({ body, mesh }) => {
    if (mesh) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  });
}
