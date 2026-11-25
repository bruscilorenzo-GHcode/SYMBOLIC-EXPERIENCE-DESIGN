import * as THREE from 'three'
import type { ArchitecturalItemSpec } from '@aura-spec/design-bridge'
import { useStudioStore } from '../state/store'

export function DesignItems3D() {
  const items = useStudioStore((state) => state.designItems)
  const selectedId = useStudioStore((state) => state.selectedDesignItemId)
  const selectItem = useStudioStore((state) => state.selectDesignItem)

  return (
    <group>
      {items.map((item) => (
        <DesignItem
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={() => selectItem(item.id)}
        />
      ))}
    </group>
  )
}

function DesignItem({
  item,
  selected,
  onSelect,
}: {
  item: ArchitecturalItemSpec
  selected: boolean
  onSelect: () => void
}) {
  const opacity =
    item.kind === 'glass' || item.kind === 'opening'
      ? 0.26
      : item.kind === 'water'
        ? 0.6
        : item.kind === 'canopy'
          ? 0.4
          : item.kind === 'floor'
            ? 0.55
            : 0.82
  const transparent = item.kind === 'glass' || item.kind === 'opening' || item.kind === 'water' || item.kind === 'canopy' || item.kind === 'floor'
  return (
    <mesh
      position={[item.xM, item.baseHeightM + item.heightM / 2, item.zM]}
      rotation={[0, (item.rotationDeg * Math.PI) / 180, 0]}
      castShadow={item.kind !== 'floor' && item.kind !== 'path'}
      receiveShadow
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      {item.kind === 'column' ? (
        <cylinderGeometry args={[item.widthM / 2, item.depthM / 2, item.heightM, 20]} />
      ) : (
        <boxGeometry args={[item.widthM, item.heightM, item.depthM]} />
      )}
      <meshStandardMaterial
        color={selected ? '#ffd166' : item.color}
        emissive={selected ? '#6b4d0b' : '#000000'}
        emissiveIntensity={selected ? 0.5 : 0}
        roughness={item.kind === 'glass' ? 0.1 : 0.75}
        metalness={item.kind === 'glass' ? 0.1 : 0.05}
        transparent={transparent}
        opacity={opacity}
        depthWrite={!transparent}
        side={item.kind === 'glass' ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  )
}
