import React from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import { VideoOff, Sparkles } from 'lucide-react'

export const CinematicOverlay: React.FC = () => {
  const { isCinematic, toggleCinematic } = useSimulation()

  if (!isCinematic) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between">
      {/* Top Letterbox Bar */}
      <div className="h-10 sm:h-14 w-full bg-black/90 backdrop-blur-md flex items-center justify-between px-6 pointer-events-auto border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-xs font-mono font-bold tracking-widest text-purple-300 uppercase">
            CINEMATIC DIRECTOR // HYPERSCALE OVERVIEW
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
          Autonomous Aerial Patrol — Manual Navigation Paused
        </div>
      </div>

      {/* Center Reticle Hint */}
      <div className="text-center">
        <span className="text-[11px] font-mono tracking-widest text-white/50 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 uppercase">
          Cinematic Trajectory Active
        </span>
      </div>

      {/* Bottom Letterbox Bar with Exit Button */}
      <div className="h-12 sm:h-16 w-full bg-black/90 backdrop-blur-md flex items-center justify-between px-6 pointer-events-auto border-t border-cyan-500/20">
        <span className="text-xs font-mono text-slate-400 hidden md:block">
          4K Procedural Photorealistic Rendering // Coreline Simulation
        </span>

        <button
          onClick={toggleCinematic}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer"
        >
          <VideoOff className="w-4 h-4" />
          <span>Exit Cinematic Mode</span>
        </button>
      </div>
    </div>
  )
}
