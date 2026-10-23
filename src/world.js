import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STATIONS } from './content.js';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260422);

const material = (color, options = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
    ...options,
  });

function mesh(geometry, mat, castShadow = true) {
  const m = new THREE.Mesh(geometry, mat);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

/**
 * Builds one InstancedMesh from a list of transform entries. This keeps the
 * decoration cheap: hundreds of trees, rocks and grass blades become a handful
 * of draw calls instead of hundreds.
 */
function instances(geometry, mat, entries, { castShadow = true, receiveShadow = true } = {}) {
  if (!entries.length) return null;

  const instanced = new THREE.InstancedMesh(geometry, mat, entries.length);
  const dummy = new THREE.Object3D();

  entries.forEach((entry, index) => {
    const position = entry.position;
    const scale = entry.scale || [1, 1, 1];
    dummy.position.set(position[0], position[1] ?? 0, position[2]);
    dummy.rotation.set(entry.rx || 0, entry.ry || 0, entry.rz || 0);
    dummy.scale.set(scale[0], scale[1], scale[2]);
    dummy.updateMatrix();
    instanced.setMatrixAt(index, dummy.matrix);
    if (entry.color) instanced.setColorAt(index, entry.color);
  });

  instanced.castShadow = castShadow;
  instanced.receiveShadow = receiveShadow;
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  return instanced;
}

/* -------------------------------------------------------------------------- */
/* Sky                                                                        */
/* -------------------------------------------------------------------------- */

function createSky(scene) {
  const geometry = new THREE.SphereGeometry(180, 32, 20);
  const sky = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0xf8ecd8) },
        bottomColor: { value: new THREE.Color(0xe9d3b4) },
        sunColor: { value: new THREE.Color(0xffd9a0) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vPosition;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;

        void main() {
          vec3 dir = normalize(vPosition);
          float h = smoothstep(-0.08, 0.62, dir.y);
          vec3 color = mix(bottomColor, topColor, h);

          vec3 sunDir = normalize(vec3(0.55, 0.42, 0.72));
          float glow = pow(max(dot(dir, sunDir), 0.0), 18.0);
          color += sunColor * glow * 0.28;

          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  );

  scene.add(sky);
  return sky;
}

/* -------------------------------------------------------------------------- */
/* Island                                                                     */
/* -------------------------------------------------------------------------- */

function createIsland(scene) {
  const sand = material(0xe5d3b6);
  const island = mesh(new THREE.CylinderGeometry(42, 42, 2.6, 72, 1), sand);
  island.position.y = -1.3;
  scene.add(island);

  const rim = mesh(new THREE.CylinderGeometry(42.8, 42.8, 0.55, 72), material(0xf7eeda));
  rim.position.y = -0.32;
  scene.add(rim);

  // Rocky underside
  const underside = mesh(
    new THREE.CylinderGeometry(41.6, 9, 17, 36, 3),
    material(0xc3a47f)
  );
  underside.position.y = -10.4;
  underside.castShadow = false;
  scene.add(underside);

  const lower = mesh(new THREE.CylinderGeometry(9, 2.5, 7, 18), material(0xac8a67));
  lower.position.y = -22;
  lower.castShadow = false;
  scene.add(lower);
}

function createRoads(scene) {
  const road = material(0xc9b394, { roughness: 1 });
  const cream = material(0xfbf3e4, { roughness: 1 });
  const dash = material(0xfff8ea, { roughness: 1 });

  const ring = mesh(new THREE.RingGeometry(19.4, 22.8, 128), road, false);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.016;
  scene.add(ring);

  const inner = mesh(new THREE.RingGeometry(19.1, 19.45, 128), cream, false);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.022;
  scene.add(inner);

  const outer = mesh(new THREE.RingGeometry(22.75, 23.1, 128), cream, false);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.022;
  scene.add(outer);

  const dashEntries = [];
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2;
    dashEntries.push({
      position: [Math.cos(angle) * 21.1, 0.035, Math.sin(angle) * 21.1],
      ry: -angle,
    });
  }
  const dashes = instances(new THREE.BoxGeometry(0.16, 0.02, 1.25), dash, dashEntries, {
    castShadow: false,
  });
  scene.add(dashes);

  // Central plaza
  const plaza = mesh(new THREE.CircleGeometry(7.4, 64), road, false);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.014;
  scene.add(plaza);

  const plazaRing = mesh(new THREE.RingGeometry(7.4, 7.75, 64), cream, false);
  plazaRing.rotation.x = -Math.PI / 2;
  plazaRing.position.y = 0.02;
  scene.add(plazaRing);

  const plazaInner = mesh(new THREE.RingGeometry(4.6, 4.7, 64), cream, false);
  plazaInner.rotation.x = -Math.PI / 2;
  plazaInner.position.y = 0.02;
  scene.add(plazaInner);
}

/* -------------------------------------------------------------------------- */
/* Origin server                                                              */
/* -------------------------------------------------------------------------- */

function makeLabelSprite(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 640, 192);

  ctx.fillStyle = 'rgba(28, 36, 48, 0.92)';
  ctx.beginPath();
  ctx.roundRect(16, 24, 608, 144, 28);
  ctx.fill();

  ctx.fillStyle = '#f4e9d8';
  ctx.font = '600 44px "Space Grotesk", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 320, 92);

  ctx.fillStyle = '#e4572e';
  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText(subtitle, 320, 132);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.scale.set(5.4, 1.62, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createServer(scene, colliders) {
  const group = new THREE.Group();
  const ink = material(0x242c38, { roughness: 0.6 });
  const cream = material(0xfff6e7);
  const accent = new THREE.MeshStandardMaterial({
    color: 0x0f8f86,
    emissive: 0x0f8f86,
    emissiveIntensity: 0.55,
    roughness: 0.5,
    flatShading: true,
  });

  const base = mesh(new THREE.CylinderGeometry(3.3, 3.6, 0.35, 8), cream);
  base.position.y = 0.18;
  group.add(base);

  const core = mesh(new THREE.CylinderGeometry(2.25, 2.5, 3.4, 6), ink);
  core.position.y = 1.95;
  group.add(core);

  const cap = mesh(new THREE.CylinderGeometry(2.2, 2.35, 0.3, 6), accent);
  cap.position.y = 3.75;
  group.add(cap);

  const beacon = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 8), cream);
  beacon.position.y = 4.05;
  group.add(beacon);

  // Server face details
  for (let i = 0; i < 4; i += 1) {
    const slot = mesh(new THREE.BoxGeometry(1.4, 0.16, 0.05), cream);
    slot.position.set(0, 1.2 + i * 0.42, 2.16);
    slot.rotation.y = 0;
    group.add(slot);
  }

  const ledColors = [0xe4572e, 0x2f9e63, 0xf2a71b, 0x0f8f86];
  for (let i = 0; i < 4; i += 1) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.06),
      new THREE.MeshBasicMaterial({ color: ledColors[i] })
    );
    led.position.set(1.0, 1.18 + i * 0.42, 2.2);
    group.add(led);
  }

  // Rotating holographic rings
  const rings = [];
  const ringData = [
    [3.1, 2.4, 0xe4572e],
    [3.45, 3.0, 0x0f8f86],
    [3.8, 3.3, 0xf2a71b],
  ];
  for (const [radius, height, color] of ringData) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.045, 6, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height;
    group.add(ring);
    rings.push(ring);
  }

  // Floating cubes
  const orbiters = [];
  for (let i = 0; i < 6; i += 1) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xf4e9d8 : 0xe4572e,
        emissive: i % 2 ? 0xf4e9d8 : 0xe4572e,
        emissiveIntensity: 0.35,
        flatShading: true,
      })
    );
    group.add(cube);
    orbiters.push(cube);
  }

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(5.6, 48),
    new THREE.MeshBasicMaterial({
      color: 0xe4572e,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  group.add(glow);

  const label = makeLabelSprite('ORIGIN SERVER', 'HTTP · 200 OK');
  label.position.y = 7.0;
  group.add(label);

  scene.add(group);
  colliders.push({ x: 0, z: 0, r: 2.9 });

  return { group, rings, orbiters };
}

/* -------------------------------------------------------------------------- */
/* Station icons                                                              */
/* -------------------------------------------------------------------------- */

function createIcon(type, accentHex) {
  const group = new THREE.Group();
  const accent = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.22,
    roughness: 0.55,
    flatShading: true,
  });
  const ink = material(0x252d3a, { roughness: 0.65 });
  const cream = material(0xfff6e7);
  const glow = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.35,
      roughness: 0.4,
    });

  const add = (geometry, mat, x = 0, y = 0, z = 0) => {
    const item = mesh(geometry, mat);
    item.position.set(x, y, z);
    group.add(item);
    return item;
  };

  switch (type) {
    case 'hub': {
      add(new THREE.BoxGeometry(0.9, 0.9, 0.9), cream, -0.72, 0, 0);
      add(new THREE.BoxGeometry(1.25, 1.25, 1.25), ink, 0.72, 0.12, 0);
      const link = add(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 6), accent, 0, 0.08, 0);
      link.rotation.z = Math.PI / 2;
      add(new THREE.SphereGeometry(0.11, 8, 8), glow(0xe4572e), -0.72, 0.55, 0);
      add(new THREE.SphereGeometry(0.11, 8, 8), glow(0x0f8f86), 0.72, 0.82, 0);
      break;
    }
    case 'mail': {
      const envelope = add(new THREE.BoxGeometry(2.0, 1.3, 0.2), cream);
      envelope.rotation.x = 0.04;
      const flapA = add(new THREE.BoxGeometry(1.05, 0.09, 0.06), accent, -0.4, 0.22, 0.13);
      flapA.rotation.z = -0.55;
      const flapB = add(new THREE.BoxGeometry(1.05, 0.09, 0.06), accent, 0.4, 0.22, 0.13);
      flapB.rotation.z = 0.55;
      add(new THREE.BoxGeometry(1.8, 0.055, 0.05), ink, 0, -0.4, 0.13);
      add(new THREE.BoxGeometry(1.2, 0.05, 0.05), ink, -0.2, -0.6, 0.13);
      add(new THREE.CircleGeometry(0.13, 8), accent, 0.76, 0.4, 0.125);
      break;
    }
    case 'methods': {
      add(new THREE.BoxGeometry(0.62, 0.62, 0.62), ink);
      const arms = [
        { rot: [0, 0, -Math.PI / 2], pos: [0.85, 0, 0] },
        { rot: [0, 0, 0], pos: [0, 0.9, 0] },
        { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.9] },
      ];
      for (let i = 0; i < arms.length; i += 1) {
        const arm = arms[i];
        const shaft = add(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), i === 1 ? cream : accent);
        shaft.rotation.set(...arm.rot);
        shaft.position.set(...arm.pos);
        const tip = add(new THREE.ConeGeometry(0.17, 0.36, 6), i === 2 ? cream : accent);
        const dir = new THREE.Vector3(...arm.pos).normalize();
        tip.position.set(...arm.pos).addScaledVector(dir, 0.28);
        if (i === 0) tip.rotation.z = -Math.PI / 2;
        if (i === 1) tip.rotation.z = 0;
        if (i === 2) tip.rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'status': {
      add(new THREE.BoxGeometry(0.12, 2.0, 0.12), ink, -0.55, 0, 0);
      add(new THREE.BoxGeometry(0.12, 2.0, 0.12), ink, 0.55, 0, 0);
      add(new THREE.BoxGeometry(1.35, 0.12, 0.5), ink, 0, 0.95, 0);
      add(new THREE.BoxGeometry(1.35, 0.12, 0.5), ink, 0, -0.95, 0);
      add(new THREE.SphereGeometry(0.26, 10, 10), glow(0xe4572e), 0, 0.55, 0);
      add(new THREE.SphereGeometry(0.26, 10, 10), glow(0xf2a71b), 0, 0.0, 0);
      add(new THREE.SphereGeometry(0.26, 10, 10), glow(0x2f9e63), 0, -0.55, 0);
      break;
    }
    case 'headers': {
      for (let i = 0; i < 3; i += 1) {
        const slab = add(new THREE.BoxGeometry(2.0, 0.17, 0.95), cream, 0, -0.38 + i * 0.38, 0);
        slab.rotation.y = -0.08 + i * 0.04;
        const tag = add(new THREE.BoxGeometry(0.3, 0.06, 0.97), accent, -0.72, -0.38 + i * 0.38 + 0.06, 0);
        tag.rotation.y = -0.08 + i * 0.04;
      }
      add(new THREE.BoxGeometry(0.05, 0.05, 0.5), ink, 0.35, 0.42, 0.35);
      add(new THREE.BoxGeometry(0.05, 0.05, 0.3), ink, 0.05, 0.42, 0.35);
      break;
    }
    case 'connections': {
      const ringA = add(new THREE.TorusGeometry(0.8, 0.12, 8, 36), accent);
      ringA.rotation.x = Math.PI / 2;
      const ringB = add(new THREE.TorusGeometry(0.8, 0.12, 8, 36), cream);
      ringB.rotation.set(Math.PI / 2, 0, Math.PI / 3);
      const ringC = add(new THREE.TorusGeometry(0.8, 0.12, 8, 36), ink);
      ringC.rotation.set(Math.PI / 2, 0, -Math.PI / 3);
      add(new THREE.SphereGeometry(0.18, 8, 8), glow(0xe4572e));
      break;
    }
    case 'cache': {
      for (let i = 0; i < 3; i += 1) {
        const disc = add(new THREE.CylinderGeometry(0.72, 0.72, 0.38, 12), i === 1 ? accent : cream, 0, -0.42 + i * 0.42, 0);
        disc.castShadow = true;
      }
      add(new THREE.TorusGeometry(0.72, 0.035, 6, 24), ink, 0, 0.0, 0).rotation.x = Math.PI / 2;
      add(new THREE.SphereGeometry(0.14, 8, 8), glow(0x2f9e63), 0.45, 0.55, 0.45);
      break;
    }
    case 'shield':
    default: {
      const shape = new THREE.Shape();
      shape.moveTo(0, 1.15);
      shape.lineTo(0.92, 0.68);
      shape.lineTo(0.76, -0.42);
      shape.lineTo(0, -1.08);
      shape.lineTo(-0.76, -0.42);
      shape.lineTo(-0.92, 0.68);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.06,
        bevelSegments: 1,
      });
      geometry.center();
      add(geometry, accent);
      add(new THREE.OctahedronGeometry(0.22), cream, 0, 0.06, 0.18);
      break;
    }
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Stations                                                                   */
/* -------------------------------------------------------------------------- */

function createStations(scene, colliders) {
  const stations = [];
  const cream = material(0xfffaf0);
  const ink = material(0x242c38, { roughness: 0.65 });

  STATIONS.forEach((data, index) => {
    const angle = THREE.MathUtils.degToRad(data.angle);
    const x = Math.cos(angle) * data.radius;
    const z = Math.sin(angle) * data.radius;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const pad = mesh(new THREE.CircleGeometry(4.45, 48), cream, false);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.028;
    group.add(pad);

    const tint = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 48),
      new THREE.MeshBasicMaterial({
        color: data.accent,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      })
    );
    tint.rotation.x = -Math.PI / 2;
    tint.position.y = 0.033;
    group.add(tint);

    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(4.35, 0.065, 6, 64),
      new THREE.MeshStandardMaterial({
        color: data.accent,
        emissive: data.accent,
        emissiveIntensity: 0.5,
        roughness: 0.5,
      })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.09;
    group.add(edge);

    const pedestal = mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.95, 8), ink);
    pedestal.position.y = 0.47;
    group.add(pedestal);

    const cap = mesh(
      new THREE.CylinderGeometry(1.06, 1.06, 0.12, 8),
      new THREE.MeshStandardMaterial({
        color: data.accent,
        emissive: data.accent,
        emissiveIntensity: 0.3,
        roughness: 0.5,
        flatShading: true,
      })
    );
    cap.position.y = 0.99;
    group.add(cap);

    // Faint light beam to make the station readable from afar
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 3.6, 5.4, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: data.accent,
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    beam.position.y = 2.8;
    group.add(beam);

    const icon = createIcon(data.icon, data.accent);
    icon.scale.setScalar(data.icon === 'methods' ? 1.4 : data.icon === 'mail' ? 1.26 : 1.16);
    icon.position.y = 3.35;
    group.add(icon);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.02, 6, 48),
      new THREE.MeshBasicMaterial({
        color: data.accent,
        transparent: true,
        opacity: 0.4,
      })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 3.0;
    group.add(halo);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(4.55, 40),
      new THREE.MeshBasicMaterial({
        color: data.accent,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.045;
    group.add(glow);

    scene.add(group);
    colliders.push({ x, z, r: 1.2 });

    stations.push({
      ...data,
      index,
      position: new THREE.Vector3(x, 0, z),
      labelPosition: new THREE.Vector3(x, 6.15, z),
      group,
      icon,
      halo,
      beam,
      edge,
      glow,
      baseY: 3.35,
      phase: index * 1.7,
      spin: ['mail', 'headers', 'shield'].includes(data.icon) ? 0 : 0.22,
      visited: false,
      discoveredAt: -1,
    });
  });

  return stations;
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

function createTree(scale = 1) {
  const group = new THREE.Group();
  const trunkMat = material(0x8a6749);
  const foliage = [0x3f7d5c, 0x2f6b52, 0x6a9c6f, 0x84a56b];
  const color = foliage[Math.floor(random() * foliage.length)];
  const leafMat = material(color);

  const trunk = mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.1, 5), trunkMat);
  trunk.position.y = 0.55;
  group.add(trunk);

  const bottom = mesh(new THREE.ConeGeometry(0.85, 1.5, 6), leafMat);
  bottom.position.y = 1.25;
  group.add(bottom);

  const top = mesh(new THREE.ConeGeometry(0.6, 1.25, 6), leafMat);
  top.position.y = 2.0;
  group.add(top);

  group.scale.setScalar(scale);
  group.rotation.y = random() * Math.PI * 2;
  return group;
}

function createCone() {
  const group = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(0.26, 0.68, 8), material(0xe4572e));
  cone.position.y = 0.34;
  group.add(cone);
  const base = mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), material(0xfff4e2));
  base.position.y = 0.03;
  group.add(base);
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.2, 0.1, 8),
    material(0xfff4e2)
  );
  stripe.position.y = 0.36;
  group.add(stripe);
  return group;
}

function createStartLine(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const cells = 10;
  const rows = 3;
  const cellW = canvas.width / cells;
  const cellH = canvas.height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#242c38' : '#fff6e7';
      ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 1.7),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 })
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.035, 16.8);
  line.receiveShadow = true;
  scene.add(line);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i += 1) {
      const cone = createCone();
      cone.position.set(side * (3.9 + i * 0.9), 0, 15.2 + i * 1.8);
      scene.add(cone);
    }
  }
}

function createCloud() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0.94,
  });
  const count = 3 + Math.floor(random() * 3);
  for (let i = 0; i < count; i += 1) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + random() * 1.1, 0), cloudMat);
    puff.position.set((i - count / 2) * 1.6, random() * 0.7, random() * 0.9);
    puff.scale.y = 0.6;
    group.add(puff);
  }
  group.traverse((node) => {
    if (node.isMesh) node.castShadow = false;
  });
  return group;
}

function createDecor(scene, colliders, stations) {
  const isClear = (x, z, margin = 6.2) => {
    if (Math.hypot(x, z - 16) < 8) return false;
    for (const station of stations) {
      if (Math.hypot(x - station.position.x, z - station.position.z) < margin) return false;
    }
    return true;
  };

  const foliagePalette = [0x3f7d5c, 0x2f6b52, 0x6a9c6f, 0x84a56b];
  const grassPalette = [0x7f9959, 0x9aa86a, 0x6d8a4d];
  const flowerColors = [0xfff4e2, 0xe4572e, 0xf2a71b, 0xd94f8a];

  const treeEntries = [];
  const trunkEntries = [];
  const rockEntries = [];
  const bushEntries = [];
  const grassEntries = [];
  const stemEntries = [];
  const flowerHeadEntries = [];
  const stoneEntries = [];

  // Outer tree line. Trees are kept out of the central driving area on purpose.
  for (let i = 0; i < 44; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 34 + random() * 5.5;
    const scale = 0.85 + random() * 0.7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const ry = random() * Math.PI * 2;
    const color = new THREE.Color(foliagePalette[Math.floor(random() * foliagePalette.length)]);

    treeEntries.push({ position: [x, 0, z], scale: [scale, scale, scale], ry, color });
    trunkEntries.push({ position: [x, 0, z], scale: [scale, scale, scale], ry });
    colliders.push({ x, z, r: 0.4 + scale * 0.15 });
  }

  const foliageGeometry = mergeGeometries([
    new THREE.ConeGeometry(0.85, 1.5, 6).translate(0, 1.25, 0),
    new THREE.ConeGeometry(0.6, 1.25, 6).translate(0, 2.0, 0),
  ]);

  scene.add(instances(foliageGeometry, material(0xffffff), treeEntries));
  scene.add(
    instances(
      new THREE.CylinderGeometry(0.11, 0.16, 1.1, 5).translate(0, 0.55, 0),
      material(0x8a6749),
      trunkEntries
    )
  );

  // Rocks
  for (let i = 0; i < 34; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 30 + random() * 10;
    const size = 0.6 + random() * 1.2;
    rockEntries.push({
      position: [Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius],
      scale: [size * (0.8 + random() * 0.6), size * (0.6 + random() * 0.5), size],
      rx: random() * 3,
      ry: random() * 3,
      rz: random() * 3,
      color: new THREE.Color(random() > 0.5 ? 0xc7b193 : 0xb9a184),
    });
  }

  for (let i = 0; i < 8; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 22 + random() * 7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isClear(x, z, 5.6)) continue;
    const size = 0.4 + random() * 0.5;
    rockEntries.push({
      position: [x, 0.14, z],
      scale: [size * (0.8 + random() * 0.6), size * (0.6 + random() * 0.5), size],
      rx: random() * 3,
      ry: random() * 3,
      rz: random() * 3,
      color: new THREE.Color(random() > 0.5 ? 0xc7b193 : 0xb9a184),
    });
  }

  scene.add(
    instances(new THREE.DodecahedronGeometry(0.55, 0), material(0xffffff), rockEntries)
  );

  // Bushes
  for (let i = 0; i < 18; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 32 + random() * 7;
    bushEntries.push({
      position: [Math.cos(angle) * radius, 0.36, Math.sin(angle) * radius],
      scale: [1, 0.7, 1],
      ry: random() * 6,
      color: new THREE.Color(random() > 0.5 ? 0x5f8f63 : 0x4e7f5c),
    });
  }

  scene.add(instances(new THREE.SphereGeometry(0.55, 7, 6), material(0xffffff), bushEntries));

  // Grass and flowers fill the empty sand without blocking sight lines.
  const addGrassTuft = (x, z) => {
    const blades = 3 + Math.floor(random() * 3);
    for (let i = 0; i < blades; i += 1) {
      grassEntries.push({
        position: [x + (random() - 0.5) * 0.22, 0, z + (random() - 0.5) * 0.22],
        scale: [1, 0.34 + random() * 0.24, 1],
        ry: random() * Math.PI,
        rz: (random() - 0.5) * 0.5,
        color: new THREE.Color(grassPalette[Math.floor(random() * grassPalette.length)]),
      });
    }
  };

  const addFlower = (x, z, colorIndex) => {
    stemEntries.push({ position: [x, 0, z], ry: random() * 6 });
    flowerHeadEntries.push({
      position: [x, 0.36, z],
      color: new THREE.Color(flowerColors[colorIndex % flowerColors.length]),
    });
  };

  for (let i = 0; i < 26; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 23 + random() * 16;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isClear(x, z, 5.4)) continue;
    addGrassTuft(x, z);
  }

  for (let i = 0; i < 16; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 24 + random() * 15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isClear(x, z, 5.4)) continue;
    addFlower(x, z, i);
  }

  // A few details around the starting grid so the foreground is not empty.
  const foreground = [
    [5.8, 9.6],
    [-6.9, 8.8],
    [8.9, 20.4],
    [-8.2, 21.2],
    [3.4, 24.6],
    [-11.2, 14.8],
  ];
  foreground.forEach(([x, z], index) => {
    addGrassTuft(x, z);
    if (index % 2 === 0) addFlower(x + 0.35, z + 0.42, index);
  });

  const bladeGeometry = new THREE.ConeGeometry(0.045, 1, 3).translate(0, 0.5, 0);
  scene.add(
    instances(bladeGeometry, material(0xffffff), grassEntries, {
      castShadow: false,
      receiveShadow: false,
    })
  );
  scene.add(
    instances(
      new THREE.CylinderGeometry(0.014, 0.014, 0.34, 3).translate(0, 0.17, 0),
      material(0x6f8a4f),
      stemEntries,
      { castShadow: false, receiveShadow: false }
    )
  );
  scene.add(
    instances(new THREE.IcosahedronGeometry(0.09, 0), material(0xffffff), flowerHeadEntries, {
      castShadow: false,
      receiveShadow: false,
    })
  );

  createStartLine(scene);

  // Boundary stones
  for (let i = 0; i < 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2 + 0.04;
    stoneEntries.push({
      position: [Math.cos(angle) * 40.6, 0.16, Math.sin(angle) * 40.6],
      scale: [1.9, 0.75, 1.2],
      ry: angle,
    });
  }
  scene.add(instances(new THREE.DodecahedronGeometry(0.5, 0), material(0xf3e6d0), stoneEntries));

  // Clouds
  const clouds = [];
  for (let i = 0; i < 8; i += 1) {
    const cloud = createCloud();
    const angle = random() * Math.PI * 2;
    const radius = 30 + random() * 65;
    cloud.position.set(Math.cos(angle) * radius, 9 + random() * 10, Math.sin(angle) * radius);
    cloud.rotation.y = random() * Math.PI;
    scene.add(cloud);
    clouds.push({ group: cloud, speed: 0.25 + random() * 0.5, startX: cloud.position.x });
  }

  // Distant floating islands: depth without stealing the show.
  const islandSpots = [
    [78, 1.5, -64, 5.5],
    [-94, 4, 38, 6],
    [46, 6, -96, 5],
    [-72, -0.5, 90, 5.5],
  ];
  for (const [x, y, z, size] of islandSpots) {
    const group = new THREE.Group();
    const top = mesh(new THREE.CylinderGeometry(size, size * 0.92, 1.6, 18), material(0xe6d6bb));
    top.position.y = 0;
    group.add(top);
    const bottom = mesh(new THREE.ConeGeometry(size * 0.92, size * 1.5, 18), material(0xc4a582));
    bottom.position.y = -size * 0.72;
    bottom.rotation.x = Math.PI;
    group.add(bottom);
    for (let i = 0; i < 3; i += 1) {
      const tree = createTree(1 + random() * 0.4);
      tree.position.set((random() - 0.5) * size, 0.8, (random() - 0.5) * size);
      group.add(tree);
    }
    group.position.set(x, y, z);
    group.scale.setScalar(0.9 + random() * 0.25);
    group.traverse((node) => {
      if (node.isMesh) node.castShadow = false;
    });
    scene.add(group);
  }

  // Floating data bits
  const bits = [];
  for (let i = 0; i < 14; i += 1) {
    const color = [0xe4572e, 0x0f8f86, 0x2f5bea, 0xf2a71b][i % 4];
    const bit = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      })
    );
    const angle = random() * Math.PI * 2;
    const radius = 8 + random() * 26;
    bit.position.set(Math.cos(angle) * radius, 1.2 + random() * 5, Math.sin(angle) * radius);
    scene.add(bit);
    bits.push({ mesh: bit, baseY: bit.position.y, phase: random() * 6, speed: 0.2 + random() * 0.5 });
  }

  return { clouds, bits };
}

/* -------------------------------------------------------------------------- */
/* Data packets                                                               */
/* -------------------------------------------------------------------------- */

function createPackets(scene, stations) {
  const routes = [
    { indices: [0, 2, 4, 6], color: 0xe4572e, lift: 6.6, speed: 0.022 },
    { indices: [1, 3, 5, 7], color: 0x0f8f86, lift: 7.4, speed: 0.018 },
    { indices: [0, 1, 2, 3, 4, 5, 6, 7], color: 0x2f5bea, lift: 9.2, speed: 0.012 },
  ];

  const packets = [];

  routes.forEach((route, routeIndex) => {
    const points = [];
    for (let i = 0; i < route.indices.length; i += 1) {
      const a = stations[route.indices[i]];
      const b = stations[route.indices[(i + 1) % route.indices.length]];
      points.push(new THREE.Vector3(a.position.x, 2.9, a.position.z));
      points.push(
        new THREE.Vector3(
          (a.position.x + b.position.x) / 2,
          route.lift + Math.sin(i + routeIndex) * 0.8,
          (a.position.z + b.position.z) / 2
        )
      );
    }

    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.4);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(160)),
      new THREE.LineBasicMaterial({
        color: route.color,
        transparent: true,
        opacity: 0.15,
      })
    );
    scene.add(line);

    const count = routeIndex === 2 ? 7 : 4;
    for (let i = 0; i < count; i += 1) {
      const packet = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshBasicMaterial({ color: route.color })
      );
      scene.add(packet);
      packets.push({
        mesh: packet,
        curve,
        offset: i / count + routeIndex * 0.13,
        speed: route.speed,
        color: route.color,
        phase: i * 1.4,
      });
    }
  });

  return packets;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function createWorld(scene) {
  scene.fog = new THREE.Fog(0xecd9bc, 72, 175);

  const hemisphere = new THREE.HemisphereLight(0xfff3e0, 0xc0a582, 1.2);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.9);
  sun.position.set(28, 38, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -52;
  sun.shadow.camera.right = 52;
  sun.shadow.camera.top = 52;
  sun.shadow.camera.bottom = -52;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xffd9b0, 0.3);
  fill.position.set(-24, 14, -20);
  scene.add(fill);

  createSky(scene);
  createIsland(scene);
  createRoads(scene);

  const colliders = [];
  const server = createServer(scene, colliders);
  const stations = createStations(scene, colliders);
  const { clouds, bits } = createDecor(scene, colliders, stations);
  const packets = createPackets(scene, stations);

  const update = (dt, elapsed) => {
    // Station icons: bob, spin, pulse
    for (const station of stations) {
      station.icon.position.y = station.baseY + Math.sin(elapsed * 1.1 + station.phase) * 0.12;
      if (station.spin > 0) {
        station.icon.rotation.y += dt * station.spin;
      } else {
        station.icon.rotation.y = Math.sin(elapsed * 0.55 + station.phase) * 0.42;
      }
      const pulse = 1 + Math.sin(elapsed * 1.6 + station.phase) * 0.02;
      station.halo.scale.setScalar(pulse);
      station.halo.rotation.z += dt * 0.12;
      station.beam.material.opacity = 0.03 + Math.sin(elapsed * 1.2 + station.phase) * 0.012;
    }

    // Origin server
    server.rings.forEach((ring, index) => {
      ring.rotation.z += dt * (0.16 + index * 0.08);
      ring.rotation.y = Math.sin(elapsed * 0.25 + index) * 0.25;
    });
    server.orbiters.forEach((cube, index) => {
      const angle = elapsed * 0.3 + (index / server.orbiters.length) * Math.PI * 2;
      cube.position.set(Math.cos(angle) * 4.2, 2.4 + Math.sin(elapsed + index) * 0.25, Math.sin(angle) * 4.2);
      cube.rotation.x += dt * 0.8;
      cube.rotation.y += dt * 0.6;
    });

    // Packets on their routes
    for (const packet of packets) {
      const t = (elapsed * packet.speed + packet.offset) % 1;
      const point = packet.curve.getPointAt(t);
      packet.mesh.position.copy(point);
      packet.mesh.position.y += Math.sin(elapsed * 2 + packet.phase) * 0.12;
      packet.mesh.rotation.x += dt * 1.2;
      packet.mesh.rotation.y += dt * 0.9;
    }

    // Floating bits
    for (const bit of bits) {
      bit.mesh.position.y = bit.baseY + Math.sin(elapsed * bit.speed + bit.phase) * 0.4;
      bit.mesh.rotation.x += dt * 0.4;
      bit.mesh.rotation.y += dt * 0.3;
    }

    // Clouds drift and wrap
    for (const cloud of clouds) {
      cloud.group.position.x += cloud.speed * dt;
      if (cloud.group.position.x > 100) cloud.group.position.x = -100;
    }
  };

  return {
    stations,
    colliders,
    update,
    islandRadius: 42,
  };
}
