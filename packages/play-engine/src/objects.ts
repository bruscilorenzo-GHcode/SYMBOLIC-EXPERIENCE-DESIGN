import type { PersonaKind, SoundObjectPersona } from '@aura-spec/inhabiting-model'
import {
  DEFAULT_SPEAKER_PERSONA_ID,
  SOUND_OBJECT_PERSONAS,
  getPersona,
} from '@aura-spec/inhabiting-model'
import type { PlayObjectKind, PlayObjectMode, PlayObjectSpec, PlayProgress } from './types'

export interface PlayObjectCatalogItem {
  kind: PlayObjectKind
  label: string
  italian: string
  english: string
  category: 'vegetation' | 'water' | 'movement' | 'shelter' | 'furniture' | 'architecture' | 'acoustic' | 'speaker'
  widthM: number
  depthM: number
  heightM: number
  baseHeightM: number
  materialId: string
  color: string
  hint: string
}

export const PLAY_OBJECT_CATALOG: Record<PlayObjectMode, PlayObjectCatalogItem[]> = {
  landscape: [
    {
      kind: 'tree-small',
      label: 'Small tree',
      italian: 'Albero piccolo',
      english: 'Small tree',
      category: 'vegetation',
      widthM: 2.2,
      depthM: 2.2,
      heightM: 4.5,
      baseHeightM: 0,
      materialId: 'design-planting',
      color: '#7fa865',
      hint: 'Fine branching, understorey scale and soft scattering.',
    },
    {
      kind: 'tree-medium',
      label: 'Medium tree',
      italian: 'Albero medio',
      english: 'Medium tree',
      category: 'vegetation',
      widthM: 3.4,
      depthM: 3.4,
      heightM: 7,
      baseHeightM: 0,
      materialId: 'design-planting',
      color: '#6f9c58',
      hint: 'A mid-canopy presence with seasonal shadow.',
    },
    {
      kind: 'tree-large',
      label: 'Large tree',
      italian: 'Albero grande',
      english: 'Large tree',
      category: 'vegetation',
      widthM: 5,
      depthM: 5,
      heightM: 11,
      baseHeightM: 0,
      materialId: 'design-planting',
      color: '#587f49',
      hint: 'The structural canopy and long acoustic absorption.',
    },
    {
      kind: 'shrub',
      label: 'Shrub',
      italian: 'Arbusto',
      english: 'Shrub',
      category: 'vegetation',
      widthM: 1.7,
      depthM: 1.7,
      heightM: 1.9,
      baseHeightM: 0,
      materialId: 'design-planting',
      color: '#8dbb73',
      hint: 'A dense mask between ground and canopy.',
    },
    {
      kind: 'ground-cover',
      label: 'Ground cover',
      italian: 'Copertura bassa',
      english: 'Ground cover',
      category: 'vegetation',
      widthM: 2.8,
      depthM: 1.6,
      heightM: 0.32,
      baseHeightM: 0,
      materialId: 'design-planting',
      color: '#a5c487',
      hint: 'Fine rustle, soil protection and soft edge.',
    },
    {
      kind: 'water',
      label: 'Water',
      italian: 'Acqua',
      english: 'Water',
      category: 'water',
      widthM: 4.4,
      depthM: 3,
      heightM: 0.07,
      baseHeightM: 0,
      materialId: 'design-water',
      color: '#4e8fa8',
      hint: 'Reflection, flow and the liquid voice of the garden.',
    },
    {
      kind: 'path',
      label: 'Path',
      italian: 'Sentiero',
      english: 'Path',
      category: 'movement',
      widthM: 1.4,
      depthM: 6,
      heightM: 0.05,
      baseHeightM: 0,
      materialId: 'design-stone',
      color: '#a2a49d',
      hint: 'Circulation and a threshold for the visitor.',
    },
    {
      kind: 'canopy',
      label: 'Canopy',
      italian: 'Copertura',
      english: 'Canopy',
      category: 'shelter',
      widthM: 5,
      depthM: 4,
      heightM: 0.2,
      baseHeightM: 3.2,
      materialId: 'design-wood',
      color: '#a88c68',
      hint: 'Shelter without closing the sky.',
    },
    {
      kind: 'bench',
      label: 'Bench',
      italian: 'Panchina',
      english: 'Bench',
      category: 'furniture',
      widthM: 1.8,
      depthM: 0.65,
      heightM: 0.45,
      baseHeightM: 0,
      materialId: 'design-wood',
      color: '#9b7a57',
      hint: 'A place to rest inside the listening garden.',
    },
    {
      kind: 'stone',
      label: 'Stone',
      italian: 'Pietra',
      english: 'Stone',
      category: 'architecture',
      widthM: 0.8,
      depthM: 0.7,
      heightM: 1.3,
      baseHeightM: 0,
      materialId: 'design-concrete',
      color: '#7a7d77',
      hint: 'Geology, reflection and a long memory.',
    },
    {
      kind: 'light',
      label: 'Light',
      italian: 'Luce',
      english: 'Light',
      category: 'acoustic',
      widthM: 0.35,
      depthM: 0.35,
      heightM: 2.1,
      baseHeightM: 0,
      materialId: 'design-glass',
      color: '#f3dca4',
      hint: 'A small lantern and a readable night edge.',
    },
    {
      kind: 'speaker',
      label: 'Speaker',
      italian: 'Altoparlante',
      english: 'Speaker',
      category: 'speaker',
      widthM: 0.42,
      depthM: 0.42,
      heightM: 2.2,
      baseHeightM: 0,
      materialId: 'design-concrete',
      color: '#8ad7c1',
      hint: 'A placeable voice: choose its persona (cloud, narrator, lens, sub, line) in the object lens.',
    },
  ],
  indoor: [
    {
      kind: 'room-volume',
      label: 'Room volume',
      italian: 'Volume stanza',
      english: 'Room volume',
      category: 'architecture',
      widthM: 8,
      depthM: 6,
      heightM: 3,
      baseHeightM: 0,
      materialId: 'design-stone',
      color: '#b6b7b1',
      hint: 'The primary room and its acoustic envelope.',
    },
    {
      kind: 'table',
      label: 'Table',
      italian: 'Tavolo',
      english: 'Table',
      category: 'furniture',
      widthM: 1.8,
      depthM: 0.9,
      heightM: 0.75,
      baseHeightM: 0,
      materialId: 'design-wood',
      color: '#9b7a57',
      hint: 'A shared centre and a reflective surface.',
    },
    {
      kind: 'chair',
      label: 'Chair',
      italian: 'Sedia',
      english: 'Chair',
      category: 'furniture',
      widthM: 0.55,
      depthM: 0.55,
      heightM: 0.9,
      baseHeightM: 0,
      materialId: 'design-wood',
      color: '#a88c68',
      hint: 'A listener position or performer seat.',
    },
    {
      kind: 'sofa',
      label: 'Sofa',
      italian: 'Divano',
      english: 'Sofa',
      category: 'furniture',
      widthM: 2.2,
      depthM: 0.95,
      heightM: 0.8,
      baseHeightM: 0,
      materialId: 'design-fabric',
      color: '#b68f7f',
      hint: 'Soft absorption and a social refuge.',
    },
    {
      kind: 'window',
      label: 'Window',
      italian: 'Finestra',
      english: 'Window',
      category: 'architecture',
      widthM: 2,
      depthM: 0.14,
      heightM: 1.5,
      baseHeightM: 0.9,
      materialId: 'design-glass',
      color: '#9fd6e8',
      hint: 'Transmission, daylight and an opening to outside.',
    },
    {
      kind: 'door',
      label: 'Door',
      italian: 'Porta',
      english: 'Door',
      category: 'architecture',
      widthM: 1,
      depthM: 0.12,
      heightM: 2.2,
      baseHeightM: 0,
      materialId: 'design-wood',
      color: '#8d8f89',
      hint: 'A threshold between rooms and sounds.',
    },
    {
      kind: 'wall',
      label: 'Wall',
      italian: 'Parete',
      english: 'Wall',
      category: 'architecture',
      widthM: 4,
      depthM: 0.22,
      heightM: 3,
      baseHeightM: 0,
      materialId: 'design-concrete',
      color: '#b6b7b1',
      hint: 'A boundary that shapes early reflections.',
    },
    {
      kind: 'column',
      label: 'Column',
      italian: 'Colonna',
      english: 'Column',
      category: 'architecture',
      widthM: 0.45,
      depthM: 0.45,
      heightM: 3,
      baseHeightM: 0,
      materialId: 'design-concrete',
      color: '#7a7d77',
      hint: 'Structure and scattering.',
    },
    {
      kind: 'rug',
      label: 'Rug',
      italian: 'Tappeto',
      english: 'Rug',
      category: 'acoustic',
      widthM: 2.6,
      depthM: 1.8,
      heightM: 0.03,
      baseHeightM: 0,
      materialId: 'design-fabric',
      color: '#c9a28a',
      hint: 'A soft floor patch that shortens the tail.',
    },
    {
      kind: 'curtain',
      label: 'Curtain',
      italian: 'Tenda',
      english: 'Curtain',
      category: 'acoustic',
      widthM: 2.4,
      depthM: 0.18,
      heightM: 2.4,
      baseHeightM: 0,
      materialId: 'design-fabric',
      color: '#d3b8a5',
      hint: 'A flexible absorbent edge.',
    },
    {
      kind: 'panel',
      label: 'Acoustic panel',
      italian: 'Pannello',
      english: 'Acoustic panel',
      category: 'acoustic',
      widthM: 1.2,
      depthM: 0.1,
      heightM: 1.8,
      baseHeightM: 0.35,
      materialId: 'design-fabric',
      color: '#8ad7c1',
      hint: 'Targeted absorption without losing the room.',
    },
    {
      kind: 'speaker',
      label: 'Speaker',
      italian: 'Altoparlante',
      english: 'Speaker',
      category: 'speaker',
      widthM: 0.42,
      depthM: 0.42,
      heightM: 2.2,
      baseHeightM: 0,
      materialId: 'design-concrete',
      color: '#8ad7c1',
      hint: 'A placeable voice: choose its persona (cloud, narrator, lens, sub, line) in the object lens.',
    },
  ],
}

export function getPlayObjectCatalogItem(
  kind: PlayObjectKind,
  mode: PlayObjectMode = 'landscape',
): PlayObjectCatalogItem {
  const item = PLAY_OBJECT_CATALOG[mode].find((candidate) => candidate.kind === kind)
  if (!item) throw new Error(`Unknown play object "${kind}" in ${mode} mode`)
  return item
}

function nextSuffix(ids: readonly string[], prefix: string): number {
  let max = 0
  for (const id of ids) {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

export function createPlayObjectId(kind: PlayObjectKind, existing: readonly PlayObjectSpec[]): string {
  const prefix = kind
  return `${prefix}-${nextSuffix(existing.map((object) => object.id), prefix)}`
}

export function defaultPlayObjects(mode: PlayObjectMode): PlayObjectSpec[] {
  const catalogue = PLAY_OBJECT_CATALOG[mode]
  const defaultKinds: PlayObjectKind[] =
    mode === 'landscape'
      ? ['tree-large', 'tree-medium', 'tree-small', 'shrub', 'ground-cover', 'water', 'path', 'canopy', 'bench', 'stone', 'light', 'speaker']
      : ['room-volume', 'table', 'chair', 'sofa', 'window', 'door', 'wall', 'column', 'rug', 'curtain', 'panel', 'speaker']

  const positions: Record<PlayObjectKind, [number, number]> = {
    'tree-large': [-6.5, -2.5],
    'tree-medium': [-3.5, 1.8],
    'tree-small': [3.2, -3.4],
    shrub: [-1.4, 4],
    'ground-cover': [1.6, 3.8],
    water: [5.2, 1.8],
    path: [0, 5.2],
    canopy: [-0.5, -3.6],
    bench: [-5, 0.6],
    stone: [6.4, -1.2],
    light: [-2, 2.4],
    'room-volume': [0, 0],
    table: [0, 0],
    chair: [-2.1, 0.4],
    sofa: [2.8, 1.4],
    window: [-6.8, 0.2],
    door: [5.8, -2.2],
    wall: [0, -4.2],
    column: [-4.2, -2.4],
    rug: [0.4, 1.8],
    curtain: [5.2, 1.8],
    panel: [-4.6, 2.2],
    speaker: [-4.2, -3.2],
  }

  return defaultKinds.map((kind, index) => {
    const definition = catalogue.find((item) => item.kind === kind) ?? catalogue[0]!
    const [xM, zM] = positions[kind]!
    const suffixOffset = defaultKinds.slice(0, index).filter((candidate) => candidate === kind).length
    return {
      id: `${kind}-${suffixOffset + 1}`,
      kind,
      label: definition.italian,
      xM,
      zM,
      widthM: definition.widthM,
      depthM: definition.depthM,
      heightM: definition.heightM,
      baseHeightM: definition.baseHeightM,
      rotationDeg: 0,
      materialId: definition.materialId,
      color: definition.color,
    }
  })
}

export function normalizePlayObject(input: PlayObjectSpec): PlayObjectSpec {
  const clampPositive = (value: number, min: number): number =>
    Number.isFinite(value) ? Math.max(min, value) : min
  return {
    ...input,
    xM: Number.isFinite(input.xM) ? Math.round(input.xM * 100) / 100 : 0,
    zM: Number.isFinite(input.zM) ? Math.round(input.zM * 100) / 100 : 0,
    widthM: clampPositive(input.widthM, 0.05),
    depthM: clampPositive(input.depthM, 0.05),
    heightM: clampPositive(input.heightM, 0.02),
    baseHeightM: Number.isFinite(input.baseHeightM) ? input.baseHeightM : 0,
    rotationDeg: Number.isFinite(input.rotationDeg) ? input.rotationDeg : 0,
  }
}

export function isPlayObjectMode(value: string): value is PlayObjectMode {
  return value === 'landscape' || value === 'indoor'
}

export function isPlayObjectKind(value: string, mode: PlayObjectMode): value is PlayObjectKind {
  return PLAY_OBJECT_CATALOG[mode].some((item) => item.kind === value)
}

export function ensurePlayObjectMode(progress: PlayProgress, mode: PlayObjectMode): PlayProgress {
  if (progress.objectMode === mode) return progress
  return { ...progress, objectMode: mode, objects: defaultPlayObjects(mode) }
}

export function addPlayObject(
  progress: PlayProgress,
  kind: PlayObjectKind,
  xM: number,
  zM: number,
): PlayProgress {
  const definition = getPlayObjectCatalogItem(kind, progress.objectMode)
  const object: PlayObjectSpec = {
    id: createPlayObjectId(kind, progress.objects),
    kind,
    label: definition.italian,
    xM,
    zM,
    widthM: definition.widthM,
    depthM: definition.depthM,
    heightM: definition.heightM,
    baseHeightM: definition.baseHeightM,
    rotationDeg: 0,
    materialId: definition.materialId,
    color: definition.color,
    ...(kind === 'speaker' ? { personaId: DEFAULT_SPEAKER_PERSONA_ID } : {}),
  }
  return { ...progress, objects: [...progress.objects, normalizePlayObject(object)], applied: false }
}

/** Switch the dramatis persona of a placed speaker object. */
export function setPlayObjectPersona(
  progress: PlayProgress,
  id: string,
  personaId: PersonaKind,
): PlayProgress {
  const persona = getPersona(personaId)
  if (!persona) return progress
  return {
    ...progress,
    applied: false,
    objects: progress.objects.map((object) =>
      object.id === id && object.kind === 'speaker'
        ? normalizePlayObject({ ...object, personaId, color: persona.visual.color })
        : object,
    ),
  }
}

export function speakerPersonaOf(object: PlayObjectSpec): SoundObjectPersona {
  const persona = object.personaId ? getPersona(object.personaId) : undefined
  return persona ?? (getPersona(DEFAULT_SPEAKER_PERSONA_ID) as SoundObjectPersona)
}

export function updatePlayObject(
  progress: PlayProgress,
  id: string,
  patch: Partial<Omit<PlayObjectSpec, 'id' | 'kind'>>,
): PlayProgress {
  return {
    ...progress,
    applied: false,
    objects: progress.objects.map((object) =>
      object.id === id ? normalizePlayObject({ ...object, ...patch, id: object.id, kind: object.kind }) : object,
    ),
  }
}

export function removePlayObject(progress: PlayProgress, id: string): PlayProgress {
  return {
    ...progress,
    applied: false,
    objects: progress.objects.filter((object) => object.id !== id),
  }
}
