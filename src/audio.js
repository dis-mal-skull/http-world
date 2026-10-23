/**
 * Tiny procedural soundscape: a filtered engine, a soft pad, and UI blips.
 * No audio files, everything is synthesized with the Web Audio API.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.oscillators = [];
    this.started = false;
    this.enabled = false;
    this.volume = 0.55;
  }

  #ensureContext() {
    if (this.ctx) return true;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;

    this.ctx = new Context();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(this.ctx.destination);
    return true;
  }

  start() {
    if (!this.#ensureContext() || this.started) {
      this.#resume();
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Engine: two detuned saws through a low-pass filter
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineFilter.Q.value = 2.2;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0001;

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);

    const engineOne = ctx.createOscillator();
    engineOne.type = 'sawtooth';
    engineOne.frequency.value = 44;

    const engineTwo = ctx.createOscillator();
    engineTwo.type = 'square';
    engineTwo.frequency.value = 88;
    engineTwo.detune.value = 6;

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 22;

    engineOne.connect(this.engineFilter);
    engineTwo.connect(this.engineFilter);
    sub.connect(this.engineGain);

    engineOne.start(now);
    engineTwo.start(now);
    sub.start(now);
    this.oscillators.push(engineOne, engineTwo, sub);
    this.sub = sub;

    // Soft ambient pad, barely audible
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 500;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.012;
    padFilter.connect(padGain);
    padGain.connect(this.master);

    for (const frequency of [110, 164.81, 220]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(padFilter);
      osc.start(now);
      this.oscillators.push(osc);
    }

    this.started = true;
    this.#resume();
  }

  #resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.start();
      this.#resume();
    }
    if (!this.ctx || !this.master) return;

    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(enabled ? this.volume : 0, now, 0.08);
  }

  update(speedRatio, boosting) {
    if (!this.started || !this.ctx) return;
    const now = this.ctx.currentTime;
    const ratio = Math.min(speedRatio, 1.4);

    const engineFrequency = 42 + ratio * 62 + (boosting ? 12 : 0);
    this.oscillators[0]?.frequency.setTargetAtTime(engineFrequency, now, 0.09);
    this.oscillators[1]?.frequency.setTargetAtTime(engineFrequency * 2.01, now, 0.09);
    this.sub?.frequency.setTargetAtTime(engineFrequency * 0.5, now, 0.12);

    this.engineFilter?.frequency.setTargetAtTime(240 + ratio * 620, now, 0.1);
    this.engineGain?.gain.setTargetAtTime(0.012 + ratio * 0.05, now, 0.12);
  }

  blip(frequency = 720, duration = 0.18, gain = 0.05) {
    if (!this.#ensureContext() || !this.enabled) return;
    this.#resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration * 0.6);

    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
