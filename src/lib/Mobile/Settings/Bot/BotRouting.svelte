<script lang="ts">
    import { PlusIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormNav from 'src/lib/MobileChat/Form/FormNav.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { getOpenRouterModels, toModelGridItem } from 'src/ts/model/openrouter'
    import { DBState } from 'src/ts/stores.svelte'
    import ModelGridPicker from './ModelGridPicker.svelte'
    import { botPage } from './botPage.svelte'

    // Mockup "Маршрутизация и приватность": how OpenRouter picks a provider, privacy,
    // quantization, a price ceiling, its own model fallbacks and web search. The
    // order / only / ignore lists live one level down.

    const t = $derived(language.mobileBot)
    let x = $derived(DBState.db.openrouterExtras)
    const QUANTS = ['fp32', 'bf16', 'fp16', 'fp8', 'fp6', 'int8', 'fp4', 'int4']

    function toggleQuant(q: string) {
        x.quantizations = x.quantizations.includes(q) ? x.quantizations.filter((v) => v !== q) : [...x.quantizations, q]
    }

    function priceInput(key: 'maxPricePrompt' | 'maxPriceCompletion', raw: string) {
        const n = parseFloat(raw.replace(',', '.'))
        x[key] = raw.trim() === '' || !Number.isFinite(n) ? null : n
    }

    let listsSummary = $derived.by(() => {
        const p = DBState.db.openrouterProvider
        const parts = ([[t.orOrder, p?.order], [t.orOnly, p?.only], [t.orIgnore, p?.ignore]] as const)
            .map(([label, list]) => [label, (list ?? []).filter(Boolean).length] as const).filter(([, n]) => n > 0)
            .map(([label, n]) => `${label.toLowerCase()} ${n}`)
        return parts.join(' · ') || t.orAuto
    })
    let models = getOpenRouterModels()
</script>

{#if x}
    <div class="flex flex-col gap-4">
        <FormGroup label={t.providerChoice}>
            <FormSegmented label={t.sortBy} bind:value={x.sort} options={[{ value: '', label: t.modeAuto }, { value: 'price', label: t.sortPrice }, { value: 'throughput', label: t.sortSpeed }, { value: 'latency', label: t.sortLatency }]} />
            <FormToggle label={t.orFallback} hint={t.orFallbackHint} bind:checked={x.allowFallbacks} />
            <FormToggle label={t.requireParams} hint={t.requireParamsHint} bind:checked={x.requireParameters} />
            <FormNav label={t.page_routingLists} value={listsSummary} onclick={() => { botPage.current = 'routingLists' }} />
        </FormGroup>

        <FormGroup label={t.privacy}>
            <FormToggle label={t.denyData} hint={t.denyDataHint} bind:checked={x.denyDataCollection} />
            <FormToggle label={t.zdr} hint={t.zdrHint} bind:checked={x.zdr} />
        </FormGroup>

        <FormGroup label={t.quantization}>
            <div class="flex flex-wrap gap-1.5 px-4 py-3">
                {#each QUANTS as q (q)}
                    {@const on = x.quantizations.includes(q)}
                    <button type="button" aria-pressed={on} class="h-8 rounded-full px-3 text-[13px] font-semibold" style={on ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => toggleQuant(q)}>{q}</button>
                {/each}
            </div>
        </FormGroup>
        <span class="-mt-2 px-2 text-[12px] text-(--mc-text2)">{t.quantHint}</span>

        <FormGroup label={t.priceCeiling}>
            {#each [['maxPricePrompt', t.priceIn], ['maxPriceCompletion', t.priceOut]] as const as [key, label] (key)}
                <label class="flex min-h-[52px] items-center gap-3 px-4">
                    <span class="flex-1 text-[15px]">{label}</span>
                    <span class="text-[13px] text-(--mc-text2)">$</span>
                    <input type="text" inputmode="decimal" value={x[key] ?? ''} placeholder={t.noLimit} oninput={(e) => priceInput(key, (e.currentTarget as HTMLInputElement).value)} class="h-9 w-24 rounded-lg border-0 text-center text-[15px] tabular-nums outline-none" style="background: var(--mc-surface); color: var(--mc-text);" />
                    <span class="text-[12px] text-(--mc-text2)">/1M</span>
                </label>
            {/each}
        </FormGroup>

        <FormGroup label={t.fallbackModels}>
            {#await models then list}
                {#each x.fallbackModels as _, i (i)}
                    <div class="flex items-center">
                        <div class="min-w-0 flex-1"><ModelGridPicker label="{t.fallbackN} {i + 1}" bind:value={x.fallbackModels[i]} items={(list ?? []).map(toModelGridItem)} /></div>
                        <button type="button" class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={t.remove} onclick={() => { x.fallbackModels.splice(i, 1) }}><Trash2Icon size={18} /></button>
                    </div>
                {/each}
            {/await}
            <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={() => { x.fallbackModels.push('') }}><PlusIcon size={18} />{t.addModel}</button>
        </FormGroup>
        <span class="-mt-2 px-2 text-[12px] text-(--mc-text2)">{t.fallbackModelsHint}</span>

        <FormGroup label={t.webSearch}>
            <FormToggle label={t.webSearch} hint={t.webSearchOrHint} bind:checked={x.webSearch} />
            {#if x.webSearch}
                <FormStepper label={t.webResults} bind:value={x.webMaxResults} min={1} max={10} />
            {/if}
        </FormGroup>
    </div>
{/if}
