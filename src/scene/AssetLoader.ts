import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class AssetLoader {
  private static instance: AssetLoader
  private loader: GLTFLoader
  private modelCache: Map<string, THREE.Group> = new Map()
  private pendingLoads: Map<string, Promise<THREE.Group | null>> = new Map()

  private constructor() {
    this.loader = new GLTFLoader()
  }

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader()
    }
    return AssetLoader.instance
  }

  /**
   * Load a GLTF/GLB model from URL with memory caching and error fallback.
   */
  public async loadModel(url: string): Promise<THREE.Group | null> {
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url)!
    }

    if (this.pendingLoads.has(url)) {
      return this.pendingLoads.get(url)!
    }

    const loadPromise = new Promise<THREE.Group | null>((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          const root = gltf.scene || gltf.scenes[0]
          // Enable shadow casting and receiving on visual child meshes only
          root.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.name.toLowerCase().includes('collider')) {
                child.visible = false
                child.castShadow = false
                child.receiveShadow = false
              } else {
                child.castShadow = true
                child.receiveShadow = true
              }
            }
          })
          this.modelCache.set(url, root)
          this.pendingLoads.delete(url)
          resolve(root)
        },
        undefined,
        (error) => {
          console.warn(`[AssetLoader] Fallback: Failed to load 3D model from "${url}":`, error)
          this.pendingLoads.delete(url)
          resolve(null)
        }
      )
    })

    this.pendingLoads.set(url, loadPromise)
    return loadPromise
  }

  /**
   * Clone a cached model hierarchy for multiple instance placements.
   * Clones LED materials individually so each instance can maintain unique telemetry states.
   */
  public cloneModel(source: THREE.Group, cloneLeds: boolean = true): THREE.Group {
    const clone = source.clone(true)

    if (cloneLeds) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.name.includes('LED') || child.name.includes('Beacon')) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map((m) => m.clone())
            } else if (child.material) {
              child.material = child.material.clone()
            }
          }
        }
      })
    }

    return clone
  }

  /**
   * Preload core campus assets in parallel.
   */
  public async preloadCampusAssets(): Promise<{
    serverRack: THREE.Group | null
    coolingTower: THREE.Group | null
    transformer: THREE.Group | null
    generator: THREE.Group | null
  }> {
    const [serverRack, coolingTower, transformer, generator] = await Promise.all([
      this.loadModel('/models/server_rack.glb'),
      this.loadModel('/models/cooling_tower.glb'),
      this.loadModel('/models/transformer.glb'),
      this.loadModel('/models/generator.glb'),
    ])

    return { serverRack, coolingTower, transformer, generator }
  }
}
