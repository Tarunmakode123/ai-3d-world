import React from 'react'
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
  Wind,
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

  if (!selectedObject) return null

  const handleClose = () => {
    setSelectedObject(null)
  }

  const handleFocus = () => {
    focusOnPosition(selectedObject.position, [0, 0.5, 0], selectedObject.type === 'rack' ? 14 : 22)
  }

  const renderRackDetails = (rack: ServerRack) => {
    const activeJob = jobs.find((j) => j.assignedRackId === rack.id)

    return (
      <div className="space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
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
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-400/30">
            {rack.hallId === 'hall-a' ? 'Hall Alpha' : 'Hall Beta'} // Row {rack.row + 1}
          </span>
        </div>

        {/* Hardware Specifications */}
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Compute Architecture
          </div>
          <div className="text-sm font-semibold text-white">{rack.gpuType}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">8x SXM5 SXM Socketed GPUs // NVLink-4 Mesh</div>
        </div>

        {/* Primary Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* GPU Utilisation */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-cyan-400" /> Utilisation
            </div>
            <div className="text-lg font-bold font-mono text-white">{rack.gpuUtilisation}%</div>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${rack.gpuUtilisation}%` }} />
            </div>
          </div>

          {/* Temperature */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Thermometer className="w-3 h-3 text-amber-400" /> Core Temp
            </div>
            <div
              className={`text-lg font-bold font-mono ${
                rack.temperature > 75 ? 'text-rose-400' : rack.temperature > 60 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {rack.temperature}°C
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">Delta-T: +14.2°C</div>
          </div>

          {/* Power Draw */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-blue-400" /> Power Draw
            </div>
            <div className="text-lg font-bold font-mono text-white">{rack.powerKw.toFixed(2)} kW</div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">415V 3-Phase Bus</div>
          </div>

          {/* Memory VRAM */}
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <HardDrive className="w-3 h-3 text-purple-400" /> HBM3e Memory
            </div>
            <div className="text-lg font-bold font-mono text-white">{rack.memoryUtilisation}%</div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">640 GB / 768 GB</div>
          </div>
        </div>

        {/* Airflow / Cooling */}
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-mono text-slate-300">Cooling Airflow</div>
              <div className="text-[10px] text-slate-400 font-mono">Cold Aisle Underfloor Plenum</div>
            </div>
          </div>
          <div className="text-sm font-mono font-bold text-cyan-300">{rack.coolingAirflowCfm} CFM</div>
        </div>

        {/* Active AI Job */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-cyan-500/20">
          <div className="text-[10px] font-mono text-cyan-400 mb-1 uppercase font-semibold">Current Workload</div>
          {activeJob ? (
            <div>
              <div className="text-xs font-semibold text-white">{activeJob.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Framework: {activeJob.framework} // {activeJob.stage.toUpperCase()} ({activeJob.progress}%)
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono">Running Distributed Inference Pipeline Worker</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
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

  const renderCoolingDetails = (cool: CoolingUnit) => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-cyan-500/30">
          <div className="text-xs font-mono text-cyan-400 uppercase">Subsystem Type</div>
          <div className="text-base font-bold text-white mt-0.5">{cool.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-1">Zone: West Mechanical Yard (Zone C)</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Thermometer className="w-3 h-3 text-cyan-400" /> Loop Temp
            </div>
            <div className="text-lg font-bold font-mono text-cyan-300">{cool.temperature}°C</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-cyan-400" /> Cooling Load
            </div>
            <div className="text-lg font-bold font-mono text-white">{cool.coolingLoad}%</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Droplet className="w-3 h-3 text-blue-400" /> Water Flow
            </div>
            <div className="text-lg font-bold font-mono text-white">{cool.waterFlowLps} L/s</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <RotateCw className="w-3 h-3 text-emerald-400" /> Fan Speed
            </div>
            <div className="text-lg font-bold font-mono text-emerald-300">{cool.fanRpm} RPM</div>
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

  const renderPowerDetails = (power: PowerUnit) => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-blue-500/30">
          <div className="text-xs font-mono text-blue-400 uppercase">Power Infrastructure Node</div>
          <div className="text-base font-bold text-white mt-0.5">{power.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-1">Status: {power.operationalStatus}</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-blue-400" /> Output Load
            </div>
            <div className="text-lg font-bold font-mono text-white">{power.powerOutputMw.toFixed(1)} MW</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Gauge className="w-3 h-3 text-emerald-400" /> Frequency
            </div>
            <div className="text-lg font-bold font-mono text-emerald-300">{power.frequencyHz.toFixed(2)} Hz</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-amber-400" /> Fuel Level
            </div>
            <div className="text-lg font-bold font-mono text-amber-300">{power.fuelLevelPct}%</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Health
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 uppercase">Nominal</div>
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

  const renderHallDetails = (hall: DataHall) => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-cyan-500/30">
          <div className="text-xs font-mono text-cyan-400 uppercase">Compute Hall Facility</div>
          <div className="text-base font-bold text-white mt-0.5">{hall.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1">GPU Racks</div>
            <div className="text-lg font-bold font-mono text-white">{hall.totalRacks} Units</div>
            <div className="text-[10px] font-mono text-cyan-400 mt-1">192x NVIDIA GPUs</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Total Power</div>
            <div className="text-lg font-bold font-mono text-blue-300">{hall.totalPowerMw} MW</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Avg Utilisation</div>
            <div className="text-lg font-bold font-mono text-emerald-300">{hall.avgUtilisation}%</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Hall Temp</div>
            <div className="text-lg font-bold font-mono text-amber-300">{hall.avgTempC}°C</div>
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

  const renderVehicleDetails = (veh: Vehicle) => {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-amber-500/30">
          <div className="text-xs font-mono text-amber-400 uppercase flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Autonomous Campus Logistics
          </div>
          <div className="text-base font-bold text-white mt-0.5">{veh.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-1">Status: {veh.status}</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Battery Level</div>
            <div className="text-lg font-bold font-mono text-emerald-300">{veh.batteryPct}%</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 mb-1">Telemetry Speed</div>
            <div className="text-lg font-bold font-mono text-cyan-300">{veh.speed} km/h</div>
          </div>
        </div>

        <button
          onClick={handleFocus}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" /> Follow Vehicle in 3D
        </button>
      </div>
    )
  }

  return (
    <aside className="absolute top-16 right-3 sm:right-5 z-20 w-80 sm:w-96 max-h-[calc(100vh-140px)] overflow-y-auto glass-panel rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
            Asset Telemetry // {selectedObject.type.toUpperCase()}
          </span>
          <h3 className="text-base font-bold font-display text-white">{selectedObject.name}</h3>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Content */}
      {selectedObject.type === 'rack' && renderRackDetails(selectedObject.data as ServerRack)}
      {selectedObject.type === 'cooling' && renderCoolingDetails(selectedObject.data as CoolingUnit)}
      {selectedObject.type === 'power' && renderPowerDetails(selectedObject.data as PowerUnit)}
      {selectedObject.type === 'hall' && renderHallDetails(selectedObject.data as DataHall)}
      {selectedObject.type === 'vehicle' && renderVehicleDetails(selectedObject.data as Vehicle)}
      {selectedObject.type === 'network' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-cyan-500/30">
            <div className="text-xs font-mono text-cyan-400 uppercase">Ultra-High Bandwidth Optical Fabric</div>
            <div className="text-base font-bold text-white mt-0.5">{selectedObject.name}</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 mb-1">Throughput</div>
              <div className="text-lg font-bold font-mono text-cyan-300">340.2 Tbps</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 mb-1">Latency</div>
              <div className="text-lg font-bold font-mono text-emerald-300">18 µs</div>
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
