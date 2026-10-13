export type AreaId = 'overview' | 'hall-a' | 'hall-b' | 'cooling' | 'power' | 'network'

export type WeatherType = 'clear' | 'heatwave' | 'monsoon' | 'storm'

export type DayNightMode = 'day' | 'night'

export type HealthStatus = 'healthy' | 'warning' | 'critical'

export type JobStage = 'queued' | 'scheduled' | 'running' | 'checkpoint' | 'evaluating' | 'done' | 'archived'

export type AssetType = 'rack' | 'cooling' | 'power' | 'network' | 'hall' | 'vehicle' | 'gate' | 'dock' | 'parking'

export interface AIJob {
  id: string
  name: string
  modelType: string
  framework: 'PyTorch 2.4' | 'JAX' | 'TensorFlow' | 'DeepSpeed'
  stage: JobStage
  progress: number // 0-100
  assignedRackId: string | null
  priority: 'High' | 'Normal' | 'Batch'
  etaMinutes: number
  tokensPerSec: number
  startTime: number
}

export interface ServerRack {
  id: string
  hallId: 'hall-a' | 'hall-b'
  row: number
  col: number
  position: [number, number, number]
  gpuType: 'NVIDIA H100 SXM5' | 'NVIDIA H200' | 'NVIDIA B200 NVL' | 'Google TPU v5p'
  gpuCount: number
  gpuUtilisation: number // 0 - 100%
  temperature: number // 32 - 85 °C
  powerKw: number // 5 - 16 kW
  memoryUtilisation: number // 0 - 100%
  coolingAirflowCfm: number
  health: HealthStatus
  currentJobId: string | null
  hasFault: boolean
}

export interface CoolingUnit {
  id: string
  name: string
  type: 'tower' | 'chiller' | 'pump'
  temperature: number
  coolingLoad: number // %
  waterFlowLps: number
  fanRpm: number
  health: HealthStatus
  position: [number, number, number]
}

export interface PowerUnit {
  id: string
  name: string
  type: 'generator' | 'transformer' | 'substation'
  powerOutputMw: number
  operationalStatus: 'Standby' | 'Active' | 'Grid-Tied' | 'Testing'
  fuelLevelPct: number
  frequencyHz: number
  health: HealthStatus
  position: [number, number, number]
}

export interface NetworkUnit {
  id: string
  name: string
  type: 'vault' | 'uplink' | 'switch'
  throughputTbps: number
  packetLossPct: number
  latencyUs: number
  health: HealthStatus
  position: [number, number, number]
}

export interface Vehicle {
  id: string
  name: string
  type: 'service_cart' | 'delivery_truck'
  status: 'Patrolling' | 'En Route' | 'Repairing' | 'Delivering' | 'Departing' | 'Idle'
  batteryPct: number
  targetAssetId: string | null
  speed: number
  position: [number, number, number]
  rotation: number
}

export interface Incident {
  id: string
  affectedAssetId: string
  assetType: AssetType
  title: string
  description: string
  severity: 'warning' | 'critical' | 'info'
  status: 'Detected' | 'Assigned' | 'Repairing' | 'Resolved'
  timestamp: number
  elapsedSeconds: number
}

export interface DataHall {
  id: 'hall-a' | 'hall-b'
  name: string
  totalRacks: number
  gpuRacksCount: number
  totalGpus: number
  activeJobsCount: number
  avgUtilisation: number
  totalPowerMw: number
  itLoadMw: number
  coolingMw: number
  pue: number
  inletTempC: number
  outletTempC: number
  airflowCfm: number
  position: [number, number, number]
}

export interface HallTableRow {
  id: string
  name: string
  status: 'Online' | 'Maintenance' | 'Degraded' | 'Commissioning'
  racks: number
  gpuUtil: number
  itLoadMw: number
  coolingMw: number
  pue: number
  tempIn: number
  tempOut: number
  activeJobs: number
}

export interface OverallMetrics {
  gpuUtilisation: number
  gpuUtilTrend: number
  activeGpus: number
  totalGpus: number
  powerDrawMw: number
  totalItLoadMw: number
  pue: number
  pueTrend: number
  jobsInQueue: number
  jobsQueueTrend: number
  estWaitTimeMin: number
  totalComputePFlops: number
  activeJobs: number
  completedJobsTotal: number
  coolingDemandPct: number
  gridFrequencyHz: number
  workloadCounts?: {
    queued: number
    scheduled: number
    running: number
    checkpoint: number
    completed: number
    archived: number
  }
}

export interface SelectedObject {
  id: string
  name: string
  type: AssetType
  position: [number, number, number]
  data: ServerRack | CoolingUnit | PowerUnit | NetworkUnit | DataHall | Vehicle | Record<string, unknown>
}

export interface InWorldBadge {
  id: string
  title: string
  subtitle?: string
  status?: string
  position: [number, number, number]
  type: AssetType
}
