<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormNumber from 'src/lib/MobileChat/Form/FormNumber.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import { chatFormatSettingsItems } from 'src/ts/setting/chatFormatSettingsData'
    import MobileSettingsList from '../MobileSettingsList.svelte'
    import ModelGridPicker from './ModelGridPicker.svelte'
    import NanoAccount from './NanoAccount.svelte'
    import NanoProviders from './NanoProviders.svelte'
    import type { ModelGridPinnedItem } from 'src/ts/model/modelGrid'
    import { getModelInfo, LLMFlags, LLMFormat, LLMProvider } from 'src/ts/model/modellist'
    import { getNanoGPTModels, getNanoGPTSubscriptionModels, toModelGridItem as ngToGridItem } from 'src/ts/model/nanogpt'
    import { getOllamaModels } from 'src/ts/model/ollama'
    import { getOpenRouterModels, toModelGridItem as orToGridItem } from 'src/ts/model/openrouter'
    import { isTauri } from 'src/ts/platform'
    import { customProviderStore } from 'src/ts/plugins/plugins.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { tokenizerList } from 'src/ts/tokenizer'
    import KeyInput from './KeyInput.svelte'
    import ModelRow from './ModelRow.svelte'
    import { keyFields } from './keys'

    // Mockup "Модель и ключи": both model slots, the credentials they need, response
    // options, then provider-specific connection fields (as in the Model tab of
    // BotSettings.svelte; provider catalogs open in ModelGridPicker sheets).

    const t = $derived(language.mobileBot)

    const openrouterPinned: ModelGridPinnedItem[] = [
        { id: 'risu/free', displayName: 'Free Auto', providerName: 'Risu' },
        { id: 'openrouter/auto', displayName: 'OpenRouter Auto', providerName: 'OpenRouter' },
    ]

    let main = $derived(getModelInfo(DBState.db.aiModel))
    let sub = $derived(getModelInfo(DBState.db.subModel))
    let uses = (id: string) => DBState.db.aiModel === id || DBState.db.subModel === id
    let usesPrefix = (prefix: string) => DBState.db.aiModel.startsWith(prefix) || DBState.db.subModel.startsWith(prefix)
    let usesProvider = (p: number) => main.provider === p || sub.provider === p
    let hasFlag = (f: number) => main.flags.includes(f as never) || sub.flags.includes(f as never)

    let keys = $derived(keyFields())
    let ollamaLocal = $derived(uses('ollama-hosted'))
    let ollamaCloud = $derived(uses('ollama-cloud'))

    // Same watchers as BotSettings.svelte: textgen streaming follows the stream URL,
    // NanoGPT choices reset when the mode, model or key changes.
    $effect.pre(() => {
        if (DBState.db.aiModel === 'textgen_webui' || DBState.db.subModel === 'mancer') {
            DBState.db.useStreaming = DBState.db.textgenWebUIStreamURL.startsWith('wss://')
        }
    })
    let nanogptMode = $state<'list' | 'manual'>(DBState.db.nanogptRequestModel && !DBState.db.nanogptRequestModelName ? 'manual' : 'list')
    function setNanogptMode(next: string | number) {
        nanogptMode = next as 'list' | 'manual'
        DBState.db.nanogptRequestModel = ''
        DBState.db.nanogptRequestModelName = ''
    }
    function setNanogptSubscription(on: boolean) {
        DBState.db.nanogptUseSubscriptionEndpoint = on
        DBState.db.nanogptRequestModel = ''
        DBState.db.nanogptRequestModelName = ''
        DBState.db.nanogptProvider = ''
    }
    let nanogptKeySeen = false
    $effect(() => {
        const key = DBState.db.nanogptKey
        if (!nanogptKeySeen) {
            nanogptKeySeen = true
            return
        }
        if (!key) {
            DBState.db.nanogptUseSubscriptionEndpoint = false
            DBState.db.nanogptSubscriptionState = ''
            DBState.db.nanogptRequestModel = ''
            DBState.db.nanogptRequestModelName = ''
            DBState.db.nanogptProvider = ''
        }
    })

    const FORMATS = [
        { value: LLMFormat.OpenAICompatible, label: 'OpenAI Compatible' }, { value: LLMFormat.OpenAIResponseAPI, label: 'OpenAI Response API' },
        { value: LLMFormat.Anthropic, label: 'Anthropic Claude' }, { value: LLMFormat.Mistral, label: 'Mistral' },
        { value: LLMFormat.GoogleCloud, label: 'Google Cloud' }, { value: LLMFormat.Cohere, label: 'Cohere' },
    ]
    const OLLAMA_FORMATS = [
        { value: LLMFormat.Ollama, label: 'Ollama SDK' }, { value: LLMFormat.OpenAICompatible, label: 'OpenAI Compatible' },
        { value: LLMFormat.OpenAIResponseAPI, label: 'OpenAI Response API' }, { value: LLMFormat.Anthropic, label: 'Anthropic Claude' },
    ]
    const OLLAMA_THINKING = ['auto', 'off', 'on', 'low', 'medium', 'high'].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))
    const REGIONS = ['global', 'us-central1', 'us-west1'].map((v) => ({ value: v, label: v }))

    let showStreaming = $derived(!ollamaCloud && hasFlag(LLMFlags.hasStreaming))
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <ModelRow label={t.mainModel} bind:value={DBState.db.aiModel} />
        {#if uses('openrouter')}
            {#await getOpenRouterModels()}
                <ModelGridPicker label={t.openrouterModel} bind:value={DBState.db.openrouterRequestModel} pinnedItems={openrouterPinned} loading />
            {:then models}
                <ModelGridPicker label={t.openrouterModel} bind:value={DBState.db.openrouterRequestModel} items={(models ?? []).map(orToGridItem)} pinnedItems={openrouterPinned} />
            {/await}
        {/if}
        <ModelRow label={t.subModel} hint={t.subModelHint} bind:value={DBState.db.subModel} />
    </FormGroup>

    {#if keys.length > 0}
        <FormGroup label={t.apiKeys}>
            {#each keys as field (field.id)}<KeyInput {field} />{/each}
        </FormGroup>
    {/if}

    {#if showStreaming || uses('reverse_proxy') || usesProvider(LLMProvider.NovelAI)}
        <FormGroup label={t.response}>
            {#if showStreaming}
                <FormToggle label={t.streaming} hint={t.streamingHint} bind:checked={DBState.db.useStreaming} />
                {#if DBState.db.useStreaming && hasFlag(LLMFlags.geminiThinking)}
                    <FormToggle label={t.streamThoughts} bind:checked={DBState.db.streamGeminiThoughts} />
                {/if}
            {/if}
            {#if uses('reverse_proxy')}
                <FormToggle label={language.reverseProxyOobaMode} bind:checked={DBState.db.reverseProxyOobaMode} />
            {/if}
            {#if usesProvider(LLMProvider.NovelAI)}
                <FormToggle label={language.textAdventureNAI} bind:checked={DBState.db.NAIadventure} />
                <FormToggle label={language.appendNameNAI} bind:checked={DBState.db.NAIappendName} />
            {/if}
        </FormGroup>
    {/if}

    {#if usesProvider(LLMProvider.VertexAI)}
        <FormGroup label="Vertex AI">
            <FormSelect label={t.region} bind:value={DBState.db.vertexRegion} options={REGIONS} onchange={() => { DBState.db.vertexAccessToken = ''; DBState.db.vertexAccessTokenExpires = 0 }} />
        </FormGroup>
    {/if}

    {#if uses('reverse_proxy')}
        <FormGroup label={t.proxy}>
            <FormText label="URL" bind:value={DBState.db.forceReplaceUrl} placeholder="https://…" mono />
            <FormText label={language.proxyRequestModel} bind:value={DBState.db.customProxyRequestModel} placeholder="Name" />
            <FormSelect label={language.format} bind:value={DBState.db.customAPIFormat} options={FORMATS} />
        </FormGroup>
    {/if}

    {#if DBState.db.aiModel === 'openrouter' || DBState.db.aiModel === 'reverse_proxy'}
        <FormGroup>
            <FormSelect label={language.tokenizer} bind:value={DBState.db.customTokenizer} options={tokenizerList.map(([value, label]) => ({ value, label }))} />
        </FormGroup>
    {/if}

    {#if ollamaLocal || ollamaCloud}
        <FormGroup label="Ollama">
            {#if ollamaLocal}
                <FormText label="Ollama URL" bind:value={DBState.db.ollamaURL} mono />
                <FormText label={t.modelName} bind:value={DBState.db.ollamaModel} placeholder="Model" oninput={() => { DBState.db.ollamaModelSource = 'local'; DBState.db.ollamaModelName = '' }} />
            {/if}
            {#if ollamaCloud}
                <FormSegmented label={t.cloudModel} bind:value={DBState.db.ollamaInputMode} options={[{ value: 'list', label: t.fromList }, { value: 'manual', label: t.manual }]} />
                {#if DBState.db.ollamaInputMode === 'manual'}
                    <FormText label={t.modelName} bind:value={DBState.db.ollamaCloudModel} placeholder="Model" oninput={() => { DBState.db.ollamaCloudModelName = '' }} />
                {:else}
                    {#await getOllamaModels(DBState.db.ollamaURL, 'cloud', DBState.db.ollamaApiKey)}
                        <ModelGridPicker label={t.cloudModel} bind:value={DBState.db.ollamaCloudModel} loading />
                    {:then cloudModels}
                        <ModelGridPicker
                            label={t.cloudModel}
                            bind:value={DBState.db.ollamaCloudModel}
                            items={cloudModels ?? []}
                            selectedLabelOverride={DBState.db.ollamaCloudModelName || DBState.db.ollamaCloudModel || undefined}
                            onselect={(_id, name) => { DBState.db.ollamaModelSource = 'cloud'; DBState.db.ollamaCloudModelName = name }}
                        />
                    {/await}
                {/if}
                <FormSelect label={language.format} bind:value={DBState.db.ollamaRequestFormat} options={OLLAMA_FORMATS} />
                <FormToggle label={t.streaming} bind:checked={DBState.db.useStreaming} />
            {/if}
            {#if ollamaLocal || (ollamaCloud && DBState.db.ollamaRequestFormat === LLMFormat.Ollama)}
                <FormSelect label={t.thinking} bind:value={DBState.db.ollamaThinkingMode} options={OLLAMA_THINKING} />
            {/if}
        </FormGroup>
    {/if}

    {#if uses('nanogpt')}
        <NanoAccount apiKey={DBState.db.nanogptKey} />
        <FormGroup label="NanoGPT">
            {#if DBState.db.nanogptSubscriptionState === 'active' || DBState.db.nanogptSubscriptionState === 'grace'}
                <FormToggle label={language.nanoGPTUseSubscriptionEndpoint} hint={t.subscriptionHint} checked={DBState.db.nanogptUseSubscriptionEndpoint} onchange={setNanogptSubscription} />
            {/if}
            <FormSegmented label={language.model} value={nanogptMode} options={[{ value: 'list', label: t.fromList }, { value: 'manual', label: t.manual }]} onchange={setNanogptMode} />
            {#if nanogptMode === 'manual'}
                <FormText label={t.modelName} bind:value={DBState.db.nanogptRequestModel} oninput={() => { DBState.db.nanogptRequestModelName = ''; DBState.db.nanogptProvider = '' }} />
            {:else}
                {#await Promise.all([getNanoGPTModels(), getNanoGPTSubscriptionModels(DBState.db.nanogptKey)])}
                    <ModelGridPicker label={t.nanogptModel} bind:value={DBState.db.nanogptRequestModel} loading />
                {:then [regular, subscription]}
                    <ModelGridPicker
                        label={t.nanogptModel}
                        bind:value={DBState.db.nanogptRequestModel}
                        items={DBState.db.nanogptUseSubscriptionEndpoint ? (subscription ?? []).map(ngToGridItem) : (regular ?? []).map(ngToGridItem)}
                        showSubBadge={DBState.db.nanogptUseSubscriptionEndpoint}
                        selectedLabelOverride={DBState.db.nanogptRequestModelName || DBState.db.nanogptRequestModel || undefined}
                        onselect={(_id, name) => { DBState.db.nanogptRequestModelName = name; DBState.db.nanogptProvider = '' }}
                    />
                {/await}
            {/if}
        </FormGroup>
        {#if !DBState.db.nanogptUseSubscriptionEndpoint}
            <NanoProviders apiKey={DBState.db.nanogptKey} modelId={DBState.db.nanogptRequestModel} bind:value={DBState.db.nanogptProvider} />
        {/if}
    {/if}

    {#if uses('custom')}
        <FormGroup>
            <FormSelect label={language.plugin} bind:value={DBState.db.currentPluginProvider} options={[{ value: '', label: 'None' }, ...$customProviderStore.map((p) => ({ value: p, label: p }))]} />
        </FormGroup>
    {/if}

    {#if uses('kobold')}
        <FormGroup><FormText label="Kobold URL" bind:value={DBState.db.koboldURL} mono /></FormGroup>
    {/if}

    {#if uses('echo_model')}
        <CodeField label="Echo Message" bind:value={DBState.db.echoMessage} minRows={4} wrap />
        <FormGroup><FormNumber label="Echo Delay (s)" bind:value={DBState.db.echoDelay} min={0} /></FormGroup>
    {/if}

    {#if uses('textgen_webui') || uses('mancer')}
        <FormGroup label="Text Generation WebUI">
            <FormText label="Blocking {language.providerURL}" bind:value={DBState.db.textgenWebUIBlockingURL} placeholder="https://…" mono />
            <FormText label="Stream {language.providerURL}" bind:value={DBState.db.textgenWebUIStreamURL} placeholder="wss://…" mono />
        </FormGroup>
        <span class="px-2 text-[13px] leading-[18px]" style="color: var(--mc-danger);">
            You must use textgen webui with --public-api. {#if !isTauri}You are using the web version: use ngrok or another tunnel for a local webui. {/if}For Ooba over 1.7, choose "Ooba" as the model with a URL like http://127.0.0.1:5000/v1/chat/completions
        </span>
    {/if}

    {#if uses('ooba')}
        <FormGroup><FormText label="Ooba {language.providerURL}" bind:value={DBState.db.textgenWebUIBlockingURL} placeholder="https://…" mono /></FormGroup>
    {/if}

    {#if usesPrefix('horde') || DBState.db.aiModel === 'kobold'}
        <MobileSettingsList items={chatFormatSettingsItems} />
    {/if}
</div>
