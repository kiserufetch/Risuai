import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertConfirm, alertInput, alertRequestData } from 'src/ts/alert'
import { changeChatTo, createChatCopyName } from 'src/ts/globalApi.svelte'
import { sayTTS } from 'src/ts/process/tts'
import type { MessageGenerationInfo } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'
import { setLLMCache } from 'src/ts/translator/translator'
import { getUserName } from 'src/ts/util'
import { resetAlternatives } from './alternatives.svelte'
import * as session from './session.svelte'

// Message actions of Chat.svelte and the greeting controls of DefaultChatScreen.svelte.
// Every index-based action is a no-op for the greeting (index -1).

const BOOKMARK_NAME_BLACKLIST = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '|', ';', ':', '"', "'", ',', '.', '<', '>', '/', '?']

export async function removeMessage(idx: number): Promise<boolean> {
    if (!session.getMessage(idx)) {
        return false
    }
    const confirmed = DBState.db.askRemoval ? await alertConfirm(language.removeChat) : true
    if (!confirmed) {
        return false
    }
    const chat = session.getChat()
    const messages = chat.message
    messages.splice(idx, 1)
    chat.message = messages
    // The removed message may have been part of a recorded reroll snapshot; the alternatives
    // history is only valid against the exact tail it was recorded from, so drop it rather than
    // risk an unrelated snapshot overwriting a reply later (simplest correct rule: always reset).
    resetAlternatives()
    return true
}

export async function removeMessagesFrom(idx: number): Promise<boolean> {
    if (!session.getMessage(idx)) {
        return false
    }
    const confirmed = await alertConfirm(language.mobileChat.removeFromHereConfirm)
    if (!confirmed) {
        return false
    }
    const chat = session.getChat()
    chat.message = chat.message.slice(0, idx)
    resetAlternatives()
    return true
}

export function saveMessageEdit(idx: number, text: string): boolean {
    const message = session.getMessage(idx)
    if (!message) {
        return false
    }
    message.data = text
    return true
}

export function isBookmarked(idx: number): boolean {
    const id = session.getMessage(idx)?.chatId
    if (!id) {
        return false
    }
    return session.getChat()?.bookmarks?.includes(id) ?? false
}

export function defaultBookmarkName(content: string): string {
    const lines = content.split('\n')
    const secondHalf = lines.splice(Math.floor(lines.length * 0.5))
    for (const line of secondHalf) {
        if (line && !BOOKMARK_NAME_BLACKLIST.some((c) => line.startsWith(c))) {
            return line.trim().slice(0, 50) + '...'
        }
    }
    return content.slice(0, 50) + '...'
}

export async function toggleBookmark(idx: number): Promise<void> {
    const chat = session.getChat()
    const message = session.getMessage(idx)
    if (!chat || !message) {
        return
    }
    let messageId = message.chatId
    if (!messageId) {
        messageId = v4()
        message.chatId = messageId
    }
    chat.bookmarks ??= []
    chat.bookmarkNames ??= {}
    const existing = chat.bookmarks.indexOf(messageId)
    if (existing > -1) {
        chat.bookmarks.splice(existing, 1)
        delete chat.bookmarkNames[messageId]
    } else {
        chat.bookmarks.push(messageId)
        const sender = message.role === 'user' ? getUserName() : session.getCharacter()?.name
        const name = await alertInput(language.bookmarkAskNameOrDefault, [], chat.bookmarkNames[messageId] || '')
        chat.bookmarkNames[messageId] = name && name.trim() !== '' ? name : `${sender}| ${defaultBookmarkName(message.data)}`
    }
    chat.bookmarks = [...chat.bookmarks]
}

export function branchFromMessage(idx: number): boolean {
    const character = session.getCharacter()
    const currentChat = session.getChat()
    const currentMessage = session.getMessage(idx)
    if (!character || !currentChat || !currentMessage) {
        return false
    }
    if (DBState.db.createFolderOnBranch && !currentChat.folderId) {
        const folderId = v4()
        character.chatFolders ??= []
        character.chatFolders.unshift({ id: folderId, name: `Branches of ${currentChat.name}`, folded: false })
        currentChat.folderId = folderId
    }
    const newChat = $state.snapshot(currentChat)
    newChat.name = createChatCopyName(newChat.name, 'Branch')
    newChat.id = v4()
    newChat.message = newChat.message.slice(0, idx + 1)
    newChat.message.push({
        role: 'char',
        data: '{{specialcomment::branchedfrom::' + currentChat.id + '::' + currentChat.name + '::' + currentMessage.chatId + '::}}',
        isComment: true,
        disabled: true,
        chatId: v4(),
    })
    character.chats.unshift(newChat)
    changeChatTo(0)
    return true
}

export function toggleHidden(idx: number): void {
    const message = session.getMessage(idx)
    if (!message) {
        return
    }
    message.disabled = !message.disabled
}

export function toggleHiddenBefore(idx: number): void {
    const message = session.getMessage(idx)
    if (!message) {
        return
    }
    message.disabled = message.disabled === 'allBefore' ? false : 'allBefore'
}

export function showGenerationInfo(idx: number, fallback: MessageGenerationInfo | null = null): void {
    const genInfo = idx >= 0 ? session.getMessage(idx)?.generationInfo : fallback
    if (!genInfo) {
        return
    }
    alertRequestData({ genInfo, idx })
}

export function speakMessage(text: string) {
    return sayTTS(null, text)
}

export function getGreetingText(): string {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat) {
        return ''
    }
    const index = chat.fmIndex ?? -1
    return index === -1 ? character.firstMessage : character.alternateGreetings[index] ?? ''
}

export function getGreetingCounter(): { index: number; total: number } | null {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat || character.alternateGreetings.length === 0) {
        return null
    }
    return { index: (chat.fmIndex ?? -1) + 2, total: character.alternateGreetings.length + 1 }
}

export function nextGreeting(): void {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat) {
        return
    }
    const index = chat.fmIndex ?? -1
    chat.fmIndex = index >= character.alternateGreetings.length - 1 ? -1 : index + 1
}

export function previousGreeting(): void {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat) {
        return
    }
    const index = chat.fmIndex ?? -1
    chat.fmIndex = index === -1 ? character.alternateGreetings.length - 1 : index - 1
}

export function saveTranslationEdit(key: string, text: string): Promise<void> {
    return setLLMCache(key, text)
}
