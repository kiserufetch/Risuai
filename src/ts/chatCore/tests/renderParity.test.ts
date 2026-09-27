import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount } from 'svelte'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/globalApi.svelte', () => ({
    aiWatermarkingLawApplies: () => false,
    getFileSrc: () => Promise.resolve(''),
}))
vi.mock('src/ts/process/modules', async (importOriginal) => ({
    ...(await importOriginal<typeof import('src/ts/process/modules')>()),
    getModules: () => [],
    getModuleAssets: () => [],
    getModuleLorebooks: () => [],
    getModuleRegexScripts: () => [],
    getModuleTriggers: () => [],
}))
vi.mock('src/ts/process/triggers', async (importOriginal) => ({
    ...(await importOriginal<typeof import('src/ts/process/triggers')>()),
    runTrigger: vi.fn(async () => null),
}))
vi.mock('src/ts/translator/translator', () => ({
    getLLMCache: vi.fn(async () => null),
    setLLMCache: vi.fn(async () => undefined),
    translateHTML: vi.fn(async (html: string) => html),
}))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))

import ChatBody from 'src/lib/ChatScreens/ChatBody.svelte'
import { alertError } from 'src/ts/alert'
import { risuChatParser } from 'src/ts/process/scripts'
import { finalizeHtml, prepareDisplayText, renderBody, type RenderCharacter } from '../messageRender'
import { DBState, currentChat, makeGroup, makeMessage, resetHarness, selectCharacter, storesMock } from './harness'

interface RenderCase {
    idx: number
    role: 'user' | 'char'
    firstMessage: boolean
    name: string
    character: RenderCharacter
}

const mounted: unknown[] = []

function normalize(html: string): string {
    const container = document.createElement('div')
    container.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
    return container.innerHTML.trim()
}

function lira(): RenderCharacter {
    return storesMock().createSimpleCharacter(DBState.db.characters[0])
}

/** The old path: Chat.svelte displaya + getCbsCondition (verbatim), then the real ChatBody. */
async function renderOld(message: string, c: RenderCase): Promise<string> {
    const msgDisplay = risuChatParser(message, {
        chara: c.name,
        chatID: c.idx,
        rmVar: true,
        visualize: true,
        cbsConditions: { firstmsg: c.firstMessage ?? false, chatRole: currentChat().message?.[c.idx]?.role ?? null },
    })
    const target = document.createElement('div')
    document.body.appendChild(target)
    mounted.push(mount(ChatBody, {
        target,
        props: {
            character: c.character,
            idx: c.idx,
            firstMessage: c.firstMessage,
            msgDisplay,
            role: c.role,
            translated: false,
            translating: false,
            retranslate: false,
            modelShortName: '',
            bodyRoot: null,
        },
    }))
    await vi.waitFor(() => {
        if (normalize(target.innerHTML) === '') {
            throw new Error('ChatBody has not rendered yet')
        }
    })
    return normalize(target.innerHTML)
}

/** The new path: chatCore. */
async function renderNew(message: string, c: RenderCase): Promise<string> {
    const displayText = prepareDisplayText(message, { name: c.name, idx: c.idx, firstMessage: c.firstMessage })
    const markdown = await renderBody(displayText, { character: c.character, idx: c.idx, role: c.role, firstMessage: c.firstMessage }, { translate: false, regenerate: false })
    return normalize(finalizeHtml(markdown, ''))
}

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    DBState.db.characters[0].customscript = [
        { comment: 'status', in: '\\[STATUS:(\\d+)\\]', out: '<div class="status">$1</div>', type: 'editdisplay', flag: 'g', ableFlag: true },
    ]
    currentChat().message.push(
        makeMessage('user', 'u0'),
        makeMessage('char', 'c1'),
        makeMessage('char', 'c2'),
        makeMessage('char', 'c3'),
        makeMessage('char', 'c4'),
        makeMessage('char', 'c5'),
        makeMessage('char', 'c6'),
    )
})

afterEach(async () => {
    await Promise.all(mounted.splice(0).map((component) => unmount(component as never)))
    document.body.replaceChildren()
})

const cases: Array<{ title: string; message: string; idx: number; role: 'user' | 'char'; expectContains: string }> = [
    { title: 'roleplay text with italics, bold and quotes', message: '*Лира поднимает взгляд.* «Для путника — найдётся.»\n\n**Жирный** и "кавычки"', idx: 1, role: 'char', expectContains: '<em>' },
    { title: 'a user message', message: 'Толкаю дверь. "Есть комната?"', idx: 0, role: 'user', expectContains: '<p>' },
    { title: 'markdown blocks', message: '# Заголовок\n\n- один\n- два\n\n```js\nconst a = 1\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |', idx: 2, role: 'char', expectContains: '<table' },
    { title: 'CBS macros that depend on the message index', message: 'Я {{char}}, ты {{user}}. Индекс: {{chatindex}}', idx: 3, role: 'char', expectContains: 'Индекс: 3' },
    { title: 'card CSS scoped to .chattext', message: '<style>.status{color:red}</style><div class="status">ok</div>', idx: 4, role: 'char', expectContains: 'x-risu-status' },
    { title: 'a trigger button', message: '{{button::Открыть::openDoor}}', idx: 5, role: 'char', expectContains: 'risu-trigger="openDoor"' },
    { title: 'a display regex from the character', message: 'Статус: [STATUS:42]', idx: 6, role: 'char', expectContains: 'x-risu-status' },
]

describe('render parity with the old ChatBody', () => {
    for (const testCase of cases) {
        it(`renders ${testCase.title} identically`, async () => {
            const c: RenderCase = {
                idx: testCase.idx,
                role: testCase.role,
                firstMessage: false,
                name: testCase.role === 'user' ? 'Traveller' : 'Lira',
                character: lira(),
            }
            const oldHtml = await renderOld(testCase.message, c)
            const newHtml = await renderNew(testCase.message, c)
            expect(newHtml).toBe(oldHtml)
            expect(newHtml).toContain(testCase.expectContains)
            expect(alertError).not.toHaveBeenCalled()
        })
    }

    it('renders the greeting (index -1) identically', async () => {
        const c: RenderCase = { idx: -1, role: 'char', firstMessage: true, name: 'Lira', character: lira() }
        const greeting = DBState.db.characters[0].firstMessage
        const oldHtml = await renderOld(greeting, c)
        const newHtml = await renderNew(greeting, c)
        expect(newHtml).toBe(oldHtml)
        expect(newHtml).toContain('Lira')
    })

    it('renders group messages without display scripts, identically', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        currentChat().message.push(makeMessage('char', 'x', { saying: 'cha-lira' }))
        const c: RenderCase = { idx: 0, role: 'char', firstMessage: false, name: 'Lame Raven', character: null }
        const message = 'Мы — {{char}}. [STATUS:7]'
        const oldHtml = await renderOld(message, c)
        const newHtml = await renderNew(message, c)
        expect(newHtml).toBe(oldHtml)
        expect(newHtml).toContain('Lame Raven')
        expect(newHtml).toContain('[STATUS:7]')
    })
})
