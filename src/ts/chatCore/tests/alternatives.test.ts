import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { doingChat: harness.doingChat, chatProcessStage: harness.chatProcessStage }
})
vi.mock('src/ts/process/prereroll', () => ({
    Prereroll: vi.fn(() => null),
    PreUnreroll: vi.fn(() => null),
    getPrerollState: vi.fn(() => null),
}))

import { getPrerollState, PreUnreroll, Prereroll } from 'src/ts/process/prereroll'
import { getAlternativesCounter, previousAlternative, recordGeneration, reroll, resetAlternatives } from '../alternatives.svelte'
import { DBState, currentChat, doingChat, makeChat, makeMessage, resetHarness } from './harness'

function generationPushing(text: string) {
    return vi.fn(async () => {
        const chat = currentChat()
        const before = chat.message.length
        chat.message.push(makeMessage('char', text))
        recordGeneration(chat.id, chat.message, before)
    })
}

const texts = () => currentChat().message.map((m: any) => m.data)

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    vi.mocked(getPrerollState).mockReturnValue(null)
    resetAlternatives('chat-1')
    resetAlternatives('chat-2')
})

describe('alternatives', () => {
    it('has no counter until a reply has more than one variant', () => {
        const chat = currentChat()
        chat.message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        recordGeneration('chat-1', chat.message, 1)
        expect(getAlternativesCounter()).toBeNull()
    })

    it('rerolls, steps back and forward through variants', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        const generate = generationPushing('v2')
        await reroll(generate)
        expect(generate).toHaveBeenCalledTimes(1)
        expect(texts()).toEqual(['Hi', 'v2'])
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
        previousAlternative()
        expect(texts()).toEqual(['Hi', 'v1'])
        expect(getAlternativesCounter()).toEqual({ index: 1, total: 2 })
        previousAlternative()
        expect(texts()).toEqual(['Hi', 'v1'])
        await reroll(generate)
        expect(generate).toHaveBeenCalledTimes(1)
        expect(texts()).toEqual(['Hi', 'v2'])
    })

    it('uses pre-generated candidates before generating', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1', { generationInfo: { generationId: 'gen-1' } }))
        vi.mocked(Prereroll).mockReturnValueOnce('cached v2')
        const generate = generationPushing('never')
        await reroll(generate)
        expect(Prereroll).toHaveBeenCalledWith('gen-1')
        expect(texts()).toEqual(['Hi', 'cached v2'])
        expect(generate).not.toHaveBeenCalled()
        vi.mocked(PreUnreroll).mockReturnValueOnce('v1')
        previousAlternative()
        expect(texts()).toEqual(['Hi', 'v1'])
        vi.mocked(getPrerollState).mockReturnValue({ index: 1, total: 3 })
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 3 })
    })

    it('keeps a separate history for every chat', async () => {
        const character = DBState.db.characters[0]
        character.chats.push(makeChat({ id: 'chat-2', message: [makeMessage('user', 'Yo'), makeMessage('char', 'a1')] }))
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        await reroll(generationPushing('v2'))
        character.chatPage = 1
        expect(getAlternativesCounter()).toBeNull()
        previousAlternative()
        expect(texts()).toEqual(['Yo', 'a1'])
        character.chatPage = 0
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
    })

    it('rerolls the whole latest round of a group chat', async () => {
        currentChat().message.push(
            makeMessage('user', 'Q'),
            makeMessage('char', 'A1', { saying: 'a' }),
            makeMessage('char', 'B1', { saying: 'b' }),
            makeMessage('char', 'A2', { saying: 'a' }),
        )
        let seen: string[] = []
        await reroll(vi.fn(async () => {
            seen = texts()
        }))
        expect(seen).toEqual(['Q', 'A1'])
    })

    it('does nothing while a generation is running', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        doingChat.set(true)
        const generate = generationPushing('v2')
        await reroll(generate)
        previousAlternative()
        expect(generate).not.toHaveBeenCalled()
        expect(texts()).toEqual(['Hi', 'v1'])
    })

    it('does not crash or generate when the chat has no user message', async () => {
        currentChat().message.push(makeMessage('char', 'narration only'))
        const generate = generationPushing('v2')
        await expect(reroll(generate)).resolves.toBeUndefined()
        expect(generate).not.toHaveBeenCalled()
        expect(texts()).toEqual(['narration only'])
    })
})
