import type {
  ServerRack,
  CoolingUnit,
  PowerUnit,
  NetworkUnit,
  DataHall,
  AIJob,
  Incident,
  Vehicle,
  HallTableRow,
  InWorldBadge,
} from '../types/simulation'

// Generate 96 detailed GPU Racks distributed across Hall A (48 racks) and Hall B (48 racks)
export function generateInitialRacks(): ServerRack[] {
  const racks: ServerRack[] = []
  const gpuTypesA: ServerRack['gpuType'][] = ['NVIDIA H100 SXM5', 'NVIDIA H200']
  const gpuTypesB: ServerRack['gpuType'][] = ['NVIDIA B200 NVL', 'Google TPU v5p']

  // Hall A: 48 racks (6 rows of 8 racks)
  const hallARowZs = [-24, -18, -12, -6, 0, 6]
  hallARowZs.forEach((rowZ, rowIndex) => {
    for (let col = 0; col < 8; col++) {
      const rackNumber = rowIndex * 8 + col + 1
      const id = `RACK-A-${String(rackNumber).padStart(3, '0')}`
      const posX = -22 + col * 3.1
      const posZ = rowZ
      const isHighLoad = (rowIndex + col) % 3 === 0
      const baseUtil = isHighLoad ? 91 + Math.floor(Math.random() * 8) : 82 + Math.floor(Math.random() * 12)
      const baseTemp = 42 + Math.floor(baseUtil * 0.35)
      const basePower = 9.8 + (baseUtil / 100) * 5.4

      racks.push({
        id,
        hallId: 'hall-a',
        row: rowIndex + 1,
        col: col + 1,
        position: [posX, 1.9, posZ],
        gpuType: gpuTypesA[(rowIndex + col) % gpuTypesA.length],
        gpuCount: 8,
        gpuUtilisation: baseUtil,
        temperature: baseTemp,
        powerKw: parseFloat(basePower.toFixed(2)),
        memoryUtilisation: Math.min(99, baseUtil + 4),
        coolingAirflowCfm: Math.floor(820 + baseUtil * 8.5),
        health: 'healthy',
        currentJobId: null,
        hasFault: false,
      })
    }
  })

  // Hall B: 48 racks (6 rows of 8 racks)
  const hallBRowZs = [-24, -18, -12, -6, 0, 6]
  hallBRowZs.forEach((rowZ, rowIndex) => {
    for (let col = 0; col < 8; col++) {
      const rackNumber = rowIndex * 8 + col + 1
      const id = `RACK-B-${String(rackNumber).padStart(3, '0')}`
      const posX = 12 + col * 3.1
      const posZ = rowZ
      const isHighLoad = (rowIndex + col) % 2 === 0
      const baseUtil = isHighLoad ? 74 + Math.floor(Math.random() * 18) : 58 + Math.floor(Math.random() * 16)
      const baseTemp = 39 + Math.floor(baseUtil * 0.32)
      const basePower = 7.8 + (baseUtil / 100) * 6.5

      racks.push({
        id,
        hallId: 'hall-b',
        row: rowIndex + 1,
        col: col + 1,
        position: [posX, 1.9, posZ],
        gpuType: gpuTypesB[(rowIndex + col) % gpuTypesB.length],
        gpuCount: 8,
        gpuUtilisation: baseUtil,
        temperature: baseTemp,
        powerKw: parseFloat(basePower.toFixed(2)),
        memoryUtilisation: Math.min(98, baseUtil + 6),
        coolingAirflowCfm: Math.floor(750 + baseUtil * 7.5),
        health: 'healthy',
        currentJobId: null,
        hasFault: false,
      })
    }
  })

  return racks
}

export const initialCoolingUnits: CoolingUnit[] = [
  {
    id: 'COOL-TWR-01',
    name: 'Cooling Tower Bank A (55 MW)',
    type: 'tower',
    temperature: 24.2,
    coolingLoad: 88,
    waterFlowLps: 420,
    fanRpm: 920,
    health: 'healthy',
    position: [-38, 4.5, -28],
  },
  {
    id: 'COOL-TWR-02',
    name: 'Cooling Tower Bank B (55 MW)',
    type: 'tower',
    temperature: 24.8,
    coolingLoad: 92,
    waterFlowLps: 450,
    fanRpm: 960,
    health: 'healthy',
    position: [-28, 4.5, -28],
  },
  {
    id: 'COOL-TWR-03',
    name: 'Cooling Tower Bank C (55 MW)',
    type: 'tower',
    temperature: 23.9,
    coolingLoad: 84,
    waterFlowLps: 410,
    fanRpm: 880,
    health: 'healthy',
    position: [-18, 4.5, -28],
  },
  {
    id: 'CHILLER-01',
    name: 'Liquid Chiller Plant (48 MW)',
    type: 'chiller',
    temperature: 14.8,
    coolingLoad: 90,
    waterFlowLps: 580,
    fanRpm: 1250,
    health: 'healthy',
    position: [-28, 2.0, -14],
  },
]

export const initialPowerUnits: PowerUnit[] = [
  {
    id: 'SUBSTATION-MAIN',
    name: 'High-Voltage Power Substation (132 MW)',
    type: 'substation',
    powerOutputMw: 84.2,
    operationalStatus: 'Active',
    fuelLevelPct: 100,
    frequencyHz: 50.01,
    health: 'healthy',
    position: [-42, 3.5, 2],
  },
  {
    id: 'GEN-BACKUP-01',
    name: 'Backup Diesel Generators (48 MW)',
    type: 'generator',
    powerOutputMw: 0.0,
    operationalStatus: 'Standby',
    fuelLevelPct: 98,
    frequencyHz: 50.0,
    health: 'healthy',
    position: [-42, 2.4, 18],
  },
  {
    id: 'FUEL-TANKS-01',
    name: 'Fuel Tanks (1,200 m³ / >72h reserve)',
    type: 'transformer',
    powerOutputMw: 0.0,
    operationalStatus: 'Active',
    fuelLevelPct: 96,
    frequencyHz: 50.0,
    health: 'healthy',
    position: [-30, 3.2, 26],
  },
]

export const initialNetworkUnits: NetworkUnit[] = [
  {
    id: 'NET-VAULT-01',
    name: 'Fibre Entry Vault (8 × 400G)',
    type: 'vault',
    throughputTbps: 320.0,
    packetLossPct: 0.00001,
    latencyUs: 14,
    health: 'healthy',
    position: [26, 2.5, -28],
  },
]

export const initialDataHalls: DataHall[] = [
  {
    id: 'hall-a',
    name: 'HALL A // FOUNDATION AI TRAINING',
    totalRacks: 1024,
    gpuRacksCount: 896,
    totalGpus: 71680,
    activeJobsCount: 892,
    avgUtilisation: 92,
    totalPowerMw: 45.6,
    itLoadMw: 42.1,
    coolingMw: 14.2,
    pue: 1.17,
    inletTempC: 18,
    outletTempC: 32,
    airflowCfm: 58000,
    position: [-6, 5.0, -4],
  },
  {
    id: 'hall-b',
    name: 'HALL B // INFERENCE & MOE CLUSTER',
    totalRacks: 768,
    gpuRacksCount: 680,
    totalGpus: 54400,
    activeJobsCount: 536,
    avgUtilisation: 64,
    totalPowerMw: 32.4,
    itLoadMw: 28.4,
    coolingMw: 9.8,
    pue: 1.19,
    inletTempC: 18,
    outletTempC: 31,
    airflowCfm: 44000,
    position: [16, 5.0, -14],
  },
]

export const initialHallTableRows: HallTableRow[] = [
  {
    id: 'hall-a',
    name: 'Hall A',
    status: 'Online',
    racks: 1024,
    gpuUtil: 92,
    itLoadMw: 42.1,
    coolingMw: 14.2,
    pue: 1.17,
    tempIn: 18,
    tempOut: 32,
    activeJobs: 892,
  },
  {
    id: 'hall-b',
    name: 'Hall B',
    status: 'Online',
    racks: 768,
    gpuUtil: 64,
    itLoadMw: 28.4,
    coolingMw: 9.8,
    pue: 1.19,
    tempIn: 18,
    tempOut: 31,
    activeJobs: 536,
  },
  {
    id: 'hall-c',
    name: 'Hall C',
    status: 'Online',
    racks: 512,
    gpuUtil: 71,
    itLoadMw: 19.6,
    coolingMw: 6.4,
    pue: 1.21,
    tempIn: 19,
    tempOut: 33,
    activeJobs: 384,
  },
  {
    id: 'hall-d',
    name: 'Hall D',
    status: 'Online',
    racks: 256,
    gpuUtil: 38,
    itLoadMw: 8.1,
    coolingMw: 3.2,
    pue: 1.24,
    tempIn: 19,
    tempOut: 34,
    activeJobs: 128,
  },
]

export const initialInWorldBadges: InWorldBadge[] = [
  {
    id: 'badge-hall-a',
    title: 'HALL A',
    subtitle: '92% util',
    status: 'online',
    position: [-11, 10.5, -9],
    type: 'hall',
  },
  {
    id: 'badge-hall-b',
    title: 'HALL B',
    subtitle: '64% util',
    status: 'online',
    position: [23, 10.5, -9],
    type: 'hall',
  },
  {
    id: 'badge-cooling',
    title: 'COOLING TOWERS',
    subtitle: '55 MW',
    status: '4/4 Online',
    position: [-28, 11, -28],
    type: 'cooling',
  },
  {
    id: 'badge-chillers',
    title: 'CHILLERS',
    subtitle: '48 MW',
    status: '6/6 Online',
    position: [-28, 7.5, -14],
    type: 'cooling',
  },
  {
    id: 'badge-substation',
    title: 'POWER SUBSTATION',
    subtitle: '132 MW',
    status: 'Grid Online',
    position: [-42, 8.5, 2],
    type: 'power',
  },
  {
    id: 'badge-generators',
    title: 'BACKUP GENERATORS',
    subtitle: '48 MW',
    status: '6/6 Online',
    position: [-44, 7.5, 19],
    type: 'power',
  },
  {
    id: 'badge-fuel',
    title: 'FUEL TANKS',
    subtitle: '1,200 m³',
    status: '> 72 hours',
    position: [-28, 8.5, 25],
    type: 'power',
  },
  {
    id: 'badge-fibre',
    title: 'FIBRE ENTRY VAULT',
    subtitle: '8 × 400G',
    status: 'Live traffic',
    position: [28, 9.5, -28],
    type: 'network',
  },
  {
    id: 'badge-dock',
    title: 'LOADING DOCK',
    subtitle: '5 bays',
    status: '2 in use',
    position: [22, 6.5, 10],
    type: 'dock',
  },
  {
    id: 'badge-gate',
    title: 'SECURITY GATE',
    subtitle: 'All clear',
    status: 'All clear',
    position: [0, 6.0, 26],
    type: 'gate',
  },
  {
    id: 'badge-parking',
    title: 'PARKING',
    subtitle: '124 / 200',
    status: 'Occupied',
    position: [40, 6.0, 22],
    type: 'parking',
  },
]

export const initialJobs: AIJob[] = [
  {
    id: 'JOB-2048',
    name: 'LLM-70B Multi-Node Pretraining',
    modelType: 'Dense Decoder LLM',
    framework: 'PyTorch 2.4',
    stage: 'running',
    progress: 78,
    assignedRackId: 'RACK-A-002',
    priority: 'High',
    etaMinutes: 142,
    tokensPerSec: 428000,
    startTime: Date.now() - 3600000 * 4,
  },
  {
    id: 'JOB-2049',
    name: 'Diffusion-4K Video Generation Epoch 12',
    modelType: 'Diffusion Transformer (DiT)',
    framework: 'DeepSpeed',
    stage: 'running',
    progress: 54,
    assignedRackId: 'RACK-A-007',
    priority: 'Normal',
    etaMinutes: 88,
    tokensPerSec: 215000,
    startTime: Date.now() - 3600000 * 2,
  },
  {
    id: 'JOB-2050',
    name: 'MoE-8x22B Sparse Route Expert Training',
    modelType: 'Mixture of Experts',
    framework: 'JAX',
    stage: 'checkpoint',
    progress: 88,
    assignedRackId: 'RACK-B-004',
    priority: 'High',
    etaMinutes: 32,
    tokensPerSec: 610000,
    startTime: Date.now() - 3600000 * 6,
  },
  {
    id: 'JOB-2051',
    name: 'Vision-Language Contrastive Alignment',
    modelType: 'Multimodal VLM',
    framework: 'PyTorch 2.4',
    stage: 'evaluating',
    progress: 94,
    assignedRackId: 'RACK-B-011',
    priority: 'Normal',
    etaMinutes: 14,
    tokensPerSec: 310000,
    startTime: Date.now() - 3600000 * 3,
  },
  {
    id: 'JOB-2052',
    name: 'Agentic Tool-Use DPO Fine-Tuning',
    modelType: 'Reinforcement Learning',
    framework: 'PyTorch 2.4',
    stage: 'scheduled',
    progress: 0,
    assignedRackId: 'RACK-A-015',
    priority: 'High',
    etaMinutes: 210,
    tokensPerSec: 0,
    startTime: Date.now(),
  },
  {
    id: 'JOB-2053',
    name: 'AlphaFold-3 Protein Complex Docking',
    modelType: 'EvoFormer Geometric AI',
    framework: 'JAX',
    stage: 'queued',
    progress: 0,
    assignedRackId: null,
    priority: 'Batch',
    etaMinutes: 480,
    tokensPerSec: 0,
    startTime: Date.now(),
  },
  {
    id: 'JOB-2045',
    name: 'Quantized INT4 Weight Calibration',
    modelType: 'AWQ Post-Training',
    framework: 'PyTorch 2.4',
    stage: 'done',
    progress: 100,
    assignedRackId: 'RACK-B-018',
    priority: 'Normal',
    etaMinutes: 0,
    tokensPerSec: 540000,
    startTime: Date.now() - 3600000 * 8,
  },
]

export const initialIncidents: Incident[] = [
  {
    id: 'INC-0104',
    affectedAssetId: 'RACK-A-004',
    assetType: 'rack',
    title: 'NVLink Bus Optical Delta-T Alert',
    description: 'Minor optical transceiver variance in rack A-004. Autonomous maintenance cart en route.',
    severity: 'warning',
    status: 'Assigned',
    timestamp: Date.now() - 145000,
    elapsedSeconds: 145,
  },
]

export const initialVehicles: Vehicle[] = [
  {
    id: 'VEH-TRUCK-01',
    name: 'Logistics Heavy Rig 404',
    type: 'delivery_truck',
    status: 'Delivering',
    batteryPct: 92,
    targetAssetId: 'loading-dock',
    speed: 4.5,
    position: [20, 1.2, 18],
    rotation: -Math.PI / 6,
  },
  {
    id: 'VEH-MAINT-01',
    name: 'Autonomous Service Rover',
    type: 'service_cart',
    status: 'Patrolling',
    batteryPct: 88,
    targetAssetId: 'RACK-A-004',
    speed: 3.2,
    position: [-10, 0.6, 12],
    rotation: 0,
  },
]
