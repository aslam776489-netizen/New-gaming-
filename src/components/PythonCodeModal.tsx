import React from 'react';
import { X, Code2, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0f24] border border-[#1e294b] rounded-2xl p-6 text-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e294b] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Pygame to Three.js 3D Architecture
              </h2>
              <p className="text-xs text-slate-400">
                How your Python simulation is transformed into a high-performance 3D kinetic harmonograph
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Pygame Box */}
          <div className="bg-[#050816] border border-cyan-950 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                Original Python / Pygame
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                2D Screen Loop
              </span>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed text-slate-300 overflow-x-auto p-3 bg-black/50 rounded-lg border border-slate-900">
{`# Circle collision & vector reflection
dx = self.x - CENTER[0]
dy = self.y - CENTER[1]
dist = math.hypot(dx, dy)
if dist > RADIUS - 10:
    nx, ny = dx/dist, dy/dist
    dot = self.vx*nx + self.vy*ny
    self.vx -= 2*dot*nx
    self.vy -= 2*dot*ny
    self.x = CENTER[0] + nx*(RADIUS-11)
    self.y = CENTER[1] + ny*(RADIUS-11)

# Trail buffer
self.trail.append((self.x, self.y))
if len(self.trail) > 300:
    self.trail.pop(0)`}
            </pre>
          </div>

          {/* Three.js Box */}
          <div className="bg-[#050816] border border-purple-950 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-purple-400 uppercase tracking-wider">
                Three.js 3D Physics & PBR Engine
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                PBR + Zero-GC Vectors
              </span>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed text-slate-300 overflow-x-auto p-3 bg-black/50 rounded-lg border border-slate-900">
{`// 3D vector reflection with pre-allocated scratch
const dist = Math.hypot(b.position.x, b.position.z);
if (dist > maxDist) {
    collisionNormal.set(b.position.x/dist, 0, b.position.z/dist);
    const dot = b.velocity.dot(collisionNormal);
    if (dot > 0) {
        _v1.copy(collisionNormal).multiplyScalar((1 + e) * dot);
        b.velocity.sub(_v1);
        b.position.x = collisionNormal.x * (maxDist - 0.02);
        b.position.z = collisionNormal.z * (maxDist - 0.02);
    }
}

// Pre-allocated BufferGeometry with gradient vertex colors
b.trailGeometry.setAttribute('position', ...);
b.trailGeometry.setDrawRange(0, count);`}
            </pre>
          </div>
        </div>

        {/* Architectural Pillars */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Key Architectural Enhancements
          </h3>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-100">Composite 3–12 Part Procedural Models:</span>{' '}
              Instead of simple circles, each orb features a glowing nucleus core, counter-rotating metallic gimbal rings, 4 accent sensor studs, and dynamic point lights.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-100">Harmonic Web Audio Synthesizer:</span>{' '}
              Each collision triggers a tuned pentatonic note (Crystal Marimba, Ethereal Glass, Cyber Synth) with volume proportional to impact velocity. Zero external audio files.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-100">Full 3D Spherical & Cylindrical Containment:</span>{' '}
              Toggle between the classic 2D planar ring, a 3D celestial sphere, or an enclosed cylindrical chamber with gravity options.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-100">Lossless 60 FPS & Zero GC:</span>{' '}
              Reuses memory with pre-allocated vector scratch objects and handles software WebGL safely using fence-sync pacing.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#1e294b] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide transition-colors"
          >
            Return to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
