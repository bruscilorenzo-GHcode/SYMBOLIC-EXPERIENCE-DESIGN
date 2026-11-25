import { describe, expect, it } from 'vitest'
import {
  chooseWiringPlan,
  evaluateWiringOption,
  evaluateWiringOptions,
  type WiringRequest,
} from '../src'

const multichannelWired: WiringRequest = {
  zoneId: 'zone-grove',
  channelCount: 8,
  maxRunM: 60,
  latencyTargetMs: 20,
  sampleSynchronous: true,
  exposure: 'outdoor',
  budget: 'medium',
}

const intimateBluetooth: WiringRequest = {
  zoneId: 'zone-clearing',
  channelCount: 2,
  maxRunM: 15,
  latencyTargetMs: 200,
  sampleSynchronous: false,
  exposure: 'sheltered',
  budget: 'low',
  heritageConstraint: true,
}

describe('multichannel wiring culture', () => {
  it('chooses wired IP audio for a synchronous multichannel garden zone', () => {
    const plan = chooseWiringPlan(multichannelWired)
    expect(plan.method.startsWith('wired-')).toBe(true)
    expect(plan.channels).toHaveLength(8)
    expect(plan.channels.map((channel) => channel.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(plan.latencyBudgetMs).toBeLessThan(20)
  })

  it('permits Bluetooth only when the zone can tolerate it', () => {
    const plan = chooseWiringPlan(intimateBluetooth)
    expect(plan.method).toBe('wireless-bluetooth')
    expect(plan.linkCount).toBe(1)
    expect(plan.warnings.some((warning) => warning.includes('Lossy codec'))).toBe(true)
    expect(plan.warnings.some((warning) => warning.includes('Heritage constraint'))).toBe(true)
  })

  it('makes the cost of multichannel Bluetooth explicit', () => {
    const option = evaluateWiringOption('wireless-bluetooth', multichannelWired)
    expect(option.links).toBe(4)
    expect(option.warnings.some((warning) => warning.includes('not sample-synchronous'))).toBe(true)
    expect(option.warnings.some((warning) => warning.includes('independent links'))).toBe(true)
    expect(option.latencyMs).toBeGreaterThan(multichannelWired.latencyTargetMs)
  })

  it('flags long analog runs and ranks wired options ahead of Bluetooth', () => {
    const longRun: WiringRequest = {
      ...multichannelWired,
      channelCount: 4,
      maxRunM: 120,
    }
    const analog = evaluateWiringOption('wired-analog', longRun)
    expect(analog.warnings.some((warning) => warning.includes('shorter than the requested'))).toBe(true)
    const ranked = evaluateWiringOptions(longRun)
    expect(ranked[0]!.method.startsWith('wired-')).toBe(true)
    expect(ranked.find((option) => option.method === 'wireless-bluetooth')!.score).toBeLessThan(
      ranked[0]!.score,
    )
  })

  it('allocates stable link ids for a wireless multichannel map', () => {
    const request: WiringRequest = {
      ...multichannelWired,
      latencyTargetMs: 250,
      sampleSynchronous: false,
      channelCount: 4,
      maxRunM: 15,
      exposure: 'sheltered',
      budget: 'low',
      heritageConstraint: true,
    }
    const plan = chooseWiringPlan(request)
    expect(plan.method).toBe('wireless-bluetooth')
    expect(plan.linkCount).toBe(2)
    expect(new Set(plan.channels.map((channel) => channel.linkId))).toEqual(
      new Set(['zone-grove-link-1', 'zone-grove-link-2']),
    )
  })
})
