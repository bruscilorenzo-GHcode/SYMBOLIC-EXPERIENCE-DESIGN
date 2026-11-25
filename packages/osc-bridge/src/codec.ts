export interface OscInt {
  type: 'i'
  value: number
}

export interface OscTimetagValue {
  type: 't'
  value: bigint
}

export type OscValue = number | string | boolean | Uint8Array | OscInt | OscTimetagValue

export interface OscMessage {
  type: 'message'
  address: string
  args: OscValue[]
  typeTags: string
}

export interface OscBundle {
  type: 'bundle'
  timetag: bigint
  packets: OscPacket[]
}

export type OscPacket = OscMessage | OscBundle

export const IMMEDIATE_TIMETAG = 1n
const OSC_EPOCH_OFFSET_S = 2_208_988_800

export function oscInt(value: number): OscInt {
  return { type: 'i', value: Math.trunc(value) }
}

export function oscTimetag(value: bigint): OscTimetagValue {
  return { type: 't', value }
}

export function encodeMessage(address: string, args: readonly OscValue[] = []): Uint8Array {
  if (!address.startsWith('/')) throw new Error(`OSC address must start with "/": ${address}`)
  const encodedArgs: Uint8Array[] = []
  let tags = ','
  for (const arg of args) {
    const encoded = encodeValue(arg)
    tags += encoded.tag
    encodedArgs.push(encoded.bytes)
  }
  return concat([encodeString(address), encodeString(tags), ...encodedArgs])
}

export function encodeBundle(packets: readonly Uint8Array[], timetag: bigint = IMMEDIATE_TIMETAG): Uint8Array {
  const chunks: Uint8Array[] = [encodeString('#bundle'), encodeBigUint64(timetag)]
  for (const packet of packets) {
    chunks.push(encodeInt32(packet.byteLength))
    chunks.push(packet)
  }
  return concat(chunks)
}

export function decodePacket(data: Uint8Array): OscPacket {
  if (isBundle(data)) return decodeBundle(data)
  return decodeMessage(data)
}

export function decodeMessage(data: Uint8Array): OscMessage {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const addressResult = readString(view, 0)
  const tagsResult = readString(view, addressResult.next)
  const tags = tagsResult.value
  if (!tags.startsWith(',')) throw new Error('OSC message is missing a type-tag string')
  const args: OscValue[] = []
  let offset = tagsResult.next
  for (let i = 1; i < tags.length; i += 1) {
    const tag = tags[i]!
    switch (tag) {
      case 'f': {
        args.push(view.getFloat32(offset, false))
        offset += 4
        break
      }
      case 'i': {
        args.push({ type: 'i', value: view.getInt32(offset, false) })
        offset += 4
        break
      }
      case 's': {
        const result = readString(view, offset)
        args.push(result.value)
        offset = result.next
        break
      }
      case 'b': {
        const size = view.getInt32(offset, false)
        offset += 4
        args.push(new Uint8Array(data.buffer, data.byteOffset + offset, size))
        offset += pad4(size)
        break
      }
      case 'T': {
        args.push(true)
        break
      }
      case 'F': {
        args.push(false)
        break
      }
      case 't': {
        args.push({ type: 't', value: view.getBigUint64(offset, false) })
        offset += 8
        break
      }
      default:
        throw new Error(`Unsupported OSC type tag "${tag}"`)
    }
  }
  return { type: 'message', address: addressResult.value, args, typeTags: tags }
}

export function decodeBundle(data: Uint8Array): OscBundle {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const header = readString(view, 0)
  if (header.value !== '#bundle') throw new Error('Not an OSC bundle')
  const timetag = view.getBigUint64(8, false)
  const packets: OscPacket[] = []
  let offset = 16
  while (offset + 4 <= data.byteLength) {
    const size = view.getInt32(offset, false)
    offset += 4
    if (size <= 0 || offset + size > data.byteLength) break
    packets.push(decodePacket(new Uint8Array(data.buffer, data.byteOffset + offset, size)))
    offset += size
  }
  return { type: 'bundle', timetag, packets }
}

export function encodeString(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value)
  const length = pad4(bytes.length + 1)
  const result = new Uint8Array(length)
  result.set(bytes, 0)
  result[bytes.length] = 0
  return result
}

export function encodeInt32(value: number): Uint8Array {
  const result = new Uint8Array(4)
  new DataView(result.buffer).setInt32(0, value, false)
  return result
}

export function encodeFloat32(value: number): Uint8Array {
  const result = new Uint8Array(4)
  new DataView(result.buffer).setFloat32(0, value, false)
  return result
}

export function encodeBigUint64(value: bigint): Uint8Array {
  const result = new Uint8Array(8)
  new DataView(result.buffer).setBigUint64(0, value, false)
  return result
}

export function timetagFromUnixSeconds(unixSeconds: number): bigint {
  const oscSeconds = unixSeconds + OSC_EPOCH_OFFSET_S
  const seconds = Math.floor(oscSeconds)
  const fraction = Math.floor((oscSeconds - seconds) * 2 ** 32)
  return (BigInt(seconds) << 32n) | BigInt(fraction)
}

export function timetagToUnixSeconds(timetag: bigint): number {
  const seconds = Number(timetag >> 32n)
  const fraction = Number(timetag & 0xffffffffn) / 2 ** 32
  return seconds - OSC_EPOCH_OFFSET_S + fraction
}

export function timetagNow(): bigint {
  return timetagFromUnixSeconds(Date.now() / 1000)
}

export function isBundle(data: Uint8Array): boolean {
  if (data.byteLength < 8) return false
  return (
    data[0] === 0x23 &&
    data[1] === 0x62 &&
    data[2] === 0x75 &&
    data[3] === 0x6e &&
    data[4] === 0x64 &&
    data[5] === 0x6c &&
    data[6] === 0x65 &&
    data[7] === 0x00
  )
}

function encodeValue(value: OscValue): { tag: string; bytes: Uint8Array } {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('OSC floats must be finite')
    return { tag: 'f', bytes: encodeFloat32(value) }
  }
  if (typeof value === 'string') return { tag: 's', bytes: encodeString(value) }
  if (typeof value === 'boolean') return { tag: value ? 'T' : 'F', bytes: new Uint8Array(0) }
  if (value instanceof Uint8Array) {
    const size = encodeInt32(value.byteLength)
    const payload = new Uint8Array(pad4(value.byteLength))
    payload.set(value)
    return { tag: 'b', bytes: concat([size, payload]) }
  }
  if (value.type === 'i') return { tag: 'i', bytes: encodeInt32(value.value) }
  if (value.type === 't') return { tag: 't', bytes: encodeBigUint64(value.value) }
  throw new Error('Unsupported OSC value')
}

function readString(view: DataView, offset: number): { value: string; next: number } {
  let end = offset
  while (end < view.byteLength && view.getUint8(end) !== 0) end += 1
  if (end >= view.byteLength) throw new Error('Unterminated OSC string')
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, end - offset)
  const value = new TextDecoder().decode(bytes)
  return { value, next: offset + pad4(end - offset + 1) }
}

function pad4(length: number): number {
  return (length + 3) & ~3
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
