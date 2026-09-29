<script lang="ts">
    import { CodeXmlIcon, DownloadIcon, FlameIcon, PlusIcon, TriangleAlertIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import SheetGroup from 'src/lib/MobileChat/SheetGroup.svelte'
    import SheetRow from 'src/lib/MobileChat/SheetRow.svelte'
    import { hotReloadPluginFiles } from 'src/ts/plugins/apiV3/developMode'
    import { checkPluginUpdate, importPlugin, type RisuPlugin } from 'src/ts/plugins/plugins.svelte'
    import { DBState, hotReloading } from 'src/ts/stores.svelte'
    import { pluginPage } from './pluginPage.svelte'
    import { setPluginEnabled, visibleArgs } from './plugins'

    // Mockup "Плагины · список": the untrusted-code warning, one row per plugin with its
    // switch, API version and update state; install and developer tools at the bottom.

    const t = $derived(language.mobilePlugins)
    let devOpen = $state(false)
    const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#0ea5e9', '#a855f7']

    function apiLabel(plugin: RisuPlugin): string {
        return plugin.version === 1 ? 'API V1' : plugin.version === 2 ? 'API V2' : plugin.version === '2.1' ? 'API V2.1' : 'API V3'
    }

    function downloadTemplate() {
        devOpen = false
        const a = document.createElement('a')
        a.href = '/plugin_start.7z'
        a.download = 'plugin_starter.7z'
        document.body.appendChild(a)
        a.click()
        a.remove()
    }
</script>

<div class="flex flex-col gap-3.5">
    <div class="flex gap-2.5 rounded-[14px] border px-3 py-2.5 text-[13px] leading-[18px]" style="background: color-mix(in oklab, var(--mc-danger) 8%, transparent); border-color: color-mix(in oklab, var(--mc-danger) 25%, transparent); color: color-mix(in oklab, var(--mc-danger) 55%, var(--mc-text));">
        <TriangleAlertIcon size={18} class="shrink-0" />{t.warning}
    </div>

    {#if (DBState.db.plugins ?? []).length > 0}
        <div class="risu-mc-plugins flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {#each DBState.db.plugins as plugin, i (i)}
                {@const args = visibleArgs(plugin).length}
                <div class="flex min-h-[72px] items-center gap-3 px-4 py-2">
                    <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => { pluginPage.index = i; pluginPage.current = 'edit' }}>
                        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[17px] font-bold text-white" style="background: {plugin.enabled ? COLORS[i % COLORS.length] : 'var(--mc-line)'};">{(plugin.displayName ?? plugin.name).charAt(0).toUpperCase()}</span>
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span class="flex items-center gap-1.5">
                                <span class="truncate text-[15px] font-semibold">{plugin.displayName ?? plugin.name}</span>
                                {#if hotReloading.includes(plugin.name)}<FlameIcon size={14} class="shrink-0" style="color: #f59e0b;" />{/if}
                            </span>
                            <span class="text-[12px] text-(--mc-text2)">{apiLabel(plugin)}{plugin.versionOfPlugin ? ` · v${plugin.versionOfPlugin}` : ''}{args ? ` · ${t.settingsCount.replace('{}', String(args))}` : ''}</span>
                            <span class="flex flex-wrap gap-1">
                                {#if plugin.version === 1}
                                    <span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style="background: color-mix(in oklab, var(--mc-danger) 14%, transparent); color: var(--mc-danger);">{t.needsV3}</span>
                                {:else if plugin.version === 2 || plugin.version === '2.1'}
                                    <span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style="background: rgb(245 158 11 / 0.14); color: #f59e0b;">{t.oldApi}</span>
                                {/if}
                                {#if plugin.updateURL}
                                    {#await checkPluginUpdate(plugin) then update}
                                        {#if update}<span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style="background: rgb(34 197 94 / 0.14); color: #22c55e;">{t.updateAvailable}</span>{/if}
                                    {/await}
                                {/if}
                            </span>
                        </span>
                    </button>
                    <button type="button" role="switch" aria-checked={!!plugin.enabled} aria-label={plugin.displayName ?? plugin.name} class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {plugin.enabled ? 'var(--mc-accent)' : 'var(--mc-line)'};" onclick={() => setPluginEnabled(i, !plugin.enabled)}>
                        <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {plugin.enabled ? '21px' : '3px'};"></span>
                    </button>
                </div>
            {/each}
        </div>
    {:else}
        <span class="py-8 text-center text-[15px] text-(--mc-text2)">{language.noPlugins}</span>
    {/if}

    <div class="grid grid-cols-2 gap-2">
        <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent, #fff);" onclick={() => importPlugin()}><PlusIcon size={17} />{t.install}</button>
        <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => { devOpen = true }}><CodeXmlIcon size={17} />{t.developer}</button>
    </div>
</div>

<Sheet open={devOpen} label={t.developer} onclose={() => { devOpen = false }}>
    <span class="shrink-0 px-1 text-[18px] font-bold">{t.developer}</span>
    <SheetGroup>
        <SheetRow label={t.hotReload} onclick={() => { devOpen = false; hotReloadPluginFiles() }}><FlameIcon size={20} /></SheetRow>
        <SheetRow label={t.template} onclick={downloadTemplate}><DownloadIcon size={20} /></SheetRow>
    </SheetGroup>
</Sheet>

<style>
    .risu-mc-plugins > :global(* + *) {
        position: relative;
    }
    .risu-mc-plugins > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 72px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
