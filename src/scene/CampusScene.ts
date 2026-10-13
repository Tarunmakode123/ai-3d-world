import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type {
  WeatherType,
  DayNightMode,
  ServerRack,
  SelectedObject,
} from '../types/simulation'

export interface SceneCallbacks {
  onSelectObject: (obj: SelectedObject | null) => void
  onHoverObject?: (name: string | null) => void
}

export class CampusScene {
  private container: HTMLElement
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: OrbitControls

  private callbacks: SceneCallbacks
  private animationFrameId: number = 0
  private clock: THREE.Clock = new THREE.Clock()

  // Balanced Lighting Rig (Warm & Cool contrast matching reference)
  private ambientLight: THREE.AmbientLight
  private dirLight: THREE.DirectionalLight // Key Light
  private fillLight: THREE.DirectionalLight // Fill Light (cool blue)
  private rimLight: THREE.DirectionalLight // Rim Light (cyan highlights)
  private hemiLight: THREE.HemisphereLight
  private streetLights: THREE.PointLight[] = []
  private hallLights: THREE.PointLight[] = []

  // Interactive Objects Registry
  private interactiveMeshes: THREE.Object3D[] = []
  private rackMeshMap: Map<string, THREE.Group> = new Map()
  private rackLedMaterials: Map<string, THREE.MeshBasicMaterial[]> = new Map()

  // Moving Vehicles & Parts
  private fans: THREE.Group[] = []
  private truckGroup: THREE.Group = new THREE.Group()
  private serviceCartGroup: THREE.Group = new THREE.Group()

  // Animated Data Packets along curved fibre route
  private packetMeshes: THREE.Mesh[] = []
  private packetCurves: THREE.CatmullRomCurve3[] = []
  private packetProgress: number[] = []

  // Animated Cooling Vapor Particles (Steam plumes)
  private vaporParticles: THREE.Points | null = null
  private vaporPositions: Float32Array | null = null

  // Rain Particles (Monsoon & Storm)
  private rainParticles: THREE.Points | null = null
  private rainGeometry: THREE.BufferGeometry | null = null

  // Heat Overlay Meshes
  private heatOverlayGroup: THREE.Group = new THREE.Group()

  // Selection Ring & Reticle
  private selectionRing: THREE.Group = new THREE.Group()
  public targetSelectionId: string | null = null

  // Camera animation lerp state
  private isCameraTransitioning: boolean = false
  private camStartPos: THREE.Vector3 = new THREE.Vector3()
  private camEndPos: THREE.Vector3 = new THREE.Vector3()
  private camStartLook: THREE.Vector3 = new THREE.Vector3()
  private camEndLook: THREE.Vector3 = new THREE.Vector3()
  private camLerpProgress: number = 1.0

  // Cinematic Tour State (Traversing viewpoints matching reference)
  private isCinematic: boolean = false
  private cinematicWaypointIndex: number = 0
  private cinematicTimer: number = 0
  private cinematicWaypoints = [
    { pos: new THREE.Vector3(-36, 50, 64), target: new THREE.Vector3(4, 3, -4), duration: 8 },
    { pos: new THREE.Vector3(-14, 22, 18), target: new THREE.Vector3(-6, 3, -4), duration: 7 }, // Hall A
    { pos: new THREE.Vector3(10, 22, 10), target: new THREE.Vector3(16, 3, -14), duration: 7 }, // Hall B
    { pos: new THREE.Vector3(-34, 18, -12), target: new THREE.Vector3(-28, 4, -26), duration: 6 }, // Cooling
    { pos: new THREE.Vector3(-44, 16, 12), target: new THREE.Vector3(-38, 3, 10), duration: 6 }, // Power & Tanks
    { pos: new THREE.Vector3(22, 18, -14), target: new THREE.Vector3(26, 4, -26), duration: 6 }, // Fibre Vault
  ]

  // Environmental state
  private currentWeather: WeatherType = 'clear'
  private currentDayNight: DayNightMode = 'night'
  private lightningTimer: number = 0

  // Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private isDragging: boolean = false
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 }

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container
    this.callbacks = callbacks

    // 1. Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x07111e)
    this.scene.fog = new THREE.FogExp2(0x07111e, 0.0028)

    // 2. Camera: Elevated diagonal 3/4 aerial view matching IMAGE 2
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 400)
    this.camera.position.set(-36, 50, 64)

    // 3. Renderer with full sRGB color space & balanced tone mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.35
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05
    this.controls.minDistance = 10
    this.controls.maxDistance = 150
    this.controls.target.set(4, 3, -4)

    // 5. Lighting Setup (Combining warm industrial lamps with cool cyber illumination)
    this.ambientLight = new THREE.AmbientLight(0x5a7596, 1.4)
    this.scene.add(this.ambientLight)

    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e2e42, 1.2)
    this.scene.add(this.hemiLight)

    // Key Light from upper right front
    this.dirLight = new THREE.DirectionalLight(0xf8fafc, 2.2)
    this.dirLight.position.set(42, 58, 38)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width = 2048
    this.dirLight.shadow.mapSize.height = 2048
    this.dirLight.shadow.camera.near = 10
    this.dirLight.shadow.camera.far = 180
    const shadowD = 75
    this.dirLight.shadow.camera.left = -shadowD
    this.dirLight.shadow.camera.right = shadowD
    this.dirLight.shadow.camera.top = shadowD
    this.dirLight.shadow.camera.bottom = -shadowD
    this.dirLight.shadow.bias = -0.0003
    this.scene.add(this.dirLight)

    // Secondary Fill Light from upper left front (cool slate blue)
    this.fillLight = new THREE.DirectionalLight(0x38bdf8, 1.3)
    this.fillLight.position.set(-45, 40, 20)
    this.scene.add(this.fillLight)

    // Rim Light from rear top for crisp silhouettes
    this.rimLight = new THREE.DirectionalLight(0x22d3ee, 1.4)
    this.rimLight.position.set(10, 35, -60)
    this.scene.add(this.rimLight)

    // 6. Build the Entire Redesigned Campus World
    this.buildCampusEnvironment()
    this.buildDataCenterComplex()
    this.buildCoolingInfrastructure()
    this.buildPowerInfrastructure()
    this.buildNetworkInfrastructure()
    this.buildLogisticsAndParking()
    this.buildDataPackets()
    this.buildCoolingVaporParticles()
    this.buildRainParticles()
    this.buildSelectionRing()

    // 7. Event Listeners
    this.initEvents()

    // 8. Start Loop
    this.animate()
  }

  // ==========================================
  // CAMPUS GROUND, ROADS, STREETLIGHTS & TREES
  // ==========================================
  private buildCampusEnvironment() {
    // 1. Campus Base Ground (Dark asphalt/concrete campus apron)
    const groundGeo = new THREE.PlaneGeometry(150, 130)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111c2a,
      roughness: 0.85,
      metalness: 0.15,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Boundary Foundation Curb
    const borderGeo = new THREE.BoxGeometry(154, 1.2, 134)
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x08121f, roughness: 0.9 })
    const border = new THREE.Mesh(borderGeo, borderMat)
    border.position.set(0, -0.6, 0)
    this.scene.add(border)

    // 2. Road Network & Pavement
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a2636, roughness: 0.8, metalness: 0.1 })
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 })
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })

    // Front Main Access Road (Running East-West in front of campus: Z: 24 to Z: 36)
    const frontRoadGeo = new THREE.PlaneGeometry(130, 10)
    const frontRoad = new THREE.Mesh(frontRoadGeo, roadMat)
    frontRoad.rotation.x = -Math.PI / 2
    frontRoad.position.set(0, 0.02, 30)
    frontRoad.receiveShadow = true
    this.scene.add(frontRoad)

    // Road Divider Yellow Lines
    for (let x = -60; x <= 60; x += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.25), yellowLineMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(x, 0.03, 30)
      this.scene.add(dash)
    }

    // Road Edge White Lines
    const edgeN = new THREE.Mesh(new THREE.PlaneGeometry(130, 0.2), whiteLineMat)
    edgeN.rotation.x = -Math.PI / 2
    edgeN.position.set(0, 0.03, 25.2)
    const edgeS = new THREE.Mesh(new THREE.PlaneGeometry(130, 0.2), whiteLineMat)
    edgeS.rotation.x = -Math.PI / 2
    edgeS.position.set(0, 0.03, 34.8)
    this.scene.add(edgeN, edgeS)

    // Entrance Access Branch Road to Gatehouse & Loading Dock
    const accessRoadGeo = new THREE.PlaneGeometry(12, 28)
    const accessRoad = new THREE.Mesh(accessRoadGeo, roadMat)
    accessRoad.rotation.x = -Math.PI / 2
    accessRoad.position.set(10, 0.02, 14)
    accessRoad.receiveShadow = true
    this.scene.add(accessRoad)

    // Zebra Crosswalk in front of Security Gate
    for (let i = -4.5; i <= 4.5; i += 0.9) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4.0), whiteLineMat)
      stripe.rotation.x = -Math.PI / 2
      stripe.position.set(i, 0.035, 24)
      this.scene.add(stripe)
    }

    // 3. Streetlights with Warm Industrial Amber Glow (Matching IMAGE 2)
    const streetLightPoleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.5, 8)
    const streetLightPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    const streetLightHeadGeo = new THREE.BoxGeometry(0.7, 0.2, 0.4)
    const streetLightHeadMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.5,
    })

    const lightPositions: [number, number][] = [
      [-52, 24], [-28, 24], [-4, 24], [22, 24], [48, 24],
      [-52, 36], [-28, 36], [-4, 36], [22, 36], [48, 36],
      [-50, -6], [-50, 10], [52, -10], [52, 10],
    ]

    lightPositions.forEach(([lx, lz]) => {
      const poleGroup = new THREE.Group()
      poleGroup.position.set(lx, 0, lz)

      const pole = new THREE.Mesh(streetLightPoleGeo, streetLightPoleMat)
      pole.position.y = 2.75
      poleGroup.add(pole)

      const head = new THREE.Mesh(streetLightHeadGeo, streetLightHeadMat)
      head.position.set(0, 5.4, 0)
      poleGroup.add(head)

      // Warm Amber Point Light casting ground illumination pool
      const warmLight = new THREE.PointLight(0xfbbf24, 1.8, 16)
      warmLight.position.set(0, 5.2, 0)
      poleGroup.add(warmLight)
      this.streetLights.push(warmLight)

      this.scene.add(poleGroup)
    })

    // 4. Perimeter Lush Green Trees (Matching IMAGE 2)
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.0, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 })
    const foliageGeo = new THREE.DodecahedronGeometry(1.6, 1)
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x166534, // lush natural pine/evergreen green
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    })

    const treePositions = [
      // Rear Perimeter Grove
      [-64, 0, -48], [-54, 0, -52], [-42, 0, -54], [-30, 0, -52], [-18, 0, -54],
      [-6, 0, -52], [6, 0, -54], [18, 0, -52], [30, 0, -54], [44, 0, -52], [58, 0, -48],
      // Left Perimeter Grove
      [-64, 0, -32], [-66, 0, -16], [-65, 0, 0], [-66, 0, 16], [-64, 0, 32], [-62, 0, 48],
      // Right Perimeter Grove
      [64, 0, -32], [65, 0, -16], [64, 0, 0], [66, 0, 16], [65, 0, 32], [62, 0, 48],
      // Front Perimeter Belt
      [-54, 0, 52], [-36, 0, 54], [-18, 0, 52], [6, 0, 54], [28, 0, 52], [48, 0, 54],
    ]

    treePositions.forEach(([tx, ty, tz]) => {
      const tree = new THREE.Group()
      tree.position.set(tx, ty, tz)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 1.0
      const foliage = new THREE.Mesh(foliageGeo, foliageMat)
      foliage.position.y = 3.2
      foliage.castShadow = true
      tree.add(trunk, foliage)
      this.scene.add(tree)
    })
  }

  // ==========================================
  // MAIN DATA CENTRE COMPLEX (HALL A & HALL B)
  // ==========================================
  private buildDataCenterComplex() {
    const complexGroup = new THREE.Group()

    // 1. Unified Main Building Foundation & Walls (Matching the colossal building in IMAGE 2)
    // Footprint: Width 58, Height 7.2, Depth 44, Centered around X: 5, Z: -9
    const buildingWidth = 58
    const buildingDepth = 42
    const buildingHeight = 7.0

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937, // dark slate/charcoal modern industrial panels
      roughness: 0.5,
      metalness: 0.45,
    })

    const wallTrimMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.4,
      metalness: 0.6,
    })

    // Outer Perimeter Solid Walls with Parapets
    const outerWallsGeo = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth)
    const outerWalls = new THREE.Mesh(outerWallsGeo, buildingMat)
    outerWalls.position.set(5, buildingHeight / 2, -9)
    outerWalls.receiveShadow = true
    outerWalls.castShadow = true
    complexGroup.add(outerWalls)

    // Rooftop Louvered Parapets & HVAC Units
    const roofHvacGeo = new THREE.BoxGeometry(4.5, 1.8, 3.2)
    const roofHvacMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.7 })
    const hvacPositions = [
      [-18, 7.8, -26], [-6, 7.8, -26], [6, 7.8, -26], [22, 7.8, -26],
      [-20, 7.8, 8], [24, 7.8, 8],
    ]
    hvacPositions.forEach(([hx, hy, hz]) => {
      const hvac = new THREE.Mesh(roofHvacGeo, roofHvacMat)
      hvac.position.set(hx, hy, hz)
      hvac.castShadow = true
      complexGroup.add(hvac)
    })

    // Illuminated "CORELINE" Corporate Logo on South Facade (As seen in IMAGE 2!)
    const logoBadgeGeo = new THREE.BoxGeometry(10, 2.2, 0.4)
    const logoBadgeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
    })
    const logoBadge = new THREE.Mesh(logoBadgeGeo, logoBadgeMat)
    logoBadge.position.set(18, 4.2, 12.2)
    complexGroup.add(logoBadge)

    // 2. Dual Cutaway Courtyards for HALL A and HALL B
    // Hall A Interior Floor (Front-Left Cutaway)
    const hallAFloorGeo = new THREE.PlaneGeometry(24, 20)
    const hallFloorMat = new THREE.MeshStandardMaterial({
      color: 0x111c2a,
      roughness: 0.4,
      metalness: 0.6,
    })
    const hallAFloor = new THREE.Mesh(hallAFloorGeo, hallFloorMat)
    hallAFloor.rotation.x = -Math.PI / 2
    hallAFloor.position.set(-6, 0.52, -4)
    hallAFloor.receiveShadow = true
    hallAFloor.userData = { id: 'hall-a', name: 'HALL A // FOUNDATION TRAINING', type: 'hall' }
    complexGroup.add(hallAFloor)
    this.interactiveMeshes.push(hallAFloor)

    // Hall B Interior Floor (Rear-Right Cutaway)
    const hallBFloorGeo = new THREE.PlaneGeometry(24, 20)
    const hallBFloor = new THREE.Mesh(hallBFloorGeo, hallFloorMat)
    hallBFloor.rotation.x = -Math.PI / 2
    hallBFloor.position.set(16, 0.52, -14)
    hallBFloor.receiveShadow = true
    hallBFloor.userData = { id: 'hall-b', name: 'HALL B // INFERENCE & MOE CLUSTER', type: 'hall' }
    complexGroup.add(hallBFloor)
    this.interactiveMeshes.push(hallBFloor)

    // Interior Structural Beams & Overhead Cable Trays
    const beamGeo = new THREE.BoxGeometry(24, 0.4, 0.6)
    const trayGeo = new THREE.BoxGeometry(22, 0.18, 0.5)
    const yellowTrayMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 })

    // Hall A Beams & Yellow Trays
    for (let tz = -10; tz <= 4; tz += 4.5) {
      const beam = new THREE.Mesh(beamGeo, wallTrimMat)
      beam.position.set(-6, 6.8, tz)
      const tray = new THREE.Mesh(trayGeo, yellowTrayMat)
      tray.position.set(-6, 5.0, tz)
      complexGroup.add(beam, tray)
    }

    // Hall B Beams & Yellow Trays
    for (let tz = -20; tz <= -6; tz += 4.5) {
      const beam = new THREE.Mesh(beamGeo, wallTrimMat)
      beam.position.set(16, 6.8, tz)
      const tray = new THREE.Mesh(trayGeo, yellowTrayMat)
      tray.position.set(16, 5.0, tz)
      complexGroup.add(beam, tray)
    }

    // Interior Hall Ambient Downlights
    // Hall A: Bright Cyan / Electric Blue Downlight
    const hallALight = new THREE.PointLight(0x22d3ee, 3.8, 32)
    hallALight.position.set(-6, 6.5, -4)
    complexGroup.add(hallALight)
    this.hallLights.push(hallALight)

    // Hall B: Vibrant Amber & Blue Downlight (Matching the dual color aisles in IMAGE 2)
    const hallBLight = new THREE.PointLight(0x38bdf8, 3.4, 32)
    hallBLight.position.set(16, 6.5, -14)
    complexGroup.add(hallBLight)
    this.hallLights.push(hallBLight)

    this.scene.add(complexGroup)

    // Build the 48 Detailed Dense Server Racks inside Hall A and Hall B
    this.buildDenseServerRacks()
  }

  // ==========================================
  // DENSE HIGH-REALISM GPU SERVER RACKS
  // ==========================================
  private buildDenseServerRacks() {
    // Highly detailed rack model geometry
    const rackCabinetGeo = new THREE.BoxGeometry(2.2, 3.5, 1.2)
    const rackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.5,
    })

    const serverBladeGeo = new THREE.BoxGeometry(2.05, 0.38, 0.1)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.35,
    })

    const ledGeo = new THREE.SphereGeometry(0.06, 8, 8)

    // Hall A: 24 Racks in 4 dense rows (X: -14 to X: 2, Z: -10 to Z: 3)
    // Front aisles: Electric Cyan & Blue glow
    for (let row = 0; row < 4; row++) {
      // Hot aisle orange floor runner
      const aisleOrangeGeo = new THREE.PlaneGeometry(18, 0.4)
      const aisleOrangeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 })
      const aisleRunner = new THREE.Mesh(aisleOrangeGeo, aisleOrangeMat)
      aisleRunner.rotation.x = -Math.PI / 2
      aisleRunner.position.set(-6, 0.54, -10 + row * 4.2 - 1.6)
      this.scene.add(aisleRunner)

      for (let col = 0; col < 6; col++) {
        const index = row * 6 + col + 1
        const rackId = `RACK-A-${String(index).padStart(3, '0')}`
        const posX = -14 + col * 2.8
        const posZ = -10 + row * 4.2

        const rackGroup = new THREE.Group()
        rackGroup.position.set(posX, 1.75 + 0.52, posZ)

        // Outer Cabinet
        const cabinet = new THREE.Mesh(rackCabinetGeo, rackFrameMat)
        cabinet.castShadow = true
        cabinet.receiveShadow = true
        cabinet.userData = { id: rackId, name: `${rackId} (H100 SXM5 Cluster)`, type: 'rack', hallId: 'hall-a' }
        rackGroup.add(cabinet)
        this.interactiveMeshes.push(cabinet)

        // 7 Horizontal Server Units per Rack
        const rackLeds: THREE.MeshBasicMaterial[] = []
        for (let b = 0; b < 7; b++) {
          const blade = new THREE.Mesh(serverBladeGeo, bladeMat)
          blade.position.set(0, -1.2 + b * 0.4, 0.58)
          rackGroup.add(blade)

          // 4 Glowing LEDs per unit
          for (let l = 0; l < 4; l++) {
            const ledMat = new THREE.MeshBasicMaterial({
              color: l === 1 ? 0x34d399 : l === 2 ? 0x38bdf8 : 0x22d3ee,
            })
            const led = new THREE.Mesh(ledGeo, ledMat)
            led.position.set(-0.75 + l * 0.5, -1.2 + b * 0.4, 0.64)
            rackGroup.add(led)
            rackLeds.push(ledMat)
          }
        }

        // Top Status Beacon
        const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8)
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0x34d399 })
        const beacon = new THREE.Mesh(beaconGeo, beaconMat)
        beacon.position.set(0, 1.88, 0)
        rackGroup.add(beacon)
        rackLeds.push(beaconMat)

        this.rackLedMaterials.set(rackId, rackLeds)
        this.rackMeshMap.set(rackId, rackGroup)
        this.scene.add(rackGroup)
      }
    }

    // Hall B: 24 Racks in 4 dense rows (X: 8 to X: 24, Z: -20 to Z: -7)
    // Rear aisles: Deep Amber & Red Hot Aisles with Blue compute nodes (Matching IMAGE 2)
    for (let row = 0; row < 4; row++) {
      // Hot aisle deep red/amber runner
      const aisleRedGeo = new THREE.PlaneGeometry(18, 0.4)
      const aisleRedMat = new THREE.MeshBasicMaterial({ color: row % 2 === 0 ? 0xef4444 : 0xf59e0b })
      const aisleRunner = new THREE.Mesh(aisleRedGeo, aisleRedMat)
      aisleRunner.rotation.x = -Math.PI / 2
      aisleRunner.position.set(16, 0.54, -20 + row * 4.2 - 1.6)
      this.scene.add(aisleRunner)

      for (let col = 0; col < 6; col++) {
        const index = row * 6 + col + 1
        const rackId = `RACK-B-${String(index).padStart(3, '0')}`
        const posX = 8 + col * 2.8
        const posZ = -20 + row * 4.2

        const rackGroup = new THREE.Group()
        rackGroup.position.set(posX, 1.75 + 0.52, posZ)

        // Outer Cabinet
        const cabinet = new THREE.Mesh(rackCabinetGeo, rackFrameMat)
        cabinet.castShadow = true
        cabinet.receiveShadow = true
        cabinet.userData = { id: rackId, name: `${rackId} (B200 NVL / TPU v5p Cluster)`, type: 'rack', hallId: 'hall-b' }
        rackGroup.add(cabinet)
        this.interactiveMeshes.push(cabinet)

        // 7 Server Units
        const rackLeds: THREE.MeshBasicMaterial[] = []
        for (let b = 0; b < 7; b++) {
          const blade = new THREE.Mesh(serverBladeGeo, bladeMat)
          blade.position.set(0, -1.2 + b * 0.4, 0.58)
          rackGroup.add(blade)

          // 4 Glowing LEDs (Amber, Blue, Red accents as in IMAGE 2)
          for (let l = 0; l < 4; l++) {
            let colHex = 0x38bdf8
            if (row % 2 === 0) {
              colHex = l === 0 ? 0xf59e0b : l === 1 ? 0xef4444 : 0x38bdf8
            }
            const ledMat = new THREE.MeshBasicMaterial({ color: colHex })
            const led = new THREE.Mesh(ledGeo, ledMat)
            led.position.set(-0.75 + l * 0.5, -1.2 + b * 0.4, 0.64)
            rackGroup.add(led)
            rackLeds.push(ledMat)
          }
        }

        // Top Status Beacon
        const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8)
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0x34d399 })
        const beacon = new THREE.Mesh(beaconGeo, beaconMat)
        beacon.position.set(0, 1.88, 0)
        rackGroup.add(beacon)
        rackLeds.push(beaconMat)

        this.rackLedMaterials.set(rackId, rackLeds)
        this.rackMeshMap.set(rackId, rackGroup)
        this.scene.add(rackGroup)
      }
    }

    // Heat Overlay Planes
    this.buildHeatOverlay()
  }

  // ==========================================
  // HEAT OVERLAY MESHES
  // ==========================================
  private buildHeatOverlay() {
    this.heatOverlayGroup.visible = false
    const heatPlaneGeo = new THREE.PlaneGeometry(18, 2.5)

    const hotAisleMat = new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })

    const coldAisleMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })

    // Hall A
    for (let r = 0; r < 4; r++) {
      const plane = new THREE.Mesh(heatPlaneGeo, r % 2 === 0 ? hotAisleMat : coldAisleMat)
      plane.rotation.x = -Math.PI / 2
      plane.position.set(-6, 4.2, -10 + r * 4.2)
      this.heatOverlayGroup.add(plane)
    }

    // Hall B
    for (let r = 0; r < 4; r++) {
      const plane = new THREE.Mesh(heatPlaneGeo, r % 2 === 0 ? hotAisleMat : coldAisleMat)
      plane.rotation.x = -Math.PI / 2
      plane.position.set(16, 4.2, -20 + r * 4.2)
      this.heatOverlayGroup.add(plane)
    }

    this.scene.add(this.heatOverlayGroup)
  }

  // ==========================================
  // COOLING INFRASTRUCTURE ZONE (LEFT YARD)
  // ==========================================
  private buildCoolingInfrastructure() {
    const coolingGroup = new THREE.Group()

    // 1. Concrete Pad for Cooling Towers (West Yard)
    const padGeo = new THREE.BoxGeometry(34, 0.5, 18)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(-28, 0.25, -28)
    coolingGroup.add(pad)

    // 2. 3 Massive Industrial Cooling Towers with Rotating Fans (Matching IMAGE 2)
    const towerXs = [-38, -28, -18]
    const towerBodyGeo = new THREE.CylinderGeometry(3.6, 4.5, 6.8, 20)
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x374151, // realistic concrete-grey/charcoal
      roughness: 0.4,
      metalness: 0.4,
    })
    const shroudGeo = new THREE.CylinderGeometry(3.2, 3.5, 1.4, 20)
    const shroudMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 })
    const fanBladeGeo = new THREE.BoxGeometry(2.8, 0.08, 0.5)
    const fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0284c7, emissiveIntensity: 0.5 })

    towerXs.forEach((tx, idx) => {
      const towerGroup = new THREE.Group()
      towerGroup.position.set(tx, 0, -28)

      const body = new THREE.Mesh(towerBodyGeo, towerMat)
      body.position.y = 3.4
      body.castShadow = true
      body.receiveShadow = true
      body.userData = { id: `COOL-TWR-0${idx + 1}`, name: `Cooling Tower Bank ${idx + 1} (55 MW)`, type: 'cooling' }
      towerGroup.add(body)
      this.interactiveMeshes.push(body)

      const shroud = new THREE.Mesh(shroudGeo, shroudMat)
      shroud.position.y = 7.2
      towerGroup.add(shroud)

      // 4-blade Rotating Fan
      const fanGroup = new THREE.Group()
      fanGroup.position.y = 7.3
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(fanBladeGeo, fanBladeMat)
        blade.rotation.y = (b * Math.PI) / 2
        fanGroup.add(blade)
      }
      towerGroup.add(fanGroup)
      this.fans.push(fanGroup)

      coolingGroup.add(towerGroup)
    })

    // 3. Liquid Chillers Plant (48 MW)
    const chillerGeo = new THREE.BoxGeometry(8.5, 3.2, 4.0)
    const chillerMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.4, metalness: 0.6 })
    const chiller = new THREE.Mesh(chillerGeo, chillerMat)
    chiller.position.set(-28, 1.6, -14)
    chiller.castShadow = true
    chiller.userData = { id: 'CHILLER-01', name: 'Liquid Chiller Plant (48 MW)', type: 'cooling' }
    coolingGroup.add(chiller)
    this.interactiveMeshes.push(chiller)

    // Dual Compressor Cylinders on Chiller
    const compGeo = new THREE.CylinderGeometry(0.85, 0.85, 6.0, 14)
    compGeo.rotateZ(Math.PI / 2)
    const compMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 })
    const c1 = new THREE.Mesh(compGeo, compMat)
    c1.position.set(-28, 3.6, -14.8)
    const c2 = new THREE.Mesh(compGeo, compMat)
    c2.position.set(-28, 3.6, -13.2)
    coolingGroup.add(c1, c2)

    // 4. Large Blue Insulated Pipe Racks connecting Cooling to Data Hall (Matching IMAGE 2)
    const pipeMatSupply = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      metalness: 0.8,
    })
    const pipeMatReturn = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3,
      metalness: 0.8,
    })

    const pipeGeo = new THREE.CylinderGeometry(0.45, 0.45, 24, 12)
    pipeGeo.rotateZ(Math.PI / 2)
    const pipeSupply = new THREE.Mesh(pipeGeo, pipeMatSupply)
    pipeSupply.position.set(-14, 3.2, -14)
    const pipeReturn = new THREE.Mesh(pipeGeo, pipeMatReturn)
    pipeReturn.position.set(-14, 3.2, -12.8)
    coolingGroup.add(pipeSupply, pipeReturn)

    this.scene.add(coolingGroup)
  }

  // ==========================================
  // POWER INFRASTRUCTURE ZONE (SUBSTATION, TANKS, GENS)
  // ==========================================
  private buildPowerInfrastructure() {
    const powerGroup = new THREE.Group()

    // 1. High-Voltage Electrical Substation (132 MW)
    const subPadGeo = new THREE.BoxGeometry(22, 0.4, 20)
    const subPadMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.8 })
    const subPad = new THREE.Mesh(subPadGeo, subPadMat)
    subPad.position.set(-42, 0.2, 2)
    powerGroup.add(subPad)

    // Steel Lattice Gantry Structure (Visible Galvanized Steel)
    const gantryGeo = new THREE.BoxGeometry(12, 7.5, 0.5)
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
    const gantry = new THREE.Mesh(gantryGeo, gantryMat)
    gantry.position.set(-42, 3.75, -2)
    gantry.castShadow = true
    gantry.userData = { id: 'SUBSTATION-MAIN', name: 'Power Substation (132 MW Grid-Tied)', type: 'power' }
    powerGroup.add(gantry)
    this.interactiveMeshes.push(gantry)

    // Amber Ceramic Insulators
    const insGeo = new THREE.CylinderGeometry(0.35, 0.4, 2.0, 8)
    const insMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    })
    for (let ix = -4.5; ix <= 4.5; ix += 3.0) {
      const ins = new THREE.Mesh(insGeo, insMat)
      ins.position.set(-42 + ix, 5.5, -2)
      powerGroup.add(ins)
    }

    // 2. Cluster of 6 Vertical Cylindrical Fuel Storage Tanks (Matching IMAGE 2)
    // 1,200 m³ capacity / >72 hours reserve
    const tankGeo = new THREE.CylinderGeometry(2.4, 2.4, 6.5, 16)
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // silver/grey metallic silos
      metalness: 0.75,
      roughness: 0.25,
    })

    const tankPositions: [number, number][] = [
      [-34, 22], [-28, 22], [-22, 22],
      [-34, 28], [-28, 28], [-22, 28],
    ]

    tankPositions.forEach(([tx, tz], idx) => {
      const tank = new THREE.Mesh(tankGeo, tankMat)
      tank.position.set(tx, 3.25, tz)
      tank.castShadow = true
      tank.receiveShadow = true
      tank.userData = { id: `FUEL-TANK-0${idx + 1}`, name: 'Fuel Storage Tanks (1,200 m³)', type: 'power' }
      powerGroup.add(tank)
      if (idx === 0) this.interactiveMeshes.push(tank)
    })

    // 3. Row of Backup Diesel Generators (48 MW)
    const genGeo = new THREE.BoxGeometry(7.5, 3.2, 3.6)
    const genMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 })
    const exhaustGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.0, 10)
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9 })

    for (let i = 0; i < 2; i++) {
      const gz = 14 + i * 5.5
      const gen = new THREE.Mesh(genGeo, genMat)
      gen.position.set(-44, 1.6, gz)
      gen.castShadow = true
      gen.userData = { id: `GEN-BACKUP-0${i + 1}`, name: 'Backup Diesel Generators (48 MW)', type: 'power' }
      powerGroup.add(gen)
      this.interactiveMeshes.push(gen)

      const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat)
      exhaust.position.set(-41.5, 3.8, gz)
      powerGroup.add(exhaust)
    }

    this.scene.add(powerGroup)
  }

  // ==========================================
  // NETWORK INFRASTRUCTURE (FIBRE ENTRY VAULT & LOOP)
  // ==========================================
  private buildNetworkInfrastructure() {
    const netGroup = new THREE.Group()

    // 1. Fibre Entry Vault (8 × 400G Live Traffic)
    const vaultGeo = new THREE.BoxGeometry(6.5, 3.4, 6.5)
    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.35,
    })
    const vault = new THREE.Mesh(vaultGeo, vaultMat)
    vault.position.set(26, 1.7, -28)
    vault.castShadow = true
    vault.userData = { id: 'NET-VAULT-01', name: 'Fibre Entry Vault (8 × 400G Live Traffic)', type: 'network' }
    netGroup.add(vault)
    this.interactiveMeshes.push(vault)

    // Illuminated Optical Status Ring on top of Vault
    const ringGeo = new THREE.TorusGeometry(2.0, 0.15, 12, 32)
    ringGeo.rotateX(Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    const statusRing = new THREE.Mesh(ringGeo, ringMat)
    statusRing.position.set(26, 3.45, -28)
    netGroup.add(statusRing)

    this.scene.add(netGroup)
  }

  // ==========================================
  // GLOWING FIBRE CONDUIT LOOP & ANIMATED PACKETS
  // ==========================================
  private buildDataPackets() {
    // Beautiful looping curved spline routes encircling the rear-right of campus (Matching IMAGE 2!)
    const fibreLoopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(26, 2.5, -28), // Vault
      new THREE.Vector3(34, 4.0, -24),
      new THREE.Vector3(38, 4.0, -14),
      new THREE.Vector3(34, 4.0, -4),
      new THREE.Vector3(28, 4.5, -8),
      new THREE.Vector3(20, 4.0, -14), // Hall B
      new THREE.Vector3(8, 4.2, -8),
      new THREE.Vector3(-4, 3.8, -4),  // Hall A
    ])

    const returnCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4, 3.8, -4),
      new THREE.Vector3(6, 4.2, -6),
      new THREE.Vector3(18, 4.0, -12),
      new THREE.Vector3(26, 3.5, -20),
      new THREE.Vector3(26, 2.5, -28),
    ])

    this.packetCurves = [fibreLoopCurve, returnCurve]

    // Physical Glowing Neon Cyan Conduits (Matching the iconic glowing loop in IMAGE 2)
    const conduitMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.75,
    })

    const loopTubeGeo = new THREE.TubeGeometry(fibreLoopCurve, 64, 0.18, 8, false)
    const loopMesh = new THREE.Mesh(loopTubeGeo, conduitMat)
    this.scene.add(loopMesh)

    // Secondary Outer Glow Conduit
    const glowTubeGeo = new THREE.TubeGeometry(fibreLoopCurve, 64, 0.42, 8, false)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.25,
    })
    const glowMesh = new THREE.Mesh(glowTubeGeo, glowMat)
    this.scene.add(glowMesh)

    // Animated Cyan Data Packets
    const packetGeo = new THREE.SphereGeometry(0.35, 8, 8)
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

    for (let i = 0; i < 20; i++) {
      const packet = new THREE.Mesh(packetGeo, packetMat)
      this.packetMeshes.push(packet)
      this.packetProgress.push(i / 20)
      this.scene.add(packet)
    }
  }

  // ==========================================
  // LOGISTICS, LOADING DOCKS & PARKING FACILITY
  // ==========================================
  private buildLogisticsAndParking() {
    // 1. Loading Dock (5 bays / 2 in use, Matching IMAGE 2)
    const dockGroup = new THREE.Group()
    dockGroup.position.set(20, 0, 10)

    const dockWallGeo = new THREE.BoxGeometry(16, 5.5, 4.5)
    const dockWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    const dockWall = new THREE.Mesh(dockWallGeo, dockWallMat)
    dockWall.position.y = 2.75
    dockWall.userData = { id: 'dock-bays', name: 'Loading Dock (5 Bays / 2 in use)', type: 'dock' }
    dockGroup.add(dockWall)
    this.interactiveMeshes.push(dockWall)

    // 5 Rollup Bay Shutters
    const shutterGeo = new THREE.BoxGeometry(2.4, 3.2, 0.2)
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
    for (let i = 0; i < 5; i++) {
      const shutter = new THREE.Mesh(shutterGeo, shutterMat)
      shutter.position.set(-6 + i * 3.0, 1.8, 2.3)
      dockGroup.add(shutter)
    }

    this.scene.add(dockGroup)

    // 2. Solar Canopy Covered Parking Facility (124 / 200 Occupied, Matching IMAGE 2)
    const parkingGroup = new THREE.Group()
    parkingGroup.position.set(38, 0, 22)

    const parkingPadGeo = new THREE.PlaneGeometry(28, 16)
    const parkingPadMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.8 })
    const parkingPad = new THREE.Mesh(parkingPadGeo, parkingPadMat)
    parkingPad.rotation.x = -Math.PI / 2
    parkingPad.position.y = 0.025
    parkingPad.receiveShadow = true
    parkingPad.userData = { id: 'parking-lot', name: 'Parking Facility (124 / 200 Occupied)', type: 'parking' }
    parkingGroup.add(parkingPad)
    this.interactiveMeshes.push(parkingPad)

    // Solar Canopies (Blue Solar Panels on Steel Posts)
    const canopyPostGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6)
    const canopyPostMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
    const solarRoofGeo = new THREE.BoxGeometry(26, 0.15, 6.0)
    const solarRoofMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    })

    const canopy1 = new THREE.Mesh(solarRoofGeo, solarRoofMat)
    canopy1.position.set(0, 3.2, -4)
    canopy1.rotation.x = 0.08
    const canopy2 = new THREE.Mesh(solarRoofGeo, solarRoofMat)
    canopy2.position.set(0, 3.2, 4)
    canopy2.rotation.x = -0.08
    parkingGroup.add(canopy1, canopy2)

    for (let px = -10; px <= 10; px += 10) {
      const p1 = new THREE.Mesh(canopyPostGeo, canopyPostMat)
      p1.position.set(px, 1.6, -4)
      const p2 = new THREE.Mesh(canopyPostGeo, canopyPostMat)
      p2.position.set(px, 1.6, 4)
      parkingGroup.add(p1, p2)
    }

    // Small Parked Employee Vehicles (Cars)
    const carGeo = new THREE.BoxGeometry(1.6, 0.8, 2.8)
    const carColors = [0xf1f5f9, 0x0284c7, 0x334155, 0xef4444, 0x0f172a]
    for (let cx = -10; cx <= 10; cx += 2.6) {
      const cMat = new THREE.MeshStandardMaterial({
        color: carColors[Math.abs(Math.round(cx)) % carColors.length],
        metalness: 0.7,
        roughness: 0.3,
      })
      const car = new THREE.Mesh(carGeo, cMat)
      car.position.set(cx, 0.45, -4)
      parkingGroup.add(car)
    }

    this.scene.add(parkingGroup)

    // 3. Security Gatehouse & Guard Booth (Matching IMAGE 2)
    const gateGroup = new THREE.Group()
    gateGroup.position.set(0, 0, 26)

    const boothGeo = new THREE.BoxGeometry(4.2, 3.2, 4.2)
    const boothMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
    const booth = new THREE.Mesh(boothGeo, boothMat)
    booth.position.y = 1.6
    booth.userData = { id: 'security-gate', name: 'Security Gate (All clear)', type: 'gate' }
    gateGroup.add(booth)
    this.interactiveMeshes.push(booth)

    // Glass Canopy with Green Status Indicator
    const canopyGeo = new THREE.BoxGeometry(10, 0.3, 6.0)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
    const gateCanopy = new THREE.Mesh(canopyGeo, canopyMat)
    gateCanopy.position.set(0, 3.5, 0)
    gateGroup.add(gateCanopy)

    const greenLed = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x34d399 }))
    greenLed.position.set(0, 3.7, 3.0)
    gateGroup.add(greenLed)

    this.scene.add(gateGroup)

    // 4. Logistics Delivery Semi-Truck
    this.truckGroup = new THREE.Group()
    this.truckGroup.position.set(20, 1.2, 18)
    this.truckGroup.rotation.y = -Math.PI / 6

    const cabGeo = new THREE.BoxGeometry(2.4, 2.2, 3.2)
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.6, roughness: 0.3 })
    const cab = new THREE.Mesh(cabGeo, cabMat)
    cab.position.set(0, 0.7, 3.2)
    cab.castShadow = true
    this.truckGroup.add(cab)

    const trailerGeo = new THREE.BoxGeometry(2.6, 2.9, 7.2)
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.5, roughness: 0.3 })
    const trailer = new THREE.Mesh(trailerGeo, trailerMat)
    trailer.position.set(0, 1.1, -1.8)
    trailer.castShadow = true
    this.truckGroup.add(trailer)

    this.truckGroup.userData = { id: 'VEH-TRUCK-01', name: 'Heavy Delivery Rig 404', type: 'vehicle' }
    this.interactiveMeshes.push(trailer)
    this.scene.add(this.truckGroup)

    // 5. Autonomous Technician Rover / Service Cart
    this.serviceCartGroup = new THREE.Group()
    this.serviceCartGroup.position.set(-10, 0.6, 12)

    const cartGeo = new THREE.BoxGeometry(1.5, 0.7, 2.2)
    const cartMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.4 })
    const cart = new THREE.Mesh(cartGeo, cartMat)
    this.serviceCartGroup.add(cart)

    const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8)
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    const beacon = new THREE.Mesh(beaconGeo, beaconMat)
    beacon.position.set(0, 1.4, 0)
    this.serviceCartGroup.add(beacon)

    this.serviceCartGroup.userData = { id: 'VEH-MAINT-01', name: 'Autonomous Maintenance Rover', type: 'vehicle' }
    this.interactiveMeshes.push(cart)
    this.scene.add(this.serviceCartGroup)
  }

  // ==========================================
  // COOLING VAPOR (THICK SOFT STEAM PLUMES)
  // ==========================================
  private buildCoolingVaporParticles() {
    const particleCount = 280
    const positions = new Float32Array(particleCount * 3)
    const towerXs = [-38, -28, -18]

    for (let i = 0; i < particleCount; i++) {
      const towerX = towerXs[i % 3]
      positions[i * 3 + 0] = towerX + (Math.random() - 0.5) * 2.6
      positions[i * 3 + 1] = 7.5 + Math.random() * 6.5
      positions[i * 3 + 2] = -28 + (Math.random() - 0.5) * 2.6
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0xe0f2fe, // soft dense white/cyan steam plume
      size: 1.25,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.vaporParticles = new THREE.Points(geo, mat)
    this.vaporPositions = positions
    this.scene.add(this.vaporParticles)
  }

  // ==========================================
  // RAIN PARTICLES (MONSOON & STORM)
  // ==========================================
  private buildRainParticles() {
    const rainCount = 2200
    const rainPos = new Float32Array(rainCount * 3)

    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3 + 0] = (Math.random() - 0.5) * 140
      rainPos[i * 3 + 1] = Math.random() * 55
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 110
    }

    this.rainGeometry = new THREE.BufferGeometry()
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))

    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.25,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.rainParticles = new THREE.Points(this.rainGeometry, rainMat)
    this.rainParticles.visible = false
    this.scene.add(this.rainParticles)
  }

  // ==========================================
  // SELECTION RETICLE
  // ==========================================
  private buildSelectionRing() {
    this.selectionRing = new THREE.Group()
    this.selectionRing.visible = false

    const ringGeo = new THREE.RingGeometry(1.8, 2.05, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = -Math.PI / 2
    this.selectionRing.add(ringMesh)

    const innerGeo = new THREE.CircleGeometry(1.6, 32)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    })
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    innerMesh.rotation.x = -Math.PI / 2
    this.selectionRing.add(innerMesh)

    this.scene.add(this.selectionRing)
  }

  // ==========================================
  // EVENT LISTENERS & RAYCASTING
  // ==========================================
  private initEvents() {
    const el = this.renderer.domElement

    el.addEventListener('pointerdown', (e) => {
      this.isDragging = false
      this.pointerDownPos = { x: e.clientX, y: e.clientY }
    })

    el.addEventListener('pointermove', (e) => {
      const dx = Math.abs(e.clientX - this.pointerDownPos.x)
      const dy = Math.abs(e.clientY - this.pointerDownPos.y)
      if (dx > 4 || dy > 4) {
        this.isDragging = true
      }

      const rect = el.getBoundingClientRect()
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false)

      if (intersects.length > 0) {
        el.style.cursor = 'pointer'
        const obj = intersects[0].object
        if (this.callbacks.onHoverObject && obj.userData?.name) {
          this.callbacks.onHoverObject(obj.userData.name)
        }
      } else {
        el.style.cursor = 'default'
        if (this.callbacks.onHoverObject) {
          this.callbacks.onHoverObject(null)
        }
      }
    })

    el.addEventListener('pointerup', (e) => {
      if (this.isDragging) return

      const rect = el.getBoundingClientRect()
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false)

      if (intersects.length > 0) {
        const hit = intersects[0].object
        const userData = hit.userData
        if (userData && userData.id) {
          const worldPos = new THREE.Vector3()
          hit.getWorldPosition(worldPos)

          this.selectObject({
            id: userData.id,
            name: userData.name || userData.id,
            type: userData.type,
            position: [worldPos.x, worldPos.y, worldPos.z],
            data: userData as any,
          })
          return
        }
      }

      this.clearSelection()
    })

    window.addEventListener('resize', this.onResize)
  }

  public onResize = () => {
    if (!this.container) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  // ==========================================
  // OBJECT SELECTION & CAMERA FLY-TO
  // ==========================================
  public selectObject(obj: SelectedObject | null) {
    if (!obj) {
      this.clearSelection()
      return
    }

    this.targetSelectionId = obj.id
    this.selectionRing.position.set(obj.position[0], 0.08, obj.position[2])
    this.selectionRing.visible = true

    this.focusCameraOn(
      new THREE.Vector3(obj.position[0], obj.position[1], obj.position[2]),
      obj.type === 'rack' ? 16 : 24
    )

    this.callbacks.onSelectObject(obj)
  }

  public clearSelection() {
    this.targetSelectionId = null
    this.selectionRing.visible = false
    this.callbacks.onSelectObject(null)
  }

  public focusCameraOn(targetPos: THREE.Vector3, distance: number = 26) {
    this.isCameraTransitioning = true
    this.camStartPos.copy(this.camera.position)
    this.camStartLook.copy(this.controls.target)

    // Preserve the elevated 3/4 perspective angle
    this.camEndPos.set(
      targetPos.x - distance * 0.75,
      targetPos.y + distance * 0.9,
      targetPos.z + distance * 0.85
    )
    this.camEndLook.copy(targetPos)
    this.camLerpProgress = 0.0
  }

  // ==========================================
  // WEATHER & DAY/NIGHT CONTROLS
  // ==========================================
  public updateWeather(weather: WeatherType) {
    this.currentWeather = weather

    if (weather === 'monsoon' || weather === 'storm') {
      if (this.rainParticles) this.rainParticles.visible = true
      this.scene.fog = new THREE.FogExp2(0x07111e, weather === 'storm' ? 0.0045 : 0.0035)
    } else {
      if (this.rainParticles) this.rainParticles.visible = false
      this.scene.fog = new THREE.FogExp2(0x07111e, 0.0028)
    }

    if (weather === 'heatwave') {
      this.ambientLight.color.setHex(0xb45309)
      this.ambientLight.intensity = 1.6
      this.dirLight.color.setHex(0xfbbf24)
      this.dirLight.intensity = 2.4
    } else if (weather === 'storm') {
      this.ambientLight.color.setHex(0x334155)
      this.ambientLight.intensity = 1.3
      this.dirLight.color.setHex(0x94a3b8)
      this.dirLight.intensity = 1.6
    } else {
      this.updateDayNight(this.currentDayNight)
    }
  }

  public updateDayNight(mode: DayNightMode) {
    this.currentDayNight = mode

    if (mode === 'day') {
      this.scene.background = new THREE.Color(0x1e293b)
      this.scene.fog = new THREE.FogExp2(0x1e293b, 0.002)
      this.ambientLight.color.setHex(0x94b8e6)
      this.ambientLight.intensity = 1.8
      this.hemiLight.color.setHex(0x93c5fd)
      this.hemiLight.groundColor.setHex(0x334e68)
      this.hemiLight.intensity = 1.4
      this.dirLight.color.setHex(0xfffbeb)
      this.dirLight.intensity = 2.8
      this.fillLight.color.setHex(0x7dd3fc)
      this.fillLight.intensity = 1.6
      this.rimLight.color.setHex(0xbae6fd)
      this.rimLight.intensity = 1.2
      this.renderer.toneMappingExposure = 1.35
    } else {
      this.scene.background = new THREE.Color(0x07111e)
      this.scene.fog = new THREE.FogExp2(0x07111e, 0.0028)
      this.ambientLight.color.setHex(0x5a7596)
      this.ambientLight.intensity = 1.4
      this.hemiLight.color.setHex(0x7dd3fc)
      this.hemiLight.groundColor.setHex(0x1e2e42)
      this.hemiLight.intensity = 1.2
      this.dirLight.color.setHex(0xf8fafc)
      this.dirLight.intensity = 2.2
      this.fillLight.color.setHex(0x38bdf8)
      this.fillLight.intensity = 1.3
      this.rimLight.color.setHex(0x22d3ee)
      this.rimLight.intensity = 1.4
      this.renderer.toneMappingExposure = 1.35
    }
  }

  public setHeatOverlay(visible: boolean) {
    this.heatOverlayGroup.visible = visible
  }

  public setCinematic(active: boolean) {
    this.isCinematic = active
    if (active) {
      this.cinematicWaypointIndex = 0
      this.cinematicTimer = 0
    }
  }

  // Update dynamic LED colors on racks from telemetry
  public updateRacksTelemetry(racks: ServerRack[]) {
    racks.forEach((rack) => {
      const leds = this.rackLedMaterials.get(rack.id)
      if (!leds) return

      if (rack.hasFault) {
        leds.forEach((m) => m.color.setHex(0xf87171))
      } else if (rack.gpuUtilisation > 85) {
        leds.forEach((m, idx) => {
          m.color.setHex(idx % 2 === 0 ? 0xfbbf24 : 0x22d3ee)
        })
      } else {
        leds.forEach((m, idx) => {
          m.color.setHex(idx % 2 === 0 ? 0x22d3ee : 0x34d399)
        })
      }
    })
  }

  // ==========================================
  // MAIN ANIMATION LOOP
  // ==========================================
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate)

    const delta = Math.min(this.clock.getDelta(), 0.1)
    const elapsedTime = this.clock.getElapsedTime()

    // 1. Rotate Cooling Tower Fans
    const fanSpeed = this.currentWeather === 'heatwave' ? 9.0 : 5.0
    this.fans.forEach((fan) => {
      fan.rotation.y += delta * fanSpeed
    })

    // 2. Animate Cooling Tower Vapor Plumes
    if (this.vaporParticles && this.vaporPositions) {
      const pCount = this.vaporPositions.length / 3
      for (let i = 0; i < pCount; i++) {
        this.vaporPositions[i * 3 + 1] += delta * 2.2
        if (this.vaporPositions[i * 3 + 1] > 14.0) {
          this.vaporPositions[i * 3 + 1] = 7.5
        }
      }
      this.vaporParticles.geometry.attributes.position.needsUpdate = true
    }

    // 3. Animate Rain (Monsoon & Storm)
    if (this.rainParticles && this.rainParticles.visible && this.rainGeometry) {
      const positions = this.rainGeometry.attributes.position.array as Float32Array
      const rainCount = positions.length / 3
      const rainSpeed = this.currentWeather === 'storm' ? 50 : 35

      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= delta * rainSpeed
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 55
        }
      }
      this.rainGeometry.attributes.position.needsUpdate = true

      // Storm Lightning Flashes
      if (this.currentWeather === 'storm') {
        this.lightningTimer += delta
        if (this.lightningTimer > 7.0 && Math.random() < 0.05) {
          this.ambientLight.intensity = 3.8
          this.dirLight.intensity = 4.5
          setTimeout(() => {
            this.ambientLight.intensity = 1.3
            this.dirLight.intensity = 1.6
          }, 80)
          this.lightningTimer = 0
        }
      }
    }

    // 4. Animate Data Packets along Looping Fibre Conduit
    for (let i = 0; i < this.packetMeshes.length; i++) {
      const curveIndex = i % this.packetCurves.length
      const curve = this.packetCurves[curveIndex]
      this.packetProgress[i] = (this.packetProgress[i] + delta * 0.35) % 1.0
      const pos = curve.getPoint(this.packetProgress[i])
      this.packetMeshes[i].position.copy(pos)
    }

    // 5. Logistics Truck Subtle Movement
    const truckCycleTime = (elapsedTime * 0.05) % 1.0
    if (truckCycleTime < 0.5) {
      this.truckGroup.position.z = 18
    } else {
      this.truckGroup.position.z = 18 + Math.sin(truckCycleTime * Math.PI) * 1.5
    }

    // 6. Autonomous Service Cart Patrol
    const cartT = (elapsedTime * 0.1) % 1.0
    this.serviceCartGroup.position.x = -10 + Math.sin(cartT * Math.PI * 2) * 12
    this.serviceCartGroup.position.z = 12 + Math.cos(cartT * Math.PI * 2) * 2

    // 7. Selection Ring Pulse
    if (this.selectionRing.visible) {
      const ringScale = 1.0 + Math.sin(elapsedTime * 4.0) * 0.06
      this.selectionRing.scale.set(ringScale, ringScale, ringScale)
    }

    // 8. Smooth Camera Transitions
    if (this.isCameraTransitioning) {
      this.camLerpProgress += delta * 1.8
      if (this.camLerpProgress >= 1.0) {
        this.camLerpProgress = 1.0
        this.isCameraTransitioning = false
      }
      const ease = 1 - Math.pow(1 - this.camLerpProgress, 3)
      this.camera.position.lerpVectors(this.camStartPos, this.camEndPos, ease)
      this.controls.target.lerpVectors(this.camStartLook, this.camEndLook, ease)
    }

    // 9. Cinematic Auto-Tour Mode
    if (this.isCinematic && !this.isCameraTransitioning) {
      this.cinematicTimer += delta
      const currentWp = this.cinematicWaypoints[this.cinematicWaypointIndex]

      if (this.cinematicTimer >= currentWp.duration) {
        this.cinematicTimer = 0
        this.cinematicWaypointIndex = (this.cinematicWaypointIndex + 1) % this.cinematicWaypoints.length
        const nextWp = this.cinematicWaypoints[this.cinematicWaypointIndex]
        this.focusCameraOn(nextWp.target, 28)
      } else {
        this.camera.position.x += Math.sin(elapsedTime * 0.15) * 0.03
        this.camera.position.z += Math.cos(elapsedTime * 0.15) * 0.03
      }
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  // ==========================================
  // CLEANUP DISPOSAL
  // ==========================================
  public dispose() {
    cancelAnimationFrame(this.animationFrameId)
    window.removeEventListener('resize', this.onResize)

    this.controls.dispose()
    this.renderer.dispose()

    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
