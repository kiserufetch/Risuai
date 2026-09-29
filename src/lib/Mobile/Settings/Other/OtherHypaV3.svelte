<script lang="ts">
    import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormNav from 'src/lib/MobileChat/Form/FormNav.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import SheetGroup from 'src/lib/MobileChat/SheetGroup.svelte'
    import SheetRow from 'src/lib/MobileChat/SheetRow.svelte'
    import { alertConfirm, alertError, alertInput, alertNormal } from 'src/ts/alert'
    import { downloadFile } from 'src/ts/globalApi.svelte'
    import { createHypaV3Preset } from 'src/ts/process/memory/hypav3'
    import { tokenizePreset } from 'src/ts/process/prompt'
    import { DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { getCharToken } from 'src/ts/tokenizer'
    import { selectSingleFile } from 'src/ts/util'
    import { untrack } from 'svelte'
    import { otherPage } from './otherPage.svelte'

    // Mockup "HypaMemory V3 · настройки": presets as chips with a ⋯ menu, the memory mix as
    // a stacked bar, then the settings of the HypaV3 block in OtherBotSettings.svelte.

    const t = $derived(language.mobileOther)
    const h = $derived(language.hypaV3Settings)

    let menuOpen = $state(false)
    let advanced = $state(false)
    let settings = $derived(DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings)

    // Keep recent + similar within 1, as the desktop page does.
    $effect(() => {
        const s = DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings
        const similar = s?.similarMemoryRatio
        if (!similar) return
        untrack(() => {
            s.similarMemoryRatio = Math.min(similar, 1)
            if (s.similarMemoryRatio + s.recentMemoryRatio > 1) s.recentMemoryRatio = 1 - s.similarMemoryRatio
        })
    })
    $effect(() => {
        const s = DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings
        const recent = s?.recentMemoryRatio
        if (!recent) return
        untrack(() => {
            s.recentMemoryRatio = Math.min(recent, 1)
            if (s.recentMemoryRatio + s.similarMemoryRatio > 1) s.similarMemoryRatio = 1 - s.recentMemoryRatio
        })
    })

    async function maxMemoryRatio(): Promise<number> {
        const char = DBState.db.characters[$selectedCharID]
        if (!char || DBState.db.maxContext === 0) return 0
        const templateTokens = await tokenizePreset(DBState.db.promptTemplate)
        const charTokens = await getCharToken(char)
        const maxLore = char.loreSettings?.tokenBudget ?? DBState.db.loreBookToken
        const required = templateTokens + charTokens.persistant + Math.min(charTokens.dynamic, maxLore) + DBState.db.maxResponse * 3
        return parseFloat(Math.max((DBState.db.maxContext - required) / DBState.db.maxContext, 0).toFixed(2))
    }
    let maxRatio: number | null = $state(null)
    $effect(() => {
        void DBState.db.maxContext
        maxRatio = null
        maxMemoryRatio().then((n) => { maxRatio = n }).catch(() => { maxRatio = null })
    })

    let random = $derived(settings ? Math.max(0, parseFloat((1 - settings.recentMemoryRatio - settings.similarMemoryRatio).toFixed(2))) : 0)

    const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator
    const MODELS = $derived([
        { value: 'subModel', label: language.submodel },
        ...(hasGpu ? [['Qwen3-1.7B-q4f32_1-MLC', 'Qwen3 1.7B (GPU)'], ['Qwen3-4B-q4f32_1-MLC', 'Qwen3 4B (GPU)'], ['Qwen3-8B-q4f32_1-MLC', 'Qwen3 8B (GPU)']].map(([value, label]) => ({ value, label })) : []),
    ])

    function addPreset() {
        menuOpen = false
        DBState.db.hypaV3Presets.push(createHypaV3Preset())
        DBState.db.hypaV3PresetId = DBState.db.hypaV3Presets.length - 1
    }
    async function renamePreset() {
        menuOpen = false
        const preset = DBState.db.hypaV3Presets[DBState.db.hypaV3PresetId]
        if (!preset) return
        const name = await alertInput(t.renamePreset, [], preset.name)
        if (name && name.trim()) preset.name = name.trim()
    }
    async function removePreset() {
        menuOpen = false
        const presets = DBState.db.hypaV3Presets
        if (presets.length <= 1) {
            alertError(t.lastPreset)
            return
        }
        const id = DBState.db.hypaV3PresetId
        if (!(await alertConfirm(`${language.removeConfirm}${presets[id].name}`))) return
        DBState.db.hypaV3PresetId = 0
        presets.splice(id, 1)
    }
    async function exportPreset() {
        menuOpen = false
        const preset = DBState.db.hypaV3Presets[DBState.db.hypaV3PresetId]
        if (!preset) return
        try {
            await downloadFile(`hypaV3_export_${preset.name}.json`, Buffer.from(JSON.stringify({ type: 'risu', ver: 1, data: $state.snapshot(preset) }), 'utf-8'))
            alertNormal(language.successExport)
        } catch (error) {
            alertError(`${error}`)
        }
    }
    async function importPreset() {
        menuOpen = false
        try {
            const file = await selectSingleFile(['json'])
            if (!file) return
            const parsed = JSON.parse(Buffer.from(file.data).toString('utf-8'))
            if (parsed.type !== 'risu' || !parsed.data) return
            DBState.db.hypaV3Presets.push(createHypaV3Preset(parsed.data.name || 'Imported Preset', parsed.data.settings || {}))
            DBState.db.hypaV3PresetId = DBState.db.hypaV3Presets.length - 1
            alertNormal(language.successImport)
        } catch (error) {
            alertError(`${error}`)
        }
    }
</script>

<div class="flex flex-col gap-4">
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{h.descriptionLabel}</span>
    <div class="flex items-center gap-1.5">
        <div role="tablist" aria-label={t.presets} class="-ml-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pl-4">
            {#each DBState.db.hypaV3Presets as preset, i (i)}
                <button type="button" role="tab" aria-selected={i === DBState.db.hypaV3PresetId} class="h-[34px] shrink-0 rounded-full px-3.5 text-[13px] font-semibold" style={i === DBState.db.hypaV3PresetId ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { DBState.db.hypaV3PresetId = i }}>{preset.name}</button>
            {/each}
        </div>
        <button type="button" class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-(--mc-text2)" style="background: var(--mc-line);" aria-label={t.presetActions} onclick={() => { menuOpen = true }}><EllipsisIcon size={18} /></button>
    </div>

    {#if settings}
        <FormGroup>
            <div class="flex flex-col gap-2 px-4 py-3.5">
                <span class="flex justify-between text-[13px] text-(--mc-text2)"><span>{t.memoryMix}</span>{#if maxRatio !== null}<span>{t.maxRatio.replace('{}', maxRatio.toFixed(2))}</span>{/if}</span>
                <span class="flex h-2.5 overflow-hidden rounded-full" style="background: var(--mc-line);" aria-hidden="true">
                    <span style="width: {settings.recentMemoryRatio * 100}%; background: var(--mc-accent);"></span>
                    <span style="width: {settings.similarMemoryRatio * 100}%; background: #22c55e;"></span>
                    <span style="width: {random * 100}%; background: #f59e0b;"></span>
                </span>
                <span class="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    <span><span style="color: var(--mc-accent);">●</span> {t.recent} {settings.recentMemoryRatio.toFixed(2)}</span>
                    <span><span style="color: #22c55e;">●</span> {t.similar} {settings.similarMemoryRatio.toFixed(2)}</span>
                    <span><span style="color: #f59e0b;">●</span> {t.random} {random.toFixed(2)}</span>
                </span>
            </div>
            <FormSlider label={h.memoryTokensRatioLabel} bind:value={settings.memoryTokensRatio} min={0} max={1} step={0.01} fixed={2} />
            <FormSlider label={h.extraSummarizationRatioLabel} bind:value={settings.extraSummarizationRatio} min={0} max={1 - settings.memoryTokensRatio} step={0.01} fixed={2} />
            <FormSlider label={h.recentMemoryRatioLabel} bind:value={settings.recentMemoryRatio} min={0} max={1} step={0.01} fixed={2} />
            <FormSlider label={h.similarMemoryRatioLabel} bind:value={settings.similarMemoryRatio} min={0} max={1} step={0.01} fixed={2} />
        </FormGroup>

        <FormGroup label={t.summarizing}>
            <FormSelect label={t.summaryModel} bind:value={settings.summarizationModel} options={MODELS} />
            <FormStepper label={h.maxChatsPerSummaryLabel} bind:value={settings.maxChatsPerSummary} min={1} />
            <FormStepper label={h.queryChatCountLabel} bind:value={settings.queryChatCount} min={1} max={20} />
            <FormNav label={t.page_hypaPrompts} value={settings.summarizationPrompt || settings.reSummarizationPrompt ? t.custom : t.byDefault} onclick={() => { otherPage.current = 'hypaPrompts' }} />
        </FormGroup>

        <FormGroup>
            <FormToggle label={h.doNotSummarizeUserMessageLabel} bind:checked={settings.doNotSummarizeUserMessage} />
            <FormToggle label={h.preserveOrphanedMemoryLabel} bind:checked={settings.preserveOrphanedMemory} />
            <FormToggle label={h.applyRegexScriptWhenRerollingLabel} bind:checked={settings.processRegexScript} />
        </FormGroup>

        <FormGroup>
            <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" aria-expanded={advanced} onclick={() => { advanced = !advanced }}>
                <span class="flex-1 text-[15px]">{t.advanced}</span>
                {#if advanced}<ChevronDownIcon size={18} class="text-(--mc-text2)" />{:else}<ChevronRightIcon size={18} class="text-(--mc-text2)" />{/if}
            </button>
            {#if advanced}
                <FormText label={h.summaryChunkSeparatorLabel} bind:value={settings.summaryChunkSeparator} mono />
                <FormToggle label="Use Experimental Implementation" bind:checked={settings.useExperimentalImpl} />
                <FormToggle label="Always Toggle On" bind:checked={settings.alwaysToggleOn} />
                {#if settings.useExperimentalImpl}
                    <FormStepper label="Summarization Requests / min" bind:value={settings.summarizationRequestsPerMinute} min={1} />
                    <FormStepper label="Summarization Max Concurrent" bind:value={settings.summarizationMaxConcurrent} min={1} max={10} />
                    <FormStepper label="Embedding Requests / min" bind:value={settings.embeddingRequestsPerMinute} min={1} />
                    <FormStepper label="Embedding Max Concurrent" bind:value={settings.embeddingMaxConcurrent} min={1} max={10} />
                {:else}
                    <FormToggle label={h.enableSimilarityCorrectionLabel} bind:checked={settings.enableSimilarityCorrection} />
                {/if}
            {/if}
        </FormGroup>
    {/if}
</div>

<Sheet open={menuOpen} label={t.presetActions} onclose={() => { menuOpen = false }}>
    <SheetGroup>
        <SheetRow label={t.newPreset} onclick={addPreset}><PlusIcon size={20} /></SheetRow>
        <SheetRow label={t.renamePreset} onclick={renamePreset}><PencilIcon size={20} /></SheetRow>
        <SheetRow label={language.mobileBot.export} onclick={exportPreset}><DownloadIcon size={20} /></SheetRow>
        <SheetRow label={language.mobileBot.import} onclick={importPreset}><UploadIcon size={20} /></SheetRow>
    </SheetGroup>
    <SheetGroup>
        <SheetRow label={language.mobileBot.remove} danger onclick={removePreset}><Trash2Icon size={20} /></SheetRow>
    </SheetGroup>
</Sheet>
