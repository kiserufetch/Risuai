import { alertError } from './alert'
import { downloadRisuHub, getRisuHub, hubURL, type hubType } from './characterCards'
import { changeChar } from './characters'
import { DBState } from './stores.svelte'

// Data helpers of the mobile RisuRealm library, on top of the existing hub client.
// The hub returns 30 cards per page, never a total, and only free-text search
// (`author:<name>` narrows to one author).

export const REALM_PAGE_SIZE = 30

/** A hub card as the server really sends it: `haslore` is lower case, `date` is in minutes. */
export type RealmCard = hubType & { haslore?: boolean; date?: number }

export type RealmSort = 'recommended' | '' | 'trending' | 'downloads' | 'random'

export function realmHasLore(card: RealmCard): boolean {
    return !!(card.hasLore ?? card.haslore)
}

export function realmImageUrl(card: RealmCard): string {
    return `${hubURL}/resource/${card.img}`
}

export function realmUploadDate(card: RealmCard): Date | null {
    return typeof card.date === 'number' && card.date > 0 ? new Date(card.date * 60_000) : null
}

/** Random and recommended are single server-picked sets (the old UI hid paging for them). */
export function realmSortPages(sort: RealmSort): boolean {
    return sort !== 'random' && sort !== 'recommended'
}

export function fetchRealmPage(arg: { search: string; page: number; nsfw: boolean; sort: RealmSort }): Promise<RealmCard[]> {
    return getRisuHub({ ...arg }) as Promise<RealmCard[]>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A realm link (realm.risuai.net/character/<id>, ?realm=, ?code=) or a bare card id; null for plain text. */
export function parseRealmLink(input: string): string | null {
    const text = input.trim()
    if (UUID.test(text)) {
        return text
    }
    let url: URL
    try {
        url = new URL(text.startsWith('http') ? text : `https://${text}`)
    } catch {
        return null
    }
    if (!/(^|\.)risuai\.(net|xyz)$/.test(url.hostname)) {
        return null
    }
    const id = url.searchParams.get('realm') ?? url.searchParams.get('code') ?? url.pathname.split('/').filter(Boolean).at(-1)
    return id && UUID.test(id) ? id : null
}

/** Card info by id (the endpoint behind getRealmInfo), without opening the desktop popup. */
export async function getRealmCard(id: string): Promise<RealmCard | null> {
    try {
        const res = await fetch(`${hubURL}/hub/info/${id}`)
        if (res.status !== 200) {
            return null
        }
        return await res.json()
    } catch {
        return null
    }
}

/** Index of the character imported from this card, or -1. */
export function findImportedRealmCharacter(id: string): number {
    return DBState.db.characters.findIndex((c) => c?.type === 'character' && c.realmSourceId === id)
}

/** The imported copy is older than the card on the hub. */
export function realmHasUpdate(card: RealmCard): boolean {
    const index = findImportedRealmCharacter(card.id)
    if (index === -1 || typeof card.date !== 'number') {
        return false
    }
    const char = DBState.db.characters[index]
    return char.type === 'character' && typeof char.realmSourceDate === 'number' && card.date > char.realmSourceDate
}

/**
 * downloadRisuHub plus provenance: the new character remembers which card and which
 * upload it came from, so the library can mark it imported and spot updates. An update
 * is imported as a separate character; the old one keeps its chats.
 */
export async function importRealmCard(card: RealmCard): Promise<void> {
    const before = DBState.db.characters.length
    try {
        await downloadRisuHub(card.id)
    } catch (error) {
        alertError(error)
        return
    }
    const chars = DBState.db.characters
    if (chars.length <= before) {
        return
    }
    const imported = chars[chars.length - 1]
    if (imported?.type === 'character') {
        imported.realmSourceId = card.id
        imported.realmSourceDate = card.date
    }
}

export function openImportedRealmCharacter(id: string): void {
    const index = findImportedRealmCharacter(id)
    if (index !== -1) {
        changeChar(index)
    }
}
