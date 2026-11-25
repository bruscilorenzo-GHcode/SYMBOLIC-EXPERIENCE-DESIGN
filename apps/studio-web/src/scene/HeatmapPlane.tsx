import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SplSource } from '@aura-spec/core-acoustics'
import { heatmapToPngData, sampleListenerPlane } from '@aura-spec/core-acoustics'
import { useStudioStore } from '../state/store'

export function HeatmapPlane() {
  const environment = useStudioStore((state) => state.environment)
  const session = useStudioStore((state) => state.session)
  const profiles = useStudioStore((state) => state.profiles)
  const frequencyHz = useStudioStore((state) => state.frequencyHz)
  const showHeatmap = useStudioStore((state) => state.showHeatmap)

  const result = useMemo(() => {
    const plane = environment.listenerPlanes[0]
    if (!plane) return null
    const sources = session.speakerPlacements.flatMap((placement): SplSource[] => {
      const profile = profiles.find((item) => item.id === placement.profileId)
      if (!profile) return []
      return [
        {
          id: placement.id,
          positionM: placement.positionM,
          orientationDeg: placement.orientationDeg,
          profile,
          inputPowerW: 1,
          gainDb: placement.gainDb,
        },
      ]
    })
    return sampleListenerPlane({
      plane,
      sources,
      frequencyHz,
      conditions: session.conditions,
    })
  }, [environment, session.speakerPlacements, session.conditions, profiles, frequencyHz])

  const texture = useMemo(() => {
    if (!result) return null
    const data = new Uint8ClampedArray(heatmapToPngData(result, result.stats.minDb, result.stats.maxDb))
    const next = new THREE.DataTexture(data, result.width, result.height, THREE.RGBAFormat)
    next.minFilter = THREE.LinearFilter
    next.magFilter = THREE.LinearFilter
    next.needsUpdate = true
    return next
  }, [result])

  useEffect(
    () => () => {
      texture?.dispose()
    },
    [texture],
  )

  if (!showHeatmap || !result || !texture) return null

  const widthM = (result.width - 1) * result.cellSizeM
  const heightM = (result.height - 1) * result.cellSizeM
  const centerX = result.originM[0] + widthM / 2
  const centerZ = result.originM[1] + heightM / 2
  const plane = environment.listenerPlanes[0]

  return (
    <mesh
      position={[centerX, (plane?.heightM ?? 1.2) + 0.02, centerZ]}
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.7}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
