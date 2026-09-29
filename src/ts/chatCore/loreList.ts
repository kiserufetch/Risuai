import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertError, alertNormal } from '../alert'
import { downloadFile } from '../globalApi.svelte'
import { convertExternalLorebook, type CCLorebook } from '../process/lorebook.svelte'
import type { loreBook } from '../storage/database.svelte'
import { selectMultipleFile } from '../util'

// Lorebook edits over a plain list (a module's lorebook), mirroring ModuleMenu.svelte.

export function addLoreEntry(list: loreBook[]): loreBook {
    list.push({ key: '', comment: 'New Lore', content: '', mode: 'normal', insertorder: 100, alwaysActive: false, secondkey: '', selective: false })
    return list[list.length - 1]
}

export function addLoreFolder(list: loreBook[]) {
    list.push({ key: 'folder:' + v4(), comment: 'New Folder', content: '', mode: 'folder', insertorder: 100, alwaysActive: false, secondkey: '', selective: false })
}

export async function exportLoreList(list: loreBook[]) {
    try {
        await downloadFile('lorebook_export.json', Buffer.from(JSON.stringify({ type: 'risu', ver: 1, data: list }), 'utf-8'))
        alertNormal(language.successExport)
    } catch (error) {
        alertError(`${error}`)
    }
}

export async function importLoreList(list: loreBook[]) {
    const files = await selectMultipleFile(['json', 'lorebook'])
    if (!files) return
    try {
        for (const file of files) {
            const parsed = JSON.parse(Buffer.from(file.data).toString('utf-8'))
            if (parsed.type === 'risu' && parsed.data) {
                list.push(...(parsed.data as loreBook[]))
            } else if (parsed.entries) {
                list.push(...convertExternalLorebook(parsed.entries as Record<string, CCLorebook>))
            }
        }
    } catch (error) {
        alertError(`${error}`)
    }
}
