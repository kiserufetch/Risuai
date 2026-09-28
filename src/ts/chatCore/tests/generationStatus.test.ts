import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { chatProcessStage: harness.chatProcessStage, doingChat: harness.doingChat }
})

import { beginGeneration, dismissError, endGeneration, generationStatus, getErrorForCurrentChat, retryGeneration, showErrorDetails } from '../generationStatus.svelte'
import { DBState, alertStore, chatProcessStage, currentCharacter, makeChat, resetHarness } from './harness'

beforeEach(() => {
    endGeneration()
    dismissError()
    resetHarness()
})

describe('generationStatus', () => {
    it('tracks running state, owner and stage', () => {
        beginGeneration({ charIndex: 2, retry: vi.fn(async () => {}), chatKey: 'chat-1' })
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
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}), chatKey: 'chat-1' })
        alertStore.set({ type: 'error', msg: '429 Too Many Requests', submsg: '', stackTrace: 'trace' })
        expect(generationStatus.error).toEqual({ msg: '429 Too Many Requests', submsg: '', stackTrace: 'trace', chatKey: 'chat-1' })
        expect(get(alertStore).type).toBe('none')
    })

    it('ignores an error that was already on screen and lets other alerts through', () => {
        alertStore.set({ type: 'error', msg: 'old' })
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}), chatKey: 'chat-1' })
        expect(generationStatus.error).toBeNull()
        expect(get(alertStore).msg).toBe('old')
        alertStore.set({ type: 'normal', msg: 'Lua says hi' })
        expect(get(alertStore).type).toBe('normal')
        expect(generationStatus.error).toBeNull()
    })

    it('does not capture when errors are inlaid into the chat, or after the generation ended', () => {
        DBState.db.inlayErrorResponse = true
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}), chatKey: 'chat-1' })
        alertStore.set({ type: 'error', msg: 'x' })
        expect(generationStatus.error).toBeNull()
        endGeneration()
        DBState.db.inlayErrorResponse = false
        alertStore.set({ type: 'error', msg: 'y' })
        expect(get(alertStore).msg).toBe('y')
    })

    it('re-opens the original alert for details and retries the last action', async () => {
        const retry = vi.fn(async () => {})
        beginGeneration({ charIndex: 0, retry, chatKey: 'chat-1' })
        alertStore.set({ type: 'error', msg: 'boom', stackTrace: 'st' })
        endGeneration()
        showErrorDetails()
        expect(get(alertStore)).toMatchObject({ type: 'error', msg: 'boom', stackTrace: 'st' })
        await retryGeneration()
        expect(retry).toHaveBeenCalledTimes(1)
        expect(generationStatus.error).toBeNull()
    })

    describe('per-chat scoping of the error and Retry', () => {
        it('only shows the error while its chat is the one currently open', () => {
            beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}), chatKey: 'chat-1' })
            alertStore.set({ type: 'error', msg: 'boom' })
            expect(getErrorForCurrentChat()).toMatchObject({ msg: 'boom', chatKey: 'chat-1' })

            // Switch the current chat to one with a different id.
            currentCharacter().chats.push(makeChat({ id: 'chat-2' }))
            currentCharacter().chatPage = 1
            expect(getErrorForCurrentChat()).toBeNull()

            currentCharacter().chatPage = 0
            expect(getErrorForCurrentChat()).toMatchObject({ msg: 'boom' })
        })

        it('dismisses the error and skips the retry action when the chat has changed', async () => {
            const retry = vi.fn(async () => {})
            beginGeneration({ charIndex: 0, retry, chatKey: 'chat-1' })
            alertStore.set({ type: 'error', msg: 'boom' })

            currentCharacter().chats.push(makeChat({ id: 'chat-2' }))
            currentCharacter().chatPage = 1

            await retryGeneration()
            expect(retry).not.toHaveBeenCalled()
            expect(generationStatus.error).toBeNull()
        })
    })
})
