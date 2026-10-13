import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { CampusScene } from './CampusScene'
import { useSimulation } from '../simulation/SimulationContext'
import type { SelectedObject, InWorldBadge } from '../types/simulation'
import {
  AlertCircle,
  Server,
  Wind,
  Zap,
  Network,
  Truck,
  ShieldCheck,
  Car,
  Layers,
} from 'lucide-react'

export const CorelineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneInstanceRef = useRef<CampusScene | null>(null)
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  const [webglError, setWebglError] = useState<string | null>(null)
  const [badgeScreenPositions, setBadgeScreenPositions] = useState<
    { id: string; x: number; y: number; visible: boolean }[]
  >([])

  const {
    weather,
    dayNight,
    isHeatOverlay,
    isCinematic,
    cameraFocus,
    selectedObject,
    setSelectedObject,
    racks,
    inWorldBadges,
    focusAssetById,
  } = useSimulation()

  // Initialize Three.js Campus Scene
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebglError('WebGL is not supported on this browser or graphics device.')
        return
      }
    } catch {
      setWebglError('Failed to initialize WebGL context.')
      return
    }

    try {
      const scene = new CampusScene(containerRef.current, {
        onSelectObject: (obj: SelectedObject | null) => {
          setSelectedObject(obj)
        },
        onHoverObject: (name: string | null) => {
          setHoveredName(name)
        },
      })

      sceneInstanceRef.current = scene

      return () => {
        scene.dispose()
        sceneInstanceRef.current = null
      }
    } catch (err: unknown) {
      console.error('Coreline Three.js Init Error:', err)
      setWebglError(err instanceof Error ? err.message : 'Unknown 3D engine initialization error')
    }
  }, [setSelectedObject])

  // Sync Weather
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.updateWeather(weather)
    }
  }, [weather])

  // Sync Day / Night
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.updateDayNight(dayNight)
    }
  }, [dayNight])

  // Sync Heat Overlay
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setHeatOverlay(isHeatOverlay)
    }
  }, [isHeatOverlay])

  // Sync Cinematic Mode
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setCinematic(isCinematic)
    }
  }, [isCinematic])

  // Sync Rack LED Telemetry
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.updateRacksTelemetry(racks)
    }
  }, [racks])

  // Sync Camera Focus triggers
  useEffect(() => {
    if (sceneInstanceRef.current && cameraFocus) {
      sceneInstanceRef.current.focusCameraOn(
        new THREE.Vector3(...cameraFocus.target),
        cameraFocus.zoomDistance || 26
      )
    }
  }, [cameraFocus])

  // Real-time In-World Badge Screen Projections
  const updateBadgeProjections = useCallback(() => {
    if (!sceneInstanceRef.current || !containerRef.current) return
    const camera = sceneInstanceRef.current.camera
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    const projected = inWorldBadges.map((badge) => {
      const pos = new THREE.Vector3(badge.position[0], badge.position[1], badge.position[2])
      pos.project(camera)

      const isVisible = pos.z < 1 && pos.x >= -1.1 && pos.x <= 1.1 && pos.y >= -1.1 && pos.y <= 1.1
      const screenX = (pos.x * 0.5 + 0.5) * width
      const screenY = (-(pos.y * 0.5) + 0.5) * height

      return {
        id: badge.id,
        x: screenX,
        y: screenY,
        visible: isVisible,
      }
    })

    setBadgeScreenPositions(projected)
  }, [inWorldBadges])

  // Project badges on animation frames
  useEffect(() => {
    let animId = 0
    const loop = () => {
      updateBadgeProjections()
      animId = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(animId)
  }, [updateBadgeProjections])

  const getBadgeIcon = (type: InWorldBadge['type']) => {
    switch (type) {
      case 'hall':
        return <Server className="w-3.5 h-3.5 text-cyan-400" />
      case 'cooling':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />
      case 'power':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />
      case 'network':
        return <Network className="w-3.5 h-3.5 text-cyan-400" />
      case 'dock':
        return <Truck className="w-3.5 h-3.5 text-slate-300" />
      case 'gate':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
      case 'parking':
        return <Car className="w-3.5 h-3.5 text-slate-300" />
      default:
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />
    }
  }

  const handleBadgeClick = (badge: InWorldBadge) => {
    if (badge.type === 'hall') {
      focusAssetById(badge.id.includes('hall-b') ? 'hall-b' : 'hall-a')
    } else if (badge.type === 'cooling') {
      focusAssetById('COOL-TWR-01')
    } else if (badge.type === 'power') {
      focusAssetById('SUBSTATION-MAIN')
    } else if (badge.type === 'network') {
      focusAssetById('NET-VAULT-01')
    } else if (badge.type === 'dock') {
      focusAssetById('dock-bays')
    } else if (badge.type === 'gate') {
      focusAssetById('security-gate')
    } else if (badge.type === 'parking') {
      focusAssetById('parking-lot')
    }
  }

  if (webglError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#07111F] text-slate-300 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-white mb-2">3D Acceleration Unavailable</h2>
        <p className="max-w-md text-sm text-slate-400 mb-4">{webglError}</p>
        <p className="text-xs text-slate-500">
          Please verify hardware acceleration is enabled in your browser settings.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating In-World Holographic Badges (Matching IMAGE 2!) */}
      {!isCinematic &&
        inWorldBadges.map((badge) => {
          const screenPos = badgeScreenPositions.find((p) => p.id === badge.id)
          if (!screenPos || !screenPos.visible) return null

          const isSelected = selectedObject?.id === (badge.id.includes('hall-b') ? 'hall-b' : 'hall-a')

          return (
            <div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              style={{
                transform: `translate3d(${screenPos.x}px, ${screenPos.y}px, 0) translate(-50%, -50%)`,
              }}
              className={`absolute top-0 left-0 z-10 pointer-events-auto cursor-pointer transition-all duration-150 group ${
                isSelected ? 'scale-105' : 'hover:scale-105'
              }`}
            >
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/60 hover:border-cyan-400/60 shadow-[0_4px_16px_rgba(0,0,0,0.6)] group-hover:shadow-[0_0_16px_rgba(34,211,238,0.3)]">
                <div className="flex items-center justify-center">{getBadgeIcon(badge.type)}</div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-[11px] font-mono font-bold text-white tracking-wide">
                      {badge.title}
                    </span>
                    {badge.status && (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {badge.status}
                      </span>
                    )}
                  </div>
                  {badge.subtitle && (
                    <div className="text-[10px] font-mono text-slate-400 leading-none mt-1">
                      {badge.subtitle}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

      {/* Hover Object Quick Label */}
      {hoveredName && !isCinematic && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-xl transition-opacity duration-200">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>{hoveredName}</span>
        </div>
      )}
    </div>
  )
}
