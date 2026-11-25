import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type {
  DoppelgangerSpec,
  HealingGoalSpec,
  HealingLayoutId,
  DiagnosticSample,
  HealingZoneId,
} from '@aura-spec/healing-room'
import { healingLayoutById, zoneFootprint } from '@aura-spec/healing-room'

interface HealingSceneProps {
  layout: HealingLayoutId
  zone: HealingZoneId
  samples: DiagnosticSample[]
  doppelganger: DoppelgangerSpec | null
  goal: HealingGoalSpec | null
}

const FOCUS_CENTER: Record<HealingLayoutId, [number, number]> = {
  linear: [14.5, 0],
  concentrated: [0, 0],
}

const CAMERAS: Record<HealingLayoutId, Record<HealingZoneId, { position: [number, number, number]; target: [number, number, number] }>> = {
  linear: {
    vestibule: { position: [-10, 4.2, 11], target: [-17, 1.6, 0] },
    observation: { position: [0, 4.2, 12], target: [0, 1.6, 0] },
    focus: { position: [14.5, 2.6, 7.5], target: [14.5, 1.4, 0] },
  },
  concentrated: {
    vestibule: { position: [1.5, 15, 19], target: [0, 0.5, 0] },
    observation: { position: [0, 7, 13.5], target: [0, 1.6, 0] },
    focus: { position: [3.4, 2.3, 5.6], target: [0, 1.2, 0] },
  },
}

export function HealingScene({ layout, zone, samples, doppelganger, goal }: HealingSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: CAMERAS[layout][zone].position, fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <color attach="background" args={['#050607']} />
      <fog attach="fog" args={['#050607', 26, 70]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[6, 14, 8]} intensity={0.5} color="#e8ecf2" />
      <ZoneShell layout={layout} zone="vestibule" />
      <ZoneShell layout={layout} zone="observation" samples={samples} />
      <ZoneShell layout={layout} zone="focus" />
      {doppelganger ? (
        <DoppelgangerEntity
          doppelganger={doppelganger}
          center={FOCUS_CENTER[layout]}
          active={zone === 'focus'}
        />
      ) : null}
      {goal ? <GoalArtifact goal={goal} center={FOCUS_CENTER[layout]} /> : null}
      <CameraRig layout={layout} zone={zone} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  )
}

function CameraRig({ layout, zone }: { layout: HealingLayoutId; zone: HealingZoneId }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null
  const goalPosition = useMemo(
    () => new THREE.Vector3(...CAMERAS[layout][zone].position),
    [layout, zone],
  )
  const goalTarget = useMemo(
    () => new THREE.Vector3(...CAMERAS[layout][zone].target),
    [layout, zone],
  )

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.7)
    camera.position.lerp(goalPosition, alpha)
    if (controls) {
      controls.target.lerp(goalTarget, alpha)
      controls.update()
    }
  })
  return null
}

function ZoneShell({
  layout,
  zone,
  samples = [],
}: {
  layout: HealingLayoutId
  zone: HealingZoneId
  samples?: DiagnosticSample[]
}) {
  const footprint = useMemo(() => zoneFootprint(layout, zone), [layout, zone])
  const wallColor = zone === 'vestibule' ? '#ffffff' : zone === 'observation' ? '#f2f0ea' : '#0a0a0c'
  const wallHeight = zone === 'focus' ? 3.2 : zone === 'vestibule' ? 4.2 : 4.6

  return (
    <group position={[footprint.xM, 0, footprint.zM]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, zone === 'focus' ? 0.02 : 0.01, 0]}>
        <planeGeometry args={[footprint.widthM, footprint.depthM]} />
        <meshStandardMaterial
          color={zone === 'focus' ? '#0b0b0d' : '#d9d7d0'}
          roughness={zone === 'focus' ? 0.25 : 0.7}
          metalness={zone === 'focus' ? 0.6 : 0.05}
        />
      </mesh>
      {zone === 'focus' ? (
        <mesh position={[0, wallHeight / 2, 0]}>
          <boxGeometry args={[footprint.widthM, wallHeight, footprint.depthM]} />
          <meshStandardMaterial
            color="#050506"
            roughness={0.08}
            metalness={0.92}
            transparent
            opacity={0.92}
          />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, wallHeight / 2, -footprint.depthM / 2]}>
            <boxGeometry args={[footprint.widthM, wallHeight, 0.14]} />
            <meshStandardMaterial color={wallColor} roughness={0.85} />
          </mesh>
          <mesh position={[0, wallHeight / 2, footprint.depthM / 2]}>
            <boxGeometry args={[footprint.widthM, wallHeight, 0.14]} />
            <meshStandardMaterial color={wallColor} roughness={0.85} />
          </mesh>
        </group>
      )}
      {zone === 'observation' ? <NeuronPanels width={footprint.widthM} depth={footprint.depthM} height={wallHeight} samples={samples} /> : null}
      {zone === 'vestibule' && layout === 'concentrated' ? (
        <mesh position={[0, wallHeight + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[footprint.widthM, footprint.depthM]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.9} />
        </mesh>
      ) : null}
    </group>
  )
}

function NeuronPanels({
  width,
  depth,
  height,
  samples,
}: {
  width: number
  depth: number
  height: number
  samples: DiagnosticSample[]
}) {
  const lit = samples.slice(-18)
  const panels = useMemo(() => {
    const items: Array<{ position: [number, number, number]; hue: number; value: number }> = []
    const perWall = 9
    for (let index = 0; index < perWall; index++) {
      const t = (index + 0.5) / perWall
      items.push({ position: [-width / 2 + t * width, 1.2 + ((index * 53) % 170) / 100, -depth / 2 + 0.1], hue: 190 + ((index * 37) % 60), value: 0 })
    }
    return items
  }, [width, depth])

  const group = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!group.current) return
    group.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material as THREE.MeshStandardMaterial
      const sample = lit[index % Math.max(1, lit.length)]
      if (sample && index < samples.length) {
        material.emissive.setStyle(hslCss((190 + CHANNEL_HUE[sample.channel]) % 360, 70, 45))
        material.emissiveIntensity = 0.4 + sample.value * 2.2
      } else {
        material.emissiveIntensity = 0.04
      }
    })
  }, [lit, samples.length])

  return (
    <group ref={group}>
      {panels.map((panel, index) => (
        <mesh key={index} position={panel.position}>
          <sphereGeometry args={[0.16 + (index % 3) * 0.05, 20, 20]} />
          <meshStandardMaterial color="#1c1f24" emissive="#223038" emissiveIntensity={0.04} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, height / 2, depth / 2 - 0.1]}>
        <planeGeometry args={[width * 0.9, height * 0.7]} />
        <meshBasicMaterial color="#0e1116" />
      </mesh>
    </group>
  )
}

const CHANNEL_HUE: Record<DiagnosticSample['channel'], number> = {
  self: 0,
  twin: 40,
  others: 90,
  artefacts: 150,
}

function hslCss(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(0)}, ${s}%, ${l}%)`
}

function DoppelgangerEntity({
  doppelganger,
  center,
  active,
}: {
  doppelganger: DoppelgangerSpec
  center: [number, number]
  active: boolean
}) {
  const body = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const satellitesRef = useRef<THREE.Group>(null)
  const color = useMemo(() => new THREE.Color().setStyle(hslCss(doppelganger.hue, 70, 55)), [doppelganger.hue])
  const clock = useRef(0)

  useFrame((_, delta) => {
    clock.current += delta
    const breath = (Math.sin(clock.current * doppelganger.breathHz * Math.PI * 2) + 1) / 2
    const scale = (active ? 0.55 : 0.34) + breath * 0.12
    if (body.current) {
      body.current.scale.setScalar(scale)
      const material = body.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.6 + breath * 1.4 * (active ? 1 : 0.4)
    }
    if (halo.current) {
      halo.current.rotation.y += delta * 0.3
      halo.current.scale.setScalar(scale * (1.7 + breath * 0.2))
      ;(halo.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + breath * 0.08
    }
    if (satellitesRef.current) {
      satellitesRef.current.rotation.y += delta * (0.25 + doppelganger.complexity * 0.6)
      satellitesRef.current.children.forEach((child, index) => {
        child.position.y = Math.sin(clock.current * 0.7 + index * 1.3) * 0.5
      })
    }
  })

  const satellites = useMemo(
    () =>
      Array.from({ length: doppelganger.satellites }, (_, index) => {
        const angle = (index / doppelganger.satellites) * Math.PI * 2
        return {
          position: [
            Math.cos(angle) * doppelganger.orbitRadiusM,
            0,
            Math.sin(angle) * doppelganger.orbitRadiusM,
          ] as [number, number, number],
          size: 0.05 + ((index * 7) % 5) * 0.02,
        }
      }),
    [doppelganger.satellites, doppelganger.orbitRadiusM],
  )

  return (
    <group position={[center[0], 1.5, center[1]]}>
      <mesh ref={body}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      <group ref={satellitesRef}>
        {satellites.map((satellite, index) => (
          <mesh key={index} position={satellite.position}>
            <sphereGeometry args={[satellite.size, 12, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
      <pointLight color={color} intensity={active ? 3.2 : 1.4} distance={12} />
    </group>
  )
}

function GoalArtifact({ goal, center }: { goal: HealingGoalSpec; center: [number, number] }) {
  const group = useRef<THREE.Group>(null)
  const color = useMemo(() => new THREE.Color().setStyle(hslCss(goal.artifact.hue, 60, 62)), [goal.artifact.hue])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * goal.artifact.rotationHz * Math.PI * 2
    const target = goal.materialisation
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, Math.max(0.001, target), 1 - Math.exp(-delta / 0.4)))
  })

  const { heightM, radiusM, form } = goal.artifact

  return (
    <group position={[center[0], 1.1, center[1]]} ref={group}>
      {form === 'lotus' ? (
        <group>
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[radiusM * 1.5, radiusM * 0.16, 18, 48]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2.6, 0.6, 0]}>
            <torusGeometry args={[radiusM * 1.1, radiusM * 0.13, 18, 48]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, heightM * 0.3, 0]}>
            <sphereGeometry args={[radiusM * 0.5, 24, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
          </mesh>
        </group>
      ) : form === 'monolith' ? (
        <mesh position={[0, heightM / 2, 0]}>
          <boxGeometry args={[radiusM * 0.8, heightM, radiusM * 0.3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} roughness={0.15} metalness={0.8} />
        </mesh>
      ) : form === 'orb' ? (
        <group>
          <mesh position={[0, heightM * 0.4, 0]}>
            <sphereGeometry args={[radiusM, 32, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} roughness={0.1} />
          </mesh>
          <mesh position={[0, heightM * 0.4, 0]}>
            <icosahedronGeometry args={[radiusM * 1.45, 1]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[0, heightM * 0.45, 0]}>
            <icosahedronGeometry args={[radiusM * 1.2, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, heightM * 0.45, 0]} rotation={[0.6, 0.4, 0]}>
            <octahedronGeometry args={[radiusM * 0.7, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} />
          </mesh>
        </group>
      )}
      <pointLight color={color} intensity={2.4 * goal.materialisation} distance={9} position={[0, heightM * 0.6, 0]} />
    </group>
  )
}
