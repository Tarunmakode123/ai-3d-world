import React, { useState, useEffect } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type {
  AreaId,
  WeatherType,
} from '../types/simulation'
import {
  Cpu,
  Search,
  Sun,
  Moon,
  CloudRain,
  Flame,
  CloudLightning,
  Sparkles,
  Volume2,
  VolumeX,
  Thermometer,
  Video,
  Info,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

interface TopNavProps {
  onOpenSearch: () => void
  onOpenInfo: () => void
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenSearch, onOpenInfo }) => {
  const {
    weather,
    setWeather,
    dayNight,
    toggleDayNight,
    currentArea,
    setCurrentArea,
    isCinematic,
    toggleCinematic,
    isHeatOverlay,
    toggleHeatOverlay,
    soundEnabled,
    toggleSound,
    incidents,
  } = useSimulation()

  const [timeString, setTimeString] = useState<string>('')

  // Live Facility Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeString(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' UTC'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'Resolved').length

  const areaList: { id: AreaId; label: string }[] = [
    { id: 'overview', label: 'Campus' },
    { id: 'hall-a', label: 'Hall A' },
    { id: 'hall-b', label: 'Hall B' },
    { id: 'cooling', label: 'Cooling' },
    { id: 'power', label: 'Power' },
    { id: 'network', label: 'Network' },
  ]

  const weatherOptions: { type: WeatherType; icon: React.ReactNode; label: string }[] = [
    { type: 'clear', icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Clear' },
    { type: 'heatwave', icon: <Flame className="w-3.5 h-3.5" />, label: 'Heatwave' },
    { type: 'monsoon', icon: <CloudRain className="w-3.5 h-3.5" />, label: 'Monsoon' },
    { type: 'storm', icon: <CloudLightning className="w-3.5 h-3.5" />, label: 'Storm' },
  ]

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2.5 sm:px-5 sm:py-3 pointer-events-none">
      <div className="flex flex-wrap items-center justify-between gap-2 max-w-[1920px] mx-auto">
        {/* Brand & Mission Status */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg glass-panel-highlight">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-400/40 text-cyan-400">
              <Cpu className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wider font-display text-white">CORELINE</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/30">
                  v2.4-OPS
                </span>
              </div>
              <div className="text-[10px] tracking-widest text-slate-400 uppercase font-mono hidden sm:block">
                AI Data Centre Operations
              </div>
            </div>
          </div>

          {/* Operational Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-panel-subtle text-xs font-mono">
            {activeIncidentsCount > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="text-amber-400 font-semibold">{activeIncidentsCount} INCIDENT ACTIVE</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">ALL SYSTEMS NOMINAL</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Area Switcher Navigation */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl glass-panel-subtle pointer-events-auto">
          {areaList.map((area) => (
            <button
              key={area.id}
              onClick={() => setCurrentArea(area.id)}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-all duration-200 cursor-pointer ${
                currentArea === area.id
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {area.label}
            </button>
          ))}
        </div>

        {/* Right Controls: Weather, Day/Night, Cinematic, Search, Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg glass-panel-subtle text-xs text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors cursor-pointer"
            title="Search Assets (Press /)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline text-slate-400 font-mono text-[11px]">Search (Ctrl+K)</span>
          </button>

          {/* Weather Switcher */}
          <div className="flex items-center p-0.5 rounded-lg glass-panel-subtle">
            {weatherOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setWeather(opt.type)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  weather === opt.type
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Weather: ${opt.label}`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          {/* Heat Overlay Toggle */}
          <button
            onClick={toggleHeatOverlay}
            className={`p-1.5 rounded-lg glass-panel-subtle transition-colors cursor-pointer ${
              isHeatOverlay ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Thermal Heatmap Overlay"
          >
            <Thermometer className="w-4 h-4" />
          </button>

          {/* Day / Night Toggle */}
          <button
            onClick={toggleDayNight}
            className="p-1.5 rounded-lg glass-panel-subtle text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title={`Toggle Day/Night (Currently: ${dayNight})`}
          >
            {dayNight === 'day' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Cinematic Tour Toggle */}
          <button
            onClick={toggleCinematic}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass-panel-subtle transition-colors cursor-pointer text-xs font-mono ${
              isCinematic
                ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50 animate-pulse'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Cinematic Tour"
          >
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline text-[11px]">Tour</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg glass-panel-subtle transition-colors cursor-pointer ${
              soundEnabled ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Facility Clock */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-panel-subtle text-xs font-mono text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeString}</span>
          </div>

          {/* Help & Info */}
          <button
            onClick={onOpenInfo}
            className="p-1.5 rounded-lg glass-panel-subtle text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="System Documentation & Controls"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
