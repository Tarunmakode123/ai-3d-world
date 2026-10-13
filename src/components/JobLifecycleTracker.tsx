import React from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type { JobStage } from '../types/simulation'
import { Layers, ChevronRight, CheckCircle2 } from 'lucide-react'

interface JobLifecycleTrackerProps {
  selectedStageFilter: JobStage | null
  onSelectStageFilter: (stage: JobStage | null) => void
  onOpenJobsTab: () => void
}

export const JobLifecycleTracker: React.FC<JobLifecycleTrackerProps> = ({
  selectedStageFilter,
  onSelectStageFilter,
  onOpenJobsTab,
}) => {
  const { jobs, metrics } = useSimulation()

  const stages: { id: JobStage; label: string; color: string }[] = [
    { id: 'queued', label: 'Queued', color: 'text-slate-400' },
    { id: 'scheduled', label: 'Scheduled', color: 'text-blue-400' },
    { id: 'running', label: 'Running', color: 'text-cyan-400' },
    { id: 'checkpoint', label: 'Checkpoint', color: 'text-purple-400' },
    { id: 'evaluating', label: 'Evaluating', color: 'text-amber-400' },
    { id: 'done', label: 'Done', color: 'text-emerald-400' },
  ]

  const stageCounts = stages.reduce((acc, s) => {
    acc[s.id] = jobs.filter((j) => j.stage === s.id).length
    return acc
  }, {} as Record<JobStage, number>)

  const handleStageClick = (stage: JobStage) => {
    if (selectedStageFilter === stage) {
      onSelectStageFilter(null)
    } else {
      onSelectStageFilter(stage)
    }
    onOpenJobsTab()
  }

  return (
    <div className="absolute bottom-4 left-3 sm:left-5 z-20 pointer-events-none">
      <div className="glass-panel rounded-xl p-2.5 sm:p-3 pointer-events-auto max-w-[calc(100vw-30px)] overflow-x-auto shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Job Lifecycle Pipeline</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Completed Total:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {metrics.completedJobsTotal}
            </span>
          </div>
        </div>

        {/* 6-Stage Horizontal Interactive Progression Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {stages.map((stage, idx) => {
            const count = stageCounts[stage.id]
            const isSelected = selectedStageFilter === stage.id

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => handleStageClick(stage.id)}
                  className={`flex flex-col items-center justify-center min-w-[58px] sm:min-w-[68px] py-1.5 px-2 rounded-lg transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/30 border border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800'
                  }`}
                  title={`Filter by ${stage.label} jobs`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-mono font-semibold ${stage.color}`}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">{count}</div>
                </button>

                {idx < stages.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
