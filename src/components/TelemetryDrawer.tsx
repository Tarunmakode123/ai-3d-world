import React, { useState } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type { JobStage } from '../types/simulation'
import {
  Building2,
  Terminal,
  Zap,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import type { DataHall } from '../types/simulation'

interface TelemetryDrawerProps {
  activeTab: string
  setActiveTab: (tab: any) => void
  stageFilter: JobStage | null
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  activeTab,
  setActiveTab,
  stageFilter,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true)

  const {
    hallTableRows,
    jobs,
    setSelectedObject,
    halls,
    focusOnPosition,
  } = useSimulation()

  // Filter Jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesStage = stageFilter ? j.stage === stageFilter : true
    return matchesStage
  })

  const handleSelectHall = (hallId: string) => {
    const found = halls.find((h: DataHall) => h.id === hallId) || halls[0]
    if (found) {
      setSelectedObject({
        id: found.id,
        name: found.name,
        type: 'hall',
        position: [found.id === 'hall-a' ? -4 : 8, 4, -4],
        data: found,
      })
      focusOnPosition([found.id === 'hall-a' ? -4 : 8, 4, -4], [0, 1, 0], 28)
    }
  }

  const currentTab = activeTab === 'racks' || activeTab === 'incidents' ? 'halls' : activeTab

  return (
    <div className="absolute bottom-3 left-3 sm:left-5 z-20 pointer-events-none">
      <div
        className={`glass-panel rounded-2xl pointer-events-auto transition-all duration-300 shadow-2xl flex flex-col ${
          isOpen
            ? 'w-[calc(100vw-24px)] sm:w-[720px] md:w-[860px] lg:w-[980px] max-w-[calc(100vw-420px)]'
            : 'w-auto'
        }`}
      >
        {/* Drawer Header & Tabs (IMAGE 2: Halls | Jobs | Power) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                setActiveTab('halls')
                if (!isOpen) setIsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                currentTab === 'halls' && isOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Halls</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('jobs')
                if (!isOpen) setIsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                currentTab === 'jobs' && isOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Jobs ({jobs.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('power')
                if (!isOpen) setIsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                currentTab === 'power' && isOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Power</span>
            </button>
          </div>

          {/* Toggle Expand / Minimize */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer text-[11px] font-mono"
            title={isOpen ? 'Minimize Table' : 'Expand Live Operations Table'}
          >
            <span>{isOpen ? 'Collapse' : 'Expand'}</span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expanded Content */}
        {isOpen && (
          <div className="p-2.5 sm:p-3 overflow-x-auto max-h-[175px] overflow-y-auto">
            {/* TAB 1: HALLS TABLE MATCHING IMAGE 2 */}
            {currentTab === 'halls' && (
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 bg-[#0B1726]/95 backdrop-blur-md">
                    <th className="py-1 px-2.5">Hall</th>
                    <th className="py-1 px-2.5">Status</th>
                    <th className="py-1 px-2.5">Racks</th>
                    <th className="py-1 px-2.5">GPU Util</th>
                    <th className="py-1 px-2.5">IT Load</th>
                    <th className="py-1 px-2.5">Cooling</th>
                    <th className="py-1 px-2.5">PUE</th>
                    <th className="py-1 px-2.5">Temp (In/Out)</th>
                    <th className="py-1 px-2.5 text-right">Active Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {hallTableRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectHall(row.id)}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-1.5 px-2.5 font-bold text-white group-hover:text-cyan-300">
                        {row.name}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.status === 'Online'
                                ? 'bg-emerald-400'
                                : 'bg-amber-400 animate-pulse'
                            }`}
                          />
                          <span
                            className={
                              row.status === 'Online' ? 'text-slate-300' : 'text-amber-300'
                            }
                          >
                            {row.status}
                          </span>
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300">{row.racks}</td>
                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 font-semibold">{row.gpuUtil}%</span>
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                              style={{ width: `${row.gpuUtil}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 text-cyan-300 font-semibold">{row.itLoadMw} MW</td>
                      <td className="py-1.5 px-2.5 text-slate-300">{row.coolingMw} MW</td>
                      <td className="py-1.5 px-2.5 text-emerald-400 font-semibold">{row.pue.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 text-slate-300">
                        <span className="text-cyan-300">{row.tempIn}°C</span> /{' '}
                        <span className="text-rose-400">{row.tempOut}°C</span>
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-white">
                        {row.activeJobs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TAB 2: JOBS TABLE */}
            {currentTab === 'jobs' && (
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 bg-[#0B1726]/95 backdrop-blur-md">
                    <th className="py-1 px-2.5">Job ID</th>
                    <th className="py-1 px-2.5">Workload</th>
                    <th className="py-1 px-2.5">Rack</th>
                    <th className="py-1 px-2.5">Progress</th>
                    <th className="py-1 px-2.5">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {filteredJobs.slice(0, 6).map((job) => (
                    <tr key={job.id} className="hover:bg-slate-800/40">
                      <td className="py-1.5 px-2.5 font-semibold text-white">{job.id}</td>
                      <td className="py-1.5 px-2.5 max-w-[200px] truncate">{job.name}</td>
                      <td className="py-1.5 px-2.5 text-cyan-300">{job.assignedRackId || 'Queue'}</td>
                      <td className="py-1.5 px-2.5">{job.progress}%</td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 uppercase">
                          {job.stage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TAB 3: POWER TABLE */}
            {currentTab === 'power' && (
              <div className="grid grid-cols-3 gap-3 text-xs font-mono p-1">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Primary Grid Feed</div>
                  <div className="text-base font-bold text-white mt-1">84.2 MW @ 50.02 Hz</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">132 kV Substation Tied</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Backup Generator Yard</div>
                  <div className="text-base font-bold text-amber-300 mt-1">12x 3.5 MVA Standby</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">72-Hour Fuel Reserve Ready</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">UPS Energy Storage</div>
                  <div className="text-base font-bold text-cyan-300 mt-1">Flywheel & LiFePO4</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">N+2 Redundant // 99.999% SLA</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
