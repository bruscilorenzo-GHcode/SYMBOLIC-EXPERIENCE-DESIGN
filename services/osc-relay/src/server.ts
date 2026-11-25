import dgram from 'node:dgram'
import { WebSocketServer } from 'ws'

const wsPort = Number(process.env.PORT ?? 8765)
const wsHost = process.env.HOST ?? '127.0.0.1'
const udpHost = process.env.UDP_HOST ?? '127.0.0.1'
const udpPort = Number(process.env.UDP_PORT ?? 9000)
const maxPacketBytes = 65_507

const udp = dgram.createSocket('udp4')
const wss = new WebSocketServer({ port: wsPort, host: wsHost })

wss.on('connection', (socket, request) => {
  const peer = request.socket.remoteAddress ?? 'unknown'
  console.log(`[aura-relay] client ${peer} connected`)

  socket.on('message', (data, isBinary) => {
    if (!isBinary) {
      socket.close(1003, 'AURA OSC relay expects binary frames')
      return
    }
    const packet = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
    if (packet.byteLength === 0 || packet.byteLength > maxPacketBytes) {
      console.warn(`[aura-relay] dropped packet of ${packet.byteLength} bytes`)
      return
    }
    udp.send(packet, udpPort, udpHost, (error) => {
      if (error) console.error('[aura-relay] UDP send failed', error.message)
    })
  })

  socket.on('close', () => console.log(`[aura-relay] client ${peer} disconnected`))
  socket.on('error', (error) => console.error('[aura-relay] websocket error', error.message))
})

wss.on('listening', () => {
  console.log(`[aura-relay] ws://${wsHost}:${wsPort} → udp://${udpHost}:${udpPort}`)
})

wss.on('error', (error) => {
  console.error('[aura-relay] server error', error)
  process.exitCode = 1
})

const shutdown = (): void => {
  console.log('[aura-relay] shutting down')
  wss.close()
  udp.close()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
