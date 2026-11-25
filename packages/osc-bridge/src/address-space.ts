import type {
  SpatialAudioSession,
  SpatialSource,
} from '@aura-spec/core-acoustics'
import { oscInt, type OscValue } from './codec'

export const AURA_OSC_NAMESPACE = '/aura/v1'

export interface AuraOscMessage {
  address: string
  args: OscValue[]
}

export function addressSegment(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_.:-]/g, '_')
}

export function sessionPrefix(sessionId: string, namespace = AURA_OSC_NAMESPACE): string {
  return `${namespace}/session/${addressSegment(sessionId)}`
}

export function sourcePrefix(
  sessionId: string,
  sourceId: string,
  namespace = AURA_OSC_NAMESPACE,
): string {
  return `${sessionPrefix(sessionId, namespace)}/source/${addressSegment(sourceId)}`
}

export function sourceAddress(
  sessionId: string,
  sourceId: string,
  leaf: 'position' | 'orientation' | 'gain' | 'spread' | 'mute' | 'solo' | 'spatialization' | 'trajectory/play' | 'trajectory/loop',
  namespace = AURA_OSC_NAMESPACE,
): string {
  return `${sourcePrefix(sessionId, sourceId, namespace)}/${leaf}`
}

export function rendererAddress(
  sessionId: string,
  leaf: 'order' | 'mode' | 'sample-rate' | 'block-size' | 'layout',
  namespace = AURA_OSC_NAMESPACE,
): string {
  return `${sessionPrefix(sessionId, namespace)}/renderer/${leaf}`
}

export function speakerAddress(
  sessionId: string,
  speakerId: string,
  leaf: 'drive' | 'position' | 'orientation',
  namespace = AURA_OSC_NAMESPACE,
): string {
  return `${sessionPrefix(sessionId, namespace)}/speaker/${addressSegment(speakerId)}/${leaf}`
}

export function buildSourceMessages(
  session: SpatialAudioSession,
  source: SpatialSource,
  namespace = AURA_OSC_NAMESPACE,
): AuraOscMessage[] {
  const sessionId = session.id
  return [
    { address: sourceAddress(sessionId, source.id, 'position', namespace), args: [...source.positionM] },
    { address: sourceAddress(sessionId, source.id, 'orientation', namespace), args: [...source.orientationDeg] },
    { address: sourceAddress(sessionId, source.id, 'gain', namespace), args: [source.gainDb] },
    { address: sourceAddress(sessionId, source.id, 'spread', namespace), args: [source.spreadDeg] },
    { address: sourceAddress(sessionId, source.id, 'mute', namespace), args: [source.mute] },
    { address: sourceAddress(sessionId, source.id, 'solo', namespace), args: [source.solo] },
    { address: sourceAddress(sessionId, source.id, 'spatialization', namespace), args: [source.spatialization] },
    { address: sourceAddress(sessionId, source.id, 'trajectory/play', namespace), args: [source.trajectory.enabled] },
    { address: sourceAddress(sessionId, source.id, 'trajectory/loop', namespace), args: [source.trajectory.loop] },
  ]
}

export function buildRendererMessages(
  session: SpatialAudioSession,
  namespace = AURA_OSC_NAMESPACE,
): AuraOscMessage[] {
  return [
    { address: rendererAddress(session.id, 'order', namespace), args: [oscInt(session.renderer.hoaOrder)] },
    { address: rendererAddress(session.id, 'mode', namespace), args: [session.renderer.primary] },
    { address: rendererAddress(session.id, 'sample-rate', namespace), args: [oscInt(session.renderer.sampleRateHz)] },
    { address: rendererAddress(session.id, 'block-size', namespace), args: [oscInt(session.renderer.blockSize)] },
    { address: rendererAddress(session.id, 'layout', namespace), args: [session.renderer.speakerLayout] },
  ]
}

export function buildTransportMessages(
  session: SpatialAudioSession,
  namespace = AURA_OSC_NAMESPACE,
): AuraOscMessage[] {
  return [
    { address: `${namespace}/transport/playing`, args: [session.transport.playing] },
    { address: `${namespace}/transport/bpm`, args: [session.transport.bpm] },
    { address: `${namespace}/transport/position/beats`, args: [session.transport.positionBeats] },
    { address: `${namespace}/transport/position/seconds`, args: [session.transport.positionSeconds] },
    { address: `${namespace}/transport/time-signature`, args: [oscInt(session.transport.timeSignature[0]), oscInt(session.transport.timeSignature[1])] },
  ]
}

export function buildSpeakerDriveMessages(
  session: SpatialAudioSession,
  namespace = AURA_OSC_NAMESPACE,
): AuraOscMessage[] {
  return session.speakerPlacements.map((placement) => ({
    address: speakerAddress(session.id, placement.id, 'drive', namespace),
    args: [placement.gainDb, placement.delayMs, oscInt(placement.polarity)],
  }))
}

export function buildSessionMessages(
  session: SpatialAudioSession,
  namespace = AURA_OSC_NAMESPACE,
): AuraOscMessage[] {
  const messages: AuraOscMessage[] = []
  for (const source of session.sources) messages.push(...buildSourceMessages(session, source, namespace))
  messages.push(...buildRendererMessages(session, namespace))
  messages.push(...buildTransportMessages(session, namespace))
  if (session.osc.sendSpeakerDrive) messages.push(...buildSpeakerDriveMessages(session, namespace))
  return messages
}

/** A compact clock heartbeat; usually sent every 10–30 ms. */
export function buildClockMessage(
  session: SpatialAudioSession,
  namespace = AURA_OSC_NAMESPACE,
): AuraOscMessage {
  return {
    address: `${namespace}/clock`,
    args: [
      session.transport.positionBeats,
      session.transport.bpm,
      oscInt(session.transport.playing ? 1 : 0),
    ],
  }
}
