<script lang="ts">
    import { SparklesIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { alertError } from 'src/ts/alert'
    import { DBState } from 'src/ts/stores.svelte'
    import { selectSingleFile } from 'src/ts/util'
    import KeyInput from '../Bot/KeyInput.svelte'
    import ImageRef from './ImageRef.svelte'
    import SizePicker from './SizePicker.svelte'

    // Mockup "Генерация картинок · NovelAI": the NovelAI block of OtherBotSettings.svelte —
    // model, size, sampling, Vibe / character reference, image-to-image, model toggles.

    const t = $derived(language.mobileOther)
    let cfg = $derived(DBState.db.NAIImgConfig)
    let model = $derived(DBState.db.NAIImgModel)

    const MODELS = ['nai-diffusion-5-full', 'nai-diffusion-5-curated', 'nai-diffusion-4-5-full', 'nai-diffusion-4-5-curated', 'nai-diffusion-4-full', 'nai-diffusion-4-curated-preview', 'nai-diffusion-3', 'nai-diffusion-furry-3', 'nai-diffusion-2'].map((v) => ({ value: v, label: v }))
    let v4 = $derived(['nai-diffusion-4-full', 'nai-diffusion-4-curated-preview', 'nai-diffusion-4-5-full', 'nai-diffusion-4-5-curated'].includes(model))
    let v45 = $derived(model === 'nai-diffusion-4-5-full' || model === 'nai-diffusion-4-5-curated')
    let samplers = $derived((v4
        ? [['k_euler_ancestral', 'Euler Ancestral'], ['k_dpmpp_2s_ancestral', 'DPM++ 2S Ancestral'], ['k_dpmpp_2m_sde', 'DPM++ 2M SDE'], ['k_euler', 'Euler'], ['k_dpmpp_2m', 'DPM++ 2M'], ['k_dpmpp_sde', 'DPM++ SDE']]
        : [['k_euler_ancestral', 'Euler Ancestral'], ['k_dpmpp_2s_ancestral', 'DPM++ 2S Ancestral'], ['k_dpmpp_sde', 'DPM++ SDE'], ['k_euler', 'Euler'], ['k_dpmpp_2m', 'DPM++ 2M'], ['k_dpmpp_2s', 'DPM++ 2S'], ['ddim_v3', 'DDIM']]
    ).map(([value, label]) => ({ value, label })))
    const SCHEDULES = ['native', 'karras', 'exponential', 'polyexponential'].map((v) => ({ value: v, label: v }))
    let refModes = $derived([{ value: '', label: t.none }, { value: 'vibe', label: 'Vibe Transfer' }, ...(v45 ? [{ value: 'character', label: 'Character Reference' }] : [])])

    const key = { id: 'nai', label: 'NovelAI API Key', get: () => DBState.db.NAIApiKey, set: (v: string) => { DBState.db.NAIApiKey = v }, secret: true, placeholder: 'pst-…' }

    function firstInfoExtracted() {
        const sel = cfg.vibe_model_selection
        const encodings = sel ? cfg.vibe_data?.encodings?.[sel] : null
        const first = encodings ? Object.keys(encodings)[0] : null
        if (first) cfg.InfoExtracted = Number(encodings[first].params.information_extracted)
    }

    async function pickVibe() {
        const file = await selectSingleFile(['naiv4vibe'])
        if (!file) return
        try {
            const vibe = JSON.parse(new TextDecoder().decode(file.data))
            if (vibe.version !== 1 || vibe.identifier !== 'novelai-vibe-transfer') {
                alertError('Invalid vibe file. Version must be 1.')
                return
            }
            cfg.vibe_data = vibe
            if (vibe.thumbnail) {
                cfg.reference_image_multiple = []
                if (model.includes('nai-diffusion-4-full')) cfg.vibe_model_selection = 'v4full'
                else if (model.includes('nai-diffusion-4-curated')) cfg.vibe_model_selection = 'v4curated'
                else if (model.includes('nai-diffusion-4-5-full')) cfg.vibe_model_selection = 'v4-5full'
                else if (model.includes('nai-diffusion-4-5-curated')) cfg.vibe_model_selection = 'v4-5curated'
                firstInfoExtracted()
            }
            if (!Array.isArray(cfg.reference_strength_multiple) || !cfg.reference_strength_multiple.length) cfg.reference_strength_multiple = [0.7]
        } catch (error) {
            alertError('Error parsing vibe file: ' + error)
        }
    }

    let vibeModels = $derived(cfg.vibe_data ? [['v4full', 'nai-diffusion-4-full'], ['v4curated', 'nai-diffusion-4-curated'], ['v4-5full', 'nai-diffusion-4-5-full'], ['v4-5curated', 'nai-diffusion-4-5-curated']]
        .filter(([k]) => cfg.vibe_data?.encodings?.[k]).map(([value, label]) => ({ value, label })) : [])
    let infoOptions = $derived(cfg.vibe_model_selection && cfg.vibe_data?.encodings?.[cfg.vibe_model_selection]
        ? Object.values(cfg.vibe_data.encodings[cfg.vibe_model_selection] as Record<string, { params: { information_extracted: number } }>).map((v) => ({ value: v.params.information_extracted, label: String(v.params.information_extracted) }))
        : [])
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <KeyInput field={key} />
        <FormText label={language.providerURL} bind:value={DBState.db.NAIImgUrl} placeholder="https://image.novelai.net" mono />
        <FormSelect label={language.model} bind:value={DBState.db.NAIImgModel} options={MODELS} />
    </FormGroup>

    <FormGroup label={t.size}>
        <SizePicker bind:width={cfg.width} bind:height={cfg.height} />
    </FormGroup>

    <FormGroup label={t.sampling}>
        <FormSelect label={t.sampler} bind:value={cfg.sampler} options={samplers} />
        <FormSelect label="Noise Schedule" bind:value={cfg.noise_schedule} options={SCHEDULES} />
        <FormStepper label={t.steps} bind:value={cfg.steps} min={1} max={50} />
        <FormSlider label="CFG" bind:value={cfg.scale} min={0} max={10} step={0.1} fixed={1} />
        <FormSlider label="CFG rescale" bind:value={cfg.cfg_rescale} min={0} max={1} step={0.01} fixed={2} />
        {#if (model === 'nai-diffusion-3' || model === 'nai-diffusion-furry-3' || model === 'nai-diffusion-2') && cfg.sampler !== 'ddim_v3'}
            <FormToggle label="SMEA" bind:checked={cfg.sm} />
        {/if}
        {#if model === 'nai-diffusion-3' && cfg.sampler !== 'ddim_v3'}
            <FormToggle label="DYN" bind:checked={cfg.sm_dyn} />
        {/if}
        {#if v4 || model === 'nai-diffusion-3' || model === 'nai-diffusion-furry-3'}
            <FormToggle label="Variety+" bind:checked={cfg.variety_plus} />
        {/if}
        {#if model === 'nai-diffusion-3' || model === 'nai-diffusion-furry-3' || model === 'nai-diffusion-2'}
            <FormToggle label="Decrisp" bind:checked={cfg.decrisp} />
        {/if}
        {#if model === 'nai-diffusion-4-full' || model === 'nai-diffusion-4-curated-preview'}
            <FormToggle label="Legacy UC" bind:checked={cfg.legacy_uc} />
        {/if}
    </FormGroup>

    <FormGroup label={t.reference}>
        <FormSelect label={t.referenceMode} bind:value={cfg.reference_mode} options={refModes} />
        {#if cfg.reference_mode === 'vibe'}
            <div class="flex min-h-[72px] items-center gap-3 px-4 py-2.5">
                <button type="button" class="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl text-(--mc-text2)" style="background: var(--mc-line);" aria-label="Vibe" onclick={pickVibe}>
                    {#if cfg.vibe_data?.thumbnail}<img src={cfg.vibe_data.thumbnail} alt="" class="h-full w-full object-cover" />{:else}<SparklesIcon size={22} />{/if}
                </button>
                <button type="button" class="flex min-w-0 flex-1 flex-col gap-0.5 text-left" onclick={pickVibe}>
                    <span class="text-[15px]">Vibe Transfer</span>
                    <span class="text-[12px] text-(--mc-text2)">{cfg.vibe_data ? t.tapToReplace : t.uploadVibe}</span>
                </button>
                {#if cfg.vibe_data}
                    <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={language.mobileBot.remove} onclick={() => { cfg.vibe_data = undefined; cfg.vibe_model_selection = undefined }}><XIcon size={18} /></button>
                {/if}
            </div>
            {#if cfg.vibe_data}
                <FormSelect label={t.vibeModel} bind:value={cfg.vibe_model_selection} options={vibeModels} onchange={firstInfoExtracted} />
                <FormSelect label="Information Extracted" bind:value={cfg.InfoExtracted} options={infoOptions} />
                <FormSlider label={t.referenceStrength} bind:value={cfg.reference_strength_multiple[0]} min={0} max={1} step={0.1} fixed={2} />
            {/if}
        {:else if cfg.reference_mode === 'character' && v45}
            <ImageRef label="Character Reference" image={cfg.character_image} hint={t.defaultCharImage} onpick={(id, b64) => { cfg.character_image = id; cfg.character_base64image = b64 }} onremove={() => { cfg.character_image = undefined; cfg.character_base64image = undefined }} />
            <FormToggle label="Style Aware" bind:checked={cfg.style_aware} />
        {/if}
    </FormGroup>

    <FormGroup label="Image to Image">
        <FormToggle label={t.i2i} hint={t.i2iHint} bind:checked={DBState.db.NAII2I} />
        {#if DBState.db.NAII2I}
            <ImageRef label={t.baseImage} image={cfg.image} hint={t.defaultCharImage} onpick={(id, b64) => { cfg.image = id; cfg.base64image = b64 }} onremove={() => { cfg.image = undefined; cfg.base64image = undefined }} />
            <FormSlider label="Strength" bind:value={cfg.strength} min={0} max={0.99} step={0.01} fixed={2} />
            <FormSlider label="Noise" bind:value={cfg.noise} min={0} max={0.99} step={0.01} fixed={2} />
        {/if}
    </FormGroup>
</div>
