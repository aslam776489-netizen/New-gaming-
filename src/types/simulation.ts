export type ArenaDimension = 'planar2d' | 'sphere3d' | 'cylinder3d';
export type GravityMode = 'none' | 'center' | 'floor';
export type PatternPreset = 'pygame' | 'vortex' | 'harmonic' | 'star' | 'chaos';
export type CameraMode = 'pygame2d' | 'iso3d' | 'cinematic' | 'follow';
export type AudioPreset = 'marimba' | 'glass' | 'cyber' | 'bell';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[]; // hex codes
  boundaryColor: string;
  glowColor: string;
}

export interface SimulationConfig {
  ballCount: number;
  speed: number;
  trailLength: number;
  boundaryRadius: number;
  arenaDimension: ArenaDimension;
  gravityMode: GravityMode;
  ballCollisions: boolean;
  elasticity: number; // 0.8 - 1.0
  patternPreset: PatternPreset;
  paletteId: string;
  cameraMode: CameraMode;
  audioEnabled: boolean;
  audioVolume: number;
  audioPreset: AudioPreset;
  isPaused: boolean;
  showTrails: boolean;
  showGimbals: boolean;
  showWireframe: boolean;
}

export interface SimulationStats {
  fps: number;
  collisionCount: number;
  collisionsPerSec: number;
  activeTrailsPoints: number;
  kineticEnergy: number;
}
