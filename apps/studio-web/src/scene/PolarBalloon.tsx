import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { AcousticSpeakerProfile } from '@aura-spec/core-acoustics'
import {
  POLAR_BALLOON_GLSL,
  POLAR_TEXTURE_GLSL,
  bakePolarAtlas,
  polarGridFromDirectivity,
} from '@aura-spec/core-acoustics'

const vertexShader = /* glsl */ `
${POLAR_BALLOON_GLSL}
varying float vDb;
void main() {
  vec3 unitDirection = normalize(position);
  float azimuth = degrees(atan(unitDirection.x, unitDirection.z));
  float elevation = degrees(asin(clamp(unitDirection.y, -1.0, 1.0)));
  vDb = auraPolarDb(vec2(azimuth, elevation));
  vec3 displaced = auraBalloonPosition(unitDirection) * 2.15;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`

const fragmentShader = /* glsl */ `
${POLAR_TEXTURE_GLSL}
varying float vDb;
void main() {
  vec3 color = auraPolarColor(vDb);
  float alpha = 0.14 + 0.34 * clamp((vDb + 36.0) / 36.0, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`

export function PolarBalloon({
  profile,
  frequencyHz,
}: {
  profile: AcousticSpeakerProfile
  frequencyHz: number
}) {
  const resources = useMemo(() => {
    const grid = polarGridFromDirectivity(profile.acoustics.directivity, {
      azimuthStepDeg: 5,
      elevationStepDeg: 5,
      frequenciesHz: [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
    })
    const atlas = bakePolarAtlas(grid, { width: 128, height: 64, minDb: -36, maxDb: 0 })
    const bandIndex = nearestBandIndex(grid.frequenciesHz, frequencyHz)
    const texture = new THREE.DataTexture(
      new Float32Array(atlas.floatData ?? new Float32Array(0)),
      atlas.width,
      atlas.height * atlas.bandCount,
      THREE.RedFormat,
      THREE.FloatType,
    )
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPolarAtlas: { value: texture },
        uPolarWidth: { value: atlas.width },
        uPolarHeight: { value: atlas.height },
        uPolarBands: { value: atlas.bandCount },
        uPolarBand: { value: bandIndex },
        uPolarMinDb: { value: atlas.minDb },
        uPolarMaxDb: { value: atlas.maxDb },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const geometry = new THREE.SphereGeometry(1, 72, 48)
    return { geometry, material, texture, frequencies: grid.frequenciesHz, bandIndex }
  }, [profile])

  useEffect(() => {
    resources.material.uniforms.uPolarBand!.value = nearestBandIndex(resources.frequencies, frequencyHz)
  }, [resources, frequencyHz])

  useEffect(
    () => () => {
      resources.geometry.dispose()
      resources.material.dispose()
      resources.texture.dispose()
    },
    [resources],
  )

  return <mesh geometry={resources.geometry} material={resources.material} renderOrder={3} />
}

function nearestBandIndex(frequencies: readonly number[], target: number): number {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < frequencies.length; i += 1) {
    const distance = Math.abs(Math.log((frequencies[i] ?? 1) / target))
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  }
  return best
}
