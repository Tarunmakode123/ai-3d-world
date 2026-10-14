import React, { useState, useEffect } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type { WeatherType } from '../types/simulation'
import {
  Cpu,
  Search,
  Sun,
  Moon,
  CloudSun,
  Flame,
  CloudRain,
  CloudLightning,
  Volume2,
  VolumeX,
  Thermometer,
  Info,
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Sparkles,
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
    isCinematic,
    toggleCinematic,
    isHeatOverlay,
    toggleHeatOverlay,
    soundEnabled,
    toggleSound,
    incidents,
    showFacilityBadges,
    toggleFacilityBadges,
    isPanelsCollapsed,
    togglePanelsCollapsed,
  } = useSimulation()

  const [timeString, setTimeString] = useState<string>('Mon, 12 May 2025 20:24:17')
  const [isCampusMenuOpen, setIsCampusMenuOpen] = useState(false)
  const [selectedCampus, setSelectedCampus] = useState('Riverside Campus')
  const [isWeatherMenuOpen, setIsWeatherMenuOpen] = useState(false)

  // Live Facility Clock formatted like IMAGE 2
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const dayName = days[now.getDay()]
      const dateNum = now.getDate()
      const monthName = months[now.getMonth()]
      const year = now.getFullYear()
      const timePart = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setTimeString(`${dayName}, ${dateNum} ${monthName} ${year} ${timePart}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'Resolved').length || 3

  const weatherDisplayMap: Record<WeatherType, { temp: string; desc: string; icon: React.ReactNode }> = {
    clear: { temp: '12°C', desc: 'Partly cloudy', icon: <CloudSun className="w-3.5 h-3.5 text-cyan-400" /> },
    heatwave: { temp: '38°C', desc: 'Heatwave advisory', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    monsoon: { temp: '11°C', desc: 'Heavy monsoon', icon: <CloudRain className="w-3.5 h-3.5 text-blue-400" /> },
    storm: { temp: '9°C', desc: 'Severe storm', icon: <CloudLightning className="w-3.5 h-3.5 text-indigo-400" /> },
  }

  const currentWeatherInfo = weatherDisplayMap[weather]

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2 sm:px-5 sm:py-2.5 pointer-events-none">
      <div className="flex items-center justify-between gap-3 max-w-[1920px] mx-auto">
        {/* Left: Brand & Search bar */}
        <div className="flex items-center gap-3 sm:gap-4 pointer-events-auto">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5 py-1">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/15 border border-cyan-400/50 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              <Cpu className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-widest font-display text-white">CORELINE</span>
              </div>
              <div className="text-[9px] tracking-wider text-slate-400 uppercase font-mono font-medium hidden sm:block">
                AI INFRASTRUCTURE. REAL INTELLIGENCE.
              </div>
            </div>
          </div>

          {/* Search Input Box directly in Top Nav (IMAGE 2) */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 hover:border-cyan-500/50 text-xs text-slate-400 hover:text-slate-200 transition-all duration-200 shadow-inner group w-56 lg:w-72"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            <span className="font-sans text-[11px] text-slate-400 group-hover:text-slate-300 truncate">
              Search racks, jobs, halls...
            </span>
            <kbd className="ml-auto font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Controls: Campus, Weather, Clock, Alerts, Day/Night toggle, Utilities */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Mobile search trigger */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Campus Selector Pill */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setIsCampusMenuOpen(!isCampusMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-slate-600 text-xs font-mono text-slate-200 transition-colors"
            >
              <span>{selectedCampus}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isCampusMenuOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 w-44 rounded-lg bg-slate-900/95 border border-slate-700 shadow-2xl py-1 backdrop-blur-md">
                {['Riverside Campus', 'Silicon Plateau (East)', 'Nordic Sub-Zero (Facility 4)'].map((campus) => (
                  <button
                    key={campus}
                    onClick={() => {
                      setSelectedCampus(campus)
                      setIsCampusMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                      selectedCampus === campus ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {campus}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Weather Pill */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setIsWeatherMenuOpen(!isWeatherMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-slate-600 text-xs font-mono text-slate-200 transition-colors"
              title="Change simulated weather conditions"
            >
              {currentWeatherInfo.icon}
              <span>{currentWeatherInfo.temp}</span>
              <span className="text-slate-400 font-normal">{currentWeatherInfo.desc}</span>
            </button>
            {isWeatherMenuOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-lg bg-slate-900/95 border border-slate-700 shadow-2xl py-1 backdrop-blur-md">
                {(['clear', 'heatwave', 'monsoon', 'storm'] as WeatherType[]).map((wKey) => {
                  const info = weatherDisplayMap[wKey]
                  return (
                    <button
                      key={wKey}
                      onClick={() => {
                        setWeather(wKey)
                        setIsWeatherMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-colors ${
                        weather === wKey ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {info.icon}
                      <span>{info.desc}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Date & Time with Pulsing Green Live Dot */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/70 text-xs font-mono text-slate-200">
            <span>{timeString}</span>
            <div className="flex items-center gap-1 pl-1 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live</span>
            </div>
          </div>

          {/* Alerts Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeIncidentsCount} Alerts</span>
          </div>

          {/* Segmented Day | Night Toggle Switch (IMAGE 2) */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-mono">
            <button
              onClick={() => dayNight !== 'day' && toggleDayNight()}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                dayNight === 'day'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span className="text-[11px]">Day</span>
            </button>
            <button
              onClick={() => dayNight !== 'night' && toggleDayNight()}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                dayNight === 'night'
                  ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3 h-3 text-cyan-400" />
              <span className="text-[11px]">Night</span>
            </button>
          </div>

          {/* Quick Utility Icon Group */}
          <div className="flex items-center gap-1 pl-1">
            {/* Facility Badges In-World Toggle */}
            <button
              onClick={toggleFacilityBadges}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showFacilityBadges
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                  : 'bg-slate-900/70 border-slate-800 text-slate-500 hover:text-slate-200'
              }`}
              title={showFacilityBadges ? 'Hide Facility Labels' : 'Show Facility Labels'}
            >
              {showFacilityBadges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {/* Collapse / Expand UI HUD Panels (Clean 3D View) */}
            <button
              onClick={togglePanelsCollapsed}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isPanelsCollapsed
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/50'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isPanelsCollapsed ? 'Show Operations HUD' : 'Collapse HUD (Clean View)'}
            >
              {isPanelsCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Heat Overlay Toggle */}
            <button
              onClick={toggleHeatOverlay}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isHeatOverlay
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400/50'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Thermal Heatmap Overlay"
            >
              <Thermometer className="w-3.5 h-3.5" />
            </button>

            {/* Cinematic Showcase Mode Trigger */}
            <button
              onClick={toggleCinematic}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold transition-all cursor-pointer ${
                isCinematic
                  ? 'bg-purple-500/30 text-purple-300 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse'
                  : 'bg-purple-950/60 hover:bg-purple-900/70 border-purple-500/40 text-purple-300 hover:text-white shadow-sm'
              }`}
              title="Launch Cinematic Architectural Showcase (C)"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Showcase</span>
            </button>

            {/* Sound FX Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Info */}
            <button
              onClick={onOpenInfo}
              className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Campus Specs & Help"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
