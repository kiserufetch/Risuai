<script lang="ts">
    import { CheckIcon, FileAudioIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getElevenTTSVoices, getNovelAIVoices, getVOICEVOXVoices, getWebSpeechTTSVoices, oaiVoices } from 'src/ts/process/tts'
    import { registerOnnxModel } from 'src/ts/process/transformers'
    import { saveImage, type character } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { selectSingleFile } from 'src/ts/util'
    import * as session from 'src/ts/chatCore/session.svelte'
    import Sheet from '../Sheet.svelte'
    import FormGroup from '../Form/FormGroup.svelte'
    import FormNav from '../Form/FormNav.svelte'
    import FormNumber from '../Form/FormNumber.svelte'
    import FormSelect, { type FormOption } from '../Form/FormSelect.svelte'
    import FormSlider from '../Form/FormSlider.svelte'
    import FormText from '../Form/FormText.svelte'
    import FormToggle from '../Form/FormToggle.svelte'

    // Voice page of the profile (mockups "Озвучка"), the TTS section of CharConfig
    // with the same per-provider fields and defaults.

    let char = $derived(session.getCharacter() as character)
    let pickerOpen = $state(false)

    const PROVIDERS: { value: string; label: string; hint?: () => string }[] = [
        { value: '', label: '', hint: undefined },
        { value: 'webspeech', label: 'Web Speech', hint: () => language.mobileVoice.webspeechHint },
        { value: 'elevenlab', label: 'ElevenLabs', hint: () => language.mobileVoice.elevenHint },
        { value: 'openai', label: 'OpenAI' },
        { value: 'novelai', label: 'NovelAI' },
        { value: 'VOICEVOX', label: 'VOICEVOX', hint: () => language.mobileVoice.ownServer },
        { value: 'huggingface', label: 'Huggingface' },
        { value: 'vits', label: 'VITS', hint: () => language.mobileVoice.localModel },
        { value: 'gptsovits', label: 'GPT-SoVITS', hint: () => language.mobileVoice.ownServer },
        { value: 'fishspeech', label: 'fish-speech' },
    ]
    const LANGS: FormOption[] = [
        ['auto', 'Multi-language Mixed'], ['auto_yue', 'Multi-language Mixed (Cantonese)'], ['en', 'English'], ['zh', 'Chinese-English Mixed'],
        ['ja', 'Japanese-English Mixed'], ['yue', 'Cantonese-English Mixed'], ['ko', 'Korean-English Mixed'], ['all_zh', 'Chinese'],
        ['all_ja', 'Japanese'], ['all_yue', 'Cantonese'], ['all_ko', 'Korean'],
    ].map(([value, label]) => ({ value, label }))
    const SPLITS: FormOption[] = [
        ['cut0', 'Cut 0 (No splitting)'], ['cut1', 'Cut 1 (Split every 4 sentences)'], ['cut2', 'Cut 2 (Split every 50 characters)'],
        ['cut3', 'Cut 3 (Split by Chinese periods)'], ['cut4', 'Cut 4 (Split by English periods)'], ['cut5', 'Cut 5 (Split by various punctuation marks)'],
    ].map(([value, label]) => ({ value, label }))

    function providerLabel(value: string | undefined) {
        return PROVIDERS.find((p) => p.value === (value ?? ''))?.label || language.mobileVoice.off
    }

    // CharConfig's lazy defaults for each provider's config object.
    $effect.pre(() => {
        if (!char) return
        if (char.ttsMode === 'novelai' && char.naittsConfig === undefined) {
            char.naittsConfig = { customvoice: false, voice: 'Aini', version: 'v2' }
        }
        if (char.ttsMode === 'gptsovits' && char.gptSoVitsConfig === undefined) {
            char.gptSoVitsConfig = {
                url: '', use_auto_path: false, ref_audio_path: '', use_long_audio: false, ref_audio_data: { fileName: '', assetId: '' },
                volume: 1.0, text_lang: 'auto', text: 'en', use_prompt: false, prompt_lang: 'en', top_p: 1, temperature: 0.7, speed: 1, top_k: 5, text_split_method: 'cut0',
            }
        }
        if (char.ttsMode === 'fishspeech' && char.fishSpeechConfig === undefined) {
            char.fishSpeechConfig = { model: { _id: '', title: '', description: '' }, chunk_length: 200, normalize: false }
        }
        if (char.ttsMode === 'openai' && char.oaiTTSConfig === undefined) {
            char.oaiTTSConfig = { enabled: false, format: 'mp3' }
        }
    })

    function pick(value: string) {
        pickerOpen = false
        if (char.ttsMode === value) return
        char.ttsMode = value
        char.ttsSpeech = ''
    }

    async function loadFishModels(): Promise<FormOption[]> {
        const res = await fetch('https://api.fish.audio/model?self=true', { headers: { Authorization: `Bearer ${DBState.db.fishSpeechKey}` } })
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        return [{ value: '', label: language.mobileVoice.notSelected }, ...items.map((item: { _id?: string; title?: string }) => ({ value: item._id || '', label: item.title || item._id || '' }))]
    }

    async function pickReferenceAudio() {
        const audio = await selectSingleFile(['wav', 'ogg', 'aac', 'mp3'])
        if (!audio) return
        char.gptSoVitsConfig.ref_audio_data = { fileName: audio.name, assetId: await saveImage(audio.data) }
    }

    async function pickVitsModel() {
        const model = await registerOnnxModel()
        if (model) char.vits = model
    }
</script>

{#if char}
    <div class="flex flex-col gap-4 pt-1">
        <FormGroup>
            <FormNav label={language.mobileVoice.provider} value={providerLabel(char.ttsMode)} onclick={() => { pickerOpen = true }} />
        </FormGroup>

        {#if char.ttsMode === 'webspeech'}
            <FormGroup label="Web Speech">
                {#if typeof speechSynthesis === 'undefined'}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.webspeechUnsupported}</span>
                {:else}
                    <FormSelect label={language.mobileVoice.voice} bind:value={char.ttsSpeech} options={[{ value: '', label: language.mobileVoice.auto }, ...getWebSpeechTTSVoices().map((v) => ({ value: v, label: v }))]} />
                {/if}
            </FormGroup>
            {#if char.ttsSpeech}
                <span class="px-2 text-[13px]" style="color: var(--mc-danger);">{language.mobileVoice.webspeechWarn}</span>
            {/if}
        {:else if char.ttsMode === 'elevenlab'}
            <span class="px-2 text-[13px] text-(--mc-text2)">{language.mobileVoice.elevenKey}</span>
            <FormGroup label="ElevenLabs">
                {#await getElevenTTSVoices()}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.loading}</span>
                {:then voices}
                    <FormSelect label={language.mobileVoice.voice} bind:value={char.ttsSpeech} options={[{ value: '', label: language.mobileVoice.unset }, ...voices.map((v) => ({ value: v.voice_id, label: v.name }))]} />
                {:catch}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.loadFailed}</span>
                {/await}
            </FormGroup>
        {:else if char.ttsMode === 'VOICEVOX'}
            <FormGroup label="VOICEVOX">
                {#await getVOICEVOXVoices()}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.loading}</span>
                {:then voices}
                    <FormSelect label={language.mobileVoice.speaker} bind:value={char.voicevoxConfig.speaker} options={voices.map((v) => ({ value: v.list, label: v.name }))} />
                    {#if char.voicevoxConfig.speaker}
                        <FormSelect label={language.mobileVoice.style} bind:value={char.ttsSpeech} options={JSON.parse(char.voicevoxConfig.speaker).map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }))} />
                    {/if}
                {:catch}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.loadFailed}</span>
                {/await}
                <FormNumber label={language.mobileVoice.speed} bind:value={char.voicevoxConfig.SPEED_SCALE} step={0.1} />
                <FormNumber label={language.mobileVoice.pitch} bind:value={char.voicevoxConfig.PITCH_SCALE} step={0.1} />
                <FormNumber label={language.mobileVoice.volume} bind:value={char.voicevoxConfig.VOLUME_SCALE} step={0.1} />
                <FormNumber label={language.mobileVoice.intonation} bind:value={char.voicevoxConfig.INTONATION_SCALE} step={0.1} />
            </FormGroup>
            <span class="px-2 text-[13px] text-(--mc-text2)">{language.mobileVoice.voicevoxHint}</span>
        {:else if char.ttsMode === 'novelai' && char.naittsConfig}
            <FormGroup label="NovelAI">
                <FormToggle label={language.mobileVoice.customSeed} bind:checked={char.naittsConfig.customvoice} />
                {#if char.naittsConfig.customvoice}
                    <FormText label={language.mobileVoice.voice} bind:value={char.naittsConfig.voice} />
                {:else}
                    {#await getNovelAIVoices() then groups}
                        <FormSelect label={language.mobileVoice.voice} bind:value={char.naittsConfig.voice} options={groups.flatMap((g) => g.voices.map((v) => ({ value: v, label: v, group: g.gender })))} />
                    {/await}
                {/if}
                <FormSelect label={language.mobileVoice.version} bind:value={char.naittsConfig.version} options={[{ value: 'v1', label: 'v1' }, { value: 'v2', label: 'v2' }]} />
            </FormGroup>
        {:else if char.ttsMode === 'openai' && char.oaiTTSConfig}
            <FormGroup label="OpenAI">
                {#if char.oaiTTSConfig.enabled}
                    <FormText label={language.mobileVoice.voice} bind:value={char.oaiTTSConfig.voice} placeholder={char.oaiVoice || 'alloy'} />
                {:else}
                    <FormSelect label={language.mobileVoice.voice} bind:value={char.oaiVoice} options={[{ value: '', label: language.mobileVoice.unset }, ...oaiVoices.map((v) => ({ value: v, label: v }))]} />
                {/if}
                <FormToggle label={language.mobileVoice.customEndpoint} hint={language.mobileVoice.customEndpointHint} bind:checked={char.oaiTTSConfig.enabled} />
                {#if char.oaiTTSConfig.enabled}
                    <FormText label={language.mobileVoice.baseUrl} bind:value={char.oaiTTSConfig.baseURL} placeholder="https://api.openai.com/v1" mono />
                    <FormText label={language.mobileVoice.apiKey} bind:value={char.oaiTTSConfig.apiKey} placeholder={language.mobileVoice.apiKeyHint} secret={DBState.db.hideApiKey} mono />
                    <FormText label={language.mobileVoice.model} bind:value={char.oaiTTSConfig.model} placeholder="tts-1" />
                    <FormSelect label={language.mobileVoice.format} bind:value={char.oaiTTSConfig.format} options={['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'].map((v) => ({ value: v, label: v }))} />
                {/if}
            </FormGroup>
        {:else if char.ttsMode === 'huggingface' && char.hfTTS}
            <FormGroup label="Huggingface">
                <FormText label={language.mobileVoice.model} bind:value={char.hfTTS.model} mono />
                <FormText label={language.mobileVoice.language} bind:value={char.hfTTS.language} placeholder="en" />
            </FormGroup>
        {:else if char.ttsMode === 'vits'}
            <FormGroup label="VITS">
                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onclick={pickVitsModel}>
                    <span class="flex-1 text-[15px]">{char.vits ? (char.vits.name ?? 'Unnamed VitsModel') : language.mobileVoice.noModel}</span>
                    <span class="text-[14px] font-semibold" style="color: var(--mc-accent);">{language.mobileVoice.selectModel}</span>
                </button>
            </FormGroup>
        {:else if char.ttsMode === 'gptsovits' && char.gptSoVitsConfig}
            {@const cfg = char.gptSoVitsConfig}
            <FormGroup label="GPT-SoVITS">
                <FormText label={language.mobileVoice.url} bind:value={cfg.url} mono />
                <FormSlider label={language.mobileVoice.volume} bind:value={cfg.volume} min={0} max={1} step={0.01} fixed={2} />
                <FormToggle label={language.mobileVoice.autoPath} bind:checked={cfg.use_auto_path} />
                {#if !cfg.use_auto_path}
                    <FormText label={language.mobileVoice.refPath} bind:value={cfg.ref_audio_path} mono />
                {/if}
                <FormToggle label={language.mobileVoice.longAudio} bind:checked={cfg.use_long_audio} />
                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onclick={pickReferenceAudio}>
                    <FileAudioIcon size={19} class="shrink-0 text-(--mc-text2)" />
                    <span class="flex-1 text-[15px]">{language.mobileVoice.refAudio}</span>
                    <span class="max-w-[45%] truncate text-right text-[13px]" style="color: var(--mc-accent);">{cfg.ref_audio_data?.assetId ? cfg.ref_audio_data.fileName : language.mobileVoice.chooseFile}</span>
                </button>
            </FormGroup>
            <FormGroup>
                <FormSelect label={language.mobileVoice.textLang} bind:value={cfg.text_lang} options={LANGS} />
                {#if !cfg.use_long_audio}
                    <FormToggle label={language.mobileVoice.usePrompt} bind:checked={cfg.use_prompt} />
                {/if}
                {#if cfg.use_prompt && !cfg.use_long_audio}
                    <FormText label={language.mobileVoice.prompt} bind:value={cfg.prompt} />
                {/if}
                <FormSelect label={language.mobileVoice.promptLang} bind:value={cfg.prompt_lang} options={LANGS} />
            </FormGroup>
            <FormGroup>
                <FormSlider label={language.mobileVoice.topP} bind:value={cfg.top_p} min={0} max={1} step={0.05} fixed={2} />
                <FormSlider label={language.mobileVoice.temperature} bind:value={cfg.temperature} min={0} max={1} step={0.05} fixed={2} />
                <FormSlider label={language.mobileVoice.speed} bind:value={cfg.speed} min={0.6} max={1.65} step={0.05} fixed={2} />
                <FormSlider label={language.mobileVoice.topK} bind:value={cfg.top_k} min={1} max={100} step={1} />
                <FormSelect label={language.mobileVoice.split} bind:value={cfg.text_split_method} options={SPLITS} />
            </FormGroup>
        {:else if char.ttsMode === 'fishspeech' && char.fishSpeechConfig}
            <FormGroup label="fish-speech">
                {#await loadFishModels()}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.loading}</span>
                {:then models}
                    <FormSelect label={language.mobileVoice.model} bind:value={char.fishSpeechConfig.model._id} options={models} />
                {:catch}
                    <span class="block px-4 py-3 text-[14px] text-(--mc-text2)">{language.mobileVoice.loadFailed}</span>
                {/await}
                <FormNumber label={language.mobileVoice.chunkLength} bind:value={char.fishSpeechConfig.chunk_length} min={0} />
                <FormToggle label={language.mobileVoice.normalize} bind:checked={char.fishSpeechConfig.normalize} />
            </FormGroup>
        {/if}

        {#if char.ttsMode}
            <FormGroup>
                <FormToggle label={language.mobileVoice.quotedOnly} hint={language.mobileVoice.quotedOnlyHint} bind:checked={char.ttsReadOnlyQuoted} />
            </FormGroup>
        {/if}
    </div>

    {#if pickerOpen}
        <Sheet open={true} label={language.mobileVoice.providerTitle} onclose={() => { pickerOpen = false }}>
            <h2 class="px-1 text-[20px] font-bold">{language.mobileVoice.providerTitle}</h2>
            <div role="radiogroup" aria-label={language.mobileVoice.providerTitle} class="risu-mc-form-list overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each PROVIDERS as provider (provider.value)}
                    {@const on = (char.ttsMode ?? '') === provider.value}
                    <button type="button" role="radio" aria-checked={on} class="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left" onclick={() => pick(provider.value)}>
                        <span class="flex flex-1 flex-col gap-0.5"><span class="text-[15px]">{provider.label || language.mobileVoice.off}</span>{#if provider.hint}<span class="text-[12px] text-(--mc-text2)">{provider.hint()}</span>{/if}</span>
                        {#if on}<CheckIcon size={20} style="color: var(--mc-accent);" />{/if}
                    </button>
                {/each}
            </div>
        </Sheet>
    {/if}
{/if}

<style>
    .risu-mc-form-list > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
