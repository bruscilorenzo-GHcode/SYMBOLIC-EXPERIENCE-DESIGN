import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const port = Number(process.env.PORT ?? 1234)
const host = process.env.HOST ?? '127.0.0.1'

const server = new WebSocketServer({ port, host })

server.on('connection', (connection, request) => {
  setupWSConnection(connection, request, { gc: true })
})

server.on('listening', () => {
  console.log(`[aura-collab] Yjs relay listening on ws://${host}:${port}`)
})

server.on('error', (error) => {
  console.error('[aura-collab] server error', error)
  process.exitCode = 1
})
