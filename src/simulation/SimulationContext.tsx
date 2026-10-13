import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type {
  AreaId,
  WeatherType,
  DayNightMode,
  ServerRack,
  CoolingUnit,
  PowerUnit,
  NetworkUnit,
  DataHall,
  AIJob,
  Incident,
  Vehicle,
  OverallMetrics,
  SelectedObject,
} from '../types/simulation'
import {
  generateInitialRacks,
  initialCoolingUnits,
  initialPowerUnits,
  initialNetworkUnits,
  initialDataHalls,
  initialJobs,
  initialIncidents,
  initialVehicles,
} from './mockData'
import { soundManager } from './soundEffects'

interface SimulationContextType {
  // World Environment
  weather: WeatherType
  setWeather: (w: WeatherType) => void
  dayNight: DayNightMode
  setDayNight: (d: DayNightMode) => void
  toggleDayNight: () => void

  // Navigation & Camera
  currentArea: AreaId
  setCurrentArea: (area: AreaId) => void
  selectedObject: SelectedObject | null
  setSelectedObject: (obj: SelectedObject | null) => void
  isCinematic: boolean
  setIsCinematic: (c: boolean) => void
  toggleCinematic: () => void
  isHeatOverlay: boolean
  setIsHeatOverlay: (h: boolean) => void
  toggleHeatOverlay: () => void

  // Camera Focus Target for smooth 3D interpolation
  cameraFocus: {
    target: [number, number, number]
    lookAt: [number, number, number]
    zoomDistance?: number
    timestamp: number
  } | null
  focusOnPosition: (pos: [number, number, number], lookAtOffset?: [number, number, number], distance?: number) => void

  // Telemetry & State
  racks: ServerRack[]
  coolingUnits: CoolingUnit[]
  powerUnits: PowerUnit[]
  networkUnits: NetworkUnit[]
  dataHalls: DataHall[]
  jobs: AIJob[]
  incidents: Incident[]
  vehicles: Vehicle[]
  metrics: OverallMetrics

  // Actions
  triggerIncidentInjection: () => void
  triggerGeneratorTest: () => void
  resolveIncident: (id: string) => void
  focusAssetById: (id: string) => void
  soundEnabled: boolean
  toggleSound: () => boolean
}

const SimulationContext = createContext<SimulationContextType | null>(null)

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [weather, setWeatherState] = useState<WeatherType>('clear')
  const [dayNight, setDayNight] = useState<DayNightMode>('night') // default futuristic night/dusk vibe
  const [currentArea, setCurrentAreaState] = useState<AreaId>('overview')
  const [selectedObject, setSelectedObjectState] = useState<SelectedObject | null>(null)
  const [isCinematic, setIsCinematic] = useState<boolean>(false)
  const [isHeatOverlay, setIsHeatOverlay] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false)

  // Camera focus trigger
  const [cameraFocus, setCameraFocus] = useState<{
    target: [number, number, number]
    lookAt: [number, number, number]
    zoomDistance?: number
    timestamp: number
  } | null>(null)

  // Simulation Entities
  const [racks, setRacks] = useState<ServerRack[]>(() => generateInitialRacks())
  const [coolingUnits] = useState<CoolingUnit[]>(initialCoolingUnits)
  const [powerUnits, setPowerUnits] = useState<PowerUnit[]>(initialPowerUnits)
  const [networkUnits] = useState<NetworkUnit[]>(initialNetworkUnits)
  const [dataHalls] = useState<DataHall[]>(initialDataHalls)
  const [jobs, setJobs] = useState<AIJob[]>(initialJobs)
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents)
  const [vehicles] = useState<Vehicle[]>(initialVehicles)

  // Overall KPIs
  const [metrics, setMetrics] = useState<OverallMetrics>({
    gpuUtilisation: 76.5,
    powerDrawMw: 10.42,
    pue: 1.14,
    totalComputePFlops: 1420.8,
    activeJobs: 8,
    completedJobsTotal: 124,
    coolingDemandPct: 78.0,
    gridFrequencyHz: 50.01,
  })

  const newJobCounterRef = useRef(2055)
  const incidentCounterRef = useRef(105)

  const toggleSound = useCallback(() => {
    const next = soundManager.toggle()
    setSoundEnabled(next)
    return next
  }, [])

  const toggleDayNight = useCallback(() => {
    setDayNight((prev) => (prev === 'day' ? 'night' : 'day'))
    soundManager.playClick()
  }, [])

  const toggleCinematic = useCallback(() => {
    setIsCinematic((prev) => !prev)
    soundManager.playWarp()
  }, [])

  const toggleHeatOverlay = useCallback(() => {
    setIsHeatOverlay((prev) => !prev)
    soundManager.playClick()
  }, [])

  const setWeather = useCallback((w: WeatherType) => {
    setWeatherState(w)
    soundManager.playClick()
  }, [])

  const focusOnPosition = useCallback(
    (pos: [number, number, number], lookAtOffset: [number, number, number] = [0, 0, 0], distance: number = 24) => {
      // Calculate sensible camera offset angle (elevated 3/4 isometric perspective)
      const camTarget: [number, number, number] = [
        pos[0] + distance * 0.7,
        pos[1] + distance * 0.85,
        pos[2] + distance * 0.7,
      ]
      const camLookAt: [number, number, number] = [
        pos[0] + lookAtOffset[0],
        pos[1] + lookAtOffset[1],
        pos[2] + lookAtOffset[2],
      ]
      setCameraFocus({
        target: camTarget,
        lookAt: camLookAt,
        zoomDistance: distance,
        timestamp: Date.now(),
      })
    },
    []
  )

  const setSelectedObject = useCallback((obj: SelectedObject | null) => {
    setSelectedObjectState(obj)
    if (obj) {
      soundManager.playSelect()
    }
  }, [])

  const setCurrentArea = useCallback(
    (area: AreaId) => {
      setCurrentAreaState(area)
      soundManager.playClick()

      // Area camera presets
      switch (area) {
        case 'overview':
          focusOnPosition([0, 0, 0], [0, 0, 0], 55)
          break
        case 'hall-a':
          focusOnPosition([-26, 2, 6], [0, 0, 0], 28)
          break
        case 'hall-b':
          focusOnPosition([26, 2, 6], [0, 0, 0], 28)
          break
        case 'cooling':
          focusOnPosition([-20, 2, -26], [0, 0, 0], 25)
          break
        case 'power':
          focusOnPosition([26, 2, -20], [0, 0, 0], 26)
          break
        case 'network':
          focusOnPosition([0, 1.5, -20], [0, 0, 0], 22)
          break
      }
    },
    [focusOnPosition]
  )

  // Focus asset by ID from search, tables, or alerts
  const focusAssetById = useCallback(
    (id: string) => {
      // Search in Racks
      const rack = racks.find((r) => r.id === id)
      if (rack) {
        setSelectedObject({
          id: rack.id,
          name: `${rack.id} (${rack.gpuType})`,
          type: 'rack',
          position: rack.position,
          data: rack,
        })
        focusOnPosition(rack.position, [0, 0.5, 0], 14)
        return
      }

      // Search in Cooling
      const cool = coolingUnits.find((c) => c.id === id)
      if (cool) {
        setSelectedObject({
          id: cool.id,
          name: cool.name,
          type: 'cooling',
          position: cool.position,
          data: cool,
        })
        focusOnPosition(cool.position, [0, 1, 0], 18)
        return
      }

      // Search in Power
      const power = powerUnits.find((p) => p.id === id)
      if (power) {
        setSelectedObject({
          id: power.id,
          name: power.name,
          type: 'power',
          position: power.position,
          data: power,
        })
        focusOnPosition(power.position, [0, 1, 0], 18)
        return
      }

      // Search in Network
      const net = networkUnits.find((n) => n.id === id)
      if (net) {
        setSelectedObject({
          id: net.id,
          name: net.name,
          type: 'network',
          position: net.position,
          data: net,
        })
        focusOnPosition(net.position, [0, 1, 0], 18)
        return
      }

      // Search in Halls
      const hall = dataHalls.find((h) => h.id === id)
      if (hall) {
        setSelectedObject({
          id: hall.id,
          name: hall.name,
          type: 'hall',
          position: hall.position,
          data: hall,
        })
        focusOnPosition(hall.position, [0, 0, 0], 30)
        return
      }

      // Search in Vehicles
      const veh = vehicles.find((v) => v.id === id)
      if (veh) {
        setSelectedObject({
          id: veh.id,
          name: veh.name,
          type: 'vehicle',
          position: veh.position,
          data: veh,
        })
        focusOnPosition(veh.position, [0, 0.5, 0], 15)
        return
      }
    },
    [racks, coolingUnits, powerUnits, networkUnits, dataHalls, vehicles, setSelectedObject, focusOnPosition]
  )

  // Resolve an incident
  const resolveIncident = useCallback((id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === id) {
          return { ...inc, status: 'Resolved' }
        }
        return inc
      })
    )
    // Clear fault on asset
    setRacks((prev) =>
      prev.map((r) => {
        const matchingInc = incidents.find((inc) => inc.id === id && inc.affectedAssetId === r.id)
        if (matchingInc) {
          return { ...r, hasFault: false, health: 'healthy' }
        }
        return r
      })
    )
    soundManager.playClick()
  }, [incidents])

  // Trigger generator test (Storm or Manual)
  const triggerGeneratorTest = useCallback(() => {
    setPowerUnits((prev) =>
      prev.map((p) => {
        if (p.type === 'generator') {
          return {
            ...p,
            operationalStatus: 'Testing',
            powerOutputMw: 3.5,
          }
        }
        return p
      })
    )
    soundManager.playAlert()

    setTimeout(() => {
      setPowerUnits((prev) =>
        prev.map((p) => {
          if (p.type === 'generator') {
            return {
              ...p,
              operationalStatus: 'Standby',
              powerOutputMw: 0.0,
            }
          }
          return p
        })
      )
    }, 15000)
  }, [])

  // Inject a simulated fault for demonstration
  const triggerIncidentInjection = useCallback(() => {
    const candidateRacks = racks.filter((r) => !r.hasFault)
    if (candidateRacks.length === 0) return
    const randomRack = candidateRacks[Math.floor(Math.random() * candidateRacks.length)]
    const newIncId = `INC-${String(incidentCounterRef.current++).padStart(4, '0')}`

    const newIncident: Incident = {
      id: newIncId,
      affectedAssetId: randomRack.id,
      assetType: 'rack',
      title: `Subsystem Thermal Variance [${randomRack.id}]`,
      description: `Cooling manifold delta-T alert in aisle row ${randomRack.row + 1}. Auto dispatching service cart.`,
      severity: 'warning',
      status: 'Detected',
      timestamp: Date.now(),
      elapsedSeconds: 0,
    }

    setIncidents((prev) => [newIncident, ...prev])
    setRacks((prev) =>
      prev.map((r) => (r.id === randomRack.id ? { ...r, hasFault: true, health: 'warning', temperature: 84 } : r))
    )

    soundManager.playAlert()
  }, [racks])

  // Continuous Simulation Tick (every 1.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Advance AI Jobs through 6-stage lifecycle
      setJobs((prevJobs) => {
        let jobCompletedCount = 0
        const updated = prevJobs.map((job) => {
          if (job.stage === 'queued') {
            // Chance to move to scheduled
            return { ...job, stage: 'scheduled' as const }
          }
          if (job.stage === 'scheduled') {
            return { ...job, stage: 'running' as const, progress: 5 }
          }
          if (job.stage === 'running') {
            const nextProgress = job.progress + Math.floor(Math.random() * 8) + 4
            if (nextProgress >= 100) {
              return { ...job, stage: 'checkpoint' as const, progress: 100 }
            }
            return { ...job, progress: nextProgress }
          }
          if (job.stage === 'checkpoint') {
            return { ...job, stage: 'evaluating' as const, progress: 20 }
          }
          if (job.stage === 'evaluating') {
            const nextProgress = job.progress + 25
            if (nextProgress >= 100) {
              jobCompletedCount++
              return { ...job, stage: 'done' as const, progress: 100 }
            }
            return { ...job, progress: nextProgress }
          }
          // 'done' stage
          return job
        })

        // If a job finished, spawn a new fresh queued job
        if (jobCompletedCount > 0) {
          const newJobNum = newJobCounterRef.current++
          const workloads = [
            'DeepSeek-R1 Mathematical Reasoning',
            'Sora-Style Temporal Latent DiT',
            'Llama-3.3 70B Multi-Turn RLHF',
            'AlphaFold-Multimer Complex Refinement',
            'Whisper-v3 Speech MoE Fine-Tuning',
            'Quantum Circuit Clifford Simulator',
            'Genomics Variant Calling Pipeline',
          ]
          const frameworks: AIJob['framework'][] = ['PyTorch 2.4', 'DeepSpeed', 'JAX', 'TensorFlow']
          const newJob: AIJob = {
            id: `JOB-${newJobNum}`,
            name: workloads[Math.floor(Math.random() * workloads.length)],
            modelType: 'Next-Gen Transformer',
            framework: frameworks[Math.floor(Math.random() * frameworks.length)],
            stage: 'queued',
            progress: 0,
            assignedRackId: null,
            priority: Math.random() > 0.4 ? 'High' : 'Normal',
            etaMinutes: 120 + Math.floor(Math.random() * 240),
            tokensPerSec: 0,
            startTime: Date.now(),
          }

          setMetrics((m) => ({
            ...m,
            completedJobsTotal: m.completedJobsTotal + jobCompletedCount,
          }))

          return [newJob, ...updated.slice(0, 15)]
        }

        return updated
      })

      // 2. Telemetry drift for Server Racks (fluctuate slightly according to load)
      setRacks((prevRacks) => {
        return prevRacks.map((r) => {
          const jitter = (Math.random() - 0.5) * 3
          const newUtil = Math.min(100, Math.max(20, Math.round(r.gpuUtilisation + jitter)))
          const baseTemp = 38 + newUtil * 0.4 + (r.hasFault ? 25 : 0)
          const newTemp = Math.round(baseTemp + (Math.random() - 0.5) * 1.5)
          const newPower = parseFloat((6.5 + (newUtil / 100) * 8.5).toFixed(2))
          return {
            ...r,
            gpuUtilisation: newUtil,
            temperature: newTemp,
            powerKw: newPower,
          }
        })
      })

      // 3. Update Incident progress & Technician dispatch
      setIncidents((prevIncidents) => {
        return prevIncidents.map((inc) => {
          if (inc.status === 'Resolved') {
            return inc
          }
          const nextSec = inc.elapsedSeconds + 2
          let nextStatus: Incident['status'] = inc.status
          if (inc.status === 'Detected' && nextSec >= 6) {
            nextStatus = 'Assigned'
          } else if (inc.status === 'Assigned' && nextSec >= 16) {
            nextStatus = 'Repairing'
          } else if (inc.status === 'Repairing' && nextSec >= 36) {
            nextStatus = 'Resolved'
            // Auto repair rack
            setRacks((rs) =>
              rs.map((r) => (r.id === inc.affectedAssetId ? { ...r, hasFault: false, health: 'healthy', temperature: 46 } : r))
            )
          }
          return {
            ...inc,
            elapsedSeconds: nextSec,
            status: nextStatus,
          }
        })
      })

      // 4. Update overall metrics (PUE, Total MW, GPU Util) based on current environment and load
      setRacks((currentRacks) => {
        const totalRackKw = currentRacks.reduce((acc, r) => acc + r.powerKw, 0)
        const avgGpu = currentRacks.reduce((acc, r) => acc + r.gpuUtilisation, 0) / currentRacks.length

        // Weather multiplier on cooling and PUE
        let weatherPuePenalty = 0.0
        let weatherCoolingBonus = 0
        if (weather === 'heatwave') {
          weatherPuePenalty = 0.08
          weatherCoolingBonus = 16
        } else if (weather === 'monsoon' || weather === 'storm') {
          weatherPuePenalty = -0.02
          weatherCoolingBonus = -5
        }

        const basePue = 1.12 + (avgGpu / 100) * 0.06 + weatherPuePenalty
        const totalPowerMw = parseFloat(((totalRackKw / 1000) * basePue).toFixed(2))

        setMetrics((prev) => ({
          ...prev,
          gpuUtilisation: Math.round(avgGpu * 10) / 10,
          powerDrawMw: totalPowerMw,
          pue: Math.max(1.04, Math.round(basePue * 100) / 100),
          coolingDemandPct: Math.min(99, Math.round(avgGpu * 0.95 + weatherCoolingBonus)),
          gridFrequencyHz: Math.round((50.0 + (Math.random() - 0.5) * 0.04) * 100) / 100,
        }))

        // Keep current selected object data fresh
        setSelectedObjectState((currentSel) => {
          if (!currentSel) return null
          if (currentSel.type === 'rack') {
            const freshRack = currentRacks.find((r) => r.id === currentSel.id)
            if (freshRack) {
              return { ...currentSel, data: freshRack }
            }
          }
          return currentSel
        })

        return currentRacks
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [weather])

  return (
    <SimulationContext.Provider
      value={{
        weather,
        setWeather,
        dayNight,
        setDayNight,
        toggleDayNight,
        currentArea,
        setCurrentArea,
        selectedObject,
        setSelectedObject,
        isCinematic,
        setIsCinematic,
        toggleCinematic,
        isHeatOverlay,
        setIsHeatOverlay,
        toggleHeatOverlay,
        cameraFocus,
        focusOnPosition,
        racks,
        coolingUnits,
        powerUnits,
        networkUnits,
        dataHalls,
        jobs,
        incidents,
        vehicles,
        metrics,
        triggerIncidentInjection,
        triggerGeneratorTest,
        resolveIncident,
        focusAssetById,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}

export const useSimulation = () => {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider')
  return ctx
}
