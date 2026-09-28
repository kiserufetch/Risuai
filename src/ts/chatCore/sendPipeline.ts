import { get } from 'svelte/store'
import sendSound from 'src/etc/send.mp3'
import { alertError } from 'src/ts/alert'
import { generateAutoReply } from 'src/ts/process/autoReply'
import { processMultiCommand } from 'src/ts/process/command'
import { doingChat, sendChat } from 'src/ts/process/index.svelte'
import { processScript } from 'src/ts/process/scripts'
import { runTrigger } from 'src/ts/process/triggers'
import { DBState, selectedCharID } from 'src/ts/stores.svelte'
import { ConnectionOpenStore } from 'src/ts/sync/multiuser'
import { recordGeneration, resetAlternatives } from './alternatives.svelte'
import { beginGeneration, endGeneration, generationStatus } from './generationStatus.svelte'
import * as session from './session.svelte'

// Sending and generating exactly like DefaultChatScreen.svelte (sendMain, sendChatMain,
// abortChat, runAutoMode, runAutoReply), without the component state.

export type SendOutcome = 'busy' | 'command' | 'sent'

let abortController: AbortController | null = null
/** Guards generate() against re-entry while an earlier generation is still streaming. */
let generating = false
/** Guards sendMessage() against re-entry while an earlier call is still building its message. */
let sending = false

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The chat pinned by an already-captured character/page pair, not the live selection. */
function chatOf(charIndex: number, chatPage: number) {
    return DBState.db.characters[charIndex].chats[chatPage]
}

export function playSendSound(): void {
    if (!DBState.db.playMessage) {
        return
    }
    const audio = new Audio(sendSound)
    audio.play().catch(() => {})
}

/** DefaultChatScreen.sendChatMain. */
export async function generate(options: { continueResponse?: boolean } = {}): Promise<void> {
    if (generating) {
        return
    }
    generating = true
    const charIndex = get(selectedCharID)
    const chatPage = DBState.db.characters[charIndex].chatPage
    const chatKey = session.getChatKey()
    const previousLength = chatOf(charIndex, chatPage).message.length
    abortController = new AbortController()
    beginGeneration({ charIndex, retry: () => generate(options) })
    try {
        await sendChat(-1, { signal: abortController.signal, continue: options.continueResponse ?? false })
        recordGeneration(chatKey, chatOf(charIndex, chatPage).message, previousLength)
    } catch (error) {
        console.error(error)
        alertError(error)
    } finally {
        endGeneration()
        doingChat.set(false)
        playSendSound()
        generating = false
    }
}

/** DefaultChatScreen.abortChat. */
export function abortGeneration(): void {
    abortController?.abort()
}

/** "Continue" is offered only right after a character reply (DefaultChatScreen menu). */
export function canContinue(): boolean {
    const messages = session.getMessages()
    return messages.length >= 2 && messages[messages.length - 1].role === 'char'
}

/** DefaultChatScreen.sendMain. */
export async function sendMessage(input: string, attachments: string[] = [], options: { continueResponse?: boolean } = {}): Promise<SendOutcome> {
    if (sending || get(doingChat)) {
        return 'busy'
    }
    sending = true
    try {
        // Pin the send to the chat that started it: charIndex/chatPage/chatKey are read once,
        // up front, so a selection change during the awaited trigger/script below can't make
        // this land in, or reset alternatives for, a different chat.
        const charIndex = get(selectedCharID)
        const character = DBState.db.characters[charIndex]
        const chatPage = character.chatPage
        const chatKey = session.getChatKey()
        const chat = character.chats[chatPage]
        let messages = chat.message
        let text = input

        if (text.startsWith('/')) {
            const commandProcessed = await processMultiCommand(text)
            if (commandProcessed !== false) {
                return 'command'
            }
        }

        for (const file of attachments) {
            text += `{{inlayed::${file}}}`
        }

        const multiuserName = get(ConnectionOpenStore) ? DBState.db.username : null
        if (text === '') {
            if (character.type !== 'group') {
                if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
                    if (DBState.db.useSayNothing) {
                        messages.push({ role: 'user', data: '*says nothing*', name: multiuserName })
                    }
                }
            }
        } else if (character.type === 'character') {
            const triggerResult = await runTrigger(character, 'input', { chat })
            if (triggerResult) {
                messages = triggerResult.chat.message
            }
            messages.push({ role: 'user', data: await processScript(character, text, 'editinput'), time: Date.now(), name: multiuserName })
        } else {
            messages.push({ role: 'user', data: text, time: Date.now(), name: multiuserName })
        }

        DBState.db.characters[charIndex].chats[chatPage].message = messages
        resetAlternatives(chatKey)
        await wait(10)
        await generate({ continueResponse: options.continueResponse })
        return 'sent'
    } finally {
        sending = false
    }
}

/** DefaultChatScreen.sendContinue: sends the draft (if any), then continues the reply. */
export function continueResponse(input: string, attachments: string[] = []): Promise<SendOutcome> {
    return sendMessage(input, attachments, { continueResponse: true })
}

/** DefaultChatScreen.runAutoMode: group chats keep generating until toggled off. */
export async function toggleGroupAutoMode(): Promise<void> {
    if (generationStatus.autoMode) {
        generationStatus.autoMode = false
        return
    }
    const charIndex = get(selectedCharID)
    generationStatus.autoMode = true
    while (generationStatus.autoMode) {
        await generate()
        if (charIndex !== get(selectedCharID)) {
            generationStatus.autoMode = false
        }
    }
}

/** DefaultChatScreen.runAutoReply: returns the suggested user reply, or null. */
export async function requestAutoReply(): Promise<string | null> {
    if (generationStatus.autoReplyPending || get(doingChat)) {
        return null
    }
    generationStatus.autoReplyPending = true
    try {
        return await generateAutoReply()
    } catch (error) {
        alertError(`${error}`)
        return null
    } finally {
        generationStatus.autoReplyPending = false
    }
}
