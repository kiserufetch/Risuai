<script lang="ts">
    import { RotateCcwIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { ensureOverrides, getOverrides } from 'src/ts/chatCore/chatOverrides'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { getOpenRouterModels, toModelGridItem } from 'src/ts/model/openrouter'
    import { DBState } from 'src/ts/stores.svelte'
    import ModelGridPicker from '../Mobile/Settings/Bot/ModelGridPicker.svelte'
    import ModelRow from '../Mobile/Settings/Bot/ModelRow.svelte'
    import FormSegmented from './Form/FormSegmented.svelte'
    import FormToggle from './Form/FormToggle.svelte'
    import Sheet from './Sheet.svelte'

    // Mockup "Настройки этого чата": overrides for this dialog only. A field left alone
    // follows the preset; the preset value is marked on each slider.

    let { open, onclose }: { open: boolean; onclose: () => void } = $props()

    const t = $derived(language.mobileChat)
    let chat = $derived(session.getChat())
    let o = $derived(getOverrides(chat) ?? null)
    $effect(() => {
        if (open && chat) ensureOverrides(chat)
    })
    let openrouter = $derived(DBState.db.aiModel === 'openrouter')
    let presetModel = $derived(openrouter ? DBState.db.openrouterRequestModel : DBState.db.aiModel)

    type Field = 'maxResponse' | 'temperature' | 'topP'
    const SLIDERS: { key: Field; min: number; max: number; step: number; preset: () => number; show: (v: number) => string }[] = [
        { key: 'maxResponse', min: 120, max: 800, step: 10, preset: () => DBState.db.maxResponse, show: (v) => `${v} ${t.tokensShort}` },
        { key: 'temperature', min: 0, max: 200, step: 1, preset: () => DBState.db.temperature, show: (v) => (v / 100).toFixed(2) },
        { key: 'topP', min: 0, max: 1, step: 0.01, preset: () => DBState.db.top_p, show: (v) => v.toFixed(2) },
    ]
    const pct = (v: number, min: number, max: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))

    function reset() {
        if (!o) return
        delete o.maxResponse
        delete o.temperature
        delete o.topP
        delete o.reasoning
        delete o.model
    }
</script>

<Sheet {open} label={t.chatSettings} {onclose}>
    <div class="flex shrink-0 items-center gap-2 px-1">
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[18px] font-bold">{t.chatSettings}</span>
            <span class="truncate text-[12px] text-(--mc-text2)">{openrouter ? `OpenRouter · ${(o?.enabled && o.model) || presetModel}` : (o?.enabled && o.model) || presetModel}</span>
        </span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={language.mobileBot.close} onclick={onclose}><XIcon size={16} /></button>
    </div>

    {#if o}
        <div class="shrink-0 overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            <FormToggle label={t.ownSettings} hint={t.ownSettingsHint} bind:checked={o.enabled} />
        </div>

        <div class="risu-mc-gen flex shrink-0 flex-col overflow-hidden rounded-2xl transition-opacity" style="background: var(--mc-group); {o.enabled ? '' : 'opacity: 0.5; pointer-events: none;'}" aria-disabled={!o.enabled}>
            {#each SLIDERS as s (s.key)}
                {@const preset = s.preset()}
                {@const value = o[s.key] ?? preset}
                {@const label = s.key === 'maxResponse' ? t.answerLength : s.key === 'temperature' ? language.temperature : 'Top P'}
                <div class="flex flex-col gap-2.5 px-4 py-3">
                    <span class="flex items-baseline justify-between gap-2 text-[15px]"><span>{label}</span><span class="font-semibold tabular-nums">{preset === -1000 && o[s.key] === undefined ? t.off : s.show(value)}</span></span>
                    <span class="relative">
                        <input type="range" aria-label={label} min={s.min} max={s.max} step={s.step} value={Math.min(s.max, Math.max(s.min, value))} oninput={(e) => { if (o) o[s.key] = Number((e.currentTarget as HTMLInputElement).value) }} class="w-full" style="accent-color: var(--mc-accent);" />
                        {#if preset !== -1000 && preset >= s.min && preset <= s.max}
                            <span class="pointer-events-none absolute -top-0.5 h-3.5 w-0.5 rounded-full" style="left: calc({pct(preset, s.min, s.max)}% - 1px); background: var(--mc-text2); opacity: 0.6;"></span>
                        {/if}
                    </span>
                    <span class="flex justify-between text-[11px] text-(--mc-text2)">
                        <span>{o[s.key] === undefined ? t.asPreset : t.presetValue.replace('{}', preset === -1000 ? t.off : s.show(preset))}</span>
                        {#if s.key === 'maxResponse'}<span>{t.aboutWords.replace('{}', String(Math.round(value * 0.75)))}</span>{/if}
                    </span>
                </div>
            {/each}
        </div>

        <div class="risu-mc-gen flex shrink-0 flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group); {o.enabled ? '' : 'opacity: 0.5; pointer-events: none;'}">
            {#if openrouter}
                <FormSegmented label={t.reasoning} value={o.reasoning ?? ''} options={[{ value: '', label: t.preset }, { value: 'off', label: t.off }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} onchange={(v) => { if (o) o.reasoning = v ? (v as 'off' | 'low' | 'high') : undefined }} />
                {#await getOpenRouterModels() then list}
                    <div class="flex items-center">
                        <div class="min-w-0 flex-1">
                            <ModelGridPicker label={t.model} bind:value={() => o?.model ?? presetModel, (v) => { if (o) o.model = v === presetModel ? undefined : v }} items={(list ?? []).map(toModelGridItem)} />
                        </div>
                        {#if o.model}
                            <button type="button" class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={t.asPreset} onclick={() => { if (o) o.model = undefined }}><RotateCcwIcon size={17} /></button>
                        {/if}
                    </div>
                {/await}
            {:else}
                <ModelRow label={t.model} bind:value={() => o?.model ?? presetModel, (v) => { if (o) o.model = v && v !== presetModel ? v : undefined }} />
            {/if}
        </div>

        <button type="button" class="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-semibold disabled:opacity-40" style="background: var(--mc-line);" disabled={!o.enabled} onclick={reset}><RotateCcwIcon size={16} />{t.resetToPreset}</button>
    {/if}
</Sheet>

<style>
    .risu-mc-gen > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
