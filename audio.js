// Leica M11 Mechanical Audio Engine (Web Audio API Synthesizer)
// Provides authentic mechanical haptic clicks, bayonet mount latching, winding ratchet gears,
// and focal-plane shutter snaps without external audio files.

class MechanicalAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.lastSoundTime = 0;
    this.lastTickTime = 0;
    this.lastRatchetTime = 0;
  }

  // Initialize or resume the Web Audio context on user gesture
  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        return this.ctx.resume().then(() => {
          return this.ctx.state;
        }).catch(() => {
          return 'suspended';
        });
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
    return Promise.resolve(this.ctx ? this.ctx.state : 'unsupported');
  }

  // Check if Web Audio API is actively running and ready to emit sound
  get isUnlocked() {
    return !!(this.ctx && this.ctx.state === 'running');
  }

  // Explicit unlock method designed to be invoked directly inside user gesture handlers
  unlock(callback) {
    return this.init().then((state) => {
      if (this.isUnlocked && typeof callback === 'function') {
        try {
          callback();
        } catch (e) {}
      }
      return this.isUnlocked;
    });
  }

  // Get current audio destination (Master Gain or AudioContext destination)
  get destination() {
    return this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  // Subtle mechanical dial click triggered on scroll detents (ball-bearing detents)
  playTick(pitchRatio = 1.0) {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastSoundTime < 35) return; // Throttle to prevent audio pile-up and clashes on rapid scroll
    this.lastSoundTime = now;
    this.lastTickTime = now;

    try {
      this.init();
      if (!this.ctx || this.ctx.state === 'closed' || !this.destination) return;

      const safePitch = (typeof pitchRatio === 'number' && isFinite(pitchRatio) && pitchRatio > 0.05) ? Math.min(pitchRatio, 5.0) : 1.0;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 * safePitch, t);
      osc.frequency.exponentialRampToValueAtTime(800 * safePitch, t + 0.015);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800 * safePitch, t);
      filter.Q.setValueAtTime(4.0, t);

      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {}
      };

      osc.start(t);
      osc.stop(t + 0.025);
    } catch (e) {}
  }

  // Dual metallic snap when components dock into place on reassembly
  playSnap() {
    if (this.isMuted) return;
    this.lastSoundTime = performance.now() + 65; // Protect 85ms docking snap from detent clash

    try {
      this.init();
      if (!this.ctx || this.ctx.state === 'closed' || !this.destination) return;

      const t = this.ctx.currentTime;

      // 1. Primary impact impulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {}
      };

      osc.start(t);
      osc.stop(t + 0.055);

      // 2. Secondary micro latch lock snap (at t + 12ms)
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1600, t + 0.012);
      osc2.frequency.exponentialRampToValueAtTime(250, t + 0.035);
      g2.gain.setValueAtTime(0, t);
      g2.gain.setValueAtTime(0.05, t + 0.012);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc2.connect(g2);
      g2.connect(this.destination);
      osc2.onended = () => {
        try {
          osc2.disconnect();
          g2.disconnect();
        } catch (e) {}
      };
      osc2.start(t + 0.012);
      osc2.stop(t + 0.045);

      // 3. Subtle metallic body resonance
      const resOsc = this.ctx.createOscillator();
      const resGain = this.ctx.createGain();
      resOsc.type = 'sine';
      resOsc.frequency.setValueAtTime(3200, t);
      resGain.gain.setValueAtTime(0.018, t);
      resGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      resOsc.connect(resGain);
      resGain.connect(this.destination);

      resOsc.onended = () => {
        try {
          resOsc.disconnect();
          resGain.disconnect();
        } catch (e) {}
      };

      resOsc.start(t);
      resOsc.stop(t + 0.085);
    } catch (e) {}
  }

  // Iconic Leica mechanical focal-plane shutter release (Standard v1 synthesis)
  playShutter() {
    if (this.isMuted) return;
    this.lastSoundTime = performance.now() + 85; // Protect full 85ms focal-plane shutter release from detent clash

    try {
      this.init();
      if (!this.ctx || this.ctx.state === 'closed' || !this.destination) return;

      const t = this.ctx.currentTime;

      // 1. Initial mechanical latch trigger
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(850, t);
      osc1.frequency.exponentialRampToValueAtTime(220, t + 0.025);
      g1.gain.setValueAtTime(0.06, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc1.connect(g1);
      g1.connect(this.destination);

      osc1.onended = () => {
        try {
          osc1.disconnect();
          g1.disconnect();
        } catch (e) {}
      };

      osc1.start(t);
      osc1.stop(t + 0.035);

      // 2. Cloth curtain sweep (filtered white noise burst)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1600;
      noiseFilter.Q.value = 2.0;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.setValueAtTime(0.045, t + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.destination);

      whiteNoise.onended = () => {
        try {
          whiteNoise.disconnect();
          noiseFilter.disconnect();
          noiseGain.disconnect();
        } catch (e) {}
      };

      whiteNoise.start(t + 0.01);
      whiteNoise.stop(t + 0.05);

      // 3. Crisp mechanical brake stop
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1400, t + 0.042);
      osc2.frequency.exponentialRampToValueAtTime(280, t + 0.075);
      g2.gain.setValueAtTime(0, t);
      g2.gain.setValueAtTime(0.08, t + 0.042);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc2.connect(g2);
      g2.connect(this.destination);

      osc2.onended = () => {
        try {
          osc2.disconnect();
          g2.disconnect();
        } catch (e) {}
      };

      osc2.start(t + 0.042);
      osc2.stop(t + 0.085);
    } catch (e) {}
  }

  // Authentic spring-loaded bayonet rotation twist & heavy stainless steel latch click
  playMountLock() {
    if (this.isMuted) return;
    this.lastSoundTime = performance.now() + 90; // Protect 130ms bayonet latching from detent clash

    try {
      this.init();
      if (!this.ctx || this.ctx.state === 'closed' || !this.destination) return;

      const t = this.ctx.currentTime;

      // Stage 1: Brushed stainless-steel rotation twist friction (55ms bandpass noise sweep)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.055);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const frictionNoise = this.ctx.createBufferSource();
      frictionNoise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.frequency.exponentialRampToValueAtTime(950, t + 0.05);
      filter.Q.setValueAtTime(3.0, t);
      const frictionGain = this.ctx.createGain();
      frictionGain.gain.setValueAtTime(0.035, t);
      frictionGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      frictionNoise.connect(filter);
      filter.connect(frictionGain);
      frictionGain.connect(this.destination);
      frictionNoise.onended = () => {
        try {
          frictionNoise.disconnect();
          filter.disconnect();
          frictionGain.disconnect();
        } catch (e) {}
      };
      frictionNoise.start(t);
      frictionNoise.stop(t + 0.055);

      // Stage 2: Heavy stainless steel latch lock impact (at t + 0.040)
      const lockOsc = this.ctx.createOscillator();
      const lockGain = this.ctx.createGain();
      lockOsc.type = 'triangle';
      lockOsc.frequency.setValueAtTime(650, t + 0.04);
      lockOsc.frequency.exponentialRampToValueAtTime(120, t + 0.085);
      lockGain.gain.setValueAtTime(0, t);
      lockGain.gain.setValueAtTime(0.09, t + 0.04);
      lockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      lockOsc.connect(lockGain);
      lockGain.connect(this.destination);
      lockOsc.onended = () => {
        try {
          lockOsc.disconnect();
          lockGain.disconnect();
        } catch (e) {}
      };
      lockOsc.start(t + 0.04);
      lockOsc.stop(t + 0.095);

      // Stage 3: Spring pin snap click (at t + 0.044)
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(2400, t + 0.044);
      snapOsc.frequency.exponentialRampToValueAtTime(400, t + 0.075);
      snapGain.gain.setValueAtTime(0, t);
      snapGain.gain.setValueAtTime(0.07, t + 0.044);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      snapOsc.connect(snapGain);
      snapGain.connect(this.destination);
      snapOsc.onended = () => {
        try {
          snapOsc.disconnect();
          snapGain.disconnect();
        } catch (e) {}
      };
      snapOsc.start(t + 0.044);
      snapOsc.stop(t + 0.085);

      // Stage 4: High-grade flange steel ringdown (sine overtone)
      const flangeRing = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      flangeRing.type = 'sine';
      flangeRing.frequency.setValueAtTime(2850, t + 0.045);
      ringGain.gain.setValueAtTime(0, t);
      ringGain.gain.setValueAtTime(0.022, t + 0.045);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      flangeRing.connect(ringGain);
      ringGain.connect(this.destination);
      flangeRing.onended = () => {
        try {
          flangeRing.disconnect();
          ringGain.disconnect();
        } catch (e) {}
      };
      flangeRing.start(t + 0.045);
      flangeRing.stop(t + 0.13);
    } catch (e) {}
  }

  // Delicate mechanical winding gear ratchet clicks (watchmaker gear pawl)
  playRatchet(pitch = 1.0) {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastSoundTime < 35) return; // Unified rate-limiting preventing audio clash
    this.lastSoundTime = now;
    this.lastRatchetTime = now;

    try {
      this.init();
      if (!this.ctx || this.ctx.state === 'closed' || !this.destination) return;

      const safePitch = (typeof pitch === 'number' && isFinite(pitch) && pitch > 0.05) ? Math.min(pitch, 5.0) : 1.0;
      const t = this.ctx.currentTime;

      // Dual micro-pawl clicks spaced by 16ms
      [0, 0.016].forEach((offset, idx) => {
        const clickTime = t + offset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        const baseFreq = (3200 + idx * 400) * safePitch;
        osc.frequency.setValueAtTime(baseFreq, clickTime);
        osc.frequency.exponentialRampToValueAtTime(1400 * safePitch, clickTime + 0.009);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2200, clickTime);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.038, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.012);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch (e) {}
        };
        osc.start(clickTime);
        osc.stop(clickTime + 0.015);
      });
    } catch (e) {}
  }

  // Crisp aperture ring click for interactive buttons
  playApertureClick(pitch = 1.0) {
    if (this.isMuted) return;

    try {
      this.init();
      if (!this.ctx || this.ctx.state === 'closed' || !this.destination) return;

      const safePitch = (typeof pitch === 'number' && isFinite(pitch) && pitch > 0.05) ? Math.min(pitch, 5.0) : 1.0;
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2800 * safePitch, t);
      osc1.frequency.exponentialRampToValueAtTime(900 * safePitch, t + 0.014);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1500 * safePitch, t);
      osc2.frequency.exponentialRampToValueAtTime(450 * safePitch, t + 0.014);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200 * safePitch, t);
      filter.Q.setValueAtTime(2.5, t);

      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.destination);

      osc1.onended = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {}
      };

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.022);
      osc2.stop(t + 0.022);
    } catch (e) {}
  }

  // Toggle mute state
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const audio = new MechanicalAudioEngine();
