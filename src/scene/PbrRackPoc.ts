import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PbrTextureGenerator } from './PbrTextureGenerator'
import type { ServerRack } from '../types/simulation'

/**
 * PbrRackPoc: High-Fidelity 42U Server Rack & Data Hall Cutaway Architecture.
 * 
 * Implements:
 * 1. True 3D Physical Server Rack Architecture with genuine mechanical depth:
 *    - 4 vertical EIA-310 19" equipment mounting rails
 *    - Recessed equipment bay cavity (not a flat 2D plane)
 *    - 6 heavy GPU accelerator blades with extruded chrome locking handles,
 *      recessed air-intake grilles, dual liquid cooling quick-disconnects (QD),
 *      and 800G QSFP-DD transceiver cages
 *    - Top 2U network spine switch with dual port rows
 *    - Bottom 3U redundant power shelf with 4 hot-swappable PSU modules
 *    - Rear perforated door and dual vertical 3-phase PDU busbars
 * 2. Optimized geometry consolidation (BufferGeometryUtils.mergeGeometries)
 *    combining repeated static sub-parts (rails, feet, ports, handles) to drastically
 *    reduce WebGL draw call overhead without sacrificing any physical 3D fidelity
 * 3. Dual-theme support: 'cyan' (Hall A - AI Training) vs 'amber' (Hall B - Inference & MoE Swarm)
 * 4. Architectural Proof-of-Concept Bay with PBR raised floor, structural column,
 *    cable ladder trays, chilled water manifold, containment canopy, and dual lighting
 * 5. 100% Interactive telemetry LED and raycasting selection compatibility
 */
export class PbrRackPoc {
  // Shared structural geometries across all racks
  private static sharedFrameGeo: THREE.BufferGeometry | null = null
  private static sharedFeetGeo: THREE.BufferGeometry | null = null
  private static sharedRailsGeo: THREE.BufferGeometry | null = null
  private static sharedRearVentGeo: THREE.PlaneGeometry | null = null
  private static sharedPdusGeo: THREE.BufferGeometry | null = null
  private static sharedConduitGeo: THREE.CylinderGeometry | null = null
  private static sharedHoseGeo: THREE.CylinderGeometry | null = null

  // Switch geometries
  private static sharedSwitchBodyGeo: THREE.BoxGeometry | null = null
  private static sharedSwitchFaceGeo: THREE.BoxGeometry | null = null
  private static sharedSwitchPortsGeo: THREE.BufferGeometry | null = null

  // Blade geometries (6 blades per rack)
  private static sharedBladeBodyGeo: THREE.BoxGeometry | null = null
  private static sharedBladeFaceGeo: THREE.BoxGeometry | null = null
  private static sharedBladeHandlesGeo: THREE.BufferGeometry | null = null
  private static sharedBladeLatchesGeo: THREE.BufferGeometry | null = null
  private static sharedBladeVentPocketGeo: THREE.BoxGeometry | null = null
  private static sharedBladePortsGeo: THREE.BufferGeometry | null = null
  private static sharedQdGeo: THREE.CylinderGeometry | null = null
  private static sharedBladeLedsGeo: THREE.BufferGeometry | null = null

  // PSU geometries (4 PSUs per rack)
  private static sharedPsuShelfGeo: THREE.BoxGeometry | null = null
  private static sharedPsuFacesGeo: THREE.BufferGeometry | null = null
  private static sharedPsuHandlesGeo: THREE.BufferGeometry | null = null

  // Dynamic status LED badge
  private static sharedLedGeo: THREE.BoxGeometry | null = null

  // Shared static materials
  private static frameMat: THREE.MeshStandardMaterial | null = null
  private static railMat: THREE.MeshStandardMaterial | null = null
  private static titaniumMatCyan: THREE.MeshStandardMaterial | null = null
  private static titaniumMatAmber: THREE.MeshStandardMaterial | null = null
  private static handleMat: THREE.MeshStandardMaterial | null = null
  private static latchMat: THREE.MeshStandardMaterial | null = null
  private static portMatCyan: THREE.MeshStandardMaterial | null = null
  private static portMatAmber: THREE.MeshStandardMaterial | null = null
  private static ventPocketMat: THREE.MeshStandardMaterial | null = null
  private static qdColdMat: THREE.MeshStandardMaterial | null = null
  private static qdWarmMat: THREE.MeshStandardMaterial | null = null
  private static hoseMat: THREE.MeshStandardMaterial | null = null
  private static psuMat: THREE.MeshStandardMaterial | null = null
  private static pduMat: THREE.MeshStandardMaterial | null = null
  private static rearDoorMat: THREE.MeshStandardMaterial | null = null
  private static conduitMatCyan: THREE.MeshStandardMaterial | null = null
  private static conduitMatAmber: THREE.MeshStandardMaterial | null = null
  private static bladeLedGreenMat: THREE.MeshBasicMaterial | null = null
  private static bladeLedCyanMat: THREE.MeshBasicMaterial | null = null
  private static bladeLedAmberMat: THREE.MeshBasicMaterial | null = null

  private static initSharedResources() {
    const W = 2.0
    const H = 3.8
    const D = 1.3
    const sideT = 0.06

    if (!this.sharedFrameGeo) {
      // 1. Structural Outer Frame Shell (Left side, Right side, Top roof, Bottom plinth)
      const sideL = new THREE.BoxGeometry(sideT, H, D)
      sideL.translate(-W / 2 + sideT / 2, H / 2, 0)

      const sideR = new THREE.BoxGeometry(sideT, H, D)
      sideR.translate(W / 2 - sideT / 2, H / 2, 0)

      const topPlate = new THREE.BoxGeometry(W, 0.08, D)
      topPlate.translate(0, H - 0.04, 0)

      const btmPlinth = new THREE.BoxGeometry(W, 0.12, D)
      btmPlinth.translate(0, 0.06, 0)

      this.sharedFrameGeo = mergeGeometries([sideL, sideR, topPlate, btmPlinth])!

      // 4 Leveling Feet
      const footGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8)
      const footOffsets = [
        [-W / 2 + 0.15, -D / 2 + 0.15],
        [W / 2 - 0.15, -D / 2 + 0.15],
        [-W / 2 + 0.15, D / 2 - 0.15],
        [W / 2 - 0.15, D / 2 - 0.15],
      ]
      const feetGeos: THREE.BufferGeometry[] = []
      footOffsets.forEach(([fx, fz]) => {
        const fg = footGeo.clone()
        fg.translate(fx, 0.06, fz)
        feetGeos.push(fg)
      })
      this.sharedFeetGeo = mergeGeometries(feetGeos)!

      // 4 Vertical 19" EIA-310 Rails
      const railGeo = new THREE.BoxGeometry(0.05, H - 0.24, 0.05)
      const railX = (W - 0.12) / 2 - 0.04
      const railOffsets = [
        [-railX, D / 2 - 0.14],
        [railX, D / 2 - 0.14],
        [-railX, -D / 2 + 0.16],
        [railX, -D / 2 + 0.16],
      ]
      const railsGeos: THREE.BufferGeometry[] = []
      railOffsets.forEach(([rx, rz]) => {
        const rg = railGeo.clone()
        rg.translate(rx, H / 2, rz)
        railsGeos.push(rg)
      })
      this.sharedRailsGeo = mergeGeometries(railsGeos)!

      // Rear Exhaust Door & Dual PDU Busbars
      this.sharedRearVentGeo = new THREE.PlaneGeometry(W - 0.14, H - 0.22)
      const pduGeo = new THREE.BoxGeometry(0.06, H - 0.4, 0.06)
      const pduL = pduGeo.clone()
      pduL.translate(-0.75, H / 2, -D / 2 + 0.12)
      const pduR = pduGeo.clone()
      pduR.translate(0.75, H / 2, -D / 2 + 0.12)
      this.sharedPdusGeo = mergeGeometries([pduL, pduR])!

      // Conduits & Hose
      this.sharedConduitGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8)
      this.sharedHoseGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.8, 8)

      // 2. Switch Geometries
      this.sharedSwitchBodyGeo = new THREE.BoxGeometry(W - 0.14, 0.18, D - 0.25)
      this.sharedSwitchFaceGeo = new THREE.BoxGeometry(W - 0.12, 0.16, 0.04)

      // 24 Switch Ports Merged
      const sPortBase = new THREE.BoxGeometry(0.045, 0.035, 0.03)
      const sPortGeos: THREE.BufferGeometry[] = []
      for (let p = 0; p < 24; p++) {
        const row = p < 12 ? 0 : 1
        const col = p % 12
        const px = -0.72 + col * 0.13
        const py = row === 0 ? 0.035 : -0.035
        const sp = sPortBase.clone()
        sp.translate(px, py, 0.02)
        sPortGeos.push(sp)
      }
      this.sharedSwitchPortsGeo = mergeGeometries(sPortGeos)!

      // 3. Blade Geometries
      this.sharedBladeBodyGeo = new THREE.BoxGeometry(W - 0.14, 0.42, D - 0.25)
      this.sharedBladeFaceGeo = new THREE.BoxGeometry(W - 0.12, 0.40, 0.04)

      // Dual Blade Extraction Handles Merged
      const handleBase = new THREE.BoxGeometry(0.035, 0.26, 0.065)
      const handleL = handleBase.clone()
      handleL.translate(-0.84, 0, 0.035)
      const handleR = handleBase.clone()
      handleR.translate(0.84, 0, 0.035)
      this.sharedBladeHandlesGeo = mergeGeometries([handleL, handleR])!

      // Dual Blade Latch Levers Merged
      const latchBase = new THREE.BoxGeometry(0.02, 0.08, 0.03)
      const latchL = latchBase.clone()
      latchL.translate(-0.84, 0, 0.07)
      const latchR = latchBase.clone()
      latchR.translate(0.84, 0, 0.07)
      this.sharedBladeLatchesGeo = mergeGeometries([latchL, latchR])!

      this.sharedBladeVentPocketGeo = new THREE.BoxGeometry(W - 0.65, 0.14, 0.02)

      // 8 Transceiver Ports Merged per Blade
      const bPortBase = new THREE.BoxGeometry(0.055, 0.04, 0.035)
      const bPortGeos: THREE.BufferGeometry[] = []
      for (let p = 0; p < 8; p++) {
        const px = -0.46 + p * 0.13
        const bp = bPortBase.clone()
        bp.translate(px, -0.08, 0.025)
        bPortGeos.push(bp)
      }
      this.sharedBladePortsGeo = mergeGeometries(bPortGeos)!

      this.sharedQdGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.065, 10)
      this.sharedQdGeo.rotateX(Math.PI / 2)

      // 3 Blade Status LEDs Merged per Blade
      const bLedBase = new THREE.SphereGeometry(0.018, 6, 6)
      const bLedGeos: THREE.BufferGeometry[] = []
      for (let l = 0; l < 3; l++) {
        const bl = bLedBase.clone()
        bl.translate(-0.72 + l * 0.045, 0.14, 0.025)
        bLedGeos.push(bl)
      }
      this.sharedBladeLedsGeo = mergeGeometries(bLedGeos)!

      // 4. PSU Shelf Geometries
      this.sharedPsuShelfGeo = new THREE.BoxGeometry(W - 0.14, 0.28, D - 0.25)
      const psuW = (W - 0.24) / 4 - 0.02
      const psuFaceBase = new THREE.BoxGeometry(psuW, 0.24, 0.04)
      const psuHandleBase = new THREE.BoxGeometry(0.025, 0.15, 0.045)
      const psuFaceGeos: THREE.BufferGeometry[] = []
      const psuHandleGeos: THREE.BufferGeometry[] = []
      for (let pi = 0; pi < 4; pi++) {
        const px = -0.66 + pi * (psuW + 0.04)
        const pf = psuFaceBase.clone()
        pf.translate(px, 0, 0)
        psuFaceGeos.push(pf)

        const ph = psuHandleBase.clone()
        ph.translate(px + psuW * 0.3, 0, 0.03)
        psuHandleGeos.push(ph)
      }
      this.sharedPsuFacesGeo = mergeGeometries(psuFaceGeos)!
      this.sharedPsuHandlesGeo = mergeGeometries(psuHandleGeos)!

      // 5. Dynamic LED Badge
      this.sharedLedGeo = new THREE.BoxGeometry(0.42, 0.06, 0.04)
    }

    if (!this.frameMat) {
      // 1. Structural Materials
      this.frameMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f18,
        roughness: 0.48,
        metalness: 0.75,
      })

      this.railMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.28,
        metalness: 0.92,
      })

      // 2. Titanium Faceplate Materials
      this.titaniumMatCyan = new THREE.MeshStandardMaterial({
        color: 0x1c2838,
        roughness: 0.32,
        metalness: 0.88,
      })

      this.titaniumMatAmber = new THREE.MeshStandardMaterial({
        color: 0x2c2018,
        roughness: 0.32,
        metalness: 0.88,
      })

      // 3. Hardware & Mechanical Materials
      this.handleMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.20,
        metalness: 0.95,
      })

      this.latchMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.25,
        metalness: 0.90,
      })

      this.portMatCyan = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.22,
        metalness: 0.88,
      })

      this.portMatAmber = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.22,
        metalness: 0.88,
      })

      this.ventPocketMat = new THREE.MeshStandardMaterial({
        color: 0x05080e,
        roughness: 0.92,
        metalness: 0.20,
      })

      this.qdColdMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.20,
        metalness: 0.95,
      })

      this.qdWarmMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.20,
        metalness: 0.95,
      })

      this.hoseMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.30,
        metalness: 0.92,
      })

      this.psuMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.82,
      })

      this.pduMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.85,
      })

      this.rearDoorMat = new THREE.MeshStandardMaterial({
        color: 0x080c14,
        roughness: 0.70,
        metalness: 0.50,
      })

      this.conduitMatCyan = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.5,
        metalness: 0.85,
        roughness: 0.2,
      })

      this.conduitMatAmber = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0xb45309,
        emissiveIntensity: 0.5,
        metalness: 0.85,
        roughness: 0.2,
      })

      this.bladeLedGreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 })
      this.bladeLedCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      this.bladeLedAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    }
  }

  /**
   * Creates an authentic 42U PBR Server Rack with genuine 3D physical construction.
   */
  public static createPbrRack(
    rackData: ServerRack,
    theme: 'cyan' | 'amber' = 'cyan',
    onLedRegister?: (id: string, mat: THREE.MeshStandardMaterial) => void
  ): THREE.Group {
    this.initSharedResources()

    const rackGroup = new THREE.Group()
    rackGroup.name = `PBR_${rackData.id}`

    const H = 3.8
    const D = 1.3
    const isCyan = theme === 'cyan'

    // ==========================================
    // 1. STRUCTURAL CABINET ENCLOSURE
    // ==========================================
    // Unified Outer Frame Shell
    const frameMesh = new THREE.Mesh(this.sharedFrameGeo!, this.frameMat!)
    frameMesh.castShadow = true
    frameMesh.receiveShadow = true
    rackGroup.add(frameMesh)

    // 4 Heavy Steel Leveling Feet
    const feetMesh = new THREE.Mesh(this.sharedFeetGeo!, this.railMat!)
    rackGroup.add(feetMesh)

    // 4 Vertical 19" EIA-310 Equipment Mounting Rails
    const railsMesh = new THREE.Mesh(this.sharedRailsGeo!, this.railMat!)
    railsMesh.castShadow = true
    rackGroup.add(railsMesh)

    // Rear Perforated Door Panel
    const rearDoor = new THREE.Mesh(this.sharedRearVentGeo!, this.rearDoorMat!)
    rearDoor.rotation.y = Math.PI
    rearDoor.position.set(0, H / 2, -D / 2 - 0.005)
    rackGroup.add(rearDoor)

    // Dual Rear 3-Phase PDU Busbars
    const pdusMesh = new THREE.Mesh(this.sharedPdusGeo!, this.pduMat!)
    rackGroup.add(pdusMesh)

    // ==========================================
    // 2. TOP 2U NETWORK SPINE SWITCH (U41-U42)
    // ==========================================
    const switchY = H - 0.28
    const switchZ = D / 2 - 0.14

    const switchBody = new THREE.Mesh(this.sharedSwitchBodyGeo!, this.frameMat!)
    switchBody.position.set(0, switchY, -0.05)

    const switchFace = new THREE.Mesh(
      this.sharedSwitchFaceGeo!,
      isCyan ? this.titaniumMatCyan! : this.titaniumMatAmber!
    )
    switchFace.position.set(0, switchY, switchZ)
    switchFace.castShadow = true

    const switchPorts = new THREE.Mesh(
      this.sharedSwitchPortsGeo!,
      isCyan ? this.portMatCyan! : this.portMatAmber!
    )
    switchPorts.position.set(0, switchY, switchZ)
    rackGroup.add(switchBody, switchFace, switchPorts)

    // ==========================================
    // 3. SIX HEAVY GPU ACCELERATOR BLADES (U5-U40)
    // ==========================================
    const bladeH = 0.46
    const bladeStartY = 0.65
    const bladeZ = D / 2 - 0.14
    const bladeFaceMat = isCyan ? this.titaniumMatCyan! : this.titaniumMatAmber!
    const portMat = isCyan ? this.portMatCyan! : this.portMatAmber!

    for (let b = 0; b < 6; b++) {
      const bladeY = bladeStartY + b * (bladeH + 0.05) + bladeH / 2

      // Main Drawer Chassis
      const bDrawer = new THREE.Mesh(this.sharedBladeBodyGeo!, this.frameMat!)
      bDrawer.position.set(0, bladeY, -0.05)

      // Extruded Brushed Titanium Faceplate
      const bFace = new THREE.Mesh(this.sharedBladeFaceGeo!, bladeFaceMat)
      bFace.position.set(0, bladeY, bladeZ)
      bFace.castShadow = true

      // Dual Extruded Mechanical Locking Handles
      const bHandles = new THREE.Mesh(this.sharedBladeHandlesGeo!, this.handleMat!)
      bHandles.position.set(0, bladeY, bladeZ)
      bHandles.castShadow = true

      // Dual Latch Levers
      const bLatches = new THREE.Mesh(this.sharedBladeLatchesGeo!, this.latchMat!)
      bLatches.position.set(0, bladeY, bladeZ)

      // Recessed Central Ventilation Pocket
      const ventPocket = new THREE.Mesh(this.sharedBladeVentPocketGeo!, this.ventPocketMat!)
      ventPocket.position.set(0, bladeY + 0.06, bladeZ + 0.02)

      // 8x 800G QSFP-DD Transceiver Ports
      const bPorts = new THREE.Mesh(this.sharedBladePortsGeo!, portMat)
      bPorts.position.set(0, bladeY, bladeZ)
      bPorts.castShadow = true

      // Direct-to-Chip (D2C) Liquid Cooling Quick-Disconnect Fittings (Cold & Warm)
      const qdCold = new THREE.Mesh(this.sharedQdGeo!, this.qdColdMat!)
      qdCold.position.set(0.64, bladeY - 0.08, bladeZ + 0.04)
      qdCold.castShadow = true

      const qdWarm = new THREE.Mesh(this.sharedQdGeo!, this.qdWarmMat!)
      qdWarm.position.set(0.74, bladeY - 0.08, bladeZ + 0.04)
      qdWarm.castShadow = true

      // Blade Status Diagnostic LEDs
      const ledMat = isCyan
        ? b % 2 === 0
          ? this.bladeLedCyanMat!
          : this.bladeLedGreenMat!
        : this.bladeLedAmberMat!
      const bLeds = new THREE.Mesh(this.sharedBladeLedsGeo!, ledMat)
      bLeds.position.set(0, bladeY, bladeZ)

      rackGroup.add(bDrawer, bFace, bHandles, bLatches, ventPocket, bPorts, qdCold, qdWarm, bLeds)
    }

    // ==========================================
    // 4. BOTTOM 3U POWER SUPPLY SHELF (PSUs)
    // ==========================================
    const psuY = 0.36
    const psuShelf = new THREE.Mesh(this.sharedPsuShelfGeo!, this.frameMat!)
    psuShelf.position.set(0, psuY, -0.05)

    const psuFaces = new THREE.Mesh(this.sharedPsuFacesGeo!, this.psuMat!)
    psuFaces.position.set(0, psuY, bladeZ)
    psuFaces.castShadow = true

    const psuHandles = new THREE.Mesh(this.sharedPsuHandlesGeo!, this.handleMat!)
    psuHandles.position.set(0, psuY, bladeZ)

    rackGroup.add(psuShelf, psuFaces, psuHandles)

    // ==========================================
    // 5. OVERHEAD DROP CONDUIT & LIQUID HOSE
    // ==========================================
    const conduitMat = isCyan ? this.conduitMatCyan! : this.conduitMatAmber!
    const conduit = new THREE.Mesh(this.sharedConduitGeo!, conduitMat)
    conduit.position.set(-0.35, H + 0.4, D / 2 - 0.15)
    rackGroup.add(conduit)

    const hoseDrop = new THREE.Mesh(this.sharedHoseGeo!, this.hoseMat!)
    hoseDrop.position.set(0.35, H + 0.4, D / 2 - 0.15)
    rackGroup.add(hoseDrop)

    // ==========================================
    // 6. DYNAMIC TELEMETRY STATUS LED BADGE
    // ==========================================
    const isError = rackData.hasFault || rackData.health === 'critical'
    const isWarn = rackData.health === 'warning' || rackData.gpuUtilisation > 85
    const ledColor = isError ? 0xf43f5e : isWarn ? 0xf59e0b : isCyan ? 0x10b981 : 0x06b6d4
    const statusLedMat = new THREE.MeshStandardMaterial({
      color: ledColor,
      emissive: ledColor,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.1,
    })
    const ledMesh = new THREE.Mesh(this.sharedLedGeo!, statusLedMat)
    ledMesh.name = `Rack_LED_${rackData.id}`
    ledMesh.position.set(0, H - 0.12, D / 2 + 0.02)
    rackGroup.add(ledMesh)

    if (onLedRegister) {
      onLedRegister(rackData.id, statusLedMat)
    }

    // Raycast hit target metadata
    const hitData = {
      id: rackData.id,
      name: `${rackData.id} (${rackData.gpuType})`,
      type: 'rack',
      hallId: rackData.hallId,
      data: rackData,
    }
    frameMesh.userData = hitData
    switchFace.userData = hitData

    return rackGroup
  }

  /**
   * PoC Showcase Rack compatibility wrapper
   */
  public static createShowcaseRack(
    rackData: ServerRack,
    onLedRegister?: (id: string, mat: THREE.MeshStandardMaterial) => void
  ): THREE.Group {
    return this.createPbrRack(rackData, 'cyan', onLedRegister)
  }

  /**
   * Constructs the reference-matching showcase architectural cutaway bay section.
   */
  public static createShowcaseHallSection(posX: number, posZ: number): THREE.Group {
    const hallSection = new THREE.Group()
    hallSection.position.set(posX, 0, posZ)

    // 1. PBR Raised Access Floor (Extended Bay: 14m Width x 9m Depth)
    const { map: floorMap, normalMap: floorNorm } = PbrTextureGenerator.getRaisedFloorTexture()
    floorMap.repeat.set(7, 4.5)
    floorNorm.repeat.set(7, 4.5)

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorMap,
      normalMap: floorNorm,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughness: 0.35,
      metalness: 0.55,
    })
    const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.28, 9), floorMat)
    floor.position.set(0, 0.14, 0.5)
    floor.receiveShadow = true
    hallSection.add(floor)

    // Perforated Cold-Aisle Floor Grilles
    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.85,
    })
    const grilleGeo = new THREE.BoxGeometry(12, 0.04, 1.4)
    const grille = new THREE.Mesh(grilleGeo, grilleMat)
    grille.position.set(0, 0.29, 2.2)
    hallSection.add(grille)

    // 2. Heavy Structural Steel Column (Wide-Flange I-Beam with Bolted Baseplate)
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.88,
      roughness: 0.30,
    })
    const colGroup = new THREE.Group()
    colGroup.position.set(-5.5, 3.8, -2.4)

    // Web and Flanges
    const colWeb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.6, 0.48), steelMat)
    const colFlange1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 7.6, 0.12), steelMat)
    colFlange1.position.z = 0.21
    const colFlange2 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 7.6, 0.12), steelMat)
    colFlange2.position.z = -0.21

    // Heavy Baseplate with 4 Anchor Bolts
    const baseplate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.75), steelMat)
    baseplate.position.y = -3.73
    colGroup.add(colWeb, colFlange1, colFlange2, baseplate)

    const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
    const boltOffsets = [
      [-0.26, -0.26],
      [0.26, -0.26],
      [-0.26, 0.26],
      [0.26, 0.26],
    ]
    boltOffsets.forEach(([bx, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat)
      bolt.position.set(bx, -3.64, bz)
      colGroup.add(bolt)
    })
    hallSection.add(colGroup)

    // 3. Overhead Galvanized Wire-Mesh Cable Ladder Tray
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.38,
    })
    const trayGroup = new THREE.Group()
    trayGroup.position.set(0, 5.2, 0.8)

    // Side Rails
    const sideRailL = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 0.04), trayMat)
    sideRailL.position.z = -0.32
    const sideRailR = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 0.04), trayMat)
    sideRailR.position.z = 0.32
    trayGroup.add(sideRailL, sideRailR)

    // Cross Rungs
    const rungGeo = new THREE.BoxGeometry(0.04, 0.02, 0.6)
    for (let rx = -6.8; rx <= 6.8; rx += 0.4) {
      const rung = new THREE.Mesh(rungGeo, trayMat)
      rung.position.set(rx, -0.05, 0)
      trayGroup.add(rung)
    }

    // High-Density Fiber Optic Cable Trunk Bundles
    const fiberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.2,
      roughness: 0.5,
    })
    const fiberBundle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 14, 8), fiberMat)
    fiberBundle.rotation.z = Math.PI / 2
    fiberBundle.position.set(0, 0.04, -0.12)

    const powerCableMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.7 })
    const powerBundle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 14, 8), powerCableMat)
    powerBundle.rotation.z = Math.PI / 2
    powerBundle.position.set(0, 0.05, 0.12)
    trayGroup.add(fiberBundle, powerBundle)
    hallSection.add(trayGroup)

    // 4. Yellow Panduit FiberRunner Overhead Raceway Trough
    const troughMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.3,
    })
    const trough = new THREE.Mesh(new THREE.BoxGeometry(14, 0.14, 0.28), troughMat)
    trough.position.set(0, 5.6, 0.8)
    hallSection.add(trough)

    // 5. Insulated Chilled-Water Piping Manifold
    const pipeMatSupply = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.88,
      roughness: 0.25,
    })
    const pipeMatReturn = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      metalness: 0.88,
      roughness: 0.25,
    })

    const supplyPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 14, 16), pipeMatSupply)
    supplyPipe.rotation.z = Math.PI / 2
    supplyPipe.position.set(0, 4.8, -1.8)

    const returnPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 14, 16), pipeMatReturn)
    returnPipe.rotation.z = Math.PI / 2
    returnPipe.position.set(0, 5.3, -1.8)
    hallSection.add(supplyPipe, returnPipe)

    // 6. Cold-Aisle Polycarbonate Containment Canopy (Tempered Ceiling Panels)
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.40,
      roughness: 0.06,
      metalness: 0.92,
    })
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.06, 2.8), canopyMat)
    canopy.position.set(0, 4.5, 2.0)
    hallSection.add(canopy)

    // 7. Industrial Linear Luminaire (Cold Aisle Cyan Wash - Reference Match)
    const coldWashLight = new THREE.PointLight(0x06b6d4, 4.2, 12, 1.8)
    coldWashLight.position.set(0, 4.3, 2.0)
    coldWashLight.castShadow = true
    coldWashLight.shadow.bias = -0.0001
    hallSection.add(coldWashLight)

    // 8. Hot-Aisle Amber Backlight (Reference Two-Tone Contrast)
    const warmBackLight = new THREE.PointLight(0xf59e0b, 2.6, 9, 2.0)
    warmBackLight.position.set(0, 3.8, -1.8)
    hallSection.add(warmBackLight)

    return hallSection
  }
}
