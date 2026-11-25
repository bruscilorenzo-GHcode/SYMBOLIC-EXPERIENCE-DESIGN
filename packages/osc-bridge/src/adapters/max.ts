import type { SpatialAudioSession } from '@aura-spec/core-acoustics'
import {
  AURA_OSC_NAMESPACE,
  buildSessionMessages,
  type AuraOscMessage,
} from '../address-space'

export interface MaxRoute {
  address: string
  handler: string
  argumentCount: number
  note: string
}

/**
 * Max/MSP does not need a binary patch file to be useful: this table can be
 * pasted into a `[coll]` or consumed by `[js]` / `[node.script]`, while
 * `[udpreceive 9000]` feeds the raw OSC stream.
 */
export function maxRoutingTable(
  session: SpatialAudioSession,
  namespace = AURA_OSC_NAMESPACE,
): MaxRoute[] {
  return buildSessionMessages(session, namespace).map((message) => ({
    address: message.address,
    handler: handlerName(message),
    argumentCount: message.args.length,
    note: routeNote(message),
  }))
}

export function maxRoutingTableAsJson(session: SpatialAudioSession, namespace = AURA_OSC_NAMESPACE): string {
  return JSON.stringify(
    {
      namespace,
      sessionId: session.id,
      udpPort: 9000,
      routes: maxRoutingTable(session, namespace),
    },
    null,
    2,
  )
}

export const MAX_PATCH_NOTES = `AURA-SPEC → Max/MSP
====================
1. [udpreceive 9000] → [oscparse] → [route /aura/v1 ...] (or [oscparse] → [zl]).
2. For high-rate trajectories, keep the OSC handler allocation-free:
   [udpreceive] → [oscparse] → [route] → [unpack f f f] → [prepend position].
3. Use [metro 16] or a [qmetro] to publish at the session clock; do not
   drive per-frame audio from OSC callbacks.
4. Add [deferlow] before UI updates.
5. For sample-accurate scheduling, bundle messages with timetags and use
   [oscformat] with a timetag, or the AURA bridge's bundle mode.
`

function handlerName(message: AuraOscMessage): string {
  const leaf = message.address.split('/').slice(4).join('_')
  return leaf.replace(/[^A-Za-z0-9_]/g, '_')
}

function routeNote(message: AuraOscMessage): string {
  if (message.address.endsWith('/position')) return 'cartesian metres'
  if (message.address.endsWith('/gain')) return 'dB'
  if (message.address.endsWith('/spread')) return 'degrees'
  if (message.address.endsWith('/orientation')) return 'yaw pitch roll degrees'
  return ''
}
