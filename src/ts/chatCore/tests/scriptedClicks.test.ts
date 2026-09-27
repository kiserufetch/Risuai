import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/process/triggers', () => ({ runTrigger: vi.fn(async () => null) }))
vi.mock('src/ts/process/scriptings', () => ({ runLuaButtonTrigger: vi.fn(async () => null) }))

import { runLuaButtonTrigger } from 'src/ts/process/scriptings'
import { runTrigger } from 'src/ts/process/triggers'
import { findScriptedOrigin, handleScriptedClick } from '../scriptedClicks'
import { CurrentTriggerIdStore, DBState, ReloadChatPointer, currentChat, makeChat, makeGroup, makeMessage, resetHarness, selectCharacter } from './harness'

function clickInside(html: string, selector: string, idx: number): Promise<void> {
    const root = document.createElement('div')
    root.innerHTML = html
    let pending: Promise<void> = Promise.resolve()
    root.addEventListener('click', (event) => {
        pending = handleScriptedClick(event, idx)
    }, { capture: true })
    ;(root.querySelector(selector) as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return pending
}

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    currentChat().message.push(makeMessage('user', 'hi'), makeMessage('char', 'hello'))
})

afterEach(() => {
    vi.useRealTimers()
})

describe('scriptedClicks', () => {
    it('finds the nearest scripted element', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div risu-btn="x"><span id="inner">a</span></div><p id="plain">b</p>'
        expect(findScriptedOrigin(root.querySelector('#inner'))?.getAttribute('risu-btn')).toBe('x')
        expect(findScriptedOrigin(root.querySelector('#plain'))).toBeNull()
        expect(findScriptedOrigin(null)).toBeNull()
    })

    it('runs a manual trigger and writes the returned chat back', async () => {
        const updated = makeChat({ message: [makeMessage('char', 'changed by trigger')] })
        vi.mocked(runTrigger).mockResolvedValueOnce({ chat: updated } as never)
        await clickInside('<button risu-trigger="openDoor"><span>Open</span></button>', 'span', 1)
        expect(runTrigger).toHaveBeenCalledWith(DBState.db.characters[0], 'manual', {
            chat: expect.objectContaining({ id: 'chat-1' }),
            manualName: 'openDoor',
            triggerId: undefined,
        })
        expect(currentChat()).toBe(updated)
        expect(get(ReloadChatPointer)).toEqual({ 1: 1 })
    })

    it('passes risu-id and clears the trigger id shortly after', async () => {
        vi.useFakeTimers()
        CurrentTriggerIdStore.set('abc')
        await clickInside('<button risu-trigger="use" risu-id="abc">Use</button>', 'button', 1)
        expect(vi.mocked(runTrigger).mock.calls[0][2]).toMatchObject({ manualName: 'use', triggerId: 'abc' })
        expect(get(CurrentTriggerIdStore)).toBe('abc')
        vi.advanceTimersByTime(100)
        expect(get(CurrentTriggerIdStore)).toBeNull()
    })

    it('sends risu-btn clicks to Lua onButtonClick', async () => {
        await clickInside('<div risu-btn="choice-2"><b>Go</b></div>', 'b', 1)
        expect(runLuaButtonTrigger).toHaveBeenCalledWith(DBState.db.characters[0], 'choice-2')
        expect(runTrigger).not.toHaveBeenCalled()
        expect(get(ReloadChatPointer)).toEqual({})
    })

    it('prefers risu-trigger when both attributes are present', async () => {
        await clickInside('<button risu-trigger="t" risu-btn="b">x</button>', 'button', 1)
        expect(runTrigger).toHaveBeenCalledTimes(1)
        expect(runLuaButtonTrigger).not.toHaveBeenCalled()
    })

    it('does nothing in group chats', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        await clickInside('<button risu-trigger="t">x</button>', 'button', 0)
        expect(runTrigger).not.toHaveBeenCalled()
    })

    it('ignores clicks outside scripted elements', async () => {
        await clickInside('<p>plain</p>', 'p', 1)
        expect(runTrigger).not.toHaveBeenCalled()
        expect(runLuaButtonTrigger).not.toHaveBeenCalled()
    })
})
