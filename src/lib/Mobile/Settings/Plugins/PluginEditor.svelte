<script lang="ts">
    import { ExternalLinkIcon, RefreshCwIcon, Trash2Icon, TriangleAlertIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { alertConfirm, alertMd } from 'src/ts/alert'
    import { openURL } from 'src/ts/globalApi.svelte'
    import { checkPluginUpdate, updatePlugin } from 'src/ts/plugins/plugins.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { pluginPage } from './pluginPage.svelte'
    import { removePlugin, safeLinks, setPluginEnabled, visibleArgs } from './plugins'

    // Mockup "Плагин · настройки": switch, update, links, the plugin's own arguments drawn
    // with our form rows (types and argMeta as in PluginSettings.svelte), delete.

    const t = $derived(language.mobilePlugins)
    let i = $derived(pluginPage.index)
    let plugin = $derived(DBState.db.plugins?.[i])
    let args = $derived(plugin ? visibleArgs(plugin) : [])

    const radio = (spec: string) => spec.split(',').map((option) => ({ label: option.split('|').at(0) ?? option, value: option.split('|').at(-1) ?? option }))

    async function update() {
        if (plugin && (await alertConfirm(language.pluginUpdateFoundInstallIt))) updatePlugin(plugin)
    }

    async function remove() {
        if (await removePlugin(i)) pluginPage.current = 'list'
    }
</script>

{#if plugin}
    <div class="flex flex-col gap-4">
        <FormGroup>
            <FormToggle label={t.enabled} checked={!!plugin.enabled} onchange={(on) => setPluginEnabled(i, on)} />
            {#if plugin.updateURL}
                {#await checkPluginUpdate(plugin) then info}
                    {#if info}
                        <button type="button" class="flex min-h-[52px] w-full items-center gap-2.5 px-4 text-left text-[15px] font-semibold" style="color: #22c55e;" onclick={update}><RefreshCwIcon size={18} />{t.updateTo.replace('{}', info.version)}</button>
                    {/if}
                {/await}
            {/if}
        </FormGroup>

        {#if plugin.version === 1}
            <span class="px-2 text-[13px] leading-[18px]" style="color: var(--mc-danger);">{language.pluginVersionWarn.replace('{{plugin_version}}', 'API V1').replace('{{required_version}}', 'API V3')}</span>
        {:else if plugin.version === 2 || plugin.version === '2.1'}
            <button type="button" class="flex gap-2.5 rounded-[14px] border px-3 py-2.5 text-left text-[13px] leading-[18px]" style="background: rgb(245 158 11 / 0.1); border-color: rgb(245 158 11 / 0.3); color: #f5d08a;" onclick={() => alertMd(language.pluginV2Warning)}>
                <TriangleAlertIcon size={18} class="shrink-0" />{t.oldApiHint}
            </button>
        {/if}

        {#if safeLinks(plugin).length}
            <div class="flex flex-wrap gap-1.5">
                {#each safeLinks(plugin) as link (link.link)}
                    <button type="button" class="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold" style="background: var(--mc-accent-soft); color: var(--mc-accent);" onclick={() => openURL(link.link)}>{link.hoverText || new URL(link.link).hostname}<ExternalLinkIcon size={13} /></button>
                {/each}
            </div>
        {/if}

        {#if plugin.version !== 1 && args.length > 0}
            <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{t.pluginSettings}</span>
            {#each args as arg (arg)}
                {@const meta = plugin.argMeta?.[arg] ?? {}}
                {@const type = plugin.arguments[arg]}
                {@const label = meta.name || arg}
                {#if typeof meta.divider === 'string'}
                    <span class="px-2 pt-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{meta.divider}</span>
                {/if}
                <FormGroup>
                    {#if Array.isArray(type)}
                        <FormSelect {label} bind:value={() => plugin.realArg[arg] as string, (v) => { plugin.realArg[arg] = v }} options={type.map((v) => ({ value: v, label: v }))} />
                    {:else if type === 'int' && meta.checkbox}
                        <FormToggle label={meta.checkbox === '1' ? label : meta.checkbox} checked={plugin.realArg[arg] === '1'} onchange={(on) => { plugin.realArg[arg] = on ? '1' : '0' }} />
                    {:else if meta.radio}
                        <div role="radiogroup" aria-label={label} class="flex flex-col">
                            <span class="px-4 pb-1 pt-3 text-[15px]">{label}</span>
                            {#each radio(meta.radio) as option (option.value)}
                                {@const value = type === 'int' ? parseInt(option.value) : option.value}
                                {@const on = plugin.realArg[arg] === value}
                                <button type="button" role="radio" aria-checked={on} class="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px]" onclick={() => { plugin.realArg[arg] = value }}>
                                    <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style="border-color: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};">{#if on}<span class="h-2.5 w-2.5 rounded-full" style="background: var(--mc-accent);"></span>{/if}</span>
                                    {option.label}
                                </button>
                            {/each}
                        </div>
                    {:else if type === 'int'}
                        <label class="flex min-h-[52px] items-center gap-3 px-4 py-2">
                            <span class="min-w-0 flex-1 text-[15px]">{label}</span>
                            <input type="number" inputmode="decimal" value={plugin.realArg[arg]} placeholder={meta.placeholder} oninput={(e) => { plugin.realArg[arg] = Number((e.currentTarget as HTMLInputElement).value) }} class="h-9 w-24 rounded-lg border-0 text-center text-[15px] tabular-nums outline-none" style="background: var(--mc-surface); color: var(--mc-text);" />
                        </label>
                    {:else if meta.textarea}
                        <label class="flex flex-col gap-1 px-4 py-3">
                            <span class="text-[12px] text-(--mc-text2)">{label}</span>
                            <textarea value={plugin.realArg[arg] as string} placeholder={meta.placeholder} rows="4" oninput={(e) => { plugin.realArg[arg] = (e.currentTarget as HTMLTextAreaElement).value }} class="resize-none border-0 bg-transparent text-[15px] leading-[22px] outline-none" style="color: var(--mc-text); field-sizing: content; max-height: 50dvh;"></textarea>
                        </label>
                    {:else}
                        <FormText {label} bind:value={() => (plugin.realArg[arg] as string) ?? '', (v) => { plugin.realArg[arg] = v }} placeholder={meta.placeholder} />
                    {/if}
                </FormGroup>
                {#if meta.description}
                    <span class="-mt-2 px-2 text-[12px] leading-4 text-(--mc-text2)">{meta.description}</span>
                {/if}
            {/each}
        {/if}

        <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: color-mix(in oklab, var(--mc-danger) 14%, transparent); color: var(--mc-danger);" onclick={remove}><Trash2Icon size={16} />{t.remove}</button>
    </div>
{/if}
