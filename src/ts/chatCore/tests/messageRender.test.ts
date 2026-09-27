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

import { addMetadataToElement, ParseMarkdown, trimMarkdown } from 'src/ts/parser/parser.svelte'
import { risuChatParser } from 'src/ts/process/scripts'
import {
	finalizeHtml,
	getBodyCbsConditions,
	getDisplayCbsConditions,
	hasCustomUi,
	isBlankMessage,
	prepareDisplayText,
	renderMarkdown,
} from '../messageRender'
import { currentChat, makeMessage, resetHarness } from './harness'

const character = { type: 'simple', chaId: 'cha-lira', customscript: [] } as any

beforeEach(() => {
	resetHarness()
	vi.clearAllMocks()
	vi.mocked(ParseMarkdown).mockImplementation(async (text: string) => `<md>${text}</md>`)
	vi.mocked(trimMarkdown).mockImplementation((html: string) => `<trim>${html}</trim>`)
	vi.mocked(addMetadataToElement).mockImplementation((html: string, model: string) => `${html}<meta:${model}>`)
	vi.mocked(risuChatParser).mockImplementation((text: string) => `cbs(${text})`)
	currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'Hello'))
})

describe('messageRender', () => {
	it('reads the CBS role of the stored message for display text (Chat.svelte)', () => {
		expect(getDisplayCbsConditions(1, false)).toEqual({ firstmsg: false, chatRole: 'char' })
		expect(getDisplayCbsConditions(0, false)).toEqual({ firstmsg: false, chatRole: 'user' })
		expect(getDisplayCbsConditions(-1, true)).toEqual({ firstmsg: true, chatRole: null })
	})

	it('uses the role it is given for the markdown pass (ChatBody.svelte)', () => {
		expect(getBodyCbsConditions('char', true)).toEqual({ firstmsg: true, chatRole: 'char' })
		expect(getBodyCbsConditions(null, false)).toEqual({ firstmsg: false, chatRole: null })
	})

	it('prepares display text with the exact parser options of Chat.svelte displaya', () => {
		expect(prepareDisplayText('Hello', { name: 'Lira', idx: 1, firstMessage: false })).toBe('cbs(Hello)')
		expect(risuChatParser).toHaveBeenCalledWith('Hello', {
			chara: 'Lira',
			chatID: 1,
			rmVar: true,
			visualize: true,
			cbsConditions: { firstmsg: false, chatRole: 'char' },
		})
	})

	it('renders markdown in notrim mode with the message index', async () => {
		await expect(renderMarkdown('text', { character, idx: 1, role: 'char', firstMessage: false })).resolves.toBe('<md>text</md>')
		expect(ParseMarkdown).toHaveBeenCalledWith('text', character, 'notrim', 1, { firstmsg: false, chatRole: 'char' })
	})

	it('passes a null character in group chats', async () => {
		await renderMarkdown('text', { character: null, idx: 0, role: 'user', firstMessage: false })
		expect(ParseMarkdown).toHaveBeenCalledWith('text', null, 'notrim', 0, { firstmsg: false, chatRole: 'user' })
	})

	it('finalizes html like ChatBody: trimMarkdown, then addMetadataToElement', () => {
		expect(finalizeHtml('<p>x</p>', 'Opus')).toBe('<trim><p>x</p></trim><meta:Opus>')
		expect(trimMarkdown).toHaveBeenCalledWith('<p>x</p>')
		expect(addMetadataToElement).toHaveBeenCalledWith('<trim><p>x</p></trim>', 'Opus')
	})

	it('detects custom card UI and blank messages like Chat.svelte', () => {
		expect(hasCustomUi('<style>.a{}</style>')).toBe(true)
		expect(hasCustomUi('<risu-style>00</risu-style>')).toBe(true)
		expect(hasCustomUi('plain')).toBe(false)
		expect(isBlankMessage('{{none}}', -1, false)).toBe(true)
		expect(isBlankMessage('{{blank}}', -1, false)).toBe(true)
		expect(isBlankMessage('', -1, false)).toBe(true)
		expect(isBlankMessage('', 3, false)).toBe(false)
		expect(isBlankMessage('text', 3, true)).toBe(true)
	})
})
