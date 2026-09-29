<script lang="ts">
    import { ArrowDownIcon, ArrowUpIcon, CheckIcon, ChevronRightIcon, SearchIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import type { ModelGridItem, ModelGridPinnedItem } from 'src/ts/model/modelGrid'

    // Native take on ModelGrid.svelte for provider catalogs (OpenRouter, NanoGPT, Ollama
    // cloud): a row with the chosen model that opens a sheet with search, sorting,
    // pinned entries and model cards with prices and context.

    interface Props {
        label: string
        value: string
        items?: ModelGridItem[]
        pinnedItems?: ModelGridPinnedItem[]
        loading?: boolean
        showSubBadge?: boolean
        selectedLabelOverride?: string
        onselect?: (id: string, displayName: string) => void
    }

    let { label, value = $bindable(''), items = [], pinnedItems = [], loading = false, showSubBadge = false, selectedLabelOverride, onselect }: Props = $props()

    const t = $derived(language.mobileBot)

    let open = $state(false)
    let query = $state('')
    let sortField = $state<'price' | 'name' | 'provider'>('price')
    let ascending = $state(true)
    let freeOnly = $state(false)

    let selected = $derived.by(() => {
        const pinned = pinnedItems.find((p) => p.id === value)
        if (pinned) return { name: pinned.displayName, provider: pinned.providerName, price: '' }
        const item = items.find((m) => m.id === value)
        if (item) return { name: item.displayName, provider: item.providerName, price: item.prices.slice(0, 2).map((p) => p.value).join(' / ') }
        return { name: selectedLabelOverride || value || t.noModel, provider: '', price: '' }
    })

    let visible = $derived.by(() => {
        const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
        const base = items.filter((m) => (!freeOnly || m.sortPrice === 0) && terms.every((term) => `${m.displayName} ${m.providerName} ${m.id}`.toLowerCase().includes(term)))
        return [...base].sort((a, b) => {
            const cmp = sortField === 'name' ? a.displayName.localeCompare(b.displayName)
                : sortField === 'provider' ? a.providerName.localeCompare(b.providerName)
                : a.sortPrice - b.sortPrice
            return ascending ? cmp : -cmp
        })
    })

    function context(length: number): string {
        if (!length) return ''
        return length >= 1_000_000 ? `${(length / 1_000_000).toFixed(0)}M` : `${Math.round(length / 1000)}k`
    }

    function pick(id: string, name: string, pinned = false) {
        value = id
        if (!pinned) onselect?.(id, name)
        open = false
    }

    let sorts = $derived([
        { key: 'price' as const, label: language.openRouterSortByPrice },
        { key: 'name' as const, label: language.openRouterSortByName },
        { key: 'provider' as const, label: language.openRouterSortByProvider },
    ])
</script>

<div>
    <button type="button" class="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left disabled:opacity-60" disabled={loading} onclick={() => { open = true }}>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[12px] text-(--mc-text2)">{label}</span>
            <span class="flex min-w-0 items-center gap-1.5">
                <span class="truncate text-[16px] font-semibold">{loading ? t.loadingModels : selected.name}</span>
                {#if selected.price && !loading}<span class="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums" style="background: var(--mc-accent-soft); color: var(--mc-accent);">{selected.price}</span>{/if}
                {#if showSubBadge && value && !loading}<span class="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style="background: var(--mc-accent-soft); color: var(--mc-accent);">SUB</span>{/if}
            </span>
            {#if selected.provider && !loading}<span class="truncate text-[12px] text-(--mc-text2)">{selected.provider}</span>{/if}
        </span>
        <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
    </button>

    <Sheet {open} {label} onclose={() => { open = false }} class="h-[85dvh]">
        <div class="flex shrink-0 items-center gap-2 px-1">
            <span class="flex-1 text-[18px] font-bold">{label}</span>
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={t.close} onclick={() => { open = false }}><XIcon size={16} /></button>
        </div>
        <label class="flex h-[42px] shrink-0 items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-line);">
            <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
            <input type="search" bind:value={query} placeholder={t.searchModel} aria-label={t.searchModel} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        </label>
        <div class="flex shrink-0 items-center gap-1.5">
            {#each sorts as sort (sort.key)}
                <button type="button" aria-pressed={sortField === sort.key} class="h-8 rounded-full px-3 text-[13px] font-semibold" style={sortField === sort.key ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { sortField = sort.key }}>{sort.label}</button>
            {/each}
            <button type="button" class="ml-auto flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold" style="background: var(--mc-line); color: var(--mc-text2);" aria-label={ascending ? language.openRouterSortAsc : language.openRouterSortDesc} onclick={() => { ascending = !ascending }}>
                {#if ascending}<ArrowUpIcon size={14} />{:else}<ArrowDownIcon size={14} />{/if}{ascending ? language.openRouterSortAsc : language.openRouterSortDesc}
            </button>
        </div>

        <div class="flex shrink-0">
            <button type="button" aria-pressed={freeOnly} class="h-8 rounded-full px-3 text-[13px] font-semibold" style={freeOnly ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { freeOnly = !freeOnly }}>{t.freeOnly}</button>
        </div>

        {#if pinnedItems.length > 0 && !query && !freeOnly}
            <div class="grid shrink-0 grid-cols-2 gap-2">
                {#each pinnedItems as pinned (pinned.id)}
                    {@const on = pinned.id === value}
                    <button type="button" class="flex flex-col gap-0.5 rounded-2xl border px-3 py-2.5 text-left" style="background: {on ? 'var(--mc-accent-soft)' : 'var(--mc-group)'}; border-color: {on ? 'var(--mc-accent)' : 'transparent'};" onclick={() => pick(pinned.id, pinned.displayName, true)}>
                        <span class="text-[11px] text-(--mc-text2)">{pinned.providerName}</span>
                        <span class="text-[15px] font-semibold">{pinned.displayName}</span>
                    </button>
                {/each}
            </div>
        {/if}

        {#if items.length === 0}
            <span class="py-8 text-center text-[15px] text-(--mc-text2)">{language.modelGridCouldNotLoad}</span>
        {:else if visible.length === 0}
            <span class="py-8 text-center text-[15px] text-(--mc-text2)">{language.mobileDialogs.nothingFound}</span>
        {:else}
            <div class="risu-mc-grid-list flex shrink-0 flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each visible as item (item.id)}
                    {@const on = item.id === value}
                    <button type="button" class="flex w-full items-start gap-3 px-4 py-3 text-left" onclick={() => pick(item.id, item.displayName)}>
                        <span class="flex min-w-0 flex-1 flex-col gap-1">
                            <span class="flex items-center gap-1.5 text-[12px] text-(--mc-text2)">
                                <span class="truncate">{item.providerName}</span>
                                {#if showSubBadge}<span class="shrink-0 rounded px-1 text-[10px] font-bold" style="background: var(--mc-accent-soft); color: var(--mc-accent);">SUB</span>{/if}
                            </span>
                            <span class="text-[15px] font-semibold leading-snug" style={on ? 'color: var(--mc-accent);' : ''}>{item.displayName}</span>
                            {#if item.description}<span class="line-clamp-2 text-[12px] leading-4 text-(--mc-text2)">{item.description}</span>{/if}
                            {#if item.prices.length > 0 || item.context_length > 0}
                                <span class="flex flex-wrap gap-1.5 pt-0.5">
                                    {#each item.prices as price (price.label)}
                                        <span class="rounded-md px-1.5 py-0.5 text-[11px] tabular-nums" style="background: var(--mc-line);">{price.label} <b class="font-semibold">{price.value}</b>/1M</span>
                                    {/each}
                                    {#if item.context_length > 0}
                                        <span class="rounded-md px-1.5 py-0.5 text-[11px] tabular-nums" style="background: var(--mc-line);">{language.modelGridContext(context(item.context_length))}</span>
                                    {/if}
                                </span>
                            {/if}
                        </span>
                        {#if on}<CheckIcon size={20} class="mt-5 shrink-0" style="color: var(--mc-accent);" />{/if}
                    </button>
                {/each}
            </div>
        {/if}
    </Sheet>
</div>

<style>
    .risu-mc-grid-list > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
