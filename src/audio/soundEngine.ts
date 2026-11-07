import { AudioPreset } from '../types/simulation';

// Pentatonic scale notes (frequencies in Hz)
const SCALES: Record<AudioPreset, number[]> = {
  marimba: [
    261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50
  ], // C major pentatonic
  glass: [
    523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98, 1760.00
  ], // Higher celestial sine glass
  cyber: [
    130.81, 164.81, 196.00, 220.00, 261.63, 329.63, 392.00, 440.00, 523.25
  ], // Punchy retro electronic bass & saw
  bell: [
    349.23, 392.00, 440.00, 523.25, 587.33, 698.46, 783.99, 880.00, 1046.50
  ], // Harmonic resonant temple bells
};

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private volume: number = 0.4;
  private preset: AudioPreset = 'marimba';
  private lastTriggerTime: number = 0;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.initContext();
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setPreset(preset: AudioPreset) {
    this.preset = preset;
  }

  public playBounce(ballIndex: number, velocityMag: number = 1.0) {
    if (!this.enabled || this.volume <= 0.001) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Rate limit to prevent cacophony if many balls collide simultaneously
    const now = this.ctx.currentTime;
    if (now - this.lastTriggerTime < 0.02) {
      return;
    }
    this.lastTriggerTime = now;

    const scale = SCALES[this.preset] || SCALES.marimba;
    const noteFreq = scale[ballIndex % scale.length];
    const velocityScale = Math.min(1.5, Math.max(0.5, velocityMag / 3.0));

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (this.preset === 'glass') {
        osc.type = 'sine';
        // Add subtle subharmonic shimmer
        const decay = 0.6;
        gain.gain.setValueAtTime(0.3 * velocityScale, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.frequency.setValueAtTime(noteFreq, now);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + decay);
      } else if (this.preset === 'cyber') {
        osc.type = 'sawtooth';
        // Punchy lowpass filtered blip
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(noteFreq * 4, now);
        filter.frequency.exponentialRampToValueAtTime(noteFreq, now + 0.15);

        const decay = 0.25;
        gain.gain.setValueAtTime(0.35 * velocityScale, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.frequency.setValueAtTime(noteFreq, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + decay);
      } else if (this.preset === 'bell') {
        // Metallic FM harmonic synthesis
        osc.type = 'sine';
        const modOsc = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        modOsc.type = 'sine';
        modOsc.frequency.setValueAtTime(noteFreq * 2.76, now); // non-integer harmonic ratio
        modGain.gain.setValueAtTime(noteFreq * 1.5, now);
        modGain.gain.exponentialRampToValueAtTime(1, now + 0.4);

        modOsc.connect(osc.frequency);
        const decay = 0.7;
        gain.gain.setValueAtTime(0.28 * velocityScale, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.frequency.setValueAtTime(noteFreq, now);

        osc.connect(gain);
        gain.connect(this.masterGain);

        modOsc.start(now);
        osc.start(now);
        modOsc.stop(now + decay);
        osc.stop(now + decay);
      } else {
        // Default: Warm Marimba / Kalimba
        osc.type = 'triangle';
        const decay = 0.35;
        gain.gain.setValueAtTime(0.4 * velocityScale, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.frequency.setValueAtTime(noteFreq, now);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + decay);
      }
    } catch {
      // AudioContext error safeguard
    }
  }
}

export const soundEngine = new ProceduralSoundEngine();
