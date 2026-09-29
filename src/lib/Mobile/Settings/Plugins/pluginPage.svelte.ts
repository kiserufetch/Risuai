import { language } from 'src/lang'
import { DBState } from 'src/ts/stores.svelte'

// Sub-page of "Плагины" (SettingsMenuIndex 4).

export const pluginPage = $state({ current: 'list' as 'list' | 'edit', index: 0 })

export function pluginBack(): boolean {
    if (pluginPage.current === 'list') return false
    pluginPage.current = 'list'
    return true
}

export function pluginPageTitle(): string {
    if (pluginPage.current === 'list') return language.plugin
    const plugin = DBState.db.plugins?.[pluginPage.index]
    return plugin?.displayName ?? plugin?.name ?? language.plugin
}
