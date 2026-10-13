import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { CampusScene } from './CampusScene'
import { useSimulation } from '../simulation/SimulationContext'
import type { SelectedObject } from '../types/simulation'
import { AlertCircle } from 'lucide-react'

export const CorelineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneInstanceRef = useRef<CampusScene | null>(null)
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  const [webglError, setWebglError] = useState<string | null>(null)

  const {
    weather,
    dayNight,
    isHeatOverlay,
    isCinematic,
    cameraFocus,
    selectedObject,
    setSelectedObject,
    racks,
  } = useSimulation()

  // Initialize Three.js Campus Scene
  useEffect(() => {
    if (!containerRef.current) return

    // WebGL support check
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
        cameraFocus.zoomDistance || 24
      )
    }
  }, [cameraFocus])

  // Sync Selected Object Marker
  useEffect(() => {
    if (sceneInstanceRef.current) {
      if (selectedObject) {
        // sync position if needed
      } else {
        sceneInstanceRef.current.clearSelection()
      }
    }
  }, [selectedObject])

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

      {/* Hover Object Quick Label */}
      {hoveredName && !isCinematic && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-xs font-mono shadow-lg transition-opacity duration-200">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>{hoveredName}</span>
        </div>
      )}
    </div>
  )
}
