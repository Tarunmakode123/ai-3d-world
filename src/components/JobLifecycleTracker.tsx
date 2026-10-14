import React, { useState } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type { JobStage } from '../types/simulation'
import { ChevronDown } from 'lucide-react'

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
  const { metrics } = useSimulation()
  const [selectedCluster, setSelectedCluster] = useState('All Clusters')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Workload counts matching IMAGE 2
  const workloadItems: {
    stage: JobStage
    label: string
    count: number
    color: string
    barColor: string
    percentage: number
  }[] = [
    {
      stage: 'queued',
      label: 'Queued',
      count: metrics.workloadCounts?.queued ?? 312,
      color: 'text-slate-300',
      barColor: 'bg-slate-400',
      percentage: 22,
    },
    {
      stage: 'scheduled',
      label: 'Scheduled',
      count: metrics.workloadCounts?.scheduled ?? 186,
      color: 'text-blue-300',
      barColor: 'bg-blue-400',
      percentage: 14,
    },
    {
      stage: 'running',
      label: 'Running',
      count: metrics.workloadCounts?.running ?? 1428,
      color: 'text-cyan-300',
      barColor: 'bg-cyan-400',
      percentage: 68,
    },
    {
      stage: 'checkpoint',
      label: 'Checkpoint',
      count: metrics.workloadCounts?.checkpoint ?? 96,
      color: 'text-purple-300',
      barColor: 'bg-purple-400',
      percentage: 8,
    },
    {
      stage: 'done',
      label: 'Completed',
      count: metrics.workloadCounts?.completed ?? 3842,
      color: 'text-emerald-300',
      barColor: 'bg-emerald-400',
      percentage: 85,
    },
    {
      stage: 'archived',
      label: 'Archived',
      count: metrics.workloadCounts?.archived ?? 12614,
      color: 'text-slate-400',
      barColor: 'bg-slate-500',
      percentage: 95,
    },
  ]

  const [isMinimized, setIsMinimized] = useState<boolean>(false)

  const handleRowClick = (stage: JobStage) => {
    if (selectedStageFilter === stage) {
      onSelectStageFilter(null)
    } else {
      onSelectStageFilter(stage)
    }
    onOpenJobsTab()
  }

  return (
    <div className="w-full glass-panel rounded-2xl p-3.5 shadow-2xl pointer-events-auto transition-all duration-200">
      {/* Header matching IMAGE 2 */}
      <div className={`flex items-center justify-between ${isMinimized ? '' : 'pb-2.5 mb-2.5 border-b border-slate-800'}`}>
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            WORKLOAD TRACKER
          </h4>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px] font-mono"
            title={isMinimized ? 'Expand Tracker' : 'Collapse Tracker'}
          >
            {isMinimized ? '[+ Expand]' : '[-]'}
          </button>
        </div>

        {/* Cluster Filter Dropdown (IMAGE 2: All Clusters ▼) */}
        {!isMinimized && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800 transition-colors cursor-pointer"
            >
              <span>{selectedCluster}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 w-36 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl py-1 backdrop-blur-md">
                {['All Clusters', 'Cluster Alpha', 'Cluster Beta', 'Inference Swarm'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCluster(c)
                      setIsDropdownOpen(false)
                    }}
                    className="w-full text-left px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:bg-slate-800"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rows with Horizontal Progress Bars matching IMAGE 2 */}
      {!isMinimized && (
        <div className="space-y-2">
        {workloadItems.map((item) => {
          const isSelected = selectedStageFilter === item.stage
          return (
            <button
              key={item.stage}
              onClick={() => handleRowClick(item.stage)}
              className={`w-full text-left p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 border border-cyan-400/40'
                  : 'hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className={`font-medium ${item.color}`}>{item.label}</span>
                <span className="font-bold text-white">{item.count.toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </button>
          )
        })}
        </div>
      )}
    </div>
  )
}
