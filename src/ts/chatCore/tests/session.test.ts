import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())

import * as session from '../session.svelte'
import { DBState, currentChat, makeCharacter, makeChat, makeGroup, makeMessage, resetHarness, selectCharacter } from './harness'

beforeEach(() => {
    resetHarness()
})

describe('session', () => {
    it('reads the selected character, chat and messages', () => {
        const first = makeMessage('user', 'Hello')
        currentChat().message.push(first)
        expect(session.getCharacterIndex()).toBe(0)
        expect(session.getCharacter()?.name).toBe('Lira')
        expect(session.getChat()?.id).toBe('chat-1')
        expect(session.getMessages()).toHaveLength(1)
        expect(session.getMessage(0)).toBe(first)
        expect(session.getMessage(-1)).toBeUndefined()
        expect(session.isGroup()).toBe(false)
    })

    it('follows the selected character and chat page', () => {
        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', chatPage: 1, chats: [makeChat({ id: 'a' }), makeChat({ id: 'b' })] }))
        selectCharacter(1)
        expect(session.getCharacter()?.name).toBe('Born')
        expect(session.getChat()?.id).toBe('b')
    })

    it('builds a chat key from the chat id, or from the position for legacy chats', () => {
        expect(session.getChatKey()).toBe('chat-1')
        delete currentChat().id
        expect(session.getChatKey()).toBe('0:0')
    })

    it('prefers the persona bound to the chat', () => {
        DBState.db.personas.push({ id: 'persona-2', name: 'Knight', icon: 'knight.png', largePortrait: true, personaPrompt: '' })
        expect(session.getPersona()).toEqual({ name: 'Traveller', icon: '', largePortrait: false })
        currentChat().bindedPersona = 'persona-2'
        expect(session.getPersona()).toEqual({ name: 'Knight', icon: 'knight.png', largePortrait: true })
    })

    it('uses the group name as render name while showing the real speaker', () => {
        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', image: 'born.png' }))
        DBState.db.characters.push(makeGroup())
        selectCharacter(2)
        const reply = makeMessage('char', 'Twenty winters!', { saying: 'cha-born' })
        expect(session.isGroup()).toBe(true)
        expect(session.getRenderName(reply)).toBe('Lame Raven')
        expect(session.getSpeaker(reply)).toEqual({ name: 'Born', image: 'born.png', largePortrait: false, chaId: 'cha-born' })
        expect(session.getSpeaker(makeMessage('char', '?', { saying: 'unknown' })).name).toBe('Lame Raven')
    })

    it('renders user messages with the persona name but shows multiuser senders', () => {
        expect(session.getRenderName(makeMessage('user', 'hi', { name: 'Guest' }))).toBe('Traveller')
        expect(session.getSpeaker(makeMessage('user', 'hi', { name: 'Guest' })).name).toBe('Guest')
        expect(session.getSpeaker(makeMessage('user', 'hi')).name).toBe('Traveller')
    })
})
