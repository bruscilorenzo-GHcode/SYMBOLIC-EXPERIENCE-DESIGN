import { describe, expect, it } from 'vitest'
import { analyzeSamples, manualMusicFeatures } from '../src'

const SR = 44100

function sine(frequency: number, seconds = 2, amplitude = 0.5): Float32Array {
  const samples = new Float32Array(Math.floor(SR * seconds))
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SR)
  }
  return samples
}

function clickTrack(bpm = 120, seconds = 8): Float32Array {
  const samples = new Float32Array(Math.floor(SR * seconds))
  const interval = Math.floor((60 / bpm) * SR)
  for (let start = 0; start < samples.length; start += interval) {
    for (let i = 0; i < Math.floor(SR * 0.025); i += 1) {
      const envelope = Math.exp(-i / (SR * 0.006))
      samples[start + i] = 0.9 * envelope * Math.sin((2 * Math.PI * 1200 * i) / SR)
    }
  }
  return samples
}

function noise(seconds = 2): Float32Array {
  const samples = new Float32Array(Math.floor(SR * seconds))
  let state = 0x12345678
  for (let i = 0; i < samples.length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    samples[i] = (state / 0xffffffff) * 2 - 1
  }
  return samples
}

describe('music feature analysis', () => {
  it('detects silence without inventing features', () => {
    const features = analyzeSamples(new Float32Array(SR), SR)
    expect(features.density).toBe(0)
    expect(features.brightness).toBe(0)
    expect(features.warnings.length).toBeGreaterThan(0)
  })

  it('estimates the pitch class and centroid of a 440 Hz tone', () => {
    const features = analyzeSamples(sine(440), SR)
    expect(features.tonicPc).toBe(9)
    expect(features.spectralCentroidHz).toBeGreaterThan(350)
    expect(features.spectralCentroidHz).toBeLessThan(650)
    expect(features.brightness).toBeGreaterThan(0)
    expect(features.durationS).toBeCloseTo(2, 1)
  })

  it('detects a 120 BPM click track', () => {
    const features = analyzeSamples(clickTrack(120, 8), SR)
    expect(features.tempoBpm).toBeGreaterThan(105)
    expect(features.tempoBpm).toBeLessThan(135)
    expect(features.onsetDensityPerSec).toBeGreaterThan(0.5)
  })

  it('reads noise as brighter and rougher than a sine', () => {
    const tone = analyzeSamples(sine(220), SR)
    const broad = analyzeSamples(noise(), SR)
    expect(broad.brightness).toBeGreaterThan(tone.brightness)
    expect(broad.roughness).toBeGreaterThan(tone.roughness)
    expect(broad.highEnergyRatio).toBeGreaterThan(tone.highEnergyRatio)
  })

  it('is deterministic', () => {
    const samples = clickTrack(96, 4)
    expect(analyzeSamples(samples, SR)).toEqual(analyzeSamples(samples, SR))
  })

  it('provides a manual fallback with confidence 1', () => {
    const features = manualMusicFeatures({ tempoBpm: 84, density: 0.7 })
    expect(features.tempoBpm).toBe(84)
    expect(features.density).toBe(0.7)
    expect(features.source).toBe('manual')
    expect(features.confidence.tempo).toBe(1)
  })
})
