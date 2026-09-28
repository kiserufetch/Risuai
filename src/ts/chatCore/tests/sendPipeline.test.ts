import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { doingChat: harness.doingChat, chatProcessStage: harness.chatProcessStage, sendChat: vi.fn(async () => true) }
})
vi.mock('src/ts/process/command', () => ({ processMultiCommand: vi.fn(async () => false) }))
vi.mock('src/ts/process/triggers', () => ({ runTrigger: vi.fn(async () => null) }))
vi.mock('src/ts/process/scripts', () => ({ processScript: vi.fn(async (_char: unknown, text: string) => `edited:${text}`) }))
vi.mock('src/ts/sync/multiuser', async () => {
    const { writable } = await import('svelte/store')
    return { ConnectionOpenStore: writable(false) }
})
vi.mock('src/ts/process/autoReply', () => ({ generateAutoReply: vi.fn(async () => 'auto reply') }))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))
vi.mock('src/ts/process/prereroll', () => ({ Prereroll: vi.fn(() => null), PreUnreroll: vi.fn(() => null), getPrerollState: vi.fn(() => null) }))
vi.mock('src/etc/send.mp3', () => ({ default: 'send.mp3' }))

import { alertError } from 'src/ts/alert'
import { generateAutoReply } from 'src/ts/process/autoReply'
import { processMultiCommand } from 'src/ts/process/command'
import { sendChat } from 'src/ts/process/index.svelte'
import { processScript } from 'src/ts/process/scripts'
import { runTrigger } from 'src/ts/process/triggers'
import { ConnectionOpenStore } from 'src/ts/sync/multiuser'
import { getAlternativesCounter, reroll, resetAlternatives } from '../alternatives.svelte'
import { generationStatus, getErrorForCurrentChat, retryGeneration } from '../generationStatus.svelte'
import { abortGeneration, canContinue, continueResponse, generate, requestAutoReply, sendMessage, toggleGroupAutoMode } from '../sendPipeline'
import { alertStore, DBState, currentChat, doingChat, makeCharacter, makeChat, makeGroup, makeMessage, resetHarness, selectCharacter } from './harness'

let replyCount = 0

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    replyCount = 0
    resetAlternatives('chat-1')
    generationStatus.autoMode = false
    ConnectionOpenStore.set(false)
    vi.mocked(sendChat).mockImplementation(async () => {
        replyCount += 1
        currentChat().message.push(makeMessage('char', `reply ${replyCount}`))
        return true
    })
})

const texts = () => currentChat().message.map((m: any) => m.data)

describe('sendMessage', () => {
    it('refuses to send while a generation is running', async () => {
        doingChat.set(true)
        await expect(sendMessage('Hello')).resolves.toBe('busy')
        expect(sendChat).not.toHaveBeenCalled()
        expect(currentChat().message).toHaveLength(0)
    })

    it('treats slash commands as commands', async () => {
        vi.mocked(processMultiCommand).mockResolvedValueOnce('done' as never)
        await expect(sendMessage('/echo hi')).resolves.toBe('command')
        expect(processMultiCommand).toHaveBeenCalledWith('/echo hi')
        expect(sendChat).not.toHaveBeenCalled()
        expect(currentChat().message).toHaveLength(0)
    })

    it('runs the input trigger and editinput before pushing the user message', async () => {
        await expect(sendMessage('Hello')).resolves.toBe('sent')
        const character = DBState.db.characters[0]
        expect(runTrigger).toHaveBeenCalledWith(character, 'input', { chat: currentChat() })
        expect(processScript).toHaveBeenCalledWith(character, 'Hello', 'editinput')
        const [userMessage, reply] = currentChat().message
        expect(userMessage).toMatchObject({ role: 'user', data: 'edited:Hello', name: null })
        expect(typeof userMessage.time).toBe('number')
        expect(reply.data).toBe('reply 1')
        expect(sendChat).toHaveBeenCalledWith(-1, { signal: expect.any(AbortSignal), continue: false })
        expect(get(doingChat)).toBe(false)
        expect(generationStatus.running).toBe(false)
    })

    it('lets the input trigger replace the chat history', async () => {
        vi.mocked(runTrigger).mockResolvedValueOnce({ chat: makeChat({ message: [makeMessage('user', 'from trigger')] }) } as never)
        await sendMessage('Hello')
        expect(texts()).toEqual(['from trigger', 'edited:Hello', 'reply 1'])
    })

    it('appends attachments as inlay tokens', async () => {
        await sendMessage('Look', ['img-1', 'img-2'])
        expect(processScript).toHaveBeenCalledWith(DBState.db.characters[0], 'Look{{inlayed::img-1}}{{inlayed::img-2}}', 'editinput')
    })

    it('sends "says nothing" for an empty message when enabled', async () => {
        currentChat().message.push(makeMessage('char', 'Well?'))
        await sendMessage('')
        expect(currentChat().message[1]).toMatchObject({ role: 'user', data: '*says nothing*' })
        expect(runTrigger).not.toHaveBeenCalled()
    })

    it('adds nothing for an empty message when "says nothing" is off', async () => {
        DBState.db.useSayNothing = false
        currentChat().message.push(makeMessage('char', 'Well?'))
        await sendMessage('')
        expect(texts()).toEqual(['Well?', 'reply 1'])
    })

    it('pushes raw text in group chats without input scripts', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        await sendMessage('Hello all')
        expect(currentChat().message[0]).toMatchObject({ role: 'user', data: 'Hello all' })
        expect(runTrigger).not.toHaveBeenCalled()
        expect(processScript).not.toHaveBeenCalled()
    })

    it('names the sender in multiuser rooms', async () => {
        ConnectionOpenStore.set(true)
        await sendMessage('Hello')
        expect(currentChat().message[0].name).toBe('Traveller')
    })

    it('continues the last reply without touching the draft or pushing a message', async () => {
        currentChat().message.push(makeMessage('user', 'Q'), makeMessage('char', 'A'))
        vi.mocked(sendChat).mockImplementationOnce(async (_index, arg) => {
            if (arg.continue) {
                const messages = currentChat().message
                messages[messages.length - 1].data += ' [continued]'
            }
            return true
        })
        await expect(continueResponse()).resolves.toBe('sent')
        expect(sendChat).toHaveBeenCalledWith(-1, { signal: expect.any(AbortSignal), continue: true })
        expect(texts()).toEqual(['Q', 'A [continued]'])
    })

    it('refuses to continue when there is nothing to continue', async () => {
        await expect(continueResponse()).resolves.toBe('busy')
        expect(sendChat).not.toHaveBeenCalled()
        expect(currentChat().message).toHaveLength(0)
    })

    it('refuses to continue while a generation is running', async () => {
        currentChat().message.push(makeMessage('user', 'Q'), makeMessage('char', 'A'))
        doingChat.set(true)
        await expect(continueResponse()).resolves.toBe('busy')
        expect(sendChat).not.toHaveBeenCalled()
    })
})

describe('canContinue', () => {
    it('allows continuing only right after a character reply', () => {
        expect(canContinue()).toBe(false)
        currentChat().message.push(makeMessage('char', 'A'))
        expect(canContinue()).toBe(false)
        currentChat().message.unshift(makeMessage('user', 'Q'))
        expect(canContinue()).toBe(true)
        currentChat().message.push(makeMessage('user', 'more'))
        expect(canContinue()).toBe(false)
    })
})

describe('generate', () => {
    it('records each generation as a reroll alternative', async () => {
        await sendMessage('Hello')
        await reroll(() => generate())
        expect(texts()).toEqual(['edited:Hello', 'reply 2'])
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
    })

    it('keeps the history with the chat that started the generation', async () => {
        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', chats: [makeChat({ id: 'chat-born' })] }))
        currentChat().message.push(makeMessage('user', 'Hi'))
        let count = 0
        vi.mocked(sendChat).mockImplementation(async () => {
            count += 1
            DBState.db.characters[0].chats[0].message.push(makeMessage('char', `r${count}`))
            selectCharacter(1)
            return true
        })
        await generate()
        selectCharacter(0)
        await generate()
        selectCharacter(0)
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
    })

    it('scopes a captured error and Retry to the chat that started the generation', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'))
        vi.mocked(sendChat).mockImplementationOnce(async () => {
            alertStore.set({ type: 'error', msg: 'rate limited' })
            return true
        })
        await generate()
        expect(getErrorForCurrentChat()).toMatchObject({ msg: 'rate limited' })

        // Switch to a different chat: the error card must disappear there...
        DBState.db.characters[0].chats.push(makeChat({ id: 'chat-2' }))
        DBState.db.characters[0].chatPage = 1
        expect(getErrorForCurrentChat()).toBeNull()

        // ...and Retry must not fire the captured action (which would generate in the wrong chat).
        await retryGeneration()
        expect(sendChat).toHaveBeenCalledTimes(1)
        expect(generationStatus.error).toBeNull()
    })

    it('reports failures and always releases the chat', async () => {
        // generate() logs the thrown error via console.error; silence the expected noise.
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const failure = new Error('boom')
            vi.mocked(sendChat).mockRejectedValueOnce(failure)
            await generate()
            expect(alertError).toHaveBeenCalledWith(failure)
            expect(get(doingChat)).toBe(false)
            expect(generationStatus.running).toBe(false)
        } finally {
            consoleError.mockRestore()
        }
    })

    it('aborts the running generation', async () => {
        let receivedSignal: AbortSignal | undefined
        vi.mocked(sendChat).mockImplementationOnce(async (_index, arg) => {
            receivedSignal = arg.signal
            await new Promise<void>((resolve) => arg.signal.addEventListener('abort', () => resolve()))
            return false
        })
        const running = generate()
        abortGeneration()
        await running
        expect(receivedSignal?.aborted).toBe(true)
    })

    it('records against the starting chat page when the user switches chats mid-generation', async () => {
        DBState.db.characters[0].chats.push(makeChat({ id: 'chat-2' }))
        currentChat().message.push(makeMessage('user', 'Hi'))
        let count = 0
        vi.mocked(sendChat).mockImplementation(async () => {
            count += 1
            DBState.db.characters[0].chats[0].message.push(makeMessage('char', `r${count}`))
            DBState.db.characters[0].chatPage = 1
            return true
        })
        await generate()
        DBState.db.characters[0].chatPage = 0
        await generate()
        DBState.db.characters[0].chatPage = 0
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
        expect(DBState.db.characters[0].chats[1].message).toEqual([])
    })

    it('resets the alternatives of the chat that received the message', async () => {
        await generate()
        await generate()
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })

        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', chats: [makeChat({ id: 'chat-born' })] }))
        vi.mocked(runTrigger).mockImplementationOnce(async () => {
            selectCharacter(1)
            return null
        })
        await sendMessage('Hi')
        selectCharacter(0)
        expect(getAlternativesCounter()).not.toEqual({ index: 2, total: 2 })
        expect(getAlternativesCounter()).toBeNull()
    })

    it('recovers from a generation that cannot start', async () => {
        // generate()'s preamble throws for a selection with no character; silence the expected
        // console.error noise from the outer catch.
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            selectCharacter(5)
            await expect(generate()).resolves.toBeUndefined()
            expect(alertError).toHaveBeenCalled()
        } finally {
            consoleError.mockRestore()
        }

        selectCharacter(0)
        currentChat().message.push(makeMessage('user', 'Hi'))
        await generate()
        expect(sendChat).toHaveBeenCalledTimes(1)
    })
})

describe('re-entrancy', () => {
    it('ignores a second send while one is in flight', async () => {
        let resolveSend: (() => void) | undefined
        vi.mocked(sendChat).mockImplementationOnce(async () => {
            await new Promise<void>((resolve) => {
                resolveSend = resolve
            })
            currentChat().message.push(makeMessage('char', 'reply 1'))
            return true
        })
        const first = sendMessage('first')
        await expect(sendMessage('second')).resolves.toBe('busy')
        // sendMessage awaits a real 10ms delay before calling sendChat; wait for that to land
        // (resolveSend to be assigned) instead of racing it, or `first` never resolves.
        await vi.waitFor(() => {
            expect(resolveSend).toBeDefined()
        })
        resolveSend?.()
        await expect(first).resolves.toBe('sent')
        expect(sendChat).toHaveBeenCalledTimes(1)
        expect(texts()).toEqual(['edited:first', 'reply 1'])
    })

    it('stops auto mode instead of spinning while another generation runs', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        let resolveSend: (() => void) | undefined
        vi.mocked(sendChat).mockImplementationOnce(async () => {
            await new Promise<void>((resolve) => {
                resolveSend = resolve
            })
            return true
        })
        const firstGenerate = generate()
        // Wait for the direct generate() call to actually reach sendChat instead of assuming it
        // has, so this stays correct even if the microtask ordering ever shifts.
        await vi.waitFor(() => {
            expect(sendChat).toHaveBeenCalled()
        })
        await toggleGroupAutoMode()
        expect(generationStatus.autoMode).toBe(false)
        expect(sendChat).toHaveBeenCalledTimes(1)
        resolveSend?.()
        await firstGenerate
    })
})

describe('requestAutoReply', () => {
    it('returns the generated reply', async () => {
        await expect(requestAutoReply()).resolves.toBe('auto reply')
        expect(generationStatus.autoReplyPending).toBe(false)
    })

    it('does nothing while a generation runs', async () => {
        doingChat.set(true)
        await expect(requestAutoReply()).resolves.toBeNull()
        expect(generateAutoReply).not.toHaveBeenCalled()
    })

    it('treats an empty model reply as no suggestion', async () => {
        vi.mocked(generateAutoReply).mockResolvedValueOnce('')
        await expect(requestAutoReply()).resolves.toBeNull()
    })

    it('reports errors', async () => {
        vi.mocked(generateAutoReply).mockRejectedValueOnce(new Error('no model'))
        await expect(requestAutoReply()).resolves.toBeNull()
        expect(alertError).toHaveBeenCalledWith('Error: no model')
    })
})

describe('toggleGroupAutoMode', () => {
    it('keeps generating until toggled off', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        let calls = 0
        vi.mocked(sendChat).mockImplementation(async () => {
            calls += 1
            if (calls === 2) {
                await toggleGroupAutoMode()
            }
            return true
        })
        await toggleGroupAutoMode()
        expect(calls).toBe(2)
        expect(generationStatus.autoMode).toBe(false)
    })
})
