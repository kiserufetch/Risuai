<script lang="ts">
    import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import type { PromptItem, PromptRole } from 'src/ts/process/prompt'
    import { DBState } from 'src/ts/stores.svelte'
    import { tokenizeAccurate } from 'src/ts/tokenizer'
    import { botPage } from './botPage.svelte'
    import { PROMPT_TYPES, promptItemName, promptTypeColor, promptTypeLabel } from './promptTypes'

    // Mockup "Блок промпта": one template block with the fields of PromptDataItem.svelte
    // for its type, plus moving and deleting.

    const t = $derived(language.mobileBot)

    let index = $derived(botPage.promptIndex)
    let item: PromptItem | undefined = $derived(DBState.db.promptTemplate?.[index])

    let types = $derived(PROMPT_TYPES.filter((type) => type !== 'cot' || DBState.db.promptSettings.customChainOfThought || item?.type === 'cot'))
    const ROLES = $derived([{ value: 'system', label: language.systemPrompt }, { value: 'user', label: language.user }, { value: 'bot', label: language.character }])
    const hasBlockRole = (p: PromptItem) => p.type === 'persona' || p.type === 'description' || p.type === 'authornote' || p.type === 'memory'

    // Same reset as PromptDataItem's type select: fields of the new type get defaults.
    function setType(type: string) {
        const list = DBState.db.promptTemplate
        const current = list[index]
        const next = { ...current, type } as Record<string, unknown>
        if (type === 'plain' || type === 'jailbreak' || type === 'cot') {
            next.text = ''
            next.role = 'system'
            next.type2 ??= 'normal'
        }
        if (type === 'cache') {
            next.depth = 1
            next.role = 'all'
        }
        if (type === 'chat') {
            next.rangeStart = -1000
            next.rangeEnd = 'end'
        }
        if (['persona', 'description', 'authornote', 'memory'].includes(type) && !['user', 'bot', 'system'].includes(next.role2 as string)) {
            next.role2 = 'system'
        }
        list[index] = next as unknown as PromptItem
    }

    let tokens = $state(0)
    $effect(() => {
        const text = item && 'text' in item ? item.text : ''
        tokenizeAccurate(text ?? '', true).then((n) => { tokens = n })
    })

    function move(delta: number) {
        const list = DBState.db.promptTemplate
        const j = index + delta
        if (j < 0 || j >= list.length) return
        ;[list[index], list[j]] = [list[j], list[index]]
        botPage.promptIndex = j
    }

    async function remove() {
        if (!item || !(await alertConfirm(`${language.removeConfirm}${promptItemName(item)}`))) return
        DBState.db.promptTemplate.splice(index, 1)
        botPage.current = 'prompt'
    }
</script>

{#if item}
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.type}</span>
            <div role="radiogroup" aria-label={language.type} class="flex flex-wrap gap-1.5">
                {#each types as type (type)}
                    {@const on = item.type === type}
                    <button type="button" role="radio" aria-checked={on} class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold" style={on ? 'background: var(--mc-accent-soft); border-color: var(--mc-accent); color: var(--mc-text);' : 'background: var(--mc-line); border-color: transparent; color: var(--mc-text2);'} onclick={() => { if (!on) setType(type) }}>
                        <span class="h-2 w-2 rounded-full" style="background: {promptTypeColor(type)};"></span>{promptTypeLabel(type)}
                    </button>
                {/each}
            </div>
        </div>

        <FormGroup>
            <FormText label={language.name} bind:value={() => item.name ?? '', (v) => { item.name = v }} placeholder={promptTypeLabel(item.type)} />
            {#if item.type === 'plain' || item.type === 'jailbreak' || item.type === 'cot'}
                <FormSegmented label={language.role} bind:value={item.role} options={ROLES} />
                <FormSegmented label={language.specialType} bind:value={item.type2} options={[{ value: 'normal', label: t.typeNormal }, { value: 'main', label: language.mainPrompt }, { value: 'globalNote', label: language.globalNote }]} />
            {:else if item.type === 'cache'}
                <FormStepper label={language.depth} bind:value={item.depth} min={0} />
                <FormSegmented label={language.role} bind:value={item.role} options={[{ value: 'all', label: language.all }, { value: 'user', label: language.user }, { value: 'assistant', label: language.character }, { value: 'system', label: language.systemPrompt }]} />
            {:else if item.type === 'chat'}
                <FormToggle label={language.advanced} hint={t.chatAdvancedHint} checked={item.rangeStart !== -1000} onchange={(on) => { if (item.type === 'chat') { item.rangeStart = on ? 0 : -1000; item.rangeEnd = 'end' } }} />
                {#if item.rangeStart !== -1000}
                    <FormStepper label={language.rangeStart} bind:value={item.rangeStart} />
                    <FormToggle label={language.untilChatEnd} checked={item.rangeEnd === 'end'} onchange={(on) => { if (item.type === 'chat') item.rangeEnd = on ? 'end' : 0 }} />
                    {#if item.rangeEnd !== 'end'}
                        <FormStepper label={language.rangeEnd} bind:value={() => Number(item.type === 'chat' ? item.rangeEnd : 0), (v) => { if (item.type === 'chat') item.rangeEnd = v }} />
                    {/if}
                    {#if DBState.db.promptSettings.sendChatAsSystem}
                        <FormToggle label={language.chatAsOriginalOnSystem} checked={!!item.chatAsOriginalOnSystem} onchange={(on) => { if (item.type === 'chat') item.chatAsOriginalOnSystem = on }} />
                    {/if}
                {/if}
            {:else if hasBlockRole(item)}
                <FormSegmented label={language.role} value={'role2' in item ? item.role2 ?? 'system' : 'system'} options={ROLES} onchange={(v) => { if (hasBlockRole(item)) (item as { role2?: PromptRole }).role2 = v as PromptRole }} />
                {#if item.type === 'authornote'}
                    <FormText label={language.defaultPrompt} bind:value={() => item.type === 'authornote' ? item.defaultText ?? '' : '', (v) => { if (item.type === 'authornote') item.defaultText = v }} />
                {/if}
                <FormToggle label={language.customInnerFormat} checked={!!('innerFormat' in item && item.innerFormat)} onchange={(on) => { if (hasBlockRole(item)) (item as { innerFormat?: string | null }).innerFormat = on ? '{{slot}}' : null }} />
            {/if}
        </FormGroup>

        {#if item.type === 'plain' || item.type === 'jailbreak' || item.type === 'cot' || item.type === 'chatML'}
            <CodeField label="{language.prompt} · {t.tokensCount.replace('{}', String(tokens))}" bind:value={item.text} minRows={10} wrap />
        {:else if hasBlockRole(item) && 'innerFormat' in item && item.innerFormat}
            <CodeField label={language.innerFormat} bind:value={() => ('innerFormat' in item ? item.innerFormat ?? '' : ''), (v) => { (item as { innerFormat?: string }).innerFormat = v }} minRows={4} wrap />
        {/if}

        <div class="grid grid-cols-3 gap-2">
            <button type="button" class="flex h-11 items-center justify-center gap-1 rounded-xl text-[14px] font-semibold disabled:opacity-40" style="background: var(--mc-line);" disabled={index === 0} onclick={() => move(-1)}><ArrowUpIcon size={16} />{t.moveUp}</button>
            <button type="button" class="flex h-11 items-center justify-center gap-1 rounded-xl text-[14px] font-semibold disabled:opacity-40" style="background: var(--mc-line);" disabled={index === DBState.db.promptTemplate.length - 1} onclick={() => move(1)}><ArrowDownIcon size={16} />{t.moveDown}</button>
            <button type="button" class="flex h-11 items-center justify-center gap-1 rounded-xl text-[14px] font-semibold" style="background: color-mix(in oklab, var(--mc-danger) 14%, transparent); color: var(--mc-danger);" onclick={remove}><Trash2Icon size={16} />{t.remove}</button>
        </div>
    </div>
{/if}
