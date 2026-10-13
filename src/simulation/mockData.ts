import type { ServerRack, CoolingUnit, PowerUnit, NetworkUnit, DataHall, AIJob, Incident, Vehicle } from '../types/simulation'

// Generate 48 detailed GPU Racks distributed across Hall A and Hall B
export function generateInitialRacks(): ServerRack[] {
  const racks: ServerRack[] = []
  const gpuTypes: ServerRack['gpuType'][] = ['NVIDIA H100 SXM5', 'NVIDIA H200', 'NVIDIA B200 NVL', 'Google TPU v5p']

  // Hall A: 24 racks (4 rows, 6 columns)
  // Hall A Center is around X: -26, Z: 6
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const index = row * 6 + col + 1
      const id = `RACK-A-${String(index).padStart(3, '0')}`
      // spacing: row spacing (hot/cold aisles) 4 units, col spacing 2.5 units
      const posX = -32 + col * 2.5
      const posZ = 0 + row * 4.0
      const isHighLoad = (row + col) % 3 === 0
      const baseUtil = isHighLoad ? 82 + Math.floor(Math.random() * 16) : 38 + Math.floor(Math.random() * 30)
      const baseTemp = 42 + Math.floor(baseUtil * 0.38)
      const basePower = 7.5 + (baseUtil / 100) * 7.5

      racks.push({
        id,
        hallId: 'hall-a',
        row,
        col,
        position: [posX, 1.4, posZ],
        gpuType: gpuTypes[(row + col) % gpuTypes.length],
        gpuCount: 8,
        gpuUtilisation: baseUtil,
        temperature: baseTemp,
        powerKw: parseFloat(basePower.toFixed(2)),
        memoryUtilisation: Math.min(98, baseUtil + 8),
        coolingAirflowCfm: Math.floor(750 + baseUtil * 8.5),
        health: 'healthy',
        currentJobId: null,
        hasFault: false,
      })
    }
  }

  // Hall B: 24 racks (4 rows, 6 columns)
  // Hall B Center is around X: 26, Z: 6
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const index = row * 6 + col + 1
      const id = `RACK-B-${String(index).padStart(3, '0')}`
      const posX = 20 + col * 2.5
      const posZ = 0 + row * 4.0
      const isHighLoad = (row + col) % 2 === 0
      const baseUtil = isHighLoad ? 76 + Math.floor(Math.random() * 20) : 42 + Math.floor(Math.random() * 28)
      const baseTemp = 40 + Math.floor(baseUtil * 0.36)
      const basePower = 8.0 + (baseUtil / 100) * 7.2

      racks.push({
        id,
        hallId: 'hall-b',
        row,
        col,
        position: [posX, 1.4, posZ],
        gpuType: gpuTypes[(row * 2 + col) % gpuTypes.length],
        gpuCount: 8,
        gpuUtilisation: baseUtil,
        temperature: baseTemp,
        powerKw: parseFloat(basePower.toFixed(2)),
        memoryUtilisation: Math.min(99, baseUtil + 5),
        coolingAirflowCfm: Math.floor(800 + baseUtil * 8.0),
        health: 'healthy',
        currentJobId: null,
        hasFault: false,
      })
    }
  }

  return racks
}

export const initialCoolingUnits: CoolingUnit[] = [
  {
    id: 'COOL-TWR-01',
    name: 'Industrial Cooling Tower Alpha',
    type: 'tower',
    temperature: 28.4,
    coolingLoad: 76,
    waterFlowLps: 340,
    fanRpm: 880,
    health: 'healthy',
    position: [-28, 3.5, -28],
  },
  {
    id: 'COOL-TWR-02',
    name: 'Industrial Cooling Tower Beta',
    type: 'tower',
    temperature: 29.1,
    coolingLoad: 79,
    waterFlowLps: 355,
    fanRpm: 910,
    health: 'healthy',
    position: [-20, 3.5, -28],
  },
  {
    id: 'COOL-TWR-03',
    name: 'Industrial Cooling Tower Gamma',
    type: 'tower',
    temperature: 27.8,
    coolingLoad: 68,
    waterFlowLps: 310,
    fanRpm: 820,
    health: 'healthy',
    position: [-12, 3.5, -28],
  },
  {
    id: 'CHILLER-01',
    name: 'Liquid Chiller Unit 101',
    type: 'chiller',
    temperature: 16.2,
    coolingLoad: 82,
    waterFlowLps: 450,
    fanRpm: 1200,
    health: 'healthy',
    position: [-24, 1.5, -19],
  },
  {
    id: 'CHILLER-02',
    name: 'Liquid Chiller Unit 102',
    type: 'chiller',
    temperature: 15.9,
    coolingLoad: 80,
    waterFlowLps: 440,
    fanRpm: 1180,
    health: 'healthy',
    position: [-14, 1.5, -19],
  },
]

export const initialPowerUnits: PowerUnit[] = [
  {
    id: 'SUBSTATION-MAIN',
    name: '132kV Main Grid Interconnect Substation',
    type: 'substation',
    powerOutputMw: 14.8,
    operationalStatus: 'Grid-Tied',
    fuelLevelPct: 100,
    frequencyHz: 50.02,
    health: 'healthy',
    position: [28, 2.5, -28],
  },
  {
    id: 'XFRM-01',
    name: 'Step-Down Transformer Bank 01',
    type: 'transformer',
    powerOutputMw: 7.6,
    operationalStatus: 'Active',
    fuelLevelPct: 100,
    frequencyHz: 50.0,
    health: 'healthy',
    position: [18, 1.8, -26],
  },
  {
    id: 'XFRM-02',
    name: 'Step-Down Transformer Bank 02',
    type: 'transformer',
    powerOutputMw: 7.2,
    operationalStatus: 'Active',
    fuelLevelPct: 100,
    frequencyHz: 50.0,
    health: 'healthy',
    position: [18, 1.8, -20],
  },
  {
    id: 'GEN-BACKUP-01',
    name: 'Caterpillar 3.5MW Backup Diesel Gen 1',
    type: 'generator',
    powerOutputMw: 0.0,
    operationalStatus: 'Standby',
    fuelLevelPct: 96,
    frequencyHz: 50.0,
    health: 'healthy',
    position: [37, 2.0, -12],
  },
  {
    id: 'GEN-BACKUP-02',
    name: 'Caterpillar 3.5MW Backup Diesel Gen 2',
    type: 'generator',
    powerOutputMw: 0.0,
    operationalStatus: 'Standby',
    fuelLevelPct: 94,
    frequencyHz: 50.0,
    health: 'healthy',
    position: [37, 2.0, -4],
  },
]

export const initialNetworkUnits: NetworkUnit[] = [
  {
    id: 'NET-VAULT-01',
    name: 'Carrier Neutral Fibre Vault & MMR',
    type: 'vault',
    throughputTbps: 184.5,
    packetLossPct: 0.0001,
    latencyUs: 42,
    health: 'healthy',
    position: [0, 1.2, -26],
  },
  {
    id: 'NET-SPINE-01',
    name: 'Ultra-Low Latency Optical Spine Hub',
    type: 'switch',
    throughputTbps: 340.2,
    packetLossPct: 0.0000,
    latencyUs: 18,
    health: 'healthy',
    position: [0, 2.0, -14],
  },
  {
    id: 'SAT-UPLINK-01',
    name: 'LEO Constellation Ground Uplink Dish',
    type: 'uplink',
    throughputTbps: 12.8,
    packetLossPct: 0.002,
    latencyUs: 320,
    health: 'healthy',
    position: [-2, 3.8, -36],
  },
]

export const initialDataHalls: DataHall[] = [
  {
    id: 'hall-a',
    name: 'Data Hall Alpha — Foundation Training',
    totalRacks: 24,
    activeJobsCount: 11,
    avgUtilisation: 74.2,
    totalPowerMw: 4.85,
    avgTempC: 48.6,
    airflowCfm: 26500,
    position: [-26, 4.0, 6],
  },
  {
    id: 'hall-b',
    name: 'Data Hall Beta — Inference & MoE Cluster',
    totalRacks: 24,
    activeJobsCount: 13,
    avgUtilisation: 78.9,
    totalPowerMw: 5.12,
    avgTempC: 49.8,
    airflowCfm: 28400,
    position: [26, 4.0, 6],
  },
]

export const initialJobs: AIJob[] = [
  {
    id: 'JOB-2048',
    name: 'LLM-70B Multi-Node Pretraining',
    modelType: 'Dense Decoder LLM',
    framework: 'PyTorch 2.4',
    stage: 'running',
    progress: 68,
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
    progress: 44,
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
    progress: 75,
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
    progress: 92,
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
    id: 'JOB-2054',
    name: 'Autonomous Driving Trajectory Prediction',
    modelType: 'Spatiotemporal Graph Net',
    framework: 'TensorFlow',
    stage: 'queued',
    progress: 0,
    assignedRackId: null,
    priority: 'Normal',
    etaMinutes: 195,
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
  {
    id: 'JOB-2046',
    name: 'Long-Context 1M Token Attention Kernel',
    modelType: 'FlashAttention-3',
    framework: 'DeepSpeed',
    stage: 'done',
    progress: 100,
    assignedRackId: 'RACK-A-022',
    priority: 'High',
    etaMinutes: 0,
    tokensPerSec: 890000,
    startTime: Date.now() - 3600000 * 10,
  },
]

export const initialIncidents: Incident[] = [
  {
    id: 'INC-0104',
    affectedAssetId: 'RACK-A-004',
    assetType: 'rack',
    title: 'PCIe Bus NVLink Retransmit Rate Spike',
    description: 'Minor optical transceiver thermal warning in rack A-004 aisle 1. Automated service cart dispatched.',
    severity: 'warning',
    status: 'Assigned',
    timestamp: Date.now() - 145000,
    elapsedSeconds: 145,
  },
]

export const initialVehicles: Vehicle[] = [
  {
    id: 'VEH-MAINT-01',
    name: 'Cybernetic Tech Service Cart Alpha',
    type: 'service_cart',
    status: 'Patrolling',
    batteryPct: 92,
    targetAssetId: 'RACK-A-004',
    speed: 3.2,
    position: [-26, 0.4, 20],
    rotation: 0,
  },
  {
    id: 'VEH-TRUCK-01',
    name: 'Heavy Logistics Delivery Rig 404',
    type: 'delivery_truck',
    status: 'Delivering',
    batteryPct: 88,
    targetAssetId: 'loading-dock',
    speed: 4.5,
    position: [0, 0.9, 32],
    rotation: Math.PI / 2,
  },
]
