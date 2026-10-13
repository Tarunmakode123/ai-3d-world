import React, { useState } from 'react'
import { SimulationProvider, useSimulation } from './simulation/SimulationContext'
import { CorelineCanvas } from './scene/CorelineCanvas'
import { TopNav } from './components/TopNav'
import { KpiCards } from './components/KpiCards'
import { ObjectDetailModal } from './components/ObjectDetailModal'
import { JobLifecycleTracker } from './components/JobLifecycleTracker'
import { TelemetryDrawer } from './components/TelemetryDrawer'
import { SearchModal } from './components/SearchModal'
import { SettingsModal } from './components/SettingsModal'
import { CinematicOverlay } from './components/CinematicOverlay'
import type { JobStage } from './types/simulation'
import { Flame, CloudLightning, AlertTriangle } from 'lucide-react'

const CorelineDashboard: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [activeTableTab, setActiveTableTab] = useState<'racks' | 'jobs' | 'incidents'>('racks')
  const [stageFilter, setStageFilter] = useState<JobStage | null>(null)

  const { weather, incidents } = useSimulation()

  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved')

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07111F] text-[#F1F5F9] font-sans">
      {/* 1. 3D WebGL Canvas Layer (Full viewport) */}
      <CorelineCanvas />

      {/* 2. Top Navigation Bar */}
      <TopNav
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenInfo={() => setIsSettingsOpen(true)}
      />

      {/* 3. Three Primary KPI Cards */}
      <KpiCards />

      {/* 4. Weather or Incident Alert Banner (Subtle, non-intrusive notification) */}
      {weather === 'heatwave' && (
        <div className="pointer-events-none absolute top-36 left-3 sm:left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-mono backdrop-blur-md animate-pulse">
          <Flame className="w-3.5 h-3.5" />
          <span>HEATWAVE ADVISORY: Elevated cooling demand (+16%), PUE nominal threshold adjusted</span>
        </div>
      )}

      {weather === 'storm' && (
        <div className="pointer-events-none absolute top-36 left-3 sm:left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-400/40 text-blue-300 text-xs font-mono backdrop-blur-md animate-pulse">
          <CloudLightning className="w-3.5 h-3.5" />
          <span>STORM CONTINGENCY: Lightning protection active, backup gensets on standby</span>
        </div>
      )}

      {activeIncidents.length > 0 && weather !== 'heatwave' && weather !== 'storm' && (
        <div className="pointer-events-none absolute top-36 left-3 sm:left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/40 text-rose-300 text-xs font-mono backdrop-blur-md">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          <span>INCIDENT DETECTED: {activeIncidents[0].title}</span>
        </div>
      )}

      {/* 5. Right-Side Object Detail Panel */}
      <ObjectDetailModal />

      {/* 6. Bottom-Left Job Lifecycle Pipeline Tracker */}
      <JobLifecycleTracker
        selectedStageFilter={stageFilter}
        onSelectStageFilter={setStageFilter}
        onOpenJobsTab={() => setActiveTableTab('jobs')}
      />

      {/* 7. Bottom-Right Live Telemetry Table Drawer */}
      <TelemetryDrawer
        activeTab={activeTableTab}
        setActiveTab={setActiveTableTab}
        stageFilter={stageFilter}
      />

      {/* 8. Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* 9. Settings & Help Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 10. Cinematic Auto-Tour Overlay */}
      <CinematicOverlay />
    </div>
  )
}

export function App() {
  return (
    <SimulationProvider>
      <CorelineDashboard />
    </SimulationProvider>
  )
}

export default App
