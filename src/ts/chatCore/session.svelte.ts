import type { Chat, Message, character, groupChat } from 'src/ts/storage/database.svelte'
import { DBState, selIdState } from 'src/ts/stores.svelte'

// Read access to the chat the mobile chat screen shows. Reads go through the
// reactive DBState proxy, so callers inside $derived/$effect stay reactive.

export interface PersonaView {
    name: string
    icon: string
    largePortrait: boolean
}

export interface SpeakerView {
    name: string
    image: string
    largePortrait: boolean
    chaId: string | null
}

export function getCharacterIndex(): number {
    return selIdState.selId
}

export function getCharacter(): character | groupChat | undefined {
    return DBState.db.characters?.[selIdState.selId]
}

export function getChat(): Chat | undefined {
    const char = getCharacter()
    return char?.chats?.[char.chatPage]
}

export function getMessages(): Message[] {
    return getChat()?.message ?? []
}

export function getMessage(idx: number): Message | undefined {
    if (idx < 0) {
        return undefined
    }
    return getMessages()[idx]
}

export function isGroup(): boolean {
    return getCharacter()?.type === 'group'
}

/** Stable key for per-chat state; legacy chats without an id fall back to their position. */
export function getChatKey(): string {
    const chat = getChat()
    if (chat?.id) {
        return chat.id
    }
    return `${selIdState.selId}:${getCharacter()?.chatPage ?? 0}`
}

/** DefaultChatScreen.svelte: the persona bound to the chat, else the selected persona. */
export function getPersona(): PersonaView {
    const db = DBState.db
    const bound = getChat()?.bindedPersona
    if (bound) {
        const persona = db.personas?.find((p) => p.id === bound)
        if (persona) {
            return { name: persona.name, icon: persona.icon, largePortrait: persona.largePortrait ?? false }
        }
    }
    const selected = db.personas?.[db.selectedPersona]
    return { name: db.username, icon: selected?.icon ?? '', largePortrait: selected?.largePortrait ?? false }
}

/**
 * Name handed to the CBS parser as `chara` (Chats.svelte): the persona name for user
 * messages, otherwise the character's own name, which is the group's name in group chats.
 * Scripts depend on this exact value, so it must not follow the speaker.
 */
export function getRenderName(message: Message | undefined): string {
    if (message?.role === 'user') {
        return getPersona().name
    }
    return getCharacter()?.name ?? ''
}

/** Who the UI shows as the author of a message. */
export function getSpeaker(message: Message | undefined): SpeakerView {
    const char = getCharacter()
    if (message?.role === 'user') {
        const persona = getPersona()
        return { name: message.name || persona.name, image: persona.icon, largePortrait: persona.largePortrait, chaId: null }
    }
    if (char?.type === 'group' && message?.saying) {
        const speaker = DBState.db.characters.find((c) => c.chaId === message.saying)
        if (speaker) {
            return {
                name: speaker.name,
                image: speaker.image ?? '',
                largePortrait: (speaker as character).largePortrait ?? false,
                chaId: speaker.chaId,
            }
        }
    }
    return {
        name: char?.name ?? '',
        image: char?.image ?? '',
        largePortrait: (char as character | undefined)?.largePortrait ?? false,
        chaId: char?.chaId ?? null,
    }
}
