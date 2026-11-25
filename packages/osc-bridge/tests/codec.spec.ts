import { describe, expect, it } from 'vitest'
import {
  SessionDiffPublisher,
  buildSessionMessages,
  decodePacket,
  encodeBundle,
  encodeMessage,
  oscInt,
  oscTimetag,
  timetagFromUnixSeconds,
  timetagToUnixSeconds,
} from '../src'
import type { SpatialAudioSession } from '@aura-spec/core-acoustics'

const blob = Uint8Array.from([0, 1, 2, 250])

describe('OSC 1.0 codec', () => {
  it('round-trips all supported scalar and blob arguments', () => {
    const packet = encodeMessage('/aura/test', [
      1.5,
      oscInt(7),
      'hello',
      true,
      false,
      blob,
      oscTimetag(0x1234567890abcdefn),
    ])
    const decoded = decodePacket(packet)
    expect(decoded.type).toBe('message')
    if (decoded.type !== 'message') return
    expect(decoded.address).toBe('/aura/test')
    expect(decoded.typeTags).toBe(',fisTFbt')
    expect(decoded.args[0]).toBeCloseTo(1.5, 6)
    expect(decoded.args[1]).toEqual({ type: 'i', value: 7 })
    expect(decoded.args[2]).toBe('hello')
    expect(decoded.args[3]).toBe(true)
    expect(decoded.args[4]).toBe(false)
    expect(Array.from(decoded.args[5] as Uint8Array)).toEqual([0, 1, 2, 250])
    expect(decoded.args[6]).toEqual({ type: 't', value: 0x1234567890abcdefn })
  })

  it('round-trips a time-tagged bundle', () => {
    const timetag = timetagFromUnixSeconds(1_700_000_000.25)
    const bundle = encodeBundle(
      [encodeMessage('/a', [1]), encodeMessage('/b', ['two', oscInt(3)])],
      timetag,
    )
    const decoded = decodePacket(bundle)
    expect(decoded.type).toBe('bundle')
    if (decoded.type !== 'bundle') return
    expect(decoded.timetag).toBe(timetag)
    expect(decoded.packets).toHaveLength(2)
    expect(decoded.packets[0]?.type).toBe('message')
  })

  it('converts OSC timetags to Unix seconds', () => {
    const unix = 1_700_000_000.5
    const timetag = timetagFromUnixSeconds(unix)
    expect(timetagToUnixSeconds(timetag)).toBeCloseTo(unix, 5)
  })
})

describe('AURA address space', () => {
  it('builds stable source addresses', () => {
    const messages = buildSessionMessages(session())
    expect(messages.some((message) => message.address.endsWith('/source/s1/position'))).toBe(true)
    expect(messages.some((message) => message.address.endsWith('/renderer/order'))).toBe(true)
    expect(messages.some((message) => message.address.endsWith('/transport/bpm'))).toBe(true)
  })

  it('publishes only changed messages', () => {
    const publisher = new SessionDiffPublisher()
    const value = session()
    expect(publisher.diff(value).length).toBeGreaterThan(5)
    expect(publisher.diff(value)).toHaveLength(0)
    value.sources[0]!.positionM = [4, 1.2, -3]
    const changed = publisher.diff(value)
    expect(changed).toHaveLength(1)
    expect(changed[0]!.address).toContain('/source/s1/position')
  })
})

function session(): SpatialAudioSession {
  const base = {
    schemaVersion: '1.0.0',
    id: 'project-session',
    projectId: 'p',
    environmentId: 'e',
    name: 'test',
    speakerPlacements: [],
    outputs: [],
    sources: [
      {
        id: 's1',
        name: 'source',
        kind: 'generator',
        positionM: [0, 1, 0],
        orientationDeg: [0, 0, 0],
        spatialization: 'object',
        busId: 'bus',
        gainDb: -6,
        spreadDeg: 45,
        distanceModel: 'inverse',
        refDistanceM: 1,
        maxDistanceM: 100,
        rolloffFactor: 1,
        dopplerFactor: 1,
        mute: false,
        solo: false,
        priority: 1,
        trajectory: { enabled: false, loop: false, keyframes: [] },
        color: '#ffffff',
      },
    ],
    renderer: {
      primary: 'hoa',
      hoaOrder: 3,
      sampleRateHz: 48000,
      blockSize: 256,
      speakerLayout: 'dome',
      normalization: 'sn3d',
      distanceEncoding: 'basic',
      vbap: { dimensionality: 3, spreadDeg: 45, imaginarySpeakerRing: true },
      dbap: { rolloffDbPerDoubling: 6, blurExponent: 2, referenceDistanceM: 1 },
      wfs: { drivingFunction: 'wfs-delay', secondarySourceSpacingM: 0.2, maxFrequencyHz: 8000 },
      binaural: { hrtfId: 'default', crossfeed: 0.3, externalization: 0.7 },
    },
    aiNodes: [],
    liveStreams: [],
    sensors: [],
    osc: {
      enabled: true,
      namespace: '/aura/v1',
      targets: [],
      clock: { enabled: true, rateHz: 30, ppqn: 24 },
      sendSpeakerDrive: false,
      sendRendererState: true,
      sendSensorValues: false,
    },
    transport: {
      playing: false,
      bpm: 120,
      timeSignature: [4, 4],
      positionBeats: 0,
      positionSeconds: 0,
      loop: { enabled: false, startBeat: 0, endBeat: 16 },
    },
    collaboration: {
      documentId: 'doc',
      provider: 'yjs',
      awareness: { enabled: true, displayName: 'test', color: '#ffffff' },
      permissions: { ownerId: 'owner', editors: [], viewers: [] },
    },
    conditions: { temperatureC: 20, humidityPct: 50, pressureKPa: 101.325, windSpeedMs: 0, windDirectionDeg: 0 },
    metadata: { createdAt: '', updatedAt: '', author: 'test', tags: [] },
  }
  return base as unknown as SpatialAudioSession
}
