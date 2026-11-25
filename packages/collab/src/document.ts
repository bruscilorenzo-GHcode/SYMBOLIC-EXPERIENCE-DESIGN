import * as Y from 'yjs'
import type { SpatialAudioSession, SpatialSource, Vec3 } from '@aura-spec/core-acoustics'

export interface SourceSnapshot {
  id: string
  name: string
  positionM: Vec3
  orientationDeg: Vec3
  gainDb: number
  spreadDeg: number
  mute: boolean
  solo: boolean
}

export interface SessionSnapshot {
  sessionId: string
  projectId: string
  schemaVersion: string
  sources: SourceSnapshot[]
  renderer: Record<string, unknown>
  transport: Record<string, unknown>
}

/**
 * Granular Yjs layout:
 *
 *   meta        Y.Map   session identity and schema version
 *   sources     Y.Map<Y.Map>   one nested map per source
 *   placements  Y.Map<Y.Map>   one nested map per speaker placement
 *   renderer    Y.Map
 *   transport   Y.Map
 *
 * Every nested map carries scalar fields; vector fields are Y.Array<number>.
 * This keeps position updates cheap and mergeable, while the authoritative
 * typed JSON remains `SpatialAudioSession` at the API boundary.
 */
export function createSessionDoc(session: SpatialAudioSession): Y.Doc {
  const doc = new Y.Doc()
  doc.transact(() => {
    const meta = doc.getMap<unknown>('meta')
    meta.set('sessionId', session.id)
    meta.set('projectId', session.projectId)
    meta.set('schemaVersion', session.schemaVersion)

    const sources = doc.getMap<Y.Map<unknown>>('sources')
    for (const source of session.sources) {
      const map = new Y.Map<unknown>()
      map.set('id', source.id)
      map.set('name', source.name)
      map.set('positionM', Y.Array.from([...source.positionM]))
      map.set('orientationDeg', Y.Array.from([...source.orientationDeg]))
      map.set('gainDb', source.gainDb)
      map.set('spreadDeg', source.spreadDeg)
      map.set('mute', source.mute)
      map.set('solo', source.solo)
      sources.set(source.id, map)
    }

    const placements = doc.getMap<Y.Map<unknown>>('placements')
    for (const placement of session.speakerPlacements) {
      const map = new Y.Map<unknown>()
      map.set('id', placement.id)
      map.set('profileId', placement.profileId)
      map.set('label', placement.label)
      map.set('positionM', Y.Array.from([...placement.positionM]))
      map.set('orientationDeg', Y.Array.from([...placement.orientationDeg]))
      map.set('gainDb', placement.gainDb)
      map.set('delayMs', placement.delayMs)
      placements.set(placement.id, map)
    }

    const renderer = doc.getMap<unknown>('renderer')
    for (const [key, value] of Object.entries(session.renderer)) renderer.set(key, value)

    const transport = doc.getMap<unknown>('transport')
    transport.set('playing', session.transport.playing)
    transport.set('bpm', session.transport.bpm)
    transport.set('positionBeats', session.transport.positionBeats)
    transport.set('positionSeconds', session.transport.positionSeconds)
  })
  return doc
}

export function updateSourcePosition(
  doc: Y.Doc,
  sourceId: string,
  positionM: Vec3,
  origin?: unknown,
): void {
  const sources = doc.getMap<Y.Map<unknown>>('sources')
  const source = sources.get(sourceId)
  if (!source) throw new Error(`Unknown collaborative source "${sourceId}"`)
  doc.transact(() => {
    const array = source.get('positionM')
    if (array instanceof Y.Array) {
      array.delete(0, array.length)
      array.insert(0, [...positionM])
    } else {
      source.set('positionM', Y.Array.from([...positionM]))
    }
  }, origin)
}

export function updateSourceGain(doc: Y.Doc, sourceId: string, gainDb: number, origin?: unknown): void {
  const source = doc.getMap<Y.Map<unknown>>('sources').get(sourceId)
  if (!source) throw new Error(`Unknown collaborative source "${sourceId}"`)
  doc.transact(() => source.set('gainDb', gainDb), origin)
}

export function readSessionSnapshot(doc: Y.Doc): SessionSnapshot {
  const meta = doc.getMap<unknown>('meta')
  const sourceMap = doc.getMap<Y.Map<unknown>>('sources')
  const sources: SourceSnapshot[] = []
  sourceMap.forEach((source, id) => {
    sources.push({
      id,
      name: String(source.get('name') ?? id),
      positionM: readVec3(source.get('positionM')),
      orientationDeg: readVec3(source.get('orientationDeg')),
      gainDb: Number(source.get('gainDb') ?? 0),
      spreadDeg: Number(source.get('spreadDeg') ?? 0),
      mute: Boolean(source.get('mute')),
      solo: Boolean(source.get('solo')),
    })
  })
  return {
    sessionId: String(meta.get('sessionId') ?? ''),
    projectId: String(meta.get('projectId') ?? ''),
    schemaVersion: String(meta.get('schemaVersion') ?? '1.0.0'),
    sources,
    renderer: mapToObject(doc.getMap<unknown>('renderer')),
    transport: mapToObject(doc.getMap<unknown>('transport')),
  }
}

export function observeSourcePositions(
  doc: Y.Doc,
  callback: (sourceId: string, positionM: Vec3) => void,
): () => void {
  const sources = doc.getMap<Y.Map<unknown>>('sources')
  const observers = new Map<string, () => void>()

  const attach = (sourceId: string, source: Y.Map<unknown>): void => {
    const array = source.get('positionM')
    if (!(array instanceof Y.Array)) return
    const handler = (): void => callback(sourceId, readVec3(array))
    array.observe(handler)
    observers.set(sourceId, () => array.unobserve(handler))
  }

  sources.forEach((source, id) => attach(id, source))
  const mapHandler = (event: Y.YMapEvent<Y.Map<unknown>>): void => {
    event.keysChanged.forEach((id) => {
      observers.get(id)?.()
      observers.delete(id)
      const source = sources.get(id)
      if (source) attach(id, source)
    })
  }
  sources.observe(mapHandler)

  return () => {
    sources.unobserve(mapHandler)
    observers.forEach((dispose) => dispose())
    observers.clear()
  }
}

export function encodeDocumentState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

export function applyDocumentUpdate(doc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(doc, update, origin)
}

export function sessionFromSnapshot(
  base: SpatialAudioSession,
  snapshot: SessionSnapshot,
): SpatialAudioSession {
  const byId = new Map(snapshot.sources.map((source) => [source.id, source]))
  return {
    ...base,
    sources: base.sources.map((source) => mergeSource(source, byId.get(source.id))),
    renderer: { ...base.renderer, ...snapshot.renderer } as SpatialAudioSession['renderer'],
    transport: { ...base.transport, ...snapshot.transport } as SpatialAudioSession['transport'],
  }
}

function mergeSource(source: SpatialSource, collaborative?: SourceSnapshot): SpatialSource {
  if (!collaborative) return source
  return {
    ...source,
    name: collaborative.name,
    positionM: collaborative.positionM,
    orientationDeg: collaborative.orientationDeg,
    gainDb: collaborative.gainDb,
    spreadDeg: collaborative.spreadDeg,
    mute: collaborative.mute,
    solo: collaborative.solo,
  }
}

function readVec3(value: unknown): Vec3 {
  if (value instanceof Y.Array) {
    const values = value.toArray() as number[]
    return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0]
  }
  return [0, 0, 0]
}

function mapToObject(map: Y.Map<unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  map.forEach((value, key) => {
    result[key] = value
  })
  return result
}
