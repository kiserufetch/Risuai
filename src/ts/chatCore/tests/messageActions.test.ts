import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/alert', () => ({ alertConfirm: vi.fn(async () => true), alertInput: vi.fn(async () => ''), alertRequestData: vi.fn() }))
vi.mock('src/ts/globalApi.svelte', () => ({ changeChatTo: vi.fn(), createChatCopyName: vi.fn((name: string, type: string) => `${name} (${type})`) }))
vi.mock('src/ts/process/tts', () => ({ sayTTS: vi.fn(async () => {}) }))
vi.mock('src/ts/translator/translator', () => ({ setLLMCache: vi.fn(async () => {}) }))
vi.mock('src/ts/util', () => ({ getUserName: vi.fn(() => 'Traveller') }))
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { doingChat: harness.doingChat, chatProcessStage: harness.chatProcessStage }
})
vi.mock('src/ts/process/prereroll', () => ({
    Prereroll: vi.fn(() => null),
    PreUnreroll: vi.fn(() => null),
    getPrerollState: vi.fn(() => null),
}))

import { language } from 'src/lang'
import { alertConfirm, alertInput, alertRequestData } from 'src/ts/alert'
import { changeChatTo } from 'src/ts/globalApi.svelte'
import { sayTTS } from 'src/ts/process/tts'
import { setLLMCache } from 'src/ts/translator/translator'
import { getAlternativesCounter, recordGeneration } from '../alternatives.svelte'
import {
    branchFromMessage,
    defaultBookmarkName,
    getGreetingCounter,
    getGreetingText,
    isBookmarked,
    nextGreeting,
    previousGreeting,
    removeMessage,
    removeMessagesFrom,
    saveMessageEdit,
    saveTranslationEdit,
    showGenerationInfo,
    speakMessage,
    toggleBookmark,
    toggleHidden,
    toggleHiddenBefore,
} from '../messageActions.svelte'
import { DBState, currentCharacter, currentChat, makeMessage, resetHarness } from './harness'

const texts = () => currentChat().message.map((m: any) => m.data)

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    vi.mocked(alertConfirm).mockResolvedValue(true)
    vi.mocked(alertInput).mockResolvedValue('')
    currentChat().message.push(
        makeMessage('user', 'Hi', { chatId: 'm0' }),
        makeMessage('char', 'Hello there', { chatId: 'm1', generationInfo: { model: 'opus', generationId: 'g1' } }),
        makeMessage('user', 'Bye', { chatId: 'm2' }),
    )
})

describe('removing', () => {
    it('removes one message after confirmation', async () => {
        await expect(removeMessage(1)).resolves.toBe(true)
        expect(alertConfirm).toHaveBeenCalledWith(language.removeChat)
        expect(texts()).toEqual(['Hi', 'Bye'])
    })

    it('keeps the message when the user declines', async () => {
        vi.mocked(alertConfirm).mockResolvedValueOnce(false)
        await expect(removeMessage(1)).resolves.toBe(false)
        expect(texts()).toEqual(['Hi', 'Hello there', 'Bye'])
    })

    it('skips the confirmation when askRemoval is off', async () => {
        DBState.db.askRemoval = false
        await removeMessage(0)
        expect(alertConfirm).not.toHaveBeenCalled()
        expect(texts()).toEqual(['Hello there', 'Bye'])
    })

    it('removes a message and everything below it', async () => {
        await expect(removeMessagesFrom(1)).resolves.toBe(true)
        expect(alertConfirm).toHaveBeenCalledWith(language.mobileChat.removeFromHereConfirm)
        expect(texts()).toEqual(['Hi'])
    })

    it('invalidates the reroll history after removing a message', async () => {
        const chat = currentChat()
        recordGeneration('chat-1', chat.message, 2) // pretends 'Bye' was a recorded generation
        chat.message.push(makeMessage('char', 'Bye again'))
        recordGeneration('chat-1', chat.message, 3)
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })

        await removeMessage(1)
        expect(getAlternativesCounter()).toBeNull()
    })

    it('invalidates the reroll history after removing everything from a message on', async () => {
        const chat = currentChat()
        recordGeneration('chat-1', chat.message, 2)
        chat.message.push(makeMessage('char', 'Bye again'))
        recordGeneration('chat-1', chat.message, 3)
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })

        await removeMessagesFrom(1)
        expect(getAlternativesCounter()).toBeNull()
    })
})

describe('editing and hiding', () => {
    it('saves an edited message', () => {
        expect(saveMessageEdit(1, 'Edited')).toBe(true)
        expect(texts()).toEqual(['Hi', 'Edited', 'Bye'])
    })

    it('toggles hiding a message and everything before it from the AI', () => {
        toggleHidden(1)
        expect(currentChat().message[1].disabled).toBe(true)
        toggleHidden(1)
        expect(currentChat().message[1].disabled).toBe(false)
        toggleHiddenBefore(1)
        expect(currentChat().message[1].disabled).toBe('allBefore')
        toggleHiddenBefore(1)
        expect(currentChat().message[1].disabled).toBe(false)
    })
})

describe('bookmarks', () => {
    it('bookmarks with the given name and removes it again', async () => {
        vi.mocked(alertInput).mockResolvedValueOnce('Important')
        await toggleBookmark(1)
        expect(isBookmarked(1)).toBe(true)
        expect(currentChat().bookmarkNames.m1).toBe('Important')
        await toggleBookmark(1)
        expect(isBookmarked(1)).toBe(false)
        expect(currentChat().bookmarkNames.m1).toBeUndefined()
    })

    it('names unnamed bookmarks after the sender and the message', async () => {
        await toggleBookmark(1)
        expect(currentChat().bookmarkNames.m1).toBe('Lira| Hello there...')
        await toggleBookmark(0)
        expect(currentChat().bookmarkNames.m0).toBe('Traveller| Hi...')
    })

    it('gives legacy messages an id before bookmarking them', async () => {
        delete currentChat().message[2].chatId
        await toggleBookmark(2)
        const id = currentChat().message[2].chatId
        expect(typeof id).toBe('string')
        expect(currentChat().bookmarks).toContain(id)
    })

    it('builds default names from the second half, skipping markup lines', () => {
        expect(defaultBookmarkName('intro\nmore\n*action*\nThe actual line')).toBe('The actual line...')
        expect(defaultBookmarkName('*only markup*')).toBe('*only markup*...')
    })
})

describe('branching', () => {
    it('copies the chat up to the message into a new branch with a marker', () => {
        expect(branchFromMessage(1)).toBe(true)
        const character = currentCharacter()
        const branch = character.chats[0]
        expect(branch.name).toBe('Chat 1 (Branch)')
        expect(branch.id).not.toBe('chat-1')
        expect(branch.message.map((m: any) => m.data)).toEqual([
            'Hi',
            'Hello there',
            '{{specialcomment::branchedfrom::chat-1::Chat 1::m1::}}',
        ])
        expect(branch.message[2]).toMatchObject({ isComment: true, disabled: true })
        expect(character.chats[1].id).toBe('chat-1')
        expect(character.chatFolders[0].name).toBe('Branches of Chat 1')
        expect(character.chats[1].folderId).toBe(character.chatFolders[0].id)
        expect(changeChatTo).toHaveBeenCalledWith(0)
    })
})

describe('info, speech and translation', () => {
    it('opens the generation info of a message', () => {
        showGenerationInfo(1)
        expect(alertRequestData).toHaveBeenCalledWith({ genInfo: { model: 'opus', generationId: 'g1' }, idx: 1 })
        vi.mocked(alertRequestData).mockClear()
        showGenerationInfo(0)
        expect(alertRequestData).not.toHaveBeenCalled()
    })

    it('speaks text and saves edited translations', async () => {
        await speakMessage('Hello there')
        expect(sayTTS).toHaveBeenCalledWith(null, 'Hello there')
        await saveTranslationEdit('key', 'Привет')
        expect(setLLMCache).toHaveBeenCalledWith('key', 'Привет')
    })
})

describe('greetings', () => {
    it('cycles through alternate greetings', () => {
        const character = currentCharacter()
        character.alternateGreetings = ['Alt one', 'Alt two']
        expect(getGreetingText()).toBe(character.firstMessage)
        expect(getGreetingCounter()).toEqual({ index: 1, total: 3 })
        nextGreeting()
        expect(getGreetingText()).toBe('Alt one')
        nextGreeting()
        nextGreeting()
        expect(currentChat().fmIndex).toBe(-1)
        previousGreeting()
        expect(getGreetingText()).toBe('Alt two')
        expect(getGreetingCounter()).toEqual({ index: 3, total: 3 })
    })

    it('treats a missing greeting index as the first message', () => {
        delete currentChat().fmIndex
        expect(getGreetingText()).toBe(currentCharacter().firstMessage)
        expect(getGreetingCounter()).toBeNull()
    })
})

describe('the greeting (index -1)', () => {
    it('ignores every index-based action on the greeting', async () => {
        const before = JSON.stringify(currentChat())
        await expect(removeMessage(-1)).resolves.toBe(false)
        await expect(removeMessagesFrom(-1)).resolves.toBe(false)
        expect(saveMessageEdit(-1, 'x')).toBe(false)
        await toggleBookmark(-1)
        expect(branchFromMessage(-1)).toBe(false)
        toggleHidden(-1)
        toggleHiddenBefore(-1)
        expect(JSON.stringify(currentChat())).toBe(before)
        expect(currentCharacter().chats).toHaveLength(1)
    })
})
