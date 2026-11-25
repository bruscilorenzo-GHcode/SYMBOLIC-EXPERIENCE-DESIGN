export type WiringMethod =
  | 'wired-analog'
  | 'wired-dante'
  | 'wired-aes67'
  | 'wired-avb'
  | 'wireless-bluetooth'

export type WiringBudget = 'low' | 'medium' | 'high'

export interface WiringRequest {
  zoneId: string
  channelCount: number
  maxRunM: number
  latencyTargetMs: number
  sampleSynchronous: boolean
  exposure: 'indoor' | 'sheltered' | 'outdoor'
  budget: WiringBudget
  heritageConstraint?: boolean
}

export interface WiringOption {
  method: WiringMethod
  label: string
  channels: number
  links: number
  latencyMs: number
  bandwidthMbps: number
  maxRunM: number
  requiresMains: boolean
  score: number
  warnings: string[]
}

export interface WiringChannel {
  index: number
  method: WiringMethod
  linkId: string
}

export interface WiringPlan {
  zoneId: string
  method: WiringMethod
  channels: WiringChannel[]
  linkCount: number
  latencyBudgetMs: number
  bandwidthMbps: number
  warnings: string[]
}

const METHOD_BASE: Record<
  WiringMethod,
  {
    label: string
    latencyMs: number
    maxRunM: number
    requiresMains: boolean
    cost: WiringBudget
  }
> = {
  'wired-analog': { label: 'Wired analog', latencyMs: 0.4, maxRunM: 80, requiresMains: false, cost: 'low' },
  'wired-dante': { label: 'Dante / wired IP', latencyMs: 1.5, maxRunM: 100, requiresMains: true, cost: 'medium' },
  'wired-aes67': { label: 'AES67 / wired IP', latencyMs: 2, maxRunM: 100, requiresMains: true, cost: 'medium' },
  'wired-avb': { label: 'AVB / Milan', latencyMs: 2, maxRunM: 100, requiresMains: true, cost: 'high' },
  'wireless-bluetooth': { label: 'Bluetooth wireless', latencyMs: 180, maxRunM: 15, requiresMains: false, cost: 'low' },
}

export function evaluateWiringOption(
  method: WiringMethod,
  request: WiringRequest,
): WiringOption {
  const base = METHOD_BASE[method]
  const warnings: string[] = []
  const isBluetooth = method === 'wireless-bluetooth'
  const links = isBluetooth ? Math.ceil(Math.max(1, request.channelCount) / 2) : 1
  const bandwidthMbps = isBluetooth
    ? links * 0.35
    : method === 'wired-analog'
      ? 0
      : request.channelCount * 1.152

  let score = 100
  if (base.latencyMs > request.latencyTargetMs) {
    score -= Math.min(80, (base.latencyMs - request.latencyTargetMs) * 0.8)
    warnings.push(`${base.label} latency ${base.latencyMs} ms exceeds the ${request.latencyTargetMs} ms target`)
  }
  if (request.maxRunM > base.maxRunM) {
    score -= 30
    warnings.push(`${base.label} nominal run ${base.maxRunM} m is shorter than the requested ${request.maxRunM} m`)
  }
  if (isBluetooth) {
    if (request.sampleSynchronous) {
      score -= 45
      warnings.push('Bluetooth links are not sample-synchronous across channels')
    }
    if (request.channelCount > 2) {
      score -= 35
      warnings.push(`Multichannel Bluetooth needs ${links} independent links; clock/phase alignment is not guaranteed`)
    }
    if (request.exposure === 'outdoor') {
      score -= 10
      warnings.push('Outdoor Bluetooth requires weatherproof, powered receivers and RF planning')
    }
    warnings.push('Lossy codec and shared 2.4 GHz spectrum can colour the signal and add jitter')
  }
  if (request.budget === 'low' && base.cost === 'high') score -= 20
  if (request.budget === 'high' && base.cost === 'low' && !isBluetooth) score -= 5
  if (request.heritageConstraint) {
    if (method === 'wired-analog' || method === 'wired-dante' || method === 'wired-aes67' || method === 'wired-avb') score -= 20
    if (isBluetooth) score += 30
    warnings.push('Heritage constraint: visible cabling and fixing points require conservation review')
  }
  if (request.channelCount > 2) {
    if (method === 'wired-dante') score += 5
    else if (method === 'wired-aes67') score += 3
    else if (method === 'wired-analog') score -= 5
  }
  if (request.channelCount > 8 && method === 'wired-analog') {
    score -= 12
    warnings.push('Dense analog multicore increases copper, weight and commissioning risk')
  }
  if (request.exposure === 'outdoor' && method === 'wired-analog') {
    warnings.push('Specify outdoor-rated cable, glands and galvanic isolation')
  }

  return {
    method,
    label: base.label,
    channels: Math.max(1, request.channelCount),
    links,
    latencyMs: base.latencyMs,
    bandwidthMbps: round(bandwidthMbps, 2),
    maxRunM: base.maxRunM,
    requiresMains: base.requiresMains,
    score: Math.max(0, Math.round(score)),
    warnings: [...new Set(warnings)],
  }
}

export function evaluateWiringOptions(request: WiringRequest): WiringOption[] {
  const methods: WiringMethod[] = [
    'wired-analog',
    'wired-dante',
    'wired-aes67',
    'wired-avb',
    'wireless-bluetooth',
  ]
  return methods
    .map((method) => evaluateWiringOption(method, request))
    .sort((a, b) => b.score - a.score)
}

export function chooseWiringPlan(request: WiringRequest): WiringPlan {
  const options = evaluateWiringOptions(request)
  const selected = options[0]!
  const channels: WiringChannel[] = Array.from({ length: Math.max(1, request.channelCount) }, (_, index) => ({
    index,
    method: selected.method,
    linkId: selected.links === 1 ? `${request.zoneId}-link-1` : `${request.zoneId}-link-${Math.floor(index / 2) + 1}`,
  }))

  return {
    zoneId: request.zoneId,
    method: selected.method,
    channels,
    linkCount: selected.links,
    latencyBudgetMs: selected.latencyMs,
    bandwidthMbps: selected.bandwidthMbps,
    warnings: [...selected.warnings],
  }
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
