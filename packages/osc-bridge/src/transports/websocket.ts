import type { OscTransport } from '../bridge'

export interface WebSocketLike {
  readonly readyState: number
  send(data: Uint8Array | ArrayBuffer | string): void
  close(): void
  addEventListener?(event: 'open' | 'close' | 'error', listener: () => void): void
}

/** Browser/WebSocket transport for the studio ↔ local OSC relay. */
export class WebSocketOscTransport implements OscTransport {
  constructor(private readonly socket: WebSocketLike) {}

  send(packet: Uint8Array): void {
    if (this.socket.readyState !== 1) throw new Error('OSC WebSocket is not open')
    this.socket.send(packet)
  }

  close(): void {
    this.socket.close()
  }

  static connect(url: string): Promise<WebSocketOscTransport> {
    return new Promise((resolve, reject) => {
      if (typeof WebSocket === 'undefined') {
        reject(new Error('WebSocket is not available in this runtime'))
        return
      }
      const socket = new WebSocket(url)
      socket.binaryType = 'arraybuffer'
      socket.addEventListener('open', () => resolve(new WebSocketOscTransport(socket)))
      socket.addEventListener('error', () => reject(new Error(`Unable to connect to ${url}`)))
    })
  }
}
