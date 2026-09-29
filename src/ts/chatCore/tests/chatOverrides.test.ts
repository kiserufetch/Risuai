import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())

import { applyChatOverrides, effectiveTemperature, ensureOverrides } from '../chatOverrides'
import { DBState, currentChat, resetHarness } from './harness'

beforeEach(() => {
    resetHarness()
    DBState.db.maxResponse = 1000
    DBState.db.temperature = 80
})

describe('chat overrides', () => {
    it('does nothing while disabled', () => {
        ensureOverrides(currentChat()).maxResponse = 300
        const undo = applyChatOverrides(currentChat())
        expect(DBState.db.maxResponse).toBe(1000)
        undo()
    })

    it('swaps values in for a generation and puts them back', () => {
        Object.assign(ensureOverrides(currentChat()), { enabled: true, maxResponse: 400, temperature: 110 })
        expect(effectiveTemperature(currentChat())).toBeCloseTo(1.1)
        const undo = applyChatOverrides(currentChat())
        expect(DBState.db.maxResponse).toBe(400)
        expect(DBState.db.temperature).toBe(110)
        undo()
        expect(DBState.db.maxResponse).toBe(1000)
        expect(DBState.db.temperature).toBe(80)
    })

    it('keeps a setting the user changed during the generation', () => {
        Object.assign(ensureOverrides(currentChat()), { enabled: true, temperature: 110 })
        const undo = applyChatOverrides(currentChat())
        DBState.db.temperature = 50
        undo()
        expect(DBState.db.temperature).toBe(50)
    })
})
