import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/parser/parser.svelte', () => ({
	ParseMarkdown: vi.fn(),
	trimMarkdown: vi.fn(),
	addMetadataToElement: vi.fn(),
	postTranslationParse: vi.fn(),
	getDistance: vi.fn(() => 0),
}))
vi.mock('src/ts/process/scripts', () => ({ risuChatParser: vi.fn() }))
vi.mock('src/ts/translator/translator', () => ({ getLLMCache: vi.fn(), translateHTML: vi.fn() }))
vi.mock('src/ts/process/modules', () => ({ getModuleAssets: vi.fn(() => []) }))
vi.mock('src/ts/globalApi.svelte', () => ({ getFileSrc: vi.fn(async () => '') }))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))

import { alertError } from 'src/ts/alert'
import { ParseMarkdown, postTranslationParse } from 'src/ts/parser/parser.svelte'
import { getLLMCache, translateHTML } from 'src/ts/translator/translator'
import { getTranslationCacheKey, renderBody, renderTranslatedMarkdown, shouldAutoTranslate, type BodyContext } from '../messageRender'
import { DBState, currentChat, makeMessage, resetHarness } from './harness'

const character = { type: 'simple', chaId: 'cha-lira', customscript: [] } as any
const context: BodyContext = { character, idx: 1, role: 'char', firstMessage: false }

beforeEach(() => {
	resetHarness()
	vi.clearAllMocks()
	vi.mocked(ParseMarkdown).mockImplementation(async (text: string, _char: unknown, mode: string) => `<${mode}>${text}</${mode}>`)
	vi.mocked(postTranslationParse).mockImplementation(async (html: string) => `<post>${html}</post>`)
	vi.mocked(translateHTML).mockImplementation(async (html: string) => `tr(${html})`)
	vi.mocked(getLLMCache).mockResolvedValue(null)
	currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'Hello'))
})

describe('shouldAutoTranslate', () => {
	it('is off unless auto translation is enabled', async () => {
		await expect(shouldAutoTranslate('x', context)).resolves.toBe(false)
		DBState.db.autoTranslate = true
		await expect(shouldAutoTranslate('x', context)).resolves.toBe(true)
	})

	it('only translates cached messages in cached-only LLM mode', async () => {
		DBState.db.autoTranslate = true
		DBState.db.autoTranslateCachedOnly = true
		DBState.db.translatorType = 'llm'
		await expect(shouldAutoTranslate('x', context)).resolves.toBe(false)
		expect(getLLMCache).toHaveBeenCalledWith('<pretranslate>x</pretranslate>')
		vi.mocked(getLLMCache).mockResolvedValueOnce('cached')
		await expect(shouldAutoTranslate('x', context)).resolves.toBe(true)
		DBState.db.translateBeforeHTMLFormatting = true
		await shouldAutoTranslate('raw', context)
		expect(getLLMCache).toHaveBeenLastCalledWith('raw')
	})
})

describe('renderTranslatedMarkdown', () => {
	it('translates pre-rendered HTML and re-parses it by default', async () => {
		const flags: boolean[] = []
		const html = await renderTranslatedMarkdown('x', context, { regenerate: false, onTranslating: (active) => flags.push(active) })
		expect(ParseMarkdown).toHaveBeenCalledWith('x', character, 'pretranslate', 1, { firstmsg: false, chatRole: 'char' })
		expect(translateHTML).toHaveBeenCalledWith('<pretranslate>x</pretranslate>', false, character, 1, false)
		expect(html).toBe('<post>tr(<pretranslate>x</pretranslate>)</post>')
		expect(flags).toEqual([true, false])
	})

	it('translates the raw text first for LLM translation before HTML formatting', async () => {
		DBState.db.translatorType = 'llm'
		DBState.db.translateBeforeHTMLFormatting = true
		const html = await renderTranslatedMarkdown('x', context, { regenerate: true })
		expect(translateHTML).toHaveBeenCalledWith('x', false, character, 1, true)
		expect(html).toBe('<notrim>tr(x)</notrim>')
	})

	it('translates notrim HTML in legacy mode', async () => {
		DBState.db.legacyTranslation = true
		await expect(renderTranslatedMarkdown('x', context, { regenerate: false })).resolves.toBe('tr(<notrim>x</notrim>)')
	})
})

describe('getTranslationCacheKey', () => {
	it('uses the stored message role like Chat.svelte', async () => {
		await expect(getTranslationCacheKey('x', { character, idx: 0, firstMessage: false })).resolves.toBe('<pretranslate>x</pretranslate>')
		expect(ParseMarkdown).toHaveBeenCalledWith('x', character, 'pretranslate', 0, { firstmsg: false, chatRole: 'user' })
		DBState.db.translateBeforeHTMLFormatting = true
		await expect(getTranslationCacheKey('x', { character, idx: 0, firstMessage: false })).resolves.toBe('x')
	})
})

describe('renderBody', () => {
	it('renders without translation by default', async () => {
		await expect(renderBody('x', context, { translate: false, regenerate: false })).resolves.toBe('<notrim>x</notrim>')
		expect(translateHTML).not.toHaveBeenCalled()
	})

	it('renders the translated view when asked to', async () => {
		await expect(renderBody('x', context, { translate: true, regenerate: false })).resolves.toContain('tr(')
	})

	it('retries three times, then reports and falls back to the raw text', async () => {
		vi.mocked(ParseMarkdown).mockRejectedValue(new Error('parse failed'))
		await expect(renderBody('raw text', context, { translate: false, regenerate: false })).resolves.toBe('raw text')
		expect(ParseMarkdown).toHaveBeenCalledTimes(4)
		expect(alertError).toHaveBeenCalledTimes(1)
		expect(String(vi.mocked(alertError).mock.calls[0][0])).toContain('Error while parsing chat message')
	})

	it('recovers when a retry succeeds', async () => {
		vi.mocked(ParseMarkdown).mockRejectedValueOnce(new Error('flaky')).mockResolvedValueOnce('<p>ok</p>')
		await expect(renderBody('x', context, { translate: false, regenerate: false })).resolves.toBe('<p>ok</p>')
		expect(alertError).not.toHaveBeenCalled()
	})
})
