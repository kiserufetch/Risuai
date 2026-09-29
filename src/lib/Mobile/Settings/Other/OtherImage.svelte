<script lang="ts">
    import { XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import { isTauri } from 'src/ts/platform'
    import { DBState } from 'src/ts/stores.svelte'
    import KeyInput from '../Bot/KeyInput.svelte'
    import type { KeyField } from '../Bot/keys'
    import ImageNovelAI from './ImageNovelAI.svelte'
    import ImageWavespeed from './ImageWavespeed.svelte'
    import { IMAGE_PROVIDERS, imageProviderName } from './memory'
    import SizePicker from './SizePicker.svelte'

    // Mockups "Генерация картинок": the provider as tiles (inline while none is chosen, a
    // sheet afterwards), then that provider's settings from OtherBotSettings.svelte.

    const t = $derived(language.mobileOther)
    let picking = $state(false)
    let provider = $derived(DBState.db.sdProvider)

    const hints = $derived<Record<string, string>>({
        '': t.imgOffHint, novelai: t.imgNaiHint, webui: t.imgOwnServer, comfyui: t.imgComfyHint, dalle: 'OpenAI', Imagen: 'Google',
        stability: 'SD3, Core', fal: 'Flux, LoRA', 'openai-compat': t.imgAnyApi, wavespeed: t.imgCatalog,
    })

    const opt = (values: string[] | [string, string][]) => values.map((v) => (Array.isArray(v) ? { value: v[0], label: v[1] } : { value: v, label: v }))
    const key = (id: string, label: string, get: () => string, set: (v: string) => void, placeholder = ''): KeyField => ({ id, label, get, set, secret: true, placeholder: placeholder || undefined })

    function choose(id: string) {
        DBState.db.sdProvider = id
        picking = false
    }
</script>

{#snippet tiles()}
    <div class="grid grid-cols-2 gap-2">
        {#each IMAGE_PROVIDERS as id (id)}
            {@const on = provider === id}
            <button type="button" aria-pressed={on} class="flex min-h-16 flex-col gap-0.5 rounded-2xl border-[1.5px] px-3 py-2.5 text-left" style="background: {on ? 'var(--mc-accent-soft)' : 'var(--mc-group)'}; border-color: {on ? 'var(--mc-accent)' : 'transparent'};" onclick={() => choose(id)}>
                <span class="text-[14px] font-semibold">{id ? imageProviderName(id) : t.off}</span>
                <span class="text-[11px] text-(--mc-text2)">{hints[id]}</span>
            </button>
        {/each}
    </div>
{/snippet}

<div class="flex flex-col gap-4">
    {#if !provider}
        <span class="px-2 text-[13px] text-(--mc-text2)">{language.provider}</span>
        {@render tiles()}
    {:else}
        <div class="flex items-center gap-3 rounded-2xl px-4 py-2.5" style="background: var(--mc-group);">
            <span class="flex min-w-0 flex-1 flex-col"><span class="text-[12px] text-(--mc-text2)">{language.provider}</span><span class="truncate text-[16px] font-semibold">{imageProviderName(provider)}</span></span>
            <button type="button" class="shrink-0 text-[14px] font-semibold" style="color: var(--mc-accent);" onclick={() => { picking = true }}>{t.change}</button>
        </div>

        {#if provider === 'novelai'}
            <ImageNovelAI />
        {:else if provider === 'wavespeed'}
            <ImageWavespeed />
        {:else if provider === 'webui'}
            <span class="px-2 text-[13px] leading-[18px]" style="color: var(--mc-danger);">You must use WebUI with the --api flag and without an AGPL-modified build. {#if !isTauri}The web version needs ngrok or another tunnel for a local WebUI.{/if}</span>
            <FormGroup>
                <FormText label="WebUI {language.providerURL}" bind:value={DBState.db.webUiUrl} placeholder="https://…" mono />
                <FormText label={t.sampler} bind:value={DBState.db.sdConfig.sampler_name} />
            </FormGroup>
            <FormGroup label={t.size}><SizePicker bind:width={DBState.db.sdConfig.width} bind:height={DBState.db.sdConfig.height} /></FormGroup>
            <FormGroup label={t.sampling}>
                <FormStepper label={t.steps} bind:value={DBState.db.sdSteps} min={0} max={100} />
                <FormStepper label="CFG Scale" bind:value={DBState.db.sdCFG} min={0} max={20} />
                <FormToggle label="Hires fix" bind:checked={DBState.db.sdConfig.enable_hr} />
                {#if DBState.db.sdConfig.enable_hr}
                    <FormSlider label="Denoising strength" bind:value={DBState.db.sdConfig.denoising_strength} min={0} max={1} step={0.01} fixed={2} />
                    <FormSlider label="Hires scale" bind:value={DBState.db.sdConfig.hr_scale} min={1} max={4} step={0.05} fixed={2} />
                    <FormText label="Upscaler" bind:value={DBState.db.sdConfig.hr_upscaler} />
                {/if}
            </FormGroup>
        {:else if provider === 'dalle'}
            <FormGroup>
                <KeyInput field={key('dalle', 'OpenAI API Key', () => DBState.db.openAIKey, (v) => { DBState.db.openAIKey = v }, 'sk-…')} />
                <FormSelect label={t.quality} bind:value={DBState.db.dallEQuality} options={opt([['standard', 'Standard'], ['hd', 'HD']])} />
            </FormGroup>
        {:else if provider === 'stability'}
            <FormGroup>
                <KeyInput field={key('stability', 'Stability API Key', () => DBState.db.stabilityKey, (v) => { DBState.db.stabilityKey = v })} />
                <FormSelect label={language.model} bind:value={DBState.db.stabilityModel} options={opt([['ultra', 'SD Ultra'], ['core', 'SD Core'], ['sd3-large', 'SD3 Large'], ['sd3-medium', 'SD3 Medium']])} />
                {#if DBState.db.stabilityModel === 'core'}
                    <FormSelect label={t.style} bind:value={DBState.db.stabllityStyle} options={opt([['', 'Unspecified'], ['3d-model', '3D Model'], ['analog-film', 'Analog Film'], ['anime', 'Anime'], ['cinematic', 'Cinematic'], ['comic-book', 'Comic Book'], ['digital-art', 'Digital Art'], ['enhance', 'Enhance'], ['fantasy-art', 'Fantasy Art'], ['isometric', 'Isometric'], ['line-art', 'Line Art'], ['low-poly', 'Low Poly'], ['modeling-compound', 'Modeling Compound'], ['neon-punk', 'Neon Punk'], ['origami', 'Origami'], ['photographic', 'Photographic'], ['pixel-art', 'Pixel Art'], ['tile-texture', 'Tile Texture']])} />
                {/if}
            </FormGroup>
        {:else if provider === 'comfyui' || provider === 'comfy'}
            {#if provider === 'comfy'}
                <span class="px-2 text-[13px] leading-[18px]" style="color: var(--mc-danger);">The first image generated by the prompt is used. {#if !isTauri}Run ComfyUI with --enable-cors-header.{/if}</span>
            {/if}
            <FormGroup>
                <FormText label="ComfyUI {language.providerURL}" bind:value={DBState.db.comfyUiUrl} placeholder="http://127.0.0.1:8188" mono />
                <FormStepper label={t.timeout} bind:value={DBState.db.comfyConfig.timeout} min={1} max={120} />
                {#if provider === 'comfy'}
                    <FormText label="Positive node ID" bind:value={DBState.db.comfyConfig.posNodeID} placeholder="1, 3…" mono />
                    <FormText label="Positive input name" bind:value={DBState.db.comfyConfig.posInputName} placeholder="text" mono />
                    <FormText label="Negative node ID" bind:value={DBState.db.comfyConfig.negNodeID} placeholder="1, 3…" mono />
                    <FormText label="Negative input name" bind:value={DBState.db.comfyConfig.negInputName} placeholder="text" mono />
                {/if}
            </FormGroup>
            <CodeField label="Workflow (API JSON)" bind:value={DBState.db.comfyConfig.workflow} minRows={6} />
        {:else if provider === 'fal'}
            <FormGroup>
                <KeyInput field={key('fal', 'Fal.ai API Key', () => DBState.db.falToken, (v) => { DBState.db.falToken = v })} />
                <FormSelect label={language.model} bind:value={DBState.db.falModel} options={opt([['fal-ai/flux/dev', 'Flux [Dev]'], ['fal-ai/flux-lora', 'Flux [Dev] + LoRA'], ['fal-ai/flux-pro', 'Flux [Pro]'], ['fal-ai/flux/schnell', 'Flux [Schnell]']])} />
                {#if DBState.db.falModel === 'fal-ai/flux-lora'}
                    <FormText label="LoRA URL" bind:value={DBState.db.falLora} mono />
                    <FormSlider label={t.weight} bind:value={DBState.db.falLoraScale} min={0} max={2} step={0.01} fixed={2} />
                {/if}
            </FormGroup>
            <FormGroup label={t.size}><SizePicker bind:width={DBState.db.sdConfig.width} bind:height={DBState.db.sdConfig.height} /></FormGroup>
        {:else if provider === 'Imagen'}
            <FormGroup>
                <KeyInput field={key('imagen', 'Google AI API Key', () => DBState.db.google.accessToken, (v) => { DBState.db.google.accessToken = v })} />
                <FormSelect label={language.model} bind:value={DBState.db.ImagenModel} options={opt([['imagen-4.0-generate-001', 'Imagen 4'], ['imagen-4.0-ultra-generate-001', 'Imagen 4 Ultra'], ['imagen-4.0-fast-generate-001', 'Imagen 4 Fast'], ['imagen-3.0-generate-002', 'Imagen 3.0']])} />
                {#if DBState.db.ImagenModel === 'imagen-4.0-generate-001' || DBState.db.ImagenModel === 'imagen-4.0-ultra-generate-001'}
                    <FormSelect label={t.size} bind:value={DBState.db.ImagenImageSize} options={opt(['1K', '2K'])} />
                {/if}
                <FormSelect label={t.aspect} bind:value={DBState.db.ImagenAspectRatio} options={opt(['1:1', '3:4', '4:3', '9:16', '16:9'])} />
                <FormSelect label={t.people} bind:value={DBState.db.ImagenPersonGeneration} options={opt([['allow_all', 'Allow all'], ['allow_adult', 'Allow adult'], ['dont_allow', "Don't allow"]])} />
            </FormGroup>
        {:else if provider === 'openai-compat'}
            <FormGroup>
                <FormText label="API URL" bind:value={DBState.db.openaiCompatImage.url} placeholder="https://api.example.com/v1/images/generations" mono />
                <KeyInput field={key('oaiImg', 'API Key', () => DBState.db.openaiCompatImage.key, (v) => { DBState.db.openaiCompatImage.key = v }, 'sk-…')} />
                <FormText label={language.model} bind:value={DBState.db.openaiCompatImage.model} placeholder="dall-e-3" mono />
                <FormSelect label={t.size} bind:value={DBState.db.openaiCompatImage.size} options={opt(['1024x1024', '1536x1024', '1024x1536', '512x512', '256x256'])} />
                <FormSelect label={t.quality} bind:value={DBState.db.openaiCompatImage.quality} options={opt([['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])} />
            </FormGroup>
        {/if}
    {/if}
</div>

<Sheet open={picking} label={language.provider} onclose={() => { picking = false }}>
    <div class="flex shrink-0 items-center gap-2 px-1">
        <span class="flex-1 text-[18px] font-bold">{language.provider}</span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={language.mobileBot.close} onclick={() => { picking = false }}><XIcon size={16} /></button>
    </div>
    <div class="shrink-0">{@render tiles()}</div>
</Sheet>
