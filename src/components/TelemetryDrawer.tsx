import React, { useState } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type { JobStage } from '../types/simulation'
import {
  Server,
  Terminal,
  AlertOctagon,
  ChevronUp,
  ChevronDown,
  Search,
  ExternalLink,
} from 'lucide-react'

interface TelemetryDrawerProps {
  activeTab: 'racks' | 'jobs' | 'incidents'
  setActiveTab: (tab: 'racks' | 'jobs' | 'incidents') => void
  stageFilter: JobStage | null
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  activeTab,
  setActiveTab,
  stageFilter,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const {
    racks,
    jobs,
    incidents,
    focusAssetById,
    resolveIncident,
  } = useSimulation()

  // Filter Racks
  const filteredRacks = racks.filter(
    (r) =>
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.gpuType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter Jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.assignedRackId && j.assignedRackId.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStage = stageFilter ? j.stage === stageFilter : true
    return matchesSearch && matchesStage
  })

  // Filter Incidents
  const filteredIncidents = incidents.filter(
    (i) =>
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.affectedAssetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved').length

  return (
    <div className="absolute bottom-4 right-3 sm:right-5 z-20 pointer-events-none">
      <div
        className={`glass-panel rounded-2xl pointer-events-auto transition-all duration-300 shadow-2xl flex flex-col ${
          isOpen ? 'w-[92vw] sm:w-[580px] md:w-[680px] h-[360px]' : 'w-auto'
        }`}
      >
        {/* Drawer Header & Tabs */}
        <div className="flex items-center justify-between p-2 sm:p-2.5 border-b border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('racks')
                if (!isOpen) setIsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'racks' && isOpen
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Racks ({racks.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('jobs')
                if (!isOpen) setIsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'jobs' && isOpen
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Jobs ({jobs.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('incidents')
                if (!isOpen) setIsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer relative ${
                activeTab === 'incidents' && isOpen
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>Incidents</span>
              {activeIncidents > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                  {activeIncidents}
                </span>
              )}
            </button>
          </div>

          {/* Toggle Expand / Collapse */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title={isOpen ? 'Minimize Drawer' : 'Expand Live Telemetry Table'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Table Content */}
        {isOpen && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            {/* Search Filter Bar */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={`Filter ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Tab 1: RACKS TABLE */}
            {activeTab === 'racks' && (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 bg-[#0B1726]/95 backdrop-blur-md">
                      <th className="py-1.5 px-2">Rack ID</th>
                      <th className="py-1.5 px-2">Hall</th>
                      <th className="py-1.5 px-2">GPU Util</th>
                      <th className="py-1.5 px-2">Temp</th>
                      <th className="py-1.5 px-2">Power</th>
                      <th className="py-1.5 px-2">Status</th>
                      <th className="py-1.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {filteredRacks.map((rack) => (
                      <tr
                        key={rack.id}
                        onClick={() => focusAssetById(rack.id)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-2 px-2 font-semibold text-white flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rack.hasFault
                                ? 'bg-rose-400 animate-ping'
                                : rack.gpuUtilisation > 85
                                ? 'bg-amber-400'
                                : 'bg-cyan-400'
                            }`}
                          />
                          {rack.id}
                        </td>
                        <td className="py-2 px-2 text-slate-400">
                          {rack.hallId === 'hall-a' ? 'Hall A' : 'Hall B'}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-8">{rack.gpuUtilisation}%</span>
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${rack.gpuUtilisation}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-2 px-2 ${
                            rack.temperature > 75
                              ? 'text-rose-400 font-bold'
                              : rack.temperature > 60
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {rack.temperature}°C
                        </td>
                        <td className="py-2 px-2">{rack.powerKw.toFixed(1)} kW</td>
                        <td className="py-2 px-2">
                          {rack.hasFault ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                              Fault
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                              Nominal
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              focusAssetById(rack.id)
                            }}
                            className="p-1 rounded text-cyan-400 hover:bg-cyan-500/20"
                            title="Focus in 3D"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: JOBS TABLE */}
            {activeTab === 'jobs' && (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 bg-[#0B1726]/95 backdrop-blur-md">
                      <th className="py-1.5 px-2">Job ID</th>
                      <th className="py-1.5 px-2">Workload</th>
                      <th className="py-1.5 px-2">Assigned Rack</th>
                      <th className="py-1.5 px-2">Progress</th>
                      <th className="py-1.5 px-2">Stage</th>
                      <th className="py-1.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => job.assignedRackId && focusAssetById(job.assignedRackId)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-2 font-semibold text-white">{job.id}</td>
                        <td className="py-2 px-2 max-w-[160px] truncate text-slate-200" title={job.name}>
                          {job.name}
                        </td>
                        <td className="py-2 px-2 text-cyan-300">{job.assignedRackId || '—'}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-7">{job.progress}%</span>
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              job.stage === 'running'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : job.stage === 'checkpoint'
                                ? 'bg-purple-500/20 text-purple-300'
                                : job.stage === 'evaluating'
                                ? 'bg-amber-500/20 text-amber-300'
                                : job.stage === 'done'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-700/40 text-slate-400'
                            }`}
                          >
                            {job.stage}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          {job.assignedRackId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                focusAssetById(job.assignedRackId!)
                              }}
                              className="p-1 rounded text-cyan-400 hover:bg-cyan-500/20"
                              title="Focus Assigned Rack"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: INCIDENTS TABLE */}
            {activeTab === 'incidents' && (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 bg-[#0B1726]/95 backdrop-blur-md">
                      <th className="py-1.5 px-2">Incident ID</th>
                      <th className="py-1.5 px-2">Asset</th>
                      <th className="py-1.5 px-2">Title</th>
                      <th className="py-1.5 px-2">Status</th>
                      <th className="py-1.5 px-2">Duration</th>
                      <th className="py-1.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {filteredIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => focusAssetById(inc.affectedAssetId)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-2 font-semibold text-amber-400">{inc.id}</td>
                        <td className="py-2 px-2 text-cyan-300 font-semibold">{inc.affectedAssetId}</td>
                        <td className="py-2 px-2 max-w-[140px] truncate" title={inc.title}>
                          {inc.title}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              inc.status === 'Resolved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : inc.status === 'Repairing'
                                ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-400">{inc.elapsedSeconds}s</td>
                        <td className="py-2 px-2 text-right">
                          {inc.status !== 'Resolved' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                resolveIncident(inc.id)
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold border border-emerald-400/30 cursor-pointer"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-[10px]">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
