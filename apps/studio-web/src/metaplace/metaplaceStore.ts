import { create } from 'zustand'
import {
  METAPLACE_STORAGE_KEY,
  WISH_EXAMPLES,
  modulationFromWish,
  parseWish,
  type FieldId,
  type Modulation,
  type PlanTier,
  type Trace,
} from '@aura-spec/metaplace'

export type MetaStep = 'wish' | 'modulate' | 'plan' | 'traces'

interface MetaplaceState {
  step: MetaStep
  wishText: string
  modulation: Modulation
  tier: PlanTier
  disabledFields: FieldId[]
  useHealingRoom: boolean
  traces: Trace[]
  setStep: (step: MetaStep) => void
  setWish: (text: string) => void
  /** Re-derives the modulation from the wish (the System's first proposal). */
  proposeFromWish: () => void
  setModulation: (modulation: Modulation) => void
  setTier: (tier: PlanTier) => void
  toggleField: (field: FieldId) => void
  setUseHealingRoom: (value: boolean) => void
  setTraces: (traces: Trace[]) => void
  reset: () => void
}

const DEFAULT_WISH = WISH_EXAMPLES[0]!.it

function initial(): Pick<MetaplaceState, 'wishText' | 'modulation' | 'tier' | 'disabledFields' | 'useHealingRoom' | 'traces'> {
  const base = {
    wishText: DEFAULT_WISH,
    modulation: modulationFromWish(parseWish(DEFAULT_WISH)),
    tier: 'cycle' as PlanTier,
    disabledFields: [] as FieldId[],
    useHealingRoom: true,
    traces: [] as Trace[],
  }
  try {
    const raw = window.localStorage.getItem(METAPLACE_STORAGE_KEY)
    if (!raw) return base
    const data = JSON.parse(raw) as Partial<typeof base>
    return {
      wishText: typeof data.wishText === 'string' ? data.wishText : base.wishText,
      modulation: data.modulation && data.modulation.traditions ? data.modulation : base.modulation,
      tier: data.tier === 'threshold' || data.tier === 'cycle' || data.tier === 'metamorphosis' ? data.tier : base.tier,
      disabledFields: Array.isArray(data.disabledFields) ? data.disabledFields : [],
      useHealingRoom: data.useHealingRoom !== false,
      traces: Array.isArray(data.traces) ? data.traces : [],
    }
  } catch {
    return base
  }
}

export const useMetaplace = create<MetaplaceState>((set, get) => ({
  step: 'wish',
  ...initial(),
  setStep: (step) => set({ step }),
  setWish: (wishText) => set({ wishText }),
  proposeFromWish: () => set({ modulation: modulationFromWish(parseWish(get().wishText)) }),
  setModulation: (modulation) => set({ modulation }),
  setTier: (tier) => set({ tier }),
  toggleField: (field) =>
    set((s) => ({
      disabledFields: s.disabledFields.includes(field) ? s.disabledFields.filter((f) => f !== field) : [...s.disabledFields, field],
    })),
  setUseHealingRoom: (useHealingRoom) => set({ useHealingRoom }),
  setTraces: (traces) => set({ traces }),
  reset: () => {
    const wishText = DEFAULT_WISH
    set({
      step: 'wish',
      wishText,
      modulation: modulationFromWish(parseWish(wishText)),
      tier: 'cycle',
      disabledFields: [],
      useHealingRoom: true,
      traces: [],
    })
  },
}))

useMetaplace.subscribe((state) => {
  try {
    window.localStorage.setItem(
      METAPLACE_STORAGE_KEY,
      JSON.stringify({
        wishText: state.wishText,
        modulation: state.modulation,
        tier: state.tier,
        disabledFields: state.disabledFields,
        useHealingRoom: state.useHealingRoom,
        traces: state.traces,
      }),
    )
  } catch {
    // Local-only persistence.
  }
})
