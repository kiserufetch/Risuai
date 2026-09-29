<script lang="ts">
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormNav from 'src/lib/MobileChat/Form/FormNav.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import KeyInput from '../Bot/KeyInput.svelte'
    import { memoryType, setMemoryType, type MemoryType } from './memory'
    import { otherPage } from './otherPage.svelte'

    // Mockup "Долговременная память": the memory type as radio cards, the chosen type's
    // settings, then the embedding model (the long-term memory block of OtherBotSettings).

    const t = $derived(language.mobileOther)

    let type = $derived(memoryType())
    let types: { id: MemoryType; title: string; hint: string }[] = $derived([
        { id: 'none', title: t.memOff, hint: t.memOffHint },
        { id: 'supaMemory', title: 'SupaMemory', hint: t.memSupaHint },
        { id: 'hypaV2', title: 'HypaMemory V2', hint: t.memHypa2Hint },
        { id: 'hanuraiMemory', title: 'Hanurai', hint: t.memHanuraiHint },
        { id: 'hypaV3', title: 'HypaMemory V3', hint: t.memHypa3Hint },
    ])

    const SUPA_MODELS = $derived([
        { value: 'distilbart', label: 'distilbart-cnn-6-6 (Free/Local)' }, { value: 'instruct35', label: 'OpenAI 3.5 Turbo Instruct' }, { value: 'subModel', label: language.submodel },
    ])
    const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator
    const EMBEDDINGS = [
        ...(hasGpu ? [
            ['MiniLMGPU', 'MiniLM L6 v2 (GPU)'], ['nomicGPU', 'Nomic Embed Text v1.5 (GPU)'], ['bgeSmallEnGPU', 'BGE Small English (GPU)'],
            ['bgem3GPU', 'BGE Medium 3 (GPU)'], ['multiMiniLMGPU', 'Multilingual MiniLM L12 v2 (GPU)'], ['bgeM3KoGPU', 'BGE Medium 3 Korean (GPU)'],
        ] : []),
        ['MiniLM', 'MiniLM L6 v2 (CPU)'], ['nomic', 'Nomic Embed Text v1.5 (CPU)'], ['bgeSmallEn', 'BGE Small English (CPU)'], ['bgem3', 'BGE Medium 3 (CPU)'],
        ['multiMiniLM', 'Multilingual MiniLM L12 v2 (CPU)'], ['bgeM3Ko', 'BGE Medium 3 Korean (CPU)'], ['openai3small', 'OpenAI text-embedding-3-small'],
        ['openai3large', 'OpenAI text-embedding-3-large'], ['ada', 'OpenAI Ada'], ['voyageContext3', 'Voyage Context 3'], ['custom', 'Custom (OpenAI-compatible)'],
    ].map(([value, label]) => ({ value, label }))

    const supaKey = { id: 'supa', label: `${language.SuperMemory} OpenAI Key`, get: () => DBState.db.supaMemoryKey, set: (v: string) => { DBState.db.supaMemoryKey = v }, secret: true }
    const openaiKey = { ...supaKey, label: 'OpenAI API Key' }
    const voyageKey = { id: 'voyage', label: 'Voyage API Key', get: () => DBState.db.voyageApiKey, set: (v: string) => { DBState.db.voyageApiKey = v }, secret: true }
    const customKey = { id: 'hypaCustom', label: 'Key / Password', get: () => DBState.db.hypaCustomSettings.key, set: (v: string) => { DBState.db.hypaCustomSettings.key = v }, secret: true, optional: true }
    let needsSupaKey = $derived(['davinci', 'curie', 'instruct35'].includes(DBState.db.supaModelType))
</script>

<div class="flex flex-col gap-4">
    <div role="radiogroup" aria-label={language.type} class="risu-mc-memory flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each types as option (option.id)}
            {@const on = type === option.id}
            <button type="button" role="radio" aria-checked={on} class="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left" style={on ? 'background: color-mix(in oklab, var(--mc-accent) 8%, var(--mc-group));' : ''} onclick={() => setMemoryType(option.id)}>
                <span class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2" style="border-color: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};">
                    {#if on}<span class="h-2.5 w-2.5 rounded-full" style="background: var(--mc-accent);"></span>{/if}
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[15px] font-semibold">{option.title}</span><span class="text-[12px] text-(--mc-text2)">{option.hint}</span></span>
            </button>
        {/each}
    </div>

    {#if type === 'hypaV3'}
        <FormGroup>
            <FormNav label={t.page_hypaV3} value={DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.name ?? ''} onclick={() => { otherPage.current = 'hypaV3' }} />
        </FormGroup>
    {:else if type === 'hanuraiMemory'}
        <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{language.hanuraiDesc}</span>
        <FormGroup>
            <FormStepper label={t.chunkSize} bind:value={DBState.db.hanuraiTokens} min={100} step={100} />
            <FormToggle label={t.textSplitting} bind:checked={DBState.db.hanuraiSplit} />
        </FormGroup>
    {:else if type === 'hypaV2' || type === 'supaMemory'}
        <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{type === 'hypaV2' ? language.hypaV2Desc : language.supaDesc}</span>
        <FormGroup>
            <FormSelect label={t.summaryModel} bind:value={DBState.db.supaModelType} options={SUPA_MODELS} />
            {#if needsSupaKey}<KeyInput field={supaKey} />{/if}
            {#if type === 'hypaV2'}
                <FormStepper label={language.hypaChunkSize} bind:value={DBState.db.hypaChunkSize} min={100} step={100} />
                <FormStepper label={language.hypaAllocatedTokens} bind:value={DBState.db.hypaAllocatedTokens} min={100} step={100} />
            {:else}
                <FormStepper label={language.maxSupaChunkSize} bind:value={DBState.db.maxSupaChunkSize} min={100} step={100} />
                <FormToggle label="{language.enable} {language.HypaMemory}" bind:checked={DBState.db.hypaMemory} />
            {/if}
        </FormGroup>
        <CodeField label={language.summarizationPrompt} bind:value={DBState.db.supaMemoryPrompt} placeholder={t.defaultPlaceholder} minRows={3} wrap />
    {/if}

    <FormGroup label={language.embedding}>
        <FormSelect label={t.embeddingModel} bind:value={DBState.db.hypaModel} options={EMBEDDINGS} />
        {#if DBState.db.hypaModel === 'openai3small' || DBState.db.hypaModel === 'openai3large' || DBState.db.hypaModel === 'ada'}
            <KeyInput field={openaiKey} />
        {:else if DBState.db.hypaModel === 'voyageContext3'}
            <KeyInput field={voyageKey} />
        {:else if DBState.db.hypaModel === 'custom'}
            <FormText label="URL" bind:value={DBState.db.hypaCustomSettings.url} placeholder="https://…/v1/embeddings" mono />
            <KeyInput field={customKey} />
            <FormText label={t.requestModel} bind:value={DBState.db.hypaCustomSettings.model} mono />
        {/if}
    </FormGroup>
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{t.embeddingHint}</span>
</div>

<style>
    .risu-mc-memory > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
