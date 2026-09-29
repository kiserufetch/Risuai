<script lang="ts">
    import { language } from 'src/lang'
    import { getNanoGPTModelProviders, type NanoGPTModelProviders } from 'src/ts/model/nanogpt'

    // NanoGPT provider tiles for the chosen model (NanoGPTProviderPicker.svelte): Auto plus
    // every available provider with speed, quantization, cache and price.

    let { apiKey, modelId, value = $bindable('') }: { apiKey: string; modelId: string; value: string } = $props()

    let data = $derived(apiKey && modelId ? getNanoGPTModelProviders(apiKey, modelId) : Promise.resolve<NanoGPTModelProviders | null>(null))

    const price = (per1k: number) => (per1k === 0 ? language.nanoGPTProviderFree : `$${(per1k * 1000).toFixed(2)}`)
    const ttft = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`)
    function badge(pct: number, dir: 'less' | 'more'): { label: string; color: string } | null {
        if (Math.abs(pct) < 0.5) return null
        return dir === 'less' ? { label: `↓${Math.round(pct)}%`, color: '#22c55e' } : { label: `↑${Math.round(Math.abs(pct))}%`, color: 'var(--mc-danger)' }
    }
</script>

{#snippet tile(on: boolean, title: string, lines: string[], badges: ({ label: string; color: string } | null)[], pick: () => void)}
    <button type="button" aria-pressed={on} class="flex min-w-0 flex-col gap-1 rounded-2xl border px-3 py-2.5 text-left" style="background: {on ? 'var(--mc-accent-soft)' : 'var(--mc-group)'}; border-color: {on ? 'var(--mc-accent)' : 'transparent'};" onclick={pick}>
        <span class="truncate text-[15px] font-semibold">{title}</span>
        {#each lines as line (line)}<span class="text-[11px] leading-4 text-(--mc-text2)">{line}</span>{/each}
        {#if badges.some(Boolean)}
            <span class="flex flex-wrap gap-1">
                {#each badges as b, i (i)}{#if b}<span class="rounded px-1 text-[10px] font-bold" style="color: {b.color}; background: color-mix(in oklab, {b.color} 14%, transparent);">{b.label} {i === 0 ? language.nanoGPTProviderInput : language.nanoGPTProviderOutput}</span>{/if}{/each}
            </span>
        {/if}
    </button>
{/snippet}

{#await data then info}
    {#if info && info.supportsProviderSelection && info.providers.length > 0}
        {@const auto = info.autoComparison?.platformVsOfficial}
        <div class="flex flex-col gap-2">
            <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.nanoGPTProvider} · {language.nanoGPTProviderPayAsYouGoOnly}</span>
            <div class="grid grid-cols-2 gap-2">
                {@render tile(value === '', language.nanoGPTProviderAuto, [
                    ...(info.autoTps ? [`${Math.round(info.autoTps)} t/s · ${ttft(info.autoTtftMs ?? 0)}`] : []),
                    `${price(info.defaultPrice.inputPer1kTokens)} / ${price(info.defaultPrice.outputPer1kTokens)}`,
                ], auto ? [badge(auto.inputDiscountPct, auto.inputDirection), badge(auto.outputDiscountPct, auto.outputDirection)] : [], () => { value = '' })}
                {#each info.providers.filter((p) => p.available) as p (p.provider)}
                    {@const cmp = p.comparison?.platformVsOfficial}
                    {@render tile(value === p.provider, p.provider, [
                        `${p.quantization && p.quantization !== 'unknown' ? p.quantization : language.nanoGPTProviderUndisclosed} · ${p.supportsPromptCaching ? language.nanoGPTProviderCacheSupported : language.nanoGPTProviderCacheNotSupported}`,
                        `${price(p.pricing.inputPer1kTokens)} / ${price(p.pricing.outputPer1kTokens)}`,
                        ...(p.pricing.cacheReadInputPer1kTokens ? [`${language.nanoGPTProviderCacheRead} ${price(p.pricing.cacheReadInputPer1kTokens)}`] : []),
                    ], cmp ? [badge(cmp.inputDiscountPct, cmp.inputDirection), badge(cmp.outputDiscountPct, cmp.outputDirection)] : [], () => { value = p.provider })}
                {/each}
            </div>
        </div>
    {/if}
{/await}
