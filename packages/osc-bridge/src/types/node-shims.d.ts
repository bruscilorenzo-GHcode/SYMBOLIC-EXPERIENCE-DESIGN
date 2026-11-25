declare module 'node:dgram' {
  export interface RemoteInfo {
    address: string
    port: number
  }

  export interface Socket {
    send(
      msg: Uint8Array,
      port: number,
      address: string,
      callback?: (error: Error | null) => void,
    ): void
    close(callback?: () => void): void
  }

  export function createSocket(type: 'udp4' | 'udp6'): Socket
}
