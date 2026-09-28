import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/parser/parser.svelte', () => ({
    ParseMarkdown: vi.fn(async (text: string) => `<p>${text}</p>`),
    trimMarkdown: vi.fn(),
    addMetadataToElement: vi.fn(),
    postTranslationParse: vi.fn(),
    getDistance: vi.fn(() => 0),
}))
vi.mock('src/ts/process/scripts', () => ({ risuChatParser: vi.fn() }))
vi.mock('src/ts/translator/translator', () => ({ getLLMCache: vi.fn(), translateHTML: vi.fn() }))
vi.mock('src/ts/process/modules', () => ({ getModuleAssets: vi.fn(() => []) }))
vi.mock('src/ts/globalApi.svelte', () => ({ getFileSrc: vi.fn(async () => '') }))
vi.mock('src/ts/alert', () => ({ alertClear: vi.fn(), alertNormal: vi.fn(), alertWait: vi.fn(), alertError: vi.fn() }))
vi.mock('src/ts/util', () => ({ getUserIcon: vi.fn(() => ''), getUserName: vi.fn(() => 'Traveller') }))

import { language } from 'src/lang'
import { alertClear, alertNormal } from 'src/ts/alert'
import { ParseMarkdown } from 'src/ts/parser/parser.svelte'
import { copyMessage, type CopyRequest } from '../copyMessage'
import { currentChat, makeMessage, resetHarness } from './harness'

type ClipboardItemStub = { items: Record<string, Blob> }

const clipboard = {
    write: vi.fn(async (_items: ClipboardItemStub[]) => {}),
    writeText: vi.fn(async (_text: string) => {}),
}

const request: CopyRequest = {
    copyText: 'Hello there',
    idx: 1,
    firstMessage: false,
    role: 'char',
    senderName: 'Lira',
    modelLabel: 'Opus',
    characterImage: '',
}

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'Hello there'))
    Object.defineProperty(window.navigator, 'clipboard', { value: clipboard, configurable: true })
    vi.stubGlobal('ClipboardItem', class {
        items: Record<string, Blob>
        constructor(items: Record<string, Blob>) {
            this.items = items
        }
    })
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('copyMessage', () => {
    it('copies a rich card together with plain text', async () => {
        await expect(copyMessage(request)).resolves.toBe('rich')
        expect(ParseMarkdown).toHaveBeenCalledWith('Hello there', expect.objectContaining({ name: 'Lira' }), 'normal', 1, { firstmsg: false, chatRole: 'char' })
        const [items] = clipboard.write.mock.calls[0]
        expect(await items[0].items['text/plain'].text()).toBe('Hello there')
        const html = await items[0].items['text/html'].text()
        expect(html).toContain('Lira')
        expect(html).toContain('Opus')
        expect(html).toContain('<p')
        expect(html).toContain('From Risuai')
        expect(alertNormal).toHaveBeenCalledWith(language.copied)
    })

    it('shows the persona name and no model badge for user messages', async () => {
        await copyMessage({ ...request, idx: 0, role: 'user', modelLabel: null })
        const [items] = clipboard.write.mock.calls[0]
        const html = await items[0].items['text/html'].text()
        expect(html).toContain('Traveller')
        expect(html).not.toContain('>User<')
    })

    it('falls back to plain text when the rich copy fails', async () => {
        clipboard.write.mockRejectedValueOnce(new Error('denied'))
        await expect(copyMessage(request)).resolves.toBe('plain')
        expect(alertClear).toHaveBeenCalled()
        expect(clipboard.writeText).toHaveBeenCalledWith('Hello there')
    })

    it('uses plain text when the clipboard cannot hold rich content', async () => {
        Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: clipboard.writeText }, configurable: true })
        await expect(copyMessage(request)).resolves.toBe('plain')
        expect(clipboard.writeText).toHaveBeenCalledWith('Hello there')
    })
})
