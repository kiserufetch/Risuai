import { language } from 'src/lang'
import type { RisuModule } from 'src/ts/process/modules'
import type { loreBook } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'

// Sub-page of "Модули" (SettingsMenuIndex 14): the edited module is kept by id.

export type ModulePage = 'list' | 'edit' | 'lore' | 'loreEntry' | 'regex' | 'regexEntry' | 'triggers' | 'assets'

export const modulePage = $state({ current: 'list' as ModulePage, id: '', book: null as loreBook | null, regexIndex: 0 })

const PARENT: Record<Exclude<ModulePage, 'list'>, ModulePage> = {
    edit: 'list', lore: 'edit', loreEntry: 'lore', regex: 'edit', regexEntry: 'regex', triggers: 'edit', assets: 'edit',
}

export function currentModule(): RisuModule | undefined {
    return DBState.db.modules.find((m) => m.id === modulePage.id)
}

export function moduleBack(): boolean {
    if (modulePage.current === 'list') return false
    modulePage.current = PARENT[modulePage.current]
    return true
}

export function modulePageTitle(): string {
    const t = language.mobileModules
    switch (modulePage.current) {
        case 'list': return language.modules
        case 'edit': return currentModule()?.name || t.untitled
        case 'lore': return t.lore
        case 'loreEntry': return modulePage.book?.comment || t.lore
        case 'regex': return t.regex
        case 'regexEntry': return t.regexScript
        case 'triggers': return t.triggers
        case 'assets': return t.assets
    }
}
