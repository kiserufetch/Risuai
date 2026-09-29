<script lang="ts">
    import { PlusIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormNav from 'src/lib/MobileChat/Form/FormNav.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { chatFormatSettingsItems } from 'src/ts/setting/chatFormatSettingsData'
    import MobileSettingsList from '../MobileSettingsList.svelte'
    import BotOoba from './BotOoba.svelte'
    import { getModelInfo, LLMFormat } from 'src/ts/model/modellist'
    import { resolveClaudeThinkingType } from 'src/ts/model/types'
    import { allBasicParameterItems } from 'src/ts/setting/botSettingsParamsData'
    import type { SettingContext, SettingItem } from 'src/ts/setting/types'
    import { checkCondition } from 'src/ts/setting/utils'
    import { DBState } from 'src/ts/stores.svelte'
    import MobileSettingItem from '../MobileSettingItem.svelte'
    import { botPage } from './botPage.svelte'

    // Mockup "Параметры": the context budget, reasoning and sampling from the shared
    // parameter data, then the provider-specific samplers of BotSettings.svelte.

    const t = $derived(language.mobileBot)

    let modelInfo = $derived(getModelInfo(DBState.db.aiModel))
    let ctx: SettingContext = $derived({ db: DBState.db, modelInfo, subModelInfo: getModelInfo(DBState.db.subModel) })

    $effect(() => {
        const resolved = resolveClaudeThinkingType(modelInfo.flags, DBState.db.thinkingType)
        if (resolved !== DBState.db.thinkingType) DBState.db.thinkingType = resolved
    })

    const byId = (ids: string[]) => ids.map((id) => allBasicParameterItems.find((item) => item.id === id)).filter((item): item is SettingItem => !!item)
    const REASONING = byId(['params.thinkingType', 'params.deepseekThinkingType', 'params.thinkingTokens', 'params.adaptiveThinkingEffort', 'params.deepseekReasoningEffort', 'params.reasoningEffort', 'params.verbosity'])
    const SAMPLING = byId(['params.temperature', 'params.topP', 'params.topK', 'params.minP', 'params.topA', 'params.repetitionPenalty', 'params.frequencyPenalty', 'params.presencePenalty'])
    const OTHER = byId(['params.seed'])

    let responseShare = $derived(Math.min(100, Math.max(0, (DBState.db.maxResponse / Math.max(1, DBState.db.maxContext)) * 100)))

    let localFormat = $derived(DBState.db.aiModel === 'textgen_webui' || DBState.db.aiModel === 'mancer' || DBState.db.aiModel.startsWith('local_') || DBState.db.aiModel.startsWith('hf:::'))

    type Slider = { label: string; obj: () => Record<string, number>; key: string; min: number; max: number; step: number; fixed: number }
    const s = (label: string, obj: () => Record<string, number>, key: string, min: number, max: number, step: number, fixed = 2): Slider => ({ label, obj, key, min, max, step, fixed })
    const ooba = () => DBState.db.ooba as unknown as Record<string, number>
    const nai = () => DBState.db.NAIsettings as unknown as Record<string, number>
    const ain = () => DBState.db.ainconfig as unknown as Record<string, number>
    const OOBA: Slider[] = [
        s('Repetition Penalty', ooba, 'repetition_penalty', 1, 1.5, 0.01), s('Length Penalty', ooba, 'length_penalty', -5, 5, 0.05),
        s('Top K', ooba, 'top_k', 0, 100, 1, 0), s('Top P', ooba, 'top_p', 0, 1, 0.01), s('Typical P', ooba, 'typical_p', 0, 1, 0.01),
        s('Top A', ooba, 'top_a', 0, 1, 0.01), s('No Repeat n-gram Size', ooba, 'no_repeat_ngram_size', 0, 20, 1, 0),
    ]
    const NAI: Slider[] = [
        s('Top P', nai, 'topP', 0, 1, 0.01), s('Top K', nai, 'topK', 0, 100, 1, 0), s('Top A', nai, 'topA', 0, 1, 0.01),
        s('Tailfree Sampling', nai, 'tailFreeSampling', 0, 1, 0.001, 3), s('Typical P', nai, 'typicalp', 0, 1, 0.01),
        s('Repetition Penalty', nai, 'repetitionPenalty', 0, 3, 0.01), s('Repetition Penalty Range', nai, 'repetitionPenaltyRange', 0, 8192, 1, 0),
        s('Repetition Penalty Slope', nai, 'repetitionPenaltySlope', 0, 10, 0.01), s('Frequency Penalty', nai, 'frequencyPenalty', -2, 2, 0.01),
        s('Presence Penalty', nai, 'presencePenalty', -2, 2, 0.01), s('Mirostat LR', nai, 'mirostat_lr', 0, 1, 0.01),
        s('Mirostat Tau', nai, 'mirostat_tau', 0, 6, 0.01), s('Cfg Scale', nai, 'cfg_scale', 1, 3, 0.01),
    ]
    const NOVELLIST: Slider[] = [
        s('Top P', ain, 'top_p', 0, 2, 0.01), s('Repetition Penalty', ain, 'rep_pen', 0, 2, 0.01), s('Repetition Penalty Range', ain, 'rep_pen_range', 0, 2048, 1, 0),
        s('Repetition Penalty Slope', ain, 'rep_pen_slope', 0, 10, 0.1), s('Top K', ain, 'top_k', 1, 500, 1, 0), s('Top A', ain, 'top_a', 0, 1, 0.01),
        s('Typical P', ain, 'typical_p', 0, 1, 0.01),
    ]
    let providerSliders = $derived(localFormat ? OOBA : modelInfo.format === LLMFormat.NovelAI ? NAI : modelInfo.format === LLMFormat.NovelList ? NOVELLIST : [])

    function routingSummary(p: { order: string[]; only: string[]; ignore: string[] }): string {
        const parts = [[t.orOrder, p.order], [t.orOnly, p.only], [t.orIgnore, p.ignore]]
            .map(([label, list]) => [label, (list as string[]).filter(Boolean).length] as const)
            .filter(([, n]) => n > 0)
            .map(([label, n]) => `${(label as string).toLowerCase()} ${n}`)
        return parts.join(' · ') || t.orAuto
    }

    function toggleStopStrings(on: boolean) {
        DBState.db.localStopStrings = on ? [] : null
    }
</script>

{#snippet dataGroup(label: string, items: SettingItem[])}
    {@const shown = items.filter((item) => checkCondition(item, ctx))}
    {#if shown.length > 0}
        <FormGroup {label}>
            {#each shown as item (item.id)}<MobileSettingItem {item} {ctx} />{/each}
        </FormGroup>
    {/if}
{/snippet}

<div class="flex flex-col gap-4">
    <FormGroup>
        <div class="flex flex-col gap-2 px-4 py-3.5">
            <span class="text-[13px] text-(--mc-text2)">{t.contextBudget}</span>
            <span class="flex h-2.5 overflow-hidden rounded-full" style="background: var(--mc-line);" aria-hidden="true">
                <span style="width: {100 - responseShare}%; background: var(--mc-accent);"></span>
                <span style="width: {responseShare}%; background: #22c55e;"></span>
            </span>
            <span class="flex flex-wrap gap-x-3.5 gap-y-1 text-[12px]">
                <span><span style="color: var(--mc-accent);">●</span> {t.budgetPrompt} {Math.max(0, DBState.db.maxContext - DBState.db.maxResponse).toLocaleString()}</span>
                <span><span style="color: #22c55e;">●</span> {t.budgetResponse} {DBState.db.maxResponse.toLocaleString()}</span>
            </span>
        </div>
        <FormStepper label={language.maxContextSize} hint={t.tokens} bind:value={DBState.db.maxContext} min={0} step={1000} />
        <FormStepper label={language.maxResponseSize} hint={t.tokens} bind:value={DBState.db.maxResponse} min={0} step={100} />
    </FormGroup>

    {@render dataGroup(t.reasoning, REASONING)}
    {@render dataGroup(t.sampling, SAMPLING)}
    {@render dataGroup('', OTHER)}

    {#if providerSliders.length > 0}
        <FormGroup label={t.providerParams}>
            {#if modelInfo.format === LLMFormat.NovelAI}
                <FormText label="Starter" bind:value={DBState.db.NAIsettings.starter} placeholder="⁂" />
                <FormText label="Separator" bind:value={DBState.db.NAIsettings.seperator} placeholder={'\\n'} />
            {/if}
            {#each providerSliders as p (p.label + p.key)}
                <FormSlider label={p.label} bind:value={() => p.obj()[p.key], (v) => { p.obj()[p.key] = v }} min={p.min} max={p.max} step={p.step} fixed={p.fixed} />
            {/each}
            {#if localFormat}
                <FormToggle label="Do Sample" bind:checked={DBState.db.ooba.do_sample} />
                <FormToggle label="Add BOS Token" bind:checked={DBState.db.ooba.add_bos_token} />
                <FormToggle label="Ban EOS Token" bind:checked={DBState.db.ooba.ban_eos_token} />
                <FormToggle label="Skip Special Tokens" bind:checked={DBState.db.ooba.skip_special_tokens} />
                <FormToggle label={language.useNamePrefix} bind:checked={DBState.db.ooba.formating.useName} />
            {/if}
        </FormGroup>
    {/if}

    {#if localFormat || DBState.db.aiModel === 'ooba'}
        <FormGroup>
            <FormToggle label={language.customStopWords} checked={!!DBState.db.localStopStrings} onchange={toggleStopStrings} />
        </FormGroup>
        {#if DBState.db.localStopStrings}
            <FormGroup label={language.customStopWords}>
                {#each DBState.db.localStopStrings as _, i (i)}
                    <div class="flex items-center pr-2">
                        <input bind:value={DBState.db.localStopStrings[i]} aria-label={language.customStopWords} class="min-h-[52px] min-w-0 flex-1 border-0 bg-transparent px-4 font-mono text-[15px] outline-none" style="color: var(--mc-text);" />
                        <button type="button" class="flex h-10 w-10 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={t.remove} onclick={() => { DBState.db.localStopStrings.splice(i, 1) }}><Trash2Icon size={18} /></button>
                    </div>
                {/each}
                <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={() => { DBState.db.localStopStrings.push('') }}><PlusIcon size={18} />{t.add}</button>
            </FormGroup>
        {/if}
    {/if}
    {#if localFormat}
        <MobileSettingsList items={chatFormatSettingsItems} />
    {/if}

    {#if (DBState.db.reverseProxyOobaMode && DBState.db.aiModel === 'reverse_proxy') || DBState.db.aiModel === 'ooba'}
        <BotOoba instructionMode={DBState.db.aiModel === 'ooba'} />
    {/if}
    {#if DBState.db.aiModel.startsWith('openrouter')}
        {@const routed = DBState.db.openrouterProvider}
        <FormGroup label="OpenRouter">
            <FormToggle label={t.orFallback} hint={t.orFallbackHint} bind:checked={DBState.db.openrouterFallback} />
            <FormToggle label={t.orMiddleOut} hint={t.orMiddleOutHint} bind:checked={DBState.db.openrouterMiddleOut} />
            <FormToggle label={t.orInstruct} hint={t.orInstructHint} bind:checked={DBState.db.useInstructPrompt} />
            <FormNav label={t.page_routing} value={routingSummary(routed)} onclick={() => { botPage.current = 'routing' }} />
        </FormGroup>
        {#if DBState.db.useInstructPrompt}
            <MobileSettingsList items={chatFormatSettingsItems} />
        {/if}
    {/if}

    <FormGroup>
        <FormNav label={t.page_separate} value={DBState.db.seperateParametersEnabled ? t.on : t.off} onclick={() => { botPage.current = 'separate' }} />
    </FormGroup>
</div>
