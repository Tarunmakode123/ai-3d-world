import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import fs from 'fs'
import path from 'path'

// Node.js FileReader polyfill for Three.js GLTFExporter binary mode
class NodeFileReader {
  constructor() {
    this.result = null
    this.onloadend = null
  }
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    if (typeof this.onloadend === 'function') {
      this.onloadend()
    }
  }
}
if (!globalThis.FileReader) {
  globalThis.FileReader = NodeFileReader
}

const OUT_DIR = path.resolve('public/models')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function exportToGlb(object, fileName) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter()
    exporter.parse(
      object,
      (gltf) => {
        const buffer = Buffer.from(gltf)
        const filePath = path.join(OUT_DIR, fileName)
        fs.writeFileSync(filePath, buffer)
        console.log(`[AssetGenerator] Exported ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`)
        resolve(filePath)
      },
      (err) => {
        console.error(`[AssetGenerator] Error exporting ${fileName}:`, err)
        reject(err)
      },
      { binary: true }
    )
  })
}

// ==========================================
// 1. BUILD HIGH-FIDELITY 42U AI SERVER RACK
// ==========================================
function buildServerRackModel() {
  const rackGroup = new THREE.Group()
  rackGroup.name = 'ServerRack_Root'

  // Dimensions: 2.2m Width, 3.8m Height, 1.3m Depth (Center at Y = 1.9)
  const W = 2.2
  const H = 3.8
  const D = 1.3

  // Materials
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x090e17,
    roughness: 0.35,
    metalness: 0.7,
  })

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1a2332,
    roughness: 0.4,
    metalness: 0.8,
  })

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.9,
  })

  const portMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.2,
    metalness: 0.8,
  })

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.95,
  })

  // 1. Outer Heavy Chassis Frame (Top, Bottom, Left Wall, Right Wall, Rear Mesh)
  // Left side wall
  const sideGeo = new THREE.BoxGeometry(0.08, H, D)
  const sideL = new THREE.Mesh(sideGeo, frameMat)
  sideL.position.set(-W / 2 + 0.04, H / 2, 0)
  const sideR = new THREE.Mesh(sideGeo, frameMat)
  sideR.position.set(W / 2 - 0.04, H / 2, 0)
  rackGroup.add(sideL, sideR)

  // Top roof plate with cable access cutouts
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), frameMat)
  topPlate.position.set(0, H - 0.04, 0)
  const bottomPlate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, D), frameMat)
  bottomPlate.position.set(0, 0.05, 0)
  rackGroup.add(topPlate, bottomPlate)

  // Rear perforated backing
  const rearMesh = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.16, H - 0.16, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.5 })
  )
  rearMesh.position.set(0, H / 2, -D / 2 + 0.02)
  rackGroup.add(rearMesh)

  // 2. Vertical 19" EIA-310 Mounting Rails (Front and Rear uprights)
  const railGeo = new THREE.BoxGeometry(0.06, H - 0.2, 0.06)
  const railPositions = [
    [-0.95, D / 2 - 0.12],
    [0.95, D / 2 - 0.12],
    [-0.95, -D / 2 + 0.12],
    [0.95, -D / 2 + 0.12],
  ]
  railPositions.forEach(([rx, rz]) => {
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.position.set(rx, H / 2, rz)
    rackGroup.add(rail)
  })

  // 3. Front Perforated Bezel Door Frame (Recessed with open line of sight to blades)
  const doorTop = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.12, 0.06), frameMat)
  doorTop.position.set(0, H - 0.1, D / 2 - 0.03)
  const doorBottom = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.12, 0.06), frameMat)
  doorBottom.position.set(0, 0.12, D / 2 - 0.03)
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.1, H - 0.3, 0.06), frameMat)
  doorL.position.set(-W / 2 + 0.1, H / 2, D / 2 - 0.03)
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.1, H - 0.3, 0.06), frameMat)
  doorR.position.set(W / 2 - 0.1, H / 2, D / 2 - 0.03)
  rackGroup.add(doorTop, doorBottom, doorL, doorR)

  // 4. Eight Heavy 4U / 5U Server Chassis Blades (NVIDIA HGX / DGX H100 Form Factor)
  const bladeH = 0.38
  const bladeSpacing = 0.43
  const bladeStartZ = D / 2 - 0.24

  for (let b = 0; b < 8; b++) {
    const bladeY = 0.32 + b * bladeSpacing + bladeH / 2
    const bladeGroup = new THREE.Group()
    bladeGroup.name = `Blade_${b}`
    bladeGroup.position.set(0, bladeY, 0)

    // Main server drawer body
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(1.82, bladeH, D - 0.3),
      chassisMat
    )
    drawer.position.set(0, 0, -0.05)
    bladeGroup.add(drawer)

    // Front Faceplate
    const faceplate = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, bladeH - 0.02, 0.05),
      chassisMat
    )
    faceplate.position.set(0, 0, bladeStartZ)
    bladeGroup.add(faceplate)

    // Left and Right Ejection Handles
    const handleGeo = new THREE.BoxGeometry(0.04, bladeH * 0.7, 0.08)
    const handleL = new THREE.Mesh(handleGeo, handleMat)
    handleL.position.set(-0.86, 0, bladeStartZ + 0.04)
    const handleR = new THREE.Mesh(handleGeo, handleMat)
    handleR.position.set(0.86, 0, bladeStartZ + 0.04)
    bladeGroup.add(handleL, handleR)

    // QSFP-DD 800G High-Speed Optical Transceiver Cage Ports (Center bays)
    for (let p = -0.45; p <= 0.45; p += 0.18) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.04), portMat)
      port.position.set(p, -0.06, bladeStartZ + 0.03)
      bladeGroup.add(port)
    }

    // Cooling Exhaust Vent Ribs
    for (let v = -0.55; v <= 0.55; v += 0.12) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.14, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x050911, roughness: 0.9 })
      )
      vent.position.set(v, 0.08, bladeStartZ + 0.03)
      bladeGroup.add(vent)
    }

    // Four Diagnostic LEDs per blade (Named so our telemetry engine can bind to them!)
    for (let l = 0; l < 4; l++) {
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: l % 2 === 0 ? 0x22d3ee : 0x34d399 })
      )
      led.name = `Rack_LED_${b}_${l}`
      led.position.set(-0.76 + l * 0.06, 0.08, bladeStartZ + 0.035)
      bladeGroup.add(led)
    }

    rackGroup.add(bladeGroup)
  }

  // 5. Rear Vertical Power Distribution Unit (PDU) Strips
  const pduGeo = new THREE.BoxGeometry(0.08, H - 0.4, 0.08)
  const pduMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, metalness: 0.7 })
  const pduL = new THREE.Mesh(pduGeo, pduMat)
  pduL.position.set(-0.85, H / 2, -D / 2 + 0.15)
  const pduR = new THREE.Mesh(pduGeo, pduMat)
  pduR.position.set(0.85, H / 2, -D / 2 + 0.15)
  rackGroup.add(pduL, pduR)

  // 6. Transparent Raycasting Collider Hull (Encompasses entire rack for flawless hit-testing)
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, D),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  collider.name = 'Rack_Collider'
  collider.position.set(0, H / 2, 0)
  rackGroup.add(collider)

  return rackGroup
}

// ==========================================
// 2. BUILD INDUSTRIAL COOLING TOWER CELL
// ==========================================
function buildCoolingTowerModel() {
  const group = new THREE.Group()
  group.name = 'CoolingTower_Root'

  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.65,
    roughness: 0.35,
  })
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.3,
  })
  const louverMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.7,
  })
  const fanBladeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.85,
    roughness: 0.25,
  })

  // Lower Structural Steel Skid
  const skid = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.4, 8.6), steelMat)
  skid.position.y = 0.2
  group.add(skid)

  // Corner Support Columns
  const colGeo = new THREE.BoxGeometry(0.4, 4.0, 0.4)
  const colPositions = [
    [-3.8, 2.2, -3.8],
    [3.8, 2.2, -3.8],
    [-3.8, 2.2, 3.8],
    [3.8, 2.2, 3.8],
  ]
  colPositions.forEach(([cx, cy, cz]) => {
    const col = new THREE.Mesh(colGeo, steelMat)
    col.position.set(cx, cy, cz)
    group.add(col)
  })

  // Air Inlet Louver Banks (Four sides from Y = 0.4 to 4.2)
  for (let ly = 0.8; ly <= 3.8; ly += 0.5) {
    const louverN = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.08, 0.4), louverMat)
    louverN.position.set(0, ly, -3.8)
    louverN.rotation.x = -0.4
    const louverS = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.08, 0.4), louverMat)
    louverS.position.set(0, ly, 3.8)
    louverS.rotation.x = 0.4
    group.add(louverN, louverS)
  }

  // Upper Enclosed Casing (Y = 4.2 to 7.8)
  const casing = new THREE.Mesh(new THREE.BoxGeometry(8.0, 3.6, 8.0), towerMat)
  casing.position.y = 6.0
  group.add(casing)

  // Fan Cowl Cylinder (Venturi stack at Y = 7.8 to 8.8)
  const cowl = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.5, 1.2, 24, 1, true),
    steelMat
  )
  cowl.position.y = 8.4
  group.add(cowl)

  // Safety Handrail on Fan Deck
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 1.0, 8.2),
    new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true })
  )
  rail.position.y = 8.3
  group.add(rail)

  // 4-Blade Rotating Fan Rotor (Named so animation loop can rotate it!)
  const fanRotor = new THREE.Group()
  fanRotor.name = 'Tower_Fan_Rotor'
  fanRotor.position.y = 8.2

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.35, 16), steelMat)
  fanRotor.add(hub)

  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.05, 0.45),
      fanBladeMat
    )
    blade.position.x = 1.4
    blade.rotation.z = 0.15
    const bladeArm = new THREE.Group()
    bladeArm.rotation.y = (b * Math.PI) / 2
    bladeArm.add(blade)
    fanRotor.add(bladeArm)
  }
  group.add(fanRotor)

  // Collider
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(8.6, 8.8, 8.6),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  collider.name = 'CoolingTower_Collider'
  collider.position.y = 4.4
  group.add(collider)

  return group
}

// ==========================================
// 3. BUILD UTILITY POWER TRANSFORMER
// ==========================================
function buildTransformerModel() {
  const group = new THREE.Group()
  group.name = 'Transformer_Root'

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.35,
  })
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.4,
  })
  const insMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.25,
  })

  // Main Oil Tank (3.4 x 3.2 x 3.0 m)
  const tank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 3.0), tankMat)
  tank.position.y = 1.6
  group.add(tank)

  // Radiator Fin Banks (Left & Right)
  const finL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.8), finMat)
  finL.position.set(-1.85, 1.6, 0)
  const finR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.8), finMat)
  finR.position.set(1.85, 1.6, 0)
  group.add(finL, finR)

  // Conservator Expansion Tank (Cylinder along X axis)
  const conservator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.8, 16),
    finMat
  )
  conservator.rotation.z = Math.PI / 2
  conservator.position.set(0, 3.55, 0)
  group.add(conservator)

  // 3 High-Voltage Bushings on top
  for (let b = -0.9; b <= 0.9; b += 0.9) {
    const bushing = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 8), insMat)
    bushing.position.set(b, 3.75, -0.6)
    group.add(bushing)
  }

  // Collider
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 4.4, 3.2),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  collider.name = 'Transformer_Collider'
  collider.position.y = 2.0
  group.add(collider)

  return group
}

// ==========================================
// 4. BUILD BACKUP DIESEL GENERATOR ENCLOSURE
// ==========================================
function buildGeneratorModel() {
  const group = new THREE.Group()
  group.name = 'Generator_Root'

  const genMat = new THREE.MeshStandardMaterial({
    color: 0x273444,
    metalness: 0.65,
    roughness: 0.45,
  })
  const exhaustMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.25,
  })

  // Sound-Attenuated Enclosure (7.6 x 3.4 x 3.6 m)
  const body = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.4, 3.6), genMat)
  body.position.y = 1.7
  group.add(body)

  // Louver panels on front and side
  const louver = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.0, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
  )
  louver.position.set(2.0, 1.7, 1.82)
  group.add(louver)

  // Roof-Mounted Exhaust Silencer Muffler
  const muffler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 3.4, 16),
    exhaustMat
  )
  muffler.rotation.z = Math.PI / 2
  muffler.position.set(0, 3.85, 0)
  group.add(muffler)

  // Vertical Exhaust Stack
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.8, 12), exhaustMat)
  stack.position.set(2.2, 4.6, 0)
  group.add(stack)

  // Status Beacon Light
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  )
  beacon.name = 'Gen_Status_Beacon'
  beacon.position.set(-3.7, 3.2, 1.7)
  group.add(beacon)

  // Collider
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 4.6, 3.8),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  collider.name = 'Generator_Collider'
  collider.position.y = 2.0
  group.add(collider)

  return group
}

// ==========================================
// RUN GENERATION AND EXPORT
// ==========================================
async function main() {
  console.log('[AssetGenerator] Starting 3D GLB Asset generation...')

  await exportToGlb(buildServerRackModel(), 'server_rack.glb')
  await exportToGlb(buildCoolingTowerModel(), 'cooling_tower.glb')
  await exportToGlb(buildTransformerModel(), 'transformer.glb')
  await exportToGlb(buildGeneratorModel(), 'generator.glb')

  console.log('[AssetGenerator] All GLB assets successfully generated!')
}

main().catch(console.error)
