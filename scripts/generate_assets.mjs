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

// =========================================================================
// 1. BUILD HIGH-FIDELITY 42U AI SERVER RACK (NVIDIA HGX / B200 ARCHITECTURE)
// =========================================================================
function buildServerRackModel() {
  const rackGroup = new THREE.Group()
  rackGroup.name = 'ServerRack_Root'

  // Dimensions: 2.2m Width, 3.8m Height, 1.3m Depth (Base sits at Y = 0)
  const W = 2.2
  const H = 3.8
  const D = 1.3

  // Industrial PBR Materials (Dark graphite, titanium, and anodized aluminum)
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0c131c,
    roughness: 0.48,
    metalness: 0.7,
  })

  const chassisFaceMat = new THREE.MeshStandardMaterial({
    color: 0x1a2636,
    roughness: 0.38,
    metalness: 0.8,
  })

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.9,
  })

  const portMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.85,
  })

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.25,
    metalness: 0.95,
  })

  const darkVentMat = new THREE.MeshStandardMaterial({
    color: 0x060a12,
    roughness: 0.85,
    metalness: 0.3,
  })

  const coldFittingMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.85,
  })

  const warmFittingMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.85,
  })

  // 1. Heavy Outer Chassis (Side panels with architectural shadow reveals)
  const sideGeo = new THREE.BoxGeometry(0.08, H, D)
  const sideL = new THREE.Mesh(sideGeo, frameMat)
  sideL.position.set(-W / 2 + 0.04, H / 2, 0)
  const sideR = new THREE.Mesh(sideGeo, frameMat)
  sideR.position.set(W / 2 - 0.04, H / 2, 0)
  rackGroup.add(sideL, sideR)

  // Side decorative reinforcement ribs
  for (let ry = 0.5; ry < H; ry += 0.6) {
    const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, D - 0.2), railMat)
    ribL.position.set(-W / 2 + 0.04, ry, 0)
    const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, D - 0.2), railMat)
    ribR.position.set(W / 2 - 0.04, ry, 0)
    rackGroup.add(ribL, ribR)
  }

  // Top roof cowl plate with cable management pass-through grommets
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, D), frameMat)
  topPlate.position.set(0, H - 0.05, 0)
  const bottomPlate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), frameMat)
  bottomPlate.position.set(0, 0.06, 0)
  rackGroup.add(topPlate, bottomPlate)

  // Overhead cable grommet trays
  const grommetGeo = new THREE.BoxGeometry(0.35, 0.03, 0.4)
  const grommetL = new THREE.Mesh(grommetGeo, railMat)
  grommetL.position.set(-0.6, H, 0)
  const grommetR = new THREE.Mesh(grommetGeo, railMat)
  grommetR.position.set(0.6, H, 0)
  rackGroup.add(grommetL, grommetR)

  // Rear perforated exhaust door panel
  const rearMesh = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.16, H - 0.2, 0.04),
    darkVentMat
  )
  rearMesh.position.set(0, H / 2, -D / 2 + 0.02)
  rackGroup.add(rearMesh)

  // 2. Vertical 19" EIA-310 Equipment Mounting Rails
  const railGeo = new THREE.BoxGeometry(0.06, H - 0.24, 0.06)
  const railPositions = [
    [-0.95, D / 2 - 0.12],
    [0.95, D / 2 - 0.12],
    [-0.95, -D / 2 + 0.14],
    [0.95, -D / 2 + 0.14],
  ]
  railPositions.forEach(([rx, rz]) => {
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.position.set(rx, H / 2, rz)
    rackGroup.add(rail)
  })

  // 3. Front Bezel Frame with Top Identification Header
  const doorTop = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.16, 0.06), frameMat)
  doorTop.position.set(0, H - 0.12, D / 2 - 0.03)
  const doorBottom = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.14, 0.06), frameMat)
  doorBottom.position.set(0, 0.13, D / 2 - 0.03)
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.1, H - 0.34, 0.06), frameMat)
  doorL.position.set(-W / 2 + 0.1, H / 2, D / 2 - 0.03)
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.1, H - 0.34, 0.06), frameMat)
  doorR.position.set(W / 2 - 0.1, H / 2, D / 2 - 0.03)
  rackGroup.add(doorTop, doorBottom, doorL, doorR)

  // Illuminated Rack Unit Header Label Badge
  const badgeGeo = new THREE.BoxGeometry(0.8, 0.08, 0.02)
  const badgeMat = new THREE.MeshStandardMaterial({
    color: 0x07111e,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.8,
  })
  const headerBadge = new THREE.Mesh(badgeGeo, badgeMat)
  headerBadge.position.set(0, H - 0.12, D / 2)
  rackGroup.add(headerBadge)

  // 4. TOP 1U MANAGEMENT & SPINE NETWORK SWITCH (U41-U42)
  const switchGroup = new THREE.Group()
  switchGroup.position.set(0, H - 0.32, 0)
  const switchBody = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.16, D - 0.3), frameMat)
  const switchFace = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.14, 0.05), chassisFaceMat)
  switchFace.position.set(0, 0, D / 2 - 0.24)
  switchGroup.add(switchBody, switchFace)

  // 16 SFP28/QSFP-DD High-Speed Switch Ports
  for (let sp = -0.7; sp <= 0.7; sp += 0.1) {
    const sPort = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.04), portMat)
    sPort.position.set(sp, 0, D / 2 - 0.21)
    switchGroup.add(sPort)
  }
  rackGroup.add(switchGroup)

  // 5. SIX HEAVY HIGH-DENSITY GPU ACCELERATOR BLADES (NVIDIA H100 / B200 STYLE)
  const bladeH = 0.42
  const bladeSpacing = 0.46
  const bladeStartZ = D / 2 - 0.24

  for (let b = 0; b < 6; b++) {
    const bladeY = 0.62 + b * bladeSpacing + bladeH / 2
    const bladeGroup = new THREE.Group()
    bladeGroup.name = `Blade_${b}`
    bladeGroup.position.set(0, bladeY, 0)

    // Main server drawer chassis
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(1.82, bladeH - 0.04, D - 0.3),
      frameMat
    )
    drawer.position.set(0, 0, -0.05)
    bladeGroup.add(drawer)

    // Heavy Anodized Titanium Faceplate
    const faceplate = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, bladeH - 0.05, 0.05),
      chassisFaceMat
    )
    faceplate.position.set(0, 0, bladeStartZ)
    bladeGroup.add(faceplate)

    // Horizontal Slide Mounting Shelf Flange
    const shelfFlange = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.02, 0.08),
      railMat
    )
    shelfFlange.position.set(0, -bladeH / 2 + 0.02, bladeStartZ + 0.02)
    bladeGroup.add(shelfFlange)

    // Dual Chromed Extraction / Locking Latches
    const handleGeo = new THREE.BoxGeometry(0.04, bladeH * 0.65, 0.06)
    const handleL = new THREE.Mesh(handleGeo, handleMat)
    handleL.position.set(-0.86, 0, bladeStartZ + 0.04)
    const handleR = new THREE.Mesh(handleGeo, handleMat)
    handleR.position.set(0.86, 0, bladeStartZ + 0.04)
    bladeGroup.add(handleL, handleR)

    // 8x 800G QSFP-DD NVLink / InfiniBand Transceiver Cage Ports
    for (let p = -0.42; p <= 0.42; p += 0.14) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), portMat)
      port.position.set(p, -0.06, bladeStartZ + 0.03)
      bladeGroup.add(port)
    }

    // Perforated Ventilation Air-Intake Louvers
    for (let v = -0.55; v <= 0.55; v += 0.1) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.12, 0.02),
        darkVentMat
      )
      vent.position.set(v, 0.08, bladeStartZ + 0.03)
      bladeGroup.add(vent)
    }

    // Direct-to-Chip Liquid Cooling Quick-Disconnect (QD) Manifold Couplings
    const qdCold = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), coldFittingMat)
    qdCold.rotation.x = Math.PI / 2
    qdCold.position.set(0.68, -0.06, bladeStartZ + 0.035)
    const qdWarm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), warmFittingMat)
    qdWarm.rotation.x = Math.PI / 2
    qdWarm.position.set(0.75, -0.06, bladeStartZ + 0.035)
    bladeGroup.add(qdCold, qdWarm)

    // Four Diagnostic Telemetry Status LEDs (Names preserved for live simulation sync!)
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

  // 6. BOTTOM 2U REDUNDANT POWER DISTRIBUTION SHELF (PSUs)
  const psuShelfGroup = new THREE.Group()
  psuShelfGroup.position.set(0, 0.36, 0)
  const psuBody = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.28, D - 0.3), frameMat)
  psuShelfGroup.add(psuBody)

  // 4 Hot-Swappable 3.3 kW Titanium-Grade Power Modules
  for (let pi = 0; pi < 4; pi++) {
    const px = -0.66 + pi * 0.44
    const psuFace = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.05), chassisFaceMat)
    psuFace.position.set(px, 0, bladeStartZ)

    const psuHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.06), handleMat)
    psuHandle.position.set(px + 0.14, 0, bladeStartZ + 0.03)

    const psuLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    )
    psuLed.position.set(px - 0.12, 0.06, bladeStartZ + 0.035)

    psuShelfGroup.add(psuFace, psuHandle, psuLed)
  }
  rackGroup.add(psuShelfGroup)

  // 7. Rear Vertical 3-Phase High-Amperage PDU Busbars & Manifold Tubes
  const pduGeo = new THREE.BoxGeometry(0.08, H - 0.4, 0.08)
  const pduMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 })
  const pduL = new THREE.Mesh(pduGeo, pduMat)
  pduL.position.set(-0.85, H / 2, -D / 2 + 0.15)
  const pduR = new THREE.Mesh(pduGeo, pduMat)
  pduR.position.set(0.85, H / 2, -D / 2 + 0.15)
  rackGroup.add(pduL, pduR)

  // Rear vertical liquid cooling supply & return manifolds
  const pipeGeo = new THREE.CylinderGeometry(0.03, 0.03, H - 0.6, 12)
  const pipeCold = new THREE.Mesh(pipeGeo, coldFittingMat)
  pipeCold.position.set(0.68, H / 2, -D / 2 + 0.18)
  const pipeWarm = new THREE.Mesh(pipeGeo, warmFittingMat)
  pipeWarm.position.set(0.75, H / 2, -D / 2 + 0.18)
  rackGroup.add(pipeCold, pipeWarm)

  return rackGroup
}

// =========================================================================
// 2. BUILD INDUSTRIAL INDUCED-DRAFT COOLING TOWER CELL (55 MW REFRIGERATION)
// =========================================================================
function buildCoolingTowerModel() {
  const group = new THREE.Group()
  group.name = 'CoolingTower_Root'

  const frpCasingMat = new THREE.MeshStandardMaterial({
    color: 0x273549,
    metalness: 0.5,
    roughness: 0.45,
  })

  const galvSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.35,
  })

  const basinMat = new THREE.MeshStandardMaterial({
    color: 0x16202c,
    metalness: 0.8,
    roughness: 0.3,
  })

  const louverBladeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.6,
  })

  const fanBladeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.85,
    roughness: 0.25,
  })

  const safetyRailMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.6,
    roughness: 0.4,
  })

  // 1. Lower Heavy Structural Galvanized Steel I-Beam Skid Base
  const skid = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.45, 8.8), galvSteelMat)
  skid.position.y = 0.225
  group.add(skid)

  // 4 Heavy Corner Concrete Footing Pedestals
  const footGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9)
  const footPositions = [
    [-3.9, 0.2, -3.9],
    [3.9, 0.2, -3.9],
    [-3.9, 0.2, 3.9],
    [3.9, 0.2, 3.9],
  ]
  footPositions.forEach(([fx, fy, fz]) => {
    const foot = new THREE.Mesh(footGeo, galvSteelMat)
    foot.position.set(fx, fy, fz)
    group.add(foot)
  })

  // 2. Stainless Steel Cold Water Collection Sump Basin (Y = 0.45 to 1.1)
  const basin = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.65, 8.4), basinMat)
  basin.position.y = 0.775
  group.add(basin)

  // 3. Heavy Corner Support Columns (Y = 1.1 to 4.5)
  const colGeo = new THREE.BoxGeometry(0.45, 3.6, 0.45)
  const colPositions = [
    [-3.8, 2.8, -3.8],
    [3.8, 2.8, -3.8],
    [-3.8, 2.8, 3.8],
    [3.8, 2.8, 3.8],
  ]
  colPositions.forEach(([cx, cy, cz]) => {
    const col = new THREE.Mesh(colGeo, galvSteelMat)
    col.position.set(cx, cy, cz)
    group.add(col)
  })

  // Intermediate Column Supports
  const midColN = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), galvSteelMat)
  midColN.position.set(0, 2.8, -3.8)
  const midColS = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), galvSteelMat)
  midColS.position.set(0, 2.8, 3.8)
  group.add(midColN, midColS)

  // 4. Two-Tier Cellular Air Inlet Louvers (North and South intake banks)
  for (let ly = 1.3; ly <= 4.3; ly += 0.45) {
    const louverN = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.08, 0.42), louverBladeMat)
    louverN.position.set(0, ly, -3.8)
    louverN.rotation.x = -0.42

    const louverS = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.08, 0.42), louverBladeMat)
    louverS.position.set(0, ly, 3.8)
    louverS.rotation.x = 0.42

    group.add(louverN, louverS)
  }

  // Internal PVC Honeycomb Splash-Fill Core (Visible through louvers)
  const fillCore = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 3.2, 7.2),
    new THREE.MeshStandardMaterial({ color: 0x09101d, roughness: 0.9, metalness: 0.2 })
  )
  fillCore.position.set(0, 2.8, 0)
  group.add(fillCore)

  // 5. Upper Enclosed FRP Panel Casing (Y = 4.6 to 8.0)
  const casing = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.4, 8.2), frpCasingMat)
  casing.position.y = 6.3
  group.add(casing)

  // Horizontal Panel Joint Flanges on FRP Casing
  const flangeGeo = new THREE.BoxGeometry(8.3, 0.08, 8.3)
  const flange1 = new THREE.Mesh(flangeGeo, galvSteelMat)
  flange1.position.y = 5.2
  const flange2 = new THREE.Mesh(flangeGeo, galvSteelMat)
  flange2.position.y = 6.8
  const flangeTop = new THREE.Mesh(flangeGeo, galvSteelMat)
  flangeTop.position.y = 8.0
  group.add(flange1, flange2, flangeTop)

  // 6. Fan Cowl Venturi Cylinder Stack (Y = 8.0 to 9.2)
  const cowl = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.6, 1.2, 28, 1, false),
    galvSteelMat
  )
  cowl.position.y = 8.6
  group.add(cowl)

  // 7. Safety Perimeter Handrails & Toe-Boards along Fan Deck
  const handrailGeo = new THREE.BoxGeometry(8.2, 0.9, 8.2)
  const handrail = new THREE.Mesh(
    handrailGeo,
    new THREE.MeshBasicMaterial({ color: 0x64748b, wireframe: true })
  )
  handrail.position.y = 8.45
  group.add(handrail)

  // Yellow Safety Hazard Kickplates
  const kickplateGeo = new THREE.BoxGeometry(8.22, 0.15, 8.22)
  const kickplate = new THREE.Mesh(kickplateGeo, safetyRailMat)
  kickplate.position.y = 8.08
  group.add(kickplate)

  // 8. 4-BLADE ROTATING FAN ROTOR (Name preserved for animation loop!)
  const fanRotor = new THREE.Group()
  fanRotor.name = 'Tower_Fan_Rotor'
  fanRotor.position.y = 8.4

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 16), galvSteelMat)
  const hubDome = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), galvSteelMat)
  hubDome.position.y = 0.2
  fanRotor.add(hub, hubDome)

  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.06, 0.5),
      fanBladeMat
    )
    blade.position.x = 1.45
    blade.rotation.z = 0.18
    const bladeArm = new THREE.Group()
    bladeArm.rotation.y = (b * Math.PI) / 2
    bladeArm.add(blade)
    fanRotor.add(bladeArm)
  }
  group.add(fanRotor)

  // 9. External Galvanized Service Ladder with Safety Hoop Cage (East Side)
  const ladderGroup = new THREE.Group()
  ladderGroup.position.set(4.25, 0, 0)

  const stringerGeo = new THREE.BoxGeometry(0.04, 8.2, 0.08)
  const strL = new THREE.Mesh(stringerGeo, galvSteelMat)
  strL.position.set(0, 4.1, -0.25)
  const strR = new THREE.Mesh(stringerGeo, galvSteelMat)
  strR.position.set(0, 4.1, 0.25)
  ladderGroup.add(strL, strR)

  // Ladder Rungs
  const rungGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6)
  rungGeo.rotateX(Math.PI / 2)
  for (let ry = 0.5; ry <= 8.0; ry += 0.45) {
    const rung = new THREE.Mesh(rungGeo, galvSteelMat)
    rung.position.set(0, ry, 0)
    ladderGroup.add(rung)
  }

  // Safety Hoop Rings
  for (let hy = 3.0; hy <= 8.2; hy += 1.2) {
    const hoop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12, 1, true),
      safetyRailMat
    )
    hoop.position.set(0.3, hy, 0)
    ladderGroup.add(hoop)
  }
  group.add(ladderGroup)

  return group
}

// =========================================================================
// 3. BUILD UTILITY POWER TRANSFORMER (132 MW STEP-DOWN SUBSTATION UNIT)
// =========================================================================
function buildTransformerModel() {
  const group = new THREE.Group()
  group.name = 'Transformer_Root'

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x273549,
    metalness: 0.75,
    roughness: 0.4,
  })

  const finMat = new THREE.MeshStandardMaterial({
    color: 0x1a2636,
    metalness: 0.85,
    roughness: 0.35,
  })

  const porcelainMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.4,
  })

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.2,
    metalness: 0.95,
  })

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.35,
  })

  // 1. Structural Channel Skid Base with Grounding Pads
  const skid = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 3.4), steelMat)
  skid.position.y = 0.15
  group.add(skid)

  // 2. Main Oil Tank Body (Y = 0.3 to 3.5)
  const tank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.2, 2.8), tankMat)
  tank.position.y = 1.9
  group.add(tank)

  // Bolted Top Cover Flange
  const coverFlange = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 3.0), steelMat)
  coverFlange.position.y = 3.56
  group.add(coverFlange)

  // 3. Deep Corrugated Cooling Fin Radiators (Left & Right Banks)
  for (let side of [-1.85, 1.85]) {
    const finBank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.6, 2.6), finMat)
    finBank.position.set(side, 1.8, 0)

    // Upper and Lower Oil Manifold Piping
    const pipeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), steelMat)
    pipeTop.rotation.x = Math.PI / 2
    pipeTop.position.set(side, 3.1, 0)

    const pipeBot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), steelMat)
    pipeBot.rotation.x = Math.PI / 2
    pipeBot.position.set(side, 0.5, 0)

    group.add(finBank, pipeTop, pipeBot)
  }

  // 4. Conservator Expansion Oil Tank (Top Cylinder along X axis)
  const conservator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 2.8, 16),
    steelMat
  )
  conservator.rotation.z = Math.PI / 2
  conservator.position.set(0, 3.9, 0)

  // Oil Level Gauge Sight Glass
  const gauge = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.4, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 })
  )
  gauge.position.set(1.42, 3.9, 0)
  group.add(conservator, gauge)

  // 5. Three High-Voltage Multi-Shed Porcelain Bushings (Primary Feed)
  for (let b = -0.9; b <= 0.9; b += 0.9) {
    const bushingGroup = new THREE.Group()
    bushingGroup.position.set(b, 3.65, -0.6)

    // Multi-skirt shed rings
    for (let s = 0; s < 4; s++) {
      const shed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 - s * 0.015, 0.22 - s * 0.015, 0.18, 12),
        porcelainMat
      )
      shed.position.y = 0.15 + s * 0.22
      bushingGroup.add(shed)
    }

    // Top Brass Conductor Terminal Clamp
    const terminal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), copperMat)
    terminal.position.y = 1.15
    bushingGroup.add(terminal)

    group.add(bushingGroup)
  }

  // 6. Front Marshalling Cabinet (Digital Control & Diagnostics Panel)
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.3), steelMat)
  cabinet.position.set(0, 1.8, 1.55)

  const diagDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.25, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x07111e,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
    })
  )
  diagDisplay.position.set(0, 2.1, 1.71)
  group.add(cabinet, diagDisplay)

  return group
}

// =========================================================================
// 4. BUILD CONTAINERIZED BACKUP DIESEL GENERATOR (48 MW EMERGENCY POWER)
// =========================================================================
function buildGeneratorModel() {
  const group = new THREE.Group()
  group.name = 'Generator_Root'

  const enclosureMat = new THREE.MeshStandardMaterial({
    color: 0x1a2636,
    metalness: 0.65,
    roughness: 0.42,
  })

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x273549,
    metalness: 0.7,
    roughness: 0.38,
  })

  const louverMat = new THREE.MeshStandardMaterial({
    color: 0x0c131c,
    roughness: 0.75,
    metalness: 0.5,
  })

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.3,
  })

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.8,
    roughness: 0.4,
  })

  // 1. Integrated Sub-Base Fuel Tank Skid (Y = 0 to 0.7)
  const fuelSkid = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.7, 3.8), tankMat)
  fuelSkid.position.y = 0.35
  group.add(fuelSkid)

  // Fuel Fill Neck and Lockable Cap
  const fillPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), steelMat)
  fillPipe.position.set(-3.6, 0.8, 1.8)
  group.add(fillPipe)

  // 2. Sound-Attenuated Weatherproof Acoustic Enclosure (Y = 0.7 to 4.1)
  const enclosure = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.4, 3.6), enclosureMat)
  enclosure.position.y = 2.4
  group.add(enclosure)

  // Recessed Service Access Double Doors (South Face)
  for (let dx of [-1.8, 0.6]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.06), doorMat)
    door.position.set(dx, 2.2, 1.82)

    // Flush Chrome Handle Latches
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), steelMat)
    handle.position.set(dx + 0.75, 2.2, 1.86)
    group.add(door, handle)
  }

  // 3. Acoustic Air-Intake Louver Banks with Weather Hoods
  const intakeLouver = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.12), louverMat)
  intakeLouver.position.set(2.4, 2.4, 1.84)
  const intakeHood = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 0.4), steelMat)
  intakeHood.position.set(2.4, 3.55, 1.95)
  group.add(intakeLouver, intakeHood)

  // Radiator Discharge Louvers on End Face (East)
  const radLouver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 3.0), louverMat)
  radLouver.position.set(3.82, 2.4, 0)
  group.add(radLouver)

  // 4. Roof-Mounted Critical-Grade Silencer Muffler with Heat Shield
  const muffler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 3.6, 16),
    steelMat
  )
  muffler.rotation.z = Math.PI / 2
  muffler.position.set(0, 4.45, 0)
  group.add(muffler)

  // Stainless Steel Flexible Bellows Pipe Connector
  const flexPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), steelMat)
  flexPipe.position.set(-1.4, 4.2, 0)
  group.add(flexPipe)

  // Vertical Exhaust Stack with Counterbalanced Rain Flapper Cap
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.8, 12), steelMat)
  stack.position.set(1.6, 5.2, 0)

  const rainCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12), steelMat)
  rainCap.rotation.z = 0.25
  rainCap.position.set(1.6, 6.12, 0)
  group.add(stack, rainCap)

  // 5. Emergency Stop (E-Stop) Button on Exterior (Red on Yellow Bezel)
  const eStopBezel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.04), new THREE.MeshStandardMaterial({ color: 0xf59e0b }))
  eStopBezel.position.set(-3.2, 2.1, 1.82)
  const eStopBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xef4444 }))
  eStopBtn.rotation.x = Math.PI / 2
  eStopBtn.position.set(-3.2, 2.1, 1.86)
  group.add(eStopBezel, eStopBtn)

  // 6. Running Telemetry Status Beacon (Preserved name for simulation!)
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  )
  beacon.name = 'Gen_Status_Beacon'
  beacon.position.set(-3.7, 4.25, 1.7)
  group.add(beacon)

  return group
}

// ==========================================
// RUN GENERATION AND EXPORT
// ==========================================
async function main() {
  console.log('[AssetGenerator] Starting 3D GLB Asset generation without colliders...')

  await exportToGlb(buildServerRackModel(), 'server_rack.glb')
  await exportToGlb(buildCoolingTowerModel(), 'cooling_tower.glb')
  await exportToGlb(buildTransformerModel(), 'transformer.glb')
  await exportToGlb(buildGeneratorModel(), 'generator.glb')

  console.log('[AssetGenerator] All GLB assets successfully generated without colliders!')
}

main().catch(console.error)
