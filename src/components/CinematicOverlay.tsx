import React, { useState, useEffect, useCallback } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import {
  VideoOff,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Eye,
  EyeOff,
  Camera,
  Layers,
  Maximize2,
} from 'lucide-react'

const WAYPOINTS = [
  { label: 'Campus Overview', desc: 'Aerial 3/4 Master View' },
  { label: 'Hall A Compute', desc: 'Liquid-Cooled GPU Racks' },
  { label: 'Hall B AI Swarm', desc: 'Inference Clusters & Trusses' },
  { label: 'Cooling Yard', desc: 'Induced-Draft Fans & Chillers' },
  { label: 'Power Substation', desc: 'Step-Down HV & Fuel Silos' },
  { label: 'Network & Fibre', desc: 'Optical Vault & Conduit' },
]

export const CinematicOverlay: React.FC = () => {
  const [isCleanRecordingView, setIsCleanRecordingView] = useState<boolean>(false)

  const {
    isCinematic,
    toggleCinematic,
    cinematicWaypointIndex,
    setCinematicWaypointIndex,
    isCinematicPaused,
    toggleCinematicPause,
    showFacilityBadges,
    toggleFacilityBadges,
  } = useSimulation()

  const currentWp = WAYPOINTS[cinematicWaypointIndex] || WAYPOINTS[0]

  const handlePrev = useCallback(() => {
    const nextIdx = (cinematicWaypointIndex - 1 + WAYPOINTS.length) % WAYPOINTS.length
    setCinematicWaypointIndex(nextIdx)
  }, [cinematicWaypointIndex, setCinematicWaypointIndex])

  const handleNext = useCallback(() => {
    const nextIdx = (cinematicWaypointIndex + 1) % WAYPOINTS.length
    setCinematicWaypointIndex(nextIdx)
  }, [cinematicWaypointIndex, setCinematicWaypointIndex])

  // Keyboard navigation shortcuts during showcase
  useEffect(() => {
    if (!isCinematic) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        toggleCinematic()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        toggleCinematicPause()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'h' || e.key === 'H') {
        setIsCleanRecordingView((prev) => !prev)
      } else if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1
        if (idx < WAYPOINTS.length) {
          setCinematicWaypointIndex(idx)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isCinematic,
    toggleCinematic,
    toggleCinematicPause,
    handleNext,
    handlePrev,
    setCinematicWaypointIndex,
  ])

  if (!isCinematic) return null

  // Ultra-clean Minimalist Mode for Screen Recording and Social Media Demo
  if (isCleanRecordingView) {
    return (
      <div className="pointer-events-none fixed top-3 sm:top-5 right-3 sm:right-5 z-50 flex items-center gap-2 select-none">
        <button
          onClick={() => setIsCleanRecordingView(false)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-mono backdrop-blur-md transition-all shadow-lg cursor-pointer"
          title="Restore Director Controls (H)"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Show Controls (H)</span>
        </button>
        <button
          onClick={toggleCinematic}
          className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-mono font-semibold backdrop-blur-md transition-all shadow-lg cursor-pointer"
          title="Exit Showcase (Esc)"
        >
          <VideoOff className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Director Header */}
      <div className="w-full flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold tracking-widest text-purple-300 uppercase">
              CINEMATIC DIRECTOR MODE
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              Interactive 3D Architectural Showcase
            </span>
          </div>
        </div>

        {/* Center Current Waypoint Pill (Hidden on extra small screens) */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300 shadow-lg">
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-400 font-bold">
            [{cinematicWaypointIndex + 1} / {WAYPOINTS.length}]
          </span>
          <span className="text-white font-semibold">{currentWp.label}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px]">{currentWp.desc}</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Facility Badges In-World Toggle */}
          <button
            onClick={toggleFacilityBadges}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md border font-mono text-xs transition-all cursor-pointer shadow-md ${
              showFacilityBadges
                ? 'bg-slate-900/85 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle In-World Facility Badges"
          >
            {showFacilityBadges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">
              {showFacilityBadges ? 'Labels ON' : 'Labels OFF'}
            </span>
          </button>

          {/* Clean Screen Recording View Button */}
          <button
            onClick={() => setIsCleanRecordingView(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 backdrop-blur-md font-mono text-xs transition-all cursor-pointer shadow-md"
            title="Clean View for Screen Recording (H)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-[11px]">Clean View</span>
          </button>

          {/* Exit Showcase Button */}
          <button
            onClick={toggleCinematic}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] cursor-pointer"
            title="Exit Showcase (Esc)"
          >
            <VideoOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Showcase</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Viewpoint Navigation Dock */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2 pointer-events-auto">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
          {/* Tour Transport Controls: Prev, Play/Pause, Next */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous Viewpoint (Left Arrow)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleCinematicPause}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                isCinematicPaused
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              }`}
              title={isCinematicPaused ? 'Resume Auto-Tour (Space)' : 'Pause Auto-Tour (Space)'}
            >
              {isCinematicPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[11px]">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[11px]">Touring</span>
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next Viewpoint (Right Arrow)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 6 Viewpoint Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none px-1">
            {WAYPOINTS.map((wp, idx) => {
              const isActive = cinematicWaypointIndex === idx
              return (
                <button
                  key={wp.label}
                  onClick={() => setCinematicWaypointIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                  title={`Jump to ${wp.label} (Key ${idx + 1})`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                    }`}
                  />
                  <span>{wp.label}</span>
                </button>
              )
            })}
          </div>

          {/* Viewport Meta Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] text-slate-500 shrink-0">
            <Layers className="w-3 h-3 text-slate-500" />
            <span>FOV 38° // 60 FPS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
