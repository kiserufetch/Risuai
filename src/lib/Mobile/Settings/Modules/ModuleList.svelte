<script lang="ts">
    import { PlusIcon, SearchIcon, UploadIcon, WaypointsIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { importMCPModule } from 'src/ts/process/mcp/mcp'
    import { importModule, type RisuModule } from 'src/ts/process/modules'
    import { DBState } from 'src/ts/stores.svelte'
    import { v4 } from 'uuid'
    import { modulePage } from './modulePage.svelte'

    // Mockup "Модули · список": search, one row per module with what it carries and a
    // switch that enables it in every chat; create, import and MCP at the bottom.

    const t = $derived(language.mobileModules)
    let query = $state('')

    let modules = $derived(
        DBState.db.modules
            .filter((m) => !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()))
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    )
    let integrated = $derived(new Set((DBState.db.moduleIntergration ?? '').split(',').map((s) => s.trim()).filter(Boolean)))
    const COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#ec4899', '#f59e0b', '#a855f7', '#14b8a6']

    function chips(m: RisuModule): { label: string; tone?: 'accent' | 'amber' }[] {
        const out: { label: string; tone?: 'accent' | 'amber' }[] = []
        if (m.mcp) out.push({ label: 'MCP', tone: 'accent' })
        const lore = (m.lorebook ?? []).filter((b) => b.mode !== 'folder').length
        if (lore) out.push({ label: t.chipLore.replace('{}', String(lore)) })
        if (m.regex?.length) out.push({ label: t.chipRegex.replace('{}', String(m.regex.length)) })
        const firstEffect = m.trigger?.[0]?.effect?.[0]?.type
        if (firstEffect === 'triggerlua') out.push({ label: 'Lua' })
        else if (m.trigger?.length) out.push({ label: t.chipTriggers })
        if (m.assets?.length) out.push({ label: t.chipAssets.replace('{}', String(m.assets.length)) })
        if (m.namespace && integrated.has(m.namespace) && !DBState.db.enabledModules.includes(m.id)) out.push({ label: t.viaPreset, tone: 'amber' })
        return out
    }

    function toggle(m: RisuModule) {
        const list = DBState.db.enabledModules
        const i = list.indexOf(m.id)
        if (i === -1) list.push(m.id)
        else list.splice(i, 1)
    }

    function create() {
        const module: RisuModule = { name: '', description: '', id: v4() }
        DBState.db.modules.push(module)
        modulePage.id = module.id
        modulePage.current = 'edit'
    }
</script>

<div class="flex flex-col gap-3.5">
    <label class="flex h-[42px] items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-group);">
        <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
        <input type="search" bind:value={query} placeholder={t.search} aria-label={t.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        {#if query}<button type="button" class="-mr-2 flex h-9 w-9 items-center justify-center text-(--mc-text2)" aria-label={language.mobileCatalog.reset} onclick={() => { query = '' }}><XIcon size={16} /></button>{/if}
    </label>
    <span class="px-2 text-[12px] text-(--mc-text2)">{t.listHint}</span>

    {#if modules.length > 0}
        <div class="risu-mc-modules flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {#each modules as m, i (m.id)}
                {@const on = DBState.db.enabledModules.includes(m.id)}
                <div class="flex min-h-[76px] items-center gap-3 px-4 py-2">
                    <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => { modulePage.id = m.id; modulePage.current = 'edit' }}>
                        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[17px] font-bold text-white" style="background: {COLORS[i % COLORS.length]};">
                            {#if m.mcp}<WaypointsIcon size={20} />{:else}{(m.name || '?').charAt(0).toUpperCase()}{/if}
                        </span>
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span class="truncate text-[15px] font-semibold">{m.name || t.untitled}</span>
                            <span class="truncate text-[12px] text-(--mc-text2)">{m.description || t.noDescription}</span>
                            {#if chips(m).length}
                                <span class="flex flex-wrap gap-1 pt-0.5">
                                    {#each chips(m) as chip (chip.label)}
                                        <span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={chip.tone === 'accent' ? 'background: var(--mc-accent-soft); color: var(--mc-accent);' : chip.tone === 'amber' ? 'background: rgb(245 158 11 / 0.14); color: #f59e0b;' : 'background: var(--mc-line); color: var(--mc-text2);'}>{chip.label}</span>
                                    {/each}
                                </span>
                            {/if}
                        </span>
                    </button>
                    <button type="button" role="switch" aria-checked={on} aria-label={language.enableGlobal} class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};" onclick={() => toggle(m)}>
                        <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {on ? '21px' : '3px'};"></span>
                    </button>
                </div>
            {/each}
        </div>
    {:else}
        <span class="py-8 text-center text-[15px] text-(--mc-text2)">{query ? language.mobileDialogs.nothingFound : language.noModules}</span>
    {/if}

    <div class="grid grid-cols-3 gap-2">
        <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent, #fff);" onclick={create}><PlusIcon size={17} />{t.create}</button>
        <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => importModule()}><UploadIcon size={17} />{language.mobileBot.import}</button>
        <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => importMCPModule()}><WaypointsIcon size={17} />MCP</button>
    </div>
</div>

<style>
    .risu-mc-modules > :global(* + *) {
        position: relative;
    }
    .risu-mc-modules > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 72px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
