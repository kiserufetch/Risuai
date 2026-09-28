import { getAdditionalChatLoadPages, getInitialChatLoadPages } from 'src/ts/chatLoadPages'
import { chatFoldedState, chatFoldedStateMessageIndex } from 'src/ts/globalApi.svelte'
import { coldStorageHeader, preLoadChat } from 'src/ts/process/coldstorage.svelte'
import { DBState } from 'src/ts/stores.svelte'
import * as session from './session.svelte'

// Which messages the feed mounts (Chats.svelte loadStart/loadEnd + DefaultChatScreen
// loadPages). No virtualization beyond this window: CSS from card messages must keep
// applying to every mounted .chattext (spec §5.1, §7.2).

export class MessageWindow {
    loadPages = $state(getInitialChatLoadPages(DBState.db))

    reset(): void {
        this.loadPages = getInitialChatLoadPages(DBState.db)
    }

    /** Indices to mount, newest first. */
    visibleIndices(total: number): number[] {
        let loadStart = total - 1
        let loadEnd = total - this.loadPages
        if (chatFoldedStateMessageIndex.index !== -1) {
            loadStart = chatFoldedStateMessageIndex.index
            loadEnd = Math.max(0, chatFoldedStateMessageIndex.index - this.loadPages)
        }
        const indices: number[] = []
        for (let i = loadStart; i >= loadEnd; i--) {
            if (i < 0) {
                break
            }
            indices.push(i)
        }
        return indices
    }

    /** DefaultChatScreen onscroll near the top. Returns whether more became visible. */
    loadOlder(total: number): boolean {
        if (total <= this.loadPages) {
            return false
        }
        this.loadPages += getAdditionalChatLoadPages(DBState.db)
        return true
    }

    /** The "load more" button of the folded view. */
    expandFolded(): void {
        this.loadPages += chatFoldedStateMessageIndex.index + 1
        chatFoldedState.data = null
    }

    /** scrollToMessage: make sure message `index` is mounted. */
    ensureLoaded(index: number, total: number): void {
        const needed = total - index + 5
        if (this.loadPages < needed) {
            this.loadPages = needed
        }
    }

    /** The greeting is shown only when every message is loaded. */
    showsGreeting(total: number): boolean {
        return total <= this.loadPages
    }

    /** Screenshot: mount the whole chat. */
    loadAll(): void {
        this.loadPages = Infinity
    }
}

export function isFolded(): boolean {
    return chatFoldedStateMessageIndex.index !== -1
}

export function needsColdStorageLoad(): boolean {
    return session.getMessages()[0]?.data?.startsWith(coldStorageHeader) ?? false
}

export function loadColdStorage(): Promise<unknown> {
    return preLoadChat(session.getCharacterIndex(), session.getCharacter()?.chatPage ?? 0)
}
