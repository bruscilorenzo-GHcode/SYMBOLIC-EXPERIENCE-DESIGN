export type Mode =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'

export const MODES: Mode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
]

export type Register = 'low' | 'mid' | 'high'
export type Timbre = 'fluid' | 'granular' | 'airy' | 'metallic' | 'woody' | 'vocal' | 'stone' | 'hybrid'

export interface MusicalDescriptor {
  /** Pitch class 0–11, C = 0. */
  tonicPc: number
  mode: Mode
  tempoBpm: number
  meter: [number, number]
  register: Register
  /** 0–1 perceptual density. */
  density: number
  /** 0–1 spectral brightness. */
  brightness: number
  /** 0–1 roughness / dissonance. */
  roughness: number
  timbre: Timbre
}

export const DEFAULT_DESCRIPTOR: MusicalDescriptor = {
  tonicPc: 0,
  mode: 'dorian',
  tempoBpm: 60,
  meter: [4, 4],
  register: 'mid',
  density: 0.5,
  brightness: 0.5,
  roughness: 0.35,
  timbre: 'hybrid',
}

export const MODE_INTERVALS: Record<Mode, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizePitchClass(value: number): number {
  return ((Math.round(value) % 12) + 12) % 12
}

export function transposeDescriptor(
  descriptor: MusicalDescriptor,
  semitones: number,
): MusicalDescriptor {
  return { ...descriptor, tonicPc: normalizePitchClass(descriptor.tonicPc + semitones) }
}

export function scaleTempo(descriptor: MusicalDescriptor, factor: number): MusicalDescriptor {
  return { ...descriptor, tempoBpm: Math.max(20, Math.min(300, descriptor.tempoBpm * factor)) }
}

export function pitchClassName(pc: number): string {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  return names[normalizePitchClass(pc)] ?? 'C'
}

export function descriptorLabel(descriptor: MusicalDescriptor): string {
  return `${pitchClassName(descriptor.tonicPc)} ${descriptor.mode} · ${Math.round(descriptor.tempoBpm)} BPM`
}

export function validateDescriptor(descriptor: MusicalDescriptor): string[] {
  const issues: string[] = []
  if (!Number.isFinite(descriptor.tonicPc) || descriptor.tonicPc < 0 || descriptor.tonicPc > 11) {
    issues.push('tonicPc must be 0–11')
  }
  if (!MODES.includes(descriptor.mode)) issues.push('mode is not in the supported ontology')
  if (!Number.isFinite(descriptor.tempoBpm) || descriptor.tempoBpm < 20 || descriptor.tempoBpm > 300) {
    issues.push('tempoBpm must be 20–300')
  }
  if (!['low', 'mid', 'high'].includes(descriptor.register)) issues.push('register must be low/mid/high')
  for (const key of ['density', 'brightness', 'roughness'] as const) {
    if (descriptor[key] < 0 || descriptor[key] > 1) issues.push(`${key} must be 0–1`)
  }
  return issues
}
