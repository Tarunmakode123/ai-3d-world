import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AssetLoader } from './AssetLoader'
import type {
  WeatherType,
  DayNightMode,
  ServerRack,
  SelectedObject,
} from '../types/simulation'

export interface SceneCallbacks {
  onSelectObject: (obj: SelectedObject | null) => void
  onHoverObject?: (name: string | null) => void
  onCinematicWaypointChange?: (index: number) => void
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
  private lastTelemetryRacks: ServerRack[] = []
  private coolingTowerGroups: THREE.Group[] = []
  private transformerGroups: THREE.Group[] = []
  private generatorGroups: THREE.Group[] = []
  private coolingParentGroup: THREE.Group | null = null
  private powerParentGroup: THREE.Group | null = null

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
  private isCinematicPaused: boolean = false
  private cinematicWaypointIndex: number = 0
  private cinematicTimer: number = 0
  public cinematicWaypoints = [
    { name: 'Campus Aerial Overview', pos: new THREE.Vector3(-6, 44, 48), target: new THREE.Vector3(5, 2.0, -7), duration: 9 },
    { name: 'Hall A // Foundation Training Cluster', pos: new THREE.Vector3(-12, 16, 8), target: new THREE.Vector3(-11, 2.5, -9), duration: 7 },
    { name: 'Hall B // Inference & MoE Swarm', pos: new THREE.Vector3(16, 16, 4), target: new THREE.Vector3(23, 2.5, -9), duration: 7 },
    { name: 'Cooling Towers & Liquid Chillers', pos: new THREE.Vector3(-34, 18, -12), target: new THREE.Vector3(-28, 4, -28), duration: 6 },
    { name: 'Power Substation & Fuel Reserve', pos: new THREE.Vector3(-42, 16, 16), target: new THREE.Vector3(-38, 3, 12), duration: 6 },
    { name: 'Network Vault & Optical Loop', pos: new THREE.Vector3(26, 16, -10), target: new THREE.Vector3(28, 3.5, -28), duration: 6 },
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

    // 1. Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x060f1b)
    this.scene.fog = new THREE.FogExp2(0x060f1b, 0.0022)

    // 2. Camera: Optimized showcase elevated diagonal 3/4 aerial view matching IMAGE 2
    // Positioned and angled to eliminate dead foreground space while showcasing Hall A, Hall B, cooling and logistics
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 450)
    this.camera.position.set(-6, 44, 48)

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
    this.renderer.toneMappingExposure = 1.25
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
    this.controls.target.set(5, 2.0, -7)

    // 5. Lighting Setup (Natural nocturnal architectural lighting balancing warm interiors with cool skylight)
    this.ambientLight = new THREE.AmbientLight(0x2a3b50, 1.1)
    this.scene.add(this.ambientLight)

    this.hemiLight = new THREE.HemisphereLight(0x475569, 0x0f172a, 0.8)
    this.scene.add(this.hemiLight)

    // Key Light from upper right front (soft crisp moonlight)
    this.dirLight = new THREE.DirectionalLight(0xf1f5f9, 2.1)
    this.dirLight.position.set(45, 62, 38)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width = 2048
    this.dirLight.shadow.mapSize.height = 2048
    this.dirLight.shadow.camera.near = 10
    this.dirLight.shadow.camera.far = 190
    const shadowD = 68
    this.dirLight.shadow.camera.left = -shadowD
    this.dirLight.shadow.camera.right = shadowD
    this.dirLight.shadow.camera.top = shadowD
    this.dirLight.shadow.camera.bottom = -shadowD
    this.dirLight.shadow.bias = -0.00015
    this.scene.add(this.dirLight)

    // Secondary Fill Light from upper left front (neutral cool slate fill, removing artificial cyan cast)
    this.fillLight = new THREE.DirectionalLight(0x64748b, 0.8)
    this.fillLight.position.set(-45, 38, 25)
    this.scene.add(this.fillLight)

    // Rim Light from rear top for crisp architectural silhouettes
    this.rimLight = new THREE.DirectionalLight(0x94a3b8, 0.7)
    this.rimLight.position.set(10, 35, -55)
    this.scene.add(this.rimLight)

    // 6. Build the Entire Redesigned Industrial Campus World
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

    // 8. Asynchronously Preload & Upgrade to Detailed GLB Models (Hybrid Architecture)
    this.loadHybridAssets()

    // 9. Start Loop
    this.animate()
  }

  // ==========================================
  // CAMPUS GROUND, ROADS, STREETLIGHTS & TREES
  // ==========================================
  private buildCampusEnvironment() {
    // 1. Campus Ground Apron (Dark asphalt & concrete campus foundation)
    const groundGeo = new THREE.PlaneGeometry(160, 136)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1824, // dark asphalt foundation
      roughness: 0.85,
      metalness: 0.15,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Perimeter Curb & Retaining Foundation
    const borderGeo = new THREE.BoxGeometry(164, 1.2, 140)
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x08101a, roughness: 0.9 })
    const border = new THREE.Mesh(borderGeo, borderMat)
    border.position.set(0, -0.6, 0)
    this.scene.add(border)

    // 2. Concrete Road Network & Painted Lane Markings
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x16212e, roughness: 0.75, metalness: 0.1 })
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })

    // Front Main Access Road (Running East-West in front of campus: Z: 24 to Z: 36)
    const frontRoadGeo = new THREE.PlaneGeometry(140, 11)
    const frontRoad = new THREE.Mesh(frontRoadGeo, roadMat)
    frontRoad.rotation.x = -Math.PI / 2
    frontRoad.position.set(0, 0.02, 30)
    frontRoad.receiveShadow = true
    this.scene.add(frontRoad)

    // Road Divider Yellow Lines
    for (let x = -65; x <= 65; x += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.25), yellowLineMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(x, 0.03, 30)
      this.scene.add(dash)
    }

    // Road Edge White Lines
    const edgeN = new THREE.Mesh(new THREE.PlaneGeometry(140, 0.2), whiteLineMat)
    edgeN.rotation.x = -Math.PI / 2
    edgeN.position.set(0, 0.03, 24.8)
    const edgeS = new THREE.Mesh(new THREE.PlaneGeometry(140, 0.2), whiteLineMat)
    edgeS.rotation.x = -Math.PI / 2
    edgeS.position.set(0, 0.03, 35.2)
    this.scene.add(edgeN, edgeS)

    // Main Security Entrance Branch Road
    const accessRoadGeo = new THREE.PlaneGeometry(14, 28)
    const accessRoad = new THREE.Mesh(accessRoadGeo, roadMat)
    accessRoad.rotation.x = -Math.PI / 2
    accessRoad.position.set(10, 0.02, 14)
    accessRoad.receiveShadow = true
    this.scene.add(accessRoad)

    // West Logistics Access Road (Leading to Substation and Generators)
    const westRoadGeo = new THREE.PlaneGeometry(10, 48)
    const westRoad = new THREE.Mesh(westRoadGeo, roadMat)
    westRoad.rotation.x = -Math.PI / 2
    westRoad.position.set(-52, 0.02, 6)
    westRoad.receiveShadow = true
    this.scene.add(westRoad)

    // Zebra Crosswalk in front of Security Gate
    for (let i = -4.5; i <= 4.5; i += 0.9) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4.0), whiteLineMat)
      stripe.rotation.x = -Math.PI / 2
      stripe.position.set(i, 0.035, 24)
      this.scene.add(stripe)
    }

    // Raised Concrete Curbs (Separating asphalt roadway from campus apron)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 })
    const curbN = new THREE.Mesh(new THREE.BoxGeometry(140, 0.16, 0.3), curbMat)
    curbN.position.set(0, 0.08, 24.35)
    const curbS = new THREE.Mesh(new THREE.BoxGeometry(140, 0.16, 0.3), curbMat)
    curbS.position.set(0, 0.08, 35.65)
    const curbWestLogistics = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 48), curbMat)
    curbWestLogistics.position.set(-57.15, 0.08, 6)
    this.scene.add(curbN, curbS, curbWestLogistics)

    // Painted White Directional Road Arrows
    const arrowStemGeo = new THREE.PlaneGeometry(0.35, 1.8)
    const arrowHeadGeo = new THREE.ConeGeometry(0.5, 0.9, 3)
    arrowHeadGeo.rotateX(-Math.PI / 2)
    for (let ax of [-30, 20]) {
      const stem = new THREE.Mesh(arrowStemGeo, whiteLineMat)
      stem.rotation.x = -Math.PI / 2
      stem.position.set(ax, 0.035, 32.5)
      const head = new THREE.Mesh(arrowHeadGeo, whiteLineMat)
      head.position.set(ax, 0.035, 33.7)
      this.scene.add(stem, head)
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
      [-54, 24], [-30, 24], [-6, 24], [18, 24], [44, 24],
      [-54, 36], [-30, 36], [-6, 36], [18, 36], [44, 36],
      [-52, -8], [-52, 8], [54, -10], [54, 10],
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

    // 4. Perimeter High-Security Mesh Fence
    const fencePostGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6)
    const fencePostMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
    const fenceWireMat = new THREE.MeshBasicMaterial({ color: 0x64748b, wireframe: true })

    const fenceXMin = -72, fenceXMax = 72, fenceZMin = -58, fenceZMax = 58
    for (let x = fenceXMin; x <= fenceXMax; x += 8) {
      // Rear & Front fence posts
      const pR = new THREE.Mesh(fencePostGeo, fencePostMat)
      pR.position.set(x, 1.6, fenceZMin)
      const pF = new THREE.Mesh(fencePostGeo, fencePostMat)
      pF.position.set(x, 1.6, fenceZMax)
      this.scene.add(pR, pF)

      const wireR = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.8), fenceWireMat)
      wireR.position.set(x + 4, 1.6, fenceZMin)
      this.scene.add(wireR)
    }

    // 5. Perimeter & Campus Multi-Tiered Evergreen Conifer Trees & Mulch Landscaping
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 8)
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x292524, // dark natural bark
      roughness: 0.95,
      metalness: 0.05,
    })

    const mulchBedGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.08, 12)
    const mulchBedMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // rich dark organic mulch bedding
      roughness: 0.98,
      metalness: 0.02,
    })

    // Multi-tiered conifer canopies with smooth normals (no faceted low-poly dodecahedrons)
    const tierBottomGeo = new THREE.ConeGeometry(1.65, 2.0, 8)
    const tierMidGeo = new THREE.ConeGeometry(1.25, 1.8, 8)
    const tierTopGeo = new THREE.ConeGeometry(0.85, 1.5, 8)

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x142b20, // authentic deep evergreen / pine needle green
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    })

    const treePositions = [
      // Rear Perimeter Grove
      [-66, 0, -50], [-56, 0, -54], [-44, 0, -56], [-32, 0, -54], [-20, 0, -56],
      [-8, 0, -54], [4, 0, -56], [16, 0, -54], [28, 0, -56], [42, 0, -54], [56, 0, -50],
      // Left Perimeter Grove
      [-66, 0, -34], [-68, 0, -18], [-67, 0, 0], [-68, 0, 18], [-66, 0, 34], [-64, 0, 50],
      // Right Perimeter Grove
      [66, 0, -34], [67, 0, -18], [66, 0, 0], [68, 0, 18], [67, 0, 34], [64, 0, 50],
      // Front Entrance & Roadway Landscaping Groves (Directly matching IMAGE 2)
      [-18, 0, 20], [-14, 0, 22], [-8, 0, 21], [14, 0, 21], [22, 0, 20], [25, 0, 22],
      // Parking Buffer Green Belt
      [32, 0, 14], [35, 0, 16], [54, 0, 14], [56, 0, 24], [55, 0, 32],
      // Fuel & Power Facility Landscaping Buffer
      [-36, 0, 16], [-38, 0, 32], [-20, 0, 34],
      // Front Perimeter Belt
      [-56, 0, 54], [-38, 0, 56], [-20, 0, 54], [4, 0, 56], [26, 0, 54], [46, 0, 56],
    ]

    treePositions.forEach(([tx, ty, tz], idx) => {
      const tree = new THREE.Group()
      // Subtle natural variation in height and rotation
      const scale = 0.88 + ((idx * 7) % 5) * 0.07
      const rotY = (idx * 1.3) % (Math.PI * 2)
      tree.position.set(tx, ty, tz)
      tree.scale.set(scale, scale, scale)
      tree.rotation.y = rotY

      // Mulch landscaping bed
      const mulch = new THREE.Mesh(mulchBedGeo, mulchBedMat)
      mulch.position.y = 0.04
      mulch.receiveShadow = true
      tree.add(mulch)

      // Trunk
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 1.1
      trunk.castShadow = true
      tree.add(trunk)

      // Three tiered conifer tiers
      const bottom = new THREE.Mesh(tierBottomGeo, foliageMat)
      bottom.position.y = 2.4
      bottom.castShadow = true

      const mid = new THREE.Mesh(tierMidGeo, foliageMat)
      mid.position.y = 3.4
      mid.castShadow = true

      const top = new THREE.Mesh(tierTopGeo, foliageMat)
      top.position.y = 4.3
      top.castShadow = true

      tree.add(bottom, mid, top)
      this.scene.add(tree)
    })
  }

  // ==========================================
  // MAIN DATA CENTRE COMPLEX (TRUE ARCHITECTURAL CUTAWAYS)
  // ==========================================
  private buildDataCenterComplex() {
    const complexGroup = new THREE.Group()

    // Palette for realistic industrial architecture
    const wallPanelMat = new THREE.MeshStandardMaterial({
      color: 0x182230, // dark charcoal architectural composite panels
      roughness: 0.5,
      metalness: 0.45,
    })

    const wallSeamMat = new THREE.MeshStandardMaterial({
      color: 0x0c131c, // dark graphite reveal joints
      roughness: 0.7,
      metalness: 0.3,
    })

    const parapetCapMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // dark graphite roof coping
      roughness: 0.3,
      metalness: 0.75,
    })

    const raisedFloorMat = new THREE.MeshStandardMaterial({
      color: 0x111c28, // computer access floor tiles
      roughness: 0.3,
      metalness: 0.65,
    })

    const steelColumnMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // structural I-beam steel
      roughness: 0.3,
      metalness: 0.85,
    })

    const ductMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // galvanized HVAC sheet metal
      roughness: 0.35,
      metalness: 0.8,
    })

    const cableTrayMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // galvanized steel industrial cable ladder mesh
      roughness: 0.5,
      metalness: 0.85,
    })

    const buswayMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // 415V electrical busway trunk
      roughness: 0.4,
      metalness: 0.75,
    })

    // -------------------------------------------------------------
    // 1. EXTERIOR PERIMETER WALLS (NO ROOF BLOCKING THE INTERIORS!)
    // -------------------------------------------------------------
    // Cast-in-place Industrial Concrete Foundation Plinths
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x131c26, // heavy architectural concrete foundation
      roughness: 0.85,
      metalness: 0.2,
    })
    const northPlinth = new THREE.Mesh(new THREE.BoxGeometry(65.2, 0.6, 1.8), plinthMat)
    northPlinth.position.set(6, 0.3, -32)
    northPlinth.receiveShadow = true
    const westPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 47.2), plinthMat)
    westPlinth.position.set(-26, 0.3, -9)
    westPlinth.receiveShadow = true
    const eastPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 47.2), plinthMat)
    eastPlinth.position.set(38, 0.3, -9)
    eastPlinth.receiveShadow = true
    complexGroup.add(northPlinth, westPlinth, eastPlinth)

    // NORTH EXTERIOR WALL (Rear solid facade)
    // Spans from X: -26 to +38 (Width 64m, Height 7.2m, Thickness 1.2m) at Z: -32
    const northWallGeo = new THREE.BoxGeometry(64, 7.2, 1.2)
    const northWall = new THREE.Mesh(northWallGeo, wallPanelMat)
    northWall.position.set(6, 3.6, -32)
    northWall.castShadow = true
    northWall.receiveShadow = true
    complexGroup.add(northWall)

    const northCopingGeo = new THREE.BoxGeometry(64.4, 0.4, 1.5)
    const northCoping = new THREE.Mesh(northCopingGeo, parapetCapMat)
    northCoping.position.set(6, 7.4, -32)
    complexGroup.add(northCoping)

    // Horizontal composite panel reveals on North facade
    const northSeam1 = new THREE.Mesh(new THREE.BoxGeometry(64.2, 0.08, 1.25), wallSeamMat)
    northSeam1.position.set(6, 2.4, -32)
    const northSeam2 = new THREE.Mesh(new THREE.BoxGeometry(64.2, 0.08, 1.25), wallSeamMat)
    northSeam2.position.set(6, 4.8, -32)
    complexGroup.add(northSeam1, northSeam2)

    // WEST EXTERIOR WALL (Left solid facade facing cooling yard)
    // Spans from Z: -32 to +14 (Depth 46m, Height 7.2m, Thickness 1.2m) at X: -26
    const westWallGeo = new THREE.BoxGeometry(1.2, 7.2, 46)
    const westWall = new THREE.Mesh(westWallGeo, wallPanelMat)
    westWall.position.set(-26, 3.6, -9)
    westWall.castShadow = true
    westWall.receiveShadow = true
    complexGroup.add(westWall)

    const westCopingGeo = new THREE.BoxGeometry(1.5, 0.4, 46.4)
    const westCoping = new THREE.Mesh(westCopingGeo, parapetCapMat)
    westCoping.position.set(-26, 7.4, -9)
    complexGroup.add(westCoping)

    // Horizontal composite panel reveals on West facade
    const westSeam1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 46.2), wallSeamMat)
    westSeam1.position.set(-26, 2.4, -9)
    const westSeam2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 46.2), wallSeamMat)
    westSeam2.position.set(-26, 4.8, -9)
    complexGroup.add(westSeam1, westSeam2)

    // West Facade Structural Buttress Columns (Facing Cooling Yard)
    const buttressGeo = new THREE.BoxGeometry(0.5, 7.2, 0.6)
    for (let bz = -30; bz <= 12; bz += 7.0) {
      const buttress = new THREE.Mesh(buttressGeo, steelColumnMat)
      buttress.position.set(-26.65, 3.6, bz)
      buttress.castShadow = true
      complexGroup.add(buttress)
    }

    // Cooling Pipe Flanged Wall Penetrations through West Wall (at X = -26, Y = 3.4)
    const wallSleeveGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.4, 16)
    wallSleeveGeo.rotateZ(Math.PI / 2)
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
    const sleeve1 = new THREE.Mesh(wallSleeveGeo, sleeveMat)
    sleeve1.position.set(-26, 3.4, -14)
    const sleeve2 = new THREE.Mesh(wallSleeveGeo, sleeveMat)
    sleeve2.position.set(-26, 3.4, -12.7)
    complexGroup.add(sleeve1, sleeve2)

    // EAST EXTERIOR WALL (Right solid facade facing fiber vault/parking)
    // Spans from Z: -32 to +14 (Depth 46m, Height 7.2m, Thickness 1.2m) at X: 38
    const eastWallGeo = new THREE.BoxGeometry(1.2, 7.2, 46)
    const eastWall = new THREE.Mesh(eastWallGeo, wallPanelMat)
    eastWall.position.set(38, 3.6, -9)
    eastWall.castShadow = true
    eastWall.receiveShadow = true
    complexGroup.add(eastWall)

    const eastCopingGeo = new THREE.BoxGeometry(1.5, 0.4, 46.4)
    const eastCoping = new THREE.Mesh(eastCopingGeo, parapetCapMat)
    eastCoping.position.set(38, 7.4, -9)
    complexGroup.add(eastCoping)

    // Horizontal composite panel reveals on East facade
    const eastSeam1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 46.2), wallSeamMat)
    eastSeam1.position.set(38, 2.4, -9)
    const eastSeam2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 46.2), wallSeamMat)
    eastSeam2.position.set(38, 4.8, -9)
    complexGroup.add(eastSeam1, eastSeam2)

    // East Facade Structural Buttress Columns (Facing Fiber Vault & Parking)
    for (let bz = -30; bz <= 12; bz += 7.0) {
      const buttress = new THREE.Mesh(buttressGeo, steelColumnMat)
      buttress.position.set(38.65, 3.6, bz)
      buttress.castShadow = true
      complexGroup.add(buttress)
    }

    // East facade emergency egress double doors
    const exitDoorGeo = new THREE.BoxGeometry(0.15, 2.6, 1.8)
    const exitDoor = new THREE.Mesh(exitDoorGeo, steelColumnMat)
    exitDoor.position.set(38.6, 1.3, -9)
    const exitSignGeo = new THREE.BoxGeometry(0.2, 0.4, 0.8)
    const exitSignMat = new THREE.MeshStandardMaterial({
      color: 0x052e16,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
    })
    const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat)
    exitSign.position.set(38.6, 2.9, -9)
    complexGroup.add(exitDoor, exitSign)

    // SOUTH FRONT FACADE (Stepped down at the cutaways to expose Hall A and Hall B)
    // Segment 1: West Wing South Wall (Solid Corner): X: -26 to -19 (Width 7m, Height 7.2m)
    const southWestGeo = new THREE.BoxGeometry(7, 7.2, 1.2)
    const southWest = new THREE.Mesh(southWestGeo, wallPanelMat)
    southWest.position.set(-22.5, 3.6, 14)
    southWest.castShadow = true
    complexGroup.add(southWest)

    // Segment 2: Hall A Front Parapet Ledge (Low 2.2m knee wall for direct line-of-sight!)
    const hallAKneeGeo = new THREE.BoxGeometry(19, 2.2, 1.0)
    const hallAKnee = new THREE.Mesh(hallAKneeGeo, wallPanelMat)
    hallAKnee.position.set(-9.5, 1.1, 14)
    const hallAKneeCap = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.25, 1.2), parapetCapMat)
    hallAKneeCap.position.set(-9.5, 2.25, 14)
    complexGroup.add(hallAKnee, hallAKneeCap)

    // Segment 3: Central Entrance Pavilion & Corporate Lobby (X: 0 to 12, Height 7.5m, Width 12m)
    const entranceGeo = new THREE.BoxGeometry(12, 7.5, 8.0)
    const entrance = new THREE.Mesh(entranceGeo, wallPanelMat)
    entrance.position.set(6, 3.75, 10)
    entrance.castShadow = true
    entrance.receiveShadow = true
    complexGroup.add(entrance)

    // Entrance Glass Lobby Curtain Wall (Front face of central pavilion)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x081522, // dark architectural solar-reflective tint
      roughness: 0.08,
      metalness: 0.95,
      transparent: true,
      opacity: 0.85,
    })
    const glassCurtain = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 0.2), glassMat)
    glassCurtain.position.set(6, 2.6, 14.1)
    complexGroup.add(glassCurtain)

    // Structural Bronze/Graphite Window Mullions
    const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.3 })
    const vMullionGeo = new THREE.BoxGeometry(0.12, 4.5, 0.26)
    for (let mx = 3.5; mx <= 8.5; mx += 2.5) {
      const vMull = new THREE.Mesh(vMullionGeo, mullionMat)
      vMull.position.set(mx, 2.6, 14.1)
      complexGroup.add(vMull)
    }
    const hMull = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.26), mullionMat)
    hMull.position.set(6, 2.6, 14.1)
    complexGroup.add(hMull)

    // Modern Cantilever Entrance Canopy
    const canopyGeo = new THREE.BoxGeometry(10, 0.35, 3.5)
    const entranceCanopy = new THREE.Mesh(canopyGeo, parapetCapMat)
    entranceCanopy.position.set(6, 4.8, 15.5)
    complexGroup.add(entranceCanopy)

    // Luminous Illuminated "CORELINE" Signage on Entrance Facade (IMAGE 2)
    const logoBadgeGeo = new THREE.BoxGeometry(8.5, 1.8, 0.3)
    const logoBadgeMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.9,
    })
    const logoBadge = new THREE.Mesh(logoBadgeGeo, logoBadgeMat)
    logoBadge.position.set(6, 6.2, 14.2)
    complexGroup.add(logoBadge)

    // Interior Warm Lobby Glow
    const lobbyGlow = new THREE.PointLight(0xfef08a, 1.6, 14)
    lobbyGlow.position.set(6, 3.2, 11)
    complexGroup.add(lobbyGlow)

    // Segment 4: Hall B Front Parapet Ledge (Low 2.2m knee wall for direct line-of-sight!)
    const hallBKneeGeo = new THREE.BoxGeometry(18, 2.2, 1.0)
    const hallBKnee = new THREE.Mesh(hallBKneeGeo, wallPanelMat)
    hallBKnee.position.set(21, 1.1, 14)
    const hallBKneeCap = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.25, 1.2), parapetCapMat)
    hallBKneeCap.position.set(21, 2.25, 14)
    complexGroup.add(hallBKnee, hallBKneeCap)

    // High-visibility safety hazard kickplates along knee walls
    const kickplateMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.6,
    })
    const kickA = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.2, 0.08), kickplateMat)
    kickA.position.set(-9.5, 0.1, 14.52)
    const kickB = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.2, 0.08), kickplateMat)
    kickB.position.set(21, 0.1, 14.52)
    complexGroup.add(kickA, kickB)

    // Segment 5: East Wing South Wall (Connecting to Loading Dock): X: 30 to 38
    const southEastGeo = new THREE.BoxGeometry(8, 7.2, 1.2)
    const southEast = new THREE.Mesh(southEastGeo, wallPanelMat)
    southEast.position.set(34, 3.6, 14)
    complexGroup.add(southEast)

    // Luminous Illuminated "CORELINE" Signage on Right Wing Facade (Directly matching IMAGE 2!)
    const rightLogoGeo = new THREE.BoxGeometry(7.5, 1.8, 0.3)
    const rightLogo = new THREE.Mesh(rightLogoGeo, logoBadgeMat)
    rightLogo.position.set(34, 5.2, 14.2)
    complexGroup.add(rightLogo)

    // -------------------------------------------------------------
    // 2. CENTRAL DIVIDING SPINE & SERVICE CORRIDOR (Separates Hall A & B)
    // -------------------------------------------------------------
    // Spine Wall from Z: -32 to +6 (Depth 38m, Width 5m, Height 7.2m) at X: 6
    const spineGeo = new THREE.BoxGeometry(5, 7.2, 38)
    const spine = new THREE.Mesh(spineGeo, wallPanelMat)
    spine.position.set(6, 3.6, -13)
    spine.castShadow = true
    spine.receiveShadow = true
    complexGroup.add(spine)

    // Rooftop HVAC units on top of the solid central spine corridor
    const roofHvacGeo = new THREE.BoxGeometry(3.6, 1.8, 3.2)
    const roofHvacMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 })
    for (let sz = -28; sz <= -2; sz += 8) {
      const hvac = new THREE.Mesh(roofHvacGeo, roofHvacMat)
      hvac.position.set(6, 8.1, sz)
      hvac.castShadow = true
      complexGroup.add(hvac)
    }

    // -------------------------------------------------------------
    // 3. STRUCTURAL STEEL COLUMNS (I-BEAMS) GIVING ARCHITECTURAL DEPTH
    // -------------------------------------------------------------
    const columnGeo = new THREE.BoxGeometry(0.45, 7.2, 0.45)
    const columnBaseGeo = new THREE.BoxGeometry(0.7, 0.2, 0.7)

    // North wall interior columns
    const northColXs = [-24, -18, -11, -4, 3, 9, 16, 23, 30, 37]
    northColXs.forEach((cx) => {
      const col = new THREE.Mesh(columnGeo, steelColumnMat)
      col.position.set(cx, 3.6, -31.2)
      const base = new THREE.Mesh(columnBaseGeo, steelColumnMat)
      base.position.set(cx, 0.25, -31.2)
      complexGroup.add(col, base)
    })

    // West wall interior columns (Hall A)
    const colZs = [-26, -18, -10, -2, 6]
    colZs.forEach((cz) => {
      const colW = new THREE.Mesh(columnGeo, steelColumnMat)
      colW.position.set(-25.2, 3.6, cz)
      const baseW = new THREE.Mesh(columnBaseGeo, steelColumnMat)
      baseW.position.set(-25.2, 0.25, cz)
      complexGroup.add(colW, baseW)

      // Spine West face columns (Hall A)
      const colSW = new THREE.Mesh(columnGeo, steelColumnMat)
      colSW.position.set(3.4, 3.6, cz)
      const baseSW = new THREE.Mesh(columnBaseGeo, steelColumnMat)
      baseSW.position.set(3.4, 0.25, cz)
      complexGroup.add(colSW, baseSW)

      // Spine East face columns (Hall B)
      const colSE = new THREE.Mesh(columnGeo, steelColumnMat)
      colSE.position.set(8.6, 3.6, cz)
      const baseSE = new THREE.Mesh(columnBaseGeo, steelColumnMat)
      baseSE.position.set(8.6, 0.25, cz)
      complexGroup.add(colSE, baseSE)

      // East wall interior columns (Hall B)
      const colE = new THREE.Mesh(columnGeo, steelColumnMat)
      colE.position.set(37.2, 3.6, cz)
      const baseE = new THREE.Mesh(columnBaseGeo, steelColumnMat)
      baseE.position.set(37.2, 0.25, cz)
      complexGroup.add(colE, baseE)
    })

    // Low front stanchions supporting roof truss ends along the south knee-wall
    const frontStanchionGeo = new THREE.BoxGeometry(0.35, 5.0, 0.35)
    const hallAStanchionXs = [-22, -16, -10, -4]
    hallAStanchionXs.forEach((fx) => {
      const stanchion = new THREE.Mesh(frontStanchionGeo, steelColumnMat)
      stanchion.position.set(fx, 4.7, 13.8)
      complexGroup.add(stanchion)
    })
    const hallBStanchionXs = [12, 18, 24, 30]
    hallBStanchionXs.forEach((fx) => {
      const stanchion = new THREE.Mesh(frontStanchionGeo, steelColumnMat)
      stanchion.position.set(fx, 4.7, 13.8)
      complexGroup.add(stanchion)
    })

    // -------------------------------------------------------------
    // 4. HALL A INTERIOR (COMPLETELY OPEN TOP, VIBRANT CYAN ILLUMINATION)
    // -------------------------------------------------------------
    // Raised Access Floor (X: -25 to 3.5, Z: -31 to 13)
    const hallAFloorGeo = new THREE.PlaneGeometry(28, 44)
    const hallAFloor = new THREE.Mesh(hallAFloorGeo, raisedFloorMat)
    hallAFloor.rotation.x = -Math.PI / 2
    hallAFloor.position.set(-11, 0.15, -9)
    hallAFloor.receiveShadow = true
    hallAFloor.userData = { id: 'hall-a', name: 'HALL A // FOUNDATION TRAINING (NVIDIA H100 SXM5)', type: 'hall' }
    complexGroup.add(hallAFloor)
    this.interactiveMeshes.push(hallAFloor)

    // Open-Web Steel Roof Trusses across Hall A opening (X: -25.5 to 3.5)
    const trussTopChordGeo = new THREE.BoxGeometry(28.8, 0.22, 0.35)
    const trussBottomChordGeo = new THREE.BoxGeometry(28.8, 0.22, 0.35)
    const trussWebGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6)
    const cableTrayGeo = new THREE.BoxGeometry(27.5, 0.16, 0.45)
    const buswayGeo = new THREE.BoxGeometry(27.5, 0.24, 0.24)

    for (let tz = -24; tz <= 6; tz += 6.0) {
      // Top chord
      const topChord = new THREE.Mesh(trussTopChordGeo, steelColumnMat)
      topChord.position.set(-11, 7.15, tz)
      // Bottom chord
      const bottomChord = new THREE.Mesh(trussBottomChordGeo, steelColumnMat)
      bottomChord.position.set(-11, 6.45, tz)
      complexGroup.add(topChord, bottomChord)

      // Vertical web struts
      for (let wx = -23; wx <= 1; wx += 3.5) {
        const strut = new THREE.Mesh(trussWebGeo, steelColumnMat)
        strut.position.set(wx, 6.8, tz)
        complexGroup.add(strut)
      }

      // Suspended cable tray
      const tray = new THREE.Mesh(cableTrayGeo, cableTrayMat)
      tray.position.set(-11, 5.2, tz)

      // Suspended electrical busway
      const busway = new THREE.Mesh(buswayGeo, buswayMat)
      busway.position.set(-11, 4.8, tz)
      complexGroup.add(tray, busway)
    }

    // Overhead Longitudinal HVAC Supply Ducts in Hall A
    const ductGeo = new THREE.BoxGeometry(0.85, 0.55, 36)
    const diffuserGeo = new THREE.CylinderGeometry(0.35, 0.18, 0.45, 8)
    const ductA1 = new THREE.Mesh(ductGeo, ductMat)
    ductA1.position.set(-17, 5.7, -9)
    const ductA2 = new THREE.Mesh(ductGeo, ductMat)
    ductA2.position.set(-5, 5.7, -9)
    complexGroup.add(ductA1, ductA2)

    // Downward air diffusers into cold aisles
    for (let tz = -24; tz <= 6; tz += 6.0) {
      const diff1 = new THREE.Mesh(diffuserGeo, ductMat)
      diff1.position.set(-17, 5.2, tz - 1.6)
      const diff2 = new THREE.Mesh(diffuserGeo, ductMat)
      diff2.position.set(-5, 5.2, tz - 1.6)
      complexGroup.add(diff1, diff2)
    }

    // Interior Wall Illuminated Signage in Hall A (North Wall)
    const hallASignGeo = new THREE.BoxGeometry(15, 1.4, 0.15)
    const hallASignMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    })
    const hallASign = new THREE.Mesh(hallASignGeo, hallASignMat)
    hallASign.position.set(-11, 5.5, -31.3)
    complexGroup.add(hallASign)

    // Hall A Downlights (High-intensity electric cyan & blue downward wash)
    const hallALight1 = new THREE.PointLight(0x22d3ee, 2.6, 36)
    hallALight1.position.set(-11, 6.2, -16)
    const hallALight2 = new THREE.PointLight(0x38bdf8, 2.4, 36)
    hallALight2.position.set(-11, 6.2, 0)
    complexGroup.add(hallALight1, hallALight2)
    this.hallLights.push(hallALight1, hallALight2)

    // -------------------------------------------------------------
    // 5. HALL B INTERIOR (COMPLETELY OPEN TOP, DUAL AMBER/BLUE CONTRAST)
    // -------------------------------------------------------------
    // Raised Access Floor (X: 8.5 to 37, Z: -31 to 13)
    const hallBFloorGeo = new THREE.PlaneGeometry(28, 44)
    const hallBFloor = new THREE.Mesh(hallBFloorGeo, raisedFloorMat)
    hallBFloor.rotation.x = -Math.PI / 2
    hallBFloor.position.set(23, 0.15, -9)
    hallBFloor.receiveShadow = true
    hallBFloor.userData = { id: 'hall-b', name: 'HALL B // INFERENCE & MOE CLUSTER (B200 NVL / TPU)', type: 'hall' }
    complexGroup.add(hallBFloor)
    this.interactiveMeshes.push(hallBFloor)

    // Open-Web Steel Roof Trusses across Hall B opening (X: 8.5 to 37.5)
    for (let tz = -24; tz <= 6; tz += 6.0) {
      const topChord = new THREE.Mesh(trussTopChordGeo, steelColumnMat)
      topChord.position.set(23, 7.15, tz)
      const bottomChord = new THREE.Mesh(trussBottomChordGeo, steelColumnMat)
      bottomChord.position.set(23, 6.45, tz)
      complexGroup.add(topChord, bottomChord)

      for (let wx = 11; wx <= 35; wx += 3.5) {
        const strut = new THREE.Mesh(trussWebGeo, steelColumnMat)
        strut.position.set(wx, 6.8, tz)
        complexGroup.add(strut)
      }

      const tray = new THREE.Mesh(cableTrayGeo, cableTrayMat)
      tray.position.set(23, 5.2, tz)

      const busway = new THREE.Mesh(buswayGeo, buswayMat)
      busway.position.set(23, 4.8, tz)
      complexGroup.add(tray, busway)
    }

    // Overhead Longitudinal HVAC Supply Ducts in Hall B
    const ductB1 = new THREE.Mesh(ductGeo, ductMat)
    ductB1.position.set(17, 5.7, -9)
    const ductB2 = new THREE.Mesh(ductGeo, ductMat)
    ductB2.position.set(29, 5.7, -9)
    complexGroup.add(ductB1, ductB2)

    for (let tz = -24; tz <= 6; tz += 6.0) {
      const diff1 = new THREE.Mesh(diffuserGeo, ductMat)
      diff1.position.set(17, 5.2, tz - 1.6)
      const diff2 = new THREE.Mesh(diffuserGeo, ductMat)
      diff2.position.set(29, 5.2, tz - 1.6)
      complexGroup.add(diff1, diff2)
    }

    // Interior Wall Illuminated Signage in Hall B (North Wall)
    const hallBSignGeo = new THREE.BoxGeometry(15, 1.4, 0.15)
    const hallBSignMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    })
    const hallBSign = new THREE.Mesh(hallBSignGeo, hallBSignMat)
    hallBSign.position.set(23, 5.5, -31.3)
    complexGroup.add(hallBSign)

    // Hall B Downlights (Dual-Color: Warm Amber Hot Aisle + Cool Blue Compute Node Wash)
    const hallBLightWarm = new THREE.PointLight(0xf97316, 2.6, 36)
    hallBLightWarm.position.set(23, 6.2, -16)
    const hallBLightCool = new THREE.PointLight(0x0284c7, 2.4, 36)
    hallBLightCool.position.set(23, 6.2, 0)
    complexGroup.add(hallBLightWarm, hallBLightCool)
    this.hallLights.push(hallBLightWarm, hallBLightCool)

    this.scene.add(complexGroup)

    // Build the dense, highly visible GPU server racks in both open courtyards
    this.buildDenseServerRacks()
  }

  // ==========================================
  // DENSE HIGH-REALISM GPU SERVER RACKS
  // ==========================================
  private buildDenseServerRacks() {
    // 42U Heavy Enterprise Server Rack Cabinet
    const rackCabinetGeo = new THREE.BoxGeometry(2.2, 3.8, 1.3)
    const rackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f16, // deep matte black chassis
      roughness: 0.35,
      metalness: 0.6,
    })

    const serverBladeGeo = new THREE.BoxGeometry(2.05, 0.38, 0.14)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.4,
      metalness: 0.5,
    })

    const ledGeo = new THREE.SphereGeometry(0.065, 8, 8)

    // Aisle containment end-cap panels & row signage materials
    const containmentPanelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    })
    const rowSignGeo = new THREE.BoxGeometry(0.18, 0.5, 1.2)
    const grilleGeo = new THREE.BoxGeometry(24, 0.04, 1.3)
    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.85,
    })

    // ==========================================
    // HALL A: 48 RACKS IN 6 DENSE ROWS (8 RACKS PER ROW)
    // Front to back: Cold Aisle Containment with Electric Cyan Glow
    // ==========================================
    const hallARowZs = [-24, -18, -12, -6, 0, 6]
    hallARowZs.forEach((rowZ, rowIndex) => {
      // Perforated Raised Floor Grille & Electric Cyan Underfloor Glow
      const grille = new THREE.Mesh(grilleGeo, grilleMat)
      grille.position.set(-11, 0.17, rowZ - 1.6)
      this.scene.add(grille)

      const aisleRunnerGeo = new THREE.PlaneGeometry(24, 0.9)
      const aisleRunnerMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      const aisleRunner = new THREE.Mesh(aisleRunnerGeo, aisleRunnerMat)
      aisleRunner.rotation.x = -Math.PI / 2
      aisleRunner.position.set(-11, 0.19, rowZ - 1.6)
      this.scene.add(aisleRunner)

      // Row End-Cap Containment Baffles (Left and Right ends of the row)
      const endCapGeo = new THREE.BoxGeometry(0.12, 3.8, 1.4)
      const endCapLeft = new THREE.Mesh(endCapGeo, containmentPanelMat)
      endCapLeft.position.set(-23.6, 2.05, rowZ)
      const endCapRight = new THREE.Mesh(endCapGeo, containmentPanelMat)
      endCapRight.position.set(0.6, 2.05, rowZ)
      this.scene.add(endCapLeft, endCapRight)

      // Illuminated Row Badge: ROW A01 ... ROW A06
      const rowSignMatA = new THREE.MeshStandardMaterial({
        color: 0x07111e,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.95,
        metalness: 0.8,
      })
      const signA = new THREE.Mesh(rowSignGeo, rowSignMatA)
      signA.position.set(0.7, 3.4, rowZ)
      this.scene.add(signA)

      // 8 Racks in this row (from X: -22 to X: -0.3)
      for (let col = 0; col < 8; col++) {
        const rackNumber = rowIndex * 8 + col + 1
        const rackId = `RACK-A-${String(rackNumber).padStart(3, '0')}`
        const posX = -22 + col * 3.1
        const posZ = rowZ

        const rackGroup = new THREE.Group()
        rackGroup.position.set(posX, 1.9 + 0.15, posZ)

        // Outer Cabinet
        const cabinet = new THREE.Mesh(rackCabinetGeo, rackFrameMat)
        cabinet.castShadow = true
        cabinet.receiveShadow = true
        cabinet.userData = {
          id: rackId,
          name: `${rackId} (NVIDIA H100 SXM5 / 3.2 Tbps NVLink)`,
          type: 'rack',
          hallId: 'hall-a',
        }
        rackGroup.add(cabinet)
        this.interactiveMeshes.push(cabinet)

        // 8 Horizontal Server Units per Rack (Visible Blades)
        const rackLeds: THREE.MeshBasicMaterial[] = []
        for (let b = 0; b < 8; b++) {
          const blade = new THREE.Mesh(serverBladeGeo, bladeMat)
          blade.position.set(0, -1.4 + b * 0.4, 0.62)
          rackGroup.add(blade)

          // 4 Glowing Activity LEDs per unit (Cyan, Green, Blue)
          for (let l = 0; l < 4; l++) {
            const ledMat = new THREE.MeshBasicMaterial({
              color: l === 0 ? 0x22d3ee : l === 1 ? 0x34d399 : l === 2 ? 0x38bdf8 : 0x06b6d4,
            })
            const led = new THREE.Mesh(ledGeo, ledMat)
            led.position.set(-0.75 + l * 0.5, -1.4 + b * 0.4, 0.68)
            rackGroup.add(led)
            rackLeds.push(ledMat)
          }
        }

        // Top Status Beacon Tower
        const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8)
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0x34d399 })
        const beacon = new THREE.Mesh(beaconGeo, beaconMat)
        beacon.position.set(0, 2.05, 0)
        rackGroup.add(beacon)
        rackLeds.push(beaconMat)

        this.rackLedMaterials.set(rackId, rackLeds)
        this.rackMeshMap.set(rackId, rackGroup)
        this.scene.add(rackGroup)
      }
    })

    // ==========================================
    // HALL B: 48 RACKS IN 6 DENSE ROWS (8 RACKS PER ROW)
    // Alternating Hot/Cold Aisles (Amber/Red vs Electric Blue matching IMAGE 2)
    // ==========================================
    const hallBRowZs = [-24, -18, -12, -6, 0, 6]
    hallBRowZs.forEach((rowZ, rowIndex) => {
      const isHotAisle = rowIndex % 2 === 0

      // Raised Floor Grille & Glow
      const grilleB = new THREE.Mesh(grilleGeo, grilleMat)
      grilleB.position.set(23, 0.17, rowZ - 1.6)
      this.scene.add(grilleB)

      const aisleRunnerGeo = new THREE.PlaneGeometry(24, 0.9)
      const aisleRunnerMat = new THREE.MeshBasicMaterial({
        color: isHotAisle ? 0xef4444 : 0x0284c7,
      })
      const aisleRunner = new THREE.Mesh(aisleRunnerGeo, aisleRunnerMat)
      aisleRunner.rotation.x = -Math.PI / 2
      aisleRunner.position.set(23, 0.19, rowZ - 1.6)
      this.scene.add(aisleRunner)

      // Row End-Cap Containment Baffles (Left and Right ends of the row)
      const endCapGeo = new THREE.BoxGeometry(0.12, 3.8, 1.4)
      const endCapLeft = new THREE.Mesh(endCapGeo, containmentPanelMat)
      endCapLeft.position.set(10.4, 2.05, rowZ)
      const endCapRight = new THREE.Mesh(endCapGeo, containmentPanelMat)
      endCapRight.position.set(34.6, 2.05, rowZ)
      this.scene.add(endCapLeft, endCapRight)

      // Illuminated Row Badge: ROW B01 ... ROW B06
      const rowSignMatB = new THREE.MeshStandardMaterial({
        color: 0x07111e,
        emissive: isHotAisle ? 0xf59e0b : 0x38bdf8,
        emissiveIntensity: 0.95,
        metalness: 0.8,
      })
      const signB = new THREE.Mesh(rowSignGeo, rowSignMatB)
      signB.position.set(10.3, 3.4, rowZ)
      this.scene.add(signB)

      // 8 Racks in this row (from X: 12 to X: 34)
      for (let col = 0; col < 8; col++) {
        const rackNumber = rowIndex * 8 + col + 1
        const rackId = `RACK-B-${String(rackNumber).padStart(3, '0')}`
        const posX = 12 + col * 3.1
        const posZ = rowZ

        const rackGroup = new THREE.Group()
        rackGroup.position.set(posX, 1.9 + 0.15, posZ)

        // Outer Cabinet
        const cabinet = new THREE.Mesh(rackCabinetGeo, rackFrameMat)
        cabinet.castShadow = true
        cabinet.receiveShadow = true
        cabinet.userData = {
          id: rackId,
          name: `${rackId} (NVIDIA B200 NVL / TPU v5p Cluster)`,
          type: 'rack',
          hallId: 'hall-b',
        }
        rackGroup.add(cabinet)
        this.interactiveMeshes.push(cabinet)

        // 8 Horizontal Server Units
        const rackLeds: THREE.MeshBasicMaterial[] = []
        for (let b = 0; b < 8; b++) {
          const blade = new THREE.Mesh(serverBladeGeo, bladeMat)
          blade.position.set(0, -1.4 + b * 0.4, 0.62)
          rackGroup.add(blade)

          // 4 Glowing LEDs with Amber/Red hot accents and Blue compute nodes
          for (let l = 0; l < 4; l++) {
            let colHex = 0x38bdf8
            if (isHotAisle) {
              colHex = l === 0 ? 0xf59e0b : l === 1 ? 0xef4444 : 0x38bdf8
            }
            const ledMat = new THREE.MeshBasicMaterial({ color: colHex })
            const led = new THREE.Mesh(ledGeo, ledMat)
            led.position.set(-0.75 + l * 0.5, -1.4 + b * 0.4, 0.68)
            rackGroup.add(led)
            rackLeds.push(ledMat)
          }
        }

        // Top Status Beacon
        const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8)
        const beaconMat = new THREE.MeshBasicMaterial({ color: isHotAisle ? 0xf59e0b : 0x34d399 })
        const beacon = new THREE.Mesh(beaconGeo, beaconMat)
        beacon.position.set(0, 2.05, 0)
        rackGroup.add(beacon)
        rackLeds.push(beaconMat)

        this.rackLedMaterials.set(rackId, rackLeds)
        this.rackMeshMap.set(rackId, rackGroup)
        this.scene.add(rackGroup)
      }
    })

    // Thermal Heat Overlay Mesh
    this.buildHeatOverlay()
  }

  // ==========================================
  // HEAT OVERLAY MESHES
  // ==========================================
  private buildHeatOverlay() {
    this.heatOverlayGroup.visible = false
    const heatPlaneGeo = new THREE.PlaneGeometry(24, 2.8)

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

    // Hall A Heatmap Planes
    for (let r = 0; r < 6; r++) {
      const plane = new THREE.Mesh(heatPlaneGeo, r % 2 === 0 ? hotAisleMat : coldAisleMat)
      plane.rotation.x = -Math.PI / 2
      plane.position.set(-11, 4.4, -24 + r * 6.0)
      this.heatOverlayGroup.add(plane)
    }

    // Hall B Heatmap Planes
    for (let r = 0; r < 6; r++) {
      const plane = new THREE.Mesh(heatPlaneGeo, r % 2 === 0 ? hotAisleMat : coldAisleMat)
      plane.rotation.x = -Math.PI / 2
      plane.position.set(23, 4.4, -24 + r * 6.0)
      this.heatOverlayGroup.add(plane)
    }

    this.scene.add(this.heatOverlayGroup)
  }

  // ==========================================
  // COOLING INFRASTRUCTURE ZONE (LEFT YARD)
  // ==========================================
  private buildCoolingInfrastructure() {
    const coolingGroup = new THREE.Group()
    this.coolingParentGroup = coolingGroup

    // 1. Concrete Equipment Foundation Pad for Cooling Yard
    const padGeo = new THREE.BoxGeometry(38, 0.5, 24)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.75, metalness: 0.15 })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(-28, 0.25, -28)
    pad.receiveShadow = true
    coolingGroup.add(pad)

    // 2. 3 Massive Industrial Cooling Towers with Rotating Fans (Matching IMAGE 2)
    const towerXs = [-38, -28, -18]
    const basinGeo = new THREE.CylinderGeometry(4.7, 4.9, 0.6, 24)
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x1e2733, roughness: 0.8 })

    const stiltGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.5, 8)
    const stiltMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 })

    const louverGeo = new THREE.CylinderGeometry(4.5, 4.5, 1.2, 24)
    const louverMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.4 })

    const towerBodyGeo = new THREE.CylinderGeometry(3.6, 4.5, 5.5, 24)
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // concrete-grey industrial shell
      roughness: 0.4,
      metalness: 0.4,
    })

    const shroudGeo = new THREE.CylinderGeometry(3.1, 3.5, 1.6, 24)
    const shroudMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })

    const fanBladeGeo = new THREE.BoxGeometry(2.8, 0.08, 0.5)
    const fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0284c7, emissiveIntensity: 0.5 })

    const railGeo = new THREE.TorusGeometry(3.5, 0.05, 8, 24)
    railGeo.rotateX(Math.PI / 2)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })

    const ladderPostGeo = new THREE.BoxGeometry(0.08, 7.6, 0.08)
    const ladderRungGeo = new THREE.BoxGeometry(0.4, 0.04, 0.04)

    towerXs.forEach((tx, idx) => {
      const towerGroup = new THREE.Group()
      towerGroup.position.set(tx, 0, -28)

      // Cold water collection basin at ground level
      const basin = new THREE.Mesh(basinGeo, basinMat)
      basin.position.y = 0.3
      basin.receiveShadow = true
      towerGroup.add(basin)

      // 8 Support Stilts elevating the main tower casing off the basin
      for (let s = 0; s < 8; s++) {
        const angle = (s / 8) * Math.PI * 2
        const stilt = new THREE.Mesh(stiltGeo, stiltMat)
        stilt.position.set(Math.cos(angle) * 3.8, 1.35, Math.sin(angle) * 3.8)
        towerGroup.add(stilt)
      }

      // Air intake louver band
      const louvers = new THREE.Mesh(louverGeo, louverMat)
      louvers.position.y = 1.6
      towerGroup.add(louvers)

      // Main tower body casing
      const body = new THREE.Mesh(towerBodyGeo, towerMat)
      body.position.y = 4.8
      body.castShadow = true
      body.receiveShadow = true
      body.userData = { id: `COOL-TWR-0${idx + 1}`, name: `Cooling Tower Bank ${idx + 1} (55 MW)`, type: 'cooling' }
      towerGroup.add(body)
      this.interactiveMeshes.push(body)

      // Fan Cowl / Velocity Recovery Stack
      const shroud = new THREE.Mesh(shroudGeo, shroudMat)
      shroud.position.y = 8.1
      towerGroup.add(shroud)

      // Top Fan Deck Safety Perimeter Handrail
      const rail = new THREE.Mesh(railGeo, railMat)
      rail.position.y = 8.8
      towerGroup.add(rail)

      // Caged Safety Access Ladder on tower side
      const lP1 = new THREE.Mesh(ladderPostGeo, stiltMat)
      lP1.position.set(4.3, 4.3, -0.2)
      const lP2 = new THREE.Mesh(ladderPostGeo, stiltMat)
      lP2.position.set(4.3, 4.3, 0.2)
      towerGroup.add(lP1, lP2)
      for (let ry = 1.0; ry <= 7.8; ry += 0.45) {
        const rung = new THREE.Mesh(ladderRungGeo, stiltMat)
        rung.position.set(4.3, ry, 0)
        towerGroup.add(rung)
      }

      // 4-blade Rotating Fan
      const fanGroup = new THREE.Group()
      fanGroup.position.y = 8.1
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(fanBladeGeo, fanBladeMat)
        blade.rotation.y = (b * Math.PI) / 2
        fanGroup.add(blade)
      }
      towerGroup.add(fanGroup)
      this.fans.push(fanGroup)

      this.coolingTowerGroups.push(towerGroup)
      coolingGroup.add(towerGroup)
    })

    // 3. Liquid Chillers Plant (48 MW Dual-Shell Industrial Units)
    const chillerPadGeo = new THREE.BoxGeometry(11, 0.3, 7.5)
    const chillerPad = new THREE.Mesh(chillerPadGeo, padMat)
    chillerPad.position.set(-28, 0.15, -14)
    coolingGroup.add(chillerPad)

    const chillerGeo = new THREE.BoxGeometry(9.6, 0.5, 4.6)
    const chillerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 })
    const chiller = new THREE.Mesh(chillerGeo, chillerMat)
    chiller.position.set(-28, 0.45, -14)
    chiller.castShadow = true
    chiller.userData = { id: 'CHILLER-01', name: 'Liquid Chiller Plant (48 MW Dual-Shell)', type: 'cooling' }
    coolingGroup.add(chiller)
    this.interactiveMeshes.push(chiller)

    // Lower Evaporator Barrel (Dual-Shell Industrial Vessel)
    const evapGeo = new THREE.CylinderGeometry(0.85, 0.85, 8.8, 16)
    evapGeo.rotateZ(Math.PI / 2)
    const evapMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 })
    const evap = new THREE.Mesh(evapGeo, evapMat)
    evap.position.set(-28, 1.5, -14.8)
    evap.castShadow = true
    coolingGroup.add(evap)

    // Upper Condenser Barrel
    const condGeo = new THREE.CylinderGeometry(0.75, 0.75, 8.4, 16)
    condGeo.rotateZ(Math.PI / 2)
    const condMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.35 })
    const cond = new THREE.Mesh(condGeo, condMat)
    cond.position.set(-28, 2.9, -13.4)
    cond.castShadow = true
    coolingGroup.add(cond)

    // Stainless Steel Reinforcement Bands on barrels
    const bandGeo = new THREE.CylinderGeometry(0.87, 0.87, 0.14, 16)
    bandGeo.rotateZ(Math.PI / 2)
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
    for (let bx of [-31.5, -29.5, -28, -26.5, -24.5]) {
      const bE = new THREE.Mesh(bandGeo, bandMat)
      bE.position.set(bx, 1.5, -14.8)
      coolingGroup.add(bE)
    }

    // Central Centrifugal Compressor
    const compVoluteGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.8, 16)
    const compVolute = new THREE.Mesh(compVoluteGeo, chillerMat)
    compVolute.position.set(-28, 3.8, -14.1)
    coolingGroup.add(compVolute)

    // VFD / Electrical Control Cabinet with Digital Display
    const vfdGeo = new THREE.BoxGeometry(2.0, 2.4, 1.0)
    const vfdMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85 })
    const vfd = new THREE.Mesh(vfdGeo, vfdMat)
    vfd.position.set(-23.8, 1.4, -14)
    const vfdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    )
    vfdScreen.position.set(-23.8, 1.6, -13.48)
    coolingGroup.add(vfd, vfdScreen)

    // 4. Large Insulated Pipe Racks connecting Cooling to Data Hall (Matching IMAGE 2)
    const pipeMatSupply = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x075985,
      emissiveIntensity: 0.08,
      metalness: 0.85,
      roughness: 0.35,
    })
    const pipeMatReturn = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      emissive: 0x115e59,
      emissiveIntensity: 0.08,
      metalness: 0.85,
      roughness: 0.35,
    })

    // Elevated H-Frame Pipe Supports from X: -38 to X: -26
    const bentPostGeo = new THREE.BoxGeometry(0.24, 3.4, 0.24)
    const bentBeamGeo = new THREE.BoxGeometry(0.24, 0.24, 3.0)
    for (let bx = -36; bx <= -26; bx += 3.2) {
      const p1 = new THREE.Mesh(bentPostGeo, stiltMat)
      p1.position.set(bx, 1.7, -15.2)
      const p2 = new THREE.Mesh(bentPostGeo, stiltMat)
      p2.position.set(bx, 1.7, -12.2)
      const beam = new THREE.Mesh(bentBeamGeo, stiltMat)
      beam.position.set(bx, 3.3, -13.7)
      coolingGroup.add(p1, p2, beam)
    }

    // Main Chilled Supply Pipe (enters West Wall penetration sleeve at X = -26, Y = 3.4, Z = -14)
    const pipeSupplyGeo = new THREE.CylinderGeometry(0.48, 0.48, 26, 16)
    pipeSupplyGeo.rotateZ(Math.PI / 2)
    const pipeSupply = new THREE.Mesh(pipeSupplyGeo, pipeMatSupply)
    pipeSupply.position.set(-13, 3.4, -14)

    // Main Condenser Return Pipe (enters West Wall at X = -26, Y = 3.4, Z = -12.7)
    const pipeReturnGeo = new THREE.CylinderGeometry(0.48, 0.48, 26, 16)
    pipeReturnGeo.rotateZ(Math.PI / 2)
    const pipeReturn = new THREE.Mesh(pipeReturnGeo, pipeMatReturn)
    pipeReturn.position.set(-13, 3.4, -12.7)

    // Spoked Handwheel Valves on Supply & Return Lines
    const valveWheelGeo = new THREE.TorusGeometry(0.38, 0.05, 8, 16)
    const redValveMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7 })
    const yellowValveMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 })

    const valve1 = new THREE.Mesh(valveWheelGeo, redValveMat)
    valve1.position.set(-27.2, 4.1, -14)
    valve1.rotation.x = Math.PI / 2
    const valve2 = new THREE.Mesh(valveWheelGeo, yellowValveMat)
    valve2.position.set(-27.2, 4.1, -12.7)
    valve2.rotation.x = Math.PI / 2

    coolingGroup.add(pipeSupply, pipeReturn, valve1, valve2)

    this.scene.add(coolingGroup)
  }

  // ==========================================
  // POWER INFRASTRUCTURE ZONE (SUBSTATION, TANKS, GENS)
  // ==========================================
  private buildPowerInfrastructure() {
    const powerGroup = new THREE.Group()
    this.powerParentGroup = powerGroup

    // 1. High-Voltage Electrical Substation (132 MW Grid-Tied)
    const subPadGeo = new THREE.BoxGeometry(26, 0.4, 24)
    const subPadMat = new THREE.MeshStandardMaterial({ color: 0x141d28, roughness: 0.85, metalness: 0.15 })
    const subPad = new THREE.Mesh(subPadGeo, subPadMat)
    subPad.position.set(-42, 0.2, 2)
    subPad.receiveShadow = true
    powerGroup.add(subPad)

    // Steel Lattice Gantry Structure (Visible Galvanized Steel)
    const gantryGeo = new THREE.BoxGeometry(13, 7.8, 0.6)
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.25 })
    const gantry = new THREE.Mesh(gantryGeo, gantryMat)
    gantry.position.set(-42, 3.9, -2)
    gantry.castShadow = true
    gantry.userData = { id: 'SUBSTATION-MAIN', name: 'Power Substation (132 MW Grid-Tied)', type: 'power' }
    powerGroup.add(gantry)
    this.interactiveMeshes.push(gantry)

    // Amber Ceramic Insulators & High-Voltage Busbars
    const insGeo = new THREE.CylinderGeometry(0.35, 0.4, 2.2, 8)
    const insMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    })
    for (let ix = -4.5; ix <= 4.5; ix += 3.0) {
      const ins = new THREE.Mesh(insGeo, insMat)
      ins.position.set(-42 + ix, 5.8, -2)
      powerGroup.add(ins)
    }

    // Overhead high-voltage aluminum bus conductors
    const busGeo = new THREE.CylinderGeometry(0.06, 0.06, 12, 8)
    busGeo.rotateZ(Math.PI / 2)
    const busMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.2 })
    const busLine1 = new THREE.Mesh(busGeo, busMat)
    busLine1.position.set(-42, 7.2, -2)
    powerGroup.add(busLine1)

    // Heavy Step-Down Oil-Immersed Transformers (with Cooling Radiator Fins & Conservator Tanks)
    const xformerBodyGeo = new THREE.BoxGeometry(3.4, 3.2, 3.0)
    const xformerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 })
    const finBankGeo = new THREE.BoxGeometry(0.35, 2.6, 2.8)
    const finMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.4 })
    const conservatorGeo = new THREE.CylinderGeometry(0.52, 0.52, 3.0, 16)
    conservatorGeo.rotateZ(Math.PI / 2)
    const bushingGeo = new THREE.ConeGeometry(0.22, 1.1, 8)

    // Reinforced Concrete Blast Barrier Walls (Firewalls between transformers)
    const blastWallGeo = new THREE.BoxGeometry(0.7, 4.6, 4.6)
    const blastWallMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 })
    const blast1 = new THREE.Mesh(blastWallGeo, blastWallMat)
    blast1.position.set(-44, 2.3, 5)
    const blast2 = new THREE.Mesh(blastWallGeo, blastWallMat)
    blast2.position.set(-40, 2.3, 5)
    blast1.castShadow = true
    blast2.castShadow = true
    powerGroup.add(blast1, blast2)

    // 3 Transformers at X: -46, -42, -38
    let xfIdx = 0
    for (let tx = -46; tx <= -38; tx += 4) {
      const xformerGroup = new THREE.Group()
      xformerGroup.position.set(tx, 0, 5)

      // Main Tank
      const xformer = new THREE.Mesh(xformerBodyGeo, xformerMat)
      xformer.position.y = 1.8
      xformer.castShadow = true
      xformer.userData = {
        id: xfIdx === 0 ? 'SUBSTATION-MAIN' : `XFORMER-0${xfIdx + 1}`,
        name: xfIdx === 0 ? 'Power Substation (132 MW Grid-Tied)' : `Aux Step-Down Transformer 0${xfIdx + 1}`,
        type: 'power',
      }
      xformerGroup.add(xformer)
      if (xfIdx === 0) this.interactiveMeshes.push(xformer)

      // Radiator Fin Banks on left and right
      const finsL = new THREE.Mesh(finBankGeo, finMat)
      finsL.position.set(-1.85, 1.8, 0)
      const finsR = new THREE.Mesh(finBankGeo, finMat)
      finsR.position.set(1.85, 1.8, 0)
      xformerGroup.add(finsL, finsR)

      // Top Conservator Tank
      const conservator = new THREE.Mesh(conservatorGeo, finMat)
      conservator.position.set(0, 3.75, 0)
      xformerGroup.add(conservator)

      // 3 High-Voltage Bushings on top
      for (let b = -0.9; b <= 0.9; b += 0.9) {
        const bush = new THREE.Mesh(bushingGeo, insMat)
        bush.position.set(b, 3.9, -0.7)
        xformerGroup.add(bush)
      }

      this.transformerGroups.push(xformerGroup)
      powerGroup.add(xformerGroup)
      xfIdx++
    }

    // 2. Cluster of 6 Vertical Cylindrical Fuel Storage Tanks (Matching IMAGE 2)
    // 1,200 m³ capacity / >72 hours reserve
    const tankBodyGeo = new THREE.CylinderGeometry(2.5, 2.5, 7.0, 24)
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // silver/grey metallic silos
      metalness: 0.8,
      roughness: 0.25,
    })
    const tankDomeGeo = new THREE.ConeGeometry(2.55, 0.6, 24)
    const tankRailGeo = new THREE.TorusGeometry(2.4, 0.04, 6, 24)
    tankRailGeo.rotateX(Math.PI / 2)

    const tankPositions: [number, number][] = [
      [-34, 22], [-28, 22], [-22, 22],
      [-34, 28], [-28, 28], [-22, 28],
    ]

    tankPositions.forEach(([tx, tz], idx) => {
      const tankGroup = new THREE.Group()
      tankGroup.position.set(tx, 0, tz)

      const body = new THREE.Mesh(tankBodyGeo, tankMat)
      body.position.y = 3.5
      body.castShadow = true
      body.receiveShadow = true
      body.userData = { id: `FUEL-TANK-0${idx + 1}`, name: 'Fuel Storage Tanks (1,200 m³)', type: 'power' }
      tankGroup.add(body)
      if (idx === 0) this.interactiveMeshes.push(body)

      // Dished Conical Dome Roof
      const dome = new THREE.Mesh(tankDomeGeo, tankMat)
      dome.position.y = 7.3
      tankGroup.add(dome)

      // Top Safety Handrail
      const rail = new THREE.Mesh(tankRailGeo, gantryMat)
      rail.position.y = 7.35
      tankGroup.add(rail)

      // Spiral External Stairway / Walkway
      for (let step = 0; step < 12; step++) {
        const angle = (step / 12) * Math.PI * 1.5
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.35), gantryMat)
        stepMesh.position.set(Math.cos(angle) * 2.75, 0.8 + step * 0.5, Math.sin(angle) * 2.75)
        stepMesh.rotation.y = -angle
        tankGroup.add(stepMesh)
      }

      powerGroup.add(tankGroup)
    })

    // Reinforced Concrete Spill Bund Wall around Fuel Tanks with External Access Stairway
    const bundWallGeo = new THREE.BoxGeometry(19, 1.2, 15)
    const bundWallMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 })
    const bundWall = new THREE.Mesh(bundWallGeo, bundWallMat)
    bundWall.position.set(-28, 0.6, 25)
    powerGroup.add(bundWall)

    // 3. Row of 4 Backup Diesel Generator Enclosures (48 MW Containerized)
    const genGeo = new THREE.BoxGeometry(7.6, 3.4, 3.6)
    const genMat = new THREE.MeshStandardMaterial({ color: 0x273444, roughness: 0.5, metalness: 0.6 })
    const mufflerGeo = new THREE.CylinderGeometry(0.55, 0.55, 3.2, 16)
    mufflerGeo.rotateZ(Math.PI / 2)
    const exhaustStackGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.8, 10)
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })

    // 4 Generator Containers at Z = 10, 16, 22, 28
    const genZs = [10, 16, 22, 28]
    genZs.forEach((gz, i) => {
      const genGroup = new THREE.Group()
      genGroup.position.set(-44, 0, gz)

      // Sound-attenuated container
      const gen = new THREE.Mesh(genGeo, genMat)
      gen.position.y = 1.7
      gen.castShadow = true
      gen.receiveShadow = true
      gen.userData = { id: `GEN-BACKUP-0${i + 1}`, name: `Backup Diesel Generator 0${i + 1} (48 MW)`, type: 'power' }
      genGroup.add(gen)
      this.interactiveMeshes.push(gen)

      // Roof-Mounted Industrial Exhaust Silencer Muffler
      const muffler = new THREE.Mesh(mufflerGeo, exhaustMat)
      muffler.position.set(0, 3.85, 0)
      genGroup.add(muffler)

      // Vertical exhaust stack with 45-degree rain cap
      const stack = new THREE.Mesh(exhaustStackGeo, exhaustMat)
      stack.position.set(2.2, 4.6, 0)
      genGroup.add(stack)

      // Operational Status Green Running Beacon
      const genBeacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      )
      genBeacon.position.set(-3.7, 3.2, 1.7)
      genGroup.add(genBeacon)

      this.generatorGroups.push(genGroup)
      powerGroup.add(genGroup)
    })

    this.scene.add(powerGroup)
  }

  // ==========================================
  // NETWORK INFRASTRUCTURE (FIBRE ENTRY VAULT & LOOP)
  // ==========================================
  private buildNetworkInfrastructure() {
    const netGroup = new THREE.Group()

    // 1. Fibre Entry Vault (8 × 400G Live Traffic)
    const vaultGeo = new THREE.BoxGeometry(7.0, 3.6, 7.0)
    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x1a2533,
      metalness: 0.7,
      roughness: 0.35,
    })
    const vault = new THREE.Mesh(vaultGeo, vaultMat)
    vault.position.set(28, 1.8, -28)
    vault.castShadow = true
    vault.userData = { id: 'NET-VAULT-01', name: 'Fibre Entry Vault (8 × 400G Live Traffic)', type: 'network' }
    netGroup.add(vault)
    this.interactiveMeshes.push(vault)

    // Illuminated Optical Status Ring on top of Vault
    const ringGeo = new THREE.TorusGeometry(2.2, 0.16, 12, 32)
    ringGeo.rotateX(Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    const statusRing = new THREE.Mesh(ringGeo, ringMat)
    statusRing.position.set(28, 3.65, -28)
    netGroup.add(statusRing)

    this.scene.add(netGroup)
  }

  // ==========================================
  // GLOWING FIBRE CONDUIT LOOP & ANIMATED PACKETS
  // ==========================================
  private buildDataPackets() {
    // Beautiful looping curved spline routes encircling the rear-right of campus (Matching IMAGE 2!)
    const fibreLoopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(28, 2.6, -28), // Vault
      new THREE.Vector3(36, 4.2, -24),
      new THREE.Vector3(40, 4.2, -14),
      new THREE.Vector3(36, 4.2, -4),
      new THREE.Vector3(30, 4.6, -8),
      new THREE.Vector3(22, 4.2, -14), // Hall B
      new THREE.Vector3(8, 4.4, -8),
      new THREE.Vector3(-4, 4.0, -4),  // Hall A
    ])

    const returnCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4, 4.0, -4),
      new THREE.Vector3(6, 4.4, -6),
      new THREE.Vector3(20, 4.2, -12),
      new THREE.Vector3(28, 3.6, -20),
      new THREE.Vector3(28, 2.6, -28),
    ])

    this.packetCurves = [fibreLoopCurve, returnCurve]

    // Physical Glowing Neon Cyan Conduits (Matching the iconic glowing loop in IMAGE 2)
    const conduitMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
    })

    const loopTubeGeo = new THREE.TubeGeometry(fibreLoopCurve, 64, 0.22, 8, false)
    const loopMesh = new THREE.Mesh(loopTubeGeo, conduitMat)
    this.scene.add(loopMesh)

    // Secondary Outer Glow Conduit
    const glowTubeGeo = new THREE.TubeGeometry(fibreLoopCurve, 64, 0.48, 8, false)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.28,
    })
    const glowMesh = new THREE.Mesh(glowTubeGeo, glowMat)
    this.scene.add(glowMesh)

    // Animated Cyan Data Packets
    const packetGeo = new THREE.SphereGeometry(0.38, 8, 8)
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })

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
    dockGroup.position.set(22, 0, 10)

    const dockWallGeo = new THREE.BoxGeometry(17, 5.8, 4.8)
    const dockWallMat = new THREE.MeshStandardMaterial({ color: 0x273549, roughness: 0.5 })
    const dockWall = new THREE.Mesh(dockWallGeo, dockWallMat)
    dockWall.position.y = 2.9
    dockWall.userData = { id: 'dock-bays', name: 'Loading Dock (5 Bays / 2 in use)', type: 'dock' }
    dockGroup.add(dockWall)
    this.interactiveMeshes.push(dockWall)

    // 5 Rollup Bay Shutters
    const shutterGeo = new THREE.BoxGeometry(2.5, 3.4, 0.2)
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x16202c, metalness: 0.85 })
    for (let i = 0; i < 5; i++) {
      const shutter = new THREE.Mesh(shutterGeo, shutterMat)
      shutter.position.set(-6.4 + i * 3.2, 1.9, 2.45)
      dockGroup.add(shutter)
    }

    // Heavy Rubber Dock Bumpers on each bay door
    const bumperGeo = new THREE.BoxGeometry(0.28, 0.65, 0.22)
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    for (let i = 0; i < 5; i++) {
      const bx = -6.4 + i * 3.2
      const bL = new THREE.Mesh(bumperGeo, bumperMat)
      bL.position.set(bx - 1.15, 0.45, 2.55)
      const bR = new THREE.Mesh(bumperGeo, bumperMat)
      bR.position.set(bx + 1.15, 0.45, 2.55)
      dockGroup.add(bL, bR)
    }

    // Overhead Cantilever Loading Dock Weather Canopy
    const dockCanopyGeo = new THREE.BoxGeometry(17.4, 0.25, 2.8)
    const dockCanopy = new THREE.Mesh(
      dockCanopyGeo,
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 })
    )
    dockCanopy.position.set(0, 4.4, 3.6)
    dockGroup.add(dockCanopy)

    // Second Delivery Box Truck (Parked at Bay 4, Matching IMAGE 2)
    const boxTruckGroup = new THREE.Group()
    boxTruckGroup.position.set(3.2, 0, 5.5)
    boxTruckGroup.rotation.y = -Math.PI / 12

    const bCab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.4), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 }))
    bCab.position.set(0, 1.1, 2.2)
    bCab.castShadow = true
    const bBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.6, 5.4), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.3 }))
    bBox.position.set(0, 1.5, -1.4)
    bBox.castShadow = true
    boxTruckGroup.add(bCab, bBox)
    dockGroup.add(boxTruckGroup)

    this.scene.add(dockGroup)

    // 2. Solar Canopy Covered Parking Facility (124 / 200 Occupied, Matching IMAGE 2)
    const parkingGroup = new THREE.Group()
    parkingGroup.position.set(40, 0, 22)

    const parkingPadGeo = new THREE.PlaneGeometry(30, 18)
    const parkingPadMat = new THREE.MeshStandardMaterial({ color: 0x141d28, roughness: 0.8 })
    const parkingPad = new THREE.Mesh(parkingPadGeo, parkingPadMat)
    parkingPad.rotation.x = -Math.PI / 2
    parkingPad.position.y = 0.025
    parkingPad.receiveShadow = true
    parkingPad.userData = { id: 'parking-lot', name: 'Parking Facility (124 / 200 Occupied)', type: 'parking' }
    parkingGroup.add(parkingPad)
    this.interactiveMeshes.push(parkingPad)

    // Painted White Parking Stall Lines (Directly matching IMAGE 2)
    const stallLineGeo = new THREE.PlaneGeometry(0.12, 4.8)
    const stallLineMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    for (let sx = -13; sx <= 13; sx += 2.6) {
      const line1 = new THREE.Mesh(stallLineGeo, stallLineMat)
      line1.rotation.x = -Math.PI / 2
      line1.position.set(sx, 0.035, -4)
      const line2 = new THREE.Mesh(stallLineGeo, stallLineMat)
      line2.rotation.x = -Math.PI / 2
      line2.position.set(sx, 0.035, 4)
      parkingGroup.add(line1, line2)
    }

    // Solar Canopies (Blue Solar Panels on Steel Posts)
    const canopyPostGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6)
    const canopyPostMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
    const solarRoofGeo = new THREE.BoxGeometry(28, 0.16, 6.5)
    const solarRoofMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.85,
      roughness: 0.2,
    })

    const canopy1 = new THREE.Mesh(solarRoofGeo, solarRoofMat)
    canopy1.position.set(0, 3.3, -4)
    canopy1.rotation.x = 0.08
    const canopy2 = new THREE.Mesh(solarRoofGeo, solarRoofMat)
    canopy2.position.set(0, 3.3, 4)
    canopy2.rotation.x = -0.08
    parkingGroup.add(canopy1, canopy2)

    for (let px = -11; px <= 11; px += 11) {
      const p1 = new THREE.Mesh(canopyPostGeo, canopyPostMat)
      p1.position.set(px, 1.7, -4)
      const p2 = new THREE.Mesh(canopyPostGeo, canopyPostMat)
      p2.position.set(px, 1.7, 4)
      parkingGroup.add(p1, p2)
    }

    // Small Parked Employee Vehicles (Cars)
    const carGeo = new THREE.BoxGeometry(1.6, 0.8, 2.8)
    const carColors = [0xf1f5f9, 0x0284c7, 0x334155, 0xef4444, 0x0f172a]
    for (let cx = -11; cx <= 11; cx += 2.8) {
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

    const boothGeo = new THREE.BoxGeometry(4.4, 3.4, 4.4)
    const boothMat = new THREE.MeshStandardMaterial({ color: 0x273549, roughness: 0.4 })
    const booth = new THREE.Mesh(boothGeo, boothMat)
    booth.position.y = 1.7
    booth.userData = { id: 'security-gate', name: 'Security Gate (All clear)', type: 'gate' }
    gateGroup.add(booth)
    this.interactiveMeshes.push(booth)

    // Glass Canopy with Green Status Indicator
    const canopyGeo = new THREE.BoxGeometry(11, 0.35, 6.5)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0c1420, metalness: 0.9 })
    const gateCanopy = new THREE.Mesh(canopyGeo, canopyMat)
    gateCanopy.position.set(0, 3.6, 0)
    gateGroup.add(gateCanopy)

    const greenLed = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x34d399 }))
    greenLed.position.set(0, 3.8, 3.2)
    gateGroup.add(greenLed)

    // Red & White Striped Security Access Boom Barrier Arm
    const boomPost = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xf59e0b }))
    boomPost.position.set(3.5, 0.6, 1.5)
    const boomArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    )
    boomArm.rotation.z = Math.PI / 2
    boomArm.position.set(1.4, 1.1, 1.5)
    gateGroup.add(boomPost, boomArm)

    this.scene.add(gateGroup)

    // 4. Logistics Delivery Semi-Truck (Backed into Bay 2)
    this.truckGroup = new THREE.Group()
    this.truckGroup.position.set(18, 1.2, 17)
    this.truckGroup.rotation.y = -Math.PI / 6

    const cabGeo = new THREE.BoxGeometry(2.4, 2.2, 3.2)
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.6, roughness: 0.3 })
    const cab = new THREE.Mesh(cabGeo, cabMat)
    cab.position.set(0, 0.7, 3.2)
    cab.castShadow = true
    this.truckGroup.add(cab)

    const trailerGeo = new THREE.BoxGeometry(2.6, 2.9, 7.2)
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.3 })
    const trailer = new THREE.Mesh(trailerGeo, trailerMat)
    trailer.position.set(0, 1.1, -1.8)
    trailer.castShadow = true
    trailer.userData = { id: 'VEH-TRUCK-01', name: 'Heavy Delivery Rig 404', type: 'vehicle' }
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
    const particleCount = 340
    const positions = new Float32Array(particleCount * 3)
    const towerXs = [-38, -28, -18]

    for (let i = 0; i < particleCount; i++) {
      const towerX = towerXs[i % 3]
      positions[i * 3 + 0] = towerX + (Math.random() - 0.5) * 2.8
      positions[i * 3 + 1] = 7.5 + Math.random() * 6.5
      positions[i * 3 + 2] = -28 + (Math.random() - 0.5) * 2.8
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // Soft circular radial plume texture for photorealistic water vapor
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
      grad.addColorStop(0.35, 'rgba(224, 242, 254, 0.4)')
      grad.addColorStop(0.8, 'rgba(224, 242, 254, 0.08)')
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 32, 32)
    }
    const vaporTex = new THREE.CanvasTexture(canvas)

    const mat = new THREE.PointsMaterial({
      color: 0xf0f9ff, // soft natural condensing water vapor
      map: vaporTex,
      size: 2.2,
      transparent: true,
      opacity: 0.42,
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
      obj.type === 'rack' ? 14 : 22
    )

    this.callbacks.onSelectObject(obj)
  }

  public clearSelection() {
    this.targetSelectionId = null
    this.selectionRing.visible = false
    this.callbacks.onSelectObject(null)
  }

  public focusCameraOn(targetPos: THREE.Vector3, distance: number = 22) {
    this.isCameraTransitioning = true
    this.camStartPos.copy(this.camera.position)
    this.camStartLook.copy(this.controls.target)

    // Preserve the elevated 3/4 perspective angle
    this.camEndPos.set(
      targetPos.x - distance * 0.72,
      targetPos.y + distance * 0.88,
      targetPos.z + distance * 0.82
    )
    this.camEndLook.copy(targetPos)
    this.camLerpProgress = 0.0
  }

  public transitionTo(pos: THREE.Vector3, target: THREE.Vector3) {
    this.isCameraTransitioning = true
    this.camStartPos.copy(this.camera.position)
    this.camStartLook.copy(this.controls.target)
    this.camEndPos.copy(pos)
    this.camEndLook.copy(target)
    this.camLerpProgress = 0.0
  }

  public jumpToCinematicWaypoint(index: number) {
    if (index < 0 || index >= this.cinematicWaypoints.length) return
    this.cinematicWaypointIndex = index
    this.cinematicTimer = 0
    const wp = this.cinematicWaypoints[index]
    this.transitionTo(wp.pos, wp.target)
  }

  public setCinematicPaused(paused: boolean) {
    this.isCinematicPaused = paused
  }

  // ==========================================
  // WEATHER & DAY/NIGHT CONTROLS
  // ==========================================
  public updateWeather(weather: WeatherType) {
    this.currentWeather = weather

    if (weather === 'monsoon' || weather === 'storm') {
      if (this.rainParticles) this.rainParticles.visible = true
      this.scene.fog = new THREE.FogExp2(0x060f1b, weather === 'storm' ? 0.0045 : 0.0035)
    } else {
      if (this.rainParticles) this.rainParticles.visible = false
      this.scene.fog = new THREE.FogExp2(0x060f1b, 0.0022)
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
      this.scene.background = new THREE.Color(0x1a2636)
      this.scene.fog = new THREE.FogExp2(0x1a2636, 0.002)
      this.ambientLight.color.setHex(0x94b8e6)
      this.ambientLight.intensity = 1.6
      this.hemiLight.color.setHex(0x93c5fd)
      this.hemiLight.groundColor.setHex(0x334e68)
      this.hemiLight.intensity = 1.3
      this.dirLight.color.setHex(0xfffbeb)
      this.dirLight.intensity = 2.5
      this.fillLight.color.setHex(0x7dd3fc)
      this.fillLight.intensity = 1.4
      this.rimLight.color.setHex(0xbae6fd)
      this.rimLight.intensity = 1.1
      this.renderer.toneMappingExposure = 1.25
    } else {
      this.scene.background = new THREE.Color(0x060f1b)
      this.scene.fog = new THREE.FogExp2(0x060f1b, 0.0022)
      this.ambientLight.color.setHex(0x4a6282)
      this.ambientLight.intensity = 1.3
      this.hemiLight.color.setHex(0x60a5fa)
      this.hemiLight.groundColor.setHex(0x111c29)
      this.hemiLight.intensity = 1.1
      this.dirLight.color.setHex(0xf1f5f9)
      this.dirLight.intensity = 2.1
      this.fillLight.color.setHex(0x38bdf8)
      this.fillLight.intensity = 1.1
      this.rimLight.color.setHex(0x22d3ee)
      this.rimLight.intensity = 1.2
      this.renderer.toneMappingExposure = 1.25
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
      this.jumpToCinematicWaypoint(0)
    } else {
      // Return to default elevated 3/4 perspective matching reference
      this.transitionTo(new THREE.Vector3(-6, 44, 48), new THREE.Vector3(5, 2.0, -7))
    }
  }

  // Update dynamic LED colors on racks from telemetry
  public updateRacksTelemetry(racks: ServerRack[]) {
    this.lastTelemetryRacks = racks
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
  // HYBRID 3D ASSET ASYNCHRONOUS UPGRADES
  // ==========================================
  private async loadHybridAssets() {
    try {
      const assetLoader = AssetLoader.getInstance()
      const { serverRack, coolingTower, transformer, generator } = await assetLoader.preloadCampusAssets()

      if (serverRack) {
        this.upgradeServerRacks(serverRack)
      }
      if (coolingTower) {
        this.upgradeCoolingTowers(coolingTower)
      }
      if (transformer) {
        this.upgradeTransformers(transformer)
      }
      if (generator) {
        this.upgradeGenerators(generator)
      }
    } catch (err) {
      console.warn('[CampusScene] Hybrid asset loading completed with procedural fallback:', err)
    }
  }

  private upgradeServerRacks(prototype: THREE.Group) {
    const assetLoader = AssetLoader.getInstance()

    // 1. Upgrade Hall A Racks (NVIDIA H100 Foundation Cluster)
    const hallARowZs = [-24, -18, -12, -6, 0, 6]
    hallARowZs.forEach((rowZ, rowIndex) => {
      for (let col = 0; col < 8; col++) {
        const rackNumber = rowIndex * 8 + col + 1
        const rackId = `RACK-A-${String(rackNumber).padStart(3, '0')}`
        const posX = -22 + col * 3.1
        const posZ = rowZ

        const oldRack = this.rackMeshMap.get(rackId)
        if (oldRack) {
          this.interactiveMeshes = this.interactiveMeshes.filter((m) => m.userData?.id !== rackId)
          this.scene.remove(oldRack)
        }

        const newRack = assetLoader.cloneModel(prototype, true)
        newRack.position.set(posX, 0.15, posZ)

        // Dedicated invisible raycast hit box for interactive selection
        const hitBox = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 3.8, 1.3),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        )
        hitBox.position.set(0, 1.9, 0)
        hitBox.userData = {
          id: rackId,
          name: `${rackId} (NVIDIA H100 SXM5 / 3.2 Tbps NVLink)`,
          type: 'rack',
          hallId: 'hall-a',
        }
        newRack.add(hitBox)
        this.interactiveMeshes.push(hitBox)

        const rackLeds: THREE.MeshBasicMaterial[] = []
        newRack.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.name.includes('Rack_LED') &&
            child.material instanceof THREE.MeshBasicMaterial
          ) {
            rackLeds.push(child.material)
          }
        })

        this.rackLedMaterials.set(rackId, rackLeds)
        this.rackMeshMap.set(rackId, newRack)
        this.scene.add(newRack)
      }
    })

    // 2. Upgrade Hall B Racks (B200 NVL / TPU Inference Cluster)
    const hallBRowZs = [-24, -18, -12, -6, 0, 6]
    hallBRowZs.forEach((rowZ, rowIndex) => {
      for (let col = 0; col < 8; col++) {
        const rackNumber = rowIndex * 8 + col + 1
        const rackId = `RACK-B-${String(rackNumber).padStart(3, '0')}`
        const posX = 12 + col * 3.1
        const posZ = rowZ

        const oldRack = this.rackMeshMap.get(rackId)
        if (oldRack) {
          this.interactiveMeshes = this.interactiveMeshes.filter((m) => m.userData?.id !== rackId)
          this.scene.remove(oldRack)
        }

        const newRack = assetLoader.cloneModel(prototype, true)
        newRack.position.set(posX, 0.15, posZ)

        // Dedicated invisible raycast hit box for interactive selection
        const hitBox = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 3.8, 1.3),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        )
        hitBox.position.set(0, 1.9, 0)
        hitBox.userData = {
          id: rackId,
          name: `${rackId} (B200 NVL / TPU v5p Cluster)`,
          type: 'rack',
          hallId: 'hall-b',
        }
        newRack.add(hitBox)
        this.interactiveMeshes.push(hitBox)

        const rackLeds: THREE.MeshBasicMaterial[] = []
        newRack.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.name.includes('Rack_LED') &&
            child.material instanceof THREE.MeshBasicMaterial
          ) {
            rackLeds.push(child.material)
          }
        })

        this.rackLedMaterials.set(rackId, rackLeds)
        this.rackMeshMap.set(rackId, newRack)
        this.scene.add(newRack)
      }
    })

    // 3. Re-apply live telemetry colors to upgraded racks
    if (this.lastTelemetryRacks.length > 0) {
      this.updateRacksTelemetry(this.lastTelemetryRacks)
    }
  }

  private upgradeCoolingTowers(prototype: THREE.Group) {
    if (!this.coolingParentGroup) return
    const assetLoader = AssetLoader.getInstance()
    const towerXs = [-38, -28, -18]

    this.coolingTowerGroups.forEach((g) => this.coolingParentGroup?.remove(g))
    this.coolingTowerGroups = []
    this.fans = []

    towerXs.forEach((tx, idx) => {
      const towerId = `COOL-TWR-0${idx + 1}`
      this.interactiveMeshes = this.interactiveMeshes.filter((m) => m.userData?.id !== towerId)

      const newTower = assetLoader.cloneModel(prototype, false)
      newTower.position.set(tx, 0, -28)

      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(8.6, 8.8, 8.6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      )
      hitBox.position.set(0, 4.4, 0)
      hitBox.userData = {
        id: towerId,
        name: `Cooling Tower Bank ${idx + 1} (55 MW)`,
        type: 'cooling',
      }
      newTower.add(hitBox)
      this.interactiveMeshes.push(hitBox)

      const fanRotor = newTower.getObjectByName('Tower_Fan_Rotor') as THREE.Group
      if (fanRotor) {
        this.fans.push(fanRotor)
      }

      this.coolingTowerGroups.push(newTower)
      this.coolingParentGroup?.add(newTower)
    })
  }

  private upgradeTransformers(prototype: THREE.Group) {
    if (!this.powerParentGroup) return
    const assetLoader = AssetLoader.getInstance()
    this.transformerGroups.forEach((g) => this.powerParentGroup?.remove(g))
    this.transformerGroups = []

    const xformerXs = [-46, -42, -38]
    xformerXs.forEach((tx, idx) => {
      const xformerId = idx === 0 ? 'SUBSTATION-MAIN' : `XFORMER-0${idx + 1}`
      this.interactiveMeshes = this.interactiveMeshes.filter((m) => m.userData?.id !== xformerId)

      const newXformer = assetLoader.cloneModel(prototype, false)
      newXformer.position.set(tx, 0, 5)

      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 4.4, 3.2),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      )
      hitBox.position.set(0, 2.2, 0)
      hitBox.userData = {
        id: xformerId,
        name: idx === 0 ? 'Power Substation (132 MW Grid-Tied)' : `Aux Step-Down Transformer 0${idx + 1}`,
        type: 'power',
      }
      newXformer.add(hitBox)
      this.interactiveMeshes.push(hitBox)

      this.transformerGroups.push(newXformer)
      this.powerParentGroup?.add(newXformer)
    })
  }

  private upgradeGenerators(prototype: THREE.Group) {
    if (!this.powerParentGroup) return
    const assetLoader = AssetLoader.getInstance()
    this.generatorGroups.forEach((g) => this.powerParentGroup?.remove(g))
    this.generatorGroups = []

    const genZs = [10, 16, 22, 28]
    genZs.forEach((gz, idx) => {
      const genId = `GEN-BACKUP-0${idx + 1}`
      this.interactiveMeshes = this.interactiveMeshes.filter((m) => m.userData?.id !== genId)

      const newGen = assetLoader.cloneModel(prototype, false)
      newGen.position.set(-44, 0, gz)

      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(7.8, 4.6, 3.8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      )
      hitBox.position.set(0, 2.3, 0)
      hitBox.userData = {
        id: genId,
        name: `Backup Diesel Generator 0${idx + 1} (48 MW)`,
        type: 'power',
      }
      newGen.add(hitBox)
      this.interactiveMeshes.push(hitBox)

      this.generatorGroups.push(newGen)
      this.powerParentGroup?.add(newGen)
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
      if (!this.isCinematicPaused) {
        this.cinematicTimer += delta
        const currentWp = this.cinematicWaypoints[this.cinematicWaypointIndex]

        if (this.cinematicTimer >= currentWp.duration) {
          const nextIndex = (this.cinematicWaypointIndex + 1) % this.cinematicWaypoints.length
          this.jumpToCinematicWaypoint(nextIndex)
          if (this.callbacks.onCinematicWaypointChange) {
            this.callbacks.onCinematicWaypointChange(nextIndex)
          }
        }
      }
      this.camera.position.x += Math.sin(elapsedTime * 0.15) * 0.02
      this.camera.position.z += Math.cos(elapsedTime * 0.15) * 0.02
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
