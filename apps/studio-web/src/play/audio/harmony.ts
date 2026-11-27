import type { StemPartId } from './noteScheduler'

export interface StemKeyInfo {
  part: string
  file: string
  index: string
  variant: string
}

export interface SongGroup {
  /** e.g. `001` or `012-A` */
  id: string
  index: string
  variant: string
  files: Partial<Record<StemPartId, string>>
}

/** Extracts the authored song number and variant from a style file name. */
export function parseStemName(file: string): StemKeyInfo | null {
  const name = file.split('/').pop() ?? file
  const match = name.match(/_(\d{3})(?:_([A-Z]))?\.mid$/i)
  if (!match) return null
  return {
    part: file.split('/')[1] ?? '',
    file,
    index: match[1]!,
    variant: (match[2] ?? '').toUpperCase(),
  }
}

/**
 * Groups the style library the way it was authored: one song per numeric
 * index (Classics = same piece for cello/viola/violin; Cinematic adds A/B
 * variants; HighPop loops are one bank per index). Parts are then scheduled
 * together, so their windows share the same bar position instead of drifting
 * into unrelated chords.
 */
export function groupSongs(parts: Partial<Record<StemPartId, string[]>>): SongGroup[] {
  const groups = new Map<string, SongGroup>()
  const partOrder: StemPartId[] = ['drums', 'bass', 'pad', 'lead']

  for (const part of partOrder) {
    for (const file of parts[part] ?? []) {
      const parsed = parseStemName(file)
      if (!parsed || !parsed.index) continue
      const id = parsed.variant ? `${parsed.index}-${parsed.variant}` : parsed.index
      let group = groups.get(id)
      if (!group) {
        group = { id, index: parsed.index, variant: parsed.variant, files: {} }
        groups.set(id, group)
      }
      group.files[part] = file
    }
  }

  // Percussion is harmonically neutral: let a variant borrow the same-index
  // drums so the groove stays continuous across A/B sections.
  for (const group of groups.values()) {
    if (group.files.drums) continue
    const sibling = groups.get(group.index)
    if (sibling?.files.drums) group.files.drums = sibling.files.drums
    else if (group.variant) {
      const otherVariant = group.variant === 'A' ? 'B' : 'A'
      const siblingVariant = groups.get(`${group.index}-${otherVariant}`)
      if (siblingVariant?.files.drums) group.files.drums = siblingVariant.files.drums
    }
  }

  return [...groups.values()]
    .filter((group) => {
      const harmonicParts = [group.files.pad, group.files.bass, group.files.lead].filter(Boolean)
      return harmonicParts.length >= 1
    })
    .sort((a, b) => Number(a.index) - Number(b.index) || a.variant.localeCompare(b.variant))
}

/** Pitch classes (0..11) of a scale expressed in cents above the tonic. */
export function pitchClassesFromScale(tonicPc: number, cents: number[]): number[] {
  const pcs = new Set<number>()
  for (const cent of cents) {
    pcs.add((((Math.round(cent / 100) + tonicPc) % 12) + 12) % 12)
  }
  return [...pcs].sort((a, b) => a - b)
}

/**
 * Moves a MIDI note to the nearest allowed pitch class, only when it is within
 * `maxDistance` semitones. Used on structural beats so melodic notes agree with
 * the chord without rewriting the phrase.
 */
export function snapMidiToPitchClasses(midi: number, pitchClasses: number[], maxDistance = 1): number {
  const base = Math.round(midi)
  if (pitchClasses.length === 0) return base
  if (pitchClasses.includes(((base % 12) + 12) % 12)) return base
  for (let distance = 1; distance <= maxDistance; distance++) {
    for (const direction of [-1, 1]) {
      const candidate = base + direction * distance
      if (pitchClasses.includes(((candidate % 12) + 12) % 12)) return candidate
    }
  }
  return base
}

/** A global transposition of the whole harmonic group keeps intervals intact. */
export function globalStemTranspose(water: number, light: number): number {
  const shift = Math.round((water - 0.5) * 4 + (light - 0.5) * 2)
  return Math.max(-2, Math.min(2, shift))
}
