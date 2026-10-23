import * as THREE from 'three';
import { TOTAL_CONCEPTS } from './content.js';

const clamp = THREE.MathUtils.clamp;

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export class UI {
  constructor({
    stations,
    onStart,
    onTravel,
    onSoundToggle,
    onPanelClose,
  }) {
    this.stations = stations;
    this.onStart = onStart;
    this.onTravel = onTravel;
    this.onSoundToggle = onSoundToggle;
    this.onPanelClose = onPanelClose;

    this.current = null;
    this.indexOpen = false;
    this.started = false;
    this.visited = new Set();
    this.labelElements = new Map();
    this.toastTimer = null;
    this.tmpVector = new THREE.Vector3();

    this.dom = {
      intro: document.querySelector('#intro'),
      labels: document.querySelector('#labels'),
      panel: document.querySelector('#panel'),
      panelBody: document.querySelector('#panel-body'),
      panelNum: document.querySelector('#panel-num'),
      panelTag: document.querySelector('#panel-tag'),
      panelLink: document.querySelector('#panel-link'),
      panelClose: document.querySelector('#panel-close'),
      panelPrev: document.querySelector('#panel-prev'),
      panelNext: document.querySelector('#panel-next'),
      progressCount: document.querySelector('#progress-count'),
      progressFill: document.querySelector('#progress-fill'),
      progressCard: document.querySelector('#progress-card'),
      indexModal: document.querySelector('#index-modal'),
      indexGrid: document.querySelector('#index-grid'),
      indexBtn: document.querySelector('#index-btn'),
      indexClose: document.querySelector('#index-close'),
      nearHint: document.querySelector('#near-hint'),
      nearText: document.querySelector('#near-text'),
      toast: document.querySelector('#toast'),
      flash: document.querySelector('#flash'),
      soundBtn: document.querySelector('#sound-btn'),
      minimap: document.querySelector('#minimap'),
      startBtn: document.querySelector('#start-btn'),
      introIndex: document.querySelector('#intro-index'),
      brand: document.querySelector('#brand'),
    };

    this.minimap = this.dom.minimap.getContext('2d');
    this.#setupMinimap();
    this.#buildLabels();
    this.#buildIndex();
    this.#bindEvents();
    this.updateProgress();
  }

  /* ---------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* ---------------------------------------------------------------------- */

  #setupMinimap() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 148;
    this.minimapSize = size;
    this.dom.minimap.width = size * dpr;
    this.dom.minimap.height = size * dpr;
    this.minimap.scale(dpr, dpr);
  }

  #buildLabels() {
    for (const station of this.stations) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'station-label';
      button.dataset.id = station.id;
      button.style.setProperty('--accent', station.accent);
      button.innerHTML = `
        <span class="station-num">${station.n}</span>
        <span class="station-text">
          <strong>${station.name}</strong>
          <small>${station.tag}</small>
        </span>
        <span class="station-check" aria-hidden="true">✓</span>
      `;
      button.setAttribute('aria-label', `Ir a ${station.name}`);
      button.addEventListener('click', () => this.onTravel(station));
      this.dom.labels.appendChild(button);
      this.labelElements.set(station.id, button);
    }
  }

  #buildIndex() {
    this.dom.indexGrid.innerHTML = '';
    for (const station of this.stations) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'index-item';
      item.dataset.id = station.id;
      item.style.setProperty('--accent', station.accent);
      item.innerHTML = `
        <span class="index-item-num">${station.n}</span>
        <span class="index-item-copy">
          <strong>${station.name}</strong>
          <small>${station.tag}</small>
        </span>
        <span class="index-item-arrow" aria-hidden="true">→</span>
      `;
      item.addEventListener('click', () => {
        this.closeIndex();
        this.onTravel(station);
      });
      this.dom.indexGrid.appendChild(item);
    }
  }

  #bindEvents() {
    this.dom.startBtn.addEventListener('click', () => this.onStart(false));
    this.dom.introIndex.addEventListener('click', () => this.onStart(true));
    this.dom.panelClose.addEventListener('click', () => this.closePanel());
    this.dom.panelPrev.addEventListener('click', () => this.#navigate(-1));
    this.dom.panelNext.addEventListener('click', () => this.#navigate(1));
    this.dom.indexBtn.addEventListener('click', () => this.openIndex());
    this.dom.brand.addEventListener('click', () => this.openIndex());
    this.dom.progressCard.addEventListener('click', () => this.openIndex());
    this.dom.progressCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openIndex();
      }
    });
    this.dom.progressCard.style.cursor = 'pointer';
    this.dom.indexClose.addEventListener('click', () => this.closeIndex());
    this.dom.indexModal.addEventListener('click', (event) => {
      if (event.target.matches('[data-close-index]')) this.closeIndex();
    });
    this.dom.soundBtn.addEventListener('click', () => this.onSoundToggle());

    this.dom.panelBody.addEventListener('click', (event) => {
      const button = event.target.closest('.copy-btn');
      if (!button || !this.current) return;
      const code = this.current.code.join('\n');
      navigator.clipboard?.writeText(code).catch(() => {});
      button.textContent = 'Copiado ✓';
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = 'Copiar';
      }, 1600);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Intro / start                                                          */
  /* ---------------------------------------------------------------------- */

  start() {
    if (this.started) return;
    this.started = true;
    this.dom.intro.classList.add('is-hidden');
    this.dom.intro.setAttribute('aria-hidden', 'true');
    document.body.classList.add('is-exploring');
    window.setTimeout(() => {
      this.dom.intro.style.display = 'none';
    }, 750);
  }

  setSoundState(enabled) {
    this.dom.soundBtn.classList.toggle('is-muted', !enabled);
    this.dom.soundBtn.setAttribute('aria-pressed', String(enabled));
    this.dom.soundBtn.setAttribute('aria-label', enabled ? 'Silenciar sonido' : 'Activar sonido');
  }

  /* ---------------------------------------------------------------------- */
  /* Station labels                                                         */
  /* ---------------------------------------------------------------------- */

  updateLabels(camera, car, active) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const hide = (element) => {
      element.classList.remove('is-visible', 'is-near');
      element.style.opacity = '0';
    };

    const candidates = [];

    for (const station of this.stations) {
      const element = this.labelElements.get(station.id);
      if (!element) continue;

      if (!active || this.current) {
        hide(element);
        continue;
      }

      const carDistance = Math.hypot(
        car.position.x - station.position.x,
        car.position.z - station.position.z
      );

      if (carDistance > 46) {
        hide(element);
        continue;
      }

      // Skip stations whose label sits directly behind the origin server.
      const cameraToStationX = station.position.x - camera.position.x;
      const cameraToStationZ = station.position.z - camera.position.z;
      const segmentLengthSq =
        cameraToStationX * cameraToStationX + cameraToStationZ * cameraToStationZ;
      const t =
        segmentLengthSq === 0
          ? 0
          : (-camera.position.x * cameraToStationX -
              camera.position.z * cameraToStationZ) /
            segmentLengthSq;
      if (t > 0.08 && t < 0.98) {
        const closestX = camera.position.x + cameraToStationX * t;
        const closestZ = camera.position.z + cameraToStationZ * t;
        if (Math.hypot(closestX, closestZ) < 4.3) {
          hide(element);
          continue;
        }
      }

      const distance = camera.position.distanceTo(station.labelPosition);
      const projected = this.tmpVector.copy(station.labelPosition).project(camera);
      const behind = projected.z > 1;
      const offscreen =
        projected.x < -1.05 ||
        projected.x > 1.05 ||
        projected.y < -1.08 ||
        projected.y > 1.08;

      if (behind || offscreen || distance > 58) {
        hide(element);
        continue;
      }

      candidates.push({
        station,
        element,
        carDistance,
        distance,
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
      });
    }

    // Only the closest stations get a floating label: it keeps the horizon
    // readable and makes driving feel like discovering the map.
    candidates.sort((a, b) => a.carDistance - b.carDistance);
    const visible = new Set(candidates.slice(0, 4).map((entry) => entry.station.id));

    for (const station of this.stations) {
      if (!visible.has(station.id)) {
        hide(this.labelElements.get(station.id));
      }
    }

    for (const entry of candidates) {
      if (!visible.has(entry.station.id)) continue;
      const opacity = clamp((58 - entry.distance) / 16, 0, 1);

      entry.element.style.transform = `translate3d(${entry.x}px, ${entry.y}px, 0) translate(-50%, -100%)`;
      entry.element.style.opacity = opacity.toFixed(3);
      entry.element.classList.add('is-visible');
      entry.element.classList.toggle('is-near', entry.carDistance < 7);
      entry.element.classList.toggle('is-visited', entry.station.visited);
    }
  }

  setNear(station) {
    if (!station || this.current) {
      this.dom.nearHint.classList.remove('is-visible');
      return;
    }
    const text = `Leer “${station.name}”`;
    if (this.dom.nearText.textContent !== text) {
      this.dom.nearText.textContent = text;
    }
    this.dom.nearHint.classList.add('is-visible');
  }

  /* ---------------------------------------------------------------------- */
  /* Panel                                                                  */
  /* ---------------------------------------------------------------------- */

  openStation(station, { markVisited = true } = {}) {
    this.current = station;
    const total = String(TOTAL_CONCEPTS).padStart(2, '0');

    this.dom.panel.style.setProperty('--accent', station.accent);
    this.dom.panelNum.textContent = station.n;
    this.dom.panelTag.textContent = station.tag;
    this.dom.panelLink.href = station.mdn.url;
    this.dom.panelLink.innerHTML = `Leer en MDN: ${station.mdn.label} <span aria-hidden="true">↗</span>`;

    const points = station.points
      .map(
        (point) => `
          <li>
            <span class="point-term">${point.term}</span>
            <p>${point.text}</p>
          </li>
        `
      )
      .join('');

    const code = station.code
      .map((line) => {
        const className = line.startsWith('HTTP/')
          ? 'code-line is-accent'
          : line.trim() === ''
            ? 'code-line is-muted'
            : 'code-line';
        return `<span class="${className}">${escapeHtml(line) || ' '}</span>`;
      })
      .join('');

    this.dom.panelBody.innerHTML = `
      <div class="panel-hero">
        <span class="panel-index">${station.n} / ${total}</span>
        <h2>${station.name}</h2>
        <p class="panel-headline">${station.headline}</p>
      </div>
      <div class="panel-text">
        <p>${station.summary}</p>
      </div>
      <div class="panel-section-label">Puntos clave</div>
      <ul class="point-list">${points}</ul>
      <div class="callout">
        <span class="callout-label">Ojo con esto</span>
        <p>${station.note}</p>
      </div>
      <div class="panel-section-label">En una petición real</div>
      <div class="code-card">
        <div class="code-head">
          <span>${station.codeLabel}</span>
          <button class="copy-btn" type="button">Copiar</button>
        </div>
        <pre><code>${code}</code></pre>
      </div>
    `;

    this.dom.panelBody.scrollTop = 0;
    window.clearTimeout(this.panelHideTimer);
    this.dom.panel.style.display = 'flex';
    void this.dom.panel.offsetWidth;
    this.dom.panel.classList.add('is-open');
    this.dom.panel.setAttribute('aria-hidden', 'false');
    this.dom.nearHint.classList.remove('is-visible');
    document.body.classList.add('is-reading');

    if (markVisited && !station.visited) {
      station.visited = true;
      station.discoveredAt = performance.now();
      this.visited.add(station.id);
      this.updateProgress();
      this.toast(`Concepto ${station.n} descubierto · ${this.visited.size} de ${TOTAL_CONCEPTS}`);
    } else {
      this.updateProgress();
    }
  }

  closePanel() {
    if (!this.current) return;
    this.dom.panel.classList.remove('is-open');
    this.dom.panel.setAttribute('aria-hidden', 'true');
    this.current = null;
    if (!this.indexOpen) document.body.classList.remove('is-reading');

    window.clearTimeout(this.panelHideTimer);
    this.panelHideTimer = window.setTimeout(() => {
      if (!this.current) this.dom.panel.style.display = 'none';
    }, 420);

    this.onPanelClose?.();
  }

  get panelOpen() {
    return Boolean(this.current);
  }

  get blocked() {
    return Boolean(this.current) || this.indexOpen;
  }

  #navigate(direction) {
    if (!this.current) return;
    const index = this.stations.indexOf(this.current);
    const next = (index + direction + this.stations.length) % this.stations.length;
    this.openStation(this.stations[next]);
  }

  /* ---------------------------------------------------------------------- */
  /* Index                                                                  */
  /* ---------------------------------------------------------------------- */

  openIndex() {
    this.indexOpen = true;
    document.body.classList.add('is-reading');
    window.clearTimeout(this.indexHideTimer);
    this.dom.indexModal.style.display = 'grid';
    void this.dom.indexModal.offsetWidth;
    this.dom.indexModal.classList.add('is-open');
    this.dom.indexModal.setAttribute('aria-hidden', 'false');
    this.#refreshIndex();
  }

  closeIndex() {
    this.indexOpen = false;
    this.dom.indexModal.classList.remove('is-open');
    this.dom.indexModal.setAttribute('aria-hidden', 'true');
    if (!this.current) document.body.classList.remove('is-reading');

    window.clearTimeout(this.indexHideTimer);
    this.indexHideTimer = window.setTimeout(() => {
      if (!this.indexOpen) this.dom.indexModal.style.display = 'none';
    }, 320);
  }

  #refreshIndex() {
    for (const station of this.stations) {
      const item = this.dom.indexGrid.querySelector(`[data-id="${station.id}"]`);
      if (item) item.classList.toggle('is-visited', station.visited);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Progress, toast, minimap                                               */
  /* ---------------------------------------------------------------------- */

  updateProgress() {
    const total = TOTAL_CONCEPTS;
    const count = this.stations.filter((station) => station.visited).length;
    this.dom.progressCount.textContent = `${count} / ${total}`;
    this.dom.progressFill.style.width = `${(count / total) * 100}%`;
    this.#refreshIndex();
  }

  toast(message) {
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add('is-visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.dom.toast.classList.remove('is-visible');
    }, 3400);
  }

  flash() {
    this.dom.flash.classList.remove('is-active');
    void this.dom.flash.offsetWidth;
    this.dom.flash.classList.add('is-active');
  }

  drawMinimap(car) {
    const ctx = this.minimap;
    const size = this.minimapSize;
    const cx = size / 2;
    const cy = size / 2;
    const scale = (size / 2 - 12) / 42;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#f8efdf';
    ctx.fillRect(0, 0, size, size);

    // Island
    ctx.beginPath();
    ctx.arc(cx, cy, 42 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#eadcc4';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(28, 36, 48, 0.18)';
    ctx.stroke();

    // Ring road
    ctx.beginPath();
    ctx.arc(cx, cy, 21.1 * scale, 0, Math.PI * 2);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#d2bea0';
    ctx.stroke();

    // Central server
    ctx.fillStyle = '#242c38';
    ctx.fillRect(cx - 4, cy - 4, 8, 8);
    ctx.fillStyle = '#e4572e';
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

    // Stations
    for (const station of this.stations) {
      const x = cx + station.position.x * scale;
      const y = cy + station.position.z * scale;
      ctx.beginPath();
      ctx.arc(x, y, station.visited ? 4.2 : 3.4, 0, Math.PI * 2);
      if (station.visited) {
        ctx.fillStyle = station.accent;
        ctx.fill();
      } else {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = station.accent;
        ctx.stroke();
      }
    }

    // Car
    const carX = cx + car.position.x * scale;
    const carY = cy + car.position.z * scale;
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(Math.PI - car.heading);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = '#1c2430';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#fffaf1';
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Compass
    ctx.fillStyle = 'rgba(28, 36, 48, 0.5)';
    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 12);
  }
}
