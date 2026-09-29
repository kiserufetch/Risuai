import { language } from 'src/lang'
import { alertConfirm, alertError } from 'src/ts/alert'
import { changeUserPersona, exportUserPersona, saveUserPersona } from 'src/ts/persona'
import { saveImage } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'
import { selectSingleFile } from 'src/ts/util'
import { v4 } from 'uuid'

// Persona page state and edits. The active persona lives in db.username / personaPrompt /
// userNote / userIcon (see src/ts/persona.ts); the others are edited in db.personas directly.

export const personaPage = $state({ current: 'list' as 'list' | 'edit', index: 0 })

export type PersonaField = 'name' | 'personaPrompt' | 'note' | 'icon'

const ACTIVE_KEYS = { name: 'username', personaPrompt: 'personaPrompt', note: 'userNote', icon: 'userIcon' } as const

export function getField(i: number, key: PersonaField): string {
    if (i === DBState.db.selectedPersona) return DBState.db[ACTIVE_KEYS[key]] ?? ''
    return DBState.db.personas[i]?.[key] ?? ''
}

export function setField(i: number, key: PersonaField, value: string) {
    if (i === DBState.db.selectedPersona) {
        DBState.db[ACTIVE_KEYS[key]] = value
        saveUserPersona()
    } else if (DBState.db.personas[i]) {
        DBState.db.personas[i][key] = value
    }
}

export function openPersona(i: number) {
    personaPage.index = i
    personaPage.current = 'edit'
}

export function createPersona() {
    DBState.db.personas.push({ name: 'New Persona', icon: '', personaPrompt: '', note: '', id: v4() })
    openPersona(DBState.db.personas.length - 1)
}

export async function pickPhoto(i: number) {
    const file = await selectSingleFile(['png'])
    if (!file) return
    setField(i, 'icon', await saveImage(file.data))
}

/** Chats of any character bound to this persona. */
export function boundChats(i: number): number {
    const id = DBState.db.personas[i]?.id
    if (!id) return 0
    let n = 0
    for (const char of DBState.db.characters) {
        for (const chat of char?.chats ?? []) if (chat.bindedPersona === id) n++
    }
    return n
}

export function movePersona(from: number, to: number) {
    if (from === to) return
    saveUserPersona()
    const list = DBState.db.personas
    const active = list[DBState.db.selectedPersona]
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    DBState.db.selectedPersona = Math.max(0, list.indexOf(active))
}

export function duplicatePersona(i: number) {
    saveUserPersona()
    const list = DBState.db.personas
    const copy = { ...safeStructuredClone($state.snapshot(list[i])), id: v4() }
    copy.name = `${copy.name} Copy`
    list.splice(i + 1, 0, copy)
    if (DBState.db.selectedPersona > i) DBState.db.selectedPersona++
}

export async function exportPersona(i: number) {
    const previous = DBState.db.selectedPersona
    if (i !== previous) changeUserPersona(i)
    try {
        await exportUserPersona()
    } finally {
        if (i !== previous) changeUserPersona(previous)
    }
}

/** Returns true when the persona was removed. */
export async function removePersona(i: number): Promise<boolean> {
    const list = DBState.db.personas
    if (list.length === 1) {
        alertError(language.mobilePersona.lastOne)
        return false
    }
    if (!(await alertConfirm(`${language.removeConfirm}${getField(i, 'name')}`))) return false
    saveUserPersona()
    const selected = DBState.db.selectedPersona
    list.splice(i, 1)
    if (i === selected) changeUserPersona(0, 'noSave')
    else if (i < selected) DBState.db.selectedPersona = selected - 1
    return true
}
