import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStudioStore } from '../state/store'
import { DesignItems3D } from './DesignItems3D'
import { HeatmapPlane } from './HeatmapPlane'
import { RoomMesh } from './RoomMesh'
import { SpeakerNode } from './SpeakerNode'

export function StudioCanvas() {
  const placements = useStudioStore((state) => state.session.speakerPlacements)
  const selectSpeaker = useStudioStore((state) => state.selectSpeaker)
  const appView = useStudioStore((state) => state.appView)
  const specSection = useStudioStore((state) => state.specSection)
  const architectureIntent = useStudioStore((state) => state.architectureIntent)
  const selectDesignItem = useStudioStore((state) => state.selectDesignItem)

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [17, 14, 19], fov: 48 }}
      onPointerMissed={() => {
        selectSpeaker(null)
        selectDesignItem(null)
      }}
    >
      <color attach="background" args={['#0a0e12']} />
      <fog attach="fog" args={['#0a0e12', 38, 90]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[10, 16, 8]} intensity={1.4} castShadow />
      <directionalLight position={[-8, 6, -10]} intensity={0.4} color="#7fb3ff" />
      {specSection === 'geometry' ? <DesignGround /> : <RoomMesh />}
      {specSection === 'geometry' || architectureIntent !== null ? <DesignItems3D /> : null}
      <HeatmapPlane />
      {placements.map((placement) => (
        <SpeakerNode key={placement.id} placementId={placement.id} />
      ))}
      <gridHelper args={[44, 44, '#25333d', '#141c22']} position={[0, -0.02, 0]} />
      <OrbitControls
        makeDefault
        target={[0, 1.6, 0]}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.04}
      />
    </Canvas>
  )
}


function DesignGround() {
  const site = useStudioStore((state) => state.site)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
      <planeGeometry args={[site.widthM, site.depthM]} />
      <meshStandardMaterial color="#101820" roughness={0.96} metalness={0.02} />
    </mesh>
  )
}
