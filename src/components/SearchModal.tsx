import React, { useState, useEffect, useRef } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import { Search, X, Server, Wind, Zap, Network, Building2, Truck, ArrowRight } from 'lucide-react'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    racks,
    coolingUnits,
    powerUnits,
    networkUnits,
    dataHalls,
    vehicles,
    focusAssetById,
  } = useSimulation()

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Global keydown: Ctrl+K or / opens, Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isOpen)) {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Build searchable index
  const allItems = [
    ...racks.map((r) => ({
      id: r.id,
      name: `${r.id} (${r.gpuType})`,
      category: 'Server Rack',
      type: 'rack',
      icon: <Server className="w-4 h-4 text-cyan-400" />,
      sub: `${r.hallId === 'hall-a' ? 'Hall Alpha' : 'Hall Beta'} // ${r.gpuUtilisation}% Load`,
    })),
    ...coolingUnits.map((c) => ({
      id: c.id,
      name: c.name,
      category: 'Cooling Unit',
      type: 'cooling',
      icon: <Wind className="w-4 h-4 text-cyan-400" />,
      sub: `${c.coolingLoad}% Load // ${c.temperature}°C`,
    })),
    ...powerUnits.map((p) => ({
      id: p.id,
      name: p.name,
      category: 'Power Substation',
      type: 'power',
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      sub: `${p.operationalStatus} // ${p.powerOutputMw} MW`,
    })),
    ...networkUnits.map((n) => ({
      id: n.id,
      name: n.name,
      category: 'Network Fabric',
      type: 'network',
      icon: <Network className="w-4 h-4 text-emerald-400" />,
      sub: `${n.throughputTbps} Tbps Optical Uplink`,
    })),
    ...dataHalls.map((h) => ({
      id: h.id,
      name: h.name,
      category: 'Compute Hall',
      type: 'hall',
      icon: <Building2 className="w-4 h-4 text-purple-400" />,
      sub: `${h.totalRacks} Racks // ${h.totalPowerMw} MW`,
    })),
    ...vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      category: 'Autonomous Vehicle',
      type: 'vehicle',
      icon: <Truck className="w-4 h-4 text-amber-400" />,
      sub: `${v.status} // ${v.speed} km/h`,
    })),
  ]

  const filteredItems = allItems.filter(
    (item) =>
      item.id.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (id: string) => {
    focusAssetById(id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg glass-panel-highlight rounded-2xl shadow-2xl overflow-hidden border border-cyan-500/30">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-cyan-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search racks (e.g. RACK-A-002), cooling, power, vehicles..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 font-mono focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-cyan-500/40">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.2 rounded bg-slate-800">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.sub}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              <p>No matching infrastructure assets found for "{query}"</p>
              <p className="text-[11px] text-slate-600 mt-1">Try "RACK-A-001", "COOL-TWR", "SUBSTATION", or "TRUCK"</p>
            </div>
          )}
        </div>

        {/* Search Footer Tips */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 text-[10px] font-mono text-slate-400 flex justify-between">
          <span>Use ESC to cancel</span>
          <span>Clicking focuses 3D camera & telemetry</span>
        </div>
      </div>
    </div>
  )
}
