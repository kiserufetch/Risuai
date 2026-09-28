<script lang="ts">
    import { CheckIcon, MinusIcon, SearchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import type { SpicyChatSortMode } from 'src/ts/spicychat'
    import Sheet from '../../MobileChat/Sheet.svelte'

    // SpicyChat filters (mockup "Шторка фильтров"): sort, NSFW, tags with a
    // three-state cycle — off → required → excluded → off. Changes apply live.

    interface Props {
        sort: SpicyChatSortMode
        nsfw: boolean
        openDefinitionOnly: boolean
        include: string[]
        exclude: string[]
        availableTags: string[]
        facetCounts: Record<string, number>
        found: number
        onclose: () => void
    }

    let {
        sort = $bindable(),
        nsfw = $bindable(),
        openDefinitionOnly = $bindable(),
        include = $bindable(),
        exclude = $bindable(),
        availableTags,
        facetCounts,
        found,
        onclose,
    }: Props = $props()

    let tagQuery = $state('')

    const sortModes: { mode: SpicyChatSortMode; label: () => string }[] = [
        { mode: 'popular', label: () => language.spicyChat.sortPopular },
        { mode: 'trending', label: () => language.spicyChat.sortTrending },
        { mode: 'newest', label: () => language.spicyChat.sortNewest },
        { mode: 'oldest', label: () => language.spicyChat.sortOldest },
        { mode: 'toprated', label: () => language.spicyChat.sortTopRated },
    ]

    let visibleTags = $derived.by(() => {
        const query = tagQuery.trim().toLowerCase()
        const all = [...new Set([...include, ...exclude, ...availableTags])]
        return query ? all.filter((tag) => tag.toLowerCase().includes(query)) : all
    })

    function cycle(tag: string) {
        if (include.includes(tag)) {
            include = include.filter((t) => t !== tag)
            exclude = [...exclude, tag]
        } else if (exclude.includes(tag)) {
            exclude = exclude.filter((t) => t !== tag)
        } else {
            include = [...include, tag]
        }
    }

    function reset() {
        sort = 'popular'
        nsfw = false
        openDefinitionOnly = false
        include = []
        exclude = []
        tagQuery = ''
    }

    function formatCount(count: number | undefined): string {
        return count ? count.toLocaleString() : ''
    }
</script>

<Sheet open={true} label={language.mobileCatalog.filters} {onclose}>
    <div class="flex items-center justify-between px-1">
        <h2 class="text-[20px] font-bold">{language.mobileCatalog.filters}</h2>
        <button type="button" class="h-11 px-2 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={reset}>{language.mobileCatalog.reset}</button>
    </div>

    <div class="flex flex-col gap-2">
        <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileCatalog.sort}</span>
        <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {#each sortModes as item, i (item.mode)}
                <button type="button" class="flex min-h-[52px] w-full items-center px-4 text-left text-[15px]" style={i > 0 ? 'border-top: 1px solid var(--mc-line);' : ''} aria-pressed={sort === item.mode} onclick={() => { sort = item.mode }}>
                    <span class="flex-1">{item.label()}</span>
                    {#if sort === item.mode}
                        <CheckIcon size={20} style="color: var(--mc-accent);" />
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <button type="button" role="switch" aria-checked={nsfw} class="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 py-2 text-left" style="background: var(--mc-group);" onclick={() => { nsfw = !nsfw }}>
        <span class="flex flex-1 flex-col gap-0.5">
            <span class="text-[15px]">{language.mobileCatalog.showNsfw}</span>
            <span class="text-[12px] text-(--mc-text2)">{language.mobileCatalog.nsfwHint}</span>
        </span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {nsfw ? 'var(--mc-accent)' : 'var(--mc-line)'};">
            <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {nsfw ? '21px' : '3px'};"></span>
        </span>
    </button>

    <button type="button" role="switch" aria-checked={openDefinitionOnly} class="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 py-2 text-left" style="background: var(--mc-group);" onclick={() => { openDefinitionOnly = !openDefinitionOnly }}>
        <span class="flex flex-1 flex-col gap-0.5">
            <span class="text-[15px]">{language.mobileCatalog.openDefinitionOnly}</span>
            <span class="text-[12px] text-(--mc-text2)">{language.mobileCatalog.openDefinitionHint}</span>
        </span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {openDefinitionOnly ? 'var(--mc-accent)' : 'var(--mc-line)'};">
            <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {openDefinitionOnly ? '21px' : '3px'};"></span>
        </span>
    </button>

    <div class="flex flex-col gap-2.5">
        <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">
            {language.mobileCatalog.tags}{#if include.length + exclude.length > 0} · {language.mobileCatalog.tagsSummary.replace('{0}', String(include.length)).replace('{1}', String(exclude.length))}{/if}
        </span>
        <label class="flex h-10 items-center gap-2 rounded-full px-3.5" style="background: var(--mc-group);">
            <SearchIcon size={16} class="shrink-0 text-(--mc-text2)" />
            <input bind:value={tagQuery} placeholder={language.mobileCatalog.findTag} aria-label={language.mobileCatalog.findTag} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        </label>
        <div class="flex flex-wrap gap-2">
            {#each visibleTags as tag (tag)}
                {@const required = include.includes(tag)}
                {@const excluded = exclude.includes(tag)}
                <button
                    type="button"
                    class="flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
                    style={required
                        ? 'background: var(--mc-accent-soft); border-color: var(--mc-accent); color: var(--mc-text);'
                        : excluded
                            ? 'background: color-mix(in oklab, var(--mc-danger) 12%, transparent); border-color: var(--mc-danger); color: var(--mc-danger);'
                            : 'background: var(--mc-group); border-color: var(--mc-line); color: var(--mc-text);'}
                    aria-label={required ? language.mobileCatalog.tagRequired.replace('{}', tag) : excluded ? language.mobileCatalog.tagExcluded.replace('{}', tag) : tag}
                    onclick={() => cycle(tag)}
                >
                    {#if required}<CheckIcon size={12} strokeWidth={3} />{:else if excluded}<MinusIcon size={12} strokeWidth={3} />{/if}
                    <span class:line-through={excluded}>{tag}</span>
                    {#if facetCounts[tag]}<span class="text-[12px] text-(--mc-text2)">{formatCount(facetCounts[tag])}</span>{/if}
                </button>
            {/each}
            {#if availableTags.length === 0}
                <span class="text-[13px] text-(--mc-text2)">{language.spicyChat.loading}</span>
            {/if}
        </div>
    </div>

    <button type="button" class="h-[50px] w-full shrink-0 rounded-full text-[16px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={onclose}>
        {language.mobileCatalog.showResults.replace('{}', found.toLocaleString())}
    </button>
</Sheet>
