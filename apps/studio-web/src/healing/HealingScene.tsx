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
  StationKind,
} from '@aura-spec/healing-room'
import { healingLayoutById, zoneFootprint } from '@aura-spec/healing-room'

interface HealingSceneProps {
  layout: HealingLayoutId
  zone: HealingZoneId
  station: StationKind
  samples: DiagnosticSample[]
  doppelganger: DoppelgangerSpec | null
  goal: HealingGoalSpec | null
}

const CAMERAS: Record<HealingLayoutId, Record<HealingZoneId, { position: [number, number, number]; target: [number, number, number] }>> = {
  linear: {
    vestibule: { position: [-10, 4.6, 11], target: [-17, 1.6, 0] },
    observation: { position: [0, 4.6, 12.5], target: [0, 1.6, 0] },
    focus: { position: [14.5, 2.4, 5.2], target: [14.5, 1.3, 0] },
  },
  concentrated: {
    vestibule: { position: [2, 15.5, 19.5], target: [0, 0.5, 0] },
    observation: { position: [0, 6.4, 13], target: [0, 1.6, 0] },
    focus: { position: [1.6, 2.2, 4.6], target: [0, 1.2, 0] },
  },
}

export function HealingScene({ layout, zone, station, samples, doppelganger, goal }: HealingSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: CAMERAS[layout][zone].position, fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
      }}
    >
      <color attach="background" args={['#060708']} />
      <fog attach="fog" args={['#060708', 30, 78]} />
      <HealingLights zone={zone} />
      <gridHelper args={[64, 32, '#2a2e31', '#171a1c']} position={[0, -0.01, 0]} />
      <ExhibitionRoom layout={layout} footprintId="vestibule" zone={zone} samples={samples} />
      {layout === 'linear' ? (
        <ExhibitionRoom layout={layout} footprintId="observation" zone={zone} samples={samples} />
      ) : null}
      <BlackCube layout={layout} zone={zone} />
      <DiagnosticCapsules layout={layout} station={station} samples={samples} />
      <KioskTube layout={layout} station={station} />
      <CapsuleArmchairs layout={layout} station={station} />
      {doppelganger ? (
        <DoppelgangerEntity
          doppelganger={doppelganger}
          center={[zoneFootprint(layout, 'focus').xM, zoneFootprint(layout, 'focus').zM]}
          active={zone === 'focus'}
        />
      ) : null}
      {goal ? (
        <GoalArtifact
          goal={goal}
          center={[zoneFootprint(layout, 'focus').xM, zoneFootprint(layout, 'focus').zM]}
        />
      ) : null}
      <CameraRig layout={layout} zone={zone} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2.2}
        maxDistance={32}
        maxPolarAngle={Math.PI / 2.04}
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

/** Zone-modular light scene: vestibule bright, gallery controlled, focus near dark. */
function HealingLights({ zone }: { zone: HealingZoneId }) {
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const targets: Record<HealingZoneId, { ambient: number; key: number }> = {
    vestibule: { ambient: 0.62, key: 1.1 },
    observation: { ambient: 0.3, key: 0.55 },
    focus: { ambient: 0.1, key: 0.12 },
  }

  useFrame((_, delta) => {
    const t = targets[zone]
    const alpha = 1 - Math.exp(-delta / 0.5)
    if (ambient.current) ambient.current.intensity += (t.ambient - ambient.current.intensity) * alpha
    if (key.current) key.current.intensity += (t.key - key.current.intensity) * alpha
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={0.6} />
      <directionalLight ref={key} position={[8, 16, 10]} intensity={1.1} color="#eef1f4" />
    </>
  )
}

function hashModule(seed: number): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < 4; index++) {
    hash ^= (seed >> (index * 8)) & 0xff
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 100
}

type ModuleKind = 'cell' | 'printout' | 'lightbox' | 'led' | 'display'

function moduleKindFor(index: number): ModuleKind {
  const roll = hashModule(index + 17)
  if (roll < 38) return 'cell'
  if (roll < 58) return 'printout'
  if (roll < 74) return 'lightbox'
  if (roll < 92) return 'led'
  return 'display'
}

const CHANNEL_HUE: Record<DiagnosticSample['channel'], number> = {
  self: 168,
  twin: 205,
  others: 262,
  artefacts: 18,
}

function hslCss(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(0)}, ${s}%, ${l}%)`
}

/**
 * The white exhibition space with the modular wall system: steel framing
 * carrying cell-like neuron panels, printouts, light boxes, modular LED
 * screens and displays (GREG/Lorenzo brief, “Modular Division and Display
 * Walls” + “Mood boards — walls”).
 */
function ExhibitionRoom({
  layout,
  footprintId,
  zone,
  samples,
}: {
  layout: HealingLayoutId
  footprintId: 'vestibule' | 'observation'
  zone: HealingZoneId
  samples: DiagnosticSample[]
}) {
  const footprint = zoneFootprint(layout, footprintId)
  const roomWidth = footprint.widthM
  const roomDepth = footprint.depthM
  const wallHeight = 4.8
  const moduleSize = 1.1

  const walls = useMemo(() => {
    const cols = Math.max(2, Math.round(roomWidth / moduleSize))
    const rows = Math.max(2, Math.round(wallHeight / moduleSize))
    const modules: Array<{
      kind: ModuleKind
      position: [number, number, number]
      rotationY: number
      seed: number
    }> = []
    let seed = 0
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const x = -roomWidth / 2 + (col + 0.5) * (roomWidth / cols)
        const y = (row + 0.5) * (wallHeight / rows)
        seed += 1
        modules.push({ kind: moduleKindFor(seed), position: [x, y, -roomDepth / 2 - 0.02], rotationY: 0, seed })
        seed += 1
        modules.push({ kind: moduleKindFor(seed), position: [x, y, roomDepth / 2 + 0.02], rotationY: Math.PI, seed })
      }
    }
    return { modules, cols, rows }
  }, [roomWidth, roomDepth])

  const ledSamples = useMemo(() => samples.slice(-14), [samples])

  return (
    <group position={[footprint.xM, 0, footprint.zM]}>
      {/* technical raised floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[roomWidth + 2, roomDepth + 2]} />
        <meshStandardMaterial color="#cfcdc6" roughness={0.55} metalness={0.08} />
      </mesh>
      {/* dark minimal suspended ceiling */}
      <mesh position={[0, wallHeight + 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomWidth + 2, roomDepth + 2]} />
        <meshStandardMaterial color="#101214" roughness={0.9} />
      </mesh>
      {/* ceiling light coves */}
      <mesh position={[0, wallHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomWidth * 0.5, 0.5]} />
        <meshBasicMaterial color="#f2f4ef" />
      </mesh>
      {walls.modules.map((module, index) => (
        <WallModule
          key={index}
          kind={module.kind}
          position={module.position}
          rotationY={module.rotationY}
          size={{ w: roomWidth / walls.cols, h: wallHeight / walls.rows }}
          seed={module.seed}
          samples={ledSamples}
          zone={zone}
        />
      ))}
      {footprintId === 'vestibule' && layout === 'linear' ? <ReceptionDesk /> : null}
      {footprintId === 'vestibule' && layout === 'concentrated' ? (
        <mesh position={[roomWidth / 2 + 0.05, wallHeight / 2, 0]}>
          <boxGeometry args={[0.12, wallHeight, roomDepth]} />
          <meshStandardMaterial color="#e7e5de" roughness={0.8} />
        </mesh>
      ) : null}
    </group>
  )
}

/** One modular wall unit: steel frame + content (cell, printout, lightbox, LED, display). */
function WallModule({
  kind,
  position,
  rotationY,
  size,
  seed,
  samples,
  zone,
}: {
  kind: ModuleKind
  position: [number, number, number]
  rotationY: number
  size: { w: number; h: number }
  seed: number
  samples: DiagnosticSample[]
  zone: HealingZoneId
}) {
  const lightbox = useRef<THREE.MeshStandardMaterial>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const clock = useRef(0)
  const w = size.w * 0.92
  const h = size.h * 0.9

  useFrame((_, delta) => {
    clock.current += delta
    const breath = (Math.sin(clock.current * 0.9) + 1) / 2
    if (lightbox.current && zone !== 'focus') {
      lightbox.current.emissiveIntensity = 0.5 + breath * 0.5
    }
    if (led.current) {
      led.current.emissiveIntensity = 0.9 + Math.sin(clock.current * 2.3 + seed) * 0.35
    }
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* steel frame */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[size.w, size.h, 0.03]} />
        <meshStandardMaterial color="#3c4043" roughness={0.4} metalness={0.8} />
      </mesh>
      {kind === 'cell' ? (
        <group>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[w, h, 0.02]} />
            <meshStandardMaterial color="#dcdad2" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <torusGeometry args={[Math.min(w, h) * 0.3, Math.min(w, h) * 0.09, 10, 24]} />
            <meshStandardMaterial color="#c9c6bc" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <sphereGeometry args={[Math.min(w, h) * 0.11, 14, 14]} />
            <meshStandardMaterial color="#b9b6aa" roughness={0.6} />
          </mesh>
        </group>
      ) : null}
      {kind === 'printout' ? (
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            color={hslCss((seed * 47) % 360, 26, 62)}
            roughness={0.5}
          />
        </mesh>
      ) : null}
      {kind === 'lightbox' ? (
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[w, h, 0.04]} />
          <meshStandardMaterial ref={lightbox} color="#f4f3ec" emissive="#f4f3ec" emissiveIntensity={0.7} />
        </mesh>
      ) : null}
      {kind === 'led' ? (
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[w, h, 0.03]} />
          <meshStandardMaterial ref={led} color="#0a0c0e" emissive="#274" emissiveIntensity={0.9} />
        </mesh>
      ) : null}
      {kind === 'display' ? (
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[w, h, 0.02]} />
          <meshStandardMaterial color="#14181b" roughness={0.18} metalness={0.7} />
        </mesh>
      ) : null}
      {zone !== 'focus' && kind === 'led' && samples.length > 0 ? (
        <LedData sample={samples[seed % samples.length]} y={h * 0.28} />
      ) : null}
    </group>
  )
}

/** A modular LED screen displaying one diagnostic sample (data as image). */
function LedData({ sample, y }: { sample: DiagnosticSample; y: number }) {
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const hue = CHANNEL_HUE[sample.channel]
  useEffect(() => {
    if (material.current) {
      material.current.color.setStyle(hslCss(hue, 72, Math.round(18 + sample.value * 44)))
    }
  }, [hue, sample.value])
  return (
    <mesh position={[0, y, 0.05]}>
      <planeGeometry args={[0.34, 0.24]} />
      <meshBasicMaterial ref={material} color="#122" />
    </mesh>
  )
}

function ReceptionDesk() {
  return (
    <group position={[-5.4, 0, 2.6]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.6, 1.1, 0.9]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[2.0, 0.9, 0.06]} />
        <meshStandardMaterial color="#14181b" roughness={0.2} metalness={0.6} emissive="#1d2c30" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/**
 * The black shiny reflective cubic structure with entrance door, containing
 * the focus area (brief, “Mood boards — spaces”).
 */
function BlackCube({ layout, zone }: { layout: HealingLayoutId; zone: HealingZoneId }) {
  const footprint = zoneFootprint(layout, 'focus')
  const size = layout === 'concentrated' ? 6.2 : 7.5
  const height = 3.4
  const doorWidth = 1.5
  const wall = 0.16

  const finish = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#050607',
        metalness: 0.96,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
    [],
  )

  const doorX = footprint.xM
  const doorZ = footprint.zM + size / 2

  return (
    <group position={[footprint.xM, 0, footprint.zM]}>
      {/* back and side walls */}
      <mesh position={[0, height / 2, -size / 2]} material={finish}>
        <boxGeometry args={[size, height, wall]} />
      </mesh>
      <mesh position={[-size / 2, height / 2, 0]} material={finish}>
        <boxGeometry args={[wall, height, size]} />
      </mesh>
      <mesh position={[size / 2, height / 2, 0]} material={finish}>
        <boxGeometry args={[wall, height, size]} />
      </mesh>
      {/* front wall with entrance door */}
      <group position={[0, height / 2, size / 2]}>
        <mesh position={[-(size / 4 + doorWidth / 4), 0, 0]} material={finish}>
          <boxGeometry args={[size / 2 - doorWidth / 2, height, wall]} />
        </mesh>
        <mesh position={[size / 4 + doorWidth / 4, 0, 0]} material={finish}>
          <boxGeometry args={[size / 2 - doorWidth / 2, height, wall]} />
        </mesh>
        <mesh position={[0, height / 2 + 0.35, 0]} material={finish}>
          <boxGeometry args={[doorWidth + 0.3, height / 2 - 0.35, wall]} />
        </mesh>
        {/* door frame light */}
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[doorWidth, height * 0.62]} />
          <meshBasicMaterial color="#cfd8d4" transparent opacity={zone === 'focus' ? 0.04 : 0.1} />
        </mesh>
      </group>
      {/* roof */}
      <mesh position={[0, height + wall / 2, 0]} material={finish}>
        <boxGeometry args={[size + wall, wall, size + wall]} />
      </mesh>
      {/* inner floor of the cube */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#0b0c0e" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* signage above the door, like the brief kiosk typography */}
      <mesh position={[0, height * 0.78, size / 2 + 0.02]}>
        <planeGeometry args={[1.9, 0.34]} />
        <meshBasicMaterial color="#e9eceb" />
      </mesh>
      <pointLight position={[0, height - 0.6, 0]} intensity={zone === 'focus' ? 1.4 : 0.5} distance={9} color="#dfe8e4" />
      <mesh position={[doorX - footprint.xM, 0.001, doorZ - footprint.zM + 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 3]} />
        <meshBasicMaterial color="#3a423f" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

/** Diagnostic capsules A–D: standing domes with inner spherical displays. */
function DiagnosticCapsules({
  layout,
  station,
  samples,
}: {
  layout: HealingLayoutId
  station: StationKind
  samples: DiagnosticSample[]
}) {
  if (station === 'kiosk-4') return null
  const footprint = zoneFootprint(layout, 'observation')
  const channels: DiagnosticSample['channel'][] = ['self', 'twin', 'others', 'artefacts']
  const positions: Array<[number, number]> = [
    [-footprint.widthM / 2 + 2.2, -footprint.depthM / 2 + 2.2],
    [footprint.widthM / 2 - 2.2, -footprint.depthM / 2 + 2.2],
    [-footprint.widthM / 2 + 2.2, footprint.depthM / 2 - 2.2],
    [footprint.widthM / 2 - 2.2, footprint.depthM / 2 - 2.2],
  ]

  return (
    <group>
      {positions.map(([x, z], index) => {
        const channel = channels[index]!
        const channelSamples = samples.filter((sample) => sample.channel === channel)
        const value = channelSamples.length > 0 ? channelSamples[channelSamples.length - 1]!.value : 0
        return (
          <group key={channel} position={[footprint.xM + x, 0, footprint.zM + z]}>
            {/* standing dome shell */}
            <mesh position={[0, 1.15, 0]}>
              <cylinderGeometry args={[0.85, 0.85, 2.3, 24, 1, true]} />
              <meshPhysicalMaterial color="#cfd8dc" transparent opacity={0.16} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 2.32, 0]}>
              <sphereGeometry args={[0.85, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshPhysicalMaterial color="#cfd8dc" transparent opacity={0.16} roughness={0.1} side={THREE.DoubleSide} />
            </mesh>
            {/* spherical display inside */}
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[0.42, 24, 24]} />
              <meshStandardMaterial
                color={hslCss(CHANNEL_HUE[channel], 64, 34)}
                emissive={hslCss(CHANNEL_HUE[channel], 72, 46)}
                emissiveIntensity={0.25 + value * 2.4}
                roughness={0.3}
              />
            </mesh>
            {/* plinth + label strip */}
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.9, 24]} />
              <meshStandardMaterial color="#b9b7ae" roughness={0.6} />
            </mesh>
            <mesh position={[0, 2.9, 0]}>
              <planeGeometry args={[0.8, 0.18]} />
              <meshBasicMaterial color="#e8ebe9" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** 4 m² kiosk station: isolation tube, “analogue VR”, spherical screen + sound shower. */
function KioskTube({ layout, station }: { layout: HealingLayoutId; station: StationKind }) {
  if (station !== 'kiosk-4') return null
  const footprint = zoneFootprint(layout, 'observation')
  const shower = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!shower.current) return
    const t = state.clock.elapsedTime
    shower.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = 0.1 + 0.08 * (Math.sin(t * 1.6 + index * 1.7) + 1)
    })
  })

  return (
    <group position={[footprint.xM - footprint.widthM / 4, 0, footprint.zM]}>
      {/* glass tube */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 2.6, 28, 1, true]} />
        <meshPhysicalMaterial color="#d7dee0" transparent opacity={0.18} roughness={0.06} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <sphereGeometry args={[0.75, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#d7dee0" transparent opacity={0.18} roughness={0.06} side={THREE.DoubleSide} />
      </mesh>
      {/* spherical screen */}
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.46, 28, 28]} />
        <meshStandardMaterial color="#0d2a2f" emissive="#2fd0bb" emissiveIntensity={1.6} roughness={0.25} />
      </mesh>
      {/* sound shower cone */}
      <group ref={shower} position={[0, 2.35, 0]}>
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index / 10) * Math.PI * 2
          return (
            <mesh key={index} position={[Math.cos(angle) * 0.34, -0.8, Math.sin(angle) * 0.34]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.012, 0.7, 6]} />
              <meshBasicMaterial color="#9fe8dc" transparent opacity={0.14} />
            </mesh>
          )
        })}
      </group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 28]} />
        <meshStandardMaterial color="#b9b7ae" roughness={0.6} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} intensity={1.2} distance={5} color="#8fe3d4" />
    </group>
  )
}

/** 16 m² capsule station: bioshape armchairs around one central thought. */
function CapsuleArmchairs({ layout, station }: { layout: HealingLayoutId; station: StationKind }) {
  if (station !== 'capsule-16') return null
  const footprint = zoneFootprint(layout, 'focus')
  return (
    <group position={[footprint.xM, 0, footprint.zM + footprint.depthM / 2 - 1.6]}>
      {[-1.1, 0, 1.1].map((x, index) => (
        <group key={index} position={[x, 0, Math.abs(x) * 0.22]}>
          <mesh position={[0, 0.32, 0]} scale={[1, 0.5, 1.2]}>
            <sphereGeometry args={[0.55, 20, 16]} />
            <meshStandardMaterial color="#5c6258" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.72, -0.38]} scale={[1, 1.1, 0.4]}>
            <sphereGeometry args={[0.42, 18, 14]} />
            <meshStandardMaterial color="#565c52" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.15, -1.6]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color="#0d2a2f" emissive="#2fd0bb" emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
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
    const scale = (active ? 0.5 : 0.3) + breath * 0.11
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
    <group position={[center[0], 1.6, center[1]]}>
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
      <pointLight color={color} intensity={active ? 3 : 1.2} distance={12} />
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
    <group position={[center[0], 1.0, center[1]]} ref={group}>
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
