import type { OscTransport } from '../bridge'
import type { Socket } from 'node:dgram'

/** UDP transport for Node.js daemons and the companion CLI. */
export class UdpOscTransport implements OscTransport {
  private constructor(
    private readonly socket: Socket,
    private readonly host: string,
    private readonly port: number,
  ) {}

  static async create(host = '127.0.0.1', port = 9000): Promise<UdpOscTransport> {
    const dgram = await import('node:dgram')
    const socket = dgram.createSocket('udp4')
    return new UdpOscTransport(socket, host, port)
  }

  send(packet: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.send(packet, this.port, this.host, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.socket.close(() => resolve()))
  }
}
