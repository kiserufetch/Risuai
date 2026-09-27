import { addMetadataToElement, ParseMarkdown, trimMarkdown, type CbsConditions, type simpleCharacterArgument } from 'src/ts/parser/parser.svelte'
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
