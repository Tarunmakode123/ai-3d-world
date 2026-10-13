import React from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import { TrendingUp, TrendingDown } from 'lucide-react'

export const KpiCards: React.FC = () => {
  const { metrics } = useSimulation()

  const gpuPercent = Math.round(metrics.gpuUtilisation)
  const activeGpuFormatted = metrics.activeGpus.toLocaleString()
  const totalGpuFormatted = metrics.totalGpus.toLocaleString()

  return (
    <div className="absolute top-14 sm:top-16 left-3 sm:left-5 z-20 flex flex-col sm:flex-row gap-2.5 sm:gap-3 pointer-events-none">
      {/* Card 1: GPU UTILISATION */}
      <div className="glass-panel rounded-xl px-4 py-3 min-w-[210px] pointer-events-auto shadow-xl transition-all duration-200 hover:border-cyan-500/40">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase font-semibold">
            GPU UTILISATION
          </span>
          <span className="flex items-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-400" />
            +6%
          </span>
        </div>

        <div className="flex items-baseline gap-1 my-1">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
            {gpuPercent}
          </span>
          <span className="text-sm font-mono text-cyan-400 font-bold">%</span>
        </div>

        {/* Progress bar gauge matching IMAGE 2 */}
        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden mt-1.5 mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-300 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
            style={{ width: `${Math.min(100, Math.max(0, gpuPercent))}%` }}
          />
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          <span>{activeGpuFormatted} / {totalGpuFormatted} GPUs</span>
        </div>
      </div>

      {/* Card 2: POWER USAGE EFFECTIVENESS (PUE) */}
      <div className="glass-panel rounded-xl px-4 py-3 min-w-[220px] pointer-events-auto shadow-xl transition-all duration-200 hover:border-cyan-500/40">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold">
            POWER USAGE EFFECTIVENESS (PUE)
          </span>
          <span className="flex items-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <TrendingDown className="w-3 h-3 mr-0.5 text-emerald-400" />
            -4%
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 my-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {metrics.pue.toFixed(2)}
            </span>
          </div>

          {/* Sparkline curve matching IMAGE 2 */}
          <div className="w-20 h-7">
            <svg viewBox="0 0 80 28" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="pueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,22 Q 15,18 28,14 T 52,19 T 80,6 L 80,28 L 0,28 Z"
                fill="url(#pueGrad)"
              />
              <path
                d="M 0,22 Q 15,18 28,14 T 52,19 T 80,6"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="80" cy="6" r="2.5" fill="#34d399" />
            </svg>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 mt-1">
          <span>Total IT Load {metrics.totalItLoadMw.toFixed(1)} MW</span>
        </div>
      </div>

      {/* Card 3: JOBS IN QUEUE */}
      <div className="glass-panel rounded-xl px-4 py-3 min-w-[210px] pointer-events-auto shadow-xl transition-all duration-200 hover:border-cyan-500/40">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase font-semibold">
            JOBS IN QUEUE
          </span>
          <span className="flex items-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-400" />
            +23%
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 my-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {metrics.jobsInQueue}
            </span>
          </div>

          {/* Mini bar sparkline matching IMAGE 2 */}
          <div className="flex items-end gap-1 h-7 pb-1">
            {[4, 7, 5, 9, 14, 11, 18, 15, 22, 26].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-cyan-400/80 rounded-t-sm"
                style={{ height: `${(h / 28) * 100}%` }}
              />
            ))}
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 mt-1">
          <span>Est. wait time {metrics.estWaitTimeMin} min</span>
        </div>
      </div>
    </div>
  )
}
