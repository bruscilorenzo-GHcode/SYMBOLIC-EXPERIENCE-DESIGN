import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStudioStore } from '../state/store'

export function RoomMesh() {
  const environment = useStudioStore((state) => state.environment)
  const footprint =
    environment.zones.find((zone) => zone.id === 'zone-courtyard')?.footprint ??
    environment.listenerPlanes[0]?.footprint ??
    []

  const resources = useMemo(() => {
    const shape = new THREE.Shape()
    footprint.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z)
      else shape.lineTo(x, -z)
    })
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 7, bevelEnabled: false })
    geometry.rotateX(-Math.PI / 2)
    const edges = new THREE.EdgesGeometry(geometry, 30)
    return { geometry, edges }
  }, [footprint])

  useEffect(
    () => () => {
      resources.geometry.dispose()
      resources.edges.dispose()
    },
    [resources],
  )

  return (
    <group>
      <mesh geometry={resources.geometry} receiveShadow>
        <meshStandardMaterial
          color="#33414a"
          roughness={0.92}
          metalness={0.05}
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={resources.edges}>
        <lineBasicMaterial color="#5f7f8b" transparent opacity={0.7} />
      </lineSegments>
    </group>
  )
}
