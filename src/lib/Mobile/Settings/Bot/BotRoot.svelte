<script lang="ts">
    import { ChevronRightIcon, CpuIcon, KeyRoundIcon, LayersIcon, ScrollTextIcon, SlidersHorizontalIcon, WrenchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getModelInfo, LLMFlags } from 'src/ts/model/modellist'
    import { DBState } from 'src/ts/stores.svelte'
    import { botPage, type BotPage } from './botPage.svelte'
    import { keyFields } from './keys'
    import { modelName, providerName } from './models'
    import PresetSheet from './PresetSheet.svelte'

    // Mockup "Чат-бот · главная": the active preset (everything below is saved into it),
    // sub-pages with summaries, and the credential status of the chosen models.

    const t = $derived(language.mobileBot)

    let presetsOpen = $state(false)
    let preset = $derived(DBState.db.botPresets[DBState.db.botPresetsId])

    let paramsSummary = $derived.by(() => {
        const ctx = DBState.db.maxContext >= 1000 ? `${Math.round(DBState.db.maxContext / 1000)}k` : String(DBState.db.maxContext)
        const temp = DBState.db.temperature === -1000 ? '' : ` · t ${(DBState.db.temperature / 100).toFixed(2)}`
        return `${ctx}${temp}`
    })
    let promptSummary = $derived(DBState.db.promptTemplate ? t.templateBlocks.replace('{}', String(DBState.db.promptTemplate.length)) : t.modeSimple)
    let auxSummary = $derived(DBState.db.seperateModelsForAxModels ? t.auxSeparate : t.auxSame)

    let fields = $derived(keyFields())
    let missing = $derived(fields.filter((f) => !f.optional && !(f.get() ?? '').trim()))
    let main = $derived(getModelInfo(DBState.db.aiModel))
    let streaming = $derived(main.flags.includes(LLMFlags.hasStreaming) && DBState.db.useStreaming)

    type Row = { page: BotPage; icon: typeof CpuIcon; color: string; label: string; value: string }
    let groups: Row[][] = $derived([
        [
            { page: 'model', icon: CpuIcon, color: '#6366f1', label: t.page_model, value: modelName(DBState.db.aiModel) },
            { page: 'params', icon: SlidersHorizontalIcon, color: '#22c55e', label: t.page_params, value: paramsSummary },
            { page: 'prompt', icon: ScrollTextIcon, color: '#f59e0b', label: t.page_prompt, value: promptSummary },
        ],
        [
            { page: 'aux', icon: LayersIcon, color: '#0ea5e9', label: t.page_aux, value: auxSummary },
            { page: 'more', icon: WrenchIcon, color: '#64748b', label: t.page_more, value: t.moreSummary },
        ],
    ])
</script>

<div class="flex flex-col gap-4">
    <button type="button" class="flex items-center gap-3 rounded-[20px] border p-3.5 text-left" style="border-color: color-mix(in oklab, var(--mc-accent) 35%, var(--mc-line)); background: linear-gradient(135deg, color-mix(in oklab, var(--mc-accent) 22%, transparent), color-mix(in oklab, var(--mc-accent) 6%, transparent));" onclick={() => { presetsOpen = true }}>
        {#if preset?.image}
            <img src={preset.image} alt="" class="h-12 w-12 shrink-0 rounded-[14px] object-cover" decoding="async" />
        {:else}
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[20px] font-bold text-white" style="background: linear-gradient(135deg, #f59e0b, #ef4444);">{(preset?.name || '?').charAt(0).toUpperCase()}</span>
        {/if}
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[12px] font-semibold uppercase" style="color: var(--mc-accent);">{t.presetOf.replace('{0}', String(DBState.db.botPresetsId + 1)).replace('{1}', String(DBState.db.botPresets.length))}</span>
            <span class="truncate text-[17px] font-bold">{preset?.name || 'Preset'}</span>
            <span class="text-[12px] text-(--mc-text2)">{t.presetHint}</span>
        </span>
        <span class="flex shrink-0 items-center text-[13px] font-semibold" style="color: var(--mc-accent);">{t.change}<ChevronRightIcon size={16} /></span>
    </button>

    {#each groups as group, g (g)}
        <div class="risu-mc-bot-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {#each group as r (r.page)}
                {@const Icon = r.icon}
                <button type="button" class="flex min-h-14 w-full items-center gap-3 px-4 text-left" onclick={() => { botPage.current = r.page }}>
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white" style="background: {r.color};"><Icon size={18} /></span>
                    <span class="shrink-0 text-[15px]">{r.label}</span>
                    <span class="ml-auto min-w-0 truncate text-right text-[13px] text-(--mc-text2)">{r.value}</span>
                    <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
                </button>
            {/each}
        </div>
    {/each}

    {#if DBState.db.aiModel && fields.some((f) => !f.optional)}
        {@const ok = missing.length === 0}
        <button type="button" class="flex gap-2.5 rounded-[14px] border px-3.5 py-3 text-left" style="background: {ok ? 'rgb(34 197 94 / 0.08)' : 'rgb(245 158 11 / 0.1)'}; border-color: {ok ? 'rgb(34 197 94 / 0.25)' : 'rgb(245 158 11 / 0.3)'};" onclick={() => { botPage.current = 'model' }}>
            <KeyRoundIcon size={18} class="mt-px shrink-0" style="color: {ok ? '#22c55e' : '#f59e0b'};" />
            <span class="text-[13px] leading-[18px]">
                {ok ? t.keysOk.replace('{}', providerName(main) || modelName(DBState.db.aiModel)) : t.keysMissing.replace('{}', missing.map((k) => k.label).join(', '))}
                {main.flags.includes(LLMFlags.hasStreaming) ? (streaming ? t.streamingOn : t.streamingOff) : ''}
            </span>
        </button>
    {/if}
</div>

<PresetSheet open={presetsOpen} onclose={() => { presetsOpen = false }} />

<style>
    .risu-mc-bot-group > :global(* + *) {
        position: relative;
    }
    .risu-mc-bot-group > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 60px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
