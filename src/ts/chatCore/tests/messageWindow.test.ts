import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/globalApi.svelte', () => ({ chatFoldedState: { data: null }, chatFoldedStateMessageIndex: { index: -1 } }))
vi.mock('src/ts/process/coldstorage.svelte', () => ({ coldStorageHeader: '@@cold@@', preLoadChat: vi.fn(async () => true) }))

import { chatFoldedState, chatFoldedStateMessageIndex } from 'src/ts/globalApi.svelte'
import { preLoadChat } from 'src/ts/process/coldstorage.svelte'
import { isFolded, loadColdStorage, MessageWindow, needsColdStorageLoad } from '../messageWindow.svelte'
import { DBState, currentChat, makeMessage, resetHarness } from './harness'

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    chatFoldedStateMessageIndex.index = -1
    chatFoldedState.data = null
})

describe('MessageWindow', () => {
    it('starts with the configured page size and lists the newest messages first', () => {
        const view = new MessageWindow()
        expect(view.loadPages).toBe(30)
        const indices = view.visibleIndices(40)
        expect(indices).toHaveLength(30)
        expect(indices[0]).toBe(39)
        expect(indices.at(-1)).toBe(10)
        expect(view.visibleIndices(5)).toEqual([4, 3, 2, 1, 0])
    })

    it('reads the initial page size from settings', () => {
        DBState.db.chatLoadInitialPages = 10
        expect(new MessageWindow().loadPages).toBe(10)
    })

    it('loads older messages in steps while there are more', () => {
        const view = new MessageWindow()
        expect(view.loadOlder(40)).toBe(true)
        expect(view.loadPages).toBe(45)
        expect(view.loadOlder(45)).toBe(false)
        expect(view.loadPages).toBe(45)
    })

    it('shows the folded range and expands it', () => {
        chatFoldedStateMessageIndex.index = 20
        chatFoldedState.data = { targetCharacterId: 'cha-lira', targetChatId: 'chat-1', targetMessageId: 'm' }
        const view = new MessageWindow()
        expect(isFolded()).toBe(true)
        expect(view.visibleIndices(100)[0]).toBe(20)
        expect(view.visibleIndices(100).at(-1)).toBe(0)
        view.expandFolded()
        expect(view.loadPages).toBe(51)
        expect(chatFoldedState.data).toBeNull()
    })

    it('loads enough messages to reach a target and knows when the greeting is visible', () => {
        const view = new MessageWindow()
        view.ensureLoaded(5, 100)
        expect(view.loadPages).toBe(100)
        expect(view.showsGreeting(100)).toBe(true)
        view.reset()
        expect(view.showsGreeting(31)).toBe(false)
        view.loadAll()
        expect(view.showsGreeting(10_000)).toBe(true)
    })
})

describe('cold storage', () => {
    it('detects and loads chats kept in cold storage', async () => {
        expect(needsColdStorageLoad()).toBe(false)
        currentChat().message.push(makeMessage('char', '@@cold@@payload'))
        expect(needsColdStorageLoad()).toBe(true)
        await loadColdStorage()
        expect(preLoadChat).toHaveBeenCalledWith(0, 0)
    })
})
