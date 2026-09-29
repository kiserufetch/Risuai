import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/model/openrouterMeta.svelte', () => ({
    getOpenRouterMeta: () => ({ id: 'x/model', contextLength: 1000, maxCompletion: null, supported: ['temperature', 'reasoning', 'max_tokens'], inputModalities: [] }),
    supportsReasoning: () => true,
}))

import { defaultOpenRouterExtras } from 'src/ts/model/openrouterExtrasDefaults'
import { applyOpenRouterExtras, openRouterReasoningReserve, parseOpenRouterUsage } from 'src/ts/process/request/openrouterExtras'
import { DBState, resetHarness } from './harness'

beforeEach(() => {
    resetHarness()
    DBState.db.aiModel = 'openrouter'
    DBState.db.openrouterExtras = defaultOpenRouterExtras()
})

describe('openrouter extras', () => {
    it('adds the thinking budget on top of the answer and caps reasoning in budget mode', () => {
        DBState.db.openrouterExtras.reasoningMode = 'budget'
        DBState.db.openrouterExtras.reasoningBudget = 3000
        const body = applyOpenRouterExtras({ model: 'x/model', max_tokens: 1000, temperature: 0.8, top_a: 0.1 }, 'model')
        expect(body.max_tokens).toBe(4000)
        expect(body.reasoning).toEqual({ max_tokens: 3000 })
        expect(body.top_a).toBeUndefined()
        expect(body.temperature).toBe(0.8)
        expect(openRouterReasoningReserve()).toBe(3000)
    })

    it('turns reasoning off without a reserve', () => {
        DBState.db.openrouterExtras.reasoningMode = 'off'
        const body = applyOpenRouterExtras({ model: 'x/model', max_tokens: 1000 }, 'model')
        expect(body.max_tokens).toBe(1000)
        expect(body.reasoning).toEqual({ enabled: false })
    })

    it('builds provider routing and skips reasoning for helper requests', () => {
        Object.assign(DBState.db.openrouterExtras, { reasoningMode: 'effort', sort: 'price', requireParameters: true, denyDataCollection: true, quantizations: ['fp8'], maxPricePrompt: 1, allowFallbacks: false })
        const body = applyOpenRouterExtras({ model: 'x/model', max_tokens: 500, provider: { order: ['a'] } }, 'memory')
        expect(body.reasoning).toBeUndefined()
        expect(body.max_tokens).toBe(500)
        expect(body.provider).toEqual({ order: ['a'], allow_fallbacks: false, sort: 'price', require_parameters: true, data_collection: 'deny', quantizations: ['fp8'], max_price: { prompt: 1 } })
    })

    it('reads usage with reasoning tokens and the finish reason', () => {
        expect(parseOpenRouterUsage({ cost: 0.002, prompt_tokens: 10, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 40 } }, 'length'))
            .toMatchObject({ cost: 0.002, promptTokens: 10, completionTokens: 50, reasoningTokens: 40, finishReason: 'length' })
    })
})
