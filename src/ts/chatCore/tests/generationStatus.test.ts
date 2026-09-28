import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { chatProcessStage: harness.chatProcessStage, doingChat: harness.doingChat }
})

import { beginGeneration, dismissError, endGeneration, generationStatus, retryGeneration, showErrorDetails } from '../generationStatus.svelte'
import { DBState, alertStore, chatProcessStage, resetHarness } from './harness'

beforeEach(() => {
    endGeneration()
    dismissError()
    resetHarness()
})

describe('generationStatus', () => {
    it('tracks running state, owner and stage', () => {
        beginGeneration({ charIndex: 2, retry: vi.fn(async () => {}) })
        expect(generationStatus.running).toBe(true)
        expect(generationStatus.charIndex).toBe(2)
        expect(generationStatus.startedAt).toBeGreaterThan(0)
        chatProcessStage.set(3)
        expect(generationStatus.stage).toBe(3)
        endGeneration()
        expect(generationStatus.running).toBe(false)
        expect(generationStatus.charIndex).toBe(-1)
        chatProcessStage.set(4)
        expect(generationStatus.stage).toBe(0)
    })

    it('turns error alerts raised during generation into an inline error', () => {
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}) })
        alertStore.set({ type: 'error', msg: '429 Too Many Requests', submsg: '', stackTrace: 'trace' })
        expect(generationStatus.error).toEqual({ msg: '429 Too Many Requests', submsg: '', stackTrace: 'trace' })
        expect(get(alertStore).type).toBe('none')
    })

    it('ignores an error that was already on screen and lets other alerts through', () => {
        alertStore.set({ type: 'error', msg: 'old' })
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}) })
        expect(generationStatus.error).toBeNull()
        expect(get(alertStore).msg).toBe('old')
        alertStore.set({ type: 'normal', msg: 'Lua says hi' })
        expect(get(alertStore).type).toBe('normal')
        expect(generationStatus.error).toBeNull()
    })

    it('does not capture when errors are inlaid into the chat, or after the generation ended', () => {
        DBState.db.inlayErrorResponse = true
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}) })
        alertStore.set({ type: 'error', msg: 'x' })
        expect(generationStatus.error).toBeNull()
        endGeneration()
        DBState.db.inlayErrorResponse = false
        alertStore.set({ type: 'error', msg: 'y' })
        expect(get(alertStore).msg).toBe('y')
    })

    it('re-opens the original alert for details and retries the last action', async () => {
        const retry = vi.fn(async () => {})
        beginGeneration({ charIndex: 0, retry })
        alertStore.set({ type: 'error', msg: 'boom', stackTrace: 'st' })
        endGeneration()
        showErrorDetails()
        expect(get(alertStore)).toMatchObject({ type: 'error', msg: 'boom', stackTrace: 'st' })
        await retryGeneration()
        expect(retry).toHaveBeenCalledTimes(1)
        expect(generationStatus.error).toBeNull()
    })
})
