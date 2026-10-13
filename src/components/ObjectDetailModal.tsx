import React, { useState } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type {
  ServerRack,
  CoolingUnit,
  PowerUnit,
  DataHall,
  Vehicle,
} from '../types/simulation'
import {
  X,
  Cpu,
  Thermometer,
  Zap,
  Activity,
  HardDrive,
  Crosshair,
  Wrench,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Gauge,
  Droplet,
  Truck,
} from 'lucide-react'

export const ObjectDetailModal: React.FC = () => {
  const {
    selectedObject,
    setSelectedObject,
    focusOnPosition,
    triggerIncidentInjection,
    triggerGeneratorTest,
    jobs,
  } = useSimulation()

  const [activeTab, setActiveTab] = useState<'overview' | 'racks' | 'cooling' | 'power'>('overview')

  if (!selectedObject) return null

  const handleClose = () => {
    setSelectedObject(null)
  }

  const handleFocus = () => {
    focusOnPosition(selectedObject.position, [0, 0.5, 0], selectedObject.type === 'rack' ? 14 : 26)
  }

  // Specialized Hall A / Hall B view matching IMAGE 2
  const renderHallDetails = (hall: DataHall) => {
    return (
      <div className="space-y-3.5">
        {/* Navigation Tabs (IMAGE 2) */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
          {(['overview', 'racks', 'cooling', 'power'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md capitalize transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Isometric Cluster Schematic Graphic (IMAGE 2) */}
            <div className="relative w-full h-24 rounded-lg bg-slate-950/70 border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
              <svg viewBox="0 0 280 90" className="w-full h-full opacity-90">
                <defs>
                  <linearGradient id="aisleGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                  </linearGradient>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="280" height="90" fill="url(#grid)" />
                {/* 3D Isometric Server Row Blocks */}
                {/* Row 1 */}
                <path d="M 40,30 L 120,10 L 140,20 L 60,40 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />
                <path d="M 60,40 L 140,20 L 140,42 L 60,62 Z" fill="#0f172a" stroke="#06b6d4" strokeWidth="0.8" />
                {/* Cold Aisle Blue Glow */}
                <path d="M 65,42 L 145,22 L 155,27 L 75,47 Z" fill="rgba(6,182,212,0.25)" />
                {/* Row 2 */}
                <path d="M 80,48 L 160,28 L 180,38 L 100,58 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />
                <path d="M 100,58 L 180,38 L 180,60 L 100,80 Z" fill="#0f172a" stroke="#06b6d4" strokeWidth="0.8" />
                {/* Hot Aisle Red Accent */}
                <path d="M 105,60 L 185,40 L 195,45 L 115,65 Z" fill="rgba(244,63,94,0.2)" />
                {/* Row 3 */}
                <path d="M 120,66 L 200,46 L 220,56 L 140,76 Z" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" />
                <path d="M 140,76 L 220,56 L 220,78 L 140,98 Z" fill="#0f172a" stroke="#3b82f6" strokeWidth="0.8" />
                {/* Little pulsing LED markers */}
                <circle cx="70" cy="50" r="1.5" fill="#22d3ee" className="animate-pulse" />
                <circle cx="110" cy="68" r="1.5" fill="#22d3ee" className="animate-pulse" />
                <circle cx="150" cy="85" r="1.5" fill="#22d3ee" className="animate-pulse" />
              </svg>
              <div className="absolute top-1.5 right-2 text-[9px] font-mono text-cyan-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-500/30">
                ACTIVE CLUSTER MESH
              </div>
            </div>

            {/* Hall Key Statistics Grid (IMAGE 2) */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Total Racks</span>
                <span className="text-base font-bold text-white mt-0.5 block">{hall.totalRacks.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">GPU Racks</span>
                <span className="text-base font-bold text-white mt-0.5 block">{hall.gpuRacksCount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Total GPUs</span>
                <span className="text-base font-bold text-white mt-0.5 block">{hall.totalGpus.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">IT Load</span>
                <span className="text-base font-bold text-cyan-300 mt-0.5 block">{hall.itLoadMw.toFixed(1)} MW</span>
              </div>
            </div>

            {/* Utilisation Gauge (IMAGE 2: 92%) */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300 font-medium">Utilisation</span>
                <span className="text-cyan-300 font-bold">{hall.avgUtilisation}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                  style={{ width: `${hall.avgUtilisation}%` }}
                />
              </div>
            </div>

            {/* Inlet / Outlet Air Meter (IMAGE 2) */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Inlet Air</span>
                  <span className="text-cyan-300 font-bold">{hall.inletTempC}°C</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(hall.inletTempC / 40) * 100}%` }} />
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Outlet Air</span>
                  <span className="text-rose-400 font-bold">{hall.outletTempC}°C</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(hall.outletTempC / 45) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Secondary Meters: Cooling & Power (IMAGE 2) */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Cooling</span>
                  <span className="text-slate-200 font-bold">{hall.coolingMw.toFixed(1)} MW</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Power</span>
                  <span className="text-slate-200 font-bold">{hall.totalPowerMw.toFixed(1)} MW</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'racks' && (
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Row A1 - A16 (NVIDIA H100)</span>
              <span className="text-emerald-400">448 Racks Nominal</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Row B1 - B16 (NVIDIA B200)</span>
              <span className="text-cyan-400">448 Racks Nominal</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Storage & InfiniBand Fabric</span>
              <span className="text-slate-200">128 Racks Nominal</span>
            </div>
          </div>
        )}

        {activeTab === 'cooling' && (
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Direct-to-Chip Liquid Loop</span>
                <span className="text-cyan-300 font-bold">16.4°C</span>
              </div>
              <div className="text-[10px] text-slate-500">Flow Rate: 420 L/min | Pressure: 2.4 Bar</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Rear-Door Heat Exchangers</span>
                <span className="text-emerald-400 font-bold">Nominal</span>
              </div>
              <div className="text-[10px] text-slate-500">99.2% Heat Rejection Efficiency</div>
            </div>
          </div>
        )}

        {activeTab === 'power' && (
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Busway A/B Redundancy</span>
                <span className="text-emerald-400 font-bold">2N Dual Feed</span>
              </div>
              <div className="text-[10px] text-slate-500">415V AC Phase Balance: 99.8%</div>
            </div>
          </div>
        )}

        <button
          onClick={handleFocus}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer mt-2"
        >
          <Crosshair className="w-3.5 h-3.5" /> Center 3D View
        </button>
      </div>
    )
  }

  // Generic Rack View
  const renderRackDetails = (rack: ServerRack) => {
    const activeJob = jobs.find((j) => j.assignedRackId === rack.id)

    return (
      <div className="space-y-3.5">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
          <div className="flex items-center gap-2">
            {rack.health === 'healthy' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
            )}
            <span className="text-xs font-mono font-semibold uppercase text-slate-200">
              {rack.health === 'healthy' ? 'Operational' : 'Thermal Alert Active'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-400/30">
            {rack.hallId === 'hall-a' ? 'Hall A' : 'Hall B'} // Row {rack.row + 1}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 mb-1 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Architecture
          </div>
          <div className="text-sm font-semibold text-white">{rack.gpuType}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">8x SXM5 Socketed GPUs // NVLink-4 Mesh</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Activity className="w-3 h-3 text-cyan-400" /> Utilisation
            </div>
            <div className="text-base font-bold text-white">{rack.gpuUtilisation}%</div>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${rack.gpuUtilisation}%` }} />
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Thermometer className="w-3 h-3 text-amber-400" /> Core Temp
            </div>
            <div
              className={`text-base font-bold ${
                rack.temperature > 75 ? 'text-rose-400' : rack.temperature > 60 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {rack.temperature}°C
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Delta-T: +14.2°C</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Zap className="w-3 h-3 text-blue-400" /> Power Draw
            </div>
            <div className="text-base font-bold text-white">{rack.powerKw.toFixed(1)} kW</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <HardDrive className="w-3 h-3 text-purple-400" /> VRAM
            </div>
            <div className="text-base font-bold text-white">{rack.memoryUtilisation}%</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/20 text-xs font-mono">
          <div className="text-[10px] text-cyan-400 mb-1 uppercase font-semibold">Current Workload</div>
          {activeJob ? (
            <div>
              <div className="font-semibold text-white">{activeJob.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {activeJob.framework} // {activeJob.stage.toUpperCase()} ({activeJob.progress}%)
              </div>
            </div>
          ) : (
            <div className="text-slate-400">Running Distributed Inference Pipeline Worker</div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleFocus}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" /> Center 3D View
          </button>
          <button
            onClick={triggerIncidentInjection}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-mono transition-colors cursor-pointer"
            title="Inject simulated thermal fault"
          >
            <Wrench className="w-3.5 h-3.5" /> Inject Fault
          </button>
        </div>
      </div>
    )
  }

  // Cooling Unit View (Towers / Chillers)
  const renderCoolingDetails = (cool: CoolingUnit) => {
    return (
      <div className="space-y-3.5">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/30">
          <div className="text-[10px] font-mono text-cyan-400 uppercase">Cooling Subsystem</div>
          <div className="text-sm font-bold text-white mt-0.5">{cool.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">West Utility Yard // Closed Loop Hydronic</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Thermometer className="w-3 h-3 text-cyan-400" /> Loop Temp
            </div>
            <div className="text-base font-bold text-cyan-300">{cool.temperature}°C</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Activity className="w-3 h-3 text-cyan-400" /> Load
            </div>
            <div className="text-base font-bold text-white">{cool.coolingLoad}%</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Droplet className="w-3 h-3 text-blue-400" /> Water Flow
            </div>
            <div className="text-base font-bold text-white">{cool.waterFlowLps} L/s</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <RotateCw className="w-3 h-3 text-emerald-400" /> Fan Speed
            </div>
            <div className="text-base font-bold text-emerald-300">{cool.fanRpm} RPM</div>
          </div>
        </div>

        <button
          onClick={handleFocus}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" /> Center 3D View
        </button>
      </div>
    )
  }

  // Power Unit View (Substation / Gensets / Fuel Tanks)
  const renderPowerDetails = (power: PowerUnit) => {
    return (
      <div className="space-y-3.5">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-blue-500/30">
          <div className="text-[10px] font-mono text-blue-400 uppercase">Power Infrastructure Node</div>
          <div className="text-sm font-bold text-white mt-0.5">{power.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">Status: {power.operationalStatus}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Zap className="w-3 h-3 text-blue-400" /> Output Load
            </div>
            <div className="text-base font-bold text-white">{power.powerOutputMw.toFixed(1)} MW</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Gauge className="w-3 h-3 text-emerald-400" /> Frequency
            </div>
            <div className="text-base font-bold text-emerald-300">{power.frequencyHz.toFixed(2)} Hz</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Activity className="w-3 h-3 text-amber-400" /> Fuel Level
            </div>
            <div className="text-base font-bold text-amber-300">{power.fuelLevelPct}%</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Health
            </div>
            <div className="text-xs font-bold text-emerald-400 uppercase">Nominal</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFocus}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" /> Center 3D View
          </button>
          <button
            onClick={triggerGeneratorTest}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-300 text-xs font-mono transition-colors cursor-pointer"
            title="Simulate Generator Load Test"
          >
            <RotateCw className="w-3.5 h-3.5" /> Test Load
          </button>
        </div>
      </div>
    )
  }

  // Vehicles / Logistics
  const renderVehicleDetails = (veh: Vehicle) => {
    return (
      <div className="space-y-3.5">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-amber-500/30">
          <div className="text-[10px] font-mono text-amber-400 uppercase flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> Logistics
          </div>
          <div className="text-sm font-bold text-white mt-0.5">{veh.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">Status: {veh.status}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Battery Level</span>
            <span className="text-base font-bold text-emerald-300 mt-0.5 block">{veh.batteryPct}%</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Speed</span>
            <span className="text-base font-bold text-cyan-300 mt-0.5 block">{veh.speed} km/h</span>
          </div>
        </div>

        <button
          onClick={handleFocus}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" /> Follow Vehicle
        </button>
      </div>
    )
  }

  return (
    <aside className="w-full glass-panel rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-in slide-in-from-right-4">
      {/* Header matching IMAGE 2 */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold font-display tracking-wide text-white uppercase">
            {selectedObject.name}
          </h3>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Content */}
      {selectedObject.type === 'hall' && renderHallDetails(selectedObject.data as DataHall)}
      {selectedObject.type === 'rack' && renderRackDetails(selectedObject.data as ServerRack)}
      {selectedObject.type === 'cooling' && renderCoolingDetails(selectedObject.data as CoolingUnit)}
      {selectedObject.type === 'power' && renderPowerDetails(selectedObject.data as PowerUnit)}
      {selectedObject.type === 'vehicle' && renderVehicleDetails(selectedObject.data as Vehicle)}
      {selectedObject.type === 'network' && (
        <div className="space-y-3.5">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/30">
            <div className="text-[10px] font-mono text-cyan-400 uppercase">Optical Interconnect Vault</div>
            <div className="text-sm font-bold text-white mt-0.5">{selectedObject.name}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Bandwidth</span>
              <span className="text-base font-bold text-cyan-300 mt-0.5 block">340.2 Tbps</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Latency</span>
              <span className="text-base font-bold text-emerald-300 mt-0.5 block">18 µs</span>
            </div>
          </div>
          <button
            onClick={handleFocus}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" /> Center 3D View
          </button>
        </div>
      )}
    </aside>
  )
}
