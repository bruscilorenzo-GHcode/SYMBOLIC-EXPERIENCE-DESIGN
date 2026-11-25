import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useStudioStore } from '../state/store'
import { PolarBalloon } from './PolarBalloon'

export function SpeakerNode({ placementId }: { placementId: string }) {
  const placement = useStudioStore((state) =>
    state.session.speakerPlacements.find((item) => item.id === placementId),
  )
  const profile = useStudioStore((state) =>
    state.profiles.find((item) => item.id === placement?.profileId),
  )
  const selected = useStudioStore((state) => state.selectedSpeakerId === placementId)
  const showPolar = useStudioStore((state) => state.showPolar)
  const appView = useStudioStore((state) => state.appView)
  const frequencyHz = useStudioStore((state) => state.frequencyHz)
  const selectSpeaker = useStudioStore((state) => state.selectSpeaker)

  if (!placement || !profile) return null

  const [yaw, pitch, roll] = placement.orientationDeg
  const onSelect = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation()
    selectSpeaker(placement.id)
  }

  return (
    <group
      position={placement.positionM}
      rotation={[
        (pitch * Math.PI) / 180,
        (yaw * Math.PI) / 180,
        (roll * Math.PI) / 180,
      ]}
      onClick={onSelect}
    >
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.32, 0.82, 0.32]} />
        <meshStandardMaterial
          color={selected ? '#ffd166' : '#8ad7c1'}
          emissive={selected ? '#7a5a10' : '#000000'}
          emissiveIntensity={selected ? 0.6 : 0}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.11, 0.28, 14]} />
        <meshBasicMaterial color={selected ? '#ffd166' : '#c8f3e7'} />
      </mesh>
      {showPolar && appView === 'spec' ? <PolarBalloon profile={profile} frequencyHz={frequencyHz} /> : null}
      <SpeakerTag label={placement.label} code={profile.model.code} selected={selected} />
    </group>
  )
}


function SpeakerTag({
  label,
  code,
  selected,
}: {
  label: string
  code: string
  selected: boolean
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = 'rgba(9, 14, 18, 0.82)'
      context.strokeStyle = selected ? 'rgba(255, 209, 102, 0.95)' : 'rgba(74, 98, 112, 0.9)'
      context.lineWidth = 4
      context.beginPath()
      context.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 18)
      context.fill()
      context.stroke()
      context.textAlign = 'center'
      context.fillStyle = selected ? '#ffe7ad' : '#d7e4ec'
      context.font = '600 42px Inter, system-ui, sans-serif'
      context.fillText(label, canvas.width / 2, 58)
      context.fillStyle = '#8fa3af'
      context.font = '400 26px Inter, system-ui, sans-serif'
      context.fillText(code, canvas.width / 2, 96)
    }
    const next = new THREE.CanvasTexture(canvas)
    next.minFilter = THREE.LinearFilter
    next.magFilter = THREE.LinearFilter
    next.needsUpdate = true
    return next
  }, [label, code, selected])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite position={[0, 0.72, 0]} scale={[2.3, 0.58, 1]} renderOrder={4}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
