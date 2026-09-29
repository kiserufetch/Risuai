<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import { LLMFlags } from 'src/ts/model/types'
    import type { SeparateParameters } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { modelName } from './models'

    // Per-task parameters (mockup "Отдельные параметры"): task chips, the model the task
    // uses, then the fields of AllSeperateParameters.svelte and ClaudeThinkingSeparateParams.

    const t = $derived(language.mobileBot)
    type Task = 'memory' | 'emotion' | 'translate' | 'otherAx'
    const TASKS: [Task, 'longTermMemory' | 'emotionImage' | 'translator' | 'others'][] = [['memory', 'longTermMemory'], ['emotion', 'emotionImage'], ['translate', 'translator'], ['otherAx', 'others']]

    let task: Task = $state('memory')
    let value: SeparateParameters = $derived(DBState.db.seperateParameters[task])
    let model = $derived(DBState.db.seperateModelsForAxModels ? DBState.db.seperateModels[task] || DBState.db.subModel : DBState.db.subModel)
    let info = $derived(getModelInfo(model))
    let params = $derived(info.parameters)
    let hasReasoning = $derived(['reasoning_effort', 'reasoning_effort_min_medium', 'reasoning_effort_none', 'reasoning_effort_xhigh'].some((p) => params.includes(p as never)))
    let reasoningOptions = $derived([
        ...(!params.includes('reasoning_effort_min_medium' as never) ? [{ value: -1, label: params.includes('reasoning_effort_none' as never) ? 'None' : 'Minimal' }, { value: 0, label: 'Low' }] : []),
        { value: 1, label: 'Medium' }, { value: 2, label: 'High' },
        ...(params.includes('reasoning_effort_xhigh' as never) ? [{ value: 3, label: 'XHigh' }] : []),
    ])
    let effortOptions = $derived([
        { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
        ...(info.flags.includes(LLMFlags.claudeXHighEffort) ? [{ value: 'xhigh', label: 'XHigh' }] : []), { value: 'max', label: 'Max' },
    ])

    // Same clamps as AllSeperateParameters / ClaudeThinkingSeparateParams.
    $effect(() => {
        if (!params.includes('reasoning_effort_xhigh' as never) && value.reasoning_effort === 3) value.reasoning_effort = 2
        if (params.includes('reasoning_effort_min_medium' as never) && (value.reasoning_effort ?? 0) < 1) value.reasoning_effort = 1
        if (value.adaptive_thinking_effort === 'xhigh' && !info.flags.includes(LLMFlags.claudeXHighEffort)) value.adaptive_thinking_effort = 'high'
    })

    type S = [keyof SeparateParameters, string, number, number, number, number]
    let sliders: S[] = $derived([
        ...(params.includes('temperature' as never) ? [['temperature', language.temperature, 0, 200, 1, 2] as S] : []),
        ['top_p', 'Top P', 0, 1, 0.01, 2], ['top_k', 'Top K', 0, 100, 1, 0], ['min_p', 'Min P', 0, 1, 0.01, 2], ['top_a', 'Top A', 0, 1, 0.01, 2],
        ['repetition_penalty', 'Repetition Penalty', 0, 2, 0.01, 2], ['frequency_penalty', language.frequencyPenalty, 0, 200, 0.01, 2], ['presence_penalty', language.presensePenalty, 0, 200, 0.01, 2],
    ])
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormToggle label={language.seperateParametersEnabled} hint={t.separateHint} bind:checked={DBState.db.seperateParametersEnabled} />
    </FormGroup>
    {#if DBState.db.seperateParametersEnabled}
        <div role="tablist" aria-label={t.page_separate} class="-mx-4 flex gap-1.5 overflow-x-auto px-4">
            {#each TASKS as [key, labelKey] (key)}
                <button type="button" role="tab" aria-selected={task === key} class="h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold" style={task === key ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { task = key }}>{language[labelKey]}</button>
            {/each}
        </div>
        <div class="flex items-center gap-3 rounded-2xl px-4 py-2.5" style="background: var(--mc-group);">
            <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[12px] text-(--mc-text2)">{t.taskModel}</span><span class="truncate text-[15px] font-semibold">{modelName(model)}</span></span>
            <span class="shrink-0 text-[12px] text-(--mc-text2)">{DBState.db.seperateModelsForAxModels && DBState.db.seperateModels[task] ? t.fromAux : t.fromSub}</span>
        </div>
        {#key task}
            <FormGroup>
                {#each sliders as [key, label, min, max, step, fixed] (key)}
                    <FormSlider {label} bind:value={() => value[key] as number | undefined, (v) => { (value as Record<string, unknown>)[key] = v }} {min} {max} {step} {fixed} multiple={key === 'temperature' ? 0.01 : 1} disableable />
                {/each}
            </FormGroup>
            <FormGroup label={t.reasoning}>
                <FormSegmented label={language.thinkingType} bind:value={() => value.thinking_type ?? 'off', (v) => { value.thinking_type = v as SeparateParameters['thinking_type'] }} options={[{ value: 'off', label: 'Off' }, { value: 'budget', label: 'Budget' }, { value: 'adaptive', label: 'Adaptive' }]} />
                {#if value.thinking_type === 'budget'}
                    <FormSlider label={language.thinkingTokens} bind:value={() => value.thinking_tokens, (v) => { value.thinking_tokens = v }} min={0} max={64000} step={200} disableable />
                {:else if value.thinking_type === 'adaptive'}
                    <FormSegmented label={language.adaptiveThinkingEffort} bind:value={() => value.adaptive_thinking_effort ?? 'high', (v) => { value.adaptive_thinking_effort = v as SeparateParameters['adaptive_thinking_effort'] }} options={effortOptions} />
                {/if}
                {#if value.deepseek_thinking_type !== undefined}
                    <FormSegmented label="DeepSeek Thinking" bind:value={() => value.deepseek_thinking_type ?? 'off', (v) => { value.deepseek_thinking_type = v as 'off' | 'enabled' }} options={[{ value: 'off', label: 'Off' }, { value: 'enabled', label: 'Enabled' }]} />
                    {#if value.deepseek_thinking_type === 'enabled'}
                        <FormSegmented label="DeepSeek Reasoning Effort" bind:value={() => value.deepseek_reasoning_effort ?? 'high', (v) => { value.deepseek_reasoning_effort = v as 'high' | 'max' }} options={[{ value: 'high', label: 'High' }, { value: 'max', label: 'Max' }]} />
                    {/if}
                {/if}
                {#if hasReasoning}
                    <FormSegmented label="Reasoning Effort" bind:value={() => value.reasoning_effort ?? 1, (v) => { value.reasoning_effort = Number(v) }} options={reasoningOptions} />
                {/if}
                {#if params.includes('verbosity' as never)}
                    <FormSegmented label="Verbosity" bind:value={() => value.verbosity ?? 1, (v) => { value.verbosity = Number(v) }} options={[{ value: 0, label: 'Low' }, { value: 1, label: 'Medium' }, { value: 2, label: 'High' }]} />
                {/if}
            </FormGroup>
        {/key}
        <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{t.offNotSent}</span>
    {/if}
</div>
