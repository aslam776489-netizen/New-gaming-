import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KineticArena } from './three/KineticArena';
import { soundEngine } from './audio/soundEngine';
import { ControlOverlay } from './components/ControlOverlay';
import { PythonCodeModal } from './components/PythonCodeModal';
import { SimulationConfig, SimulationStats } from './types/simulation';

const DEFAULT_CONFIG: SimulationConfig = {
  ballCount: 8, // matching python: BALLS = 8
  speed: 1.0,
  trailLength: 300, // matching python: if len(self.trail) > 300
  boundaryRadius: 14.0,
  arenaDimension: 'planar2d', // starts with 2D planar matching python simulation with 3D models
  gravityMode: 'none',
  ballCollisions: false,
  elasticity: 1.0,
  patternPreset: 'pygame',
  paletteId: 'pygame',
  cameraMode: 'iso3d', // gives high-end 3D view while showing the 2D planar orbit
  audioEnabled: true,
  audioVolume: 0.35,
  audioPreset: 'marimba',
  isPaused: false,
  showTrails: true,
  showGimbals: true,
  showWireframe: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const arenaRef = useRef<KineticArena | null>(null);

  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<SimulationStats>({
    fps: 60,
    collisionCount: 0,
    collisionsPerSec: 0,
    activeTrailsPoints: 0,
    kineticEnergy: 0,
  });

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Sync sound engine config
  useEffect(() => {
    soundEngine.setEnabled(config.audioEnabled);
    soundEngine.setVolume(config.audioVolume);
    soundEngine.setPreset(config.audioPreset);
  }, [config.audioEnabled, config.audioVolume, config.audioPreset]);

  // Handle configuration changes
  const handleConfigChange = useCallback((updates: Partial<SimulationConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      if (arenaRef.current) {
        arenaRef.current.updateConfig(next);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    if (arenaRef.current) {
      arenaRef.current.resetSimulation();
    }
  }, []);

  const handleClearTrails = useCallback(() => {
    if (arenaRef.current) {
      arenaRef.current.clearTrails();
    }
  }, []);

  // Initialize Three.js Scene once in stable container
  useEffect(() => {
    if (!mountRef.current) return;

    const arena = new KineticArena(
      mountRef.current,
      config,
      (newStats) => {
        setStats(newStats);
      },
      (ballIndex, velocityMag) => {
        soundEngine.playBounce(ballIndex, velocityMag);
      }
    );
    arenaRef.current = arena;

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleConfigChange({ isPaused: !config.isPaused });
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      } else if (e.key === 'c' || e.key === 'C') {
        handleClearTrails();
      } else if (e.key === 'm' || e.key === 'M') {
        handleConfigChange({ audioEnabled: !config.audioEnabled });
      } else if (e.key === '1') {
        handleConfigChange({ cameraMode: 'pygame2d' });
      } else if (e.key === '2') {
        handleConfigChange({ cameraMode: 'iso3d' });
      } else if (e.key === '3') {
        handleConfigChange({ cameraMode: 'cinematic' });
      } else if (e.key === '4') {
        handleConfigChange({ cameraMode: 'follow' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      arena.destroy();
      arenaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050819] select-none">
      {/* 1. Dedicated isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. Collapsible Ergonomic Bottom HUD Controls */}
      <ControlOverlay
        config={config}
        stats={stats}
        onChangeConfig={handleConfigChange}
        onReset={handleReset}
        onClearTrails={handleClearTrails}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
      />

      {/* 3. Educational Pygame to Three.js Architecture Modal */}
      <PythonCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
