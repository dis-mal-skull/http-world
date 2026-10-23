import * as THREE from 'three';

const CAR_RADIUS = 1.05;
const MAX_SPEED = 19;
const MAX_BOOST = 27;
const MAX_REVERSE = 7.5;

const clamp = THREE.MathUtils.clamp;

function makeHoodDecal() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);

  ctx.fillStyle = '#fff4e2';
  ctx.font = '700 118px "Space Grotesk", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HTTP', 256, 118);

  ctx.fillStyle = 'rgba(255, 244, 226, 0.75)';
  ctx.font = '500 34px "IBM Plex Mono", monospace';
  ctx.fillText('/ 1.1', 256, 194);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * A small low-poly car. Physics are intentionally arcade-like: instant
 * acceleration, speed-scaled steering and a simple circular collision resolve.
 */
export class Car {
  constructor(scene) {
    this.group = new THREE.Group();
    this.chassis = new THREE.Group();
    this.group.add(this.chassis);

    this.speed = 0;
    this.steer = 0;
    this.heading = Math.PI;
    this.wheelSpin = 0;
    this.boostAmount = 0;

    this.wheels = [];
    this.frontWheels = [];
    this.flames = [];

    this.#build();
    this.reset(new THREE.Vector3(0, 0, 13.5), Math.PI);
    scene.add(this.group);
  }

  #build() {
    const coral = new THREE.MeshStandardMaterial({
      color: 0xe4572e,
      roughness: 0.52,
      metalness: 0.06,
      flatShading: true,
    });
    const coralDark = new THREE.MeshStandardMaterial({
      color: 0xb8401f,
      roughness: 0.6,
      flatShading: true,
    });
    const ink = new THREE.MeshStandardMaterial({
      color: 0x232b37,
      roughness: 0.7,
      flatShading: true,
    });
    const cream = new THREE.MeshStandardMaterial({
      color: 0xfff4e2,
      roughness: 0.65,
      flatShading: true,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2c3b4d,
      roughness: 0.18,
      metalness: 0.35,
      flatShading: true,
    });
    const tire = new THREE.MeshStandardMaterial({
      color: 0x20242a,
      roughness: 0.95,
      flatShading: true,
    });
    const headlight = new THREE.MeshStandardMaterial({
      color: 0xfff4d2,
      emissive: 0xffcf7a,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    });
    const taillight = new THREE.MeshBasicMaterial({ color: 0xff3a1e });

    const add = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.chassis.add(mesh);
      return mesh;
    };

    // Main body
    add(new THREE.BoxGeometry(1.62, 0.46, 2.9), coral, 0, 0.62, 0);
    add(new THREE.BoxGeometry(1.5, 0.26, 2.66), coralDark, 0, 0.42, 0);

    // Nose + tail shaping
    add(new THREE.BoxGeometry(1.56, 0.28, 0.5), coral, 0, 0.56, 1.4);
    add(new THREE.BoxGeometry(1.56, 0.24, 0.34), coral, 0, 0.58, -1.42);
    add(new THREE.BoxGeometry(1.68, 0.1, 0.22), ink, 0, 0.36, 1.5);
    add(new THREE.BoxGeometry(1.68, 0.1, 0.2), ink, 0, 0.36, -1.5);

    // Cabin
    add(new THREE.BoxGeometry(1.34, 0.56, 1.38), coral, 0, 1.04, -0.28);
    add(new THREE.BoxGeometry(1.2, 0.06, 1.3), coralDark, 0, 1.345, -0.3);

    // Windows
    const windshield = add(new THREE.BoxGeometry(1.22, 0.46, 0.06), glass, 0, 1.08, 0.44);
    windshield.rotation.x = -0.42;
    const rearWindow = add(new THREE.BoxGeometry(1.22, 0.4, 0.06), glass, 0, 1.08, -0.97);
    rearWindow.rotation.x = 0.42;
    add(new THREE.BoxGeometry(0.05, 0.32, 1.02), glass, 0.686, 1.1, -0.28);
    add(new THREE.BoxGeometry(0.05, 0.32, 1.02), glass, -0.686, 1.1, -0.28);
    add(new THREE.BoxGeometry(1.3, 0.1, 0.08), ink, 0, 1.31, 0.38);

    // Racing stripes
    add(new THREE.BoxGeometry(0.15, 0.012, 1.5), cream, 0.26, 0.857, 0.72);
    add(new THREE.BoxGeometry(0.15, 0.012, 1.5), cream, -0.26, 0.857, 0.72);
    add(new THREE.BoxGeometry(0.15, 0.012, 1.1), cream, 0.26, 1.38, -0.3);
    add(new THREE.BoxGeometry(0.15, 0.012, 1.1), cream, -0.26, 1.38, -0.3);

    // Lights
    add(new THREE.BoxGeometry(0.34, 0.15, 0.05), headlight, 0.5, 0.7, 1.66);
    add(new THREE.BoxGeometry(0.34, 0.15, 0.05), headlight, -0.5, 0.7, 1.66);
    add(new THREE.BoxGeometry(0.32, 0.12, 0.05), taillight, 0.54, 0.68, -1.6);
    add(new THREE.BoxGeometry(0.32, 0.12, 0.05), taillight, -0.54, 0.68, -1.6);

    // Antenna
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 5), ink, 0.55, 1.62, -1.1);
    add(new THREE.SphereGeometry(0.06, 6, 6), coral, 0.55, 1.94, -1.1);

    // Hood decal
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 0.5),
      new THREE.MeshBasicMaterial({
        map: makeHoodDecal(),
        transparent: true,
        depthWrite: false,
      })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.868, 0.9);
    this.chassis.add(decal);

    // Wheels
    const tireGeometry = new THREE.CylinderGeometry(0.43, 0.43, 0.34, 14);
    tireGeometry.rotateZ(Math.PI / 2);
    const hubGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.355, 10);
    hubGeometry.rotateZ(Math.PI / 2);

    const wheelPositions = [
      [0.84, 0.43, 0.98, true],
      [-0.84, 0.43, 0.98, true],
      [0.84, 0.43, -0.98, false],
      [-0.84, 0.43, -0.98, false],
    ];

    for (const [x, y, z, isFront] of wheelPositions) {
      const steering = new THREE.Group();
      steering.position.set(x, y, z);

      const roller = new THREE.Group();
      const tireMesh = new THREE.Mesh(tireGeometry, tire);
      tireMesh.castShadow = true;
      roller.add(tireMesh);

      const hubMesh = new THREE.Mesh(hubGeometry, cream);
      hubMesh.castShadow = true;
      roller.add(hubMesh);

      steering.add(roller);
      this.group.add(steering);
      this.wheels.push(roller);
      if (isFront) this.frontWheels.push(steering);
    }

    // Boost flames
    const flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa15c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (const x of [-0.4, 0.4]) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.65, 6), flameMaterial.clone());
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(x, 0.48, -1.66);
      flame.visible = false;
      this.group.add(flame);
      this.flames.push(flame);
    }

    this.group.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
      }
    });
  }

  reset(position, heading = this.heading) {
    this.group.position.copy(position);
    this.group.position.y = 0;
    this.heading = heading;
    this.group.rotation.y = heading;
    this.speed = 0;
    this.steer = 0;
    this.wheelSpin = 0;
    this.chassis.rotation.set(0, 0, 0);
    this.#syncWheels(0);
  }

  #syncWheels(dt) {
    this.wheelSpin += (this.speed / 0.43) * dt;
    for (const wheel of this.wheels) {
      wheel.rotation.x = this.wheelSpin;
    }
    const steerAngle = this.steer * 0.42;
    for (const wheel of this.frontWheels) {
      wheel.rotation.y = steerAngle;
    }
  }

  update(dt, input, colliders) {
    const throttle = clamp(input.throttle, -1, 1);
    const steerInput = clamp(input.steer, -1, 1);
    const boosting = input.boost && throttle > 0.15;

    this.boosting = boosting;
    this.boostAmount += ((boosting ? 1 : 0) - this.boostAmount) * Math.min(1, dt * 6);

    // Steering with a little smoothing
    this.steer += (steerInput - this.steer) * Math.min(1, dt * 9);

    // Longitudinal physics
    const topSpeed = boosting ? MAX_BOOST : MAX_SPEED;
    if (throttle > 0.01) {
      const force = boosting ? 30 : 19;
      this.speed += throttle * force * dt;
    } else if (throttle < -0.01) {
      this.speed += throttle * 15 * dt;
    }

    // Brake / handbrake
    if (input.brake) {
      const brakeForce = 22;
      if (Math.abs(this.speed) < brakeForce * dt) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * brakeForce * dt;
      }
    }

    // Rolling resistance and drag
    this.speed *= Math.exp(-0.5 * dt);
    if (!throttle) {
      this.speed *= Math.exp(-0.75 * dt);
    }

    if (this.speed > topSpeed) this.speed += (topSpeed - this.speed) * Math.min(1, dt * 2.5);
    if (this.speed < -MAX_REVERSE) this.speed = -MAX_REVERSE;

    // Turn rate scales with speed, and reverses when backing up
    const speedFactor = clamp(Math.abs(this.speed) / 7, 0, 1);
    const turnRate = 2.35 * (0.35 + speedFactor * 0.65);
    this.heading -= this.steer * turnRate * dt * Math.sign(this.speed || 1) * speedFactor;
    this.group.rotation.y = this.heading;

    // Move
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.group.position.addScaledVector(forward, this.speed * dt);

    // Collisions
    let hit = false;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const collider of colliders) {
        const dx = this.group.position.x - collider.x;
        const dz = this.group.position.z - collider.z;
        const minDistance = collider.r + CAR_RADIUS;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq < minDistance * minDistance) {
          const distance = Math.sqrt(distanceSq) || 0.001;
          const push = (minDistance - distance) / distance;
          this.group.position.x += dx * push;
          this.group.position.z += dz * push;
          hit = true;
        }
      }
    }

    if (hit) {
      this.speed *= 0.55;
    }

    // Island boundary
    const distanceFromCenter = Math.hypot(this.group.position.x, this.group.position.z);
    const limit = 39.4;
    if (distanceFromCenter > limit) {
      const scale = limit / distanceFromCenter;
      this.group.position.x *= scale;
      this.group.position.z *= scale;
      this.speed *= 0.7;
    }

    // Body language: lean into turns and squat under acceleration
    const targetRoll = -this.steer * 0.07 * speedFactor;
    const targetPitch = -throttle * 0.018 + (input.brake ? 0.03 : 0);
    this.chassis.rotation.z += (targetRoll - this.chassis.rotation.z) * Math.min(1, dt * 6);
    this.chassis.rotation.x += (targetPitch - this.chassis.rotation.x) * Math.min(1, dt * 5);
    this.chassis.position.y = Math.sin(this.wheelSpin * 0.5) * 0.004 * speedFactor;

    this.#syncWheels(dt);

    // Flames
    for (const flame of this.flames) {
      flame.visible = this.boostAmount > 0.05;
      const flicker = 0.8 + Math.random() * 0.5;
      flame.scale.set(1, 0.5 + this.boostAmount * flicker, 1);
      flame.material.opacity = this.boostAmount * 0.85;
    }
  }

  get position() {
    return this.group.position;
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  get speedRatio() {
    return Math.min(Math.abs(this.speed) / MAX_SPEED, 1.5);
  }
}
