import { get } from 'svelte/store'
import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertError, alertSelect } from './alert'
import { changeChar } from './characters'
import { createNewChat } from './chatCore/newChat'
import { chatOverlay } from './chatCore/chatList.svelte'
import { checkCharOrder } from './globalApi.svelte'
import { getColdStorageItem } from './process/coldstorage.svelte'
import type { character, folder, groupChat } from './storage/database.svelte'
import { DBState, MobileSideBar, selectedCharID } from './stores.svelte'

// Actions of the mobile "Диалоги" screen (long-press sheet). Everything goes through
// the same DB fields the desktop sidebar uses, so both stay in sync.

export function getFolders(): folder[] {
    return (DBState.db.characterOrder ?? []).filter((entry): entry is folder => typeof entry !== 'string' && !!entry)
}

export async function openWithNewChat(index: number): Promise<void> {
    await changeChar(index)
    if (get(selectedCharID) === index) {
        createNewChat()
    }
}

/** Opens the character with its chat list (MobileSideBar 1) or its settings (2) on top. */
export async function openWithDrawer(index: number, drawer: 1 | 2): Promise<void> {
    await changeChar(index)
    if (get(selectedCharID) !== index) {
        return
    }
    if (DBState.db.legacyMobileChat) {
        MobileSideBar.set(drawer)
    } else {
        chatOverlay.view = drawer === 1 ? 'chats' : 'profile'
    }
}

/** Moves a character into a folder of the character order, or out of every folder. */
export async function moveToFolder(index: number): Promise<void> {
    const char = DBState.db.characters[index]
    if (!char) {
        return
    }
    const folders = getFolders()
    const options = [language.mobileDialogs.noFolder, ...folders.map((f) => f.name || language.mobileDialogs.unnamedFolder)]
    const picked = Number(await alertSelect(options, language.mobileDialogs.moveToFolder))
    if (!Number.isInteger(picked) || picked < 0 || picked >= options.length) {
        return
    }
    const id = char.chaId
    const order = (DBState.db.characterOrder ?? []).filter((entry) => entry !== id)
    for (const entry of order) {
        if (typeof entry !== 'string' && entry) {
            entry.data = entry.data.filter((member) => member !== id)
        }
    }
    if (picked === 0) {
        order.push(id)
    } else {
        folders[picked - 1].data.push(id)
    }
    DBState.db.characterOrder = order
    checkCharOrder()
}

/** A copy of the character with a fresh id and a single empty chat; the original is untouched. */
export async function duplicateCharacter(index: number): Promise<void> {
    let source: character | groupChat | undefined = DBState.db.characters[index]
    if (!source) {
        return
    }
    if (source.type === 'character' && source.coldstorage) {
        const cold = await getColdStorageItem(source.coldstorage)
        if (!cold?.character || cold.character.chaId !== source.chaId) {
            alertError(language.errors.coldStorageRestoreFailed)
            return
        }
        source = cold.character as character
    }
    const copy = safeStructuredClone($state.snapshot(source)) as character | groupChat
    copy.chaId = v4()
    copy.name = `${copy.name || 'Unnamed'} ${language.mobileDialogs.copySuffix}`
    copy.chats = [{ message: [], note: '', name: 'Chat 1', localLore: [], fmIndex: -1, id: v4() }]
    copy.chatPage = 0
    copy.chatFolders = []
    copy.lastInteraction = Date.now()
    delete copy.trashTime
    if (copy.type === 'character') {
        delete copy.coldstorage
        copy.realmId = ''
    }
    DBState.db.characters.push(copy)
    checkCharOrder()
}
