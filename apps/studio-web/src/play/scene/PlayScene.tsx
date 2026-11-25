import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type {
  PlayComposition,
  PlayObjectSpec,
  PlayPalette,
  PlayRenderModeDefinition,
} from '@aura-spec/play-engine'

const WATER_CENTER: [number, number] = [3.8, 2.2]

interface PlaySceneProps {
  composition: PlayComposition
  palette: PlayPalette
  mode: PlayRenderModeDefinition
  objects?: PlayObjectSpec[]
  /** Hero embeds disable orbiting so the page can scroll naturally. */
  interactive?: boolean
  cameraPosition?: [number, number, number]
  cameraTarget?: [number, number, number]
  exposure?: number
  autoRotate?: boolean
}

export function PlayScene({
  composition,
  palette,
  mode,
  objects = [],
  interactive = true,
  cameraPosition = [16, 10.5, 19],
  cameraTarget = [0, 1.8, 0],
  exposure = 0.74,
  autoRotate = true,
}: PlaySceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: cameraPosition, fov: 47 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = exposure
      }}
    >
      <fog attach="fog" args={[palette.fog, 22, 52]} />
      <FogTransition palette={palette} light={composition.parameters.light} />
      <PlayLights composition={composition} palette={palette} />
      <PlayAtmosphere light={composition.parameters.light} mode={mode} palette={palette} baseExposure={exposure} />
      <SkyDome palette={palette} mode={mode} light={composition.parameters.light} timeScale={composition.parameters.wind} />
      <GroundShader composition={composition} palette={palette} />
      <WaterSurface composition={composition} palette={palette} />
      <CanopyAura composition={composition} palette={palette} />
      <PlantingScape composition={composition} palette={palette} />
      <StoneGarden composition={composition} palette={palette} />
      <PlacedObjects objects={objects} palette={palette} />
      <VisitorOrbs composition={composition} palette={palette} />
      <PollenField composition={composition} palette={palette} mode={mode} />
      <LightShafts composition={composition} palette={palette} />
      <OrbitControls
        makeDefault
        enabled={interactive}
        enableZoom={interactive}
        enablePan={interactive}
        enableRotate={interactive}
        target={cameraTarget}
        minDistance={7}
        maxDistance={34}
        maxPolarAngle={Math.PI / 2.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.08 + composition.parameters.wind * 0.42}
        enableDamping
        dampingFactor={0.045}
      />
    </Canvas>
  )
}

function PlayLights({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const light = composition.parameters.light
  const hemi = useRef<THREE.HemisphereLight>(null)
  const dir = useRef<THREE.DirectionalLight>(null)
  const waterLight = useRef<THREE.PointLight>(null)
  const canopyLight = useRef<THREE.PointLight>(null)
  const targets = useRef({
    sky: new THREE.Color(palette.skyHorizon),
    ground: new THREE.Color(palette.groundShadow),
    sun: new THREE.Color(palette.sun),
    water: new THREE.Color(palette.waterGlow),
    glow: new THREE.Color(palette.glow),
  })

  useEffect(() => {
    targets.current.sky.set(palette.skyHorizon)
    targets.current.ground.set(palette.groundShadow)
    targets.current.sun.set(palette.sun)
    targets.current.water.set(palette.waterGlow)
    targets.current.glow.set(palette.glow)
  }, [palette])

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.18)
    hemi.current?.color.lerp(targets.current.sky, alpha)
    hemi.current?.groundColor.lerp(targets.current.ground, alpha)
    dir.current?.color.lerp(targets.current.sun, alpha)
    waterLight.current?.color.lerp(targets.current.water, alpha)
    canopyLight.current?.color.lerp(targets.current.glow, alpha)
  })

  return (
    <>
      <ambientLight intensity={0.02 + light * 0.24} />
      <hemisphereLight ref={hemi} args={[palette.skyHorizon, palette.groundShadow, 0.04 + light * 0.6]} />
      <directionalLight ref={dir} position={[-9, 15, -7]} intensity={0.08 + light * 2.0} color={palette.sun} />
      <pointLight ref={waterLight} position={[WATER_CENTER[0], 1.8, WATER_CENTER[1]]} intensity={0.25 + composition.parameters.water * 0.75} distance={11} color={palette.waterGlow} />
      <pointLight ref={canopyLight} position={[0, composition.geometry.canopyHeightM * 0.82, -1]} intensity={0.12 + light * 0.38} distance={10} color={palette.glow} />
    </>
  )
}

function FogTransition({ palette, light }: { palette: PlayPalette; light: number }) {
  const scene = useThree((state) => state.scene)
  const target = useRef(new THREE.Color(palette.fog))
  const targetNear = useRef(24 - light * 7)
  const targetFar = useRef(62 + light * 24)

  useEffect(() => {
    target.current.set(palette.fog)
    targetNear.current = 24 - light * 7
    targetFar.current = 62 + light * 24
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color(palette.fog)
  }, [palette.fog, light, scene])

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.18)
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(target.current, alpha)
      scene.fog.near += (targetNear.current - scene.fog.near) * alpha
      scene.fog.far += (targetFar.current - scene.fog.far) * alpha
    }
    if (scene.background instanceof THREE.Color) scene.background.lerp(target.current, alpha)
  })
  return null
}

function PlayAtmosphere({
  light,
  mode,
  palette,
  baseExposure,
}: {
  light: number
  mode: PlayRenderModeDefinition
  palette: PlayPalette
  baseExposure: number
}) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const nightFactor = mode.id === 'notturno' ? 0.88 : 1
    gl.toneMappingExposure = baseExposure * (0.42 + light * 1.18) * nightFactor
  }, [gl, scene, light, mode.id, palette, baseExposure])

  return null
}

function SkyDome({
  palette,
  mode,
  light,
  timeScale,
}: {
  palette: PlayPalette
  mode: PlayRenderModeDefinition
  light: number
  timeScale: number
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(palette.skyTop) },
      uHorizon: { value: new THREE.Color(palette.skyHorizon) },
      uSun: { value: new THREE.Color(palette.sun) },
      uGlow: { value: new THREE.Color(palette.glow) },
      uTime: { value: 0 },
      uLight: { value: light },
      uAurora: { value: mode.id === 'aurora' ? 1 : mode.id === 'notturno' ? 0.25 : 0.08 },
      uWind: { value: timeScale },
    }),
    [],
  )
  const targets = useRef({
    top: new THREE.Color(palette.skyTop),
    horizon: new THREE.Color(palette.skyHorizon),
    sun: new THREE.Color(palette.sun),
    glow: new THREE.Color(palette.glow),
  })

  useEffect(() => {
    targets.current.top.set(palette.skyTop)
    targets.current.horizon.set(palette.skyHorizon)
    targets.current.sun.set(palette.sun)
    targets.current.glow.set(palette.glow)
    uniforms.uLight.value = light
    uniforms.uWind.value = timeScale
    uniforms.uAurora.value = mode.id === 'aurora' ? 1 : mode.id === 'notturno' ? 0.25 : 0.08
  }, [light, mode.id, palette, timeScale, uniforms])

  useFrame(({ clock }, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.18)
    uniforms.uTop.value.lerp(targets.current.top, alpha)
    uniforms.uHorizon.value.lerp(targets.current.horizon, alpha)
    uniforms.uSun.value.lerp(targets.current.sun, alpha)
    uniforms.uGlow.value.lerp(targets.current.glow, alpha)
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh>
      <sphereGeometry args={[68, 40, 26]} />
      <shaderMaterial
        ref={material}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={SKY_VERTEX}
        fragmentShader={SKY_FRAGMENT}
      />
    </mesh>
  )
}

function GroundShader({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uGround: { value: new THREE.Color(palette.ground) },
      uShadow: { value: new THREE.Color(palette.groundShadow) },
      uStone: { value: new THREE.Color(palette.stone) },
      uFoliage: { value: new THREE.Color(palette.foliage) },
      uGlow: { value: new THREE.Color(palette.glow) },
      uFog: { value: new THREE.Color(palette.fog) },
      uTime: { value: 0 },
      uCanopy: { value: composition.parameters.canopy },
      uStoneAmount: { value: composition.parameters.stone },
      uSeason: { value: composition.season.value },
      uWind: { value: composition.parameters.wind },
      uLight: { value: composition.parameters.light },
    }),
    [],
  )

  const targets = useRef({
    ground: new THREE.Color(palette.ground),
    shadow: new THREE.Color(palette.groundShadow),
    stone: new THREE.Color(palette.stone),
    foliage: new THREE.Color(palette.foliage),
    glow: new THREE.Color(palette.glow),
    fog: new THREE.Color(palette.fog),
  })

  useEffect(() => {
    targets.current.ground.set(palette.ground)
    targets.current.shadow.set(palette.groundShadow)
    targets.current.stone.set(palette.stone)
    targets.current.foliage.set(palette.foliage)
    targets.current.glow.set(palette.glow)
    targets.current.fog.set(palette.fog)
    uniforms.uCanopy.value = composition.parameters.canopy
    uniforms.uStoneAmount.value = composition.parameters.stone
    uniforms.uSeason.value = composition.season.value
    uniforms.uWind.value = composition.parameters.wind
    uniforms.uLight.value = composition.parameters.light
  }, [composition, palette, uniforms])

  useFrame(({ clock }, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.18)
    uniforms.uGround.value.lerp(targets.current.ground, alpha)
    uniforms.uShadow.value.lerp(targets.current.shadow, alpha)
    uniforms.uStone.value.lerp(targets.current.stone, alpha)
    uniforms.uFoliage.value.lerp(targets.current.foliage, alpha)
    uniforms.uGlow.value.lerp(targets.current.glow, alpha)
    uniforms.uFog.value.lerp(targets.current.fog, alpha)
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[62, 48, 1, 1]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={GROUND_VERTEX} fragmentShader={GROUND_FRAGMENT} />
    </mesh>
  )
}

function WaterSurface({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uWater: { value: new THREE.Color(palette.water) },
      uGlow: { value: new THREE.Color(palette.waterGlow) },
      uSky: { value: new THREE.Color(palette.skyHorizon) },
      uTime: { value: 0 },
      uWind: { value: composition.parameters.wind },
      uLight: { value: composition.parameters.light },
      uDepth: { value: composition.parameters.water },
    }),
    [],
  )

  const targets = useRef({
    water: new THREE.Color(palette.water),
    glow: new THREE.Color(palette.waterGlow),
    sky: new THREE.Color(palette.skyHorizon),
  })

  useEffect(() => {
    targets.current.water.set(palette.water)
    targets.current.glow.set(palette.waterGlow)
    targets.current.sky.set(palette.skyHorizon)
    uniforms.uWind.value = composition.parameters.wind
    uniforms.uLight.value = composition.parameters.light
    uniforms.uDepth.value = composition.parameters.water
  }, [composition, palette, uniforms])

  useFrame(({ clock }, delta) => {
    const alpha = 1 - Math.exp(-delta / 0.18)
    uniforms.uWater.value.lerp(targets.current.water, alpha)
    uniforms.uGlow.value.lerp(targets.current.glow, alpha)
    uniforms.uSky.value.lerp(targets.current.sky, alpha)
    uniforms.uTime.value = clock.elapsedTime
  })

  if (composition.parameters.water < 0.08) return null
  return (
    <mesh
      position={[WATER_CENTER[0], composition.geometry.waterLevelM + 0.02, WATER_CENTER[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={2}
    >
      <circleGeometry args={[composition.geometry.waterRadiusM, 72]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        vertexShader={WATER_VERTEX}
        fragmentShader={WATER_FRAGMENT}
      />
    </mesh>
  )
}

function CanopyAura({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const light = composition.parameters.light
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    if (group.current) {
      group.current.rotation.y = time * 0.025 * (0.4 + composition.parameters.wind)
    }
    if (ring.current) {
      const pulse = 1 + Math.sin(time * 0.34 + composition.parameters.wind * 4) * 0.014
      ring.current.scale.setScalar(pulse)
    }
  })
  const opacity = 0.035 + composition.parameters.canopy * 0.11
  return (
    <group ref={group} position={[0, 0, -1.2]}>
      <mesh
        ref={ring}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, composition.geometry.canopyHeightM, 0]}
      >
        <ringGeometry args={[composition.geometry.canopyRadiusM * 0.84, composition.geometry.canopyRadiusM, 80]} />
        <meshBasicMaterial
          color={palette.glow}
          transparent
          opacity={0.016 + composition.parameters.canopy * 0.048}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.017, 0]}>
        <ringGeometry args={[composition.geometry.canopyRadiusM * 0.92, composition.geometry.canopyRadiusM * 0.94, 80]} />
        <meshBasicMaterial
          color={palette.foliage}
          transparent
          opacity={0.09 + composition.geometry.canopyCoverage * 0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <mesh
            key={index}
            position={[
              Math.cos(angle) * composition.geometry.canopyRadiusM * 0.92,
              composition.geometry.canopyHeightM * (0.58 + (index % 3) * 0.075),
              Math.sin(angle) * composition.geometry.canopyRadiusM * 0.92,
            ]}
          >
            <icosahedronGeometry args={[0.3 + composition.parameters.canopy * 0.6, 1]} />
            <meshStandardMaterial
              color={palette.foliage}
              roughness={0.88}
              metalness={0.02}
              transparent
              opacity={0.2 + composition.parameters.canopy * 0.4}
            />
          </mesh>
        )
      })}
      <pointLight
        position={[0, composition.geometry.canopyHeightM * 0.7, 0]}
        intensity={light * 0.42}
        distance={8}
        color={palette.glow}
      />
    </group>
  )
}

interface PlantDatum {
  x: number
  z: number
  scale: number
  phase: number
  rotation: number
}

function makePlants(count: number, seed: number, waterRadius: number): PlantDatum[] {
  const random = seeded(seed)
  const plants: PlantDatum[] = []
  let guard = 0
  while (plants.length < count && guard < count * 30) {
    guard += 1
    const x = (random() - 0.5) * 21
    const z = (random() - 0.5) * 13.5
    if (Math.hypot(x - WATER_CENTER[0], z - WATER_CENTER[1]) < waterRadius + 0.9) continue
    plants.push({
      x,
      z,
      scale: 0.72 + random() * 0.52,
      phase: random() * Math.PI * 2,
      rotation: random() * Math.PI * 2,
    })
  }
  return plants
}

function PlantingScape({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const waterRadius = composition.geometry.waterRadiusM
  const groundCoverCount = Math.min(170, composition.geometry.groundCoverCount)
  const shrubCount = Math.min(52, composition.geometry.shrubCount)
  const treeCount = Math.min(30, composition.geometry.treeCount)
  const largeCount = Math.max(1, Math.round(treeCount * 0.22))
  const mediumCount = Math.max(1, Math.round(treeCount * 0.36))
  const smallCount = Math.max(1, treeCount - largeCount - mediumCount)

  const groundCover = useMemo(() => makePlants(groundCoverCount, 17, waterRadius), [groundCoverCount, waterRadius])
  const shrubs = useMemo(() => makePlants(shrubCount, 29, waterRadius + 0.4), [shrubCount, waterRadius])
  const small = useMemo(() => makePlants(smallCount, 41, waterRadius + 1.4), [smallCount, waterRadius])
  const medium = useMemo(() => makePlants(mediumCount, 53, waterRadius + 1.8), [mediumCount, waterRadius])
  const large = useMemo(() => makePlants(largeCount, 67, waterRadius + 2.2), [largeCount, waterRadius])

  return (
    <group>
      <ScatterLayer
        key={`ground-${groundCover.length}`}
        plants={groundCover}
        kind="ground"
        color={palette.foliage}
        wind={composition.parameters.wind}
        season={composition.season.value}
        bloom={composition.materials.bloom}
      />
      <ScatterLayer
        key={`shrub-${shrubs.length}`}
        plants={shrubs}
        kind="shrub"
        color={palette.foliage}
        wind={composition.parameters.wind}
        season={composition.season.value}
        bloom={composition.materials.bloom}
      />
      <TreeStratum
        key={`small-${small.length}`}
        plants={small}
        height={2.4}
        crownSize={0.95}
        color={palette.foliage}
        wind={composition.parameters.wind}
        season={composition.season.value}
      />
      <TreeStratum
        key={`medium-${medium.length}`}
        plants={medium}
        height={5.4}
        crownSize={1.5}
        color={palette.foliage}
        wind={composition.parameters.wind}
        season={composition.season.value}
      />
      <TreeStratum
        key={`large-${large.length}`}
        plants={large}
        height={9.4}
        crownSize={2.2}
        color={palette.foliage}
        wind={composition.parameters.wind}
        season={composition.season.value}
      />
    </group>
  )
}

function ScatterLayer({
  plants,
  kind,
  color,
  wind,
  season,
  bloom,
}: {
  plants: PlantDatum[]
  kind: 'ground' | 'shrub'
  color: string
  wind: number
  season: number
  bloom: number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const baseColor = useMemo(() => new THREE.Color(color), [color])
  const warm = useMemo(() => new THREE.Color('#d3a64f'), [])
  const cool = useMemo(() => new THREE.Color('#dce9df'), [])
  const tint = useMemo(() => baseColor.clone().lerp(warm, Math.max(0, season - 0.58) * 0.55).lerp(cool, Math.max(0, season - 0.86) * 0.7), [baseColor, cool, season, warm])

  useEffect(() => {
    if (!mesh.current) return
    for (let index = 0; index < plants.length; index += 1) {
      const plant = plants[index]!
      const variation = 0.78 + ((index * 37) % 21) / 100
      mesh.current.setColorAt(
        index,
        tint.clone().lerp(new THREE.Color(kind === 'ground' ? '#b9cf86' : '#c8dca8'), bloom * 0.25 * variation),
      )
    }
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [bloom, kind, plants, tint])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const time = clock.elapsedTime
    for (let index = 0; index < plants.length; index += 1) {
      const plant = plants[index]!
      const sway = Math.sin(time * (0.7 + wind * 1.4) + plant.phase) * (0.025 + wind * 0.12)
      const height = kind === 'ground' ? 0.28 + plant.scale * 0.33 : 0.4 + plant.scale * 0.55
      dummy.position.set(plant.x + sway * 0.25, height / 2, plant.z + sway * 0.12)
      dummy.rotation.set(sway * 0.35, plant.rotation, sway * 0.55)
      dummy.scale.set(0.7 + plant.scale * 0.35, height, 0.7 + plant.scale * 0.3)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(1, plants.length)]} castShadow={false}>
      {kind === 'ground' ? (
        <coneGeometry args={[0.18, 1, 5]} />
      ) : (
        <icosahedronGeometry args={[0.64, 1]} />
      )}
      <meshStandardMaterial color="#ffffff" roughness={0.86} metalness={0.01} flatShading />
    </instancedMesh>
  )
}

function TreeStratum({
  plants,
  height,
  crownSize,
  color,
  wind,
  season,
}: {
  plants: PlantDatum[]
  height: number
  crownSize: number
  color: string
  wind: number
  season: number
}) {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const crownColor = useMemo(() => new THREE.Color(color), [color])
  const warm = useMemo(() => new THREE.Color('#a66a3f'), [])
  const winter = useMemo(() => new THREE.Color('#8ea8a0'), [])
  const tint = useMemo(
    () =>
      crownColor
        .clone()
        .lerp(warm, Math.max(0, season - 0.6) * 0.7)
        .lerp(winter, Math.max(0, season - 0.86) * 0.55),
    [crownColor, season, warm, winter],
  )

  useEffect(() => {
    if (!crowns.current) return
    const count = plants.length * 2
    for (let index = 0; index < count; index += 1) {
      const variation = 0.8 + ((index * 19) % 20) / 100
      crowns.current.setColorAt(index, tint.clone().multiplyScalar(variation))
    }
    if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true
  }, [plants.length, tint])

  useFrame(({ clock }) => {
    if (!trunks.current || !crowns.current) return
    const time = clock.elapsedTime
    for (let index = 0; index < plants.length; index += 1) {
      const plant = plants[index]!
      const sway = Math.sin(time * (0.35 + wind * 0.8) + plant.phase) * (0.04 + wind * 0.18)
      const heightScaled = height * plant.scale
      dummy.position.set(plant.x + sway * 0.3, heightScaled / 2, plant.z + sway * 0.16)
      dummy.rotation.set(sway * 0.25, plant.rotation, sway * 0.4)
      dummy.scale.set(0.8 + plant.scale * 0.16, heightScaled, 0.8 + plant.scale * 0.16)
      dummy.updateMatrix()
      trunks.current.setMatrixAt(index, dummy.matrix)

      for (let cluster = 0; cluster < 2; cluster += 1) {
        const crownIndex = index * 2 + cluster
        const angle = plant.rotation + cluster * Math.PI * 0.85
        const spread = crownSize * plant.scale * (cluster === 0 ? 0.38 : 0.44)
        const clusterScale = crownSize * plant.scale * (cluster === 0 ? 0.9 : 0.68)
        dummy.position.set(
          plant.x + Math.cos(angle) * spread + sway * 0.6,
          heightScaled - crownSize * plant.scale * (cluster === 0 ? 0.02 : 0.18) + sway * 0.3,
          plant.z + Math.sin(angle) * spread + sway * 0.2,
        )
        dummy.rotation.set(sway * 0.4, plant.rotation + cluster, sway * 0.3)
        dummy.scale.set(clusterScale * 0.86, clusterScale, clusterScale * 0.94)
        dummy.updateMatrix()
        crowns.current.setMatrixAt(crownIndex, dummy.matrix)
      }
    }
    trunks.current.instanceMatrix.needsUpdate = true
    crowns.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, Math.max(1, plants.length)]} castShadow={false}>
        <cylinderGeometry args={[0.075, 0.145, 1, 6]} />
        <meshStandardMaterial color="#5b5142" roughness={0.92} metalness={0.02} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, Math.max(1, plants.length * 2)]} castShadow={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.84} metalness={0.01} flatShading />
      </instancedMesh>
    </group>
  )
}

function StoneGarden({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const count = Math.max(1, composition.geometry.stoneCount)
  const data = useMemo(() => {
    const random = seeded(83)
    return Array.from({ length: count }, (_, index) => {
      const angle = random() * Math.PI * 2
      const radius = 3.2 + random() * 8
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius * 0.62,
        scale: 0.28 + random() * 0.9,
        rotation: random() * Math.PI,
        y: 0.1 + (index % 3) * 0.06,
      }
    })
  }, [count])

  useEffect(() => {
    if (!mesh.current) return
    for (let index = 0; index < data.length; index += 1) {
      const stone = data[index]!
      dummy.position.set(stone.x, stone.y, stone.z)
      dummy.rotation.set(stone.rotation * 0.2, stone.rotation, stone.rotation * 0.4)
      dummy.scale.set(stone.scale, stone.scale * (0.45 + composition.geometry.stoneHeightM * 0.12), stone.scale * 0.8)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [composition.geometry.stoneHeightM, data, dummy])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(1, count)]} castShadow={false}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={palette.stone} roughness={0.93} metalness={0.03} flatShading />
    </instancedMesh>
  )
}

function VisitorOrbs({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  return (
    <group>
      {Array.from({ length: composition.geometry.visitorOrbs }, (_, index) => (
        <VisitorOrb
          key={index}
          index={index}
          count={composition.geometry.visitorOrbs}
          color={palette.visitor}
          glow={palette.glow}
          light={composition.parameters.light}
        />
      ))}
    </group>
  )
}

function VisitorOrb({
  index,
  count,
  color,
  glow,
  light,
}: {
  index: number
  count: number
  color: string
  glow: string
  light: number
}) {
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const phase = index * 1.47 + 0.4
  const radius = 3.8 + (index % 3) * 1.4
  const speed = 0.11 + index * 0.018
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    if (group.current) {
      const angle = (index / Math.max(1, count)) * Math.PI * 2 + time * speed
      group.current.position.set(
        Math.cos(angle) * radius,
        1.2 + Math.sin(time * 0.65 + phase) * 0.28,
        Math.sin(angle) * radius * 0.66,
      )
      group.current.rotation.y = time * 0.3 + phase
    }
    if (halo.current) {
      const pulse = 1 + Math.sin(time * 1.5 + phase) * 0.09
      halo.current.scale.setScalar(pulse)
    }
  })
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.16 + light * 0.03, 20, 20]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.42, 18, 18]} />
        <meshBasicMaterial color={glow} transparent opacity={0.1 + light * 0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]}>
        <torusGeometry args={[0.48, 0.009, 8, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={0.22 + light * 0.26} distance={3.6} />
    </group>
  )
}

function PollenField({
  composition,
  palette,
  mode,
}: {
  composition: PlayComposition
  palette: PlayPalette
  mode: PlayRenderModeDefinition
}) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: composition.parameters.wind },
      uLight: { value: composition.parameters.light },
      uColor: { value: new THREE.Color(palette.pollen) },
      uGlow: { value: new THREE.Color(palette.glow) },
      uVisibility: { value: 0.45 + composition.parameters.light * 0.55 },
    }),
    [],
  )
  const geometry = useMemo(() => {
    const count = Math.floor(430 * mode.particleBias * (0.55 + composition.parameters.wind * 0.7))
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const scales = new Float32Array(count)
    const random = seeded(113)
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * 25
      positions[index * 3 + 1] = 0.3 + random() * 8.6
      positions[index * 3 + 2] = (random() - 0.5) * 17
      seeds[index] = random()
      scales[index] = 0.35 + random() * 1.1
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    next.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    next.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    return next
  }, [composition.parameters.wind, mode.particleBias])

  useEffect(() => {
    uniforms.uWind.value = composition.parameters.wind
    uniforms.uLight.value = composition.parameters.light
    uniforms.uColor.value.set(palette.pollen)
    uniforms.uGlow.value.set(palette.glow)
    uniforms.uVisibility.value = 0.45 + composition.parameters.light * 0.55
  }, [composition.parameters.light, composition.parameters.wind, palette, uniforms])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={POLLEN_VERTEX}
        fragmentShader={POLLEN_FRAGMENT}
      />
    </points>
  )
}

function LightShafts({ composition, palette }: { composition: PlayComposition; palette: PlayPalette }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.018
  })
  const light = composition.parameters.light
  return (
    <group ref={group} position={[0, 0, -1]}>
      {[0, 1, 2, 3].map((index) => {
        const angle = (index / 4) * Math.PI * 2 + 0.6
        return (
          <mesh
            key={index}
            position={[
              Math.cos(angle) * 5.2,
              composition.geometry.canopyHeightM * 0.55,
              Math.sin(angle) * 4.2,
            ]}
            rotation={[0.16 * Math.sin(angle), 0, 0.19 * Math.cos(angle)]}
          >
            <coneGeometry args={[1.1 + index * 0.2, composition.geometry.canopyHeightM * 0.95, 22, 1, true]} />
            <meshBasicMaterial
              color={palette.glow}
              transparent
              opacity={0.012 + light * 0.036}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}


function PlacedObjects({ objects, palette }: { objects: PlayObjectSpec[]; palette: PlayPalette }) {
  return (
    <group>
      {objects.map((object) => {
        const centreY = object.baseHeightM + object.heightM / 2
        const round =
          object.kind === 'tree-small' ||
          object.kind === 'tree-medium' ||
          object.kind === 'tree-large' ||
          object.kind === 'water' ||
          object.kind === 'stone' ||
          object.kind === 'column' ||
          object.kind === 'speaker'
        const emissive = object.kind === 'light' || object.kind === 'speaker' ? 0.35 : 0
        return (
          <mesh key={object.id} position={[object.xM, centreY, object.zM]} rotation={[0, (object.rotationDeg * Math.PI) / 180, 0]}>
            {round ? (
              <cylinderGeometry args={[Math.max(0.08, object.widthM / 2), Math.max(0.08, object.depthM / 2), Math.max(0.04, object.heightM), 20]} />
            ) : (
              <boxGeometry args={[object.widthM, Math.max(0.04, object.heightM), object.depthM]} />
            )}
            <meshStandardMaterial
              color={object.color || palette.foliage}
              roughness={object.kind === 'water' ? 0.18 : 0.84}
              metalness={object.kind === 'speaker' || object.kind === 'light' ? 0.18 : 0.02}
              emissive={emissive > 0 ? object.color : '#000000'}
              emissiveIntensity={emissive}
              transparent={object.kind === 'canopy' || object.kind === 'water' || object.kind === 'window' || object.kind === 'curtain'}
              opacity={object.kind === 'canopy' || object.kind === 'water' || object.kind === 'window' || object.kind === 'curtain' ? 0.42 : 1}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const SKY_VERTEX = `
varying vec3 vWorldPosition;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const SKY_FRAGMENT = `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uGlow;
uniform float uTime;
uniform float uLight;
uniform float uAurora;
uniform float uWind;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec3 dir = normalize(vWorldPosition);
  float altitude = clamp(dir.y * 0.72 + 0.35, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(altitude, 1.45));
  col = mix(col, col * 1.35 + uHorizon * 0.1, uLight * 0.82);
  float sun = smoothstep(0.9972, 0.9994, dot(dir, normalize(vec3(-0.42, 0.31, -0.78))));
  col += uSun * sun * (0.8 + uLight * 1.35);
  float band = pow(max(0.0, sin(dir.y * 9.0 + uTime * 0.035 + dir.x * 3.2 + noise(dir.xz * 7.0) * 0.8)), 14.0);
  col += mix(uGlow, uHorizon, 0.42) * band * uAurora * (0.22 + uWind * 0.12);
  float stars = step(0.9992, hash(floor(dir.xz * 520.0 + dir.y * 120.0))) * (1.0 - uLight) * 1.4;
  col += vec3(stars) * (0.5 + 0.5 * sin(uTime * 0.7 + dir.x * 28.0));
  float haze = smoothstep(-0.15, 0.2, dir.y);
  col = mix(col * (0.72 + uLight * 0.2) + uHorizon * 0.2, col, haze);
  col *= mix(0.3, 1.25, uLight);
  gl_FragColor = vec4(col, 1.0);
}
`

const GROUND_VERTEX = `
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const GROUND_FRAGMENT = `
uniform vec3 uGround;
uniform vec3 uShadow;
uniform vec3 uStone;
uniform vec3 uFoliage;
uniform vec3 uGlow;
uniform vec3 uFog;
uniform float uTime;
uniform float uCanopy;
uniform float uStoneAmount;
uniform float uSeason;
uniform float uWind;
uniform float uLight;
varying vec2 vUv;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  p = fract(p * vec2(234.12, 345.71));
  p += dot(p, p + 18.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 p = vWorldPosition.xz;
  float coarse = noise(p * 0.25 + uTime * 0.004 * uWind);
  float fine = noise(p * 2.4 + coarse * 2.0);
  float grain = hash(floor(p * 28.0));
  vec3 col = mix(uShadow, uGround, smoothstep(0.18, 0.92, coarse * 0.66 + fine * 0.34));
  col = mix(col, uStone, smoothstep(0.55, 0.96, noise(p * 0.7 + 3.0)) * uStoneAmount * 0.34);
  col = mix(col, uFoliage * 0.72, smoothstep(0.45, 0.95, fine) * uCanopy * 0.2);
  col += grain * 0.035;
  float damp = smoothstep(0.4, 1.0, sin(length(p) * 1.08 - uTime * 0.36 + uWind * 2.0) * 0.5 + 0.5);
  col += uGlow * damp * 0.016 * (0.4 + uCanopy);
  col = mix(col, col * 1.32 + uGlow * 0.025, uLight * 0.72);
  float autumn = smoothstep(0.58, 0.84, uSeason) * (1.0 - smoothstep(0.9, 1.0, uSeason));
  col = mix(col, vec3(0.31, 0.25, 0.13), autumn * 0.18 * fine);
  float distanceFog = smoothstep(13.0, 28.0, length(p)) * mix(0.62, 0.28, uLight);
  col = mix(col, uFog, distanceFog);
  col *= mix(0.32, 1.24, uLight);
  gl_FragColor = vec4(col, 1.0);
}
`

const WATER_VERTEX = `
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const WATER_FRAGMENT = `
uniform vec3 uWater;
uniform vec3 uGlow;
uniform vec3 uSky;
uniform float uTime;
uniform float uWind;
uniform float uLight;
uniform float uDepth;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius > 1.0) discard;
  float edge = smoothstep(0.0, 0.11, 1.0 - radius);
  float wave = sin(radius * 38.0 - uTime * 2.1 + uWind * 5.0) * 0.5 + 0.5;
  float crossWave = sin(p.x * 15.0 + uTime * 0.8) * cos(p.y * 12.0 - uTime * 0.6);
  float glint = pow(max(0.0, crossWave * 0.5 + wave * 0.5), 3.5);
  vec3 col = mix(uWater, uSky, 0.2 + wave * 0.14);
  col += uGlow * glint * (0.12 + uLight * 0.35);
  col += uGlow * edge * 0.03;
  float alpha = (0.5 + uDepth * 0.3 + glint * 0.2) * edge;
  gl_FragColor = vec4(col, alpha);
}
`

const POLLEN_VERTEX = `
uniform float uTime;
uniform float uWind;
uniform float uLight;
uniform vec3 uColor;
uniform vec3 uGlow;
uniform float uVisibility;
attribute float aSeed;
attribute float aScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec3 p = position;
  p.x += sin(uTime * (0.16 + uWind * 0.24) + aSeed * 6.283) * (0.35 + uWind * 1.2);
  p.z += cos(uTime * (0.12 + uWind * 0.18) + aSeed * 8.1) * (0.28 + uWind * 0.9);
  p.y += sin(uTime * 0.3 + aSeed * 4.8) * 0.32;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp((0.9 + aScale * 1.35) * (uLight * 0.52 + 0.48) * (72.0 / -mv.z), 1.0, 6.5);
  vAlpha = (0.12 + 0.3 * abs(sin(uTime * 0.5 + aSeed * 6.283))) * uVisibility;
  vColor = mix(uColor, uGlow, aSeed * 0.55);
  gl_Position = projectionMatrix * mv;
}
`

const POLLEN_FRAGMENT = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.02, d) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`
