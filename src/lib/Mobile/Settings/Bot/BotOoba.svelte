<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import type { OobaChatCompletionRequestParams } from 'src/ts/model/ooba'
    import { chatFormatSettingsItems } from 'src/ts/setting/chatFormatSettingsData'
    import { DBState } from 'src/ts/stores.svelte'
    import MobileSettingsList from '../MobileSettingsList.svelte'

    // Ooba request arguments (OobaSettings.svelte, mockup "Параметры · Ooba"): every field
    // is optional; the switch sends our value, off leaves the server default.

    let { instructionMode = false }: { instructionMode?: boolean } = $props()

    const t = $derived(language.mobileBot)
    type Args = Record<string, string | number | boolean | null | undefined>
    let args = $derived(DBState.db.reverseProxyOobaArgs as unknown as Args)

    type Field = [key: keyof OobaChatCompletionRequestParams, kind: 'text' | 'number' | 'bool', label?: string]
    let prefixes: Field[] = $derived.by(() => {
        const mode = DBState.db.reverseProxyOobaArgs.mode
        if (mode === 'instruct') return [['name1_instruct', 'text', 'user prefix'], ['name2_instruct', 'text', 'bot prefix'], ['context_instruct', 'text', 'system prefix'], ['system_message', 'text', 'system message']]
        const chat: Field[] = [['name1', 'text', 'user prefix'], ['name2', 'text', 'bot prefix'], ['context', 'text', 'system prefix'], ['greeting', 'text', 'start message']]
        return mode === 'chat-instruct' ? [...chat, ['chat_instruct_command', 'text']] : chat
    })
    const GROUPS: [string, Field[]][] = [
        ['oobaSampling', [['min_p', 'number'], ['top_k', 'number'], ['typical_p', 'number'], ['tfs', 'number'], ['top_a', 'number'], ['epsilon_cutoff', 'number'], ['eta_cutoff', 'number'], ['temperature_last', 'bool'], ['do_sample', 'bool']]],
        ['oobaPenalties', [['repetition_penalty', 'number'], ['repetition_penalty_range', 'number'], ['encoder_repetition_penalty', 'number'], ['no_repeat_ngram_size', 'number'], ['penalty_alpha', 'number'], ['guidance_scale', 'number'], ['negative_prompt', 'text']]],
        ['oobaMirostat', [['mirostat_mode', 'number'], ['mirostat_tau', 'number'], ['mirostat_eta', 'number']]],
        ['oobaLength', [['min_length', 'number'], ['num_beams', 'number'], ['length_penalty', 'number'], ['early_stopping', 'bool'], ['truncation_length', 'number'], ['max_tokens_second', 'number'], ['auto_max_new_tokens', 'bool']]],
        ['oobaOther', [['tokenizer', 'text'], ['custom_token_bans', 'text'], ['grammar_string', 'text'], ['ban_eos_token', 'bool'], ['add_bos_token', 'bool'], ['skip_special_tokens', 'bool']]],
    ]

    const isSet = (key: string) => args[key] !== null && args[key] !== undefined
    function toggle(key: string, kind: Field[1]) {
        args[key] = isSet(key) ? null : kind === 'number' ? 0 : kind === 'bool' ? false : ''
    }
</script>

{#snippet row([key, kind, label]: Field)}
    {@const on = isSet(key)}
    <div class="flex min-h-[52px] items-center gap-2.5 px-4 py-1.5">
        <span class="min-w-0 flex-1 truncate font-mono text-[14px]">{label ?? key}</span>
        {#if !on}
            <span class="shrink-0 text-[13px] text-(--mc-text2)">{t.byDefault}</span>
        {:else if kind === 'number'}
            <input type="number" inputmode="decimal" aria-label={label ?? key} value={args[key] as number} oninput={(e) => { args[key] = Number((e.currentTarget as HTMLInputElement).value) }} class="h-8 w-[88px] shrink-0 rounded-lg border-0 text-center text-[14px] font-semibold tabular-nums outline-none" style="background: var(--mc-surface); color: var(--mc-text);" />
        {:else if kind === 'bool'}
            <span class="flex shrink-0 overflow-hidden rounded-lg text-[13px] font-semibold" style="background: var(--mc-surface);">
                <button type="button" class="h-8 px-2.5" style={args[key] ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { args[key] = true }}>True</button>
                <button type="button" class="h-8 px-2.5" style={!args[key] ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { args[key] = false }}>False</button>
            </span>
        {:else}
            <input aria-label={label ?? key} value={args[key] as string} oninput={(e) => { args[key] = (e.currentTarget as HTMLInputElement).value }} autocomplete="off" autocapitalize="off" spellcheck="false" class="h-8 w-[45%] shrink-0 rounded-lg border-0 px-2.5 font-mono text-[13px] outline-none" style="background: var(--mc-surface); color: var(--mc-text);" />
        {/if}
        <button type="button" role="switch" aria-checked={on} aria-label={label ?? key} class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};" onclick={() => toggle(key, kind)}>
            <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {on ? '21px' : '3px'};"></span>
        </button>
    </div>
{/snippet}

<div class="flex flex-col gap-4">
    {#if instructionMode}
        <MobileSettingsList items={chatFormatSettingsItems} />
    {:else}
        <FormGroup label={t.oobaMode}>
            <FormSegmented label={t.oobaMode} bind:value={DBState.db.reverseProxyOobaArgs.mode} options={[{ value: 'instruct', label: 'Instruct' }, { value: 'chat', label: 'Chat' }, { value: 'chat-instruct', label: 'Chat-Instruct' }]} />
        </FormGroup>
        <FormGroup label={t.oobaPrefixes}>
            {#each prefixes as field (field[0])}{@render row(field)}{/each}
        </FormGroup>
    {/if}
    {#each GROUPS as [labelKey, fields] (labelKey)}
        <FormGroup label={t[labelKey as 'oobaSampling']}>
            {#each fields as field (field[0])}{@render row(field)}{/each}
        </FormGroup>
    {/each}
</div>
