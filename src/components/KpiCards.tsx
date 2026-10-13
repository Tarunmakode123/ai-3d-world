import React from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import { Cpu, Zap, Activity, TrendingUp, TrendingDown } from 'lucide-react'

export const KpiCards: React.FC = () => {
  const { metrics, weather } = useSimulation()

  // Trend directions based on simulated activity
  const isGpuHigh = metrics.gpuUtilisation > 80
  const isPueOptimal = metrics.pue <= 1.15

  return (
    <div className="absolute top-16 left-3 sm:left-5 z-20 flex flex-col sm:flex-row gap-2.5 pointer-events-none">
      {/* KPI 1: GPU Utilisation */}
      <div className="glass-panel rounded-xl p-3 min-w-[170px] sm:min-w-[190px] pointer-events-auto transition-transform duration-200 hover:scale-[1.02]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            GPU Utilisation
          </span>
          <span className="flex items-center text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-500/10 px-1 rounded">
            {isGpuHigh ? (
              <>
                <TrendingUp className="w-3 h-3 mr-0.5 text-cyan-400" /> +2.4%
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 mr-0.5 text-emerald-400" /> -0.8%
              </>
            )}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-white">
            {metrics.gpuUtilisation.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-cyan-300 font-medium">%</span>
        </div>

        {/* Progress bar gauge */}
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-1.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              metrics.gpuUtilisation > 85
                ? 'bg-gradient-to-r from-cyan-400 to-amber-400'
                : 'bg-gradient-to-r from-blue-500 to-cyan-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, metrics.gpuUtilisation))}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
          <span>{metrics.totalComputePFlops} PFLOPS</span>
          <span className="text-cyan-300/80">384x SXM5</span>
        </div>
      </div>

      {/* KPI 2: Power Draw */}
      <div className="glass-panel rounded-xl p-3 min-w-[170px] sm:min-w-[190px] pointer-events-auto transition-transform duration-200 hover:scale-[1.02]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            Power Draw
          </span>
          <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-1 rounded font-semibold">
            {metrics.gridFrequencyHz.toFixed(2)} Hz
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-white">
            {metrics.powerDrawMw.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-blue-300 font-medium">MW</span>
        </div>

        {/* Capacity bar (out of 18MW substation rating) */}
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, (metrics.powerDrawMw / 18.0) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
          <span>Substation Cap: 18 MW</span>
          <span className="text-emerald-400">Grid Tied</span>
        </div>
      </div>

      {/* KPI 3: PUE (Power Usage Effectiveness) */}
      <div className="glass-panel rounded-xl p-3 min-w-[170px] sm:min-w-[190px] pointer-events-auto transition-transform duration-200 hover:scale-[1.02]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            PUE Rating
          </span>
          <span
            className={`text-[10px] font-mono px-1 rounded font-semibold ${
              isPueOptimal ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
            }`}
          >
            {isPueOptimal ? 'Hyperscale' : 'Elevated'}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-white">
            {metrics.pue.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-emerald-300 font-medium">ratio</span>
        </div>

        {/* PUE metric bar */}
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-1.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isPueOptimal ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            style={{ width: `${Math.min(100, ((metrics.pue - 1.0) / 0.5) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
          <span>Cooling Load: {metrics.coolingDemandPct}%</span>
          <span className="text-slate-400 capitalize">{weather}</span>
        </div>
      </div>
    </div>
  )
}
