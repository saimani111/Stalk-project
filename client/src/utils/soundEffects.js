// Stalk Synthetic Web Audio Synthesizer
// Clean, proprietary audio tones created in code - 100% royalty-free and copyright safe.

class SoundFX {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Futuristic incoming message blip
  playMessageChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      // Two-tone rising blip
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(990, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Burn dissolve sound effect
  playBurnChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const soundFX = new SoundFX();
