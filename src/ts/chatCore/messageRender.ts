import { addMetadataToElement, ParseMarkdown, postTranslationParse, trimMarkdown, type CbsConditions, type simpleCharacterArgument } from 'src/ts/parser/parser.svelte'
import { alertError } from 'src/ts/alert'
import { DBState } from 'src/ts/stores.svelte'
import { getLLMCache, translateHTML } from 'src/ts/translator/translator'
import { risuChatParser } from 'src/ts/process/scripts'
import * as session from './session.svelte'

// Message rendering exactly as Chat.svelte + ChatBody.svelte do it, so card scripts
// (CBS, display regex, Lua editDisplay, display triggers, plugin handlers) see the
// same inputs in the new mobile chat.

export type RenderCharacter = simpleCharacterArgument | string | null

export interface BodyContext {
	/** createSimpleCharacter(current character); null in group chats. */
	character: RenderCharacter
	/** Real message index; -1 for the greeting. */
	idx: number
	/** Role handed down as a prop (ChatBody.svelte); 'char' for the greeting. */
	role: string | null
	firstMessage: boolean
}

/** Chat.svelte getCbsCondition: the role comes from the stored message. */
export function getDisplayCbsConditions(idx: number, firstMessage: boolean): CbsConditions {
	try {
		return { firstmsg: firstMessage ?? false, chatRole: session.getMessage(idx)?.role ?? null }
	} catch {
		return { firstmsg: firstMessage ?? false, chatRole: null }
	}
}

/** ChatBody.svelte getCbsCondition: the role comes from the component prop. */
export function getBodyCbsConditions(role: string | null, firstMessage: boolean): CbsConditions {
	return { firstmsg: firstMessage ?? false, chatRole: role }
}

/** Chat.svelte displaya. */
export function prepareDisplayText(text: string, options: { name: string; idx: number; firstMessage: boolean }): string {
	return risuChatParser(text, {
		chara: options.name,
		chatID: options.idx,
		rmVar: true,
		visualize: true,
		cbsConditions: getDisplayCbsConditions(options.idx, options.firstMessage),
	})
}

/** ChatBody.svelte markParsing, untranslated branch. */
export function renderMarkdown(displayText: string, context: BodyContext): Promise<string> {
	return ParseMarkdown(displayText, context.character, 'notrim', context.idx, getBodyCbsConditions(context.role, context.firstMessage))
}

/** ChatBody.svelte: {@html addMetadataToElement(trimMarkdown(md), modelShortName)}. */
export function finalizeHtml(markdownHtml: string, modelShortName: string): string {
	return addMetadataToElement(trimMarkdown(markdownHtml), modelShortName)
}

/** Chat.svelte hasCustomUi: messages carrying card UI (<style> becomes <risu-style>). */
export function hasCustomUi(displayText: string): boolean {
	return displayText.includes('<style') || displayText.includes('risu-style')
}

/** Chat.svelte blankMessage. */
export function isBlankMessage(text: string, idx: number, isComment: boolean): boolean {
	return ((text === '{{none}}' || text === '{{blank}}' || text === '') && idx === -1) || isComment
}

/** ChatBody.svelte placeholder shown while a translation loads (showTranslationLoading). */
export const TRANSLATION_LOADING_HTML = '<div style="display:flex;justify-content:center;align-items:center;height:48px;"><div style="animation: spin 1s linear infinite; border-radius: 50%; height: 32px; width: 32px; border: 2px solid #3b82f6; border-top: 2px solid transparent;"></div></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>'

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** ChatBody.svelte: decides the initial translated state of a message. */
export async function shouldAutoTranslate(displayText: string, context: BodyContext): Promise<boolean> {
	if (!DBState.db.autoTranslate) {
		return false
	}
	if (!(DBState.db.autoTranslateCachedOnly && DBState.db.translatorType === 'llm')) {
		return true
	}
	const cbs = getBodyCbsConditions(context.role, context.firstMessage)
	const cache = DBState.db.translateBeforeHTMLFormatting
		? await getLLMCache(displayText)
		: !DBState.db.legacyTranslation
			? await getLLMCache(await ParseMarkdown(displayText, context.character, 'pretranslate', context.idx, cbs))
			: await getLLMCache(await ParseMarkdown(displayText, context.character, 'notrim', context.idx, cbs))
	return cache !== null
}

/** ChatBody.svelte markParsing, translated branches. */
export async function renderTranslatedMarkdown(
	displayText: string,
	context: BodyContext,
	options: { regenerate: boolean; onTranslating?: (active: boolean) => void },
): Promise<string> {
	const cbs = getBodyCbsConditions(context.role, context.firstMessage)
	const setTranslating = options.onTranslating ?? (() => {})
	if (DBState.db.translatorType === 'llm' && DBState.db.translateBeforeHTMLFormatting) {
		await wait(100)
		setTranslating(true)
		let translated: string
		try {
			translated = await translateHTML(displayText, false, context.character, context.idx, options.regenerate)
		} finally {
			setTranslating(false)
		}
		return ParseMarkdown(translated, context.character, 'notrim', context.idx, cbs)
	}
	const mode = DBState.db.legacyTranslation ? 'notrim' : 'pretranslate'
	const marked = await ParseMarkdown(displayText, context.character, mode, context.idx, cbs)
	setTranslating(true)
	try {
		const translated = await translateHTML(marked, false, context.character, context.idx, options.regenerate)
		return mode === 'pretranslate' ? await postTranslationParse(translated) : translated
	} finally {
		setTranslating(false)
	}
}

/** Chat.svelte getTranslationCacheKey: uses the stored-message role, like the original. */
export async function getTranslationCacheKey(
	displayText: string,
	options: { character: RenderCharacter; idx: number; firstMessage: boolean },
): Promise<string> {
	if (DBState.db.translateBeforeHTMLFormatting) {
		return displayText
	}
	const cbs = getDisplayCbsConditions(options.idx, options.firstMessage)
	const mode = DBState.db.legacyTranslation ? 'notrim' : 'pretranslate'
	return ParseMarkdown(displayText, options.character, mode, options.idx, cbs)
}

/**
 * ChatBody.svelte markParsing error handling: the first attempt plus three retries,
 * then an error alert and the unrendered text.
 */
export async function renderBody(
	displayText: string,
	context: BodyContext,
	options: { translate: boolean; regenerate: boolean; onTranslating?: (active: boolean) => void },
): Promise<string> {
	let lastError: unknown = null
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			if (options.translate || options.regenerate) {
				return await renderTranslatedMarkdown(displayText, context, { regenerate: options.regenerate, onTranslating: options.onTranslating })
			}
			return await renderMarkdown(displayText, context)
		} catch (error) {
			lastError = error
		}
	}
	const error = lastError as Error
	alertError(`Error while parsing chat message: ${options.translate}, ${error?.message}, ${error?.stack}`)
	return displayText
}
