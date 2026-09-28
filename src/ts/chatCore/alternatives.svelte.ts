import { get } from 'svelte/store'
import { doingChat } from 'src/ts/process/index.svelte'
import { getPrerollState, PreUnreroll, Prereroll } from 'src/ts/process/prereroll'
import type { Message } from 'src/ts/storage/database.svelte'
import * as session from './session.svelte'

// Reroll history of DefaultChatScreen.svelte (`rerolls` / `rerollid`), kept per chat
// instead of per component: it survives leaving the chat screen and never leaks
// between chats of the same character.

interface AlternativesEntry {
    snapshots: Message[][]
    index: number
}

export interface AlternativesCounter {
    index: number
    total: number
}

const entries = new Map<string, AlternativesEntry>()
let version = $state(0)

function touch(): void {
    version += 1
}

function getEntry(key: string): AlternativesEntry {
    let entry = entries.get(key)
    if (!entry) {
        entry = { snapshots: [], index: -1 }
        entries.set(key, entry)
    }
    return entry
}

export function resetAlternatives(key: string = session.getChatKey()): void {
    entries.set(key, { snapshots: [], index: -1 })
    touch()
}

/**
 * The applied snapshot (`entry.snapshots[entry.index]`) is only meaningful while the chat's
 * tail still is that exact snapshot. `removeMessage`/`removeMessagesFrom`, slash commands,
 * triggers and Lua can all replace the tail without going through reroll/unreroll, which would
 * otherwise let a stale snapshot overwrite an unrelated reply. Every entry point that acts on
 * `entry.index` checks this first.
 */
function tailMatchesSnapshot(snapshot: Message[]): boolean {
    const ids = snapshot.map((message) => message.chatId)
    if (ids.length === 0 || ids.some((id) => !id)) {
        return false
    }
    const messages = session.getMessages()
    if (messages.length < ids.length) {
        return false
    }
    const tail = messages.slice(messages.length - ids.length)
    return tail.every((message, i) => message.chatId === ids[i])
}

function isEntryStale(entry: AlternativesEntry): boolean {
    if (entry.index < 0 || entry.index >= entry.snapshots.length) {
        return false
    }
    return !tailMatchesSnapshot(entry.snapshots[entry.index])
}

/** sendChatMain: remember the messages a generation appended. */
export function recordGeneration(key: string, messages: Message[], previousLength: number): void {
    if (previousLength >= messages.length) {
        return
    }
    const entry = getEntry(key)
    entry.snapshots.push(safeStructuredClone(messages.slice(previousLength)))
    entry.index = entry.snapshots.length - 1
    touch()
}

function applySnapshot(snapshot: Message[]): void {
    const chat = session.getChat()
    if (!chat) {
        return
    }
    const data = safeStructuredClone(snapshot)
    const messages = chat.message
    for (let i = 0; i < data.length; i++) {
        messages[messages.length - data.length + i] = data[i]
    }
    chat.message = messages
}

function lastGenerationId(): string | undefined {
    return session.getMessages().at(-1)?.generationInfo?.generationId
}

/** DefaultChatScreen.reroll: cached candidate, then history, then a new generation. */
export async function reroll(generate: () => Promise<void>): Promise<void> {
    if (get(doingChat)) {
        return
    }
    const chat = session.getChat()
    if (!chat) {
        return
    }
    const genId = lastGenerationId()
    if (genId) {
        const cached = Prereroll(genId)
        if (cached) {
            chat.message[chat.message.length - 1].data = cached
            touch()
            return
        }
    }
    const key = session.getChatKey()
    let entry = getEntry(key)
    if (isEntryStale(entry)) {
        resetAlternatives(key)
        entry = getEntry(key)
    }
    if (entry.index < entry.snapshots.length - 1) {
        if (Array.isArray(entry.snapshots[entry.index + 1])) {
            entry.index += 1
            applySnapshot(entry.snapshots[entry.index])
            touch()
        }
        return
    }
    if (entry.snapshots.length === 0 && chat.message.length > 0) {
        entry.snapshots.push(safeStructuredClone([chat.message[chat.message.length - 1]]))
        entry.index = entry.snapshots.length - 1
    }
    const messages = safeStructuredClone(chat.message)
    if (messages.length === 0) {
        return
    }
    // Drop the trailing replies back to the user turn; in group chats stop before
    // the previous reply of the same speaker, like the original.
    const saying = messages[messages.length - 1].saying
    let sayingQuota = 2
    while (messages.length > 0 && messages[messages.length - 1].role !== 'user') {
        if (messages[messages.length - 1].saying === saying) {
            sayingQuota -= 1
            if (sayingQuota === 0) {
                break
            }
        }
        messages.pop()
    }
    if (messages.length === 0) {
        return
    }
    chat.message = messages
    await generate()
}

/** DefaultChatScreen.unReroll. */
export function previousAlternative(): void {
    if (get(doingChat)) {
        return
    }
    const chat = session.getChat()
    if (!chat) {
        return
    }
    const genId = lastGenerationId()
    if (genId) {
        const cached = PreUnreroll(genId)
        if (cached) {
            chat.message[chat.message.length - 1].data = cached
            touch()
            return
        }
    }
    const key = session.getChatKey()
    const entry = getEntry(key)
    if (isEntryStale(entry)) {
        resetAlternatives(key)
        return
    }
    if (entry.index <= 0) {
        return
    }
    if (Array.isArray(entry.snapshots[entry.index - 1])) {
        entry.index -= 1
        applySnapshot(entry.snapshots[entry.index])
        touch()
    }
}

/** 1-based position among known variants of the last reply; null when there is only one. */
export function getAlternativesCounter(): AlternativesCounter | null {
    void version
    const genId = lastGenerationId()
    if (genId) {
        const preroll = getPrerollState(genId)
        if (preroll && preroll.total > 1) {
            return { index: preroll.index + 1, total: preroll.total }
        }
    }
    const key = session.getChatKey()
    const entry = entries.get(key)
    if (!entry || entry.snapshots.length < 2) {
        return null
    }
    if (isEntryStale(entry)) {
        resetAlternatives(key)
        return null
    }
    return { index: entry.index + 1, total: entry.snapshots.length }
}
