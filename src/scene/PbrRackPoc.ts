import * as THREE from 'three'
import { PbrTextureGenerator } from './PbrTextureGenerator'
import type { ServerRack } from '../types/simulation'

/**
 * PbrRackPoc: Representative High-Fidelity 42U Server Rack & Data Hall Cutaway Section.
 * 
 * Implements:
 * 1. Single unified PBR 42U Server Rack with high-resolution texture maps (Albedo, Normal, Roughness)
 * 2. High-contrast cold-aisle containment lighting (cyan) and hot-aisle rear wash (amber)
 * 3. Computer access raised-floor with realistic tile seams and normal relief
 * 4. Overhead structural steel beam, cable ladder, and transparent containment canopy
 * 5. Full telemetry LED and raycasting selection compatibility
 */
export class PbrRackPoc {
  public static createShowcaseRack(
    rackData: ServerRack,
    onLedRegister?: (id: string, mat: THREE.MeshStandardMaterial) => void
  ): THREE.Group {
    const rackGroup = new THREE.Group()
    rackGroup.name = `PBR_${rackData.id}`

    const W = 2.0
    const H = 3.8
    const D = 1.3

    // 1. PBR Faceplate Material (Albedo + Tangent Normal Map + Roughness Map)
    const albedoTex = PbrTextureGenerator.getServerRackAlbedoTexture()
    const normalTex = PbrTextureGenerator.getServerRackNormalMap()
    const roughTex = PbrTextureGenerator.getServerRackRoughnessMap()

    const faceplateMat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: roughTex,
      metalness: 0.85,
      roughness: 0.35,
    })

    // Outer Chassis Material (Dark anodized aluminum)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0c131c,
      roughness: 0.45,
      metalness: 0.75,
    })

    // 2. Main Chassis Body
    const bodyGeo = new THREE.BoxGeometry(W, H, D)
    const body = new THREE.Mesh(bodyGeo, chassisMat)
    body.position.y = H / 2
    body.castShadow = true
    body.receiveShadow = true
    rackGroup.add(body)

    // 3. High-Detail PBR Front Server Faceplate
    // Placed precisely on the front face (Z = D/2 + 0.01)
    const faceGeo = new THREE.PlaneGeometry(W - 0.08, H - 0.12)
    const faceMesh = new THREE.Mesh(faceGeo, faceplateMat)
    faceMesh.position.set(0, H / 2, D / 2 + 0.012)
    faceMesh.castShadow = true
    rackGroup.add(faceMesh)

    // 4. Heavy Front Extruded Bezel Frame (Top, Bottom, Left, Right)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
    })
    const borderThickness = 0.06
    const borderDepth = 0.06

    // Top & Bottom Lips
    const topLip = new THREE.Mesh(new THREE.BoxGeometry(W, borderThickness, borderDepth), bezelMat)
    topLip.position.set(0, H - borderThickness / 2, D / 2 + borderDepth / 2)
    const btmLip = new THREE.Mesh(new THREE.BoxGeometry(W, borderThickness, borderDepth), bezelMat)
    btmLip.position.set(0, borderThickness / 2, D / 2 + borderDepth / 2)

    // Left & Right Flanges
    const sideLipGeo = new THREE.BoxGeometry(borderThickness, H, borderDepth)
    const leftLip = new THREE.Mesh(sideLipGeo, bezelMat)
    leftLip.position.set(-W / 2 + borderThickness / 2, H / 2, D / 2 + borderDepth / 2)
    const rightLip = new THREE.Mesh(sideLipGeo, bezelMat)
    rightLip.position.set(W / 2 - borderThickness / 2, H / 2, D / 2 + borderDepth / 2)

    rackGroup.add(topLip, btmLip, leftLip, rightLip)

    // 5. Overhead Cold-Aisle Containment Cable Tray & Drop Conduit
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    })
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), conduitMat)
    conduit.position.set(0, H + 0.4, D / 2)
    rackGroup.add(conduit)

    // 6. Dynamic Telemetry Status LED Badge
    const isError = rackData.hasFault || rackData.health === 'critical'
    const isWarn = rackData.health === 'warning'
    const ledColor = isError ? 0xf43f5e : isWarn ? 0xf59e0b : 0x10b981
    const ledMat = new THREE.MeshStandardMaterial({
      color: ledColor,
      emissive: ledColor,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.1,
    })
    const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.04), ledMat)
    ledMesh.name = `Rack_LED_${rackData.id}`
    ledMesh.position.set(0, H - 0.14, D / 2 + 0.04)
    rackGroup.add(ledMesh)

    if (onLedRegister) {
      onLedRegister(rackData.id, ledMat)
    }

    // Attach interaction metadata
    body.userData = {
      id: rackData.id,
      name: `${rackData.id} (${rackData.gpuType})`,
      type: 'rack',
      data: rackData,
    }
    faceMesh.userData = body.userData

    return rackGroup
  }

  /**
   * Constructs the showcase cutaway architectural bay section around the representative rack.
   */
  public static createShowcaseHallSection(posX: number, posZ: number): THREE.Group {
    const hallSection = new THREE.Group()
    hallSection.position.set(posX, 0, posZ)

    // 1. PBR Raised Access Floor (4x4 meter platform with realistic grid tiles)
    const { map: floorMap, normalMap: floorNorm } = PbrTextureGenerator.getRaisedFloorTexture()
    floorMap.repeat.set(4, 4)
    floorNorm.repeat.set(4, 4)

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorMap,
      normalMap: floorNorm,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughness: 0.35,
      metalness: 0.65,
    })
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.28, 6.4), floorMat)
    floor.position.set(0, 0.14, 0)
    floor.receiveShadow = true
    hallSection.add(floor)

    // 2. Heavy Structural Steel Column (I-Beam with bolted baseplate)
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3,
    })
    const colWeb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.5, 0.45), steelMat)
    const colFlange1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.5, 0.12), steelMat)
    colFlange1.position.z = 0.2
    const colFlange2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.5, 0.12), steelMat)
    colFlange2.position.z = -0.2

    const colGroup = new THREE.Group()
    colGroup.position.set(-3.2, 3.75, -2.8)
    colGroup.add(colWeb, colFlange1, colFlange2)
    hallSection.add(colGroup)

    // 3. Overhead Galvanized Cable Tray Ladder
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.45,
    })
    const tray = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 0.5), trayMat)
    tray.position.set(0, 5.2, 0)
    hallSection.add(tray)

    // 4. Cold-Aisle Transparent Containment Canopy (Tempered Polycarbonate Roof)
    const glassCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.9,
    })
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.2), glassCanopyMat)
    canopy.position.set(0, 4.6, 0.8)
    hallSection.add(canopy)

    // 5. High-Impact Cold-Aisle Cyan Linear Luminaire (Wash Light)
    // Directly reproduces the electric cyan glow seen in the reference!
    const coldLight = new THREE.PointLight(0x06b6d4, 3.2, 8.5)
    coldLight.position.set(0, 4.4, 0.9)
    hallSection.add(coldLight)

    // 6. Warm Amber Hot-Aisle Backlight (Contrast)
    const warmLight = new THREE.PointLight(0xf59e0b, 1.8, 6.0)
    warmLight.position.set(0, 3.8, -1.4)
    hallSection.add(warmLight)

    return hallSection
  }
}
