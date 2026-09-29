<script lang="ts">
    import { BookOpenIcon, FolderIcon, RegexIcon, Share2Icon, Trash2Icon, UserPlusIcon, WaypointsIcon, ZapIcon, ChevronRightIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import SheetGroup from 'src/lib/MobileChat/SheetGroup.svelte'
    import SheetRow from 'src/lib/MobileChat/SheetRow.svelte'
    import { alertConfirm, alertNormal } from 'src/ts/alert'
    import { checkCharOrder } from 'src/ts/globalApi.svelte'
    import { convertModuleToCharacter } from 'src/ts/interchangeability'
    import { exportModule, exportModuleLegacy } from 'src/ts/process/modules'
    import { DBState } from 'src/ts/stores.svelte'
    import { currentModule, modulePage, type ModulePage } from './modulePage.svelte'

    // Mockup "Модуль · редактор": basics, the module's parts as sub-pages, then actions.
    // MCP modules come from a server and are not editable, as on desktop.

    const t = $derived(language.mobileModules)
    let m = $derived(currentModule())
    let enabled = $derived(!!m && DBState.db.enabledModules.includes(m.id))

    function setEnabled(on: boolean) {
        if (!m) return
        const list = DBState.db.enabledModules
        const i = list.indexOf(m.id)
        if (on && i === -1) list.push(m.id)
        if (!on && i !== -1) list.splice(i, 1)
    }

    function open(page: ModulePage) {
        if (!m) return
        if (page === 'lore') m.lorebook ??= []
        if (page === 'regex') m.regex ??= []
        if (page === 'assets') m.assets ??= []
        modulePage.current = page
    }

    let triggerSummary = $derived.by(() => {
        const type = m?.trigger?.[0]?.effect?.[0]?.type
        if (type === 'triggerlua') return 'Lua'
        if (type === 'v2Header') return t.visual
        return m?.trigger?.length ? t.chipTriggers : t.none
    })

    function toCharacter() {
        if (!m) return
        DBState.db.characters.push(convertModuleToCharacter($state.snapshot(m)))
        checkCharOrder()
        alertNormal(language.successfullyConverted)
    }

    async function remove() {
        if (!m || !(await alertConfirm(`${language.removeConfirm}${m.name}`))) return
        const id = m.id
        const enabledAt = DBState.db.enabledModules.indexOf(id)
        if (enabledAt !== -1) DBState.db.enabledModules.splice(enabledAt, 1)
        DBState.db.modules.splice(DBState.db.modules.findIndex((x) => x.id === id), 1)
        modulePage.current = 'list'
    }
</script>

{#snippet part(page: ModulePage, icon: typeof BookOpenIcon, color: string, label: string, value: string)}
    {@const Icon = icon}
    <button type="button" class="flex min-h-14 w-full items-center gap-3 px-4 text-left" onclick={() => open(page)}>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white" style="background: {color};"><Icon size={18} /></span>
        <span class="shrink-0 text-[15px]">{label}</span>
        <span class="ml-auto min-w-0 truncate text-right text-[13px] text-(--mc-text2)">{value}</span>
        <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
    </button>
{/snippet}

{#if m}
    <div class="flex flex-col gap-4">
        <FormGroup>
            <FormToggle label={t.enabledEverywhere} hint={t.enabledHint} checked={enabled} onchange={setEnabled} />
        </FormGroup>

        {#if m.mcp}
            <div class="flex items-center gap-3 rounded-2xl px-4 py-3" style="background: var(--mc-group);">
                <WaypointsIcon size={20} class="shrink-0" style="color: var(--mc-accent);" />
                <span class="flex min-w-0 flex-col gap-0.5"><span class="truncate text-[15px] font-semibold">{m.name}</span><span class="text-[12px] text-(--mc-text2)">{t.mcpHint}</span></span>
            </div>
        {:else}
            <FormGroup>
                <FormText label={language.name} bind:value={m.name} placeholder={t.untitled} />
                <FormText label={language.description} bind:value={m.description} />
                <FormText label={t.namespace} bind:value={() => m.namespace ?? '', (v) => { m.namespace = v }} hint={t.namespaceHint} mono />
            </FormGroup>

            <div class="risu-mc-module-parts flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {@render part('lore', BookOpenIcon, '#f59e0b', t.lore, t.entries.replace('{}', String((m.lorebook ?? []).filter((b) => b.mode !== 'folder').length)))}
                {@render part('regex', RegexIcon, '#22c55e', t.regex, t.scripts.replace('{}', String(m.regex?.length ?? 0)))}
                {@render part('triggers', ZapIcon, '#a855f7', t.triggers, triggerSummary)}
                {@render part('assets', FolderIcon, '#0ea5e9', t.assets, t.files.replace('{}', String(m.assets?.length ?? 0)))}
            </div>

            <FormGroup>
                <FormToggle label={language.hideChatIcon} bind:checked={() => !!m.hideIcon, (v) => { m.hideIcon = v }} />
            </FormGroup>
            <CodeField label={language.customPromptTemplateToggle} bind:value={() => m.customModuleToggle ?? '', (v) => { m.customModuleToggle = v }} minRows={3} wrap />
        {/if}

        <SheetGroup>
            {#if !m.mcp}
                <SheetRow label={t.exportCharx} onclick={() => exportModule($state.snapshot(m))}><Share2Icon size={20} /></SheetRow>
                <SheetRow label={t.exportRisum} onclick={() => exportModuleLegacy($state.snapshot(m))}><Share2Icon size={20} /></SheetRow>
            {/if}
            <SheetRow label={t.toCharacter} onclick={toCharacter}><UserPlusIcon size={20} /></SheetRow>
        </SheetGroup>
        <SheetGroup>
            <SheetRow label={language.mobileBot.remove} danger onclick={remove}><Trash2Icon size={20} /></SheetRow>
        </SheetGroup>
    </div>
{/if}

<style>
    .risu-mc-module-parts > :global(* + *) {
        position: relative;
    }
    .risu-mc-module-parts > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 60px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
