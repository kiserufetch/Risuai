<script lang="ts">
    import { CheckIcon, ChevronRightIcon, RefreshCwIcon, SearchIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import { alertError, alertNormal } from 'src/ts/alert'
    import { globalFetch } from 'src/ts/globalApi.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import KeyInput from '../Bot/KeyInput.svelte'
    import ImageRef from './ImageRef.svelte'

    // WaveSpeedAI (the wavespeed block of OtherBotSettings.svelte): key, a model catalog in a
    // sheet like the OpenRouter one, LoRAs and an image reference when the model takes them.

    interface WavespeedModel { model_id: string; name: string; base_price: number; supportsImageInput: boolean; supportsLoras: boolean }

    const t = $derived(language.mobileOther)
    let cfg = $derived(DBState.db.wavespeedImage)
    const key = { id: 'wavespeed', label: 'WaveSpeed API Key', get: () => DBState.db.wavespeedImage.key, set: (v: string) => { DBState.db.wavespeedImage.key = v }, secret: true }

    let models: WavespeedModel[] = $state([])
    let loading = $state(false)
    let open = $state(false)
    let query = $state('')
    let current = $derived(models.find((m) => m.model_id === cfg.model))

    // Three LoRA slots, seeded from the saved list; empty paths are dropped on save.
    let loras = $state([0, 1, 2].map((i) => ({ path: DBState.db.wavespeedImage.loras?.[i]?.path ?? '', scale: DBState.db.wavespeedImage.loras?.[i]?.scale ?? 1 })))
    function saveLoras() {
        cfg.loras = loras.filter((l) => l.path.trim()).map((l) => ({ path: l.path, scale: l.scale }))
    }

    async function refresh() {
        if (!cfg.key?.trim()) {
            alertError('WaveSpeed API Key not set')
            return
        }
        loading = true
        try {
            const result = await globalFetch('https://api.wavespeed.ai/api/v3/models', { method: 'GET', headers: { Authorization: `Bearer ${cfg.key}` } })
            if (!result.ok || !result.data) {
                alertError('Failed to fetch WaveSpeed models')
                return
            }
            const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
            if (data.code !== 200 || !Array.isArray(data.data)) {
                alertError('Invalid WaveSpeed API response')
                return
            }
            models = data.data
                .filter((m: { type: string }) => m.type === 'text-to-image' || m.type === 'image-to-image')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((m: any) => ({
                    model_id: m.model_id, name: m.name, base_price: m.base_price, supportsImageInput: m.type === 'image-to-image',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    supportsLoras: m.api_schema?.api_schemas?.some((s: any) => s.request_schema?.properties?.loras !== undefined) ?? false,
                }))
                .sort((a: WavespeedModel, b: WavespeedModel) => a.name.localeCompare(b.name))
            alertNormal(`Successfully loaded ${models.length} models`)
        } catch (error) {
            alertError(`Failed to fetch models: ${error}`)
        } finally {
            loading = false
        }
    }

    function pick(model: WavespeedModel) {
        cfg.model = model.model_id
        if (model.supportsImageInput) {
            cfg.reference_mode = ''
            cfg.reference_image = undefined
            cfg.reference_base64image = undefined
        }
        if (!model.supportsLoras) cfg.loras = undefined
        open = false
    }

    let visible = $derived.by(() => {
        const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
        return models.filter((m) => terms.every((term) => `${m.name} ${m.model_id}`.toLowerCase().includes(term)))
    })
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <KeyInput field={key} />
        <div>
            <button type="button" class="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left" onclick={() => { if (models.length) open = true; else refresh().then(() => { if (models.length) open = true }) }}>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="text-[12px] text-(--mc-text2)">{language.model}</span>
                    <span class="truncate text-[16px] font-semibold">{loading ? t.loading : current?.name || cfg.model || language.mobileBot.noModel}</span>
                    {#if current}<span class="text-[12px] text-(--mc-text2)">{t.price} {current.base_price}</span>{/if}
                </span>
                <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
            </button>
        </div>
        <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-medium disabled:opacity-50" style="color: var(--mc-accent);" disabled={loading} onclick={refresh}><RefreshCwIcon size={18} />{t.refreshModels}</button>
    </FormGroup>

    <FormGroup label="LoRA">
        {#if current?.supportsLoras}
            {#each loras as lora, i (i)}
                <label class="flex flex-col gap-1 px-4 pt-2.5">
                    <span class="text-[12px] text-(--mc-text2)">LoRA {i + 1}</span>
                    <input bind:value={lora.path} oninput={saveLoras} placeholder="owner/model-name or URL" autocomplete="off" autocapitalize="off" spellcheck="false" class="border-0 bg-transparent font-mono text-[14px] outline-none" style="color: var(--mc-text);" />
                </label>
                <FormSlider label={t.weight} bind:value={lora.scale} min={0} max={4} step={0.1} fixed={1} oninput={saveLoras} />
            {/each}
        {:else}
            <span class="block px-4 py-3 text-[13px] text-(--mc-text2)">{t.noLora}</span>
        {/if}
    </FormGroup>

    <FormGroup label={t.reference}>
        {#if current?.supportsImageInput}
            <FormSelect label={t.referenceMode} bind:value={cfg.reference_mode} options={[{ value: '', label: t.none }, { value: 'image', label: t.uploadImage }, { value: 'character', label: t.characterImage }]} />
            {#if cfg.reference_mode === 'image'}
                <ImageRef label={t.referenceImage} image={cfg.reference_image} onpick={(id, b64) => { cfg.reference_image = id; cfg.reference_base64image = b64 }} onremove={() => { cfg.reference_image = undefined; cfg.reference_base64image = undefined }} />
            {/if}
        {:else}
            <span class="block px-4 py-3 text-[13px] text-(--mc-text2)">{t.noImageInput}</span>
        {/if}
    </FormGroup>
</div>

<Sheet {open} label={language.model} onclose={() => { open = false }} class="h-[85dvh]">
    <div class="flex shrink-0 items-center gap-2 px-1">
        <span class="flex-1 text-[18px] font-bold">WaveSpeedAI</span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={language.mobileBot.close} onclick={() => { open = false }}><XIcon size={16} /></button>
    </div>
    <label class="flex h-[42px] shrink-0 items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-line);">
        <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
        <input type="search" bind:value={query} placeholder={language.mobileBot.searchModel} aria-label={language.mobileBot.searchModel} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
    </label>
    <div class="risu-mc-ws flex shrink-0 flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each visible as model (model.model_id)}
            {@const on = model.model_id === cfg.model}
            <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left" onclick={() => pick(model)}>
                <span class="flex min-w-0 flex-1 flex-col gap-1">
                    <span class="text-[15px] font-semibold" style={on ? 'color: var(--mc-accent);' : ''}>{model.name}</span>
                    <span class="flex flex-wrap gap-1.5">
                        <span class="rounded-md px-1.5 py-0.5 text-[11px]" style="background: var(--mc-line);">{t.price} {model.base_price}</span>
                        {#if model.supportsImageInput}<span class="rounded-md px-1.5 py-0.5 text-[11px]" style="background: var(--mc-line);">{t.imageInput}</span>{/if}
                        {#if model.supportsLoras}<span class="rounded-md px-1.5 py-0.5 text-[11px]" style="background: var(--mc-line);">LoRA</span>{/if}
                    </span>
                </span>
                {#if on}<CheckIcon size={20} class="shrink-0" style="color: var(--mc-accent);" />{/if}
            </button>
        {:else}
            <span class="px-4 py-4 text-[15px] text-(--mc-text2)">{language.mobileDialogs.nothingFound}</span>
        {/each}
    </div>
</Sheet>

<style>
    .risu-mc-ws > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
