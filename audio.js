// Leica M11 Mechanical Audio Engine (Web Audio API)
class MechanicalAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lastTickTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Delicate dial detent click on scroll / mouse steps
  playTick(pitchRatio = 1.0) {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastTickTime < 60) return; // Throttle to prevent audio pile-up
    this.lastTickTime = now;

    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400 * pitchRatio, t);
    osc.frequency.exponentialRampToValueAtTime(800 * pitchRatio, t + 0.015);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 * pitchRatio, t);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.025);
  }

  // Metallic snap when components dock into place
  playSnap() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Impact impulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);

    // Subtle metal resonance
    const resOsc = this.ctx.createOscillator();
    const resGain = this.ctx.createGain();
    resOsc.type = 'sine';
    resOsc.frequency.setValueAtTime(3200, t);
    resGain.gain.setValueAtTime(0.015, t);
    resGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    resOsc.connect(resGain);
    resGain.connect(this.ctx.destination);
    resOsc.start(t);
    resOsc.stop(t + 0.09);
  }

  // Iconic Leica mechanical shutter release
  playShutter() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

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
    g1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.035);

    // 2. Cloth curtain sweep (filtered noise burst)
    const bufferSize = this.ctx.sampleRate * 0.04;
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
    noiseGain.gain.setValueAtTime(0.04, t + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(t + 0.01);

    // 3. Crisp brake stop
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1400, t + 0.042);
    osc2.frequency.exponentialRampToValueAtTime(280, t + 0.075);
    g2.gain.setValueAtTime(0.08, t + 0.042);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc2.connect(g2);
    g2.connect(this.ctx.destination);
    osc2.start(t + 0.042);
    osc2.stop(t + 0.085);
  }
}

export const audio = new MechanicalAudioEngine();
