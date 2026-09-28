import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertConfirm, alertError, alertInput, alertNormal, alertSelect } from 'src/ts/alert'
import { changeChatTo, createChatCopyName } from 'src/ts/globalApi.svelte'
import { DBState, ReloadGUIPointer } from 'src/ts/stores.svelte'
import { createMultiuserRoom } from 'src/ts/sync/multiuser'
import * as session from './session.svelte'

// Chat list of the current character for the mobile chats sheet, ported from
// SideChatList.svelte (same fields: chats, chatFolders, folderId, bindedPersona).

/** Which overlay of the mobile chat screen is open. */
export const chatOverlay = $state({ view: 'none' as 'none' | 'chats' | 'profile' })

/** SideChatList folder colors (Tailwind 900 shades there) as swatches. */
export const FOLDER_COLORS: Record<string, string> = {
    red: '#ef4444',
    yellow: '#f59e0b',
    green: '#22c55e',
    blue: '#3b82f6',
    indigo: '#6366f1',
    purple: '#a855f7',
    pink: '#ec4899',
    default: '#6b7280',
}

export function folderColor(color: string | undefined): string {
    return FOLDER_COLORS[color ?? 'default'] ?? FOLDER_COLORS.default
}

export function selectChat(index: number): void {
    changeChatTo(index)
    ReloadGUIPointer.update((v) => v + 1)
}

export function duplicateChat(index: number): void {
    const char = session.getCharacter()
    if (!char?.chats[index]) {
        return
    }
    const copy = $state.snapshot(char.chats[index])
    copy.name = createChatCopyName(copy.name, 'Copy')
    copy.id = v4()
    char.chats.unshift(copy)
    char.chats = char.chats
    changeChatTo(0)
}

export async function renameChat(index: number): Promise<void> {
    const chat = session.getCharacter()?.chats[index]
    if (!chat) {
        return
    }
    const name = await alertInput(language.mobileChats.renamePrompt, [], chat.name)
    if (name && name.trim()) {
        chat.name = name.trim()
    }
}

export async function moveChatToFolder(index: number): Promise<void> {
    const char = session.getCharacter()
    const chat = char?.chats[index]
    if (!char || !chat) {
        return
    }
    const folders = char.chatFolders ?? []
    const options = [language.mobileDialogs.noFolder, ...folders.map((f) => f.name)]
    const picked = Number(await alertSelect(options, language.mobileDialogs.moveToFolder))
    if (!Number.isInteger(picked) || picked < 0 || picked >= options.length) {
        return
    }
    chat.folderId = picked === 0 ? null : folders[picked - 1].id
    ReloadGUIPointer.update((v) => v + 1)
}

/** SideChatList chat option 1: bind the selected persona to the chat, or unbind it. */
export async function toggleChatPersona(index: number): Promise<void> {
    const chat = session.getCharacter()?.chats[index]
    if (!chat) {
        return
    }
    if (chat.bindedPersona) {
        if (await alertConfirm(language.doYouWantToUnbindCurrentPersona)) {
            chat.bindedPersona = ''
            alertNormal(language.personaUnbindedSuccess)
        }
        return
    }
    if (await alertConfirm(language.doYouWantToBindCurrentPersona)) {
        const persona = DBState.db.personas[DBState.db.selectedPersona]
        if (!persona.id) {
            persona.id = v4()
        }
        chat.bindedPersona = persona.id
        alertNormal(language.personaBindedSuccess)
    }
}

export function boundPersonaName(index: number): string {
    const id = session.getCharacter()?.chats[index]?.bindedPersona
    return id ? DBState.db.personas.find((p) => p.id === id)?.name ?? '' : ''
}

export function openMultiuserRoom(index: number): void {
    changeChatTo(index)
    createMultiuserRoom()
}

export async function deleteChat(index: number): Promise<void> {
    const char = session.getCharacter()
    const chat = char?.chats[index]
    if (!char || !chat) {
        return
    }
    if (char.chats.length === 1) {
        alertError(language.errors.onlyOneChat)
        return
    }
    if (!(await alertConfirm(`${language.removeConfirm}${chat.name}`))) {
        return
    }
    changeChatTo(0)
    char.chats.splice(char.chats.indexOf(chat), 1)
    char.chats = char.chats
    ReloadGUIPointer.update((v) => v + 1)
}

export function createChatFolder(): string | null {
    const char = session.getCharacter()
    if (!char) {
        return null
    }
    char.chatFolders ??= []
    const id = v4()
    char.chatFolders.unshift({ id, name: `${language.mobileChats.newFolderName} ${char.chatFolders.length + 1}`, folded: false })
    return id
}

export async function deleteChatFolder(id: string): Promise<boolean> {
    const char = session.getCharacter()
    const folder = char?.chatFolders?.find((f) => f.id === id)
    if (!char || !folder) {
        return false
    }
    if (!(await alertConfirm(`${language.removeConfirm}${folder.name}`))) {
        return false
    }
    char.chatFolders = char.chatFolders.filter((f) => f.id !== id)
    for (const chat of char.chats) {
        if (chat.folderId === id) {
            chat.folderId = null
        }
    }
    ReloadGUIPointer.update((v) => v + 1)
    return true
}

/** "48 messages" with the interface language's plural rules. */
export function messagesLabel(count: number): string {
    let category: Intl.LDMLPluralRule = 'other'
    try {
        category = new Intl.PluralRules(DBState.db.language || 'en').select(count)
    } catch {
        // unknown locale tag: fall back to 'other'
    }
    const template = category === 'one' ? language.mobileChats.msgOne : category === 'few' ? language.mobileChats.msgFew : language.mobileChats.msgMany
    return template.replace('{}', count.toLocaleString())
}

const relative = new Intl.RelativeTimeFormat(undefined, { style: 'short', numeric: 'auto' })

/** "5 min ago", "yesterday"…; '' when the time is unknown. */
export function relativeTime(time: number | undefined): string {
    if (!time) {
        return ''
    }
    const diff = Date.now() - time
    const steps: [number, Intl.RelativeTimeFormatUnit][] = [
        [31536000000, 'year'], [2592000000, 'month'], [604800000, 'week'], [86400000, 'day'], [3600000, 'hour'], [60000, 'minute'],
    ]
    for (const [size, unit] of steps) {
        if (diff >= size) {
            return relative.format(-Math.floor(diff / size), unit)
        }
    }
    return relative.format(0, 'second')
}
