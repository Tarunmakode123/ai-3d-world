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

  // Lighting
  private ambientLight: THREE.AmbientLight
  private dirLight: THREE.DirectionalLight
  private hemiLight: THREE.HemisphereLight
  private pointLights: THREE.PointLight[] = []

  // Interactive Objects Registry
  private interactiveMeshes: THREE.Object3D[] = []
  private rackMeshMap: Map<string, THREE.Group> = new Map()
  private rackLedMaterials: Map<string, THREE.MeshBasicMaterial[]> = new Map()

  // Moving Vehicles & Parts
  private fans: THREE.Group[] = []
  private truckGroup: THREE.Group = new THREE.Group()
  private serviceCartGroup: THREE.Group = new THREE.Group()
  private cartToolLaser: THREE.Mesh | null = null

  // Animated Data Packets
  private packetMeshes: THREE.Mesh[] = []
  private packetCurves: THREE.CatmullRomCurve3[] = []
  private packetProgress: number[] = []

  // Animated Cooling Vapor Particles
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

  // Cinematic Tour State
  private isCinematic: boolean = false
  private cinematicWaypointIndex: number = 0
  private cinematicTimer: number = 0
  private cinematicWaypoints = [
    { pos: new THREE.Vector3(0, 48, 55), target: new THREE.Vector3(0, 0, 0), duration: 8 },
    { pos: new THREE.Vector3(-22, 14, 24), target: new THREE.Vector3(-26, 2, 6), duration: 7 },
    { pos: new THREE.Vector3(22, 14, 24), target: new THREE.Vector3(26, 2, 6), duration: 7 },
    { pos: new THREE.Vector3(-18, 12, -14), target: new THREE.Vector3(-20, 3, -26), duration: 6 },
    { pos: new THREE.Vector3(24, 12, -12), target: new THREE.Vector3(28, 2, -24), duration: 6 },
    { pos: new THREE.Vector3(0, 10, -6), target: new THREE.Vector3(0, 2, -20), duration: 6 },
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
    this.scene.background = new THREE.Color(0x07111f)
    this.scene.fog = new THREE.FogExp2(0x07111f, 0.009)

    // 2. Camera (elevated 3/4 isometric perspective)
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 300)
    this.camera.position.set(0, 48, 55)

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent going below ground
    this.controls.minDistance = 6
    this.controls.maxDistance = 120
    this.controls.target.set(0, 0, 0)

    // 5. Lighting
    this.ambientLight = new THREE.AmbientLight(0x16243b, 1.2)
    this.scene.add(this.ambientLight)

    this.hemiLight = new THREE.HemisphereLight(0x22d3ee, 0x07111f, 0.6)
    this.scene.add(this.hemiLight)

    this.dirLight = new THREE.DirectionalLight(0x93c5fd, 1.4)
    this.dirLight.position.set(35, 55, 35)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width = 2048
    this.dirLight.shadow.mapSize.height = 2048
    this.dirLight.shadow.camera.near = 10
    this.dirLight.shadow.camera.far = 150
    const shadowD = 60
    this.dirLight.shadow.camera.left = -shadowD
    this.dirLight.shadow.camera.right = shadowD
    this.dirLight.shadow.camera.top = shadowD
    this.dirLight.shadow.camera.bottom = -shadowD
    this.dirLight.shadow.bias = -0.0005
    this.scene.add(this.dirLight)

    // 6. Build Scene Geometry
    this.buildCampusEnvironment()
    this.buildDataHalls()
    this.buildCoolingInfrastructure()
    this.buildPowerInfrastructure()
    this.buildNetworkInfrastructure()
    this.buildLogisticsAndVehicles()
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
  // CAMPUS GROUND, ROADS & LANDSCAPING
  // ==========================================
  private buildCampusEnvironment() {
    // Campus Base Ground
    const groundGeo = new THREE.PlaneGeometry(130, 110)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x091424,
      roughness: 0.85,
      metalness: 0.2,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Outer Perimeter Berm / Boundary Frame
    const borderGeo = new THREE.BoxGeometry(134, 1.2, 114)
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x050c17,
      roughness: 0.9,
    })
    const border = new THREE.Mesh(borderGeo, borderMat)
    border.position.set(0, -0.6, 0)
    this.scene.add(border)

    // Road Network (Main North-South Spine & Cross Arteries)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0a1626,
      roughness: 0.9,
    })
    const roadLineMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.55,
    })

    // Central Access Road (Z: 48 to Z: -8)
    const mainRoadGeo = new THREE.PlaneGeometry(8, 56)
    const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat)
    mainRoad.rotation.x = -Math.PI / 2
    mainRoad.position.set(0, 0.02, 20)
    mainRoad.receiveShadow = true
    this.scene.add(mainRoad)

    // Yellow Dashed Centerline on Main Road
    for (let z = -5; z <= 44; z += 4) {
      const dashGeo = new THREE.PlaneGeometry(0.35, 2.2)
      const dash = new THREE.Mesh(dashGeo, roadLineMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(0, 0.03, z)
      this.scene.add(dash)
    }

    // East-West Arterial Road (connecting Halls and Power/Cooling)
    const crossRoadGeo = new THREE.PlaneGeometry(100, 7)
    const crossRoad = new THREE.Mesh(crossRoadGeo, roadMat)
    crossRoad.rotation.x = -Math.PI / 2
    crossRoad.position.set(0, 0.02, -10)
    crossRoad.receiveShadow = true
    this.scene.add(crossRoad)

    // Security Gatehouse & Entrance at Z: 46
    const gateHouseGroup = new THREE.Group()
    gateHouseGroup.position.set(6, 0, 44)

    const gateBuildingGeo = new THREE.BoxGeometry(4.5, 3.2, 5)
    const gateBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x0e1c2f,
      roughness: 0.5,
      metalness: 0.5,
    })
    const gateBuilding = new THREE.Mesh(gateBuildingGeo, gateBuildingMat)
    gateBuilding.position.y = 1.6
    gateBuilding.castShadow = true
    gateHouseGroup.add(gateBuilding)

    // Gatehouse Glass Windows
    const gateGlassGeo = new THREE.BoxGeometry(4.6, 1.2, 3)
    const gateGlassMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
    })
    const gateGlass = new THREE.Mesh(gateGlassGeo, gateGlassMat)
    gateGlass.position.y = 1.8
    gateHouseGroup.add(gateGlass)

    // Barrier Arm (Boom Gate)
    const barrierPostGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12)
    const barrierPostMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
    const barrierPost = new THREE.Mesh(barrierPostGeo, barrierPostMat)
    barrierPost.position.set(-6, 0.6, 44)
    this.scene.add(barrierPost)

    const barrierArmGeo = new THREE.BoxGeometry(5.5, 0.15, 0.15)
    const barrierArm = new THREE.Mesh(barrierArmGeo, barrierPostMat)
    barrierArm.position.set(-3.2, 1.1, 44)
    this.scene.add(barrierArm)

    this.scene.add(gateHouseGroup)

    // Cyber Perimeter Runway Lights / Bollards along roads
    const bollardGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.8, 8)
    const bollardLightGeo = new THREE.SphereGeometry(0.12, 8, 8)
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    const bollardGlowMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee })

    for (let z = 44; z >= -6; z -= 8) {
      // Left side bollard
      const b1 = new THREE.Mesh(bollardGeo, bollardMat)
      b1.position.set(-4.5, 0.4, z)
      const g1 = new THREE.Mesh(bollardLightGeo, bollardGlowMat)
      g1.position.set(-4.5, 0.85, z)
      this.scene.add(b1, g1)

      // Right side bollard
      const b2 = new THREE.Mesh(bollardGeo, bollardMat)
      b2.position.set(4.5, 0.4, z)
      const g2 = new THREE.Mesh(bollardLightGeo, bollardGlowMat)
      g2.position.set(4.5, 0.85, z)
      this.scene.add(b2, g2)
    }

    // Low-poly Cyber Trees / Geometric foliage around perimeter
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.8, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    const foliageGeo = new THREE.ConeGeometry(1.4, 3.2, 6)
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x0d3b4c,
      roughness: 0.7,
      metalness: 0.2,
      flatShading: true,
    })

    const treePositions = [
      [-48, 0, 36], [-42, 0, 42], [-52, 0, 24], [-54, 0, 8],
      [48, 0, 36], [42, 0, 42], [52, 0, 24], [54, 0, 8],
      [-52, 0, -38], [-44, 0, -42], [52, 0, -38], [44, 0, -42],
    ]

    treePositions.forEach(([x, y, z]) => {
      const treeGroup = new THREE.Group()
      treeGroup.position.set(x, y, z)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 0.9
      const foliage = new THREE.Mesh(foliageGeo, foliageMat)
      foliage.position.y = 2.8
      foliage.castShadow = true
      treeGroup.add(trunk, foliage)
      this.scene.add(treeGroup)
    })
  }

  // ==========================================
  // DATA HALLS A & B WITH CUTAWAY ROOF & RACKS
  // ==========================================
  private buildDataHalls() {
    const hallsConfig = [
      { id: 'hall-a', name: 'Data Hall Alpha — Foundation Training', center: [-26, 0, 6], labelColor: 0x22d3ee },
      { id: 'hall-b', name: 'Data Hall Beta — Inference & MoE Cluster', center: [26, 0, 6], labelColor: 0x3b82f6 },
    ]

    hallsConfig.forEach((hall) => {
      const hallGroup = new THREE.Group()
      hallGroup.position.set(hall.center[0], 0, hall.center[2])

      // 1. Concrete Foundation Floor
      const foundationGeo = new THREE.BoxGeometry(22, 0.5, 22)
      const foundationMat = new THREE.MeshStandardMaterial({
        color: 0x0a1628,
        roughness: 0.7,
        metalness: 0.3,
      })
      const foundation = new THREE.Mesh(foundationGeo, foundationMat)
      foundation.position.y = 0.25
      foundation.receiveShadow = true
      hallGroup.add(foundation)

      // 2. Raised Server Room Floor Tile Grid (High tech perforated tiles)
      const tileFloorGeo = new THREE.PlaneGeometry(20, 20)
      const tileFloorMat = new THREE.MeshStandardMaterial({
        color: 0x0d1f36,
        roughness: 0.4,
        metalness: 0.6,
      })
      const tileFloor = new THREE.Mesh(tileFloorGeo, tileFloorMat)
      tileFloor.rotation.x = -Math.PI / 2
      tileFloor.position.y = 0.52
      tileFloor.receiveShadow = true
      hallGroup.add(tileFloor)

      // 3. Structural Outer Columns & Perimeter Half-Walls (Cutaway Design)
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x0f223a,
        roughness: 0.5,
        metalness: 0.5,
      })

      // Corner pillars
      const pillarGeo = new THREE.BoxGeometry(1.2, 7.5, 1.2)
      const pPositions = [
        [-10.4, 3.75, -10.4],
        [10.4, 3.75, -10.4],
        [-10.4, 3.75, 10.4],
        [10.4, 3.75, 10.4],
      ]
      pPositions.forEach(([px, py, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, wallMat)
        pillar.position.set(px, py, pz)
        pillar.castShadow = true
        hallGroup.add(pillar)
      })

      // Low perimeter half-walls (height: 2.2) so visitors can peer directly into server rows
      const backWallGeo = new THREE.BoxGeometry(21.6, 2.2, 0.8)
      const backWall = new THREE.Mesh(backWallGeo, wallMat)
      backWall.position.set(0, 1.4, -10.4)
      hallGroup.add(backWall)

      const sideWallGeo = new THREE.BoxGeometry(0.8, 2.2, 20)
      const leftWall = new THREE.Mesh(sideWallGeo, wallMat)
      leftWall.position.set(-10.4, 1.4, 0)
      const rightWall = new THREE.Mesh(sideWallGeo, wallMat)
      rightWall.position.set(10.4, 1.4, 0)
      hallGroup.add(leftWall, rightWall)

      // 4. Transparent Tinted Cutaway Glass Roof Truss
      const trussGeo = new THREE.BoxGeometry(21.6, 0.3, 0.5)
      const trussMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.8 })
      for (let tz = -8; tz <= 8; tz += 4) {
        const truss = new THREE.Mesh(trussGeo, trussMat)
        truss.position.set(0, 7.2, tz)
        hallGroup.add(truss)
      }

      // Glass Roof Panel (semi-transparent with cyan edge)
      const glassRoofGeo = new THREE.PlaneGeometry(21.2, 21.2)
      const glassRoofMat = new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.18,
        roughness: 0.1,
        metalness: 0.85,
        transmission: 0.7,
        ior: 1.45,
      })
      const glassRoof = new THREE.Mesh(glassRoofGeo, glassRoofMat)
      glassRoof.rotation.x = -Math.PI / 2
      glassRoof.position.y = 7.35
      hallGroup.add(glassRoof)

      // 5. Overhead Yellow / Cyan Cable Trays
      const trayGeo = new THREE.BoxGeometry(16, 0.15, 0.6)
      const trayMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.4,
        metalness: 0.7,
      })
      for (let r = 0; r < 4; r++) {
        const tray = new THREE.Mesh(trayGeo, trayMat)
        tray.position.set(0, 4.4, -5.5 + r * 4.0)
        hallGroup.add(tray)
      }

      // Interior High-Intensity Accent Downlights
      const hallInteriorLight = new THREE.PointLight(hall.labelColor, 1.8, 24)
      hallInteriorLight.position.set(0, 6.2, 0)
      hallGroup.add(hallInteriorLight)
      this.pointLights.push(hallInteriorLight)

      // Register Hall as selectable object
      foundation.userData = {
        id: hall.id,
        name: hall.name,
        type: 'hall',
      }
      this.interactiveMeshes.push(foundation)

      this.scene.add(hallGroup)
    })

    // Now populate the 48 Detailed Server Racks inside Hall A and Hall B
    this.buildServerRacks()
  }

  // ==========================================
  // SERVER RACKS (48 UNITS WITH LEDS & LABELS)
  // ==========================================
  private buildServerRacks() {
    // Rack Cabinet Base Geometry
    const rackCabinetGeo = new THREE.BoxGeometry(1.8, 3.2, 0.95)
    const rackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x09121e,
      roughness: 0.35,
      metalness: 0.85,
    })

    // Server Unit Blade Faceplate Geometry
    const bladeGeo = new THREE.BoxGeometry(1.68, 0.32, 0.04)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x111e2e,
      roughness: 0.5,
      metalness: 0.7,
    })

    // LED Status Dot Geometry
    const ledGeo = new THREE.SphereGeometry(0.04, 6, 6)

    // Build Racks
    // 24 racks in Hall A (row: 0..3, col: 0..5)
    // 24 racks in Hall B (row: 0..3, col: 0..5)
    const halls = [
      { prefix: 'A', hallId: 'hall-a' as const, originX: -32, originZ: 0 },
      { prefix: 'B', hallId: 'hall-b' as const, originX: 20, originZ: 0 },
    ]

    halls.forEach((h) => {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          const index = row * 6 + col + 1
          const rackId = `RACK-${h.prefix}-${String(index).padStart(3, '0')}`
          const posX = h.originX + col * 2.5
          const posZ = h.originZ + row * 4.0

          const rackGroup = new THREE.Group()
          rackGroup.position.set(posX, 1.6 + 0.5, posZ) // 0.5 is raised floor height

          // Main Chassis Cabinet
          const cabinet = new THREE.Mesh(rackCabinetGeo, rackFrameMat)
          cabinet.castShadow = true
          cabinet.receiveShadow = true
          cabinet.userData = {
            id: rackId,
            name: `${rackId} (GPU Cluster Node)`,
            type: 'rack',
            hallId: h.hallId,
          }
          rackGroup.add(cabinet)
          this.interactiveMeshes.push(cabinet)

          // Front Server Blades & Status LEDs
          const rackLeds: THREE.MeshBasicMaterial[] = []
          for (let b = 0; b < 7; b++) {
            const blade = new THREE.Mesh(bladeGeo, bladeMat)
            blade.position.set(0, -1.1 + b * 0.38, 0.48)
            rackGroup.add(blade)

            // 4 LEDs per blade
            for (let l = 0; l < 4; l++) {
              const ledMat = new THREE.MeshBasicMaterial({
                color: (b + l) % 3 === 0 ? 0x22d3ee : 0x34d399,
              })
              const led = new THREE.Mesh(ledGeo, ledMat)
              led.position.set(-0.6 + l * 0.4, -1.1 + b * 0.38, 0.51)
              rackGroup.add(led)
              rackLeds.push(ledMat)
            }
          }

          // Top Status Indicator Beacon
          const beaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8)
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0x34d399 })
          const beacon = new THREE.Mesh(beaconGeo, beaconMat)
          beacon.position.set(0, 1.7, 0)
          rackGroup.add(beacon)
          rackLeds.push(beaconMat)

          this.rackLedMaterials.set(rackId, rackLeds)
          this.rackMeshMap.set(rackId, rackGroup)
          this.scene.add(rackGroup)
        }
      }
    })

    // Build Hot/Cold Aisle Heat Overlays
    this.buildHeatOverlay()
  }

  // ==========================================
  // HEAT OVERLAY MESHES
  // ==========================================
  private buildHeatOverlay() {
    this.heatOverlayGroup.visible = false
    const heatPlaneGeo = new THREE.PlaneGeometry(16, 2.2)

    // Red/Orange Heat Shader or Emissive Plane for Hot Aisles
    const hotAisleMat = new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })

    // Cold Aisle Blue Plane
    const coldAisleMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    })

    // Add in Hall A
    for (let r = 0; r < 4; r++) {
      const plane = new THREE.Mesh(heatPlaneGeo, r % 2 === 0 ? hotAisleMat : coldAisleMat)
      plane.rotation.x = -Math.PI / 2
      plane.position.set(-26, 3.8, 0 + r * 4.0)
      this.heatOverlayGroup.add(plane)
    }

    // Add in Hall B
    for (let r = 0; r < 4; r++) {
      const plane = new THREE.Mesh(heatPlaneGeo, r % 2 === 0 ? hotAisleMat : coldAisleMat)
      plane.rotation.x = -Math.PI / 2
      plane.position.set(26, 3.8, 0 + r * 4.0)
      this.heatOverlayGroup.add(plane)
    }

    this.scene.add(this.heatOverlayGroup)
  }

  // ==========================================
  // COOLING INFRASTRUCTURE ZONE (WEST)
  // ==========================================
  private buildCoolingInfrastructure() {
    const coolingZoneGroup = new THREE.Group()

    // 1. Concrete Equipment Pad
    const padGeo = new THREE.BoxGeometry(26, 0.4, 20)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0a1626,
      roughness: 0.8,
      metalness: 0.2,
    })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(-20, 0.2, -26)
    pad.receiveShadow = true
    coolingZoneGroup.add(pad)

    // 2. 3 Industrial Cooling Towers with Rotating Fans
    const towerPositions = [
      { id: 'COOL-TWR-01', name: 'Cooling Tower Alpha', pos: [-28, 0, -28] },
      { id: 'COOL-TWR-02', name: 'Cooling Tower Beta', pos: [-20, 0, -28] },
      { id: 'COOL-TWR-03', name: 'Cooling Tower Gamma', pos: [-12, 0, -28] },
    ]

    const towerBodyGeo = new THREE.CylinderGeometry(2.8, 3.4, 5.5, 16)
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x12243d,
      roughness: 0.4,
      metalness: 0.6,
    })

    const shroudGeo = new THREE.CylinderGeometry(2.5, 2.7, 1.2, 16)
    const shroudMat = new THREE.MeshStandardMaterial({ color: 0x0d1a2d, metalness: 0.8 })

    const fanBladeGeo = new THREE.BoxGeometry(2.2, 0.08, 0.45)
    const fanBladeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.9 })

    towerPositions.forEach((tower) => {
      const tGroup = new THREE.Group()
      tGroup.position.set(tower.pos[0], 0, tower.pos[2])

      const body = new THREE.Mesh(towerBodyGeo, towerMat)
      body.position.y = 2.75
      body.castShadow = true
      body.receiveShadow = true
      body.userData = { id: tower.id, name: tower.name, type: 'cooling' }
      tGroup.add(body)
      this.interactiveMeshes.push(body)

      const shroud = new THREE.Mesh(shroudGeo, shroudMat)
      shroud.position.y = 5.8
      tGroup.add(shroud)

      // 4-blade Rotating Fan
      const fanGroup = new THREE.Group()
      fanGroup.position.y = 5.9
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(fanBladeGeo, fanBladeMat)
        blade.rotation.y = (b * Math.PI) / 2
        fanGroup.add(blade)
      }
      tGroup.add(fanGroup)
      this.fans.push(fanGroup)

      coolingZoneGroup.add(tGroup)
    })

    // 3. Liquid Chillers (Rectangular units with compressor pumps)
    const chillerPositions = [
      { id: 'CHILLER-01', name: 'Liquid Chiller Unit 101', pos: [-24, 0, -19] },
      { id: 'CHILLER-02', name: 'Liquid Chiller Unit 102', pos: [-14, 0, -19] },
    ]

    const chillerGeo = new THREE.BoxGeometry(6.5, 2.8, 3.2)
    const chillerMat = new THREE.MeshStandardMaterial({
      color: 0x1e3654,
      roughness: 0.4,
      metalness: 0.7,
    })

    chillerPositions.forEach((chiller) => {
      const cGroup = new THREE.Group()
      cGroup.position.set(chiller.pos[0], 0, chiller.pos[2])

      const mesh = new THREE.Mesh(chillerGeo, chillerMat)
      mesh.position.y = 1.4
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { id: chiller.id, name: chiller.name, type: 'cooling' }
      cGroup.add(mesh)
      this.interactiveMeshes.push(mesh)

      // Dual Compressor Cylinders on top
      const compGeo = new THREE.CylinderGeometry(0.7, 0.7, 4.8, 12)
      compGeo.rotateZ(Math.PI / 2)
      const compMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.85 })
      const comp1 = new THREE.Mesh(compGeo, compMat)
      comp1.position.set(0, 2.5, -0.6)
      const comp2 = new THREE.Mesh(compGeo, compMat)
      comp2.position.set(0, 2.5, 0.6)
      cGroup.add(comp1, comp2)

      coolingZoneGroup.add(cGroup)
    })

    // 4. Heavy Blue / Cyan Insulated Chilled Water Pipes running toward Hall A and Hall B
    const pipeMatSupply = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 })
    const pipeMatReturn = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.8 })

    // Elevated Pipe Bridge to Hall A
    const pipeGeoA = new THREE.CylinderGeometry(0.35, 0.35, 28, 12)
    pipeGeoA.rotateX(Math.PI / 2)
    const pipeA1 = new THREE.Mesh(pipeGeoA, pipeMatSupply)
    pipeA1.position.set(-24, 2.6, -5)
    const pipeA2 = new THREE.Mesh(pipeGeoA, pipeMatReturn)
    pipeA2.position.set(-23.2, 2.6, -5)
    coolingZoneGroup.add(pipeA1, pipeA2)

    this.scene.add(coolingZoneGroup)
  }

  // ==========================================
  // POWER INFRASTRUCTURE ZONE (EAST)
  // ==========================================
  private buildPowerInfrastructure() {
    const powerZoneGroup = new THREE.Group()

    // Concrete Pad
    const padGeo = new THREE.BoxGeometry(28, 0.4, 28)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.8 })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(28, 0.2, -22)
    pad.receiveShadow = true
    powerZoneGroup.add(pad)

    // 1. High-Voltage Substation Gantry (X: 28, Z: -28)
    const substationGroup = new THREE.Group()
    substationGroup.position.set(28, 0, -28)

    const gantryFrameGeo = new THREE.BoxGeometry(10, 6, 0.4)
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    const gantry = new THREE.Mesh(gantryFrameGeo, gantryMat)
    gantry.position.y = 3
    substationGroup.add(gantry)

    // Ceramic Insulator Disks
    const insulatorGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.8, 8)
    const insulatorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 })
    for (let i = -3.5; i <= 3.5; i += 2.4) {
      const ins = new THREE.Mesh(insulatorGeo, insulatorMat)
      ins.position.set(i, 4.5, 0)
      substationGroup.add(ins)
    }

    const subBase = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 6), gantryMat)
    subBase.position.y = 0.5
    subBase.userData = { id: 'SUBSTATION-MAIN', name: '132kV Main Interconnect Substation', type: 'power' }
    substationGroup.add(subBase)
    this.interactiveMeshes.push(subBase)
    powerZoneGroup.add(substationGroup)

    // 2. Step-Down Transformers
    const xfrmPositions = [
      { id: 'XFRM-01', name: 'Transformer Bank 01', pos: [18, 0, -26] },
      { id: 'XFRM-02', name: 'Transformer Bank 02', pos: [18, 0, -20] },
    ]
    const xfrmTankGeo = new THREE.BoxGeometry(4.2, 3.2, 3.2)
    const xfrmMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 })

    xfrmPositions.forEach((xfrm) => {
      const xGroup = new THREE.Group()
      xGroup.position.set(xfrm.pos[0], 0, xfrm.pos[2])

      const tank = new THREE.Mesh(xfrmTankGeo, xfrmMat)
      tank.position.y = 1.6
      tank.castShadow = true
      tank.userData = { id: xfrm.id, name: xfrm.name, type: 'power' }
      xGroup.add(tank)
      this.interactiveMeshes.push(tank)

      // Radiator Fins on sides
      const finGeo = new THREE.BoxGeometry(0.1, 2.4, 2.8)
      const finMat = new THREE.MeshStandardMaterial({ color: 0x475569 })
      for (let f = -1.8; f <= 1.8; f += 0.5) {
        const fin = new THREE.Mesh(finGeo, finMat)
        fin.position.set(f, 1.6, 1.7)
        xGroup.add(fin)
      }
      powerZoneGroup.add(xGroup)
    })

    // 3. Backup Diesel Generators
    const genPositions = [
      { id: 'GEN-BACKUP-01', name: 'Backup Diesel Generator 01', pos: [37, 0, -12] },
      { id: 'GEN-BACKUP-02', name: 'Backup Diesel Generator 02', pos: [37, 0, -4] },
    ]
    const genGeo = new THREE.BoxGeometry(7.2, 3.4, 3.4)
    const genMat = new THREE.MeshStandardMaterial({ color: 0x1c2b3e, roughness: 0.5, metalness: 0.7 })

    genPositions.forEach((gen) => {
      const gGroup = new THREE.Group()
      gGroup.position.set(gen.pos[0], 0, gen.pos[2])

      const mesh = new THREE.Mesh(genGeo, genMat)
      mesh.position.y = 1.7
      mesh.castShadow = true
      mesh.userData = { id: gen.id, name: gen.name, type: 'power' }
      gGroup.add(mesh)
      this.interactiveMeshes.push(mesh)

      // Vertical Exhaust Stack Silencer
      const exhaustGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.2, 10)
      const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat)
      exhaust.position.set(2.4, 4.2, 0)
      gGroup.add(exhaust)

      powerZoneGroup.add(gGroup)
    })

    // 4. Cylindrical Bulk Fuel Storage Tanks
    const fuelGeo = new THREE.CylinderGeometry(1.8, 1.8, 6.5, 16)
    fuelGeo.rotateZ(Math.PI / 2)
    const fuelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
    const fuelTank1 = new THREE.Mesh(fuelGeo, fuelMat)
    fuelTank1.position.set(38, 2.2, 4)
    powerZoneGroup.add(fuelTank1)

    this.scene.add(powerZoneGroup)
  }

  // ==========================================
  // NETWORK INFRASTRUCTURE (CENTER NORTH)
  // ==========================================
  private buildNetworkInfrastructure() {
    const netGroup = new THREE.Group()

    // 1. Fiber Entry Vault & Meet-Me-Room (MMR)
    const vaultGeo = new THREE.BoxGeometry(6.2, 2.4, 6.2)
    const vaultMat = new THREE.MeshStandardMaterial({ color: 0x0b1a2e, metalness: 0.8, roughness: 0.3 })
    const vault = new THREE.Mesh(vaultGeo, vaultMat)
    vault.position.set(0, 1.2, -26)
    vault.castShadow = true
    vault.userData = { id: 'NET-VAULT-01', name: 'Carrier Neutral Fibre Vault & MMR', type: 'network' }
    netGroup.add(vault)
    this.interactiveMeshes.push(vault)

    // Optical Distribution Spine Switch
    const spineGeo = new THREE.BoxGeometry(4.8, 3.6, 4.8)
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x091424, metalness: 0.9 })
    const spine = new THREE.Mesh(spineGeo, spineMat)
    spine.position.set(0, 1.8, -14)
    spine.castShadow = true
    spine.userData = { id: 'NET-SPINE-01', name: 'Optical Spine Hub', type: 'network' }
    netGroup.add(spine)
    this.interactiveMeshes.push(spine)

    // 2. Parabolic Satellite Uplink Dish
    const dishPedestal = new THREE.CylinderGeometry(0.3, 0.45, 3.2, 12)
    const dishPedestalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
    const pedestal = new THREE.Mesh(dishPedestal, dishPedestalMat)
    pedestal.position.set(-2, 1.6, -36)
    netGroup.add(pedestal)

    // Parabolic Dish Bowl
    const dishBowlGeo = new THREE.SphereGeometry(2.4, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.42)
    const dishBowlMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.DoubleSide,
    })
    const dishBowl = new THREE.Mesh(dishBowlGeo, dishBowlMat)
    dishBowl.position.set(-2, 3.6, -36)
    dishBowl.rotation.x = Math.PI / 4
    dishBowl.userData = { id: 'SAT-UPLINK-01', name: 'LEO Constellation Satellite Uplink', type: 'network' }
    netGroup.add(dishBowl)
    this.interactiveMeshes.push(dishBowl)

    // Feed Horn Transmitter
    const hornGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8)
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 0.6 })
    const horn = new THREE.Mesh(hornGeo, hornMat)
    horn.position.set(-2, 4.3, -35.2)
    horn.rotation.x = -Math.PI / 4
    netGroup.add(horn)

    this.scene.add(netGroup)
  }

  // ==========================================
  // DATA PACKET PATHS & ANIMATED PARTICLES
  // ==========================================
  private buildDataPackets() {
    // Define 4 smooth curved spline routes connecting Network Hub to Hall A and Hall B
    const curveRoutes = [
      // Route 1: Spine -> Hall A Front Aisle
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.8, -14),
        new THREE.Vector3(-10, 4.2, -6),
        new THREE.Vector3(-22, 4.2, 0),
        new THREE.Vector3(-26, 3.2, 6),
      ]),
      // Route 2: Spine -> Hall A Deep Cluster
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.8, -14),
        new THREE.Vector3(-14, 4.5, -2),
        new THREE.Vector3(-28, 4.5, 8),
        new THREE.Vector3(-32, 2.5, 12),
      ]),
      // Route 3: Spine -> Hall B Front Aisle
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.8, -14),
        new THREE.Vector3(10, 4.2, -6),
        new THREE.Vector3(22, 4.2, 0),
        new THREE.Vector3(26, 3.2, 6),
      ]),
      // Route 4: Spine -> Hall B Deep Cluster
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.8, -14),
        new THREE.Vector3(14, 4.5, -2),
        new THREE.Vector3(28, 4.5, 8),
        new THREE.Vector3(32, 2.5, 12),
      ]),
    ]

    this.packetCurves = curveRoutes

    // Render the physical glowing glass fiber conduits along these curves
    const conduitMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.28,
    })

    curveRoutes.forEach((curve) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.08, 8, false)
      const tubeMesh = new THREE.Mesh(tubeGeo, conduitMat)
      this.scene.add(tubeMesh)
    })

    // Glowing cyan Data Packets (spheres)
    const packetGeo = new THREE.SphereGeometry(0.24, 8, 8)
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee })

    for (let i = 0; i < 16; i++) {
      const packet = new THREE.Mesh(packetGeo, packetMat)
      this.packetMeshes.push(packet)
      this.packetProgress.push(i / 16)
      this.scene.add(packet)
    }
  }

  // ==========================================
  // LOGISTICS, LOADING BAY & MOVING VEHICLES
  // ==========================================
  private buildLogisticsAndVehicles() {
    // 1. Loading Dock Bay (South of Hall A/B at X: 0, Z: 32)
    const dockGeo = new THREE.BoxGeometry(14, 1.2, 8)
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.7 })
    const dock = new THREE.Mesh(dockGeo, dockMat)
    dock.position.set(0, 0.6, 30)
    dock.receiveShadow = true
    this.scene.add(dock)

    // Rollup Bay Shutters
    const shutterGeo = new THREE.BoxGeometry(4.5, 3.2, 0.2)
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
    const shutter1 = new THREE.Mesh(shutterGeo, shutterMat)
    shutter1.position.set(-3.5, 2.2, 26.2)
    const shutter2 = new THREE.Mesh(shutterGeo, shutterMat)
    shutter2.position.set(3.5, 2.2, 26.2)
    this.scene.add(shutter1, shutter2)

    // 2. Heavy Logistics Delivery Rig (Truck)
    this.truckGroup = new THREE.Group()
    this.truckGroup.position.set(0, 0.9, 36)

    // Cab
    const cabGeo = new THREE.BoxGeometry(2.4, 2.2, 2.8)
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.7, roughness: 0.3 })
    const cab = new THREE.Mesh(cabGeo, cabMat)
    cab.position.set(0, 0.7, 3.2)
    cab.castShadow = true
    this.truckGroup.add(cab)

    // Windshield
    const winGeo = new THREE.BoxGeometry(2.2, 0.9, 0.1)
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 })
    const win = new THREE.Mesh(winGeo, winMat)
    win.position.set(0, 1.1, 4.55)
    this.truckGroup.add(win)

    // Trailer Cargo Box
    const trailerGeo = new THREE.BoxGeometry(2.5, 2.8, 6.2)
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0x0f223a, metalness: 0.5, roughness: 0.4 })
    const trailer = new THREE.Mesh(trailerGeo, trailerMat)
    trailer.position.set(0, 1.1, -1.4)
    trailer.castShadow = true
    this.truckGroup.add(trailer)

    // Headlight glow
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), headMat)
    hl1.position.set(-0.85, 0.4, 4.6)
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), headMat)
    hl2.position.set(0.85, 0.4, 4.6)
    this.truckGroup.add(hl1, hl2)

    this.truckGroup.userData = { id: 'VEH-TRUCK-01', name: 'Logistics Delivery Rig 404', type: 'vehicle' }
    this.interactiveMeshes.push(trailer)
    this.scene.add(this.truckGroup)

    // 3. Autonomous Technician Service Cart
    this.serviceCartGroup = new THREE.Group()
    this.serviceCartGroup.position.set(-26, 0.5, 20)

    const cartChassisGeo = new THREE.BoxGeometry(1.4, 0.6, 2.0)
    const cartMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.4 })
    const cartChassis = new THREE.Mesh(cartChassisGeo, cartMat)
    cartChassis.castShadow = true
    this.serviceCartGroup.add(cartChassis)

    // Robotic Tool Mast
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8)
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    const mast = new THREE.Mesh(mastGeo, mastMat)
    mast.position.set(0, 0.9, 0)
    this.serviceCartGroup.add(mast)

    // Flashing Alert Beacon on Cart
    const cartBeaconGeo = new THREE.SphereGeometry(0.14, 8, 8)
    const cartBeaconMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    const cartBeacon = new THREE.Mesh(cartBeaconGeo, cartBeaconMat)
    cartBeacon.position.set(0, 1.6, 0)
    this.serviceCartGroup.add(cartBeacon)

    // Repair Laser Beam (active during repairs)
    const laserGeo = new THREE.CylinderGeometry(0.02, 0.04, 2.5, 6)
    laserGeo.rotateX(Math.PI / 2)
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
    this.cartToolLaser = new THREE.Mesh(laserGeo, laserMat)
    this.cartToolLaser.position.set(0, 1.2, 1.4)
    this.cartToolLaser.visible = false
    this.serviceCartGroup.add(this.cartToolLaser)

    this.serviceCartGroup.userData = { id: 'VEH-MAINT-01', name: 'Autonomous Technician Service Cart', type: 'vehicle' }
    this.interactiveMeshes.push(cartChassis)
    this.scene.add(this.serviceCartGroup)
  }

  // ==========================================
  // COOLING VAPOR PARTICLES (STEAM)
  // ==========================================
  private buildCoolingVaporParticles() {
    const particleCount = 180
    const positions = new Float32Array(particleCount * 3)
    const towerXs = [-28, -20, -12]

    for (let i = 0; i < particleCount; i++) {
      const towerX = towerXs[i % 3]
      positions[i * 3 + 0] = towerX + (Math.random() - 0.5) * 2.2
      positions[i * 3 + 1] = 6.2 + Math.random() * 5.0
      positions[i * 3 + 2] = -28 + (Math.random() - 0.5) * 2.2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.65,
      transparent: true,
      opacity: 0.35,
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
    const rainCount = 2000
    const rainPos = new Float32Array(rainCount * 3)

    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3 + 0] = (Math.random() - 0.5) * 120
      rainPos[i * 3 + 1] = Math.random() * 50
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 100
    }

    this.rainGeometry = new THREE.BufferGeometry()
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))

    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.22,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.rainParticles = new THREE.Points(this.rainGeometry, rainMat)
    this.rainParticles.visible = false
    this.scene.add(this.rainParticles)
  }

  // ==========================================
  // SELECTION RETICLE / RING
  // ==========================================
  private buildSelectionRing() {
    this.selectionRing = new THREE.Group()
    this.selectionRing.visible = false

    // Outer rotating ring
    const ringGeo = new THREE.RingGeometry(1.4, 1.55, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.rotation.x = -Math.PI / 2
    this.selectionRing.add(ringMesh)

    // Inner pulsing circle
    const innerGeo = new THREE.CircleGeometry(1.3, 32)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.15,
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

      // Cursor hover feedback
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
      if (this.isDragging) return // User panned or rotated camera, not a click

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

      // Clicked on empty space
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
  // OBJECT SELECTION & CAMERA LERP
  // ==========================================
  public selectObject(obj: SelectedObject | null) {
    if (!obj) {
      this.clearSelection()
      return
    }

    this.targetSelectionId = obj.id
    this.selectionRing.position.set(obj.position[0], 0.08, obj.position[2])
    this.selectionRing.visible = true

    // Camera fly-to
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

    this.camEndPos.set(
      targetPos.x + distance * 0.7,
      targetPos.y + distance * 0.85,
      targetPos.z + distance * 0.7
    )
    this.camEndLook.copy(targetPos)
    this.camLerpProgress = 0.0
  }

  // ==========================================
  // EXTERNAL STATE SYNC (WEATHER, DAY/NIGHT, RACKS)
  // ==========================================
  public updateWeather(weather: WeatherType) {
    this.currentWeather = weather

    if (weather === 'monsoon' || weather === 'storm') {
      if (this.rainParticles) this.rainParticles.visible = true
      this.scene.fog = new THREE.FogExp2(0x07111f, weather === 'storm' ? 0.016 : 0.012)
    } else {
      if (this.rainParticles) this.rainParticles.visible = false
      this.scene.fog = new THREE.FogExp2(0x07111f, 0.009)
    }

    if (weather === 'heatwave') {
      this.ambientLight.color.setHex(0x382414)
      this.dirLight.color.setHex(0xfbbf24)
    } else if (weather === 'storm') {
      this.ambientLight.color.setHex(0x0a121e)
      this.dirLight.color.setHex(0x475569)
    } else {
      this.updateDayNight(this.currentDayNight)
    }
  }

  public updateDayNight(mode: DayNightMode) {
    this.currentDayNight = mode

    if (mode === 'day') {
      this.scene.background = new THREE.Color(0x13243d)
      this.scene.fog = new THREE.FogExp2(0x13243d, 0.007)
      this.ambientLight.color.setHex(0x334e68)
      this.ambientLight.intensity = 1.6
      this.dirLight.color.setHex(0xfffbeb)
      this.dirLight.intensity = 1.8
      this.hemiLight.intensity = 0.9
    } else {
      this.scene.background = new THREE.Color(0x07111f)
      this.scene.fog = new THREE.FogExp2(0x07111f, 0.009)
      this.ambientLight.color.setHex(0x16243b)
      this.ambientLight.intensity = 1.2
      this.dirLight.color.setHex(0x93c5fd)
      this.dirLight.intensity = 1.2
      this.hemiLight.intensity = 0.6
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
    const fanSpeed = this.currentWeather === 'heatwave' ? 8.5 : 4.5
    this.fans.forEach((fan) => {
      fan.rotation.y += delta * fanSpeed
    })

    // 2. Animate Cooling Tower Vapor
    if (this.vaporParticles && this.vaporPositions) {
      const pCount = this.vaporPositions.length / 3
      for (let i = 0; i < pCount; i++) {
        this.vaporPositions[i * 3 + 1] += delta * 1.8
        if (this.vaporPositions[i * 3 + 1] > 11.5) {
          this.vaporPositions[i * 3 + 1] = 6.2
        }
      }
      this.vaporParticles.geometry.attributes.position.needsUpdate = true
    }

    // 3. Animate Rain (Monsoon & Storm)
    if (this.rainParticles && this.rainParticles.visible && this.rainGeometry) {
      const positions = this.rainGeometry.attributes.position.array as Float32Array
      const rainCount = positions.length / 3
      const rainSpeed = this.currentWeather === 'storm' ? 45 : 30

      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= delta * rainSpeed
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 48
        }
      }
      this.rainGeometry.attributes.position.needsUpdate = true

      // Storm Lightning Flashes
      if (this.currentWeather === 'storm') {
        this.lightningTimer += delta
        if (this.lightningTimer > 7.0 && Math.random() < 0.05) {
          this.ambientLight.intensity = 3.5
          this.dirLight.intensity = 4.0
          setTimeout(() => {
            this.ambientLight.intensity = 1.0
            this.dirLight.intensity = 1.2
          }, 80)
          this.lightningTimer = 0
        }
      }
    }

    // 4. Animate Data Packets along Spline Conduits
    for (let i = 0; i < this.packetMeshes.length; i++) {
      const curveIndex = i % this.packetCurves.length
      const curve = this.packetCurves[curveIndex]
      this.packetProgress[i] = (this.packetProgress[i] + delta * 0.45) % 1.0
      const pos = curve.getPoint(this.packetProgress[i])
      this.packetMeshes[i].position.copy(pos)
    }

    // 5. Animate Logistics Truck periodic movement
    // Path: South Entrance (Z: 44) to Loading Dock (Z: 32)
    const truckCycleTime = (elapsedTime * 0.08) % 1.0
    if (truckCycleTime < 0.4) {
      // Arriving
      const t = truckCycleTime / 0.4
      this.truckGroup.position.z = 46 - t * 12
      this.truckGroup.position.x = 0
    } else if (truckCycleTime < 0.7) {
      // Parked at bay unloading
      this.truckGroup.position.z = 34
    } else {
      // Departing
      const t = (truckCycleTime - 0.7) / 0.3
      this.truckGroup.position.z = 34 + t * 12
    }

    // 6. Animate Technician Service Cart Patrol / Repair
    const cartT = (elapsedTime * 0.12) % 1.0
    // Service Cart patrols the front roadway between Hall A and Hall B
    this.serviceCartGroup.position.x = -26 + Math.sin(cartT * Math.PI * 2) * 24
    this.serviceCartGroup.position.z = 18 + Math.cos(cartT * Math.PI * 2) * 3

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
      // Ease out cubic
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
        // Slow gentle orbit drift
        this.camera.position.x += Math.sin(elapsedTime * 0.2) * 0.03
        this.camera.position.z += Math.cos(elapsedTime * 0.2) * 0.03
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
