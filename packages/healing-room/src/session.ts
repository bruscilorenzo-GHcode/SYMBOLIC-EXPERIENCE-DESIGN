import { deriveDoppelganger } from './doppelganger'
import { materialiseHealingGoal } from './goal'
import { clamp01, mindStateFromFocus } from './states'
import type {
  DiagnosticSample,
  FocusGate,
  HealingLayoutId,
  HealingSessionState,
  HealingZoneId,
  StationKind,
} from './types'

export const HEALING_STORAGE_KEY = 'mas.healing.session.v1'

/** Diagnostic evidence required before the focus area admits a visitor. */
export const FOCUS_REQUIRED_SAMPLES = 4
/** Focus depth required to enter the focus area (the focused-mind threshold). */
export const FOCUS_REQUIRED_DEPTH = 0.55
/** Rolling window of samples kept for the doppelgänger. */
const SAMPLE_WINDOW = 24

let sampleCounter = 0

export function createHealingSession(): HealingSessionState {
  return {
    zone: 'vestibule',
    layout: 'concentrated',
    station: 'kiosk-4',
    focus: 0,
    samples: [],
    doppelganger: null,
    goal: null,
  }
}

function derive(state: HealingSessionState): HealingSessionState {
  const doppelganger = deriveDoppelganger(state.samples)
  return {
    ...state,
    doppelganger,
    goal: materialiseHealingGoal(doppelganger, state.focus),
  }
}

export function pushDiagnosticSample(
  state: HealingSessionState,
  channel: DiagnosticSample['channel'],
  value: number,
  at: number,
): HealingSessionState {
  sampleCounter += 1
  const sample: DiagnosticSample = {
    id: `dgn-${sampleCounter.toString(36)}-${at.toString(36)}`,
    channel,
    value: clamp01(value),
    at,
  }
  const samples = [...state.samples, sample].slice(-SAMPLE_WINDOW)
  return derive({ ...state, samples })
}

export function setHealingFocus(state: HealingSessionState, focus: number): HealingSessionState {
  return derive({ ...state, focus: clamp01(focus) })
}

export function setHealingZone(state: HealingSessionState, zone: HealingZoneId): HealingSessionState {
  return { ...state, zone }
}

export function setHealingLayout(state: HealingSessionState, layout: HealingLayoutId): HealingSessionState {
  return { ...state, layout }
}

export function setHealingStation(state: HealingSessionState, station: StationKind): HealingSessionState {
  return { ...state, station }
}

/**
 * The brief requires a proper moment for entering the focused mind:
 * the diagnostic data must be collected and concentration must be deep enough.
 */
export function canEnterFocusZone(state: HealingSessionState): FocusGate {
  const dataOk = state.samples.length >= FOCUS_REQUIRED_SAMPLES
  const focusOk = state.focus >= FOCUS_REQUIRED_DEPTH
  if (!dataOk) return { ok: false, reason: 'data', requiredSamples: FOCUS_REQUIRED_SAMPLES, requiredFocus: FOCUS_REQUIRED_DEPTH }
  if (!focusOk) return { ok: false, reason: 'focus', requiredSamples: FOCUS_REQUIRED_SAMPLES, requiredFocus: FOCUS_REQUIRED_DEPTH }
  return { ok: true, reason: null, requiredSamples: FOCUS_REQUIRED_SAMPLES, requiredFocus: FOCUS_REQUIRED_DEPTH }
}

export function enterHealingZone(
  state: HealingSessionState,
  zone: HealingZoneId,
): HealingSessionState {
  if (zone === 'focus') {
    const gate = canEnterFocusZone(state)
    if (!gate.ok) return state
    return { ...setHealingZone(state, zone), focus: Math.max(state.focus, FOCUS_REQUIRED_DEPTH) }
  }
  return setHealingZone(state, zone)
}

/** A session heals when the empty mind is reached and the goal is fully materialised. */
export function sessionHealed(state: HealingSessionState): boolean {
  return mindStateFromFocus(state.focus) === 'empty' && (state.goal?.materialisation ?? 0) >= 1
}

export function serializeHealingSession(state: HealingSessionState): string {
  return JSON.stringify({
    zone: state.zone,
    layout: state.layout,
    station: state.station,
    focus: Number(state.focus.toFixed(4)),
    samples: state.samples.map((sample) => [sample.channel, sample.id, sample.value, sample.at]),
  })
}

export function parseHealingSession(raw: string): HealingSessionState | null {
  try {
    const data = JSON.parse(raw) as {
      zone?: HealingZoneId
      layout?: HealingLayoutId
      station?: StationKind
      focus?: number
      samples?: [DiagnosticSample['channel'], string, number, number][]
    }
    const base = createHealingSession()
    const state: HealingSessionState = {
      zone: data.zone === 'vestibule' || data.zone === 'observation' || data.zone === 'focus' ? data.zone : base.zone,
      layout: data.layout === 'linear' || data.layout === 'concentrated' ? data.layout : base.layout,
      station: data.station === 'kiosk-4' || data.station === 'capsule-16' || data.station === 'event-255' ? data.station : base.station,
      focus: typeof data.focus === 'number' ? clamp01(data.focus) : base.focus,
      samples: Array.isArray(data.samples)
        ? data.samples
            .slice(0, SAMPLE_WINDOW)
            .filter((entry): entry is [DiagnosticSample['channel'], string, number, number] =>
              entry.length === 4 &&
              typeof entry[1] === 'string' &&
              typeof entry[2] === 'number' &&
              typeof entry[3] === 'number' &&
              (['self', 'twin', 'others', 'artefacts'] as string[]).includes(entry[0]),
            )
            .map(([channel, id, value, at]) => ({ channel, id, value: clamp01(value), at }))
        : [],
      doppelganger: null,
      goal: null,
    }
    return derive(state)
  } catch {
    return null
  }
}
