import type { SpatialAudioSession } from '@aura-spec/core-acoustics'
import {
  encodeBundle,
  encodeMessage,
  timetagNow,
  type OscValue,
} from './codec'
import {
  AURA_OSC_NAMESPACE,
  buildClockMessage,
  buildSessionMessages,
  type AuraOscMessage,
} from './address-space'

export interface OscTransport {
  send(packet: Uint8Array): Promise<void> | void
  close(): Promise<void> | void
}

export interface OscBridgeOptions {
  namespace?: string
  /** Bundle all changed messages into one time-tagged packet. */
  bundle?: boolean
  /** Use a fresh NTP timetag for bundles; default false = immediate. */
  timestampBundles?: boolean
}

export class SessionDiffPublisher {
  private readonly last = new Map<string, string>()

  constructor(private readonly namespace = AURA_OSC_NAMESPACE) {}

  diff(session: SpatialAudioSession, force = false): AuraOscMessage[] {
    const messages = buildSessionMessages(session, this.namespace)
    if (force) this.last.clear()
    const changed: AuraOscMessage[] = []
    for (const message of messages) {
      const signature = `${message.address}|${message.args.map(valueSignature).join('|')}`
      if (this.last.get(message.address) === signature) continue
      this.last.set(message.address, signature)
      changed.push(message)
    }
    return changed
  }

  reset(): void {
    this.last.clear()
  }
}

export class OscBridge {
  private readonly publisher: SessionDiffPublisher
  private clockTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly transport: OscTransport,
    private readonly options: OscBridgeOptions = {},
  ) {
    this.publisher = new SessionDiffPublisher(options.namespace ?? AURA_OSC_NAMESPACE)
  }

  async publishSession(session: SpatialAudioSession, force = false): Promise<number> {
    const messages = this.publisher.diff(session, force)
    if (messages.length === 0) return 0
    await this.sendMessages(messages)
    return messages.length
  }

  async sendMessages(messages: readonly AuraOscMessage[]): Promise<void> {
    if (messages.length === 0) return
    if (this.options.bundle) {
      const timetag = this.options.timestampBundles ? timetagNow() : 1n
      await this.transport.send(
        encodeBundle(
          messages.map((message) => encodeMessage(message.address, message.args)),
          timetag,
        ),
      )
      return
    }
    for (const message of messages) {
      await this.transport.send(encodeMessage(message.address, message.args))
    }
  }

  startClock(getSession: () => SpatialAudioSession, rateHz = 30): void {
    this.stopClock()
    const intervalMs = Math.max(5, Math.round(1000 / Math.max(1, rateHz)))
    this.clockTimer = setInterval(() => {
      const session = getSession()
      if (!session.osc.clock.enabled) return
      const message = buildClockMessage(session, this.options.namespace ?? AURA_OSC_NAMESPACE)
      void this.transport.send(encodeMessage(message.address, message.args))
    }, intervalMs)
  }

  stopClock(): void {
    if (this.clockTimer !== null) {
      clearInterval(this.clockTimer)
      this.clockTimer = null
    }
  }

  async close(): Promise<void> {
    this.stopClock()
    await this.transport.close()
  }
}

/** Stable signature used by the diff publisher; handles blobs and timetags. */
export function valueSignature(value: OscValue): string {
  if (typeof value === 'number') return `f:${value.toFixed(6)}`
  if (typeof value === 'string') return `s:${value}`
  if (typeof value === 'boolean') return value ? 'T' : 'F'
  if (value instanceof Uint8Array) return `b:${value.byteLength}:${Array.from(value).join(',')}`
  if (value.type === 'i') return `i:${value.value}`
  return `t:${value.value.toString()}`
}
