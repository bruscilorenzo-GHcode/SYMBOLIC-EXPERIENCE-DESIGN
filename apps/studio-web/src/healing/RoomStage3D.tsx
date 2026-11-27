import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { JourneyStage } from './RoomPlan'
import {
  ROOM_OBJECTS,
  SOUND_MODULES,
  lightById,
  planById,
  type RoomDesign,
  type RoomObjectId,
  type SoundModuleId,
} from './roomDesign'

type Preset = 'overview' | 'inside' | 'focus'

interface RoomStage3DProps {
  design: RoomDesign
  journey: JourneyStage
  lang: 'it' | 'en'
}

const FOG: Record<RoomDesign['atmosphere'], string> = {
  forest: '#0e1a13',
  water: '#0a1620',
  breath: '#1a1510',
  twin: '#141020',
  silence: '#0f1113',
}

/**
 * Explorable 3D preview of the configured Healing Room. Orbit to walk around,
 * zoom in/out, and switch between overview, inside and focus. Every object,
 * sound module and light scene from the configurator appears here live.
 */
export function RoomStage3D({ design, journey, lang }: RoomStage3DProps) {
  const [preset, setPreset] = useState<Preset>('overview')
  const [zoom, setZoom] = useState(1)
  const plan = planById(design.plan)
  const light = lightById(design.light)
  const size = Math.max(plan.widthM, plan.depthM)
  const fog = FOG[design.atmosphere]
  const tt = (it: string, en: string): string => (lang === 'it' ? it : en)

  return (
    <div className="hr-3d">
      <Canvas dpr={[1, 1.75]} camera={{ position: [size * 0.7, size * 0.6, size * 0.85], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={[fog]} />
        <fog attach="fog" args={[fog, size * 0.9, size * 3]} />
        <RoomLighting design={design} />
        <RoomShell design={design} />
        <SoundModules modules={design.modules} design={design} />
        <JourneyPulse journey={journey} design={design} />
        <CameraRig preset={preset} zoom={zoom} size={size} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.07}
          minDistance={2.4}
          maxDistance={size * 1.8}
          maxPolarAngle={Math.PI / 2.02}
        />
      </Canvas>
      <div className="hr-3d-presets" role="group" aria-label={tt('Viste', 'Views')}>
        {(['overview', 'inside', 'focus'] as const).map((id) => (
          <button key={id} type="button" aria-pressed={preset === id} className={preset === id ? 'is-active' : ''} onClick={() => setPreset(id)}>
            {id === 'overview' ? tt('Insieme', 'Overview') : id === 'inside' ? tt('Dentro', 'Inside') : tt('Focus', 'Focus')}
          </button>
        ))}
      </div>
      <div className="hr-3d-zoom" role="group" aria-label={tt('Zoom', 'Zoom')}>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.18))} aria-label={tt('Avvicina', 'Zoom in')}>+</button>
        <button type="button" onClick={() => setZoom(1)} aria-label={tt('Ripristina', 'Reset')}>1:1</button>
        <button type="button" onClick={() => setZoom((value) => Math.min(2.1, value + 0.18))} aria-label={tt('Allontana', 'Zoom out')}>−</button>
      </div>
      <p className="hr-3d-hint">
        {tt('Trascina per orbitare · rotella o pinch per zoomare · cambia oggetti, luce e moduli per vedere la stanza trasformarsi', 'Drag to orbit · wheel or pinch to zoom · change objects, light and modules to see the room transform')}
      </p>
      <ul className="hr-3d-chips">
        <li style={{ borderColor: light.color }}><i style={{ background: light.color }} />{tt('Luce', 'Light')}: {lang === 'it' ? light.label.it : light.label.en}</li>
        {design.modules.map((id) => {
          const spec = SOUND_MODULES.find((module) => module.id === id)
          return <li key={id}>{spec ? (lang === 'it' ? spec.label.it : spec.label.en) : id}</li>
        })}
        {design.objects.slice(0, 4).map((id) => {
          const spec = ROOM_OBJECTS.find((object) => object.id === id)
          return <li key={id}>{spec ? (lang === 'it' ? spec.label.it : spec.label.en) : id}</li>
        })}
      </ul>
    </div>
  )
}

function RoomLighting({ design }: { design: RoomDesign }) {
  const light = lightById(design.light)
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const centre = useRef<THREE.PointLight>(null)
  const colorA = useMemo(() => new THREE.Color(light.color), [light.color])
  const colorB = useMemo(() => new THREE.Color(light.glow), [light.glow])
  const mixed = useMemo(() => new THREE.Color(), [])

  useFrame((state) => {
    if (!ambient.current || !key.current || !centre.current) return
    const t = design.light === 'circadian' ? (Math.sin(state.clock.elapsedTime / 24) + 1) / 2 : 0
    mixed.copy(colorA).lerp(colorB, t * 0.8)
    ambient.current.color.copy(mixed)
    ambient.current.intensity = 0.22 + design.lightLevel * 0.55
    key.current.intensity = 0.35 + design.lightLevel * 0.4
    centre.current.color.copy(mixed)
    centre.current.intensity = 0.9 + design.lightLevel * 1.6
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={0.6} />
      <directionalLight ref={key} position={[8, 18, 10]} intensity={0.6} color="#eef2f4" />
      <pointLight ref={centre} position={[0, 3.4, 0]} intensity={1.8} distance={18} color={light.glow} />
    </>
  )
}

function RoomShell({ design }: { design: RoomDesign }) {
  const plan = planById(design.plan)
  const zone = (id: string): string => plan.zones.find((z) => z.id === id)?.color ?? '#cfcdc6'
  const halfW = plan.widthM / 2
  const halfD = plan.depthM / 2
  const has = (id: RoomObjectId): boolean => design.objects.includes(id)

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[plan.widthM + 8, plan.depthM + 8]} />
        <meshStandardMaterial color="#11161a" roughness={0.9} />
      </mesh>

      {plan.id === 'rite' ? (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[halfW - 1, 64]} />
            <meshStandardMaterial color={zone('observation')} roughness={0.65} transparent opacity={0.55} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[4.1, 48]} />
            <meshStandardMaterial color={zone('healing')} roughness={0.5} />
          </mesh>
          {Array.from({ length: 7 }, (_, index) => {
            const angle = (index / 7) * Math.PI * 2 + Math.PI / 14
            const radius = halfW - 3.4
            return (
              <group key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} rotation={[0, -angle, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
                  <planeGeometry args={[3.4, 2.6]} />
                  <meshStandardMaterial color={zone('diagnostic')} roughness={0.7} />
                </mesh>
                <mesh position={[0, 1.4, -1.4]}>
                  <boxGeometry args={[3.4, 2.8, 0.12]} />
                  <meshStandardMaterial color="#e9e6dd" roughness={0.8} />
                </mesh>
              </group>
            )
          })}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, halfD - 2.2]}>
            <planeGeometry args={[6, 4]} />
            <meshStandardMaterial color={zone('vestibule')} roughness={0.8} />
          </mesh>
          {/* outer parapet */}
          {[
            [halfW, 0],
            [-halfW, 0],
            [0, halfD],
            [0, -halfD],
          ].map(([x, z], index) => (
            <mesh key={index} position={[x, 1.2, z]} rotation={[0, index < 2 ? Math.PI / 2 : 0, 0]}>
              <boxGeometry args={[index < 2 ? plan.depthM : plan.widthM, 2.4, 0.2]} />
              <meshStandardMaterial color="#e7e4db" roughness={0.85} />
            </mesh>
          ))}
        </group>
      ) : (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[10.4, 8]} />
            <meshStandardMaterial color={zone('observation')} roughness={0.6} transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[3.6, 48]} />
            <meshStandardMaterial color={zone('focus')} roughness={0.45} />
          </mesh>
          {[0, 1, 2, 3].map((index) => {
            const angle = Math.PI / 4 + (index * Math.PI) / 2
            const radius = 8.2
            return (
              <group key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} rotation={[0, -angle + Math.PI / 4, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
                  <planeGeometry args={[3.2, 3.2]} />
                  <meshStandardMaterial color={zone('diagnostic')} roughness={0.7} />
                </mesh>
                <mesh position={[0, 1.3, -1.3]}>
                  <boxGeometry args={[3.2, 2.6, 0.12]} />
                  <meshStandardMaterial color="#e9e6dd" roughness={0.8} />
                </mesh>
              </group>
            )
          })}
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
            return (
              <mesh key={index} position={[Math.cos(angle) * 10.6, 1.2, Math.sin(angle) * 10.6]} rotation={[0, -angle, 0]}>
                <boxGeometry args={[8.2, 2.4, 0.18]} />
                <meshStandardMaterial color="#e5e2d9" roughness={0.85} />
              </mesh>
            )
          })}
        </group>
      )}

      {/* objects */}
      {has('arches') ? <Arches /> : null}
      {has('garden') ? <Garden /> : null}
      {has('water') ? <Water /> : null}
      {has('disc') ? <CentralDisc /> : null}
      {has('domes') ? <Domes /> : null}
      {has('capsules') ? <Capsules /> : null}
      {has('ledwall') ? <DisplayWalls /> : null}
      {has('talisman') ? <Talisman /> : null}
    </group>
  )
}

function Arches() {
  return (
    <group>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 6.4, 1.6, Math.sin(angle) * 6.4]} rotation={[0, -angle, 0.18]}>
            <boxGeometry args={[0.16, 3.2, 8.6]} />
            <meshStandardMaterial color="#8a6a46" roughness={0.7} />
          </mesh>
        )
      })}
    </group>
  )
}

function Garden() {
  return (
    <group>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2
        const radius = 9.2 + ((index * 7) % 5) * 0.12
        return (
          <group key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <mesh position={[0, 0.12, 0]} scale={[1, 0.45, 1]}>
              <sphereGeometry args={[0.55, 12, 10]} />
              <meshStandardMaterial color={index % 3 ? '#4f9a3a' : '#7cbc56'} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <coneGeometry args={[0.28, 1.1, 8]} />
              <meshStandardMaterial color="#5fa548" roughness={0.9} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 11]}>
      <circleGeometry args={[2.4, 40]} />
      <meshPhysicalMaterial color="#7fb2c9" roughness={0.05} metalness={0.85} clearcoat={1} />
    </mesh>
  )
}

function CentralDisc() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[2.0, 2.1, 0.32, 48]} />
        <meshStandardMaterial color="#b08a5c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.04, 48]} />
        <meshStandardMaterial color="#e9dfc8" roughness={0.35} />
      </mesh>
    </group>
  )
}

function Domes() {
  return (
    <group>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2 + Math.PI / 5
        return (
          <mesh key={index} position={[Math.cos(angle) * 5.4, 0, Math.sin(angle) * 5.4]}>
            <sphereGeometry args={[0.85, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial color="#f4f2ec" transparent opacity={0.55} roughness={0.15} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

function Capsules() {
  return (
    <group>
      {[-1, 0, 1].map((offset, index) => {
        const angle = Math.PI * 0.55 + index * 0.45
        return (
          <mesh
            key={offset}
            position={[Math.cos(angle) * 5.8, 0.45, Math.sin(angle) * 5.8]}
            rotation={[0, -angle, 0]}
            scale={[1, 0.62, 1.25]}
          >
            <sphereGeometry args={[0.62, 20, 16]} />
            <meshStandardMaterial color="#5c6258" roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

function DisplayWalls() {
  return (
    <group>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={index} position={[Math.cos(angle) * 9.6, 1.7, Math.sin(angle) * 9.6]} rotation={[0, -angle, 0]}>
            <planeGeometry args={[2.2, 2.4]} />
            <meshStandardMaterial color="#0b0f12" emissive="#3fd08a" emissiveIntensity={1.2} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

function Talisman() {
  return (
    <group position={[2.2, 0, 12.4]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.8, 20]} />
        <meshStandardMaterial color="#d9d5ca" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#9fe8dc" emissive="#9fe8dc" emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

function SoundModules({ modules, design }: { modules: SoundModuleId[]; design: RoomDesign }) {
  const shower = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Group>(null)
  const dome = useRef<THREE.Mesh>(null)
  const floor = useRef<THREE.Group>(null)
  const walls = useRef<THREE.Group>(null)
  const clock = useRef(0)

  useFrame((_, delta) => {
    clock.current += delta
    const breath = (Math.sin(clock.current * 1.1) + 1) / 2
    if (shower.current) {
      shower.current.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh
        const material = mesh.material as THREE.MeshBasicMaterial
        material.opacity = 0.07 + breath * 0.07 + index * 0.004
      })
      shower.current.scale.setScalar(1 + breath * 0.06)
    }
    if (ring.current) {
      ring.current.rotation.y += delta * 0.12
      ring.current.children.forEach((child, index) => {
        const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        material.emissiveIntensity = 0.5 + ((Math.sin(clock.current * 1.6 + index) + 1) / 2) * 1.4
      })
    }
    if (dome.current) {
      const material = dome.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.08 + breath * 0.1
    }
    if (floor.current) {
      floor.current.children.forEach((child, index) => {
        const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        material.emissiveIntensity = 0.2 + ((Math.sin(clock.current * 1.4 + index * 0.7) + 1) / 2) * 1.1
      })
    }
    if (walls.current) {
      walls.current.children.forEach((child, index) => {
        const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        material.emissiveIntensity = 0.25 + ((Math.sin(clock.current * 0.9 + index) + 1) / 2) * 0.9
      })
    }
  })

  const light = lightById(design.light)
  return (
    <group>
      {modules.includes('shower') ? (
        <group ref={shower} position={[0, 4.4, 0]}>
          {Array.from({ length: 10 }, (_, index) => {
            const angle = (index / 10) * Math.PI * 2
            return (
              <mesh key={index} position={[Math.cos(angle) * 0.5, -2.1, Math.sin(angle) * 0.5]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.02, 4.2, 6]} />
                <meshBasicMaterial color={light.glow} transparent opacity={0.1} />
              </mesh>
            )
          })}
        </group>
      ) : null}
      {modules.includes('ring') ? (
        <group ref={ring}>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index / 8) * Math.PI * 2
            return (
              <mesh key={index} position={[Math.cos(angle) * 9.6, 1.8, Math.sin(angle) * 9.6]}>
                <sphereGeometry args={[0.16, 12, 12]} />
                <meshStandardMaterial color={light.glow} emissive={light.glow} emissiveIntensity={0.9} />
              </mesh>
            )
          })}
        </group>
      ) : null}
      {modules.includes('dome') ? (
        <mesh ref={dome} position={[0, 0.05, 0]}>
          <sphereGeometry args={[5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={light.glow} wireframe transparent opacity={0.1} />
        </mesh>
      ) : null}
      {modules.includes('floor') ? (
        <group ref={floor}>
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index / 12) * Math.PI * 2
            return (
              <mesh key={index} position={[Math.cos(angle) * 2.8, 0.08, Math.sin(angle) * 2.8]}>
                <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
                <meshStandardMaterial color="#2a2f33" emissive={light.glow} emissiveIntensity={0.4} />
              </mesh>
            )
          })}
        </group>
      ) : null}
      {modules.includes('walls') ? (
        <group ref={walls}>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = (index / 6) * Math.PI * 2 + Math.PI / 6
            return (
              <mesh key={index} position={[Math.cos(angle) * 10.4, 1.5, Math.sin(angle) * 10.4]} rotation={[0, -angle, 0]}>
                <planeGeometry args={[1.6, 1.2]} />
                <meshStandardMaterial color="#1a1d1f" emissive={light.glow} emissiveIntensity={0.4} side={THREE.DoubleSide} />
              </mesh>
            )
          })}
        </group>
      ) : null}
      {modules.includes('binaural') ? (
        <group position={[0, 0, 6.4]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.62, 0.62, 2.2, 20, 1, true]} />
            <meshPhysicalMaterial color="#d7dee0" transparent opacity={0.22} roughness={0.1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <sphereGeometry args={[0.28, 18, 18]} />
            <meshStandardMaterial color={light.glow} emissive={light.glow} emissiveIntensity={1.4} />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

const JOURNEY_POSITION: Record<JourneyStage, [number, number]> = {
  lobby: [0, 12.4],
  gallery: [0, 9.4],
  rite: [7.4, 3.2],
  centre: [0, 0],
  world: [2.2, 13.2],
}

function JourneyPulse({ journey, design }: { journey: JourneyStage; design: RoomDesign }) {
  const ring = useRef<THREE.Mesh>(null)
  const light = lightById(design.light)
  useFrame((state) => {
    if (!ring.current) return
    const pulse = (Math.sin(state.clock.elapsedTime * 1.6) + 1) / 2
    ring.current.scale.setScalar(1 + pulse * 0.25)
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.35
  })
  const [x, z] = JOURNEY_POSITION[journey]
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.05, z]}>
      <ringGeometry args={[1.2, 1.45, 48]} />
      <meshBasicMaterial color={light.glow} transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

const PRESETS: Record<Preset, { position: [number, number, number]; target: [number, number, number] }> = {
  overview: { position: [0.72, 0.62, 0.9], target: [0, 0, 0] },
  inside: { position: [0.2, 0.1, 0.3], target: [0, 0.045, 0] },
  focus: { position: [0.09, 0.06, 0.12], target: [0, 0.04, 0] },
}

function CameraRig({ preset, zoom, size }: { preset: Preset; zoom: number; size: number }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null
  const config = PRESETS[preset]
  const goalPosition = useMemo(
    () =>
      new THREE.Vector3(
        config.target[0] + config.position[0] * size * zoom,
        config.target[1] + config.position[1] * size * zoom,
        config.target[2] + config.position[2] * size * zoom,
      ),
    [config, size, zoom],
  )
  const goalTarget = useMemo(() => new THREE.Vector3(...config.target), [config])

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.55)
    camera.position.lerp(goalPosition, alpha)
    if (controls) {
      controls.target.lerp(goalTarget, alpha)
      controls.update()
    }
  })
  return null
}
