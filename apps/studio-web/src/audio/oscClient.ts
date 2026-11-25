export const OSC_RELAY_URL = import.meta.env.VITE_OSC_RELAY_URL ?? 'ws://localhost:8765'

import type { SpatialAudioSession } from '@aura-spec/core-acoustics'
import {
  WebSocketOscTransport,
  buildSessionMessages,
  encodeMessage,
} from '@aura-spec/osc-bridge'

export class StudioOscClient {
  private transport: WebSocketOscTransport | null = null

  async connect(url: string): Promise<void> {
    await this.disconnect()
    this.transport = await WebSocketOscTransport.connect(url)
  }

  async publish(session: SpatialAudioSession): Promise<number> {
    if (!this.transport) throw new Error('OSC relay is not connected')
    const messages = buildSessionMessages(session)
    for (const message of messages) {
      this.transport.send(encodeMessage(message.address, message.args))
    }
    return messages.length
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      this.transport.close()
      this.transport = null
    }
  }

  get connected(): boolean {
    return this.transport !== null
  }
}

export const studioOsc = new StudioOscClient()
