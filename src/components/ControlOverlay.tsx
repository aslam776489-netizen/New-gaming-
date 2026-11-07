import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Code2,
  Zap,
  Globe2,
} from 'lucide-react';
import {
  SimulationConfig,
  SimulationStats,
  ArenaDimension,
  GravityMode,
  PatternPreset,
  CameraMode,
  AudioPreset,
} from '../types/simulation';
import { PALETTES } from '../three/proceduralMaterials';

interface ControlOverlayProps {
  config: SimulationConfig;
  stats: SimulationStats;
  onChangeConfig: (updates: Partial<SimulationConfig>) => void;
  onReset: () => void;
  onClearTrails: () => void;
  onOpenCodeModal: () => void;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  config,
  stats,
  onChangeConfig,
  onReset,
  onClearTrails,
  onOpenCodeModal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'physics' | 'arena' | 'style' | 'camera'>('physics');

  return (
    <>
      {/* Top Banner (Minimal, sleek, no backdrop-filter) */}
      <header className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Title & Status */}
        <div className="flex items-center gap-3 bg-[#0a0e22] border border-[#1b2548] px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Kinetic Orbits 3D
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                Pygame Port
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
              <span>{stats.fps} FPS</span>
              <span>•</span>
              <span>{config.ballCount} Orbs</span>
              <span>•</span>
              <span>{stats.collisionsPerSec} Collisions/s</span>
            </div>
          </div>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 bg-[#0a0e22] hover:bg-[#141b3d] text-cyan-300 border border-[#1b2548] px-3 py-2 rounded-xl text-xs font-medium transition-colors shadow-xl"
            title="Inspect Pygame to Three.js Code"
          >
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Code Comparison</span>
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 bg-[#0a0e22] hover:bg-[#141b3d] text-slate-300 border border-[#1b2548] px-3 py-2 rounded-xl text-xs font-medium transition-colors shadow-xl"
            title="Toggle Controls (Key: H)"
          >
            {isCollapsed ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{isCollapsed ? 'Show HUD' : 'Zen Mode'}</span>
          </button>
        </div>
      </header>

      {/* Unified Bottom Control Dock (Solid rgba, no backdrop-filter) */}
      <div
        className={`fixed z-40 transition-transform duration-300 ease-out left-1/2 -translate-x-1/2 w-full max-w-[920px] px-4 pointer-events-none ${
          isCollapsed ? 'bottom-0 translate-y-[calc(100%-36px)]' : 'bottom-5 translate-y-0'
        }`}
      >
        <div className="bg-[#0a0e22] border border-[#1b2548] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">
          {/* Drawer Handle / Tab Strip */}
          <div className="flex items-center justify-between border-b border-[#161f3e] px-3 py-1.5 bg-[#060918]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => {
                  setActiveTab('physics');
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'physics'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Physics &amp; Orbs</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('arena');
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'arena'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>Arena &amp; Gravity</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('style');
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'style'
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Color &amp; Trails</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('camera');
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'camera'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera &amp; Audio</span>
              </button>
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-800/50 transition-colors"
              title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
            >
              {isCollapsed ? (
                <>
                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Show Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              )}
            </button>
          </div>

          {/* Active Tab Body */}
          <div className="p-4 bg-[#0a0e22]">
            {/* TAB 1: Physics & Orbs */}
            {activeTab === 'physics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Ball Count */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Orb Count ({config.ballCount})
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[4, 6, 8, 10, 16, 24, 32].map((num) => (
                        <button
                          key={num}
                          onClick={() => onChangeConfig({ ballCount: num })}
                          className={`py-1 text-xs font-mono font-medium rounded-lg transition-colors ${
                            config.ballCount === num
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      <span>Simulation Speed</span>
                      <span className="text-cyan-400 font-mono">{config.speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={config.speed}
                      onChange={(e) => onChangeConfig({ speed: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                      <span>0.2x</span>
                      <span>1.0x</span>
                      <span>3.0x</span>
                    </div>
                  </div>

                  {/* Velocity Patterns */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Pattern Preset
                    </label>
                    <select
                      value={config.patternPreset}
                      onChange={(e) => onChangeConfig({ patternPreset: e.target.value as PatternPreset })}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="pygame">Pygame Classic (vx=3, vy=2)</option>
                      <option value="vortex">Harmonic Vortex</option>
                      <option value="harmonic">Phase Harmonics</option>
                      <option value="star">Radial Starburst</option>
                      <option value="chaos">Chaotic Dispersion</option>
                    </select>
                  </div>

                  {/* Action Controls */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Playback
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onChangeConfig({ isPaused: !config.isPaused })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          config.isPaused
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        {config.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        <span>{config.isPaused ? 'Resume' : 'Pause'}</span>
                      </button>

                      <button
                        onClick={onReset}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                        title="Reset Orbit Positions"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-row: Ball Collisions & Elasticity */}
                <div className="pt-3 border-t border-[#161f3e] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.ballCollisions}
                      onChange={(e) => onChangeConfig({ ballCollisions: e.target.checked })}
                      className="rounded accent-cyan-400 w-3.5 h-3.5"
                    />
                    <span>Orb-to-Orb Elastic Collisions</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Boundary Elasticity:</span>
                    <button
                      onClick={() => onChangeConfig({ elasticity: 1.0 })}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        config.elasticity === 1.0
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      1.0 (Zero Loss)
                    </button>
                    <button
                      onClick={() => onChangeConfig({ elasticity: 0.92 })}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        config.elasticity === 0.92
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      0.92 (Damped)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Arena & Geometry */}
            {activeTab === 'arena' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Arena Dimension */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Containment Geometry
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'planar2d', label: 'Planar Ring (Pygame 2D)' },
                        { id: 'sphere3d', label: 'Celestial Sphere (3D)' },
                        { id: 'cylinder3d', label: 'Cylindrical Chamber' },
                      ].map((dim) => (
                        <button
                          key={dim.id}
                          onClick={() => onChangeConfig({ arenaDimension: dim.id as ArenaDimension })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                            config.arenaDimension === dim.id
                              ? 'bg-purple-600 text-white font-semibold'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {dim.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gravity Mode */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Gravitational Field
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'none', label: 'Zero Gravity (Pure Inertia)' },
                        { id: 'center', label: 'Center Vortex (Attractor)' },
                        { id: 'floor', label: 'Downward Floor Gravity' },
                      ].map((grav) => (
                        <button
                          key={grav.id}
                          onClick={() => onChangeConfig({ gravityMode: grav.id as GravityMode })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                            config.gravityMode === grav.id
                              ? 'bg-cyan-600 text-white font-semibold'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {grav.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Arena Radius & Model Craft */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        <span>Arena Boundary Radius</span>
                        <span className="text-purple-400 font-mono">{config.boundaryRadius}m</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="18"
                        step="1"
                        value={config.boundaryRadius}
                        onChange={(e) => onChangeConfig({ boundaryRadius: parseInt(e.target.value) })}
                        className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="pt-2 border-t border-[#161f3e] space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={config.showGimbals}
                          onChange={(e) => onChangeConfig({ showGimbals: e.target.checked })}
                          className="rounded accent-purple-400 w-3.5 h-3.5"
                        />
                        <span>Counter-Rotating Gimbal Rings</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Color & Trails */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Palette Selector */}
                  <div className="lg:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Color Palette
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PALETTES.map((pal) => (
                        <button
                          key={pal.id}
                          onClick={() => onChangeConfig({ paletteId: pal.id })}
                          className={`p-2.5 rounded-xl border text-left transition-colors ${
                            config.paletteId === pal.id
                              ? 'border-pink-500 bg-pink-950/30'
                              : 'border-[#1b2548] bg-slate-900/60 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="text-xs font-semibold text-slate-200 mb-1.5 truncate">
                            {pal.name}
                          </div>
                          <div className="flex items-center gap-1">
                            {pal.colors.slice(0, 4).map((c, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded-full border border-black/40"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trail Settings */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        <span>Trail Length</span>
                        <span className="text-pink-400 font-mono">{config.trailLength} pts</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="600"
                        step="25"
                        value={config.trailLength}
                        onChange={(e) => onChangeConfig({ trailLength: parseInt(e.target.value) })}
                        className="w-full accent-pink-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                        <span>50 (Short)</span>
                        <span>300 (Pygame)</span>
                        <span>600 (Harmonograph)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#161f3e]">
                      <button
                        onClick={() => onChangeConfig({ showTrails: !config.showTrails })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          config.showTrails
                            ? 'bg-pink-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {config.showTrails ? 'Trails Enabled' : 'Trails Hidden'}
                      </button>

                      <button
                        onClick={onClearTrails}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Camera & Audio */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Camera Views */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Camera Perspective
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'pygame2d', label: 'Top-Down 2D (Pygame)' },
                        { id: 'iso3d', label: 'Isometric 3D' },
                        { id: 'cinematic', label: 'Cinematic Orbit' },
                        { id: 'follow', label: 'Hero Orb Follow' },
                      ].map((cam) => (
                        <button
                          key={cam.id}
                          onClick={() => onChangeConfig({ cameraMode: cam.id as CameraMode })}
                          className={`py-2 px-3 rounded-lg text-xs font-medium text-center transition-colors ${
                            config.cameraMode === cam.id
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {cam.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Procedural Audio Engine */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Harmonic Synthesizer
                      </label>
                      <button
                        onClick={() => onChangeConfig({ audioEnabled: !config.audioEnabled })}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                          config.audioEnabled
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {config.audioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        <span>{config.audioEnabled ? 'Sound On' : 'Muted'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { id: 'marimba', label: 'Crystal Marimba' },
                        { id: 'glass', label: 'Ethereal Glass' },
                        { id: 'cyber', label: 'Cyber Synth' },
                        { id: 'bell', label: 'Temple Bell' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => onChangeConfig({ audioPreset: preset.id as AudioPreset })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                            config.audioPreset === preset.id
                              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase mb-1 font-mono">
                        <span>Volume</span>
                        <span>{Math.round(config.audioVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.audioVolume}
                        onChange={(e) => onChangeConfig({ audioVolume: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
