import React from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import {
  X,
  Sliders,
  Wrench,
  RotateCw,
  Flame,
  Volume2,
  VolumeX,
  Thermometer,
  Shield,
  MousePointer,
} from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    setWeather,
    dayNight,
    toggleDayNight,
    isHeatOverlay,
    toggleHeatOverlay,
    soundEnabled,
    toggleSound,
    triggerIncidentInjection,
    triggerGeneratorTest,
  } = useSimulation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel-highlight rounded-2xl shadow-2xl p-6 border border-cyan-500/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold font-display text-white">System Settings & Controls</h2>
              <p className="text-xs font-mono text-slate-400">CORELINE AI Infrastructure Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Interactive Simulation Triggers */}
        <div className="mb-5">
          <h3 className="text-xs font-mono uppercase text-cyan-400 font-semibold mb-2.5 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> Interactive Simulation Triggers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                triggerIncidentInjection()
                onClose()
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-mono text-left transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Inject Rack Fault</div>
                <div className="text-[10px] text-amber-400/70">Dispatches tech cart</div>
              </div>
            </button>

            <button
              onClick={() => {
                triggerGeneratorTest()
                onClose()
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/40 text-blue-300 text-xs font-mono text-left transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Test Generators</div>
                <div className="text-[10px] text-blue-400/70">Engages 3.5MW gensets</div>
              </div>
            </button>

            <button
              onClick={() => {
                setWeather('heatwave')
                onClose()
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-xs font-mono text-left transition-colors cursor-pointer"
            >
              <Flame className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Simulate Heatwave</div>
                <div className="text-[10px] text-rose-400/70">Spikes cooling & PUE</div>
              </div>
            </button>

            <button
              onClick={toggleHeatOverlay}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-mono text-left transition-colors cursor-pointer ${
                isHeatOverlay
                  ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Thermometer className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Heatmap Overlay</div>
                <div className="text-[10px] text-slate-400">
                  {isHeatOverlay ? 'Currently Active' : 'Toggle Aisle Heat'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Environment Toggles */}
        <div className="mb-5">
          <h3 className="text-xs font-mono uppercase text-cyan-400 font-semibold mb-2.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Environment & Audio
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span>Tactical Sound FX</span>
              </div>
              <button
                onClick={toggleSound}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-mono text-slate-300">Day / Night Cycle</span>
              <button
                onClick={toggleDayNight}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 capitalize cursor-pointer border border-slate-700"
              >
                {dayNight} Mode
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Navigation Guide */}
        <div className="mb-5 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <h4 className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <MousePointer className="w-3.5 h-3.5 text-cyan-400" /> 3D Camera Controls
          </h4>
          <ul className="text-xs font-mono text-slate-400 space-y-1">
            <li>• <strong className="text-slate-200">Left Click Drag:</strong> Pan camera across campus</li>
            <li>• <strong className="text-slate-200">Right Click Drag:</strong> Orbit and rotate view</li>
            <li>• <strong className="text-slate-200">Mouse Wheel / Pinch:</strong> Zoom in and out</li>
            <li>• <strong className="text-slate-200">Left Click:</strong> Inspect server racks, towers, vehicles</li>
            <li>• <strong className="text-slate-200">Ctrl + K or /:</strong> Quick search assets</li>
          </ul>
        </div>

        {/* Notice Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-[11px] font-mono text-slate-400 flex items-start gap-2">
          <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-cyan-300">Notice:</strong> Operational data displayed in this application is simulated for demonstration and architectural visualization purposes.
          </p>
        </div>
      </div>
    </div>
  )
}
