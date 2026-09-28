<script lang="ts">
    import { untrack } from 'svelte'
    import { MessageCircleIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import {
        getSpicyChatAppConfig,
        getSpicyChatHub,
        type SpicyChatListDocument,
        type SpicyChatSortMode,
    } from 'src/ts/spicychat'
    import { SpicyChatInitialOpenChar } from 'src/ts/stores.svelte'
    import SpicyCover from './SpicyCover.svelte'
    import SpicyFilterSheet from './SpicyFilterSheet.svelte'
    import SpicyCharacterSheet from './SpicyCharacterSheet.svelte'

    // Mobile SpicyChat library (mockups "Каталог" / "Поиск"): 2-column grid that loads
    // the next page as the end scrolls into view; filters live in a sheet.

    let { scroller }: { scroller: HTMLElement | null } = $props()

    let draft = $state('')
    let search = $state('')
    let sort: SpicyChatSortMode = $state('popular')
    let nsfw = $state(false)
    let openDefinitionOnly = $state(false)
    let include: string[] = $state([])
    let exclude: string[] = $state([])

    let cards: SpicyChatListDocument[] = $state([])
    let page = $state(0)
    let totalPages = $state(1)
    let found = $state(0)
    let loading = $state(false)
    let availableTags: string[] = $state([])
    let facetCounts: Record<string, number> = $state({})
    let filtersOpen = $state(false)
    let opened: SpicyChatListDocument | null = $state(null)
    let sentinel: HTMLElement | null = $state(null)
    let request = 0

    const quickSorts: { mode: SpicyChatSortMode; label: () => string }[] = [
        { mode: 'popular', label: () => language.spicyChat.sortPopular },
        { mode: 'trending', label: () => language.spicyChat.sortTrending },
        { mode: 'newest', label: () => language.spicyChat.sortNewest },
        { mode: 'toprated', label: () => language.spicyChat.sortTopRated },
    ]

    let filterActive = $derived(nsfw || openDefinitionOnly || include.length > 0 || exclude.length > 0 || !quickSorts.some((s) => s.mode === sort))
    let hasMore = $derived(page < totalPages)

    async function load(reset: boolean) {
        const id = ++request
        const nextPage = reset ? 1 : page + 1
        loading = true
        const result = await getSpicyChatHub({ search, page: nextPage, nsfw, sort, tags: include, excludeTags: exclude, openDefinitionOnly })
        if (id !== request) {
            return
        }
        loading = false
        if (!result) {
            if (reset) {
                cards = []
            }
            return
        }
        const known = new Set(reset ? [] : cards.map((c) => c.character_id ?? c.id))
        const fresh = result.cards.filter((c) => !known.has(c.character_id ?? c.id))
        cards = reset ? result.cards : [...cards, ...fresh]
        page = nextPage
        totalPages = result.totalPages
        found = result.found
        facetCounts = Object.fromEntries(result.tagFacets.map((facet) => [facet.value, facet.count]))
    }

    // Any filter change starts over from page 1.
    $effect(() => {
        void search
        void sort
        void nsfw
        void openDefinitionOnly
        void include.length
        void exclude.length
        void JSON.stringify([include, exclude])
        untrack(() => {
            if (scroller) {
                scroller.scrollTop = 0
            }
            load(true)
        })
    })

    $effect(() => {
        if (!sentinel || !scroller) {
            return
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting) && !loading && hasMore) {
                load(false)
            }
        }, { root: scroller, rootMargin: '600px 0px' })
        observer.observe(sentinel)
        return () => observer.disconnect()
    })

    getSpicyChatAppConfig().then((config) => {
        if (config) {
            availableTags = config.tags
        }
    })

    $effect(() => {
        if ($SpicyChatInitialOpenChar) {
            opened = $SpicyChatInitialOpenChar
            $SpicyChatInitialOpenChar = null
        }
    })

    function submitSearch(event: SubmitEvent) {
        event.preventDefault()
        search = draft.trim()
        ;(document.activeElement as HTMLElement | null)?.blur()
    }

    function compact(value: number): string {
        return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    }
</script>

<div class="flex flex-col gap-3">
    <div class="flex gap-2">
        <form class="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border px-3.5" style="background: var(--mc-surface); border-color: var(--mc-line);" onsubmit={submitSearch}>
            <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
            <input type="search" enterkeyhint="search" bind:value={draft} placeholder={language.mobileCatalog.searchPlaceholder} aria-label={language.spicyChat.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
            {#if draft}
                <button type="button" class="-mr-2 flex h-9 w-9 items-center justify-center text-(--mc-text2)" aria-label={language.mobileCatalog.reset} onclick={() => { draft = ''; search = '' }}>
                    <XIcon size={16} />
                </button>
            {/if}
        </form>
        <button type="button" class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border" style="background: var(--mc-surface); border-color: var(--mc-line);" aria-label={language.mobileCatalog.filters} onclick={() => { filtersOpen = true }}>
            <SlidersHorizontalIcon size={19} />
            {#if filterActive}
                <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style="background: var(--mc-accent);"></span>
            {/if}
        </button>
    </div>

    {#if include.length + exclude.length > 0}
        <div class="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {#each include as tag (tag)}
                <button type="button" class="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium" style="background: var(--mc-accent-soft); border-color: var(--mc-accent);" aria-label={language.mobileCatalog.removeTag.replace('{}', tag)} onclick={() => { include = include.filter((t) => t !== tag) }}>
                    {tag}<XIcon size={14} />
                </button>
            {/each}
            {#each exclude as tag (tag)}
                <button type="button" class="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium" style="background: color-mix(in oklab, var(--mc-danger) 12%, transparent); border-color: var(--mc-danger); color: var(--mc-danger);" aria-label={language.mobileCatalog.removeTag.replace('{}', tag)} onclick={() => { exclude = exclude.filter((t) => t !== tag) }}>
                    <span class="line-through">{tag}</span><XIcon size={14} />
                </button>
            {/each}
            <button type="button" class="h-9 shrink-0 px-2 text-[14px] text-(--mc-text2)" onclick={() => { include = []; exclude = [] }}>{language.mobileCatalog.reset}</button>
        </div>
    {:else}
        <div class="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {#each quickSorts as item (item.mode)}
                <button type="button" class="flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium" style={sort === item.mode ? 'background: var(--mc-accent); border-color: var(--mc-accent); color: var(--mc-on-accent);' : 'background: var(--mc-surface); border-color: var(--mc-line);'} aria-pressed={sort === item.mode} onclick={() => { sort = item.mode }}>{item.label()}</button>
            {/each}
            <button type="button" class="flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium" style={nsfw ? 'background: var(--mc-danger); border-color: var(--mc-danger); color: #fff;' : 'background: var(--mc-surface); border-color: var(--mc-line);'} aria-pressed={nsfw} onclick={() => { nsfw = !nsfw }}>NSFW</button>
        </div>
    {/if}

    {#if search || include.length + exclude.length > 0}
        <span class="text-[13px] text-(--mc-text2)">{language.mobileCatalog.found.replace('{}', found.toLocaleString())}</span>
    {/if}

    {#if !loading && cards.length === 0}
        <div class="py-12 text-center text-[15px] text-(--mc-text2)">{language.spicyChat.noResults}</div>
    {/if}

    <div class="grid grid-cols-2 gap-x-3 gap-y-5">
        {#each cards as card, i (card.character_id ?? card.id ?? i)}
            <button type="button" class="flex min-w-0 flex-col gap-2 text-left active:opacity-80" onclick={() => { opened = card }}>
                <span class="relative block aspect-[3/4] w-full overflow-hidden rounded-2xl">
                    <SpicyCover url={card.avatar_url} name={card.name ?? ''} class="absolute inset-0 h-full w-full" />
                    {#if card.is_nsfw}
                        <span class="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-white" style="background: var(--mc-danger);">NSFW</span>
                    {/if}
                    {#if typeof card.num_messages === 'number'}
                        <span class="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium" style="background: rgb(10 12 16 / 0.72); color: #ededf0;">
                            <MessageCircleIcon size={12} />{compact(card.num_messages)}
                        </span>
                    {/if}
                </span>
                <span class="truncate text-[15px] font-semibold">{card.name}</span>
                {#if card.title}
                    <span class="line-clamp-2 text-[13px] leading-[18px] text-(--mc-text2)">{card.title}</span>
                {/if}
            </button>
        {/each}
        {#if loading}
            {#each [0, 1, 2, 3] as skeleton (skeleton)}
                <div aria-hidden="true" class="flex animate-pulse flex-col gap-2">
                    <div class="aspect-[3/4] w-full rounded-2xl" style="background: var(--mc-surface);"></div>
                    <div class="h-3.5 w-2/3 rounded-full" style="background: var(--mc-surface);"></div>
                </div>
            {/each}
        {/if}
    </div>
    <div bind:this={sentinel} aria-hidden="true" class="h-px"></div>
</div>

{#if filtersOpen}
    <SpicyFilterSheet bind:sort bind:nsfw bind:openDefinitionOnly bind:include bind:exclude {availableTags} {facetCounts} {found} onclose={() => { filtersOpen = false }} />
{/if}
{#if opened}
    <SpicyCharacterSheet card={opened} onclose={() => { opened = null }} />
{/if}
