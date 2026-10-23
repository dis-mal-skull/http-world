import './style.css';
import * as THREE from 'three';
import { createWorld } from './world.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { AudioEngine } from './audio.js';
import { STATIONS, TOTAL_CONCEPTS } from './content.js';

const START_POSITION = new THREE.Vector3(0, 0, 13.5);
const START_HEADING = Math.PI;
const clamp = THREE.MathUtils.clamp;

const app = document.querySelector('#app');
const canvas = document.querySelector('#scene');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
} catch (error) {
  app.innerHTML = `
    <div class="noscript">
      <p>Este mundo 3D necesita WebGL.<br />Prueba con otro navegador o activa la aceleración por hardware.</p>
    </div>
  `;
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xefe0c8);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  320
);
camera.position.set(0, 6, 26);

function updateCameraLens() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.fov = aspect < 0.8 ? 66 : aspect < 1.15 ? 59 : 55;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

updateCameraLens();

const world = createWorld(scene);
const car = new Car(scene);
car.reset(START_POSITION.clone(), START_HEADING);

const audio = new AudioEngine();
let soundEnabled = false;

const keys = new Set();
let started = false;
let celebrated = false;
let nearestStation = null;
let travelTimer = null;

let orbitYaw = 0;
let orbitPitch = 0;
let zoom = 10;
let dragging = false;
let lastPointer = { x: 0, y: 0 };

const lookTarget = new THREE.Vector3();

const touch = {
  active: false,
  throttle: 0,
  steer: 0,
  boost: false,
};

const ui = new UI({
  stations: world.stations,
  onStart: (withIndex) => start(withIndex),
  onTravel: (station) => travelTo(station),
  onSoundToggle: () => toggleSound(),
});

/* -------------------------------------------------------------------------- */
/* Camera                                                                     */
/* -------------------------------------------------------------------------- */

function snapCamera() {
  const angle = car.heading + Math.PI;
  camera.position.set(
    car.position.x + Math.sin(angle) * zoom,
    4.7,
    car.position.z + Math.cos(angle) * zoom
  );
  lookTarget.set(car.position.x, 1.15, car.position.z).addScaledVector(car.forward, 2.4);
  camera.lookAt(lookTarget);
}

function updateChaseCamera(dt) {
  const angle = car.heading + Math.PI + orbitYaw;
  const height = Math.max(2.4, 4.7 + orbitPitch * 5.2);
  const desired = new THREE.Vector3(
    car.position.x + Math.sin(angle) * zoom,
    height,
    car.position.z + Math.cos(angle) * zoom
  );

  camera.position.lerp(desired, 1 - Math.exp(-dt * 3.6));

  const forward = car.forward;
  const target = new THREE.Vector3(
    car.position.x + forward.x * 2.6,
    1.15,
    car.position.z + forward.z * 2.6
  );
  lookTarget.lerp(target, 1 - Math.exp(-dt * 6));
  camera.lookAt(lookTarget);

  // Recenter slowly while driving so the camera ends up behind the car again.
  if (!dragging && Math.abs(car.speed) > 3) {
    orbitYaw *= Math.exp(-dt * 0.8);
    orbitPitch *= Math.exp(-dt * 0.35);
  }
}

/* -------------------------------------------------------------------------- */
/* Interaction                                                                */
/* -------------------------------------------------------------------------- */

function start(withIndex = false) {
  if (started) return;
  started = true;

  ui.start();
  soundEnabled = true;
  audio.setEnabled(true);
  ui.setSoundState(true);

  car.reset(START_POSITION.clone(), START_HEADING);
  orbitYaw = 0;
  orbitPitch = 0;
  zoom = window.innerHeight > window.innerWidth ? 11.5 : 10;
  snapCamera();

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  ui.toast(
    coarsePointer
      ? 'Joystick para conducir · toca una estación para leerla'
      : 'W A S D para conducir · E para leer una estación'
  );

  if (withIndex) {
    window.setTimeout(() => ui.openIndex(), 380);
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  audio.setEnabled(soundEnabled);
  ui.setSoundState(soundEnabled);
}

function openStation(station) {
  if (!station) return;
  car.speed = 0;
  ui.openStation(station);
  audio.blip(720, 0.22, 0.045);

  if (!celebrated && ui.visited.size === TOTAL_CONCEPTS) {
    celebrated = true;
    window.setTimeout(() => {
      ui.toast('Red completa: 8 de 8 conceptos descubiertos');
      audio.blip(980, 0.4, 0.05);
    }, 900);
  }
}

function travelTo(station) {
  if (!started) start(false);

  window.clearTimeout(travelTimer);

  const distance = Math.hypot(
    car.position.x - station.position.x,
    car.position.z - station.position.z
  );

  if (distance < 8) {
    openStation(station);
    return;
  }

  const outward = station.position.clone().normalize();
  const drop = station.position.clone().addScaledVector(outward, -6.6);
  const heading = Math.atan2(station.position.x - drop.x, station.position.z - drop.z);

  car.reset(drop, heading);
  orbitYaw = 0;
  orbitPitch = 0;
  snapCamera();
  ui.flash();
  ui.toast(`Viajando a ${station.name}`);

  window.clearTimeout(travelTimer);
  travelTimer = window.setTimeout(() => openStation(station), 520);
}

function resetCar() {
  car.reset(START_POSITION.clone(), START_HEADING);
  orbitYaw = 0;
  orbitPitch = 0;
  snapCamera();
  ui.toast('De vuelta al punto de partida');
}

/* Keyboard */
window.addEventListener('keydown', (event) => {
  const code = event.code;

  if (started && (code === 'Tab' || code === 'Escape')) {
    if (code === 'Tab') {
      event.preventDefault();
      if (ui.indexOpen) ui.closeIndex();
      else ui.openIndex();
      return;
    }

    if (ui.indexOpen) {
      ui.closeIndex();
      return;
    }

    if (ui.panelOpen) {
      ui.closePanel();
      return;
    }
  }

  if (!started) return;

  if (code === 'KeyM') {
    toggleSound();
    return;
  }

  if (ui.blocked) return;

  if (code === 'KeyR') {
    event.preventDefault();
    resetCar();
    return;
  }

  if (code === 'KeyE') {
    if (nearestStation) openStation(nearestStation);
    return;
  }

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)
  ) {
    event.preventDefault();
  }

  keys.add(code);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('blur', () => {
  keys.clear();
  touch.active = false;
  touch.throttle = 0;
  touch.steer = 0;
  touch.boost = false;
});

/* Pointer orbit */
canvas.addEventListener('pointerdown', (event) => {
  if (ui.blocked) return;
  dragging = true;
  lastPointer = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  lastPointer = { x: event.clientX, y: event.clientY };
  orbitYaw -= dx * 0.005;
  orbitPitch = clamp(orbitPitch - dy * 0.0035, -0.35, 0.85);
});

const endDrag = (event) => {
  dragging = false;
  if (canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener(
  'wheel',
  (event) => {
    if (ui.blocked) return;
    event.preventDefault();
    zoom = clamp(zoom + event.deltaY * 0.012, 6.5, 15);
  },
  { passive: false }
);

/* Touch joystick */
const joystick = document.querySelector('#joystick');
const joystickKnob = document.querySelector('#joystick-knob');
const boostButton = document.querySelector('#boost-btn');
let joystickPointer = null;

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const maxRadius = rect.width * 0.34;
  const length = Math.hypot(dx, dy);

  if (length > maxRadius) {
    dx = (dx / length) * maxRadius;
    dy = (dy / length) * maxRadius;
  }

  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  touch.active = true;
  touch.steer = clamp(dx / maxRadius, -1, 1);
  touch.throttle = clamp(-dy / maxRadius, -1, 1);
}

if (joystick) {
  joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joystickPointer) return;
    updateJoystick(event);
  });

  const releaseJoystick = (event) => {
    if (event.pointerId !== joystickPointer) return;
    joystickPointer = null;
    touch.active = false;
    touch.throttle = 0;
    touch.steer = 0;
    joystickKnob.style.transform = 'translate(0px, 0px)';
  };

  joystick.addEventListener('pointerup', releaseJoystick);
  joystick.addEventListener('pointercancel', releaseJoystick);
  joystick.addEventListener('lostpointercapture', releaseJoystick);
}

if (boostButton) {
  boostButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touch.boost = true;
  });
  const releaseBoost = () => {
    touch.boost = false;
  };
  boostButton.addEventListener('pointerup', releaseBoost);
  boostButton.addEventListener('pointercancel', releaseBoost);
  boostButton.addEventListener('pointerleave', releaseBoost);
}

/* -------------------------------------------------------------------------- */
/* Frame                                                                      */
/* -------------------------------------------------------------------------- */

function readInput() {
  let throttle = 0;
  let steer = 0;

  if (keys.has('KeyW') || keys.has('ArrowUp')) throttle += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) throttle -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) steer += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) steer -= 1;

  if (touch.active) {
    throttle = touch.throttle;
    steer = touch.steer;
  }

  return {
    throttle,
    steer,
    brake: keys.has('Space'),
    boost:
      keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.boost,
  };
}

function updateNearbyStations() {
  if (!started) return;

  let nearest = null;
  let best = Infinity;

  for (const station of world.stations) {
    const distance = Math.hypot(
      car.position.x - station.position.x,
      car.position.z - station.position.z
    );
    if (distance < best) {
      best = distance;
      nearest = station;
    }
  }

  nearestStation = best < 7 ? nearest : null;

  if (ui.blocked) {
    ui.setNear(null);
    return;
  }

  ui.setNear(nearestStation);

  if (best < 5.2 && nearest && !nearest.visited) {
    openStation(nearest);
  }
}

function updateIntroCamera(elapsed) {
  const angle = elapsed * 0.055 + 0.7;
  const target = new THREE.Vector3(0, 1.1, START_POSITION.z);
  camera.position.set(
    target.x + Math.sin(angle) * 12,
    5.4 + Math.sin(elapsed * 0.2) * 0.35,
    target.z + Math.cos(angle) * 12
  );
  camera.lookAt(target);
}

let lastFrameTime = null;

function animate(now) {
  requestAnimationFrame(animate);

  const dt =
    lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  const elapsed = now / 1000;

  if (!started) {
    updateIntroCamera(elapsed);
  } else if (!ui.blocked) {
    const input = readInput();
    car.update(dt, input, world.colliders);
    updateChaseCamera(dt);
    updateNearbyStations();
  } else {
    car.update(dt, { throttle: 0, steer: 0, brake: true, boost: false }, world.colliders);
  }

  world.update(dt, elapsed);
  ui.updateLabels(camera, car, started && !ui.blocked);
  ui.drawMinimap(car);
  audio.update(car.speedRatio, Boolean(car.boosting));

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  updateCameraLens();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

// Boot
ui.setSoundState(false);
snapCamera();
camera.position.set(0, 5.4, 25.5);
camera.lookAt(0, 1.1, START_POSITION.z);

// Exposed for debugging and for curious students who want to poke around.
window.__httpWorld = { renderer, scene, camera, car, world, ui, audio };

requestAnimationFrame(animate);
