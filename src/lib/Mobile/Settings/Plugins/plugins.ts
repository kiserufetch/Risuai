import { language } from 'src/lang'
import { alertConfirm } from 'src/ts/alert'
import { loadPlugins, type RisuPlugin } from 'src/ts/plugins/plugins.svelte'
import { DBState } from 'src/ts/stores.svelte'

// Plugin list actions shared by the list and the plugin page (PluginSettings.svelte).

export function setPluginEnabled(i: number, on: boolean) {
    const plugin = DBState.db.plugins[i]
    if (!plugin) return
    plugin.enabled = on
    loadPlugins()
}

export async function removePlugin(i: number): Promise<boolean> {
    const plugin = DBState.db.plugins[i]
    if (!plugin || !(await alertConfirm(language.removeConfirm + (plugin.displayName ?? plugin.name)))) return false
    if (DBState.db.currentPluginProvider === plugin.name) DBState.db.currentPluginProvider = ''
    DBState.db.plugins.splice(i, 1)
    loadPlugins()
    return true
}

export function visibleArgs(plugin: RisuPlugin): string[] {
    return Object.keys(plugin.arguments ?? {}).filter((key) => !key.startsWith('hidden_'))
}

export function safeLinks(plugin: RisuPlugin) {
    return (plugin.customLink ?? []).filter((l) => typeof l.link === 'string' && (l.link.startsWith('http://') || l.link.startsWith('https://')))
}
