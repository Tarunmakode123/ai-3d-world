import * as THREE from 'three'

/**
 * PbrTextureGenerator: Programmatically synthesizes high-resolution PBR texture maps
 * (Albedo/Diffuse, Tangent-Space Normal Maps, Roughness Maps, Emissive Maps)
 * directly using HTML5 Canvas with hardware acceleration.
 * 
 * Solves the critical visual limitation: delivers micro-surface visual fidelity,
 * stamped metal depth, and realistic specular highlights without requiring
 * external file downloads or 20,000+ untextured primitive box meshes.
 */
export class PbrTextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map()
  private static envMapCache: THREE.Texture | null = null
  public static maxAnisotropy: number = 8

  public static setMaxAnisotropy(val: number) {
    this.maxAnisotropy = Math.max(1, Math.min(val, 16))
    // Update existing cached textures
    this.cache.forEach((tex) => {
      tex.anisotropy = this.maxAnisotropy
      tex.needsUpdate = true
    })
  }

  /**
   * Generates a nocturnal HDRI environment map using HTML5 Canvas & PMREMGenerator.
   * Produces realistic metallic reflections on titanium EIA rails, structural steel,
   * copper busways, and architectural facades without external HDR file dependencies.
   */
  public static getNocturnalEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture {
    if (this.envMapCache) return this.envMapCache

    const W = 2048
    const H = 1024
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Deep space zenith to nadir gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0.0, '#020617') // deep nocturnal navy zenith
    grad.addColorStop(0.32, '#061324') // midnight blue
    grad.addColorStop(0.46, '#0b1d36') // upper horizon atmospheric scattering
    grad.addColorStop(0.495, '#152b47') // bright horizon rim
    grad.addColorStop(0.505, '#0f172a') // horizon line
    grad.addColorStop(0.52, '#080d1a') // ground horizon
    grad.addColorStop(0.70, '#04070e') // ground plane
    grad.addColorStop(1.0, '#020306') // nadir
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Distant horizon atmospheric ambient light glow
    // Data Center compound cyan glow on horizon (center-left)
    const cyanGlow = ctx.createRadialGradient(W * 0.35, H * 0.49, 10, W * 0.35, H * 0.49, 450)
    cyanGlow.addColorStop(0, 'rgba(6, 182, 212, 0.45)')
    cyanGlow.addColorStop(0.4, 'rgba(2, 132, 199, 0.22)')
    cyanGlow.addColorStop(1, 'rgba(2, 132, 199, 0)')
    ctx.fillStyle = cyanGlow
    ctx.fillRect(0, 0, W, H)

    // Substation / Industrial warm amber & sodium glow (left)
    const amberGlow = ctx.createRadialGradient(W * 0.12, H * 0.50, 10, W * 0.12, H * 0.50, 380)
    amberGlow.addColorStop(0, 'rgba(245, 158, 11, 0.40)')
    amberGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.18)')
    amberGlow.addColorStop(1, 'rgba(217, 119, 6, 0)')
    ctx.fillStyle = amberGlow
    ctx.fillRect(0, 0, W, H)

    // Distant city amber glow (right)
    const cityAmberGlow = ctx.createRadialGradient(W * 0.82, H * 0.50, 10, W * 0.82, H * 0.50, 420)
    cityAmberGlow.addColorStop(0, 'rgba(251, 191, 36, 0.35)')
    cityAmberGlow.addColorStop(0.5, 'rgba(180, 83, 9, 0.15)')
    cityAmberGlow.addColorStop(1, 'rgba(180, 83, 9, 0)')
    ctx.fillStyle = cityAmberGlow
    ctx.fillRect(0, 0, W, H)

    // Distant pinpoint horizon light bokeh (streetlights, towers, city lights)
    for (let i = 0; i < 90; i++) {
      const x = (i * 23.7) % W
      const y = H * 0.485 + ((i * 7) % 18) - 9
      const radius = 1.0 + ((i * 3) % 4) * 0.7
      ctx.fillStyle =
        i % 3 === 0
          ? 'rgba(56, 189, 248, 0.7)'
          : i % 3 === 1
          ? 'rgba(251, 191, 36, 0.7)'
          : 'rgba(248, 250, 252, 0.85)'
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Soft nocturnal stars in zenith
    for (let i = 0; i < 160; i++) {
      const sx = (i * 47.3) % W
      const sy = ((i * 31.7) % (H * 0.38)) + 10
      const starAlpha = 0.25 + ((i * 13) % 10) * 0.06
      ctx.fillStyle = `rgba(226, 232, 240, ${starAlpha})`
      ctx.beginPath()
      ctx.arc(sx, sy, 0.8 + (i % 4 === 0 ? 0.6 : 0), 0, Math.PI * 2)
      ctx.fill()
    }

    const canvasTexture = new THREE.CanvasTexture(canvas)
    canvasTexture.mapping = THREE.EquirectangularReflectionMapping
    canvasTexture.colorSpace = THREE.SRGBColorSpace

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    const renderTarget = pmremGenerator.fromEquirectangular(canvasTexture)
    const envMap = renderTarget.texture

    pmremGenerator.dispose()
    canvasTexture.dispose()

    this.envMapCache = envMap
    return envMap
  }

  /**
   * 1. High-Density AI GPU Server Rack Faceplate Albedo Texture (1024 x 2048)
   * Supports two distinct industrial architectural themes:
   * - 'cyan': Hall A (Foundation Training Cluster: Quantum-X800 IB Spine + HGX-H100 SXM5)
   * - 'amber': Hall B (Inference & MoE Swarm: Spectrum-4 800G Spine + B200 NVL72 / TPU)
   */
  public static getServerRackAlbedoTexture(theme: 'cyan' | 'amber' = 'cyan'): THREE.CanvasTexture {
    const key = `rack_albedo_${theme}`
    if (this.cache.has(key)) return this.cache.get(key)!

    const W = 1024
    const H = 2048
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    const isCyan = theme === 'cyan'

    // Base chassis: deep anodized industrial slate black
    ctx.fillStyle = isCyan ? '#0a0f16' : '#110e14'
    ctx.fillRect(0, 0, W, H)

    // Side 19" EIA-310 Vertical Mounting Rails (brushed titanium/aluminum)
    const railW = 72
    const gradRailL = ctx.createLinearGradient(0, 0, railW, 0)
    gradRailL.addColorStop(0, '#1e293b')
    gradRailL.addColorStop(0.5, '#334155')
    gradRailL.addColorStop(1, '#0f172a')
    ctx.fillStyle = gradRailL
    ctx.fillRect(0, 0, railW, H)

    const gradRailR = ctx.createLinearGradient(W - railW, 0, W, 0)
    gradRailR.addColorStop(0, '#0f172a')
    gradRailR.addColorStop(0.5, '#334155')
    gradRailR.addColorStop(1, '#1e293b')
    ctx.fillStyle = gradRailR
    ctx.fillRect(W - railW, 0, railW, H)

    // EIA U-Unit tick marks and numbered labels (U1 to U42)
    const totalU = 42
    const uHeight = H / totalU
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    for (let u = 1; u <= totalU; u++) {
      const y = H - u * uHeight
      // Tick lines
      ctx.fillStyle = '#475569'
      ctx.fillRect(railW - 20, y, 16, 2)
      ctx.fillRect(W - railW + 4, y, 16, 2)
      // Square cage-nut mounting holes (3 per 1U)
      ctx.fillStyle = '#05090f'
      ctx.fillRect(railW / 2 - 8, y + uHeight * 0.2, 16, 12)
      ctx.fillRect(railW / 2 - 8, y + uHeight * 0.5, 16, 12)
      ctx.fillRect(railW / 2 - 8, y + uHeight * 0.8, 16, 12)
      ctx.fillRect(W - railW / 2 - 8, y + uHeight * 0.2, 16, 12)
      ctx.fillRect(W - railW / 2 - 8, y + uHeight * 0.5, 16, 12)
      ctx.fillRect(W - railW / 2 - 8, y + uHeight * 0.8, 16, 12)

      // U numbers every 5 units
      if (u % 5 === 0) {
        ctx.fillStyle = isCyan ? '#38bdf8' : '#fbbf24'
        ctx.fillText(`${u}`, railW / 2, y + uHeight * 0.6)
        ctx.fillText(`${u}`, W - railW / 2, y + uHeight * 0.6)
      }
    }

    const bayX = railW
    const bayW = W - railW * 2

    // TOP 2U: Network Spine Switch (U41-U42)
    const switchY = 0
    const switchH = uHeight * 2.2
    ctx.fillStyle = isCyan ? '#111c2a' : '#221510'
    ctx.fillRect(bayX, switchY, bayW, switchH)
    // Bezel border
    ctx.strokeStyle = isCyan ? '#0284c7' : '#d97706'
    ctx.lineWidth = 4
    ctx.strokeRect(bayX + 4, switchY + 4, bayW - 8, switchH - 8)

    // Switch Brand Header & Status
    ctx.fillStyle = isCyan ? '#38bdf8' : '#fbbf24'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(
      isCyan ? 'CORELINE // QUANTUM-X800 IB SPINE' : 'CORELINE // SPECTRUM-4 64P 800G SWARM',
      bayX + 24,
      switchY + 36
    )

    // 32 High-Speed QSFP-DD 800G Optical Transceiver Ports
    const portW = 20
    const portH = 26
    const portGap = 6
    const startPortX = bayX + 24
    const portRow1Y = switchY + 54
    const portRow2Y = switchY + 86

    for (let p = 0; p < 32; p++) {
      const px = startPortX + (p % 16) * (portW + portGap)
      const py = p < 16 ? portRow1Y : portRow2Y
      // Port metal cage
      ctx.fillStyle = isCyan ? '#334155' : '#475569'
      ctx.fillRect(px, py, portW, portH)
      // Optical connector aperture
      ctx.fillStyle = isCyan ? '#0284c7' : '#b45309'
      ctx.fillRect(px + 4, py + 4, portW - 8, portH - 8)
      // Link status LED
      if (isCyan) {
        ctx.fillStyle = p % 3 === 0 ? '#10b981' : '#06b6d4'
      } else {
        ctx.fillStyle = p % 3 === 0 ? '#f59e0b' : '#fbbf24'
      }
      ctx.beginPath()
      ctx.arc(px + portW / 2, py - 4, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // SIX HEAVY GPU ACCELERATOR CHASSIS (U5 to U40)
    // 6 blades, each ~5.8U high
    const bladeH = uHeight * 5.8
    const bladeStartY = switchH + 12

    for (let b = 0; b < 6; b++) {
      const by = bladeStartY + b * (bladeH + 8)

      // Blade Main Enclosure with chamfered industrial frame
      const bladeGrad = ctx.createLinearGradient(bayX, by, bayX, by + bladeH)
      if (isCyan) {
        bladeGrad.addColorStop(0, '#15202e')
        bladeGrad.addColorStop(0.5, '#1e293b')
        bladeGrad.addColorStop(1, '#0f172a')
      } else {
        bladeGrad.addColorStop(0, '#261b18')
        bladeGrad.addColorStop(0.5, '#2e201c')
        bladeGrad.addColorStop(1, '#1a1210')
      }
      ctx.fillStyle = bladeGrad
      ctx.fillRect(bayX + 2, by, bayW - 4, bladeH)

      // Outer bezel trim
      ctx.strokeStyle = isCyan ? '#334155' : '#573a2e'
      ctx.lineWidth = 3
      ctx.strokeRect(bayX + 2, by, bayW - 4, bladeH)

      // Top identification banner on each blade
      ctx.fillStyle = isCyan ? '#090e17' : '#140c0a'
      ctx.fillRect(bayX + 16, by + 8, bayW - 32, 28)

      ctx.fillStyle = isCyan ? '#38bdf8' : '#fbbf24'
      ctx.font = 'bold 18px monospace'
      const bladeLabel = isCyan
        ? `HGX-H100 [BLADE-${String(b + 1).padStart(2, '0')}] // 8x SXM5 80GB`
        : `B200 NVL72 [BLADE-${String(b + 1).padStart(2, '0')}] // 72x BLACKWELL SWARM`
      ctx.fillText(bladeLabel, bayX + 28, by + 28)

      // Blade Health / Power indicator
      ctx.fillStyle = isCyan ? '#10b981' : '#f59e0b'
      ctx.beginPath()
      ctx.arc(bayX + bayW - 40, by + 22, 6, 0, Math.PI * 2)
      ctx.fill()

      // High-Density Hexagonal Mesh Ventilation Intake Grille
      const ventX = bayX + 16
      const ventY = by + 44
      const ventW = bayW - 32
      const ventH = bladeH - 96

      ctx.fillStyle = '#05080e'
      ctx.fillRect(ventX, ventY, ventW, ventH)

      // Draw dense honeycomb ventilation perforations
      ctx.fillStyle = isCyan ? '#0f1926' : '#261510'
      const hexStep = 12
      for (let hx = ventX + 6; hx < ventX + ventW - 6; hx += hexStep) {
        for (let hy = ventY + 6; hy < ventY + ventH - 6; hy += hexStep) {
          ctx.beginPath()
          ctx.arc(hx, hy, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Copper heat-pipe glimmer behind mesh for Amber B200 swarm
      if (!isCyan) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.22)'
        for (let px = ventX + 24; px < ventX + ventW - 24; px += 48) {
          ctx.fillRect(px, ventY + 12, 16, ventH - 24)
        }
      }

      // Front-access E1.S NVMe SSD Drive Sleds (8 hot-swap drives)
      const driveY = by + bladeH - 44
      const driveW = (bayW - 48) / 8
      for (let d = 0; d < 8; d++) {
        const dx = bayX + 24 + d * driveW
        // Drive sled metal bezel
        ctx.fillStyle = isCyan ? '#1e293b' : '#332420'
        ctx.fillRect(dx, driveY, driveW - 6, 32)
        ctx.strokeStyle = isCyan ? '#475569' : '#573a2e'
        ctx.lineWidth = 1.5
        ctx.strokeRect(dx, driveY, driveW - 6, 32)
        // Ejector latch handle
        ctx.fillStyle = isCyan ? '#0284c7' : '#d97706'
        ctx.fillRect(dx + 4, driveY + 12, 14, 8)
        // Drive activity LED
        if (isCyan) {
          ctx.fillStyle = (b + d) % 4 === 0 ? '#38bdf8' : '#10b981'
        } else {
          ctx.fillStyle = (b + d) % 3 === 0 ? '#f59e0b' : (b + d) % 3 === 1 ? '#ef4444' : '#fbbf24'
        }
        ctx.fillRect(dx + driveW - 14, driveY + 6, 4, 4)
      }

      // Heavy ergonomic release handles on left and right
      ctx.fillStyle = isCyan ? '#64748b' : '#94a3b8'
      ctx.fillRect(bayX + 6, by + bladeH * 0.35, 10, bladeH * 0.3)
      ctx.fillRect(bayX + bayW - 16, by + bladeH * 0.35, 10, bladeH * 0.3)
    }

    // BOTTOM 4U: Redundant Power Supply Units (U1-U4)
    const psuY = H - uHeight * 4.2
    const psuH = uHeight * 4
    ctx.fillStyle = isCyan ? '#0d1520' : '#1a100d'
    ctx.fillRect(bayX, psuY, bayW, psuH)
    ctx.strokeStyle = isCyan ? '#334155' : '#4a3028'
    ctx.lineWidth = 3
    ctx.strokeRect(bayX + 2, psuY, bayW - 4, psuH)

    // 6 Hot-Swappable Titanium PSUs
    const psuW = (bayW - 36) / 6
    for (let p = 0; p < 6; p++) {
      const px = bayX + 18 + p * psuW
      // PSU Enclosure
      ctx.fillStyle = isCyan ? '#1e293b' : '#2b1f1a'
      ctx.fillRect(px, psuY + 14, psuW - 8, psuH - 24)
      // AC Power Inlet
      ctx.fillStyle = '#020617'
      ctx.fillRect(px + 10, psuY + 30, 24, 28)
      // Fan Exhaust Grille
      ctx.fillStyle = '#090e17'
      ctx.beginPath()
      ctx.arc(px + (psuW - 8) / 2, psuY + psuH - 50, 24, 0, Math.PI * 2)
      ctx.fill()
      // Status LED
      ctx.fillStyle = isCyan ? '#10b981' : p % 2 === 0 ? '#f59e0b' : '#10b981'
      ctx.beginPath()
      ctx.arc(px + 16, psuY + psuH - 18, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = this.maxAnisotropy
    this.cache.set(key, texture)
    return texture
  }

  /**
   * 2. High-Precision Tangent-Space Normal Map for Server Rack (1024 x 2048)
   * Encodes recessed mesh perforations, drive latches, screw rivets, and beveled seams.
   * Standard Tangent Normal neutral is RGB(128, 128, 255) = #8080ff
   */
  public static getServerRackNormalMap(): THREE.CanvasTexture {
    const key = 'rack_normal'
    if (this.cache.has(key)) return this.cache.get(key)!

    const W = 1024
    const H = 2048
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Flat surface normal vector: (0, 0, 1) -> RGB(128, 128, 255)
    ctx.fillStyle = '#8080ff'
    ctx.fillRect(0, 0, W, H)

    const railW = 72
    const totalU = 42
    const uHeight = H / totalU

    // Left and right rail bevels (Facing inward/outward)
    // Left edge light normal slope: (1, 0, 0.5) -> #ff80a0 / Right edge: #0080a0
    ctx.fillStyle = '#b080ff'
    ctx.fillRect(0, 0, 8, H)
    ctx.fillStyle = '#5080ff'
    ctx.fillRect(railW - 8, 0, 8, H)

    ctx.fillStyle = '#b080ff'
    ctx.fillRect(W - railW, 0, 8, H)
    ctx.fillStyle = '#5080ff'
    ctx.fillRect(W - 8, 0, 8, H)

    // Deep recessed cage nut holes
    ctx.fillStyle = '#6060c0'
    for (let u = 1; u <= totalU; u++) {
      const y = H - u * uHeight
      ctx.fillRect(railW / 2 - 8, y + uHeight * 0.2, 16, 12)
      ctx.fillRect(railW / 2 - 8, y + uHeight * 0.5, 16, 12)
      ctx.fillRect(railW / 2 - 8, y + uHeight * 0.8, 16, 12)
      ctx.fillRect(W - railW / 2 - 8, y + uHeight * 0.2, 16, 12)
      ctx.fillRect(W - railW / 2 - 8, y + uHeight * 0.5, 16, 12)
      ctx.fillRect(W - railW / 2 - 8, y + uHeight * 0.8, 16, 12)
    }

    const bayX = railW
    const bayW = W - railW * 2
    const bladeH = uHeight * 5.8
    const switchH = uHeight * 2.2
    const bladeStartY = switchH + 12

    // Blade chassis bevels & recessed vents
    for (let b = 0; b < 6; b++) {
      const by = bladeStartY + b * (bladeH + 8)

      // Top bevel: facing up (0, 1, 0.5) -> #80ffb0
      ctx.fillStyle = '#80e0c0'
      ctx.fillRect(bayX, by, bayW, 6)
      // Bottom bevel: facing down (0, -1, 0.5) -> #8020c0
      ctx.fillStyle = '#8030c0'
      ctx.fillRect(bayX, by + bladeH - 6, bayW, 6)

      // Deep recessed intake grille
      ctx.fillStyle = '#6060c8'
      ctx.fillRect(bayX + 16, by + 44, bayW - 32, bladeH - 96)

      // Drive latches (raised relief)
      const driveY = by + bladeH - 44
      const driveW = (bayW - 48) / 8
      for (let d = 0; d < 8; d++) {
        const dx = bayX + 24 + d * driveW
        ctx.fillStyle = '#a0a0ff'
        ctx.fillRect(dx + 2, driveY + 2, driveW - 10, 28)
        ctx.fillStyle = '#c0c0ff'
        ctx.fillRect(dx + 4, driveY + 12, 14, 8)
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = this.maxAnisotropy
    this.cache.set(key, texture)
    return texture
  }

  /**
   * 3. High-Precision Roughness / Metalness Map
   * Red = Roughness, Green = Metalness
   */
  public static getServerRackRoughnessMap(): THREE.CanvasTexture {
    const key = 'rack_roughness'
    if (this.cache.has(key)) return this.cache.get(key)!

    const W = 1024
    const H = 2048
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Base: dark gray = ~0.45 roughness
    ctx.fillStyle = '#737373'
    ctx.fillRect(0, 0, W, H)

    // Brushed titanium mounting rails: smooth ~0.25 roughness
    ctx.fillStyle = '#404040'
    ctx.fillRect(0, 0, 72, H)
    ctx.fillRect(W - 72, 0, 72, H)

    // Recessed honeycomb mesh: high diffuse scattering ~0.85 roughness
    const totalU = 42
    const uHeight = H / totalU
    const bayX = 72
    const bayW = W - 144
    const bladeH = uHeight * 5.8
    const switchH = uHeight * 2.2
    const bladeStartY = switchH + 12

    ctx.fillStyle = '#d9d9d9'
    for (let b = 0; b < 6; b++) {
      const by = bladeStartY + b * (bladeH + 8)
      ctx.fillRect(bayX + 16, by + 44, bayW - 32, bladeH - 96)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = this.maxAnisotropy
    this.cache.set(key, texture)
    return texture
  }

  /**
   * 4. Raised Access Floor Tile PBR Texture (600mm x 600mm computer room grid)
   */
  public static getRaisedFloorTexture(): { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } {
    const mapKey = 'floor_map'
    const normKey = 'floor_normal'

    if (this.cache.has(mapKey) && this.cache.has(normKey)) {
      return { map: this.cache.get(mapKey)!, normalMap: this.cache.get(normKey)! }
    }

    const S = 512
    const cMap = document.createElement('canvas')
    cMap.width = S
    cMap.height = S
    const ctxM = cMap.getContext('2d')!

    // Dark slate vinyl anti-static tile surface
    ctxM.fillStyle = '#111923'
    ctxM.fillRect(0, 0, S, S)

    // Subtle micro-stippling noise
    ctxM.fillStyle = '#182433'
    for (let i = 0; i < 800; i++) {
      const rx = Math.random() * S
      const ry = Math.random() * S
      ctxM.fillRect(rx, ry, 2, 2)
    }

    // 4 tile quadrant seams (600mm x 600mm grid)
    ctxM.strokeStyle = '#060a0f'
    ctxM.lineWidth = 6
    ctxM.beginPath()
    ctxM.moveTo(S / 2, 0)
    ctxM.lineTo(S / 2, S)
    ctxM.moveTo(0, S / 2)
    ctxM.lineTo(S, S / 2)
    ctxM.stroke()

    // Outer edge joint
    ctxM.strokeRect(0, 0, S, S)

    // Corner pedestal screw covers
    ctxM.fillStyle = '#334155'
    const corners = [
      [8, 8],
      [S - 8, 8],
      [8, S - 8],
      [S - 8, S - 8],
      [S / 2, S / 2],
    ]
    corners.forEach(([cx, cy]) => {
      ctxM.beginPath()
      ctxM.arc(cx, cy, 5, 0, Math.PI * 2)
      ctxM.fill()
    })

    const texMap = new THREE.CanvasTexture(cMap)
    texMap.colorSpace = THREE.SRGBColorSpace
    texMap.wrapS = THREE.RepeatWrapping
    texMap.wrapT = THREE.RepeatWrapping
    texMap.anisotropy = this.maxAnisotropy

    // Normal map for recessed joints
    const cNorm = document.createElement('canvas')
    cNorm.width = S
    cNorm.height = S
    const ctxN = cNorm.getContext('2d')!
    ctxN.fillStyle = '#8080ff'
    ctxN.fillRect(0, 0, S, S)

    // Recessed joint grooves
    ctxN.fillStyle = '#6060c0'
    ctxN.fillRect(S / 2 - 3, 0, 6, S)
    ctxN.fillRect(0, S / 2 - 3, S, 6)

    const texNorm = new THREE.CanvasTexture(cNorm)
    texNorm.wrapS = THREE.RepeatWrapping
    texNorm.wrapT = THREE.RepeatWrapping
    texNorm.anisotropy = this.maxAnisotropy

    this.cache.set(mapKey, texMap)
    this.cache.set(normKey, texNorm)

    return { map: texMap, normalMap: texNorm }
  }

  /**
   * 5. Prominent Illuminated "CORELINE" Corporate Facade Signage (Matching IMAGE 2)
   */
  public static getCorelineSignageTexture(): THREE.CanvasTexture {
    const key = 'coreline_signage'
    if (this.cache.has(key)) return this.cache.get(key)!

    const W = 1024
    const H = 256
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Architectural dark graphite concrete facade background
    ctx.fillStyle = '#0c141f'
    ctx.fillRect(0, 0, W, H)

    // Glowing Cyan Hexagon Emblem (⬡)
    const centerX = 160
    const centerY = H / 2
    const radius = 54

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 14
    ctx.shadowColor = '#06b6d4'
    ctx.shadowBlur = 32

    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()

    // Inner node
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.arc(0, 0, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // "CORELINE" bold modern typography
    ctx.save()
    ctx.font = '900 84px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#f8fafc'
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 24
    ctx.letterSpacing = '8px'
    ctx.fillText('CORELINE', 260, centerY + 28)
    ctx.restore()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = this.maxAnisotropy
    this.cache.set(key, texture)
    return texture
  }
}
